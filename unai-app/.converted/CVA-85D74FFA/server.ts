import "./unai_llm_capture.js"; // see unai_llm_capture.js
import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import {
  executeAgent1,
  executeAgent2,
  executeAgent3,
  executeAgent4,
  engineSettings,
} from "./server/agents";
import { runFleetKickoffViaUnai } from "./server/agents/unaiBridge";
import {
  addRecord,
  calculateAnalytics,
  getAllRecords,
  resetRecords,
  updateRecordReview,
} from "./server/recordsStore";
import {
  AgentExecutionRecord,
  Agent1Input,
  Agent2Input,
  Agent3Input,
  Agent4Input,
} from "./src/types";

dotenv.config();

// Ensure engineSettings has key status up to date
engineSettings.hasApiKey = !!(
  process.env.AI_API_KEY ||
  process.env.LLM_API_KEY ||
  process.env.CUSTOM_API_KEY ||
  process.env.GEMINI_API_KEY
);
engineSettings.hasGeminiKey = engineSettings.hasApiKey;

function resolveModelName(engineUsed: string, modelUsed?: string): string {
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
  const app = express();
  // Use port 3000 for local dev & container; dynamically adapt if running on Render / production
  const PORT = (process.env.RENDER || (process.env.NODE_ENV === "production" && process.env.PORT))
    ? (Number(process.env.PORT) || 3000)
    : 3000;

  app.use(express.json());

  // --- API ROUTES ---

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Settings & connectivity
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
      approvalThresholds: engineSettings.approvalThresholds,
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
      approvalThresholds,
    } = req.body;

    if (
      activeEngine &&
      ["api", "custom", "ollama", "heuristic", "gemini"].includes(activeEngine)
    ) {
      engineSettings.activeEngine =
        activeEngine === "gemini" ? "api" : activeEngine;
    }
    if (apiModel) engineSettings.apiModel = apiModel;
    if (customApiUrl !== undefined) engineSettings.customApiUrl = customApiUrl;
    if (customApiKey !== undefined && customApiKey !== "******") {
      engineSettings.customApiKey = customApiKey;
    }
    if (customModel) engineSettings.customModel = customModel;
    if (geminiModel) engineSettings.geminiModel = geminiModel;
    if (ollamaHost) engineSettings.ollamaHost = ollamaHost;
    if (ollamaModel) engineSettings.ollamaModel = ollamaModel;
    if (approvalThresholds && typeof approvalThresholds === "object") {
      engineSettings.approvalThresholds = {
        ...engineSettings.approvalThresholds,
        ...approvalThresholds,
      };
    }

    res.json({ success: true, settings: engineSettings });
  });

  // Dedicated threshold configuration route
  app.post("/api/settings/thresholds", (req, res) => {
    const { agentId, threshold, approvalThresholds } = req.body;
    if (approvalThresholds && typeof approvalThresholds === "object") {
      engineSettings.approvalThresholds = {
        ...engineSettings.approvalThresholds,
        ...approvalThresholds,
      };
    } else if (agentId && typeof threshold === "number") {
      engineSettings.approvalThresholds = {
        ...engineSettings.approvalThresholds,
        [agentId]: Math.max(50, Math.min(99, Math.round(threshold))),
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
        const timeout = setTimeout(() => controller.abort(), 4000);
        const check = await fetch(`${targetHost}/api/tags`, { signal: controller.signal });
        clearTimeout(timeout);
        if (check.ok) {
          const data = (await check.json()) as any;
          return res.json({
            success: true,
            message: `Connected successfully to Ollama at ${targetHost}! Found ${data.models?.length || 0} models.`,
            models: data.models?.map((m: any) => m.name) || [],
          });
        } else {
          return res.json({
            success: false,
            message: `Ollama host responded with status ${check.status} (${check.statusText})`,
          });
        }
      } catch (err: any) {
        return res.json({
          success: false,
          message: `Could not connect to Ollama at ${targetHost}: ${err.message || "Connection refused"}. Ensure Ollama is running locally (ollama serve).`,
        });
      }
    } else if (testEngine === "custom") {
      const targetUrl = customUrl || engineSettings.customApiUrl;
      if (!targetUrl) {
        return res.json({
          success: false,
          message: "Custom API URL is not configured.",
        });
      }
      try {
        const cleanUrl = targetUrl.replace(/\/$/, "");
        const pingUrl = cleanUrl.endsWith("/chat/completions") ? cleanUrl.replace("/chat/completions", "/models") : `${cleanUrl}/models`;
        const headers: Record<string, string> = {};
        const key = apiKey || engineSettings.customApiKey;
        if (key) headers["Authorization"] = `Bearer ${key}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const check = await fetch(pingUrl, { headers, signal: controller.signal });
        clearTimeout(timeout);

        if (check.ok) {
          return res.json({
            success: true,
            message: `Successfully connected to custom endpoint at ${cleanUrl}!`,
          });
        }
        return res.json({
          success: true,
          message: `Custom endpoint at ${cleanUrl} reached (status: ${check.status}).`,
        });
      } catch (err: any) {
        return res.json({
          success: false,
          message: `Could not reach custom endpoint: ${err.message || "Network error"}`,
        });
      }
    } else {
      // Test Cloud AI API
      const hasKey = !!(
        process.env.AI_API_KEY ||
        process.env.LLM_API_KEY ||
        process.env.GEMINI_API_KEY
      );
      if (!hasKey) {
        return res.json({
          success: false,
          message: "AI API key is not configured in environment.",
        });
      }
      return res.json({
        success: true,
        message: "AI API key is configured and active for server-side generation.",
      });
    }
  });

  // Control Tower Analytics
  app.get("/api/analytics", (_req, res) => {
    res.json(calculateAnalytics());
  });

  // Audit Ledger & Records
  app.get("/api/records", (req, res) => {
    let records = getAllRecords();
    const { agentId, status, search } = req.query as { agentId?: string; status?: string; search?: string };

    if (agentId) {
      records = records.filter((r) => r.agentId === agentId);
    }
    if (status) {
      records = records.filter((r) => r.approvalStatus === status);
    }
    if (search) {
      const q = search.toLowerCase();
      records = records.filter(
        (r) =>
          r.trayId.toLowerCase().includes(q) ||
          r.agentName.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          JSON.stringify(r.output).toLowerCase().includes(q)
      );
    }

    res.json(records);
  });

  // Review human action (Approve / Reject / Override)
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

  // Reset Records to initial realistic state
  app.post("/api/records/reset", (_req, res) => {
    resetRecords();
    res.json({ success: true, analytics: calculateAnalytics() });
  });

  // Direct Record Creation
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

    const record: AgentExecutionRecord = {
      id: recordId,
      agentId: raw.agentId,
      agentName: raw.agentName || (
        raw.agentId === "agent-1" ? "Failure-Based Disposition Agent" :
        raw.agentId === "agent-2" ? "Dwell Time Monitoring & Escalation Agent" :
        raw.agentId === "agent-3" ? "Urgency Flagging Agent" :
        "Return Receipt & Spare-Pool Reintegration Agent"
      ),
      timestamp: raw.timestamp || new Date().toISOString(),
      trayId: raw.trayId || `TRAY-2026-MANUAL-${Math.floor(1000 + Math.random() * 9000)}`,
      engineUsed: raw.engineUsed || "heuristic",
      modelName: raw.modelName || "Rule Engine / Manual Entry",
      latencyMs: raw.latencyMs || 450,
      tokenUsage: raw.tokenUsage || {
        promptTokens: 210,
        completionTokens: 95,
        totalTokens: 305,
      },
      input: raw.input || {},
      output: raw.output || {},
      confidenceScore,
      threshold,
      approvalStatus,
    };

    addRecord(record);
    res.json({ success: true, record, analytics: calculateAnalytics() });
  });

  // ---------------------------------------------
  // RUN AGENT 1: Failure-Based Disposition Agent
  // ---------------------------------------------
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

      const record: AgentExecutionRecord = {
        id: recordId,
        agentId: "agent-1",
        agentName: "Failure-Based Disposition Agent",
        timestamp: new Date().toISOString(),
        trayId: input.trayId,
        engineUsed: engineUsed as any,
        modelName: resolveModelName(engineUsed, modelUsed),
        latencyMs,
        tokenUsage,
        input,
        output,
        confidenceScore: output.confidenceScore,
        threshold,
        approvalStatus,
      };

      addRecord(record);

      res.json({
        success: true,
        record,
        output,
        analytics: calculateAnalytics(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to execute Agent 1" });
    }
  });

  // ---------------------------------------------
  // RUN AGENT 2: Dwell Time Monitoring & Escalation
  // ---------------------------------------------
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

      const record: AgentExecutionRecord = {
        id: recordId,
        agentId: "agent-2",
        agentName: "Dwell Time Monitoring & Escalation Agent",
        timestamp: new Date().toISOString(),
        trayId: input.trayId,
        engineUsed: engineUsed as any,
        modelName: resolveModelName(engineUsed, modelUsed),
        latencyMs,
        tokenUsage,
        input,
        output,
        confidenceScore: output.confidenceScore,
        threshold,
        approvalStatus,
      };

      addRecord(record);

      res.json({
        success: true,
        record,
        output,
        analytics: calculateAnalytics(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to execute Agent 2" });
    }
  });

  // ---------------------------------------------
  // RUN AGENT 3: Urgency Flagging Agent
  // ---------------------------------------------
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

      const record: AgentExecutionRecord = {
        id: recordId,
        agentId: "agent-3",
        agentName: "Urgency Flagging Agent",
        timestamp: new Date().toISOString(),
        trayId: input.trayId,
        engineUsed: engineUsed as any,
        modelName: resolveModelName(engineUsed, modelUsed),
        latencyMs,
        tokenUsage,
        input,
        output,
        confidenceScore: output.confidenceScore,
        threshold,
        approvalStatus,
      };

      addRecord(record);

      res.json({
        success: true,
        record,
        output,
        analytics: calculateAnalytics(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to execute Agent 3" });
    }
  });

  // ---------------------------------------------
  // RUN AGENT 4: Return Receipt & Spare-Pool Reintegration
  // ---------------------------------------------
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

      const record: AgentExecutionRecord = {
        id: recordId,
        agentId: "agent-4",
        agentName: "Return Receipt & Spare-Pool Reintegration Agent",
        timestamp: new Date().toISOString(),
        trayId: input.trayId,
        engineUsed: engineUsed as any,
        modelName: resolveModelName(engineUsed, modelUsed),
        latencyMs,
        tokenUsage,
        input,
        output,
        confidenceScore: output.confidenceScore,
        threshold,
        approvalStatus,
      };

      addRecord(record);

      res.json({
        success: true,
        record,
        output,
        analytics: calculateAnalytics(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to execute Agent 4" });
    }
  });

  // ---------------------------------------------
  // RUN ALL AGENTS: Fleet Kickoff Orchestration
  // ---------------------------------------------
  app.post("/api/fleet/kickoff", async (_req, res) => {
    try {
      const timestamp = new Date().toISOString();
      const runBatchId = Date.now().toString().slice(-4);

      // If UNAI's shared cognitive runtime is reachable, run all 4 agents as
      // ONE call through it instead of 4 separate per-agent LLM calls below --
      // same output shapes, one shared pass instead of four. Falls through to
      // the original per-agent path (unchanged) if UNAI isn't reachable.
      if (process.env.UNAI_BACKEND_URL) {
        const unaiResults = await runFleetKickoffViaUnai(runBatchId, timestamp);
        if (unaiResults.length === 4) {
          unaiResults.forEach(r => addRecord(r));
          return res.json({ success: true, count: unaiResults.length, records: unaiResults, analytics: calculateAnalytics(), via: "unai" });
        }
        console.warn("Fleet Kickoff: UNAI bridge unavailable/incomplete, falling back to per-agent execution");
      }

      const results: AgentExecutionRecord[] = [];

      // Agent 1 Run
      try {
        const a1Start = Date.now();
        const a1Input: Agent1Input = {
          trayId: `TRAY-2026-HBM-84${runBatchId}`,
          mpn: "TPU-v5p-ACCEL-TRAY-B2",
          failureCode: "ERR-HBM-MEM-PARITY-CORRUPT",
          failureDescription: "Uncorrectable HBM3 ECC multi-bit parity alert during tensor core matrix multiplication burst.",
          dchaLogs: "DCHA-DIAG: Channel 3 HBM stack thermal sensor reading 78C; parity registers bit 14 stuck high. Visual inspection: no PCB delamination; board reworkable.",
        };
        const a1Threshold = engineSettings.approvalThresholds?.["agent-1"] || 85;
        const a1Res = await executeAgent1(a1Input, a1Threshold);
        const a1Record: AgentExecutionRecord = {
          id: `REC-A1-${Date.now().toString().slice(-6)}`,
          agentId: "agent-1",
          agentName: "Failure-Based Disposition Agent",
          timestamp,
          trayId: a1Input.trayId,
          engineUsed: a1Res.engineUsed as any,
          modelName: resolveModelName(a1Res.engineUsed, a1Res.modelUsed),
          latencyMs: Date.now() - a1Start,
          tokenUsage: a1Res.tokenUsage,
          input: a1Input,
          output: a1Res.output,
          confidenceScore: a1Res.output.confidenceScore,
          threshold: a1Threshold,
          approvalStatus: a1Res.output.humanApprovalRequired ? "pending_human_review" : "auto_approved",
        };
        addRecord(a1Record);
        results.push(a1Record);
      } catch (err) {
        console.warn("Fleet Kickoff Agent 1 error:", err);
      }

      // Agent 2 Run
      try {
        const a2Start = Date.now();
        const a2Input: Agent2Input = {
          trayId: `TRAY-2026-PCIE-31${runBatchId}`,
          currentStage: "Burn-in Chamber B-4",
          hoursInStage: 22.5,
          microSlo: 12.0,
          location: "Contract Manufacturer Line 3 (Fremont Depot)",
          eventHistory: "2026-03-30T08:00:00Z Checkpoint In -> 2026-03-31T06:30:00Z Chamber Temp Stalled",
        };
        const a2Threshold = engineSettings.approvalThresholds?.["agent-2"] || 80;
        const a2Res = await executeAgent2(a2Input, a2Threshold);
        const a2Record: AgentExecutionRecord = {
          id: `REC-A2-${Date.now().toString().slice(-6)}`,
          agentId: "agent-2",
          agentName: "Dwell Time Monitoring & Escalation Agent",
          timestamp,
          trayId: a2Input.trayId,
          engineUsed: a2Res.engineUsed as any,
          modelName: resolveModelName(a2Res.engineUsed, a2Res.modelUsed),
          latencyMs: Date.now() - a2Start,
          tokenUsage: a2Res.tokenUsage,
          input: a2Input,
          output: a2Res.output,
          confidenceScore: a2Res.output.confidenceScore,
          threshold: a2Threshold,
          approvalStatus: a2Res.output.humanApprovalRequired ? "pending_human_review" : "auto_approved",
        };
        addRecord(a2Record);
        results.push(a2Record);
      } catch (err) {
        console.warn("Fleet Kickoff Agent 2 error:", err);
      }

      // Agent 3 Run
      try {
        const a3Start = Date.now();
        const a3Input: Agent3Input = {
          trayId: `TRAY-2026-VRM-99${runBatchId}`,
          failureType: "Thermal Throttle & Voltage Droop",
          failureCode: "ERR-VRM-VREG-HIGH-TEMP",
          dataCenter: "DC-IOWA-02 (Council Bluffs)",
          spareInventory: 1,
          businessImpact: "Critical: Secondary spare buffer depleted below SLA reserve limit",
          carrierStatus: "Next Flight Out (NFO) available",
          cmQueueStatus: "Expedited slot active",
        };
        const a3Threshold = engineSettings.approvalThresholds?.["agent-3"] || 90;
        const a3Res = await executeAgent3(a3Input, a3Threshold);
        const a3Record: AgentExecutionRecord = {
          id: `REC-A3-${Date.now().toString().slice(-6)}`,
          agentId: "agent-3",
          agentName: "Urgency Flagging Agent",
          timestamp,
          trayId: a3Input.trayId,
          engineUsed: a3Res.engineUsed as any,
          modelName: resolveModelName(a3Res.engineUsed, a3Res.modelUsed),
          latencyMs: Date.now() - a3Start,
          tokenUsage: a3Res.tokenUsage,
          input: a3Input,
          output: a3Res.output,
          confidenceScore: a3Res.output.confidenceScore,
          threshold: a3Threshold,
          approvalStatus: a3Res.output.humanApprovalRequired ? "pending_human_review" : "auto_approved",
        };
        addRecord(a3Record);
        results.push(a3Record);
      } catch (err) {
        console.warn("Fleet Kickoff Agent 3 error:", err);
      }

      // Agent 4 Run
      try {
        const a4Start = Date.now();
        const a4Input: Agent4Input = {
          trayId: `TRAY-2026-RET-40${runBatchId}`,
          rmaId: `RMA-2026-CAL-77${runBatchId}`,
          serialNumber: `SN-RMA-2026-RET-99${runBatchId}`,
          returnedSerial: `SN-RMA-2026-RET-99${runBatchId}`,
          repairStatus: "Completed",
          warrantyStatus: "In Warranty",
          manifestDetails: "Optical barcode verified; Tier-1 QA zero-fault sheet attached.",
        };
        const a4Threshold = engineSettings.approvalThresholds?.["agent-4"] || 95;
        const a4Res = await executeAgent4(a4Input, a4Threshold);
        const a4Record: AgentExecutionRecord = {
          id: `REC-A4-${Date.now().toString().slice(-6)}`,
          agentId: "agent-4",
          agentName: "Return Receipt & Spare-Pool Reintegration Agent",
          timestamp,
          trayId: a4Input.trayId,
          engineUsed: a4Res.engineUsed as any,
          modelName: resolveModelName(a4Res.engineUsed, a4Res.modelUsed),
          latencyMs: Date.now() - a4Start,
          tokenUsage: a4Res.tokenUsage,
          input: a4Input,
          output: a4Res.output,
          confidenceScore: a4Res.output.confidenceScore,
          threshold: a4Threshold,
          approvalStatus: a4Res.output.humanApprovalRequired ? "pending_human_review" : "auto_approved",
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
        analytics: calculateAnalytics(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to kickoff agent fleet" });
    }
  });

  // --- VITE MIDDLEWARE (SPA & ASSETS) ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`RMA Control Tower Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
