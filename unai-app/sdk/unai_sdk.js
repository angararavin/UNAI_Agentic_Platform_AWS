// unai_sdk.js — tiny JS/Node client for the UNAI API (/api/v1).
// Node 18+ (global fetch) or any modern browser. No dependencies.
//
//   const { UNAIClient } = require("./unai_sdk.js");   // Node
//   const unai = new UNAIClient({ baseUrl: "https://<host>", token: process.env.UNAI_API_KEY });
//   const { ontology } = await unai.ontology();
//   const { id } = await unai.createAgent({ name: "Spares Triage",
//     capabilities: [ { label: "Read stock", kind: "perception", system: "SAP_MM" },
//                     { label: "Create PO",  kind: "action",     system: "SAP_MM" } ] });
//   const run = await unai.run(id);
//   console.log(run.observability, run.containment);

class UNAIClient {
  constructor({ baseUrl, token } = {}) {
    if (!baseUrl) throw new Error("baseUrl required");
    this.base = baseUrl.replace(/\/$/, "") + "/api/v1";
    this.token = token || "";
  }
  async _req(method, path, body) {
    const res = await fetch(this.base + path, {
      method,
      headers: Object.assign(
        { "Content-Type": "application/json" },
        this.token ? { Authorization: "Bearer " + this.token } : {}
      ),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch (_) { data = { raw: text }; }
    if (!res.ok) { const e = new Error(data.error || ("HTTP " + res.status)); e.status = res.status; e.data = data; throw e; }
    return data;
  }
  // --- discovery ---
  health()      { return this._req("GET", "/health"); }
  ontology()    { return this._req("GET", "/ontology"); }
  // --- agents ---
  listAgents()  { return this._req("GET", "/agents"); }
  createAgent(manifest) { return this._req("POST", "/agents", manifest); }   // { name, capabilities:[{label,kind,system?}] }
  run(id, config)       { return this._req("POST", `/agents/${encodeURIComponent(id)}/run`, { config: config || {} }); }
  // --- data-foundation connections ---
  listConnections()             { return this._req("GET", "/connections"); }
  configureConnection(type, config) { return this._req("POST", "/connections", { type, config: config || {} }); }
  // --- Agent Safety & Containment ---
  containment()       { return this._req("GET", "/containment"); }
  kill(on)            { return this._req("POST", "/containment/kill", { on: !!on }); }
  setEgress(allowlist){ return this._req("POST", "/containment/egress", { allowlist: allowlist || [] }); }
  setPolicy(policy)   { return this._req("POST", "/containment/policy", { policy }); }
}

if (typeof module !== "undefined" && module.exports) module.exports = { UNAIClient };
if (typeof window !== "undefined") window.UNAIClient = UNAIClient;
