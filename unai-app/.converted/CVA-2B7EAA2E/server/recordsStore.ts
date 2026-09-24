import { AgentExecutionRecord, ControlTowerAnalytics, HumanApprovalStatus, TokenAnalytics } from '../src/types';

// App starts in completely clean state - no input data is executed initially
export const INITIAL_RECORDS: AgentExecutionRecord[] = [];

let recordsStore: AgentExecutionRecord[] = [];

export function getAllRecords(): AgentExecutionRecord[] {
  return [...recordsStore].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function addRecord(record: AgentExecutionRecord): void {
  recordsStore.unshift(record);
}

export function getRecordById(id: string): AgentExecutionRecord | undefined {
  return recordsStore.find((r) => r.id === id);
}

export function updateRecordReview(
  id: string,
  newStatus: HumanApprovalStatus,
  reviewer: string,
  notes: string,
  overriddenOutput?: Record<string, any>
): AgentExecutionRecord | null {
  const record = recordsStore.find((r) => r.id === id);
  if (!record) return null;

  record.approvalStatus = newStatus;
  record.reviewedBy = reviewer || "RMA Operations Lead";
  record.reviewedAt = new Date().toISOString();
  record.humanReviewNotes = notes;
  if (overriddenOutput) {
    record.overriddenOutput = overriddenOutput;
  }
  return record;
}

export function resetRecords(): void {
  recordsStore = [];
}

export function clearRecords(): void {
  recordsStore = [];
}

export function calculateAnalytics(): ControlTowerAnalytics {
  const records = recordsStore;
  const total = records.length;

  let autoApprovedCount = 0;
  let pendingReviewCount = 0;
  let humanReviewedCount = 0;
  let totalConfidence = 0;

  const a1 = { total: 0, repairedCount: 0, replacedCount: 0, furtherDiagnosedCount: 0, autoApproved: 0, pendingReview: 0 };
  const a2 = { total: 0, withinSloCount: 0, atRiskCount: 0, breachedCount: 0, autoApproved: 0, pendingReview: 0 };
  const a3 = { total: 0, p1Count: 0, p2Count: 0, p3Count: 0, p4Count: 0, autoApproved: 0, pendingReview: 0 };
  const a4 = { total: 0, eligibleCount: 0, quarantineCount: 0, ineligibleCount: 0, serialMismatchCount: 0, autoApproved: 0, pendingReview: 0 };

  // Token usage tracking
  let totalTokensAgg = 0;
  let promptTokensAgg = 0;
  let completionTokensAgg = 0;

  const byAgentTokens = {
    "agent-1": { totalTokens: 0, promptTokens: 0, completionTokens: 0, executionCount: 0 },
    "agent-2": { totalTokens: 0, promptTokens: 0, completionTokens: 0, executionCount: 0 },
    "agent-3": { totalTokens: 0, promptTokens: 0, completionTokens: 0, executionCount: 0 },
    "agent-4": { totalTokens: 0, promptTokens: 0, completionTokens: 0, executionCount: 0 },
  };

  const recentHistoryTokens: TokenAnalytics["recentHistory"] = [];

  for (const r of records) {
    totalConfidence += r.confidenceScore;
    if (r.approvalStatus === "auto_approved") {
      autoApprovedCount++;
    } else if (r.approvalStatus === "pending_human_review") {
      pendingReviewCount++;
    } else {
      humanReviewedCount++;
    }

    // Token computation
    const promptTok = r.tokenUsage?.promptTokens ?? Math.max(120, Math.round(r.latencyMs * 0.25));
    const compTok = r.tokenUsage?.completionTokens ?? Math.max(60, Math.round(r.latencyMs * 0.12));
    const totTok = r.tokenUsage?.totalTokens ?? (promptTok + compTok);

    totalTokensAgg += totTok;
    promptTokensAgg += promptTok;
    completionTokensAgg += compTok;

    if (byAgentTokens[r.agentId as keyof typeof byAgentTokens]) {
      const bucket = byAgentTokens[r.agentId as keyof typeof byAgentTokens];
      bucket.totalTokens += totTok;
      bucket.promptTokens += promptTok;
      bucket.completionTokens += compTok;
      bucket.executionCount += 1;
    }

    recentHistoryTokens.push({
      id: r.id,
      timestamp: r.timestamp,
      agentId: r.agentId,
      agentName: r.agentName,
      promptTokens: promptTok,
      completionTokens: compTok,
      totalTokens: totTok,
    });

    if (r.agentId === "agent-1") {
      a1.total++;
      if (r.approvalStatus === "auto_approved") a1.autoApproved++;
      if (r.approvalStatus === "pending_human_review") a1.pendingReview++;
      const disp = r.overriddenOutput?.recommendedDisposition || r.output.recommendedDisposition;
      if (disp === "Repaired") a1.repairedCount++;
      else if (disp === "Replaced") a1.replacedCount++;
      else if (disp === "Further Diagnosed") a1.furtherDiagnosedCount++;
    } else if (r.agentId === "agent-2") {
      a2.total++;
      if (r.approvalStatus === "auto_approved") a2.autoApproved++;
      if (r.approvalStatus === "pending_human_review") a2.pendingReview++;
      const status = r.overriddenOutput?.dwellStatus || r.output.dwellStatus;
      if (status === "Within SLO") a2.withinSloCount++;
      else if (status === "At Risk") a2.atRiskCount++;
      else if (status === "Breached") a2.breachedCount++;
    } else if (r.agentId === "agent-3") {
      a3.total++;
      if (r.approvalStatus === "auto_approved") a3.autoApproved++;
      if (r.approvalStatus === "pending_human_review") a3.pendingReview++;
      const p = r.overriddenOutput?.priority || r.output.priority;
      if (p === "P1") a3.p1Count++;
      else if (p === "P2") a3.p2Count++;
      else if (p === "P3") a3.p3Count++;
      else if (p === "P4") a3.p4Count++;
    } else if (r.agentId === "agent-4") {
      a4.total++;
      if (r.approvalStatus === "auto_approved") a4.autoApproved++;
      if (r.approvalStatus === "pending_human_review") a4.pendingReview++;
      const pool = r.overriddenOutput?.sparePoolEligibility || r.output.sparePoolEligibility;
      if (pool === "Eligible") a4.eligibleCount++;
      else if (pool === "Quarantine") a4.quarantineCount++;
      else if (pool === "Ineligible") a4.ineligibleCount++;
      if (r.output.serialValidation === "Mismatch") a4.serialMismatchCount++;
    }
  }

  const tokenAnalytics: TokenAnalytics = {
    totalTokens: totalTokensAgg,
    promptTokens: promptTokensAgg,
    completionTokens: completionTokensAgg,
    estimatedCostUsd: Number(((promptTokensAgg * 0.15 + completionTokensAgg * 0.6) / 1000000).toFixed(4)),
    byAgent: byAgentTokens,
    recentHistory: recentHistoryTokens.slice(0, 15),
  };

  return {
    totalProcessed: total,
    autoApprovedCount,
    pendingReviewCount,
    humanReviewedCount,
    autoApprovalRate: total > 0 ? Math.round((autoApprovedCount / total) * 100) : 0,
    avgConfidence: total > 0 ? Math.round(totalConfidence / total) : 0,
    tokenAnalytics,
    agent1Metrics: a1,
    agent2Metrics: a2,
    agent3Metrics: a3,
    agent4Metrics: a4,
  };
}
