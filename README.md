# GAAM Card Battle

A single-player + P2P multiplayer, Marvel Snap–style card battler prototype. Fully data-driven, zero build step, runs from `index.html` directly.

## Run it

**Play it live: [gaam-card-battle.vercel.app](https://gaam-card-battle.vercel.app)** — auto-deployed from `main` on every push.

For local development: double-click `index.html` (works from `file://`), or serve the folder for multiplayer reliability:

```
python -m http.server 8000
# open http://localhost:8000
```

## Files

- `index.html` — engine, UI, FXManager, AudioManager, AI, NetManager (all commented, modular sections)
- `config.js` — **the only file you edit for gameplay**: rules, card directory, location pool
- `assets/cards/`, `assets/locations/` — placeholder art (swap any PNG, keep the filename or update `imageURL`)

## Rules (all configurable in `config.js → rules`)

6 turns, 3 locations, 4 cards max per side per location. Energy = turn number. Win 2 of 3 locations (total-power tiebreaker). Both players stage cards secretly, then cards reveal in priority order (whoever leads more locations reveals first).

The AI has two styles via `rules.aiStyle`: `"smart"` (default — heuristic that values abilities/location effects and fights for contested locations) or `"random"` (plays random valid cards). The smart AI's ability weights live in `AI_ABILITY_VALUE` in `index.html` — add an entry there when you add a new ability so the AI knows what it's worth.

## Adding / editing cards

Add an object to `GAAM_CONFIG.cards`:

```js
{ id: "my_card", name: "My Card", cost: 3, power: 4,
  imageURL: "assets/cards/my_card.png",
  abilityType: "onReveal",          // "vanilla" | "onReveal" | "ongoing"
  abilityId: "buffAdjacent",        // key in the ABILITIES registry
  abilityText: "On Reveal: +2 Power to your other cards here.",
  vfx: "burst",                     // none | burst | shake | glow | frost
  sfx: "boom" }                     // none | chime | zap | boom | dark
```

## Writing new card rules

Open `index.html`, find `ABILITIES`. An onReveal hook gets `{card, locIdx, side, state, rng, fx}`:

```js
myNewRule(ctx){
  ctx.card.permBuff += 5;                 // permanent power change
  fx.floatText(ctx.card.el, "+5");        // feedback
}
```

Use `ctx.rng()` (never `Math.random`) for anything random so multiplayer stays in sync. `ongoing` hooks return a live power bonus: `(card, locIdx, side, state) => number`. Location effects live in `LOCATION_EFFECTS` with the same pattern.

## Sound & music

`AudioManager` synthesizes everything with the Web Audio API — no files needed. Hooks: `drawCard`, `playCard`, `reveal(sfxKey)`, `locationWon`, `gameEnd(won)`, plus an ambient chord-pad music loop. To use real audio, replace a hook body with `new Audio('assets/sfx/x.mp3').play()`.

## VFX & animation

The effects system is a three-layer, fully data-driven library:

**1. Sprite sheets** (`config.js → sprites`) — real frame animations packed from the PNG sequences in `effects/` into `assets/fx/*.png`. Ten ship with the game: fire, fireWide, electric, zapGreen, ice, buff, aura, smoke, slash, flash. To add more, run the packer against any sequence in your effects pack:

```
python tools/pack_fx.py "effects/140 Flash Fx .png (color)/4) Flames/Flame 25" myFire
python tools/pack_fx.py "<seq folder>" frostNova --tint 160,225,255 --step 2
```

It writes the sheet and prints the manifest line to paste into `sprites`.

**2. FX library** (`config.js → fxLibrary`) — semantic effects that bundle an impact sprite + impact sound + projectile color + scale + optional screen shake. This is the only vocabulary the game speaks: `fire`, `ice`, `electric`, `buff`, `dark`, etc.

**3. References** — cards and locations point at library keys:

- `vfx` — played on the card itself when it reveals.
- `interactFx` — **card-to-card interactions**: when this card's ability changes another card's power, a glowing projectile (with particle trail) flies from source to target, then the library impact, sound, and a floating +N/−N play on the target. Multi-target abilities ripple with `rules.interactStaggerMs` between hits.
- `fxKey` (locations) — **placement feedback**: when a card lands somewhere that changes its power (drop on Frozen Wastes → ice puff + "−1" + glassy shatter sound; Power Plant → lightning + "+2"), the effect plays on the card. Fires on your drop and on each opponent reveal.

Ability code uses one helper for all of this: `affect(ctx, targetCard, delta, staggerMs)` — mutates power immediately (multiplayer stays deterministic) and schedules the visuals. Write new abilities with it and the FX come free.

Movement tweens: `flyCard` (deck→hand draws, hand→board throws with dust + squash, retracts, opponent fly-ins), `slam`, `bumpNum`. Legacy particle keys (`burst`, `shake`, `glow`, `frost`) still work. All animation degrades gracefully where the Web Animations API is missing.

**Living-board layer** (all config-tunable): a 3-layer parallax starfield with nebulas sits behind everything (drifts on its own, reacts to the pointer); each location plays faint looping **ambient** element FX (`locations[].ambient` — embers on the Forge, arcs on the Power Plant, frost on the Wastes); board cards get a periodic art sheen sweep; cards costing `rules.foilCostMin`+ wear an animated **foil** finish. Matches open with a plate-flip + "YOU VS THEM" intro, mid-reveal **lead changes** fire a shockwave ring + alert tone on the plate, cards costing `rules.heavyCostMin`+ land with screen shake and a slow-mo reveal, thrown cards stream an **elemental trail** in their vfx color, and the **final turn** darkens the frame with a pulsing vignette + heartbeat. Supers play under cinematic **letterbox bars** with a team-colored tint. Match end is a staged sequence: WON/LOST stamps slam onto each location one at a time (shockwaves/smoke + sounds), then the verdict banner, then results — including your **MVP** card.

**Spectacle layer** (visual pass 5): every stage has full-column **weather** (`locations[].weather` — snow over the Wastes, rising embers at the Forge, quick sparks at the Power Plant, gold shimmer in the City, neon drift in the Arena); location plates **crack** progressively when the power gap hits 5 and 10; board card art slowly **pans Ken-Burns style** inside its frame; chained ability hits pop an escalating "**N× COMBO!**" counter; each team plays a **signature audio bark** when its cards reveal (`teams[].bark`); and supers climax with **full-screen transparent-video finishers** — real alpha-channel webm clips converted from the effects pack (`superFinishers` in config; convert more with ffmpeg: `-c:v libvpx -pix_fmt yuva420p -auto-alt-ref 0`).

## Sound library

Every `sfx` key resolves through `AUDIO_RECIPES` in `index.html` — an editable registry of Web Audio synth recipes: `chime`, `zap`, `boom`, `dark`, plus elemental sets **fire** (whoosh + rumble + crackles), **ice** (glassy descending shimmer + pings), **electric** (jittery zap bursts), and **buff** (rising arpeggio). Add your own as `name(a){ a._note(...); a._noise(...); }` and reference it from any card, library effect, or location.

Note on the `.mov` clips in `effects/` (Blobs, Electricity, Lightnings, …): those are black-background overlay videos — the PNG-sequence route above is more reliable cross-browser, so the packer is the recommended path. Lottie files from lottiefiles.com could be added the same way (render to PNG frames, then pack).

## Inspecting cards

**Double-tap** any card — in your hand or placed on the board by either player — to open an enlarged inspector showing cost, base power, current power at its location, and ability text. (A single tap just previews it in the info bar, so you can't open the big view by accident while dragging.) Tap a *staged* (gold-dashed) card to take it back instead; it flies back to your hand with an energy refund.

## Teams & Super Moves

Every card can belong to a **team** (`config.js → teams`) — shown as a colored dot on the card and named in the inspector. Five teams ship: The Emberkin 🔥, The Stormbound ⚡, and The Frostborn ❄ (Super Attacks), plus The Radiant ✨ and The Gravewalkers 🌑 (Super Revives).

Land `rules.superTeamSize` (default **2**) members of one team on the same location — **cards you've staged this turn count too** — and a pulsing **⚡ SUPER** button appears there during staging. How often supers fire is fully tunable in `rules`: by default a super costs **2 energy** (`superCost`/`superCostMode:"fixed"`) and you can keep playing cards; each team gets **2 uses per match** (`superUsesPerTeam`, shown on the button) with **no cooldown** between them (`superCooldownTurns: 0`). Default decks are padded team-first (two random teams fill the empty slots), so teammates naturally end up together and supers come up in normal play. Cancel before ending the turn for a full refund. The original harsher rule set is one flip away: `superCostMode:"all"` + `superBlocksPlays:true` + `superUsesPerTeam:1`. All numeric knobs are editable live in Admin → Rules.

- **Super Attack** — at reveal, the team charges up (banner + glow + converging beams), then obliterates a *random* enemy card at that location. The victim shatters and goes to its owner's **graveyard** (💀 counter next to your deck — tap to browse).
- **Super Revive** — pick any card from your graveyard; it returns to the location wearing a golden **halo**, with an angelic burst and a giant "*CARDNAME* HAS BEEN REVIVED!" banner.

Supers resolve last in the reveal sequence, work in multiplayer (targets use the shared RNG; the revive choice travels in the play message), and the AI uses them too. Teams are edited in `config.js` — change members, colors, FX, or which super a team grants.

Team extras (all tunable in `rules`):

- **Synergy passive** — when `teamSynergyMin` (2) teammates stand together at a location, each gets `+teamSynergyBonus` (+1) Power and their team dot pulses. The inspector shows the bonus, and the AI deliberately stacks teammates to earn it (and the super behind it).
- **Revive protection** — halo (revived) cards can't be destroyed again (`reviveProtected: true`), so two revive teams can't ping-pong forever. Super Attacks skip them; if only protected cards remain, the super fizzles.
- **Scorch marks** — destroyed cards leave a faint 💀 mark in the slot row where they fell, so the board tells the story of the match.
- **Deck builder team filter** — chips above the collection grid filter by team, making super-focused decks quick to assemble.

## Instant rematch

🔄 on the results screen. Vs AI it restarts on the spot. In multiplayer it's an offer/accept handshake over the still-open connection: click to offer ("⏳ Waiting…"), your opponent's button turns into "Accept Rematch!", and when both agree the host deals a fresh seed and the next match starts immediately — no codes to re-enter. The button disappears if your opponent leaves. (The connection now stays open on the results screen; it closes when either player returns to the menu.)

## Conceding

The 🏳 flag in the top bar (visible during matches) opens a confirm dialog — conceding records a loss and ends the match immediately. In multiplayer your opponent instantly gets the win with an "OPPONENT CONCEDED!" banner; the same happens if a player disconnects mid-match.

## Accounts

👤 on the menu. Two tiers:

- **Online accounts (Supabase)** — sign up with email + password, claim a unique player name, and your decks (up to 5, server-enforced) and stats sync across devices and rank on the 🌍 global leaderboard. The published game config (rules, cards, teams, stages, music) is fetched from the cloud at boot, so the admin's edits are universal for every player. Fully offline-tolerant — no connection means the game runs on local data exactly as before.
- **Local profiles** — device-only accounts, still available below the sign-in (and the only tier when offline).

The **admin** is the signed-in `ryan@gaamgood.com` account: only it sees the ⚙️ Admin panel when cloud is active, and its "🌍 Publish to ALL Players" button pushes the current config to everyone — enforced server-side by row-level security, not just UI. Everyone builds decks from whatever card pool the admin has published.

## Deck builder

🃏 on the menu. Create, name, and save up to 5 decks per account: tap collection cards to add (max 2 copies), tap chips to remove, ★ Set Active to use it in matches. Short decks are padded with defaults at match start; in multiplayer each player uses their own active deck privately.

## Music

Each screen and location has its own soundtrack, configured in `config.js → music` (keys: `menu`, `battle`, plus any location id). Every entry has `src` — an MP3 path — and a synth theme (`chords` + `beat`). Drop MP3s into `assets/music/` matching the configured names (e.g. `frozen_wastes.mp3`, `menu.mp3`) and they play automatically, looped; missing or unplayable files fall back to that entry's built-in synth theme, so the game always has music.

Battle music has two modes, set by `music.mode` (toggle in Admin → Music): **`"random"`** (the default) picks one track per match from the `music.pool` array — currently Backseat-Victory-epic, Briefing-at-Sunset, Dogfight-Arcade-Run, and Backseat Victory; **`"stage"`** plays the first picked location's own track, falling back to `battle`. Either way, missing files fall back to the default battle MP3, then the synth theme.

## Card set

32 cards ship in `config.js`: the original 12 plus a 20-card expansion (Wisp, Tide Caller, Blood Bat, Thunder Hawk, Grave Witch, Phoenix, Leviathan, Royal GAAM, …) covering new ability hooks — power stealing, strongest-target smites, board-wide damage, losing-position comebacks, next-turn energy ramp, and new ongoing auras. All hooks live in the `ABILITIES` registry with matching AI valuations in `AI_ABILITY_VALUE`.

## Admin panel (the in-game editor)

⚙️ on the menu, or go straight to **`index.html#admin`** — the admin has its own URL (deep-linkable, browser back/forward close and reopen it; a hosted deployment can map `/admin` to it with a redirect). On desktop it expands to a wide two-pane layout with a side nav: **Rules**, **Stages** (rename locations, swap background images, pick gameplay effects/FX, set per-stage music), **Music** (battle-music mode toggle + random pool editor, home screen + default battle tracks), and **Cards**. Edits survive switching sections and only persist on Apply & Save.

Admin changes — including uploaded card art and stage backgrounds — apply to **both players in every multiplayer match you host**: the full shared config (rules, card stats + images, stages, teams, music picks) is sent to your opponent at match start and for rematches, so you both see the identical game. Your opponent's own settings return when they leave the results screen. To make changes permanent for *everyone who loads the game* (not just matches you host), use **Export config.js** and replace the file in the deployed folder — uploaded images are embedded in the export.

Images can be **viewed and swapped in place**: every card and stage row shows a live thumbnail, typing a path updates it instantly, and the 📁 button opens a file picker — the chosen image is embedded as a data URL, persists with Apply & Save, and exports into config.js. (For large art, dropping the file into `assets/` and typing its path keeps saves small — the panel reminds you.) Click any card thumbnail to preview the card full-size *with your unsaved row edits applied*. "Apply & Save" applies instantly and persists on your device; "Export config.js" downloads a new config file to replace the one in this folder, making the edits permanent for everyone. "Reset" clears device overrides. In multiplayer the host's rules and card stats are synced to the guest so admin edits can't desync a match. For anything the panel doesn't cover (new cards, ability hooks, sprite packs), `config.js` itself is the deeper admin layer.

## Leaderboard

The 🏆 button on the menu opens a local leaderboard persisted in `localStorage`: W/L/D record, win streaks, best total power, top matches, and recent history (vs AI and vs humans). A shared online leaderboard would need a small backend — the `Stats` module in `index.html` is the single place to swap in an API call.

## Cubes & card unlocks

Every match is played for **🎲 cubes** — the stake starts at 1, and the purple **SNAP** button (next to End Turn) doubles it, once per player per match. Both players snapping makes the match worth ×4. The AI snaps back when it's ahead, and snaps sync in multiplayer. Win the match and the stake is added to your cube total (shown on the leaderboard); lose or concede — that's a *retreat* — and you pay it. Turn it off with `rules.cubesEnabled: 0`.

New accounts start with the **16 cheapest cards unlocked**; every win unlocks one random new card (greyed cards with 🔒 in the deck builder are still locked). Tune with `rules.unlocksEnabled` / `rules.unlockStartCount` in config or Admin → Rules.

## Pace & accessibility

Each staging turn has a **turn timer** (default 45s, shown in the turn pill; it auto-plays End Turn at zero — set `rules.turnTimerSec: 0` in config or Admin → Rules to disable). Impatient during a reveal? **Tap anywhere to fast-forward** the rest of it. And if your OS is set to *reduce motion*, the game honors it: decorative animation is switched off and reveals run at fast-forward pace automatically.

## Multiplayer

Host Match → get a code like `X7K2` → friend enters it in Join. Uses PeerJS (free public broker) for direct browser-to-browser play. Only card plays are exchanged; hands/decks stay private. A shared RNG seed keeps random ability outcomes identical on both clients. Note: `file://` usually works, but some networks (strict NATs) can block P2P — hosting the folder over HTTPS is most reliable.

## Docs

Start here when developing: **`docs/ARCHITECTURE.md`** — the engine internals map (module layout, state shape, multiplayer protocol + determinism rules, storage schema, and the conventions that prevent regressions). Record every change set in **`CHANGELOG.md`**.

- `CHANGELOG.md` — what was built and when; add to Unreleased with each change set.
- `docs/ARCHITECTURE.md` — how the code works; update when internals move.
- `docs/BUG_HUNT.md` — full code review: methodology, bugs found & fixed, known issues with repro steps and fix sketches.
- `docs/NEXT_STEPS.md` — the agreed near-term roadmap (deploy → playtest QoL → balance → retention → backend).
- `docs/ONLINE_BACKEND.md` — architecture plan for real sign-ins, cross-device deck sync, and a verified global leaderboard (Supabase + engine re-simulation).
- `docs/SHIP_PLAN.md` — production-readiness checklist (packaging, CI quality gates, PWA, QA matrix) and a prioritized feature roadmap.

Regression test: `npm i jsdom` once, then `node tools/sim_match.js [count]` plays full headless matches and fails on engine violations — run it after any engine change.

## Debugging

`window.__GAAM` exposes the live game state (`G`), `stageCard`, `locationsWon`, etc. in the browser console.
