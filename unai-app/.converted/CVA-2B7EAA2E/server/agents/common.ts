import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { AISettings, TokenUsage } from "../../src/types";

dotenv.config();

// Active in-memory settings derived from environment variables
const initialEngine = (() => {
  if (process.env.DEFAULT_AI_ENGINE && ["custom", "ollama", "heuristic"].includes(process.env.DEFAULT_AI_ENGINE)) {
    return process.env.DEFAULT_AI_ENGINE as any;
  }
  if (process.env.DEFAULT_AI_ENGINE === "api" || process.env.DEFAULT_AI_ENGINE === "gemini") {
    return "custom"; // User requested removal of cloudAI, redirect to custom
  }
  if (process.env.CUSTOM_API_URL || process.env.NVIDIA_API_KEY || process.env.NVIDIA_NIM_API_KEY) return "custom";
  if (process.env.OLLAMA_HOST && process.env.DEFAULT_AI_ENGINE === "ollama") return "ollama";
  return "custom";
})();

export const engineSettings: AISettings = {
  activeEngine: initialEngine,
  apiModel: process.env.AI_MODEL || process.env.LLM_MODEL || process.env.GEMINI_MODEL || "cloud-fast",
  customApiUrl: process.env.CUSTOM_API_URL || process.env.NVIDIA_BASE_URL || process.env.NVIDIA_NIM_URL || process.env.LLM_API_URL || "https://integrate.api.nvidia.com/v1",
  customApiKey: process.env.CUSTOM_API_KEY || process.env.NVIDIA_API_KEY || process.env.NVIDIA_NIM_API_KEY || process.env.LLM_API_KEY || "",
  customModel: process.env.CUSTOM_MODEL || process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct",
  geminiModel: process.env.GEMINI_MODEL || process.env.AI_MODEL || "cloud-fast",
  ollamaHost: process.env.OLLAMA_HOST || "http://localhost:11434",
  ollamaModel: process.env.OLLAMA_MODEL || "llama3",
  hasApiKey: !!(
    process.env.AI_API_KEY ||
    process.env.LLM_API_KEY ||
    process.env.CUSTOM_API_KEY ||
    process.env.NVIDIA_API_KEY ||
    process.env.NVIDIA_NIM_API_KEY ||
    process.env.GEMINI_API_KEY
  ),
  hasGeminiKey: !!(process.env.GEMINI_API_KEY || process.env.AI_API_KEY),
  approvalThresholds: {
    "agent-1": process.env.AGENT_1_THRESHOLD ? Number(process.env.AGENT_1_THRESHOLD) : 85,
    "agent-2": process.env.AGENT_2_THRESHOLD ? Number(process.env.AGENT_2_THRESHOLD) : 80,
    "agent-3": process.env.AGENT_3_THRESHOLD ? Number(process.env.AGENT_3_THRESHOLD) : 90,
    "agent-4": process.env.AGENT_4_THRESHOLD ? Number(process.env.AGENT_4_THRESHOLD) : 95,
  },
};

let genAIClient: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI | null {
  const key = process.env.AI_API_KEY || process.env.LLM_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "control-tower-agent",
        },
      },
    });
  }
  return genAIClient;
}

// Backwards-compatible alias
export const getGeminiClient = getAiClient;

// Helper to compute token usage from real API responses or character count estimations
export function computeTokenUsage(
  promptText: string,
  completionText: string,
  apiUsage?: any,
  ollamaRaw?: any
): TokenUsage {
  if (apiUsage && (apiUsage.totalTokenCount || apiUsage.promptTokenCount || apiUsage.total_tokens || apiUsage.prompt_tokens)) {
    const promptTokens = apiUsage.promptTokenCount || apiUsage.prompt_tokens || Math.max(90, Math.ceil(promptText.length / 4));
    const completionTokens = apiUsage.candidatesTokenCount || apiUsage.completion_tokens || Math.max(50, Math.ceil(completionText.length / 4));
    return {
      promptTokens,
      completionTokens,
      totalTokens: apiUsage.totalTokenCount || apiUsage.total_tokens || (promptTokens + completionTokens),
    };
  }
  if (ollamaRaw && (ollamaRaw.prompt_eval_count || ollamaRaw.eval_count)) {
    const promptTokens = ollamaRaw.prompt_eval_count || Math.max(90, Math.ceil(promptText.length / 4));
    const completionTokens = ollamaRaw.eval_count || Math.max(50, Math.ceil(completionText.length / 4));
    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };
  }
  // Realistic estimation for heuristic / local execution based on actual prompt & completion density
  const promptTokens = Math.max(120, Math.ceil(promptText.length / 3.8));
  const completionTokens = Math.max(75, Math.ceil(completionText.length / 3.8));
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

// Universal custom API caller (supports NVIDIA NIM, OpenAI-compatible, or generic JSON LLM endpoints)
export async function queryCustomApi<T>(options: {
  prompt: string;
  systemInstruction: string;
  url?: string;
  model?: string;
  apiKey?: string;
}): Promise<{ parsed: T; tokenUsage: TokenUsage; modelUsed: string } | null> {
  const targetUrl = options.url || engineSettings.customApiUrl || process.env.CUSTOM_API_URL || process.env.LLM_API_URL || "https://integrate.api.nvidia.com/v1";
  if (!targetUrl) return null;

  const cleanUrl = targetUrl.replace(/\/$/, "");
  const endpoint = cleanUrl.endsWith("/chat/completions")
    ? cleanUrl
    : `${cleanUrl}/chat/completions`;

  const model = options.model || engineSettings.customModel || process.env.CUSTOM_MODEL || "meta/llama-3.1-70b-instruct";
  const apiKey = options.apiKey || engineSettings.customApiKey || process.env.CUSTOM_API_KEY || process.env.LLM_API_KEY;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey.trim()}`;
    }

    // Try standard structured JSON request
    let response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `${options.systemInstruction}\n\nIMPORTANT: Return strictly valid JSON with no conversational prefix or markdown wrapper.`,
          },
          { role: "user", content: options.prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    // If 400 Bad Request occurs (common when NVIDIA NIM or vLLM models do not support response_format), retry without response_format
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
              content: `${options.systemInstruction}\n\nCRITICAL: Output ONLY a raw, valid JSON object matching the required schema. Do NOT include markdown code blocks, backticks, or any explanation text.`,
            },
            { role: "user", content: options.prompt },
          ],
          temperature: 0.1,
        }),
        signal: controller.signal,
      });
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(`[Custom/NIM API] Request failed with status ${response.status}: ${response.statusText}. Details: ${errText.slice(0, 300)}`);
      return null;
    }

    const data = (await response.json()) as any;
    const rawContent = data?.choices?.[0]?.message?.content || "{}";
    
    // Extract JSON object cleanly even if wrapped in markdown code blocks
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

    const parsed = JSON.parse(cleaned) as T;
    const tokenUsage = computeTokenUsage(options.prompt, rawContent, data?.usage);

    return { parsed, tokenUsage, modelUsed: model };
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn(`[Custom/NIM API Error] ${err?.message || err}`);
    return null;
  }
}

// Resilient Cloud AI structured content generator
export async function callCloudAiStructured<T>(options: {
  prompt: string;
  systemInstruction: string;
  responseSchema: any;
  preferredModel?: string;
}): Promise<{ parsed: T; tokenUsage: TokenUsage; modelUsed: string } | null> {
  const client = getAiClient();
  if (!client) {
    return null;
  }

  const candidateModels = [
    options.preferredModel || engineSettings.apiModel || engineSettings.geminiModel || "cloud-fast",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
  ];

  // Deduplicate candidate models
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
          responseSchema: options.responseSchema,
        },
      });

      const text = response.text || "{}";
      const parsed = JSON.parse(text) as T;
      const tokenUsage = computeTokenUsage(
        options.prompt,
        text,
        response.usageMetadata
      );
      return { parsed, tokenUsage, modelUsed: model };
    } catch (err: any) {
      const errMessage = String(err?.message || err);
      const isCapacityOrTransient =
        err?.status === 503 ||
        err?.code === 503 ||
        errMessage.includes("503") ||
        errMessage.includes("high demand") ||
        errMessage.includes("UNAVAILABLE") ||
        errMessage.includes("429") ||
        errMessage.includes("RESOURCE_EXHAUSTED");

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

// Backwards-compatible alias for existing agent imports
export const callGeminiStructured = callCloudAiStructured;

// Helper to call local Ollama instance
export async function queryOllama(
  prompt: string,
  systemInstruction: string,
  host: string,
  model: string
): Promise<{ parsed: any; raw: any }> {
  const cleanHost = host.replace(/\/$/, "");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    const res = await fetch(`${cleanHost}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        system: systemInstruction,
        format: "json",
        stream: false,
        options: {
          temperature: 0.1,
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Ollama HTTP Error: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as { response?: string; prompt_eval_count?: number; eval_count?: number };
    if (!data.response) {
      throw new Error("Ollama returned empty response payload");
    }
    return { parsed: JSON.parse(data.response), raw: data };
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}
