#!/usr/bin/env node
/*
 * demo_preflight.js — UNAI RUNTIME demo pre-flight.
 * ---------------------------------------------------------------------------
 * Talks to a RUNNING UNAI server and proves the demo-critical path actually
 * works end-to-end, live — the thing a static scan cannot do. It:
 *   1) checks the startup model self-check (/api/model/health)
 *   2) runs a real SDLC generation (/api/sdlc/generate) with a sample BRD
 *   3) asserts the output is demo-clean: every section generated, nothing
 *      truncated, no template/placeholder leak, no dangling tables, latency
 *      measured, and the Gen-1 vs UNAI verdict matches the numbers.
 *
 *   node demo_preflight.js                     # http://localhost:3000
 *   node demo_preflight.js --url http://localhost:3001
 *   UNAI_COOKIE="unai_role=admin; unai_auth=…" node demo_preflight.js
 *
 * Exit 0 = green light. Exit 2 = a defect that would show in the demo.
 * Run it AFTER the server has been up ~15s (so the model self-check has run)
 * and a model key is connected, right before you present.
 */
const http = require("http");
const https = require("https");
const { URL } = require("url");

const argv = process.argv.slice(2);
const getArg = (k, d) => { const i = argv.indexOf(k); return i>=0 && argv[i+1] ? argv[i+1] : d; };
const BASE = getArg("--url", process.env.UNAI_URL || "http://localhost:3000").replace(/\/$/, "");
const COOKIE = process.env.UNAI_COOKIE || "";

const SAMPLE_BRD = [
"Business Requirement: Automated Demand Sensing & Forecasting (SAP S/4HANA + BW/4HANA).",
"Objective: ingest multi-source demand signals (POS via EDI 852, distributor sell-through, open sales orders VBAK/VBAP, marketing events) and harmonize them against the enterprise item-location master (MARA/MARC, plant T001W) to produce weekly SKU-location forecasts with confidence bands.",
"Interfaces: inbound EDI 852 via SAP CPI (iDoc/OData), outbound forecast to IBP via CPI-DS; RFC to legacy APO for transition.",
"Data: custom staging table ZDMD_SIGNAL (signal source, SKU, plant, week, qty, confidence); reuse MARA, MARC, VBAP, T001W.",
"Validations: reject signals for unknown SKU/plant; quantity > 0; week within horizon; dedupe by source+SKU+plant+week.",
"Roles: demand planner (display+approve), integration user (batch), admin (config). Authorization object M_MATE_WRK by plant.",
"NFR: 2M signal rows/week, nightly batch < 2h, forecast API p95 < 800ms, 3-year retention.",
"Assumptions: item-location master is mastered in S/4; IBP is the system of record for the published forecast."
].join("\n");

function req(method, path, body){
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + path);
    const lib = u.protocol === "https:" ? https : http;
    const data = body ? Buffer.from(JSON.stringify(body)) : null;
    const r = lib.request(u, { method, headers: Object.assign(
      { "Content-Type": "application/json", "Accept": "application/json" },
      data ? { "Content-Length": data.length } : {},
      COOKIE ? { "Cookie": COOKIE } : {}) }, res => {
        let buf=""; res.on("data",c=>buf+=c); res.on("end",()=>resolve({ status: res.statusCode, body: buf }));
      });
    r.on("error", reject);
    r.setTimeout(180000, () => { r.destroy(new Error("timeout after 180s")); });
    if(data) r.write(data); r.end();
  });
}
const J = s => { try { return JSON.parse(s); } catch { return null; } };

const results = [];
const ok  = (name, detail) => results.push({ pass:true,  name, detail });
const bad = (name, detail) => results.push({ pass:false, name, detail });
const warn= (name, detail) => results.push({ warn:true,  name, detail });

(async () => {
  console.log("UNAI demo pre-flight → " + BASE + (COOKIE ? "  (with cookie)" : ""));

  // 1) model health -----------------------------------------------------------
  let modelLive = false;
  try {
    const h = await req("GET", "/api/model/health");
    const hj = J(h.body);
    if(h.status === 200 && hj){
      const live = (hj.providers||[]).filter(p=>p.ok);
      if(live.length){ modelLive = true; ok("Model self-check", hj.summary + " · " + live.map(p=>p.label+"="+(p.resolvedModel||"?")).join(", ")); }
      else if((hj.providers||[]).length){ bad("Model self-check", "providers configured but NONE responded: " + (hj.providers||[]).map(p=>p.label+" ("+(p.error||"?")+")").join("; ")); }
      else warn("Model self-check", "no provider configured — SDLC will show 'not generated'. Connect a key before the demo.");
    } else bad("Model self-check", "unexpected /api/model/health response (HTTP " + h.status + ") — is this build current?");
  } catch(e){ bad("Server reachable", "could not reach " + BASE + " (" + e.message + ") — is the server running?"); }

  if(results.some(r=>r.name==="Server reachable" && !r.pass)) return report();

  // 2) live SDLC generation ---------------------------------------------------
  let gen = null;
  try {
    const g = await req("POST", "/api/sdlc/generate", { brd: SAMPLE_BRD, objectType: "auto", documents: ["fs","ts"] });
    gen = J(g.body);
    if(g.status !== 200 || !gen){ bad("SDLC generate", "HTTP " + g.status + " — " + String(g.body).slice(0,160)); return report(); }
    if(gen.ok === false){ bad("SDLC generate", gen.error || "generation returned ok:false"); return report(); }
    ok("SDLC generate", (gen.docs||[]).length + " document(s), " + (gen.sectionsGenerated||0) + " sections");
  } catch(e){ bad("SDLC generate", e.message); return report(); }

  const es = gen.explainSummary || {};
  const docsMd = (gen.docs||[]).map(d=>d.markdown||"").join("\n");

  // 3) demo-clean assertions --------------------------------------------------
  if(modelLive){
    (es.failed||0) === 0 ? ok("No failed sections", (es.complete||0)+"/"+(es.total||0)+" generated")
      : bad("No failed sections", (es.failed)+" section(s) did not generate — provider throttled. Re-run / lower SDLC_CONCURRENCY.");
    (es.incomplete||0) === 0 ? ok("No truncated sections", "none cut off")
      : bad("No truncated sections", (es.incomplete)+" section(s) truncated — raise SDLC_SECTION_TOKENS or check the repair sweep.");
    es.demoClean ? ok("demoClean flag", "true") : bad("demoClean flag", "false — see failed/incomplete above");
    (gen.latency && gen.latency.measured) ? ok("Latency measured", (gen.latency.msTotal/1000).toFixed(1)+"s wall-clock, ×"+(gen.latency.concurrency||1))
      : bad("Latency measured", "latency.measured is false despite a live model");
    es.repaired ? warn("Repair sweep", es.repaired+" section(s) were auto-recovered on retry — fine, but the provider is flaky; consider a paid tier / failover key.") : ok("Repair sweep", "no retries needed");
  } else {
    warn("SDLC content", "no model connected — skipping content assertions. Connect a key and re-run this pre-flight.");
  }

  // string-level leaks / broken tables in the actual output
  /template preview/i.test(docsMd) ? bad("No template leak", "'template preview' string present in output")
    : ok("No template leak", "clean");
  /did not generate/i.test(docsMd)
    ? (modelLive ? bad("No 'did not generate' notes", "at least one section failed silently") : ok("No 'did not generate' notes", "expected (no model)"))
    : ok("No 'did not generate' notes", "clean");
  const dangling = docsMd.split("\n").filter(l=>/^\s*\|/.test(l) && !/\|\s*$/.test(l) && !/-{3,}/.test(l));
  dangling.length === 0 ? ok("No dangling table rows", "all tables terminate cleanly")
    : bad("No dangling table rows", dangling.length+" unterminated table row(s) — truncation slipped through");
  // a real spec section should be substantial
  const shortSecs = (gen.explain||[]).filter(e=>e.mode==="live" && (e.tokensOut||0) > 0 && (e.tokensOut||0) < 40);
  shortSecs.length === 0 ? ok("Sections substantive", "no stubby live sections")
    : warn("Sections substantive", shortSecs.length+" live section(s) look thin (<40 output tokens)");

  // 4) Gen-1 vs UNAI verdict matches the numbers (the bug that started this) --
  const gc = gen.genComparison;
  if(gc && gc.thisSource && gc.measuredUnai){
    const ts = gc.thisSource;
    const uCheaper = (ts.cost && ts.cost.savedPct >= 0) && ((ts.tokens && ts.tokens.unai||0) <= (ts.tokens && ts.tokens.gen1||0));
    // We can't see the rendered sentence here, but we CAN assert the data is
    // self-consistent: savedPct sign must agree with the token comparison.
    const tokPct = ts.tokens && ts.tokens.gen1 ? (ts.tokens.gen1 - ts.tokens.unai) : 0;
    (tokPct >= 0) === (ts.cost.savedPct >= 0)
      ? ok("Comparison self-consistent", "UNAI " + (uCheaper?"cheaper":"pricier") + " on this source — tokens & cost agree")
      : bad("Comparison self-consistent", "token delta and cost savedPct DISAGREE — the verdict label will contradict the numbers");
  } else if(gc && !gc.measuredUnai){
    warn("Comparison", "shown as modeled (no live UNAI tokens) — expected only if the model didn't run.");
  }

  report();
})();

function report(){
  const fails = results.filter(r=>!r.pass && !r.warn);
  const warns = results.filter(r=>r.warn);
  console.log("");
  for(const r of results){ const m = r.pass ? "  ✓ " : r.warn ? "  ⚠ " : "  ✗ "; console.log(m + r.name + " — " + r.detail); }
  console.log("");
  if(fails.length){ console.log("RESULT: ✗ NOT demo-ready — " + fails.length + " blocking issue(s)" + (warns.length?", "+warns.length+" warning(s)":"") + "."); process.exit(2); }
  if(warns.length){ console.log("RESULT: ⚠ demo-ready with " + warns.length + " warning(s) — read them."); process.exit(0); }
  console.log("RESULT: ✓ demo-ready — every check passed."); process.exit(0);
}
