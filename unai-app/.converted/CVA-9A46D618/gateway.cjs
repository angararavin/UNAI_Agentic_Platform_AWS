// ==========================================================================
// gateway.js — the native UNAI AI Gateway.
//
// Sits under llm.js and turns "a list of providers, one key each" into an
// intelligently routed pool: MANY keys per provider, key ROTATION, per-key
// COOLDOWN on rate limits, LOAD-BALANCING across models, COMPLEXITY-based model
// selection, BUDGET/spend awareness, health tracking and full telemetry.
//
// Design goals:
//  • Multiple keys per provider — set MISTRAL_API_KEYS="k1,k2,k3" (plural) or the
//    existing single MISTRAL_API_KEY. Keys are rotated round-robin; a key that
//    hits 429/5xx is cooled down and the next key is used automatically.
//  • Load-balance vs failover vs cost — LLM_ROUTER_POLICY = balance | cost | failover.
//  • Complexity routing — a request's tier (simple|medium|complex) can prefer a
//    different set of providers: LLM_TIER_SIMPLE_PROVIDERS="groq,gemini" etc.
//  • Budget — cap spend or calls per provider: LLM_BUDGET_MISTRAL_USD=5,
//    LLM_BUDGET_MISTRAL_CALLS=1000. Over-budget providers are skipped.
//  • Telemetry — every routed call is recorded (provider, key #, model, tier,
//    tokens, cost, latency, outcome) and summarised by gatewayStats().
//
// Backward compatible: with a single key and no policy env set, behaviour is the
// same ordered failover llm.js already had. State is in-memory (per process);
// back it with the tenant store/Redis for multi-instance deployments.
// ==========================================================================

// ---- Rate card (per 1M tokens, USD). Used for budget + spend telemetry. ----
// Approximate published list prices; override any with LLM_PRICE_<MODEL_KEY>_IN/OUT.
// Matched by substring so "claude-haiku-4-5-..." picks the "claude-haiku" row.
const RATE_CARD = [
  ["claude-3-5-sonnet", 3.0, 15.0], ["claude-sonnet", 3.0, 15.0], ["claude-3-7-sonnet", 3.0, 15.0],
  ["claude-3-5-haiku", 0.8, 4.0],   ["claude-haiku", 0.8, 4.0],
  ["claude-3-opus", 15.0, 75.0],    ["claude-opus", 15.0, 75.0],
  ["gpt-4o-mini", 0.15, 0.60],      ["gpt-4o", 2.5, 10.0],  ["gpt-4.1-mini", 0.40, 1.60], ["gpt-4.1", 2.0, 8.0],
  ["o1-mini", 1.1, 4.4],
  ["mistral-small", 0.20, 0.60],    ["mistral-large", 2.0, 6.0], ["mistral-medium", 0.40, 2.0],
  ["gemini-1.5-flash", 0.075, 0.30], ["gemini-2.0-flash", 0.10, 0.40], ["gemini-1.5-pro", 1.25, 5.0],
  ["llama-3.1-8b", 0.05, 0.08],     ["llama-3.3-70b", 0.59, 0.79], ["llama-3.1-70b", 0.59, 0.79],
  ["deepseek-chat", 0.27, 1.10],
];
function rateFor(model) {
  const m = String(model || "").toLowerCase();
  const row = RATE_CARD.find(r => m.includes(r[0]));
  let inR = row ? row[1] : 0.5, outR = row ? row[2] : 1.5;   // sane default for unknown models
  // per-model env override, key = model uppercased, non-alnum -> _
  const K = m.replace(/[^a-z0-9]+/g, "_").toUpperCase();
  if (process.env["LLM_PRICE_" + K + "_IN"]) inR = parseFloat(process.env["LLM_PRICE_" + K + "_IN"]);
  if (process.env["LLM_PRICE_" + K + "_OUT"]) outR = parseFloat(process.env["LLM_PRICE_" + K + "_OUT"]);
  return { inR, outR };
}
function costUsd(model, tokIn, tokOut) {
  const { inR, outR } = rateFor(model);
  return (tokIn || 0) / 1e6 * inR + (tokOut || 0) / 1e6 * outR;
}

// ---- Runtime config (set from the UI; overrides env) --------------------
// The Governance → Gateway panel writes here so keys / policy / budgets /
// tier-prefs can be managed without editing env. Env remains the fallback.
// Keys live only in process memory (never written to disk), same as the
// session-key feature.
const CONFIG = { keys: {}, budgets: {}, policy: null, tierPrefs: {}, order: null };
function setKeys(provider, keys) {
  provider = String(provider || "").toLowerCase();
  const list = (Array.isArray(keys) ? keys : String(keys || "").split(/[,\s]+/)).map(s => String(s).trim()).filter(Boolean);
  if (list.length) CONFIG.keys[provider] = list; else delete CONFIG.keys[provider];
  delete POOLS[provider];                       // reset pool so removed keys drop out
  if (list.length) pool(provider, list);        // re-seed
  return list.length;
}
function setBudget(provider, usd, calls) {
  provider = String(provider || "").toLowerCase();
  const b = {}; if (usd != null && usd !== "") b.usd = parseFloat(usd); if (calls != null && calls !== "") b.calls = parseInt(calls, 10);
  if (Object.keys(b).length) CONFIG.budgets[provider] = b; else delete CONFIG.budgets[provider];
  try { scheduleFlush(); } catch (_) {}
}
function setPolicy(p) { CONFIG.policy = (["failover", "balance", "cost"].includes(p) ? p : null); try { scheduleFlush(); } catch (_) {} }
function setTierProviders(tier, providers) {
  tier = String(tier || "").toLowerCase();
  const list = (Array.isArray(providers) ? providers : String(providers || "").split(/[,\s]+/)).map(s => String(s).trim().toLowerCase()).filter(Boolean);
  if (list.length) CONFIG.tierPrefs[tier] = list; else delete CONFIG.tierPrefs[tier];
  try { scheduleFlush(); } catch (_) {}
}
function setOrder(order) {
  const list = (Array.isArray(order) ? order : String(order || "").split(/[,\s]+/)).map(s => String(s).trim().toLowerCase()).filter(Boolean);
  CONFIG.order = list.length ? list : null;
  try { scheduleFlush(); } catch (_) {}
}
// Masked view of the current config for the UI (never returns full keys).
function getConfig() {
  const providers = {};
  Object.keys(CONFIG.keys).forEach(p => providers[p] = { keys: CONFIG.keys[p].map(k => "…" + k.slice(-4)), count: CONFIG.keys[p].length });
  return { policy: policy(), order: routerOrder(), keys: providers, budgets: CONFIG.budgets, tierPrefs: {
    simple: tierProviders("simple"), medium: tierProviders("medium"), complex: tierProviders("complex") } };
}

// ---- Key pools ----------------------------------------------------------
// One pool per provider label. Each key tracks health + usage + spend.
const POOLS = {};
const now = () => Date.now();
const COOLDOWN_MS = () => Number(process.env.LLM_KEY_COOLDOWN_MS || 45000);   // per-key rest after a 429/5xx

// Read keys for a provider label from env: plural <P>_API_KEYS (comma) first,
// then single <P>_API_KEY, then GATEWAY_API_KEYS/GATEWAY_API_KEY for "gateway".
function envKeysFor(label) {
  label = String(label || "").toLowerCase();
  if (CONFIG.keys[label] && CONFIG.keys[label].length) return CONFIG.keys[label].slice();   // UI-set keys win
  const P = label.toUpperCase();
  const raw = process.env[P + "_API_KEYS"] || process.env[P + "_API_KEY"] ||
    (label === "gateway" ? (process.env.GATEWAY_API_KEYS || process.env.GATEWAY_API_KEY) : "") ||
    (label === "anthropic" ? (process.env.CLAUDE_API_KEYS || process.env.CLAUDE_API_KEY) : "") || "";
  return String(raw).split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
}
// Effective router order: UI order, else env LLM_ROUTER_ORDER, plus any provider
// that has UI-set keys (so adding keys in the UI makes that provider usable).
function routerOrder() {
  let base = CONFIG.order || (process.env.LLM_ROUTER_ORDER || "openai,mistral").split(/[,\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
  base = base.map(n => n === "claude" ? "anthropic" : n);
  Object.keys(CONFIG.keys).forEach(p => { if (!base.includes(p)) base.push(p); });
  return base;
}
function pool(label, keysHint) {
  let pl = POOLS[label];
  const wanted = (keysHint && keysHint.length) ? keysHint : envKeysFor(label);
  if (!pl) { pl = POOLS[label] = { rr: 0, keys: [] }; }
  // add any new keys we haven't seen (so a runtime key-set is picked up)
  wanted.forEach(k => { if (!pl.keys.some(e => e.key === k)) pl.keys.push({ key: k, coolUntil: 0, fails: 0, calls: 0, tokIn: 0, tokOut: 0, costUsd: 0, last: 0 }); });
  return pl;
}
function keyHealthy(e) { return e.coolUntil <= now(); }
function providerHealthy(label, keysHint) { return pool(label, keysHint).keys.some(keyHealthy); }

// Pick the next usable key for a provider: least-recently-used among healthy keys
// (round-robin fairness). Returns the key entry or null if all are cooling down.
function pickKey(label, keysHint) {
  const pl = pool(label, keysHint);
  const healthy = pl.keys.filter(keyHealthy);
  if (!healthy.length) return null;
  healthy.sort((a, b) => a.last - b.last);   // LRU → even spread across keys
  const e = healthy[0]; e.last = now(); return e;
}

// Report the outcome of a call so the pool can cool down / meter spend.
function reportResult(label, keyStr, { ok, status, model, tokensIn, tokensOut }) {
  const pl = POOLS[label]; if (!pl) return;
  const e = pl.keys.find(x => x.key === keyStr); if (!e) return;
  e.calls++;
  if (ok) { e.fails = 0; e.tokIn += tokensIn || 0; e.tokOut += tokensOut || 0; e.costUsd += costUsd(model, tokensIn, tokensOut); }
  else if (status === 429 || (status >= 500) || status === "timeout") { e.fails++; e.coolUntil = now() + COOLDOWN_MS() * Math.min(e.fails, 4); }
  try { scheduleFlush(); } catch (_) {}   // persist meters/cooldown to the shared store (if configured)
}

// ---- Budget -------------------------------------------------------------
// Per-provider caps from env (or set at runtime). Over-budget → provider skipped.
function budgetFor(label) {
  label = String(label || "").toLowerCase();
  if (CONFIG.budgets[label]) return { usd: CONFIG.budgets[label].usd ?? null, calls: CONFIG.budgets[label].calls ?? null };
  const P = label.toUpperCase();
  return { usd: process.env["LLM_BUDGET_" + P + "_USD"] ? parseFloat(process.env["LLM_BUDGET_" + P + "_USD"]) : null,
    calls: process.env["LLM_BUDGET_" + P + "_CALLS"] ? parseInt(process.env["LLM_BUDGET_" + P + "_CALLS"], 10) : null };
}
function providerSpend(label) {
  const pl = POOLS[label]; if (!pl) return { usd: 0, calls: 0 };
  return pl.keys.reduce((a, e) => ({ usd: a.usd + e.costUsd, calls: a.calls + e.calls }), { usd: 0, calls: 0 });
}
function overBudget(label) {
  const b = budgetFor(label), s = providerSpend(label);
  return (b.usd != null && s.usd >= b.usd) || (b.calls != null && s.calls >= b.calls);
}

// ---- Tier → provider preference -----------------------------------------
// Complexity routing at the PROVIDER level (not just the model): a tier can
// prefer a subset of providers. LLM_TIER_SIMPLE_PROVIDERS="groq,gemini".
function tierProviders(tier) {
  tier = String(tier || "").toLowerCase();
  if (CONFIG.tierPrefs[tier] && CONFIG.tierPrefs[tier].length) return CONFIG.tierPrefs[tier].slice();
  const raw = process.env["LLM_TIER_" + tier.toUpperCase() + "_PROVIDERS"];
  return raw ? raw.split(/[,\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean) : null;
}

// ---- Routing ------------------------------------------------------------
// Given the ordered provider candidates (from llm.js resolveProviders) and the
// request tier, return the order in which to ATTEMPT them, applying: tier
// preference, health (skip all-cooled), budget (skip over-budget), and the
// load-balance policy.
//   policy = failover (default) → keep given order (cheapest/first wins, stable)
//          = balance            → round-robin + least-loaded (scatter traffic)
//          = cost               → cheapest healthy provider for its model first
function policy() { return (CONFIG.policy || process.env.LLM_ROUTER_POLICY || "failover").toLowerCase(); }

let _rr = 0;
function routeOrder(candidates, tier) {
  // candidates: [{label, model, kind, base, keys?}]
  let list = candidates.filter(p => providerHealthy(p.label, p.keys) && !overBudget(p.label));
  if (!list.length) list = candidates.slice();   // everything cooling/over-budget → try anyway (better than nothing)

  const pref = tierProviders(tier);
  if (pref) {
    const inPref = list.filter(p => pref.includes(p.label));
    const rest = list.filter(p => !pref.includes(p.label));
    // order preferred by the tier list, then the rest as fallback
    inPref.sort((a, b) => pref.indexOf(a.label) - pref.indexOf(b.label));
    list = inPref.concat(rest);
    if (inPref.length) return applyPolicyWithinHead(list, inPref.length);
  }
  return applyPolicy(list);
}
function applyPolicy(list) {
  const pol = policy();
  if (pol === "cost") {
    return list.slice().sort((a, b) => { const ca = rateFor(a.model), cb = rateFor(b.model);
      return (ca.inR + ca.outR) - (cb.inR + cb.outR); });
  }
  if (pol === "balance") {
    // rotate the starting point (round-robin) then prefer least-loaded providers
    const spun = list.slice(_rr % list.length).concat(list.slice(0, _rr % list.length)); _rr++;
    return spun.sort((a, b) => providerSpend(a.label).calls - providerSpend(b.label).calls);
  }
  return list;   // failover: given order, stable
}
// When a tier preference exists, load-balance ONLY within the preferred head,
// keeping the fallback tail in order.
function applyPolicyWithinHead(list, headLen) {
  const head = applyPolicy(list.slice(0, headLen));
  return head.concat(list.slice(headLen));
}

// ---- Telemetry ----------------------------------------------------------
const LOG = []; const LOG_CAP = 1000;
function recordAttempt(rec) { LOG.push(Object.assign({ ts: new Date().toISOString() }, rec)); if (LOG.length > LOG_CAP) LOG.shift(); }
function gatewayStats() {
  const providers = Object.keys(POOLS).map(label => {
    const pl = POOLS[label]; const s = providerSpend(label); const b = budgetFor(label);
    return { provider: label, keys: pl.keys.length,
      keysHealthy: pl.keys.filter(keyHealthy).length,
      calls: s.calls, costUsd: +s.usd.toFixed(6),
      budgetUsd: b.usd, budgetCalls: b.calls, overBudget: overBudget(label),
      perKey: pl.keys.map((e, i) => ({ k: i + 1, tail: e.key.slice(-4), calls: e.calls, costUsd: +e.costUsd.toFixed(6),
        cooling: !keyHealthy(e), coolMsLeft: Math.max(0, e.coolUntil - now()), fails: e.fails })) };
  });
  const recent = LOG.slice(-25).reverse();
  const totals = providers.reduce((a, p) => ({ calls: a.calls + p.calls, costUsd: a.costUsd + p.costUsd }), { calls: 0, costUsd: 0 });
  return { policy: policy(), providers, totals: { calls: totals.calls, costUsd: +totals.costUsd.toFixed(6) },
    tierPrefs: { simple: tierProviders("simple"), medium: tierProviders("medium"), complex: tierProviders("complex") },
    store: storeStatus(), recent };
}
function resetStats() { Object.keys(POOLS).forEach(k => delete POOLS[k]); LOG.length = 0; }

// ==========================================================================
// Distributed state — shared store so budgets / cooldowns / rotation stay
// CONSISTENT across multiple UNAI instances behind a load balancer.
//
// What is shared: the COORDINATION state only — per-provider/per-key METERS
// (calls, spend, cooldown, fails) keyed by the key's LAST-4 digits, plus the
// non-secret CONFIG (policy, budgets, tier prefs, order). The RAW API KEYS are
// NEVER written to the store or disk; each instance still holds its own keys
// (env or the in-memory UI pool). Instances reconcile meters by key-tail.
//
// Adapters (GATEWAY_STORE): "memory" (default, single instance), "file"
// (GATEWAY_STORE_PATH JSON — durable across restarts / shared volume), or
// "redis" (REDIS_URL, needs `npm i ioredis`; falls back with a warning if
// the module isn't installed).
// ==========================================================================
const STORE_MODE = (process.env.GATEWAY_STORE ||
  (process.env.REDIS_URL ? "redis" : (process.env.GATEWAY_STORE_PATH ? "file" : "memory"))).toLowerCase();
const STORE_KEY = "unai:gateway:state";
let _redis = null, _storeReady = false, _flushTimer = null;

function snapshot() {
  const meters = {};
  Object.keys(POOLS).forEach(label => { meters[label] = {};
    POOLS[label].keys.forEach(e => { meters[label][e.key.slice(-4)] = {
      calls: e.calls, costUsd: e.costUsd, coolUntil: e.coolUntil, fails: e.fails, tokIn: e.tokIn, tokOut: e.tokOut }; }); });
  return { v: 1, ts: Date.now(),
    config: { policy: CONFIG.policy, budgets: CONFIG.budgets, tierPrefs: CONFIG.tierPrefs, order: CONFIG.order },
    meters };   // NOTE: no raw keys — only key-tails as meter ids
}
function restore(obj) {
  if (!obj || typeof obj !== "object") return;
  if (obj.config) { const c = obj.config;
    if (c.policy !== undefined) CONFIG.policy = c.policy;
    if (c.budgets) CONFIG.budgets = c.budgets;
    if (c.tierPrefs) CONFIG.tierPrefs = c.tierPrefs;
    if (c.order !== undefined) CONFIG.order = c.order; }
  if (obj.meters) { Object.keys(obj.meters).forEach(label => { const pl = POOLS[label]; if (!pl) return;
    pl.keys.forEach(e => { const m = obj.meters[label][e.key.slice(-4)]; if (!m) return;
      // take the MORE-restrictive / higher values so budgets & cooldowns hold across instances
      e.calls = Math.max(e.calls, m.calls || 0); e.costUsd = Math.max(e.costUsd, m.costUsd || 0);
      e.coolUntil = Math.max(e.coolUntil, m.coolUntil || 0); e.fails = Math.max(e.fails, m.fails || 0);
      e.tokIn = Math.max(e.tokIn, m.tokIn || 0); e.tokOut = Math.max(e.tokOut, m.tokOut || 0); }); }); }
}
async function storeLoad() {
  try {
    if (STORE_MODE === "file") { const fs = require("fs"); const p = process.env.GATEWAY_STORE_PATH || "./gateway_state.json";
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8")); return null; }
    if (STORE_MODE === "redis" && _redis) { const s = await _redis.get(STORE_KEY); return s ? JSON.parse(s) : null; }
  } catch (_) {}
  return null;
}
async function storeSave(obj) {
  try {
    if (STORE_MODE === "file") { const fs = require("fs"); const p = process.env.GATEWAY_STORE_PATH || "./gateway_state.json";
      const tmp = p + ".tmp"; fs.writeFileSync(tmp, JSON.stringify(obj)); fs.renameSync(tmp, p); return; }
    if (STORE_MODE === "redis" && _redis) { await _redis.set(STORE_KEY, JSON.stringify(obj)); return; }
  } catch (_) {}
}
function scheduleFlush() {   // debounced write of coordination state
  if (STORE_MODE === "memory" || _flushTimer) return;
  _flushTimer = setTimeout(async () => { _flushTimer = null; await storeSave(snapshot()); }, 1500);
  if (_flushTimer && _flushTimer.unref) _flushTimer.unref();
}
async function storeInit() {
  if (STORE_MODE === "redis") {
    try { const Redis = require("ioredis"); _redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");
      _redis.on("error", () => {}); }
    catch (e) { console.warn("[gateway] GATEWAY_STORE=redis but ioredis is not installed (run: npm i ioredis). Falling back to in-memory — budgets/cooldowns won't be shared across instances."); }
  }
  const initial = await storeLoad(); if (initial) restore(initial); _storeReady = true;
  if (STORE_MODE !== "memory") {
    // periodically merge in other instances' meters (shared consistency).
    // unref() so this background timer never keeps a process from exiting.
    const iv = setInterval(async () => { const s = await storeLoad(); if (s) restore(s); }, Number(process.env.GATEWAY_STORE_REFRESH_MS || 5000));
    if (iv && iv.unref) iv.unref();
  }
}
function storeStatus() {
  return { mode: STORE_MODE, ready: _storeReady,
    shared: STORE_MODE !== "memory",
    detail: STORE_MODE === "redis" ? (_redis ? "redis connected" : "redis requested but ioredis missing — using memory")
      : STORE_MODE === "file" ? ("file: " + (process.env.GATEWAY_STORE_PATH || "./gateway_state.json")) : "in-memory (single instance)" };
}
if (STORE_MODE !== "memory") { storeInit().catch(() => {}); }

module.exports = {
  pool, pickKey, reportResult, providerHealthy, envKeysFor, routerOrder,
  routeOrder, policy, budgetFor, providerSpend, overBudget,
  rateFor, costUsd, recordAttempt, gatewayStats, resetStats, tierProviders,
  // runtime config (UI)
  setKeys, setBudget, setPolicy, setTierProviders, setOrder, getConfig,
  // distributed state
  snapshot, restore, storeStatus, scheduleFlush,
};
