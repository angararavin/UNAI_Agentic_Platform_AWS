// Backend swapped to the UNAI shared cognitive engine -- see
// agents/unai/unaiAdapter.cjs. The original demand-agent.ts/supply-agent.ts/
// planner-agent.ts (each calling out to a configurable LLM) are left in
// place, untouched and unused; only this re-export changed, so graph.ts's
// StateGraph wiring needed zero changes.
const unaiAdapter = require("../../agents/unai/unaiAdapter.cjs");
export const demandAnalystNode = unaiAdapter.demandAnalystNode;
export const supplyImpactAnalystNode = unaiAdapter.supplyImpactAnalystNode;
export const plannerRecommendationNode = unaiAdapter.plannerRecommendationNode;
export { humanReviewInitNode, processHumanDecision } from "./hitl-agent";
