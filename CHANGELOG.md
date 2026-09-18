# Changelog

All notable changes to GAAM Card Battle. Convention: add an entry under **Unreleased** with every change set (features, fixes, balance, content); fold into a dated version block when tagging. Bug details live in `docs/BUG_HUNT.md`; internals in `docs/ARCHITECTURE.md`; plans in `docs/NEXT_STEPS.md`.

## Unreleased

- **👋 First-match tutorial** — a brand-new account's first AI match gets guided coach callouts (drag a card → end turn → reveals → energy curve → teams → SUPER READY → final turn) with gold highlights on the actual controls; steps auto-advance as the player does the thing. Skippable, never repeats (`gaam_tut_done`), `rules.tutorialEnabled: 0` disables.

- **😀 Multiplayer emotes** — tap the 😀 pill during an online match to send one of six reactions (👍 😱 😂 💀 "GG" "Nice one!"); they pop up as speech bubbles on both screens, with a 5-second cooldown. The set is editable in `config.js → emotes` (host's set syncs to the guest; publishable via the admin).

- **🎯 Daily challenges** — three per day, identical for every player (date-seeded pick from a 10-challenge pool: wins, supers, revives, snapped wins, perfect games, power thresholds, team decks, cube banking). Progress tracks automatically across matches; rewards (+2/+3 🎲 or a bonus card unlock) land with a "CHALLENGE COMPLETE!" banner. Menu button shows today's 0–3 count; `rules.dailiesEnabled: 0` disables.

- **QoL trio**: ↩ **Undo** button takes back your last play (cards and armed supers, full refund); the energy box shows **next turn's energy** ("next: 4⚡") for planning ahead; **rookie hints** glow the best location while a new player drags a card (auto-disables after `rules.hintGamesMax` games; `rules.hintsEnabled: 0` turns it off).

- **Recorded voice-pack support** — drop MP3 call-outs into `assets/voice/` (exact filenames + full recording script in `docs/VOICE_PACK.md`: battle start, rounds 1–5, final round, hurry-up/time's-up, supers, revive, snap, combo, results incl. PERFECT VICTORY, new card, rematch, interjections) and the game plays them instead of the synthesized announcer, line by line, with per-line synth fallback for anything missing. New timer call-outs: "HURRY UP!" at 10s, "TIME'S UP!" at zero. Winning every location now announces **PERFECT VICTORY!**

- **Announcer 2.0** — new default "Maximum Hype" voice style: prefers the most natural voice on the device (Google/neural/enhanced voices ranked first), faster and higher-energy delivery, and shouted interjections ("OHHH!", "LET'S GO!", "ARE YOU READY?!") on the big beats (supers, FINAL TURN, victory, snaps, revives). Old styles remain selectable in Admin → Music.
- **Final-turn heartbeat** — much heavier chest-thump lub-DUB that *accelerates* as the final turn drags on (~1.3s → 0.7s pulse), while the music ducks down so the pressure lands.
- **Account-type badge** — the 👤 menu button now labels who you are: ☁ ONLINE (signed-in cloud account), 📱 LOCAL (named profile on this device), or 🎮 GUEST.

- **📖 How to Play** — new menu button opens an in-game guide (goal, turns/energy, abilities, teams/supers, cubes/snap, unlocks, decks, multiplayer, shortcuts). The text is generated from the live rules, so config/admin/published changes show automatically; new mechanics must add a section (now a CLAUDE.md doc-upkeep requirement).
- **🎙 Announcer voice** — arcade-style announcer speaks the big banner moments (turn call-outs, FINAL TURN, supers, revives, snaps, results) via the browser's speech synthesis. Players toggle it with the 🎙 pill in the top bar; the admin picks the voice character (Arcade Hype / Deep Doom / Fast Hype / Robo Referee / Ring Announcer, with a Test button in Admin → Music) and publishing makes it every player's voice. Respects reduced motion; syncs to MP guests via netCfg.
- **7 new stages (12 total)** — video-game homages, each with its own art, weather, ambient FX and synth theme: Pixel Meadow (no effect), Speedway Loop (first card +3), Haunted Manor (-1 all), Rooftop Dojo (new `masterBonus`: cost-5+ cards +2), Block Fortress (new `loneBuilder`: +2 while your only card), Crystal Caverns (+2 all), Star Cruiser (+1 per card). New weather types: fog, petals, leaves, stars. Every match still draws 3 random stages from the pool.

- **Account fixes & cross-device sync**:
  - Fixed account creation: signups were stuck on email confirmation that could never arrive (Supabase's built-in mailer only reaches project members). Accounts are now auto-confirmed server-side (`gaam_autoconfirm` trigger; existing stuck accounts confirmed) and the client signs you in immediately after Create Account.
  - **Full cross-device restore**: signing in on any device now pulls your stats (wins/streaks/rating/cubes — whichever side has more games wins), your card unlocks (new `profiles.unlocked`, merged by union), and your decks (already synced). Unlock grants push up as they happen.
  - **Play as guest** — the account screen now has a "Skip — play as guest" button; no account is ever required for a quick game (guest progress stays on the device and merges into an account's cloud data if they sign up later on that device).

- **Backend Phase 2** (roadmap step 5, partial): ⭐ **Elo ratings** (start 1000, K=32, multiplayer matches only — each client rates itself against the opponent's published rating) and 🎲 cube totals now live in the cloud `stats` table; the 🌍 global leaderboard ranks by rating and shows rating/W/L/cubes. Every finished match also files a **raw match report** (mode, outcome, totals, cube stake, and the shared MP seed) into a new RLS-protected `match_reports` table — the seed is what makes server-side re-sim **verification possible in Phase 3**. Remaining for Phase 3 (see docs/ONLINE_BACKEND.md): extract `engine.js`, verify reports by re-simulation, seasons, hosted matchmaking + TURN.

- **Retention loop** (roadmap step 4 complete):
  - **Card unlocks** — new accounts start with the 16 cheapest cards (`rules.unlockStartCount`); every WIN unlocks one random locked card with a "NEW CARD UNLOCKED" celebration; locked cards show greyed with 🔒 in the deck builder and are excluded from your deck padding. `rules.unlocksEnabled: 0` switches the system off.
  - **Snap/Retreat cubes** — every match is played for 🎲 cubes (stake starts at 1). The purple **SNAP** button doubles the stake once per player per match (both snap = ×4; the AI snaps back when it's ahead from turn 4, and SNAP syncs over multiplayer). Win the match, win the stake; lose or concede (= retreat), lose it. Cube totals are tracked in stats and shown on the leaderboard. `rules.cubesEnabled: 0` turns it off.

- **Balance from data** (roadmap step 3 complete) — new `tools/balance_sim.js` batch simulator plays N AI-vs-AI matches headlessly (both sides on the smart heuristic incl. Supers) and reports per-card win rates with statistical flags plus per-team super usage. From 180 measured matches: **Spark 1/2 → 1/1** (68.8% win rate, the "cheap-team early supers" suspicion confirmed — Emberkin fires ~15× more supers than the revive teams); revive-team cards buffed to compensate for their structurally rarer supers — **Wisp 1/1→1/2, Grave Witch 4/3→4/4, Sun Priest 4/3→4/4, Moon Matron 5/5→5/6**; **Iron Titan 5/9→5/10** (~35% across both runs). Post-patch spread: 43–57% with no strong outliers. Leviathan measured fine (53.5%) — no change.

- **Playtest QoL block** (roadmap step 2 complete): ⏱ turn timer (`rules.turnTimerSec`, default 45s, 0 = off, editable in Admin → Rules) counts down in the turn pill with an urgent pulse + ticks in the last 5s and auto-ends the turn; **tap anywhere during a reveal to fast-forward** the rest of it; the OS **`prefers-reduced-motion`** setting is honored (fly-ins/finishers/shake/ambient/weather/starfield off, reveals auto-fast-forward).

- **Fly-in animation fix** — cards no longer distort during draw/throw/reveal flights: the animated clone is laid out at its destination size and scaled uniformly, instead of stretching non-uniformly between the source and target rectangles.
- **Double-tap to inspect** — the big card inspector now opens on a double-tap (hand or board); a single tap only previews in the info bar, so releases after a drag or a stray tap no longer pop the modal.
- **Supers are far easier to reach** — `superTeamSize` 3→2, `superCost` 3→2, `superCooldownTurns` 1→0; default decks are now padded team-first (two random teams fill the empty slots) so teammates actually co-locate; the AI values teammate stacking more and checks for supers *before* spending its energy on plays as well as after.
- Fixed an AI crash when a Super was staged before its play loop (staged super entries have no `.card`; board-math reduce now skips them).

- **Two new battle tracks + music modes** — added `Briefing-at-Sunset.mp3` and `Dogfight-Arcade-Run.mp3`; new `music.mode` setting: `"random"` (default — each match plays a random track from the new `music.pool`) or `"stage"` (each stage's own track, as before). Admin → Music gets the mode toggle and a pool editor (add/remove tracks); per-stage track assignment stays on the Stages tab for stage mode. Admin overrides and cloud publish carry the new fields.

- **Cloud backend (Supabase)** — Backend Phase 1: admin-published universal config (rules, cards, teams, stages, music) fetched by every client at boot; online accounts (email+password) with claimed player names; cloud-synced decks (server-enforced 5-deck cap) and stats; global leaderboard section; admin panel gated to ryan@gaamgood.com with a "🌍 Publish to ALL Players" button (server-enforced via RLS). Fully offline-tolerant: no network → prior local behavior. Project: supabase `gaam-card-battle` (rzaajtnvdatuvlcsefqa).

- Deployed to production: gaam-card-battle.vercel.app (Vercel auto-deploys from GitHub `main`). Roadmap step 1 complete; playtesting now possible over public HTTPS.

- Project documentation set: `docs/ARCHITECTURE.md` (engine internals reference), this changelog, portable `tools/sim_match.js` test harness.
- `CLAUDE.md`: standing project instructions — documentation upkeep is required with every change set (changelog entry, architecture/bug-hunt/roadmap/README updates), plus the core dev rules and verification steps.

## 0.1.0 — Initial prototype (built July 2026, pushed September 2026)

First public push to github.com/gaamryan/GAAMCardBattle. Everything below was built across the initial development sessions, in roughly this order.

### Core game
- Marvel Snap-style engine: 6 turns, 3 locations (random from a pool of 5), 4 cards/side/location, energy = turn number, simultaneous priority-ordered reveals, win 2-of-3 with total-power tiebreaker.
- Fully data-driven `config.js` (cards, rules, locations, FX, audio, teams, music) — zero build step, runs from `file://`.
- 32-card set with procedural art; abilities: onReveal / ongoing / vanilla via registry hooks (buffs, debuffs, draws, steals, smites incl. strongest-target and board-wide, comeback buffs, next-turn energy ramp, aura passives).
- 5 location effects (buff/chill/forge-first/crowded) with placement feedback FX.
- Smart heuristic AI (config-switchable to random): values abilities, location effects, teammate stacking, loss-flipping; uses supers.

### Teams & Supers
- 5 teams (Emberkin/Stormbound/Frostborn = Super Attack; Radiant/Gravewalkers = Super Revive) with colored dots, synergy passive (+1 when 2+ teammates share a zone), signature reveal barks.
- Super Attack: charge-up → converging beams → destroys a random enemy card into its owner's graveyard (shatter, scorch mark, full-screen webm finisher). Super Revive: pick from graveyard, returns with protective halo + light motes + epic "REVIVED!" banner.
- Tunable frequency: uses per team, cooldown, fixed-or-all energy cost, staged cards count toward team size, cancel with full refund.

### Presentation
- Sprite-sheet FX library packed from the effects source pack (10 sheets) + `tools/pack_fx.py`; semantic `fxLibrary` (fire/ice/electric/buff/dark/…) driving reveals, card-to-card interaction projectiles, and location feedback.
- All-synth Web Audio SFX (`AUDIO_RECIPES`) + music engine: per-stage/menu MP3s with battle-track and synth fallbacks (default tracks: Dust-On-The-Circuit / Backseat-Victory-epic).
- Animation system: card flight tweens (draw/throw/retract/fly-in) with elemental trails, dust + squash landings, heavy-card slow-mo + shake, 3D hand tilt, animated modals, turn/VS/epic banners.
- Living board: parallax starfield, per-stage ambient FX + weather particles, card sheen + Ken Burns drift, foil finish on 6-costs, lead-change shockwaves, plate cracks by power gap, combo counter, final-turn tension mode, letterbox super cinematics, staged verdict-stamp endings with MVP + roll-up counters, damage vignette, energy sparks.

### Meta systems
- Local accounts (per-user decks/stats), deck builder (5 decks, 2 copies max, team filter chips), graveyard viewer, tap-to-inspect any card, local leaderboard ranking accounts.
- Admin panel at `#admin`: full-screen sectioned editor (Rules/Stages/Music/Teams/Cards) with live thumbnails, image upload (data-URL embed), team roster editing, persistent overrides, and full `config.js` export.

### Multiplayer
- PeerJS P2P with matchmaking codes; deterministic shared-seed reveals; only plays travel (hands stay private); host's full config (incl. custom art) syncs to the guest per match; concede/forfeit + disconnect handling; instant-rematch handshake.

### Fixes
- 12 issues found and fixed in the dedicated bug-hunt pass (mobile scroll lock, mid-reveal disconnect crash, guest config leak, admin NaN bricking, HTML injection, audio races, peer leaks, stuck drag ghosts, and more) plus the upload-button recursion — see `docs/BUG_HUNT.md` for repro/fix detail and the open-issues list.
