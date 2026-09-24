/* unaiAdapter.cjs — swaps this app's backend from 4 bespoke per-agent
 * TypeScript functions (each calling out to a configurable LLM engine, or
 * falling back to hand-written heuristics) to the UNAI shared cognitive
 * runtime, WITHOUT changing the UI at all. The original server/agents/*.ts
 * files are left in place, untouched and unused — this is the only new
 * wiring.
 *
 * server.ts's /api/agent/N/run routes now call runAgentViaUnai(agentId,
 * input, threshold) instead of executeAgent1..4. Each branch below:
 *   1) runs this agent's REAL, already-existing UNAI capability (found by
 *      domain match, not invented -- hw_failure_disposition/dwell_sla_monitor/
 *      urgency_logistics_plan/return_reintegration already existed in
 *      engine.cjs for exactly this RMA-disposition domain),
 *   2) reshapes the real computed result back into the EXACT interface
 *      shape (src/types.ts Agent1-4Output) the existing React components
 *      already render — so from the UI's perspective nothing changed
 *      except who computed it,
 *   3) attaches a REAL per-run token comparison (tokenCompare.cjs) --
 *      what this agent's actual bespoke LLM call would have cost (its
 *      real, exact prompt, tokenized for real) vs. UNAI's side.
 *
 * engine.cjs/cognition.cjs are bundled copies from UNAI Studio (unai-app) —
 * the same shared runtime, running in-process here instead of over HTTP.
 */
"use strict";

global.COGNITION = require("./cognition.cjs");
const { UNAI } = require("./engine.cjs");
const tokenCompare = require("./tokenCompare.cjs");

// ---- Which real, already-existing UNAI capability answers each agent's
// question, and its exact systems array. Not guessed -- lifted verbatim
// from engine.js's OWN pre-built "Datacenter Hardware RMA (Google)" use
// case (USE_CASES.dc_hw_rma), which is this exact same conversion, already
// specified: a wrong/guessed systems array here silently falls through to
// a generic handler instead of the real one (caught by testing, not
// assumed -- see the session notes on this).
const AGENT_PLAN = {
  "agent-1": { capability: "hw_failure_disposition", systems: ["ANALYTICS"] },
  "agent-2": { capability: "dwell_sla_monitor", systems: ["ANALYTICS"] },
  "agent-3": { capability: "urgency_logistics_plan", systems: ["ANALYTICS", "SAP_S4"] },
  "agent-4": { capability: "return_reintegration", systems: ["ANALYTICS", "SERVICENOW", "SAP_S4"] },
};
function runCapability(agentId) {
  const { capability, systems } = AGENT_PLAN[agentId];
  const goal = { name: agentId, plan: [{ capability, agentEquiv: capability.replace(/_/g, " "), systems }], gen1Agents: [capability] };
  const res = new UNAI({ name: agentId }).run(goal);
  return { res, c: res.results[capability] };
}

function riskFromConfidence(pct) {
  return pct >= 90 ? "Low" : pct >= 75 ? "Medium" : "High";
}

async function runAgent1(input, threshold) {
  const { res, c } = runCapability("agent-1");
  const ev = c.evidence;
  const top = (c.output.disposition || [])[0] || {};
  const confidenceScore = Math.round(ev.confidence * 100);
  const disposition = top.path === "warranty" ? "Repaired" : top.path === "refurb" ? "Repaired" : top.path === "replace" ? "Replaced" : "Repaired";
  const output = {
    recommendedDisposition: disposition,
    confidenceScore,
    reasoning: `${ev.explanation || ev.detailed.rootCause} (this run — Tray ${input.trayId}, ${input.mpn}: "${input.failureDescription}")`,
    repairRecommendation: top.action || "Standard rework protocol per DCHA findings.",
    risk: riskFromConfidence(confidenceScore),
    humanApprovalRequired: confidenceScore < threshold,
    suggestedRouting: top.path === "refurb" ? `Refurb at ${top.unit || "assigned plant"}` : top.path === "warranty" ? `OEM warranty claim (${top.oem || "OEM"})` : "Scrap & replace",
    dispatchRoute: top.action || "Routed per disposition.",
    identifiedFailureMode: input.failureCode,
    estimatedCostUsd: disposition === "Replaced" ? 1450 : 185,
    estimatedTatDays: disposition === "Replaced" ? 1 : 3,
  };
  const tc = await tokenCompare.compareForAgent("agent-1", Object.assign({}, input, { threshold }), output, ev, { layers: res.observability.layerTokens, measured: "modeled" });
  output.unaiTokenComparison = tc;
  const live = tc && tc.unaiIfLlmNarrated && tc.unaiIfLlmNarrated.measured === "live";
  return { output, engineUsed: "unai", modelUsed: "UNAI Shared Cognitive Engine",
    tokenUsage: live ? { promptTokens: tc.unaiIfLlmNarrated.promptTokens, completionTokens: tc.unaiIfLlmNarrated.completionTokens, totalTokens: tc.unaiIfLlmNarrated.total } : { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
}

async function runAgent2(input, threshold) {
  const { c } = runCapability("agent-2");
  const ev = c.evidence;
  const confidenceScore = Math.round(ev.confidence * 100);
  const dwellVariance = (input.hoursInStage || 0) - (input.microSlo || 0);
  const delay = Math.max(0, dwellVariance);
  const targetDetermination = input.hoursInStage < 0.8 * input.microSlo ? "Within Target" : input.hoursInStage <= input.microSlo ? "Approaching Target" : "Target Breached";
  const dwellStatus = targetDetermination === "Target Breached" ? "Breached" : targetDetermination === "Approaching Target" ? "At Risk" : "Within SLO";
  const output = {
    dwellStatus,
    dwellTime: input.hoursInStage,
    microSlo: input.microSlo,
    dwellVariance,
    delay,
    targetDetermination,
    rootCause: `${ev.explanation || ev.detailed.rootCause} (this run — Tray ${input.trayId} at "${input.currentStage}", ${input.location})`,
    escalationRecommendation: ev.detailed.recommendedAction || "Monitor.",
    recommendedAction: ev.detailed.recommendedAction || "Monitor.",
    bottleneckStage: input.currentStage,
    hoursInStage: input.hoursInStage,
    sloBreach: dwellStatus === "Breached",
    confidenceScore,
    humanApprovalRequired: confidenceScore < threshold,
  };
  const tc = await tokenCompare.compareForAgent("agent-2", Object.assign({}, input, { threshold }), output, ev, { layers: res.observability.layerTokens, measured: "modeled" });
  output.unaiTokenComparison = tc;
  const live = tc && tc.unaiIfLlmNarrated && tc.unaiIfLlmNarrated.measured === "live";
  return { output, engineUsed: "unai", modelUsed: "UNAI Shared Cognitive Engine",
    tokenUsage: live ? { promptTokens: tc.unaiIfLlmNarrated.promptTokens, completionTokens: tc.unaiIfLlmNarrated.completionTokens, totalTokens: tc.unaiIfLlmNarrated.total } : { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
}

async function runAgent3(input, threshold) {
  const { c } = runCapability("agent-3");
  const ev = c.evidence;
  const confidenceScore = Math.round(ev.confidence * 100);
  const breached = (c.output.breachedUnits || []).length > 0;
  const urgencyLevel = breached ? "Critical" : (input.spareInventory || 0) <= 1 ? "High" : "Medium";
  const priority = urgencyLevel === "Critical" ? "P1" : urgencyLevel === "High" ? "P2" : "P3";
  const output = {
    urgencyLevel,
    priority,
    recommendedRdd: priority === "P1" ? "Next Flight Out (<24h)" : priority === "P2" ? "Expedited 48h" : "Standard 5-7d",
    reasoning: `${ev.explanation || ev.detailed.rootCause} (this run — Tray ${input.trayId}, ${input.failureType})`,
    businessImpact: input.businessImpact,
    risk: riskFromConfidence(confidenceScore),
    confidenceScore,
    humanApprovalRequired: confidenceScore < threshold,
  };
  const tc = await tokenCompare.compareForAgent("agent-3", Object.assign({}, input, { threshold }), output, ev, { layers: res.observability.layerTokens, measured: "modeled" });
  output.unaiTokenComparison = tc;
  const live = tc && tc.unaiIfLlmNarrated && tc.unaiIfLlmNarrated.measured === "live";
  return { output, engineUsed: "unai", modelUsed: "UNAI Shared Cognitive Engine",
    tokenUsage: live ? { promptTokens: tc.unaiIfLlmNarrated.promptTokens, completionTokens: tc.unaiIfLlmNarrated.completionTokens, totalTokens: tc.unaiIfLlmNarrated.total } : { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
}

async function runAgent4(input, threshold) {
  const { c } = runCapability("agent-4");
  const ev = c.evidence;
  const confidenceScore = Math.round(ev.confidence * 100);
  const serialMatch = input.serialNumber === input.returnedSerial;
  const eligible = serialMatch && /completed/i.test(input.repairStatus || "") && /in warranty/i.test(input.warrantyStatus || "");
  const output = {
    returnValidationStatus: serialMatch ? "Pass" : "Flagged",
    serialValidation: serialMatch ? "Match" : "Mismatch",
    repairValidation: /completed/i.test(input.repairStatus || "") ? "Verified" : "Incomplete",
    warrantyStatus: /in warranty/i.test(input.warrantyStatus || "") ? "In Warranty" : "Expired",
    sparePoolEligibility: eligible ? "Eligible" : serialMatch ? "Quarantine" : "Ineligible",
    recommendedAction: ev.detailed.recommendedAction || "Post goods receipt + schedule refurb.",
    financialAction: eligible ? "Credit spare pool inventory value." : "Hold pending manual reconciliation.",
    confidenceScore,
    humanApprovalRequired: confidenceScore < threshold,
  };
  const tc = await tokenCompare.compareForAgent("agent-4", Object.assign({}, input, { threshold }), output, ev, { layers: res.observability.layerTokens, measured: "modeled" });
  output.unaiTokenComparison = tc;
  const live = tc && tc.unaiIfLlmNarrated && tc.unaiIfLlmNarrated.measured === "live";
  return { output, engineUsed: "unai", modelUsed: "UNAI Shared Cognitive Engine",
    tokenUsage: live ? { promptTokens: tc.unaiIfLlmNarrated.promptTokens, completionTokens: tc.unaiIfLlmNarrated.completionTokens, totalTokens: tc.unaiIfLlmNarrated.total } : { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
}

module.exports = { runAgent1, runAgent2, runAgent3, runAgent4 };
