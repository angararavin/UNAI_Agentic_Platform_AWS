#!/usr/bin/env node
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
/* Emit LIVE metrics from the engine (+ benchmark, if present) so the Executive
 * Presenter can keep the deck's savings numbers in sync with the code.
 * Writes coworkers/engine_metrics.json. */
const fs = require("fs");
const path = require("path");
const HERE = __dirname, ROOT = path.resolve(HERE, "..");
const { UNAI, USE_CASES } = require(path.join(ROOT, "unai-app", "engine.js"));

const savedPctByUseCase = {};
let minPct = 100, maxPct = 0;
for (const k of Object.keys(USE_CASES)) {
  const tm = new UNAI().run(k).observability.tokenModel;
  savedPctByUseCase[k] = tm.savedPct;
  minPct = Math.min(minPct, tm.savedPct); maxPct = Math.max(maxPct, tm.savedPct);
}
const HEAD = ["disruption_response", "spares_planning_ibp", "rma_execution"];
const LABEL = { disruption_response: "Disruption", spares_planning_ibp: "Spares (IBP)", rma_execution: "RMA" };
const headline = HEAD.map(k => {
  const o = new UNAI().run(k); const tm = o.observability.tokenModel;
  return { key: k, label: `${LABEL[k]} · ${tm.nAgents} agents`, naive: tm.naiveTotal, runtime: tm.runtimeTotal, savedPct: tm.savedPct };
});

// benchmark (if the report has been generated)
let benchmark = null;
try {
  const bj = JSON.parse(fs.readFileSync(path.join(ROOT, "supply-chain-workbench", "token_benchmark_report.json"), "utf8"));
  benchmark = { gen1: bj.gen1.total, unai: bj.unai.total, savedPct: bj.tokens_saved_pct,
    cachedCost: bj.unai_cached ? bj.unai_cached.cost : null };
} catch (_) {}

const out = { ts: new Date().toISOString(), minPct, maxPct, savedPctByUseCase, headline, benchmark };
fs.writeFileSync(path.join(HERE, "engine_metrics.json"), JSON.stringify(out, null, 2));
console.log(`engine_metrics.json written · savings ${minPct}%–${maxPct}%` + (benchmark ? ` · benchmark −${benchmark.savedPct}%` : " · (no benchmark yet)"));
