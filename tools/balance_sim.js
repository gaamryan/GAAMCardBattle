#!/usr/bin/env node
/* ============================================================================
   balance_sim.js — headless batch balance simulator for GAAM Card Battle.

   Plays N AI-vs-AI-style matches in jsdom (the "me" side is driven by a
   mirror of the smart-AI heuristic, including Supers) and reports:
     • per-card win rate (games won when the card was in the deck)
     • per-team super usage
   Cards are flagged when their win rate deviates from 50% by more than the
   noise threshold for their sample size (2 standard errors).

   Setup:  npm i jsdom              (one time)
   Run:    node tools/balance_sim.js [matches] [--json out.json]
           default 40 matches. ~6-8s per match (reveals run fast-forwarded).
   ========================================================================= */
const path = require("path");
const fs = require("fs");
process.chdir(path.join(__dirname, ".."));

let JSDOM;
try { ({ JSDOM } = require("jsdom")); }
catch (e) { console.error("jsdom is required: run `npm i jsdom` first."); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const matches = Math.max(1, parseInt(process.argv[2] || "40", 10));
const jsonOut = process.argv.includes("--json")
  ? process.argv[process.argv.indexOf("--json") + 1] : null;

/* mirror of aiSmart for the "me" side, via the __GAAM debug handle */
function playMeTurn(w) {
  const { G, stageCard, canStage } = w.__GAAM;
  const teamOf = w.eval("teamOf"), cardPower = w.eval("cardPower");
  /* supers first (same ordering as the real AI) */
  const trySupers = () => {
    for (const su of w.eval('eligibleSupers("me")')) {
      const team = w.eval("CFG").teams[su.teamId];
      if (team.super === "superRevive") {
        if (G.me.grave.length &&
            G.locs[su.locIdx].cards.me.length < w.eval("R").maxCardsPerLocation) {
          let gi = 0;
          G.me.grave.forEach((c, i) => { if (c.def.power > G.me.grave[gi].def.power) gi = i; });
          w.__GAAM.stageSuper(su, gi); return true;
        }
      } else if (G.locs[su.locIdx].cards.op.length) {
        w.__GAAM.stageSuper(su); return true;
      }
    }
    return false;
  };
  trySupers();
  let played = true;
  while (played) {
    played = false;
    let best = null;
    for (let i = 0; i < G.me.hand.length; i++) {
      const card = G.me.hand[i];
      for (let li = 0; li < G.locs.length; li++) {
        if (!canStage(card, li)) continue;
        const opT = G.locs[li].cards.op.reduce((t, c) => t + cardPower(c, li, "op"), 0);
        const meT = G.locs[li].cards.me.reduce((t, c) => t + cardPower(c, li, "me"), 0)
          + G.me.staged.filter(s => !s.super && s.locIdx === li)
                       .reduce((t, s) => t + s.card.def.power, 0);
        let v = card.def.power;
        const tm = teamOf(card.def.id);
        if (tm) {
          const n = G.locs[li].cards.me.concat(
            G.me.staged.filter(s => !s.super && s.locIdx === li).map(s => s.card)
          ).filter(c => { const t2 = teamOf(c.def.id); return t2 && t2.id === tm.id; }).length;
          if (n > 0) v += n * 2.5 + 1;
        }
        const diff = meT - opT;
        if (diff < 0 && diff + v >= 0) v += 6;
        if (diff > 6) v -= 4;
        v += Math.random() * 1.5;
        if (!best || v > best.v) best = { i, li, v, card };
      }
    }
    if (best) { stageCard(best.i, best.li); played = true; }
  }
  trySupers();
}

async function playOne(n) {
  const errs = [];
  const dom = await JSDOM.fromFile("index.html", {
    runScripts: "dangerously", resources: "usable", pretendToBeVisual: true,
    beforeParse(w) { w.addEventListener("error", (e) => errs.push("pageerror: " + e.message)); },
  });
  const w = dom.window, d = w.document;
  for (let i = 0; i < 120 && !w.__GAAM; i++) await sleep(100);
  if (!w.__GAAM) throw new Error("init failed: " + errs.join("; "));
  const { G, endTurnPressed } = w.__GAAM;
  w.eval("CFG").rules.aiThinkMs = 0;
  d.getElementById("btnVsAI").click();
  /* record both decks once dealt */
  let deckMe = null, deckOp = null;
  let guard = 0;
  while (G.phase !== "over" && guard++ < 400) {
    if (G.phase === "staging" && G.turn >= 1) {
      if (!deckMe) {
        deckMe = G.me.deck.concat(G.me.hand).map(c => c.def.id);
        deckOp = G.op.deck.concat(G.op.hand).map(c => c.def.id);
      }
      G.ffwd = true; /* fast-forward every reveal */
      playMeTurn(w);
      const t = G.turn; endTurnPressed();
      for (let k = 0; k < 400 && G.turn === t && G.phase !== "over"; k++) await sleep(50);
    } else await sleep(50);
  }
  const title = (d.getElementById("resultTitle").textContent || "").toUpperCase();
  const result = title.includes("VICTORY") ? "me" : (title.includes("DEFEAT") ? "op" : "draw");
  const supers = {
    me: Object.fromEntries(Object.entries(G.me.supersUsed).map(([k, u]) => [k, u.n])),
    op: Object.fromEntries(Object.entries(G.op.supersUsed).map(([k, u]) => [k, u.n])),
  };
  dom.window.close();
  if (errs.length) throw new Error("match " + n + " page errors: " + errs.join("; "));
  return { deckMe, deckOp, result, supers };
}

(async () => {
  const per = {};   // cardId -> {games, wins}
  const teams = {}; // teamId -> supers fired
  let draws = 0;
  const t0 = Date.now();
  for (let n = 1; n <= matches; n++) {
    const m = await playOne(n);
    if (m.result === "draw") draws++;
    for (const [deck, side] of [[m.deckMe, "me"], [m.deckOp, "op"]]) {
      const winner = m.result === side;
      for (const id of new Set(deck)) {
        (per[id] ??= { games: 0, wins: 0 }).games++;
        if (winner) per[id].wins++;
      }
    }
    for (const side of ["me", "op"])
      for (const [tid, k] of Object.entries(m.supers[side]))
        teams[tid] = (teams[tid] || 0) + k;
    if (n % 10 === 0 || n === matches)
      console.log(`  …${n}/${matches} matches (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  const rows = Object.entries(per).map(([id, s]) => {
    const wr = s.wins / s.games;
    const se = Math.sqrt(0.25 / s.games); /* std error at p=.5 */
    return { id, games: s.games, winRate: +(wr * 100).toFixed(1),
             flag: Math.abs(wr - 0.5) > 2 * se ? (wr > 0.5 ? "STRONG" : "WEAK") : "" };
  }).sort((a, b) => b.winRate - a.winRate);
  console.log(`\n=== ${matches} matches (${draws} draws) — per-card win rates ===`);
  console.log("card".padEnd(18), "games", "win%", "flag");
  rows.forEach(r => console.log(r.id.padEnd(18), String(r.games).padStart(5),
    String(r.winRate).padStart(5), r.flag));
  console.log("\n=== supers fired per team (total, both sides) ===");
  Object.entries(teams).sort((a, b) => b[1] - a[1])
    .forEach(([t, k]) => console.log(t.padEnd(14), k));
  if (jsonOut) { fs.writeFileSync(jsonOut, JSON.stringify({ rows, teams, matches, draws }, null, 2)); console.log("\nwrote", jsonOut); }
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
