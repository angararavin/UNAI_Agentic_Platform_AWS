import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { productsDatabase as initialProducts } from "./src/data";

// Document generation is unrelated to the run/triage decision — still the
// original bespoke function.
import { generateRmaDoc } from "./agents/rmaTriage.ts";
// The 6 original agent-decision functions are left in ./agents/*.ts,
// untouched and unused. This app's decisions now run on the UNAI shared
// cognitive runtime instead — same UI, same API contract, different
// backend. See agents/unai/unaiAdapter.cjs.
import { runAgentViaUnai } from "./agents/unai/unaiAdapter.cjs";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // JSON parsing middleware with 10MB limit (safety margin)
  app.use(express.json({ limit: "10mb" }));

  // Simulated Database Store (Ready for SQL/NoSQL connection flow)
  let productsDatabase = initialProducts;

  // API routes go here FIRST
  app.use("/api/*", (req, res, next) => {
    console.log(`[Server] API request: ${req.method} ${req.originalUrl}`);
    next();
  });

  // API Route: Get all hardware products
  app.get("/api/products", (req, res) => {
    res.json(productsDatabase);
  });

  // API Route: Simulate B200 Supply Draw (Database State Update)
  app.post("/api/products/simulate-draw", (req, res) => {
    productsDatabase = productsDatabase.map(p => {
      if (p.name === "Blackwell B200 HGX") {
        return { ...p, safetyStock: 12, bufferStatus: "DEPLETED - EMERGENCY RUN" };
      }
      if (p.name === "H200 NVL PCIe") {
        return { ...p, safetyStock: 28, bufferStatus: "CRITICAL LOW" };
      }
      return p;
    });
    res.json(productsDatabase);
  });

  // API Route: Generate Detailed RMA Document (Markdown format)
  app.post("/api/agents/generate-rma-doc", async (req, res) => {
    try {
      const {
        productName,
        serialNumber,
        defectDescription,
        disposition,
        warrantyStatus,
        warrantyDetails,
        confidenceScore,
        solvabilityRecommendation,
        approvedBy,
        designatedEmail
      } = req.body;

      const docText = await generateRmaDoc({
        productName,
        serialNumber,
        defectDescription,
        disposition,
        warrantyStatus,
        warrantyDetails,
        confidenceScore,
        solvabilityRecommendation,
        approvedBy,
        designatedEmail
      });

      res.json({ documentText: docText });
    } catch (err: any) {
      console.error("[Server] Error generating RMA document:", err);
      res.status(500).json({ error: err.message || "Failed to generate RMA document" });
    }
  });

  // API Route: Healthcheck
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Provider key status — is a live LLM key set (so tokens + latency are measured)?
  app.get("/api/unai/key-status", (_req, res) => {
    const key = process.env.GATEWAY_API_KEY || process.env.MISTRAL_API_KEY || "";
    res.json({ set: !!key, provider: process.env.GATEWAY_PROVIDER || (process.env.MISTRAL_API_KEY ? "mistral" : ""),
      model: process.env.GATEWAY_MODEL || (key ? "mistral-small-latest" : ""), tail: key ? key.slice(-4) : "" });
  });

  // Set a live LLM key from the UI (memory only, never written to disk). Provider,
  // base URL and default model are auto-detected from the key's prefix.
  app.post("/api/unai/set-key", (req, res) => {
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
  app.post("/api/unai/clear-key", (_req, res) => {
    delete process.env.GATEWAY_API_KEY; delete process.env.GATEWAY_BASE_URL; delete process.env.GATEWAY_MODEL; delete process.env.GATEWAY_PROVIDER; delete process.env.MISTRAL_API_KEY;
    res.json({ ok: true });
  });

  // API Route: Unified Agent Execution Pipeline
  app.post("/api/agents/run", async (req, res) => {
    const { agentId, payload } = req.body;
    
    if (!agentId) {
      return res.status(400).json({ error: "agentId parameter is required" });
    }

    console.log(`[Orchestrator Tower] Received run signal for agent: ${agentId}`);
    console.log(`[Orchestrator Tower] Payload:`, JSON.stringify(payload));

    try {
      const KNOWN_AGENTS = ["rma-triage", "demand-sensing", "demand-forecast", "forecast-npi", "refurb-repair", "orchestrator"];
      if (!KNOWN_AGENTS.includes(agentId)) {
        return res.status(400).json({ error: `Unknown agentId: ${agentId}` });
      }
      console.log(`[Orchestrator Tower] Running ${agentId} on the UNAI shared runtime`);
      const result = await runAgentViaUnai(agentId, payload);

      console.log(`[Orchestrator Tower] Sending result for ${agentId}`);
      return res.json(result);
    } catch (error: any) {
      console.error(`[Orchestrator Tower] Error executing agent ${agentId}:`, error);
      return res.status(500).json({ 
        error: error.message || "An internal error occurred during agent execution",
        details: error.stack
      });
    }
  });

  // Setup Vite Dev Server / Static Production Server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[Server] Vite dev server middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("[Server] Production static server mounted, serving dist/.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] NVIDIA Multi-Agent Control Tower listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[Server] Critical startup error:", err);
  process.exit(1);
});
