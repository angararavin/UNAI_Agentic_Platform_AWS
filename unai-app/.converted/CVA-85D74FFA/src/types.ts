export type AgentId = 'agent-1' | 'agent-2' | 'agent-3' | 'agent-4';

export type HumanApprovalStatus = 
  | 'auto_approved'
  | 'pending_human_review'
  | 'human_approved'
  | 'human_rejected'
  | 'human_overridden';

// --- AGENT 1: Failure-Based Disposition Agent ---
export interface Agent1Input {
  trayId: string;
  mpn: string;
  failureCode: string;
  failureDescription: string;
  dchaLogs: string;
  threshold?: number;
}

export interface Agent1Output {
  recommendedDisposition: 'Repaired' | 'Replaced' | 'Further Diagnosed';
  confidenceScore: number; // 0 - 100
  reasoning: string;
  repairRecommendation: string;
  risk: 'Low' | 'Medium' | 'High';
  humanApprovalRequired: boolean; // confidence < threshold
  suggestedRouting?: string;
  dispatchRoute?: string;
  identifiedFailureMode?: string;
  estimatedCostUsd?: number;
  estimatedTatDays?: number;
}

// --- AGENT 2: Dwell Time Monitoring & Escalation Agent ---
export interface Agent2Input {
  trayId: string;
  currentStage: string;
  hoursInStage: number;
  microSlo: number;
  location: string;
  eventHistory: string;
  threshold?: number;
}

export interface Agent2Output {
  dwellStatus: 'Within SLO' | 'At Risk' | 'Breached';
  dwellTime: number; // actual time spent in current stage (hoursInStage)
  microSlo: number; // maximum acceptable time for that stage
  dwellVariance: number; // actual Dwell Time minus Micro-SLO (e.g. 52 - 24 = 28 over target)
  delay: number; // amount of time above target (Math.max(0, dwellVariance))
  targetDetermination: 'Within Target' | 'Approaching Target' | 'Target Breached';
  rootCause: string; // likely reason for delay (e.g. 'Carrier assignment delay')
  escalationRecommendation: string; // e.g. 'Monitor', 'Notify logistics team', 'Escalate to transportation manager', 'Trigger priority carrier assignment'
  recommendedAction: string; // alias/backward compat for escalationRecommendation
  bottleneckStage: string;
  hoursInStage: number; // backward compat
  sloBreach: boolean;
  confidenceScore: number; // 0 - 100
  humanApprovalRequired: boolean; // confidence < threshold
}

// --- AGENT 3: Urgency Flagging Agent ---
export interface Agent3Input {
  trayId: string;
  failureType: string;
  failureCode: string;
  dataCenter: string;
  spareInventory: number;
  businessImpact: string;
  carrierStatus: string;
  cmQueueStatus: string;
  threshold?: number;
}

export interface Agent3Output {
  urgencyLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  recommendedRdd: string; // ISO date or descriptive date
  reasoning: string;
  businessImpact: string;
  risk: 'Low' | 'Medium' | 'High';
  confidenceScore: number; // 0 - 100
  humanApprovalRequired: boolean; // confidence < threshold
}

// --- AGENT 4: Return Receipt & Spare-Pool Reintegration Agent ---
export interface Agent4Input {
  trayId: string;
  rmaId: string;
  serialNumber: string;
  returnedSerial: string;
  repairStatus: string;
  warrantyStatus: string;
  manifestDetails: string;
  threshold?: number;
}

export interface Agent4Output {
  returnValidationStatus: 'Pass' | 'Fail' | 'Flagged';
  serialValidation: 'Match' | 'Mismatch';
  repairValidation: 'Verified' | 'Incomplete' | 'Failed';
  warrantyStatus: 'In Warranty' | 'Expired' | 'Void';
  sparePoolEligibility: 'Eligible' | 'Ineligible' | 'Quarantine';
  recommendedAction: string;
  financialAction: string;
  confidenceScore: number; // 0 - 100
  humanApprovalRequired: boolean; // confidence < threshold
}

// Universal Record for In-Memory Storage and Audit Trail
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AgentExecutionRecord {
  id: string;
  agentId: AgentId;
  agentName: string;
  timestamp: string;
  trayId: string;
  engineUsed: 'api' | 'cloud' | 'custom' | 'ollama' | 'heuristic_engine' | 'gemini';
  modelName: string;
  latencyMs: number;
  input: Record<string, any>;
  output: Record<string, any>;
  confidenceScore: number;
  threshold: number;
  approvalStatus: HumanApprovalStatus;
  humanReviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  overriddenOutput?: Record<string, any>;
  tokenUsage?: TokenUsage;
}

export interface AgentTokenStats extends TokenUsage {
  executionCount: number;
}

export interface TokenAnalytics {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  byAgent: {
    'agent-1': AgentTokenStats;
    'agent-2': AgentTokenStats;
    'agent-3': AgentTokenStats;
    'agent-4': AgentTokenStats;
  };
  recentHistory: Array<{
    id: string;
    timestamp: string;
    agentId: string;
    agentName: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }>;
}

export interface ControlTowerAnalytics {
  totalProcessed: number;
  autoApprovedCount: number;
  pendingReviewCount: number;
  humanReviewedCount: number;
  autoApprovalRate: number;
  avgConfidence: number;
  tokenAnalytics?: TokenAnalytics;
  agent1Metrics: {
    total: number;
    repairedCount: number;
    replacedCount: number;
    furtherDiagnosedCount: number;
    autoApproved: number;
    pendingReview: number;
  };
  agent2Metrics: {
    total: number;
    withinSloCount: number;
    atRiskCount: number;
    breachedCount: number;
    autoApproved: number;
    pendingReview: number;
  };
  agent3Metrics: {
    total: number;
    p1Count: number;
    p2Count: number;
    p3Count: number;
    p4Count: number;
    autoApproved: number;
    pendingReview: number;
  };
  agent4Metrics: {
    total: number;
    eligibleCount: number;
    quarantineCount: number;
    ineligibleCount: number;
    serialMismatchCount: number;
    autoApproved: number;
    pendingReview: number;
  };
}

export interface ApprovalThresholds {
  'agent-1': number;
  'agent-2': number;
  'agent-3': number;
  'agent-4': number;
}

export interface AISettings {
  activeEngine: 'api' | 'custom' | 'ollama' | 'heuristic' | 'gemini';
  apiModel?: string;
  customApiUrl?: string;
  customApiKey?: string;
  customModel?: string;
  ollamaHost: string;
  ollamaModel: string;
  hasApiKey?: boolean;
  hasGeminiKey?: boolean;
  geminiModel?: string;
  approvalThresholds: ApprovalThresholds;
}
