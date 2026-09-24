// ==========================================================================
// api_v1.js — UNAI productized public API (v1).
//
// A stable, Bearer-token-authenticated surface a customer developer can use to
// (1) see the canonical ontology, (2) create agents from a manifest, (3) run
// agents, (4) configure their data-foundation connections, and (5) read/operate
// the Agent Safety & Containment controls. It wraps the same engine the Studio
// uses. This is the surface the "REST API & SDK" access model refers to.
//
// Auth: Authorization: Bearer <token>. Valid tokens come from UNAI_API_KEYS
// (comma-separated) or a key generated at boot. A valid Studio session cookie
// also authorizes, so the in-app UI can call v1 too.
// ==========================================================================

const AGENTS = new Map();        // id -> { id, name, capabilities, createdAt, source }
const CONNECTIONS = new Map();   // type -> { configured, summary, at }
const RUNS = new Map();          // runId -> { id, agent, at, evidence, results, observability } (last 50)
let _KA = null;                  // lazily-built SharePoint knowledge assistant (shares the platform's org key)
function knowledgeAssistant(){ if(!_KA){ const { KnowledgeAssistant } = require("./knowledge_assistant.js"); _KA = new KnowledgeAssistant(); _KA._ready = _KA.ingest(); } return _KA; }

function slug(s){ return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"") || "agent"; }
function readBody(req){ return new Promise(r=>{ let b=""; req.on("data",c=>b+=c); req.on("end",()=>{ try{ r(JSON.parse(b||"{}")); }catch(_){ r({}); } }); }); }
function send(res, status, obj){ res.writeHead(status, {"Content-Type":"application/json"}); res.end(JSON.stringify(obj)); }
function redact(cfg){ const o={}; for(const k of Object.keys(cfg||{})){ o[k]=/key|secret|token|pass|pwd/i.test(k)?"***":cfg[k]; } return o; }
// The stable, customer-facing "business decision" shape — one entry per
// evidence object, decoupled from internal engine fields. `explanation` is
// the actual plain-English sentence (engine.js Layers.explain()), not just
// its structured parts — this is the "per-output plain-English explanation"
// half of the productized API. Shared by /agents/{id}/run and /runs/{id} so
// both return identically-shaped decisions.
function decisionsFromEvidence(evidence){
  return (evidence||[]).map(e=>({
    decision: e.decision, autonomous: e.autonomous, confidencePct: Math.round((e.confidence||0)*100),
    explanation: e.explanation||null,
    rootCause: e.detailed && e.detailed.rootCause,
    primaryDriver: e.detailed && e.detailed.primaryDriver,
    reasoningSteps: e.detailed && e.detailed.reasoningSteps,
    recommendedAction: e.detailed && e.detailed.recommendedAction,
    gate: e.gate || null,
  }));
}

function tokenFrom(req){ const h=req.headers.authorization||""; const m=/^Bearer\s+(.+)$/i.exec(h); return m?m[1].trim():""; }
function authorized(req, ctx){
  const t=tokenFrom(req);
  if(t && Array.isArray(ctx.apiKeys) && ctx.apiKeys.includes(t)) return true;
  try{ if(ctx.isAuthed && ctx.isAuthed(req)) return true; }catch(_){}
  return false;
}

// Returns true if it handled the request.
async function handle(req, res, urlPath, ctx){
  if(!urlPath.startsWith("/api/v1")) return false;
  const cont = ctx.containment;
  let sub = urlPath.slice("/api/v1".length).replace(/\/+$/,"") || "/";

  // --- OpenAPI spec is public (no secret; lets a dev discover the API) ---
  if(sub==="/openapi.yaml" && req.method==="GET"){
    try{ const y=ctx.fs.readFileSync(ctx.path.join(ctx.__dirname,"openapi.yaml"),"utf8");
      res.writeHead(200,{"Content-Type":"application/yaml"}); return res.end(y), true;
    }catch(_){ send(res,404,{error:"spec not found"}); return true; }
  }
  // --- Index is public ---
  if(sub==="/" && req.method==="GET"){
    send(res,200,{ name:"UNAI API", version:"v1",
      auth:"Bearer token (Authorization header). Get a key from your UNAI admin.",
      endpoints:["GET /api/v1/ontology","GET|POST /api/v1/agents","POST /api/v1/agents/{id}/run",
        "GET|POST /api/v1/connections","GET /api/v1/containment","POST /api/v1/containment/kill",
        "POST /api/v1/knowledge/ask","GET /api/v1/health","GET /api/v1/openapi.yaml"] });
    return true;
  }

  // --- everything else requires auth ---
  if(!authorized(req, ctx)){
    res.writeHead(401,{"Content-Type":"application/json","WWW-Authenticate":"Bearer"});
    res.end(JSON.stringify({error:"unauthorized — provide Authorization: Bearer <token>"}));
    return true;
  }

  if(sub==="/health" && req.method==="GET"){
    send(res,200,{ ok:true, version:"v1", safeMode: cont.safeMode, agents: AGENTS.size, license: ctx.license?ctx.license.status().mode:"n/a" }); return true;
  }

  // --- License / entitlement (commercial deployment) ---
  if(sub==="/license" && req.method==="GET"){
    send(res,200, Object.assign({ ok:true }, ctx.license ? ctx.license.status() : { licensed:false, mode:"n/a" })); return true;
  }
  // --- Deployment mode + IP boundary (kernel vs connector) ---
  if(sub==="/deployment" && req.method==="GET"){
    send(res,200, Object.assign({ ok:true }, ctx.deployment ? ctx.deployment.status() : { mode:"n/a" })); return true;
  }

  // --- SharePoint Knowledge Assistant (on-platform): shares the org model key
  //     set on the Governance tab, plus governance/audit. Permission-trimmed. ---
  if(sub==="/knowledge/ask" && req.method==="POST"){
    const b=await readBody(req); const k=knowledgeAssistant(); await k._ready;
    const r=await k.ask(b.query||"", { id:b.user||"api", groups:b.groups||["all"] });
    send(res,200,{ ok:true, ...r }); return true;
  }

  // --- Canonical ontology: what customers map their data to (zero re-map) ---
  if(sub==="/ontology" && req.method==="GET"){
    send(res,200,{ ok:true, ontology: ctx.ONTOLOGY, note:"Author agents against these canonical concepts; connect real data later by adapter with no agent change." });
    return true;
  }

  // --- Agents: list / create ---
  if(sub==="/agents" && req.method==="GET"){
    const builtin=Object.keys(ctx.USE_CASES||{}).map(k=>({ id:k, name:(ctx.USE_CASES[k].name||k),
      capabilities:(ctx.USE_CASES[k].capabilities||[]).length||undefined, source:ctx.USE_CASES[k].manifest?"converted":"builtin" }));
    const custom=[...AGENTS.values()].map(a=>({ id:a.id, name:a.name, capabilities:a.capabilities.length, source:a.source, createdAt:a.createdAt }));
    send(res,200,{ ok:true, agents:[...builtin,...custom] }); return true;
  }
  if(sub==="/agents" && req.method==="POST"){
    const b=await readBody(req);
    const name=(b.name||"").trim();
    const caps=Array.isArray(b.capabilities)?b.capabilities:[];
    if(!name) return send(res,400,{error:"name required"}), true;
    if(!caps.length) return send(res,400,{error:"capabilities[] required (each: {id?,label,kind:'perception'|'action',system?})"}), true;
    for(const c of caps){ if(!c || !["perception","action"].includes(c.kind)) return send(res,400,{error:"each capability needs kind 'perception' or 'action'"}), true; }
    const id=slug(name)+"_"+Math.random().toString(36).slice(2,7);
    const manifest=caps.map((c,i)=>({ id:slug(c.id||c.label||("cap"+i)), label:c.label||c.id||("Capability "+(i+1)), kind:c.kind, system:c.system||null }));
    const agent={ id, name, capabilities:manifest, createdAt:new Date().toISOString(), source:"api" };
    AGENTS.set(id, agent);
    cont.record("agent_created",{ id, name, viaApi:true });
    send(res,201,{ ok:true, id, agent, next:`POST /api/v1/agents/${id}/run` }); return true;
  }

  // --- Run an agent (built-in use-case key OR a created manifest) ---
  const mRun=/^\/agents\/([^/]+)\/run$/.exec(sub);
  if(mRun && req.method==="POST"){
    const id=decodeURIComponent(mRun[1]); const b=await readBody(req);
    // Containment: safe mode / deny policy force everything to human approval.
    const cfg=cont.runConstraints(Object.assign({}, b.config||{}, { _uc:id }));
    try{
      let goal=id, known=!!(ctx.USE_CASES && ctx.USE_CASES[id]);
      if(!known){ const a=AGENTS.get(id); if(!a) return send(res,404,{error:"unknown agent id"}), true;
        goal={ name:a.name, capabilities:a.capabilities }; }
      // Split-runtime: local engine (self-hosted/appliance) or remote control plane (hosted-kernel).
      const out = ctx.kernel ? await ctx.kernel.runAgent(goal,{config:cfg}) : (new ctx.UNAI(cfg)).run(goal);
      const kmode = ctx.kernel ? ctx.kernel.info() : { mode:"local" };
      // MEASURED-BY-DEFAULT observability: real provider tokens from a live pass.
      // The modeled estimate is kept, but only surfaced when explicitly requested
      // (?modeled=1 or body.includeModeled) — never as the default headline number.
      let measured = null;
      try {
        const { enrichEvidence, resolveConfig } = require("./llm.js");
        const enr = await enrichEvidence(out.evidence);
        if (enr && enr.used !== "template" && (enr.tokensIn || enr.tokensOut))
          measured = { source:"measured", model:(resolveConfig().model||null), decisionsMeasured:enr.calls,
            tokensIn:enr.tokensIn, tokensOut:enr.tokensOut, tokensTotal:(enr.tokensIn||0)+(enr.tokensOut||0) };
      } catch (_) {}
      const includeModeled = /(?:^|[?&])modeled=1/.test(req.url||"") || b.includeModeled === true;
      const mod = out.observability || {};
      const observability = {
        autonomyRatePct: mod.autonomyRatePct,
        decisions: (out.evidence||[]).length,
        measured,
        tokensSource: measured ? "measured" : "not measured (no live model key set)",
        savings: "measured savings require a baseline run — see measure_agents.js",
      };
      if (includeModeled) observability.modeled = Object.assign({ note:"MODELED estimate (op-counts x rates), not measured" }, mod.tokenModel||{}, { tokensTotal: mod.tokensTotal });
      // Persist the run so a specific decision can be looked up later without re-running.
      const runId = "run_" + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
      RUNS.set(runId, { id: runId, agent: id, at: new Date().toISOString(), evidence: out.evidence, results: out.results, observability });
      if (RUNS.size > 50) RUNS.delete(RUNS.keys().next().value);
      // The per-agent BUSINESS-DECISION layer: a stable, customer-facing shape
      // decoupled from the engine's internal evidence fields (waterfall, base,
      // threshold, etc.) — every decision, its plain-English explanation, and
      // why it was autonomous or routed to a human. Raw `evidence` is still
      // included below for callers who want the full internal detail too.
      const decisions = decisionsFromEvidence(out.evidence);
      send(res,200,{ ok:true, runId, agent:id,
        businessCase:out.businessCase,
        decisions, evidence:out.evidence, observability, results:out.results, useCase:out.useCase,
        runtime:{ mode:kmode.mode, remote:!!kmode.remote },
        containment:{ safeMode:cont.safeMode, forced:cfg._containment||null, maxActions:cfg.maxActions } });
    }catch(e){ send(res,500,{error:e.message}); }
    return true;
  }

  // --- Stored runs (look up a past run's decisions without re-running) ---
  if(sub==="/runs" && req.method==="GET"){
    send(res,200,{ ok:true, runs:[...RUNS.values()].reverse().slice(0,50).map(r=>({ runId:r.id, agent:r.agent, at:r.at, decisions:(r.evidence||[]).length })) });
    return true;
  }
  const mGetRun=/^\/runs\/([^/]+)$/.exec(sub);
  if(mGetRun && req.method==="GET"){
    const r=RUNS.get(decodeURIComponent(mGetRun[1]));
    if(!r) return send(res,404,{error:"unknown run id"}), true;
    const decisions=decisionsFromEvidence(r.evidence);
    send(res,200,{ ok:true, runId:r.id, agent:r.agent, at:r.at,
      summary:{ decisions:decisions.length, autonomyRatePct:r.observability&&r.observability.autonomyRatePct, tokensTotal:r.observability&&r.observability.tokensTotal },
      decisions, results:r.results });
    return true;
  }

  // --- Data-foundation connections ---
  if(sub==="/connections" && req.method==="GET"){
    const catalog=[
      { type:"databricks", kind:"lakehouse" }, { type:"snowflake", kind:"warehouse" },
      { type:"bigquery", kind:"warehouse" }, { type:"neo4j", kind:"graph" },
      { type:"llm", kind:"model-gateway" },
    ].map(c=>Object.assign(c,{ configured: CONNECTIONS.has(c.type) || (c.type==="llm" && !!(process.env.GATEWAY_API_KEY||process.env.MISTRAL_API_KEY)) }));
    send(res,200,{ ok:true, connections:catalog,
      note:"Author agents against the canonical ontology; register a connection here, then runs read your real systems with no agent change." });
    return true;
  }
  if(sub==="/connections" && req.method==="POST"){
    const b=await readBody(req); const type=(b.type||"").toLowerCase(); const config=b.config||{};
    if(!type) return send(res,400,{error:"type required (databricks|snowflake|bigquery|neo4j|llm)"}), true;
    if(type==="llm"){
      if(!config.key) return send(res,400,{error:"llm connection needs config.key"}), true;
      process.env.GATEWAY_API_KEY=config.key;
      process.env.GATEWAY_BASE_URL=config.base||"https://api.mistral.ai/v1";
      process.env.GATEWAY_MODEL=config.model||"mistral-small-latest";
    }
    CONNECTIONS.set(type,{ configured:true, summary:redact(config), at:new Date().toISOString() });
    cont.record("connection_registered",{ type });
    send(res,200,{ ok:true, type, configured:true, summary:redact(config),
      note: type==="llm" ? "model gateway set" : "connection registered; live validation runs via the connector's test on first read" });
    return true;
  }

  // --- Agent Safety & Containment ---
  if(sub==="/containment" && req.method==="GET"){ send(res,200,{ ok:true, ...cont.status(), recent:cont.recentEvents(20) }); return true; }
  if(sub==="/containment/kill" && req.method==="POST"){ const b=await readBody(req); send(res,200,{ ok:true, ...cont.setKillSwitch(!!b.on,"api") }); return true; }
  if(sub==="/containment/egress" && req.method==="POST"){ const b=await readBody(req); send(res,200,{ ok:true, ...cont.setEgressAllowlist(b.allowlist||[],"api") }); return true; }
  if(sub==="/containment/policy" && req.method==="POST"){ const b=await readBody(req); send(res,200,{ ok:true, ...cont.setActionPolicy(b.policy,"api") }); return true; }

  send(res,404,{error:"no such v1 route: "+req.method+" "+urlPath}); return true;
}

module.exports = { handle, _agents: AGENTS };
