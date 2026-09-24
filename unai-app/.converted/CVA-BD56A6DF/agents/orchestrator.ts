import { generateStructuredJson } from "./client.js";

export interface CoordinatedAgentNode {
  agentName: string;
  assignedAction: string;
  impactWeightPct: number;
  status: string;
}

export interface OrchestratorSequenceStep {
  stepNumber: number;
  fromAgent: string;
  toAgent: string;
  messageSignal: string;
  resultDescription: string;
}

export interface OrchestratorResult {
  reasoningSteps: string[];
  mitigationPlanSummary: string;
  currentKpiValue: string;
  targetKpiValue: string;
  coordinatedAgents: CoordinatedAgentNode[];
  sequenceSteps: OrchestratorSequenceStep[];
  confidenceScore: number;
  keyFactors: string[];
  humanActionRequired: string;
  activityLogs: string[];
}

export async function runOrchestrator(params?: {
  kpiBreachType?: string;
  affectedRegion?: string;
  impactedSku?: string;
  productName?: string;
  serialNumber?: string;
}): Promise<OrchestratorResult> {
  const { 
    kpiBreachType, 
    affectedRegion, 
    impactedSku,
    productName,
    serialNumber
  } = params || {};

  const _kpiBreachType = kpiBreachType || (productName ? `Hardware Issue: ${productName}` : "Generic KPI Breach");
  const _affectedRegion = affectedRegion || "Global";
  const _impactedSku = impactedSku || serialNumber || "N/A";

  const prompt = `
    You are the NVIDIA Orchestrator Control Tower Agent. A critical KPI breach has occurred in our supply chain network.
    Breach Event: ${_kpiBreachType}
    Affected Region: ${_affectedRegion}
    Impacted Product SKU: ${_impactedSku}

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
  `;

  const fallback: OrchestratorResult = {
    reasoningSteps: [
      `Ingested breach alert for SKU: ${_impactedSku} in region ${_affectedRegion}.`,
      "Evaluating current buffer inventory across regional distribution centers.",
      "Initiated telemetry handshake with local Demand Sensing and Triage Nodes.",
      "Optimized cross-agent orchestration path to resolve supply deficits."
    ],
    mitigationPlanSummary: `Coordinated action plan triggered to resolve the ${_kpiBreachType} in ${_affectedRegion}. S&OP schedules are aligned, and reserve stock is being routed from the APAC hub to buffer the immediate demand spike.`,
    currentKpiValue: "78% (Threshold: 85%)",
    targetKpiValue: "Restore to >85% within 14 business days",
    coordinatedAgents: [
      { agentName: "Demand Sensing Agent", assignedAction: "Analyze spike and calculate short-term demand trends", impactWeightPct: 35, status: "Active" },
      { agentName: "Refurbish & Repair Agent", assignedAction: "Evaluate returned units and schedule immediate local repairs", impactWeightPct: 25, status: "Active" },
      { agentName: "RMA Triage Agent", assignedAction: "Exhaustive defect diagnostic and warranty verification processing", impactWeightPct: 20, status: "Active" },
      { agentName: "Replenishment Controller", assignedAction: "Initiate stock reallocation transfers from APAC logistics center", impactWeightPct: 20, status: "Pending" }
    ],
    sequenceSteps: [
      { stepNumber: 1, fromAgent: "Orchestrator Tower", toAgent: "Demand Sensing Agent", messageSignal: "ACTIVATE_REGION_TELEMETRY", resultDescription: "Hyperscaler demand signal spike analyzed and validated." },
      { stepNumber: 2, fromAgent: "Demand Sensing Agent", toAgent: "Refurbish & Repair Agent", messageSignal: "REFORECAST_YIELD_TARGET", resultDescription: "Reforecast trend integrated into factory labor and component allocations." },
      { stepNumber: 3, fromAgent: "Refurbish & Repair Agent", toAgent: "RMA Triage Agent", messageSignal: "ACCELERATE_INTAKE_DIAGNOSTICS", resultDescription: "RMA intakes accelerated to feed refurbishment lines." },
      { stepNumber: 4, fromAgent: "Orchestrator Tower", toAgent: "Replenishment Controller", messageSignal: "EXECUTE_BUFFER_DISPATCH", resultDescription: "Logistics corridor cleared and shipping container manifests generated." }
    ],
    confidenceScore: 94,
    keyFactors: [
      "Real-time sensor telemetry feedback loops",
      "Dynamic multi-agent routing algorithms",
      "Proactive safety stock buffers"
    ],
    humanActionRequired: "Approve the multi-agent orchestration sequence to dispatch the APAC buffer shipment and initialize the refurbishment labor queue.",
    activityLogs: [
      "[01:00:03] Control Tower received KPI breach event alert",
      `[01:00:04] Region context identified: ${_affectedRegion} | Product SKU: ${_impactedSku}`,
      "[01:00:05] Orchestration pipeline initialized",
      "[01:00:05] Dispatched state signals to 4 child nodes",
      "[01:00:06] Integrated multi-agent feedback response payloads"
    ]
  };

  const systemInstruction = "You are the chief AI Orchestration Engine for NVIDIA's global supply chain control tower. You must output valid, well-structured JSON matching the requested schema exactly.";

  return generateStructuredJson<OrchestratorResult>(prompt, systemInstruction, fallback);
}
