# Ship Plan — Production Readiness & Feature Roadmap

## Part 1 — Making the current build ship-ready

### Packaging & hosting
- **Deploy only what runs.** The repo contains ~1 GB of asset sources (`effects/` frame sequences and .mov packs, `tools/`). Runtime needs only `index.html`, `config.js`, and `assets/` (~4 MB). Add a deploy ignore (or a `dist/` copy step) before anything else.
- **Static host with HTTPS**: Netlify / Vercel / Cloudflare Pages. HTTPS is functionally required — browser autoplay policies, clipboard, PWA, and PeerJS all behave better on secure origins.
- **PWA**: manifest + icons + a small service worker precaching `assets/` → installable on phones, playable offline vs AI. This is the single highest-value "feels like a real game" step and costs ~half a day.
- **Split the monolith when it hurts, not before.** `index.html` is ~2,400 lines. When the team is >1 person, move to Vite with modules: `engine.js` (pure, testable — also needed for server-side match verification per ONLINE_BACKEND.md), `ui.js`, `fx.js`, `audio.js`, `net.js`, `storage.js`. Keep `config.js` a plain script so the no-build modding story survives.

### Quality gates (in CI)
1. **Syntax + lint** (eslint with `no-duplicate-ids` HTML plugin — would have caught BUG_HUNT #11).
2. **Engine unit tests** on the extracted pure engine: power math per location effect, each ability hook, reveal-order priority, energy curve, deck padding rules, win/tiebreak logic.
3. **Determinism test**: run the same seed + move log through the engine twice (and once in Node) — byte-identical states. This is the multiplayer-desync tripwire.
4. **Headless full-match simulation** (already exists — promote `/tmp/sim.js` into `tests/`).
5. **Playwright visual runs** (already exist as scripts) at 390×844 and 1440×900: menu, staged turn, reveal, deck builder, admin, inspector, leaderboard. Store goldens, diff on PR.
6. **Asset audit**: fail CI if deploy bundle exceeds ~6 MB or references missing files (walk config.js imageURL/src entries — catches typos in admin-exported configs).

### Robustness & polish before first real users
- Error tracking (Sentry browser SDK) + a user-facing "something broke" toast with a reload button.
- `prefers-reduced-motion` media query: disable shake/particles/banner zoom for users who ask.
- Storage schema versioning: a `gaam_schema=N` key + tiny migration ladder, so future changes never eat saved decks.
- Fix the open items in BUG_HUNT.md #13–#22 (each has a repro + fix sketch; ~2 days total).
- Device QA matrix: iOS Safari (current + n−2), Android Chrome, desktop Chrome/Firefox/Safari/Edge; both portrait phones and small tablets.
- Loading screen: preload card art + sprite sheets with a progress bar (currently first reveal can hitch on slow connections).
- Basic analytics (Plausible or PostHog): matches started/finished, mode split, deck-builder usage, drop-off by turn. You cannot balance 32 cards without per-card win-rate telemetry.

## Part 2 — Recommended features & enhancements (prioritized)

### Tier 1 — biggest gameplay payoff
1. **Snap & Retreat (cube stakes)** — the signature Marvel Snap tension mechanic: a doubling cube both players can raise; retreating forfeits fewer points. Deep gameplay for ~2 days of work. Leaderboard becomes cube-based instead of raw W/L.
2. **Hidden locations that reveal on turns 1–3** — locations start face-down and flip in during early turns. Cheap (config flag + flip animation, both already exist) and adds enormous replay variety.
3. **Turn timer + reveal fast-forward** (BUG_HUNT #17/#18) — quality-of-life that multiplayer needs to feel fair.
4. **Tutorial / first-run onboarding** — a scripted 3-turn guided match using the banner + glow systems. First-session retention lives or dies here.

### Tier 2 — retention & identity
5. **Collection & progression** — cards start locked; wins grant unlock currency. Turns the 32-card set into a progression ladder and makes deck-building aspirational. (Pairs with accounts from ONLINE_BACKEND.md.)
6. **Ranked seasons + Glicko rating** (backend Phase 3).
7. **Quick Match queue** (backend Phase 4) so players without a friend code get games.
8. **Replays & share codes** — the move log + seed IS a replay (determinism again); render it with the existing reveal pipeline; share as a URL param.
9. **More location effects** — destroy/move/copy-card effects showcase the hook system; aim for a pool of 15 so 3-random feels fresh.

### Tier 3 — presentation & platform
10. **Real soundtrack + SFX mix pass** — the music system already accepts MP3 drops per stage; commission or license loops, add a master volume slider and separate music/SFX sliders.
11. **Card rarity frames + foil shader** (CSS gradient/mask animation) and board themes — cosmetics are also the obvious future monetization-lite (never sell power).
12. **Haptics** (`navigator.vibrate`) on plays/impacts for Android; emotes in MP (send over the existing data channel).
13. **Localization** — extract the ~60 UI strings into config; the data-driven card text already lives in config.js.
14. **Desktop layout upgrade** — the admin already goes wide; a spectator-friendly landscape board view is the same technique applied to the match screen.

### Sequencing suggestion
Ship Part 1 (checklist) → Tier 1 features → backend Phases 1–2 → Tier 2 → backend 3–4 → Tier 3. Each stage is independently shippable, and nothing in the plan requires reworking the config-driven core — that architecture is the asset to protect as the game grows.
