import {
  SupplyItem,
  SurgeInput,
  DemandAnalysisOutput,
  SupplyImpactAnalysisOutput,
  PlannerRecommendationOutput,
  AgentExecutionLog
} from "../../src/types";
import { getLLMClient, callLLM, cleanJson } from "../workflow/llm-client";

export async function plannerRecommendationNode(state: {
  item: SupplyItem;
  surgeInput: SurgeInput;
  demandAnalysis: DemandAnalysisOutput;
  supplyAnalysis: SupplyImpactAnalysisOutput;
  provider?: string;
  [key: string]: any;
}): Promise<{ plannerRecommendations: PlannerRecommendationOutput; logs: AgentExecutionLog[] }> {
  const startTime = Date.now();
  console.log(`[LangGraph Node 3: Planner Recommendation] Synthesizing action matrix for ${state.item?.sku}...`);
  const { item, surgeInput, demandAnalysis, supplyAnalysis } = state;
  const llmConfig = getLLMClient(state.provider);

  const systemPrompt = `You are the specialized Planner Recommendation Agent in an enterprise supply chain multi-agent system.
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
  "actionMatrix": Array<{
    "id": string,
    "category": "SUPPLIER_EXPEDITE" | "PRODUCTION_REALLOCATION" | "SAFETY_STOCK_DRAW" | "CUSTOMER_RATIONING" | "ALTERNATE_SOURCING",
    "title": string,
    "description": string,
    "owner": string,
    "urgency": "IMMEDIATE" | "WITHIN_24_HOURS" | "WITHIN_48_HOURS" | "NEXT_CYCLE",
    "estimatedCostImpactUsd": number,
    "expectedUnitsRecovered": number
  }>,
  "tradeoffsAndRisks": string[],
  "customerCommunicationStrategy": string,
  "followUpTrigger": string
}`;

  const userPrompt = `Synthesize actionable recommendations for planner:
SKU: ${item.sku} - ${item.name}
Surge Request: ${surgeInput.surgeQuantity} units in ${surgeInput.targetFulfillmentDays} days
Customer: ${surgeInput.customerName || 'Enterprise Client'} (Priority: ${surgeInput.customerPriority || 'High'})

Demand Analyst Assessment:
${JSON.stringify(demandAnalysis, null, 2)}

Supply Impact Analyst Assessment:
${JSON.stringify(supplyAnalysis, null, 2)}

Supplier Details:
- Name: ${item.supplier.name}
- Standard Lead: ${item.supplier.leadTimeDays}d | Expedited: ${item.supplier.expediteLeadTimeDays}d ($${item.supplier.expediteCostPerUnit}/unit)
- Expedite Feasible: ${item.supplier.expediteAvailable}

Generate high-caliber, practical supply chain planner recommendations in valid JSON.`;

  let plannerRecommendations: PlannerRecommendationOutput;
  let logSummary = "";

  try {
    const rawOutput = await callLLM(llmConfig, systemPrompt, userPrompt);
    const parsed = cleanJson(rawOutput);

    const actionMatrix = Array.isArray(parsed.actionMatrix) && parsed.actionMatrix.length > 0
      ? parsed.actionMatrix.map((act: any, idx: number) => ({
          id: act.id || `ACT-0${idx + 1}`,
          category: act.category || "SUPPLIER_EXPEDITE",
          title: act.title || "Review Supply Allocation",
          description: act.description || "Execute tactical supply chain adjustment.",
          owner: act.owner || "Supply Chain Planner",
          urgency: act.urgency || "IMMEDIATE",
          estimatedCostImpactUsd: typeof act.estimatedCostImpactUsd === "number" ? act.estimatedCostImpactUsd : 0,
          expectedUnitsRecovered: typeof act.expectedUnitsRecovered === "number" ? act.expectedUnitsRecovered : 0
        }))
      : [];

    plannerRecommendations = {
      executiveSummary: parsed.executiveSummary || `Order surge of ${surgeInput.surgeQuantity} units triggers a ${supplyAnalysis.stockoutSeverity} supply constraint. Coordinated expediting and production re-allocation are required.`,
      overallCriticality: parsed.overallCriticality || supplyAnalysis.stockoutSeverity,
      primaryRecommendedStrategy: parsed.primaryRecommendedStrategy || "Hybrid Expedite & Staged Batch Delivery",
      actionMatrix: actionMatrix.length > 0 ? actionMatrix : [
        {
          id: "ACT-01",
          category: "SUPPLIER_EXPEDITE",
          title: `Expedite Open PO with ${item.supplier.name}`,
          description: `Authorize expedited air-freight on open PO to compress transit from ${item.supplier.leadTimeDays} days down to ${item.supplier.expediteLeadTimeDays} days.`,
          owner: "Global Sourcing Manager",
          urgency: "IMMEDIATE",
          estimatedCostImpactUsd: Math.round(Math.min(300, Math.abs(supplyAnalysis.netInventoryBalance)) * item.supplier.expediteCostPerUnit),
          expectedUnitsRecovered: Math.min(400, Math.abs(supplyAnalysis.netInventoryBalance))
        },
        {
          id: "ACT-02",
          category: "PRODUCTION_REALLOCATION",
          title: `Reallocate Plant Line Headroom on ${item.productionCapacity.lineId}`,
          description: `Activate 2nd shift surge allocation to utilize full ${item.productionCapacity.dailyCapacityUnits} units/day line ceiling.`,
          owner: "Plant Operations Supervisor",
          urgency: "WITHIN_24_HOURS",
          estimatedCostImpactUsd: 4500,
          expectedUnitsRecovered: item.productionCapacity.surgeHeadroomUnits * surgeInput.targetFulfillmentDays
        },
        {
          id: "ACT-03",
          category: "CUSTOMER_RATIONING",
          title: "Negotiate Staged Split-Shipment with Client",
          description: `Deliver 60% of units from on-hand and early POs by day ${surgeInput.targetFulfillmentDays}, and schedule remaining 40% 7 days later.`,
          owner: "Key Account Director",
          urgency: "WITHIN_24_HOURS",
          estimatedCostImpactUsd: 0,
          expectedUnitsRecovered: 0
        }
      ],
      tradeoffsAndRisks: Array.isArray(parsed.tradeoffsAndRisks) ? parsed.tradeoffsAndRisks : [
        "Drawing down safety stock elevates stockout risk for secondary tier-2 accounts.",
        "Expedited air-freight surcharge reduces order gross margin by approximately 6.5%."
      ],
      customerCommunicationStrategy: parsed.customerCommunicationStrategy || "Confirm initial tranche delivery immediately while locking in confirmed expedited arrival date for final tranche.",
      followUpTrigger: parsed.followUpTrigger || "Supplier dispatch notification within 48 hours and daily plant line yield review."
    };
    logSummary = `Planner recommendations generated: ${plannerRecommendations.actionMatrix.length} concrete action items formulated under '${plannerRecommendations.primaryRecommendedStrategy}' strategy.`;
  } catch (error: any) {
    console.log(`[Planner Recommendation Agent] Activating deterministic recommendation engine (${error?.message?.includes('429') ? 'provider rate limit' : 'offline calculation mode'}).`);
    const isDeficit = supplyAnalysis.netInventoryBalance < 0;
    plannerRecommendations = {
      executiveSummary: `The sudden demand surge of ${surgeInput.surgeQuantity} units creates a net ${isDeficit ? 'shortfall' : 'surplus'} of ${Math.abs(supplyAnalysis.netInventoryBalance)} units against available stock and near-term PO arrivals. Immediate supplier coordination and production shift balancing are necessary to protect customer SLA without depleting safety stocks.`,
      overallCriticality: supplyAnalysis.stockoutSeverity,
      primaryRecommendedStrategy: isDeficit ? "Multi-Echelon Expedited Fulfillment & Staged Delivery" : "Controlled Safety Buffer Draw & Prioritized SMT Allocation",
      actionMatrix: [
        {
          id: "ACT-01",
          category: "SUPPLIER_EXPEDITE",
          title: `Trigger Expedite SLA with ${item.supplier.name}`,
          description: `Convert standard sea/ground transit into priority express freight. Compresses lead time from ${item.supplier.leadTimeDays} days to ${item.supplier.expediteLeadTimeDays} days.`,
          owner: "Procurement & Sourcing Lead",
          urgency: "IMMEDIATE",
          estimatedCostImpactUsd: item.supplier.expediteAvailable ? Math.round(item.supplier.expediteCostPerUnit * Math.min(250, Math.abs(supplyAnalysis.netInventoryBalance || 100))) : 0,
          expectedUnitsRecovered: item.openPurchaseOrders[0]?.units || 250
        },
        {
          id: "ACT-02",
          category: "PRODUCTION_REALLOCATION",
          title: `Max Line Allocation on ${item.productionCapacity.lineName}`,
          description: `Flex line output from current ${item.productionCapacity.currentlyAllocatedUnits} units/day up to full rated capacity of ${item.productionCapacity.dailyCapacityUnits} units/day.`,
          owner: "Operations & Plant Scheduling Manager",
          urgency: "WITHIN_24_HOURS",
          estimatedCostImpactUsd: 5200,
          expectedUnitsRecovered: item.productionCapacity.surgeHeadroomUnits * surgeInput.targetFulfillmentDays
        },
        {
          id: "ACT-03",
          category: "SAFETY_STOCK_DRAW",
          title: "Temporary Safety Stock Release Protocol",
          description: `Authorize temporary consumption of ${Math.min(item.safetyStock, Math.round(item.safetyStock * 0.65))} safety buffer units with replenishment PO committed.`,
          owner: "VP of Supply Chain",
          urgency: "WITHIN_24_HOURS",
          estimatedCostImpactUsd: 0,
          expectedUnitsRecovered: Math.min(item.safetyStock, Math.round(item.safetyStock * 0.65))
        },
        {
          id: "ACT-04",
          category: "CUSTOMER_RATIONING",
          title: "Propose Two-Phase Split Delivery Schedule",
          description: `Commit first delivery tranche of available stock on day ${surgeInput.targetFulfillmentDays}, with balance dispatched on arrival of expedited PO.`,
          owner: "Account Executive / Commercial Ops",
          urgency: "WITHIN_48_HOURS",
          estimatedCostImpactUsd: 0,
          expectedUnitsRecovered: 0
        }
      ],
      tradeoffsAndRisks: [
        "Incurring expedite freight surcharge reduces order margin by approximately 5-8%.",
        "Depleting safety stock creates vulnerability if secondary customer orders arrive within the next 10 days.",
        "Line reallocation requires rescheduling non-critical maintenance window."
      ],
      customerCommunicationStrategy: "Reassure customer of priority handling with guaranteed milestone dates, establishing a phased delivery commitment.",
      followUpTrigger: "Supplier expedited air-waybill confirmation within 24 hours; daily inventory cycle count at primary distribution hub."
    };
    logSummary = `Planner recommendations finalized: 4 structured mitigations formulated. Overall criticality: ${plannerRecommendations.overallCriticality}.`;
  }

  const durationMs = Date.now() - startTime;
  const executionLog: AgentExecutionLog = {
    agent: "Planner Recommendation Agent",
    node: "planner_recommendation",
    status: "completed",
    startedAt: new Date(startTime).toISOString(),
    completedAt: new Date().toISOString(),
    durationMs,
    modelUsed: `${llmConfig.provider} (${llmConfig.modelName})`,
    summary: logSummary,
    keyOutputs: {
      actionMatrixCount: plannerRecommendations.actionMatrix.length,
      overallCriticality: plannerRecommendations.overallCriticality,
      primaryStrategy: plannerRecommendations.primaryRecommendedStrategy
    }
  };

  return {
    plannerRecommendations,
    logs: [executionLog]
  };
}
