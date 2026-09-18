#!/usr/bin/env node
/* ============================================================================
   sim_match.js — headless full-match regression test for GAAM Card Battle.

   Plays complete matches (greedy scripted player vs the smart AI) in jsdom
   and asserts the engine holds: match reaches the final turn, no location
   exceeds its card cap, energy never goes negative, and the result screen
   renders. Run it after ANY engine change.

   Setup:  npm i jsdom          (one time, anywhere on your machine)
   Run:    node tools/sim_match.js [matches]     — default 1
   ========================================================================= */
const path = require("path");
process.chdir(path.join(__dirname, ".."));

let JSDOM;
try { ({ JSDOM } = require("jsdom")); }
catch (e) { console.error("jsdom is required: run `npm i jsdom` first."); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const matches = Math.max(1, parseInt(process.argv[2] || "1", 10));

async function playOne(n) {
  const errs = [];
  const dom = await JSDOM.fromFile("index.html", {
    runScripts: "dangerously",
    resources: "usable",          // loads config.js; CDN scripts may fail offline (fine)
    pretendToBeVisual: true,
    beforeParse(w) { w.addEventListener("error", (e) => errs.push("pageerror: " + e.message)); },
  });
  const w = dom.window, d = w.document;

  for (let i = 0; i < 100 && !w.__GAAM; i++) await sleep(100);
  if (!w.__GAAM) { console.log(`match ${n}: FAIL — game never initialized`, errs); return false; }

  // speed the match up
  w.GAAM_CONFIG.rules.aiThinkMs = 60;
  w.GAAM_CONFIG.rules.revealStaggerMs = 60;

  const { G, stageCard, canStage, endTurnPressed, locationsWon } = w.__GAAM;
  d.getElementById("btnVsAI").click();
  for (let i = 0; i < 40 && G.phase !== "staging"; i++) await sleep(100); // match intro

  let guard = 0;
  while (G.phase !== "over" && guard++ < 300) {
    if (G.phase === "staging") {
      let played = true;                       // greedy: stage everything affordable
      while (played) {
        played = false;
        for (let i = 0; i < G.me.hand.length && !played; i++)
          for (let l = 0; l < G.locs.length && !played; l++)
            if (canStage(G.me.hand[i], l)) { stageCard(i, l); played = true; }
      }
      if (G.me.energy < 0) errs.push("negative energy");
      const t = G.turn;
      endTurnPressed();
      for (let k = 0; k < 400 && G.turn === t && G.phase !== "over"; k++) await sleep(100);
    } else await sleep(100);
  }

  G.locs.forEach((L, i) => {
    const cap = w.GAAM_CONFIG.rules.maxCardsPerLocation;
    if (L.cards.me.length > cap || L.cards.op.length > cap) errs.push("overflow at location " + i);
  });
  if (G.turn < w.GAAM_CONFIG.rules.turns) errs.push("ended early at turn " + G.turn);

  const wns = locationsWon();
  const title = d.getElementById("resultTitle").textContent;
  console.log(`match ${n}: turn ${G.turn} | locations me:${wns.me} op:${wns.op} | ${title}` +
    (errs.length ? ` | ERRORS: ${errs.join("; ")}` : ""));
  dom.window.close();
  return errs.length === 0;
}

(async () => {
  let ok = 0;
  for (let i = 1; i <= matches; i++) if (await playOne(i)) ok++;
  console.log(ok === matches ? `ALL ${matches} SIMULATION(S) PASSED` : `${matches - ok}/${matches} FAILED`);
  process.exit(ok === matches ? 0 : 1);
})();
