# Project instructions — GAAM Card Battle

Standing conventions for anyone (human or AI) working in this repo. Ryan's rule: **documentation stays current with the code.**

## Documentation upkeep (required with every change set)

1. **`CHANGELOG.md`** — add an entry under *Unreleased* for every feature, fix, balance change, or content addition. No silent changes.
2. **`docs/ARCHITECTURE.md`** — update whenever internals move: new modules, state fields, protocol messages, storage keys, or conventions. This file is the map future development navigates by.
3. **`docs/BUG_HUNT.md`** — new bugs get an entry with severity, repro, and fix (or fix sketch if left open). Move items out of "known issues" when fixed.
4. **`docs/NEXT_STEPS.md`** — keep the roadmap honest: check off what ships, add what's newly agreed.
5. **`README.md`** — update the relevant section when a player- or modder-facing feature changes.

## Development rules (full detail in docs/ARCHITECTURE.md)

- Content lives in `config.js`; only logic goes in `index.html`. New ability = `ABILITIES` hook + `AI_ABILITY_VALUE` entry + config reference.
- Power changes go through `affect()`; reveal-time randomness through the shared seeded rng (`ctx.rng()` / `G.rng()`) — never `Math.random` — or multiplayer desyncs.
- User-editable text reaching `innerHTML` goes through `esc()`.
- Long async sequences capture `G.matchSeq` and bail when it changes.
- Host-customizable gameplay/visual state must be included in `netCfg()`.
- Never commit or deploy `effects/` (~1 GB asset sources; git-ignored).

## Verification (before calling a change done)

- Run `node tools/sim_match.js 3` (needs `npm i jsdom` once) — must pass after any engine change.
- For UI changes, verify rendered output at phone (390×844) and desktop widths, not just logic.
