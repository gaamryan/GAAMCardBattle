# Next Steps — agreed 2026-07-19, parked for later

Prioritized plan (details in SHIP_PLAN.md / ONLINE_BACKEND.md / BUG_HUNT.md):

1. ~~**Deploy**~~ ✅ DONE (2026-09-17): live at **gaam-card-battle.vercel.app** via Vercel↔GitHub auto-deploy — every push to `main` ships automatically; `effects/` excluded via .gitignore. Remaining: **real playtest** — play matches with real people over the matchmaking codes. Note: to publish admin edits (art/rules) to the live site, use Admin → Export config.js → commit → push.
2. ~~**Playtest QoL block**~~ ✅ DONE (2026-09-17): turn timer (`rules.turnTimerSec`, auto End Turn), tap-to-fast-forward reveals, `prefers-reduced-motion` honored. (Rematch shipped earlier in 0.1.0.)
3. ~~**Balance from data**~~ ✅ DONE (2026-09-17): `tools/balance_sim.js` (run `node tools/balance_sim.js 30 --json out.json`, merge several runs for sample size). 180-match pass shipped: Spark nerfed, revive-team cards buffed, Iron Titan buffed; Leviathan measured fine. Re-run after any card/rules change.
4. ~~**Retention loop**~~ ✅ DONE (2026-09-17): card unlocks (16 starters, +1 random per win, `rules.unlocksEnabled`) and Snap/Retreat cubes (stake ×2 per snap, AI + MP aware, tracked in stats/leaderboard, `rules.cubesEnabled`). Unlocks are local-only for now — cloud-sync them in Backend Phase 2+ if cross-device progression matters.
5. ~~**Backend Phase 1**~~ ✅ DONE (2026-09-17): Supabase sign-ins, admin-published universal config, cloud decks/stats, global leaderboard. Remaining Phase 2+: match-report verification (engine re-sim), ratings/seasons, hosted matchmaking + TURN (docs/ONLINE_BACKEND.md). ⚠ One-time manual steps for Ryan: (a) sign up in-game with ryan@gaamgood.com to become the admin; (b) in Supabase Dashboard → Authentication → Sign In / Providers → Email, disable "Confirm email" (or configure SMTP) so player signups don't stall on confirmation emails.

Meta: extract the pure engine into `engine.js` before steps 3–5 (also required for server-side match verification).
