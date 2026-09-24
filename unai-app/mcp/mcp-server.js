#!/usr/bin/env node
// UNAI MCP server — exposes UNAI agents as MCP tools so an MCP client
// (Claude Desktop, Claude Code, etc.) can call UNAI. Wraps the /api/v1 REST API.
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");
const BASE = (process.env.UNAI_BASE_URL || "http://localhost:3000").replace(/\/$/, "") + "/api/v1";
const KEY = process.env.UNAI_API_KEY || "";
async function api(method, path, body) {
  const res = await fetch(BASE + path, { method,
    headers: Object.assign({ "Content-Type": "application/json" }, KEY ? { Authorization: "Bearer " + KEY } : {}),
    body: body !== undefined ? JSON.stringify(body) : undefined });
  const t = await res.text(); let d; try { d = JSON.parse(t); } catch { d = { raw: t }; }
  if (!res.ok) throw new Error((d && d.error) || ("HTTP " + res.status)); return d;
}
const ok = o => ({ content: [{ type: "text", text: JSON.stringify(o, null, 2).slice(0, 8000) }] });
const er = e => ({ content: [{ type: "text", text: "Error: " + (e && e.message || e) }], isError: true });
// Instructions the MCP client (Claude Desktop) surfaces to the model so a plain
// greeting turns into a pick-and-run menu.
const INSTRUCTIONS = [
  "UNAI exposes supply-chain agents as tools.",
  "When the user greets with 'Hi UNAI', 'Hey UNAI', 'UNAI', 'UNAI menu', or asks what UNAI can do,",
  "call the unai_menu tool and present the returned grouped, numbered menu verbatim, then ask them to",
  "reply with a number or the agent name. When they pick, call unai_run_agent with that agent's id and",
  "summarize the key decisions and recommended actions in plain language. Offer to explain any option",
  "before running it. Keep it concise.",
  "When summarising or explaining any run for leadership, address a generic C-level executive audience; never reference any individual by name."
].join(" ");

// Business-domain grouping for the menu. Any agent not listed here falls under 'More',
// so newly added agents still appear.
const MENU_GROUPS = [
  ["Demand & Forecasting", ["demand_planning", "monster_statistical_forecast", "monster_cannibalization"]],
  ["Inventory, Supply & Production", ["inventory_optimization", "supply_planning", "production_planning"]],
  ["Response & Disruption", ["disruption_response"]],
  ["Procurement & Logistics", ["procurement_sourcing", "logistics_transportation"]],
  ["Returns, Spares & RMA", ["spares_rma_closed_loop", "dc_hw_rma"]],
  ["Equipment, Knowledge & Change", ["telemetry_signal_integrity", "agentic_rag", "ocm_change_management", "sap_sdlc_generation"]],
  ["Food & Agribusiness", ["agri_fresh_supply"]],
];

const server = new McpServer({ name: "unai", version: "1.0.0" }, { instructions: INSTRUCTIONS });

server.registerTool("unai_menu", { title: "UNAI menu", description: "Return a grouped, numbered menu of runnable UNAI agents for the user to pick from. Call this when the user says 'Hi UNAI' or asks what UNAI can do; then run the one they choose with unai_run_agent.", inputSchema: {} },
  async () => { try {
    const d = await api("GET", "/agents");
    const agents = d.agents || d || [];
    const byId = {}; agents.forEach(a => { byId[a.id] = a; });
    const lines = ["UNAI — pick an agent to run (reply with a number, or the name):", ""];
    const map = {}; let n = 0;
    for (const [grp, ids] of MENU_GROUPS) {
      const present = ids.filter(id => byId[id]);
      if (!present.length) continue;
      lines.push(grp);
      for (const id of present) { n++; map[n] = id; lines.push(`  ${n}. ${byId[id].name || id}   ·   ${id}`); }
      lines.push("");
    }
    const mapped = new Set(MENU_GROUPS.flatMap(g => g[1]));
    const extra = agents.filter(a => !mapped.has(a.id));
    if (extra.length) { lines.push("More"); for (const a of extra) { n++; map[n] = a.id; lines.push(`  ${n}. ${a.name || a.id}   ·   ${a.id}`); } lines.push(""); }
    lines.push("Reply with a number to run it — or ask me to explain any option first.");
    return { content: [{ type: "text", text: lines.join("\n") }], structuredContent: { pick: map } };
  } catch (e) { return er(e); } });

server.registerTool("unai_list_agents", { title: "List UNAI agents", description: "List available UNAI agents / use-cases.", inputSchema: {} },
  async () => { try { return ok(await api("GET", "/agents")); } catch (e) { return er(e); } });
server.registerTool("unai_knowledge_ask", { title: "Ask the SharePoint knowledge assistant", description: "Ask a question of (or request a document from) the UNAI SharePoint knowledge assistant. Permission-trimmed to the user's groups; answers are grounded and source-cited.", inputSchema: { query: z.string().describe("The question, or a document request e.g. 'show me the RASCI matrix'"), groups: z.array(z.string()).optional().describe("The user's access groups (default ['all'])") } },
  async ({ query, groups }) => { try { return ok(await api("POST", "/knowledge/ask", { query, groups: groups || ["all"] })); } catch (e) { return er(e); } });
server.registerTool("unai_run_agent", { title: "Run a UNAI agent", description: "Run a UNAI agent by id; returns per-decision detail (root cause + recommended action), the agent's actual outputs, plus token economics and containment.", inputSchema: { id: z.string().describe("Agent id, e.g. disruption_response or dc_hw_rma") } },
  async ({ id }) => { try {
    const r = await api("POST", "/agents/" + encodeURIComponent(id) + "/run", {});
    const ob = r.observability || {};
    const decisions = (r.evidence || []).map(e => ({
      decision: e.decision,
      autonomous: e.autonomous,
      confidencePct: Math.round((e.confidence || 0) * 100),
      rootCause: e.detailed && e.detailed.rootCause,
      recommendedAction: e.detailed && e.detailed.recommendedAction,
    }));
    const auto = decisions.filter(d => d.autonomous), gated = decisions.filter(d => !d.autonomous);
    const measured = ob.measured;
    const tokLine = measured ? `${measured.tokensTotal} tokens (measured, ${measured.model || "live"})` : `tokens ${ob.tokensSource || "not measured"}`;
    const payload = {
      // Present-first: lead with the headline, then anything needing a human, then detail.
      headline: `${r.agent} — ${decisions.length} decisions: ${auto.length} executed autonomously, ${gated.length} routed to a human. ${tokLine}.`,
      needsApproval: gated.map(d => ({ decision: d.decision, confidencePct: d.confidencePct, why: d.recommendedAction || d.rootCause })),
      businessCase: r.businessCase || (r.useCase && r.useCase.business) || null, // why this agent is run (trigger/objective/decision/value)
      agent: r.agent,
      runId: r.runId,   // reuse with unai_get_decision to look up this exact run later
      tokens: measured || { source: ob.tokensSource || "not measured (no live model key)" },
      containment: r.containment,
      decisions,        // per-decision reasoning + recommendation
      results: r.results, // the agent's business outputs (records, dispositions, plans)
      presentHint: "Lead with `headline`; if `needsApproval` is non-empty, surface those FIRST as items awaiting a human and why. Use `businessCase` for the 'why we ran it'. Only quote token numbers from `tokens` when source is 'measured' — never present modeled numbers as measured.",
    };
    return { content: [{ type: "text", text: JSON.stringify(payload, null, 2).slice(0, 30000) }] };
  } catch (e) { return er(e); } });
server.registerTool("unai_get_ontology", { title: "UNAI canonical ontology", description: "Return UNAI's canonical business ontology.", inputSchema: {} },
  async () => { try { return ok(await api("GET", "/ontology")); } catch (e) { return er(e); } });
server.registerTool("unai_containment_status", { title: "UNAI safety status", description: "Return UNAI Agent Safety & Containment status (kill switch, egress, policy).", inputSchema: {} },
  async () => { try { return ok(await api("GET", "/containment")); } catch (e) { return er(e); } });
server.registerTool("unai_status", { title: "UNAI status (health / measured / containment)", description: "One call: is UNAI reachable + authorized, is a live model key set (so runs are MEASURED vs MODELED-only), containment state (safe mode / kill switch), agent count and license. Use this to diagnose 'unauthorized'/connection drops or to confirm a run will produce measured numbers.", inputSchema: {} },
  async () => { try {
    const health = await api("GET", "/health").catch(e => ({ _err: e && e.message }));
    const cont = await api("GET", "/containment").catch(() => ({}));
    const conns = await api("GET", "/connections").catch(() => ({ connections: [] }));
    const llm = (conns.connections || []).find(c => c.type === "llm");
    const modelLive = !!(llm && llm.configured);
    return ok({
      connection: health._err ? ("NOT OK — " + health._err + " (restart the UNAI server with matching UNAI_API_KEYS, then reopen Desktop)") : "ok — reachable and authorized",
      model: modelLive ? "live model key set → agent runs are MEASURED" : "no live model key → runs are MODELED-only (set the org key on the Governance tab or via .env)",
      agents: health.agents, version: health.version, license: health.license,
      containment: { safeMode: cont.safeMode, actionPolicy: cont.actionPolicy, egressLocked: cont.egressLocked },
    });
  } catch (e) { return er(e); } });
server.registerTool("unai_configure_connection", { title: "Configure a UNAI data connection", description: "Point UNAI at a data-foundation connector (databricks / snowflake / bigquery / neo4j) or set the model gateway (llm).", inputSchema: { type: z.enum(["databricks", "snowflake", "bigquery", "neo4j", "llm"]).describe("Connector type"), config: z.record(z.string()).optional().describe("Fields, e.g. {host, token} or {project, dataset}, or {key} for llm") } },
  async ({ type, config }) => { try { return ok(await api("POST", "/connections", { type, config: config || {} })); } catch (e) { return er(e); } });
server.registerTool("unai_kill_switch", { title: "UNAI kill switch (safe mode)", description: "Turn the Agent Safety kill switch on/off. When ON, every agent action is forced to human approval (autonomy -> 0%).", inputSchema: { on: z.boolean().describe("true = engage safe mode, false = normal autonomy") } },
  async ({ on }) => { try { return ok(await api("POST", "/containment/kill", { on: !!on })); } catch (e) { return er(e); } });
server.registerTool("unai_list_runs", { title: "List recent UNAI runs", description: "List recent agent runs (runId, agent, time, decision count) so a specific past run can be looked up without re-running.", inputSchema: {} },
  async () => { try { return ok(await api("GET", "/runs")); } catch (e) { return er(e); } });
server.registerTool("unai_get_decision", { title: "Get one UNAI decision in detail", description: "Return the full detail (root cause, reasoning steps, recommended action) + output for ONE decision matching a name/step. Pass runId to look up a PAST run without re-executing; otherwise pass id to run fresh.", inputSchema: { query: z.string().describe("A word from the decision/step, e.g. 'failure disposition' or 'return'"), runId: z.string().optional().describe("A runId from a previous run — looks it up instead of re-running"), id: z.string().optional().describe("Agent id (required if runId not given), e.g. dc_hw_rma"), audience: z.enum(["exec", "analyst"]).optional().describe("'exec' = plain language, no reasoning-step detail; 'analyst' (default) = full detail incl. reasoning steps.") } },
  async ({ query, runId, id, audience }) => { try {
    let decisions, results, agent;
    if (runId) {
      const rr = await api("GET", "/runs/" + encodeURIComponent(runId));
      decisions = rr.decisions || []; results = rr.results || {}; agent = rr.agent;
    } else {
      if (!id) return ok({ error: "Provide either a runId (to look up a past run) or an agent id (to run fresh)." });
      const r = await api("POST", "/agents/" + encodeURIComponent(id) + "/run", {});
      agent = r.agent; results = r.results || {};
      decisions = (r.evidence || []).map(e => ({ decision: e.decision, autonomous: e.autonomous, confidencePct: Math.round((e.confidence || 0) * 100), rootCause: e.detailed && e.detailed.rootCause, reasoningSteps: e.detailed && e.detailed.reasoningSteps, recommendedAction: e.detailed && e.detailed.recommendedAction }));
    }
    const q = (query || "").toLowerCase();
    const m = decisions.find(d => (d.decision || "").toLowerCase().includes(q));
    if (!m) return ok({ note: "No decision matched '" + query + "'. Available decisions:", decisions: decisions.map(d => d.decision) });
    const rk = Object.keys(results).find(k => k.toLowerCase().includes(q) || (m.decision || "").toLowerCase().includes(k.toLowerCase()));
    const output = rk ? results[rk] : undefined;
    const shaped = audience === "exec"
      ? { agent, decision: m.decision, outcome: m.autonomous ? "executed autonomously" : "routed to a human", confidencePct: m.confidencePct,
          whatItMeans: m.rootCause, recommendedAction: m.recommendedAction, output,
          presentHint: "Executive view: 2-3 plain sentences — what was decided, how confident, what happens next. No jargon, no reasoning-step list." }
      : Object.assign({ agent }, m, { output });   // analyst (default): full detail
    return { content: [{ type: "text", text: JSON.stringify(shaped, null, 2).slice(0, 20000) }] };
  } catch (e) { return er(e); } });
// --- Native prompts: appear in Claude Desktop's prompt menu (the "+" / prompt picker) ---
server.registerPrompt("hi-unai", { title: "Hi UNAI (show menu)", description: "Show the UNAI agent menu, grouped by area, to pick and run." },
  async () => ({ messages: [{ role: "user", content: { type: "text", text: "Hi UNAI — show me the menu of agents I can run, grouped by area, and let me pick one." } }] }));
server.registerPrompt("run-unai-agent", { title: "Run a UNAI agent", description: "Run a specific UNAI agent by id and summarize its decisions.", argsSchema: { id: z.string().describe("Agent id, e.g. dc_hw_rma or demand_planning") } },
  async ({ id }) => ({ messages: [{ role: "user", content: { type: "text", text: `Run the UNAI agent "${id}" and summarize the key decisions and recommended actions in plain language.` } }] }));
server.registerPrompt("explain-run-for-exec", { title: "Explain a run for a C-level executive", description: "Run an agent and explain it in plain, C-level executive language.", argsSchema: { agent: z.string().describe("Agent id, e.g. dc_hw_rma") } },
  async ({ agent }) => ({ messages: [{ role: "user", content: { type: "text", text: `Run the UNAI agent "${agent}", then explain it for a C-level executive: what it decided, how confident, what (if anything) needs a human sign-off, and the business value. Plain language, no jargon, no individual names. Use unai_run_agent, then unai_get_decision with audience "exec" for any gated decision.` } }] }));
server.registerPrompt("run-and-draft-note", { title: "Run an agent and draft a stakeholder note", description: "Run an agent and draft a short note: what was decided and what needs approval.", argsSchema: { agent: z.string().describe("Agent id, e.g. spares_rma_closed_loop") } },
  async ({ agent }) => ({ messages: [{ role: "user", content: { type: "text", text: `Run the UNAI agent "${agent}", then draft a short, professional note to the relevant stakeholder: what was decided, what needs their approval, and why. Ground it only in the run's actual decisions and outputs — invent nothing.` } }] }));
server.registerPrompt("compare-agents", { title: "Compare two UNAI agents", description: "Run two agents and compare decisions, gating and (measured) token use.", argsSchema: { agentA: z.string().describe("First agent id"), agentB: z.string().describe("Second agent id") } },
  async ({ agentA, agentB }) => ({ messages: [{ role: "user", content: { type: "text", text: `Run the UNAI agents "${agentA}" and "${agentB}", then compare: number of decisions, how many executed autonomously vs routed to a human, measured token usage (only if the tokens source is "measured"), and where each is stronger. Use unai_run_agent for each.` } }] }));
server.registerPrompt("unai-health", { title: "Check UNAI status", description: "Is UNAI reachable, authorized, and are runs measured?" },
  async () => ({ messages: [{ role: "user", content: { type: "text", text: "Call unai_status and tell me plainly: is UNAI reachable and authorized, are agent runs measured or modeled-only, and is safe mode on?" } }] }));

(async () => { await server.connect(new StdioServerTransport()); })();
