import {
  AnalysisRunResult,
  HumanDecisionInput,
  HumanReviewState,
  AgentExecutionLog,
  SupplyItem
} from "../../src/types";

// Node in LangGraph to establish the Human Decision Gate
export function humanReviewInitNode(state: {
  plannerRecommendations: any;
  surgeInput: any;
  item: any;
  [key: string]: any;
}): { humanReview: HumanReviewState; logs: AgentExecutionLog[] } {
  const startTime = Date.now();
  console.log(`[LangGraph Node 4: Human-in-the-Loop] Initializing decision gate for ${state.item?.sku}...`);

  const actionMatrix = state.plannerRecommendations?.actionMatrix || [];
  // By default, pre-select high-urgency actions for planner consideration
  const defaultSelectedActions = actionMatrix.map((a: any) => a.id);

  const humanReview: HumanReviewState = {
    status: "pending_review",
    approvedActionIds: defaultSelectedActions,
    allocatedSurgeUnits: state.surgeInput.surgeQuantity,
    deliveryCommitmentDays: state.surgeInput.targetFulfillmentDays,
    executionDispatched: false,
  };

  const log: AgentExecutionLog = {
    agent: "Human-in-the-Loop Review Agent",
    node: "human_review_gate",
    status: "completed",
    startedAt: new Date(startTime).toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    modelUsed: "human-governance-checkpoint",
    summary: `Autonomous pipeline yielded control to Human Planner Gate. ${actionMatrix.length} proposed actions awaiting sign-off.`,
    keyOutputs: {
      proposedActionsCount: actionMatrix.length,
      initialStatus: "pending_review",
      allocatedUnitsTarget: state.surgeInput.surgeQuantity
    }
  };

  return {
    humanReview,
    logs: [log]
  };
}

// Handler to process human planner sign-off / override and execute downstream operations
export function processHumanDecision(
  runResult: AnalysisRunResult,
  decision: HumanDecisionInput,
  supplyItemsCatalog: SupplyItem[]
): { updatedRun: AnalysisRunResult; updatedItem?: SupplyItem } {
  const startTime = Date.now();
  const { status, reviewedBy, approvedActionIds, plannerNotes, allocatedSurgeUnits, deliveryCommitmentDays } = decision;

  const actions = runResult.plannerRecommendations.actionMatrix || [];
  const approvedActions = actions.filter(a => approvedActionIds.includes(a.id));

  // Compute authorized cost
  const totalAuthorizedCostUsd = approvedActions.reduce(
    (sum, a) => sum + (a.estimatedCostImpactUsd || 0),
    0
  );

  // Generate simulated ERP and dispatch execution artifacts
  const erpOrdersCreated: string[] = [];
  const supplierNoticesSent: string[] = [];
  let productionScheduleUpdated = false;
  let customerNotificationDispatched = false;

  approvedActions.forEach((action, idx) => {
    if (action.category === "SUPPLIER_EXPEDITE") {
      const poNum = `EXP-PO-${Date.now().toString().slice(-4)}-${idx + 1}`;
      erpOrdersCreated.push(poNum);
      supplierNoticesSent.push(`Air-freight expedite contract dispatched to ${runResult.item.supplier.name} (Ref: ${poNum})`);
    } else if (action.category === "PRODUCTION_REALLOCATION") {
      productionScheduleUpdated = true;
    } else if (action.category === "SAFETY_STOCK_DRAW") {
      erpOrdersCreated.push(`SS-DRAW-AUTH-${Date.now().toString().slice(-4)}`);
    } else if (action.category === "CUSTOMER_RATIONING") {
      customerNotificationDispatched = true;
    }
  });

  if (status === "approved" || status === "modified") {
    customerNotificationDispatched = true;
  }

  const humanReview: HumanReviewState = {
    status,
    reviewedBy: reviewedBy || "Lead Supply Planner",
    reviewedAt: new Date().toISOString(),
    approvedActionIds,
    plannerNotes: plannerNotes || (status === "approved" ? "Approved as recommended by AI multi-agent workflow." : "Plan modified during human planner review."),
    allocatedSurgeUnits: allocatedSurgeUnits ?? runResult.input.surgeQuantity,
    deliveryCommitmentDays: deliveryCommitmentDays ?? runResult.input.targetFulfillmentDays,
    executionDispatched: status !== "rejected",
    dispatchSummary: {
      erpOrdersCreated,
      supplierNoticesSent,
      productionScheduleUpdated,
      customerNotificationDispatched,
      authorizedCostUsd: totalAuthorizedCostUsd
    }
  };

  // Update physical item state if approved
  let updatedItem: SupplyItem | undefined;
  const targetItem = supplyItemsCatalog.find(i => i.sku.toLowerCase() === runResult.item.sku.toLowerCase());
  if (targetItem && (status === "approved" || status === "modified")) {
    // Reserve inventory if available
    const unitsToAllocate = allocatedSurgeUnits ?? runResult.input.surgeQuantity;
    targetItem.reservedInventory = Math.min(targetItem.currentInventory, targetItem.reservedInventory + Math.round(unitsToAllocate * 0.5));
    updatedItem = targetItem;
  }

  const decisionLog: AgentExecutionLog = {
    agent: "Human-in-the-Loop Review Agent",
    node: "human_decision_execution",
    status: "completed",
    startedAt: new Date(startTime).toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    modelUsed: `human-operator (${reviewedBy || 'Planner'})`,
    summary: status === "rejected"
      ? `Human planner (${reviewedBy}) rejected proposed mitigation strategy. Rationale: ${plannerNotes || 'Plan rejected.'}`
      : `Human planner (${reviewedBy}) executed decision: ${status.toUpperCase()}. Authorized ${approvedActionIds.length}/${actions.length} mitigations ($${totalAuthorizedCostUsd.toLocaleString()} approved budget). Downstream dispatch completed.`,
    keyOutputs: {
      finalStatus: status,
      authorizedCostUsd: totalAuthorizedCostUsd,
      erpOrdersCount: erpOrdersCreated.length,
      productionUpdated: productionScheduleUpdated
    }
  };

  const updatedRun: AnalysisRunResult = {
    ...runResult,
    humanReview,
    logs: [...runResult.logs, decisionLog]
  };

  return { updatedRun, updatedItem };
}
