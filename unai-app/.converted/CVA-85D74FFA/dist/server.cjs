var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv2 = __toESM(require("dotenv"), 1);
var import_vite = require("vite");

// server/agents/common.ts
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var initialEngine = (() => {
  if (process.env.DEFAULT_AI_ENGINE && ["custom", "ollama", "heuristic"].includes(process.env.DEFAULT_AI_ENGINE)) {
    return process.env.DEFAULT_AI_ENGINE;
  }
  if (process.env.DEFAULT_AI_ENGINE === "api" || process.env.DEFAULT_AI_ENGINE === "gemini") {
    return "custom";
  }
  if (process.env.CUSTOM_API_URL || process.env.NVIDIA_API_KEY || process.env.NVIDIA_NIM_API_KEY) return "custom";
  if (process.env.OLLAMA_HOST && process.env.DEFAULT_AI_ENGINE === "ollama") return "ollama";
  return "custom";
})();
var engineSettings = {
  activeEngine: initialEngine,
  apiModel: process.env.AI_MODEL || process.env.LLM_MODEL || process.env.GEMINI_MODEL || "cloud-fast",
  customApiUrl: process.env.CUSTOM_API_URL || process.env.NVIDIA_BASE_URL || process.env.NVIDIA_NIM_URL || process.env.LLM_API_URL || "https://integrate.api.nvidia.com/v1",
  customApiKey: process.env.CUSTOM_API_KEY || process.env.NVIDIA_API_KEY || process.env.NVIDIA_NIM_API_KEY || process.env.LLM_API_KEY || "",
  customModel: process.env.CUSTOM_MODEL || process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct",
  geminiModel: process.env.GEMINI_MODEL || process.env.AI_MODEL || "cloud-fast",
  ollamaHost: process.env.OLLAMA_HOST || "http://localhost:11434",
  ollamaModel: process.env.OLLAMA_MODEL || "llama3",
  hasApiKey: !!(process.env.AI_API_KEY || process.env.LLM_API_KEY || process.env.CUSTOM_API_KEY || process.env.NVIDIA_API_KEY || process.env.NVIDIA_NIM_API_KEY || process.env.GEMINI_API_KEY),
  hasGeminiKey: !!(process.env.GEMINI_API_KEY || process.env.AI_API_KEY),
  approvalThresholds: {
    "agent-1": process.env.AGENT_1_THRESHOLD ? Number(process.env.AGENT_1_THRESHOLD) : 85,
    "agent-2": process.env.AGENT_2_THRESHOLD ? Number(process.env.AGENT_2_THRESHOLD) : 80,
    "agent-3": process.env.AGENT_3_THRESHOLD ? Number(process.env.AGENT_3_THRESHOLD) : 90,
    "agent-4": process.env.AGENT_4_THRESHOLD ? Number(process.env.AGENT_4_THRESHOLD) : 95
  }
};
var genAIClient = null;
function getAiClient() {
  const key = process.env.AI_API_KEY || process.env.LLM_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new import_genai.GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "control-tower-agent"
        }
      }
    });
  }
  return genAIClient;
}
function computeTokenUsage(promptText, completionText, apiUsage, ollamaRaw) {
  if (apiUsage && (apiUsage.totalTokenCount || apiUsage.promptTokenCount || apiUsage.total_tokens || apiUsage.prompt_tokens)) {
    const promptTokens2 = apiUsage.promptTokenCount || apiUsage.prompt_tokens || Math.max(90, Math.ceil(promptText.length / 4));
    const completionTokens2 = apiUsage.candidatesTokenCount || apiUsage.completion_tokens || Math.max(50, Math.ceil(completionText.length / 4));
    return {
      promptTokens: promptTokens2,
      completionTokens: completionTokens2,
      totalTokens: apiUsage.totalTokenCount || apiUsage.total_tokens || promptTokens2 + completionTokens2
    };
  }
  if (ollamaRaw && (ollamaRaw.prompt_eval_count || ollamaRaw.eval_count)) {
    const promptTokens2 = ollamaRaw.prompt_eval_count || Math.max(90, Math.ceil(promptText.length / 4));
    const completionTokens2 = ollamaRaw.eval_count || Math.max(50, Math.ceil(completionText.length / 4));
    return {
      promptTokens: promptTokens2,
      completionTokens: completionTokens2,
      totalTokens: promptTokens2 + completionTokens2
    };
  }
  const promptTokens = Math.max(120, Math.ceil(promptText.length / 3.8));
  const completionTokens = Math.max(75, Math.ceil(completionText.length / 3.8));
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens
  };
}
async function queryCustomApi(options) {
  const targetUrl = options.url || engineSettings.customApiUrl || process.env.CUSTOM_API_URL || process.env.LLM_API_URL || "https://integrate.api.nvidia.com/v1";
  if (!targetUrl) return null;
  const cleanUrl = targetUrl.replace(/\/$/, "");
  const endpoint = cleanUrl.endsWith("/chat/completions") ? cleanUrl : `${cleanUrl}/chat/completions`;
  const model = options.model || engineSettings.customModel || process.env.CUSTOM_MODEL || "meta/llama-3.1-70b-instruct";
  const apiKey = options.apiKey || engineSettings.customApiKey || process.env.CUSTOM_API_KEY || process.env.LLM_API_KEY;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35e3);
  try {
    const headers = {
      "Content-Type": "application/json"
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey.trim()}`;
    }
    let response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `${options.systemInstruction}

IMPORTANT: Return strictly valid JSON with no conversational prefix or markdown wrapper.`
          },
          { role: "user", content: options.prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      }),
      signal: controller.signal
    });
    if (!response.ok && response.status === 400) {
      console.log(`[Custom/NIM API] Retrying without response_format parameter...`);
      response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: `${options.systemInstruction}

CRITICAL: Output ONLY a raw, valid JSON object matching the required schema. Do NOT include markdown code blocks, backticks, or any explanation text.`
            },
            { role: "user", content: options.prompt }
          ],
          temperature: 0.1
        }),
        signal: controller.signal
      });
    }
    clearTimeout(timeoutId);
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(`[Custom/NIM API] Request failed with status ${response.status}: ${response.statusText}. Details: ${errText.slice(0, 300)}`);
      return null;
    }
    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content || "{}";
    let cleaned = rawContent.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    } else {
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
    }
    const parsed = JSON.parse(cleaned);
    const tokenUsage = computeTokenUsage(options.prompt, rawContent, data?.usage);
    return { parsed, tokenUsage, modelUsed: model };
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[Custom/NIM API Error] ${err?.message || err}`);
    return null;
  }
}
async function callCloudAiStructured(options) {
  const client = getAiClient();
  if (!client) {
    return null;
  }
  const candidateModels = [
    options.preferredModel || engineSettings.apiModel || engineSettings.geminiModel || "cloud-fast",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite"
  ];
  const modelsToTry = Array.from(new Set(candidateModels));
  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    try {
      const response = await client.models.generateContent({
        model,
        contents: options.prompt,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: options.responseSchema
        }
      });
      const text = response.text || "{}";
      const parsed = JSON.parse(text);
      const tokenUsage = computeTokenUsage(
        options.prompt,
        text,
        response.usageMetadata
      );
      return { parsed, tokenUsage, modelUsed: model };
    } catch (err) {
      const errMessage = String(err?.message || err);
      const isCapacityOrTransient = err?.status === 503 || err?.code === 503 || errMessage.includes("503") || errMessage.includes("high demand") || errMessage.includes("UNAVAILABLE") || errMessage.includes("429") || errMessage.includes("RESOURCE_EXHAUSTED");
      if (isCapacityOrTransient && i < modelsToTry.length - 1) {
        console.log(`[AI Resiliency] Model ${model} is experiencing high demand. Retrying with alternate candidate: ${modelsToTry[i + 1]}...`);
        await new Promise((resolve) => setTimeout(resolve, 350));
        continue;
      } else {
        console.log(`[AI Resiliency] Model ${model} unavailable (${errMessage.slice(0, 80)}). Falling back.`);
      }
    }
  }
  return null;
}
var callGeminiStructured = callCloudAiStructured;
async function queryOllama(prompt, systemInstruction, host, model) {
  const cleanHost = host.replace(/\/$/, "");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2e4);
  try {
    const res = await fetch(`${cleanHost}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        system: systemInstruction,
        format: "json",
        stream: false,
        options: {
          temperature: 0.1
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      throw new Error(`Ollama HTTP Error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    if (!data.response) {
      throw new Error("Ollama returned empty response payload");
    }
    return { parsed: JSON.parse(data.response), raw: data };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// server/agents/agent1Disposition.ts
var import_genai2 = require("@google/genai");
async function executeAgent1(input, customThreshold) {
  const threshold = customThreshold ?? engineSettings.approvalThresholds?.["agent-1"] ?? 85;
  const systemInstruction = `You are Agent 1 \u2014 Failure-Based Disposition Agent for data center RMA tray hardware.
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
  if (engineSettings.activeEngine === "custom" || engineSettings.activeEngine === "custom_api" || engineSettings.customApiUrl && engineSettings.activeEngine !== "ollama" && engineSettings.activeEngine !== "heuristic") {
    const customRes = await queryCustomApi({
      prompt,
      systemInstruction
    });
    if (customRes && customRes.parsed) {
      const parsed = customRes.parsed;
      const confidenceScore = Math.max(0, Math.min(100, Number(parsed.confidenceScore) || 85));
      const humanApprovalRequired = confidenceScore < threshold;
      const disposition2 = parsed.recommendedDisposition || "Repaired";
      const defaultRouting = disposition2 === "Replaced" ? "Fremont Central Scrap & Silicon Reclamation Hub (Bay 4)" : disposition2 === "Further Diagnosed" ? "Mountain View L3 Advanced Diagnostic Lab (Signal Integrity Bench #2)" : "San Jose Tier-1 Contract Manufacturer Facility (Line B-2 Rework)";
      return {
        output: {
          recommendedDisposition: disposition2,
          confidenceScore,
          reasoning: parsed.reasoning || "Evaluated via custom LLM hardware diagnostic endpoint.",
          repairRecommendation: parsed.repairRecommendation || "Verify power train rail.",
          risk: parsed.risk || "Low",
          humanApprovalRequired,
          suggestedRouting: parsed.suggestedRouting || defaultRouting,
          dispatchRoute: parsed.suggestedRouting || defaultRouting,
          identifiedFailureMode: parsed.identifiedFailureMode || (disposition2 === "Replaced" ? "Catastrophic Silicon Fracture / Substrate Delamination" : disposition2 === "Further Diagnosed" ? "Intermittent PCIe Gen5 Eye Margin Collapse" : "Micro-BGA Solder Joint Degradation / Voltage Regulator Wear"),
          estimatedCostUsd: parsed.estimatedCostUsd ?? (disposition2 === "Replaced" ? 1450 : disposition2 === "Further Diagnosed" ? 380 : 185),
          estimatedTatDays: parsed.estimatedTatDays ?? (disposition2 === "Replaced" ? 1 : disposition2 === "Further Diagnosed" ? 7 : 3)
        },
        engineUsed: "custom",
        modelUsed: customRes.modelUsed,
        tokenUsage: customRes.tokenUsage
      };
    }
  }
  if ((engineSettings.activeEngine === "api" || engineSettings.activeEngine === "gemini") && (process.env.AI_API_KEY || process.env.LLM_API_KEY || process.env.GEMINI_API_KEY)) {
    const cloudResult = await callGeminiStructured({
      prompt,
      systemInstruction,
      preferredModel: engineSettings.apiModel || engineSettings.geminiModel,
      responseSchema: {
        type: import_genai2.Type.OBJECT,
        properties: {
          recommendedDisposition: {
            type: import_genai2.Type.STRING,
            enum: ["Repaired", "Replaced", "Further Diagnosed"]
          },
          confidenceScore: { type: import_genai2.Type.INTEGER },
          reasoning: { type: import_genai2.Type.STRING },
          repairRecommendation: { type: import_genai2.Type.STRING },
          risk: { type: import_genai2.Type.STRING, enum: ["Low", "Medium", "High"] },
          suggestedRouting: { type: import_genai2.Type.STRING },
          identifiedFailureMode: { type: import_genai2.Type.STRING },
          estimatedCostUsd: { type: import_genai2.Type.NUMBER },
          estimatedTatDays: { type: import_genai2.Type.NUMBER }
        },
        required: [
          "recommendedDisposition",
          "confidenceScore",
          "reasoning",
          "repairRecommendation",
          "risk"
        ]
      }
    });
    if (cloudResult && cloudResult.parsed) {
      const parsed = cloudResult.parsed;
      const confidenceScore = Math.max(
        0,
        Math.min(100, Number(parsed.confidenceScore) || 85)
      );
      const humanApprovalRequired = confidenceScore < threshold;
      const disposition2 = parsed.recommendedDisposition || "Repaired";
      const defaultRouting = disposition2 === "Replaced" ? "Fremont Central Scrap & Silicon Reclamation Hub (Bay 4)" : disposition2 === "Further Diagnosed" ? "Mountain View L3 Advanced Diagnostic Lab (Signal Integrity Bench #2)" : "San Jose Tier-1 Contract Manufacturer Facility (Line B-2 Rework)";
      return {
        output: {
          recommendedDisposition: disposition2,
          confidenceScore,
          reasoning: parsed.reasoning || "Evaluated via neural hardware diagnostic model.",
          repairRecommendation: parsed.repairRecommendation || "Verify power train rail.",
          risk: parsed.risk || "Low",
          humanApprovalRequired,
          suggestedRouting: parsed.suggestedRouting || defaultRouting,
          dispatchRoute: parsed.suggestedRouting || defaultRouting,
          identifiedFailureMode: parsed.identifiedFailureMode || (disposition2 === "Replaced" ? "Catastrophic Silicon Fracture / Substrate Delamination" : disposition2 === "Further Diagnosed" ? "Intermittent PCIe Gen5 Eye Margin Collapse" : "Micro-BGA Solder Joint Degradation / Voltage Regulator Wear"),
          estimatedCostUsd: parsed.estimatedCostUsd ?? (disposition2 === "Replaced" ? 1450 : disposition2 === "Further Diagnosed" ? 380 : 185),
          estimatedTatDays: parsed.estimatedTatDays ?? (disposition2 === "Replaced" ? 1 : disposition2 === "Further Diagnosed" ? 7 : 3)
        },
        engineUsed: "api",
        modelUsed: cloudResult.modelUsed,
        tokenUsage: cloudResult.tokenUsage
      };
    }
  }
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
        void 0,
        raw
      );
      const disposition2 = [
        "Repaired",
        "Replaced",
        "Further Diagnosed"
      ].includes(parsed.recommendedDisposition) ? parsed.recommendedDisposition : "Repaired";
      const defaultRouting = disposition2 === "Replaced" ? "Fremont Central Scrap & Silicon Reclamation Hub (Bay 4)" : disposition2 === "Further Diagnosed" ? "Mountain View L3 Advanced Diagnostic Lab (Signal Integrity Bench #2)" : "San Jose Tier-1 Contract Manufacturer Facility (Line B-2 Rework)";
      return {
        output: {
          recommendedDisposition: disposition2,
          confidenceScore,
          reasoning: parsed.reasoning || "Generated via local Ollama engine.",
          repairRecommendation: parsed.repairRecommendation || "Inspect telemetry and replace VRM.",
          risk: ["Low", "Medium", "High"].includes(parsed.risk) ? parsed.risk : "Medium",
          humanApprovalRequired,
          suggestedRouting: parsed.suggestedRouting || defaultRouting,
          dispatchRoute: parsed.suggestedRouting || defaultRouting,
          identifiedFailureMode: parsed.identifiedFailureMode || (disposition2 === "Replaced" ? "Catastrophic Silicon Delamination" : disposition2 === "Further Diagnosed" ? "Intermittent PCIe Link Degradation" : "VRM Rail Degradation"),
          estimatedCostUsd: parsed.estimatedCostUsd ?? (disposition2 === "Replaced" ? 1450 : disposition2 === "Further Diagnosed" ? 380 : 185),
          estimatedTatDays: parsed.estimatedTatDays ?? (disposition2 === "Replaced" ? 1 : disposition2 === "Further Diagnosed" ? 7 : 3)
        },
        engineUsed: "ollama",
        tokenUsage
      };
    } catch (err) {
      console.warn("Ollama agent 1 error:", err);
    }
  }
  let disposition = "Repaired";
  let confidence = 88;
  let risk = "Low";
  let reasoning = "";
  let repairRec = "";
  let dispatchRoute = "";
  let failureMode = "";
  let estimatedCost = 185;
  let estimatedTat = 3;
  const descLower = (input.failureDescription + " " + input.failureCode + " " + input.dchaLogs).toLowerCase();
  if (descLower.includes("crack") || descLower.includes("delamination") || descLower.includes("burned") || descLower.includes("catastrophic")) {
    disposition = "Replaced";
    confidence = 94;
    risk = "High";
    reasoning = "Physical substrate or PCB structural damage detected in DCHA inspection log. Repair cost exceeds replacement threshold.";
    repairRec = "Decommission tray chassis; harvest salvageable optical transceivers and route baseboard to authorized recycler.";
    dispatchRoute = "Fremont Central Scrap & Silicon Reclamation Hub (Bay 4)";
    failureMode = "Catastrophic Silicon Die Delamination & Substrate Shear Fracture";
    estimatedCost = 1450;
    estimatedTat = 1;
  } else if (descLower.includes("intermittent") || descLower.includes("noise") || descLower.includes("unresolved") || descLower.includes("anomalous") || descLower.includes("pcie")) {
    disposition = "Further Diagnosed";
    confidence = 72;
    risk = "Medium";
    reasoning = "Telemetry indicates transient signaling degradation without definitive component failure signature. Requires bench oscilloscope analysis.";
    repairRec = "Route tray to Level-3 Hardware Engineering Lab for PCIe bus signal integrity sweep at 64 GT/s.";
    dispatchRoute = "Mountain View L3 Advanced Diagnostic Lab (Signal Integrity Bench #2)";
    failureMode = "Intermittent PCIe Gen5 Retimer Signaling & Jitter Eye Margin Collapse";
    estimatedCost = 380;
    estimatedTat = 7;
  } else {
    disposition = "Repaired";
    confidence = 91;
    risk = "Low";
    reasoning = "Isolated telemetry error consistent with standard VRM regulator or optical transceiver wear. Standard board rework protocol applies.";
    repairRec = "Replace power rail decoupling capacitors C412/C413 and reflash secure boot SPI EEPROM to firmware v2.4.1.";
    dispatchRoute = "San Jose Tier-1 Contract Manufacturer Facility (Line B-2 Rework)";
    failureMode = "HBM3 Parity Check Bus Joint Fatigue / Voltage Regulator Ripple";
    estimatedCost = 185;
    estimatedTat = 3;
  }
  const output = {
    recommendedDisposition: disposition,
    confidenceScore: confidence,
    reasoning,
    repairRecommendation: repairRec,
    risk,
    humanApprovalRequired: confidence < threshold,
    suggestedRouting: dispatchRoute,
    dispatchRoute,
    identifiedFailureMode: failureMode,
    estimatedCostUsd: estimatedCost,
    estimatedTatDays: estimatedTat
  };
  return {
    output,
    engineUsed: "heuristic_engine",
    tokenUsage: computeTokenUsage(prompt, JSON.stringify(output))
  };
}

// server/agents/agent2DwellTime.ts
var import_genai3 = require("@google/genai");
async function executeAgent2(input, customThreshold) {
  const threshold = customThreshold ?? engineSettings.approvalThresholds?.["agent-2"] ?? 80;
  const systemInstruction = `You are Agent 2 \u2014 Dwell Time Monitoring & Escalation Agent for datacenter RMA trays.
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
  if (engineSettings.activeEngine === "custom" || engineSettings.activeEngine === "custom_api" || engineSettings.customApiUrl && engineSettings.activeEngine !== "ollama" && engineSettings.activeEngine !== "heuristic") {
    const customRes = await queryCustomApi({
      prompt,
      systemInstruction
    });
    if (customRes && customRes.parsed) {
      const parsed = customRes.parsed;
      const confidenceScore = Math.max(0, Math.min(100, Number(parsed.confidenceScore) || 88));
      const humanApprovalRequired = confidenceScore < threshold;
      const sloBreach = dwellTime > microSlo;
      const status2 = parsed.dwellStatus || (sloBreach ? "Breached" : dwellTime >= microSlo * 0.8 ? "At Risk" : "Within SLO");
      const rootCause2 = parsed.rootCause || (sloBreach ? "Carrier assignment delay and staging queue stall." : "Nominal queue transit.");
      const escalationRecommendation = parsed.escalationRecommendation || (sloBreach ? "Trigger priority carrier assignment and escalate to transportation manager." : "Monitor standard stage transit.");
      return {
        output: {
          dwellStatus: status2,
          dwellTime,
          microSlo,
          dwellVariance: rawVariance,
          delay,
          targetDetermination: parsed.targetDetermination || (sloBreach ? "Target Breached" : dwellTime >= microSlo * 0.8 ? "Approaching Target" : "Within Target"),
          rootCause: rootCause2,
          escalationRecommendation,
          recommendedAction: escalationRecommendation,
          bottleneckStage: parsed.bottleneckStage || input.currentStage,
          hoursInStage: dwellTime,
          sloBreach,
          confidenceScore,
          humanApprovalRequired
        },
        engineUsed: "custom",
        modelUsed: customRes.modelUsed,
        tokenUsage: customRes.tokenUsage
      };
    }
  }
  if ((engineSettings.activeEngine === "api" || engineSettings.activeEngine === "gemini") && (process.env.AI_API_KEY || process.env.LLM_API_KEY || process.env.GEMINI_API_KEY)) {
    const cloudResult = await callGeminiStructured({
      prompt,
      systemInstruction,
      preferredModel: engineSettings.apiModel || engineSettings.geminiModel,
      responseSchema: {
        type: import_genai3.Type.OBJECT,
        properties: {
          dwellStatus: {
            type: import_genai3.Type.STRING,
            enum: ["Within SLO", "At Risk", "Breached"]
          },
          targetDetermination: {
            type: import_genai3.Type.STRING,
            enum: ["Within Target", "Approaching Target", "Target Breached"]
          },
          rootCause: { type: import_genai3.Type.STRING },
          escalationRecommendation: { type: import_genai3.Type.STRING },
          bottleneckStage: { type: import_genai3.Type.STRING },
          confidenceScore: { type: import_genai3.Type.INTEGER }
        },
        required: [
          "dwellStatus",
          "targetDetermination",
          "rootCause",
          "escalationRecommendation",
          "bottleneckStage",
          "confidenceScore"
        ]
      }
    });
    if (cloudResult && cloudResult.parsed) {
      const parsed = cloudResult.parsed;
      const confidenceScore = Math.max(
        0,
        Math.min(100, Number(parsed.confidenceScore) || 88)
      );
      const humanApprovalRequired = confidenceScore < threshold;
      const sloBreach = dwellTime > microSlo;
      const status2 = parsed.dwellStatus || (sloBreach ? "Breached" : dwellTime >= microSlo * 0.8 ? "At Risk" : "Within SLO");
      const rootCause2 = parsed.rootCause || (sloBreach ? "Carrier assignment delay and staging queue stall." : "Nominal queue transit.");
      const escalationRecommendation = parsed.escalationRecommendation || (sloBreach ? "Trigger priority carrier assignment and escalate to transportation manager." : "Monitor standard stage transit.");
      return {
        output: {
          dwellStatus: status2,
          dwellTime,
          microSlo,
          dwellVariance: rawVariance,
          delay,
          targetDetermination: parsed.targetDetermination || (sloBreach ? "Target Breached" : dwellTime >= microSlo * 0.8 ? "Approaching Target" : "Within Target"),
          rootCause: rootCause2,
          escalationRecommendation,
          recommendedAction: escalationRecommendation,
          bottleneckStage: parsed.bottleneckStage || input.currentStage,
          hoursInStage: dwellTime,
          sloBreach,
          confidenceScore,
          humanApprovalRequired
        },
        engineUsed: "api",
        modelUsed: cloudResult.modelUsed,
        tokenUsage: cloudResult.tokenUsage
      };
    }
  }
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
        void 0,
        raw
      );
      const sloBreach = dwellTime > microSlo;
      const status2 = ["Within SLO", "At Risk", "Breached"].includes(parsed.dwellStatus) ? parsed.dwellStatus : sloBreach ? "Breached" : dwellTime >= microSlo * 0.8 ? "At Risk" : "Within SLO";
      const escalation = parsed.escalationRecommendation || parsed.recommendedAction || "Notify logistics team for expedited handling.";
      return {
        output: {
          dwellStatus: status2,
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
          humanApprovalRequired
        },
        engineUsed: "ollama",
        tokenUsage
      };
    } catch (err) {
      console.warn("Ollama agent 2 error:", err);
    }
  }
  const ratio = dwellTime / (microSlo || 1);
  let status = "Within SLO";
  let targetDetermination = "Within Target";
  let confidence = 95;
  let action = "";
  let rootCause = "Nominal queue processing with balanced technician capacity.";
  let bottleneck = input.currentStage;
  if (ratio > 1) {
    status = "Breached";
    targetDetermination = "Target Breached";
    confidence = ratio > 1.5 ? 93 : 86;
    bottleneck = `${input.currentStage} Intake Staging`;
    rootCause = input.eventHistory.toLowerCase().includes("carrier") || input.eventHistory.toLowerCase().includes("dock") ? "Carrier assignment delay and intake queue stalling without priority dispatch." : "Stage processing backlog exceeding station throughput capacity.";
    action = "Escalate to transportation manager and trigger priority carrier assignment.";
  } else if (ratio >= 0.8) {
    status = "At Risk";
    targetDetermination = "Approaching Target";
    confidence = Math.max(70, Math.min(84, Math.round(threshold - 6)));
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
  const output = {
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
    sloBreach: ratio > 1,
    confidenceScore: confidence,
    humanApprovalRequired: confidence < threshold
  };
  return {
    output,
    engineUsed: "heuristic_engine",
    tokenUsage: computeTokenUsage(prompt, JSON.stringify(output))
  };
}

// server/agents/agent3Urgency.ts
var import_genai4 = require("@google/genai");
async function executeAgent3(input, customThreshold) {
  const threshold = customThreshold ?? engineSettings.approvalThresholds?.["agent-3"] ?? 90;
  const systemInstruction = `You are Agent 3 \u2014 Urgency Flagging Agent for datacenter RMA trays.
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
  if (engineSettings.activeEngine === "custom" || engineSettings.activeEngine === "custom_api" || engineSettings.customApiUrl && engineSettings.activeEngine !== "ollama" && engineSettings.activeEngine !== "heuristic") {
    const customRes = await queryCustomApi({
      prompt,
      systemInstruction
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
          humanApprovalRequired
        },
        engineUsed: "custom",
        modelUsed: customRes.modelUsed,
        tokenUsage: customRes.tokenUsage
      };
    }
  }
  if ((engineSettings.activeEngine === "api" || engineSettings.activeEngine === "gemini") && (process.env.AI_API_KEY || process.env.LLM_API_KEY || process.env.GEMINI_API_KEY)) {
    const cloudResult = await callGeminiStructured({
      prompt,
      systemInstruction,
      preferredModel: engineSettings.apiModel || engineSettings.geminiModel,
      responseSchema: {
        type: import_genai4.Type.OBJECT,
        properties: {
          urgencyLevel: {
            type: import_genai4.Type.STRING,
            enum: ["Critical", "High", "Medium", "Low"]
          },
          priority: { type: import_genai4.Type.STRING, enum: ["P1", "P2", "P3", "P4"] },
          recommendedRdd: { type: import_genai4.Type.STRING },
          reasoning: { type: import_genai4.Type.STRING },
          businessImpact: { type: import_genai4.Type.STRING },
          risk: { type: import_genai4.Type.STRING, enum: ["Low", "Medium", "High"] },
          confidenceScore: { type: import_genai4.Type.INTEGER }
        },
        required: [
          "urgencyLevel",
          "priority",
          "recommendedRdd",
          "reasoning",
          "businessImpact",
          "risk",
          "confidenceScore"
        ]
      }
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
          reasoning: parsed.reasoning || "Assessed via AI engine based on spare inventory and SLA exposure.",
          businessImpact: parsed.businessImpact || input.businessImpact,
          risk: parsed.risk || "Medium",
          confidenceScore,
          humanApprovalRequired
        },
        engineUsed: "api",
        modelUsed: cloudResult.modelUsed,
        tokenUsage: cloudResult.tokenUsage
      };
    }
  }
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
        void 0,
        raw
      );
      return {
        output: {
          urgencyLevel: ["Critical", "High", "Medium", "Low"].includes(
            parsed.urgencyLevel
          ) ? parsed.urgencyLevel : "Medium",
          priority: ["P1", "P2", "P3", "P4"].includes(parsed.priority) ? parsed.priority : "P3",
          recommendedRdd: parsed.recommendedRdd || "Within 3 Days",
          reasoning: parsed.reasoning || "Generated by local Ollama model.",
          businessImpact: parsed.businessImpact || input.businessImpact,
          risk: ["Low", "Medium", "High"].includes(parsed.risk) ? parsed.risk : "Medium",
          confidenceScore,
          humanApprovalRequired
        },
        engineUsed: "ollama",
        tokenUsage
      };
    } catch (err) {
      console.warn("Ollama agent 3 error:", err);
    }
  }
  let urgency = "Medium";
  let priority = "P3";
  let rdd = "Standard Ground (5 Business Days)";
  let confidence = 92;
  let risk = "Low";
  let reasoning = "";
  const impactLower = (input.businessImpact + " " + input.failureType).toLowerCase();
  if (input.spareInventory === 0 || impactLower.includes("outage") || impactLower.includes("spine") || impactLower.includes("cluster") || impactLower.includes("45,000")) {
    urgency = "Critical";
    priority = "P1";
    rdd = "Next Flight Out (NFO - <24h Delivery)";
    confidence = 96;
    risk = "High";
    reasoning = `Zero spare buffer at ${input.dataCenter} coupled with active cluster performance degradation creates immediate SLA breach risk. Expedited NFO air logistics mandated.`;
  } else if (input.spareInventory <= 2 || impactLower.includes("edge") || input.carrierStatus.toLowerCase().includes("storm") || input.carrierStatus.toLowerCase().includes("delay")) {
    urgency = "High";
    priority = "P2";
    rdd = "Priority Air (<48h Delivery)";
    confidence = 82;
    risk = "Medium";
    reasoning = `Buffer stock is constrained (${input.spareInventory} units) with carrier transit volatility (${input.carrierStatus}). Confidence is 82% due to weather unpredictability; requires logistics manager review.`;
  } else {
    urgency = "Low";
    priority = "P4";
    rdd = "Consolidated Ground Logistics (+7 Days)";
    confidence = 94;
    risk = "Low";
    reasoning = `Ample local spare inventory (${input.spareInventory} units) and redundant hardware paths prevent user-facing disruption. Standard cost-optimized ground transit recommended.`;
  }
  const output = {
    urgencyLevel: urgency,
    priority,
    recommendedRdd: rdd,
    reasoning,
    businessImpact: input.businessImpact,
    risk,
    confidenceScore: confidence,
    humanApprovalRequired: confidence < threshold
  };
  return {
    output,
    engineUsed: "heuristic_engine",
    tokenUsage: computeTokenUsage(prompt, JSON.stringify(output))
  };
}

// server/agents/agent4SparePool.ts
var import_genai5 = require("@google/genai");
async function executeAgent4(input, customThreshold) {
  const threshold = customThreshold ?? engineSettings.approvalThresholds?.["agent-4"] ?? 95;
  const systemInstruction = `You are Agent 4 \u2014 Return Receipt & Spare-Pool Reintegration Agent.
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
  if (engineSettings.activeEngine === "custom" || engineSettings.activeEngine === "custom_api" || engineSettings.customApiUrl && engineSettings.activeEngine !== "ollama" && engineSettings.activeEngine !== "heuristic") {
    const customRes = await queryCustomApi({
      prompt,
      systemInstruction
    });
    if (customRes && customRes.parsed) {
      const parsed = customRes.parsed;
      const confidenceScore = Math.max(0, Math.min(100, Number(parsed.confidenceScore) || 96));
      const humanApprovalRequired = confidenceScore < threshold;
      return {
        output: {
          returnValidationStatus: parsed.returnValidationStatus || "Pass",
          serialValidation: parsed.serialValidation || (input.serialNumber.trim() === input.returnedSerial.trim() ? "Match" : "Mismatch"),
          repairValidation: parsed.repairValidation || "Verified",
          warrantyStatus: parsed.warrantyStatus || "In Warranty",
          sparePoolEligibility: parsed.sparePoolEligibility || "Eligible",
          recommendedAction: parsed.recommendedAction || "Scan into Central Spare Pool Depot Bin.",
          financialAction: parsed.financialAction || "Release CM Repair Purchase Order payment.",
          confidenceScore,
          humanApprovalRequired
        },
        engineUsed: "custom",
        modelUsed: customRes.modelUsed,
        tokenUsage: customRes.tokenUsage
      };
    }
  }
  if ((engineSettings.activeEngine === "api" || engineSettings.activeEngine === "gemini") && (process.env.AI_API_KEY || process.env.LLM_API_KEY || process.env.GEMINI_API_KEY)) {
    const cloudResult = await callGeminiStructured({
      prompt,
      systemInstruction,
      preferredModel: engineSettings.apiModel || engineSettings.geminiModel,
      responseSchema: {
        type: import_genai5.Type.OBJECT,
        properties: {
          returnValidationStatus: {
            type: import_genai5.Type.STRING,
            enum: ["Pass", "Fail", "Flagged"]
          },
          serialValidation: {
            type: import_genai5.Type.STRING,
            enum: ["Match", "Mismatch"]
          },
          repairValidation: {
            type: import_genai5.Type.STRING,
            enum: ["Verified", "Incomplete", "Failed"]
          },
          warrantyStatus: {
            type: import_genai5.Type.STRING,
            enum: ["In Warranty", "Expired", "Void"]
          },
          sparePoolEligibility: {
            type: import_genai5.Type.STRING,
            enum: ["Eligible", "Ineligible", "Quarantine"]
          },
          recommendedAction: { type: import_genai5.Type.STRING },
          financialAction: { type: import_genai5.Type.STRING },
          confidenceScore: { type: import_genai5.Type.INTEGER }
        },
        required: [
          "returnValidationStatus",
          "serialValidation",
          "repairValidation",
          "warrantyStatus",
          "sparePoolEligibility",
          "recommendedAction",
          "financialAction",
          "confidenceScore"
        ]
      }
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
          serialValidation: parsed.serialValidation || (input.serialNumber.trim() === input.returnedSerial.trim() ? "Match" : "Mismatch"),
          repairValidation: parsed.repairValidation || "Verified",
          warrantyStatus: parsed.warrantyStatus || "In Warranty",
          sparePoolEligibility: parsed.sparePoolEligibility || "Eligible",
          recommendedAction: parsed.recommendedAction || "Scan into Central Spare Pool Depot Bin.",
          financialAction: parsed.financialAction || "Release CM Repair Purchase Order payment.",
          confidenceScore,
          humanApprovalRequired
        },
        engineUsed: "api",
        modelUsed: cloudResult.modelUsed,
        tokenUsage: cloudResult.tokenUsage
      };
    }
  }
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
        void 0,
        raw
      );
      return {
        output: {
          returnValidationStatus: [
            "Pass",
            "Fail",
            "Flagged"
          ].includes(parsed.returnValidationStatus) ? parsed.returnValidationStatus : "Flagged",
          serialValidation: ["Match", "Mismatch"].includes(
            parsed.serialValidation
          ) ? parsed.serialValidation : "Match",
          repairValidation: [
            "Verified",
            "Incomplete",
            "Failed"
          ].includes(parsed.repairValidation) ? parsed.repairValidation : "Verified",
          warrantyStatus: ["In Warranty", "Expired", "Void"].includes(
            parsed.warrantyStatus
          ) ? parsed.warrantyStatus : "In Warranty",
          sparePoolEligibility: [
            "Eligible",
            "Ineligible",
            "Quarantine"
          ].includes(parsed.sparePoolEligibility) ? parsed.sparePoolEligibility : "Quarantine",
          recommendedAction: parsed.recommendedAction || "Hold in quarantine intake.",
          financialAction: parsed.financialAction || "Hold payment pending quality assurance inspection.",
          confidenceScore,
          humanApprovalRequired
        },
        engineUsed: "ollama",
        tokenUsage
      };
    } catch (err) {
      console.warn("Ollama agent 4 error:", err);
    }
  }
  const serialMatch = input.serialNumber.trim().toLowerCase() === input.returnedSerial.trim().toLowerCase();
  const manifestLower = (input.manifestDetails + " " + input.repairStatus + " " + input.warrantyStatus).toLowerCase();
  let returnStatus = "Pass";
  let serialVal = serialMatch ? "Match" : "Mismatch";
  let repairVal = "Verified";
  let warranty = "In Warranty";
  let sparePool = "Eligible";
  let recAction = "Barcode scan into Active Regional Spare Pool at Depot Zone A.";
  let finAction = "Approve CM invoice payment for scheduled repair billing cycle.";
  let confidence = 98;
  if (!serialMatch || manifestLower.includes("tamper") || manifestLower.includes("mismatch") || manifestLower.includes("legacy")) {
    returnStatus = "Fail";
    serialVal = "Mismatch";
    repairVal = "Failed";
    warranty = "Void";
    sparePool = "Ineligible";
    confidence = 98;
    recAction = "Quarantine asset immediately. Issue formal vendor discrepancy notice and initiate asset recovery audit.";
    finAction = "Reject vendor invoice. Issue non-compliance penalty chargeback.";
  } else if (manifestLower.includes("expired") || manifestLower.includes("partial") || manifestLower.includes("uncertified") || manifestLower.includes("substitute") || manifestLower.includes("hold")) {
    returnStatus = "Flagged";
    serialVal = "Match";
    repairVal = "Incomplete";
    warranty = "Expired";
    sparePool = "Quarantine";
    confidence = 88;
    recAction = "Hold unit in Physical Quarantine Zone Q-3. Route to Quality Engineering for electrical verification.";
    finAction = "Hold vendor payment in escrow pending Level-2 QA clearance.";
  } else {
    returnStatus = "Pass";
    serialVal = "Match";
    repairVal = "Verified";
    warranty = "In Warranty";
    sparePool = "Eligible";
    confidence = 97;
    recAction = "Certify asset as ready-to-deploy; assign to Tier-1 Spare Inventory pool in San Jose Hub.";
    finAction = "Release CM warranty repair credit and close RMA transaction.";
  }
  const output = {
    returnValidationStatus: returnStatus,
    serialValidation: serialVal,
    repairValidation: repairVal,
    warrantyStatus: warranty,
    sparePoolEligibility: sparePool,
    recommendedAction: recAction,
    financialAction: finAction,
    confidenceScore: confidence,
    humanApprovalRequired: confidence < threshold
  };
  return {
    output,
    engineUsed: "heuristic_engine",
    tokenUsage: computeTokenUsage(prompt, JSON.stringify(output))
  };
}

// server/agents/unaiBridge.ts
var UNAI_BACKEND_URL = process.env.UNAI_BACKEND_URL || "http://localhost:4100";
var UNAI_MODEL_NAME = "UNAI Shared Cognitive Runtime";
async function callUnaiSubset(capabilityIds) {
  const res = await fetch(`${UNAI_BACKEND_URL}/api/unai/run-subset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ capabilityIds })
  });
  return res.json();
}
function splitTokens(total, n) {
  const promptTokens = Math.round((total && total.tokensIn || 0) / n);
  const completionTokens = Math.round((total && total.tokensOut || 0) / n);
  return { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens };
}
function mapAgent1(step, input, threshold) {
  const confidenceScore = Math.max(0, Math.min(100, Math.round((step.confidence || 0) * 100)));
  const text = ((step.decision || "") + " " + input.failureDescription + " " + input.dchaLogs).toLowerCase();
  let disposition = "Repaired";
  let risk = "Low";
  let repairRecommendation = "Verify power train rail.";
  let dispatchRoute = "San Jose Tier-1 Contract Manufacturer Facility (Line B-2 Rework)";
  let identifiedFailureMode = "Micro-BGA Solder Joint Degradation / Voltage Regulator Wear";
  let estimatedCostUsd = 185, estimatedTatDays = 3;
  if (text.includes("crack") || text.includes("delamination") || text.includes("burned") || text.includes("catastrophic")) {
    disposition = "Replaced";
    risk = "High";
    repairRecommendation = "Decommission tray chassis; harvest salvageable optical transceivers and route baseboard to authorized recycler.";
    dispatchRoute = "Fremont Central Scrap & Silicon Reclamation Hub (Bay 4)";
    identifiedFailureMode = "Catastrophic Silicon Die Delamination & Substrate Shear Fracture";
    estimatedCostUsd = 1450;
    estimatedTatDays = 1;
  } else if (text.includes("intermittent") || text.includes("noise") || text.includes("anomalous") || text.includes("pcie")) {
    disposition = "Further Diagnosed";
    risk = "Medium";
    repairRecommendation = "Route tray to Level-3 Hardware Engineering Lab for PCIe bus signal integrity sweep at 64 GT/s.";
    dispatchRoute = "Mountain View L3 Advanced Diagnostic Lab (Signal Integrity Bench #2)";
    identifiedFailureMode = "Intermittent PCIe Gen5 Retimer Signaling & Jitter Eye Margin Collapse";
    estimatedCostUsd = 380;
    estimatedTatDays = 7;
  }
  return {
    recommendedDisposition: disposition,
    confidenceScore,
    reasoning: step.decision || "Evaluated via UNAI shared cognitive runtime.",
    repairRecommendation,
    risk,
    humanApprovalRequired: confidenceScore < threshold,
    suggestedRouting: dispatchRoute,
    dispatchRoute,
    identifiedFailureMode,
    estimatedCostUsd,
    estimatedTatDays
  };
}
function mapAgent2(step, input, threshold) {
  const dwellTime = input.hoursInStage, microSlo = input.microSlo;
  const rawVariance = dwellTime - microSlo, delay = Math.max(0, rawVariance);
  const ratio = dwellTime / (microSlo || 1);
  const confidenceScore = Math.max(0, Math.min(100, Math.round((step.confidence || 0) * 100)));
  let status = "Within SLO";
  let targetDetermination = "Within Target";
  let bottleneckStage = input.currentStage;
  let rootCause = "Standard processing pace within calibrated limits.";
  let action = "Monitor standard stage transit.";
  if (ratio > 1) {
    status = "Breached";
    targetDetermination = "Target Breached";
    bottleneckStage = `${input.currentStage} Intake Staging`;
    rootCause = input.eventHistory.toLowerCase().includes("carrier") || input.eventHistory.toLowerCase().includes("dock") ? "Carrier assignment delay and intake queue stalling without priority dispatch." : "Stage processing backlog exceeding station throughput capacity.";
    action = "Escalate to transportation manager and trigger priority carrier assignment.";
  } else if (ratio >= 0.8) {
    status = "At Risk";
    targetDetermination = "Approaching Target";
    bottleneckStage = `${input.currentStage} Queue Backlog`;
    rootCause = "High queue volume approaching Micro-SLO cut-off window.";
    action = "Notify logistics team to expedite bench staging.";
  }
  return {
    dwellStatus: status,
    dwellTime,
    microSlo,
    dwellVariance: rawVariance,
    delay,
    targetDetermination,
    rootCause,
    escalationRecommendation: action,
    recommendedAction: action,
    bottleneckStage,
    hoursInStage: dwellTime,
    sloBreach: ratio > 1,
    confidenceScore,
    humanApprovalRequired: confidenceScore < threshold
  };
}
function mapAgent3(step, input, threshold) {
  const confidenceScore = Math.max(0, Math.min(100, Math.round((step.confidence || 0) * 100)));
  const impactLower = (input.businessImpact + " " + input.failureType).toLowerCase();
  let urgency = "Low";
  let priority = "P4";
  let rdd = "Consolidated Ground Logistics (+7 Days)";
  let risk = "Low";
  if (input.spareInventory === 0 || impactLower.includes("outage") || impactLower.includes("spine") || impactLower.includes("cluster")) {
    urgency = "Critical";
    priority = "P1";
    rdd = "Next Flight Out (NFO - <24h Delivery)";
    risk = "High";
  } else if (input.spareInventory <= 2 || impactLower.includes("edge") || input.carrierStatus.toLowerCase().includes("storm") || input.carrierStatus.toLowerCase().includes("delay")) {
    urgency = "High";
    priority = "P2";
    rdd = "Priority Air (<48h Delivery)";
    risk = "Medium";
  }
  return {
    urgencyLevel: urgency,
    priority,
    recommendedRdd: rdd,
    reasoning: step.decision || `Spare inventory (${input.spareInventory} units) assessed against business impact via UNAI shared cognitive runtime.`,
    businessImpact: input.businessImpact,
    risk,
    confidenceScore,
    humanApprovalRequired: confidenceScore < threshold
  };
}
function mapAgent4(step, input, threshold) {
  const confidenceScore = Math.max(0, Math.min(100, Math.round((step.confidence || 0) * 100)));
  const manifestLower = input.manifestDetails.toLowerCase();
  let returnStatus = "Pass";
  let serialVal = "Match";
  let repairVal = "Verified";
  let warranty = "In Warranty";
  let sparePool = "Eligible";
  let recAction = "Certify asset as ready-to-deploy; assign to Tier-1 Spare Inventory pool in San Jose Hub.";
  let finAction = "Release CM warranty repair credit and close RMA transaction.";
  if (manifestLower.includes("tamper") || manifestLower.includes("mismatch") || manifestLower.includes("legacy")) {
    returnStatus = "Fail";
    serialVal = "Mismatch";
    repairVal = "Failed";
    warranty = "Void";
    sparePool = "Ineligible";
    recAction = "Quarantine asset immediately. Issue formal vendor discrepancy notice and initiate asset recovery audit.";
    finAction = "Reject vendor invoice. Issue non-compliance penalty chargeback.";
  } else if (manifestLower.includes("expired") || manifestLower.includes("partial") || manifestLower.includes("uncertified") || manifestLower.includes("substitute") || manifestLower.includes("hold")) {
    returnStatus = "Flagged";
    serialVal = "Match";
    repairVal = "Incomplete";
    warranty = "Expired";
    sparePool = "Quarantine";
    recAction = "Hold unit in Physical Quarantine Zone Q-3. Route to Quality Engineering for electrical verification.";
    finAction = "Hold vendor payment in escrow pending Level-2 QA clearance.";
  }
  return {
    returnValidationStatus: returnStatus,
    serialValidation: serialVal,
    repairValidation: repairVal,
    warrantyStatus: warranty,
    sparePoolEligibility: sparePool,
    recommendedAction: recAction,
    financialAction: finAction,
    confidenceScore,
    humanApprovalRequired: confidenceScore < threshold
  };
}
async function runFleetKickoffViaUnai(runBatchId, timestamp) {
  const a1Input = { trayId: `TRAY-2026-HBM-84${runBatchId}`, mpn: "TPU-v5p-ACCEL-TRAY-B2", failureCode: "ERR-HBM-MEM-PARITY-CORRUPT", failureDescription: "Uncorrectable HBM3 ECC multi-bit parity alert during tensor core matrix multiplication burst.", dchaLogs: "DCHA-DIAG: Channel 3 HBM stack thermal sensor reading 78C; parity registers bit 14 stuck high. Visual inspection: no PCB delamination; board reworkable." };
  const a2Input = { trayId: `TRAY-2026-PCIE-31${runBatchId}`, currentStage: "Burn-in Chamber B-4", hoursInStage: 22.5, microSlo: 12, location: "Contract Manufacturer Line 3 (Fremont Depot)", eventHistory: "2026-03-30T08:00:00Z Checkpoint In -> 2026-03-31T06:30:00Z Chamber Temp Stalled" };
  const a3Input = { trayId: `TRAY-2026-VRM-99${runBatchId}`, failureType: "Thermal Throttle & Voltage Droop", failureCode: "ERR-VRM-VREG-HIGH-TEMP", dataCenter: "DC-IOWA-02 (Council Bluffs)", spareInventory: 1, businessImpact: "Critical: Secondary spare buffer depleted below SLA reserve limit", carrierStatus: "Next Flight Out (NFO) available", cmQueueStatus: "Expedited slot active" };
  const a4Input = { trayId: `TRAY-2026-RET-40${runBatchId}`, rmaId: `RMA-2026-CAL-77${runBatchId}`, serialNumber: `SN-RMA-2026-RET-99${runBatchId}`, returnedSerial: `SN-RMA-2026-RET-99${runBatchId}`, repairStatus: "Completed", warrantyStatus: "In Warranty", manifestDetails: "Optical barcode verified; Tier-1 QA zero-fault sheet attached." };
  const t1 = engineSettings.approvalThresholds?.["agent-1"] || 85;
  const t2 = engineSettings.approvalThresholds?.["agent-2"] || 80;
  const t3 = engineSettings.approvalThresholds?.["agent-3"] || 90;
  const t4 = engineSettings.approvalThresholds?.["agent-4"] || 95;
  const start = Date.now();
  const out = await callUnaiSubset(["execute_agent1", "execute_agent2", "execute_agent3", "execute_agent4"]);
  const latencyMs = Date.now() - start;
  if (!out || out.ok === false || !out.steps || out.steps.length < 4) {
    console.warn("UNAI fleet kickoff bridge: run-subset failed or incomplete", out && out.error);
    return [];
  }
  const stepFor = (id) => out.steps.find((s) => s.capability === id);
  const s1 = stepFor("execute_agent1"), s2 = stepFor("execute_agent2"), s3 = stepFor("execute_agent3"), s4 = stepFor("execute_agent4");
  if (!s1 || !s2 || !s3 || !s4) {
    console.warn("UNAI fleet kickoff bridge: missing one or more agent steps");
    return [];
  }
  const tokenUsage = splitTokens(out.observability, 4);
  const o1 = mapAgent1(s1, a1Input, t1);
  const o2 = mapAgent2(s2, a2Input, t2);
  const o3 = mapAgent3(s3, a3Input, t3);
  const o4 = mapAgent4(s4, a4Input, t4);
  const rec = (id, agentId, agentName, trayId, input, output, threshold) => ({
    id,
    agentId,
    agentName,
    timestamp,
    trayId,
    engineUsed: "unai",
    modelName: UNAI_MODEL_NAME,
    latencyMs,
    tokenUsage,
    input,
    output,
    confidenceScore: output.confidenceScore,
    threshold,
    approvalStatus: output.humanApprovalRequired ? "pending_human_review" : "auto_approved"
  });
  return [
    rec(`REC-A1-${Date.now().toString().slice(-6)}`, "agent-1", "Failure-Based Disposition Agent", a1Input.trayId, a1Input, o1, t1),
    rec(`REC-A2-${Date.now().toString().slice(-6)}`, "agent-2", "Dwell Time Monitoring & Escalation Agent", a2Input.trayId, a2Input, o2, t2),
    rec(`REC-A3-${Date.now().toString().slice(-6)}`, "agent-3", "Urgency Flagging Agent", a3Input.trayId, a3Input, o3, t3),
    rec(`REC-A4-${Date.now().toString().slice(-6)}`, "agent-4", "Return Receipt & Spare-Pool Reintegration Agent", a4Input.trayId, a4Input, o4, t4)
  ];
}

// server/recordsStore.ts
var recordsStore = [];
function getAllRecords() {
  return [...recordsStore].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
function addRecord(record) {
  recordsStore.unshift(record);
}
function updateRecordReview(id, newStatus, reviewer, notes, overriddenOutput) {
  const record = recordsStore.find((r) => r.id === id);
  if (!record) return null;
  record.approvalStatus = newStatus;
  record.reviewedBy = reviewer || "RMA Operations Lead";
  record.reviewedAt = (/* @__PURE__ */ new Date()).toISOString();
  record.humanReviewNotes = notes;
  if (overriddenOutput) {
    record.overriddenOutput = overriddenOutput;
  }
  return record;
}
function resetRecords() {
  recordsStore = [];
}
function calculateAnalytics() {
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
  let totalTokensAgg = 0;
  let promptTokensAgg = 0;
  let completionTokensAgg = 0;
  const byAgentTokens = {
    "agent-1": { totalTokens: 0, promptTokens: 0, completionTokens: 0, executionCount: 0 },
    "agent-2": { totalTokens: 0, promptTokens: 0, completionTokens: 0, executionCount: 0 },
    "agent-3": { totalTokens: 0, promptTokens: 0, completionTokens: 0, executionCount: 0 },
    "agent-4": { totalTokens: 0, promptTokens: 0, completionTokens: 0, executionCount: 0 }
  };
  const recentHistoryTokens = [];
  for (const r of records) {
    totalConfidence += r.confidenceScore;
    if (r.approvalStatus === "auto_approved") {
      autoApprovedCount++;
    } else if (r.approvalStatus === "pending_human_review") {
      pendingReviewCount++;
    } else {
      humanReviewedCount++;
    }
    const promptTok = r.tokenUsage?.promptTokens ?? Math.max(120, Math.round(r.latencyMs * 0.25));
    const compTok = r.tokenUsage?.completionTokens ?? Math.max(60, Math.round(r.latencyMs * 0.12));
    const totTok = r.tokenUsage?.totalTokens ?? promptTok + compTok;
    totalTokensAgg += totTok;
    promptTokensAgg += promptTok;
    completionTokensAgg += compTok;
    if (byAgentTokens[r.agentId]) {
      const bucket = byAgentTokens[r.agentId];
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
      totalTokens: totTok
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
  const tokenAnalytics = {
    totalTokens: totalTokensAgg,
    promptTokens: promptTokensAgg,
    completionTokens: completionTokensAgg,
    estimatedCostUsd: Number(((promptTokensAgg * 0.15 + completionTokensAgg * 0.6) / 1e6).toFixed(4)),
    byAgent: byAgentTokens,
    recentHistory: recentHistoryTokens.slice(0, 15)
  };
  return {
    totalProcessed: total,
    autoApprovedCount,
    pendingReviewCount,
    humanReviewedCount,
    autoApprovalRate: total > 0 ? Math.round(autoApprovedCount / total * 100) : 0,
    avgConfidence: total > 0 ? Math.round(totalConfidence / total) : 0,
    tokenAnalytics,
    agent1Metrics: a1,
    agent2Metrics: a2,
    agent3Metrics: a3,
    agent4Metrics: a4
  };
}

// server.ts
import_dotenv2.default.config();
engineSettings.hasApiKey = !!(process.env.AI_API_KEY || process.env.LLM_API_KEY || process.env.CUSTOM_API_KEY || process.env.GEMINI_API_KEY);
engineSettings.hasGeminiKey = engineSettings.hasApiKey;
function resolveModelName(engineUsed, modelUsed) {
  if (modelUsed) return modelUsed;
  if (engineUsed === "api" || engineUsed === "gemini") {
    return engineSettings.apiModel || engineSettings.geminiModel || "Cloud Fast LLM";
  }
  if (engineUsed === "custom") {
    return engineSettings.customModel || "Custom LLM Endpoint";
  }
  if (engineUsed === "ollama") {
    return engineSettings.ollamaModel || "Ollama Local";
  }
  return "Rule Heuristic Engine";
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = process.env.RENDER || process.env.NODE_ENV === "production" && process.env.PORT ? Number(process.env.PORT) || 3e3 : 3e3;
  app.use(import_express.default.json());
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.get("/api/settings", (_req, res) => {
    res.json({
      activeEngine: engineSettings.activeEngine,
      apiModel: engineSettings.apiModel,
      customApiUrl: engineSettings.customApiUrl,
      customApiKey: engineSettings.customApiKey ? "******" : "",
      customModel: engineSettings.customModel,
      geminiModel: engineSettings.geminiModel,
      ollamaHost: engineSettings.ollamaHost,
      ollamaModel: engineSettings.ollamaModel,
      hasApiKey: engineSettings.hasApiKey,
      hasGeminiKey: engineSettings.hasApiKey,
      approvalThresholds: engineSettings.approvalThresholds
    });
  });
  app.post("/api/settings", (req, res) => {
    const {
      activeEngine,
      apiModel,
      customApiUrl,
      customApiKey,
      customModel,
      geminiModel,
      ollamaHost,
      ollamaModel,
      approvalThresholds
    } = req.body;
    if (activeEngine && ["api", "custom", "ollama", "heuristic", "gemini"].includes(activeEngine)) {
      engineSettings.activeEngine = activeEngine === "gemini" ? "api" : activeEngine;
    }
    if (apiModel) engineSettings.apiModel = apiModel;
    if (customApiUrl !== void 0) engineSettings.customApiUrl = customApiUrl;
    if (customApiKey !== void 0 && customApiKey !== "******") {
      engineSettings.customApiKey = customApiKey;
    }
    if (customModel) engineSettings.customModel = customModel;
    if (geminiModel) engineSettings.geminiModel = geminiModel;
    if (ollamaHost) engineSettings.ollamaHost = ollamaHost;
    if (ollamaModel) engineSettings.ollamaModel = ollamaModel;
    if (approvalThresholds && typeof approvalThresholds === "object") {
      engineSettings.approvalThresholds = {
        ...engineSettings.approvalThresholds,
        ...approvalThresholds
      };
    }
    res.json({ success: true, settings: engineSettings });
  });
  app.post("/api/settings/thresholds", (req, res) => {
    const { agentId, threshold, approvalThresholds } = req.body;
    if (approvalThresholds && typeof approvalThresholds === "object") {
      engineSettings.approvalThresholds = {
        ...engineSettings.approvalThresholds,
        ...approvalThresholds
      };
    } else if (agentId && typeof threshold === "number") {
      engineSettings.approvalThresholds = {
        ...engineSettings.approvalThresholds,
        [agentId]: Math.max(50, Math.min(99, Math.round(threshold)))
      };
    }
    res.json({ success: true, approvalThresholds: engineSettings.approvalThresholds });
  });
  app.post("/api/settings/test-connection", async (req, res) => {
    const { engine, host, customUrl, apiKey } = req.body;
    const testEngine = engine || engineSettings.activeEngine;
    if (testEngine === "ollama") {
      const targetHost = (host || engineSettings.ollamaHost || "http://localhost:11434").replace(/\/$/, "");
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4e3);
        const check = await fetch(`${targetHost}/api/tags`, { signal: controller.signal });
        clearTimeout(timeout);
        if (check.ok) {
          const data = await check.json();
          return res.json({
            success: true,
            message: `Connected successfully to Ollama at ${targetHost}! Found ${data.models?.length || 0} models.`,
            models: data.models?.map((m) => m.name) || []
          });
        } else {
          return res.json({
            success: false,
            message: `Ollama host responded with status ${check.status} (${check.statusText})`
          });
        }
      } catch (err) {
        return res.json({
          success: false,
          message: `Could not connect to Ollama at ${targetHost}: ${err.message || "Connection refused"}. Ensure Ollama is running locally (ollama serve).`
        });
      }
    } else if (testEngine === "custom") {
      const targetUrl = customUrl || engineSettings.customApiUrl;
      if (!targetUrl) {
        return res.json({
          success: false,
          message: "Custom API URL is not configured."
        });
      }
      try {
        const cleanUrl = targetUrl.replace(/\/$/, "");
        const pingUrl = cleanUrl.endsWith("/chat/completions") ? cleanUrl.replace("/chat/completions", "/models") : `${cleanUrl}/models`;
        const headers = {};
        const key = apiKey || engineSettings.customApiKey;
        if (key) headers["Authorization"] = `Bearer ${key}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4e3);
        const check = await fetch(pingUrl, { headers, signal: controller.signal });
        clearTimeout(timeout);
        if (check.ok) {
          return res.json({
            success: true,
            message: `Successfully connected to custom endpoint at ${cleanUrl}!`
          });
        }
        return res.json({
          success: true,
          message: `Custom endpoint at ${cleanUrl} reached (status: ${check.status}).`
        });
      } catch (err) {
        return res.json({
          success: false,
          message: `Could not reach custom endpoint: ${err.message || "Network error"}`
        });
      }
    } else {
      const hasKey = !!(process.env.AI_API_KEY || process.env.LLM_API_KEY || process.env.GEMINI_API_KEY);
      if (!hasKey) {
        return res.json({
          success: false,
          message: "AI API key is not configured in environment."
        });
      }
      return res.json({
        success: true,
        message: "AI API key is configured and active for server-side generation."
      });
    }
  });
  app.get("/api/analytics", (_req, res) => {
    res.json(calculateAnalytics());
  });
  app.get("/api/records", (req, res) => {
    let records = getAllRecords();
    const { agentId, status, search } = req.query;
    if (agentId) {
      records = records.filter((r) => r.agentId === agentId);
    }
    if (status) {
      records = records.filter((r) => r.approvalStatus === status);
    }
    if (search) {
      const q = search.toLowerCase();
      records = records.filter(
        (r) => r.trayId.toLowerCase().includes(q) || r.agentName.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || JSON.stringify(r.output).toLowerCase().includes(q)
      );
    }
    res.json(records);
  });
  app.post("/api/records/:id/review", (req, res) => {
    const { id } = req.params;
    const newStatus = req.body.newStatus || req.body.approvalStatus;
    const reviewer = req.body.reviewer || req.body.reviewedBy || "RMA Operations Lead";
    const notes = req.body.notes || req.body.humanReviewNotes || "";
    const overriddenOutput = req.body.overriddenOutput;
    if (!newStatus) {
      return res.status(400).json({ error: "newStatus is required" });
    }
    const updated = updateRecordReview(id, newStatus, reviewer, notes, overriddenOutput);
    if (!updated) {
      return res.status(404).json({ error: "Record not found" });
    }
    res.json({ success: true, record: updated, analytics: calculateAnalytics() });
  });
  app.post("/api/records/reset", (_req, res) => {
    resetRecords();
    res.json({ success: true, analytics: calculateAnalytics() });
  });
  app.post("/api/records", (req, res) => {
    const raw = req.body;
    if (!raw.agentId) {
      return res.status(400).json({ error: "agentId is required" });
    }
    const agentNum = raw.agentId.replace("agent-", "");
    const recordId = raw.id || `REC-A${agentNum}-${Date.now().toString().slice(-6)}`;
    const threshold = raw.threshold ?? (raw.agentId === "agent-1" ? 85 : raw.agentId === "agent-2" ? 80 : raw.agentId === "agent-3" ? 90 : 95);
    const confidenceScore = Number(raw.confidenceScore ?? 88);
    const approvalStatus = raw.approvalStatus || (confidenceScore >= threshold ? "auto_approved" : "pending_human_review");
    const record = {
      id: recordId,
      agentId: raw.agentId,
      agentName: raw.agentName || (raw.agentId === "agent-1" ? "Failure-Based Disposition Agent" : raw.agentId === "agent-2" ? "Dwell Time Monitoring & Escalation Agent" : raw.agentId === "agent-3" ? "Urgency Flagging Agent" : "Return Receipt & Spare-Pool Reintegration Agent"),
      timestamp: raw.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
      trayId: raw.trayId || `TRAY-2026-MANUAL-${Math.floor(1e3 + Math.random() * 9e3)}`,
      engineUsed: raw.engineUsed || "heuristic",
      modelName: raw.modelName || "Rule Engine / Manual Entry",
      latencyMs: raw.latencyMs || 450,
      tokenUsage: raw.tokenUsage || {
        promptTokens: 210,
        completionTokens: 95,
        totalTokens: 305
      },
      input: raw.input || {},
      output: raw.output || {},
      confidenceScore,
      threshold,
      approvalStatus
    };
    addRecord(record);
    res.json({ success: true, record, analytics: calculateAnalytics() });
  });
  app.post("/api/agent/1/run", async (req, res) => {
    const start = Date.now();
    try {
      const input = req.body;
      if (!input.trayId || !input.failureCode) {
        return res.status(400).json({ error: "trayId and failureCode are required" });
      }
      const threshold = input.threshold ?? (engineSettings.approvalThresholds?.["agent-1"] || 85);
      const { output, engineUsed, tokenUsage, modelUsed } = await executeAgent1(input, threshold);
      const latencyMs = Date.now() - start;
      const recordId = `REC-A1-${Date.now().toString().slice(-6)}`;
      const approvalStatus = output.humanApprovalRequired ? "pending_human_review" : "auto_approved";
      const record = {
        id: recordId,
        agentId: "agent-1",
        agentName: "Failure-Based Disposition Agent",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        trayId: input.trayId,
        engineUsed,
        modelName: resolveModelName(engineUsed, modelUsed),
        latencyMs,
        tokenUsage,
        input,
        output,
        confidenceScore: output.confidenceScore,
        threshold,
        approvalStatus
      };
      addRecord(record);
      res.json({
        success: true,
        record,
        output,
        analytics: calculateAnalytics()
      });
    } catch (err) {
      res.status(500).json({ error: err.message || "Failed to execute Agent 1" });
    }
  });
  app.post("/api/agent/2/run", async (req, res) => {
    const start = Date.now();
    try {
      const input = req.body;
      if (!input.trayId || !input.currentStage) {
        return res.status(400).json({ error: "trayId and currentStage are required" });
      }
      const threshold = input.threshold ?? (engineSettings.approvalThresholds?.["agent-2"] || 80);
      const { output, engineUsed, tokenUsage, modelUsed } = await executeAgent2(input, threshold);
      const latencyMs = Date.now() - start;
      const recordId = `REC-A2-${Date.now().toString().slice(-6)}`;
      const approvalStatus = output.humanApprovalRequired ? "pending_human_review" : "auto_approved";
      const record = {
        id: recordId,
        agentId: "agent-2",
        agentName: "Dwell Time Monitoring & Escalation Agent",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        trayId: input.trayId,
        engineUsed,
        modelName: resolveModelName(engineUsed, modelUsed),
        latencyMs,
        tokenUsage,
        input,
        output,
        confidenceScore: output.confidenceScore,
        threshold,
        approvalStatus
      };
      addRecord(record);
      res.json({
        success: true,
        record,
        output,
        analytics: calculateAnalytics()
      });
    } catch (err) {
      res.status(500).json({ error: err.message || "Failed to execute Agent 2" });
    }
  });
  app.post("/api/agent/3/run", async (req, res) => {
    const start = Date.now();
    try {
      const input = req.body;
      if (!input.trayId || !input.failureType) {
        return res.status(400).json({ error: "trayId and failureType are required" });
      }
      const threshold = input.threshold ?? (engineSettings.approvalThresholds?.["agent-3"] || 90);
      const { output, engineUsed, tokenUsage, modelUsed } = await executeAgent3(input, threshold);
      const latencyMs = Date.now() - start;
      const recordId = `REC-A3-${Date.now().toString().slice(-6)}`;
      const approvalStatus = output.humanApprovalRequired ? "pending_human_review" : "auto_approved";
      const record = {
        id: recordId,
        agentId: "agent-3",
        agentName: "Urgency Flagging Agent",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        trayId: input.trayId,
        engineUsed,
        modelName: resolveModelName(engineUsed, modelUsed),
        latencyMs,
        tokenUsage,
        input,
        output,
        confidenceScore: output.confidenceScore,
        threshold,
        approvalStatus
      };
      addRecord(record);
      res.json({
        success: true,
        record,
        output,
        analytics: calculateAnalytics()
      });
    } catch (err) {
      res.status(500).json({ error: err.message || "Failed to execute Agent 3" });
    }
  });
  app.post("/api/agent/4/run", async (req, res) => {
    const start = Date.now();
    try {
      const input = req.body;
      if (!input.trayId || !input.serialNumber) {
        return res.status(400).json({ error: "trayId and serialNumber are required" });
      }
      const threshold = input.threshold ?? (engineSettings.approvalThresholds?.["agent-4"] || 95);
      const { output, engineUsed, tokenUsage, modelUsed } = await executeAgent4(input, threshold);
      const latencyMs = Date.now() - start;
      const recordId = `REC-A4-${Date.now().toString().slice(-6)}`;
      const approvalStatus = output.humanApprovalRequired ? "pending_human_review" : "auto_approved";
      const record = {
        id: recordId,
        agentId: "agent-4",
        agentName: "Return Receipt & Spare-Pool Reintegration Agent",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        trayId: input.trayId,
        engineUsed,
        modelName: resolveModelName(engineUsed, modelUsed),
        latencyMs,
        tokenUsage,
        input,
        output,
        confidenceScore: output.confidenceScore,
        threshold,
        approvalStatus
      };
      addRecord(record);
      res.json({
        success: true,
        record,
        output,
        analytics: calculateAnalytics()
      });
    } catch (err) {
      res.status(500).json({ error: err.message || "Failed to execute Agent 4" });
    }
  });
  app.post("/api/fleet/kickoff", async (_req, res) => {
    try {
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      const runBatchId = Date.now().toString().slice(-4);
      if (process.env.UNAI_BACKEND_URL) {
        const unaiResults = await runFleetKickoffViaUnai(runBatchId, timestamp);
        if (unaiResults.length === 4) {
          unaiResults.forEach((r) => addRecord(r));
          return res.json({ success: true, count: unaiResults.length, records: unaiResults, analytics: calculateAnalytics(), via: "unai" });
        }
        console.warn("Fleet Kickoff: UNAI bridge unavailable/incomplete, falling back to per-agent execution");
      }
      const results = [];
      try {
        const a1Start = Date.now();
        const a1Input = {
          trayId: `TRAY-2026-HBM-84${runBatchId}`,
          mpn: "TPU-v5p-ACCEL-TRAY-B2",
          failureCode: "ERR-HBM-MEM-PARITY-CORRUPT",
          failureDescription: "Uncorrectable HBM3 ECC multi-bit parity alert during tensor core matrix multiplication burst.",
          dchaLogs: "DCHA-DIAG: Channel 3 HBM stack thermal sensor reading 78C; parity registers bit 14 stuck high. Visual inspection: no PCB delamination; board reworkable."
        };
        const a1Threshold = engineSettings.approvalThresholds?.["agent-1"] || 85;
        const a1Res = await executeAgent1(a1Input, a1Threshold);
        const a1Record = {
          id: `REC-A1-${Date.now().toString().slice(-6)}`,
          agentId: "agent-1",
          agentName: "Failure-Based Disposition Agent",
          timestamp,
          trayId: a1Input.trayId,
          engineUsed: a1Res.engineUsed,
          modelName: resolveModelName(a1Res.engineUsed, a1Res.modelUsed),
          latencyMs: Date.now() - a1Start,
          tokenUsage: a1Res.tokenUsage,
          input: a1Input,
          output: a1Res.output,
          confidenceScore: a1Res.output.confidenceScore,
          threshold: a1Threshold,
          approvalStatus: a1Res.output.humanApprovalRequired ? "pending_human_review" : "auto_approved"
        };
        addRecord(a1Record);
        results.push(a1Record);
      } catch (err) {
        console.warn("Fleet Kickoff Agent 1 error:", err);
      }
      try {
        const a2Start = Date.now();
        const a2Input = {
          trayId: `TRAY-2026-PCIE-31${runBatchId}`,
          currentStage: "Burn-in Chamber B-4",
          hoursInStage: 22.5,
          microSlo: 12,
          location: "Contract Manufacturer Line 3 (Fremont Depot)",
          eventHistory: "2026-03-30T08:00:00Z Checkpoint In -> 2026-03-31T06:30:00Z Chamber Temp Stalled"
        };
        const a2Threshold = engineSettings.approvalThresholds?.["agent-2"] || 80;
        const a2Res = await executeAgent2(a2Input, a2Threshold);
        const a2Record = {
          id: `REC-A2-${Date.now().toString().slice(-6)}`,
          agentId: "agent-2",
          agentName: "Dwell Time Monitoring & Escalation Agent",
          timestamp,
          trayId: a2Input.trayId,
          engineUsed: a2Res.engineUsed,
          modelName: resolveModelName(a2Res.engineUsed, a2Res.modelUsed),
          latencyMs: Date.now() - a2Start,
          tokenUsage: a2Res.tokenUsage,
          input: a2Input,
          output: a2Res.output,
          confidenceScore: a2Res.output.confidenceScore,
          threshold: a2Threshold,
          approvalStatus: a2Res.output.humanApprovalRequired ? "pending_human_review" : "auto_approved"
        };
        addRecord(a2Record);
        results.push(a2Record);
      } catch (err) {
        console.warn("Fleet Kickoff Agent 2 error:", err);
      }
      try {
        const a3Start = Date.now();
        const a3Input = {
          trayId: `TRAY-2026-VRM-99${runBatchId}`,
          failureType: "Thermal Throttle & Voltage Droop",
          failureCode: "ERR-VRM-VREG-HIGH-TEMP",
          dataCenter: "DC-IOWA-02 (Council Bluffs)",
          spareInventory: 1,
          businessImpact: "Critical: Secondary spare buffer depleted below SLA reserve limit",
          carrierStatus: "Next Flight Out (NFO) available",
          cmQueueStatus: "Expedited slot active"
        };
        const a3Threshold = engineSettings.approvalThresholds?.["agent-3"] || 90;
        const a3Res = await executeAgent3(a3Input, a3Threshold);
        const a3Record = {
          id: `REC-A3-${Date.now().toString().slice(-6)}`,
          agentId: "agent-3",
          agentName: "Urgency Flagging Agent",
          timestamp,
          trayId: a3Input.trayId,
          engineUsed: a3Res.engineUsed,
          modelName: resolveModelName(a3Res.engineUsed, a3Res.modelUsed),
          latencyMs: Date.now() - a3Start,
          tokenUsage: a3Res.tokenUsage,
          input: a3Input,
          output: a3Res.output,
          confidenceScore: a3Res.output.confidenceScore,
          threshold: a3Threshold,
          approvalStatus: a3Res.output.humanApprovalRequired ? "pending_human_review" : "auto_approved"
        };
        addRecord(a3Record);
        results.push(a3Record);
      } catch (err) {
        console.warn("Fleet Kickoff Agent 3 error:", err);
      }
      try {
        const a4Start = Date.now();
        const a4Input = {
          trayId: `TRAY-2026-RET-40${runBatchId}`,
          rmaId: `RMA-2026-CAL-77${runBatchId}`,
          serialNumber: `SN-RMA-2026-RET-99${runBatchId}`,
          returnedSerial: `SN-RMA-2026-RET-99${runBatchId}`,
          repairStatus: "Completed",
          warrantyStatus: "In Warranty",
          manifestDetails: "Optical barcode verified; Tier-1 QA zero-fault sheet attached."
        };
        const a4Threshold = engineSettings.approvalThresholds?.["agent-4"] || 95;
        const a4Res = await executeAgent4(a4Input, a4Threshold);
        const a4Record = {
          id: `REC-A4-${Date.now().toString().slice(-6)}`,
          agentId: "agent-4",
          agentName: "Return Receipt & Spare-Pool Reintegration Agent",
          timestamp,
          trayId: a4Input.trayId,
          engineUsed: a4Res.engineUsed,
          modelName: resolveModelName(a4Res.engineUsed, a4Res.modelUsed),
          latencyMs: Date.now() - a4Start,
          tokenUsage: a4Res.tokenUsage,
          input: a4Input,
          output: a4Res.output,
          confidenceScore: a4Res.output.confidenceScore,
          threshold: a4Threshold,
          approvalStatus: a4Res.output.humanApprovalRequired ? "pending_human_review" : "auto_approved"
        };
        addRecord(a4Record);
        results.push(a4Record);
      } catch (err) {
        console.warn("Fleet Kickoff Agent 4 error:", err);
      }
      res.json({
        success: true,
        count: results.length,
        records: results,
        analytics: calculateAnalytics()
      });
    } catch (err) {
      res.status(500).json({ error: err.message || "Failed to kickoff agent fleet" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`RMA Control Tower Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
