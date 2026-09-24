/* UNAI Agent Runner — run any of the 33 supply-chain use-case agents locally.
 * Paste an LLM key in the UI (or set MISTRAL_API_KEY), pick an agent, Run.
 * Shows UNAI token usage (real when a key is connected) and the savings vs a
 * first-gen many-agent build, per use case.
 *   npm start   →  http://localhost:8080
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
global.COGNITION = require("./cognition.js");            // domain library (33 use cases)
const { UNAI, USE_CASES } = require("./engine.js");      // shared cognitive runtime
const { resolveConfig, enrichEvidence } = require("./llm.js");

const CAT = (global.COGNITION.useCaseCatalog ? global.COGNITION.useCaseCatalog() : []);
const PORT = process.env.PORT || 8080;
// Pilot/demo agents that live as real USE_CASES entries (bespoke tool packs,
// engine.js) rather than the cognition-catalog's generic cap_/role_ scheme
// below. Explicit allowlist so this stays scoped — not every USE_CASES key
// (disruption_response, monster_*, ...) is meant to be exposed by this runner.
const EXTRA_AGENTS = ["ocm_change_management"];

// A first-gen build delivers ONE use case as a TEAM of specialist agents — a
// retrieval agent, a mapping agent, the domain-modeling agent, a validation
// agent, an action agent — each re-loading the full schema. UNAI consolidates
// that whole team onto ONE shared runtime, which is where the token savings
// actually show (a lone single-capability run saves ~nothing, by design).
const TEAM_ROLES = [
  { suffix: "retrieval",  label: "Data Retrieval" },
  { suffix: "mapping",    label: "Ontology Mapping" },
  { suffix: "validation", label: "Quality Validation" },
  { suffix: "action",     label: "Action & Publish" },
];
function agentGoal(key) {
  const uc = CAT.find(u => u.key === key);
  if (!uc) return null;
  const lg = global.COGNITION.useCaseLogic ? global.COGNITION.useCaseLogic(key) : null;
  const title = uc.label.replace(/\b\w/g, c => c.toUpperCase());
  // Team size scales with the use case's concept count (3..5): richer use cases
  // would need more specialists in a naive build → larger consolidation win.
  const teamSize = Math.max(3, Math.min(1 + TEAM_ROLES.length, (uc.needs || []).length));
  const support = TEAM_ROLES.slice(0, teamSize - 1);
  const plan = [{ capability: "cap_" + key, agentEquiv: uc.label, systems: ["ANALYTICS"] }]
    .concat(support.map(r => ({ capability: "role_" + key + "_" + r.suffix, agentEquiv: uc.label + " · " + r.label, systems: ["ANALYTICS"] })));
  const team = [uc.label + " · Modeling"].concat(support.map(r => uc.label + " · " + r.label));
  return { name: title, description: "SAP IBP " + uc.module + " — delivered as " + plan.length + " consolidated agents; concepts: " + uc.needs.join(", "),
    manifest: true, gen1Agents: team, _module: uc.module, _needs: uc.needs, _logic: lg, _team: team, plan };
}

function send(res, code, obj) { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); }
function body(req, cb) { let b = ""; req.on("data", c => b += c); req.on("end", () => { try { cb(JSON.parse(b || "{}")); } catch (_) { cb({}); } }); }

const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];

  if (url === "/api/agents") {
    const byMod = {};
    CAT.forEach(u => { (byMod[u.module] = byMod[u.module] || []).push({ id: u.key, name: u.label.replace(/\b\w/g, c => c.toUpperCase()), concepts: u.needs.length }); });
    EXTRA_AGENTS.forEach(key => { const uc = USE_CASES[key]; if (!uc) return;
      (byMod["Pilot / Demo"] = byMod["Pilot / Demo"] || []).push({ id: key, name: uc.name, concepts: (uc.plan || []).length }); });
    return send(res, 200, { count: CAT.length + EXTRA_AGENTS.length, modules: byMod, gateway: gwStatus() });
  }

  if (url === "/api/set-key" && req.method === "POST") {
    return body(req, j => {
      const key = (j.key || "").trim();
      if (!key) return send(res, 400, { ok: false, error: "provide a key" });
      process.env.GATEWAY_API_KEY = key;
      process.env.GATEWAY_BASE_URL = (j.base || "").trim() || "https://api.mistral.ai/v1";
      process.env.GATEWAY_MODEL = (j.model || "").trim() || "mistral-small-latest";
      send(res, 200, { ok: true, gateway: gwStatus() });
    });
  }
  if (url === "/api/clear-key" && req.method === "POST") {
    delete process.env.GATEWAY_API_KEY; delete process.env.GATEWAY_BASE_URL; delete process.env.GATEWAY_MODEL;
    return send(res, 200, { ok: true, gateway: gwStatus() });
  }

  if (url === "/api/run" && req.method === "POST") {
    return body(req, async j => {
      // Pilot/demo agents (EXTRA_AGENTS) are real USE_CASES entries with bespoke
      // tool packs — run them directly instead of routing through the cognition-
      // catalog's generic cap_/role_ scheme, which wouldn't reach their real logic.
      const isExtra = EXTRA_AGENTS.includes(j.agent) && USE_CASES[j.agent];
      const goal = isExtra ? USE_CASES[j.agent] : agentGoal(j.agent);
      if (!goal) return send(res, 400, { ok: false, error: "unknown agent: " + j.agent });
      try {
        // Detailed explainability = live per-decision rationales (L7 live×N).
        // Per-agent, default ON; off → template rationales at 0 live tokens.
        const detailed = j.detailedExplainability !== false;
        const out = new UNAI({ name: "UNAI", detailedExplainability: detailed }).run(goal);
        const ob = out.observability, tm = ob.tokenModel || {};
        // real, measured tokens when a key is connected (per-request key wins)
        let rationale = { used: "template", tokensIn: 0, tokensOut: 0, calls: 0, provider: "template" };
        if (detailed) { try { rationale = await enrichEvidence(out.evidence, (j.key || "").trim() || undefined); } catch (_) {} }
        const live = (detailed && rationale && rationale.used !== "template" && rationale.calls)
          ? { provider: rationale.provider, model: rationale.model, calls: rationale.calls,
              tokensIn: rationale.tokensIn, tokensOut: rationale.tokensOut, tokensTotal: rationale.tokensIn + rationale.tokensOut }
          : null;
        const team = goal._team || goal.gen1Agents || [];
        send(res, 200, { ok: true, name: out.useCase.name, detailedExplainability: detailed,
          module: goal._module || "Pilot / Demo", needs: goal._needs || [], logic: goal._logic || null,
          agents: team.length, team,
          tokensTotal: ob.tokensTotal, naiveTotal: tm.naiveTotal, savedPct: tm.savedPct, savedTokens: tm.savedTokens,
          estCostUsd: ob.estCostUsd, naiveCostUsd: tm.naiveCostUsd, decisions: ob.decisions, autonomyRatePct: ob.autonomyRatePct,
          live, evidence: (out.evidence || []).map(e => ({ decision: e.decision, confidence: e.confidence, uncertainty: e.uncertainty,
            autonomous: e.autonomous, waterfall: e.waterfall, counterfactual: e.counterfactual, explanationSource: e.explanationSource,
            explanation: e.llmExplanation || e.explanation, tokensIn: e.tokensIn, tokensOut: e.tokensOut, output: e.output })) });
      } catch (e) { send(res, 500, { ok: false, error: e.message }); }
    });
  }

  // static
  let file = url === "/" ? "/public/index.html" : url;
  if (file.indexOf("/agents/") === 0) file = file;               // serve manifests
  else if (file.indexOf("/public/") !== 0 && file !== "/public/index.html") file = "/public" + file;
  const fp = path.join(__dirname, path.normalize(file).replace(/^(\.\.[/\\])+/, ""));
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    const ext = path.extname(fp);
    res.writeHead(200, { "Content-Type": ext === ".html" ? "text/html" : ext === ".json" ? "application/json" : ext === ".js" ? "text/javascript" : "text/plain" });
    res.end(data);
  });
});

function gwStatus() {
  const base = process.env.GATEWAY_BASE_URL || "", key = !!process.env.GATEWAY_API_KEY;
  return { active: (base && key) ? "gateway" : (process.env.MISTRAL_API_KEY ? "mistral" : "template"), keySet: key,
    model: process.env.GATEWAY_MODEL || "mistral-small-latest" };
}
process.on("unhandledRejection", e => console.error("[runner] unhandledRejection:", e && e.message));
process.on("uncaughtException", e => console.error("[runner] uncaughtException:", e && e.message));
server.listen(PORT, () => console.log(`[UNAI Agent Runner] http://localhost:${PORT}  ·  ${CAT.length} agents`));
