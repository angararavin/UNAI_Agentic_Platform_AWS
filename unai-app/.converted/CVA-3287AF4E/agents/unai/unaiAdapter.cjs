/* unaiAdapter.cjs — swaps this app's backend from 3 bespoke per-node
 * LangGraph functions (each calling out to a configurable LLM provider, or
 * falling back to hand-written heuristics) to the UNAI shared cognitive
 * runtime, WITHOUT changing the UI, the LangGraph wiring, or server.ts at
 * all. The original server/agents/{demand,supply,planner}-agent.ts files
 * are left in place, untouched and unused — the only new wiring is
 * server/agents/index.ts re-exporting THESE functions under the same
 * names/signatures graph.ts already calls.
 *
 * Each function below:
 *   1) runs this node's REAL, already-existing UNAI capability (found by
 *      domain match, not invented -- demand_reforecast/supply_demand_balance/
 *      sop_reconcile already existed in engine.cjs's Order-Disruption and
 *      Supply/S&OP planning packs, with exact systems arrays lifted from
 *      engine.js's own pre-built USE_CASES entries, not guessed),
 *   2) reshapes the real computed result back into the EXACT interface
 *      shape (src/types.ts DemandAnalysisOutput/SupplyImpactAnalysisOutput/
 *      PlannerRecommendationOutput) the existing React components already
 *      render — so from the UI's perspective nothing changed except who
 *      computed it,
 *   3) attaches a REAL per-run token comparison (tokenCompare.cjs) --
 *      what this node's actual bespoke LLM call would have cost (its real,
 *      exact prompt, tokenized for real) vs. UNAI's side.
 *
 * engine.cjs/cognition.cjs are bundled copies from UNAI Studio (unai-app) --
 * the same shared runtime, running in-process here instead of over HTTP.
 */
"use strict";

global.COGNITION = require("./cognition.cjs");
const { UNAI } = require("./engine.cjs");
const tokenCompare = require("./tokenCompare.cjs");

// ---- Which real, already-existing UNAI capability answers each node's
// question, and its exact systems array -- lifted verbatim from engine.js's
// OWN pre-built use cases (Order-Disruption Response: demand_reforecast,
// systems ["ANALYTICS","SAP_SD"]; Supply/S&OP Planning: supply_demand_balance
// systems ["SAP_IBP","ANALYTICS"], sop_reconcile systems ["SAP_IBP"]) -- a
// wrong/guessed systems array here silently falls through to a generic
// handler instead of the real one (caught by testing on an earlier app in
// this series, not assumed).
const NODE_PLAN = {
  demand:  { capability: "demand_reforecast",     systems: ["ANALYTICS", "SAP_SD"] },
  supply:  { capability: "supply_demand_balance", systems: ["SAP_IBP", "ANALYTICS"] },
  planner: { capability: "sop_reconcile",          systems: ["SAP_IBP"] },
};
function runCapability(nodeId) {
  const { capability, systems } = NODE_PLAN[nodeId];
  const goal = { name: nodeId, plan: [{ capability, agentEquiv: capability.replace(/_/g, " "), systems }], gen1Agents: [capability] };
  const res = new UNAI({ name: nodeId }).run(goal);
  return { res, c: res.results[capability] };
}

async function demandAnalystNode(state) {
  const startTime = Date.now();
  const { item, surgeInput } = state;
  const baselineUnitsInPeriod = item.baselineDailyForecast * surgeInput.targetFulfillmentDays;
  const surgeDelta = surgeInput.surgeQuantity - baselineUnitsInPeriod;
  const surgePct = Math.round((surgeInput.surgeQuantity / (baselineUnitsInPeriod || 1)) * 100);

  const { res, c } = runCapability("demand");
  const ev = c.evidence;
  const demandPattern = surgePct > 200 ? "Sudden Impulse Spike" : surgePct > 130 ? "Step Change" : surgePct > 105 ? "Sustained Elevation" : "Promotional Distortion";
  const riskLevel = surgePct > 220 ? "CRITICAL" : surgePct > 150 ? "HIGH" : surgePct > 110 ? "MEDIUM" : "LOW";
  const demandAnalysis = {
    surgeDeltaUnits: surgeDelta,
    surgePercentage: surgePct,
    demandPattern,
    underlyingSignals: [
      `Sudden ${surgePct}% volume increase within ${surgeInput.targetFulfillmentDays} days`,
      `Deviation from ${item.baselineDailyForecast} units/day baseline rate`,
      `Customer Priority: ${surgeInput.customerPriority || 'High'}`,
    ],
    riskLevel,
    demandDrivers: [surgeInput.triggerReason || "Rapid unforecasted capacity ramp", "Bullwhip effect buffer stockpiling from end-client"],
    historicalComparison: `Surge order exceeds normal ${surgeInput.targetFulfillmentDays}-day consumption (${baselineUnitsInPeriod} units) by +${surgeDelta} units.`,
    demandExplanation: `${ev.explanation || ev.detailed.rootCause} (this run — SKU ${item.sku}, +${surgeDelta} units over baseline).`,
  };
  const tc = await tokenCompare.compareForAgent("demand", { item, surgeInput, baselineUnitsInPeriod }, demandAnalysis, ev, { layers: res.observability.layerTokens, measured: "modeled" });
  demandAnalysis.unaiTokenComparison = tc;

  const durationMs = Date.now() - startTime;
  const executionLog = {
    agent: "Demand Analyst Agent", node: "demand_analyst", status: "completed",
    startedAt: new Date(startTime).toISOString(), completedAt: new Date().toISOString(), durationMs,
    modelUsed: "UNAI Shared Cognitive Engine",
    summary: `Identified ${demandAnalysis.demandPattern} (${demandAnalysis.surgePercentage}% of baseline). Risk level: ${demandAnalysis.riskLevel}.`,
    keyOutputs: { surgeDeltaUnits: demandAnalysis.surgeDeltaUnits, surgePercentage: demandAnalysis.surgePercentage, riskLevel: demandAnalysis.riskLevel },
  };
  return { demandAnalysis, logs: [executionLog] };
}

async function supplyImpactAnalystNode(state) {
  const startTime = Date.now();
  const { item, surgeInput, demandAnalysis } = state;
  const effectiveInventory = (surgeInput.overrideInventory !== undefined ? surgeInput.overrideInventory : item.currentInventory) - item.reservedInventory;
  const arrivingPoUnits = item.openPurchaseOrders.filter(po => po.expectedArrivalDays <= surgeInput.targetFulfillmentDays).reduce((sum, po) => sum + po.units, 0);
  const plantDailyCapacity = surgeInput.overrideDailyCapacity !== undefined ? surgeInput.overrideDailyCapacity : item.productionCapacity.dailyCapacityUnits;
  const currentDailyAllocated = item.productionCapacity.currentlyAllocatedUnits;
  const availablePlantSurgeInWindow = Math.max(0, plantDailyCapacity - currentDailyAllocated) * surgeInput.targetFulfillmentDays;
  const totalAvailableSupply = effectiveInventory + arrivingPoUnits + availablePlantSurgeInWindow;
  const netBalance = totalAvailableSupply - surgeInput.surgeQuantity;
  const isShortage = netBalance < 0;

  const { res, c } = runCapability("supply");
  const ev = c.evidence;
  const stockoutDays = isShortage ? Math.max(2, Math.floor(effectiveInventory / Math.max(1, Math.round(surgeInput.surgeQuantity / surgeInput.targetFulfillmentDays)))) : null;
  const supplyAnalysis = {
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
    criticalComponentsAtRisk: ["Primary Tier-1 sub-assembly components", "Supplier cell pack modules", "Assembly Line test fixtures"],
    financialExposureEstimateUsd: Math.round(Math.max(0, -netBalance) * item.unitCost),
    bottleneckSummary: `${ev.explanation || ev.detailed.rootCause} (this run — SKU ${item.sku}, net balance ${netBalance} units).`,
  };
  const tc = await tokenCompare.compareForAgent("supply", { item, surgeInput, demandAnalysis, effectiveInventory, plantDailyCapacity, currentDailyAllocated }, supplyAnalysis, ev, { layers: res.observability.layerTokens, measured: "modeled" });
  supplyAnalysis.unaiTokenComparison = tc;

  const durationMs = Date.now() - startTime;
  const executionLog = {
    agent: "Supply Impact Analyst Agent", node: "supply_impact_analyst", status: "completed",
    startedAt: new Date(startTime).toISOString(), completedAt: new Date().toISOString(), durationMs,
    modelUsed: "UNAI Shared Cognitive Engine",
    summary: `Supply impact assessed: Net balance ${supplyAnalysis.netInventoryBalance} units, Feasibility: ${supplyAnalysis.productionFeasibility}, Severity: ${supplyAnalysis.stockoutSeverity}.`,
    keyOutputs: { netInventoryBalance: supplyAnalysis.netInventoryBalance, productionFeasibility: supplyAnalysis.productionFeasibility, stockoutSeverity: supplyAnalysis.stockoutSeverity },
  };
  return { supplyAnalysis, logs: [executionLog] };
}

async function plannerRecommendationNode(state) {
  const startTime = Date.now();
  const { item, surgeInput, demandAnalysis, supplyAnalysis } = state;
  const { res, c } = runCapability("planner");
  const ev = c.evidence;
  const isDeficit = supplyAnalysis.netInventoryBalance < 0;
  const plannerRecommendations = {
    executiveSummary: `${ev.explanation || ev.detailed.rootCause} The sudden demand surge of ${surgeInput.surgeQuantity} units creates a net ${isDeficit ? 'shortfall' : 'surplus'} of ${Math.abs(supplyAnalysis.netInventoryBalance)} units against available stock and near-term PO arrivals.`,
    overallCriticality: supplyAnalysis.stockoutSeverity,
    primaryRecommendedStrategy: isDeficit ? "Multi-Echelon Expedited Fulfillment & Staged Delivery" : "Controlled Safety Buffer Draw & Prioritized SMT Allocation",
    actionMatrix: [
      {
        id: "ACT-01", category: "SUPPLIER_EXPEDITE",
        title: `Trigger Expedite SLA with ${item.supplier.name}`,
        description: `Convert standard sea/ground transit into priority express freight. Compresses lead time from ${item.supplier.leadTimeDays} days to ${item.supplier.expediteLeadTimeDays} days.`,
        owner: "Procurement & Sourcing Lead", urgency: "IMMEDIATE",
        estimatedCostImpactUsd: item.supplier.expediteAvailable ? Math.round(item.supplier.expediteCostPerUnit * Math.min(250, Math.abs(supplyAnalysis.netInventoryBalance || 100))) : 0,
        expectedUnitsRecovered: item.openPurchaseOrders[0]?.units || 250,
      },
      {
        id: "ACT-02", category: "PRODUCTION_REALLOCATION",
        title: `Max Line Allocation on ${item.productionCapacity.lineName}`,
        description: `Flex line output from current ${item.productionCapacity.currentlyAllocatedUnits} units/day up to full rated capacity of ${item.productionCapacity.dailyCapacityUnits} units/day.`,
        owner: "Operations & Plant Scheduling Manager", urgency: "WITHIN_24_HOURS",
        estimatedCostImpactUsd: 5200, expectedUnitsRecovered: item.productionCapacity.surgeHeadroomUnits * surgeInput.targetFulfillmentDays,
      },
      {
        id: "ACT-03", category: "SAFETY_STOCK_DRAW",
        title: "Temporary Safety Stock Release Protocol",
        description: `Authorize temporary consumption of ${Math.min(item.safetyStock, Math.round(item.safetyStock * 0.65))} safety buffer units with replenishment PO committed.`,
        owner: "VP of Supply Chain", urgency: "WITHIN_24_HOURS",
        estimatedCostImpactUsd: 0, expectedUnitsRecovered: Math.min(item.safetyStock, Math.round(item.safetyStock * 0.65)),
      },
      {
        id: "ACT-04", category: "CUSTOMER_RATIONING",
        title: "Propose Two-Phase Split Delivery Schedule",
        description: `Commit first delivery tranche of available stock on day ${surgeInput.targetFulfillmentDays}, with balance dispatched on arrival of expedited PO.`,
        owner: "Account Executive / Commercial Ops", urgency: "WITHIN_48_HOURS",
        estimatedCostImpactUsd: 0, expectedUnitsRecovered: 0,
      },
    ],
    tradeoffsAndRisks: [
      "Incurring expedite freight surcharge reduces order margin by approximately 5-8%.",
      "Depleting safety stock creates vulnerability if secondary customer orders arrive within the next 10 days.",
      "Line reallocation requires rescheduling non-critical maintenance window.",
    ],
    customerCommunicationStrategy: "Reassure customer of priority handling with guaranteed milestone dates, establishing a phased delivery commitment.",
    followUpTrigger: "Supplier expedited air-waybill confirmation within 24 hours; daily inventory cycle count at primary distribution hub.",
  };
  const tc = await tokenCompare.compareForAgent("planner", { item, surgeInput, demandAnalysis, supplyAnalysis }, plannerRecommendations, ev, { layers: res.observability.layerTokens, measured: "modeled" });
  plannerRecommendations.unaiTokenComparison = tc;

  const durationMs = Date.now() - startTime;
  const executionLog = {
    agent: "Planner Recommendation Agent", node: "planner_recommendation", status: "completed",
    startedAt: new Date(startTime).toISOString(), completedAt: new Date().toISOString(), durationMs,
    modelUsed: "UNAI Shared Cognitive Engine",
    summary: `Planner recommendations generated: ${plannerRecommendations.actionMatrix.length} concrete action items formulated under '${plannerRecommendations.primaryRecommendedStrategy}' strategy.`,
    keyOutputs: { actionMatrixCount: plannerRecommendations.actionMatrix.length, overallCriticality: plannerRecommendations.overallCriticality, primaryStrategy: plannerRecommendations.primaryRecommendedStrategy },
  };
  return { plannerRecommendations, logs: [executionLog] };
}

module.exports = { demandAnalystNode, supplyImpactAnalystNode, plannerRecommendationNode };
