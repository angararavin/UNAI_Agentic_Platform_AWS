/* tokenCompare.cjs — REAL (measured, not modeled) per-run token comparison:
 * what the original app's one bespoke LLM call would have cost (exact prompt
 * text ported from the source agent, tokenized for real) vs. what UNAI's
 * single shared explainability prompt would cost for the same decision. The
 * original side is always a local measurement (that prompt is never sent
 * anywhere here). The UNAI side tries a REAL call first — see
 * liveNarration.cjs — using whatever provider key is configured (e.g.
 * MISTRAL_API_KEY); with no key configured, or on any failure, it falls
 * back to a local token estimate instead. Either way, this module never
 * changes what any agent actually computes.
 */
"use strict";
const { encode } = require("gpt-tokenizer");
const { narrateReal, resolveConfig } = require("./liveNarration.cjs");
const tok = s => encode(String(s == null ? "" : s)).length;

// Exact prompt text ported from server/agents/{demand,supply,planner}-agent.ts
// — parameterized by this run's real payload, so the measurement reflects
// what THIS run would actually have cost, not a fixed example.
const PROMPTS = {
  demand: (p) => ({
    systemInstruction: `You are the specialized Demand Analyst Agent in an enterprise supply chain multi-agent system.
Your mission:
1. Analyze forecasted demand against actual customer orders and the sudden demand surge.
2. Quantify the demand change (surge delta, percentage spike, deviation from baseline daily forecast).
3. Explain the underlying demand signal, root drivers, customer tier importance, and demand pattern.
4. Output strictly valid JSON conforming to this schema:
{
  "surgeDeltaUnits": number,
  "surgePercentage": number,
  "demandPattern": "Step Change" | "Sudden Impulse Spike" | "Sustained Elevation" | "Promotional Distortion",
  "underlyingSignals": string[],
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "demandDrivers": string[],
  "historicalComparison": string,
  "demandExplanation": string
}`,
    prompt: `Analyze the following Demand Surge Event:
SKU: ${p.item.sku} - ${p.item.name}
Category: ${p.item.category}
Customer Segment: ${p.item.customerSegment}
Baseline Daily Forecast: ${p.item.baselineDailyForecast} units/day
Forecast Horizon: ${p.surgeInput.targetFulfillmentDays} days
Total Expected Baseline in Horizon: ${p.baselineUnitsInPeriod} units

Surge Order Parameters:
Surge Quantity Requested: ${p.surgeInput.surgeQuantity} units
Requested Fulfillment Horizon: ${p.surgeInput.targetFulfillmentDays} days
Customer Name: ${p.surgeInput.customerName || 'Strategic Enterprise Account'}
Customer Priority: ${p.surgeInput.customerPriority || 'High'}
Trigger Reason: ${p.surgeInput.triggerReason || 'Unanticipated Customer Capacity Expansion'}
Planner Notes: ${p.surgeInput.notes || 'None provided'}

Recent Prior Orders:
${JSON.stringify(p.item.recentCustomerOrders, null, 2)}

Calculate the exact demand metrics and provide a rigorous demand analysis in JSON.`,
  }),
  supply: (p) => ({
    systemInstruction: `You are the specialized Supply Impact Analyst Agent in an enterprise supply chain multi-agent system.
Your mission:
1. Evaluate the identified demand surge against current on-hand inventory, safety stock, open purchase orders, supplier delivery timelines, and production capacity.
2. Identify potential stockouts, material shortages, capacity bottlenecks, and supplier lead time constraints.
3. Compute capacity utilization and delivery risk.
4. Output strictly valid JSON conforming to this schema:
{
  "netInventoryBalance": number,
  "projectedStockoutDays": number | null,
  "stockoutSeverity": "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "openPoContributionUnits": number,
  "poArrivalTimingAssessment": string,
  "supplierLeadTimeConstraint": string,
  "productionFeasibility": "FEASIBLE" | "PARTIALLY_FEASIBLE" | "BOTTLENECKED" | "INFEASIBLE",
  "capacityUtilizationBeforeSurge": number,
  "capacityUtilizationAfterSurge": number,
  "capacityShortfallUnits": number,
  "criticalComponentsAtRisk": string[],
  "financialExposureEstimateUsd": number,
  "bottleneckSummary": string
}`,
    prompt: `Evaluate the supply impact for:
SKU: ${p.item.sku} - ${p.item.name}
Unit Cost: $${p.item.unitCost}
Surge Demand: ${p.surgeInput.surgeQuantity} units requested in ${p.surgeInput.targetFulfillmentDays} days
Demand Analysis Output: ${JSON.stringify(p.demandAnalysis, null, 2)}

Current Inventory State:
- On-hand Inventory: ${p.item.currentInventory} units
- Reserved Inventory: ${p.item.reservedInventory} units
- Safety Stock Threshold: ${p.item.safetyStock} units
- Effective Free Inventory: ${p.effectiveInventory} units
- Warehouse: ${p.item.warehouseLocation}

Open Purchase Orders:
${JSON.stringify(p.item.openPurchaseOrders, null, 2)}

Primary Supplier Profile:
- Supplier: ${p.item.supplier.name}
- Standard Lead Time: ${p.surgeInput.overrideSupplierLeadDays || p.item.supplier.leadTimeDays} days
- Expedited Lead Time: ${p.item.supplier.expediteLeadTimeDays} days
- Expedite Available: ${p.item.supplier.expediteAvailable}
- Expedite Surcharge: $${p.item.supplier.expediteCostPerUnit}/unit
- Reliability: ${p.item.supplier.reliabilityRating}%

Production Capacity:
- Line: ${p.item.productionCapacity.lineName} (${p.item.productionCapacity.lineId})
- Max Daily Capacity: ${p.plantDailyCapacity} units/day
- Current Allocated Capacity: ${p.currentDailyAllocated} units/day
- Daily Headroom: ${Math.max(0, p.plantDailyCapacity - p.currentDailyAllocated)} units/day
- Scheduled Line Maintenance: ${p.item.productionCapacity.maintenanceScheduledDays ? `In ${p.item.productionCapacity.maintenanceScheduledDays} days` : 'None in horizon'}

Calculate accurate supply feasibility metrics and return the structured JSON assessment.`,
  }),
  planner: (p) => ({
    systemInstruction: `You are the specialized Planner Recommendation Agent in an enterprise supply chain multi-agent system.
Your mission:
1. Combine the demand analysis (surge magnitude, signals, drivers) and supply impact analysis (inventory shortfall, PO schedules, line capacity bottlenecks).
2. Formulate a crisp executive summary for the supply chain planner.
3. Recommend concrete, operational next actions (such as reviewing supplier commitments, expediting supply, reassessing production allocation, customer rationing, drawing safety stock).
4. Assign owners, urgency deadlines, estimated costs, and trade-offs for each action.
5. Output strictly valid JSON conforming to this schema:
{
  "executiveSummary": string,
  "overallCriticality": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "primaryRecommendedStrategy": string,
  "actionMatrix": Array<{ "id": string, "category": "SUPPLIER_EXPEDITE" | "PRODUCTION_REALLOCATION" | "SAFETY_STOCK_DRAW" | "CUSTOMER_RATIONING" | "ALTERNATE_SOURCING", "title": string, "description": string, "owner": string, "urgency": "IMMEDIATE" | "WITHIN_24_HOURS" | "WITHIN_48_HOURS" | "NEXT_CYCLE", "estimatedCostImpactUsd": number, "expectedUnitsRecovered": number }>,
  "tradeoffsAndRisks": string[],
  "customerCommunicationStrategy": string,
  "followUpTrigger": string
}`,
    prompt: `Synthesize actionable recommendations for planner:
SKU: ${p.item.sku} - ${p.item.name}
Surge Request: ${p.surgeInput.surgeQuantity} units in ${p.surgeInput.targetFulfillmentDays} days
Customer: ${p.surgeInput.customerName || 'Enterprise Client'} (Priority: ${p.surgeInput.customerPriority || 'High'})

Demand Analyst Assessment:
${JSON.stringify(p.demandAnalysis, null, 2)}

Supply Impact Analyst Assessment:
${JSON.stringify(p.supplyAnalysis, null, 2)}

Supplier Details:
- Name: ${p.item.supplier.name}
- Standard Lead: ${p.item.supplier.leadTimeDays}d | Expedited: ${p.item.supplier.expediteLeadTimeDays}d ($${p.item.supplier.expediteCostPerUnit}/unit)
- Expedite Feasible: ${p.item.supplier.expediteAvailable}

Generate high-caliber, practical supply chain planner recommendations in valid JSON.`,
  }),
};

// UNAI's real shared explainability prompt (verbatim from llm.js buildPrompt)
// — measured here, never actually sent, since the estimate path doesn't call an LLM by default.
function unaiPromptFor(ev) {
  const drivers = (ev.attribution || []).map(d => `- ${d.name}: ${Math.round(d.share * 100)}% of the decision`).join("\n");
  return "You are the Explainability layer of an autonomous supply-chain agent. " +
    "Write ONE concise business-English sentence (max 40 words) explaining this decision to a planner. " +
    "Use ONLY the facts below; do not invent numbers. State whether it executed autonomously or was routed to a human, and why.\n\n" +
    `Decision: ${ev.decision}\nConfidence: ${Math.round(ev.confidence * 100)}% (uncertainty ${ev.uncertainty})\n` +
    `Autonomy threshold: ${Math.round((ev.threshold || 0.85) * 100)}%\nDrivers:\n${drivers}\n` +
    `Outcome: ${ev.autonomous ? "executed autonomously" : "routed to a human approver"}\n` +
    (ev.gate ? `Governance gate: ${ev.gate}\n` : "");
}
const UNAI_COMPLETION_CAP = 40;

/**
 * Real, per-run token comparison. `uiResult` must be the fully-built result
 * object BEFORE this comparison is attached to it (so the completion-size
 * proxy reflects only what the original app's schema actually asks for).
 */
// L1..L7 in the fixed order engine.js's own Layers class tracks them --
// matches res.observability.layerTokens' array order exactly.
const LAYER_IDS = ["L1", "L2", "L3", "L4", "L5", "L6", "L7"];
function buildPerLayerTokens(layerInfo) {
  if (!layerInfo || !Array.isArray(layerInfo.layers)) return null;
  return layerInfo.layers.map((l, i) => ({ id: LAYER_IDS[i] || `L${i + 1}`, name: l.name, in: l.in || 0, out: l.out || 0, total: l.total != null ? l.total : (l.in || 0) + (l.out || 0) }));
}

async function compareForAgent(agentId, payload, uiResult, anchorEvidence, layerInfo) {
  const build = PROMPTS[agentId];
  if (!build) return null;
  const { systemInstruction, prompt } = build(payload || {});
  const originalPromptTokens = tok(systemInstruction) + tok(prompt);
  const originalCompletionTokens = tok(JSON.stringify(uiResult));
  const originalTotal = originalPromptTokens + originalCompletionTokens;

  // Distinguish "no provider key configured" from "a key IS configured but
  // this particular call failed" -- collapsing these into one sentence was
  // a real bug found in the reference NVIDIA example: a transient network/
  // rate-limit failure would misleadingly claim "no key configured" even
  // when one was set. resolveConfig().ok tells us which case we're in
  // BEFORE attempting the call, so the wording is always accurate.
  const keyConfigured = resolveConfig().ok;
  let unai = null, reductionPct = null, live = null, callFailedDespiteKey = false;
  if (anchorEvidence) {
    const real = keyConfigured ? await narrateReal(anchorEvidence).catch(() => null) : null;
    if (real) {
      const unaiTotal = real.promptTokens + real.completionTokens;
      unai = { promptTokens: real.promptTokens, completionTokens: real.completionTokens, total: unaiTotal, measured: "live", provider: real.provider, model: real.model };
      live = { explanation: real.text };
    } else {
      callFailedDespiteKey = keyConfigured;
      const unaiPromptTokens = tok(unaiPromptFor(anchorEvidence));
      const unaiTotal = unaiPromptTokens + UNAI_COMPLETION_CAP;
      unai = { promptTokens: unaiPromptTokens, completionTokens: UNAI_COMPLETION_CAP, total: unaiTotal, measured: "estimated" };
    }
    reductionPct = Math.round((1 - unai.total / originalTotal) * 100);
  }

  let methodology;
  if (unai && unai.measured === "live") {
    methodology = `LIVE measured call to ${unai.provider} (${unai.model}) for the UNAI side — real usage.prompt_tokens/completion_tokens from that provider's own API response. Original-app side is a local BPE tokenization (gpt-tokenizer) of the real prompt text, since the original app's own LLM endpoint isn't called here.`;
  } else if (callFailedDespiteKey) {
    methodology = "A provider key IS configured, but this run's live narration call failed (network error, timeout, or a non-2xx response such as a rate limit) — falling back to a local token ESTIMATE for the UNAI side rather than a measured one. Original-app side is a real BPE tokenization (gpt-tokenizer, cl100k_base) of the actual prompt text this run would have used.";
  } else {
    methodology = "Real BPE tokenization (gpt-tokenizer, cl100k_base) of the actual prompt text this run would have used — not the original app's exact model tokenizer, so treat as accurate order-of-magnitude, not exact billing. Nothing here is sent to any LLM (no provider key configured).";
  }

  return {
    methodology,
    original: { label: "Original app: 1 full LLM call (this agent's real prompt + JSON schema)", promptTokens: originalPromptTokens, completionTokens: originalCompletionTokens, total: originalTotal },
    unaiIfLlmNarrated: unai ? { label: unai.measured === "live" ? `UNAI, LIVE ${unai.provider} call: 1 shared explainability call` : "UNAI, IF it also narrated via an LLM: 1 shared explainability call (estimated)", ...unai, ...(live || {}) } : null,
    unaiActual: { label: "UNAI, as actually run just now: real ported formula, no LLM call", total: 0 },
    reductionPctIfLlmNarrated: reductionPct,
    perLayerTokens: buildPerLayerTokens(layerInfo),
    perLayerMeasured: layerInfo ? layerInfo.measured : null,
  };
}

module.exports = { compareForAgent };
