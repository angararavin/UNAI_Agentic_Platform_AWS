// UNAI tools for OpenAI function calling — exposes the same UNAI agents as
// mcp-server.js does for MCP clients, but as OpenAI "tools" (Chat Completions
// / Assistants API JSON-Schema format). Wraps UNAI's /api/v1 REST API; the
// UNAI server does the work, this just speaks OpenAI's tool-calling format.
"use strict";
const BASE = (process.env.UNAI_BASE_URL || "http://localhost:3000").replace(/\/$/, "") + "/api/v1";
const KEY = process.env.UNAI_API_KEY || "";

async function api(method, path, body) {
  const res = await fetch(BASE + path, { method,
    headers: Object.assign({ "Content-Type": "application/json" }, KEY ? { Authorization: "Bearer " + KEY } : {}),
    body: body !== undefined ? JSON.stringify(body) : undefined });
  const t = await res.text(); let d; try { d = JSON.parse(t); } catch { d = { raw: t }; }
  if (!res.ok) throw new Error((d && d.error) || ("HTTP " + res.status));
  return d;
}

// OpenAI tool defs (pass as the `tools` param to chat.completions.create /
// Assistants). One-to-one with mcp-server.js's registerTool calls.
const TOOLS = [
  { type: "function", function: { name: "unai_list_agents",
    description: "List available UNAI agents / use-cases.",
    parameters: { type: "object", properties: {}, additionalProperties: false } } },

  { type: "function", function: { name: "unai_run_agent",
    description: "Run a UNAI agent by id; returns per-decision detail (root cause + recommended action), the agent's actual outputs, plus token economics and containment.",
    parameters: { type: "object", properties: {
      id: { type: "string", description: "Agent id, e.g. disruption_response or dc_hw_rma" } },
      required: ["id"], additionalProperties: false } } },

  { type: "function", function: { name: "unai_get_ontology",
    description: "Return UNAI's canonical business ontology.",
    parameters: { type: "object", properties: {}, additionalProperties: false } } },

  { type: "function", function: { name: "unai_containment_status",
    description: "Return UNAI Agent Safety & Containment status (kill switch, egress, policy).",
    parameters: { type: "object", properties: {}, additionalProperties: false } } },

  { type: "function", function: { name: "unai_configure_connection",
    description: "Point UNAI at a data-foundation connector (databricks / snowflake / bigquery / neo4j) or set the model gateway (llm).",
    parameters: { type: "object", properties: {
      type: { type: "string", enum: ["databricks", "snowflake", "bigquery", "neo4j", "llm"], description: "Connector type" },
      config: { type: "object", additionalProperties: { type: "string" }, description: "Fields, e.g. {host, token} or {project, dataset}, or {key} for llm" } },
      required: ["type"], additionalProperties: false } } },

  { type: "function", function: { name: "unai_kill_switch",
    description: "Turn the Agent Safety kill switch on/off. When ON, every agent action is forced to human approval (autonomy -> 0%).",
    parameters: { type: "object", properties: {
      on: { type: "boolean", description: "true = engage safe mode, false = normal autonomy" } },
      required: ["on"], additionalProperties: false } } },

  { type: "function", function: { name: "unai_list_runs",
    description: "List recent agent runs (runId, agent, time, decision count) so a specific past run can be looked up without re-running.",
    parameters: { type: "object", properties: {}, additionalProperties: false } } },

  { type: "function", function: { name: "unai_get_decision",
    description: "Return the full detail (root cause, reasoning steps, recommended action) + output for ONE decision matching a name/step. Pass runId to look up a PAST run without re-executing; otherwise pass id to run fresh.",
    parameters: { type: "object", properties: {
      query: { type: "string", description: "A word from the decision/step, e.g. 'failure disposition' or 'return'" },
      runId: { type: "string", description: "A runId from a previous run — looks it up instead of re-running" },
      id: { type: "string", description: "Agent id (required if runId not given), e.g. dc_hw_rma" } },
      required: ["query"], additionalProperties: false } } },
];

// Executes one OpenAI tool call (name + JSON-string args, as returned in
// message.tool_calls[i].function) against UNAI, returning a plain string —
// ready to hand straight back as a role:"tool" message's `content`.
async function callTool(name, argsJson) {
  let args = {}; try { args = argsJson ? JSON.parse(argsJson) : {}; } catch (_) {}
  try {
    switch (name) {
      case "unai_list_agents": return JSON.stringify(await api("GET", "/agents"));
      case "unai_get_ontology": return JSON.stringify(await api("GET", "/ontology"));
      case "unai_containment_status": return JSON.stringify(await api("GET", "/containment"));
      case "unai_list_runs": return JSON.stringify(await api("GET", "/runs"));
      case "unai_configure_connection":
        return JSON.stringify(await api("POST", "/connections", { type: args.type, config: args.config || {} }));
      case "unai_kill_switch":
        return JSON.stringify(await api("POST", "/containment/kill", { on: !!args.on }));
      case "unai_run_agent": {
        const r = await api("POST", "/agents/" + encodeURIComponent(args.id) + "/run", {});
        const ob = r.observability || {};
        const decisions = (r.evidence || []).map(e => ({
          decision: e.decision, autonomous: e.autonomous,
          confidencePct: Math.round((e.confidence || 0) * 100),
          rootCause: e.detailed && e.detailed.rootCause,
          recommendedAction: e.detailed && e.detailed.recommendedAction,
        }));
        return JSON.stringify({
          agent: r.agent, runId: r.runId,
          summary: { decisions: decisions.length, autonomyRatePct: ob.autonomyRatePct, tokensTotal: ob.tokensTotal, savedPct: ob.tokenModel && ob.tokenModel.savedPct },
          containment: r.containment, decisions, results: r.results,
        }).slice(0, 30000);
      }
      case "unai_get_decision": {
        let decisions, results, agent;
        if (args.runId) {
          const rr = await api("GET", "/runs/" + encodeURIComponent(args.runId));
          decisions = rr.decisions || []; results = rr.results || {}; agent = rr.agent;
        } else {
          if (!args.id) return JSON.stringify({ error: "Provide either a runId (to look up a past run) or an agent id (to run fresh)." });
          const r = await api("POST", "/agents/" + encodeURIComponent(args.id) + "/run", {});
          agent = r.agent; results = r.results || {};
          decisions = (r.evidence || []).map(e => ({ decision: e.decision, autonomous: e.autonomous, confidencePct: Math.round((e.confidence || 0) * 100), rootCause: e.detailed && e.detailed.rootCause, reasoningSteps: e.detailed && e.detailed.reasoningSteps, recommendedAction: e.detailed && e.detailed.recommendedAction }));
        }
        const q = (args.query || "").toLowerCase();
        const m = decisions.find(d => (d.decision || "").toLowerCase().includes(q));
        if (!m) return JSON.stringify({ note: "No decision matched '" + args.query + "'. Available decisions:", decisions: decisions.map(d => d.decision) });
        const rk = Object.keys(results).find(k => k.toLowerCase().includes(q) || (m.decision || "").toLowerCase().includes(k.toLowerCase()));
        return JSON.stringify(Object.assign({ agent }, m, { output: rk ? results[rk] : undefined })).slice(0, 20000);
      }
      default: return JSON.stringify({ error: "Unknown tool: " + name });
    }
  } catch (e) { return JSON.stringify({ error: e && e.message || String(e) }); }
}

module.exports = { TOOLS, callTool };
