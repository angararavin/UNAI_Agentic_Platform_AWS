import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import {
  SupplyItem,
  SurgeInput,
  DemandAnalysisOutput,
  SupplyImpactAnalysisOutput,
  PlannerRecommendationOutput,
  HumanReviewState,
  AgentExecutionLog,
  AnalysisRunResult
} from "../../src/types";
import { getLLMClient } from "./llm-client";
import {
  demandAnalystNode,
  supplyImpactAnalystNode,
  plannerRecommendationNode,
  humanReviewInitNode
} from "../agents";

// LangGraph Annotation Schema for Order Surge Impact Workflow
export const OrderSurgeStateAnnotation = Annotation.Root({
  item: Annotation<SupplyItem>,
  surgeInput: Annotation<SurgeInput>,
  provider: Annotation<string>,
  modelName: Annotation<string>,
  demandAnalysis: Annotation<DemandAnalysisOutput>,
  supplyAnalysis: Annotation<SupplyImpactAnalysisOutput>,
  plannerRecommendations: Annotation<PlannerRecommendationOutput>,
  humanReview: Annotation<HumanReviewState>,
  logs: Annotation<AgentExecutionLog[]>({
    reducer: (curr, update) => curr.concat(update),
    default: () => [],
  }),
});

export type OrderSurgeStateType = typeof OrderSurgeStateAnnotation.State;

// Build and compile the LangGraph workflow including Human Decision Gate
export function createOrderSurgeGraph() {
  const workflow = new StateGraph(OrderSurgeStateAnnotation)
    .addNode("demand_analyst", demandAnalystNode)
    .addNode("supply_impact_analyst", supplyImpactAnalystNode)
    .addNode("planner_recommendation", plannerRecommendationNode)
    .addNode("human_review_gate", humanReviewInitNode)
    .addEdge(START, "demand_analyst")
    .addEdge("demand_analyst", "supply_impact_analyst")
    .addEdge("supply_impact_analyst", "planner_recommendation")
    .addEdge("planner_recommendation", "human_review_gate")
    .addEdge("human_review_gate", END);

  return workflow.compile();
}

// Helper to execute the autonomous multi-agent pipeline up to Human Review
export async function runOrderSurgeAnalysis(
  item: SupplyItem,
  surgeInput: SurgeInput,
  provider?: string
): Promise<AnalysisRunResult> {
  const overallStartTime = Date.now();
  const graph = createOrderSurgeGraph();
  const llmInfo = getLLMClient(provider);

  const initialState = {
    item,
    surgeInput,
    provider: llmInfo.provider,
    modelName: llmInfo.modelName,
    demandAnalysis: null as any,
    supplyAnalysis: null as any,
    plannerRecommendations: null as any,
    humanReview: null as any,
    logs: []
  };

  const finalState = await graph.invoke(initialState);
  const totalDurationMs = Date.now() - overallStartTime;

  // Aggregate the 3 per-node real token comparisons (attached by
  // agents/unai/unaiAdapter.cjs to each output) into one top-level field --
  // public/unai-token-badge.js watches for a top-level unaiTokenComparison
  // on the JSON response, same as the single-agent apps in this series.
  const perNode = [
    (finalState.demandAnalysis as any)?.unaiTokenComparison,
    (finalState.supplyAnalysis as any)?.unaiTokenComparison,
    (finalState.plannerRecommendations as any)?.unaiTokenComparison,
  ].filter(Boolean);
  let unaiTokenComparison: any = undefined;
  if (perNode.length) {
    const sum = (key: string, path: string[]) => perNode.reduce((a, tc) => {
      let v = tc; for (const p of path) v = v && v[p];
      return a + (typeof v === "number" ? v : 0);
    }, 0);
    const anyLive = perNode.some(tc => tc.unaiIfLlmNarrated && tc.unaiIfLlmNarrated.measured === "live");
    const originalTotal = sum("original.total", ["original", "total"]);
    const unaiTotal = sum("unai.total", ["unaiIfLlmNarrated", "total"]);
    unaiTokenComparison = {
      methodology: `Sum across all ${perNode.length} agent nodes in this run (Demand Analyst, Supply Impact Analyst, Planner Recommendation). ` + perNode[perNode.length - 1].methodology,
      original: {
        label: `Original app: ${perNode.length} full LLM calls (one per node, this run's real prompts)`,
        promptTokens: sum("op", ["original", "promptTokens"]),
        completionTokens: sum("oc", ["original", "completionTokens"]),
        total: originalTotal,
      },
      unaiIfLlmNarrated: {
        label: anyLive ? `UNAI, LIVE calls: ${perNode.length} shared explainability calls` : `UNAI, IF it also narrated via an LLM: ${perNode.length} shared explainability calls (estimated)`,
        promptTokens: sum("up", ["unaiIfLlmNarrated", "promptTokens"]),
        completionTokens: sum("uc", ["unaiIfLlmNarrated", "completionTokens"]),
        total: unaiTotal,
        measured: anyLive ? "live" : "estimated",
      },
      unaiActual: { label: "UNAI, as actually run just now: real ported formulas, no LLM call", total: 0 },
      reductionPctIfLlmNarrated: originalTotal ? Math.round((1 - unaiTotal / originalTotal) * 100) : null,
      // Sum the 3 nodes' per-layer breakdowns layer-by-layer (each node's
      // own engine run already attributes its tokens across L1..L7 --
      // see agents/unai/tokenCompare.cjs's buildPerLayerTokens).
      perLayerTokens: (() => {
        const withLayers = perNode.filter((tc: any) => Array.isArray(tc.perLayerTokens));
        if (!withLayers.length) return null;
        const byId: Record<string, any> = {};
        withLayers.forEach((tc: any) => {
          tc.perLayerTokens.forEach((l: any) => {
            const row = byId[l.id] || (byId[l.id] = { id: l.id, name: l.name, in: 0, out: 0, total: 0 });
            row.in += l.in || 0; row.out += l.out || 0; row.total += l.total || 0;
          });
        });
        return Object.values(byId).sort((a: any, b: any) => a.id.localeCompare(b.id));
      })(),
      perLayerMeasured: perNode.find((tc: any) => tc.perLayerMeasured)?.perLayerMeasured || null,
    };
  }

  return {
    id: `RUN-${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    input: surgeInput,
    item,
    demandAnalysis: finalState.demandAnalysis,
    supplyAnalysis: finalState.supplyAnalysis,
    plannerRecommendations: finalState.plannerRecommendations,
    humanReview: finalState.humanReview,
    logs: finalState.logs,
    totalDurationMs,
    // The 3 analysis nodes now run on the UNAI shared cognitive engine (see
    // agents/unai/unaiAdapter.cjs), not the configured LLM provider -- reflect
    // that here rather than showing a provider/model that isn't actually
    // computing these results anymore.
    providerUsed: "unai",
    modelUsed: "UNAI Shared Cognitive Engine",
    unaiTokenComparison
  };
}
