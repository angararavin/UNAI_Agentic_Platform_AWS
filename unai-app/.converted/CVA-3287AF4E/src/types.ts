export interface SupplyItem {
  sku: string;
  name: string;
  category: string;
  unit: string;
  unitCost: number;
  customerSegment: string;
  baselineDailyForecast: number;
  forecastHorizonDays: number;
  currentInventory: number;
  safetyStock: number;
  reservedInventory: number;
  warehouseLocation: string;
  dailyBurnRate: number;
  supplier: {
    name: string;
    leadTimeDays: number;
    expediteAvailable: boolean;
    expediteLeadTimeDays: number;
    expediteCostPerUnit: number;
    reliabilityRating: number; // percentage, e.g. 94%
  };
  openPurchaseOrders: Array<{
    poNumber: string;
    supplier: string;
    units: number;
    orderDate: string;
    expectedArrivalDays: number;
    status: 'IN_TRANSIT' | 'ORDERED' | 'CUSTOMS_HOLD' | 'DISPATCHED';
    canBeExpedited: boolean;
  }>;
  productionCapacity: {
    lineId: string;
    lineName: string;
    dailyCapacityUnits: number;
    currentlyAllocatedUnits: number;
    surgeHeadroomUnits: number;
    maintenanceScheduledDays: number | null;
  };
  recentCustomerOrders: Array<{
    orderId: string;
    customer: string;
    units: number;
    orderDate: string;
    requestedLeadDays: number;
    priority: 'Standard' | 'High' | 'Critical';
  }>;
}

export interface SurgeInput {
  sku: string;
  surgeQuantity: number;
  targetFulfillmentDays: number;
  customerName?: string;
  customerPriority?: 'Standard' | 'High' | 'Critical';
  triggerReason?: string;
  notes?: string;
  overrideInventory?: number;
  overrideSupplierLeadDays?: number;
  overrideDailyCapacity?: number;
}

export interface DemandAnalysisOutput {
  surgeDeltaUnits: number;
  surgePercentage: number;
  demandPattern: string;
  underlyingSignals: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  demandDrivers: string[];
  historicalComparison: string;
  demandExplanation: string;
}

export interface SupplyImpactAnalysisOutput {
  netInventoryBalance: number;
  projectedStockoutDays: number | null;
  stockoutSeverity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  openPoContributionUnits: number;
  poArrivalTimingAssessment: string;
  supplierLeadTimeConstraint: string;
  productionFeasibility: 'FEASIBLE' | 'PARTIALLY_FEASIBLE' | 'BOTTLENECKED' | 'INFEASIBLE';
  capacityUtilizationBeforeSurge: number;
  capacityUtilizationAfterSurge: number;
  capacityShortfallUnits: number;
  criticalComponentsAtRisk: string[];
  financialExposureEstimateUsd: number;
  bottleneckSummary: string;
}

export interface ActionItem {
  id: string;
  category: 'SUPPLIER_EXPEDITE' | 'PRODUCTION_REALLOCATION' | 'SAFETY_STOCK_DRAW' | 'CUSTOMER_RATIONING' | 'ALTERNATE_SOURCING';
  title: string;
  description: string;
  owner: string;
  urgency: 'IMMEDIATE' | 'WITHIN_24_HOURS' | 'WITHIN_48_HOURS' | 'NEXT_CYCLE';
  estimatedCostImpactUsd?: number;
  expectedUnitsRecovered?: number;
}

export interface PlannerRecommendationOutput {
  executiveSummary: string;
  overallCriticality: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  primaryRecommendedStrategy: string;
  actionMatrix: ActionItem[];
  tradeoffsAndRisks: string[];
  customerCommunicationStrategy: string;
  followUpTrigger: string;
}

export interface HumanReviewState {
  status: 'pending_review' | 'approved' | 'modified' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  approvedActionIds: string[];
  plannerNotes?: string;
  allocatedSurgeUnits?: number;
  deliveryCommitmentDays?: number;
  executionDispatched?: boolean;
  dispatchSummary?: {
    erpOrdersCreated: string[];
    supplierNoticesSent: string[];
    productionScheduleUpdated: boolean;
    customerNotificationDispatched: boolean;
    authorizedCostUsd: number;
  };
}

export interface HumanDecisionInput {
  status: 'approved' | 'modified' | 'rejected';
  reviewedBy: string;
  approvedActionIds: string[];
  plannerNotes?: string;
  allocatedSurgeUnits?: number;
  deliveryCommitmentDays?: number;
}

export interface AgentExecutionLog {
  agent: 'Demand Analyst Agent' | 'Supply Impact Analyst Agent' | 'Planner Recommendation Agent' | 'Human-in-the-Loop Review Agent';
  node: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  modelUsed: string;
  summary: string;
  keyOutputs?: Record<string, any>;
}

export interface AnalysisRunResult {
  id: string;
  timestamp: string;
  input: SurgeInput;
  item: SupplyItem;
  demandAnalysis: DemandAnalysisOutput;
  supplyAnalysis: SupplyImpactAnalysisOutput;
  plannerRecommendations: PlannerRecommendationOutput;
  humanReview: HumanReviewState;
  logs: AgentExecutionLog[];
  totalDurationMs: number;
  providerUsed: string;
  modelUsed: string;
  // Aggregated real per-run token comparison across all 3 UNAI-backed nodes
  // (see agents/unai/unaiAdapter.cjs) -- read by public/unai-token-badge.js.
  unaiTokenComparison?: any;
}

export interface LLMConfigStatus {
  activeProvider: 'ollama' | 'custom_api' | 'gemini';
  ollama: {
    baseUrl: string;
    model: string;
    isConfigured: boolean;
  };
  customApi: {
    baseUrl: string;
    model: string;
    isConfigured: boolean;
  };
  gemini: {
    model: string;
    isConfigured: boolean;
  };
}
