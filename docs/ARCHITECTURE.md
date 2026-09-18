# Architecture — how GAAM Card Battle actually works

The developer-facing map of the codebase. The README covers *what the game does* and how to mod it via config; this covers *how the engine is built* so future changes go in the right place. Keep this file updated when internals change; record the change itself in `CHANGELOG.md`.

## The three files that matter

| File | Role |
|---|---|
| `index.html` | Everything executable: CSS, HTML shell, and ~3,700 lines of JS in ordered, commented module sections. No build step; runs from `file://`. |
| `config.js` | All game *data*: rules, cards, teams, locations, sprites, fxLibrary, music, superFinishers. Loaded as a plain `<script>` (not `fetch`) so `file://` works. The design contract: **adding content never requires touching index.html** — only new *ability logic* does. |
| `tools/` | `pack_fx.py` (PNG sequence → sprite sheet + manifest line), `sim_match.js` (headless full-match test). |

`assets/` is runtime-only (~14 MB). `effects/` is raw source material (~1 GB, git-ignored, never deployed).

## Module map of index.html (top to bottom)

1. **CSS** — theme vars, 9:16 responsive frame (`#frame`, widens via `.wide` for admin), board/hand layout, every animation keyframe. Overlay panels get `touch-action: pan-y` because the frame itself is `touch-action: none` for drag.
2. **Helpers** — `$()`, `esc()` (HTML-escape; **mandatory for any user-editable text that reaches innerHTML**), `mulberry32` seeded PRNG, `shuffle`, `sleep`, `toast`.
3. **Voice** — announcer via `speechSynthesis`: `Voice.say(text)` (hooked into `bannerEpic` and TURN `banner`s), style from `CFG.voice.styles[CFG.voice.style]` (pitch/rate/voiceHint regex + `excite` flag: adds shouted interjections on SUPER/VICTORY/FINAL/SNAP/REVIVE lines), `_pickVoice` ranks the device's voices (natural/neural/Google first, then hint match, then en-US), local mute in `gaam_voice_off`, 🎙 top-bar pill, admin style select in the Music tab (serialized as `{enabled,style}` in Admin.store; travels in `netCfg` and the published config). Default style: `maxhype`. **Voice pack:** `Voice.preloadPack()` probes `assets/voice/<key>.mp3` for the keys in `PACK_KEYS` at boot; `Voice.say` first tries `playPack` (banner text → key via the `PACK_MAP` regex table — e.g. `TURN 3` → `round_3`, `…SUPER ATTACK` → `super_attack`) and only falls back to speech synthesis when no file loaded. Recording script: `docs/VOICE_PACK.md`.
3. **AudioManager + AUDIO_RECIPES** — all SFX are Web Audio synth recipes in the `AUDIO_RECIPES` registry (editable; every config `sfx`/`bark` key resolves there). Music engine: `setMusic(key)` resolves `CFG.music[key]` → tries the MP3 (`src`) → falls back to the default battle MP3 (for stage keys) → falls back to that entry's synth theme (`chords`+`beat`). Battle-track selection at `startMatch` is mode-aware: `music.mode === "random"` picks one of `music.pool` per match into a transient `music.__random` entry (Math.random is fine here — music is cosmetic, not part of the deterministic reveal); `"stage"` uses the first picked location's entry. `Admin.store()` special-cases `mode` (string) and `pool` (array) alongside the per-entry `{src}` map and skips `__random`. `_musicSeq` token prevents double-playing on rapid switches. Pacing: reveal-path waits use `rsleep(ms)`, which collapses when `G.ffwd` (tap during reveal) or the `REDUCED_MOTION` media query is set; reduced motion also disables flyCard/finishers/shake/ambient/weather/starfield. `tension(on)` runs the final-turn heartbeat: heavy lub-DUB (46/42Hz + lowpass knock) on an accelerating setTimeout chain (1300→700ms) with the music ducked to 0.16 until tension(false) restores it.
4. **FXManager + tween layer** — `sprite()` (sheet playback via manifest), `effect(key, el)` (fxLibrary lookup: impact sprite + sfx + shake), `interact(key, from, to, delta)` (projectile → impact → float text), plus `burst/dust/glow/floatText/shockwave/mote/damageFlash/comboPop/confetti/ambient`. Movement: `flyCard` (clone laid out at destination size, flown with a uniform scale so card proportions never distort between differently-shaped source/target rects), `slam`, `bumpNum`. UI: `showOverlay/closeOverlay` (staggered children), `banner/bannerEpic`. All degrade to instant when `el.animate` is missing, and guard `el.isConnected` (renderAll replaces nodes).
5. **Background systems** — parallax starfield (built once at boot), `startAmbient()`/`startWeather()` interval spawners (per-location `ambient` and `weather` config keys), letterbox `cineOn/cineOff`, `playFinisher()` (transparent webm overlay).
6. **Game logic registries** — `ABILITIES.onReveal` / `ABILITIES.ongoing`, `LOCATION_EFFECTS` (`perCard` live bonus + `onCardRevealed` hook), `teamOf()`, `synergyActive()`. Location effects include Phase-12-stage additions `masterBonus` (cost-5+ +2) and `loneBuilder` (+2 while your only card there). **`affect(ctx, target, delta, staggerMs)` is the one true way an ability changes power**: it mutates `permBuff` synchronously (determinism) and schedules the visuals (projectile/impact/float) after `staggerMs`. It also increments `G._combo` for the combo counter.
7. **State** — the global `G`:
   - `mode` (`ai|host|guest`), `isHost`, `phase` (`menu|staging|waiting|revealing|over`), `turn`, `rng` (seeded, **shared decisions only**), `matchSeq` (token: bumped on match start / menu / concede; every async loop checks it and bails).
   - `locs[]`: `{def, cards:{me,op}, forgeUsed, scorch:{me,op}, _lead}`.
   - `me`/`op`: `{energy, hand, deck, staged, grave, supersUsed:{teamId:{n,turn}}, handCount(op-remote-only)}`. `staged` entries are `{card, locIdx}` or super entries `{super:true, teamId, locIdx, graveIdx, prevEnergy, prevUsage}`.
   - `pendingPlays{turn: plays}` (MP buffer), `nextEnergyBonus`, `rematch{me,op}`, `remoteName`.
   - Card instances (`makeCard`): `{uid, def, owner, permBuff, revealed, halo, el}`. `def` is a live reference into `CFG.cards`. `el` is refreshed by every render — never cache it across awaits; re-read `card.el`.
8. **Power math** — `cardPower(card, locIdx, side)` = `def.power + permBuff + ongoing hook + location perCard + synergy`. Pure function of board state → recomputed every render, safe on both MP clients. `locTotal` adds my *staged* cards as a preview for display only; `locationsWon` ignores staged.
9. **Supers** — `eligibleSupers(side)` (team count at a location incl. staged, use count, cooldown, energy), `stageSuper/cancelSuper` (usage bookkeeping with rollback), `openGrave` (viewer + revive picker), `destroyCard` (shatter → owner's `grave` + scorch mark), `resolveSuper` (charge-up → attack: shared-RNG target excluding halo cards / revive: `graveIdx` from the play message). Supers sort **after** card reveals within a side's sequence.
10. **Match engine** — `startMatch` → `matchIntro` (plate flips + VS banner) → `nextTurn` (energy = curve + energizer bonus; final turn arms tension mode; starts the ⏱ turn timer — `startTurnTimer`/`stopTurnTimer`, `rules.turnTimerSec`, auto-calls `endTurnPressed` at 0) → `endTurnPressed` → `beginReveal` → `revealCard` loop → `endMatch` (staged verdict stamps → epic banner → results with MVP + roll-up counters) or `endMatchConceded` (instant, used by 🏳, MP `bye`, and disconnects).
11. **Renderer** — `renderAll()` is a full DOM rebuild from state (small scale makes this fine). It also drives: synergy dot pulses, scorch marks, lead-change shockwaves (`L._lead` diffing, `revealing` phase only), super buttons, crack tiers, draw-animation queue (`G.pendingDrawAnims`). `createCardEl` owns badges/team dot/halo/foil/sheen.
12. **Input** — Pointer Events drag (mouse+touch): threshold → ghost clone → drop on `.location`. **Double-tap** (two taps on the same card uid within 400ms, via the shared `dblTap(id)` helper) = inspector, for hand and board cards alike; a single tap only previews in the info bar. `pointercancel` cleans up. 3D tilt on hand hover (non-touch).
13. **AI** — `aiSmart` greedy loop: per (card, location) value = power + location effect + `AI_ABILITY_VALUE[abilityId]` + teammate-stacking bonus (n×2.5 + synergy) + flip-a-loss bonuses. **Every new ability needs an `AI_ABILITY_VALUE` entry.** Super pass (`aiTrySupers`) runs BEFORE the play loop (so spending the hand can't starve a super of energy) and again after (staged teammates can newly unlock one). `buildDeck` pads default decks team-first: two random teams' members fill empty slots before anything else.
14. **NetManager (PeerJS)** — host id = `GAAM-<code>` on the public broker. `netCfg()` bundles rules+cards+locations+teams+music (incl. data-URL art) for the guest; `backupCfg/restoreCfg` snapshot the guest's own config around a match. Connection **stays open on the results screen** for rematch; closes on menu.
15. **Meta systems** — inspector, `Dailies` + `CHALLENGE_DEFS` (3/day picked by date-seeded mulberry32 so all players match; per-account progress in `gaam_daily::<user>`; `onMatch(summary)` called from both match-end paths; rewards via Stats/Unlocks), `Unlocks` (per-user card progression: `load()` returns null when disabled = all unlocked; `grantRandom()` on wins; deck builder + `buildDeck` respect it), Snap/Retreat cubes (`G.cubes`/`G.snapped`, `doSnap(side)`, `updateSnapUI`, AI snaps when ahead from turn 4, MP `{t:"snap"}` message; payout recorded via `Stats.record` `detail.cubes`), `Stats` (per-user), leaderboard (ranks local accounts), `Users` (local profiles; storage-key namespace), `Decks` (5/account, 2 copies/card, padding respects the cap), `Admin` (sectioned editor, overrides in localStorage applied at boot, `#admin` hash route, config.js exporter), menu wiring, `window.__GAAM` test/debug handle.

## Multiplayer protocol & determinism

Messages over one PeerJS reliable channel:

| `t` | Payload | Direction |
|---|---|---|
| `hello` | `{name}` | guest → host on connect |
| `init` | `{seed, cfg: netCfg(), name}` | host → guest at start **and on rematch** |
| `plays` | `{turn, plays:[{cardId,locIdx,order} \| {super:true,teamId,locIdx,graveIdx,order}]}` | both, each turn |
| `rematch` | — | offer/accept handshake |
| `snap` | — | sender doubled the cube stake |
| `bye` | — | concede |

Hands and decks never leave the owning client; only plays travel. Both clients replay the same reveal deterministically because: (1) the shared `mulberry32(seed)` is consumed **only** for shared decisions — location pick at start, super-attack targets — never for private draws/shuffles (those use `Math.random`); (2) reveal order is canonical — priority side first (more locations won; host on ties), then per-side plays by `order` with supers last (stable sort); (3) all power math is pure. **Rule: inside anything that runs during reveal, use `ctx.rng()`/`G.rng()`, never `Math.random`.** `pendingPlays` is keyed by turn so an early-finishing opponent's next-turn message is never lost.

## Cloud backend (Supabase)

Project `gaam-card-battle` (`rzaajtnvdatuvlcsefqa.supabase.co`), configured in `config.js → cloud` (the anonKey is public; RLS is the security boundary). The `Cloud` module in index.html is fully best-effort — any failure or missing network leaves the game on its local behavior.

**Tables (all RLS-enabled):** `game_config` (single row id=1; world-readable, writable only when `auth.jwt()->>'email'` = adminEmail via `is_gaam_admin()`), `profiles` (unique display_name 2–14, world-readable, owner-writable), `decks` (owner-only, server trigger caps 5/user), `stats` (world-readable for the leaderboard, owner-writable; FK to profiles enables the PostgREST join; Phase 2 added `rating` int default 1000 and `cubes` int), `match_reports` (Phase 2: one row per finished match — reporter, mode, outcome, totals, cube stake, shared MP `seed`; insert/read own only, admin reads all; the seed enables Phase 3 re-sim verification).

**Ratings (Phase 2, trust-based):** `Cloud.updateRating` runs after MP matches only — looks up the opponent's rating by display name (world-readable stats), applies Elo K=32 locally (`stats.rating` in localStorage mirrors up via `pushStats`). Both clients rate themselves independently; verification against the filed match reports is Phase 3. `Cloud.reportMatch` files the raw report on every match end (best-effort, try/caught).

**Flows:** boot → `Cloud.init()` → `fetchConfig()` applies the published config over the bundled one (`applyPublishedConfig`; admin's local overrides re-apply on top as preview). Sign-up auto-confirms server-side (`gaam_autoconfirm` BEFORE INSERT trigger on `auth.users` — there is no email-confirmation flow) and the client falls through to `signInWithPassword` when signUp returns no session. Sign-in (email+password) → profile load (or name-claim prompt) → `Users.current()` returns the cloud display name → **full restore**: decks pulled into the local cache (entries carry `cloudId`), `pullStats()` (side with more games wins), `pullUnlocks()` (union-merge with `profiles.unlocked`; grants push back via `Cloud.pushUnlocks`). Guests play without any of this — the account overlay has a skip button and nothing gates on sign-in. `Stats.record` mirrors to the cloud. Leaderboard shows a 🌍 GLOBAL section. Admin: panel hidden/blocked for non-admin accounts when cloud is configured (open to all in pure-local dev); "Publish to ALL Players" upserts `game_config` (RLS rejects everyone else — verified). Migrations live in Supabase (`gaam_initial_schema`, `stats_profile_fk`).

## localStorage schema

| Key | Contents |
|---|---|
| `gaam_users` | `{list:[names], current}` |
| `gaam_decks::<user>` | `{decks:[{name, cards:[ids]}], active}` |
| `gaam_stats::<user>` | W/L/D, streaks, bestPower, history[25] |
| `gaam_daily::<user>` | `{date, prog:{id:n}, done:{id:true}}` — daily-challenge progress, resets when the date changes |
| `gaam_unlocks::<user>` | `{ids:[cardIds]}` — unlocked cards (created lazily from the cheapest `unlockStartCount`) |
| `gaam_admin` | Admin overrides (rules, cards incl. data-URL images, locations, music srcs, teams) — deep-merged into `CFG` at boot by `Admin.applyStored()` |

All reads are try/caught (private-browsing safe). No schema versioning yet — flagged in SHIP_PLAN before changing any shape.

## Testing

- `tools/balance_sim.js` — batch AI-vs-AI balance simulator: per-card win rates (flagged beyond 2 standard errors) + per-team super counts; `node tools/balance_sim.js [matches] [--json out]`.
- `tools/sim_match.js` — headless full match in jsdom (greedy player vs smart AI); asserts completion, board limits, and result rendering. `npm i jsdom` then `node tools/sim_match.js [count]`.
- Visual verification during development used Playwright + headless Chromium screenshot scripts at 390×844 and 1440×900; promote these into `tests/` per SHIP_PLAN when CI lands.
- `window.__GAAM` exposes state and key functions (`stageCard`, `resolveSuper`, `handleNet`, `renderAll`, …) precisely so tests and console debugging can drive the game without UI.

## Conventions (the short list that prevents regressions)

1. Content in `config.js`; only *logic* in `index.html`. New ability = registry hook + `AI_ABILITY_VALUE` entry + config reference.
2. Power changes go through `affect()`; random reveal-time choices through the shared rng.
3. User-editable strings hitting `innerHTML` go through `esc()`.
4. Long async sequences capture `G.matchSeq` and bail when it changes.
5. FX helpers must tolerate detached elements (`isConnected`) and missing WAAPI.
6. Anything the host customizes that affects gameplay or visuals belongs in `netCfg()` — otherwise MP clients diverge.
7. Update `CHANGELOG.md` with every change set; update this file when internals move.
