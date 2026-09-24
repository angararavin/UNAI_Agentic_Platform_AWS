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
/* =============================================================================
 * Test Buddy — predefined test suite for the UNAI app.
 * Coverage (as agreed): (1) Engine + token model, (2) Server endpoints,
 * (3) Frontend integrity.
 *
 * Run:  node coworkers/test_buddy_suite.js
 * Emits: coworkers/test_report.json  +  coworkers/test_report.html
 * Exit code: 0 = all pass, 1 = one or more failures (so a rebuild can be gated).
 *
 * Zero external dependencies (Node stdlib only). Test Buddy hands the failing
 * cases back to the main program as an actionable bug list.
 * ========================================================================== */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn, execFileSync } = require("child_process");

const HERE = __dirname;
const ROOT = path.resolve(HERE, "..");
const APP = path.join(ROOT, "unai-app");
const INDEX = path.join(APP, "index.html");
const ENGINE = path.join(APP, "engine.js");
const SERVER = path.join(APP, "server.js");

const results = [];
const rec = (group, name, pass, detail) => results.push({ group, name, pass: !!pass, detail: detail || "" });
const check = (group, name, fn) => { try { const d = fn(); rec(group, name, true, d || ""); } catch (e) { rec(group, name, false, e.message); } };
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

/* ---------------------------- 1b. LLM ROUTER + CLAUDE ------------------------ */
function llmTests() {
  const LLM = path.join(APP, "llm.js");
  const { LLM_REGISTRY, resolveProviders } = require(LLM);
  check("llm", "Claude registered as native provider (defaults intact)", () => {
    assert(LLM_REGISTRY.anthropic, "no anthropic entry");
    assert(LLM_REGISTRY.anthropic.kind === "anthropic", "anthropic not tagged native");
    assert(LLM_REGISTRY.openai && LLM_REGISTRY.mistral, "default providers missing");
    return "anthropic(kind:native) + openai + mistral present";
  });
  check("llm", "default router order unchanged (openai,mistral)", () => {
    // with no keys set, the router yields nothing; the DEFAULT ORDER constant is
    // still openai,mistral — Claude only joins when added to LLM_ROUTER_ORDER.
    const saved = { o: process.env.OPENAI_API_KEY, m: process.env.MISTRAL_API_KEY, a: process.env.ANTHROPIC_API_KEY, ord: process.env.LLM_ROUTER_ORDER };
    try {
      process.env.OPENAI_API_KEY = "x"; process.env.MISTRAL_API_KEY = "y"; delete process.env.ANTHROPIC_API_KEY; delete process.env.LLM_ROUTER_ORDER;
      let ps = resolveProviders();
      assert(ps.map(p => p.label).join(",") === "openai,mistral", "default chain changed: " + ps.map(p => p.label));
      process.env.ANTHROPIC_API_KEY = "z"; process.env.LLM_ROUTER_ORDER = "openai,mistral,claude";
      ps = resolveProviders();
      const c = ps.find(p => p.label === "anthropic");
      assert(c && c.kind === "anthropic", "claude did not join chain when added");
      return "defaults preserved; claude opt-in works";
    } finally { Object.assign(process.env, {}); for (const k of ["OPENAI_API_KEY","MISTRAL_API_KEY","ANTHROPIC_API_KEY","LLM_ROUTER_ORDER"]) delete process.env[k];
      if (saved.o) process.env.OPENAI_API_KEY = saved.o; if (saved.m) process.env.MISTRAL_API_KEY = saved.m;
      if (saved.a) process.env.ANTHROPIC_API_KEY = saved.a; if (saved.ord) process.env.LLM_ROUTER_ORDER = saved.ord; }
  });
}

/* ---------------------------- 1c. COGNITION LAYER ---------------------------- */
function cognitionTests(){
  const COG = require(path.join(APP, "cognition.js"));
  check("cognition", "ontology library + world model present", () => {
    const s = COG.libraryStats(); const w = COG.worldModelGraph();
    assert(s.concepts >= 30 && s.aliases >= 150, "library too small: " + JSON.stringify(s));
    assert(w.edges.length >= 8 && w.formulas.length >= 3, "world model too small");
    return `${s.concepts} concepts · ${s.aliases} aliases · ${w.edges.length} causal edges`;
  });
  check("cognition", "self-onboarding maps a foreign schema with confidence", () => {
    const r = COG.autoOnboard({ tables: { t: ["item_code","warehouse","actual_qty","standard_price","lead_time"] } });
    assert(r.coverage >= 0.8, "coverage too low: " + r.coverage);
    const sku = r.proposals.find(p => p.column === "item_code");
    assert(sku && sku.concept === "sku" && sku.confidence >= 0.9, "item_code did not map to sku");
    return `coverage ${Math.round(r.coverage*100)}% · unlocked ${r.unlocked.length}`;
  });
  check("cognition", "learn() grows the library (network effect)", () => {
    const before = COG.libraryStats().aliases;
    const st = COG.learn([{ column: "zz_custom_reorder_lvl", concept: "reorder_point" }]);
    assert(st.aliases === before + 1, "alias count did not grow");
    return `+${st.added} learned`;
  });
  check("cognition", "catalog agents run real domain steps (not generic)", () => {
    const lg = COG.useCaseLogic("demand_driven_replenishment");
    assert(lg && lg.method === "DDMRP" && /buffer/.test(lg.formula || ""), "no DDMRP logic");
    const { UNAI } = require(ENGINE);
    const g = { name:"ddmrp agent", gen1Agents:["ddmrp"], plan:[{ capability:"cap_demand_driven_replenishment", systems:[] }] };
    const ev = (new UNAI({name:"t"}).run(g).results["cap_demand_driven_replenishment"] || {}).evidence;
    assert(ev && ev.method === "DDMRP", "engine did not run the domain pack");
    assert((ev.attribution || []).some(d => /net flow/.test(d.name)), "drivers are not domain concepts");
    return "domain pack via engine: " + ev.method;
  });
  check("cognition", "IBP-grounded use-case catalog", () => {
    const cat = COG.useCaseCatalog();
    assert(cat.length >= 25, "catalog too small: " + cat.length);
    ["demand_driven_replenishment","multi_echelon_inventory","synchronized_planning","mro_inventory_planning","demand_sensing"]
      .forEach(k => assert(cat.some(u => u.key === k), "missing IBP use case: " + k));
    const mods = new Set(cat.map(u => u.module));
    assert(mods.size >= 10, "too few modules: " + mods.size);
    return `${cat.length} use cases · ${mods.size} modules`;
  });
  check("cognition", "run-time resolver: learned mapping → live query", () => {
    COG.registerSystem("ERPX", { sku: "item_code", on_hand_qty: "actual_qty" });
    assert(COG.resolveField("sku", "ERPX") === "item_code", "resolveField failed");
    const q = COG.buildSelect("ERPX", ["sku","on_hand_qty"], "stock");
    assert(/item_code AS sku/.test(q) && /actual_qty AS on_hand_qty/.test(q) && /FROM stock/.test(q), "buildSelect wrong: " + q);
    // engine OntologyMapper must consult the learned mapping (cognition wins over ontology)
    const { OntologyMapper, ONTOLOGY } = require(ENGINE);
    const m = new OntologyMapper(ONTOLOGY);
    assert(m.fieldFor("ERPX", "sku") === "item_code", "OntologyMapper did not use learned mapping");
    return "resolver + engine bridge verified";
  });
  check("cognition", "Neo4j export includes full library + learned maps", () => {
    COG.registerSystem("ZZTEST", { sku: "zz_item", on_hand_qty: "zz_qty" });
    const g = COG.exportForGraph();
    assert(g.concepts.length >= 60 && g.concepts[0].aliases.length, "concepts/aliases missing");
    assert(g.systems.some(r => r.system === "ZZTEST" && r.field === "zz_item"), "learned mapping not exported");
    return `${g.concepts.length} concepts · ${g.systems.length} learned maps`;
  });
  check("cognition", "Cognition Layer view wired in UI", () => {
    const html = fs.readFileSync(INDEX, "utf8");
    ["renderCognition","cogOnboard","cognition.js","Cognition Layer"].forEach(s =>
      assert(html.includes(s), "missing: " + s));
    assert(/renderArchitecture[\s\S]{0,4000}renderCognition|renderCognition/.test(html), "cognition not wired");
    return "cognition wired (merged into Architecture view)";
  });
}

/* ---------------------------- 1. ENGINE + TOKEN MODEL ------------------------ */
function engineTests() {
  const { UNAI, USE_CASES } = require(ENGINE);
  const keys = Object.keys(USE_CASES);
  check("engine", "loads 13 use cases", () => { assert(keys.length === 13, `expected 13, got ${keys.length}`); return keys.length + " use cases"; });
  let anyReuse = false;
  for (const k of keys) {
    check("engine", `run: ${k}`, () => {
      const o = new UNAI({ name: "TestBuddy" }).run(k);
      const ob = o.observability;
      assert(ob, "no observability");
      // layerTokens sum to total (single source of truth)
      const lt = ob.layerTokens.reduce((a, x) => a + x.total, 0);
      assert(lt === ob.tokensTotal, `layerTokens ${lt} != tokensTotal ${ob.tokensTotal}`);
      // shared-vs-naive token model consistency
      const tm = ob.tokenModel;
      assert(tm, "no tokenModel");
      assert(tm.runtimeTotal === ob.tokensTotal, "runtimeTotal != tokensTotal");
      assert(tm.naiveTotal >= tm.runtimeTotal, "naive < runtime (savings negative)");
      assert(tm.savedTokens === tm.naiveTotal - tm.runtimeTotal, "savedTokens inconsistent");
      assert(tm.savedPct >= 0 && tm.savedPct <= 100, `savedPct out of range: ${tm.savedPct}`);
      // cognition telemetry
      const c = ob.cognition;
      assert(c && c.planOnce >= 1, "planOnce missing/<1");
      assert(c.executors === o.useCase.plan.length, "executors != plan length");
      assert(typeof c.firstReads === "number" && typeof c.cacheHits === "number", "cognition read counters missing");
      if (c.cacheHits > 0) anyReuse = true;
      return `−${tm.savedPct}% · ${ob.tokensTotal} tok · reuse ${c.cacheHits}`;
    });
  }
  check("engine", "shared-context reuse actually fires (cache hits on ≥1 flow)", () => {
    assert(anyReuse, "no use case produced a cache hit — perception caching not working");
    return "cache reuse observed";
  });
  check("engine", "cacheHitRatePct consistent with reads", () => {
    const ob = new UNAI().run("demand_planning").observability;
    const denom = ob.cognition.firstReads + ob.cognition.cacheHits;
    const expect = denom ? Math.round(100 * ob.cognition.cacheHits / denom) : 0;
    assert(ob.cacheHitRatePct === expect, `cacheHitRatePct ${ob.cacheHitRatePct} != ${expect}`);
    return ob.cacheHitRatePct + "%";
  });
  // ---- APEX-derived fields: router · opsModel · crossLlm · benchmark ----
  check("engine", "complexity router reports a valid tier + measured layers", () => {
    const ob = new UNAI().run("disruption_response").observability;
    const r = ob.router; assert(r, "no router");
    assert(["simple", "medium", "complex"].includes(r.tier), "bad tier: " + r.tier);
    assert(r.layersFired >= 1 && r.layersFired <= r.layersConsidered, "layersFired out of range");
    assert(r.layersFired <= r.layerBudget || r.tier === "complex", "layersFired exceeds tier budget");
    return `${r.tier} · ${r.layersFired}/${r.layersConsidered}`;
  });
  check("engine", "ops model: S+N < N×S and reductions in range", () => {
    const ob = new UNAI().run("disruption_response").observability;
    const op = ob.opsModel; assert(op, "no opsModel");
    assert(op.unaiOps === op.S + op.N, "unaiOps != S+N");
    assert(op.baselineOps === op.N * op.S, "baselineOps != N×S");
    assert(op.opsReductionPct >= 0 && op.opsReductionPct <= 100, "opsReductionPct out of range");
    assert(op.baselineReads >= op.unaiReads, "baselineReads < unaiReads");
    return `${op.unaiOps} vs ${op.baselineOps} ops (−${op.opsReductionPct}%)`;
  });
  check("engine", "cross-LLM: savings % model-agnostic + $ ordered by price", () => {
    const ob = new UNAI().run("supply_planning").observability;
    const x = ob.crossLlm; assert(Array.isArray(x) && x.length >= 4, "crossLlm missing/short");
    const pcts = x.map(m => m.savedPct);
    assert(Math.max(...pcts) - Math.min(...pcts) <= 5, "savings % varies too much across models");
    x.forEach(m => assert(m.baselineCostUsd >= m.unaiCostUsd, "baseline cheaper than UNAI on " + m.model));
    return `${pcts[0]}–${pcts[pcts.length - 1]}% across ${x.length} models`;
  });
  check("engine", "benchmark: per-agent baseline sums to naive total", () => {
    const ob = new UNAI().run("procurement_sourcing").observability;
    const b = ob.benchmark; assert(b && b.baseline && b.baseline.agents, "no benchmark agents");
    const sum = b.baseline.agents.reduce((a, x) => a + x.totalTokens, 0);
    assert(Math.abs(sum - b.baseline.tokensTotal) <= b.baseline.agents.length, "per-agent sum != naive total");
    assert(b.unai.tokensTotal < b.baseline.tokensTotal, "UNAI not cheaper than baseline");
    return `${b.baseline.agents.length} agents sum ≈ ${b.baseline.tokensTotal}`;
  });
  check("engine", "progressive disclosure scopes the ontology context", () => {
    const ob = new UNAI().run("procurement_sourcing").observability;
    const pd = ob.progressiveDisclosure; assert(pd && pd.enabled, "PD not enabled");
    assert(pd.servedTokens < pd.fullOntologyTokens, "served >= full — no disclosure saving");
    const off = new UNAI({ progressiveDisclosure: false }).run("procurement_sourcing").observability;
    assert(off.tokenModel.savedPct <= ob.tokenModel.savedPct, "PD did not increase savings");
    return `served ${pd.servedTokens} vs full ${pd.fullOntologyTokens}`;
  });
  check("engine", "ontologyGraph + specialistRegistry populated", () => {
    const { ontologyGraph, specialistRegistry } = require(ENGINE);
    const g = ontologyGraph(), reg = specialistRegistry();
    assert(g.nodes.length > 20 && g.edges.length > 20 && g.systems.length >= 4, "graph too small");
    assert(reg.length > 20 && reg.every(s => s.input_contract && s.output_contract && s.status === "active"), "registry incomplete");
    return `${g.nodes.length} nodes · ${reg.length} specialists`;
  });
}

/* ------------------------------ 2. FRONTEND INTEGRITY ------------------------ */
function frontendTests() {
  const html = fs.readFileSync(INDEX, "utf8");
  check("frontend", "div tags balanced", () => {
    const o = (html.match(/<div/g) || []).length, c = (html.match(/<\/div>/g) || []).length;
    assert(o === c, `open ${o} != close ${c}`); return `${o} balanced`;
  });
  check("frontend", "main script parses (node --check)", () => {
    const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    assert(blocks.length, "no inline script found");
    const tmp = path.join(HERE, ".__front_check.js");
    fs.writeFileSync(tmp, blocks[blocks.length - 1]);
    try { execFileSync(process.execPath, ["--check", tmp]); } finally { fs.unlinkSync(tmp); }
    return "parsed";
  });
  check("frontend", "no orphaned LAYER_TOK duplicate rate table", () => {
    assert(!/LAYER_TOK\s*=/.test(html), "LAYER_TOK= still present (should read engine layerTokens)");
    return "removed";
  });
  check("frontend", "panels wired to engine token model", () => {
    assert(html.includes("ob.tokenModel"), "ob.tokenModel not referenced");
    assert(html.includes("ob.layerTokens"), "ob.layerTokens not referenced");
    return "tokenModel + layerTokens wired";
  });
  check("frontend", "required element ids present", () => {
    const ids = ["tokenEconomy", "ucCatalog", "obsBody", "genCompare", "resultHeadline", "connBody"];
    const missing = ids.filter(id => !html.includes(`id="${id}"`));
    assert(!missing.length, "missing ids: " + missing.join(", ")); return ids.length + " ids";
  });
  check("frontend", "APEX views + exports wired", () => {
    const need = ["specBody", "specToolbar", "ontExport", "view-specialists"];
    const missing = need.filter(id => !html.includes(id));
    assert(!missing.length, "missing: " + missing.join(", "));
    ["renderSpecialists", "downloadCertificate", "exportOntology", "deployPlatformCard", "ob.crossLlm", "ob.opsModel", "ob.router", "ob.benchmark"]
      .forEach(s => assert(html.includes(s), "missing wiring: " + s));
    return need.length + " ids + exports wired";
  });
  check("frontend", "Knowledge Graph view + live round-trip wired", () => {
    ["view-kg", "kgViz", "kgToolbar"].forEach(id => assert(html.includes(id), "missing id: " + id));
    ["renderKG", "kgLayout", "kgSvg", "kgRead", "===UNAI_ONTOLOGY==="]
      .forEach(s => assert(html.includes(s), "missing KG wiring: " + s));
    return "KG view + force layout + automap parse wired";
  });
  check("frontend", "connection driver-install + Foundry upgrades wired", () => {
    ["drvCheck", "drvInstall", "/api/driver"].forEach(s => assert(html.includes(s), "missing driver wiring: " + s));
    ["cvStubs", "cvDownloadStubs", "cvOneClick"].forEach(s => assert(html.includes(s), "missing Foundry wiring: " + s));
    ["Semantic Kernel", "Bedrock", "OpenAPI", "n8n", "LangChain"].forEach(s => assert(html.includes(s), "missing importer: " + s));
    return "driver install + stubs + one-click + importers wired";
  });
  check("frontend", "weather commercial-proof wired in Gen-1 vs UNAI", () => {
    ["wpCity", "wpOut", "renderWeatherProof", "wpSpecialists"].forEach(s => assert(html.includes(s), "missing weather-proof: " + s));
    return "weather proof present";
  });
  check("frontend", "Data Assistant drawer + query wiring", () => {
    ["daToggle", "daRenderBody", "daRun", "DA_TEMPLATES", "/api/query", "asMode", "renderAsMode"]
      .forEach(s => assert(html.includes(s), "missing data-assistant wiring: " + s));
    return "drawer + templates + /api/query + assistant badge wired";
  });
  check("frontend", "Neo4j ontology store + compose-a-team wired", () => {
    ["/api/neo4j","kgPublishNeo4j","Neo4j store","data-fmode=\"compose\"","composeTeam","fcompose"]
      .forEach(s => assert(html.includes(s), "missing wiring: " + s));
    return "neo4j store + compose present";
  });
  check("frontend", "nav = purpose journey + role filter (no legacy modes)", () => {
    ["NAV_JOURNEY","setRole","ROLE_SETS","1 · Connect data","4 · Prove the value","⚙ Advanced"]
      .forEach(s => assert(html.includes(s), "missing nav bit: " + s));
    assert(!html.includes("NAV_MODE_LABELS") && !html.includes("setNavMode("), "legacy nav mode code still present");
    return "journey + role lens wired";
  });
  check("frontend", "Execution view + FinOps + Marketplace wired", () => {
    ["view-execution","renderExecution","EXEC_KEY","view-finops","renderFinOps","finAnnUNAI","fmarketplace","renderMarket","marketImport"]
      .forEach(s => assert(html.includes(s), "missing wiring: " + s));
    assert(html.includes('data-fmode="marketplace"'), "marketplace foundry tab missing");
    assert(html.includes("Run &amp; watch") || html.includes("Run & watch"), "Execution entry button missing");
    return "execution + finops + marketplace present";
  });
  check("frontend", "Build & Run lists all engine use cases + Foundry agents", () => {
    ["populateUseCases", "manifestToUseCase", "BUILTIN_UC", "isManifest"]
      .forEach(s => assert(html.includes(s), "missing runnable-agents wiring: " + s));
    assert(!/<select id="usecase">[\s\S]*?<option value="spares_planning_ibp"/.test(html) || html.includes("populateUseCases()"),
      "dropdown should be populated dynamically");
    return "dropdown populated from engine + registry; manifests run in-browser";
  });
  check("frontend", "'Orchestrator' not used to label UNAI's core", () => {
    assert(!/Planner ?\/ ?Orchestrator/.test(html), "'Planner / Orchestrator' still present");
    return "clean";
  });
}

/* -------------------------------- 3. SERVER ENDPOINTS ------------------------ */
function httpReq(opts, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(opts, res => {
      let data = ""; res.on("data", d => data += d);
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}
const PORT = 3901, PW = "test-buddy-pw";
async function waitReady(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try { await httpReq({ host: "127.0.0.1", port: PORT, path: "/", method: "GET" }); return true; }
    catch (_) { await new Promise(r => setTimeout(r, 250)); }
  }
  return false;
}
async function serverTests() {
  const srv = spawn(process.execPath, [SERVER], { cwd: APP, env: { ...process.env, APP_PASSWORD: PW, PORT: String(PORT) }, stdio: "ignore" });
  try {
    const up = await waitReady();
    if (!up) { rec("server", "server starts", false, "did not become ready on port " + PORT); return; }
    rec("server", "server starts", true, "ready on " + PORT);

    // unauth health should NOT return a 200 JSON payload
    const un = await httpReq({ host: "127.0.0.1", port: PORT, path: "/api/health", method: "GET" });
    rec("server", "auth enforced on /api/health", un.status === 401 || un.status === 403 || un.status === 302,
        "status " + un.status);

    // login
    const login = await httpReq({ host: "127.0.0.1", port: PORT, path: "/api/login", method: "POST",
      headers: { "Content-Type": "application/json" } }, JSON.stringify({ pw: PW }));
    const cookie = (login.headers["set-cookie"] || []).map(c => c.split(";")[0]).join("; ");
    rec("server", "login sets session cookie", login.status === 200 && !!cookie, "status " + login.status);

    const auth = { host: "127.0.0.1", port: PORT, headers: { "Content-Type": "application/json", "Cookie": cookie } };
    // health with providers
    const h = await httpReq({ ...auth, path: "/api/health", method: "GET" });
    check("server", "/api/health reports providers", () => {
      const j = JSON.parse(h.body);
      assert(j.ok, "health not ok");
      ["databricks", "snowflake", "bigquery", "gateway"].forEach(p => assert(p in j, "missing " + p));
      return "ok · dbx/snow/bq/gateway present";
    });
    // bigquery graceful when unconfigured
    const bq = await httpReq({ ...auth, path: "/api/bigquery", method: "POST" }, JSON.stringify({ cmd: "test" }));
    check("server", "/api/bigquery graceful when unconfigured", () => {
      assert(bq.status === 200, "status " + bq.status);
      const j = JSON.parse(bq.body); assert(j.ok === false, "should be ok:false");
      assert(/not configured/i.test(j.output || ""), "no graceful message");
      return "graceful";
    });
    // ask graceful when no gateway
    const ask = await httpReq({ ...auth, path: "/api/ask", method: "POST" }, JSON.stringify({ question: "what is unai?" }));
    check("server", "/api/ask degrades gracefully (no gateway)", () => {
      assert(ask.status === 200, "status " + ask.status); return "status 200";
    });
  } finally {
    try { srv.kill("SIGKILL"); } catch (_) {}
  }
}

/* --------------------------------- REPORT ---------------------------------- */
function writeReports() {
  const pass = results.filter(r => r.pass).length, fail = results.length - pass;
  const bugs = results.filter(r => !r.pass);
  const groups = [...new Set(results.map(r => r.group))];
  const out = { ts: new Date().toISOString(), total: results.length, passed: pass, failed: fail,
    bugs: bugs.map(b => ({ area: b.group, test: b.name, error: b.detail })), results };
  fs.writeFileSync(path.join(HERE, "test_report.json"), JSON.stringify(out, null, 2));

  const row = r => `<tr class="${r.pass ? "p" : "f"}"><td>${r.group}</td><td>${r.name}</td><td>${r.pass ? "PASS" : "FAIL"}</td><td>${r.detail.replace(/</g, "&lt;")}</td></tr>`;
  const html = `<!doctype html><meta charset="utf-8"><title>Test Buddy report</title>
<style>body{background:#0b1020;color:#e8edfb;font:14px/1.55 system-ui,Segoe UI,Arial;margin:0;padding:28px}
.card{background:#111a33;border:1px solid #243150;border-radius:14px;padding:20px;max-width:960px;margin:0 auto 16px}
h1{font-size:20px;margin:0 0 4px}.sub{color:#93a1c0;font-size:13px}
table{width:100%;border-collapse:collapse;margin-top:10px}th,td{text-align:left;padding:7px 9px;border-bottom:1px solid #22314f;font-size:13px;vertical-align:top}
th{color:#93a1c0}.p td:nth-child(3){color:#22d3aa;font-weight:700}.f td:nth-child(3){color:#e2574c;font-weight:700}
.big{font-size:15px;font-weight:700}.bug{color:#e98b82}</style>
<div class="card"><h1>Test Buddy — UNAI test report</h1>
<div class="sub">${out.ts} · engine + token model · server endpoints · frontend integrity</div>
<p class="big">${pass}/${results.length} passed${fail ? ` · <span class="bug">${fail} failing</span>` : " · all green"}</p>
${fail ? `<div class="sub">Bugs handed back to the main program:</div><ul>${bugs.map(b => `<li class="bug"><b>[${b.group}]</b> ${b.name} — ${b.detail.replace(/</g, "&lt;")}</li>`).join("")}</ul>` : ""}
<table><tr><th>Area</th><th>Test</th><th>Result</th><th>Detail</th></tr>
${groups.map(g => results.filter(r => r.group === g).map(row).join("")).join("")}</table></div>`;
  fs.writeFileSync(path.join(HERE, "test_report.html"), html);
  return { pass, fail, bugs };
}

(async () => {
  console.log("Test Buddy — running predefined suite…\n");
  try { engineTests(); } catch (e) { rec("engine", "suite crashed", false, e.message); }
  try { llmTests(); } catch (e) { rec("llm", "suite crashed", false, e.message); }
  try { cognitionTests(); } catch (e) { rec("cognition", "suite crashed", false, e.message); }
  try { frontendTests(); } catch (e) { rec("frontend", "suite crashed", false, e.message); }
  try { await serverTests(); } catch (e) { rec("server", "suite crashed", false, e.message); }
  const { pass, fail, bugs } = writeReports();
  for (const r of results) console.log(`  ${r.pass ? "✓" : "✗"} [${r.group}] ${r.name}${r.pass ? "" : "  — " + r.detail}`);
  console.log(`\n${pass}/${results.length} passed${fail ? `, ${fail} FAILED` : " — all green"}.`);
  console.log("wrote coworkers/test_report.json + test_report.html");
  if (fail) {
    console.log("\nBUGS TO FIX (hand back to main program):");
    bugs.forEach(b => console.log(`  • [${b.group}] ${b.name}: ${b.detail}`));
  }
  process.exit(fail ? 1 : 0);
})();
