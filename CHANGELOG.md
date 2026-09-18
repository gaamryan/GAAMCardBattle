# Changelog

All notable changes to GAAM Card Battle. Convention: add an entry under **Unreleased** with every change set (features, fixes, balance, content); fold into a dated version block when tagging. Bug details live in `docs/BUG_HUNT.md`; internals in `docs/ARCHITECTURE.md`; plans in `docs/NEXT_STEPS.md`.

## Unreleased

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
