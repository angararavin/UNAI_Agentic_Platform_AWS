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
 * server.js — serves the UI and runs the Super Agent against SQLite
 * Run:  npm install && npm start    then open http://localhost:3000
 * Falls back to in-memory adapters automatically if better-sqlite3 is absent.
 * ========================================================================== */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
const os = require("os");
// Node's global fetch enforces its own ~5min "headers timeout" on top of
// whatever AbortSignal you pass — a slow-to-respond call (e.g. a multi-minute
// LLM generation) gets killed by that even with signal:AbortSignal.timeout
// (600000) set, throwing a generic "fetch failed" / UND_ERR_HEADERS_TIMEOUT.
// The global fetch's dispatcher can't be overridden from userland (it's an
// internal, version-pinned undici instance — passing a dispatcher built from
// the standalone `undici` package throws UND_ERR_INVALID_ARG), so long-running
// calls use undici's OWN fetch + Agent pair instead of the global one. Same
// reasoning forces undici's own FormData: undici's fetch checks `body
// instanceof` its OWN FormData class to decide whether to multipart-encode a
// request — the global FormData is a different class, so passing it silently
// sends no recognizable body (the receiving server sees no fields). Blob is a
// shared platform primitive (not reimplemented by undici), so the global one
// is fine.
const { fetch: undiciFetch, Agent: UndiciAgent, FormData: UndiciFormData } = require("undici");
const WORKBENCH = path.join(__dirname, "..", "supply-chain-workbench");
const LONG_RUN_DISPATCHER = new UndiciAgent({ headersTimeout: 900000, bodyTimeout: 900000 });

// ---- "Your app" live re-measurement (e.g. rma-agent-poc / Ollama) ---------
// Finds a python interpreter inside the target project's own venv (preferring
// a local venv over a possibly-stale committed one) so callers don't need
// their venv on PATH.
function findPythonFor(dir) {
  const candidates = [
    path.join(dir, ".venv-local", "Scripts", "python.exe"),
    path.join(dir, ".venv-local", "bin", "python"),
    path.join(dir, ".venv", "Scripts", "python.exe"),
    path.join(dir, ".venv", "bin", "python"),
  ];
  for (const c of candidates) { if (fs.existsSync(c)) return c; }
  return process.platform === "win32" ? "python" : "python3";
}

// ---- Agent Foundry: "Load from folder" — scan a local agent app's agents/ --
// files (one file per agent, the `export async function run<Name>(...)`
// convention) and hand back a {crew,process,agents:[{role,goal,tools}]} spec
// in the same shape the blank conversion template uses, so the browser's
// existing cvNormalize()/cvAnalyze() CrewAI importer parses it unchanged.
const FOUNDRY_GENERIC_FIELDS = new Set([
  "reasoningsteps", "confidencescore", "keyfactors", "humanactionrequired",
  "activitylogs", "reforecastsummary", "cbasummary", "mitigationplansummary",
  "anomalydetected", "anomalyanalysis", "decompositiontrend", "decompositionseasonal",
  "consensussummary",
]);
const FOUNDRY_ACRONYMS = new Set(["rma", "npi", "kpi", "sop", "sku", "mape", "cba", "ai"]);
function foundryToSnake(s) { return s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[\s-]+/g, "_").toLowerCase(); }
function foundryToTitle(s) {
  return s.replace(/_/g, " ").split(" ")
    .map(w => (FOUNDRY_ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}
function foundryExtractFields(src, typeName) {
  const start = new RegExp(`interface\\s+${typeName}\\s*\\{`).exec(src);
  if (!start) return [];
  let i = start.index + start[0].length, depth = 1;
  const bodyStart = i;
  while (i < src.length && depth > 0) { if (src[i] === "{") depth++; else if (src[i] === "}") depth--; i++; }
  const body = src.slice(bodyStart, i - 1);
  const fields = []; const re = /^\s*([A-Za-z_][A-Za-z0-9_]*)\??\s*:/gm; let m;
  while ((m = re.exec(body))) fields.push(m[1]);
  return fields;
}
function foundryExtractGoal(src) {
  const pm = /const prompt\s*=\s*`([\s\S]*?)`;/.exec(src);
  if (!pm) return null;
  const sm = /You are the [^.]+\.\s*([^\n]+)/.exec(pm[1]);
  if (!sm) return null;
  return sm[1].replace(/\$\{[^}]+\}/g, "<value>").replace(/\s{2,}/g, " ").trim().slice(0, 200);
}
function scanAgentFolder(rootPath, agentsSubdir) {
  const root = path.resolve(String(rootPath || ""));
  if (!fs.existsSync(root)) throw new Error(`Path not found: ${root}`);
  const agentsDir = path.join(root, agentsSubdir || "agents");
  const scanDir = fs.existsSync(agentsDir) ? agentsDir : root;
  const skip = new Set(["client.ts", "client.js", "index.ts", "index.js"]);
  const files = fs.readdirSync(scanDir).filter(f => /\.(ts|js)$/.test(f) && !skip.has(f));
  if (!files.length) throw new Error(`No .ts/.js agent files found in ${scanDir}`);

  const agents = []; const warnings = [];
  for (const f of files) {
    const src = fs.readFileSync(path.join(scanDir, f), "utf8");
    const fnMatch = /export\s+async\s+function\s+run([A-Za-z0-9]+)\s*\(/.exec(src);
    if (!fnMatch) { warnings.push(`${f}: no "export async function run<Name>()" found — skipped`); continue; }
    const rawName = fnMatch[1];
    const afterFn = src.slice(fnMatch.index);
    const retMatch = /Promise<([A-Za-z0-9_]+)>/.exec(afterFn);
    const fields = retMatch ? foundryExtractFields(src, retMatch[1]) : [];
    const tools = fields
      .filter(fld => !FOUNDRY_GENERIC_FIELDS.has(fld.toLowerCase()))
      .map(foundryToSnake)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 8);
    const title = foundryToTitle(foundryToSnake(rawName));
    agents.push({ role: title, goal: foundryExtractGoal(src) || `Handle ${title.toLowerCase()}`, tools: tools.length ? tools : [foundryToSnake(rawName)] });
  }
  if (!agents.length) throw new Error("No convertible agents found — " + warnings.join("; "));

  let appName = path.basename(root);
  try { appName = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).name || appName; } catch (_) {}
  return { appName, agents, warnings, filesScanned: files.length };
}
// ---- Agent Foundry: "Browse…" — a minimal server-side directory picker.
// A plain HTML page can't hand back an absolute filesystem path from a native
// folder-select dialog (browsers deliberately withhold it), so this lets the
// UI click-through real directories on THIS machine and pick one, the same
// server that will actually read it via scanAgentFolder() above.
function listDirs(dirPath) {
  const dir = path.resolve(String(dirPath || os.homedir()));
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new Error(`Not a directory: ${dir}`);
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith("."))
    .map(e => ({ name: e.name, path: path.join(dir, e.name) }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  const parent = path.dirname(dir);
  return { dir, parent: parent === dir ? null : parent, entries };
}
const DBX = { host: !!process.env.DATABRICKS_SERVER_HOSTNAME, http: !!process.env.DATABRICKS_HTTP_PATH,
              token: !!process.env.DATABRICKS_TOKEN,
              catalog: process.env.DATABRICKS_CATALOG || "workspace", schema: process.env.DATABRICKS_SCHEMA || "unai_supply_chain" };
DBX.configured = DBX.host && DBX.http && DBX.token;
const SNOW = { account: !!process.env.SNOWFLAKE_ACCOUNT, user: !!process.env.SNOWFLAKE_USER,
               secret: !!(process.env.SNOWFLAKE_PASSWORD || process.env.SNOWFLAKE_TOKEN || process.env.SNOWFLAKE_PRIVATE_KEY_PATH),
               keypair: !!process.env.SNOWFLAKE_PRIVATE_KEY_PATH,
               warehouse: process.env.SNOWFLAKE_WAREHOUSE || null,
               database: process.env.SNOWFLAKE_DATABASE || "UNAI", schema: process.env.SNOWFLAKE_SCHEMA || "SUPPLY_CHAIN" };
SNOW.configured = SNOW.account && SNOW.user && SNOW.secret;   // secret = password/token OR key-pair
// BigQuery config: UI-saved values (persisted, gitignored) override shell env,
// so users can configure it from the app instead of editing exports.
const BQ_CFG_PATH = path.join(__dirname, ".bqconfig.json");
let BQ_OVR = {};
try { BQ_OVR = JSON.parse(fs.readFileSync(BQ_CFG_PATH, "utf8")); } catch (_) {}
const BQ = {
  project: BQ_OVR.project || process.env.GOOGLE_CLOUD_PROJECT || null,
  dataset: BQ_OVR.dataset || process.env.BIGQUERY_DATASET || "unai_supply_chain",
  location: BQ_OVR.location || process.env.BIGQUERY_LOCATION || "US",
  credentials: BQ_OVR.credentials || process.env.GOOGLE_APPLICATION_CREDENTIALS || null,
};
BQ.creds = !!BQ.credentials;
BQ.configured = !!BQ.project;   // auth may come from a key file OR gcloud ADC
// Neo4j ontology store (AuraDB Free etc.) — persists the canonical ontology graph.
const NEO = { uri: process.env.NEO4J_URI || null, user: process.env.NEO4J_USER || "neo4j" };
NEO.configured = !!(process.env.NEO4J_URI && process.env.NEO4J_PASSWORD);
// env for spawned BigQuery connector — inject the (possibly UI-set) config
function bqEnv() {
  const e = { ...process.env };
  if (BQ.project) e.GOOGLE_CLOUD_PROJECT = BQ.project;
  if (BQ.dataset) e.BIGQUERY_DATASET = BQ.dataset;
  if (BQ.location) e.BIGQUERY_LOCATION = BQ.location;
  if (BQ.credentials) e.GOOGLE_APPLICATION_CREDENTIALS = BQ.credentials;
  return e;
}
const { UNAI, USE_CASES, ONTOLOGY, SemanticQueryCache, enrichExplainability } = require("./engine.js");
const containment = require("./containment.js");
const license = require("./license.js");
const deployment = require("./deployment.js");
const kernel = require("./kernel-client.js");
const apiV1 = require("./api_v1.js");
const customerApi = require("./customer_api.js");
const playgroundEmbed = require("./playground_embed.js");
// Public API (v1) Bearer tokens: from UNAI_API_KEYS (comma-sep) or one generated
// at boot (printed to the log). Distinct from the Studio login-wall cookie.
const API_KEYS = (process.env.UNAI_API_KEYS || "").split(",").map(s => s.trim()).filter(Boolean);
if (!API_KEYS.length) { API_KEYS.push("unai_" + crypto.randomBytes(12).toString("hex")); }
const { generateSpec: sdlcGenerateSpec, extractText: sdlcExtractText } = require("./sdlc_factory.js");
// Document text extraction for uploads. DOCX/TXT/MD are pure-Node (zero-dep);
// PDF uses an OPTIONAL 'pdf-parse' dependency, lazy-loaded — if it isn't
// installed the file is skipped with a clear hint (npm i pdf-parse), so the
// app still runs zero-dependency by default.
let _pdfParse = undefined;
async function extractUploaded(name, buf) {
  const n = String(name || "").toLowerCase();
  if (n.endsWith(".pdf")) {
    if (_pdfParse === undefined) { try { _pdfParse = require("pdf-parse"); } catch (_) { _pdfParse = null; } }
    if (!_pdfParse) { const e = new Error("pdf-support-missing"); e.code = "PDF_DEP"; throw e; }
    const r = await _pdfParse(buf); return (r && r.text) ? r.text : "";
  }
  return sdlcExtractText(name, buf);
}
// Semantic answer cache: re-phrased repeats ("meters with problems / issues /
// defects") resolve to the same canonical signature and return the cached answer
// at 0 tokens. Session-scoped, TTL'd; cleared when the server restarts.
const askCache = new SemanticQueryCache();

// ---- Decision + outcome ledger (retrospective self-healing substrate) --------
// Every run appends its decisions here; outcomes can be attached later. This is
// the base layer the roadmap's drift detection, confidence calibration and the
// learning loop build on. Persisted as JSONL beside the server (survives runs).
const LEDGER = path.join(__dirname, "decision_ledger.jsonl");
function appendLedger(rows){ if(!rows||!rows.length) return; try{ fs.appendFileSync(LEDGER, rows.map(r=>JSON.stringify(r)).join("\n")+"\n"); }catch(e){ console.warn("[ledger]",e.message); } }
function readLedger(){ try{ return fs.readFileSync(LEDGER,"utf8").split("\n").filter(Boolean).map(l=>{try{return JSON.parse(l);}catch(_){return null;}}).filter(Boolean); }catch(_){ return []; } }
function writeLedger(rows){ try{ fs.writeFileSync(LEDGER, rows.map(r=>JSON.stringify(r)).join("\n")+(rows.length?"\n":"")); }catch(e){ console.warn("[ledger]",e.message); } }
function ledgerSummary(rows){
  const n=rows.length, auto=rows.filter(r=>r.autonomous).length;
  const withOut=rows.filter(r=>r.outcome==="correct"||r.outcome==="incorrect");
  const correct=withOut.filter(r=>r.outcome==="correct").length;
  const meanConf=n?rows.reduce((a,r)=>a+(r.confidence||0),0)/n:0;
  // calibration: for scored decisions, mean predicted confidence vs actual accuracy
  const predicted=withOut.length?withOut.reduce((a,r)=>a+(r.confidence||0),0)/withOut.length:0;
  const actual=withOut.length?correct/withOut.length:0;
  // drift: mean confidence of last third vs the prior third (simple signal)
  let drift=0; if(n>=6){ const k=Math.floor(n/3); const recent=rows.slice(-k), prior=rows.slice(-2*k,-k);
    const mc=a=>a.reduce((s,r)=>s+(r.confidence||0),0)/(a.length||1); drift=mc(recent)-mc(prior); }
  return { total:n, autonomyRatePct: n?Math.round(100*auto/n):0, meanConfidence:+meanConf.toFixed(3),
    scored:withOut.length, accuracyPct: withOut.length?Math.round(100*actual):null,
    calibrationGap: withOut.length?+(predicted-actual).toFixed(3):null,  // >0 = over-confident
    confidenceDrift:+drift.toFixed(3), useCases:[...new Set(rows.map(r=>r.useCase))].length };
}
// ---- Recursive self-healing: calibration → auto-adjust autonomy thresholds -----
// If a use case is consistently OVER-confident (predicted >> actual), raise its
// autonomy threshold so borderline decisions route to a human until it re-earns
// trust; if UNDER-confident, relax it slightly. Applied on the next run; audited.
const HEAL = path.join(__dirname, "autonomy_overrides.json");
function loadHeal(){ try{ return JSON.parse(fs.readFileSync(HEAL,"utf8")); }catch(_){ return {}; } }
function saveHeal(o){ try{ fs.writeFileSync(HEAL, JSON.stringify(o,null,2)); }catch(e){ console.warn("[heal]",e.message); } }
function perUseCaseCalibration(rows){
  const by={}; for(const r of rows){ if(r.outcome!=="correct"&&r.outcome!=="incorrect") continue;
    (by[r.useCase]=by[r.useCase]||[]).push(r); }
  const out={}; for(const uc in by){ const a=by[uc]; const pred=a.reduce((s,r)=>s+(r.confidence||0),0)/a.length;
    const acc=a.filter(r=>r.outcome==="correct").length/a.length; out[uc]={ scored:a.length, predicted:+pred.toFixed(3), actual:+acc.toFixed(3), gap:+(pred-acc).toFixed(3) }; }
  return out;
}
function runSelfHeal(){
  const rows=readLedger(); const cal=perUseCaseCalibration(rows); const ov=loadHeal();
  const STEP=0.05, CAP=0.98, FLOOR=0.70, MIN_SCORED=5, GAP=0.10, base=0.85;
  const changes=[];
  for(const uc in cal){ const c=cal[uc]; if(c.scored<MIN_SCORED) continue;
    const cur=(ov[uc]&&ov[uc].threshold)||base; let next=cur, reason=null;
    if(c.gap>GAP && cur<CAP){ next=Math.min(CAP,+(cur+STEP).toFixed(2)); reason=`over-confident (pred ${Math.round(c.predicted*100)}% vs actual ${Math.round(c.actual*100)}%) → raise autonomy gate`; }
    else if(c.gap< -GAP && cur>FLOOR){ next=Math.max(FLOOR,+(cur-STEP).toFixed(2)); reason=`under-confident (pred ${Math.round(c.predicted*100)}% vs actual ${Math.round(c.actual*100)}%) → relax autonomy gate`; }
    if(reason && next!==cur){ ov[uc]={ threshold:next, reason, at:Date.now(), from:cur };
      changes.push({ useCase:uc, from:cur, to:next, gap:c.gap, reason });
      appendLedger([{ id:"heal"+Date.now().toString(36)+Math.floor(Math.random()*1e3), ts:Date.now(), useCase:uc, useCaseName:uc,
        decision:`SELF-HEAL: autonomy threshold ${cur} → ${next} — ${reason}`, confidence:c.actual, threshold:next, autonomous:false, mode:"self_heal", outcome:null }]); }
  }
  saveHeal(ov); return { changes, overrides:ov, calibration:cal };
}
// Your ADK app's REAL agent count for each slice of work — not UNAI's generic
// one-agent-per-capability hypothetical. Your app already partially
// consolidated: spares planning is 1 real agent, RMA is 4 (plus the shared
// orchestrator, not counted here since it only routes, doesn't do the work).
const REAL_ADK_AGENTS = {
  spares_rma_closed_loop: ["ibp_planning_agent", "rma_intake_agent", "rma_diagnosis_agent", "rma_disposition_agent", "rma_execution_agent"].map(n => n + " (your real ADK agent)"),
};
const { buildSqliteAdapters, hasSqlite } = require("./db.js");
const { enrichEvidence, narrateOne, resolveConfig, resolveProviders, answerGrounded, nlToSql, chatWithFailover, chatJSON } = require("./llm.js");
const { runLiveBenchmark } = require("./live_benchmark.js");
const foundryConvert = require("./foundry_convert.js");

// ---- Multimodal Knowledge Assistant (Multimodal Knowledge tab) --------------
// A real KnowledgeAssistant over FOUR combined sources: SharePoint-style
// mock docs, every image/slide in ../assets (VLM caption+OCR via
// multimodal_ingest.js), the meeting-transcript fixture (chunked via
// meeting_transcript_ingest.js), and video files (audio transcript + sampled
// on-screen frame captions/OCR, via video_ingest.js) -- merged by
// knowledge_assistant.js's MultiSource. Built lazily on first
// /api/mmkb/ingest or /api/mmkb/ask (ask() auto-ingests if not yet indexed),
// and cached for the life of the process -- same singleton-in-module-scope
// pattern foundry_convert.js's RUNNING map uses.
let MMKB = null;
function buildMmkb() {
  const { KnowledgeAssistant, MockSharePointSource, MultiSource } = require("./knowledge_assistant.js");
  const { ImageSlideSource } = require("./multimodal_ingest.js");
  const { MeetingTranscriptSource } = require("./meeting_transcript_ingest.js");
  const { VideoSource } = require("./video_ingest.js");
  const { DocumentUploadSource } = require("./office_ingest.js");
  return new KnowledgeAssistant({
    source: new MultiSource([
      new MockSharePointSource(),
      new ImageSlideSource({ dir: path.join(__dirname, "..", "assets"), acl: ["all"] }),
      new MeetingTranscriptSource({ dir: path.join(__dirname, "fixtures", "meetings"), acl: ["all"] }),
      new VideoSource({ dir: path.join(__dirname, "fixtures", "videos"), acl: ["all"] }),
      // Files uploaded via the Multimodal Knowledge tab's own upload button
      // (see /api/mmkb/upload) -- no live SharePoint connection required;
      // download the file from SharePoint/OneDrive yourself, then upload it
      // here. Videos/images uploaded through the same button are routed into
      // the two sources above instead, so they get the SAME real ffmpeg/OCR
      // pipeline as the fixtures, not a separate, weaker path.
      new DocumentUploadSource({ dir: path.join(__dirname, "fixtures", "uploads"), acl: ["all"] }),
    ]),
  });
}
const ocmStore = require("./ocm_store.js");
const ocmCap = require("./ocm_capabilities.js");
const COG = require("./cognition.js");
const COG_STORE = path.join(__dirname, "cognition_learned.json");
const COG_SYS = path.join(__dirname, "cognition_systems.json");
const COG_CONCEPTS = path.join(__dirname, "cognition_concepts.json");
try { if (fs.existsSync(COG_STORE)) { const L = JSON.parse(fs.readFileSync(COG_STORE, "utf8")); COG.applyLearned(L); } } catch (_) {}
try { if (fs.existsSync(COG_SYS)) { const S = JSON.parse(fs.readFileSync(COG_SYS, "utf8")); COG.applySystems(S); } } catch (_) {}
// custom ontology concepts users have added (persist across restarts, same
// mechanism as learned aliases / system maps above — never customer data).
try { if (fs.existsSync(COG_CONCEPTS)) { const C = JSON.parse(fs.readFileSync(COG_CONCEPTS, "utf8")); (C||[]).forEach(c => COG.addConcept(c)); } } catch (_) {}

let store = null;
if (hasSqlite) { try { store = buildSqliteAdapters(); } catch (e) { console.error("SQLite init failed:", e.message); } }
const BACKEND = store ? "sqlite" : "in-memory";
const MISTRAL = !!process.env.MISTRAL_API_KEY;

// --- AI Gateway config (one key, many models) — reported to the Governance tab ---
function gatewayStatus() {
  const provider = process.env.GATEWAY_PROVIDER || "";
  const base = process.env.GATEWAY_BASE_URL || "";
  const hasKey = !!process.env.GATEWAY_API_KEY;
  let providers = [];
  try { providers = resolveProviders().map(p => p.label); } catch (_) {}
  let active = "template";
  if (base && hasKey) active = "gateway:" + (provider || "custom");
  else if (providers.length) active = "router:" + providers.join("→");   // quota-aware failover order
  else if (MISTRAL) active = "mistral-direct";
  return { provider: provider || null, baseUrlSet: !!base, keySet: hasKey, mistralKeySet: MISTRAL,
    openaiKeySet: !!process.env.OPENAI_API_KEY, anthropicKeySet: !!process.env.ANTHROPIC_API_KEY,
    promptCache: /^(1|true|on|yes)$/i.test(process.env.GATEWAY_PROMPT_CACHE || ""),
    routerOrder: process.env.LLM_ROUTER_ORDER || "openai,mistral", providers, active };
}
const ARCH_PW = process.env.ARCH_PASSWORD || "unai-2026";   // override with ARCH_PASSWORD

// --- Full-app login wall (cookie-gated). Override with APP_PASSWORD. -----------
// Set APP_PASSWORD="" (empty) to disable the wall entirely.
const APP_PW = process.env.APP_PASSWORD === undefined ? "bristlecone-2026" : process.env.APP_PASSWORD;  // Admin (full app)
// Expert View — the same app as Admin, with detailed explainability hidden. EXPERT_PASSWORD
// (legacy PUBLIC_PASSWORD still accepted for backward compatibility).
const EXPERT_PW = process.env.EXPERT_PASSWORD !== undefined ? process.env.EXPERT_PASSWORD
                : process.env.PUBLIC_PASSWORD !== undefined ? process.env.PUBLIC_PASSWORD
                : "unai-demo";
const APP_WALL = APP_PW !== "";                              // wall on unless explicitly disabled
const SESSION_TOKEN = crypto.randomBytes(24).toString("hex"); // rotates each server start
function isAuthed(req) {
  if (!APP_WALL) return true;
  const cookie = req.headers.cookie || "";
  const m = cookie.match(/(?:^|;\s*)unai_auth=([a-f0-9]+)/);
  return !!m && m[1] === SESSION_TOKEN;
}
const LOGIN_HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>UNAI — Sign in</title><style>
:root{--bg:#0b1020;--panel:#111831;--line:#243150;--txt:#e8edfb;--mut:#8a97b8;--accent:#4f8cff;--accent2:#22d3aa}
*{box-sizing:border-box}body{margin:0;font:15px/1.5 ui-sans-serif,system-ui,Segoe UI,Roboto,Arial;background:radial-gradient(1200px 600px at 70% -10%,#16203a,#0b1020);color:var(--txt);display:flex;min-height:100vh;align-items:center;justify-content:center}
.box{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:30px;width:360px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4)}
.logo{width:46px;height:46px;border-radius:12px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;margin:0 auto 14px;color:#08111f}
h1{font-size:18px;margin:0 0 4px}p{color:var(--mut);font-size:13px;margin:0 0 18px}
input{width:100%;padding:11px 12px;border-radius:10px;border:1px solid var(--line);background:#0c1326;color:var(--txt);font-size:14px}
button{width:100%;margin-top:12px;padding:11px;border:none;border-radius:10px;background:linear-gradient(90deg,var(--accent),var(--accent2));color:#08111f;font-weight:700;font-size:14px;cursor:pointer}
.msg{color:#ff8f87;font-size:12px;margin-top:10px;min-height:16px}.foot{color:var(--mut);font-size:11px;margin-top:16px}
</style></head><body>
<style>
.seg{display:flex;gap:6px;margin:0 0 14px}
.seg button{flex:1;margin:0;padding:9px;border-radius:9px;border:1px solid var(--line);background:#0c1326;color:var(--mut);font-weight:700;font-size:13px;cursor:pointer}
.seg button.on{background:linear-gradient(90deg,var(--accent),var(--accent2));color:#08111f;border-color:transparent}
.rdesc{color:var(--mut);font-size:12px;margin:-6px 0 14px;min-height:30px}
</style>
<form class="box" onsubmit="return go(event)">
  <div class="logo">U</div><h1>UNAI Platform · Sign in</h1>
  <p>Choose how you want to launch the app.</p>
  <div class="seg">
    <button type="button" id="bAdmin" class="on" onclick="setRole('admin')">Admin</button>
    <button type="button" id="bExpert" onclick="setRole('expert')">Expert View</button>
  </div>
  <div class="rdesc" id="rdesc">Admin — the full app: every view, detailed explanations, internal economics.</div>
  <input id="pw" type="password" placeholder="password" autocomplete="current-password" autofocus>
  <button type="submit" id="signin">Sign in as Admin</button>
  <div class="msg" id="msg"></div>
  <div class="foot">Bristlecone · access-controlled preview</div>
</form>
<script>
var ROLE='admin';
function setRole(r){ROLE=r;
 document.getElementById('bAdmin').classList.toggle('on',r==='admin');
 document.getElementById('bExpert').classList.toggle('on',r==='expert');
 document.getElementById('rdesc').textContent = r==='admin'
   ? 'Admin — the full app: every view, detailed explanations, internal economics.'
   : 'Expert View — the full app (all views), with the detailed explainability panels hidden.';
 document.getElementById('signin').textContent = r==='admin' ? 'Sign in as Admin' : 'Launch Expert View';
 document.getElementById('msg').textContent='';}
async function go(e){e.preventDefault();var pw=document.getElementById('pw').value;
 var r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pw:pw,role:ROLE})}).then(x=>x.json()).catch(()=>({ok:false}));
 if(r.ok){location.href='/';}else{document.getElementById('msg').textContent='Incorrect password for '+ROLE+'.';}
 return false;}
</script></body></html>`;

// Minimal ZIP writer (store / no compression) — zero-dependency, so per-agent bundles
// can be built on the fly without a `zip` CLI. Fine for small text bundles.
const CRC_TBL = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c; } return t; })();
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC_TBL[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function buildStoreZip(files) {
  const chunks = [], central = []; let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name), data = Buffer.isBuffer(f.data) ? f.data : Buffer.from(f.data);
    const crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 6); lh.writeUInt16LE(0, 8);
    lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0x21, 12); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    chunks.push(lh, name, data);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0, 8); ch.writeUInt16LE(0, 10);
    ch.writeUInt16LE(0, 12); ch.writeUInt16LE(0x21, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20);
    ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([ch, name]));
    offset += lh.length + name.length + data.length;
  }
  const cd = Buffer.concat(central), cdStart = offset;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(cdStart, 16);
  return Buffer.concat([...chunks, cd, end]);
}

const GW = gatewayStatus();
console.log(`[unai] data backend: ${BACKEND}${store ? " ("+store.dbPath+")" : ""}  ·  rationale provider: ${GW.active}`);

const MIME = { ".html":"text/html", ".js":"application/javascript", ".css":"text/css", ".json":"application/json",
  ".pdf":"application/pdf", ".png":"image/png", ".svg":"image/svg+xml", ".jpg":"image/jpeg", ".jpeg":"image/jpeg",
  ".csv":"text/csv", ".txt":"text/plain", ".ico":"image/x-icon", ".zip":"application/zip" };

const server = http.createServer((req, res) => {
  const urlPath = req.url.split("?")[0];

  // ---- Login wall ----------------------------------------------------------
  // POST /api/login validates the app password and sets an httpOnly cookie.
  if (urlPath === "/api/login" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      let pw = "", role = "admin"; try { const j = JSON.parse(body || "{}"); pw = j.pw || ""; role = (j.role === "expert" || j.role === "public") ? "expert" : "admin"; } catch (_) {}
      // Admin password always grants admin; the Expert password grants Expert View only.
      let granted = null;
      if (!APP_WALL) granted = role;
      else if (role === "expert" && pw === EXPERT_PW) granted = "expert";
      else if (pw === APP_PW) granted = "admin";     // admin pw works regardless of the toggle
      if (granted) {
        res.writeHead(200, { "Content-Type":"application/json", "Set-Cookie": [
          `unai_auth=${SESSION_TOKEN}; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400`,
          `unai_role=${granted}; Path=/; SameSite=Strict; Max-Age=86400` ] });
        return res.end(JSON.stringify({ ok:true, role: granted }));
      }
      res.writeHead(401, { "Content-Type":"application/json" });
      res.end(JSON.stringify({ ok:false }));
    });
    return;
  }
  if (urlPath === "/api/logout" && req.method === "POST") {
    res.writeHead(200, { "Content-Type":"application/json", "Set-Cookie": [
      "unai_auth=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0", "unai_role=; Path=/; SameSite=Strict; Max-Age=0" ] });
    return res.end(JSON.stringify({ ok:true }));
  }
  // ---- Public API v1 (token-authed) — bypasses the login-wall cookie. ----------
  if (urlPath.startsWith("/api/v1")) {
    Promise.resolve(apiV1.handle(req, res, urlPath,
      { UNAI, USE_CASES, ONTOLOGY, containment, license, deployment, kernel, isAuthed, apiKeys: API_KEYS, fs, path, __dirname }))
      .catch(e => { try { res.writeHead(500, {"Content-Type":"application/json"}); res.end(JSON.stringify({ error: e.message })); } catch (_) {} });
    return;
  }
  // ---- Customer-facing single-agent API (its own scoped key, never UNAI_API_KEYS) —
  // bypasses the login-wall cookie, same as /api/v1. See customer_api.js: a key here
  // unlocks exactly one registered agent slug's /run route, nothing else in the Studio.
  if (urlPath.startsWith("/api/customer-agents/")) {
    Promise.resolve(customerApi.handle(req, res, urlPath, { foundryConvert }))
      .then(handled => { if (!handled) { res.writeHead(404, {"Content-Type":"application/json"}); res.end(JSON.stringify({ error: "not found" })); } })
      .catch(e => { try { res.writeHead(500, {"Content-Type":"application/json"}); res.end(JSON.stringify({ error: e.message })); } catch (_) {} });
    return;
  }
  // Public assets: the Bristlecone brand lockup loads without a session, so the
  // logo shows on the login screen too and never breaks on a cold/cached load.
  const IS_PUBLIC = urlPath.startsWith("/assets/brand/");
  // Anything else requires a valid session. Unauthed → login page (GET) or 401 (API).
  if (!isAuthed(req) && !IS_PUBLIC) {
    if (urlPath.startsWith("/api/")) { res.writeHead(401, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false, error:"auth required" })); }
    res.writeHead(200, { "Content-Type":"text/html" });
    return res.end(LOGIN_HTML);
  }

  if (req.url === "/api/health") {
    res.writeHead(200, { "Content-Type":"application/json" });
    return res.end(JSON.stringify({ ok:true, db: BACKEND, mistral: MISTRAL, gateway: gatewayStatus(), databricks: DBX, snowflake: SNOW, bigquery: BQ, neo4j: NEO, archProtected: true }));
  }
  // Multimodal Knowledge tab: upload a local file (downloaded from
  // SharePoint/OneDrive, or anywhere else) so it becomes indexable WITHOUT a
  // live Graph/SharePoint connection. Sent as base64 JSON rather than
  // multipart/form-data -- this server has no multipart parser and adding
  // one just for this is more than a local single-user upload needs.
  // Routed by extension into whichever fixture directory that file TYPE
  // already gets scanned from (see buildMmkb), so a video/image gets the
  // SAME real ffmpeg/OCR pipeline as the bundled fixtures, not a separate,
  // weaker path -- only pptx/docx/xlsx/pdf/txt/md go through the new
  // DocumentUploadSource (office_ingest.js). Does not auto-reindex; the
  // "Build / Rebuild Index" button already does that and doing it again
  // here would just mean re-ingesting everything twice on a multi-file upload.
  if (req.url === "/api/mmkb/upload" && req.method === "POST") {
    let body = ""; req.on("data", c => body += c); req.on("end", () => {
      try {
        let j = {}; try { j = JSON.parse(body || "{}"); } catch (_) {}
        const filename = String(j.filename || "").replace(/[\\/]/g, "_").trim();
        const dataBase64 = String(j.dataBase64 || "");
        if (!filename || !dataBase64) { res.writeHead(400, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false, error:"provide filename and dataBase64" })); }
        const ext = path.extname(filename).toLowerCase();
        const VIDEO_EXT = new Set([".mp4", ".mov", ".webm", ".mkv", ".avi"]);
        const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
        const DOC_EXT = new Set([".pptx", ".docx", ".xlsx", ".pdf", ".txt", ".md"]);
        let destDir;
        if (VIDEO_EXT.has(ext)) destDir = path.join(__dirname, "fixtures", "videos");
        else if (IMAGE_EXT.has(ext)) destDir = path.join(__dirname, "..", "assets");
        else if (DOC_EXT.has(ext)) destDir = path.join(__dirname, "fixtures", "uploads");
        else {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ ok: false, error: `Unsupported file type "${ext}". Supported: video (${[...VIDEO_EXT].join(", ")}), image (${[...IMAGE_EXT].join(", ")}), document (${[...DOC_EXT].join(", ")}).` }));
        }
        fs.mkdirSync(destDir, { recursive: true });
        const buf = Buffer.from(dataBase64, "base64");
        fs.writeFileSync(path.join(destDir, filename), buf);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, filename, bytes: buf.length, note: "Uploaded -- click \"Build / Rebuild Index\" to index it." }));
      } catch (e) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }
  // Multimodal Knowledge tab: (re)build the combined index (SharePoint +
  // images/slides + meeting transcripts) and return a lightweight doc summary
  // (id/source/link/acl/kind/captionSource -- never the full extracted text,
  // to keep the response small) for the "indexed documents" list in the UI.
  if (req.url === "/api/mmkb/ingest" && req.method === "POST") {
    (async () => {
      try {
        if (!MMKB) MMKB = buildMmkb();
        const r = await MMKB.ingest();
        const docs = Object.values(MMKB._byId).map(d => ({
          id: d.id, source: d.source, link: d.link, acl: d.acl,
          kind: (d.meta && d.meta.kind) || "sharepoint",
          captionSource: d.meta && d.meta.captionSource,
        }));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, indexed: r.indexed, docs }));
      } catch (e) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    })();
    return;
  }
  // Ask across all three sources, permission-trimmed as the admin/expert user
  // (this tab is an internal demo of the retrieval + governance mechanism, not
  // a per-user login system -- the ACL trimming itself is still exercised by
  // KnowledgeAssistant.ask(), same as the standalone CLI demo).
  // Zeroes the "session token economics" counters shown in the UI without
  // touching the index -- the counters live on the one MMKB instance this
  // process shares across every browser tab, so anyone's earlier testing
  // (mine included) otherwise silently counts toward what looks like "this
  // session"'s numbers to whoever's looking at it next.
  if (req.url === "/api/mmkb/reset-economics" && req.method === "POST") {
    if (!MMKB) MMKB = buildMmkb();
    MMKB.resetEconomics();
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true }));
  }
  if (req.url === "/api/mmkb/ask" && req.method === "POST") {
    let body = ""; req.on("data", c => body += c); req.on("end", async () => {
      try {
        let j = {}; try { j = JSON.parse(body || "{}"); } catch (_) {}
        const q = String(j.question || "").trim();
        if (!q) { res.writeHead(400, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false, error:"provide a question" })); }
        if (!MMKB) MMKB = buildMmkb();
        const r = await MMKB.ask(q, { id: "admin", groups: ["all", "finance"] });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, ...r }));
      } catch (e) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }
  // Native AI Gateway telemetry: per-provider/key routing, spend, cooldown, budget.
  if (req.url === "/api/gateway/stats") {
    let stats = {}; try { stats = require("./llm.js").gatewayStats(); } catch (e) { stats = { error: String(e && e.message || e) }; }
    res.writeHead(200, { "Content-Type":"application/json" });
    return res.end(JSON.stringify(stats));
  }
  if (req.url === "/api/gateway/reset" && req.method === "POST") {
    try { require("./llm.js").gatewayResetStats(); } catch (_) {}
    res.writeHead(200, { "Content-Type":"application/json" });
    return res.end(JSON.stringify({ ok:true }));
  }
  // Read the current (masked) gateway config for the UI.
  if (req.url === "/api/gateway/config" && req.method === "GET") {
    let cfg = {}; try { cfg = require("./llm.js").gateway.getConfig(); } catch (e) { cfg = { error: String(e && e.message || e) }; }
    res.writeHead(200, { "Content-Type":"application/json" });
    return res.end(JSON.stringify(cfg));
  }
  // Set gateway config from the UI (keys per provider, policy, budgets, tier prefs,
  // order). Keys are held in process memory only, never written to disk.
  if (req.url === "/api/gateway/config" && req.method === "POST") {
    let b = ""; req.on("data", c => b += c); req.on("end", () => {
      try {
        const g = require("./llm.js").gateway; const j = JSON.parse(b || "{}");
        if (j.keys && typeof j.keys === "object") Object.keys(j.keys).forEach(p => g.setKeys(p, j.keys[p]));
        if (j.budgets && typeof j.budgets === "object") Object.keys(j.budgets).forEach(p => g.setBudget(p, j.budgets[p].usd, j.budgets[p].calls));
        if (j.policy != null) g.setPolicy(j.policy);
        if (j.order != null) g.setOrder(j.order);
        if (j.tierPrefs && typeof j.tierPrefs === "object") Object.keys(j.tierPrefs).forEach(t => g.setTierProviders(t, j.tierPrefs[t]));
        res.writeHead(200, { "Content-Type":"application/json" });
        res.end(JSON.stringify({ ok:true, config: g.getConfig() }));
      } catch (e) { res.writeHead(400, { "Content-Type":"application/json" }); res.end(JSON.stringify({ ok:false, error:String(e && e.message || e) })); }
    });
    return;
  }
  // ---- Driver install/check (removes the "which python / pip" friction) -----
  // POST /api/driver {source, install?} → checks (and optionally pip-installs, into
  // the SAME python3 the connectors use) the DB driver for a source. Allowlisted.
  if (req.url === "/api/driver" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      let source = "", install = false;
      try { const j = JSON.parse(body || "{}"); source = String(j.source || ""); install = !!j.install; } catch (_) {}
      const DRIVERS = {
        databricks: { mod: "databricks.sql", pkg: "databricks-sql-connector>=3.0" },
        snowflake:  { mod: "snowflake.connector", pkg: "snowflake-connector-python" },
        bigquery:   { mod: "google.cloud.bigquery", pkg: "google-cloud-bigquery" },
        neo4j:      { mod: "neo4j", pkg: "neo4j" },
      };
      const d = DRIVERS[source];
      if (!d) { res.writeHead(400, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false, error:"unknown source" })); }
      const runPy = (args, cb) => {
        let out = ""; const py = spawn("python3", args, { cwd: WORKBENCH, env: process.env });
        py.stdout.on("data", b => out += b); py.stderr.on("data", b => out += b);
        py.on("close", code => cb(code, out));
        py.on("error", e => cb(1, "failed to run python3: " + e.message));
      };
      const check = (extra) => runPy(["-c", `import ${d.mod}; print('OK')`], (code, out) => {
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ ok: code === 0, installed: code === 0, source, output: (extra || "") + out.trim() }));
      });
      if (install) {
        runPy(["-m", "pip", "install", d.pkg], (code, out) => {
          check(out + "\n");   // report install log, then verify import
        });
      } else { check(""); }
    });
    return;
  }
  // ---- Data Assistant: read-only NL/template/SQL over a connected warehouse ----
  if (req.url === "/api/query" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", async () => {
      let source = "", sql = "", nl = "";
      try { const j = JSON.parse(body || "{}"); source = String(j.source || ""); sql = String(j.sql || ""); nl = String(j.nl || ""); } catch (_) {}
      const SRC = { databricks: { script: "connect_databricks.py", env: () => process.env },
                    snowflake:  { script: "connect_snowflake.py",  env: () => process.env },
                    bigquery:   { script: "connect_bigquery.py",   env: bqEnv } };
      const cfg = SRC[source];
      if (!cfg) { res.writeHead(400, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false, error:"unknown source" })); }
      const guard = (q) => {   // defense-in-depth; the connector guards + adds LIMIT too
        const s = (q || "").trim().replace(/;+\s*$/, "").trim();
        if (!/^\s*(select|with)\b/i.test(s)) throw new Error("read-only: only SELECT/WITH allowed");
        if (s.includes(";")) throw new Error("read-only: single statement only");
        const low = " " + s.toLowerCase().replace(/\n/g, " ") + " ";
        for (const b of [" insert "," update "," delete "," merge "," drop "," alter "," create "," truncate "," grant "," revoke "," call "," copy "," put "])
          if (low.includes(b)) throw new Error("read-only: keyword not allowed: " + b.trim());
        return s;
      };
      const runCmd = (args, cb) => { let out = ""; const py = spawn("python3", args, { cwd: WORKBENCH, env: cfg.env() });
        py.stdout.on("data", b => out += b); py.stderr.on("data", b => out += b);
        py.on("close", code => cb(code, out)); py.on("error", e => cb(1, "failed to run python3: " + e.message)); };
      const parseMarker = (out, marker) => { const i = out.indexOf(marker); if (i < 0) return null;
        try { return JSON.parse(out.slice(i + marker.length).split("\n")[0]); } catch (_) { return null; } };
      const runSql = (finalSql, generated) => {
        let g; try { g = guard(finalSql); } catch (e) { res.writeHead(200, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false, error:e.message })); }
        runCmd([cfg.script, "query", g], (code, out) => {
          const p = parseMarker(out, "===UNAI_ROWS===");
          res.writeHead(200, {"Content-Type":"application/json"});
          if (p) return res.end(JSON.stringify({ ok:true, source, generated: !!generated, sql: p.sql || g, columns: p.columns, rows: p.rows }));
          res.end(JSON.stringify({ ok:false, error:"query failed", output: out.slice(-800) }));
        });
      };
      if (sql) return runSql(sql, false);
      if (nl) {
        if (!resolveProviders().length) { res.writeHead(200, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false, needGateway:true, error:"Free-form questions need an LLM. Set OPENAI_API_KEY / MISTRAL_API_KEY (or a gateway) in env.sh, or use a template." })); }
        return runCmd([cfg.script, "schema"], async (code, out) => {
          const schema = parseMarker(out, "===UNAI_SCHEMA===") || { source };
          schema.source = source;
          let gen = ""; try { gen = await nlToSql(nl, schema, resolveConfig()); } catch (e) { res.writeHead(200, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false, error:"NL→SQL failed: " + e.message })); }
          if (!gen) { res.writeHead(200, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false, error:"the model returned no SQL" })); }
          runSql(gen, true);
        });
      }
      res.writeHead(400, {"Content-Type":"application/json"}); res.end(JSON.stringify({ ok:false, error:"provide sql or nl" }));
    });
    return;
  }
  // ---- Router reachability: ping each provider in the failover chain ----
  if (req.url === "/api/router-test" && req.method === "POST") {
    (async () => {
      let provs = []; try { provs = resolveProviders(); } catch (_) {}
      if (!provs.length) { res.writeHead(200, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false, error:"no providers configured — set OPENAI_API_KEY / MISTRAL_API_KEY (or a gateway) in env.sh" })); }
      const results = [];
      for (const p of provs) {
        const t0 = Date.now(); const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 8000);
        let ok = false, code = "";
        try {
          let r;
          if (p.kind === "anthropic") {   // native transport — Claude isn't OpenAI-compatible
            r = await fetch(p.base.replace(/\/$/, "") + "/messages", { method: "POST",
              headers: { "Content-Type":"application/json", "x-api-key": p.key, "anthropic-version":"2023-06-01" }, signal: ctrl.signal,
              body: JSON.stringify({ model: p.model, max_tokens: 1, messages: [{ role:"user", content:"ping" }] }) });
          } else {
            r = await fetch(p.base.replace(/\/$/, "") + "/chat/completions", { method: "POST",
              headers: { "Content-Type":"application/json", "Authorization":"Bearer " + p.key }, signal: ctrl.signal,
              body: JSON.stringify({ model: p.model, max_tokens: 1, messages: [{ role:"user", content:"ping" }] }) });
          }
          code = r.status; ok = r.ok;
        } catch (e) { code = (e && e.name === "AbortError") ? "timeout" : "error"; } finally { clearTimeout(timer); }
        results.push({ label: p.label, model: p.model, kind: p.kind || "openai",
          cacheCapable: (p.kind === "anthropic" || GW.promptCache), ok, code, ms: Date.now() - t0 });
      }
      res.writeHead(200, {"Content-Type":"application/json"}); res.end(JSON.stringify({ ok:true, providers: results }));
    })();
    return;
  }
  // ---- Supply-Chain Cognition Layer: library · world model · self-onboarding ----
  if (req.url === "/api/cognition" && req.method === "POST") {
    res.writeHead(200, {"Content-Type":"application/json"});
    return res.end(JSON.stringify({ ok:true, library: COG.libraryStats(), world: COG.worldModelGraph() }));
  }
  if (req.url === "/api/onboard" && req.method === "POST") {
    let body = ""; req.on("data", c => body += c); req.on("end", () => {
      let schema = null; try { schema = JSON.parse(body || "{}").schema; } catch (_) {}
      if (!schema) { res.writeHead(400, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false, error:"provide a schema" })); }
      res.writeHead(200, {"Content-Type":"application/json"}); res.end(JSON.stringify(Object.assign({ ok:true }, COG.autoOnboard(schema))));
    }); return;
  }
  if (req.url === "/api/onboard-confirm" && req.method === "POST") {
    let body = ""; req.on("data", c => body += c); req.on("end", () => {
      let confirmed = [], system = "", table = ""; try { const j = JSON.parse(body || "{}"); confirmed = j.confirmed || []; system = String(j.system || "").trim(); table = String(j.table || "").trim(); } catch (_) {}
      const stat = COG.learn(confirmed);
      // persist ONLY anonymized field-name patterns (concept + column name) — never data —
      // so the ontology library compounds across deployments (the network-effect moat).
      try { let cur = []; if (fs.existsSync(COG_STORE)) cur = JSON.parse(fs.readFileSync(COG_STORE, "utf8"));
        confirmed.filter(x => x.concept).forEach(x => cur.push({ concept:x.concept, alias:x.column }));
        fs.writeFileSync(COG_STORE, JSON.stringify(cur)); } catch (_) {}
      // if a system name was given, register a per-system resolver so a live agent run
      // resolves canonical concepts to THIS system's columns (closes the loop).
      let resolver = null;
      if (system) {
        const mappings = {}; confirmed.filter(x => x.concept).forEach(x => { mappings[x.concept] = x.column; });
        COG.registerSystem(system, mappings);
        try { let cur = []; if (fs.existsSync(COG_SYS)) cur = JSON.parse(fs.readFileSync(COG_SYS, "utf8"));
          Object.keys(mappings).forEach(c => cur.push({ system, concept:c, field:mappings[c] }));
          fs.writeFileSync(COG_SYS, JSON.stringify(cur)); } catch (_) {}
        resolver = { system, mapped: Object.keys(mappings).length, query: COG.buildSelect(system, Object.keys(mappings), table) };
      }
      res.writeHead(200, {"Content-Type":"application/json"}); res.end(JSON.stringify(Object.assign({ ok:true, resolver }, stat)));
    }); return;
  }
  // ---- Custom ontology parameters: users add/remove their own canonical
  // concepts (not just field-name mappings for existing ones) and map them to
  // systems of record. Persisted the same way as learned aliases/systems above.
  if (req.url === "/api/ontology-concepts" && req.method === "GET") {
    res.writeHead(200, {"Content-Type":"application/json"});
    return res.end(JSON.stringify({ ok:true, concepts: COG.library() }));
  }
  if (req.url === "/api/ontology-concept" && req.method === "POST") {
    let body = ""; req.on("data", c => body += c); req.on("end", () => {
      let j = {}; try { j = JSON.parse(body || "{}"); } catch (_) {}
      const action = j.action || "add";
      let result;
      if (action === "add") {
        result = COG.addConcept({ concept: j.concept, domain: j.domain, type: j.type, aliases: j.aliases });
        if (result.ok) {
          try { let cur = []; if (fs.existsSync(COG_CONCEPTS)) cur = JSON.parse(fs.readFileSync(COG_CONCEPTS, "utf8"));
            cur.push({ concept: result.concept, domain: j.domain, type: j.type, aliases: j.aliases || [] });
            fs.writeFileSync(COG_CONCEPTS, JSON.stringify(cur)); } catch (_) {}
        }
      } else if (action === "remove") {
        result = COG.removeConcept(j.concept);
        if (result.ok) {
          try { let cur = []; if (fs.existsSync(COG_CONCEPTS)) cur = JSON.parse(fs.readFileSync(COG_CONCEPTS, "utf8"));
            fs.writeFileSync(COG_CONCEPTS, JSON.stringify(cur.filter(c => c.concept !== j.concept))); } catch (_) {}
        }
      } else if (action === "map" && j.concept && j.system && j.field) {
        COG.registerSystem(j.system, { [j.concept]: j.field });
        try { let cur = []; if (fs.existsSync(COG_SYS)) cur = JSON.parse(fs.readFileSync(COG_SYS, "utf8"));
          cur.push({ system: j.system, concept: j.concept, field: j.field });
          fs.writeFileSync(COG_SYS, JSON.stringify(cur)); } catch (_) {}
        result = { ok:true };
      } else {
        result = { ok:false, error:"unknown action" };
      }
      res.writeHead(result.ok ? 200 : 400, {"Content-Type":"application/json"});
      res.end(JSON.stringify(Object.assign({}, result, { concepts: COG.library() })));
    }); return;
  }
  if (req.url === "/api/resolve" && req.method === "POST") {
    let body = ""; req.on("data", c => body += c); req.on("end", () => {
      let concept = "", system = "", concepts = null, table = ""; try { const j = JSON.parse(body || "{}"); concept = j.concept || ""; system = j.system || ""; concepts = j.concepts || null; table = j.table || ""; } catch (_) {}
      res.writeHead(200, {"Content-Type":"application/json"});
      res.end(JSON.stringify({ ok:true, field: concept ? COG.resolveField(concept, system) : null,
        query: concepts ? COG.buildSelect(system, concepts, table) : null, map: COG.systemMap(system) }));
    }); return;
  }
  // ---- Live tool: find restaurants near a city (keyless OpenStreetMap) ----
  // The app's own runtime calling a public API — like wiring a real executor tool.
  if (req.url === "/api/places" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", async () => {
      let city = "", radius = 10;
      try { const j = JSON.parse(body || "{}"); city = String(j.city || "").trim(); radius = Math.min(25, Math.max(1, +j.radius || 10)); } catch (_) {}
      if (!city) { res.writeHead(400, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false, error:"provide a city" })); }
      const UA = { "User-Agent": "UNAI-Demo/1.0 (bristlecone)" };
      const sig = ms => { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; };
      const hav = (la1, lo1, la2, lo2) => { const R = 3958.8, dLa = (la2-la1)*Math.PI/180, dLo = (lo2-lo1)*Math.PI/180,
        a = Math.sin(dLa/2)**2 + Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)**2; return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); };
      const fetchJson = async (url, opts, label) => {
        const r = await fetch(url, opts); const txt = await r.text();
        try { return JSON.parse(txt); }
        catch (_) { const m = txt.match(/<remark>([^<]+)<\/remark>/i);
          throw new Error(label + " returned non-JSON" + (m ? ": " + m[1].trim() : " (HTTP " + r.status + ")")); }
      };
      try {
        const geo = await fetchJson("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(city), { headers: UA, signal: sig(8000) }, "Geocoder");
        if (!geo || !geo.length) { res.writeHead(200, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false, error:"city not found: " + city })); }
        const lat = +geo[0].lat, lon = +geo[0].lon, rm = Math.round(radius * 1609);
        const q = `[out:json][timeout:25];(node["amenity"="restaurant"](around:${rm},${lat},${lon});way["amenity"="restaurant"](around:${rm},${lat},${lon}););out center 80;`;
        const MIRRORS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
        let ov = null, lastErr;
        for (const url of MIRRORS) {
          try { ov = await fetchJson(url, { method:"POST", headers: { "Content-Type":"application/x-www-form-urlencoded", ...UA }, body: "data=" + encodeURIComponent(q), signal: sig(25000) }, "Overpass"); break; }
          catch (e) { lastErr = e; }
        }
        if (!ov) throw lastErr;
        let places = (ov.elements || []).filter(e => e.tags && e.tags.name).map(e => {
          const la = (e.lat != null) ? e.lat : (e.center && e.center.lat), lo = (e.lon != null) ? e.lon : (e.center && e.center.lon);
          return { name: e.tags.name, cuisine: e.tags.cuisine || "", dist: (la != null && lo != null) ? +hav(lat, lon, la, lo).toFixed(1) : null };
        }).filter(pl => pl.dist != null);
        places.sort((a, b) => a.dist - b.dist); places = places.slice(0, 40);
        res.writeHead(200, {"Content-Type":"application/json"}); res.end(JSON.stringify({ ok:true, city, lat, lon, radius, count: places.length, places }));
      } catch (e) { res.writeHead(200, {"Content-Type":"application/json"}); res.end(JSON.stringify({ ok:false, error:"lookup failed (" + (e.message || e) + ")" })); }
    });
    return;
  }
  // ---- Neo4j ontology store: test / publish / fetch the canonical graph ----
  if (req.url === "/api/neo4j" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      let cmd = "test"; try { cmd = JSON.parse(body || "{}").cmd || "test"; } catch (_) {}
      if (!["test", "publish", "create", "fetch"].includes(cmd)) { res.writeHead(400, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false, error:"bad cmd" })); }
      // Enrich publish with the FULL cognition ontology (all concepts + cross-deployment
      // aliases) and every learned per-system mapping, so Neo4j holds the complete layer.
      const childEnv = Object.assign({}, process.env);
      if (cmd === "publish" || cmd === "create") {
        try { const p = path.join(WORKBENCH, "cognition_ontology.json");
          fs.writeFileSync(p, JSON.stringify(COG.exportForGraph()));
          childEnv.COGNITION_ONTOLOGY_FILE = p; } catch (_) {}
      }
      let out = ""; const py = spawn("python3", ["connect_neo4j.py", cmd], { cwd: WORKBENCH, env: childEnv });
      py.stdout.on("data", b => out += b); py.stderr.on("data", b => out += b);
      py.on("close", code => { res.writeHead(200, {"Content-Type":"application/json"}); res.end(JSON.stringify({ ok: code === 0, code, cmd, output: out || "(no output)" })); });
      py.on("error", e => { res.writeHead(200, {"Content-Type":"application/json"}); res.end(JSON.stringify({ ok:false, output:"failed to run python3: " + e.message })); });
    });
    return;
  }
  // ---- Live tool: driving distance + ETA between two places (keyless OSRM) ----
  if (req.url === "/api/route" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", async () => {
      let origin = "", destination = "";
      try { const j = JSON.parse(body || "{}"); origin = String(j.origin || "").trim(); destination = String(j.destination || "").trim(); } catch (_) {}
      if (!origin || !destination) { res.writeHead(400, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false, error:"provide origin and destination" })); }
      const UA = { "User-Agent": "UNAI-Demo/1.0 (bristlecone)" };
      const sig = ms => { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; };
      const fetchJson = async (url, opts, label) => { const r = await fetch(url, opts); const txt = await r.text();
        try { return JSON.parse(txt); } catch (_) { throw new Error(label + " returned non-JSON (HTTP " + r.status + ")"); } };
      const geocode = async q => { const g = await fetchJson("https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=" + encodeURIComponent(q), { headers: UA, signal: sig(8000) }, "Geocoder");
        if (!g || !g.length) throw new Error("could not find: " + q);
        return { lat: +g[0].lat, lon: +g[0].lon, label: g[0].display_name,
          cc: ((g[0].address && g[0].address.country_code) || "").toUpperCase() }; };
      // Which road-connected landmass a country sits on. Afro-Eurasia (Europe+Asia+Africa)
      // is one drivable mass; the Americas another; Oceania another; Antarctica another.
      // Different masses = no continuous road route (must fly / ship).
      const AMERICAS = new Set(["US","CA","MX","GT","BZ","SV","HN","NI","CR","PA","CO","VE","EC","PE","BO","CL","AR","UY","PY","BR","GY","SR"]);
      const OCEANIA  = new Set(["AU","NZ","PG","FJ","NC","SB","VU","WS","TO","KI","TV","NR","FM","MH","PW"]);
      const landmass = cc => !cc ? "" : (cc === "AQ" ? "AN" : AMERICAS.has(cc) ? "AM" : OCEANIA.has(cc) ? "OC" : "AFEU");
      // great-circle (haversine) distance in km — the "as the crow flies" baseline
      const gcKm = (a, b) => { const R = 6371, toR = d => d * Math.PI / 180;
        const dLa = toR(b.lat - a.lat), dLo = toR(b.lon - a.lon);
        const s = Math.sin(dLa/2)**2 + Math.cos(toR(a.lat))*Math.cos(toR(b.lat))*Math.sin(dLo/2)**2;
        return 2 * R * Math.asin(Math.sqrt(s)); };
      try {
        const a = await geocode(origin), b = await geocode(destination);
        const gc = gcKm(a, b);
        const gcMiles = +(gc / 1.60934).toFixed(1);
        // realistic air alternative: ~800 km/h cruise + ~1.5h ground/taxi overhead
        const flightMin = Math.round(gc / 800 * 60 + 90);
        const notDrivable = extra => { res.writeHead(200, {"Content-Type":"application/json"});
          return res.end(JSON.stringify(Object.assign({ ok:true, drivable:false, feasibility:"not-drivable",
            origin: a.label, destination: b.label, gcMiles, flightMin,
            note:"No continuous road route exists between these points — they are separated by ocean or have no land connection. A realistic journey would be by air (passenger) or sea/air freight." }, extra || {}))); };
        // GUARD 1: different road-connected landmasses can never be driven end-to-end
        const lmA = landmass(a.cc), lmB = landmass(b.cc);
        if (lmA && lmB && lmA !== lmB) return notDrivable();
        // steps=true so we can see whether OSRM stitched in ferry / sea legs
        const url = `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false&steps=true`;
        const r = await fetchJson(url, { headers: UA, signal: sig(12000) }, "Router");
        if (!r.routes || !r.routes.length) return notDrivable();
        // GUARD 2: a real surface route can never be shorter than the great-circle
        // distance. If OSRM returns one that is, the "route" is physically impossible.
        if ((r.routes[0].distance / 1000) < gc * 0.99) return notDrivable();
        const rt = r.routes[0];
        // sum any ferry legs OSRM used (default car profile allows ferries)
        let ferryKm = 0, hasFerry = false;
        (rt.legs || []).forEach(lg => (lg.steps || []).forEach(st => {
          if ((st.mode || "") === "ferry") { hasFerry = true; ferryKm += (st.distance || 0) / 1000; } }));
        const driveKm = rt.distance / 1000;
        const ferryShare = driveKm > 0 ? +(ferryKm / driveKm).toFixed(3) : 0;
        const detourFactor = gc > 1 ? +(driveKm / gc).toFixed(2) : 1;
        let feasibility = "drivable", note = "Continuous road route — free-flow estimate (public OSRM has no live traffic).";
        if (hasFerry && ferryShare >= 0.10) { feasibility = "ferry-dependent";
          note = "This is NOT a continuous road drive: roughly " + Math.round(ferryShare * 100) +
                 "% of the distance is long ferry / sea crossing. The ETA below assumes those crossings run on schedule; for cargo, air or sea freight is the realistic option."; }
        else if (hasFerry) { feasibility = "road-with-ferry";
          note = "Route includes a short ferry crossing; the rest is road. Free-flow estimate (no live traffic)."; }
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ ok:true, drivable:true, feasibility, origin: a.label, destination: b.label,
          miles: +(rt.distance / 1609.34).toFixed(1), etaMin: Math.round(rt.duration / 60),
          gcMiles, ferryMiles: +(ferryKm / 1.60934).toFixed(1), ferryShare, detourFactor, hasFerry, flightMin }));
      } catch (e) { res.writeHead(200, {"Content-Type":"application/json"}); res.end(JSON.stringify({ ok:false, error:"route lookup failed (" + (e.message || e) + ")" })); }
    });
    return;
  }
  // password-gated Architecture: verify password, then return the protected fragment
  if (req.url === "/api/arch" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      let pw = ""; try { pw = JSON.parse(body || "{}").pw || ""; } catch (_) {}
      if (pw !== ARCH_PW) { res.writeHead(403, {"Content-Type":"application/json"});
        return res.end(JSON.stringify({ ok:false })); }
      fs.readFile(path.join(__dirname, "arch_fragment.html"), (err, data) => {
        if (err) { res.writeHead(500, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false })); }
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ ok:true, html: data.toString() }));
      });
    });
    return;
  }
  if (req.url === "/api/databricks" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      let cmd = "test", useCase = "disruption_response";
      try { const j = JSON.parse(body || "{}"); cmd = j.cmd || "test"; if (j.useCase) useCase = String(j.useCase); } catch (_) {}
      const ALLOW = ["test", "introspect", "automap", "demo", "create", "run"];
      if (!ALLOW.includes(cmd)) { res.writeHead(400, {"Content-Type":"application/json"});
        return res.end(JSON.stringify({ ok:false, output:"unknown command" })); }
      // only pass a use-case key through for `run`; validate against a strict allowlist
      const UC_ALLOW = ["disruption_response", "spares_rma_closed_loop", "mesh",
        "demand_planning", "inventory_optimization", "supply_planning",
        "procurement_sourcing", "logistics_transportation", "production_planning"];
      const args = (cmd === "run") ? ["connect_databricks.py", "run", (UC_ALLOW.includes(useCase) ? useCase : "disruption_response")]
                                   : ["connect_databricks.py", cmd];
      if (!DBX.configured) { res.writeHead(200, {"Content-Type":"application/json"});
        return res.end(JSON.stringify({ ok:false, output:"Databricks not configured. Start the server in a shell where DATABRICKS_SERVER_HOSTNAME / DATABRICKS_HTTP_PATH / DATABRICKS_TOKEN are exported." })); }
      const py = spawn("python3", args, { cwd: WORKBENCH, env: process.env });
      let out = "";
      const cap = d => { out += d.toString(); if (out.length > 60000) out = out.slice(-60000); };
      py.stdout.on("data", cap); py.stderr.on("data", cap);
      const timer = setTimeout(() => py.kill("SIGKILL"), 120000);
      py.on("close", code => { clearTimeout(timer);
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ ok: code === 0, code, cmd, output: out || "(no output)" })); });
      py.on("error", e => { clearTimeout(timer);
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ ok:false, output:"failed to run python3: " + e.message })); });
    });
    return;
  }
  if (req.url === "/api/snowflake" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      let cmd = "test", useCase = "disruption_response";
      try { const j = JSON.parse(body || "{}"); cmd = j.cmd || "test"; if (j.useCase) useCase = String(j.useCase); } catch (_) {}
      if (!["test", "publish", "create", "introspect", "automap", "run"].includes(cmd)) { res.writeHead(400, {"Content-Type":"application/json"});
        return res.end(JSON.stringify({ ok:false, output:"unknown command" })); }
      if (!SNOW.configured) { res.writeHead(200, {"Content-Type":"application/json"});
        return res.end(JSON.stringify({ ok:false, output:"Snowflake not configured. Start the server in a shell where SNOWFLAKE_ACCOUNT / SNOWFLAKE_USER / SNOWFLAKE_PASSWORD are exported (see the Connections tab for the exact env)." })); }
      const UC_OK = /^[a-z_]+$/.test(useCase);
      const py = spawn("python3", (cmd === "run") ? ["connect_snowflake.py", "run", (UC_OK?useCase:"disruption_response")] : ["connect_snowflake.py", cmd], { cwd: WORKBENCH, env: process.env });
      let out = "";
      const cap = d => { out += d.toString(); if (out.length > 60000) out = out.slice(-60000); };
      py.stdout.on("data", cap); py.stderr.on("data", cap);
      const timer = setTimeout(() => py.kill("SIGKILL"), 120000);
      py.on("close", code => { clearTimeout(timer);
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ ok: code === 0, code, cmd, output: out || "(no output)" })); });
      py.on("error", e => { clearTimeout(timer);
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ ok:false, output:"failed to run python3: " + e.message })); });
    });
    return;
  }
  if (req.url === "/api/bigquery/config" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      let j = {}; try { j = JSON.parse(body || "{}"); } catch (_) {}
      if (j.project !== undefined) BQ.project = String(j.project || "").trim() || null;
      if (j.dataset !== undefined) BQ.dataset = String(j.dataset || "").trim() || "unai_supply_chain";
      if (j.location !== undefined) BQ.location = String(j.location || "").trim() || "US";
      if (j.credentials !== undefined) BQ.credentials = String(j.credentials || "").trim() || null;
      BQ.creds = !!BQ.credentials; BQ.configured = !!BQ.project;
      try { fs.writeFileSync(BQ_CFG_PATH, JSON.stringify({ project: BQ.project, dataset: BQ.dataset, location: BQ.location, credentials: BQ.credentials }, null, 2)); } catch (_) {}
      res.writeHead(200, {"Content-Type":"application/json"});
      res.end(JSON.stringify({ ok: true, bigquery: BQ }));
    });
    return;
  }
  if (req.url === "/api/bigquery" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      let cmd = "test", useCase = "disruption_response";
      try { const j = JSON.parse(body || "{}"); cmd = j.cmd || "test"; if (j.useCase) useCase = String(j.useCase); } catch (_) {}
      if (!["test", "publish", "introspect", "automap", "run"].includes(cmd)) { res.writeHead(400, {"Content-Type":"application/json"});
        return res.end(JSON.stringify({ ok:false, output:"unknown command" })); }
      if (!BQ.configured) { res.writeHead(200, {"Content-Type":"application/json"});
        return res.end(JSON.stringify({ ok:false, output:"BigQuery not configured. Start the server in a shell where GOOGLE_CLOUD_PROJECT is exported (and GOOGLE_APPLICATION_CREDENTIALS or gcloud ADC). See the Connections tab." })); }
      const UC_OK = /^[a-z_]+$/.test(useCase);
      const py = spawn("python3", (cmd === "run") ? ["connect_bigquery.py", "run", (UC_OK?useCase:"disruption_response")] : ["connect_bigquery.py", cmd], { cwd: WORKBENCH, env: bqEnv() });
      let out = "";
      const cap = d => { out += d.toString(); if (out.length > 60000) out = out.slice(-60000); };
      py.stdout.on("data", cap); py.stderr.on("data", cap);
      const timer = setTimeout(() => py.kill("SIGKILL"), 120000);
      py.on("close", code => { clearTimeout(timer);
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ ok: code === 0, code, cmd, output: out || "(no output)" })); });
      py.on("error", e => { clearTimeout(timer);
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ ok:false, output:"failed to run python3: " + e.message })); });
    });
    return;
  }
  if (req.url === "/api/gateway-test" && req.method === "POST") {
    (async () => {
      const cfg = resolveConfig();
      if (!cfg.ok) { res.writeHead(200, {"Content-Type":"application/json"});
        return res.end(JSON.stringify({ ok:false, reason:"no gateway/key configured — set GATEWAY_BASE_URL + GATEWAY_API_KEY (or MISTRAL_API_KEY) and restart" })); }
      const ev = { decision:"connection test", confidence:0.9, uncertainty:"+/-10%", threshold:0.85,
                   attribution:[{name:"test",share:1}], autonomous:true };
      const t0 = Date.now();
      let rr = null; try { rr = await narrateOne(ev, cfg); } catch (_) {}
      const ms = Date.now() - t0;
      const sample = rr ? (typeof rr === "string" ? rr : (rr.text || "")) : "";
      res.writeHead(200, {"Content-Type":"application/json"});
      res.end(JSON.stringify(sample ? { ok:true, provider:cfg.label, model:cfg.model, ms, sample: String(sample).slice(0, 120) }
                                  : { ok:false, reason:"call failed (check base URL / key / model id / network)" }));
    })();
    return;
  }
  // ---- Session-wide LLM key: set once in the UI, used by EVERY page. -----------
  // Stored in the server process's env in memory only (never written to disk), so
  // resolveConfig()/resolveProviders() and every server-side model call pick it up
  // immediately — no env.sh edit, no restart. Cleared on server stop or via clear-key.
  if (req.url === "/api/set-key" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      let key = "", base = "", model = "", provider = "";
      try { const j = JSON.parse(body || "{}"); key = (j.key || "").trim(); base = (j.base || "").trim(); model = (j.model || "").trim(); provider = (j.provider || "").trim(); } catch (_) {}
      if (!key) { res.writeHead(400, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false, error:"provide a key" })); }
      // ---- Claude / Anthropic NATIVE key: uses the native adapter (prompt caching),
      // not the OpenAI-compatible gateway path. Set the key + put Claude first in the
      // router order so every page uses it, then verify with a tiny live call. ----
      const isAnthropic = /^(anthropic|claude)$/i.test(provider) || /^sk-ant-/.test(key);
      if (isAnthropic) {
        process.env.ANTHROPIC_API_KEY = key;
        if (model) process.env.ANTHROPIC_MODEL = model;
        const order = (process.env.LLM_ROUTER_ORDER || "openai,mistral").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
        process.env.LLM_ROUTER_ORDER = ["anthropic", ...order.filter(x=>x!=="anthropic"&&x!=="claude")].join(",");
        (async () => {
          let ok=false, sample="", ms=null, mdl=process.env.ANTHROPIC_MODEL||"claude-haiku-4-5-20251001";
          try { const t0=Date.now();
            const rr=await chatWithFailover([{role:"user",content:"Reply with the single word: ready."}],{max_tokens:16});
            ms=Date.now()-t0; sample=(rr&&(rr.text||rr))||""; ok=!!sample; } catch(_){}
          res.writeHead(200,{"Content-Type":"application/json"});
          res.end(JSON.stringify({ ok, provider:"Claude (Anthropic · native)", model:mdl, ms,
            sample:String(sample||"").slice(0,80), gateway:gatewayStatus(),
            reason: ok?null:"Claude key set; a test call failed (check the key / model / network). It will still be used on the next run." }));
        })();
        return;
      }
      // Auto-detect provider (base URL + a sensible default model) from the key's
      // prefix when the caller didn't specify a base — so pasting an OpenAI /
      // OpenRouter / Groq / Gemini key "just works" without picking a provider.
      // Anthropic keys are handled above; here we only see the rest.
      const detectGw = k => {
        if (/^sk-or-/.test(k))           return { base: "https://openrouter.ai/api/v1",                                provider: "openrouter", model: "mistralai/mistral-small" };
        if (/^gsk_/.test(k))             return { base: "https://api.groq.com/openai/v1",                             provider: "groq",       model: "llama-3.1-8b-instant" };
        if (/^AIza/.test(k))             return { base: "https://generativelanguage.googleapis.com/v1beta/openai",   provider: "gemini",     model: "gemini-1.5-flash" };
        if (/^sk-proj-|^sk-svcacct-|^sk-[A-Za-z0-9]/.test(k)) return { base: "https://api.openai.com/v1",            provider: "openai",     model: "gpt-4o-mini" };
        return { base: "https://api.mistral.ai/v1", provider: "mistral", model: "mistral-small-latest" };
      };
      const det = detectGw(key);
      // Default base/model to the detected provider when not explicitly specified.
      process.env.GATEWAY_API_KEY = key;
      process.env.GATEWAY_BASE_URL = base || det.base;
      process.env.GATEWAY_MODEL = model || det.model;
      process.env.GATEWAY_PROVIDER = provider || det.provider;
      // Verify with a tiny live call so the UI can confirm it actually works.
      // A 429 (rate-limited) means the key AUTHENTICATED but the provider is
      // throttling — that is NOT a bad key, so we retry with backoff and, if it
      // still trips, report "key valid, provider throttled" (throttled:true)
      // rather than "test failed". The key is kept and used on the next run.
      (async () => {
        const cfg = resolveConfig();
        let ok = false, sample = "", ms = null, errDetail = "", throttled = false;
        const isRateLimit = m => /\b429\b|rate[_ ]?limit|rate_limited|"code"\s*:\s*"?1300/i.test(m || "");
        const ev = { decision:"connection test", confidence:0.9, uncertainty:"+/-10%", threshold:0.85, attribution:[{name:"test",share:1}], autonomous:true };
        for (let attempt = 0; attempt < 3 && !ok; attempt++) {
          if (attempt) await new Promise(r => setTimeout(r, 1200 * attempt)); // backoff before retrying a throttle
          try { const t0 = Date.now();
            const rr = await narrateOne(ev, cfg); ms = Date.now() - t0;
            sample = rr ? (typeof rr === "string" ? rr : (rr.text || "")) : ""; ok = !!sample;
            errDetail = ok ? "" : "call returned no text"; throttled = false;
          } catch (e) { errDetail = (e && e.message) || String(e); throttled = isRateLimit(errDetail); }
          if (throttled) continue; else if (!ok && errDetail === "call returned no text") continue; else break;
        }
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ ok, throttled: (!ok && throttled), provider: cfg.label, model: cfg.model, ms,
          sample: String(sample||"").slice(0,80), gateway: gatewayStatus(),
          reason: ok ? null : (throttled
            ? `key valid — provider is rate-limiting (HTTP 429) right now, not a bad key. The key is saved and will be used on the next run; retry the test in ~60s or raise --delay / use a paid tier.`
            : `key set, but the test call failed: ${errDetail}`) }));
      })();
    });
    return;
  }
  if (req.url === "/api/clear-key" && req.method === "POST") {
    delete process.env.GATEWAY_API_KEY; delete process.env.GATEWAY_BASE_URL;
    delete process.env.GATEWAY_MODEL; delete process.env.GATEWAY_PROVIDER;
    res.writeHead(200, {"Content-Type":"application/json"});
    res.end(JSON.stringify({ ok:true, gateway: gatewayStatus() }));
    return;
  }
  // ---- In-app token benchmark: runs token_benchmark.py and returns its JSON. ----
  // Reuses the in-app connected model (Governance tab) so it runs LIVE when a key
  // is present, and falls back to MODELED otherwise — no terminal step required.
  if (req.url === "/api/benchmark" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      // Key precedence: a key pasted in the UI (localhost convenience) wins over the
      // server env, so a live run works without restarting. resolveConfig defaults the
      // base/model to Mistral when only a key is given.
      let uiKey = "", uiBase = "", uiModel = "";
      try { const j = JSON.parse(body || "{}"); uiKey = (j.key || "").trim(); uiBase = (j.base || "").trim(); uiModel = (j.model || "").trim(); } catch (_) {}
      const cfg = resolveConfig(uiKey || undefined);
      const live = cfg.ok;
      // Node-native benchmark — runs the A/B IN-PROCESS (no python3 dependency),
      // live against the connected model when a key is present, modeled otherwise.
      (async () => {
        try {
          const report = await runLiveBenchmark(live
            ? { key: cfg.key, base: uiBase || cfg.base, model: uiModel || cfg.model }
            : {});
          // Persist the report for parity with the CLI harness (auditable artifact).
          try { fs.writeFileSync(path.join(WORKBENCH, "token_benchmark_report.json"), JSON.stringify(report, null, 2)); } catch (_) {}
          res.writeHead(200, {"Content-Type":"application/json"});
          res.end(JSON.stringify({ ok: true, live, engine: "node-native", provider: live ? cfg.label : null,
            model: live ? (uiModel || cfg.model) : null, report }));
        } catch (e) {
          res.writeHead(200, {"Content-Type":"application/json"});
          res.end(JSON.stringify({ ok: false, live, engine: "node-native",
            output: "live benchmark failed: " + ((e && e.message) || String(e)) }));
        }
      })();
    });
    return;
  }
  // ---- Your-App-vs-UNAI: re-run the real source app live (e.g. the
  // rma-agent-poc LangGraph/Ollama scripts) and return its REAL token usage,
  // instead of the modeled fallback baked into YOURAPP_COMPARISONS in the UI.
  // Point RMA_POC_DIR (in env.sh) at the checked-out source project; it must
  // contain measure_real_tokens.py (a harness that runs the same node
  // functions the real scripts define, skipping their interactive approval
  // step, and sums each call's real usage_metadata).
  if (req.url === "/api/yourapp-ollama-run" && req.method === "POST") {
    const dir = process.env.RMA_POC_DIR;
    if (!dir || !fs.existsSync(dir)) {
      res.writeHead(200, {"Content-Type":"application/json"});
      return res.end(JSON.stringify({ ok:false, reason:"RMA_POC_DIR not set (or path doesn't exist) — set it in env.sh to the rma-agent-poc checkout and restart the server" }));
    }
    const scriptPath = path.join(dir, "measure_real_tokens.py");
    if (!fs.existsSync(scriptPath)) {
      res.writeHead(200, {"Content-Type":"application/json"});
      return res.end(JSON.stringify({ ok:false, reason:"measure_real_tokens.py not found in RMA_POC_DIR" }));
    }
    const pyExe = findPythonFor(dir);
    let out = ""; const py = spawn(pyExe, ["measure_real_tokens.py"], { cwd: dir, env: process.env });
    py.stdout.on("data", b => out += b); py.stderr.on("data", b => out += b);
    const timer = setTimeout(() => { py.kill(); }, 180000);   // 4 sequential agents, real cloud calls — give it time
    py.on("close", code => {
      clearTimeout(timer);
      let report = null;
      try { report = JSON.parse(fs.readFileSync(path.join(dir, "measure_real_tokens_report.json"), "utf8")); } catch (_) {}
      res.writeHead(200, {"Content-Type":"application/json"});
      res.end(JSON.stringify({ ok: code === 0 && !!report && report.ok, code, report, output: (out || "").slice(-4000) }));
    });
    py.on("error", e => { clearTimeout(timer);
      res.writeHead(200, {"Content-Type":"application/json"});
      res.end(JSON.stringify({ ok:false, reason:"failed to run " + pyExe + ": " + e.message })); });
    return;
  }
  // Live re-run for the SAP SDLC AI Factory conversion — drives the ACTUAL
  // running app_unai server (a separate process, e.g. `uvicorn app_unai.main:app
  // --port 8081`) through one real job end-to-end via its own real REST API,
  // then reads back the real token totals it already tracks. Point
  // SDLC_APP_URL / SDLC_TEST_PDF in env.sh if your layout differs.
  if (req.url === "/api/yourapp-sdlc-run" && req.method === "POST") {
    (async () => {
      const base = process.env.SDLC_APP_URL || "http://localhost:8081";
      // The two projects are NOT siblings on disk (sap-sdlc-ai-factory-main sits
      // directly under Downloads, not nested under unai-consolidated) — same
      // reasoning as RMA_POC_DIR/UNAI_WORKBENCH_PATH elsewhere: set it explicitly
      // in env.sh rather than guess a relative path.
      const pdfPath = process.env.SDLC_TEST_PDF;
      const send = (obj) => { res.writeHead(200, {"Content-Type":"application/json"}); res.end(JSON.stringify(obj)); };
      try {
        if (!pdfPath || !fs.existsSync(pdfPath)) return send({ ok:false, reason:`test PDF not found at ${pdfPath || "(SDLC_TEST_PDF not set)"} — set SDLC_TEST_PDF in env.sh` });
        const ping = await fetch(base + "/docs", { signal: AbortSignal.timeout(5000) }).catch(() => null);
        if (!ping || !ping.ok) return send({ ok:false, reason:`SDLC app not reachable at ${base} — start it first: cd sap-sdlc-ai-factory-main && . .\\env_unai.ps1 && python -m uvicorn app_unai.main:app --port 8081` });

        const form = new UndiciFormData();
        form.append("file", new Blob([fs.readFileSync(pdfPath)], { type: "application/pdf" }), path.basename(pdfPath));
        form.append("client", "bristlecone");
        let cur = await undiciFetch(base + "/api/start-job", { method: "POST", body: form, signal: AbortSignal.timeout(120000), dispatcher: LONG_RUN_DISPATCHER }).then(r => r.json());
        if (!cur.thread_id) return send({ ok:false, reason: cur.detail || "start-job did not return a thread_id" });
        const tid = cur.thread_id;

        // One answer (with the app's own "skip remaining questions" phrase) is
        // enough to run every section to completion in a single resumed call —
        // this loop is just a safety net for an unexpected extra pause.
        let guard = 0;
        while (cur.status === "waiting_for_answers" && guard++ < 25) {
          cur = await undiciFetch(base + "/api/submit-answers", { method: "POST", headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(600000), dispatcher: LONG_RUN_DISPATCHER,
            body: JSON.stringify({ thread_id: tid, answers: "Use your best judgment for the rest, do not ask further questions." }) }).then(r => r.json());
        }
        const metrics = await fetch(base + `/api/session/${tid}/metrics`, { signal: AbortSignal.timeout(10000) }).then(r => r.json());
        const t = metrics.totals || {};
        send({ ok:true, threadId: tid, status: cur.status, calls: t.calls || 0,
               tokensIn: t.prompt_token_count || 0, tokensOut: t.candidates_token_count || 0,
               tokensTotal: t.total_token_count || 0 });
      } catch (e) {
        const causeMsg = e.cause && (e.cause.code || e.cause.message);
        send({ ok:false, reason: e.message + (causeMsg ? ` (${causeMsg})` : "") });
      }
    })();
    return;
  }
  // ---- OCM Change Management Agent: real engagement-grounded implementation.
  // Replaces the old fixed-scenario demo content with real capabilities that
  // reason over a real, persisted engagement context (ocm_store.js) + a
  // retrieved knowledge base (ocm_capabilities.js) via a real model call.
  if (req.url === "/api/ocm/capabilities" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ capabilities: ocmCap.CAPABILITIES.map(c => ({ id: c.id, label: c.label, requiredFields: c.requiredFields })) }));
  }
  if (req.url === "/api/ocm/engagements" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ engagements: ocmStore.listEngagements() }));
  }
  if (req.url === "/api/ocm/engagements" && req.method === "POST") {
    let body = ""; req.on("data", c => body += c); req.on("end", () => {
      let ctx = {}; try { ctx = JSON.parse(body || "{}"); } catch (_) {}
      const e = ocmStore.createEngagement(ctx);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, engagement: e }));
    });
    return;
  }
  if (req.url.split("?")[0] === "/api/ocm/engagement" && req.method === "GET") {
    const id = new URL(req.url, "http://localhost").searchParams.get("id") || "";
    const e = ocmStore.getEngagement(id);
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(e ? { ok: true, engagement: e } : { ok: false, reason: "engagement not found" }));
  }
  if (req.url === "/api/ocm/engagement/update" && req.method === "POST") {
    let body = ""; req.on("data", c => body += c); req.on("end", () => {
      let j = {}; try { j = JSON.parse(body || "{}"); } catch (_) {}
      const e = ocmStore.updateContext(j.id || "", j.patch || {});
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(e ? { ok: true, engagement: e } : { ok: false, reason: "engagement not found" }));
    });
    return;
  }
  if (req.url === "/api/ocm/run" && req.method === "POST") {
    let body = ""; req.on("data", c => body += c); req.on("end", async () => {
      let j = {}; try { j = JSON.parse(body || "{}"); } catch (_) {}
      const send = (obj) => { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
      const engagement = ocmStore.getEngagement(j.id || "");
      if (!engagement) return send({ ok: false, reason: "engagement not found — create or select one first" });
      const cap = ocmCap.findCapability(j.capability || "");
      if (!cap) return send({ ok: false, reason: "unknown capability: " + j.capability });
      // Lightweight, honest R-02: tell the caller exactly which fields are still
      // blank for THIS capability instead of letting the model invent specifics —
      // the UI prompts for just those fields and re-runs, rather than a fixed
      // one-size intake wizard.
      const missing = ocmStore.missingFields(engagement.context, cap.requiredFields);
      if (missing.length && !j.proceedAnyway) return send({ ok: false, needsInfo: true, missingFields: missing });
      const cfg = resolveConfig(j.key || undefined);
      if (!cfg.ok) return send({ ok: false, reason: "no live model configured — paste a key, or set MISTRAL_API_KEY / GATEWAY_* in env.sh. This agent only produces real, grounded output — there is no fabricated fallback." });
      try {
        const { text: contextText, kbUsed } = ocmCap.buildContextBlock(engagement, cap);
        // Real Evidence (confidence/attribution/gate) via engine.js's shared
        // Layers.evidence() — the same mechanism every other UNAI capability's
        // confidence comes from — BEFORE the real model call, so a failed/slow
        // live call still leaves a well-formed evidence shape to report against.
        const ev = ocmCap.buildEvidence(engagement, cap, kbUsed);
        const question = ocmCap.buildQuestion(cap);
        const r = await ocmCap.callModel(question, contextText, cfg, 700);
        ocmStore.appendHistory(engagement.id, { capability: cap.id, label: cap.label, text: r.text,
          tokensIn: r.tokensIn, tokensOut: r.tokensOut, provider: cfg.label, kbUsed,
          confidence: ev.confidence, autonomous: ev.autonomous, gate: ev.gate, attribution: ev.attribution });
        send({ ok: true, decision: cap.label, text: r.text, source: cfg.label, model: cfg.model,
          tokensIn: r.tokensIn, tokensOut: r.tokensOut, kbUsed,
          confidence: ev.confidence, uncertainty: ev.uncertainty, autonomous: ev.autonomous, gate: ev.gate,
          attribution: ev.attribution, counterfactual: ev.counterfactual });
      } catch (e) {
        send({ ok: false, reason: e.message });
      }
    });
    return;
  }
  if (req.url === "/api/ask" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", async () => {
      let question = "", context = "";
      try { const j = JSON.parse(body || "{}"); question = (j.question || "").slice(0, 2000); context = (j.context || "").slice(0, 12000); } catch (_) {}
      // Semantic cache: a re-phrased repeat of a prior question (same canonical
      // signature or a close paraphrase) is answered from cache at 0 tokens.
      const cHit = askCache.lookup(question, context);
      if (cHit.hit) { res.writeHead(200, {"Content-Type":"application/json"});
        return res.end(JSON.stringify({ ok:true, provider:"semantic cache", model:"—", answer: cHit.answer,
          tokensIn:0, tokensOut:0, cached:true, semanticCache:{ via: cHit.via, score: cHit.score||null },
          note:"Answered from a semantically-equivalent prior question — 0 new tokens.", cacheStats: askCache.stats() })); }
      const cfg = resolveConfig();
      let provs = []; try { provs = resolveProviders(); } catch (_) {}
      if (!cfg.ok && !provs.length) { res.writeHead(200, {"Content-Type":"application/json"});
        return res.end(JSON.stringify({ ok:false, reason:"no model configured — set a gateway/key on the Governance tab" })); }
      const r = await answerGrounded(question, context, cfg) || {};
      const answer = r.content;
      if (answer) askCache.store(question, answer, context);        // remember for the next re-phrasing
      res.writeHead(200, {"Content-Type":"application/json"});
      res.end(JSON.stringify(answer ? { ok:true, provider: r.provider || cfg.label, model: r.model || cfg.model, answer,
        tokensIn: r.tokensIn || null, tokensOut: r.tokensOut || null,
        cacheRead: r.cacheRead || 0, cacheWrite: r.cacheWrite || 0, cached: !!r.cached, semanticCache:{ via:"miss" }, cacheStats: askCache.stats() }
                                  : { ok:false, reason:"model call failed (check gateway / key / model / network)" }));
    });
    return;
  }
  if (req.url === "/api/run" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", async () => {
      try {
        const { useCase, config, mistralKey, scenario, detailedExplainability } = JSON.parse(body || "{}");
        const uc = useCase || "disruption_response";
        // Detailed explainability = live, audited per-decision rationales. Per-agent,
        // default ON. Off → template rationales, 0 live tokens (the value-add spend
        // is opt-out). Applies to every agent, incl. Foundry-created/converted ones.
        const detailed = detailedExplainability !== false;
        // Recursive self-healing: apply a healed autonomy threshold for this use
        // case if calibration previously flagged it (over/under-confident). Wins
        // over the request config so the platform's self-correction takes effect.
        const _heal = loadHeal()[uc];
        const _healCfg = (_heal && _heal.threshold) ? { autonomyThreshold: _heal.threshold } : {};
        // Agent Safety & Containment: if the kill switch (safe mode) or a deny
        // policy is active, force every action to human approval and cap actions.
        const _runCfg = containment.runConstraints(Object.assign({}, config || {}, { detailedExplainability: detailed }, _healCfg, (scenario && Object.keys(scenario).length) ? { scenario } : {}, { _uc: uc }));
        const agent = new UNAI(_runCfg);
        // The SQLite store models ONLY the disruption-flow systems. The spares &
        // RMA flows use the engine's in-memory adapters (which carry the right
        // IBP/S4/ServiceNow/BQML seed data), so we inject SQLite only for disruption.
        let systems = (store && uc === "disruption_response") ? buildSqliteAdapters().systems : undefined;
        // Optional: point spares/RMA at a real external app's data instead of the
        // built-in mock adapters. Set ADK_SPARES_RMA_PATH to that app's root folder
        // (writes go to a safe copy — see adapters/adk_spares_rma.js).
        let goal = uc;   // string key by default; swapped for a real-baseline goal object below
        if (process.env.ADK_SPARES_RMA_PATH && uc === "spares_rma_closed_loop") {
          try {
            const { buildAdkSparesRmaAdapters } = require("./adapters/adk_spares_rma.js");
            const a = buildAdkSparesRmaAdapters(process.env.ADK_SPARES_RMA_PATH);
            systems = { ANALYTICS: a.ANALYTICS, SAP_IBP: a.SAP_IBP, SAP_S4: a.SAP_S4, SERVICENOW: a.SERVICENOW };
            // Real ADK data is flowing in — use YOUR app's real agent count as the
            // Gen-1 baseline instead of UNAI's generic one-agent-per-capability
            // hypothetical, so every downstream number (tokens, layer builds,
            // the substitution ratio) compares against your actual architecture.
            if (REAL_ADK_AGENTS[uc] && USE_CASES[uc]) {
              goal = Object.assign({}, USE_CASES[uc], { gen1Agents: REAL_ADK_AGENTS[uc] });
            }
          } catch (e) { console.warn("[unai] ADK_SPARES_RMA_PATH set but adapter failed:", e.message); }
        }
        const out = agent.run(goal, systems);
        out.backend = BACKEND;
        out.detailedExplainability = detailed;
        out.containment = { safeMode: containment.safeMode, forced: _runCfg._containment || null };
        if (_heal && _heal.threshold) out.selfHeal = { applied:true, useCase:uc, threshold:_heal.threshold, reason:_heal.reason };
        // Explainability layer: when detailed is ON, upgrade rationales to a live
        // model (Mistral/Gemini/whatever LLM_ROUTER_ORDER resolves to) — the live×N
        // audited rationales. When OFF, keep the engine's built-in template
        // rationales (0 live tokens). Key precedence: per-request key > env var.
        out.rationale = detailed
          ? await enrichEvidence(out.evidence, mistralKey)
          : { used: "template", calls: 0, tokensIn: 0, tokensOut: 0, note: "detailed explainability off — template rationales, 0 live tokens" };
        // When a live model actually answered, surface the REAL measured token
        // usage for the Explainability calls alongside the modeled totals —
        // the engine's tokensIn/tokensOut/tokensTotal stay as the shared-runtime
        // MODEL (Perception/Memory/Reasoning/Action/Collaboration are still
        // estimated), but liveTokens shows what Explainability actually cost.
        if (detailed && out.rationale && out.rationale.used !== "template" && out.rationale.calls) {
          out.observability.liveTokens = { provider: out.rationale.provider, model: out.rationale.model,
            calls: out.rationale.calls, tokensIn: out.rationale.tokensIn, tokensOut: out.rationale.tokensOut,
            tokensTotal: out.rationale.tokensIn + out.rationale.tokensOut };
        }
        // Reference-level per-decision explainability (ev.detailed) is ALWAYS present
        // (deterministic, 0 tokens). When detailed is ON and a model is reachable,
        // upgrade the prose of the most-gated decisions to live, decision-specific text.
        try {
          if (detailed) { const enr = await enrichExplainability(out.evidence, chatJSON, 5); out.detailedExplain = { enriched: (enr && enr.enriched) || 0 }; }
        } catch (e) { console.warn("[unai] enrichExplainability:", e.message); }
        // Retrospective self-healing: append this run's decisions to the ledger.
        try {
          const ucName = (out.useCase && out.useCase.name) || uc;
          const runId = "r" + Date.now().toString(36);
          const rows = (out.evidence || []).map((e, i) => ({
            id: runId + "-" + i, ts: Date.now(), useCase: uc, useCaseName: ucName,
            decision: e.decision, confidence: e.confidence, threshold: e.threshold || 0.85,
            autonomous: !!e.autonomous, value: (e.output && e.output.value) || null,
            mode: detailed ? "live" : "template", outcome: null }));
          appendLedger(rows);
        } catch (le) { console.warn("[ledger] append", le.message); }
        res.writeHead(200, { "Content-Type":"application/json" });
        res.end(JSON.stringify(out));
      } catch (e) {
        res.writeHead(500, { "Content-Type":"application/json" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  // ---- SDLC Spec Factory: BRD/FS -> Technical Spec (UNAI extract-once redesign) ----
  if (urlPath === "/api/sdlc/generate" && req.method === "POST") {
    let b=""; req.on("data",c=>b+=c); req.on("end",async ()=>{
      let brd="",objectType="auto",features={},sections=null,documents=null,files=[];
      try{ const j=JSON.parse(b||"{}"); brd=(j.brd||""); objectType=j.objectType||"auto"; features=j.features||{}; sections=j.sections||null; documents=Array.isArray(j.documents)?j.documents:null; files=Array.isArray(j.files)?j.files:[]; }catch(_){}
      // Extract text from any uploaded documents (DOCX/TXT/MD) and prepend to the BRD.
      const extractedNames=[]; const skipped=[];
      for(const f of files.slice(0,8)){ try{ const buf=Buffer.from(f.b64||"","base64"); const t=await extractUploaded(f.name,buf);
        if(t && t.trim()){ brd = "===== FILE: "+f.name+" =====\n"+t+"\n\n"+brd; extractedNames.push(f.name+" ("+t.length+" chars)"); }
        else skipped.push(f.name); }
        catch(e){ skipped.push(f.name + (e && e.code==="PDF_DEP" ? " (PDF support needs: npm i pdf-parse)" : "")); } }
      brd = brd.slice(0,120000);   // cap combined size
      if(!brd.trim()){ res.writeHead(400,{"Content-Type":"application/json"}); return res.end(JSON.stringify({ok:false,error:"paste a BRD or upload a readable file first"+(skipped.length?" (couldn't read: "+skipped.join(", ")+")":"")})); }
      try{
        const r=await sdlcGenerateSpec({ brd, objectType, features, sections, documents }, chatWithFailover);
        // log the effort decision to the ledger (governed, auditable)
        try{ appendLedger([{ id:"sdlc"+Date.now().toString(36), ts:Date.now(), useCase:"sdlc_spec_factory", useCaseName:"SDLC Spec Factory",
          decision:`Generated ${(r.documentsGenerated||["ts"]).map(k=>k.toUpperCase()).join("+")} (${r.effort.objectType}) — effort ${r.effort.totalHours}h`, confidence:0.9, threshold:0.85, autonomous:false, mode:r.metrics.mode, outcome:null }]); }catch(_){}
        res.writeHead(200,{"Content-Type":"application/json"}); res.end(JSON.stringify({ ok:true, ...r, sources:extractedNames, skipped }));
      }catch(e){ res.writeHead(500,{"Content-Type":"application/json"}); res.end(JSON.stringify({ok:false,error:e.message})); }
    }); return;
  }
  // ---- SDLC Spec Factory BATCH: many BRDs -> a spec set per BRD, one warm run ----
  // Each uploaded file (or each pasted item) is treated as a SEPARATE BRD. Jobs run
  // through one shared runtime with bounded concurrency; in production this maps to
  // the provider Batch API (~50% off). Structured output (chatJSON) builds a compact
  // cross-batch summary at low output-token cost.
  if (urlPath === "/api/sdlc/batch" && req.method === "POST") {
    let b=""; req.on("data",c=>b+=c); req.on("end",async ()=>{
      let objectType="auto",features={},documents=null,files=[],items=[];
      try{ const j=JSON.parse(b||"{}"); objectType=j.objectType||"auto"; features=j.features||{}; documents=Array.isArray(j.documents)?j.documents:null;
        files=Array.isArray(j.files)?j.files:[]; items=Array.isArray(j.items)?j.items:[]; }catch(_){}
      // Build the job list: one job per file, plus any pasted items.
      const jobs=[];
      for(const f of files.slice(0,20)){ try{ const buf=Buffer.from(f.b64||"","base64"); const t=await extractUploaded(f.name,buf);
        if(t && t.trim()) jobs.push({ name:f.name, brd:t }); else jobs.push({ name:f.name, brd:"", skipped:true }); }
        catch(e){ jobs.push({ name:f.name, brd:"", skipped:true, err:(e&&e.code==="PDF_DEP")?"PDF support needs: npm i pdf-parse":String(e&&e.message||e) }); } }
      for(const it of items.slice(0,20)){ if(it && String(it.brd||"").trim()) jobs.push({ name:it.name||("Item "+(jobs.length+1)), brd:String(it.brd) }); }
      const runnable=jobs.filter(j=>!j.skipped && j.brd.trim());
      if(!runnable.length){ res.writeHead(400,{"Content-Type":"application/json"}); return res.end(JSON.stringify({ok:false,error:"no readable BRDs in the batch"})); }
      try{
        const CONC=3; const results=new Array(jobs.length); let idx=0;
        const agg={ items:0, calls:0, tokensIn:0, tokensOut:0, baselineInput:0, redesignInput:0, effortHours:0 };
        async function worker(){
          while(true){ const i=idx++; if(i>=jobs.length) break; const job=jobs[i];
            if(job.skipped || !job.brd.trim()){ results[i]={ name:job.name, ok:false, error:job.err||"unreadable" }; continue; }
            const r=await sdlcGenerateSpec({ brd:job.brd.slice(0,120000), objectType, features, documents }, chatWithFailover);
            const tb=r.tokenBreakdown||{}; agg.items++; agg.calls+=(r.metrics&&r.metrics.calls)||0;
            agg.tokensIn+=(r.metrics&&r.metrics.tokensIn)||0; agg.tokensOut+=(r.metrics&&r.metrics.tokensOut)||0;
            agg.baselineInput+=tb.baselineInput||0; agg.redesignInput+=tb.redesignInput||0; agg.effortHours+=(r.effort&&r.effort.totalHours)||0;
            results[i]={ name:job.name, ok:true, objectType:r.effort&&r.effort.objectType, effortHours:r.effort&&r.effort.totalHours,
              effortDays:r.effort&&r.effort.totalDays, documentsGenerated:r.documentsGenerated, docs:r.docs, brief:r.brief,
              metrics:r.metrics, tokenBreakdown:tb, effort:r.effort };
          }
        }
        await Promise.all(Array.from({length:Math.min(CONC,jobs.length)}, worker));
        const savedInputPct = agg.baselineInput>0 ? Math.round(100*(1-agg.redesignInput/agg.baselineInput)) : 0;
        // Compact, structured cross-batch summary (low output-token cost). Falls back to a deterministic line if no model.
        let summary=null;
        try{ const brief=results.filter(x=>x.ok).map(x=>`- ${x.name}: ${x.objectType}, ${x.effortHours}h`).join("\n");
          const s=await chatJSON([{role:"system",content:"You summarise an SAP development batch. Reply as JSON {\"headline\":string,\"totalEffortDays\":number,\"riskItems\":string[]} only."},
            {role:"user",content:"Batch:\n"+brief}], {max_tokens:220, tier:"simple"});
          summary = s && s.ok ? s.data : null; if(s&&s.metrics){ agg.calls++; }
        }catch(_){}
        if(!summary) summary={ headline:`${agg.items} BRDs → specs · ${Math.round(agg.effortHours/8*10)/10} dev-days total`, totalEffortDays:Math.round(agg.effortHours/8*10)/10, riskItems:[] };
        try{ appendLedger([{ id:"sdlcb"+Date.now().toString(36), ts:Date.now(), useCase:"sdlc_spec_factory", useCaseName:"SDLC Spec Factory (batch)",
          decision:`Batch generated specs for ${agg.items} BRD(s) — ${Math.round(agg.effortHours*10)/10}h total`, confidence:0.9, threshold:0.85, autonomous:false, mode:(agg.tokensIn>0?"live":"template"), outcome:null }]); }catch(_){}
        res.writeHead(200,{"Content-Type":"application/json"});
        res.end(JSON.stringify({ ok:true, count:agg.items, results,
          aggregate:{ ...agg, savedInputPct, effortDays:Math.round(agg.effortHours/8*10)/10 }, summary,
          batchNote:"Jobs ran through one shared runtime (concurrency "+CONC+"). In production, non-interactive batches route through the provider Batch API for ~50% off; here the win is one warm path + shared cache/brief per item — measure before quoting a %." }));
      }catch(e){ res.writeHead(500,{"Content-Type":"application/json"}); res.end(JSON.stringify({ok:false,error:e.message})); }
    }); return;
  }
  // ---- Decision + outcome ledger: read, score outcomes, simulate (demo), clear ----
  if (urlPath === "/api/ledger" && req.method === "GET") {
    const rows = readLedger();
    res.writeHead(200, {"Content-Type":"application/json"});
    return res.end(JSON.stringify({ ok:true, summary: ledgerSummary(rows), recent: rows.slice(-60).reverse(),
      overrides: loadHeal(), calibration: perUseCaseCalibration(rows) }));
  }
  if (urlPath === "/api/ledger/heal" && req.method === "POST") {
    const r = runSelfHeal(); res.writeHead(200,{"Content-Type":"application/json"});
    return res.end(JSON.stringify({ ok:true, ...r, summary: ledgerSummary(readLedger()) }));
  }
  if (urlPath === "/api/ledger/outcome" && req.method === "POST") {
    let b=""; req.on("data",c=>b+=c); req.on("end",()=>{
      let id="",outcome=""; try{ const j=JSON.parse(b||"{}"); id=j.id||""; outcome=j.outcome||""; }catch(_){}
      const rows=readLedger(); const r=rows.find(x=>x.id===id); if(r){ r.outcome=outcome; writeLedger(rows); }
      res.writeHead(200,{"Content-Type":"application/json"}); res.end(JSON.stringify({ ok:!!r, summary: ledgerSummary(rows) }));
    }); return;
  }
  if (urlPath === "/api/ledger/simulate" && req.method === "POST") {
    // Demo only: attach plausible outcomes with a realistic OVER-CONFIDENCE bias
    // (actual accuracy runs ~20 pts below the model's stated confidence) so the
    // calibration gap and the self-heal loop are visible without real actuals.
    const rows=readLedger(); rows.forEach(r=>{ if(r.outcome==null){ const p=Math.min(0.95,Math.max(0.4,(r.confidence||0.7)-0.2)); r.outcome=(Math.random()<p)?"correct":"incorrect"; } });
    writeLedger(rows); res.writeHead(200,{"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:true, summary: ledgerSummary(rows) }));
  }
  if (urlPath === "/api/ledger/clear" && req.method === "POST") {
    writeLedger([]); res.writeHead(200,{"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:true, summary: ledgerSummary([]) }));
  }
  // ---- Download the runnable UNAI Agent Runner bundle (all 33 agents, run locally) ----
  if (req.url === "/api/runner-bundle") {
    const zp = path.join(__dirname, "UNAI_Agent_Runner.zip");
    fs.readFile(zp, (err, data) => {
      if (err) { res.writeHead(404, {"Content-Type":"text/plain"}); return res.end("Runner bundle not found — regenerate UNAI_Agent_Runner.zip beside server.js."); }
      res.writeHead(200, { "Content-Type": "application/zip", "Content-Disposition": 'attachment; filename="UNAI_Agent_Runner.zip"', "Content-Length": data.length });
      res.end(data);
    });
    return;
  }
  // ---- Per-agent runnable bundle: the runner preset to ONE agent (default.json) ----
  if (urlPath === "/api/agent-bundle") {
    const id = (req.url.split("?")[1] || "").replace(/^.*\bid=/, "").split("&")[0] || "";
    const runnerDir = path.join(__dirname, "..", "unai-agent-runner");
    try {
      if (!fs.existsSync(runnerDir)) throw new Error("runner source folder missing");
      const files = [];
      (function collect(dir, rel) { for (const n of fs.readdirSync(dir)) {
        if (n === "node_modules" || n.startsWith("~$")) continue;
        const p = path.join(dir, n), r = rel ? rel + "/" + n : n;
        if (fs.statSync(p).isDirectory()) collect(p, r); else files.push({ name: "unai-agent-runner/" + r, data: fs.readFileSync(p) });
      }})(runnerDir, "");
      files.push({ name: "unai-agent-runner/public/default.json", data: Buffer.from(JSON.stringify({ agent: id }, null, 2)) });
      const zip = buildStoreZip(files);
      res.writeHead(200, { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="unai-agent-${id||'bundle'}.zip"`, "Content-Length": zip.length });
      return res.end(zip);
    } catch (e) { res.writeHead(404, {"Content-Type":"text/plain"}); return res.end("Could not build per-agent bundle: " + e.message + "\nUse /api/runner-bundle instead."); }
  }
  // Agent Foundry — "Load from folder": scan a local agent app's agents/ files
  // and hand back a spec in the same shape the blank conversion template uses.
  if (req.url === "/api/foundry/scan-folder" && req.method === "POST") {
    let body = ""; req.on("data", c => body += c); req.on("end", () => {
      let j = {}; try { j = JSON.parse(body || "{}"); } catch (_) {}
      const p = String(j.path || "").trim();
      if (!p) { res.writeHead(400, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false, error:"provide a folder path" })); }
      try {
        const scan = scanAgentFolder(p, j.agentsSubdir);
        const spec = { crew: scan.appName.toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,""), process:"sequential", agents: scan.agents };
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ ok:true, appName: scan.appName, filesScanned: scan.filesScanned, warnings: scan.warnings, spec }));
      } catch (e) {
        res.writeHead(400, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ ok:false, error: e.message }));
      }
    }); return;
  }
  // Agent Foundry — "Build a new agent": when the pasted description doesn't
  // confidently match a built-in USE_CASES entry (faDetectUseCase returns
  // null client-side), auto-decompose the free text into capability chips
  // instead of requiring someone to type each one by hand into "+ add custom
  // capability". LLM-assisted when a provider key is configured, a
  // deterministic clause-splitter otherwise — see decomposeDescription.
  if (req.url === "/api/foundry/decompose-description" && req.method === "POST") {
    let body = ""; req.on("data", c => body += c); req.on("end", async () => {
      let j = {}; try { j = JSON.parse(body || "{}"); } catch (_) {}
      const text = String(j.text || "").trim();
      if (!text) { res.writeHead(400, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false, error:"provide a description" })); }
      try {
        const result = await foundryConvert.decomposeDescription(text);
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ ok: true, ...result }));
      } catch (e) {
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    }); return;
  }
  // Agent Foundry — "Browse…": list subdirectories of a path on this machine
  // so the folder-path field above can be filled by clicking instead of typing.
  if (req.url.split("?")[0] === "/api/foundry/browse-dir" && req.method === "GET") {
    try {
      const q = new URL(req.url, "http://localhost").searchParams;
      const listing = listDirs(q.get("dir"));
      res.writeHead(200, {"Content-Type":"application/json"});
      res.end(JSON.stringify({ ok:true, ...listing }));
    } catch (e) {
      res.writeHead(400, {"Content-Type":"application/json"});
      res.end(JSON.stringify({ ok:false, error: e.message }));
    }
    return;
  }
  // Re-registers an already-converted, already-built .converted/<id> folder
  // (no copy from source, no reinstall/rebuild) -- for a workDir that's
  // already correct and just needs its processes restarted, e.g. after a
  // server restart dropped it from tracking, or after hand-editing the
  // converted copy (a fresh convert-folder call would wipe such edits by
  // re-copying from the untouched original source).
  if (req.url === "/api/foundry/relaunch-built" && req.method === "POST") {
    let body = ""; req.on("data", c => body += c); req.on("end", async () => {
      let j = {}; try { j = JSON.parse(body || "{}"); } catch (_) {}
      const id = String(j.id || "").trim();
      if (!id) { res.writeHead(400, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false, error:"provide an id" })); }
      try {
        // relaunchAnyApp covers every conversion kind (python/node/streamlit/
        // generated), falling back to relaunchBuiltNodeApp internally when a
        // dist/server.cjs build exists -- so this one route now brings any
        // stopped app back, not just already-built Node ones.
        const result = await foundryConvert.relaunchAnyApp(id);
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ ok:false, error: e.message }));
      }
    }); return;
  }
  // Agent Foundry — "Convert & Launch Playground": the one-click automation of
  // (LLM-assisted analyze) -> manifest -> scaffold (retain/generate UI) ->
  // launch on a free local port -> auto-embed in the Converted Agents
  // Playground, with a live "your app vs UNAI" token comparison. See
  // foundry_convert.js for the full pipeline; this route just wires it to HTTP.
  if (req.url === "/api/foundry/convert-folder" && req.method === "POST") {
    let body = ""; req.on("data", c => body += c); req.on("end", async () => {
      let j = {}; try { j = JSON.parse(body || "{}"); } catch (_) {}
      const p = String(j.path || "").trim();
      if (!p) { res.writeHead(400, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false, error:"provide a folder path" })); }
      try {
        const result = await foundryConvert.convertFolder(p);
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ ok:false, error: e.message }));
      }
    }); return;
  }
  // Launches a manifest built from scratch in the Foundry's "Build a new
  // agent" tab as a live standalone app, same mechanism convert-folder uses
  // for a converted one -- lets a from-scratch build be embedded in the
  // Converted Agents Playground too (see foundry_convert.js launchManifest).
  if (req.url === "/api/foundry/launch-manifest" && req.method === "POST") {
    let body = ""; req.on("data", c => body += c); req.on("end", async () => {
      let j = {}; try { j = JSON.parse(body || "{}"); } catch (_) {}
      const manifest = j.manifest;
      if (!manifest || !Array.isArray(manifest.capabilities) || !manifest.capabilities.length) {
        res.writeHead(400, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false, error:"provide a manifest with at least one capability" }));
      }
      try {
        const result = await foundryConvert.launchManifest(manifest);
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ ok:false, error: e.message }));
      }
    }); return;
  }
  if (req.url.split("?")[0] === "/api/foundry/app-status" && req.method === "GET") {
    const q = new URL(req.url, "http://localhost").searchParams;
    res.writeHead(200, {"Content-Type":"application/json"});
    res.end(JSON.stringify(foundryConvert.appStatus(q.get("id") || undefined)));
    return;
  }
  // Stops one specific running app by id (the Playground can have several
  // live at once now). Omitting id is back-compat for old callers and stops
  // everything -- new client code always passes an id.
  if (req.url.split("?")[0] === "/api/foundry/stop-app" && req.method === "POST") {
    let body = ""; req.on("data", c => body += c); req.on("end", () => {
      let j = {}; try { j = JSON.parse(body || "{}"); } catch (_) {}
      const q = new URL(req.url, "http://localhost").searchParams;
      const id = j.id || q.get("id");
      const stopped = id ? foundryConvert.stopApp(id) : (foundryConvert.stopCurrent(), true);
      res.writeHead(200, {"Content-Type":"application/json"});
      res.end(JSON.stringify({ ok:true, stopped }));
    }); return;
  }
  // Ensures (and returns the URL of) a dedicated, ROOT-served reverse-proxy
  // port for one running converted/built app -- see playground_embed.js for
  // why root-served (not a path prefix) and why a script gets injected into
  // its HTML: it postMessages the Studio page when a real "run" call
  // succeeds, so the Playground can pop the token-comparison modal at that
  // moment instead of just whenever the app got picked from the dropdown.
  if (urlPath === "/api/foundry/playground-embed" && req.method === "GET") {
    const q = new URL(req.url, "http://localhost").searchParams;
    const id = String(q.get("id") || "");
    const running = foundryConvert.getRunning(id);
    if (!running) { res.writeHead(404, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false, error:"app not running" })); }
    playgroundEmbed.startPlaygroundProxy(id, () => { const a = foundryConvert.getRunning(id); return a && (a.previewUrl || a.url); })
      .then(entry => { res.writeHead(200, {"Content-Type":"application/json"}); res.end(JSON.stringify({ ok:true, url:`http://localhost:${entry.port}/` })); })
      .catch(e => { res.writeHead(500, {"Content-Type":"application/json"}); res.end(JSON.stringify({ ok:false, error:e.message })); });
    return;
  }
  // Looks up the customer-facing slug/key ALREADY auto-created for a given
  // converted-app id (see registerAgentAuto, called by convertFolder/
  // launchManifest/relaunch* on every app that goes live) -- so the
  // Playground can show "here's this app's customer API" for whichever app
  // is currently selected, not just once, right when it was first
  // converted. Falls back to creating one on the spot (defensive only --
  // every live app should already have one) rather than 404ing, since an
  // app converted before this auto-registration existed would otherwise
  // have nothing to show here.
  if (req.url.startsWith("/api/foundry/customer-agents/for-app") && req.method === "GET") {
    const q = new URL(req.url, "http://localhost").searchParams;
    const convertedId = String(q.get("id") || "");
    const running = foundryConvert.getRunning(convertedId);
    if (!running) { res.writeHead(404, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false, error:"app not running" })); }
    try {
      const info = customerApi.registerAgentAuto(convertedId, running.manifest && running.manifest.name || running.name);
      res.writeHead(200, {"Content-Type":"application/json"});
      res.end(JSON.stringify({ ok:true, ...info }));
    } catch (e) { res.writeHead(200, {"Content-Type":"application/json"}); res.end(JSON.stringify({ ok:false, error:e.message })); }
    return;
  }
  // Admin-only: register a customer-facing slug for an already-converted app,
  // issue it a scoped API key, and turn on its live browser link (its own
  // reverse-proxy port, key-gated) -- one call to stand up everything in
  // customer_api.js for a new customer, from the admin session already
  // required to reach anything under /api/ that isn't /api/v1 or
  // /api/customer-agents/ (see the routing gate above this handler).
  if (req.url === "/api/foundry/customer-agents/register" && req.method === "POST") {
    let body = ""; req.on("data", c => body += c); req.on("end", async () => {
      let j = {}; try { j = JSON.parse(body || "{}"); } catch (_) {}
      const slugName = String(j.slug || "").trim(), convertedId = String(j.convertedId || "").trim(), label = j.label || slugName;
      if (!slugName || !convertedId) { res.writeHead(400, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ ok:false, error:"provide slug and convertedId" })); }
      try {
        customerApi.registerAgent(slugName, convertedId, label);
        const key = customerApi.issueKey(slugName, label);
        const live = j.enableLive ? await customerApi.enableLiveLink(slugName, { foundryConvert }) : null;
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ ok:true, slug:slugName, key, apiBase:`/api/customer-agents/${slugName}/`, livePort: live && live.port }));
      } catch (e) { res.writeHead(200, {"Content-Type":"application/json"}); res.end(JSON.stringify({ ok:false, error:e.message })); }
    }); return;
  }
  // Lists every converted/built app currently live -- what the Playground's
  // dropdown is populated from.
  if (req.url === "/api/foundry/running-apps" && req.method === "GET") {
    res.writeHead(200, {"Content-Type":"application/json"});
    res.end(JSON.stringify({ ok:true, apps: foundryConvert.listRunning() }));
    return;
  }
  if (req.url === "/api/foundry/last-conversion" && req.method === "GET") {
    res.writeHead(200, {"Content-Type":"application/json"});
    res.end(JSON.stringify({ ok:true, conversion: foundryConvert.readLastConversion() }));
    return;
  }
  // Downloads the currently-live Playground app's whole workDir (frontend +
  // wrapper server + its own bundled copy of engine.cjs/llm.cjs, see
  // foundry_convert.js bundleRuntimeInto) as one zip -- a full-stack,
  // self-contained UNAI agent that runs standalone with `node unai-server.cjs`,
  // no dependency on this UNAI Studio install.
  if (req.url.split("?")[0] === "/api/foundry/download-converted" && req.method === "GET") {
    try {
      const q = new URL(req.url, "http://localhost").searchParams;
      const reqId = q.get("id");
      // A specific running app's own manifest/report (multiple can be live at
      // once now) if an id was given; otherwise fall back to whatever was
      // most recently launched, for old callers that don't pass one.
      const conv = reqId ? foundryConvert.getRunning(reqId) : foundryConvert.readLastConversion();
      if (!conv || !conv.id) { res.writeHead(404, {"Content-Type":"text/plain"}); return res.end("Nothing to download yet -- convert or build an agent first."); }
      const workDir = path.join(__dirname, ".converted", conv.id);
      if (!fs.existsSync(workDir)) { res.writeHead(404, {"Content-Type":"text/plain"}); return res.end("That agent's working files are gone -- convert or build it again."); }
      const folderName = (conv.name || conv.id).replace(/[^a-zA-Z0-9 _-]/g, "").trim().replace(/\s+/g, "-") || conv.id;
      const files = [];
      (function collect(dir, rel) {
        for (const n of fs.readdirSync(dir)) {
          const p = path.join(dir, n), r = rel ? rel + "/" + n : n;
          if (fs.statSync(p).isDirectory()) collect(p, r);
          else files.push({ name: folderName + "/" + r, data: fs.readFileSync(p) });
        }
      })(workDir, "");
      const isBuilt = conv.manifest && conv.manifest.source === "build";
      const isStreamlit = conv.report && /streamlit/i.test(conv.report.uiNote || "");
      const readme = `${conv.name || conv.id} — UNAI agent (full stack)
${"=".repeat((conv.name || conv.id).length + 24)}

${isBuilt ? "Built from scratch in the UNAI Foundry." : "Converted from an existing app in the UNAI Foundry."}
Self-contained: the shared 7-layer runtime (engine.cjs), the optional LLM
rationale helper (llm.cjs), this agent's manifest, and its frontend (retained
from the original app, or generated) -- served by one small, dependency-free
Node server (unai-server.cjs). Nothing else required for that half.
(.cjs, not .js: this app may ship its own package.json with "type":"module" --
.cjs keeps the UNAI wrapper CommonJS regardless.)

Requirements: Node.js 18+ (uses the built-in fetch). No "npm install" needed
for the UNAI side.

Run the UNAI side:
    node unai-server.cjs
    PORT=5000 node unai-server.cjs      (to pick a different port; default 4100)

Then open http://localhost:4100 (or your PORT) in a browser.

API:
  GET  /api/unai/manifest   -- this agent's manifest (capabilities, systems, governance)
  POST /api/unai/run        -- run it once, get back the full decision trace
  POST /api/unai/compare    -- your app's tokens (measured if a harness ran, else modeled) vs UNAI's, side by side
${isStreamlit ? `
This folder ALSO contains the original app's real Streamlit dashboard (its
own source files, unmodified) -- that's a separate live process from the
UNAI side above, with its own Python dependencies. To run it too:
    pip install -r requirements.txt   (whatever this app's own requirements are)
    streamlit run <its entry file, e.g. streamlit_app.py>
The Playground embedded the Streamlit dashboard directly; the UNAI side runs
alongside it, not behind it.
` : ""}
Generated by the UNAI Foundry on ${new Date().toISOString().slice(0, 10)}.
PROPRIETARY -- see your agreement with Bristlecone for terms of use.
`;
      files.push({ name: folderName + "/README.txt", data: Buffer.from(readme) });
      const zip = buildStoreZip(files);
      res.writeHead(200, { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${folderName}.zip"`, "Content-Length": zip.length });
      return res.end(zip);
    } catch (e) {
      res.writeHead(500, {"Content-Type":"text/plain"}); return res.end("Could not build the download: " + e.message);
    }
  }
  // static files — strip the query FIRST, so "/?agent=..." still serves index.html
  let file = req.url.split("?")[0];
  if (file === "/" || file === "") file = "/index.html";
  // never serve the protected architecture fragment directly — only via /api/arch (password)
  if (/arch_fragment\.html/i.test(file)) { res.writeHead(404); return res.end("Not found"); }
  const fp = path.join(__dirname, path.normalize(file).replace(/^(\.\.[/\\])+/, ""));
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    // Never let the browser run a stale engine.js / index.html / cognition.js.
    // Code files are revalidated every load, so client and server always agree
    // (prevents the "sometimes I see old agent counts / :2" inconsistency).
    const ext = path.extname(fp);
    const headers = { "Content-Type": MIME[ext] || "text/plain" };
    if (ext === ".js" || ext === ".html" || ext === ".css") headers["Cache-Control"] = "no-store, must-revalidate";
    res.writeHead(200, headers);
    res.end(data);
  });
});

// Resilience: never let a single bad request (e.g. a wrong LLM key, a network
// hiccup, or an unawaited provider rejection) take the whole server down. Node
// exits on an unhandled rejection by default — log and keep serving instead.
process.on("unhandledRejection", e => console.error("[unai] unhandledRejection (ignored):", (e && e.message) || e));
process.on("uncaughtException", e => console.error("[unai] uncaughtException (ignored):", (e && e.message) || e));

const PORT = process.env.PORT || 3000;
server.on("error", e => {
  if (e && e.code === "EADDRINUSE") {
    console.error(`[unai] port ${PORT} is already in use — another server (maybe the old unai-app) is still running.\n` +
                  `       Stop it, or start this one on a free port:  PORT=3001 node server.js`);
    process.exit(1);
  }
  console.error("[unai] server error:", e && e.message);
});
// Node's default requestTimeout (5 min) kills long-running live-run routes
// (e.g. /api/yourapp-sdlc-run, a real multi-minute 21-section generation) —
// disable it here rather than race real work against an arbitrary cutoff.
server.requestTimeout = 0;
server.headersTimeout = 0;
server.listen(PORT, () => {
  console.log(`[unai] http://localhost:${PORT}`);
  console.log(`[unai] login wall: ${APP_WALL ? "ON" : "OFF"}  ·  roles: Admin (APP_PASSWORD) + Expert View (EXPERT_PASSWORD="`+EXPERT_PW+`")  ·  architecture password gate: ON`);
  console.log(`[unai] API v1: /api/v1 (Bearer token)  ·  key: ${API_KEYS[0]}${process.env.UNAI_API_KEYS ? " (from env)" : " (generated — set UNAI_API_KEYS to pin)"}`);
  const cs = containment.status();
  console.log(`[unai] containment: safeMode=${cs.safeMode} · actionPolicy=${cs.actionPolicy} · egressLocked=${cs.egressLocked}${cs.egressLocked ? " ("+cs.egressAllowlist.join(",")+")" : ""}`);
  const ls = license.status();
  console.log(`[unai] license: ${ls.mode}${ls.licensed ? " · "+(ls.customer||"?")+" · plan "+(ls.plan||"?")+(ls.expiresOn?" · expires "+ls.expiresOn:"")+(ls.mode!=="licensed"?" · REASON: "+ls.reason:"") : " (set UNAI_LICENSE or license.key to activate)"}`);
  console.log(`[unai] deploy mode: ${deployment.MODE} · kernelHosted=${deployment.status().kernelHosted}`);
  // Bring back every Foundry-built/converted app that was live before this
  // restart (Playground + "Your App vs UNAI" both read from the in-memory
  // RUNNING map, which a restart always wipes -- see autoRelaunchAll's own
  // comment in foundry_convert.js). Fire-and-forget: never blocks the server
  // from accepting requests while agents relaunch in the background.
  foundryConvert.autoRelaunchAll().then(results => {
    if (!results.length) return;
    const ok = results.filter(r => r.ok && !r.skipped).length;
    const failed = results.filter(r => !r.ok);
    console.log(`[unai] foundry auto-relaunch: ${ok}/${results.length} app(s) restored${failed.length ? " · failed: " + failed.map(f => f.id + " (" + f.error + ")").join(", ") : ""}`);
    // Customer-facing live app links (their own reverse-proxy ports) come back
    // the same way, once the converted apps they front are back up.
    return customerApi.ensureAllLiveGateways({ foundryConvert });
  }).then(gws => { if (gws && gws.length) console.log(`[unai] customer live links: ${gws.map(g => g.slug + ":" + g.port).join(", ")}`); })
    .catch(e => console.log("[unai] foundry auto-relaunch failed:", e.message));
});
