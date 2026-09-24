/*
 * UNAI - Universal Supply-Chain Agent (Cognitive Runtime)
 * Copyright (c) 2026 Ravin Angara / Bristlecone. All rights reserved.
 * 
 * PROPRIETARY & CONFIDENTIAL. This file, and the architecture, methods and
 * ideas it embodies, are the exclusive property of the copyright holders.
 * No part may be copied, reproduced, modified, distributed, reverse-engineered,
 * or used to create derivative works without prior written permission.
 * Shared under confidentiality; unauthorized use or disclosure is prohibited.
 * See LICENSE. Integrity: this file is listed in copyright/MANIFEST.sha256.
 * SPDX-License-Identifier: LicenseRef-UNAI-Proprietary   [UNAI-COPYRIGHT v1]
 */
/* Headless demo / verification — runs the engine and prints the proof metrics.
 * Usage:  node run-demo.js            (in-memory)
 *         node run-demo.js --sqlite   (SQLite-backed, if better-sqlite3 present)
 */
const { UNAI } = require("./engine.js");
let systems;
if (process.argv.includes("--sqlite")) {
  try { systems = require("./db.js").buildSqliteAdapters().systems; console.log("backend: sqlite"); }
  catch (e) { console.log("sqlite unavailable, using in-memory:", e.message); }
}
if (!systems) console.log("backend: in-memory");

const out = new UNAI({ name: "Universal Supply-Chain UNAI" }).run("disruption_response", systems);
const m = out.metrics;

console.log("\n=== SUPER AGENT RUN:", out.useCase.name, "===");
console.log("Systems of record touched :", out.systemsTouched.join(", "));
console.log("Agents needed : used      :", m.substitutionRatio, `(${m.agentsSubstituted} replaced by 1)`);
console.log("Gen-1 layer implementations:", m.gen1LayerImpls);
console.log("Gen-2 layer implementations:", m.gen2LayerImpls, "(7 shared + tool packs)");
console.log("Layer-complexity reduction :", m.layerComplexityReductionPct + "%");
console.log("Context switches  Gen1→Gen2:", m.naiveContextSwitches, "→", m.actualContextSwitches,
            "(" + m.contextSwitchReductionPct + "% reduction)");
console.log("Ontology field translations:", m.ontologyTranslations);
console.log("A2A messages               :", m.a2aMessages);
console.log("Autonomous actions executed:", m.actionsExecuted);
console.log("End-to-end time            :", m.elapsedMs, "ms");

console.log("\n--- Purchase orders raised ---");
(out.results.procurement_act.purchaseOrders || []).forEach(p =>
  console.log(` ${p.po}  ${p.sku}  qty ${p.qty}  ${p.supplier}${p.rerouted ? " (rerouted)" : ""}  $${p.value}  [${p.autonomous ? "autonomous" : "human gate"}]`));

module.exports = { out };
