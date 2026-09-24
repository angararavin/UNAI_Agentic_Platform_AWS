import "./unai_llm_capture.js"; // see unai_llm_capture.js
import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { INITIAL_SUPPLY_ITEMS } from "./server/data/inventory";
import { runOrderSurgeAnalysis } from "./server/workflow/graph";
import { getLLMClient } from "./server/workflow/llm-client";
import { processHumanDecision } from "./server/agents/hitl-agent";
import { SupplyItem, SurgeInput, AnalysisRunResult, LLMConfigStatus, HumanDecisionInput } from "./src/types";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory persistent database for supply items and analysis history
let supplyItems: SupplyItem[] = JSON.parse(JSON.stringify(INITIAL_SUPPLY_ITEMS));
let analysisHistory: AnalysisRunResult[] = [];

function determineInitialProvider(): 'ollama' | 'custom_api' | 'gemini' {
  const customKey = process.env.CUSTOM_AI_API_KEY;
  const hasCustomKey = Boolean(
    customKey &&
    customKey.trim() !== "" &&
    customKey !== "your-custom-api-key" &&
    customKey !== "dummy-key"
  );
  const hasGemini = Boolean(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"
  );

  if (process.env.LLM_PROVIDER === "ollama") {
    return "ollama";
  }
  if (process.env.LLM_PROVIDER === "custom_api" && hasCustomKey) {
    return "custom_api";
  }
  if (hasGemini) {
    return "gemini";
  }
  if (hasCustomKey) {
    return "custom_api";
  }
  return "gemini";
}

let sessionPreferredProvider: 'ollama' | 'custom_api' | 'gemini' = determineInitialProvider();

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// UNAI live-LLM key control (memory only, never written to disk) -- powers
// the "measured" (vs "estimated") side of unaiIfLlmNarrated in every node's
// token comparison (see agents/unai/liveNarration.cjs).
app.get("/api/unai/key-status", (_req: Request, res: Response) => {
  const key = process.env.GATEWAY_API_KEY || process.env.MISTRAL_API_KEY || "";
  res.json({ set: !!key, provider: process.env.GATEWAY_PROVIDER || (process.env.MISTRAL_API_KEY ? "mistral" : ""),
    model: process.env.GATEWAY_MODEL || (key ? "mistral-small-latest" : ""), tail: key ? key.slice(-4) : "" });
});
app.post("/api/unai/set-key", (req: Request, res: Response) => {
  const body = req.body || {};
  const key = String(body.key || "").trim();
  if (!key) return res.status(400).json({ ok: false, error: "provide a key" });
  const det = /^sk-or-/.test(key) ? { base: "https://openrouter.ai/api/v1", provider: "openrouter", model: "mistralai/mistral-small" }
    : /^gsk_/.test(key) ? { base: "https://api.groq.com/openai/v1", provider: "groq", model: "llama-3.1-8b-instant" }
    : /^AIza/.test(key) ? { base: "https://generativelanguage.googleapis.com/v1beta/openai", provider: "gemini", model: "gemini-1.5-flash" }
    : /^sk-/.test(key) ? { base: "https://api.openai.com/v1", provider: "openai", model: "gpt-4o-mini" }
    : { base: "https://api.mistral.ai/v1", provider: "mistral", model: "mistral-small-latest" };
  process.env.GATEWAY_API_KEY = key;
  process.env.GATEWAY_BASE_URL = String(body.base || det.base);
  process.env.GATEWAY_MODEL = String(body.model || det.model);
  process.env.GATEWAY_PROVIDER = det.provider;
  res.json({ ok: true, provider: det.provider, model: process.env.GATEWAY_MODEL, tail: key.slice(-4) });
});
app.post("/api/unai/clear-key", (_req: Request, res: Response) => {
  delete process.env.GATEWAY_API_KEY; delete process.env.GATEWAY_BASE_URL; delete process.env.GATEWAY_MODEL; delete process.env.GATEWAY_PROVIDER; delete process.env.MISTRAL_API_KEY;
  res.json({ ok: true });
});

// 1. Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    activeProvider: sessionPreferredProvider,
    itemsCount: supplyItems.length,
    historyCount: analysisHistory.length
  });
});

// 2. LLM Config & Connectivity Status
app.get("/api/config", (req: Request, res: Response) => {
  const customKey = process.env.CUSTOM_AI_API_KEY;
  const isCustomConfigured = Boolean(
    customKey &&
    customKey.trim() !== "" &&
    customKey !== "your-custom-api-key" &&
    customKey !== "dummy-key"
  );
  const configStatus: LLMConfigStatus = {
    activeProvider: sessionPreferredProvider,
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      model: process.env.OLLAMA_MODEL || "llama3.2",
      isConfigured: Boolean(process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL)
    },
    customApi: {
      baseUrl: process.env.CUSTOM_AI_API_BASE_URL || "https://api.openai.com/v1",
      model: process.env.CUSTOM_AI_MODEL || "gpt-4o-mini",
      isConfigured: isCustomConfigured
    },
    gemini: {
      model: "gemini-3.8-flash",
      isConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY")
    }
  };
  res.json(configStatus);
});

// 3. Test LLM connectivity
app.post("/api/config/test", async (req: Request, res: Response) => {
  const { provider, baseUrl, model, apiKey } = req.body;
  const targetProvider = provider || sessionPreferredProvider;

  const startTime = Date.now();
  try {
    if (targetProvider === "ollama") {
      const url = baseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434";
      const targetModel = model || process.env.OLLAMA_MODEL || "llama3.2";
      
      const pingUrl = `${url.replace(/\/$/, '')}/api/tags`;
      const response = await fetch(pingUrl, { signal: AbortSignal.timeout(4000) });
      if (!response.ok) {
        throw new Error(`Ollama responded with HTTP ${response.status}: ${response.statusText}`);
      }
      const data: any = await response.json();
      const models = data?.models?.map((m: any) => m.name) || [];
      const latencyMs = Date.now() - startTime;
      
      return res.json({
        success: true,
        provider: "ollama",
        url,
        latencyMs,
        message: `Successfully connected to Ollama instance at ${url}. Available models: ${models.join(', ') || 'none listed'}. Target model: ${targetModel}.`,
        details: { models, targetModel }
      });
    }

    if (targetProvider === "custom_api") {
      const url = baseUrl || process.env.CUSTOM_AI_API_BASE_URL || "https://api.openai.com/v1";
      const key = apiKey || process.env.CUSTOM_AI_API_KEY;
      const targetModel = model || process.env.CUSTOM_AI_MODEL || "gpt-4o-mini";

      const pingUrl = `${url.replace(/\/$/, '')}/models`;
      const response = await fetch(pingUrl, {
        headers: {
          "Authorization": `Bearer ${key}`
        },
        signal: AbortSignal.timeout(4500)
      });
      const latencyMs = Date.now() - startTime;
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Custom API returned HTTP ${response.status} (${response.statusText}). ${errText.slice(0, 120)}`);
      }

      return res.json({
        success: true,
        provider: "custom_api",
        url,
        latencyMs,
        message: `Custom API endpoint at ${url} verified successfully. Target model: ${targetModel}.`,
      });
    }

    // Default: Gemini
    const { getLLMClient } = await import("./server/workflow/llm-client");
    const client = getLLMClient("gemini");
    const latencyMs = Date.now() - startTime;
    return res.json({
      success: true,
      provider: "gemini",
      latencyMs,
      message: `Google Gemini API connected using model ${client.modelName}.`
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return res.json({
      success: false,
      provider: targetProvider,
      latencyMs,
      error: err.message || "Failed to reach endpoint",
      guidance: targetProvider === "ollama" 
        ? "Ensure Ollama is running (`ollama serve` and `ollama run llama3.2`). If running in a Docker container or remote server, ensure the OLLAMA_BASE_URL is reachable."
        : targetProvider === "custom_api"
        ? "Verify CUSTOM_AI_API_BASE_URL and CUSTOM_AI_API_KEY in .env. The endpoint must support OpenAI-compatible chat completions."
        : "Check GEMINI_API_KEY in the environment or secrets panel."
    });
  }
});

// 4. Update session preferred provider
app.post("/api/config/provider", (req: Request, res: Response) => {
  const { provider } = req.body;
  if (provider === "ollama" || provider === "custom_api" || provider === "gemini") {
    sessionPreferredProvider = provider;
    return res.json({ success: true, activeProvider: sessionPreferredProvider });
  }
  res.status(400).json({ error: "Invalid provider specified. Must be 'ollama', 'custom_api', or 'gemini'." });
});

// 5. Supply Items: List
app.get("/api/supply-chain/items", (req: Request, res: Response) => {
  res.json(supplyItems);
});

// 6. Supply Items: Single
app.get("/api/supply-chain/items/:sku", (req: Request, res: Response) => {
  const item = supplyItems.find(i => i.sku.toLowerCase() === req.params.sku.toLowerCase());
  if (!item) {
    return res.status(404).json({ error: `Item with SKU ${req.params.sku} not found` });
  }
  res.json(item);
});

// 7. Supply Items: Update or Add item
app.post("/api/supply-chain/items", (req: Request, res: Response) => {
  const newItem: SupplyItem = req.body;
  if (!newItem.sku || !newItem.name) {
    return res.status(400).json({ error: "SKU and Name are required" });
  }
  const idx = supplyItems.findIndex(i => i.sku.toLowerCase() === newItem.sku.toLowerCase());
  if (idx >= 0) {
    supplyItems[idx] = newItem;
  } else {
    supplyItems.unshift(newItem);
  }
  res.json({ success: true, item: newItem });
});

// 8. Analyze Order Surge with LangChain & LangGraph Multi-Agent System
app.post("/api/analyze-surge", async (req: Request, res: Response) => {
  try {
    const surgeInput: SurgeInput = req.body;
    if (!surgeInput.sku || !surgeInput.surgeQuantity || !surgeInput.targetFulfillmentDays) {
      return res.status(400).json({
        error: "Missing required surge parameters: sku, surgeQuantity, and targetFulfillmentDays are mandatory."
      });
    }

    const item = supplyItems.find(i => i.sku.toLowerCase() === surgeInput.sku.toLowerCase());
    if (!item) {
      return res.status(404).json({ error: `SKU '${surgeInput.sku}' not found in supply chain database.` });
    }

    // Execute the real LangGraph StateGraph workflow
    console.log(`[LangGraph] Launching 3-agent pipeline for SKU: ${item.sku}, Surge: ${surgeInput.surgeQuantity} units in ${surgeInput.targetFulfillmentDays}d... Provider: ${sessionPreferredProvider}`);
    
    const result = await runOrderSurgeAnalysis(item, surgeInput, sessionPreferredProvider);
    
    // Save into analysis history
    analysisHistory.unshift(result);
    if (analysisHistory.length > 50) {
      analysisHistory = analysisHistory.slice(0, 50);
    }

    console.log(`[LangGraph] Completed run ${result.id} in ${result.totalDurationMs}ms`);
    return res.json(result);
  } catch (error: any) {
    console.error("[LangGraph] Error running surge analysis:", error);
    return res.status(500).json({
      error: "Failed to execute multi-agent surge analysis workflow",
      details: error.message
    });
  }
});

// 9. Analysis History
app.get("/api/analysis-history", (req: Request, res: Response) => {
  res.json(analysisHistory);
});

// 10. Human-in-the-Loop Planner Decision & Execution Dispatch
app.post("/api/analysis/:id/human-decision", (req: Request, res: Response) => {
  const { id } = req.params;
  const decision: HumanDecisionInput = req.body;

  const targetRunIndex = analysisHistory.findIndex(r => r.id === id);
  if (targetRunIndex === -1) {
    return res.status(404).json({ error: `Analysis run with ID '${id}' not found.` });
  }

  const currentRun = analysisHistory[targetRunIndex];
  const { updatedRun, updatedItem } = processHumanDecision(currentRun, decision, supplyItems);

  // Update in history
  analysisHistory[targetRunIndex] = updatedRun;

  console.log(`[HITL] Processed human planner decision for run ${id}: status=${decision.status}, approvedActions=${decision.approvedActionIds.length}`);

  return res.json({
    success: true,
    run: updatedRun,
    item: updatedItem
  });
});

// ----------------------------------------------------
// SERVER LAUNCH & VITE MIDDLEWARE
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Supply Chain Multi-Agent Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
