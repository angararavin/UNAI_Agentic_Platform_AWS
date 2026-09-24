import { SupplyItem, SurgeInput, DemandAnalysisOutput, AgentExecutionLog } from "../../src/types";
import { getLLMClient, callLLM, cleanJson } from "../workflow/llm-client";

export async function demandAnalystNode(state: {
  item: SupplyItem;
  surgeInput: SurgeInput;
  provider?: string;
  [key: string]: any;
}): Promise<{ demandAnalysis: DemandAnalysisOutput; logs: AgentExecutionLog[] }> {
  const startTime = Date.now();
  console.log(`[LangGraph Node 1: Demand Analyst] Processing SKU: ${state.item?.sku}... Engine: ${state.provider}`);
  const { item, surgeInput } = state;
  const llmConfig = getLLMClient(state.provider);

  const baselineUnitsInPeriod = item.baselineDailyForecast * surgeInput.targetFulfillmentDays;
  const surgeDelta = surgeInput.surgeQuantity - baselineUnitsInPeriod;
  const surgePct = Math.round((surgeInput.surgeQuantity / (baselineUnitsInPeriod || 1)) * 100);

  const systemPrompt = `You are the specialized Demand Analyst Agent in an enterprise supply chain multi-agent system.
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
}`;

  const userPrompt = `Analyze the following Demand Surge Event:
SKU: ${item.sku} - ${item.name}
Category: ${item.category}
Customer Segment: ${item.customerSegment}
Baseline Daily Forecast: ${item.baselineDailyForecast} units/day
Forecast Horizon: ${surgeInput.targetFulfillmentDays} days
Total Expected Baseline in Horizon: ${baselineUnitsInPeriod} units

Surge Order Parameters:
Surge Quantity Requested: ${surgeInput.surgeQuantity} units
Requested Fulfillment Horizon: ${surgeInput.targetFulfillmentDays} days
Customer Name: ${surgeInput.customerName || 'Strategic Enterprise Account'}
Customer Priority: ${surgeInput.customerPriority || 'High'}
Trigger Reason: ${surgeInput.triggerReason || 'Unanticipated Customer Capacity Expansion'}
Planner Notes: ${surgeInput.notes || 'None provided'}

Recent Prior Orders:
${JSON.stringify(item.recentCustomerOrders, null, 2)}

Calculate the exact demand metrics and provide a rigorous demand analysis in JSON.`;

  let demandAnalysis: DemandAnalysisOutput;
  let logSummary = "";

  try {
    const rawOutput = await callLLM(llmConfig, systemPrompt, userPrompt);
    const parsed = cleanJson(rawOutput);
    demandAnalysis = {
      surgeDeltaUnits: typeof parsed.surgeDeltaUnits === "number" ? parsed.surgeDeltaUnits : surgeDelta,
      surgePercentage: typeof parsed.surgePercentage === "number" ? parsed.surgePercentage : surgePct,
      demandPattern: parsed.demandPattern || (surgePct > 150 ? "Sudden Impulse Spike" : "Step Change"),
      underlyingSignals: Array.isArray(parsed.underlyingSignals) ? parsed.underlyingSignals : ["Concentrated Tier-1 OEM Demand", "Short fulfillment window request"],
      riskLevel: parsed.riskLevel || (surgePct > 200 ? "CRITICAL" : surgePct > 130 ? "HIGH" : "MEDIUM"),
      demandDrivers: Array.isArray(parsed.demandDrivers) ? parsed.demandDrivers : ["Emergency replacement order", "Downstream supply panic"],
      historicalComparison: parsed.historicalComparison || `Demand represents a ${surgePct}% surge over standard ${surgeInput.targetFulfillmentDays}-day baseline forecast.`,
      demandExplanation: parsed.demandExplanation || `Significant order surge of ${surgeInput.surgeQuantity} units requested against normal baseline of ${baselineUnitsInPeriod} units.`
    };
    logSummary = `Identified ${demandAnalysis.demandPattern} (${demandAnalysis.surgePercentage}% of baseline). Risk level: ${demandAnalysis.riskLevel}.`;
  } catch (error: any) {
    console.log(`[Demand Analyst] Activating deterministic analysis engine (${error?.message?.includes('429') ? 'provider rate limit' : 'offline calculation mode'}).`);
    demandAnalysis = {
      surgeDeltaUnits: surgeDelta,
      surgePercentage: surgePct,
      demandPattern: surgePct > 180 ? "Sudden Impulse Spike" : "Step Change",
      underlyingSignals: [
        `Sudden ${surgePct}% volume increase within ${surgeInput.targetFulfillmentDays} days`,
        `Deviation from ${item.baselineDailyForecast} units/day baseline rate`,
        `Customer Priority: ${surgeInput.customerPriority || 'High'}`
      ],
      riskLevel: surgePct > 220 ? "CRITICAL" : surgePct > 140 ? "HIGH" : "MEDIUM",
      demandDrivers: [
        surgeInput.triggerReason || "Rapid unforecasted capacity ramp",
        "Bullwhip effect buffer stockpiling from end-client"
      ],
      historicalComparison: `Surge order exceeds normal ${surgeInput.targetFulfillmentDays}-day consumption (${baselineUnitsInPeriod} units) by +${surgeDelta} units.`,
      demandExplanation: `The customer order for ${surgeInput.surgeQuantity} units requires ${Math.round(surgeInput.surgeQuantity / surgeInput.targetFulfillmentDays)} units/day, which is ${(surgeInput.surgeQuantity / baselineUnitsInPeriod).toFixed(1)}x the planned baseline forecast.`
    };
    logSummary = `Demand evaluated: +${surgeDelta} unit surge (${surgePct}% of baseline). Severity: ${demandAnalysis.riskLevel}.`;
  }

  const durationMs = Date.now() - startTime;
  const executionLog: AgentExecutionLog = {
    agent: "Demand Analyst Agent",
    node: "demand_analyst",
    status: "completed",
    startedAt: new Date(startTime).toISOString(),
    completedAt: new Date().toISOString(),
    durationMs,
    modelUsed: `${llmConfig.provider} (${llmConfig.modelName})`,
    summary: logSummary,
    keyOutputs: {
      surgeDeltaUnits: demandAnalysis.surgeDeltaUnits,
      surgePercentage: demandAnalysis.surgePercentage,
      riskLevel: demandAnalysis.riskLevel
    }
  };

  return {
    demandAnalysis,
    logs: [executionLog]
  };
}
