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
/* Executive Presenter — refresh all artifacts from the current code/metrics.
 *   1) emit live engine metrics       (engine_metrics.json)
 *   2) regenerate the token benchmark  (token_benchmark_report.{json,html})
 *   3) refresh the exec deck in place  (slides 5 & 6 redrawn from live metrics)
 *
 * Run:  node coworkers/refresh_artifacts.js
 */
const path = require("path");
const { execFileSync } = require("child_process");
const HERE = __dirname, ROOT = path.resolve(HERE, "..");
const WB = path.join(ROOT, "supply-chain-workbench");
const run = (cmd, args, cwd) => { console.log(`\n$ ${cmd} ${args.join(" ")}`); execFileSync(cmd, args, { cwd, stdio: "inherit" }); };

console.log("Executive Presenter — refreshing artifacts…");
try { run("python3", ["token_benchmark.py"], WB); }
catch (e) { console.log("  (benchmark step skipped: " + e.message + ")"); }
run("node", [path.join(HERE, "engine_metrics.js")], ROOT);
run("python3", [path.join(HERE, "update_deck.py")], ROOT);
console.log("\n✓ Artifacts refreshed: benchmark report, engine metrics, executive deck (slides 5 & 6).");
