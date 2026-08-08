# Next Steps — agreed 2026-07-19, parked for later

Prioritized plan (details in SHIP_PLAN.md / ONLINE_BACKEND.md / BUG_HUNT.md):

1. **Deploy + real playtest** — static host (Netlify/Cloudflare Pages), HTTPS, exclude the ~1 GB `effects/` source folder from the deploy. Play real matches over the codes.
2. **Playtest QoL block** — turn timer, tap-to-fast-forward reveals, rematch button, `prefers-reduced-motion` switch.
3. **Balance from data** — headless batch simulator (500 AI-vs-AI matches → per-card win-rate deltas) built on the jsdom harness. Suspects: cheap-team early supers, Leviathan 6/13.
4. **Retention loop** — card unlock progression; Snap/Retreat cube mechanic (concede button is the seed).
5. **Backend Phases 1–2** — Supabase sign-ins, cross-device deck sync, global leaderboard.

Meta: extract the pure engine into `engine.js` before steps 3–5 (also required for server-side match verification).
