# Bug Hunt — Codebase Review

**Scope:** `index.html` (engine, UI, net, audio, FX), `config.js`, storage schemas.
**Date:** July 2026. **Bar:** anything that crashes, corrupts data, desyncs multiplayer, or visibly breaks in front of a user.

## Methodology

1. **State-machine audit** — enumerate every `G.phase` transition and ask what happens if any async callback (timer, animation, network message, user tap) fires in a phase it wasn't written for.
2. **Async race audit** — list every `setTimeout` / `await` / promise / PeerJS callback and check what it touches if the world changed underneath it (re-render replaced elements, match ended, overlay closed, second call started).
3. **Determinism audit (multiplayer)** — every code path that runs on both clients during reveal must consume the shared RNG identically and read identical state. Any use of `Math.random`, local-only state, or unstable iteration order inside reveal logic is a desync.
4. **Input surface audit** — every place user-editable text (card names, account names, deck names, admin fields) reaches `innerHTML`, and every numeric input that feeds the rules engine.
5. **Storage audit** — every localStorage read tolerates missing/corrupt/quota-exceeded; schema keys are versioned or at least namespaced.
6. **Empirical pass** — headless full-match simulations (jsdom) + real-browser screenshot runs (Playwright/Chromium) at phone and desktop sizes, including hostile inputs.

---

## Issues found & FIXED in this pass

**1. [Critical, mobile] Overlay panels couldn't scroll on touch devices.**
Repro: open Deck Builder or Admin on a phone; swipe the card grid. Nothing scrolls — `#frame{touch-action:none}` (needed for drag-and-drop) swallowed pan gestures everywhere.
Fix: `touch-action:pan-y` on `.overlay` and the scrollable panels (`#adminBody`, `#deckGrid`, `#lbRows`, `#deckCurrent`).

**2. [Critical, MP] Disconnect mid-reveal crashed the reveal loop.**
Repro: host and guest in a match; guest kills the tab while cards are flipping. Survivor's `beginReveal` loop kept running after `showMenu()` cleared `G.locs`, then `revealCard` did `G.locs[locIdx].cards[side].push` → TypeError, dead UI.
Fix: `G.matchSeq` token — incremented on match start and menu return; the reveal loop and `revealCard` bail when the token changes.

**3. [High, MP] Guest permanently inherited the host's admin config.**
Repro: host edits Spark to cost 9 in Admin; guest joins, plays, returns to menu, starts a solo game — Spark still costs 9 for the guest (until page reload), and saving admin on the guest would persist the host's values.
Fix: `NetManager.backupCfg()` snapshots rules+cards before the init merge; `close()` restores them.

**4. [High] Admin numeric fields zeroed rules on empty input.**
Repro: Admin → clear the `turns` field → Apply & Save. `Number("") === 0` → every new match ends instantly; persisted, so it survives reload until Reset.
Fix: `numOr()` keeps the previous value when the field is empty or NaN.

**5. [High] HTML injection via editable names.**
Repro: Admin → rename a card to `<img src=x onerror=alert(1)>` → the string is injected as markup everywhere names render (board, hand, chips, leaderboard). Self-XSS today; real XSS the moment names sync between players.
Fix: `esc()` helper; all user-editable text (card/stage/account names, ability/effect text) is escaped before hitting `innerHTML`.

**6. [Medium, audio] Rapid screen changes could stack two music tracks.**
Repro: with real MP3s configured, click between screens quickly. Two `Audio.play()` promises could both resolve and attach.
Fix: `_musicSeq` token — only the latest `setMusic` call may attach or fall back.

**7. [Medium, MP] Hosting/joining repeatedly leaked PeerJS connections.**
Repro: fail a join (bad code), join again; or cancel hosting and host again. Each attempt created a new `Peer` without destroying the old one — ghost connections and double message handlers.
Fix: `net.close()` at the top of `host()` and `join()`.

**8. [Medium] Stuck drag ghost on interrupted touch.**
Repro: start dragging a card, then get a phone call / switch apps / palm-reject — `pointerup` never fires, ghost card floats forever and slots stay highlighted.
Fix: `pointercancel` listener performs the same cleanup.

**9. [Low] "Drew a card!" toast lied when the hand was full or deck empty.**
Repro: hold 7 cards, reveal Scout Imp. No card was drawn (correct) but the toast celebrated anyway.
Fix: `drawOne` returns success; toast reflects it.

**10. [Low, visual] FX aimed at re-rendered cards painted at the frame's top-left.**
Repro: multi-target ability with staggered hits; a re-render replaces card elements mid-sequence; late FX targeted detached nodes whose rects are (0,0).
Fix: `isConnected` guards in `sprite/burst/dust/glow/floatText`.

**11. [High, found earlier this session] Duplicate `#deckCount` id.**
The HUD deck counter and the deck-builder counter shared an id; `getElementById` hit the HUD one, so the builder's "N/12" label never updated. Fixed by renaming to `#deckBuildCount`. *Lesson: id-collision lint would have caught this — see SHIP_PLAN testing section.*

**12. [Low, found earlier] Deck padding ignored the 2-copy cap.**
A 5-card saved deck padded with defaults could end up with 3× Spark. Fixed: padding skips cards already at 2 copies.

**24. [High, admin] Upload buttons did nothing.**
Repro: Admin → Cards or Stages → click 🖼 Upload — no file dialog.
Cause: the hidden `<input type="file">` was nested *inside* the button; `input.click()` bubbled back to the button's own click handler, which clicked the input again — browsers suppress the recursively-triggered dialog.
Fix: `stopPropagation` on the input's click + guard in the button handler. Verified with Playwright's `filechooser` event: the dialog opens on both tabs and a real file round-trips into the live config and stored overrides.
*Lesson: "renders correctly" ≠ "works" — native dialogs are invisible to screenshots, so interactive flows need event-level assertions (now part of the test run).*

---

## Known issues — documented, not yet fixed

**13. [Design/rules] `rules.locationsToWin` is advertised but unused.**
The winner is computed by simple majority + power tiebreaker; setting `locationsToWin: 3` changes nothing.
Repro: Admin → locationsToWin=3 → win 2 of 3 locations → you still win.
Fix: in `endMatch`, require `w.me >= R.locationsToWin` (else fall to tiebreaker), or drop the field. Decide the intended rule first — with 3 locations, majority and "2" are equivalent, which is why it slipped.

**14. [MP, cosmetic] Opponent hand-count can drift late game.**
`op.handCount` is inferred (+1 per turn, −1 per play, +1 per tracked ability draw). If the opponent's deck runs empty (possible with several draw abilities), our inferred count exceeds reality.
Repro: MP match where opponent plays 3× Scout Imp late; compare their real hand to the HUD count.
Fix: include `handCount` in each `plays` message and trust the sender.

**15. [Data model] Deck identity is its name.**
Renaming a deck in the builder forks a new deck (old one remains, eating the 5-deck cap); the active pointer follows names.
Repro: save "Aggro", rename field to "Aggro2", save — two decks now.
Fix: give decks a stable `id` (crypto.randomUUID), treat name as a label; migrate stored decks on load.

**16. [UX] No way to concede or quit a match in progress.**
Repro: start a vs-AI match, change your mind. Only escape is reloading the page (which also loses the match record).
Fix: pause/quit button in the top bar → confirm → record a loss (or nothing vs AI) → `showMenu()`; in MP send `{t:"bye"}` first.

**17. [MP, UX] No turn timer — a stalling opponent hangs the match forever.**
Repro: opponent never presses End Turn; you wait on "Waiting…" indefinitely.
Fix: optional `rules.turnTimerSec`; countdown UI; auto-end-turn with whatever is staged; both clients enforce independently (deterministic because plays still exchange normally).

**18. [UX] Reveal sequence is unskippable.**
With 8 staged cards at 900 ms each, a turn's reveal takes ~7 s of dead input.
Fix: tap anywhere during reveal → set a "fast" flag that reduces `revealStaggerMs` to ~120 for the rest of the sequence.

**19. [Compat] `energyPerTurn` is a function and can't round-trip through Admin export.**
Export injects the default `(turn) => turn`; a custom curve edited in config.js is silently reset in the exported file.
Fix: represent the curve as data (`energyCurve: [1,2,3,4,5,6]`) and index it; keep the function form as an optional override.

**20. [Compat] `100dvh` has no fallback for pre-2022 browsers.**
On old iOS Safari (<15.4) the `min(100dvh, …)` expressions fail and the frame can collapse.
Repro: iOS 14 Safari → blank/squashed layout.
Fix: add a `height:100vh`-based fallback line before each `dvh` rule (CSS falls through gracefully).

**21. [MP, infra] Public PeerJS broker + no TURN server.**
Symmetric-NAT pairs (some corporate/mobile networks) connect to the broker but the data channel never opens; user sees "Connected! Host is starting…" then nothing.
Repro: two peers behind strict NATs.
Fix: connection-open timeout with a clear error toast now; self-hosted PeerServer + TURN (coturn) at ship time — see ONLINE_BACKEND.md.

**22. [Storage] Private-browsing/quota failures are silent.**
All storage calls are try/caught (no crash), but a user in Safari private mode loses accounts/decks on close with no warning.
Fix: one-time capability probe at boot; toast "Progress won't be saved in private browsing."

**23. [Perf] The `effects/` source folder (3,585 files, ~1 GB of frames + .mov) must never ship.**
It's an asset-source directory, not a runtime dependency — only `assets/` is loaded. Add it to deploy ignore rules (see SHIP_PLAN).

---

## Verification currently in place

Headless jsdom simulation plays a complete 6-turn match (greedy player vs smart AI) asserting: match reaches turn 6, no location overflow, no unrevealed cards on board, no negative energy, result overlay renders. Playwright/Chromium screenshot runs verify real rendering at 390×844 and 1440×900, including deck builder, admin (desktop), inspector animation frames, interaction projectiles/impacts, and the leaderboard. Re-run both after every engine change.

## #25 — AI crash: staged Super entry read as a card (FIXED 2026-09-17)
**Severity:** high (aborted the AI's whole turn mid-loop).
**Repro:** any AI turn where a Super became eligible before the play loop (possible once `aiTrySupers` ran first): `aiSmart`'s board math did `P.staged.filter(s=>s.locIdx===li).reduce((t,s)=>t+s.card.def.power,0)` — super entries have no `.card`, so `s.card.def` threw, killing `aiTakeTurn`.
**Fix:** filter `!s.super` in that reduce. Latent since Supers shipped; exposed by the supers-first AI ordering.
