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
 * llm.js — Explainability rationale generation via an AI GATEWAY (one key,
 * many models) OR a provider directly. OpenAI-compatible, so the same code calls
 * OpenRouter, TrueFoundry, LiteLLM, Portkey, or Mistral.
 *
 * Configure with environment variables (see .env.example):
 *   GATEWAY_PROVIDER = openrouter | truefoundry | litellm | portkey | mistral
 *   GATEWAY_BASE_URL = https://openrouter.ai/api/v1   (or your gateway URL)
 *   GATEWAY_API_KEY  = <one key for ALL models behind the gateway>
 *   GATEWAY_MODEL    = mistralai/mistral-small        (provider-specific id)
 *   # convenience: MISTRAL_API_KEY alone -> talk to Mistral directly
 *
 * No key set anywhere -> deterministic template rationales (app still works).
 * ========================================================================== */

// provider presets: base URL + a sensible default model id
const PRESETS = {
  openrouter:  { base: "https://openrouter.ai/api/v1",        model: "mistralai/mistral-small" },
  litellm:     { base: "http://localhost:4000/v1",            model: "mistral-small" },
  portkey:     { base: "https://api.portkey.ai/v1",           model: "mistral-small-latest" },
  truefoundry: { base: process.env.GATEWAY_BASE_URL || "",    model: process.env.GATEWAY_MODEL || "mistral-small" },
  mistral:     { base: "https://api.mistral.ai/v1",           model: "mistral-small-latest" },
};

function resolveConfig(overrideKey) {
  const provider = (process.env.GATEWAY_PROVIDER || "").toLowerCase();
  const preset = PRESETS[provider] || {};
  // When a key is provided (per-run field or env MISTRAL_API_KEY) but no explicit
  // gateway base is configured, default to Mistral's endpoint — the app's documented
  // default — so a pasted Mistral key works on its own, without also setting a base.
  const haveKey = overrideKey || process.env.GATEWAY_API_KEY || process.env.MISTRAL_API_KEY;
  const base = process.env.GATEWAY_BASE_URL || preset.base ||
               (haveKey ? PRESETS.mistral.base : "");
  const key = overrideKey || process.env.GATEWAY_API_KEY || process.env.MISTRAL_API_KEY || "";
  const model = process.env.GATEWAY_MODEL || preset.model ||
                (haveKey ? PRESETS.mistral.model : "mistral-small-latest");
  const label = provider || (process.env.GATEWAY_BASE_URL ? "gateway" :
                (process.env.MISTRAL_API_KEY ? "mistral" : "template"));
  return { base, key, model, label, ok: !!(base && key) };
}

// Ordered provider list for QUOTA-AWARE FAILOVER. A configured gateway wins;
// otherwise your direct keys, in LLM_ROUTER_ORDER (default openai → mistral).
// Registry of OpenAI-compatible providers. Add more here, or add one WITHOUT a
// code change via env: LLM_<NAME>_BASE / LLM_<NAME>_KEY / LLM_<NAME>_MODEL, then
// put <name> in LLM_ROUTER_ORDER.
// Most providers speak the OpenAI /chat/completions shape (kind:"openai", the
// default). Anthropic/Claude uses a native transport (/v1/messages + prompt
// caching), so it is tagged kind:"anthropic" and routed through its own adapter.
const LLM_REGISTRY = {
  openai:     { base: "https://api.openai.com/v1",                              env: "OPENAI_API_KEY",     model: "gpt-4o-mini" },
  mistral:    { base: "https://api.mistral.ai/v1",                              env: "MISTRAL_API_KEY",    model: "mistral-small-latest" },
  anthropic:  { base: "https://api.anthropic.com/v1",                           env: "ANTHROPIC_API_KEY",  model: "claude-haiku-4-5-20251001", kind: "anthropic" },
  gemini:     { base: "https://generativelanguage.googleapis.com/v1beta/openai",env: "GEMINI_API_KEY",     model: "gemini-1.5-flash" },
  groq:       { base: "https://api.groq.com/openai/v1",                         env: "GROQ_API_KEY",       model: "llama-3.1-8b-instant" },
  deepseek:   { base: "https://api.deepseek.com/v1",                            env: "DEEPSEEK_API_KEY",   model: "deepseek-chat" },
  together:   { base: "https://api.together.xyz/v1",                            env: "TOGETHER_API_KEY",   model: "meta-llama/Llama-3.1-8B-Instruct-Turbo" },
  openrouter: { base: "https://openrouter.ai/api/v1",                           env: "OPENROUTER_API_KEY", model: "mistralai/mistral-small" },
};
function resolveProviders() {
  const list = [];
  if ((process.env.GATEWAY_BASE_URL || process.env.GATEWAY_PROVIDER) && process.env.GATEWAY_API_KEY) {
    const gw = resolveConfig(); if (gw.ok) list.push({ base: gw.base, key: gw.key, model: gw.model, label: gw.label || "gateway", kind: "openai" });
  }
  (process.env.LLM_ROUTER_ORDER || "openai,mistral").split(",").map(s => s.trim().toLowerCase()).filter(Boolean).forEach(n0 => {
    const n = (n0 === "claude") ? "anthropic" : n0;   // friendly alias
    let p;
    if (LLM_REGISTRY[n]) { const k = process.env[LLM_REGISTRY[n].env];
      if (k) p = { base: LLM_REGISTRY[n].base, key: k, model: process.env[n.toUpperCase() + "_MODEL"] || LLM_REGISTRY[n].model, label: n, kind: LLM_REGISTRY[n].kind || "openai" }; }
    else { const U = "LLM_" + n.toUpperCase();       // fully custom provider from env
      if (process.env[U + "_BASE"] && process.env[U + "_KEY"]) p = { base: process.env[U + "_BASE"], key: process.env[U + "_KEY"], model: process.env[U + "_MODEL"] || "default", label: n, kind: (process.env[U + "_KIND"] || "openai").toLowerCase() }; }
    if (p) list.push(p);
  });
  const seen = new Set();
  return list.filter(p => { const k = p.base + "|" + p.model; if (seen.has(k)) return false; seen.add(k); return true; });
}

// Intelligent model routing: send light tasks to a smaller/cheaper model.
// Configure per tier: LLM_MODEL_SIMPLE / _MEDIUM / _COMPLEX. When opts.tier is
// set and an override exists, it replaces the provider's default model.
const TIER_MODEL = () => ({ simple: process.env.LLM_MODEL_SIMPLE, medium: process.env.LLM_MODEL_MEDIUM, complex: process.env.LLM_MODEL_COMPLEX });

// QUICK WIN — auto tiered routing: pick simple/medium/complex from the request
// itself so cheap asks use the cheap model and only heavy reasoning escalates.
// (Only changes the model when LLM_MODEL_* are configured; otherwise harmless.)
const _HEAVY = /(analy|plan\b|planning|reason|forecast|optimi|root cause|why\b|compare|strateg|design|recommend|diagnos|trade[- ]?off|multi-?hop)/i;
function pickTier(messages) {
  const text = (Array.isArray(messages) ? messages : [{ content: messages }])
    .map(m => typeof m.content === "string" ? m.content : (Array.isArray(m.content) ? m.content.map(b => b.text || "").join(" ") : "")).join(" ");
  const len = text.length;
  if (_HEAVY.test(text) || len > 1600) return "complex";
  if (len < 320) return "simple";
  return "medium";
}
// QUICK WIN — context compression: shrink the reused context envelope before it
// is sent (dedupe identical lines, collapse blank runs, cap length). Fewer input
// tokens for the same grounding; stacks with prompt caching.
function compressContext(s, maxChars = 9000) {
  let t = String(s || "").replace(/\r/g, "");
  const seen = new Set(); const out = [];
  for (const ln of t.split("\n")) { const k = ln.trim().replace(/\s+/g, " "); if (!k) { if (out.length && out[out.length-1] !== "") out.push(""); continue; }
    if (seen.has(k)) continue; seen.add(k); out.push(ln.replace(/[ \t]+/g, " ").trimEnd()); }
  t = out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (t.length > maxChars) t = t.slice(0, maxChars) + "\n…[context trimmed for token economy]";
  return t;
}

// --- Claude / Anthropic native adapter -------------------------------------
// Anthropic isn't OpenAI-compatible: it uses /v1/messages, an x-api-key header,
// a separate `system` field, and PROMPT CACHING via cache_control blocks. To
// economize, we cache the large, reused system/context envelope by default so
// repeat executor calls pay the deeply-discounted cache-read price instead of
// re-sending the whole envelope at full input price on every call. Usage comes
// back with cache_read / cache_creation token counts, which we surface upstream.
async function callAnthropic(messages, p, opts, signal) {
  const norm = b => (typeof b === "string")
    ? { type: "text", text: b }
    : Object.assign({ type: b.type || "text", text: b.text }, b.cache_control ? { cache_control: b.cache_control } : {});
  const sys = [], turns = [];
  for (const m of messages) {
    if (m.role === "system") { (Array.isArray(m.content) ? m.content : [m.content]).forEach(c => sys.push(norm(c))); }
    else { turns.push({ role: m.role === "assistant" ? "assistant" : "user",
      content: Array.isArray(m.content) ? m.content.map(norm) : String(m.content) }); }
  }
  let cached = false;
  if (sys.length) { if (!sys.some(b => b.cache_control)) sys[sys.length - 1].cache_control = { type: "ephemeral" };
    cached = sys.some(b => !!b.cache_control); }
  const headers = { "Content-Type": "application/json", "x-api-key": p.key, "anthropic-version": "2023-06-01" };
  if (cached) headers["anthropic-beta"] = "prompt-caching-2024-07-31";
  const finalTurns = turns.length ? turns : [{ role: "user", content: "." }];
  // JSON mode: prefill an open brace so the model must continue valid JSON (Anthropic has no response_format).
  if (opts.json) finalTurns.push({ role: "assistant", content: "{" });
  const body = { model: p.model, max_tokens: opts.max_tokens || 500, temperature: opts.temperature ?? 0.2, messages: finalTurns };
  if (sys.length) body.system = sys;
  if (Array.isArray(opts.stop) && opts.stop.length) body.stop_sequences = opts.stop;   // cut output tokens
  try { require("./containment.js").assertEgress(p.base, "llm:anthropic"); } catch (e) { if (e.code === "EGRESS_BLOCKED") throw e; }
  const res = await fetch(p.base.replace(/\/$/, "") + "/messages", { method: "POST", headers, signal, body: JSON.stringify(body) });
  if (res.status === 429 || res.status >= 500 || !res.ok) return { retry: true, status: res.status };
  const data = await res.json();
  let content = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  if (opts.json && content && content.trim()[0] !== "{") content = "{" + content;   // restore the prefilled brace
  const u = data.usage || {};
  return { content, tokensIn: u.input_tokens, tokensOut: u.output_tokens,
    cacheRead: u.cache_read_input_tokens || 0, cacheWrite: u.cache_creation_input_tokens || 0, cached };
}

// Call across providers; on 429/quota/5xx/timeout → next provider. OpenAI-shape
// providers hit /chat/completions; Anthropic (kind:"anthropic") uses its native
// adapter above. Defaults (openai → mistral) are unchanged — Claude only joins
// the chain when you add `anthropic`/`claude` to LLM_ROUTER_ORDER + set its key.
async function chatWithFailover(messages, opts = {}) {
  const providers = resolveProviders();
  const tier = opts.tier || (opts.autoTier === false ? null : pickTier(messages));   // auto-pick unless caller sets one
  const tierModel = tier ? TIER_MODEL()[tier] : null;   // complexity-based override
  const tried = [];
  for (const p0 of providers) {
    // don't cross-contaminate: a tier override only replaces the model when the
    // model family matches the provider family (a Claude id must not hit OpenAI).
    const isClaudeTier = tierModel ? /claude/i.test(tierModel) : false;
    const useTier = !!tierModel && ((p0.kind === "anthropic") === isClaudeTier);
    const p = useTier ? { ...p0, model: tierModel } : p0;
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs || 15000);
    try {
      if (p.kind === "anthropic") {
        const a = await callAnthropic(messages, p, opts, ctrl.signal);
        if (a.retry) { tried.push(p.label + ":" + (a.status || "err")); continue; }
        if (a.content) return { content: a.content.trim(), provider: p.label, model: p.model, tried,
          tokensIn: a.tokensIn, tokensOut: a.tokensOut, cacheRead: a.cacheRead, cacheWrite: a.cacheWrite, cached: a.cached };
        tried.push(p.label + ":empty"); continue;
      }
      const ocBody = { model: p.model, temperature: opts.temperature ?? 0.2, max_tokens: opts.max_tokens || 500, messages };
      if (opts.json) ocBody.response_format = { type: "json_object" };   // structured output → fewer output tokens
      if (Array.isArray(opts.stop) && opts.stop.length) ocBody.stop = opts.stop;
      try { require("./containment.js").assertEgress(p.base, "llm:openai"); } catch (e) { if (e.code === "EGRESS_BLOCKED") throw e; }
      const res = await fetch(p.base.replace(/\/$/, "") + "/chat/completions", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${p.key}` }, signal: ctrl.signal,
        body: JSON.stringify(ocBody),
      });
      if (res.status === 429 || res.status >= 500) { tried.push(p.label + ":" + res.status); continue; }   // quota/rate/server → failover
      if (!res.ok) { tried.push(p.label + ":" + res.status); continue; }
      const data = await res.json();
      const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (content) { const det = data.usage && data.usage.prompt_tokens_details;
        return { content: content.trim(), provider: p.label, model: p.model, tried,
          tokensIn: data.usage && data.usage.prompt_tokens, tokensOut: data.usage && data.usage.completion_tokens,
          cacheRead: (det && det.cached_tokens) || 0, cacheWrite: 0, cached: !!(det && det.cached_tokens) }; }
      tried.push(p.label + ":empty");
    } catch (_) { tried.push(p.label + ":timeout"); } finally { clearTimeout(timer); }
  }
  return { content: null, provider: null, tried };
}

// Tolerant JSON extraction — strips code fences, isolates the first JSON value.
function safeJsonParse(s) {
  if (!s) return null;
  let t = String(s).trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const a = t.indexOf("{"), b = t.indexOf("[");
  const start = (a < 0) ? b : (b < 0 ? a : Math.min(a, b));
  if (start > 0) t = t.slice(start);
  const last = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (last >= 0) t = t.slice(0, last + 1);
  try { return JSON.parse(t); } catch (_) { return null; }
}
// Structured output: ask for JSON, parse it, retry once stricter on failure.
// Returns the normal chat result plus { data, ok }. Cheaper: JSON is terser than
// prose and `stop`/response_format cap the (priciest) output tokens.
async function chatJSON(messages, opts = {}) {
  const o = Object.assign({}, opts, { json: true, temperature: opts.temperature ?? 0 });
  let r = await chatWithFailover(messages, o);
  let data = r && r.content ? safeJsonParse(r.content) : null;
  if (!data && r && r.content) {
    const strict = messages.concat([{ role: "user", content: "Return ONLY valid minified JSON — no prose, no code fences." }]);
    r = await chatWithFailover(strict, o);
    data = r && r.content ? safeJsonParse(r.content) : null;
  }
  return Object.assign({}, r, { data, ok: !!data });
}

function buildPrompt(ev) {
  const drivers = ev.attribution.map(d => `- ${d.name}: ${Math.round(d.share * 100)}% of the decision`).join("\n");
  return "You are the Explainability layer of an autonomous supply-chain agent. " +
    "Write ONE concise business-English sentence (max 40 words) explaining this decision to a planner. " +
    "Use ONLY the facts below; do not invent numbers. State whether it executed autonomously or was routed to a human, and why.\n\n" +
    `Decision: ${ev.decision}\nConfidence: ${Math.round(ev.confidence*100)}% (uncertainty ${ev.uncertainty})\n` +
    `Autonomy threshold: ${Math.round((ev.threshold||0.85)*100)}%\nDrivers:\n${drivers}\n` +
    `Outcome: ${ev.autonomous ? "executed autonomously" : "routed to a human approver"}\n` +
    (ev.gate ? `Governance gate: ${ev.gate}\n` : "");
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// One retry on 429 (rate limit) — free-tier keys have tight per-minute quotas,
// and a run with a dozen decisions can burst past them. Honors Retry-After
// when the provider sends one, otherwise a fixed backoff.
// Throws a descriptive Error on any failure (network/TLS, HTTP status, or an
// empty response) instead of swallowing it — callers that want "skip and keep
// going" behavior (e.g. enrichEvidence's batch loop) must catch per-call;
// callers that want to show the real reason to a user (the connection-test
// endpoints) can just let it propagate.
async function narrateOne(ev, cfg, timeoutMs = 8000, retriesLeft = 2) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  // Corporate networks with SSL-inspecting proxies (Netskope, Zscaler, etc.)
  // present their own intercepting certificate, which Node's fetch() validates
  // more strictly than some other HTTP clients and rejects as "self-signed
  // certificate in certificate chain" — a network-layer TLS issue, not a bad
  // key or model. Scope the relaxation to exactly this call, only for
  // providers explicitly opted in via ALLOW_INSECURE_TLS, and restore the
  // global setting immediately after, even on error.
  // Match against the label AND the base URL's host — a key set via the
  // session-key UI or GATEWAY_BASE_URL always resolves label to "gateway",
  // never the provider name, so label-only matching would silently never
  // fire for exactly the path most people hit this from.
  const insecureFor = (process.env.ALLOW_INSECURE_TLS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const baseHost = (() => { try { return new URL(cfg.base).host.toLowerCase(); } catch (_) { return ""; } })();
  const needsInsecure = insecureFor.includes((cfg.label || "").toLowerCase()) ||
    insecureFor.some(s => s && baseHost.includes(s));
  const prevTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  if (needsInsecure) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    let res;
    try {
      require("./containment.js").assertEgress(cfg.base, "llm:grounded");
      res = await fetch(cfg.base.replace(/\/$/, "") + "/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${cfg.key}` },
        signal: ctrl.signal,
        body: JSON.stringify({ model: cfg.model, messages: [{ role: "user", content: buildPrompt(ev) }],
                               temperature: 0.2, max_tokens: 80 }),
      });
    } catch (e) {
      if (ctrl.signal.aborted) throw new Error(`timed out after ${timeoutMs}ms`);
      throw new Error(e.cause ? `${e.message}: ${e.cause.message}` : e.message);
    }
    if (res.status === 429 && retriesLeft > 0) {
      clearTimeout(timer);
      const wait = Math.min(15000, (parseFloat(res.headers.get("retry-after")) || 4) * 1000);
      await sleep(wait);
      return narrateOne(ev, cfg, timeoutMs, retriesLeft - 1);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText}${body ? ": " + body.slice(0, 200) : ""}`);
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    const u = data?.usage || {};
    if (!text) throw new Error("provider responded 200 OK but with no message content in the response");
    return { text: text.trim(), tokensIn: u.prompt_tokens || 0, tokensOut: u.completion_tokens || 0 };
  } finally {
    clearTimeout(timer);
    if (needsInsecure) { if (prevTls === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED; else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevTls; }
  }
}

// Enrich evidence in place. Returns {used, provider, ok, total, tokensIn, tokensOut, calls} —
// tokensIn/tokensOut/calls are the REAL measured usage summed across every live call this
// run made (only meaningful when used !== "template"), not the engine's modeled estimate.
// Calls are staggered (not all fired at once) — free-tier keys have low per-minute/
// per-second request quotas, and a burst of a dozen concurrent calls trips them
// even though the account has plenty of quota once spread out.
async function enrichEvidence(evidence, overrideKey) {
  const cfg = overrideKey ? resolveConfig(overrideKey) : (resolveProviders()[0] || null);
  if (!cfg || !(cfg.base && cfg.key)) return { used: "template", provider: "template", ok: 0, total: evidence.length, tokensIn: 0, tokensOut: 0, calls: 0 };
  let ok = 0, tokensIn = 0, tokensOut = 0, lastError = null;
  const CONCURRENCY = 3, STAGGER_MS = 400;
  // The TLS-relaxation escape hatch (ALLOW_INSECURE_TLS) now lives inside
  // narrateOne itself, scoped per-call — no need to toggle it around this
  // whole batch. narrateOne throws on failure now (real diagnostic detail
  // instead of a swallowed null), so each call is caught individually here:
  // one bad item shouldn't abort the rest of the batch, same as before.
  for (let i = 0; i < evidence.length; i += CONCURRENCY) {
    const batch = evidence.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (ev, j) => {
      if (j) await sleep(j * STAGGER_MS);
      try {
        const r = await narrateOne(ev, cfg);
        ev.llmExplanation = r.text; ev.explanationSource = cfg.label;
        ev.tokensIn = r.tokensIn; ev.tokensOut = r.tokensOut; ok++; tokensIn += r.tokensIn; tokensOut += r.tokensOut;
      } catch (e) { lastError = e.message; }
    }));
  }
  return { used: ok ? cfg.label : "template", provider: cfg.label, model: cfg.model, ok, total: evidence.length,
    tokensIn, tokensOut, calls: ok, error: ok ? null : lastError };
}

// Grounded Q&A: answer a question using ONLY the supplied UNAI content (RAG).
async function answerGrounded(question, context, cfg, timeoutMs = 15000) {
  const sys = "You are the UNAI product assistant. Answer the user's question in a clear, detailed business narrative " +
    "using ONLY the CONTEXT below. Do not invent facts, numbers, or features not in the context. If the context is " +
    "insufficient, say so and suggest what to ask. Keep it well-structured (2-4 short paragraphs), no preamble.";
  // ECONOMIZE: the CONTEXT envelope is the large, reused part. Put it in the
  // system position and mark it cacheable so repeat questions over the same
  // context hit the prompt cache (Claude natively; gateways when enabled)
  // instead of re-billing the whole envelope every call. Only the short
  // QUESTION varies between calls. Claude auto-caches the system block even
  // without the gateway flag; the flag opts non-Claude gateways in too.
  const cacheOn = /^(1|true|on|yes)$/i.test(process.env.GATEWAY_PROMPT_CACHE || "");
  context = compressContext(context);                       // QUICK WIN: trim/dedupe the reused envelope
  const envelope = sys + "\n\nCONTEXT:\n" + context;
  const sysMsg = cacheOn
    ? { role: "system", content: [ { type: "text", text: envelope, cache_control: { type: "ephemeral" } } ] }
    : { role: "system", content: envelope };
  const r = await chatWithFailover([ sysMsg, { role: "user", content: "QUESTION: " + question } ],
    { temperature: 0.2, max_tokens: 500, timeoutMs, tier: "medium" });   // quota-aware + tier routing
  return r;   // {content, provider, model, tokensIn/out, cacheRead/Write, ...} — null content if all failed
}

// NL → read-only SQL over the connected warehouse, grounded in its live schema.
async function nlToSql(question, schema, cfg, timeoutMs = 15000) {
  const cat = schema.catalog || "", sch = schema.schema || "", tbls = schema.tables || {};
  const qualify = (schema.source === "bigquery")
    ? `Fully-qualify tables as \`${cat}.${sch}.TABLE\` (backticks).`
    : `Fully-qualify tables as ${cat}.${sch}.TABLE.`;
  const schemaText = Object.keys(tbls).map(t => `${t}(${(tbls[t] || []).join(", ")})`).join("\n");
  const sys = "You translate a business question into ONE read-only SQL SELECT for the given warehouse. " +
    "Rules: output SQL ONLY (no prose, no code fences). A single statement. SELECT or WITH only — never " +
    "INSERT/UPDATE/DELETE/DDL. Always include a LIMIT (<=200). Use ONLY the tables/columns listed. " + qualify;
  const r = await chatWithFailover([ { role: "system", content: sys },
      { role: "user", content: "SCHEMA:\n" + schemaText + "\n\nQUESTION: " + question + "\n\nSQL:" } ],
    { temperature: 0, max_tokens: 400, timeoutMs, tier: "simple" });   // light task → cheaper model
  let sql = (r.content || "").replace(/```sql/gi, "").replace(/```/g, "").trim();
  if (!sql) throw new Error("no LLM available (tried: " + ((r.tried || []).join(", ") || "none") + ")");
  return sql;
}

module.exports = { enrichEvidence, narrateOne, resolveConfig, resolveProviders, chatWithFailover, chatJSON, safeJsonParse, answerGrounded, nlToSql, LLM_REGISTRY, PRESETS, pickTier, compressContext };
