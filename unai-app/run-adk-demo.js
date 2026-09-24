/*
 * run-adk-demo.js — runs UNAI against the REAL adk_spares_rma_demo app's data
 * (a safe copy — see adapters/adk_spares_rma.js) instead of UNAI's own mock
 * adapters, and prints the same before/after proof the Studio UI shows.
 *
 * Usage: node run-adk-demo.js "C:\path\to\adk_spares_rma_demo\adk_spares_rma_demo"
 */
const { UNAI } = require("./engine.js");
const { buildAdkSparesRmaAdapters } = require("./adapters/adk_spares_rma.js");

const adkPath = process.argv[2];
if (!adkPath) { console.error("usage: node run-adk-demo.js <path to adk_spares_rma_demo>"); process.exit(1); }

const { ANALYTICS, SAP_IBP, SAP_S4, SERVICENOW, copyPath } = buildAdkSparesRmaAdapters(adkPath);
console.log(`[adk] real data source: ${copyPath} (safe copy — your app's own state is untouched)\n`);

function runOne(key) {
  const out = new UNAI({ name: "Universal Supply-Chain UNAI" }).run(key, { ANALYTICS, SAP_IBP, SAP_S4, SERVICENOW });
  const m = out.metrics, ob = out.observability;
  console.log(`\n=== ${out.useCase.name} ===`);
  console.log(out.useCase.description);
  console.log(`ADK app's own agent count for this workflow : ${m.gen1AgentCount} (${out.useCase.gen1Agents.join(", ")})`);
  console.log(`UNAI agents actually used                   : ${m.agentsActuallyUsed}  (${m.substitutionRatio} collapse)`);
  console.log(`Layer implementations   Gen-1 vs UNAI        : ${m.gen1LayerImpls} vs ${m.gen2LayerImpls}  (-${m.layerComplexityReductionPct}%)`);
  console.log(`Context switches        Gen-1 vs UNAI        : ${m.naiveContextSwitches} vs ${m.actualContextSwitches}`);
  console.log(`Autonomous actions executed                  : ${m.actionsExecuted}`);
  console.log(`Tokens (modeled)        naive vs shared       : ${ob.tokenModel.naiveTotal.toLocaleString()} vs ${ob.tokensTotal.toLocaleString()}  (-${ob.tokenModel.savedPct}%)`);
  console.log(`Est. cost this run                            : $${ob.estCostUsd}`);
  console.log("\n-- decisions (from real ADK data) --");
  out.evidence.forEach(ev => console.log(`  [${ev.autonomous ? "AUTO" : "GATE"} ${(ev.confidence*100).toFixed(0)}%] ${ev.decision}`));
  return out;
}

const out = runOne("spares_rma_closed_loop");

console.log("\n=== Combined proof ===");
console.log(`${out.metrics.gen1AgentCount} Gen-1-style specialist agents (the ADK app implements 6 of them already, as one orchestrator) -> 1 shared UNAI runtime.`);
console.log(`See ${copyPath} for the real writes (stock transfers, POs, repair orders) this run made.`);
