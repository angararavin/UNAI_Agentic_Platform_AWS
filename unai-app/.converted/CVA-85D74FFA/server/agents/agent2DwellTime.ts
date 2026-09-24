import { Type } from "@google/genai";
import { Agent2Input, Agent2Output, TokenUsage } from "../../src/types";
import {
  engineSettings,
  computeTokenUsage,
  queryOllama,
  queryCustomApi,
  callGeminiStructured,
} from "./common";

// ----------------------------------------------------
// AGENT 2: Dwell Time Monitoring & Escalation Agent
// Configurable threshold: Confidence >= threshold -> Auto-Approved
// ----------------------------------------------------
export async function executeAgent2(
  input: Agent2Input,
  customThreshold?: number
): Promise<{ output: Agent2Output; engineUsed: string; tokenUsage: TokenUsage; modelUsed?: string }> {
  const threshold = customThreshold ?? engineSettings.approvalThresholds?.["agent-2"] ?? 80;

  const systemInstruction = `You are Agent 2 — Dwell Time Monitoring & Escalation Agent for datacenter RMA trays.
Objective: Calculate dwell metrics, compare actual dwell duration against the configured Micro-SLO, determine target status, diagnose the root cause of delay, and recommend the appropriate escalation action.

Processing Requirements & Analysis:
1. Dwell Time: The actual elapsed hours spent in the current stage (hoursInStage).
2. Micro-SLO: The maximum acceptable duration (target in hours) for this stage.
3. Dwell Variance: Dwell Time minus Micro-SLO (hours over target). E.g., Dwell Time: 52h, Micro-SLO: 24h -> Variance: +28h over target.
4. Delay: Amount of time above target (Math.max(0, Dwell Variance)). If within target, delay is 0.
5. Target Determination:
   - 'Within Target' (Dwell Time < 0.8 * Micro-SLO)
   - 'Approaching Target' (Dwell Time >= 0.8 * Micro-SLO and <= Micro-SLO)
   - 'Target Breached' (Dwell Time > Micro-SLO)
6. Dwell Status: 'Within SLO', 'At Risk', or 'Breached' (or 'SLO Breached').
7. Root Cause: Identify the likely operational or diagnostic reason for the delay based on the stage, location, and event history (e.g., "Carrier assignment delay", "Diagnostic bench test queue backlog", "Thermal burn-in chamber capacity limit", "Technician shift transition handoff stall").
8. Escalation Recommendation: Prescribe the appropriate operational escalation action (e.g., "Monitor", "Notify logistics team", "Escalate to transportation manager", "Trigger priority carrier assignment", "Issue P1 expedited dock staging alert").
9. Confidence Score: 0 to 100 based on data completeness and clarity.
10. Approval Requirement: Confidence >= ${threshold} -> false (Auto Approved), Confidence < ${threshold} -> true (Human Approval Required).

Return strictly valid JSON matching the schema.`;

  const prompt = `Inputs:
Tray ID: ${input.trayId}
Current Stage: ${input.currentStage}
Hours in Stage: ${input.hoursInStage}
Micro-SLO: ${input.microSlo} hours
Location: ${input.location}
Event History: ${input.eventHistory}
Approval Threshold: ${threshold}%`;

  const dwellTime = Number(input.hoursInStage);
  const microSlo = Number(input.microSlo) || 1;
  const rawVariance = Number((dwellTime - microSlo).toFixed(1));
  const delay = Math.max(0, rawVariance);

  // Try Custom API if selected or URL configured
  if (
    engineSettings.activeEngine === "custom" ||
    (engineSettings.activeEngine as string) === "custom_api" ||
    (engineSettings.customApiUrl && engineSettings.activeEngine !== "ollama" && engineSettings.activeEngine !== "heuristic")
  ) {
    const customRes = await queryCustomApi<{
      dwellStatus: "Within SLO" | "At Risk" | "Breached";
      targetDetermination: "Within Target" | "Approaching Target" | "Target Breached";
      rootCause: string;
      escalationRecommendation: string;
      bottleneckStage: string;
      confidenceScore: number;
    }>({
      prompt,
      systemInstruction,
    });

    if (customRes && customRes.parsed) {
      const parsed = customRes.parsed;
      const confidenceScore = Math.max(0, Math.min(100, Number(parsed.confidenceScore) || 88));
      const humanApprovalRequired = confidenceScore < threshold;
      const sloBreach = dwellTime > microSlo;
      const status = parsed.dwellStatus || (sloBreach ? "Breached" : dwellTime >= microSlo * 0.8 ? "At Risk" : "Within SLO");
      const rootCause = parsed.rootCause || (sloBreach ? "Carrier assignment delay and staging queue stall." : "Nominal queue transit.");
      const escalationRecommendation = parsed.escalationRecommendation || (sloBreach ? "Trigger priority carrier assignment and escalate to transportation manager." : "Monitor standard stage transit.");

      return {
        output: {
          dwellStatus: status,
          dwellTime,
          microSlo,
          dwellVariance: rawVariance,
          delay,
          targetDetermination: parsed.targetDetermination || (sloBreach ? "Target Breached" : dwellTime >= microSlo * 0.8 ? "Approaching Target" : "Within Target"),
          rootCause,
          escalationRecommendation,
          recommendedAction: escalationRecommendation,
          bottleneckStage: parsed.bottleneckStage || input.currentStage,
          hoursInStage: dwellTime,
          sloBreach,
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
      dwellStatus: "Within SLO" | "At Risk" | "Breached";
      targetDetermination: "Within Target" | "Approaching Target" | "Target Breached";
      rootCause: string;
      escalationRecommendation: string;
      bottleneckStage: string;
      confidenceScore: number;
    }>({
      prompt,
      systemInstruction,
      preferredModel: engineSettings.apiModel || engineSettings.geminiModel,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          dwellStatus: {
            type: Type.STRING,
            enum: ["Within SLO", "At Risk", "Breached"],
          },
          targetDetermination: {
            type: Type.STRING,
            enum: ["Within Target", "Approaching Target", "Target Breached"],
          },
          rootCause: { type: Type.STRING },
          escalationRecommendation: { type: Type.STRING },
          bottleneckStage: { type: Type.STRING },
          confidenceScore: { type: Type.INTEGER },
        },
        required: [
          "dwellStatus",
          "targetDetermination",
          "rootCause",
          "escalationRecommendation",
          "bottleneckStage",
          "confidenceScore",
        ],
      },
    });

    if (cloudResult && cloudResult.parsed) {
      const parsed = cloudResult.parsed;
      const confidenceScore = Math.max(
        0,
        Math.min(100, Number(parsed.confidenceScore) || 88)
      );
      const humanApprovalRequired = confidenceScore < threshold;
      const sloBreach = dwellTime > microSlo;
      const status = parsed.dwellStatus || (sloBreach ? "Breached" : dwellTime >= microSlo * 0.8 ? "At Risk" : "Within SLO");
      const rootCause = parsed.rootCause || (sloBreach ? "Carrier assignment delay and staging queue stall." : "Nominal queue transit.");
      const escalationRecommendation = parsed.escalationRecommendation || (sloBreach ? "Trigger priority carrier assignment and escalate to transportation manager." : "Monitor standard stage transit.");

      return {
        output: {
          dwellStatus: status,
          dwellTime,
          microSlo,
          dwellVariance: rawVariance,
          delay,
          targetDetermination: parsed.targetDetermination || (sloBreach ? "Target Breached" : dwellTime >= microSlo * 0.8 ? "Approaching Target" : "Within Target"),
          rootCause,
          escalationRecommendation,
          recommendedAction: escalationRecommendation,
          bottleneckStage: parsed.bottleneckStage || input.currentStage,
          hoursInStage: dwellTime,
          sloBreach,
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
        Math.min(100, Number(parsed.confidenceScore) || 78)
      );
      const humanApprovalRequired = confidenceScore < threshold;
      const tokenUsage = computeTokenUsage(
        prompt,
        JSON.stringify(parsed),
        undefined,
        raw
      );

      const sloBreach = dwellTime > microSlo;
      const status: "Within SLO" | "At Risk" | "Breached" = ["Within SLO", "At Risk", "Breached"].includes(parsed.dwellStatus)
        ? parsed.dwellStatus
        : sloBreach ? "Breached" : dwellTime >= microSlo * 0.8 ? "At Risk" : "Within SLO";

      const escalation = parsed.escalationRecommendation || parsed.recommendedAction || "Notify logistics team for expedited handling.";

      return {
        output: {
          dwellStatus: status,
          dwellTime,
          microSlo,
          dwellVariance: rawVariance,
          delay,
          targetDetermination: sloBreach ? "Target Breached" : dwellTime >= microSlo * 0.8 ? "Approaching Target" : "Within Target",
          rootCause: parsed.rootCause || "Logistics processing backlog",
          escalationRecommendation: escalation,
          recommendedAction: escalation,
          bottleneckStage: parsed.bottleneckStage || input.currentStage,
          hoursInStage: dwellTime,
          sloBreach,
          confidenceScore,
          humanApprovalRequired,
        },
        engineUsed: "ollama",
        tokenUsage,
      };
    } catch (err) {
      console.warn("Ollama agent 2 error:", err);
    }
  }

  // Expert Heuristic Fallback
  const ratio = dwellTime / (microSlo || 1);
  let status: "Within SLO" | "At Risk" | "Breached" = "Within SLO";
  let targetDetermination: "Within Target" | "Approaching Target" | "Target Breached" = "Within Target";
  let confidence = 95;
  let action = "";
  let rootCause = "Nominal queue processing with balanced technician capacity.";
  let bottleneck = input.currentStage;

  if (ratio > 1.0) {
    status = "Breached";
    targetDetermination = "Target Breached";
    confidence = ratio > 1.5 ? 93 : 86;
    bottleneck = `${input.currentStage} Intake Staging`;
    rootCause = input.eventHistory.toLowerCase().includes("carrier") || input.eventHistory.toLowerCase().includes("dock")
      ? "Carrier assignment delay and intake queue stalling without priority dispatch."
      : "Stage processing backlog exceeding station throughput capacity.";
    action = "Escalate to transportation manager and trigger priority carrier assignment.";
  } else if (ratio >= 0.8) {
    status = "At Risk";
    targetDetermination = "Approaching Target";
    confidence = Math.max(70, Math.min(84, Math.round(threshold - 6))); // Below threshold to demonstrate human approval if needed
    bottleneck = `${input.currentStage} Queue Backlog`;
    rootCause = "High queue volume approaching Micro-SLO cut-off window.";
    action = "Notify logistics team to expedite bench staging.";
  } else {
    status = "Within SLO";
    targetDetermination = "Within Target";
    confidence = 96;
    bottleneck = "None (Nominal throughput)";
    rootCause = "Standard processing pace within calibrated limits.";
    action = "Monitor standard stage transit.";
  }

  const output: Agent2Output = {
    dwellStatus: status,
    dwellTime,
    microSlo,
    dwellVariance: rawVariance,
    delay,
    targetDetermination,
    rootCause,
    escalationRecommendation: action,
    recommendedAction: action,
    bottleneckStage: bottleneck,
    hoursInStage: dwellTime,
    sloBreach: ratio > 1.0,
    confidenceScore: confidence,
    humanApprovalRequired: confidence < threshold,
  };

  return {
    output,
    engineUsed: "heuristic_engine",
    tokenUsage: computeTokenUsage(prompt, JSON.stringify(output)),
  };
}
