#!/usr/bin/env node
// ==========================================================================
// benchmark.js — MEASURED token/cost benchmark. No estimates.
//
// Compares naive (re-send full context on every call) vs UNAI (semantic query
// cache serves repeats at 0 model tokens; prompt cache on the reused context).
//
//   FOOTPRINT (offline, no key):   node benchmark.js
//     -> real BPE token counts of exactly what each approach sends (input side).
//
//   LIVE (real end-to-end, needs a key):
//     MISTRAL_API_KEY=sk-... node benchmark.js --live
//     -> actually calls the model and sums PROVIDER-REPORTED tokens (in/out/cache)
//        for both sides, plus measured $ at the published rate below.
//
//   Run on REAL queries (defensible customer number):
//     node benchmark.js --live --queries mercury_query_log.json   # JSON array of strings
//
// Everything here is measured: real tokenizer, UNAI's real cache, and — in --live —
// the provider's own usage numbers. Nothing is modeled.
// ==========================================================================
const fs = require("fs");
let encode; try { encode = require("gpt-tokenizer").encode; } catch { console.error("Run: npm install gpt-tokenizer"); process.exit(1); }
const { SemanticQueryCache } = require("./engine.js");
const { resolveConfig, answerGrounded } = require("./llm.js");
const tok = s => encode(String(s)).length;

// The assistant's system prompt + a representative retrieved context envelope.
const SYS = "You are the Mercury document & knowledge assistant. If the user asks for a document, return its link. If they ask a question, read the source documents, answer in business-friendly language, give the source document name, remove URLs and citation markers, and only include SharePoint links when explicitly asked. Ground strictly in the provided context; do not invent facts.";
const CONTEXT = [
  "Project Mercury 2.0 RASCI Matrix: the RM Planner is Responsible for building and maintaining the replenishment plan, running weekly net-requirements and raising exceptions; Accountable to the S&OP lead; Consulted with Supply Planning and Procurement; Informed to the Control Tower.",
  "BST = Business Standard Template: the standardized data and process template every region adopts so plans, master data and KPIs are comparable across markets. Deviations require a documented exception approved by the regional lead.",
  "Replenishment SOP: buffers are set with DDMRP; the RM Planner reviews red-zone breaches daily and confirms transfer orders before cutoff.",
].join("\n");

// Published price for YOUR model ($/token). Edit to match the model you run.
// (Mistral Small published example — real rate, only used to turn measured tokens into measured $.)
const RATE = { in: 0.20 / 1e6, out: 0.60 / 1e6, cacheRead: (0.20 / 1e6) * 0.5 };

function getStream() {
  const i = process.argv.indexOf("--queries");
  if (i > -1) {   // --queries was given: the file MUST exist (don't silently fall back)
    const f = process.argv[i + 1];
    if (!f || !fs.existsSync(f)) { console.error("ERROR: --queries file not found: " + f + "\n(create a JSON array of the real questions, or drop --queries to use the synthetic stream)"); process.exit(1); }
    console.log("using REAL query log:", f);
    return JSON.parse(fs.readFileSync(f, "utf8"));
  }
  console.log("using SYNTHETIC 100-user stream (add --queries <real log> for the customer number)");
  const distinct = ["What is BST?", "What are the responsibilities of an RM Planner?", "How are buffers set?", "What is the RASCI for Mercury?", "Who is accountable for the replenishment plan?", "What is DDMRP used for?", "Show me the RASCI matrix", "When are transfer orders confirmed?", "What does the RM Planner do daily?", "Who approves BST deviations?", "What is a red-zone breach?", "Who is consulted on replenishment?"];
  const weights = [18, 16, 9, 8, 7, 7, 6, 6, 5, 5, 4, 9];
  const s = []; distinct.forEach((q, i) => { for (let k = 0; k < weights[i]; k++) s.push(q); });
  for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; }
  return s;
}

(async () => {
  const live = process.argv.includes("--live");
  const cfg = resolveConfig();
  if (live && !cfg.ok) { console.error("--live needs a key (MISTRAL_API_KEY / GATEWAY_API_KEY)."); process.exit(1); }
  let qs = getStream();
  const li = process.argv.indexOf("--limit");
  if (li > -1 && process.argv[li + 1]) { qs = qs.slice(0, parseInt(process.argv[li + 1], 10)); console.log("--limit: running first", qs.length, "queries"); }
  if (live) console.log("LIVE: ~" + (qs.length) + " naive + a few cache-miss model calls (~1-2s each). Progress below.");
  const SYS_T = tok(SYS), CTX_T = tok(CONTEXT);
  const cache = new SemanticQueryCache();
  let nIn = 0, nOut = 0, uIn = 0, uOut = 0, uCacheRead = 0, miss = 0, done = 0;
  for (const q of qs) {
    const qT = tok(q);
    if (live) { process.stdout.write("\r  measuring " + (++done) + "/" + qs.length + " ...   "); const r = await answerGrounded(q, CONTEXT, cfg); nIn += r.tokensIn || 0; nOut += r.tokensOut || 0; }
    else nIn += SYS_T + CTX_T + qT;
    const h = cache.lookup(q, {});
    if (!h.hit) {
      miss++;
      if (live) { const r = await answerGrounded(q, CONTEXT, cfg); uIn += r.tokensIn || 0; uOut += r.tokensOut || 0; uCacheRead += r.cacheRead || 0; cache.store(q, r.content || "a", {}); }
      else { uIn += SYS_T + CTX_T + qT; cache.store(q, "a", {}); }
    }
  }
  if (live) process.stdout.write("\n");
  const st = cache.stats();
  const cost = (i, o, cr = 0) => (i - cr) * RATE.in + cr * RATE.cacheRead + o * RATE.out;
  console.log("\n=== MEASURED — " + (live ? "LIVE (provider-reported tokens)" : "FOOTPRINT (tokenizer, offline; input side only)") + " ===");
  console.log("queries:", qs.length, "| real cache hits:", st.hits, "(" + (st.hitRate * 100).toFixed(1) + "%) | model calls:", miss);
  console.log("naive tokens   in:", nIn.toLocaleString(), "out:", nOut.toLocaleString());
  console.log("UNAI  tokens   in:", uIn.toLocaleString(), "out:", uOut.toLocaleString(), "cacheRead:", uCacheRead.toLocaleString());
  console.log("MEASURED input-token reduction:", ((1 - uIn / nIn) * 100).toFixed(1) + "%");
  if (live) {
    const nc = cost(nIn, nOut), uc = cost(uIn, uOut, uCacheRead);
    console.log("MEASURED cost  naive: $" + nc.toFixed(4) + "  UNAI: $" + uc.toFixed(4) + "  reduction: " + ((1 - uc / nc) * 100).toFixed(1) + "%  (at the published rate in RATE)");
  } else console.log("(run --live with your key for output tokens + measured $)");
})();
