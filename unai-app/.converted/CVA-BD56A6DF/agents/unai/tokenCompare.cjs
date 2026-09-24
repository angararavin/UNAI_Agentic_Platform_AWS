/* tokenCompare.cjs — REAL (measured, not modeled) per-run token comparison:
 * what the original app's one bespoke NIM LLM call would have cost (exact
 * prompt text ported from the source agent, tokenized for real) vs. what
 * UNAI's single shared explainability prompt would cost for the same
 * decision. The original side is always a local measurement (that prompt is
 * never sent anywhere here). The UNAI side tries a REAL call first — see
 * liveNarration.cjs — using whatever provider key is configured (e.g.
 * MISTRAL_API_KEY); with no key configured, or on any failure, it falls
 * back to a local token estimate instead. Either way, this module never
 * changes what any agent actually computes.
 */
"use strict";
const path = require("path");
const { encode } = require("gpt-tokenizer");
const { narrateReal } = require("./liveNarration.cjs");
const tok = s => encode(String(s == null ? "" : s)).length;

// Exact prompt text ported from each agents/*.ts source file, parameterized
// by this run's real payload — so the measurement reflects what THIS run
// would actually have cost, not a fixed example.
const PROMPTS = {
  "demand-forecast": (p) => ({
    systemInstruction: "You are an expert enterprise supply chain strategist and forecasting coordinator at NVIDIA. You must output valid, well-structured JSON matching the requested schema exactly.",
    prompt: `
    You are the NVIDIA Demand Forecast Agent. We are opening a new quarterly S&OP (Sales and Operations Planning) cycle.
    Product: ${p.productName} (Established high-volume product)
    Shipment History Ingested: ${p.shipmentHistoryYears} years of weekly historical shipment data
    Sales Team Override Target: ${p.salesOverrideUnits} units
    Marketing Campaign Override Target: ${p.marketingOverrideUnits} units

    Tasks:
    1. Run S&OP Consensus Forecast. Combine historical statistical forecasting with Sales and Marketing overrides.
    2. Perform Seasonal Decomposition. Detail the trend and seasonal patterns (e.g., high chip absorption in Q1/Q3, holiday/budget closures in Q4).
    3. Generate a 26-week baseline consensus forecast. Provide week-by-week values (Week 1 to Week 26).
       - baseForecast: the statistical baseline before overrides.
       - consensusForecast: the finalized forecast incorporating the split allocations of Sales and Marketing overrides distributed across 26 weeks.
    4. Return reasoning steps, key decision factors, and timestamped activity logs.

    Format the response as a JSON object with:
    - reasoningSteps: array of strings
    - decompositionTrend: string
    - decompositionSeasonal: string
    - consensusSummary: string
    - forecastData: array of { week: string, baseForecast: number, consensusForecast: number }
    - confidenceScore: number (0-100)
    - keyFactors: array of strings
    - humanActionRequired: string
    - activityLogs: array of strings
  `}),
  "demand-sensing": (p) => ({
    systemInstruction: "You are an expert NVIDIA demand planner and AI forecaster. You must output valid, well-structured JSON matching the requested schema exactly.",
    prompt: `
    You are the NVIDIA Demand Sensing Agent. We have detected a demand signal spike from a major hyperscaler.
    Product: ${p.productName}
    Hyperscaler Client: ${p.hyperscaler}
    Spike Percentage: ${p.signalSpikePct}% over historical baseline
    Volume of Signal Spike: ${p.signalVolumeUnits} units requested
    Urgency Level: ${p.urgencyCode}

    Tasks:
    1. Analyze this signal. Is it a true demand anomaly (e.g. cloud expansion project, major LLM training cluster kickoff) or a false alarm?
    2. Perform a 13-week reforecast. Give week-by-week forecast values.
       - Generate a traditional statistical baseline (usually static or slightly seasonal).
       - Generate an AI-Sensed Reforecast which dynamically incorporates the hyperscaler spike (e.g., immediate bump in early weeks, then stabilizing).
       - Include the raw customer signal volume in your calculations.
    3. Return reasoning steps and a realistic timestamped activity log for your actions.

    Format the response as a JSON object with:
    - reasoningSteps: array of strings
    - anomalyDetected: boolean
    - anomalyAnalysis: string
    - reforecastSummary: string
    - chartData: array of { week: string, statisticalBaseline: number, aiReforecast: number, rawSignal: number }
    - confidenceScore: number (0-100)
    - keyFactors: array of strings
    - humanActionRequired: string
    - activityLogs: array of strings
  `}),
  "forecast-npi": (p) => ({
    systemInstruction: "You are an expert NVIDIA NPI planner specializing in data science, champion-challenger testing, and hierarchical supply chains. You must output valid, well-structured JSON matching the requested schema exactly.",
    prompt: `
    You are the NVIDIA New Product Introduction (NPI) Forecast Agent. We are establishing the baseline forecast for a next-generation architecture: ${p.productName}.
    User Preferred Primary Model: ${p.selectedPrimaryModel}
    Simulated Market Adoption Speed: ${p.marketAdoptionRate}

    Tasks:
    1. Run a Champion-Challenger Model Selection. Compare Trend Extrapolation Model (statistical baseline), Multi-Variable Analytics Model (non-linear trend model), and Pattern-Recognition Model (recurrent pattern sequence model).
       - Calculate MAPE (Mean Absolute Percentage Error) for each model.
       - Select the Champion model based on accuracy and user choice.
    2. Construct Hierarchical Forecast. Break down the target product's launch quarter requirements across Regions (North America, APAC, EMEA) and Customers (Hyperscale Cloud, Enterprise OEM, Government & Research).
    3. Identify Low Confidence Planning Nodes. Flag specific SKUs or customer nodes where adoption confidence is low (<80%) and generate structural warnings with explicit explainability (root cause, risk category, forecast impact, recommended mitigation).
    4. Return reasoning steps, detailed model metrics, hierarchical forecasts, flags, and timestamped activity logs.

    Format the response as a JSON object with:
    - reasoningSteps: array of strings
    - championModel: string
    - challengerModels: array of strings
    - modelMetrics: array of { modelName: string, mape: number, status: string }
    - hierarchicalForecast: array of { node: string, naUnits: number, apacUnits: number, emeaUnits: number }
    - lowConfidenceFlags: array of { skuNode: string, confidenceScore: number, reason: string, riskCategory: string, rootCauseDetails: string, impactOnForecast: string, recommendedMitigation: string }
    - confidenceScore: number (0-100)
    - keyFactors: array of strings
    - humanActionRequired: string
    - activityLogs: array of strings
  `}),
  "refurb-repair": (p) => ({
    systemInstruction: "You are an expert NVIDIA reverse logistics engineer and cost analyst. You must output valid, well-structured JSON matching the requested schema exactly.",
    prompt: `
    You are the NVIDIA Refurbish & Repair Agent. An elevated wave of returned inventory has arrived.
    Product Type: ${p.productName}
    Total Field Returns: ${p.fieldReturnsCount} units
    Human Overridden Historical Recovery Rate Target: ${p.historicalRecoveryRateOverride}%
    Cost of manufacturing a brand new unit: $${p.newSupplyCostUsd} USD
    Cost of factory repairing a single returned unit: $${p.repairCostUsd} USD

    Tasks:
    1. Calculate Repair Metrics:
       - Recoverable Units = Returns Count * (Recovery Rate / 100)
       - Scrapped Units = Returns Count - Recoverable Units
       - Total Cost to Repair = Recoverable Units * Repair Cost per Unit
       - Total Cost of Equivalent New Supply = Recoverable Units * New Supply Cost per Unit
       - Net Financial Savings = Cost of New Supply - Cost to Repair
    2. Perform Cost-Benefit Analysis (CBA). Summarize why refurbishing this batch makes financial and operational sense, referencing the savings.
    3. Construct Optimized 4-Week Repair Schedule. Break down the process (e.g., Intake & Diagnostics, Board-Level Microsoldering, Component Refitting & Sourcing, High-Stress Burn-In & QA) across 4 stages.
    4. Return reasoning steps, detailed financials, schedules, decision metrics, and timestamped activity logs.

    Format the response as a JSON object with:
    - reasoningSteps: array of strings
    - recoverableUnits: number (integer)
    - scrappedUnits: number (integer)
    - repairCostTotal: number
    - newSupplyCostTotal: number
    - netSavingsUsd: number
    - cbaSummary: string
    - repairSchedule: array of { phase: string, durationDays: number, unitsProcessed: number, status: string }
    - confidenceScore: number (0-100)
    - keyFactors: array of strings
    - humanActionRequired: string
    - activityLogs: array of strings
  `}),
  "rma-triage": (p) => ({
    systemInstruction: "You are an expert NVIDIA enterprise support engineer and supply chain automation agent. You must output valid, well-structured JSON matching the requested schema exactly.",
    prompt: `
    You are the NVIDIA RMA Triage Agent. Evaluate the following hardware return and decide the disposition:
    Product: ${p.productName}
    Serial Number: ${p.serialNumber}
    Reported Defect: ${p.defectDescription}
    Purchase Date: ${p.purchaseDate}
    Current Time: 2026-07-14T04:27:56-07:00 (July 2026)

    Step 1: Check Solvability. If the issue is solvable through user intervention (e.g., thermal paste, dusty fan, firmware/driver, loose cables, PCIe seating), provide a detailed 2-line descriptive recommendation explaining how to resolve it. This is preferred over replacement or refurbishing!
    Step 2: Warranty Check. NVIDIA enterprise products standard warranty is 3 years (36 months) from the purchase date. Determine if the warranty is active or expired as of July 2026.
    Step 3: Refurb Feasibility. If the warranty is active but not solvable via self-troubleshooting, determine if it can be refurbished or if a direct replacement is necessary.
    Step 4: Decide disposition: "Self-Troubleshoot" (if solvable), "Factory Refurbish" (if hardware issue is minor/repairable and under warranty), or "Direct Replacement" (if hardware issue is catastrophic and under warranty, or if special SLA applies). If out of warranty and not solvable, suggest repair cost estimate.
    Step 5: Trigger replenishment. If replacement/refurb is chosen, set replenishmentTriggered to true.
    Step 6: Provide specific recommendations:
      - solvabilityRecommendation: A 2-line descriptive recommendation detailing the exact resolution procedure and operational pathway.
      - softwareResolution: e.g. clean driver reinstall, reset cluster configs.
      - firmwareRecommendation: specific firmware flash guide.
      - driverRecommendation: specific driver version recommendation (e.g. v555.42).
      - configurationRecommendation: PCIe / BIOS settings, cooling curves.
      - environmentalRecommendation: ambient humidity, air flow clearance, dust filtration.
      - knowledgeBaseMatch: reference to an advisory doc from NVIDIA Support database.
      - businessImpactUsd: estimate of the financial savings or impact of this decision (e.g. "$12,000 Saved").
      - failureRepairAnalysis: Object containing detailed failure rate and repair rate analysis specifically tailored to ${p.productName} and this exact defect ("${p.defectDescription}"). Must include:
        - failureRateAfrPct: number
        - mtbfHours: number
        - failureRateTrend: string
        - repairabilityRatePct: number
        - firstTimeFixRatePct: number
        - avgRepairTatDays: number
        - salvageSavingsUsd: number
        - topFailureCauses: array of objects { cause: string, percentage: number, severity: "High"|"Medium"|"Low", impactDescription: string, recommendation: string }
        - repairYieldByComponent: array of objects { component: string, repairYieldPct: number, avgTatHours: number, recommendation: string }
        - rmaProcessImpactSummary: string

    Provide detailed reasoning steps and a realistic timestamped activity log for your actions.

    Format the response as a JSON object matching the requested schema.
  `}),
  "orchestrator": (p) => {
    const kpiBreachType = p.kpiBreachType || (p.productName ? `Hardware Issue: ${p.productName}` : "Generic KPI Breach");
    const affectedRegion = p.affectedRegion || "Global";
    const impactedSku = p.impactedSku || p.serialNumber || "N/A";
    return {
      systemInstruction: "You are the chief AI Orchestration Engine for NVIDIA's global supply chain control tower. You must output valid, well-structured JSON matching the requested schema exactly.",
      prompt: `
    You are the NVIDIA Orchestrator Control Tower Agent. A critical KPI breach has occurred in our supply chain network.
    Breach Event: ${kpiBreachType}
    Affected Region: ${affectedRegion}
    Impacted Product SKU: ${impactedSku}

    Tasks:
    1. Coordinate Response. Plan a sequence of coordinated activations across our agents:
       - Demand Sensing Agent (to reforecast immediate local demand trends)
       - Refurbish & Repair Agent (to check if local scrap or repair units can plug the supply gap quickly)
       - RMA Triage Agent (to speed up intake diagnostics on returns)
       - Replenishment Pipeline (to route inventory buffer from APAC manufacturing hub)
    2. Construct sequence steps. Create a detailed node-to-node exchange showing step-by-step how the Orchestrator initiates, receives telemetry, and re-routes tasks.
    3. Create Coordinated Agents. For each of the 4 agents, define their assigned action and impact weights.
    4. Return reasoning steps, final mitigation plan, sequence steps, decision cards, and timestamped activity logs.

    Format the response as a JSON object with:
    - reasoningSteps: array of strings
    - mitigationPlanSummary: string
    - currentKpiValue: string (e.g., "78% (Threshold: 85%)")
    - targetKpiValue: string (e.g., "Restore to >85% in 3 weeks")
    - coordinatedAgents: array of { agentName: string, assignedAction: string, impactWeightPct: number, status: string }
    - sequenceSteps: array of { stepNumber: number, fromAgent: string, toAgent: string, messageSignal: string, resultDescription: string }
    - confidenceScore: number (0-100)
    - keyFactors: array of strings
    - humanActionRequired: string
    - activityLogs: array of strings
  `};
  },
};

// UNAI's real shared explainability prompt (verbatim from llm.js buildPrompt)
// — measured here, never actually sent, since the download doesn't call an
// LLM by default.
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
const UNAI_COMPLETION_CAP = 40; // llm.js narrateOne caps at max_tokens:80; one sentence typically runs ~30-45

/**
 * Real, per-run token comparison. `uiResult` must be the fully-built result
 * object BEFORE this comparison is attached to it (so the completion-size
 * proxy reflects only what the original app's schema actually asks for).
 * Async: tries a REAL LLM call for the UNAI side first (liveNarration.cjs);
 * falls back to a local token estimate if no provider key is configured or
 * the call fails for any reason (network, TLS, timeout — never blocks the
 * agent's actual result).
 */
// L1..L7 in the fixed order engine.cjs's own Layers class tracks them --
// matches res.observability.layerTokensReal's array order exactly.
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

  let unai = null, reductionPct = null, live = null;
  if (anchorEvidence) {
    const real = await narrateReal(anchorEvidence).catch(() => null);
    if (real) {
      const unaiTotal = real.promptTokens + real.completionTokens;
      unai = { promptTokens: real.promptTokens, completionTokens: real.completionTokens, total: unaiTotal, measured: "live", provider: real.provider, model: real.model };
      live = { explanation: real.text };
    } else {
      const unaiPromptTokens = tok(unaiPromptFor(anchorEvidence));
      const unaiTotal = unaiPromptTokens + UNAI_COMPLETION_CAP;
      unai = { promptTokens: unaiPromptTokens, completionTokens: UNAI_COMPLETION_CAP, total: unaiTotal, measured: "estimated" };
    }
    reductionPct = Math.round((1 - unai.total / originalTotal) * 100);
  }

  return {
    methodology: unai && unai.measured === "live"
      ? `LIVE measured call to ${unai.provider} (${unai.model}) for the UNAI side — real usage.prompt_tokens/completion_tokens from that provider's own API response. Original-app side is a local BPE tokenization (gpt-tokenizer) of the real prompt text, since NVIDIA NIM isn't reachable from this network — see the README.`
      : "Real BPE tokenization (gpt-tokenizer, cl100k_base) of the actual prompt text this run would have used — not NIM's exact Llama-3.3 tokenizer, so treat as accurate order-of-magnitude, not exact billing. Nothing here is sent to any LLM (no provider key configured).",
    original: { label: "Original app: 1 full NIM LLM call (this agent's real prompt + JSON schema)", promptTokens: originalPromptTokens, completionTokens: originalCompletionTokens, total: originalTotal },
    unaiIfLlmNarrated: unai ? { label: unai.measured === "live" ? `UNAI, LIVE ${unai.provider} call: 1 shared explainability call` : "UNAI, IF it also narrated via an LLM: 1 shared explainability call (estimated)", ...unai, ...(live || {}) } : null,
    unaiActual: { label: "UNAI, as actually run just now: real ported formula, no LLM call", total: 0 },
    reductionPctIfLlmNarrated: reductionPct,
    perLayerTokens: buildPerLayerTokens(layerInfo),
    perLayerMeasured: layerInfo ? layerInfo.measured : null,
  };
}

module.exports = { compareForAgent };
