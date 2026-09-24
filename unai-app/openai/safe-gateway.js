#!/usr/bin/env node
// Narrow, tunnel-safe front door for exposing UNAI to a ChatGPT Custom GPT
// Action (Path B). Run THIS behind ngrok instead of the main UNAI server —
// it is deliberately much smaller than /api/v1:
//
//  - Only a READ + RUN-AGENT whitelist is reachable (see WHITELIST below).
//    The kill switch, egress/policy config, and data-connection config are
//    NOT exposed here — a leaked gateway URL/key can run demo agents and
//    read results, but can't touch safety controls or wire up real systems.
//  - Every request must match a long random secret path segment AND present
//    a bearer key — two factors, neither of which is the real UNAI_API_KEY
//    (that key lives only in this process's env and is never sent to the
//    internet; this gateway adds it itself on the localhost hop).
//  - Serves its own trimmed openapi.yaml (just the whitelisted routes) at
//    GET /gw/<secret>/openapi.yaml — import THIS into the Custom GPT Action,
//    not the main one.
//  - Simple in-memory rate limit + request log for visibility during a demo.
//
// Usage:
//   GATEWAY_KEY=<long-random>  UNAI_API_KEY=<real unai key>  node safe-gateway.js
//   (GATEWAY_SECRET_PATH auto-generates and prints if you don't set one)
//   Then: ngrok http 3300   and point the Custom GPT Action at
//   https://<ngrok>/gw/<secret>/openapi.yaml
"use strict";
const http = require("http");
const crypto = require("crypto");

const PORT = process.env.GATEWAY_PORT || 3300;
const UNAI_BASE = (process.env.UNAI_BASE_URL || "http://localhost:3000").replace(/\/$/, "") + "/api/v1";
const UNAI_KEY = process.env.UNAI_API_KEY || "";               // real backend key — never exposed
const GATEWAY_KEY = process.env.GATEWAY_KEY || "";              // what ChatGPT must present
const SECRET = process.env.GATEWAY_SECRET_PATH || crypto.randomBytes(12).toString("hex");
if (!UNAI_KEY) { console.error("Set UNAI_API_KEY (the real backend key)."); process.exit(1); }
if (!GATEWAY_KEY) { console.error("Set GATEWAY_KEY (a separate long random value for ChatGPT to present — do NOT reuse UNAI_API_KEY here)."); process.exit(1); }

// method + path pattern (with :param) -> real /api/v1 path template
const WHITELIST = [
  { method: "GET", re: /^\/agents$/, real: () => "/agents" },
  { method: "GET", re: /^\/ontology$/, real: () => "/ontology" },
  { method: "GET", re: /^\/containment$/, real: () => "/containment" },     // read-only status
  { method: "GET", re: /^\/runs$/, real: () => "/runs" },
  { method: "GET", re: /^\/runs\/([^/]+)$/, real: m => "/runs/" + m[1] },
  { method: "POST", re: /^\/agents\/([^/]+)\/run$/, real: m => "/agents/" + m[1] + "/run" },
];
// deliberately absent: POST /containment/kill, /containment/egress,
// /containment/policy, /connections (GET+POST), POST /agents (create)

// tiny sliding-window rate limit (per-process, good enough for a demo)
const WINDOW_MS = 60000, MAX_REQ = 30; let hits = [];
function rateLimited() {
  const now = Date.now(); hits = hits.filter(t => now - t < WINDOW_MS);
  hits.push(now); return hits.length > MAX_REQ;
}

function log(status, method, path) {
  console.log(`[gateway] ${new Date().toISOString()} ${status} ${method} ${path}`);
}

const OPENAPI_YAML = () => `openapi: 3.0.3
info:
  title: UNAI (safe demo gateway)
  version: "1.0.0"
  description: >
    Narrow read + run-agent subset of the UNAI API for a ChatGPT Custom GPT
    Action. No safety-control or data-connection endpoints are exposed here.
servers:
  - url: https://REPLACE-WITH-YOUR-NGROK-HOST/gw/${SECRET}
security:
  - bearerAuth: []
components:
  securitySchemes:
    bearerAuth: { type: http, scheme: bearer }
paths:
  /agents:
    get: { summary: List agents, responses: { '200': { description: ok } } }
  /ontology:
    get: { summary: Canonical ontology, responses: { '200': { description: ok } } }
  /containment:
    get: { summary: Read-only safety/containment status, responses: { '200': { description: ok } } }
  /runs:
    get: { summary: List recent runs, responses: { '200': { description: ok } } }
  /runs/{runId}:
    get:
      summary: Get one past run
      parameters: [{ name: runId, in: path, required: true, schema: { type: string } }]
      responses: { '200': { description: ok } }
  /agents/{id}/run:
    post:
      summary: Run an agent
      parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
      responses: { '200': { description: ok } }
`;

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  const prefix = "/gw/" + SECRET;
  if (!u.pathname.startsWith(prefix + "/") && u.pathname !== prefix) { res.writeHead(404); return res.end(); }
  const path = u.pathname.slice(prefix.length) || "/";

  if (req.method === "GET" && path === "/openapi.yaml") {
    res.writeHead(200, { "Content-Type": "text/yaml" }); return res.end(OPENAPI_YAML());
  }

  const auth = req.headers.authorization || "";
  if (auth !== "Bearer " + GATEWAY_KEY) { log(401, req.method, path); res.writeHead(401); return res.end(JSON.stringify({ error: "unauthorized" })); }
  if (rateLimited()) { log(429, req.method, path); res.writeHead(429); return res.end(JSON.stringify({ error: "rate limited — try again shortly" })); }

  const match = WHITELIST.find(w => w.method === req.method && w.re.test(path));
  if (!match) { log(404, req.method, path); res.writeHead(404); return res.end(JSON.stringify({ error: "not exposed by this gateway" })); }

  let body = ""; req.on("data", c => body += c);
  req.on("end", async () => {
    try {
      const realPath = match.real(path.match(match.re));
      const r = await fetch(UNAI_BASE + realPath, {
        method: req.method,
        headers: Object.assign({ "Content-Type": "application/json", Authorization: "Bearer " + UNAI_KEY }),
        body: req.method === "POST" ? (body || "{}") : undefined,
      });
      const text = await r.text();
      log(r.status, req.method, path);
      res.writeHead(r.status, { "Content-Type": "application/json" }); res.end(text);
    } catch (e) {
      log(502, req.method, path);
      res.writeHead(502, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: String(e) }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`[gateway] listening on http://localhost:${PORT}`);
  console.log(`[gateway] secret path: /gw/${SECRET}`);
  console.log(`[gateway] spec:        http://localhost:${PORT}/gw/${SECRET}/openapi.yaml`);
  console.log(`[gateway] whitelisted: ${WHITELIST.map(w => w.method + " " + w.re).join(", ")}`);
  console.log(`[gateway] tunnel this port (not 3000), then edit the openapi.yaml 'servers.url' to your ngrok host before importing into the Custom GPT.`);
});
