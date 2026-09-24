import { generateStructuredJson } from "./client.js";

export interface RepairSchedulePhase {
  phase: string;
  durationDays: number;
  unitsProcessed: number;
  status: string;
}

export interface RefurbRepairResult {
  reasoningSteps: string[];
  recoverableUnits: number;
  scrappedUnits: number;
  repairCostTotal: number;
  newSupplyCostTotal: number;
  netSavingsUsd: number;
  cbaSummary: string;
  repairSchedule: RepairSchedulePhase[];
  confidenceScore: number;
  keyFactors: string[];
  humanActionRequired: string;
  activityLogs: string[];
}

export async function runRefurbRepair(params: {
  productName: string;
  fieldReturnsCount: number;
  historicalRecoveryRateOverride: number; // slider override!
  newSupplyCostUsd: number;
  repairCostUsd: number;
}): Promise<RefurbRepairResult> {
  const { productName, fieldReturnsCount, historicalRecoveryRateOverride, newSupplyCostUsd, repairCostUsd } = params;

  const prompt = `
    You are the NVIDIA Refurbish & Repair Agent. An elevated wave of returned inventory has arrived.
    Product Type: ${productName}
    Total Field Returns: ${fieldReturnsCount} units
    Human Overridden Historical Recovery Rate Target: ${historicalRecoveryRateOverride}%
    Cost of manufacturing a brand new unit: $${newSupplyCostUsd} USD
    Cost of factory repairing a single returned unit: $${repairCostUsd} USD

    Tasks:
    1. Calculate Repair Metrics:
       - Recoverable Units = Returns Count * (Recovery Rate / 100)
       - Scrapped Units = Returns Count - Recoverable Units
       - Total Cost to Repair = Recoverable Units * Repair Cost per Unit
       - Total Cost of Equivalent New Supply = Recoverable Units * New Supply Cost per Unit
       - Net Financial Savings = Cost of New Supply - Cost to Repair
    2. Perform Cost-Benefit Analysis (CBA). Summarize why refurbishing this batch makes financial and operational sense, referencing the savings.
    3. Construct Optimized 4-Week Repair Schedule. Break down the process (e.g., Intake & Diagnostics, Board-Level Microsoldering, Component Refitting & Sourcing, High-Stress Burn-In & QA) across 4 stages.
    4. Return reasoning steps, detailed financials, schedules, decision metrics, and timestamped activity logs.

    Format the response as a JSON object with:
    - reasoningSteps: array of strings
    - recoverableUnits: number (integer)
    - scrappedUnits: number (integer)
    - repairCostTotal: number
    - newSupplyCostTotal: number
    - netSavingsUsd: number
    - cbaSummary: string
    - repairSchedule: array of { phase: string, durationDays: number, unitsProcessed: number, status: string }
    - confidenceScore: number (0-100)
    - keyFactors: array of strings
    - humanActionRequired: string
    - activityLogs: array of strings
  `;

  // Dynamic high-fidelity calculations
  const recoveryRateDecimal = historicalRecoveryRateOverride / 100;
  const recoverableUnits = Math.round(fieldReturnsCount * recoveryRateDecimal);
  const scrappedUnits = fieldReturnsCount - recoverableUnits;
  const repairCostTotal = recoverableUnits * repairCostUsd;
  const newSupplyCostTotal = recoverableUnits * newSupplyCostUsd;
  const netSavingsUsd = newSupplyCostTotal - repairCostTotal;

  const repairSchedule: RepairSchedulePhase[] = [
    { phase: "Stage 1: Automated Visual & X-Ray Diagnostics", durationDays: 5, unitsProcessed: fieldReturnsCount, status: "In Progress" },
    { phase: "Stage 2: Precision Robotic ASIC Reballing & PCB Solder Repair", durationDays: 7, unitsProcessed: recoverableUnits, status: "Scheduled" },
    { phase: "Stage 3: Thermal Management & Fan Component Refitting", durationDays: 6, unitsProcessed: recoverableUnits, status: "Scheduled" },
    { phase: "Stage 4: High-Stress Tensor-Core Burn-In Testing & QA Signoff", durationDays: 6, unitsProcessed: recoverableUnits, status: "Pending" }
  ];

  const fallback: RefurbRepairResult = {
    reasoningSteps: [
      `Received reverse logistics command for ${fieldReturnsCount} returned ${productName} items.`,
      `Applying human overridden historical recovery rate target of ${historicalRecoveryRateOverride}% (Adjusted yield target).`,
      `Yield calculation: ${recoverableUnits} units are recoverable; ${scrappedUnits} units are structurally scrapped.`,
      `CBA Analysis: repair cost is $${repairCostUsd} vs new replacement cost of $${newSupplyCostUsd}. Ratio indicates heavy margin advantage.`,
      `Calculated savings: Net $${netSavingsUsd.toLocaleString()} USD retained in regional capital ledger.`,
      `Constructed 4-stage optimized repair schedule to balance reverse-logistics labor bandwidth and specialized testing machines.`
    ],
    recoverableUnits,
    scrappedUnits,
    repairCostTotal,
    newSupplyCostTotal,
    netSavingsUsd,
    cbaSummary: `Reverse logistics analysis indicates an overwhelmingly positive business case. By repairing ${recoverableUnits} of the returned units rather than fabricating new silicon wafers, we reduce lead times from 16 weeks to under 4 weeks. Financially, this keeps $${netSavingsUsd.toLocaleString()} USD in capital within the company margins and diverts high-value ASICs from standard scrappage.`,
    repairSchedule,
    confidenceScore: 93,
    keyFactors: [
      `Human-adjusted recovery rate target (${historicalRecoveryRateOverride}%)`,
      `High replacement cost delta ($${(newSupplyCostUsd - repairCostUsd).toLocaleString()} per unit)`,
      "Testing bay throughput capacity limitations"
    ],
    humanActionRequired: `Approve the allocation of $${repairCostTotal.toLocaleString()} USD in reverse-logistics operational budget and authorize TSMC to adjust the wafer starts downward to account for the recycled yield.`,
    activityLogs: [
      `[01:00:56] Refurb/Repair loop opened for batch size ${fieldReturnsCount}`,
      `[01:00:57] Ingested human recovery target: ${historicalRecoveryRateOverride}%`,
      `[01:00:57] Calculating unit yields (Recoverable: ${recoverableUnits} | Scrap: ${scrappedUnits})`,
      `[01:00:58] Executed cost-benefit analysis equation`,
      `[01:00:58] Total repair expenditure calculated: $${repairCostTotal.toLocaleString()} USD`,
      `[01:00:59] Net operational savings calculated: $${netSavingsUsd.toLocaleString()} USD`,
      `[01:00:59] Scheduled 4-week lab workflow nodes based on equipment load coefficients`
    ]
  };

  const systemInstruction = "You are an expert NVIDIA reverse logistics engineer and cost analyst. You must output valid, well-structured JSON matching the requested schema exactly.";

  return generateStructuredJson<RefurbRepairResult>(prompt, systemInstruction, fallback);
}
