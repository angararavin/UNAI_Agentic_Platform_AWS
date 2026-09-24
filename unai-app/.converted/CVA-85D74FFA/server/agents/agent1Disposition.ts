import { Type } from "@google/genai";
import { Agent1Input, Agent1Output, TokenUsage } from "../../src/types";
import {
  engineSettings,
  computeTokenUsage,
  queryOllama,
  queryCustomApi,
  callGeminiStructured,
} from "./common";

// ----------------------------------------------------
// AGENT 1: Failure-Based Disposition Agent
// Configurable Threshold: Confidence >= threshold -> Auto-Approved
// ----------------------------------------------------
export async function executeAgent1(
  input: Agent1Input,
  customThreshold?: number
): Promise<{ output: Agent1Output; engineUsed: string; tokenUsage: TokenUsage; modelUsed?: string }> {
  const threshold = customThreshold ?? engineSettings.approvalThresholds?.["agent-1"] ?? 85;

  const systemInstruction = `You are Agent 1 — Failure-Based Disposition Agent for data center RMA tray hardware.
Objective: Determine the recommended disposition for a failed RMA tray based on failure evidence and DCHA logs.
Processing Requirements:
1. Analyze the failure information.
2. Evaluate DCHA diagnostic evidence.
3. Determine whether the unit should be: Repaired, Replaced, or Further Diagnosed.
4. Generate a confidence score (0 to 100 integer).
5. Provide reasoning for the recommendation.
6. Provide repair recommendation details.
7. Assess Risk ('Low', 'Medium', 'High').
8. Identify whether human approval is required: Confidence >= ${threshold} -> false (Auto Approved), Confidence < ${threshold} -> true (Human Approval Required).
Return strictly valid JSON matching the schema.`;

  const prompt = `Inputs:
Tray ID: ${input.trayId}
MPN: ${input.mpn}
Failure Code: ${input.failureCode}
Failure Description: ${input.failureDescription}
DCHA Logs: ${input.dchaLogs}
Approval Threshold: ${threshold}%`;

  // Try Custom API if selected or URL configured
  if (
    engineSettings.activeEngine === "custom" ||
    (engineSettings.activeEngine as string) === "custom_api" ||
    (engineSettings.customApiUrl && engineSettings.activeEngine !== "ollama" && engineSettings.activeEngine !== "heuristic")
  ) {
    const customRes = await queryCustomApi<{
      recommendedDisposition: "Repaired" | "Replaced" | "Further Diagnosed";
      confidenceScore: number;
      reasoning: string;
      repairRecommendation: string;
      risk: "Low" | "Medium" | "High";
      suggestedRouting?: string;
      identifiedFailureMode?: string;
      estimatedCostUsd?: number;
      estimatedTatDays?: number;
    }>({
      prompt,
      systemInstruction,
    });

    if (customRes && customRes.parsed) {
      const parsed = customRes.parsed;
      const confidenceScore = Math.max(0, Math.min(100, Number(parsed.confidenceScore) || 85));
      const humanApprovalRequired = confidenceScore < threshold;
      const disposition = parsed.recommendedDisposition || "Repaired";
      const defaultRouting =
        disposition === "Replaced"
          ? "Fremont Central Scrap & Silicon Reclamation Hub (Bay 4)"
          : disposition === "Further Diagnosed"
          ? "Mountain View L3 Advanced Diagnostic Lab (Signal Integrity Bench #2)"
          : "San Jose Tier-1 Contract Manufacturer Facility (Line B-2 Rework)";

      return {
        output: {
          recommendedDisposition: disposition,
          confidenceScore,
          reasoning: parsed.reasoning || "Evaluated via custom LLM hardware diagnostic endpoint.",
          repairRecommendation: parsed.repairRecommendation || "Verify power train rail.",
          risk: parsed.risk || "Low",
          humanApprovalRequired,
          suggestedRouting: parsed.suggestedRouting || defaultRouting,
          dispatchRoute: parsed.suggestedRouting || defaultRouting,
          identifiedFailureMode:
            parsed.identifiedFailureMode ||
            (disposition === "Replaced"
              ? "Catastrophic Silicon Fracture / Substrate Delamination"
              : disposition === "Further Diagnosed"
              ? "Intermittent PCIe Gen5 Eye Margin Collapse"
              : "Micro-BGA Solder Joint Degradation / Voltage Regulator Wear"),
          estimatedCostUsd:
            parsed.estimatedCostUsd ?? (disposition === "Replaced" ? 1450 : disposition === "Further Diagnosed" ? 380 : 185),
          estimatedTatDays:
            parsed.estimatedTatDays ?? (disposition === "Replaced" ? 1 : disposition === "Further Diagnosed" ? 7 : 3),
        },
        engineUsed: "custom",
        modelUsed: customRes.modelUsed,
        tokenUsage: customRes.tokenUsage,
      };
    }
  }

  // Try Cloud AI API if selected and available
  if (
    (engineSettings.activeEngine === "api" || (engineSettings.activeEngine as string) === "gemini") &&
    (process.env.AI_API_KEY || process.env.LLM_API_KEY || process.env.GEMINI_API_KEY)
  ) {
    const cloudResult = await callGeminiStructured<{
      recommendedDisposition: "Repaired" | "Replaced" | "Further Diagnosed";
      confidenceScore: number;
      reasoning: string;
      repairRecommendation: string;
      risk: "Low" | "Medium" | "High";
      suggestedRouting: string;
      identifiedFailureMode: string;
      estimatedCostUsd: number;
      estimatedTatDays: number;
    }>({
      prompt,
      systemInstruction,
      preferredModel: engineSettings.apiModel || engineSettings.geminiModel,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          recommendedDisposition: {
            type: Type.STRING,
            enum: ["Repaired", "Replaced", "Further Diagnosed"],
          },
          confidenceScore: { type: Type.INTEGER },
          reasoning: { type: Type.STRING },
          repairRecommendation: { type: Type.STRING },
          risk: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
          suggestedRouting: { type: Type.STRING },
          identifiedFailureMode: { type: Type.STRING },
          estimatedCostUsd: { type: Type.NUMBER },
          estimatedTatDays: { type: Type.NUMBER },
        },
        required: [
          "recommendedDisposition",
          "confidenceScore",
          "reasoning",
          "repairRecommendation",
          "risk",
        ],
      },
    });

    if (cloudResult && cloudResult.parsed) {
      const parsed = cloudResult.parsed;
      const confidenceScore = Math.max(
        0,
        Math.min(100, Number(parsed.confidenceScore) || 85)
      );
      const humanApprovalRequired = confidenceScore < threshold;
      const disposition = parsed.recommendedDisposition || "Repaired";
      const defaultRouting =
        disposition === "Replaced"
          ? "Fremont Central Scrap & Silicon Reclamation Hub (Bay 4)"
          : disposition === "Further Diagnosed"
          ? "Mountain View L3 Advanced Diagnostic Lab (Signal Integrity Bench #2)"
          : "San Jose Tier-1 Contract Manufacturer Facility (Line B-2 Rework)";

      return {
        output: {
          recommendedDisposition: disposition,
          confidenceScore,
          reasoning:
            parsed.reasoning ||
            "Evaluated via neural hardware diagnostic model.",
          repairRecommendation:
            parsed.repairRecommendation || "Verify power train rail.",
          risk: parsed.risk || "Low",
          humanApprovalRequired,
          suggestedRouting: parsed.suggestedRouting || defaultRouting,
          dispatchRoute: parsed.suggestedRouting || defaultRouting,
          identifiedFailureMode:
            parsed.identifiedFailureMode ||
            (disposition === "Replaced"
              ? "Catastrophic Silicon Fracture / Substrate Delamination"
              : disposition === "Further Diagnosed"
              ? "Intermittent PCIe Gen5 Eye Margin Collapse"
              : "Micro-BGA Solder Joint Degradation / Voltage Regulator Wear"),
          estimatedCostUsd:
            parsed.estimatedCostUsd ??
            (disposition === "Replaced" ? 1450 : disposition === "Further Diagnosed" ? 380 : 185),
          estimatedTatDays:
            parsed.estimatedTatDays ??
            (disposition === "Replaced" ? 1 : disposition === "Further Diagnosed" ? 7 : 3),
        },
        engineUsed: "api",
        modelUsed: cloudResult.modelUsed,
        tokenUsage: cloudResult.tokenUsage,
      };
    }
  }

  // Try Ollama if configured
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
        Math.min(100, Number(parsed.confidenceScore) || 80)
      );
      const humanApprovalRequired = confidenceScore < threshold;
      const tokenUsage = computeTokenUsage(
        prompt,
        JSON.stringify(parsed),
        undefined,
        raw
      );
      const disposition: "Repaired" | "Replaced" | "Further Diagnosed" = [
        "Repaired",
        "Replaced",
        "Further Diagnosed",
      ].includes(parsed.recommendedDisposition)
        ? parsed.recommendedDisposition
        : "Repaired";
      const defaultRouting =
        disposition === "Replaced"
          ? "Fremont Central Scrap & Silicon Reclamation Hub (Bay 4)"
          : disposition === "Further Diagnosed"
          ? "Mountain View L3 Advanced Diagnostic Lab (Signal Integrity Bench #2)"
          : "San Jose Tier-1 Contract Manufacturer Facility (Line B-2 Rework)";

      return {
        output: {
          recommendedDisposition: disposition,
          confidenceScore,
          reasoning: parsed.reasoning || "Generated via local Ollama engine.",
          repairRecommendation:
            parsed.repairRecommendation || "Inspect telemetry and replace VRM.",
          risk: ["Low", "Medium", "High"].includes(parsed.risk)
            ? parsed.risk
            : "Medium",
          humanApprovalRequired,
          suggestedRouting: parsed.suggestedRouting || defaultRouting,
          dispatchRoute: parsed.suggestedRouting || defaultRouting,
          identifiedFailureMode:
            parsed.identifiedFailureMode ||
            (disposition === "Replaced"
              ? "Catastrophic Silicon Delamination"
              : disposition === "Further Diagnosed"
              ? "Intermittent PCIe Link Degradation"
              : "VRM Rail Degradation"),
          estimatedCostUsd:
            parsed.estimatedCostUsd ??
            (disposition === "Replaced" ? 1450 : disposition === "Further Diagnosed" ? 380 : 185),
          estimatedTatDays:
            parsed.estimatedTatDays ??
            (disposition === "Replaced" ? 1 : disposition === "Further Diagnosed" ? 7 : 3),
        },
        engineUsed: "ollama",
        tokenUsage,
      };
    } catch (err) {
      console.warn("Ollama agent 1 error:", err);
    }
  }

  // Expert Heuristic Fallback
  let disposition: "Repaired" | "Replaced" | "Further Diagnosed" = "Repaired";
  let confidence = 88;
  let risk: "Low" | "Medium" | "High" = "Low";
  let reasoning = "";
  let repairRec = "";
  let dispatchRoute = "";
  let failureMode = "";
  let estimatedCost = 185;
  let estimatedTat = 3;

  const descLower = (
    input.failureDescription +
    " " +
    input.failureCode +
    " " +
    input.dchaLogs
  ).toLowerCase();

  if (
    descLower.includes("crack") ||
    descLower.includes("delamination") ||
    descLower.includes("burned") ||
    descLower.includes("catastrophic")
  ) {
    disposition = "Replaced";
    confidence = 94; // >= 85 -> Auto Approved
    risk = "High";
    reasoning =
      "Physical substrate or PCB structural damage detected in DCHA inspection log. Repair cost exceeds replacement threshold.";
    repairRec =
      "Decommission tray chassis; harvest salvageable optical transceivers and route baseboard to authorized recycler.";
    dispatchRoute = "Fremont Central Scrap & Silicon Reclamation Hub (Bay 4)";
    failureMode = "Catastrophic Silicon Die Delamination & Substrate Shear Fracture";
    estimatedCost = 1450;
    estimatedTat = 1;
  } else if (
    descLower.includes("intermittent") ||
    descLower.includes("noise") ||
    descLower.includes("unresolved") ||
    descLower.includes("anomalous") ||
    descLower.includes("pcie")
  ) {
    disposition = "Further Diagnosed";
    confidence = 72; // Below 85 -> Human review required!
    risk = "Medium";
    reasoning =
      "Telemetry indicates transient signaling degradation without definitive component failure signature. Requires bench oscilloscope analysis.";
    repairRec =
      "Route tray to Level-3 Hardware Engineering Lab for PCIe bus signal integrity sweep at 64 GT/s.";
    dispatchRoute = "Mountain View L3 Advanced Diagnostic Lab (Signal Integrity Bench #2)";
    failureMode = "Intermittent PCIe Gen5 Retimer Signaling & Jitter Eye Margin Collapse";
    estimatedCost = 380;
    estimatedTat = 7;
  } else {
    disposition = "Repaired";
    confidence = 91; // >= 85 -> Auto Approved
    risk = "Low";
    reasoning =
      "Isolated telemetry error consistent with standard VRM regulator or optical transceiver wear. Standard board rework protocol applies.";
    repairRec =
      "Replace power rail decoupling capacitors C412/C413 and reflash secure boot SPI EEPROM to firmware v2.4.1.";
    dispatchRoute = "San Jose Tier-1 Contract Manufacturer Facility (Line B-2 Rework)";
    failureMode = "HBM3 Parity Check Bus Joint Fatigue / Voltage Regulator Ripple";
    estimatedCost = 185;
    estimatedTat = 3;
  }

  const output: Agent1Output = {
    recommendedDisposition: disposition,
    confidenceScore: confidence,
    reasoning,
    repairRecommendation: repairRec,
    risk,
    humanApprovalRequired: confidence < threshold,
    suggestedRouting: dispatchRoute,
    dispatchRoute: dispatchRoute,
    identifiedFailureMode: failureMode,
    estimatedCostUsd: estimatedCost,
    estimatedTatDays: estimatedTat,
  };

  return {
    output,
    engineUsed: "heuristic_engine",
    tokenUsage: computeTokenUsage(prompt, JSON.stringify(output)),
  };
}
