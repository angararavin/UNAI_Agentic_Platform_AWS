// ==========================================================================
// live_benchmark.js — Node-native, in-product live token benchmark.
//
// A faithful port of supply-chain-workbench/token_benchmark.py so the platform
// can run the UNAI-vs-Gen-1 A/B *itself*, in real time, with NO external
// python3 dependency. When a key is supplied it calls the model directly and
// reports the model's OWN usage counters (prompt_tokens / completion_tokens) —
// this is a MEASURED result. With no key it falls back to a MODELED estimate
// from prompt length, so the button always produces a comparison.
//
// The scenario, prompts, cache model and output JSON shape are IDENTICAL to
// token_benchmark.py — same numbers, same report the UI already renders.
// ==========================================================================

// Per-model list pricing ($ per 1M tokens, input/output) — illustrative public
// rates. Matched by substring against the model id; override with in/out.
const MODEL_PRICES = [
  ["claude-3-5-haiku", 0.80, 4.00], ["claude-3.5-haiku", 0.80, 4.00], ["haiku", 0.80, 4.00],
  ["claude-3-5-sonnet", 3.00, 15.00], ["claude-3.5-sonnet", 3.00, 15.00], ["claude-sonnet", 3.00, 15.00], ["sonnet", 3.00, 15.00],
  ["claude-3-opus", 15.00, 75.00], ["opus", 15.00, 75.00],
  ["gpt-4o-mini", 0.15, 0.60], ["gpt-4o", 2.50, 10.00], ["gpt-4.1-mini", 0.40, 1.60], ["gpt-4.1", 2.00, 8.00],
  ["mistral-large", 2.00, 6.00], ["mistral-small", 0.20, 0.60], ["mixtral", 0.24, 0.24],
  ["llama-3.1-70b", 0.35, 0.40], ["llama", 0.20, 0.20], ["gemini-1.5-pro", 1.25, 5.00], ["gemini", 0.35, 1.05],
];
function resolvePrice(model, priceIn, priceOut) {
  if (priceIn != null && priceOut != null) return [Number(priceIn), Number(priceOut), "env override"];
  const m = String(model || "").toLowerCase();
  for (const [name, pin, pout] of MODEL_PRICES) if (m.includes(name)) return [pin, pout, "preset:" + name];
  return [0.20, 0.60, "default"];
}

// ---- the scenario: Supplier Disruption Response, 5 capabilities -------------
const CAPABILITIES = [
  ["Disruption detection", "Given supplier-risk signals, decide if a disruption is occurring and name the affected supplier."],
  ["Demand re-forecast",   "Re-forecast demand for the affected SKUs under the disruption; state the % pull-forward."],
  ["Inventory adjustment", "Recompute safety stock and flag SKUs that are short; give the gap per SKU."],
  ["Procurement action",   "Decide replacement POs (reroute to backup supplier if the primary is disrupted); note value and approval need."],
  ["Notify & explain",     "Summarize the actions taken and route anything over policy to a human, in one short paragraph."],
];

// Gen-1: every specialist re-loads this full multi-system native schema each call.
const FULL_SCHEMA = `SYSTEMS & NATIVE SCHEMAS (re-map these yourself before answering):
SAP MM (MARD): MATNR=material, WERKS=plant, LABST=unrestricted stock, EISBE=safety stock,
  MINBE=reorder point, PLIFZ=planned lead time, STPRS=standard price, LIFNR=vendor, MEINS=uom.
SAP SD (VBAP): MATNR=material, WERKS=plant, KWMENG=order quantity (open demand), NETPR=net price.
SAP FI (BSEG): LIFNR=vendor, DMBTR=amount in local currency, EBELN=purchasing document, WRBTR=amount.
SAP IBP (key figures): PRDID=product, LOCID=location, INSTBASE=installed base, AGEMNTH=asset age,
  TGTPOS=target inventory position, SAFETY=safety stock, SVCLVL=service level, FCSTQTY=forecast,
  CAPQTY=capacity, MPSQTY=master supply, ALLOCQTY=allocation, LEADTIME=lead time.
SAP S/4 (stock/refurb): MATNR, WERKS, LABST=on hand, UMLME=in transit, CAPACITY=refurb cap, COSTPU=refurb cost.
ServiceNow (x_rma_case): number=RMA id, cmdb_ci=product/CI, u_status=RMA status, u_warranty=warranty,
  u_claim_value=claim amount, u_entitled=entitlement, u_oem=manufacturer.
Analytics (BQML): sku_id, dc_code, fcst_qty, lead_time, fail_rate, age_factor, return_prob,
  yield_rate, risk (supplier_risk 0-1), region, consensus_qty, promo_uplift, inv_turns, excess_qty,
  spend_amt, supplier_score, carrier, transit_days, freight_cost, otif_pct, oee_pct.
Note: field names differ per system; you must translate MATNR/sku_id/PRDID/cmdb_ci to a product,
WERKS/dc_code/LOCID/BUKRS to a location, LABST/KWMENG/qty_on_hand to on-hand, LIFNR/vendor_id to a
supplier, u_warranty to warranty status, and so on — on every request, for every agent.`;

// UNAI: the ontology already normalized fields once; capabilities speak canonical concepts.
const CANONICAL = "CANONICAL CONCEPTS (already mapped for you): sku, plant, on_hand_qty, safety_stock, " +
  "reorder_point, open_demand, forecast_qty, supplier, lead_time_days, unit_cost, " +
  "purchase_order, supplier_risk, install_base_qty, target_stock, service_level, " +
  "warranty_status, claim_value, consensus_demand, inv_turns, excess_qty, otif, carrier.";

const GEN1_ROLE = (name) => `You are the ${name} — a standalone specialist agent. You own your own memory, ` +
  "reasoning, evidence, action and logging. Read the raw systems, translate their " +
  "native fields yourself, and act. Be precise and cite the native fields you used.";
const UNAI_SYS = "You are UNAI, one agent running on seven shared layers with a canonical ontology " +
  "and shared memory. Answer for the current capability using canonical concepts only.";

const TASK = "SKUs: FG-1001, FG-1003. Affected supplier: V-2207 (risk 0.78, APAC port strike). Keep it under 90 words.";

// prompt caching (Anthropic-style defaults; MODELED — live cache needs a cache-aware endpoint)
const CACHE_WRITE_MULT = Number(process.env.CACHE_WRITE_MULT || 1.25);
const CACHE_READ_MULT = Number(process.env.CACHE_READ_MULT || 0.10);
const tok = (s) => Math.ceil(String(s).length / 4);          // ~4 chars/token
const PREFIX_TOKENS = tok(UNAI_SYS + "\n" + CANONICAL);      // cacheable shared prefix

// One model call → real usage when live, modeled estimate otherwise.
async function callLLM(messages, ctx) {
  if (!ctx.live) {
    const chars = messages.reduce((a, m) => a + m.content.length, 0);
    return { pin: Math.ceil(chars / 4), pout: 110 };          // ~4 chars/token; assume a short answer
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ctx.timeoutMs || 60000);
  try {
    try { require("./containment.js").assertEgress(ctx.base, "benchmark"); } catch (e) { if (e.code === "EGRESS_BLOCKED") { clearTimeout(timer); throw e; } }
    const res = await fetch(ctx.base.replace(/\/$/, "") + "/chat/completions", {
      method: "POST", signal: ctrl.signal,
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + ctx.key },
      body: JSON.stringify({ model: ctx.model, messages, temperature: 0.2, max_tokens: 160 }),
    });
    if (!res.ok) throw new Error("provider " + res.status + ": " + (await res.text()).slice(0, 200));
    const u = (await res.json()).usage || {};
    return { pin: u.prompt_tokens || 0, pout: u.completion_tokens || 0 };
  } finally { clearTimeout(timer); }
}

async function runGen1(ctx) {
  const rows = [];
  for (const [name, task] of CAPABILITIES) {
    const { pin, pout } = await callLLM([
      { role: "system", content: GEN1_ROLE(name) + "\n\n" + FULL_SCHEMA },
      { role: "user", content: task + "\n" + TASK },
    ], ctx);
    rows.push([name, pin, pout]);
  }
  return rows;
}
async function runUnai(ctx) {
  const sysMsg = UNAI_SYS + "\n" + CANONICAL;
  const rows = [];
  for (const [name, task] of CAPABILITIES) {
    const { pin, pout } = await callLLM([
      { role: "system", content: sysMsg },
      { role: "user", content: "Capability: " + name + ". " + task + "\n" + TASK },
    ], ctx);
    rows.push([name, pin, pout]);
  }
  return rows;
}
function totals(rows, pIn, pOut) {
  const pin = rows.reduce((a, r) => a + r[1], 0), pout = rows.reduce((a, r) => a + r[2], 0);
  return [pin, pout, pin + pout, pin / 1e6 * pIn + pout / 1e6 * pOut];
}
function cachedTotals(un, pIn, pOut) {
  let billedIn = 0; const out = un.reduce((a, r) => a + r[2], 0);
  un.forEach(([, pin], idx) => {
    const prefix = Math.min(PREFIX_TOKENS, pin), rest = pin - prefix;
    billedIn += prefix * (idx === 0 ? CACHE_WRITE_MULT : CACHE_READ_MULT) + rest;
  });
  const cost = billedIn / 1e6 * pIn + out / 1e6 * pOut;
  return [Math.round(billedIn), out, Math.round(billedIn) + out, cost];
}

// Runs the A/B and returns the SAME report object token_benchmark.py writes.
async function runLiveBenchmark(opts = {}) {
  const key = (opts.key || "").trim();
  const base = (opts.base || "https://api.mistral.ai/v1").trim();
  const model = (opts.model || "mistral-small-latest").trim();
  const live = !!key;
  const [PRICE_IN, PRICE_OUT, PRICE_SRC] = resolvePrice(model, opts.priceIn, opts.priceOut);
  const ctx = { live, base, key, model, timeoutMs: opts.timeoutMs };

  const g1 = await runGen1(ctx), un = await runUnai(ctx);
  const g1t = totals(g1, PRICE_IN, PRICE_OUT), unt = totals(un, PRICE_IN, PRICE_OUT);
  const cnt = cachedTotals(un, PRICE_IN, PRICE_OUT);
  const saved = g1t[2] ? Math.round(100 * (1 - unt[2] / g1t[2])) : 0;
  const costSaved = g1t[3] - unt[3];
  const cachedCostSaved = g1t[3] - cnt[3];

  const gen1SchemaPerCall = tok(FULL_SCHEMA);
  const unaiCanonicalTokens = tok(CANONICAL);
  const gen1_rows = [], unai_rows = [];
  CAPABILITIES.forEach(([name, task], i) => {
    const [, gi, go] = g1[i];
    gen1_rows.push({ agent: name, in: gi, out: go, total: gi + go,
      cost: +(gi / 1e6 * PRICE_IN + go / 1e6 * PRICE_OUT).toFixed(6),
      schema_in_modeled: tok(GEN1_ROLE(name) + "\n\n" + FULL_SCHEMA), task_in_modeled: tok(task + "\n" + TASK) });
    const [, ui, uo] = un[i];
    unai_rows.push({ agent: name, in: ui, out: uo, total: ui + uo,
      cost: +(ui / 1e6 * PRICE_IN + uo / 1e6 * PRICE_OUT).toFixed(6),
      shared_in_modeled: tok(UNAI_SYS + "\n" + CANONICAL), task_in_modeled: tok("Capability: " + name + ". " + task + "\n" + TASK) });
  });

  return {
    mode: live ? "live" : "modeled", model,
    engine: "node-native",                                  // provenance: no python3 used
    gen1_rows, unai_rows,
    explain: {
      calls: CAPABILITIES.length,
      gen1_schema_tokens_per_call: gen1SchemaPerCall,
      gen1_repeated_schema_total: gen1SchemaPerCall * CAPABILITIES.length,
      unai_canonical_tokens_per_call: unaiCanonicalTokens,
      unai_shared_prefix_tokens: PREFIX_TOKENS,
      note: "Gen-1 re-sends the full multi-system schema on every call (the 'repeated schema tax'); " +
        "UNAI mapped fields to canonical concepts once, so each call carries only the concept list " +
        "+ the task. Per-call totals are measured (live); the schema/task split is modeled from prompt text.",
    },
    price_in: PRICE_IN, price_out: PRICE_OUT, price_src: PRICE_SRC,
    cost_per_completed_task: { gen1: +g1t[3].toFixed(5), unai: +unt[3].toFixed(5), unai_cached: +cnt[3].toFixed(5),
      note: "cost-per-outcome — TrueFoundry enterprise benchmark dimension 2" },
    gen1: { in: g1t[0], out: g1t[1], total: g1t[2], cost: +g1t[3].toFixed(5) },
    unai: { in: unt[0], out: unt[1], total: unt[2], cost: +unt[3].toFixed(5) },
    unai_cached: { effective_in: cnt[0], out: cnt[1], effective_total: cnt[2], cost: +cnt[3].toFixed(5),
      prefix_tokens: PREFIX_TOKENS, write_mult: CACHE_WRITE_MULT, read_mult: CACHE_READ_MULT, modeled: true },
    tokens_saved_pct: saved, cost_saved_per_run: +costSaved.toFixed(5), cost_saved_per_run_cached: +cachedCostSaved.toFixed(5),
  };
}

module.exports = { runLiveBenchmark };
