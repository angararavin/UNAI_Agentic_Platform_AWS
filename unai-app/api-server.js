/*
 * UNAI - Universal Supply-Chain Agent (Cognitive Runtime)
 * Copyright (c) 2026 Ravin Angara / Bristlecone. All rights reserved.
 *
 * PROPRIETARY & CONFIDENTIAL. This file, and the architecture, methods and
 * ideas it embodies, are the exclusive property of the copyright holders.
 * No part may be copied, reproduced, modified, distributed, reverse-engineered,
 * or used to create derivative works without prior written permission.
 * Shared under confidentiality; unauthorized use or disclosure is prohibited.
 * See LICENSE.
 * SPDX-License-Identifier: LicenseRef-UNAI-Proprietary   [UNAI-COPYRIGHT v1]
 */
/* =============================================================================
 * api-server.js — the CUSTOMER-FACING product surface: /api/v1 ONLY.
 *
 * server.js (the Studio) is an internal dev/demo tool — the Agent Foundry,
 * Playground, login-wall HTML, Converted Agents Playground, etc. This file is
 * what you actually deploy to give a customer programmatic access: it serves
 * ONLY /api/v1 (+ its OpenAPI spec), reusing the exact same api_v1.js route
 * handler and engine server.js uses for that surface — so behavior is
 * identical — with none of the Studio UI, static assets, or Agent Foundry
 * conversion/spawn endpoints reachable on this process at all. Deploy this as
 * its own service (its own container, its own port, its own security group)
 * so a customer's network path never touches the platform code.
 *
 * Auth is Bearer-token ONLY here (no Studio session-cookie fallback — see the
 * isAuthed:()=>false below): a customer gets a UNAI_API_KEYS value and
 * nothing else. There is no login form, no cookie, no password to guess.
 *
 * Run:   node api-server.js                          (port 8081, a key is
 *                                                       generated + printed)
 *        PORT=9000 UNAI_API_KEYS=k1,k2 node api-server.js   (pin real keys)
 * ========================================================================== */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { UNAI, USE_CASES, ONTOLOGY } = require("./engine.js");
const containment = require("./containment.js");
const license = require("./license.js");
const deployment = require("./deployment.js");
const kernel = require("./kernel-client.js");
const apiV1 = require("./api_v1.js");

// Customer keys: UNAI_API_KEYS (comma-separated) or one generated at boot
// (printed once — save it, it isn't persisted anywhere).
const API_KEYS = (process.env.UNAI_API_KEYS || "").split(",").map(s => s.trim()).filter(Boolean);
if (!API_KEYS.length) API_KEYS.push("unai_" + crypto.randomBytes(16).toString("hex"));

const server = http.createServer((req, res) => {
  const urlPath = req.url.split("?")[0];
  if (urlPath.startsWith("/api/v1")) {
    Promise.resolve(apiV1.handle(req, res, urlPath, {
      UNAI, USE_CASES, ONTOLOGY, containment, license, deployment, kernel,
      isAuthed: () => false,   // Bearer token only — no Studio session cookie exists on this process
      apiKeys: API_KEYS, fs, path, __dirname,
    })).catch(e => {
      try { res.writeHead(500, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: e.message })); } catch (_) {}
    });
    return;
  }
  if (urlPath === "/" || urlPath === "") {
    res.writeHead(302, { Location: "/api/v1" }); return res.end();
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not found — this server exposes only /api/v1. See GET /api/v1/openapi.yaml" }));
});
// Long-running agent calls shouldn't race Node's default request/header timeout.
server.requestTimeout = 0;
server.headersTimeout = 0;

const PORT = process.env.PORT || 8081;
server.listen(PORT, () => {
  console.log(`[unai-api] Customer-facing API ONLY on this process — no Studio UI, no Agent Foundry, nothing else is reachable here.`);
  console.log(`[unai-api] http://localhost:${PORT}/api/v1`);
  console.log(`[unai-api] Bearer key: ${API_KEYS[0]}${process.env.UNAI_API_KEYS ? " (from UNAI_API_KEYS)" : " (generated — set UNAI_API_KEYS to pin a real one before sharing with a customer)"}`);
  console.log(`[unai-api] Spec: http://localhost:${PORT}/api/v1/openapi.yaml`);
});
