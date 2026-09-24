import { SupplyItem, SurgeInput, DemandAnalysisOutput, SupplyImpactAnalysisOutput, AgentExecutionLog } from "../../src/types";
import { getLLMClient, callLLM, cleanJson } from "../workflow/llm-client";

export async function supplyImpactAnalystNode(state: {
  item: SupplyItem;
  surgeInput: SurgeInput;
  demandAnalysis: DemandAnalysisOutput;
  provider?: string;
  [key: string]: any;
}): Promise<{ supplyAnalysis: SupplyImpactAnalysisOutput; logs: AgentExecutionLog[] }> {
  const startTime = Date.now();
  console.log(`[LangGraph Node 2: Supply Impact Analyst] Evaluating inventory & capacity constraints for ${state.item?.sku}...`);
  const { item, surgeInput, demandAnalysis } = state;
  const llmConfig = getLLMClient(state.provider);

  // Supply inventory math
  const effectiveInventory = (surgeInput.overrideInventory !== undefined ? surgeInput.overrideInventory : item.currentInventory) - item.reservedInventory;
  const arrivingPoUnits = item.openPurchaseOrders
    .filter(po => po.expectedArrivalDays <= surgeInput.targetFulfillmentDays)
    .reduce((sum, po) => sum + po.units, 0);

  const plantDailyCapacity = surgeInput.overrideDailyCapacity !== undefined ? surgeInput.overrideDailyCapacity : item.productionCapacity.dailyCapacityUnits;
  const currentDailyAllocated = item.productionCapacity.currentlyAllocatedUnits;
  const availablePlantSurgeInWindow = Math.max(0, plantDailyCapacity - currentDailyAllocated) * surgeInput.targetFulfillmentDays;

  const totalAvailableSupply = effectiveInventory + arrivingPoUnits + availablePlantSurgeInWindow;
  const netBalance = totalAvailableSupply - surgeInput.surgeQuantity;
  const isShortage = netBalance < 0;

  const systemPrompt = `You are the specialized Supply Impact Analyst Agent in an enterprise supply chain multi-agent system.
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
}`;

  const userPrompt = `Evaluate the supply impact for:
SKU: ${item.sku} - ${item.name}
Unit Cost: $${item.unitCost}
Surge Demand: ${surgeInput.surgeQuantity} units requested in ${surgeInput.targetFulfillmentDays} days
Demand Analysis Output: ${JSON.stringify(demandAnalysis, null, 2)}

Current Inventory State:
- On-hand Inventory: ${item.currentInventory} units
- Reserved Inventory: ${item.reservedInventory} units
- Safety Stock Threshold: ${item.safetyStock} units
- Effective Free Inventory: ${effectiveInventory} units
- Warehouse: ${item.warehouseLocation}

Open Purchase Orders:
${JSON.stringify(item.openPurchaseOrders, null, 2)}

Primary Supplier Profile:
- Supplier: ${item.supplier.name}
- Standard Lead Time: ${surgeInput.overrideSupplierLeadDays || item.supplier.leadTimeDays} days
- Expedited Lead Time: ${item.supplier.expediteLeadTimeDays} days
- Expedite Available: ${item.supplier.expediteAvailable}
- Expedite Surcharge: $${item.supplier.expediteCostPerUnit}/unit
- Reliability: ${item.supplier.reliabilityRating}%

Production Capacity:
- Line: ${item.productionCapacity.lineName} (${item.productionCapacity.lineId})
- Max Daily Capacity: ${plantDailyCapacity} units/day
- Current Allocated Capacity: ${currentDailyAllocated} units/day
- Daily Headroom: ${Math.max(0, plantDailyCapacity - currentDailyAllocated)} units/day
- Scheduled Line Maintenance: ${item.productionCapacity.maintenanceScheduledDays ? `In ${item.productionCapacity.maintenanceScheduledDays} days` : 'None in horizon'}

Calculate accurate supply feasibility metrics and return the structured JSON assessment.`;

  let supplyAnalysis: SupplyImpactAnalysisOutput;
  let logSummary = "";

  try {
    const rawOutput = await callLLM(llmConfig, systemPrompt, userPrompt);
    const parsed = cleanJson(rawOutput);
    supplyAnalysis = {
      netInventoryBalance: typeof parsed.netInventoryBalance === "number" ? parsed.netInventoryBalance : netBalance,
      projectedStockoutDays: parsed.projectedStockoutDays !== undefined ? parsed.projectedStockoutDays : (isShortage ? Math.max(1, Math.floor(effectiveInventory / Math.max(1, Math.round(surgeInput.surgeQuantity / surgeInput.targetFulfillmentDays)))) : null),
      stockoutSeverity: parsed.stockoutSeverity || (netBalance < -150 ? "CRITICAL" : netBalance < 0 ? "HIGH" : netBalance < item.safetyStock ? "MEDIUM" : "LOW"),
      openPoContributionUnits: typeof parsed.openPoContributionUnits === "number" ? parsed.openPoContributionUnits : arrivingPoUnits,
      poArrivalTimingAssessment: parsed.poArrivalTimingAssessment || `${arrivingPoUnits} units across open POs arrive within the ${surgeInput.targetFulfillmentDays}-day target window.`,
      supplierLeadTimeConstraint: parsed.supplierLeadTimeConstraint || `Standard lead time of ${item.supplier.leadTimeDays} days exceeds customer ${surgeInput.targetFulfillmentDays}-day deadline.`,
      productionFeasibility: parsed.productionFeasibility || (isShortage ? "BOTTLENECKED" : "PARTIALLY_FEASIBLE"),
      capacityUtilizationBeforeSurge: typeof parsed.capacityUtilizationBeforeSurge === "number" ? parsed.capacityUtilizationBeforeSurge : Math.round((currentDailyAllocated / plantDailyCapacity) * 100),
      capacityUtilizationAfterSurge: typeof parsed.capacityUtilizationAfterSurge === "number" ? parsed.capacityUtilizationAfterSurge : Math.round(((currentDailyAllocated + (surgeInput.surgeQuantity / surgeInput.targetFulfillmentDays)) / plantDailyCapacity) * 100),
      capacityShortfallUnits: typeof parsed.capacityShortfallUnits === "number" ? parsed.capacityShortfallUnits : Math.max(0, -netBalance),
      criticalComponentsAtRisk: Array.isArray(parsed.criticalComponentsAtRisk) ? parsed.criticalComponentsAtRisk : ["Upstream raw materials", "SMT components", "Final pack testing rigs"],
      financialExposureEstimateUsd: typeof parsed.financialExposureEstimateUsd === "number" ? parsed.financialExposureEstimateUsd : Math.round(Math.max(0, -netBalance) * item.unitCost),
      bottleneckSummary: parsed.bottleneckSummary || (isShortage ? `Supply gap of ${Math.abs(netBalance)} units; plant capacity and PO delivery times cannot cover full surge without expediting.` : `Supply is tight but feasible with safety stock draw.`)
    };
    logSummary = `Supply impact assessed: Net balance ${supplyAnalysis.netInventoryBalance} units, Feasibility: ${supplyAnalysis.productionFeasibility}, Severity: ${supplyAnalysis.stockoutSeverity}.`;
  } catch (error: any) {
    console.log(`[Supply Impact Analyst] Activating deterministic analysis engine (${error?.message?.includes('429') ? 'provider rate limit' : 'offline calculation mode'}).`);
    const stockoutDays = isShortage ? Math.max(2, Math.floor(effectiveInventory / Math.max(1, Math.round(surgeInput.surgeQuantity / surgeInput.targetFulfillmentDays)))) : null;
    supplyAnalysis = {
      netInventoryBalance: netBalance,
      projectedStockoutDays: stockoutDays,
      stockoutSeverity: netBalance < -150 ? "CRITICAL" : netBalance < 0 ? "HIGH" : netBalance < item.safetyStock ? "MEDIUM" : "LOW",
      openPoContributionUnits: arrivingPoUnits,
      poArrivalTimingAssessment: `${arrivingPoUnits} units due within ${surgeInput.targetFulfillmentDays} days. Additional POs scheduled beyond the customer deadline.`,
      supplierLeadTimeConstraint: `Standard supplier lead time is ${item.supplier.leadTimeDays} days vs customer requirement of ${surgeInput.targetFulfillmentDays} days. Expedited freight (${item.supplier.expediteLeadTimeDays} days) is required.`,
      productionFeasibility: isShortage ? "BOTTLENECKED" : "PARTIALLY_FEASIBLE",
      capacityUtilizationBeforeSurge: Math.round((currentDailyAllocated / plantDailyCapacity) * 100),
      capacityUtilizationAfterSurge: Math.round(((currentDailyAllocated + (surgeInput.surgeQuantity / surgeInput.targetFulfillmentDays)) / plantDailyCapacity) * 100),
      capacityShortfallUnits: Math.max(0, -netBalance),
      criticalComponentsAtRisk: [
        "Primary Tier-1 sub-assembly components",
        "Supplier cell pack modules",
        "Assembly Line test fixtures"
      ],
      financialExposureEstimateUsd: Math.round(Math.max(0, -netBalance) * item.unitCost),
      bottleneckSummary: isShortage
        ? `Deficit of ${Math.abs(netBalance)} units. Production line at capacity headroom limit; supplier lead times require immediate expedite.`
        : `Available stock and line headroom can fulfill order, but draws safety stock down to dangerously low levels.`
    };
    logSummary = `Supply evaluated: ${isShortage ? 'Deficit' : 'Surplus'} of ${Math.abs(netBalance)} units. Financial exposure: $${supplyAnalysis.financialExposureEstimateUsd.toLocaleString()}.`;
  }

  const durationMs = Date.now() - startTime;
  const executionLog: AgentExecutionLog = {
    agent: "Supply Impact Analyst Agent",
    node: "supply_impact_analyst",
    status: "completed",
    startedAt: new Date(startTime).toISOString(),
    completedAt: new Date().toISOString(),
    durationMs,
    modelUsed: `${llmConfig.provider} (${llmConfig.modelName})`,
    summary: logSummary,
    keyOutputs: {
      netInventoryBalance: supplyAnalysis.netInventoryBalance,
      productionFeasibility: supplyAnalysis.productionFeasibility,
      stockoutSeverity: supplyAnalysis.stockoutSeverity
    }
  };

  return {
    supplyAnalysis,
    logs: [executionLog]
  };
}
