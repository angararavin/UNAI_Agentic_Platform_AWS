/*
 * UNAI - Universal Supply-Chain Agent (Cognitive Runtime)
 * Copyright (c) 2026 Ravin Angara / Bristlecone. All rights reserved.
 *
 * PROPRIETARY & CONFIDENTIAL. This file, and the architecture, methods and
 * ideas it embodies, are the exclusive property of the copyright holders.
 * No part may be copied, reproduced, modified, distributed, reverse-engineered,
 * or used to create derivative works without prior written permission.
 * Shared under confidentiality; unauthorized use or disclosure is prohibited.
 * See LICENSE.
 * SPDX-License-Identifier: LicenseRef-UNAI-Proprietary   [UNAI-COPYRIGHT v1]
 */
/* =============================================================================
 * foundry_convert.js — "Convert App -> Live UNAI Playground" pipeline.
 *
 * One call, convertFolder(path), takes an arbitrary local app folder and:
 *   1. analyzes it (LLM-assisted when a provider key is configured, otherwise
 *      a deterministic heuristic scan — never fabricated, see analyzeFolder),
 *   2. builds a UNAI manifest (same shape the Convert tab's cvAnalyze() builds
 *      client-side, ported here so it runs server-side without a browser),
 *   3. scaffolds a working copy (never touches the user's original folder)
 *      that either keeps+builds the app's own frontend or generates a small
 *      one, plus a best-effort per-app token-measurement harness,
 *   4. launches it as a local child process on a free port,
 *   5. persists the result so the Playground can auto-embed it with no
 *      manual URL paste.
 *
 * IMPORTANT: the wrapper server this generates is ALWAYS a small dependency-
 * free Node http server (unai-server.cjs), regardless of the source app's own
 * runtime (Node or Python). It does not run the original app's own dev
 * server — it serves the original frontend's static build output (or a
 * generated UI) and runs the real UNAI engine + a best-effort measurement
 * harness on demand. This is far more reliable than trying to boot an
 * arbitrary app's own dev toolchain, at the cost of not getting that app's
 * own hot-reload dev experience — acceptable for a "live comparison
 * playground", not a development environment.
 *
 * Same trust model as the existing ADK_SPARES_RMA_PATH / RMA_POC_DIR spawn()
 * patterns already in server.js: single local developer machine, not
 * multi-tenant or internet-facing.
 * ========================================================================== */
const fs = require("fs");
const path = require("path");
const net = require("net");
const http = require("http");
const crypto = require("crypto");
const { spawn, spawnSync } = require("child_process");
const COGNITION = require("./cognition.js");
const { chatWithFailover, resolveProviders, enrichEvidence } = require("./llm.js");
const customerApi = require("./customer_api.js");

const APP_DIR = __dirname;
const CONVERTED_DIR = path.join(APP_DIR, ".converted");
const CONV_STATE_FILE = path.join(APP_DIR, ".conversions.json");

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".venv", ".venv-local", "__pycache__",
  ".next", ".cache", ".converted", ".turbo", "coverage", ".vscode", ".idea", "venv",
]);
const TEXT_EXT = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".py", ".json", ".md", ".txt"]);

// Same layer/system regex table as the Convert tab's client-side cvClassify()
// (unai-app/index.html) — kept in sync by hand since the browser can't require() this file.
const CV_SYS = [
  [/rma|warranty|credit|ticket|incident/, "SERVICENOW"],
  [/inventory|stock|shipment|goods|refurb|repair/, "SAP_S4"],
  [/forecast|risk|demand|ml|predict|anomaly/, "ANALYTICS"],
  [/purchase|procure|supplier|vendor|budget|\bpo\b|_po\b|\bpo_/, "SAP_MM"],
  [/install|spares|target|plan/, "SAP_IBP"],
  [/sales|order/, "SAP_SD"],
];
const GUARDRAILS = ["PII redaction", "Prompt-injection screen", "Action safety (no destructive op)", "Confidence gate", "Value/policy gate"];
// Host-based patterns (api.groq.com, generativelanguage.googleapis.com, ...)
// catch a raw httpx/fetch/requests call straight to a provider's REST API --
// no SDK import to key off of -- which library-name-only patterns miss
// entirely (e.g. a Python agent doing httpx.post("https://api.groq.com/...")
// imports nothing named "groq" at all). Shared by heuristicAnalysis (capped
// per-file at collectSourceFiles' maxBytes) and scanLlmCallSitesFull
// (untruncated) below.
const LLM_HINT_RE = /openai|anthropic|@anthropic-ai|google\.generativeai|genai|langchain|ollama|ChatOpenAI|ChatAnthropic|ChatOllama|mistralai|api\.groq\.com|generativelanguage\.googleapis\.com|api\.mistral\.ai|api\.openai\.com|openrouter\.ai/i;

function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "item"; }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

// ---------------------------------------------------------------------------
// Folder walking / analysis
// ---------------------------------------------------------------------------
function walk(root, cb, excludeAbs) {
  let entries; try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch (_) { return; }
  for (const e of entries) {
    if (e.name.startsWith(".") && e.name !== ".env.example") continue;
    if (IGNORE_DIRS.has(e.name)) continue;
    const abs = path.join(root, e.name);
    if (excludeAbs && abs === excludeAbs) continue;
    if (e.isDirectory()) walk(abs, cb, excludeAbs);
    else cb(abs);
  }
}
// Finds every top-level and method `def name(...):` in a Python file and
// its body's line span, using indentation alone (Python has no braces to
// balance): a def's body runs until the next def/class at the SAME OR
// LESSER indentation (or EOF). Good enough to attribute a match's line
// number to its enclosing function -- doesn't need to understand the body's
// actual control flow, just where it ends.
function findPythonFunctionSpans(content) {
  const lines = content.split("\n");
  const defRe = /^(\s*)def\s+([A-Za-z0-9_]+)\s*\(/;
  const spans = [];
  for (let i = 0; i < lines.length; i++) {
    const m = defRe.exec(lines[i]);
    if (m) spans.push({ name: m[2], startLine: i, indent: m[1].length, endLine: lines.length });
  }
  for (let i = 0; i < spans.length; i++) {
    for (let j = i + 1; j < spans.length; j++) {
      if (spans[j].indent <= spans[i].indent) { spans[i].endLine = spans[j].startLine; break; }
    }
  }
  return spans;
}
// Full-file (untruncated) scan for llmHintRe matches, attributed to the
// SPECIFIC enclosing function/method for .py files (not just "this file
// somewhere") -- collectSourceFiles caps each file at maxBytes (~3500) to
// keep the LLM-analysis prompt small, but a real call site can sit anywhere,
// well past that cutoff, and a file-level-only attribution would wrongly
// implicate every OTHER function in the same file (e.g. a plain keyword-
// matching helper that happens to share a file with the actual LLM call).
// Scans every occurrence (not just the first) since an earlier match --
// including inside a comment -- shouldn't hide a later, unrelated one in a
// different function. A module-level match (outside any function) is
// skipped for .py files that DO have functions, rather than falling back to
// "the whole file" and reintroducing the over-attribution this exists to
// avoid; non-Python files keep the old file-level attribution (symbol: null)
// since there's no indentation-based span parser for them here.
function scanLlmCallSitesFull(root, excludeDir) {
  const sites = []; const seen = new Set();
  const hintReGlobal = new RegExp(LLM_HINT_RE.source, "gi");
  walk(root, abs => {
    if (sites.length >= 40) return;
    const ext = path.extname(abs).toLowerCase();
    if (!TEXT_EXT.has(ext)) return;
    const relPath = path.relative(root, abs).split(path.sep).join("/");
    let content; try { content = fs.readFileSync(abs, "utf8"); } catch (_) { return; }
    if (ext !== ".py") {
      const hint = content.match(LLM_HINT_RE);
      if (hint && !seen.has(relPath)) { seen.add(relPath); sites.push({ file: relPath, symbol: null, clientLib: hint[0], description: "detected via keyword scan" }); }
      return;
    }
    const lines = content.split("\n");
    const spans = findPythonFunctionSpans(content);
    const directNames = new Set();
    hintReGlobal.lastIndex = 0; let m;
    while ((m = hintReGlobal.exec(content))) {
      const line = content.slice(0, m.index).split("\n").length - 1;
      const span = spans.find(s => line >= s.startLine && line < s.endLine);
      if (!span && spans.length) continue;   // module-level in a file that HAS functions -- skip, don't blanket-attribute
      const key = relPath + "::" + (span ? span.name : "");
      if (span) directNames.add(span.name);
      if (seen.has(key)) continue;
      seen.add(key);
      sites.push({ file: relPath, symbol: span ? span.name : null, clientLib: m[0], description: "detected via keyword scan" });
    }
    // One-hop call-graph expansion: a public method that just calls a private
    // helper containing the actual LLM call (e.g. answer_question() calling
    // self._consult_groq_compact(), where the real httpx.post lives) should
    // ALSO count as real-cost -- otherwise only the rarely-externally-invoked
    // private helper gets flagged, and the public capability callers
    // actually use looks like it costs nothing.
    if (directNames.size) {
      for (const span of spans) {
        if (directNames.has(span.name)) continue;
        const body = lines.slice(span.startLine, span.endLine).join("\n");
        for (const name of directNames) {
          if (body.includes(name + "(")) {
            const key = relPath + "::" + span.name;
            if (!seen.has(key)) { seen.add(key); sites.push({ file: relPath, symbol: span.name, clientLib: "(calls " + name + ")", description: "calls another real LLM call site in this file" }); }
            break;
          }
        }
      }
    }
  }, excludeDir ? path.resolve(excludeDir) : null);
  return sites;
}
function collectSourceFiles(root, opts = {}) {
  const maxFiles = opts.maxFiles || 40, maxBytes = opts.maxBytes || 3500, maxTotal = opts.maxTotal || 42000;
  const files = []; let total = 0;
  walk(root, abs => {
    if (files.length >= maxFiles || total >= maxTotal) return;
    const ext = path.extname(abs).toLowerCase();
    if (!TEXT_EXT.has(ext)) return;
    let content; try { content = fs.readFileSync(abs, "utf8"); } catch (_) { return; }
    if (content.length > maxBytes) content = content.slice(0, maxBytes) + "\n/* …truncated… */";
    const relPath = path.relative(root, abs).split(path.sep).join("/");
    files.push({ path: relPath, content }); total += content.length;
  }, opts.excludeDir ? path.resolve(opts.excludeDir) : null);
  return files;
}
function detectFrontend(root) {
  // Checked FIRST, before the generic react/vue/vite-deps heuristic below --
  // a combined Express(+Vite-middleware) server like `"dev":"tsx server.ts"`
  // also depends on "vite"/"react", which would otherwise get misclassified
  // as a plain static frontend and sent through tryBuildFrontend(), losing
  // its own API routes (see detectNodeFullstackEntry's header comment).
  const fullstackEntry = detectNodeFullstackEntry(root);
  if (fullstackEntry) return { hasFrontend: true, frontendDir: root, frontendKind: "node-fullstack", frontendEntry: fullstackEntry.entry, frontendCmd: fullstackEntry.cmd };
  // Same reasoning, Python side: a FastAPI/Flask app that mounts its own
  // static frontend (StaticFiles + a root route returning index.html) has to
  // be launched live too -- the frontend/client/web/ui checks below require a
  // package.json (a Node build step), which a plain server-rendered static
  // frontend never has, so without this it would fall through to "no
  // frontend detected" and lose the app's real UI (see detectPythonFullstackEntry).
  const pyFullstackEntry = detectPythonFullstackEntry(root);
  if (pyFullstackEntry) return { hasFrontend: true, frontendDir: root, frontendKind: "python-fullstack", frontendEntry: pyFullstackEntry.appSpec, pyEntryFile: pyFullstackEntry.entryFile };
  for (const c of ["frontend", "client", "web", "ui"]) {
    const d = path.join(root, c);
    if (fs.existsSync(d) && fs.statSync(d).isDirectory() && fs.existsSync(path.join(d, "package.json"))) return { hasFrontend: true, frontendDir: d, frontendKind: "node" };
  }
  try {
    const pkgPath = path.join(root, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
      if (["react", "vue", "svelte", "next", "vite"].some(k => deps[k])) return { hasFrontend: true, frontendDir: root, frontendKind: "node" };
    }
  } catch (_) {}
  if (fs.existsSync(path.join(root, "index.html")) && fs.existsSync(path.join(root, "src"))) return { hasFrontend: true, frontendDir: root, frontendKind: "node" };
  const streamlitEntry = detectStreamlitEntry(root);
  if (streamlitEntry) return { hasFrontend: true, frontendDir: root, frontendKind: "streamlit", frontendEntry: streamlitEntry };
  return { hasFrontend: false, frontendDir: null, frontendKind: null };
}
// Detects a Node app whose "dev" script runs ONE server file that serves
// both the API routes AND the frontend itself (e.g. Express + Vite in
// middleware mode, like create-vite's SSR templates) -- as opposed to a pure
// frontend dev server (plain `"dev":"vite"`/`"next dev"`/`"react-scripts
// start"`, which tryBuildFrontend()'s static-build path already handles
// fine). Building THIS shape statically and serving only its dist/ as static
// files would drop its API routes -- the client JS calls e.g. /api/agents/run
// and gets nothing back. Distinguishing test: does the invoked entry file
// actually import a server framework? A plain `vite`/`next`/`react-scripts`
// invocation never does.
function detectNodeFullstackEntry(root) {
  try {
    const pkgPath = path.join(root, "package.json");
    if (!fs.existsSync(pkgPath)) return null;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const devScript = (pkg.scripts && (pkg.scripts.dev || pkg.scripts.start)) || "";
    const m = devScript.match(/\b(tsx|ts-node|node|nodemon)\s+([^\s]+\.(?:ts|js|mjs|cjs|tsx))\b/);
    if (!m) return null;
    const cmd = m[1], entry = m[2];
    const entryPath = path.join(root, entry);
    if (!fs.existsSync(entryPath)) return null;
    const content = fs.readFileSync(entryPath, "utf8");
    const looksLikeServer = /from\s+["']express["']|require\(\s*["']express["']\s*\)|from\s+["']fastify["']|from\s+["']koa["']|createServer\s*\(|\.listen\s*\(/.test(content);
    if (!looksLikeServer) return null;
    return { entry, cmd };
  } catch (_) { return null; }
}
// Detects a Python app (FastAPI/Flask/etc.) that serves both its own API
// routes AND its own static frontend from one process -- the Python analog
// of detectNodeFullstackEntry. Building the frontend's index.html/app.js as
// a "static site" and dropping the backend would break every fetch('/api/...')
// call the frontend makes, so this is launched live via uvicorn instead (see
// launchPythonFullstackPreview), never statically built.
// Matches e.g. `uvicorn.run("backend.main:app", host="127.0.0.1", port=8000)`.
function detectPythonFullstackEntry(root) {
  const isPython = fs.existsSync(path.join(root, "requirements.txt")) || fs.existsSync(path.join(root, "pyproject.toml"));
  if (!isPython) return null;
  const hasStaticFrontend = ["frontend", "client", "web", "ui"].some(c => fs.existsSync(path.join(root, c, "index.html")));
  if (!hasStaticFrontend) return null;
  let appSpec = null, entryFile = null;
  walk(root, abs => {
    if (appSpec || !abs.endsWith(".py")) return;
    let content; try { content = fs.readFileSync(abs, "utf8"); } catch (_) { return; }
    const m = /uvicorn\.run\(\s*["']([\w.]+):(\w+)["']/.exec(content);
    if (m) { appSpec = m[1] + ":" + m[2]; entryFile = abs; }
  });
  return appSpec ? { appSpec, entryFile: path.relative(root, entryFile) } : null;
}
// Streamlit apps have no build step and no package.json -- a Python file
// that does `import streamlit` IS the frontend, launched live with its own
// process (see launchStreamlitPreview) rather than "built" like a JS one.
// The entry is often nested (e.g. src/ui/app.py, a common project-layout
// convention), not sitting at the project root, so this walks the whole
// tree (via the same walk() helper detectPythonFullstackEntry uses, which
// already skips node_modules/.venv/__pycache__/dotfiles) rather than only
// checking root-level files -- a root-only check silently missed every
// nested Streamlit UI and fell through to "no frontend detected", losing
// the app's real UI even though one plainly existed on disk.
function detectStreamlitEntry(root) {
  const preferred = new Set(["streamlit_app.py", "app.py", "main.py", "dashboard.py"]);
  const looksLikeStreamlit = (abs) => {
    try { return /^\s*(import streamlit|from streamlit)/m.test(fs.readFileSync(abs, "utf8")); }
    catch (_) { return false; }
  };
  const hits = [];
  walk(root, abs => { if (abs.endsWith(".py") && looksLikeStreamlit(abs)) hits.push(abs); });
  if (!hits.length) return null;
  // Prefer a shallower path, then a preferred basename, so a top-level
  // streamlit_app.py still wins over some incidental nested match.
  hits.sort((a, b) => {
    const da = a.split(path.sep).length, db = b.split(path.sep).length;
    if (da !== db) return da - db;
    const pa = preferred.has(path.basename(a)) ? 0 : 1, pb = preferred.has(path.basename(b)) ? 0 : 1;
    return pa - pb;
  });
  return path.relative(root, hits[0]);
}
// Reads a .env file from the ORIGINAL source folder (never the workDir copy
// -- copyDirClean deliberately skips dotfiles so a converted app's workDir,
// which can be zip-downloaded via /api/foundry/download-converted, never
// embeds the source app's real secrets on disk). Returns a plain
// key->value object of just what's read; callers inject it straight into a
// spawned child's env, so it lives only in that process's memory.
function readDotEnv(dir) {
  const envPath = path.join(dir, ".env");
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  try {
    for (const line0 of fs.readFileSync(envPath, "utf8").split("\n")) {
      const line = line0.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const i = line.indexOf("=");
      const k = line.slice(0, i).trim(), v = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, "");
      if (k) out[k] = v;
    }
  } catch (_) {}
  return out;
}
function detectRuntime(root) {
  if (fs.existsSync(path.join(root, "package.json"))) return "node";
  if (fs.existsSync(path.join(root, "requirements.txt")) || fs.existsSync(path.join(root, "pyproject.toml"))) return "python";
  return "unknown";
}

function extractJson(text) {
  let t = String(text || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch (_) {}
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s >= 0 && e > s) { try { return JSON.parse(t.slice(s, e + 1)); } catch (_) {} }
  return null;
}

async function runLlmAnalysis(appName, files) {
  const listing = files.map(f => `--- ${f.path} ---\n${f.content}`).join("\n\n");
  const sys = `You analyze the source code of an existing agent/automation app named "${appName}" and reply with STRICT JSON ONLY -- no prose, no markdown code fences, no explanation. Schema:
{"capabilities":[{"id":"snake_case_id","label":"Human label","kind":"perception"|"action","systemGuess":"SAP_MM"|"SAP_SD"|"SAP_FI"|"SAP_IBP"|"SAP_S4"|"ANALYTICS"|"SERVICENOW"|null,"sourceFile":"relative/path","sourceSymbol":"function or def name"}],"llmCallSites":[{"file":"relative/path","clientLib":"e.g. openai, anthropic, google-generativeai, langchain, ollama","description":"one line"}]}
Rules: "kind":"perception" for read/lookup/query/analyze steps, "action" for write/create/execute/notify steps. List every distinct capability (tool/function) the app exposes as its own item -- do not merge them. List every place the app calls an LLM/model provider in llmCallSites (empty array if none). Output ONLY the JSON object.`;
  const r = await chatWithFailover([
    { role: "system", content: sys },
    { role: "user", content: "SOURCE FILES:\n\n" + listing },
  ], { temperature: 0, max_tokens: 1600, timeoutMs: 45000, tier: "complex" });
  if (!r || !r.content) throw new Error("no LLM response");
  const json = extractJson(r.content);
  if (!json || !Array.isArray(json.capabilities)) throw new Error("LLM did not return the expected JSON shape");
  json.provider = r.provider;
  return json;
}

function heuristicAnalysis(files) {
  const caps = [], seen = new Set(), llmCallSites = [];
  const fnRes = [
    /export\s+async\s+function\s+([A-Za-z0-9_]+)/g,
    /export\s+function\s+([A-Za-z0-9_]+)/g,
    /^\s*(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/gm,
    /def\s+([A-Za-z0-9_]+)\s*\(/g,
  ];
  const skipNames = /^(main|index|test|handler|constructor|require|module|exports)$/i;
  for (const f of files) {
    const hint = f.content.match(LLM_HINT_RE);
    if (hint) llmCallSites.push({ file: f.path, clientLib: hint[0], description: "detected via keyword scan" });
    for (const re of fnRes) {
      re.lastIndex = 0; let m;
      while ((m = re.exec(f.content))) {
        const name = m[1];
        if (!name || seen.has(name) || skipNames.test(name) || caps.length >= 15) continue;
        seen.add(name);
        const label = name.replace(/_/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2");
        caps.push({
          id: slug(label), label,
          kind: /^(get|list|read|fetch|lookup|query|check|detect|analy)/i.test(name) ? "perception" : "action",
          systemGuess: null, sourceFile: f.path, sourceSymbol: name,
        });
      }
    }
  }
  return { capabilities: caps.slice(0, 15), llmCallSites };
}

async function analyzeFolder(folderPath) {
  const root = path.resolve(String(folderPath || ""));
  if (!root || !fs.existsSync(root)) throw new Error(`Path not found: ${root}`);
  if (!fs.statSync(root).isDirectory()) throw new Error(`Not a directory: ${root}`);
  let appName = path.basename(root);
  try { appName = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).name || appName; } catch (_) {}
  const fe = detectFrontend(root);
  const runtime = detectRuntime(root);
  const files = collectSourceFiles(root, { excludeDir: fe.hasFrontend ? fe.frontendDir : null });
  if (!files.length) throw new Error("No readable .js/.ts/.py source files found in this folder (after excluding a detected frontend).");

  let llmResult = null, llmError = null;
  if (resolveProviders().length) {
    try { llmResult = await runLlmAnalysis(appName, files); } catch (e) { llmError = e.message; }
  }
  const heuristic = heuristicAnalysis(files);
  const capabilities = (llmResult && llmResult.capabilities.length) ? llmResult.capabilities : heuristic.capabilities;
  if (!capabilities.length) throw new Error("Could not find any convertible functions/capabilities in this folder.");
  // Untruncated re-scan for real LLM call sites (see scanLlmCallSitesFull) --
  // collectSourceFiles caps each file at ~3500 bytes to bound the LLM-analysis
  // prompt, which can (and did, for a several-hundred-line agent class) cut a
  // file off before its actual provider call. Prefer the LLM-assisted result
  // when one came back non-empty; it already saw full files in its own prompt.
  const fullLlmCallSites = (llmResult && llmResult.llmCallSites && llmResult.llmCallSites.length)
    ? llmResult.llmCallSites
    : scanLlmCallSitesFull(root, fe.hasFrontend ? fe.frontendDir : null);

  return {
    appName, runtime, hasFrontend: fe.hasFrontend, frontendDir: fe.frontendDir,
    frontendKind: fe.frontendKind, frontendEntry: fe.frontendEntry, frontendCmd: fe.frontendCmd, pyEntryFile: fe.pyEntryFile,
    capabilities,
    llmCallSites: fullLlmCallSites,
    usedLLM: !!llmResult, llmProvider: llmResult ? llmResult.provider : null, llmError,
  };
}

// ---------------------------------------------------------------------------
// Manifest (same shape the Convert tab's cvAnalyze()/faManifest() produce)
// ---------------------------------------------------------------------------
function classify(label) {
  const n = String(label || "").toLowerCase();
  const layer = /read|get|list|query|fetch|lookup|search|check|detect|analy/.test(n) ? "Perception"
    : /create|update|write|post|send|issue|place|raise|delete|execute|notify/.test(n) ? "Action" : "Reasoning";
  let system = null; for (const [re, s] of CV_SYS) { if (re.test(n)) { system = s; break; } }
  let concept = null, conceptConf = 0;
  try { const m = COGNITION.matchColumn(label); if (m && m.concept) { concept = m.concept; conceptConf = m.confidence; } } catch (_) {}
  return { layer, system, concept, conceptConf };
}

// ---------------------------------------------------------------------------
// Free-text -> capabilities, for the Foundry's "Build a new agent" tab when
// the description doesn't match a known USE_CASES entry (faDetectUseCase in
// index.html returns null). LLM-assisted when a provider key is configured
// (same analyze-then-fall-back pattern as runLlmAnalysis/heuristicAnalysis
// above), a deterministic clause-splitter otherwise — either way, capability
// chips are generated automatically. No one has to type each one by hand
// into "+ add custom capability".
// ---------------------------------------------------------------------------
async function decomposeDescription(text) {
  const desc = String(text || "").trim();
  if (!desc) return { usedLLM: false, capabilities: [] };
  let labels = null, usedLLM = false, provider = null;
  if (resolveProviders().length) {
    try {
      const sys = 'You configure an autonomous business agent. Given a free-text description of what it should do, extract 3-6 DISTINCT capabilities as STRICT JSON ONLY (no prose, no markdown fences): {"capabilities":["Short Title Case Capability Name", ...]}. One capability per distinct action/check/decision mentioned. Each label: 2-5 words, Title Case. Do not invent capabilities the text does not imply.';
      const r = await chatWithFailover([
        { role: "system", content: sys },
        { role: "user", content: "DESCRIPTION:\n" + desc },
      ], { temperature: 0, max_tokens: 300, timeoutMs: 20000, tier: "simple" });
      if (r && r.content) {
        const json = extractJson(r.content);
        if (json && Array.isArray(json.capabilities) && json.capabilities.length) { labels = json.capabilities.map(String); usedLLM = true; provider = r.provider; }
      }
    } catch (_) {}
  }
  if (!labels) labels = heuristicDecompose(desc);
  const seen = new Set();
  const capabilities = labels.map(label => {
    const id = slug(label); if (seen.has(id)) return null; seen.add(id);
    const cl = classify(label);
    return { id, label, systems: cl.system ? [cl.system] : [], layer: cl.layer, concept: cl.concept };
  }).filter(Boolean);
  return { usedLLM, provider, capabilities };
}
// Deterministic fallback (no model key, so 0 tokens): strip a "Build a(n) X
// agent that/to" preamble, split on connecting words/punctuation, strip a
// leading verb, Title Case what's left. No model call, nothing fabricated —
// just the user's own words, regrouped into chips.
const FD_LEAD_RE = /^(build|create|make|design)\s+(an?|the)?\s*.*?\bagent\s+(that|to|which|for)\b/i;
const FD_VERB_RE = /^(checks?|verif(y|ies|ying)|flags?|flagging|schedules?|scheduling|reads?|reading|tracks?|tracking|manages?|managing|analyz(e|es|ing)|monitors?|monitoring|creates?|generat(e|es|ing)|calculat(e|es|ing)|detects?|detecting|predicts?|predicting|optimiz(e|es|ing)|automat(e|es|ing)|balances?|balancing|allocat(e|es|ing)|reconcil(e|es|ing)|award(s|ing)?|select(s|ing)?)\s+/i;
function heuristicDecompose(text) {
  const t = text.replace(FD_LEAD_RE, "").trim();
  const clauses = t.split(/,|;|\band\b/i).map(s => s.trim()).filter(s => s.split(/\s+/).length >= 2);
  return clauses.slice(0, 6).map(c => {
    let label = c.replace(FD_VERB_RE, "").replace(/[.]+$/, "").trim();
    label = label.replace(/\b\w/g, ch => ch.toUpperCase());
    return label;
  }).filter(Boolean);
}
function buildManifest(analysis) {
  const capabilities = analysis.capabilities.map(c => {
    const cl = classify(c.label);
    return {
      id: slug(c.id || c.label), label: c.label,
      layer: c.kind === "action" ? "Action" : c.kind === "perception" ? "Perception" : cl.layer,
      systems: c.systemGuess ? [c.systemGuess] : (cl.system ? [cl.system] : []),
      concept: cl.concept,
    };
  });
  const systems = [...new Set(capabilities.flatMap(c => c.systems))];
  const absorbedSubsystems = [];
  if ((analysis.llmCallSites || []).length) absorbedSubsystems.push("Own per-call LLM plumbing / retries");
  absorbedSubsystems.push("Per-agent reasoning + retries");
  return {
    name: analysis.appName, description: `Converted from local folder (${analysis.runtime})`,
    source: "convert", sourceFormat: "folder:" + analysis.runtime, createdAt: new Date().toISOString(),
    layers: 7, capabilities, systems, absorbedSubsystems,
    governance: { autonomyThresholdPct: 85, valueLimitUsd: 50000, guardrails: GUARDRAILS.slice() },
  };
}

// Turns a source path into a short human name for the "Your App vs UNAI"
// breakdown -- "agent_1_failure/agent.py" -> "Failure", "orchestrator.py" ->
// "Orchestrator". Best-effort cosmetic only; falls back to the raw base name.
function friendlyAgentName(sourceFile) {
  // Flat layouts (agent_1_failure/agent.py) need the FOLDER name -- the
  // filename itself is identical ("agent.py") across every agent. Deeper
  // layouts (server/agents/agent1Disposition.ts) need the FILENAME -- the
  // folders are shared across every agent. Try the filename first; only fall
  // back to parent folders (innermost first) when it's a generic shared name.
  const GENERIC = /^(agent|index|main|common|utils?|server|app|handler|core|lib|src)$/i;
  const parts = sourceFile.split("/");
  const filename = parts[parts.length - 1].replace(/\.\w+$/, "");
  const candidates = GENERIC.test(filename) ? [...parts.slice(0, -1).reverse(), filename] : [filename];
  const pick = candidates.find(c => c && !GENERIC.test(c)) || candidates[candidates.length - 1] || filename;
  const cleaned = pick
    .replace(/^agent(?![a-z])[_-]?\d*[_-]?/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  return (cleaned || pick).replace(/\b\w/g, ch => ch.toUpperCase());
}
// Groups a manifest's capabilities by which source file/module they came
// from, so "Your App vs UNAI" can show one row per REAL agent (e.g. this
// app's actual 4 agents) instead of every capability flattened into one
// blob row. Zips analysis.capabilities (has sourceFile) against
// manifest.capabilities (has the final, slugged id) BY INDEX -- buildManifest
// maps analysis.capabilities 1:1 in order, so index alignment is exact even
// though buildManifest's slug(c.id) may not equal analysis's raw c.id.
function groupCapabilitiesBySource(analysis, manifest) {
  const groups = new Map();
  analysis.capabilities.forEach((c, i) => {
    const mc = manifest.capabilities[i]; if (!mc) return;
    const key = c.sourceFile || "unknown";
    if (!groups.has(key)) groups.set(key, { name: friendlyAgentName(key), sourceFile: key, capabilityIds: [] });
    groups.get(key).capabilityIds.push(mc.id);
  });
  return [...groups.values()];
}

// ---------------------------------------------------------------------------
// Reference tool-pack stubs (NOT required to run — the live comparison uses
// the engine's existing generic capability handler; these are hand-off
// starting points, same idea as the Convert tab's downloadable cvStubs()).
// ---------------------------------------------------------------------------
function buildToolPackStubsJs(manifest) {
  const caps = manifest.capabilities || [];
  const sysOf = c => (c.systems && c.systems[0]) || "ANALYTICS", conOf = c => c.concept || "sku";
  return `/* ${manifest.name} -- reference UNAI tool packs (generated, NOT required to run).
 * The live comparison uses the engine's generic capability handler automatically.
 * These are starting points if you want to hand-write real per-capability logic
 * and merge it into engine.js's TOOL_PACKS later. */
const TOOL_PACKS = {
${caps.map(c => `  ${c.id}(L) {                       // ${c.label} - ${c.layer} - ${sysOf(c)} - ${conOf(c)}
    const rows = L.perceive("${sysOf(c)}", "${conOf(c)}", {});
    const ev = L.evidence("${c.label}", [{ name: "${conOf(c)}", weight: 0.2 }]);
    L.explain(ev);${c.layer === "Action" ? `\n    // L.act("${sysOf(c)}", "UPDATE", { ${conOf(c)}: /* value */ }); // gated write-back` : ""}
    return { rows, evidence: ev };
  },`).join("\n")}
};
module.exports = { TOOL_PACKS };
`;
}

// ---------------------------------------------------------------------------
// Minimal generated UI (used when the source app has no frontend, or its
// frontend couldn't be built automatically)
// ---------------------------------------------------------------------------
function buildMinimalUI(manifest) {
  const rows = manifest.capabilities.map(c => `<button class="cap" data-cap="${esc(c.id)}">${esc(c.label)}</button>`).join("\n      ");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(manifest.name)} on UNAI</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;font:14px/1.5 ui-sans-serif,system-ui,Segoe UI,Roboto,sans-serif;background:#0b0e14;color:#e8ecf4}
  header{padding:18px 22px;border-bottom:1px solid #1c2536}
  h1{font-size:16px;margin:0}
  .muted{color:#8b96ab}
  main{padding:20px 22px;max-width:920px;margin:0 auto}
  .card{background:#111831;border:1px solid #1c2536;border-radius:10px;padding:16px;margin-bottom:14px}
  button{background:#1c2536;color:#e8ecf4;border:1px solid #2b3654;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:13px;margin:0 6px 6px 0}
  button:hover{border-color:#4a5a86}
  pre{white-space:pre-wrap;background:#0b0e14;border:1px solid #1c2536;border-radius:8px;padding:10px;max-height:320px;overflow:auto;font-size:12px}
  .kpis{display:flex;gap:14px;flex-wrap:wrap}
  .kpi{flex:1;min-width:140px;background:#0b0e14;border:1px solid #1c2536;border-radius:8px;padding:10px}
  .kpi .v{font-size:20px;font-weight:600}
  .kpi .l{font-size:11px;color:#8b96ab}
  .badge{display:inline-block;border:1px solid #2b3654;border-radius:999px;padding:2px 8px;font-size:11px}
</style></head>
<body>
<header><h1>${esc(manifest.name)}</h1><div class="muted">${manifest.source === "build" ? "built from scratch" : "converted from " + esc(manifest.sourceFormat || "source")} -- running on the UNAI shared runtime</div></header>
<main>
  <div class="card"><h2 style="margin-top:0">Capabilities</h2>
    ${rows}
  </div>
  <div class="card"><div id="runOut" class="muted">Pick a capability above to run it on the shared runtime.</div></div>
  <div class="card"><h2 style="margin-top:0">Your app vs UNAI -- live token comparison</h2>
    <button id="cmpBtn">Run comparison</button>
    <div id="cmpOut" style="margin-top:10px" class="muted">Not run yet.</div>
  </div>
</main>
<script>
function esc(s){return String(s==null?'':s).replace(/[&<>]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});}
function detailCard(e){
  var d=e.detailed; var pct=Math.round((e.confidence||0)*100);
  var head='<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b>'+esc(e.decision||'Decision')+'</b>'+
    '<span class="badge">'+(e.autonomous?'autonomous':'human approval')+' · '+pct+'%</span></div>';
  if(!d) return '<div class="card">'+head+'<div class="muted" style="margin-top:6px">'+esc(e.explanation||'')+'</div></div>';
  var live=d.source&&d.source!=='template';
  var steps=(d.reasoningSteps||[]).map(function(s){return '<li style="margin:2px 0">'+esc(s)+'</li>';}).join('');
  var factors=(d.contributingFactors||[]).map(function(f){return '<span class="badge" style="margin:2px 4px 2px 0">'+esc(f.name)+' · '+f.sharePct+'%</span>';}).join('');
  return '<div class="card">'+head+
    '<div class="muted" style="margin:6px 0 8px">'+esc(d.summary||'')+' <span class="badge">'+(live?'live':'template')+'</span></div>'+
    '<div style="margin:6px 0"><b style="color:#22d3aa">Root cause</b><div class="muted">'+esc(d.rootCause||'')+'</div></div>'+
    '<div style="margin:6px 0"><b style="color:#22d3aa">Primary driver</b><div class="muted">'+esc((d.primaryDriver||{}).name||'')+' — '+((d.primaryDriver||{}).sharePct||0)+'% of the decision</div></div>'+
    '<div style="margin:6px 0"><b style="color:#22d3aa">Step-by-step reasoning</b><ol style="margin:4px 0 0 18px;padding:0">'+steps+'</ol></div>'+
    '<div style="margin:6px 0"><b style="color:#22d3aa">Contributing factors</b><div style="margin-top:4px">'+(factors||'<span class="muted">—</span>')+'</div></div>'+
    '<div style="margin:6px 0"><b style="color:#22d3aa">Recommended action</b><div class="muted">'+esc(d.recommendedAction||'')+'</div></div>'+
    '</div>';
}
function renderRun(j){
  var evs=(j&&j.evidence)||[];
  var head='<div style="margin-bottom:8px"><b>Detailed explainability</b> — '+evs.length+' decision'+(evs.length===1?'':'s')+', each with root cause, reasoning steps, drivers and recommended action.</div>';
  var cards=evs.map(detailCard).join('');
  return head+cards+'<details style="margin-top:6px"><summary class="muted" style="cursor:pointer">Raw run JSON</summary><pre>'+esc(JSON.stringify(j,null,2).slice(0,6000))+'</pre></details>';
}
document.querySelectorAll('.cap').forEach(function(b){ b.addEventListener('click', function(){
  var out=document.getElementById('runOut'); out.textContent='Running '+b.textContent+'...';
  fetch('/api/unai/run',{method:'POST'}).then(function(r){return r.json();}).then(function(j){
    out.innerHTML=renderRun(j);
  }).catch(function(e){ out.textContent='Error: '+e.message; });
});});
document.getElementById('cmpBtn').addEventListener('click', function(){
  var out=document.getElementById('cmpOut'); out.textContent='Running your app + UNAI...';
  fetch('/api/unai/compare',{method:'POST'}).then(function(r){return r.json();}).then(function(j){
    out.innerHTML='<div class="kpis">'+
      '<div class="kpi"><div class="v">'+j.yourApp.tokensTotal+'</div><div class="l">your app tokens <span class="badge">'+(j.yourApp.measured?'measured':'modeled')+'</span></div></div>'+
      '<div class="kpi"><div class="v">'+j.unai.tokensTotal+'</div><div class="l">UNAI tokens <span class="badge">'+(j.unai.measured?'measured':'modeled')+'</span></div></div>'+
      '<div class="kpi"><div class="v">-'+j.savingsPct+'%</div><div class="l">token reduction</div></div>'+
    '</div>';
  }).catch(function(e){ out.textContent='Error: '+e.message; });
});
</script>
</body></html>`;
}

// ---------------------------------------------------------------------------
// Best-effort per-app measurement harnesses (see module header). Both ALWAYS
// write a report; the wrapper server treats tokensIn+tokensOut===0 as
// "unmeasured" and falls back to the modeled comparison, never fabricating.
// ---------------------------------------------------------------------------
function buildNodeMeasureHarness(analysis) {
  const targets = analysis.capabilities
    .filter(c => c.sourceFile && /\.(js|mjs|cjs)$/i.test(c.sourceFile) && c.sourceSymbol)
    .slice(0, 6).map(c => ({ file: c.sourceFile, symbol: c.sourceSymbol }));
  return `/* Generated measurement harness -- best-effort. Intercepts real LLM provider
 * HTTP responses (usage / usageMetadata) via global fetch, then tries calling a
 * few of the app's own exported functions. If nothing real gets invoked this
 * reports zero, and unai-server.cjs falls back to the modeled comparison --
 * it never fabricates a token count. */
const fs = require("fs");
const path = require("path");
const HOSTS = /api\\.openai\\.com|api\\.anthropic\\.com|api\\.mistral\\.ai|generativelanguage\\.googleapis\\.com|api\\.groq\\.com|api\\.together\\.xyz|openrouter\\.ai|localhost:11434|127\\.0\\.0\\.1:11434/i;
let tokensIn = 0, tokensOut = 0, calls = 0;
const origFetch = global.fetch;
if (origFetch) {
  global.fetch = async function (url, opts) {
    const u = typeof url === "string" ? url : (url && url.url) || "";
    const res = await origFetch(url, opts);
    if (HOSTS.test(u)) {
      try {
        const j = await res.clone().json();
        const usage = j.usage || j.usageMetadata || {};
        const inTok = usage.input_tokens ?? usage.prompt_tokens ?? usage.promptTokenCount ?? 0;
        const outTok = usage.output_tokens ?? usage.completion_tokens ?? usage.candidatesTokenCount ?? 0;
        if (inTok || outTok) { tokensIn += inTok; tokensOut += outTok; calls++; }
      } catch (_) {}
    }
    return res;
  };
}
const targets = ${JSON.stringify(targets)};
async function tryInvoke() {
  for (const t of targets) {
    try {
      const mod = require(path.join(__dirname, t.file));
      const fn = mod[t.symbol] || (mod.default && mod.default[t.symbol]);
      if (typeof fn === "function") await fn();
    } catch (_) { /* best-effort -- many app functions need real args/env we don't have */ }
  }
}
tryInvoke().finally(() => {
  fs.writeFileSync(path.join(__dirname, "unai_measure_report.json"), JSON.stringify({ tokensIn, tokensOut, calls }, null, 2));
});
`;
}
function buildPythonMeasureHarness(analysis) {
  // Group capabilities by their source .py file, in file order, so a
  // multi-script app (e.g. 4 independent LangGraph agents) gets every script
  // measured, not just the first one.
  const byFile = {};
  for (const c of analysis.capabilities) {
    if (c.sourceFile && /\.py$/i.test(c.sourceFile) && c.sourceSymbol) {
      (byFile[c.sourceFile] = byFile[c.sourceFile] || []).push(c.sourceSymbol);
    }
  }
  return `# Generated measurement harness -- best-effort, generalizes this project's
# existing measure_real_tokens.py pattern instead of guessing SDK import paths
# (which breaks across e.g. langchain_ollama vs langchain_community, or SDK
# version bumps): run each source file with runpy.run_path(), find whatever
# LLM-client-shaped OBJECT it actually instantiated (by class-name heuristic +
# an invoke/generate/create method -- no hardcoded package names), patch that
# exact class, then call the file's own capability functions in order (seeded
# from its own TEST_CASES[0] convention when present, like the real
# measure_real_tokens.py does) and sum REAL usage. Never fabricates a number --
# anything that can't be patched/invoked just reports zero for that file, and
# unai-server.cjs falls back to the modeled comparison instead.
import json, os, runpy

TOKENS_IN = 0
TOKENS_OUT = 0
CALLS = 0

def _record(inp, outp):
    global TOKENS_IN, TOKENS_OUT, CALLS
    TOKENS_IN += inp or 0
    TOKENS_OUT += outp or 0
    CALLS += 1

def _extract_usage(resp):
    um = getattr(resp, "usage_metadata", None)
    if isinstance(um, dict) and um:
        return um.get("input_tokens", 0) or 0, um.get("output_tokens", 0) or 0
    u = getattr(resp, "usage", None)
    if u is not None:
        inp = getattr(u, "prompt_tokens", None); inp = getattr(u, "input_tokens", 0) if inp is None else inp
        outp = getattr(u, "completion_tokens", None); outp = getattr(u, "output_tokens", 0) if outp is None else outp
        return inp or 0, outp or 0
    return 0, 0

def _find_llm_objects(ns):
    found = []
    for val in ns.values():
        cls = type(val)
        name = cls.__name__
        if any(k in name for k in ("Chat", "LLM", "Client", "Model")) and any(hasattr(cls, m) for m in ("invoke", "generate", "create")):
            found.append(val)
    return found

def _patch_and_run(script_path, symbols):
    try:
        ns = runpy.run_path(script_path)
    except Exception:
        return  # best-effort -- this file's own imports/env may not be satisfiable here
    patched = []
    for llm in _find_llm_objects(ns):
        cls = type(llm)
        for meth_name in ("invoke", "generate", "create"):
            if not hasattr(cls, meth_name):
                continue
            orig = getattr(cls, meth_name)
            def wrapped(self, *a, __orig=orig, **kw):
                r = __orig(self, *a, **kw)
                inp, outp = _extract_usage(r)
                if inp or outp: _record(inp, outp)
                return r
            setattr(cls, meth_name, wrapped)
            patched.append((cls, meth_name, orig))
            break   # one patched method per discovered object is enough
    try:
        seed = None
        if isinstance(ns.get("TEST_CASES"), (list, tuple)) and ns["TEST_CASES"]:
            try: seed = dict(ns["TEST_CASES"][0])
            except Exception: seed = None
        state = dict(seed) if seed else {}
        for sym in symbols:
            fn = ns.get(sym)
            if not callable(fn):
                continue
            try:
                if state:
                    result = fn(state)
                    if isinstance(result, dict): state.update(result)
                else:
                    fn()
            except Exception:
                pass  # best-effort -- this function may need different args/state than we guessed
    finally:
        for cls, meth_name, orig in patched:
            setattr(cls, meth_name, orig)

TARGETS = ${JSON.stringify(byFile)}
BASE = os.path.dirname(os.path.abspath(__file__))
for rel, symbols in TARGETS.items():
    _patch_and_run(os.path.join(BASE, rel), symbols)

with open(os.path.join(BASE, "unai_measure_report.json"), "w") as f:
    json.dump({"tokensIn": TOKENS_IN, "tokensOut": TOKENS_OUT, "calls": CALLS}, f)
`;
}

// ---------------------------------------------------------------------------
// Real backend swap for Python orchestrators: "N agents become one UNAI"
// executed for real, not just compared from the outside. Deliberately
// narrow and reversible-by-construction -- it only rewrites the ONE import
// line, in the WORKDIR COPY, that wires an orchestrator to a per-agent
// run_agent() function; it never touches the agent module itself (so the
// measurement harness above still measures that module's real, un-swapped
// LLM calls for the "Your App vs UNAI" comparison -- these are deliberately
// two separate concerns). If no matching pattern is found anywhere, this is
// a no-op and nothing about the app changes.
// ---------------------------------------------------------------------------
function buildUnaiBackendPy() {
  return `# Generated by the UNAI Foundry -- routes calls that used to reach this
# app's own per-agent LLM pipeline through the shared UNAI runtime instead.
# UNAI runs as its own process on its own port (see the UNAI_BACKEND_URL env
# var this app's live preview is launched with); this file never touches the
# original agent modules' own code.
import json
import os
import urllib.request

UNAI_BACKEND_URL = os.environ.get("UNAI_BACKEND_URL", "http://localhost:4100")

def make_unai_agent(capability_ids, fallback_confidence=70):
    """Returns a function with the SAME call shape as this app's own
    run_agent(case, human_approval=...) -- so nothing else in the
    orchestrator (state wiring, routing, human-approval gating) needs to
    change, only what it dispatches to."""
    ids = list(capability_ids)
    def run_agent(case=None, human_approval=None):
        body = json.dumps({"capabilityIds": ids}).encode("utf-8")
        req = urllib.request.Request(UNAI_BACKEND_URL + "/api/unai/run-subset", data=body,
                                      headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                out = json.loads(r.read().decode("utf-8"))
        except Exception as e:
            return {"confidence_score": fallback_confidence, "approval_required": True,
                    "package": "[UNAI backend unreachable: %s]" % e,
                    "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        steps = out.get("steps") or []
        if not steps:
            return {"confidence_score": fallback_confidence, "approval_required": True,
                    "package": out.get("error", ""), "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        confidence_pct = round(100 * sum((s.get("confidence") or 0) for s in steps) / len(steps))
        autonomous = all(s.get("autonomous") for s in steps)
        obs = out.get("observability") or {}
        tin = int(obs.get("tokensIn") or 0)
        tout = int(obs.get("tokensOut") or 0)
        return {
            "confidence_score": confidence_pct,
            "approval_required": not autonomous,
            "package": out.get("explanation") or "",
            "prompt_tokens": tin, "completion_tokens": tout, "total_tokens": tin + tout,
        }
    return run_agent
`;
}
// ---------------------------------------------------------------------------
// Real token-usage capture for a LIVE python-fullstack app (see
// detectPythonFullstackEntry / launchPythonFullstackPreview). Unlike the
// generic runpy-based buildPythonMeasureHarness (which guesses SDK client
// objects + a TEST_CASES convention -- wrong shape for a class-based app that
// calls a provider via raw httpx.post()), this patches httpx itself at the
// network layer, so it captures ANY real call to a known LLM host regardless
// of how the app's own code is structured. It's PASSIVE, not synthetic: it
// never fabricates a call, it only observes whatever real traffic the live
// app actually makes (the user's own interaction with the retained UI, or a
// real API hit) and persists a running total -- never a guessed number.
function buildPythonLlmCaptureShim() {
  return `# Generated by the UNAI Foundry -- observes real LLM provider calls this
# live app makes (via httpx, module-level or Client) and persists a running
# token total so "Run comparison live" can report a genuinely measured
# number instead of a modeled guess. Never invents traffic -- only counts
# what the app itself really sent while running.
import json, os, threading
import httpx

_LLM_HOSTS = ("api.groq.com", "api.openai.com", "generativelanguage.googleapis.com",
              "api.anthropic.com", "api.mistral.ai", "openrouter.ai")
_REPORT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "unai_measure_report.json")
_lock = threading.Lock()
_tokens_in = 0
_tokens_out = 0
_calls = 0

def _is_llm_url(url):
    u = str(url)
    return any(h in u for h in _LLM_HOSTS)

def _extract_usage(resp):
    try:
        data = resp.json()
    except Exception:
        return 0, 0
    usage = data.get("usage") or data.get("usageMetadata") or {}
    inp = usage.get("prompt_tokens") or usage.get("input_tokens") or usage.get("promptTokenCount") or 0
    outp = usage.get("completion_tokens") or usage.get("output_tokens") or usage.get("candidatesTokenCount") or 0
    return inp or 0, outp or 0

def _flush():
    try:
        with open(_REPORT_PATH, "w") as f:
            json.dump({"tokensIn": _tokens_in, "tokensOut": _tokens_out, "calls": _calls}, f)
    except Exception:
        pass

def _record(inp, outp):
    global _tokens_in, _tokens_out, _calls
    with _lock:
        _tokens_in += inp or 0
        _tokens_out += outp or 0
        _calls += 1
        _flush()

def _maybe_record(url, resp):
    if _is_llm_url(url):
        inp, outp = _extract_usage(resp)
        if inp or outp:
            _record(inp, outp)

_orig_post = httpx.post
def _patched_post(url, *a, **kw):
    resp = _orig_post(url, *a, **kw)
    _maybe_record(url, resp)
    return resp
httpx.post = _patched_post

_orig_client_post = httpx.Client.post
def _patched_client_post(self, url, *a, **kw):
    resp = _orig_client_post(self, url, *a, **kw)
    _maybe_record(url, resp)
    return resp
httpx.Client.post = _patched_client_post

# Start every fresh live process from a clean, honest zero rather than a
# stale report left over from a previous run of this converted copy.
_flush()
`;
}
// Prepends "import unai_llm_capture" as the very first statement of the
// app's own entry file (its workDir COPY only -- never the original source)
// so httpx is patched before the app's first real request, however early
// that comes. Patch TIMING doesn't actually matter here (httpx.post is
// looked up on the shared httpx module at CALL time, not captured at each
// agent module's own import time) -- this is just the clearest place to put
// it. A no-op if the entry file can't be found/read.
function applyPythonMeasurementInstrumentation(workDir, entryRelFile) {
  if (!entryRelFile) return false;
  fs.writeFileSync(path.join(workDir, "unai_llm_capture.py"), buildPythonLlmCaptureShim());
  const entryPath = path.join(workDir, entryRelFile);
  try {
    const src = fs.readFileSync(entryPath, "utf8");
    fs.writeFileSync(entryPath, "import unai_llm_capture  # noqa: F401 -- see unai_llm_capture.py\n" + src);
    return true;
  } catch (_) { return false; }
}
// Same idea as buildPythonLlmCaptureShim, for a live node-fullstack app:
// patch the global fetch every modern LLM SDK (@google/genai, @langchain/*,
// the OpenAI SDK, undici-based clients) uses under the hood in Node 18+, and
// persist a running real token total. Written as ESM ("import"/"export")
// since a node-fullstack candidate's package.json declares "type":"module"
// (that's part of what made it look like a Node app worth full-stack-
// launching rather than statically building -- see detectNodeFullstackEntry).
function buildNodeLlmCaptureShim() {
  return `// Generated by the UNAI Foundry -- observes real LLM provider calls this
// live app makes (via global fetch, used internally by most modern SDKs)
// and persists a running token total so "Run comparison live" can report a
// genuinely measured number instead of a modeled guess. Never invents
// traffic -- only counts what the app itself really sent while running.
import fs from "fs";
import path from "path";

// process.cwd() rather than a __dirname derived from import.meta.url: this
// file is imported as source in dev mode (tsx, real ESM) but esbuild bundles
// it INLINE into a single dist/server.cjs for the app's own "build" script --
// import.meta.url is empty in that CJS output, which crashed the whole
// server at startup (ERR_INVALID_ARG_TYPE) the first time this shipped.
// cwd is set by the launcher to the app's own root in both modes, so this
// works identically either way.
const HOSTS = /api\\.openai\\.com|api\\.anthropic\\.com|api\\.mistral\\.ai|generativelanguage\\.googleapis\\.com|api\\.groq\\.com|api\\.together\\.xyz|openrouter\\.ai|localhost:11434|127\\.0\\.0\\.1:11434/i;
const REPORT_PATH = path.join(process.cwd(), "unai_measure_report.json");
let tokensIn = 0, tokensOut = 0, calls = 0;

function flush() {
  try { fs.writeFileSync(REPORT_PATH, JSON.stringify({ tokensIn, tokensOut, calls })); } catch (_) {}
}
function extractUsage(json) {
  const usage = (json && (json.usage || json.usageMetadata)) || {};
  const inp = usage.input_tokens ?? usage.prompt_tokens ?? usage.promptTokenCount ?? 0;
  const outp = usage.output_tokens ?? usage.completion_tokens ?? usage.candidatesTokenCount ?? 0;
  return { inp: inp || 0, outp: outp || 0 };
}

const origFetch = globalThis.fetch;
if (origFetch) {
  globalThis.fetch = async function (url, opts) {
    const res = await origFetch(url, opts);
    const u = typeof url === "string" ? url : (url && url.url) || "";
    if (HOSTS.test(u)) {
      try {
        const json = await res.clone().json();
        const { inp, outp } = extractUsage(json);
        if (inp || outp) { tokensIn += inp; tokensOut += outp; calls++; flush(); }
      } catch (_) {}
    }
    return res;
  };
}
// Start every fresh live process from a clean, honest zero rather than a
// stale report left over from a previous run of this converted copy.
flush();
`;
}
function applyNodeMeasurementInstrumentation(workDir, entryRelFile) {
  if (!entryRelFile) return false;
  fs.writeFileSync(path.join(workDir, "unai_llm_capture.js"), buildNodeLlmCaptureShim());
  const entryPath = path.join(workDir, entryRelFile);
  try {
    const src = fs.readFileSync(entryPath, "utf8");
    fs.writeFileSync(entryPath, "import \"./unai_llm_capture.js\"; // see unai_llm_capture.js\n" + src);
    return true;
  } catch (_) { return false; }
}
// Matches e.g. "from agent_1_failure.agent import run_agent as run_failure_agent".
const PY_AGENT_IMPORT_RE = /^from\s+([\w.]+)\.agent\s+import\s+run_agent\s+as\s+(\w+)\s*$/;
function applyPythonBackendSwap(workDir, analysis) {
  const capsBySourceFile = {};
  for (const c of analysis.capabilities || []) {
    if (c.sourceFile) (capsBySourceFile[c.sourceFile] = capsBySourceFile[c.sourceFile] || []).push(c.id);
  }
  const pyFiles = [];
  (function walkAll(dir) {
    for (const name of fs.readdirSync(dir)) {
      if (IGNORE_DIRS.has(name) || name.startsWith(".")) continue;
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) walkAll(p); else if (name.endsWith(".py")) pyFiles.push(p);
    }
  })(workDir);
  let patchedAny = false;
  for (const file of pyFiles) {
    let text; try { text = fs.readFileSync(file, "utf8"); } catch (_) { continue; }
    let injectedImport = false, changed = false;
    const outLines = text.split("\n").map(line => {
      const m = line.match(PY_AGENT_IMPORT_RE);
      if (!m) return line;
      // m[1] is everything BEFORE the regex's literal ".agent", so the
      // filename's own "agent" segment has to be added back explicitly.
      const moduleFile = m[1].replace(/\./g, "/") + "/agent.py";
      const ids = capsBySourceFile[moduleFile];
      if (!ids || !ids.length) return line;   // no capabilities attributed to this module -- leave it alone
      changed = true; patchedAny = true;
      const prefix = injectedImport ? "" : "from unai_backend import make_unai_agent as _make_unai_agent\n";
      injectedImport = true;
      return `${prefix}${m[2]} = _make_unai_agent(${JSON.stringify(ids)})`;
    });
    if (changed) fs.writeFileSync(file, outLines.join("\n"));
  }
  if (patchedAny) fs.writeFileSync(path.join(workDir, "unai_backend.py"), buildUnaiBackendPy());
  return patchedAny;
}

// Second backend-swap strategy, for apps that DON'T match
// applyPythonBackendSwap's per-agent `run_agent()` import convention --
// instead, many class-based agents (LangGraph StateGraph workflows, etc.)
// all funnel through ONE shared helper, e.g. `LLMFactory.generate_completion
// (prompt, system_prompt)`, called from several different agent files. This
// finds that shared call (by frequency across the capability-attributed
// files, not a single hardcoded name), locates ITS definition, and patches
// just that one method's body to try UNAI's live model first -- falling
// back to the method's own original logic (Ollama, or whatever it was)
// completely unchanged if UNAI is unreachable or returns nothing. Every
// other file (the agent classes, the LangGraph wiring, the UI) is untouched.
// Deliberately conservative: aborts (returns {patched:false}) rather than
// guessing wherever it can't confidently identify the shared call or map
// its parameters -- a skipped swap is safe; a wrong one silently corrupts
// the app's real behavior.
function applyPythonLLMFactorySwap(workDir, analysis) {
  const capFiles = [...new Set((analysis.capabilities || []).map(c => c.sourceFile).filter(Boolean))]
    .map(f => path.join(workDir, f)).filter(f => fs.existsSync(f));
  if (!capFiles.length) return { patched: false };

  // Tally (Receiver.method) call sites whose receiver LOOKS like a class
  // reference (starts uppercase, e.g. LLMFactory -- not self./cls.) and
  // whose method name reads as an LLM-ish action, across DISTINCT files.
  const callRe = /\b([A-Z]\w*)\.([a-z_]\w*)\s*\(/g;
  const looksLlmish = /generat|complet|invoke|predict|reason|\bchat\b/i;
  const tally = new Map();   // "Receiver.method" -> Set(files)
  for (const file of capFiles) {
    let text; try { text = fs.readFileSync(file, "utf8"); } catch (_) { continue; }
    let m;
    while ((m = callRe.exec(text))) {
      if (!looksLlmish.test(m[2])) continue;
      const key = m[1] + "." + m[2];
      if (!tally.has(key)) tally.set(key, new Set());
      tally.get(key).add(file);
    }
  }
  let best = null;
  for (const [key, files] of tally) { if (files.size >= 2 && (!best || files.size > tally.get(best).size)) best = key; }
  if (!best) return { patched: false };
  const [receiver, method] = best.split(".");

  // Find the receiver class's definition anywhere in the workDir tree, then
  // that method inside it (first match -- fine for the common "one class
  // per file" shape; a file with multiple same-named classes is rare enough
  // that misattributing here just means the swap safely no-ops below when
  // the param heuristic then fails to find a confident match).
  let defFile = null, defText = null;
  walk(workDir, abs => {
    if (defFile || !abs.endsWith(".py")) return;
    let t; try { t = fs.readFileSync(abs, "utf8"); } catch (_) { return; }
    if (new RegExp(`^\\s*class\\s+${receiver}\\b`, "m").test(t)) { defFile = abs; defText = t; }
  });
  if (!defFile) return { patched: false };

  const spans = findPythonFunctionSpans(defText);
  const target = spans.find(s => s.name === method);
  if (!target) return { patched: false };
  const lines = defText.split("\n");
  const defLine = lines[target.startLine];
  const sigMatch = /def\s+\w+\s*\(([^)]*)\)/.exec(defLine);
  if (!sigMatch) return { patched: false };   // multi-line signature -- not worth the risk of guessing
  const params = sigMatch[1].split(",").map(p => p.trim().split(/[:=]/)[0].trim()).filter(p => p && p !== "self" && p !== "cls");
  const promptParam = params.find(p => /^prompt$/i.test(p)) || params.find(p => /prompt/i.test(p));
  if (!promptParam) return { patched: false };   // can't confidently identify the prompt argument -- skip, don't guess
  const systemParam = params.find(p => /system|instruction/i.test(p));

  // Insert AFTER the docstring if the method opens with one (so `__doc__`
  // stays intact for anything introspecting it), else right after `def`.
  let insertAt = target.startLine + 1;
  const firstBodyLine = (lines[insertAt] || "").trim();
  const quote = firstBodyLine.startsWith('"""') ? '"""' : (firstBodyLine.startsWith("'''") ? "'''" : null);
  if (quote) {
    if (firstBodyLine.length > 3 && firstBodyLine.endsWith(quote) && firstBodyLine !== quote) {
      insertAt += 1;   // single-line docstring
    } else {
      let k = insertAt + 1;
      while (k < target.endLine && !lines[k].includes(quote)) k++;
      insertAt = k + 1;
    }
  }
  const bodyIndent = ((lines[insertAt] || lines[target.startLine]).match(/^\s*/) || [""])[0] || "        ";
  const snippet = [
    `${bodyIndent}try:`,
    `${bodyIndent}    import json as _unai_json, urllib.request as _unai_urllib, os as _unai_os`,
    `${bodyIndent}    _unai_body = _unai_json.dumps({"prompt": ${promptParam}, "systemPrompt": ${systemParam || '""'} or ""}).encode("utf-8")`,
    `${bodyIndent}    _unai_req = _unai_urllib.Request(`,
    `${bodyIndent}        _unai_os.environ.get("UNAI_BACKEND_URL", "http://localhost:4100") + "/api/unai/generate-text",`,
    `${bodyIndent}        data=_unai_body, headers={"Content-Type": "application/json"}, method="POST")`,
    `${bodyIndent}    with _unai_urllib.urlopen(_unai_req, timeout=30) as _unai_r:`,
    `${bodyIndent}        _unai_out = _unai_json.loads(_unai_r.read().decode("utf-8"))`,
    `${bodyIndent}    if _unai_out.get("text"):`,
    `${bodyIndent}        return _unai_out["text"]`,
    `${bodyIndent}except Exception:`,
    `${bodyIndent}    pass`,
  ];
  lines.splice(insertAt, 0, ...snippet);
  fs.writeFileSync(defFile, lines.join("\n"));
  return { patched: true, className: receiver, methodName: method, file: path.relative(workDir, defFile) };
}

// ---------------------------------------------------------------------------
// Generated wrapper server (see module header for why this is always Node)
// ---------------------------------------------------------------------------
// Copies the two zero-dependency runtime files (see their own header
// comments -- neither has a single require()) into a converted/built app's
// workDir, so the generated unai-server.cjs can require() them by relative
// path instead of an absolute path into APP_DIR. Makes the workDir portable:
// zip it, move it, run it anywhere with just `node unai-server.cjs`.
//
// Copied as .cjs, not .js: workDir is a copy of the SOURCE app's own folder,
// which may ship its own package.json with "type":"module" (common for
// modern Node/React apps). Node scopes "type" to every .js file under that
// package.json, so a plain engine.js/llm.js sitting next to it would get
// parsed as an ES module and its CommonJS `require()`/`module.exports` would
// throw ReferenceError/SyntaxError at boot. The .cjs extension always forces
// CommonJS regardless of any package.json in scope -- the fix has to live
// here, not in the source's package.json, since we never touch source files.
function bundleRuntimeInto(workDir) {
  fs.copyFileSync(path.join(APP_DIR, "engine.js"), path.join(workDir, "engine.cjs"));
  // llm.js now requires the native AI Gateway (gateway.js) by relative path --
  // copy it alongside as .cjs too (same ESM-safety reasoning as engine/llm
  // above), and rewrite llm.cjs's require string to match the copied name.
  fs.copyFileSync(path.join(APP_DIR, "gateway.js"), path.join(workDir, "gateway.cjs"));
  // llm.js also requires containment.js (egress allow/deny for LLM calls) by
  // relative path. Missing this entirely made every real LLM call from a
  // converted app's wrapper throw MODULE_NOT_FOUND, silently swallowed by
  // enrichEvidence's per-item catch, so "Run comparison live" could never
  // report UNAI's side as genuinely measured no matter how correctly a
  // gateway key was configured -- fixed once, then broke AGAIN for any
  // converted Node app whose OWN package.json declares "type":"module"
  // (copied into this same workDir): Node then treats a plain "containment.js"
  // as ESM too, and its `module.exports = {...}` throws "module is not
  // defined in ES module scope". Same fix as gateway.js below: copy as .cjs
  // and rewrite llm.cjs's require string to match.
  fs.copyFileSync(path.join(APP_DIR, "containment.js"), path.join(workDir, "containment.cjs"));
  // /g on the containment.js replace: llm.js has THREE separate call sites
  // requiring it (anthropic, openai, and the grounded-narration paths), not
  // one -- an earlier non-global replace here only rewrote the first, so the
  // other two still pointed at a "containment.js" that no longer existed
  // once it was renamed to .cjs, and every real call through those two paths
  // failed with MODULE_NOT_FOUND (silently swallowed, reported as "modeled").
  const llmSrc = fs.readFileSync(path.join(APP_DIR, "llm.js"), "utf8")
    .replace(/require\((['"])\.\/gateway\.js\1\)/g, 'require("./gateway.cjs")')
    .replace(/require\((['"])\.\/containment\.js\1\)/g, 'require("./containment.cjs")');
  fs.writeFileSync(path.join(workDir, "llm.cjs"), llmSrc);
}

function buildWrapperServer({ manifest, appDir, workDir, staticDir, measureScript, liveInstrumented, realCostCapabilityIds }) {
  // engine.cjs and llm.cjs are copied alongside this file (see convertFolder /
  // launchManifest, bundleRuntimeInto) and required by relative path, and
  // WORK_DIR resolves from __dirname at runtime rather than being baked in as
  // an absolute path -- together that makes this workDir fully self-contained:
  // zip it up, move it anywhere, run `node unai-server.cjs`, no dependency on
  // where the main UNAI Studio app lives (see /api/foundry/download-converted
  // in server.js). This file itself is written out as unai-server.cjs, not
  // .js, for the same reason: the copied source app's own package.json may
  // declare "type":"module", which would otherwise make Node parse this
  // CommonJS file as ESM and crash on `require` being undefined.
  const staticDirRel = staticDir ? JSON.stringify(path.relative(workDir, staticDir)) : "null";
  return `/* Generated by the UNAI Foundry convert-folder pipeline. Do not hand-edit --
 * re-running the conversion overwrites this file. */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { UNAI } = require("./engine.cjs");
const { enrichEvidence, chatWithFailover } = require("./llm.cjs");

const MANIFEST = ${JSON.stringify(manifest, null, 2)};
const WORK_DIR = __dirname;
const STATIC_DIR_REL = ${staticDirRel};
const MEASURE_SCRIPT = ${JSON.stringify(measureScript)};
const LIVE_INSTRUMENTED = ${JSON.stringify(!!liveInstrumented)};
// Capability ids that actually cost real tokens in the SOURCE app (see
// convertFolder's realCostCapabilityIds) -- used to scope the UNAI side of
// "Run comparison live" down to an apples-to-apples subset instead of
// modeling cost for every detected capability, most of which the source app
// never spends a token on.
const REAL_COST_CAPABILITY_IDS = ${JSON.stringify(realCostCapabilityIds || [])};
const MIME = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon" };

function buildGoal() {
  return {
    name: MANIFEST.name, description: MANIFEST.description,
    gen1Agents: MANIFEST.capabilities.map(c => c.label),
    plan: MANIFEST.capabilities.map(c => ({ capability: "cv_" + c.id, agentEquiv: c.label, systems: (c.systems && c.systems.length) ? c.systems : ["ANALYTICS"] })),
  };
}
function runUnai() { return new UNAI({}).run(buildGoal()); }
// Same as runUnai() but scoped to just the given capability ids -- used by
// handleCompare() to match UNAI's side to the SAME narrow slice of work the
// source app actually pays real tokens for (see REAL_COST_CAPABILITY_IDS),
// instead of modeling cost for the whole manifest.
function runUnaiScoped(capabilityIds) {
  const subset = MANIFEST.capabilities.filter(c => capabilityIds.includes(c.id))
    .map(c => ({ capability: "cv_" + c.id, agentEquiv: c.label, systems: (c.systems && c.systems.length) ? c.systems : ["ANALYTICS"] }));
  if (!subset.length) return new UNAI({}).run(buildGoal());   // fall back to the whole plan if none matched
  const goal = { name: MANIFEST.name, description: MANIFEST.description, gen1Agents: subset.map(s => s.agentEquiv), plan: subset };
  return new UNAI({}).run(goal);
}

function runYourAppMeasured() {
  return new Promise(resolve => {
    // Live python-fullstack app: no harness to spawn -- httpx was patched
    // in-process (see unai_llm_capture.py) and writes its running total to
    // this same file on every real provider call the live app makes. Read
    // it directly; a real 0 (nothing captured yet) is reported honestly,
    // not disguised as a modeled fallback.
    if (LIVE_INSTRUMENTED) {
      try {
        const report = JSON.parse(fs.readFileSync(path.join(WORK_DIR, "unai_measure_report.json"), "utf8"));
        const tin = report.tokensIn || 0, tout = report.tokensOut || 0, calls = report.calls || 0;
        if (!calls) {
          return resolve({ measured: true, tokensIn: 0, tokensOut: 0, tokensTotal: 0, calls: 0,
            reason: "no real provider calls observed yet -- interact with the live app above (or hit its API), then run this comparison again" });
        }
        // Per-call AVERAGE, not the lifetime running total -- unai_measure_report.json
        // accumulates across every real call since this process started, but
        // UNAI's side (runUnaiScoped) models/measures a SINGLE pass. Comparing
        // a multi-call lifetime sum against a one-pass estimate would keep
        // drifting further apart the longer the live app runs, which isn't a
        // real efficiency signal -- just an artifact of when you happened to click.
        const avgIn = Math.round(tin / calls), avgOut = Math.round(tout / calls);
        return resolve({ measured: true, tokensIn: avgIn, tokensOut: avgOut, tokensTotal: avgIn + avgOut,
          calls, lifetimeTokensTotal: tin + tout, reason: null });
      } catch (e) {
        return resolve({ measured: false, tokensIn: 0, tokensOut: 0, tokensTotal: 0, reason: "could not read the live capture report: " + e.message });
      }
    }
    if (!MEASURE_SCRIPT) return resolve({ measured: false, tokensIn: 0, tokensOut: 0, tokensTotal: 0, reason: "no measurement harness available for this app" });
    const isPy = MEASURE_SCRIPT.endsWith(".py");
    const cmd = isPy ? (process.platform === "win32" ? "python" : "python3") : process.execPath;
    // Generous timeout: a multi-script/multi-agent app can make many sequential
    // real LLM calls (the GDC 4-agent app alone takes ~60-90s) — same reasoning
    // as the main server.js's own long-running-route timeouts.
    let child; try { child = spawn(cmd, [MEASURE_SCRIPT], { cwd: WORK_DIR, timeout: 240000 }); }
    catch (e) { return resolve({ measured: false, tokensIn: 0, tokensOut: 0, tokensTotal: 0, reason: e.message }); }
    let err = ""; child.stderr.on("data", b => err += b);
    const finish = () => {
      try {
        const report = JSON.parse(fs.readFileSync(path.join(WORK_DIR, "unai_measure_report.json"), "utf8"));
        const tin = report.tokensIn || 0, tout = report.tokensOut || 0;
        resolve({ measured: (tin + tout) > 0, tokensIn: tin, tokensOut: tout, tokensTotal: tin + tout,
          reason: (tin + tout) > 0 ? null : "harness ran but captured no real provider usage" });
      } catch (e) { resolve({ measured: false, tokensIn: 0, tokensOut: 0, tokensTotal: 0, reason: "measurement harness failed: " + (err.slice(0, 200) || e.message) }); }
    };
    child.on("close", finish); child.on("error", finish);
  });
}
function modeledYourApp(out) {
  const b = out.observability && out.observability.benchmark && out.observability.benchmark.baseline;
  return b ? { measured: false, tokensIn: b.tokensIn, tokensOut: b.tokensOut, tokensTotal: b.tokensTotal }
           : { measured: false, tokensIn: 0, tokensOut: 0, tokensTotal: 0 };
}
function modeledUnai(out) {
  const o = out.observability || {};
  return { measured: false, tokensIn: o.tokensIn || 0, tokensOut: o.tokensOut || 0, tokensTotal: o.tokensTotal || 0 };
}
function send(res, code, obj) { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); }

async function handleCompare(res) {
  // Scope UNAI's side to just the capabilities that actually cost real
  // tokens in the source app when we know them (see REAL_COST_CAPABILITY_IDS)
  // -- otherwise this compares 1 real narrow capability against a modeled
  // estimate for the whole manifest, which is an apples-to-oranges mismatch.
  const scoped = REAL_COST_CAPABILITY_IDS.length ? REAL_COST_CAPABILITY_IDS : null;
  const out = scoped ? runUnaiScoped(scoped) : runUnai();
  let unai = modeledUnai(out);
  try {
    const live = await enrichEvidence(out.evidence || []);
    if (live && live.used !== "template" && live.calls) unai = { measured: true, tokensIn: live.tokensIn, tokensOut: live.tokensOut, tokensTotal: live.tokensIn + live.tokensOut };
  } catch (_) {}
  const measured = await runYourAppMeasured();
  const yourApp = measured.measured ? measured : Object.assign(modeledYourApp(out), { reason: measured.reason });
  const savingsPct = yourApp.tokensTotal ? Math.round(100 * (yourApp.tokensTotal - unai.tokensTotal) / yourApp.tokensTotal) : 0;
  send(res, 200, { ok: true, yourApp, unai, savingsPct, manifestId: MANIFEST.id, name: MANIFEST.name, scopedCapabilities: scoped });
}

// Runs just a subset of this manifest's capabilities through UNAI (not the
// whole plan) -- this is what lets a converted app's OWN backend code call
// into UNAI for one specific piece of work (see unai_backend.py, generated
// alongside this file for Python apps whose orchestrator imports per-agent
// run_agent() functions -- see applyPythonBackendSwap in foundry_convert.js)
// instead of just comparing against it from the outside.
function runUnaiSubset(capabilityIds) {
  const subset = MANIFEST.capabilities.filter(c => capabilityIds.includes(c.id))
    .map(c => ({ capability: "cv_" + c.id, agentEquiv: c.label, systems: (c.systems && c.systems.length) ? c.systems : ["ANALYTICS"] }));
  if (!subset.length) return { error: "no matching capabilities: " + capabilityIds.join(",") };
  const goal = { name: MANIFEST.name, description: MANIFEST.description, gen1Agents: subset.map(s => s.agentEquiv), plan: subset };
  const out = new UNAI({}).run(goal);
  const steps = (out.planPreview || []).map(p => ({ capability: p.capability.replace(/^cv_/, ""), confidence: p.confidence, autonomous: p.autonomous, decision: p.decision }));
  const explanation = subset.map(s => { const r = (out.results || {})[s.capability]; const ev = r && r.evidence; return ev && ev.explanation; }).filter(Boolean).join("\\n\\n");
  return { ok: true, steps, explanation, observability: out.observability || {} };
}

const server = http.createServer((req, res) => {
  // The Studio's own "Your app vs UNAI" tab (localhost:3000) fetches this
  // wrapper's /api/unai/* routes directly by absolute URL -- a genuine
  // cross-origin request from the browser's perspective, since this wrapper
  // runs on its own port. Without CORS headers the browser silently blocks
  // it ("Failed to fetch"), even though a server-side curl/fetch (no CORS
  // enforcement) to the same URL works fine -- which is exactly why this
  // went unnoticed testing via curl. Wide-open (*) is fine here: this is a
  // local dev/demo runtime, no cookies or credentialed requests involved.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  if (req.url === "/api/unai/manifest" && req.method === "GET") return send(res, 200, MANIFEST);
  if (req.url === "/api/unai/run" && req.method === "POST") { try { return send(res, 200, runUnai()); } catch (e) { return send(res, 500, { error: e.message }); } }
  if (req.url === "/api/unai/run-subset" && req.method === "POST") {
    let body = ""; req.on("data", b => body += b); req.on("end", () => {
      let j = {}; try { j = JSON.parse(body || "{}"); } catch (_) {}
      const ids = Array.isArray(j.capabilityIds) ? j.capabilityIds.map(String) : [];
      try { return send(res, 200, runUnaiSubset(ids)); } catch (e) { return send(res, 500, { error: e.message }); }
    }); return;
  }
  if (req.url === "/api/unai/compare" && req.method === "POST") { handleCompare(res).catch(e => send(res, 500, { error: e.message })); return; }
  // Generic "give me a real completion" bridge -- for a converted app whose
  // own LLM usage is one shared helper (e.g. a ClassName.generate_completion(
  // prompt, system_prompt) factory) rather than a per-agent run_agent()
  // function, see applyPythonLLMFactorySwap: that helper's body gets patched
  // to call THIS route instead of its own original model, with its original
  // logic kept as the fallback if this is unreachable or returns nothing.
  if (req.url === "/api/unai/generate-text" && req.method === "POST") {
    let body = ""; req.on("data", b => body += b); req.on("end", async () => {
      let j = {}; try { j = JSON.parse(body || "{}"); } catch (_) {}
      const prompt = String(j.prompt || ""), systemPrompt = String(j.systemPrompt || "");
      if (!prompt) return send(res, 400, { error: "prompt required" });
      try {
        const messages = [];
        if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
        messages.push({ role: "user", content: prompt });
        const r = await chatWithFailover(messages, { max_tokens: 700, timeoutMs: 25000 });
        if (!r || !r.content) return send(res, 200, { text: null, error: "no live model configured/reachable", tried: r && r.tried });
        return send(res, 200, { text: r.content, tokensIn: r.tokensIn || 0, tokensOut: r.tokensOut || 0, provider: r.provider, model: r.model });
      } catch (e) { return send(res, 500, { text: null, error: e.message }); }
    }); return;
  }
  const base = STATIC_DIR_REL ? path.join(WORK_DIR, STATIC_DIR_REL) : path.join(WORK_DIR, "unai_public");
  const reqPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const fp = path.join(base, reqPath);
  if (!fp.startsWith(path.resolve(base))) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(fp)] || "application/octet-stream" });
    res.end(data);
  });
});
// A live multi-call measurement harness can take a couple minutes for a
// multi-agent source app -- don't let Node's default request/headers timeout
// (5min/60s) race it. Same reasoning as the main server.js's own
// server.requestTimeout = 0 for its long-running routes.
server.requestTimeout = 0;
server.headersTimeout = 0;
const PORT = process.env.PORT || 4100;
server.listen(PORT, () => console.log("[unai-converted] " + MANIFEST.name + " on http://localhost:" + PORT));
`;
}

// ---------------------------------------------------------------------------
// Filesystem / process orchestration
// ---------------------------------------------------------------------------
function copyDirClean(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    if (IGNORE_DIRS.has(name) || name.startsWith(".")) continue;
    const s = path.join(src, name), d = path.join(dst, name);
    if (fs.statSync(s).isDirectory()) copyDirClean(s, d); else fs.copyFileSync(s, d);
  }
}
function tryBuildFrontend(frontendDir) {
  try {
    const pkgPath = path.join(frontendDir, "package.json");
    if (!fs.existsSync(pkgPath)) return null;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const existing = ["dist", "build"].map(d => path.join(frontendDir, d)).find(d => fs.existsSync(d));
    if (existing) return existing;
    if (!pkg.scripts || !pkg.scripts.build) return null;
    // shell:true is required on Windows to spawn a .cmd shim (npm.cmd) at
    // all -- Node refuses it otherwise (EINVAL) since a Node security fix for
    // .bat/.cmd argument-injection (CVE-2024-27980). Every arg here is a
    // fixed literal ("install"/"run"/"build"), so there's nothing
    // attacker-controlled reaching the shell for that hardening to matter.
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    // 10min, not 4 -- a cold install of a real app's full dependency tree
    // (React/Vite/esbuild/etc., no lockfile cache yet in this fresh workDir
    // copy) has been observed taking 3+ min even on a lightly loaded machine;
    // 240s cut it off mid-install often enough to make this path unreliable.
    const inst = spawnSync(npm, ["install"], { cwd: frontendDir, timeout: 600000, stdio: "ignore", shell: process.platform === "win32" });
    if (inst.error || inst.status !== 0) return null;
    const bld = spawnSync(npm, ["run", "build"], { cwd: frontendDir, timeout: 600000, stdio: "ignore", shell: process.platform === "win32" });
    if (bld.error || bld.status !== 0) return null;
    return ["dist", "build"].map(d => path.join(frontendDir, d)).find(d => fs.existsSync(d)) || null;
  } catch (_) { return null; }
}
// Streamlit has no build step -- it's a live Python web server. Launched as
// its own child process (cwd: frontendDir, so its own relative imports like
// `from orchestrator import ...` resolve) on a free port, separate from the
// unai-server.cjs wrapper (which keeps serving /api/unai/* for the Foundry's
// own run/compare). The caller embeds THIS port in the Playground iframe --
// see previewUrl in convertFolder()'s return value.
async function launchStreamlitPreview(frontendDir, entry, backendUrl) {
  const port = await pickFreePort();
  const py = process.platform === "win32" ? "python" : "python3";
  const proc = spawn(py, ["-m", "streamlit", "run", entry,
    "--server.port", String(port), "--server.address", "127.0.0.1", "--server.headless", "true",
    "--server.enableXsrfProtection", "false", "--server.enableCORS", "false", "--browser.gatherUsageStats", "false"],
    { cwd: frontendDir, detached: process.platform !== "win32",
      // Read by unai_backend.py (see applyPythonBackendSwap) if this app's
      // orchestrator was rewired to call UNAI -- harmless if it wasn't.
      env: Object.assign({}, process.env, backendUrl ? { UNAI_BACKEND_URL: backendUrl } : {}) });
  let bootLog = "";
  proc.stdout.on("data", b => bootLog += b);
  proc.stderr.on("data", b => bootLog += b);
  const url = `http://localhost:${port}`;
  // Streamlit's cold start pulls in pandas/plotly/langgraph etc. on top of its
  // own Tornado server -- give it noticeably longer than the plain Node
  // wrapper's 20s before giving up.
  const ready = await waitForReady(url, 45000);
  if (!ready) { killTree(proc); throw new Error(`Streamlit preview did not respond on ${url} within 45s. Recent output:\n${bootLog.slice(-1500)}`); }
  return { proc, url };
}
// Launches a Python full-stack app (see detectPythonFullstackEntry) live via
// uvicorn, on a free port -- the real app, unmodified, serving its own
// frontend AND its own API routes exactly like its own
// `if __name__=="__main__": uvicorn.run(...)` would. cwd is the app's root
// (not a frontend subfolder) so its own package imports (e.g. "backend.main")
// resolve. Assumes its dependencies are already importable via `python`/
// `python3` on this machine -- no venv/pip-install step, same assumption
// launchStreamlitPreview already makes for its own `python -m streamlit`.
async function launchPythonFullstackPreview(dir, appSpec, backendUrl, envOverrides) {
  const port = await pickFreePort();
  const py = process.platform === "win32" ? "python" : "python3";
  const proc = spawn(py, ["-m", "uvicorn", appSpec, "--host", "127.0.0.1", "--port", String(port)],
    { cwd: dir, detached: process.platform !== "win32",
      // envOverrides comes from the ORIGINAL app's own .env (see readDotEnv)
      // -- workDir's copy never has one on disk, so without this the live
      // preview would have none of the source app's real provider keys.
      // Read by unai_backend.py (see applyPythonBackendSwap) if this app's
      // orchestrator was rewired to call UNAI -- harmless if it wasn't.
      env: Object.assign({}, process.env, envOverrides || {}, backendUrl ? { UNAI_BACKEND_URL: backendUrl } : {}) });
  let bootLog = "";
  proc.stdout.on("data", b => bootLog += b);
  proc.stderr.on("data", b => bootLog += b);
  const url = `http://localhost:${port}`;
  const ready = await waitForReady(url, 45000);
  if (!ready) { killTree(proc); throw new Error(`Python full-stack preview did not respond on ${url} within 45s. Recent output:\n${bootLog.slice(-1500)}`); }
  return { proc, url };
}
// Patches ONLY the workDir COPY of a Node full-stack app's server entry file
// (never the original source) so it listens on whatever free port we assign
// it instead of a value hardcoded in the source (a real pattern seen in the
// wild: `const PORT = 3000;` with no env fallback, which would collide with
// UNAI Studio's own :3000 and with every other converted app). Only rewrites
// a literal `const/let/var PORT = <number>` declaration into an env-aware
// one -- a no-op if the app already reads process.env.PORT (the common
// convention), so this never touches apps that don't need it. Same "workDir-
// copy-only" contract as applyPythonBackendSwap.
function applyNodePortEnvOverride(workDir, entryRelPath) {
  const entryPath = path.join(workDir, entryRelPath);
  try {
    const src = fs.readFileSync(entryPath, "utf8");
    const patched = src.replace(/\b(const|let|var)(\s+PORT\s*=\s*)(\d{2,5})(\s*;)/, "$1$2process.env.PORT || $3$4");
    if (patched === src) return false;
    fs.writeFileSync(entryPath, patched);
    return true;
  } catch (_) { return false; }
}
// Launches a Node full-stack app (see detectNodeFullstackEntry) live, exactly
// as its own `dev` script would (same runner, same entry file, dev-mode Vite
// middleware if it has one) -- the real app, unmodified except for the port
// override above, instead of a static build that would drop its API routes.
// node_modules isn't copied into workDir (see IGNORE_DIRS), so this installs
// them first, same as tryBuildFrontend's own npm install step.
async function launchNodeFullstackPreview(dir, entryRelPath, cmd, backendUrl, envOverrides) {
  // shell:true on Windows -- see the matching comment in tryBuildFrontend;
  // same Node .cmd-shim restriction applies to npm.cmd and npx.cmd here.
  // Timeout: see tryBuildFrontend's comment -- a cold install genuinely needs
  // minutes, not 240s, for a real app's full dependency tree.
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const inst = spawnSync(npm, ["install"], { cwd: dir, timeout: 600000, stdio: "pipe", shell: process.platform === "win32" });
  if (inst.error || inst.status !== 0) {
    const detail = inst.error ? inst.error.message
      : inst.signal ? `killed (${inst.signal}${inst.signal === "SIGTERM" ? " -- likely timed out" : ""})`
      : (inst.stderr || "").toString().slice(-500) || `exit code ${inst.status}`;
    throw new Error("npm install failed: " + detail);
  }
  applyNodePortEnvOverride(dir, entryRelPath);
  // Read by a generated unaiBridge.ts (see applyNodeBackendSwap, if this
  // app's own code was rewired to call UNAI) -- harmless if it wasn't; same
  // pattern as launchStreamlitPreview's backendUrl for Python apps.
  const backendEnv = backendUrl ? { UNAI_BACKEND_URL: backendUrl } : {};
  // envOverrides comes from the ORIGINAL app's own .env (see readDotEnv) --
  // workDir's copy never has one on disk (copyDirClean skips dotfiles so a
  // converted app's workDir, zip-downloadable via /api/foundry/download-converted,
  // never embeds the source app's real secrets), so without this the live
  // preview would have none of the source app's real provider keys.
  const envOv = envOverrides || {};
  const runner = process.platform === "win32" ? "npx.cmd" : "npx";
  async function attempt(nodeEnv) {
    const port = await pickFreePort();
    const proc = spawn(runner, [cmd, entryRelPath], {
      cwd: dir, detached: process.platform !== "win32", shell: process.platform === "win32",
      env: Object.assign({}, process.env, envOv, backendEnv, { PORT: String(port), NODE_ENV: nodeEnv }),
    });
    let bootLog = "";
    proc.stdout.on("data", b => bootLog += b);
    proc.stderr.on("data", b => bootLog += b);
    const url = `http://localhost:${port}`;
    const ready = await waitForReady(url, 45000);
    return { proc, url, ready, bootLog };
  }
  // Render/Vercel-style boilerplate commonly has a real build+start pair
  // (e.g. `vite build && esbuild ... --outfile=dist/server.cjs` then
  // `node dist/server.cjs`) whose production mode expects the build to have
  // already run -- and separately serves *only* prebuilt static assets, not
  // the dev-mode Vite middleware. So a plain "run the dev entry with
  // NODE_ENV=production" can come up (waitForReady only checks the port
  // answers, not that it serves real content) while actually 404ing on
  // everything, because dist/ was never built. If the app declares both
  // scripts, build once and launch the real start script instead.
  async function attemptBuildThenStart() {
    let pkg; try { pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")); } catch (_) { return null; }
    const scripts = (pkg && pkg.scripts) || {};
    if (!scripts.build || !scripts.start) return null;
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    const build = spawnSync(npm, ["run", "build"], { cwd: dir, timeout: 300000, stdio: "pipe", shell: process.platform === "win32" });
    if (build.error || build.status !== 0) return null;   // fall through to the tsx-based retry below
    const port = await pickFreePort();
    const proc = spawn(npm, ["start"], {
      cwd: dir, detached: process.platform !== "win32", shell: process.platform === "win32",
      env: Object.assign({}, process.env, envOv, backendEnv, { PORT: String(port), NODE_ENV: "production" }),
    });
    let bootLog = "";
    proc.stdout.on("data", b => bootLog += b);
    proc.stderr.on("data", b => bootLog += b);
    const url = `http://localhost:${port}`;
    const ready = await waitForReady(url, 45000);
    return { proc, url, ready, bootLog };
  }
  // Some app templates (Render/Vercel-style boilerplate) only honor a custom
  // PORT when NODE_ENV=production -- otherwise they hardcode their own dev
  // port, which collides with whatever else is already listening there.
  // applyNodePortEnvOverride only catches a plain `const PORT = 3000;`; a
  // conditional/ternary PORT expression like that slips through untouched.
  // Try dev mode first (unchanged behavior for apps that already work there),
  // and only retry in production mode if the first attempt never came up --
  // so already-working conversions are never affected by this fallback.
  let r = await attempt(process.env.NODE_ENV || "development");
  if (!r.ready) {
    killTree(r.proc);
    const built = await attemptBuildThenStart();
    if (built && built.ready) return { proc: built.proc, url: built.url };
    if (built) killTree(built.proc);
    const r2 = await attempt("production");
    if (r2.ready) return { proc: r2.proc, url: r2.url };
    killTree(r2.proc);
    throw new Error(`Full-stack app preview did not respond on ${r.url} within 45s (tried dev, build+start, and production NODE_ENV). Recent output:\n${(built ? built.bootLog : r2.bootLog || r.bootLog).slice(-1500)}`);
  }
  return { proc: r.proc, url: r.url };
}
function pickFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
    srv.on("error", reject);
  });
}
function waitForReady(url, timeoutMs) {
  const start = Date.now();
  return new Promise(resolve => {
    (function poll() {
      const req = http.get(url, res => { res.resume(); resolve(true); });
      req.on("error", () => { if (Date.now() - start > timeoutMs) return resolve(false); setTimeout(poll, 400); });
      req.setTimeout(2000, () => req.destroy());
    })();
  });
}

// RUNNING holds every converted/built app currently live, keyed by id -- NOT
// just the last one. Converting or building a new app no longer stops any
// previous one; each gets its own free port and keeps running until
// explicitly stopped (stopApp) or the server exits. This is what lets the
// Playground offer a real dropdown of live apps instead of one URL slot.
const RUNNING = new Map();   // id -> { id, name, proc, previewProc, port, url, previewUrl, workDir, kind, sourceFolder, createdAt }

// ---------------------------------------------------------------------------
// Persisted "what should be running" registry — RUNNING itself is in-memory
// only, so every server.js restart used to silently empty the Playground and
// "Your App vs UNAI" dropdowns even though every app's files were still sitting
// untouched in .converted/. This file just remembers which ids were live, so
// autoRelaunchAll() (called once at server boot) can bring them all back
// automatically instead of someone having to relaunch each one by hand.
// Deliberately NOT touched by stopAll() (process-exit cleanup) — only an
// explicit stopApp(id) (the user's own "Stop this app") removes an id here,
// so a server restart itself never drops an app from the registry.
// ---------------------------------------------------------------------------
// "How to relaunch this" recipe, written alongside unai-server.cjs at
// conversion time -- autoRelaunchAll() (server boot) and relaunchAnyApp()
// need to recreate the SAME live-preview process (python-fullstack,
// node-fullstack dev/build, streamlit, or "just the wrapper" for a
// generated/static UI) without re-running analyzeFolder/copyDirClean
// against a source folder that may not even exist by then.
function writeRelaunchRecipe(workDir, { kind, entry, cmd, sourceFolder }) {
  try { fs.writeFileSync(path.join(workDir, "unai_relaunch.json"), JSON.stringify({ kind: kind || null, entry: entry || null, cmd: cmd || null, sourceFolder: sourceFolder || null }, null, 2)); } catch (_) {}
}
function readRelaunchRecipe(workDir) {
  try { return JSON.parse(fs.readFileSync(path.join(workDir, "unai_relaunch.json"), "utf8")); } catch (_) { return { kind: null, entry: null, cmd: null, sourceFolder: null }; }
}
const RUNNING_REGISTRY_FILE = path.join(APP_DIR, ".foundry_running.json");
function loadRunningRegistry() {
  try { return JSON.parse(fs.readFileSync(RUNNING_REGISTRY_FILE, "utf8")); } catch (_) { return []; }
}
// Ids the user explicitly stopped ("Stop this app") — kept separate from the
// registry above so autoRelaunchAll's disk scan (below) can tell "never
// recorded" apart from "deliberately turned off" and not resurrect the latter.
const STOPPED_REGISTRY_FILE = path.join(APP_DIR, ".foundry_stopped.json");
function loadStoppedRegistry() {
  try { return JSON.parse(fs.readFileSync(STOPPED_REGISTRY_FILE, "utf8")); } catch (_) { return []; }
}
function addToStoppedRegistry(id) {
  try { const ids = new Set(loadStoppedRegistry()); ids.add(id); fs.writeFileSync(STOPPED_REGISTRY_FILE, JSON.stringify([...ids], null, 2)); } catch (_) {}
}
function removeFromStoppedRegistry(id) {
  try { fs.writeFileSync(STOPPED_REGISTRY_FILE, JSON.stringify(loadStoppedRegistry().filter(x => x !== id), null, 2)); } catch (_) {}
}
function addToRegistry(id) {
  try { const ids = new Set(loadRunningRegistry()); ids.add(id); fs.writeFileSync(RUNNING_REGISTRY_FILE, JSON.stringify([...ids], null, 2)); } catch (_) {}
  removeFromStoppedRegistry(id);   // a fresh convert/build/relaunch overrides any earlier explicit stop of this id
}
function removeFromRegistry(id) {
  try { fs.writeFileSync(RUNNING_REGISTRY_FILE, JSON.stringify(loadRunningRegistry().filter(x => x !== id), null, 2)); } catch (_) {}
}
// Every .converted/<id> folder still on disk with a working wrapper server --
// the registry file above is only a hint of "what was launched since it
// started existing"; folders converted/built before it existed (or restored
// from a backup/zip) are otherwise invisible to autoRelaunchAll forever even
// though their files are fully intact and relaunchable. Scanning disk directly
// is what makes "every agent I've ever converted or built" permanent instead
// of depending on that file having seen it happen.
function discoverConvertedIds() {
  try {
    return fs.readdirSync(CONVERTED_DIR)
      .filter(id => { try { return fs.statSync(path.join(CONVERTED_DIR, id)).isDirectory(); } catch (_) { return false; } })
      .filter(id => fs.existsSync(path.join(CONVERTED_DIR, id, "unai-server.cjs")));
  } catch (_) { return []; }
}
function killTree(proc) {
  if (!proc || !proc.pid) return;
  if (process.platform === "win32") {
    // proc.kill() on Windows does not touch descendants -- taskkill /T does.
    try { spawnSync("taskkill", ["/pid", String(proc.pid), "/T", "/F"]); } catch (_) {}
  } else {
    // Negative pid == "the whole process group" (proc was spawned {detached:true}, so it's the group leader).
    try { process.kill(-proc.pid, "SIGKILL"); } catch (_) { try { proc.kill("SIGKILL"); } catch (_) {} }
  }
}
function stopApp(id) {
  const app = RUNNING.get(id);
  if (!app) return false;
  killTree(app.proc); if (app.previewProc) killTree(app.previewProc);
  RUNNING.delete(id);
  removeFromRegistry(id);   // explicit, user-initiated stop — don't auto-relaunch this one next boot
  addToStoppedRegistry(id); // ...and don't let the disk-scan in autoRelaunchAll bring it back either
  return true;
}
// Process-exit cleanup ONLY (kills child processes so nothing orphans) —
// deliberately does NOT touch the persisted registry, since this also fires
// on a normal server restart, and the whole point of the registry is to
// survive exactly that.
function stopAll() {
  for (const app of RUNNING.values()) { killTree(app.proc); if (app.previewProc) killTree(app.previewProc); }
  RUNNING.clear();
}
process.on("exit", stopAll);
// Back-compat name -- some older call sites still say "stop the current one";
// now that there isn't a single "current" slot, this just means "stop
// everything" (used only where no id is available to target one app).
function stopCurrent() { stopAll(); }
function appStatus(id) {
  if (id) {
    const app = RUNNING.get(id);
    if (!app) return { ok: true, running: false };
    return { ok: true, running: true, id: app.id, url: app.url, previewUrl: app.previewUrl || app.url };
  }
  // No id given: back-compat shape for old callers -- report the most
  // recently launched app, if any are running.
  const last = [...RUNNING.values()].pop();
  if (!last) return { ok: true, running: false };
  return { ok: true, running: true, id: last.id, url: last.url, previewUrl: last.previewUrl || last.url };
}
// Every currently-live app, for the Playground's dropdown -- newest first.
// Includes manifest/report (capability lists only, nothing sensitive) so the
// client can populate BOTH the Playground dropdown and "Your App vs UNAI"
// entries for every converted app from this one call, no per-app round trip.
function listRunning() {
  return [...RUNNING.values()].reverse().map(a => ({
    id: a.id, name: a.name, url: a.url, previewUrl: a.previewUrl || a.url, kind: a.kind, createdAt: a.createdAt,
    manifest: a.manifest, report: a.report,
  }));
}
// Full record for ONE running app (incl. manifest/report) -- for server-side
// use only (e.g. the download endpoint), unlike listRunning()'s lean public shape.
function getRunning(id) {
  return RUNNING.get(id) || null;
}
function readLastConversion() {
  try { return JSON.parse(fs.readFileSync(CONV_STATE_FILE, "utf8")); } catch (_) { return null; }
}

async function convertFolder(folderPath) {
  const analysis = await analyzeFolder(folderPath);
  const manifest = buildManifest(analysis);
  manifest.id = "CVA-" + crypto.randomBytes(4).toString("hex").toUpperCase();
  const id = manifest.id;
  const srcRoot = path.resolve(folderPath);
  const workDir = path.join(CONVERTED_DIR, id);
  copyDirClean(srcRoot, workDir);

  // Which manifest capabilities actually cost real tokens in the SOURCE app
  // -- most detected capabilities are typically deterministic data/business
  // logic with zero LLM cost, so comparing a real measurement of just those
  // against UNAI's modeled cost for its WHOLE plan (every capability) is an
  // apples-to-oranges mismatch. Matched at FUNCTION level when
  // scanLlmCallSitesFull could attribute a call site to one (file+symbol,
  // e.g. "recommendation_agent.py::generate_recommendations") so an unrelated
  // sibling method in the same file isn't swept in too; only falls back to a
  // file-level match for call sites it couldn't attribute to a specific
  // function (symbol: null -- non-Python files, or a file with no functions
  // at all). buildManifest() maps analysis.capabilities 1:1 in order, so a
  // plain index zip is enough to find each capability's own source file/symbol.
  const llmSymbolSites = new Set(), llmFileOnlySites = new Set();
  for (const s of (analysis.llmCallSites || [])) {
    if (s.symbol) llmSymbolSites.add(s.file + "::" + s.symbol); else llmFileOnlySites.add(s.file);
  }
  const realCostCapabilityIds = manifest.capabilities
    .filter((_, i) => {
      const c = analysis.capabilities[i];
      if (!c) return false;
      return (c.sourceSymbol && llmSymbolSites.has(c.sourceFile + "::" + c.sourceSymbol)) || llmFileOnlySites.has(c.sourceFile);
    })
    .map(c => c.id);

  let staticDir = null, uiNote = "no frontend detected -- generated a minimal UI";
  let streamlitPlan = null;   // {dir, entry} -- launched after the wrapper server is confirmed up
  let fullstackPlan = null;   // {dir, entry, cmd} -- same, for a combined Express+frontend server
  if (analysis.hasFrontend && analysis.frontendKind === "streamlit") {
    const copiedFrontendDir = path.join(workDir, path.relative(srcRoot, analysis.frontendDir) || ".");
    streamlitPlan = { dir: copiedFrontendDir, entry: analysis.frontendEntry };
    uiNote = "retained and launched the app's own Streamlit UI, live";
  } else if (analysis.hasFrontend && analysis.frontendKind === "node-fullstack") {
    const copiedFrontendDir = path.join(workDir, path.relative(srcRoot, analysis.frontendDir) || ".");
    fullstackPlan = { dir: copiedFrontendDir, entry: analysis.frontendEntry, cmd: analysis.frontendCmd, kind: "node" };
    uiNote = "retained and launched the app's own full-stack server (frontend + API routes), live";
  } else if (analysis.hasFrontend && analysis.frontendKind === "python-fullstack") {
    // dir is workDir itself (not a frontend subfolder) -- the app's own
    // package imports (e.g. "backend.main") need cwd at the project root.
    fullstackPlan = { dir: workDir, entry: analysis.frontendEntry, kind: "python" };
    uiNote = "retained and launched the app's own Python full-stack server (frontend + API routes), live";
  } else if (analysis.hasFrontend) {
    const relFrontend = path.relative(srcRoot, analysis.frontendDir) || ".";
    const copiedFrontendDir = path.join(workDir, relFrontend);
    const built = tryBuildFrontend(copiedFrontendDir);
    if (built) { staticDir = built; uiNote = "retained and built the app's own frontend"; }
    else uiNote = "frontend detected but could not be built automatically -- served a generated UI instead";
  }
  writeRelaunchRecipe(workDir, {
    kind: streamlitPlan ? "streamlit" : (fullstackPlan ? fullstackPlan.kind : null),
    entry: streamlitPlan ? streamlitPlan.entry : (fullstackPlan ? fullstackPlan.entry : null),
    cmd: fullstackPlan ? fullstackPlan.cmd : null,
    sourceFolder: srcRoot,
  });
  // Written whenever there's no pre-built staticDir -- including when
  // streamlitPlan/fullstackPlan is set -- as a safety net. The wrapper server
  // (buildWrapperServer) falls back to serving THIS unai_public/index.html
  // whenever STATIC_DIR_REL is null, so if the live Streamlit/full-stack
  // preview process fails to launch, the iframe (pointed at the wrapper's own
  // `url`, since previewUrl only gets reassigned on success) shows this
  // generated UI instead of a bare unstyled "Not found".
  if (!staticDir) {
    fs.mkdirSync(path.join(workDir, "unai_public"), { recursive: true });
    fs.writeFileSync(path.join(workDir, "unai_public", "index.html"), buildMinimalUI(manifest));
  }

  // Best-effort real backend swap: if the source is Python and its
  // orchestrator imports per-agent run_agent() functions, redirect those
  // (only in this workDir copy) to the shared UNAI runtime -- see
  // applyPythonBackendSwap's own header comment for exactly what this does
  // and doesn't touch. A no-op for any app that doesn't match the pattern.
  let backendSwapped = analysis.runtime === "python" ? applyPythonBackendSwap(workDir, analysis) : false;
  let factorySwap = null;
  if (backendSwapped) uiNote += " -- its orchestrator's per-agent calls now run through UNAI instead of their original pipeline";
  else if (analysis.runtime === "python") {
    // Second strategy: no per-agent run_agent() import to redirect, but maybe
    // one shared LLM helper several agents call into instead (see
    // applyPythonLLMFactorySwap's own header comment).
    factorySwap = applyPythonLLMFactorySwap(workDir, analysis);
    if (factorySwap.patched) {
      backendSwapped = true;
      uiNote += ` -- its shared LLM helper (${factorySwap.className}.${factorySwap.methodName}) now calls UNAI first, falling back to its original model only if UNAI is unreachable`;
    }
  }

  // For a live python-fullstack app, patch httpx in the running process
  // itself (see applyPythonMeasurementInstrumentation) instead of the
  // generic runpy-based harness below -- that harness assumes an SDK client
  // object + a TEST_CASES convention, which a class-based app calling a
  // provider via raw httpx.post() (like this one) never matches, so it would
  // silently measure nothing. This observes real traffic from the live app
  // instead of trying to synthesize a call with guessed arguments.
  // Same idea for a live node-fullstack app -- see buildNodeLlmCaptureShim.
  const liveInstrumented = fullstackPlan && fullstackPlan.kind === "python"
    ? applyPythonMeasurementInstrumentation(workDir, analysis.pyEntryFile)
    : fullstackPlan && fullstackPlan.kind === "node"
    ? applyNodeMeasurementInstrumentation(workDir, fullstackPlan.entry)
    : false;

  let measureScript = null;
  if (liveInstrumented) {
    // No separate harness script -- unai-server.cjs reads the live process's
    // own unai_measure_report.json directly (see buildWrapperServer).
  } else if (analysis.runtime === "python" && analysis.capabilities.some(c => c.sourceFile && /\.py$/i.test(c.sourceFile))) {
    fs.writeFileSync(path.join(workDir, "unai_measure.py"), buildPythonMeasureHarness(analysis));
    measureScript = "unai_measure.py";
  } else if (analysis.capabilities.some(c => c.sourceFile && /\.(js|mjs|cjs)$/i.test(c.sourceFile))) {
    // .cjs, not .js -- same reasoning as bundleRuntimeInto: this CommonJS
    // harness sits in workDir, which may have a copied package.json declaring
    // "type":"module", and `node unai_measure.js` run directly is just as
    // subject to that scoping as a require()'d file.
    fs.writeFileSync(path.join(workDir, "unai_measure.cjs"), buildNodeMeasureHarness(analysis));
    measureScript = "unai_measure.cjs";
  }

  fs.writeFileSync(path.join(workDir, "unai_toolpacks_reference.js"), buildToolPackStubsJs(manifest));
  bundleRuntimeInto(workDir);
  fs.writeFileSync(path.join(workDir, "unai-server.cjs"), buildWrapperServer({ manifest, appDir: APP_DIR, workDir, staticDir, measureScript, liveInstrumented, realCostCapabilityIds }));

  const port = await pickFreePort();
  // detached (POSIX): makes proc a process-group leader so stopCurrent() can
  // kill the WHOLE tree with process.kill(-pid) -- proc.kill() alone only
  // signals this one process, leaving any grandchild (e.g. the Python
  // measurement harness this spawns on demand) running and orphaned, which is
  // exactly what happened in testing: leftover node/python processes still
  // making real Ollama calls minutes after "stopping" the converted app.
  const proc = spawn(process.execPath, ["unai-server.cjs"], {
    cwd: workDir, env: Object.assign({}, process.env, { PORT: String(port) }),
    detached: process.platform !== "win32",
  });
  let bootLog = "";
  proc.stdout.on("data", b => bootLog += b);
  proc.stderr.on("data", b => bootLog += b);
  const url = `http://localhost:${port}`;
  const app = { id, name: manifest.name, proc, port, url, previewUrl: url, workDir, kind: "convert", sourceFolder: srcRoot, createdAt: new Date().toISOString(), manifest, report: null };
  RUNNING.set(id, app);
  addToRegistry(id);
  proc.on("exit", () => { if (RUNNING.get(id) === app) RUNNING.delete(id); });

  const ready = await waitForReady(url, 20000);
  if (!ready) { RUNNING.delete(id); removeFromRegistry(id); killTree(proc); throw new Error(`Converted app did not respond on ${url} within 20s. Recent output:\n${bootLog.slice(-1000)}`); }

  // Streamlit apps get their OWN live process on their own port -- the
  // Playground iframe should show the real dashboard, not unai-server.cjs's
  // generated minimal UI. /api/unai/run + /api/unai/compare stay on the
  // wrapper's `url` above; previewUrl is only where the iframe points.
  let previewUrl = url;
  if (streamlitPlan) {
    try {
      const streamlit = await launchStreamlitPreview(streamlitPlan.dir, streamlitPlan.entry, url);
      app.previewProc = streamlit.proc;
      previewUrl = streamlit.url;
    } catch (e) {
      uiNote += ` -- Streamlit preview failed to launch (${e.message.split("\n")[0]}), falling back to the generated UI for the embed`;
    }
  } else if (fullstackPlan) {
    try {
      const live = fullstackPlan.kind === "python"
        ? await launchPythonFullstackPreview(fullstackPlan.dir, fullstackPlan.entry, url, readDotEnv(srcRoot))
        : await launchNodeFullstackPreview(fullstackPlan.dir, fullstackPlan.entry, fullstackPlan.cmd, url, readDotEnv(srcRoot));
      app.previewProc = live.proc;
      previewUrl = live.url;
    } catch (e) {
      uiNote += ` -- full-stack preview failed to launch (${e.message.split("\n")[0]}), falling back to the generated UI for the embed`;
    }
  }

  const report = {
    hasFrontend: analysis.hasFrontend, uiNote, backendSwapped,
    agentGroups: groupCapabilitiesBySource(analysis, manifest),
    capabilitiesFound: manifest.capabilities.length,
    llmCallSitesFound: (analysis.llmCallSites || []).length,
    usedLLM: analysis.usedLLM, llmProvider: analysis.llmProvider, llmError: analysis.llmError,
    measurementHarness: measureScript
      ? `generated (${measureScript}) -- best-effort, falls back to modeled if it captures no real usage`
      : "not generated -- no LLM call sites found, comparison will use modeled numbers for your app",
  };
  // Persist the full manifest + report alongside the URL (not just id/url) so
  // the client can rehydrate the "Your App vs UNAI" dynamic comparison entry
  // after a page reload from this one state file, with no extra round trip.
  // This is a single "most recent" pointer, separate from the RUNNING map --
  // it's what a fresh page load without an app-list call yet falls back to.
  app.previewUrl = previewUrl;
  app.report = report;
  const record = { id, name: manifest.name, url, previewUrl, sourceFolder: srcRoot, createdAt: app.createdAt, manifest, report };
  try { fs.writeFileSync(CONV_STATE_FILE, JSON.stringify(record, null, 2)); } catch (_) {}
  // Also per-id, so relaunchBuiltNodeApp can recover the REAL report (agent
  // groupings especially -- derived from the source analysis, which only
  // exists transiently here) instead of fabricating a minimal one on relaunch.
  try { fs.writeFileSync(path.join(workDir, "unai_report.json"), JSON.stringify(report, null, 2)); } catch (_) {}

  // Stand up the customer-facing API for this app right now, same call the
  // Playground's manual "register" endpoint uses -- so a customer key +
  // /api/customer-agents/<slug>/ endpoint exist the moment conversion
  // finishes, no separate step. Stable across re-conversions of the SAME
  // app (keeps the same slug + key rather than issuing new ones every time)
  // and safe on a name collision with a DIFFERENT app (never overwrites
  // another app's registration -- see registerAgentAuto in customer_api.js).
  let customerApiInfo = null;
  try { customerApiInfo = customerApi.registerAgentAuto(id, manifest.name); } catch (_) {}

  return { ok: true, id, url, previewUrl, manifest, report, customerApi: customerApiInfo };
}

// Re-launches an EXISTING .converted/<id> folder as-is -- no copy from source,
// no npm install, no build -- for a workDir that's already correct and just
// needs its processes restarted (e.g. after a server restart dropped it from
// RUNNING, or after hand-editing the converted copy, like a bespoke backend
// bridge a fresh convertFolder() call would wipe out by re-copying from the
// untouched original source). Requires the folder to already have a built
// package.json "start" script (i.e. its build already ran at least once).
async function relaunchBuiltNodeApp(id) {
  const workDir = path.join(CONVERTED_DIR, id);
  const serverPath = path.join(workDir, "unai-server.cjs");
  if (!fs.existsSync(serverPath)) throw new Error("no unai-server.cjs found for " + id);
  // package.json + a "start" script is what lets a CONVERTED app's own
  // original frontend/preview process come back too (below) -- but a
  // from-scratch BUILT agent (source:'build') never had one to begin with,
  // and doesn't need one: its wrapper IS the whole app. Only gate the
  // optional preview relaunch on this, not the relaunch itself.
  const pkgPath = path.join(workDir, "package.json");
  let pkg = null;
  if (fs.existsSync(pkgPath)) { try { pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")); } catch (_) { pkg = null; } }
  const hasOwnPreview = !!(pkg && pkg.scripts && pkg.scripts.start);

  // Recover the manifest embedded in the generated wrapper -- same trick used
  // elsewhere to reconstruct a manifest without a separate metadata file.
  const src = fs.readFileSync(serverPath, "utf8");
  const mStart = src.indexOf("const MANIFEST = ");
  if (mStart < 0) throw new Error("could not find MANIFEST in unai-server.cjs");
  let i = src.indexOf("{", mStart), depth = 0, end = -1;
  for (let p = i; p < src.length; p++) { if (src[p] === "{") depth++; else if (src[p] === "}") { depth--; if (depth === 0) { end = p + 1; break; } } }
  const manifest = eval("(" + src.slice(i, end) + ")");
  const kind = manifest.source === "build" ? "build" : "convert";

  const wrapperPort = await pickFreePort();
  const wrapperProc = spawn(process.execPath, ["unai-server.cjs"], {
    cwd: workDir, env: Object.assign({}, process.env, { PORT: String(wrapperPort) }),
    detached: process.platform !== "win32",
  });
  const url = `http://localhost:${wrapperPort}`;
  const app = { id, name: manifest.name, proc: wrapperProc, port: wrapperPort, url, previewUrl: url, workDir, kind, sourceFolder: null, createdAt: new Date().toISOString(), manifest, report: null };
  RUNNING.set(id, app);
  addToRegistry(id);
  wrapperProc.on("exit", () => { if (RUNNING.get(id) === app) RUNNING.delete(id); });
  const wrapperReady = await waitForReady(url, 20000);
  if (!wrapperReady) { RUNNING.delete(id); removeFromRegistry(id); killTree(wrapperProc); throw new Error("wrapper did not respond on " + url); }

  // Recover the REAL report (agent groupings especially) persisted at
  // conversion time, if present -- a fabricated minimal report here loses the
  // per-agent breakdown on the "Your App vs UNAI" comparison page.
  let savedReport = null;
  try { savedReport = JSON.parse(fs.readFileSync(path.join(workDir, "unai_report.json"), "utf8")); } catch (_) {}
  app.report = savedReport
    ? Object.assign({}, savedReport, { uiNote: (savedReport.uiNote || "") + " (relaunched, any hand-edits preserved)" })
    : { hasFrontend: kind === "build", uiNote: "relaunched (any hand-edits preserved), live -- original per-agent breakdown unavailable (converted before this was tracked)", backendSwapped: kind === "convert" };

  // Same auto customer-API registration convertFolder() does on a fresh
  // conversion -- idempotent (reuses the same slug + key if this app id was
  // already registered), so a relaunch never hands out a new customer key.
  let customerApiInfo = null;
  try { customerApiInfo = customerApi.registerAgentAuto(id, manifest.name); } catch (_) {}

  if (!hasOwnPreview) return { ok: true, id, url, previewUrl: url, manifest, report: app.report, customerApi: customerApiInfo };

  // Converted app WITH its own frontend -- try to bring that back too; if it
  // fails, fall back to the wrapper's own UI as the preview instead of
  // failing the whole relaunch (the backend + comparison endpoint still work
  // either way).
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const appPort = await pickFreePort();
  const appProc = spawn(npm, ["start"], {
    cwd: workDir, detached: process.platform !== "win32", shell: process.platform === "win32",
    env: Object.assign({}, process.env, { PORT: String(appPort), NODE_ENV: "production", UNAI_BACKEND_URL: url }),
  });
  let bootLog = ""; appProc.stdout.on("data", b => bootLog += b); appProc.stderr.on("data", b => bootLog += b);
  const appUrl = `http://localhost:${appPort}`;
  const appReady = await waitForReady(appUrl, 45000);
  if (!appReady) {
    killTree(appProc);
    app.report.uiNote += ` -- its own frontend preview failed to relaunch (${bootLog.trim().split("\n").pop() || "no output"}), showing the generated UI instead`;
    return { ok: true, id, url, previewUrl: url, manifest, report: app.report, customerApi: customerApiInfo };
  }
  app.previewProc = appProc;
  app.previewUrl = appUrl;
  return { ok: true, id, url, previewUrl: appUrl, manifest, report: app.report, customerApi: customerApiInfo };
}

// Generalizes relaunchBuiltNodeApp to every conversion kind, using the
// recipe written by writeRelaunchRecipe at conversion time -- that older
// function only ever knew how to bring back an ALREADY-BUILT (npm run
// build'd) Node app, so autoRelaunchAll() calling it unconditionally meant
// every Python conversion, every Node conversion still in dev mode, and
// every Streamlit conversion silently failed to come back after a server
// restart (the actual root cause of "the Playground goes empty every
// restart" -- their files were always still on disk, nothing could relaunch
// them). Delegates to relaunchBuiltNodeApp for the one case it already
// handles correctly (a built Node app) rather than duplicating that logic.
async function relaunchAnyApp(id) {
  const workDir = path.join(CONVERTED_DIR, id);
  const recipe = readRelaunchRecipe(workDir);
  // recipe.kind === null also covers conversions made BEFORE this recipe
  // file existed -- still worth checking whether they're an already-built
  // Node app (relaunchBuiltNodeApp's own original detection), so an older
  // conversion doesn't regress to "wrapper-only" just for predating this.
  if (recipe.kind === "node" || recipe.kind === null) {
    let pkg = null;
    try { pkg = JSON.parse(fs.readFileSync(path.join(workDir, "package.json"), "utf8")); } catch (_) {}
    const hasBuilt = fs.existsSync(path.join(workDir, "dist", "server.cjs")) && pkg && pkg.scripts && pkg.scripts.start;
    if (hasBuilt) return relaunchBuiltNodeApp(id);
  }
  const serverPath = path.join(workDir, "unai-server.cjs");
  if (!fs.existsSync(serverPath)) throw new Error("no unai-server.cjs found for " + id);
  const src = fs.readFileSync(serverPath, "utf8");
  const mStart = src.indexOf("const MANIFEST = ");
  if (mStart < 0) throw new Error("could not find MANIFEST in unai-server.cjs");
  let i = src.indexOf("{", mStart), depth = 0, end = -1;
  for (let p = i; p < src.length; p++) { if (src[p] === "{") depth++; else if (src[p] === "}") { depth--; if (depth === 0) { end = p + 1; break; } } }
  const manifest = eval("(" + src.slice(i, end) + ")");
  const kind = manifest.source === "build" ? "build" : "convert";
  const envOv = recipe.sourceFolder ? readDotEnv(recipe.sourceFolder) : {};

  const wrapperPort = await pickFreePort();
  const wrapperProc = spawn(process.execPath, ["unai-server.cjs"], {
    cwd: workDir, env: Object.assign({}, process.env, { PORT: String(wrapperPort) }),
    detached: process.platform !== "win32",
  });
  const url = `http://localhost:${wrapperPort}`;
  const app = { id, name: manifest.name, proc: wrapperProc, port: wrapperPort, url, previewUrl: url, workDir, kind, sourceFolder: recipe.sourceFolder || null, createdAt: new Date().toISOString(), manifest, report: null };
  RUNNING.set(id, app);
  addToRegistry(id);
  wrapperProc.on("exit", () => { if (RUNNING.get(id) === app) RUNNING.delete(id); });
  const wrapperReady = await waitForReady(url, 20000);
  if (!wrapperReady) { RUNNING.delete(id); removeFromRegistry(id); killTree(wrapperProc); throw new Error("wrapper did not respond on " + url); }

  let savedReport = null;
  try { savedReport = JSON.parse(fs.readFileSync(path.join(workDir, "unai_report.json"), "utf8")); } catch (_) {}
  app.report = savedReport
    ? Object.assign({}, savedReport, { uiNote: (savedReport.uiNote || "") + " (relaunched, any hand-edits preserved)" })
    : { hasFrontend: kind === "build", uiNote: "relaunched (any hand-edits preserved), live -- original per-agent breakdown unavailable (converted before this was tracked)", backendSwapped: kind === "convert" };

  let previewUrl = url;
  try {
    if (recipe.kind === "python" && recipe.entry) {
      const live = await launchPythonFullstackPreview(workDir, recipe.entry, url, envOv);
      app.previewProc = live.proc; previewUrl = live.url;
    } else if (recipe.kind === "node" && recipe.entry) {
      // Not yet built (or lost its build) -- bring it back in dev mode, same
      // as a fresh conversion's first attempt.
      const live = await launchNodeFullstackPreview(workDir, recipe.entry, recipe.cmd || "tsx", url, envOv);
      app.previewProc = live.proc; previewUrl = live.url;
    } else if (recipe.kind === "streamlit" && recipe.entry) {
      const live = await launchStreamlitPreview(workDir, recipe.entry, url);
      app.previewProc = live.proc; previewUrl = live.url;
    }
    // recipe.kind === null (generated/static UI): the wrapper's own served
    // UI IS the preview -- nothing else to launch.
  } catch (e) {
    app.report.uiNote += ` -- its own live preview failed to relaunch (${e.message.split("\n")[0]}), showing the generated UI instead`;
  }
  app.previewUrl = previewUrl;
  // Same auto customer-API registration convertFolder() does on a fresh
  // conversion -- idempotent, so a relaunch never hands out a new customer key.
  let customerApiInfo = null;
  try { customerApiInfo = customerApi.registerAgentAuto(id, manifest.name); } catch (_) {}
  return { ok: true, id, url, previewUrl, manifest, report: app.report, customerApi: customerApiInfo };
}

// Launches a manifest built from scratch in the Foundry's "① Build a new
// agent" tab (source:"build" -- no existing app/folder behind it) as a live
// standalone app, the same way convertFolder() does for a converted one:
// generated minimal UI, wrapper server, free port, embeddable in the
// Playground. No measurement harness (there's no pre-existing app to
// measure) -- its own /api/unai/compare falls back to UNAI's modeled
// baseline for "your app", same as convertFolder() would with no LLM call
// sites found. Surfaced in "Your App vs UNAI" on the main page too, via
// dynSetComparisonFromBuild (index.html) -- framed as the Gen-1 modeled
// baseline (one specialist agent per capability) rather than a measured
// real-app comparison, since there's no original app to analyze.
async function launchManifest(manifest) {
  const id = manifest.id || ("AGT-" + crypto.randomBytes(4).toString("hex").toUpperCase());
  manifest.id = id;
  const workDir = path.join(CONVERTED_DIR, id);
  fs.mkdirSync(path.join(workDir, "unai_public"), { recursive: true });
  fs.writeFileSync(path.join(workDir, "unai_public", "index.html"), buildMinimalUI(manifest));
  fs.writeFileSync(path.join(workDir, "unai_toolpacks_reference.js"), buildToolPackStubsJs(manifest));
  bundleRuntimeInto(workDir);
  fs.writeFileSync(path.join(workDir, "unai-server.cjs"), buildWrapperServer({ manifest, appDir: APP_DIR, workDir, staticDir: null, measureScript: null }));

  const port = await pickFreePort();
  const proc = spawn(process.execPath, ["unai-server.cjs"], {
    cwd: workDir, env: Object.assign({}, process.env, { PORT: String(port) }),
    detached: process.platform !== "win32",
  });
  let bootLog = "";
  proc.stdout.on("data", b => bootLog += b);
  proc.stderr.on("data", b => bootLog += b);
  const url = `http://localhost:${port}`;
  const app = { id, name: manifest.name, proc, port, url, previewUrl: url, workDir, kind: "build", sourceFolder: null, createdAt: new Date().toISOString(), manifest, report: null };
  RUNNING.set(id, app);
  addToRegistry(id);
  proc.on("exit", () => { if (RUNNING.get(id) === app) RUNNING.delete(id); });

  const ready = await waitForReady(url, 20000);
  if (!ready) { RUNNING.delete(id); removeFromRegistry(id); killTree(proc); throw new Error(`Built agent did not respond on ${url} within 20s. Recent output:\n${bootLog.slice(-1000)}`); }

  const record = { id, name: manifest.name, url, previewUrl: url, sourceFolder: null, createdAt: app.createdAt, manifest, report: null };
  try { fs.writeFileSync(CONV_STATE_FILE, JSON.stringify(record, null, 2)); } catch (_) {}

  // Same auto customer-API registration convertFolder() does -- see its own
  // comment for why this happens here rather than as a separate manual step.
  let customerApiInfo = null;
  try { customerApiInfo = customerApi.registerAgentAuto(id, manifest.name); } catch (_) {}

  return { ok: true, id, url, previewUrl: url, manifest, customerApi: customerApiInfo };
}

// Called once at server boot (see server.js): brings back every app that was
// live before the last restart, using the persisted registry above -- this
// is the actual fix for "the Playground/Your-App-vs-UNAI dropdown goes empty
// every time the server restarts." Best-effort per app: one broken or
// incompatible entry (workDir deleted, or something that genuinely can't
// relaunch) is skipped and logged, never blocking the rest.
async function autoRelaunchAll() {
  const stopped = new Set(loadStoppedRegistry());
  const ids = [...new Set([...loadRunningRegistry(), ...discoverConvertedIds()])].filter(id => !stopped.has(id));
  const results = [];
  for (const id of ids) {
    if (RUNNING.has(id)) { results.push({ id, ok: true, skipped: "already running" }); continue; }
    const workDir = path.join(CONVERTED_DIR, id);
    if (!fs.existsSync(path.join(workDir, "unai-server.cjs"))) {
      results.push({ id, ok: false, error: "workDir/unai-server.cjs missing on disk" });
      removeFromRegistry(id);
      continue;
    }
    // A launch failure here is left in the registry (unlike the missing-
    // workDir case above, which is permanent) -- it may be transient (port
    // contention, a slow cold start, low disk at boot time), and the next
    // restart should still try again rather than silently giving up on it.
    try { const r = await relaunchAnyApp(id); results.push({ id, ok: true, url: r.previewUrl }); }
    catch (e) { results.push({ id, ok: false, error: e.message }); }
  }
  return results;
}

module.exports = { convertFolder, launchManifest, relaunchBuiltNodeApp, relaunchAnyApp, stopCurrent, stopApp, appStatus, listRunning, getRunning, readLastConversion,
  collectSourceFiles, detectFrontend, heuristicAnalysis, groupCapabilitiesBySource, decomposeDescription, autoRelaunchAll };
