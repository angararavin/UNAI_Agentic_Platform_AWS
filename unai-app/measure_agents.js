#!/usr/bin/env node
// ==========================================================================
// measure_agents.js — MEASURED token cost per agent, real provider numbers.
// No modeled figures. Refuses to run without a live key (so it can never fall
// back to a modeled number).
//
//   node --env-file=.env measure_agents.js              # all agents, all decisions
//   node --env-file=.env measure_agents.js --sample 3   # first 3 decisions/agent (cheaper, still measured)
//
// For each agent decision it makes TWO real model calls and counts provider tokens:
//   UNAI  = light enrichment of an already-computed decision (what UNAI does — reasoning is in code)
//   naive = an independent from-scratch reasoning call (how you'd build it WITHOUT the shared runtime)
// Savings = measured (naive - UNAI) / naive. Both sides measured on the same task/model.
// ==========================================================================
const { UNAI, USE_CASES } = require("./engine.js");
const { resolveConfig, chatWithFailover } = require("./llm.js");

const UNAI_SYS = "Rewrite this already-decided item's explanation. Reply JSON {rootCause, recommendedAction}. Concise; do not restate the numbers.";
const NAIVE_SYS = "You are a standalone supply-chain agent with no shared runtime or precomputed evidence. Reason about the task from scratch and reply JSON {rootCause, reasoningSteps:string[4], recommendedAction, confidence:number}.";

(async () => {
  const cfg = resolveConfig();
  if (!cfg.ok) {
    console.error("MEASURED numbers require a live model key. Set MISTRAL_API_KEY / GATEWAY_API_KEY " +
      "(e.g. node --env-file=.env measure_agents.js). Aborting — this tool will not print modeled numbers.");
    process.exit(1);
  }
  const si = process.argv.indexOf("--sample");
  const SAMPLE = si > -1 && process.argv[si + 1] ? parseInt(process.argv[si + 1], 10) : Infinity;
  console.log("model:", cfg.label, cfg.model, "| measuring real tokens (2 calls/decision + 1 single-prompt call/agent). This costs real money on your key.\n");

  const di = process.argv.indexOf("--delay");
  const DELAY = di > -1 && process.argv[di + 1] ? parseInt(process.argv[di + 1], 10) : 700;  // ms between calls (free-tier pacing)
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // One measured call, with retry+backoff. Returns real tokens, or null if it never got a real response.
  async function measure(sys, user, tier, max) {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const r = await chatWithFailover([{ role: "system", content: sys }, { role: "user", content: user }], { tier, max_tokens: max });
        if (r && ((r.tokensIn || 0) + (r.tokensOut || 0)) > 0) return r;   // real tokens -> success
      } catch (_) {}
      await sleep(1200 * (attempt + 1));   // backoff (likely rate-limited)
    }
    return null;   // failed after retries — NOT counted as 0
  }

  // Second baseline: the whole agent as ONE unstructured prompt (one model call).
  const SINGLE_SYS = "You are a supply-chain analyst with no shared runtime. In ONE pass, analyze every decision listed below and reply with a JSON array of {rootCause, recommendedAction, confidence} — one entry per decision.";
  const ai = process.argv.indexOf("--agents");
  let agentKeys = Object.keys(USE_CASES);
  if (ai > -1 && process.argv[ai + 1]) { const want = new Set(process.argv[ai + 1].split(",").map(s => s.trim())); agentKeys = agentKeys.filter(k => want.has(k)); console.log("measuring only:", agentKeys.join(", "), "\n"); }

  const rows = []; let calls = 0;
  for (const key of agentKeys) {
    let evs = new UNAI({}).run(key).evidence || [];
    if (SAMPLE !== Infinity) evs = evs.slice(0, SAMPLE);
    let uIn = 0, uOut = 0, nIn = 0, nOut = 0, failed = false;
    for (const ev of evs) {
      const user = JSON.stringify({ decision: ev.decision, drivers: (ev.attribution || []).map(a => a.name) });
      const u = await measure(UNAI_SYS, user, "medium", 200); calls++; await sleep(DELAY);
      const n = await measure(NAIVE_SYS, user, "complex", 400); calls++; await sleep(DELAY);
      if (!u || !n) { failed = true; break; }   // couldn't measure this agent — flag, don't fake a 0
      uIn += u.tokensIn || 0; uOut += u.tokensOut || 0; nIn += n.tokensIn || 0; nOut += n.tokensOut || 0;
      process.stdout.write("\r  " + key + " — " + calls + " model calls...        ");
    }
    if (failed) { rows.push({ agent: key, dec: evs.length, failed: true }); continue; }
    // Baseline 2: one unstructured prompt for the whole agent (single model call).
    const singleUser = JSON.stringify({ agent: key, decisions: evs.map(ev => ({ decision: ev.decision, drivers: (ev.attribution || []).map(a => a.name) })) });
    const s = await measure(SINGLE_SYS, singleUser, "complex", Math.min(4000, 350 * evs.length)); calls++; await sleep(DELAY);
    const uTot = uIn + uOut, nTot = nIn + nOut, sTot = s ? (s.tokensIn || 0) + (s.tokensOut || 0) : null;
    rows.push({ agent: key, dec: evs.length, unai: uTot, naive: nTot, single: sTot,
      vsNaive: nTot ? ((1 - uTot / nTot) * 100).toFixed(1) : "—",
      vsSingle: sTot ? ((1 - uTot / sTot) * 100).toFixed(1) : "—" });
  }

  process.stdout.write("\n\n=== MEASURED per-agent (real provider tokens, live) ===\n");
  console.log("agent".padEnd(28) + "dec" + "UNAI".padStart(8) + "naive".padStart(8) + "single".padStart(8) + "vNaive".padStart(8) + "vSingle".padStart(8));
  rows.forEach(r => r.failed
    ? console.log(r.agent.padEnd(28) + String(r.dec).padStart(3) + "   MEASUREMENT FAILED (rate-limited — re-run, raise --delay)")
    : console.log(r.agent.padEnd(28) + String(r.dec).padStart(3) + String(r.unai).padStart(8) + String(r.naive).padStart(8) + String(r.single == null ? "—" : r.single).padStart(8) + (r.vsNaive + "%").padStart(8) + (r.vsSingle + "%").padStart(8)));
  const ok = rows.filter(r => !r.failed), bad = rows.filter(r => r.failed);
  const U = ok.reduce((a, r) => a + r.unai, 0), N = ok.reduce((a, r) => a + r.naive, 0);
  const okS = ok.filter(r => r.single != null), S = okS.reduce((a, r) => a + r.single, 0), US = okS.reduce((a, r) => a + r.unai, 0);
  console.log("\nMEASURED across " + ok.length + "/" + rows.length + " agents:");
  console.log("  vs naive (many agents):  UNAI " + U + " vs " + N + (N ? " -> " + ((1 - U / N) * 100).toFixed(1) + "% reduction" : ""));
  console.log("  vs single big prompt:    UNAI " + US + " vs " + S + (S ? " -> " + ((1 - US / S) * 100).toFixed(1) + "% reduction" : "") + " (across " + okS.length + " agents)");
  console.log("  (" + calls + " model calls)");
  if (bad.length) console.log("NOT MEASURED: " + bad.map(r => r.agent).join(", ") + " — re-run with a higher --delay or a paid key.");
  console.log("(measured on " + cfg.model + "; run without --sample for the full number)");
})();
