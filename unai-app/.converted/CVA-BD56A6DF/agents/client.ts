import OpenAI from "openai";

let nvidiaClientInstance: OpenAI | null = null;

export function getNvidiaClient(): OpenAI {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY environment variable is missing. Please configure it in your environment or .env file.");
  }
  if (!nvidiaClientInstance) {
    nvidiaClientInstance = new OpenAI({
      apiKey: apiKey,
      baseURL: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
    });
  }
  return nvidiaClientInstance;
}

export const NVIDIA_DEFAULT_MODEL = process.env.NVIDIA_MODEL || "meta/llama-3.3-70b-instruct";

/**
 * Helper to call NVIDIA NIM API and return structured JSON
 */
export async function generateStructuredJson<T>(
  prompt: string,
  systemInstruction: string,
  fallback?: T
): Promise<T> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    if (fallback) {
      console.log("[NVIDIA Client] API key is missing. Returning baseline dynamic data.");
      return fallback;
    }
    throw new Error("NVIDIA_API_KEY environment variable is missing. Please configure it in your environment or .env file.");
  }

  const openai = getNvidiaClient();
  const response = await openai.chat.completions.create({
    model: NVIDIA_DEFAULT_MODEL,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content returned from NVIDIA NIM API");
  }
  console.log("[NVIDIA Client] real token usage:", response.usage);

  const data = JSON.parse(content.trim()) as T;
  return data;
}
