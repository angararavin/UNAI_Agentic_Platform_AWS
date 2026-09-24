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
const { narrateReal } = require("./liveNarration.cjs");
const tok = s => encode(String(s == null ? "" : s)).length;

// Exact prompt text ported from each server/agents/agentN*.ts source file,
// parameterized by this run's real payload -- so the measurement reflects
// what THIS run would actually have cost, not a fixed example.
const PROMPTS = {
  "agent-1": (p) => ({
    systemInstruction: `You are Agent 1 — Failure-Based Disposition Agent for data center RMA tray hardware.
Objective: Determine the recommended disposition for a failed RMA tray based on failure evidence and DCHA logs.
Processing Requirements:
1. Analyze the failure information.
2. Evaluate DCHA diagnostic evidence.
3. Determine whether the unit should be: Repaired, Replaced, or Further Diagnosed.
4. Generate a confidence score (0 to 100 integer).
5. Provide reasoning for the recommendation.
6. Provide repair recommendation details.
7. Assess Risk ('Low', 'Medium', 'High').
8. Identify whether human approval is required: Confidence >= ${p.threshold} -> false (Auto Approved), Confidence < ${p.threshold} -> true (Human Approval Required).
Return strictly valid JSON matching the schema.`,
    prompt: `Inputs:
Tray ID: ${p.trayId}
MPN: ${p.mpn}
Failure Code: ${p.failureCode}
Failure Description: ${p.failureDescription}
DCHA Logs: ${p.dchaLogs}
Approval Threshold: ${p.threshold}%`,
  }),
  "agent-2": (p) => ({
    systemInstruction: `You are Agent 2 — Dwell Time Monitoring & Escalation Agent for datacenter RMA trays.
Objective: Calculate dwell metrics, compare actual dwell duration against the configured Micro-SLO, determine target status, diagnose the root cause of delay, and recommend the appropriate escalation action.

Processing Requirements & Analysis:
1. Dwell Time: The actual elapsed hours spent in the current stage (hoursInStage).
2. Micro-SLO: The maximum acceptable duration (target in hours) for this stage.
3. Dwell Variance: Dwell Time minus Micro-SLO (hours over target). E.g., Dwell Time: 52h, Micro-SLO: 24h -> Variance: +28h over target.
4. Delay: Amount of time above target (Math.max(0, Dwell Variance)). If within target, delay is 0.
5. Target Determination:
   - 'Within Target' (Dwell Time < 0.8 * Micro-SLO)
   - 'Approaching Target' (Dwell Time >= 0.8 * Micro-SLO and <= Micro-SLO)
   - 'Target Breached' (Dwell Time > Micro-SLO)
6. Dwell Status: 'Within SLO', 'At Risk', or 'Breached' (or 'SLO Breached').
7. Root Cause: Identify the likely operational or diagnostic reason for the delay based on the stage, location, and event history (e.g., "Carrier assignment delay", "Diagnostic bench test queue backlog", "Thermal burn-in chamber capacity limit", "Technician shift transition handoff stall").
8. Escalation Recommendation: Prescribe the appropriate operational escalation action (e.g., "Monitor", "Notify logistics team", "Escalate to transportation manager", "Trigger priority carrier assignment", "Issue P1 expedited dock staging alert").
9. Confidence Score: 0 to 100 based on data completeness and clarity.
10. Approval Requirement: Confidence >= ${p.threshold} -> false (Auto Approved), Confidence < ${p.threshold} -> true (Human Approval Required).

Return strictly valid JSON matching the schema.`,
    prompt: `Inputs:
Tray ID: ${p.trayId}
Current Stage: ${p.currentStage}
Hours in Stage: ${p.hoursInStage}
Micro-SLO: ${p.microSlo} hours
Location: ${p.location}
Event History: ${p.eventHistory}
Approval Threshold: ${p.threshold}%`,
  }),
  "agent-3": (p) => ({
    systemInstruction: `You are Agent 3 — Urgency Flagging Agent for datacenter RMA trays.
Objective: Determine the urgency of an RMA and recommend the appropriate Required Delivery Date (RDD) / priority level.
Processing Requirements:
1. Evaluate failure criticality.
2. Evaluate spare availability (spareInventory).
3. Evaluate business impact.
4. Evaluate transportation constraints (carrierStatus, cmQueueStatus).
5. Determine RMA urgency: 'Critical', 'High', 'Medium', 'Low'.
6. Recommend priority: 'P1', 'P2', 'P3', 'P4'.
7. Recommend RDD (e.g. Next Flight Out (<24h), Expedited 48h, Standard 5-7d).
8. Generate confidence score (0-100).
9. Determine human approval: Confidence >= ${p.threshold} -> false (Auto Approved), Confidence < ${p.threshold} -> true (Human Approval Required).
Return strictly valid JSON matching the schema.`,
    prompt: `Inputs:
Tray ID: ${p.trayId}
Failure Type: ${p.failureType}
Failure Code: ${p.failureCode}
Data Center: ${p.dataCenter}
Spare Inventory: ${p.spareInventory} units
Business Impact: ${p.businessImpact}
Carrier Status: ${p.carrierStatus}
CM Queue Status: ${p.cmQueueStatus}
Approval Threshold: ${p.threshold}%`,
  }),
  "agent-4": (p) => ({
    systemInstruction: `You are Agent 4 — Return Receipt & Spare-Pool Reintegration Agent.
Objective: Validate a repaired RMA return and determine whether the asset can be reintegrated into the spare pool.
Processing Requirements:
1. Validate the returned manifest.
2. Validate serial-number consistency (compare serialNumber vs returnedSerial).
3. Verify repair completion (repairStatus).
4. Verify warranty eligibility (warrantyStatus).
5. Determine reintegration eligibility: 'Eligible', 'Ineligible', 'Quarantine'.
6. Recommend next financial/logistics action.
7. Generate confidence score (0-100).
8. Determine human approval: Confidence >= ${p.threshold} -> false (Auto Approved), Confidence < ${p.threshold} -> true (Human Approval Required).
Return strictly valid JSON matching the schema.`,
    prompt: `Inputs:
Tray ID: ${p.trayId}
RMA ID: ${p.rmaId}
Original Serial: ${p.serialNumber}
Returned Serial: ${p.returnedSerial}
Repair Status: ${p.repairStatus}
Warranty Status: ${p.warrantyStatus}
Manifest Details: ${p.manifestDetails}
Approval Threshold: ${p.threshold}%`,
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

// L1..L7 in the fixed order engine.js's own Layers class tracks them --
// matches res.observability.layerTokens' array order exactly.
const LAYER_IDS = ["L1", "L2", "L3", "L4", "L5", "L6", "L7"];
function buildPerLayerTokens(layerInfo) {
  if (!layerInfo || !Array.isArray(layerInfo.layers)) return null;
  return layerInfo.layers.map((l, i) => ({ id: LAYER_IDS[i] || `L${i + 1}`, name: l.name, in: l.in || 0, out: l.out || 0, total: l.total != null ? l.total : (l.in || 0) + (l.out || 0) }));
}

/**
 * Real, per-run token comparison. `uiResult` must be the fully-built result
 * object BEFORE this comparison is attached to it (so the completion-size
 * proxy reflects only what the original app's schema actually asks for).
 * `layerInfo` (optional): { layers: res.observability.layerTokens (or
 * .layerTokensReal), measured: "modeled"|"real" } -- this run's own engine
 * attribution of tokens across its 7 layers (L1..L7), not a separate
 * estimate. Most layers are 0 (deterministic reads/writes/reasoning).
 */
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
      ? `LIVE measured call to ${unai.provider} (${unai.model}) for the UNAI side — real usage.prompt_tokens/completion_tokens from that provider's own API response. Original-app side is a local BPE tokenization (gpt-tokenizer) of the real prompt text, since the original app's own LLM endpoint isn't called here.`
      : "Real BPE tokenization (gpt-tokenizer, cl100k_base) of the actual prompt text this run would have used — not the original app's exact model tokenizer, so treat as accurate order-of-magnitude, not exact billing. Nothing here is sent to any LLM (no provider key configured).",
    original: { label: "Original app: 1 full LLM call (this agent's real prompt + JSON schema)", promptTokens: originalPromptTokens, completionTokens: originalCompletionTokens, total: originalTotal },
    unaiIfLlmNarrated: unai ? { label: unai.measured === "live" ? `UNAI, LIVE ${unai.provider} call: 1 shared explainability call` : "UNAI, IF it also narrated via an LLM: 1 shared explainability call (estimated)", ...unai, ...(live || {}) } : null,
    unaiActual: { label: "UNAI, as actually run just now: real ported formula, no LLM call", total: 0 },
    reductionPctIfLlmNarrated: reductionPct,
    perLayerTokens: buildPerLayerTokens(layerInfo),
    perLayerMeasured: layerInfo ? layerInfo.measured : null,
  };
}

module.exports = { compareForAgent };
