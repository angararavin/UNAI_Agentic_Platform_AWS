import { Type } from "@google/genai";
import { Agent3Input, Agent3Output, TokenUsage } from "../../src/types";
import {
  engineSettings,
  computeTokenUsage,
  queryOllama,
  queryCustomApi,
  callGeminiStructured,
} from "./common";

// ----------------------------------------------------
// AGENT 3: Urgency Flagging Agent
// Configurable Threshold: Confidence >= threshold -> Auto-Approved
// ----------------------------------------------------
export async function executeAgent3(
  input: Agent3Input,
  customThreshold?: number
): Promise<{ output: Agent3Output; engineUsed: string; tokenUsage: TokenUsage; modelUsed?: string }> {
  const threshold = customThreshold ?? engineSettings.approvalThresholds?.["agent-3"] ?? 90;

  const systemInstruction = `You are Agent 3 — Urgency Flagging Agent for datacenter RMA trays.
Objective: Determine the urgency of an RMA and recommend the appropriate Required Delivery Date (RDD) / priority level.
Processing Requirements:
1. Evaluate failure criticality.
2. Evaluate spare availability (spareInventory).
3. Evaluate business impact.
4. Evaluate transportation constraints (carrierStatus, cmQueueStatus).
5. Determine RMA urgency: 'Critical', 'High', 'Medium', 'Low'.
6. Recommend priority: 'P1', 'P2', 'P3', 'P4'.
7. Recommend RDD (e.g. Next Flight Out (<24h), Expedited 48h, Standard 5-7d).
8. Generate confidence score (0-100).
9. Determine human approval: Confidence >= ${threshold} -> false (Auto Approved), Confidence < ${threshold} -> true (Human Approval Required).
Return strictly valid JSON matching the schema.`;

  const prompt = `Inputs:
Tray ID: ${input.trayId}
Failure Type: ${input.failureType}
Failure Code: ${input.failureCode}
Data Center: ${input.dataCenter}
Spare Inventory: ${input.spareInventory} units
Business Impact: ${input.businessImpact}
Carrier Status: ${input.carrierStatus}
CM Queue Status: ${input.cmQueueStatus}
Approval Threshold: ${threshold}%`;

  // Try Custom API if selected or URL configured
  if (
    engineSettings.activeEngine === "custom" ||
    (engineSettings.activeEngine as string) === "custom_api" ||
    (engineSettings.customApiUrl && engineSettings.activeEngine !== "ollama" && engineSettings.activeEngine !== "heuristic")
  ) {
    const customRes = await queryCustomApi<{
      urgencyLevel: "Critical" | "High" | "Medium" | "Low";
      priority: "P1" | "P2" | "P3" | "P4";
      recommendedRdd: string;
      reasoning: string;
      businessImpact: string;
      risk: "Low" | "Medium" | "High";
      confidenceScore: number;
    }>({
      prompt,
      systemInstruction,
    });

    if (customRes && customRes.parsed) {
      const parsed = customRes.parsed;
      const confidenceScore = Math.max(0, Math.min(100, Number(parsed.confidenceScore) || 91));
      const humanApprovalRequired = confidenceScore < threshold;

      return {
        output: {
          urgencyLevel: parsed.urgencyLevel || "High",
          priority: parsed.priority || "P2",
          recommendedRdd: parsed.recommendedRdd || "Within 48 Hours",
          reasoning: parsed.reasoning || "Assessed via custom AI endpoint based on spare inventory and SLA exposure.",
          businessImpact: parsed.businessImpact || input.businessImpact,
          risk: parsed.risk || "Medium",
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
      urgencyLevel: "Critical" | "High" | "Medium" | "Low";
      priority: "P1" | "P2" | "P3" | "P4";
      recommendedRdd: string;
      reasoning: string;
      businessImpact: string;
      risk: "Low" | "Medium" | "High";
      confidenceScore: number;
    }>({
      prompt,
      systemInstruction,
      preferredModel: engineSettings.apiModel || engineSettings.geminiModel,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          urgencyLevel: {
            type: Type.STRING,
            enum: ["Critical", "High", "Medium", "Low"],
          },
          priority: { type: Type.STRING, enum: ["P1", "P2", "P3", "P4"] },
          recommendedRdd: { type: Type.STRING },
          reasoning: { type: Type.STRING },
          businessImpact: { type: Type.STRING },
          risk: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
          confidenceScore: { type: Type.INTEGER },
        },
        required: [
          "urgencyLevel",
          "priority",
          "recommendedRdd",
          "reasoning",
          "businessImpact",
          "risk",
          "confidenceScore",
        ],
      },
    });

    if (cloudResult && cloudResult.parsed) {
      const parsed = cloudResult.parsed;
      const confidenceScore = Math.max(
        0,
        Math.min(100, Number(parsed.confidenceScore) || 91)
      );
      const humanApprovalRequired = confidenceScore < threshold;

      return {
        output: {
          urgencyLevel: parsed.urgencyLevel || "High",
          priority: parsed.priority || "P2",
          recommendedRdd: parsed.recommendedRdd || "Within 48 Hours",
          reasoning:
            parsed.reasoning ||
            "Assessed via AI engine based on spare inventory and SLA exposure.",
          businessImpact: parsed.businessImpact || input.businessImpact,
          risk: parsed.risk || "Medium",
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
        Math.min(100, Number(parsed.confidenceScore) || 86)
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
          urgencyLevel: ["Critical", "High", "Medium", "Low"].includes(
            parsed.urgencyLevel
          )
            ? parsed.urgencyLevel
            : "Medium",
          priority: ["P1", "P2", "P3", "P4"].includes(parsed.priority)
            ? parsed.priority
            : "P3",
          recommendedRdd: parsed.recommendedRdd || "Within 3 Days",
          reasoning: parsed.reasoning || "Generated by local Ollama model.",
          businessImpact: parsed.businessImpact || input.businessImpact,
          risk: ["Low", "Medium", "High"].includes(parsed.risk)
            ? parsed.risk
            : "Medium",
          confidenceScore,
          humanApprovalRequired,
        },
        engineUsed: "ollama",
        tokenUsage,
      };
    } catch (err) {
      console.warn("Ollama agent 3 error:", err);
    }
  }

  // Expert Heuristic Fallback
  let urgency: "Critical" | "High" | "Medium" | "Low" = "Medium";
  let priority: "P1" | "P2" | "P3" | "P4" = "P3";
  let rdd = "Standard Ground (5 Business Days)";
  let confidence = 92;
  let risk: "Low" | "Medium" | "High" = "Low";
  let reasoning = "";

  const impactLower = (
    input.businessImpact +
    " " +
    input.failureType
  ).toLowerCase();

  if (
    input.spareInventory === 0 ||
    impactLower.includes("outage") ||
    impactLower.includes("spine") ||
    impactLower.includes("cluster") ||
    impactLower.includes("45,000")
  ) {
    urgency = "Critical";
    priority = "P1";
    rdd = "Next Flight Out (NFO - <24h Delivery)";
    confidence = 96; // >= 90 -> Auto Approved
    risk = "High";
    reasoning = `Zero spare buffer at ${input.dataCenter} coupled with active cluster performance degradation creates immediate SLA breach risk. Expedited NFO air logistics mandated.`;
  } else if (
    input.spareInventory <= 2 ||
    impactLower.includes("edge") ||
    input.carrierStatus.toLowerCase().includes("storm") ||
    input.carrierStatus.toLowerCase().includes("delay")
  ) {
    urgency = "High";
    priority = "P2";
    rdd = "Priority Air (<48h Delivery)";
    confidence = 82; // Below 90 -> Human review required
    risk = "Medium";
    reasoning = `Buffer stock is constrained (${input.spareInventory} units) with carrier transit volatility (${input.carrierStatus}). Confidence is 82% due to weather unpredictability; requires logistics manager review.`;
  } else {
    urgency = "Low";
    priority = "P4";
    rdd = "Consolidated Ground Logistics (+7 Days)";
    confidence = 94; // >= 90 -> Auto Approved
    risk = "Low";
    reasoning = `Ample local spare inventory (${input.spareInventory} units) and redundant hardware paths prevent user-facing disruption. Standard cost-optimized ground transit recommended.`;
  }

  const output: Agent3Output = {
    urgencyLevel: urgency,
    priority,
    recommendedRdd: rdd,
    reasoning,
    businessImpact: input.businessImpact,
    risk,
    confidenceScore: confidence,
    humanApprovalRequired: confidence < threshold,
  };

  return {
    output,
    engineUsed: "heuristic_engine",
    tokenUsage: computeTokenUsage(prompt, JSON.stringify(output)),
  };
}
