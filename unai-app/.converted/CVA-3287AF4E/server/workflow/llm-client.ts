import { ChatOllama } from "@langchain/ollama";
import { ChatOpenAI } from "@langchain/openai";
import { GoogleGenAI } from "@google/genai";

// Helpers to check provider credentials
export function isCustomApiConfigured(): boolean {
  const key = process.env.CUSTOM_AI_API_KEY;
  return Boolean(
    key &&
    key.trim() !== "" &&
    key !== "your-custom-api-key" &&
    key !== "dummy-key"
  );
}

export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim() !== "" && key !== "MY_GEMINI_API_KEY");
}

export const PRIMARY_GEMINI_MODEL = "gemini-3.8-flash";

// Factory to get active LLM client based on environment or session settings
export function getLLMClient(preferredProvider?: string) {
  const hasCustomKey = isCustomApiConfigured();
  const hasGemini = isGeminiConfigured();

  // If no preferred provider is specified, select the best ready engine
  let provider = preferredProvider;
  if (!provider) {
    if (process.env.LLM_PROVIDER === "ollama") {
      provider = "ollama";
    } else if (process.env.LLM_PROVIDER === "custom_api" && hasCustomKey) {
      provider = "custom_api";
    } else if (hasGemini) {
      provider = "gemini";
    } else {
      provider = hasCustomKey ? "custom_api" : "gemini";
    }
  }

  // If custom_api was selected but lacks a valid API key, seamlessly route to Gemini if available
  if (provider === "custom_api" && !hasCustomKey && hasGemini) {
    const geminiKey = process.env.GEMINI_API_KEY;
    const geminiClient = new GoogleGenAI(geminiKey ? { apiKey: geminiKey } : {});
    return {
      provider: "gemini",
      modelName: PRIMARY_GEMINI_MODEL,
      client: geminiClient,
      type: "gemini" as const
    };
  }

  if (provider === "ollama") {
    const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const model = process.env.OLLAMA_MODEL || "llama3.2";
    const client = new ChatOllama({
      baseUrl,
      model,
      temperature: 0.1,
    });
    return { provider: "ollama", modelName: model, client, type: "langchain" as const };
  }

  if (provider === "custom_api") {
    const apiKey = process.env.CUSTOM_AI_API_KEY || "dummy-key";
    const baseURL = process.env.CUSTOM_AI_API_BASE_URL || "https://api.openai.com/v1";
    const modelName = process.env.CUSTOM_AI_MODEL || "gpt-4o-mini";
    const client = new ChatOpenAI({
      apiKey,
      configuration: { baseURL },
      modelName,
      temperature: 0.1,
    });
    return { provider: "custom_api", modelName, client, type: "langchain" as const };
  }

  // Gemini via @google/genai
  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiClient = new GoogleGenAI(geminiKey ? { apiKey: geminiKey } : {});
  return { provider: "gemini", modelName: PRIMARY_GEMINI_MODEL, client: geminiClient, type: "gemini" as const };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("LLM_TIMEOUT")), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// Helper to invoke LLM with structured JSON output and automatic failover
export async function callLLM(
  llmConfig: ReturnType<typeof getLLMClient>,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  if (llmConfig.type === "langchain") {
    try {
      const response = await withTimeout(
        (llmConfig.client as any).invoke([
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ]),
        3500
      );
      const content = (response as any)?.content;
      return typeof content === "string" ? content : JSON.stringify(content || "");
    } catch {
      if (isGeminiConfigured()) {
        return invokeGeminiFast(systemPrompt, userPrompt);
      }
      throw new Error("LLM_FALLBACK_TRIGGERED");
    }
  } else {
    // Gemini
    return invokeGeminiFast(systemPrompt, userPrompt);
  }
}

async function invokeGeminiFast(systemPrompt: string, userPrompt: string): Promise<string> {
  const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  try {
    const response = await withTimeout(
      gemini.models.generateContent({
        model: PRIMARY_GEMINI_MODEL,
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }] }
        ],
        config: {
          responseMimeType: "application/json"
        }
      }),
      3500
    );
    if (response && response.text) {
      return response.text;
    }
    throw new Error("EMPTY_RESPONSE");
  } catch {
    throw new Error("LLM_FALLBACK_TRIGGERED");
  }
}

export function cleanJson(raw: string): any {
  try {
    let sanitized = raw.trim();
    const codeBlockMatch = sanitized.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      sanitized = codeBlockMatch[1].trim();
    } else {
      const firstBrace = sanitized.indexOf('{');
      const lastBrace = sanitized.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        sanitized = sanitized.substring(firstBrace, lastBrace + 1);
      }
    }
    return JSON.parse(sanitized);
  } catch {
    throw new Error("INVALID_JSON");
  }
}
