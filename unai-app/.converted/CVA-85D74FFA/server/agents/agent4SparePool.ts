import { Type } from "@google/genai";
import { Agent4Input, Agent4Output, TokenUsage } from "../../src/types";
import {
  engineSettings,
  computeTokenUsage,
  queryOllama,
  queryCustomApi,
  callGeminiStructured,
} from "./common";

// ----------------------------------------------------
// AGENT 4: Return Receipt & Spare-Pool Reintegration Agent
// Configurable Threshold: Confidence >= threshold -> Auto-Approved
// ----------------------------------------------------
export async function executeAgent4(
  input: Agent4Input,
  customThreshold?: number
): Promise<{ output: Agent4Output; engineUsed: string; tokenUsage: TokenUsage; modelUsed?: string }> {
  const threshold = customThreshold ?? engineSettings.approvalThresholds?.["agent-4"] ?? 95;

  const systemInstruction = `You are Agent 4 — Return Receipt & Spare-Pool Reintegration Agent.
Objective: Validate a repaired RMA return and determine whether the asset can be reintegrated into the spare pool.
Processing Requirements:
1. Validate the returned manifest.
2. Validate serial-number consistency (compare serialNumber vs returnedSerial).
3. Verify repair completion (repairStatus).
4. Verify warranty eligibility (warrantyStatus).
5. Determine reintegration eligibility: 'Eligible', 'Ineligible', 'Quarantine'.
6. Recommend next financial/logistics action.
7. Generate confidence score (0-100).
8. Determine human approval: Confidence >= ${threshold} -> false (Auto Approved), Confidence < ${threshold} -> true (Human Approval Required).
Return strictly valid JSON matching the schema.`;

  const prompt = `Inputs:
Tray ID: ${input.trayId}
RMA ID: ${input.rmaId}
Original Serial: ${input.serialNumber}
Returned Serial: ${input.returnedSerial}
Repair Status: ${input.repairStatus}
Warranty Status: ${input.warrantyStatus}
Manifest Details: ${input.manifestDetails}
Approval Threshold: ${threshold}%`;

  // Try Custom API if selected or URL configured
  if (
    engineSettings.activeEngine === "custom" ||
    (engineSettings.activeEngine as string) === "custom_api" ||
    (engineSettings.customApiUrl && engineSettings.activeEngine !== "ollama" && engineSettings.activeEngine !== "heuristic")
  ) {
    const customRes = await queryCustomApi<{
      returnValidationStatus: "Pass" | "Fail" | "Flagged";
      serialValidation: "Match" | "Mismatch";
      repairValidation: "Verified" | "Incomplete" | "Failed";
      warrantyStatus: "In Warranty" | "Expired" | "Void";
      sparePoolEligibility: "Eligible" | "Ineligible" | "Quarantine";
      recommendedAction: string;
      financialAction: string;
      confidenceScore: number;
    }>({
      prompt,
      systemInstruction,
    });

    if (customRes && customRes.parsed) {
      const parsed = customRes.parsed;
      const confidenceScore = Math.max(0, Math.min(100, Number(parsed.confidenceScore) || 96));
      const humanApprovalRequired = confidenceScore < threshold;

      return {
        output: {
          returnValidationStatus: parsed.returnValidationStatus || "Pass",
          serialValidation:
            parsed.serialValidation ||
            (input.serialNumber.trim() === input.returnedSerial.trim() ? "Match" : "Mismatch"),
          repairValidation: parsed.repairValidation || "Verified",
          warrantyStatus: parsed.warrantyStatus || "In Warranty",
          sparePoolEligibility: parsed.sparePoolEligibility || "Eligible",
          recommendedAction: parsed.recommendedAction || "Scan into Central Spare Pool Depot Bin.",
          financialAction: parsed.financialAction || "Release CM Repair Purchase Order payment.",
          confidenceScore,
          humanApprovalRequired,
        },
        engineUsed: "custom",
        modelUsed: customRes.modelUsed,
        tokenUsage: customRes.tokenUsage,
      };
    }
  }

  // Try Cloud AI API
  if (
    (engineSettings.activeEngine === "api" || (engineSettings.activeEngine as string) === "gemini") &&
    (process.env.AI_API_KEY || process.env.LLM_API_KEY || process.env.GEMINI_API_KEY)
  ) {
    const cloudResult = await callGeminiStructured<{
      returnValidationStatus: "Pass" | "Fail" | "Flagged";
      serialValidation: "Match" | "Mismatch";
      repairValidation: "Verified" | "Incomplete" | "Failed";
      warrantyStatus: "In Warranty" | "Expired" | "Void";
      sparePoolEligibility: "Eligible" | "Ineligible" | "Quarantine";
      recommendedAction: string;
      financialAction: string;
      confidenceScore: number;
    }>({
      prompt,
      systemInstruction,
      preferredModel: engineSettings.apiModel || engineSettings.geminiModel,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          returnValidationStatus: {
            type: Type.STRING,
            enum: ["Pass", "Fail", "Flagged"],
          },
          serialValidation: {
            type: Type.STRING,
            enum: ["Match", "Mismatch"],
          },
          repairValidation: {
            type: Type.STRING,
            enum: ["Verified", "Incomplete", "Failed"],
          },
          warrantyStatus: {
            type: Type.STRING,
            enum: ["In Warranty", "Expired", "Void"],
          },
          sparePoolEligibility: {
            type: Type.STRING,
            enum: ["Eligible", "Ineligible", "Quarantine"],
          },
          recommendedAction: { type: Type.STRING },
          financialAction: { type: Type.STRING },
          confidenceScore: { type: Type.INTEGER },
        },
        required: [
          "returnValidationStatus",
          "serialValidation",
          "repairValidation",
          "warrantyStatus",
          "sparePoolEligibility",
          "recommendedAction",
          "financialAction",
          "confidenceScore",
        ],
      },
    });

    if (cloudResult && cloudResult.parsed) {
      const parsed = cloudResult.parsed;
      const confidenceScore = Math.max(
        0,
        Math.min(100, Number(parsed.confidenceScore) || 96)
      );
      const humanApprovalRequired = confidenceScore < threshold;

      return {
        output: {
          returnValidationStatus: parsed.returnValidationStatus || "Pass",
          serialValidation:
            parsed.serialValidation ||
            (input.serialNumber.trim() === input.returnedSerial.trim()
              ? "Match"
              : "Mismatch"),
          repairValidation: parsed.repairValidation || "Verified",
          warrantyStatus: parsed.warrantyStatus || "In Warranty",
          sparePoolEligibility: parsed.sparePoolEligibility || "Eligible",
          recommendedAction:
            parsed.recommendedAction ||
            "Scan into Central Spare Pool Depot Bin.",
          financialAction:
            parsed.financialAction ||
            "Release CM Repair Purchase Order payment.",
          confidenceScore,
          humanApprovalRequired,
        },
        engineUsed: "api",
        modelUsed: cloudResult.modelUsed,
        tokenUsage: cloudResult.tokenUsage,
      };
    }
  }

  // Try Ollama
  if (engineSettings.activeEngine === "ollama") {
    try {
      const { parsed, raw } = await queryOllama(
        prompt,
        systemInstruction,
        engineSettings.ollamaHost,
        engineSettings.ollamaModel
      );
      const confidenceScore = Math.max(
        0,
        Math.min(100, Number(parsed.confidenceScore) || 91)
      );
      const humanApprovalRequired = confidenceScore < threshold;
      const tokenUsage = computeTokenUsage(
        prompt,
        JSON.stringify(parsed),
        undefined,
        raw
      );

      return {
        output: {
          returnValidationStatus: [
            "Pass",
            "Fail",
            "Flagged",
          ].includes(parsed.returnValidationStatus)
            ? parsed.returnValidationStatus
            : "Flagged",
          serialValidation: ["Match", "Mismatch"].includes(
            parsed.serialValidation
          )
            ? parsed.serialValidation
            : "Match",
          repairValidation: [
            "Verified",
            "Incomplete",
            "Failed",
          ].includes(parsed.repairValidation)
            ? parsed.repairValidation
            : "Verified",
          warrantyStatus: ["In Warranty", "Expired", "Void"].includes(
            parsed.warrantyStatus
          )
            ? parsed.warrantyStatus
            : "In Warranty",
          sparePoolEligibility: [
            "Eligible",
            "Ineligible",
            "Quarantine",
          ].includes(parsed.sparePoolEligibility)
            ? parsed.sparePoolEligibility
            : "Quarantine",
          recommendedAction:
            parsed.recommendedAction || "Hold in quarantine intake.",
          financialAction:
            parsed.financialAction ||
            "Hold payment pending quality assurance inspection.",
          confidenceScore,
          humanApprovalRequired,
        },
        engineUsed: "ollama",
        tokenUsage,
      };
    } catch (err) {
      console.warn("Ollama agent 4 error:", err);
    }
  }

  // Expert Heuristic Fallback
  const serialMatch =
    input.serialNumber.trim().toLowerCase() ===
    input.returnedSerial.trim().toLowerCase();
  const manifestLower = (
    input.manifestDetails +
    " " +
    input.repairStatus +
    " " +
    input.warrantyStatus
  ).toLowerCase();

  let returnStatus: "Pass" | "Fail" | "Flagged" = "Pass";
  let serialVal: "Match" | "Mismatch" = serialMatch ? "Match" : "Mismatch";
  let repairVal: "Verified" | "Incomplete" | "Failed" = "Verified";
  let warranty: "In Warranty" | "Expired" | "Void" = "In Warranty";
  let sparePool: "Eligible" | "Ineligible" | "Quarantine" = "Eligible";
  let recAction =
    "Barcode scan into Active Regional Spare Pool at Depot Zone A.";
  let finAction =
    "Approve CM invoice payment for scheduled repair billing cycle.";
  let confidence = 98;

  if (
    !serialMatch ||
    manifestLower.includes("tamper") ||
    manifestLower.includes("mismatch") ||
    manifestLower.includes("legacy")
  ) {
    returnStatus = "Fail";
    serialVal = "Mismatch";
    repairVal = "Failed";
    warranty = "Void";
    sparePool = "Ineligible";
    confidence = 98; // >= 95 -> Auto Approved rejection
    recAction =
      "Quarantine asset immediately. Issue formal vendor discrepancy notice and initiate asset recovery audit.";
    finAction =
      "Reject vendor invoice. Issue non-compliance penalty chargeback.";
  } else if (
    manifestLower.includes("expired") ||
    manifestLower.includes("partial") ||
    manifestLower.includes("uncertified") ||
    manifestLower.includes("substitute") ||
    manifestLower.includes("hold")
  ) {
    returnStatus = "Flagged";
    serialVal = "Match";
    repairVal = "Incomplete";
    warranty = "Expired";
    sparePool = "Quarantine";
    confidence = 88; // Below 95 -> Human review required!
    recAction =
      "Hold unit in Physical Quarantine Zone Q-3. Route to Quality Engineering for electrical verification.";
    finAction = "Hold vendor payment in escrow pending Level-2 QA clearance.";
  } else {
    returnStatus = "Pass";
    serialVal = "Match";
    repairVal = "Verified";
    warranty = "In Warranty";
    sparePool = "Eligible";
    confidence = 97; // >= 95 -> Auto Approved
    recAction =
      "Certify asset as ready-to-deploy; assign to Tier-1 Spare Inventory pool in San Jose Hub.";
    finAction = "Release CM warranty repair credit and close RMA transaction.";
  }

  const output: Agent4Output = {
    returnValidationStatus: returnStatus,
    serialValidation: serialVal,
    repairValidation: repairVal,
    warrantyStatus: warranty,
    sparePoolEligibility: sparePool,
    recommendedAction: recAction,
    financialAction: finAction,
    confidenceScore: confidence,
    humanApprovalRequired: confidence < threshold,
  };

  return {
    output,
    engineUsed: "heuristic_engine",
    tokenUsage: computeTokenUsage(prompt, JSON.stringify(output)),
  };
}
