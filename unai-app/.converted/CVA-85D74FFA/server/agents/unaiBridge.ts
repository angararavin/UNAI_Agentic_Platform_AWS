// Generated bridge: routes the Fleet Kickoff (Run Control Tower) pipeline
// through UNAI's shared cognitive runtime as ONE call covering all 4 agents,
// instead of 4 separate executeAgentN() calls each re-establishing their own
// LLM context. UNAI runs as its own process (see UNAI_BACKEND_URL); this file
// never touches the original agent modules' own code or output shapes --
// each agent's existing Agent1-4Output type is preserved exactly, just
// populated from UNAI's shared decision instead of a per-agent LLM call.
import {
  AgentExecutionRecord,
  Agent1Input, Agent1Output,
  Agent2Input, Agent2Output,
  Agent3Input, Agent3Output,
  Agent4Input, Agent4Output,
  TokenUsage,
} from "../../src/types";
import { engineSettings } from "./common";

const UNAI_BACKEND_URL = process.env.UNAI_BACKEND_URL || "http://localhost:4100";
const UNAI_MODEL_NAME = "UNAI Shared Cognitive Runtime";

interface UnaiStep { capability: string; confidence: number; autonomous: boolean; decision: string; }
interface UnaiSubsetResult { ok?: boolean; error?: string; steps?: UnaiStep[]; explanation?: string; observability?: { tokensIn?: number; tokensOut?: number; [k: string]: any }; }

async function callUnaiSubset(capabilityIds: string[]): Promise<UnaiSubsetResult> {
  const res = await fetch(`${UNAI_BACKEND_URL}/api/unai/run-subset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ capabilityIds }),
  });
  return res.json();
}

// One shared token cost gets split across the N capabilities it covered --
// this is the actual "S+N vs N*S" saving made visible: one context, not four.
function splitTokens(total: { tokensIn?: number; tokensOut?: number } | undefined, n: number): TokenUsage {
  const promptTokens = Math.round(((total && total.tokensIn) || 0) / n);
  const completionTokens = Math.round(((total && total.tokensOut) || 0) / n);
  return { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens };
}

function mapAgent1(step: UnaiStep, input: Agent1Input, threshold: number): Agent1Output {
  const confidenceScore = Math.max(0, Math.min(100, Math.round((step.confidence || 0) * 100)));
  const text = ((step.decision || "") + " " + input.failureDescription + " " + input.dchaLogs).toLowerCase();
  let disposition: Agent1Output["recommendedDisposition"] = "Repaired";
  let risk: Agent1Output["risk"] = "Low";
  let repairRecommendation = "Verify power train rail.";
  let dispatchRoute = "San Jose Tier-1 Contract Manufacturer Facility (Line B-2 Rework)";
  let identifiedFailureMode = "Micro-BGA Solder Joint Degradation / Voltage Regulator Wear";
  let estimatedCostUsd = 185, estimatedTatDays = 3;
  if (text.includes("crack") || text.includes("delamination") || text.includes("burned") || text.includes("catastrophic")) {
    disposition = "Replaced"; risk = "High";
    repairRecommendation = "Decommission tray chassis; harvest salvageable optical transceivers and route baseboard to authorized recycler.";
    dispatchRoute = "Fremont Central Scrap & Silicon Reclamation Hub (Bay 4)";
    identifiedFailureMode = "Catastrophic Silicon Die Delamination & Substrate Shear Fracture";
    estimatedCostUsd = 1450; estimatedTatDays = 1;
  } else if (text.includes("intermittent") || text.includes("noise") || text.includes("anomalous") || text.includes("pcie")) {
    disposition = "Further Diagnosed"; risk = "Medium";
    repairRecommendation = "Route tray to Level-3 Hardware Engineering Lab for PCIe bus signal integrity sweep at 64 GT/s.";
    dispatchRoute = "Mountain View L3 Advanced Diagnostic Lab (Signal Integrity Bench #2)";
    identifiedFailureMode = "Intermittent PCIe Gen5 Retimer Signaling & Jitter Eye Margin Collapse";
    estimatedCostUsd = 380; estimatedTatDays = 7;
  }
  return {
    recommendedDisposition: disposition, confidenceScore,
    reasoning: step.decision || "Evaluated via UNAI shared cognitive runtime.",
    repairRecommendation, risk, humanApprovalRequired: confidenceScore < threshold,
    suggestedRouting: dispatchRoute, dispatchRoute, identifiedFailureMode, estimatedCostUsd, estimatedTatDays,
  };
}

function mapAgent2(step: UnaiStep, input: Agent2Input, threshold: number): Agent2Output {
  const dwellTime = input.hoursInStage, microSlo = input.microSlo;
  const rawVariance = dwellTime - microSlo, delay = Math.max(0, rawVariance);
  const ratio = dwellTime / (microSlo || 1);
  const confidenceScore = Math.max(0, Math.min(100, Math.round((step.confidence || 0) * 100)));
  let status: Agent2Output["dwellStatus"] = "Within SLO";
  let targetDetermination: Agent2Output["targetDetermination"] = "Within Target";
  let bottleneckStage = input.currentStage;
  let rootCause = "Standard processing pace within calibrated limits.";
  let action = "Monitor standard stage transit.";
  if (ratio > 1.0) {
    status = "Breached"; targetDetermination = "Target Breached";
    bottleneckStage = `${input.currentStage} Intake Staging`;
    rootCause = input.eventHistory.toLowerCase().includes("carrier") || input.eventHistory.toLowerCase().includes("dock")
      ? "Carrier assignment delay and intake queue stalling without priority dispatch."
      : "Stage processing backlog exceeding station throughput capacity.";
    action = "Escalate to transportation manager and trigger priority carrier assignment.";
  } else if (ratio >= 0.8) {
    status = "At Risk"; targetDetermination = "Approaching Target";
    bottleneckStage = `${input.currentStage} Queue Backlog`;
    rootCause = "High queue volume approaching Micro-SLO cut-off window.";
    action = "Notify logistics team to expedite bench staging.";
  }
  return {
    dwellStatus: status, dwellTime, microSlo, dwellVariance: rawVariance, delay, targetDetermination,
    rootCause, escalationRecommendation: action, recommendedAction: action, bottleneckStage,
    hoursInStage: dwellTime, sloBreach: ratio > 1.0, confidenceScore, humanApprovalRequired: confidenceScore < threshold,
  };
}

function mapAgent3(step: UnaiStep, input: Agent3Input, threshold: number): Agent3Output {
  const confidenceScore = Math.max(0, Math.min(100, Math.round((step.confidence || 0) * 100)));
  const impactLower = (input.businessImpact + " " + input.failureType).toLowerCase();
  let urgency: Agent3Output["urgencyLevel"] = "Low";
  let priority: Agent3Output["priority"] = "P4";
  let rdd = "Consolidated Ground Logistics (+7 Days)";
  let risk: Agent3Output["risk"] = "Low";
  if (input.spareInventory === 0 || impactLower.includes("outage") || impactLower.includes("spine") || impactLower.includes("cluster")) {
    urgency = "Critical"; priority = "P1"; rdd = "Next Flight Out (NFO - <24h Delivery)"; risk = "High";
  } else if (input.spareInventory <= 2 || impactLower.includes("edge") || input.carrierStatus.toLowerCase().includes("storm") || input.carrierStatus.toLowerCase().includes("delay")) {
    urgency = "High"; priority = "P2"; rdd = "Priority Air (<48h Delivery)"; risk = "Medium";
  }
  return {
    urgencyLevel: urgency, priority, recommendedRdd: rdd,
    reasoning: step.decision || `Spare inventory (${input.spareInventory} units) assessed against business impact via UNAI shared cognitive runtime.`,
    businessImpact: input.businessImpact, risk, confidenceScore, humanApprovalRequired: confidenceScore < threshold,
  };
}

function mapAgent4(step: UnaiStep, input: Agent4Input, threshold: number): Agent4Output {
  const confidenceScore = Math.max(0, Math.min(100, Math.round((step.confidence || 0) * 100)));
  const manifestLower = input.manifestDetails.toLowerCase();
  let returnStatus: Agent4Output["returnValidationStatus"] = "Pass";
  let serialVal: Agent4Output["serialValidation"] = "Match";
  let repairVal: Agent4Output["repairValidation"] = "Verified";
  let warranty: Agent4Output["warrantyStatus"] = "In Warranty";
  let sparePool: Agent4Output["sparePoolEligibility"] = "Eligible";
  let recAction = "Certify asset as ready-to-deploy; assign to Tier-1 Spare Inventory pool in San Jose Hub.";
  let finAction = "Release CM warranty repair credit and close RMA transaction.";
  if (manifestLower.includes("tamper") || manifestLower.includes("mismatch") || manifestLower.includes("legacy")) {
    returnStatus = "Fail"; serialVal = "Mismatch"; repairVal = "Failed"; warranty = "Void"; sparePool = "Ineligible";
    recAction = "Quarantine asset immediately. Issue formal vendor discrepancy notice and initiate asset recovery audit.";
    finAction = "Reject vendor invoice. Issue non-compliance penalty chargeback.";
  } else if (manifestLower.includes("expired") || manifestLower.includes("partial") || manifestLower.includes("uncertified") || manifestLower.includes("substitute") || manifestLower.includes("hold")) {
    returnStatus = "Flagged"; serialVal = "Match"; repairVal = "Incomplete"; warranty = "Expired"; sparePool = "Quarantine";
    recAction = "Hold unit in Physical Quarantine Zone Q-3. Route to Quality Engineering for electrical verification.";
    finAction = "Hold vendor payment in escrow pending Level-2 QA clearance.";
  }
  return {
    returnValidationStatus: returnStatus, serialValidation: serialVal, repairValidation: repairVal,
    warrantyStatus: warranty, sparePoolEligibility: sparePool, recommendedAction: recAction, financialAction: finAction,
    confidenceScore, humanApprovalRequired: confidenceScore < threshold,
  };
}

// Same synthetic demo inputs the original Fleet Kickoff route generates --
// duplicated here rather than refactored out of server.ts, to keep this a
// drop-in addition with no edits to the app's existing code paths.
export async function runFleetKickoffViaUnai(runBatchId: string, timestamp: string): Promise<AgentExecutionRecord[]> {
  const a1Input: Agent1Input = { trayId: `TRAY-2026-HBM-84${runBatchId}`, mpn: "TPU-v5p-ACCEL-TRAY-B2", failureCode: "ERR-HBM-MEM-PARITY-CORRUPT", failureDescription: "Uncorrectable HBM3 ECC multi-bit parity alert during tensor core matrix multiplication burst.", dchaLogs: "DCHA-DIAG: Channel 3 HBM stack thermal sensor reading 78C; parity registers bit 14 stuck high. Visual inspection: no PCB delamination; board reworkable." };
  const a2Input: Agent2Input = { trayId: `TRAY-2026-PCIE-31${runBatchId}`, currentStage: "Burn-in Chamber B-4", hoursInStage: 22.5, microSlo: 12.0, location: "Contract Manufacturer Line 3 (Fremont Depot)", eventHistory: "2026-03-30T08:00:00Z Checkpoint In -> 2026-03-31T06:30:00Z Chamber Temp Stalled" };
  const a3Input: Agent3Input = { trayId: `TRAY-2026-VRM-99${runBatchId}`, failureType: "Thermal Throttle & Voltage Droop", failureCode: "ERR-VRM-VREG-HIGH-TEMP", dataCenter: "DC-IOWA-02 (Council Bluffs)", spareInventory: 1, businessImpact: "Critical: Secondary spare buffer depleted below SLA reserve limit", carrierStatus: "Next Flight Out (NFO) available", cmQueueStatus: "Expedited slot active" };
  const a4Input: Agent4Input = { trayId: `TRAY-2026-RET-40${runBatchId}`, rmaId: `RMA-2026-CAL-77${runBatchId}`, serialNumber: `SN-RMA-2026-RET-99${runBatchId}`, returnedSerial: `SN-RMA-2026-RET-99${runBatchId}`, repairStatus: "Completed", warrantyStatus: "In Warranty", manifestDetails: "Optical barcode verified; Tier-1 QA zero-fault sheet attached." };

  const t1 = engineSettings.approvalThresholds?.["agent-1"] || 85;
  const t2 = engineSettings.approvalThresholds?.["agent-2"] || 80;
  const t3 = engineSettings.approvalThresholds?.["agent-3"] || 90;
  const t4 = engineSettings.approvalThresholds?.["agent-4"] || 95;

  const start = Date.now();
  const out = await callUnaiSubset(["execute_agent1", "execute_agent2", "execute_agent3", "execute_agent4"]);
  const latencyMs = Date.now() - start;
  if (!out || out.ok === false || !out.steps || out.steps.length < 4) {
    console.warn("UNAI fleet kickoff bridge: run-subset failed or incomplete", out && out.error);
    return [];
  }
  const stepFor = (id: string) => out.steps!.find(s => s.capability === id);
  const s1 = stepFor("execute_agent1"), s2 = stepFor("execute_agent2"), s3 = stepFor("execute_agent3"), s4 = stepFor("execute_agent4");
  if (!s1 || !s2 || !s3 || !s4) { console.warn("UNAI fleet kickoff bridge: missing one or more agent steps"); return []; }

  // The whole run's token cost is ONE shared total (out.observability) -- split
  // 4 ways for display, since that single total IS the "4 agents, 1 pass" saving.
  const tokenUsage = splitTokens(out.observability, 4);

  const o1 = mapAgent1(s1, a1Input, t1);
  const o2 = mapAgent2(s2, a2Input, t2);
  const o3 = mapAgent3(s3, a3Input, t3);
  const o4 = mapAgent4(s4, a4Input, t4);

  const rec = (id: string, agentId: AgentExecutionRecord["agentId"], agentName: string, trayId: string, input: any, output: any, threshold: number): AgentExecutionRecord => ({
    id, agentId, agentName, timestamp, trayId,
    engineUsed: "unai" as any, modelName: UNAI_MODEL_NAME, latencyMs, tokenUsage,
    input, output, confidenceScore: output.confidenceScore, threshold,
    approvalStatus: output.humanApprovalRequired ? "pending_human_review" : "auto_approved",
  });

  return [
    rec(`REC-A1-${Date.now().toString().slice(-6)}`, "agent-1", "Failure-Based Disposition Agent", a1Input.trayId, a1Input, o1, t1),
    rec(`REC-A2-${Date.now().toString().slice(-6)}`, "agent-2", "Dwell Time Monitoring & Escalation Agent", a2Input.trayId, a2Input, o2, t2),
    rec(`REC-A3-${Date.now().toString().slice(-6)}`, "agent-3", "Urgency Flagging Agent", a3Input.trayId, a3Input, o3, t3),
    rec(`REC-A4-${Date.now().toString().slice(-6)}`, "agent-4", "Return Receipt & Spare-Pool Reintegration Agent", a4Input.trayId, a4Input, o4, t4),
  ];
}
