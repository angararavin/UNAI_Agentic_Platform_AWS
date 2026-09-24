// ==========================================================================
// customer_api.js — narrow, per-agent customer-facing API proxy.
//
// Different problem than api_v1.js (the broad, admin-flavored "productized
// API": create agents from a manifest, run built-ins, flip containment/kill
// switches, etc.). This is for handing ONE already-converted agent (e.g. the
// NVIDIA control tower, CVA-BD56A6DF) to an external customer as a clean,
// stable JSON endpoint, with NO visibility into:
//   - the rest of UNAI Studio (other tabs, other converted agents, the
//     Agent Foundry, containment controls, admin login)
//   - which internal port the agent happens to be running on right now
//     (ports are re-picked on every relaunch)
//   - that it's "UNAI Studio" at all, if you don't want it to be
//
// A customer key is scoped to exactly one slug (e.g. "nvidia") via its own
// key file -- NOT added to UNAI_API_KEYS, which would also unlock every
// /api/v1 admin route. Slugs map to the underlying converted-app id (the
// CVA-xxxx folder under .converted/) via customer_agents.json, so the
// customer-facing name never has to match (or leak) that internal id.
//
// Both JSON files persist next to the other UNAI Studio state files
// (.conversions.json, .foundry_running.json, ...) -- plain local state, same
// convention as the rest of this app, not meant to be source-controlled.
// ==========================================================================
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const http = require("http");
const https = require("https");
const net = require("net");

const KEYS_FILE = path.join(__dirname, "customer_api_keys.json");
const AGENTS_FILE = path.join(__dirname, "customer_agents.json");

// One dedicated reverse-proxy http.Server per slug that has a live link
// enabled -- in-memory only (re-created each process start; see
// ensureAllLiveGateways), keyed by slug.
const GATEWAYS = new Map();

function pickFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
    srv.on("error", reject);
  });
}
function parseCookies(req) {
  const h = req.headers.cookie || "";
  const out = {};
  h.split(";").forEach(p => { const i = p.indexOf("="); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function keyIsValidForSlug(key, slugName) {
  const entry = loadKeys()[key];
  return !!(entry && entry.slug === slugName);
}
// Same-origin, per-slug streaming reverse proxy -- the target's response
// (HTML, JS/CSS assets, images, its own /api/* JSON) is piped through
// untouched, so the browser sees a normal same-page app with no rewriting.
// stripFrameHeaders: drop X-Frame-Options / CSP frame-ancestors from the
// response -- for server.js's Playground iframe embed (the one caller that
// passes this), the whole point is putting the app INSIDE an iframe on this
// origin, which either header (if the target happened to set one) would
// have the browser refuse outright. Left off (default) for the customer
// live-link gateway, which opens as its own top-level page, never framed.
function proxyThrough(req, res, targetBase, { stripFrameHeaders = false } = {}) {
  const target = new URL(req.url, targetBase);
  const client = target.protocol === "https:" ? https : http;
  const headers = Object.assign({}, req.headers);
  delete headers.host;
  const preq = client.request(target, { method: req.method, headers }, pres => {
    const outHeaders = Object.assign({}, pres.headers);
    if (stripFrameHeaders) { delete outHeaders["x-frame-options"]; delete outHeaders["content-security-policy"]; }
    res.writeHead(pres.statusCode, outHeaders);
    pres.pipe(res);
  });
  preq.on("error", () => { try { res.writeHead(502, { "Content-Type": "text/plain" }); res.end("Agent temporarily unavailable."); } catch (_) {} });
  req.pipe(preq);
}
function accessKeyFormHtml(slugName, label, message) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${label} — Sign in</title>
<style>body{margin:0;font:15px/1.5 ui-sans-serif,system-ui,Segoe UI,Roboto,Arial;background:#0b1020;color:#e7ecf7;display:flex;min-height:100vh;align-items:center;justify-content:center}
.box{background:#121826;border:1px solid #232d42;border-radius:14px;padding:30px;width:340px;text-align:center}
h1{font-size:17px;margin:0 0 16px}input{width:100%;padding:10px 12px;border-radius:9px;border:1px solid #232d42;background:#0c1220;color:#e7ecf7;font-size:14px;box-sizing:border-box}
button{width:100%;margin-top:10px;padding:10px;border:none;border-radius:9px;background:#4f8cff;color:#08111f;font-weight:700;cursor:pointer}
.msg{color:#ff8f87;font-size:12px;margin-top:10px;min-height:14px}</style></head>
<body><form class="box" method="GET" action="">
<h1>${label}</h1>
<input name="key" type="password" placeholder="Access key" autofocus>
<button type="submit">Continue</button>
<div class="msg">${message || ""}</div>
</form></body></html>`;
}

function loadJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (_) { return fallback; } }
function saveJson(file, obj) { fs.writeFileSync(file, JSON.stringify(obj, null, 2)); }

function loadAgents() { return loadJson(AGENTS_FILE, {}); }
function loadKeys() { return loadJson(KEYS_FILE, {}); }

/** Registers (or re-points) a customer-facing slug at a converted app id. */
function registerAgent(slugName, convertedId, label) {
  const agents = loadAgents();
  // Merge, don't replace -- re-registering an existing slug (e.g. every
  // relaunch/re-conversion now auto-calls this, see registerAgentAuto) must
  // not silently wipe liveEnabled/livePort that enableLiveLink() set earlier;
  // this bit the NVIDIA live link exactly that way the first time this ran.
  const prior = agents[slugName] || {};
  agents[slugName] = Object.assign({}, prior, { convertedId, label: label || slugName, registeredAt: new Date().toISOString() });
  saveJson(AGENTS_FILE, agents);
  return agents[slugName];
}

/** Issues a new key scoped to exactly one slug. Returns the raw key (shown once, like any API key). */
function issueKey(slugName, label) {
  if (!loadAgents()[slugName]) throw new Error(`no customer agent registered for slug "${slugName}" -- call registerAgent() first`);
  const keys = loadKeys();
  const key = "cak_" + crypto.randomBytes(24).toString("hex");
  keys[key] = { slug: slugName, label: label || slugName, createdAt: new Date().toISOString() };
  saveJson(KEYS_FILE, keys);
  return key;
}

function revokeKey(key) {
  const keys = loadKeys();
  if (!keys[key]) return false;
  delete keys[key];
  saveJson(KEYS_FILE, keys);
  return true;
}

/** Reuses the existing key for this slug if one was already issued (so a
 * customer's credential stays stable across re-conversions of the same
 * app, e.g. iterating on it in the Agent Foundry), otherwise issues a new
 * one. Used by the auto-registration hook -- see registerAgentAuto. */
function getOrIssueKey(slugName, label) {
  const existing = Object.entries(loadKeys()).find(([, v]) => v.slug === slugName);
  if (existing) return existing[0];
  return issueKey(slugName, label);
}

const RESERVED_SLUGS = new Set(["run", "launch"]);   // clash with the /:slug/run and /:slug/launch routes

/** Auto-called right after a conversion/build goes live (see
 * foundry_convert.js) -- derives a customer-facing slug from the app's own
 * name, keeps it stable across re-conversions of the SAME converted-app id,
 * and disambiguates a collision with a DIFFERENT app safely (never silently
 * overwrites another app's registration/key). Returns the slug + key ready
 * to show right where the conversion result itself is shown, no separate
 * manual registration step. */
function registerAgentAuto(convertedId, name) {
  const base = slugifyName(name);
  const agents = loadAgents();
  // Already registered under some slug for this exact app id? Keep it --
  // re-converting/relaunching the same app shouldn't hand out a new slug
  // (and therefore a new key) every time.
  const already = Object.entries(agents).find(([, v]) => v.convertedId === convertedId);
  let slugName = already ? already[0] : base;
  if (!already) {
    let n = 1;
    while (RESERVED_SLUGS.has(slugName) || (agents[slugName] && agents[slugName].convertedId !== convertedId)) {
      n += 1; slugName = base + "-" + n;
    }
  }
  registerAgent(slugName, convertedId, name);
  const key = getOrIssueKey(slugName, name);
  return { slug: slugName, key, apiBase: `/api/customer-agents/${slugName}/` };
}
function slugifyName(name) {
  return String(name || "agent").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "agent";
}

function tokenFrom(req) {
  const h = req.headers.authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : "";
}

/** True only if the request's Bearer key is scoped to exactly this slug. */
function authorizeSlug(req, slugName) {
  const key = tokenFrom(req);
  if (!key) return false;
  const entry = loadKeys()[key];
  return !!(entry && entry.slug === slugName);
}

// Strips anything an internal converted app might leak in an error body
// (stack traces, absolute file paths) before it reaches an external
// customer -- the converted apps were written to be run by their own
// original developer, not audited for what a THIRD PARTY should see.
function sanitizeError(body) {
  if (!body || typeof body !== "object") return { error: "internal error" };
  const out = { error: body.error || "internal error" };
  return out; // deliberately drop every other field (stack, details, ...)
}

// ---- Live app link: a dedicated reverse-proxy port per slug, serving the
// converted app's OWN real UI (not just its JSON API) behind a simple
// key-gated cookie session -- this is "hand the customer the running app
// itself" as a browser bookmark, distinct from the JSON-only /run proxy
// above. Runs at root ("/") on its own port so the app's own relative
// asset/API paths resolve exactly as they do when opened directly -- no
// path-prefix rewriting, no broken bundles. ---------------------------------

/** Marks a slug as having a live browser link, and starts its gateway now
 * (idempotent -- safe to call every boot). The port is chosen once and
 * persisted in customer_agents.json so a bookmarked URL keeps working
 * across server restarts. */
async function enableLiveLink(slugName, ctx) {
  const agents = loadAgents();
  const agent = agents[slugName];
  if (!agent) throw new Error(`no customer agent registered for slug "${slugName}"`);
  if (!agent.livePort) { agent.livePort = await pickFreePort(); saveJson(AGENTS_FILE, agents); }
  agent.liveEnabled = true; saveJson(AGENTS_FILE, agents);
  await startLiveGateway(slugName, ctx);
  return { port: agent.livePort };
}

/** Starts (once per process) the reverse-proxy server for one slug. */
function startLiveGateway(slugName, ctx) {
  if (GATEWAYS.has(slugName)) return Promise.resolve(GATEWAYS.get(slugName));
  const agent = loadAgents()[slugName];
  if (!agent || !agent.livePort) return Promise.reject(new Error("live link not enabled for " + slugName));
  const label = agent.label || slugName;

  const server = http.createServer(async (req, res) => {
    try {
      const u = new URL(req.url, "http://internal");
      const cookieName = "cak_live_" + slugName;
      const cookies = parseCookies(req);
      const queryKey = u.searchParams.get("key");

      let authed = cookies[cookieName] && keyIsValidForSlug(cookies[cookieName], slugName);
      if (!authed && queryKey && keyIsValidForSlug(queryKey, slugName)) {
        u.searchParams.delete("key");
        const clean = u.pathname + (u.searchParams.toString() ? "?" + u.searchParams.toString() : "");
        res.writeHead(302, { "Location": clean,
          "Set-Cookie": `${cookieName}=${encodeURIComponent(queryKey)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000` });
        return res.end();
      }
      if (!authed) {
        const wrongKey = queryKey ? "Invalid access key." : "";
        res.writeHead(200, { "Content-Type": "text/html" });
        return res.end(accessKeyFormHtml(slugName, label, wrongKey));
      }

      // Authed: resolve where the real app is running right now (auto-relaunch
      // if it's currently stopped) and stream the request straight through.
      let running = ctx.foundryConvert.getRunning(agent.convertedId);
      if (!running) { await ctx.foundryConvert.relaunchAnyApp(agent.convertedId); running = ctx.foundryConvert.getRunning(agent.convertedId); }
      if (!running) { res.writeHead(503, { "Content-Type": "text/plain" }); return res.end("Agent is not currently available."); }
      proxyThrough(req, res, (running.previewUrl || running.url).replace(/\/$/, ""));
    } catch (e) {
      try { res.writeHead(500, { "Content-Type": "text/plain" }); res.end("Internal error."); } catch (_) {}
    }
  });
  server.listen(agent.livePort, "0.0.0.0");
  GATEWAYS.set(slugName, { server, port: agent.livePort });
  return Promise.resolve(GATEWAYS.get(slugName));
}

/** Called once at server boot: brings back every slug's live gateway that
 * was previously enabled, same "survives a restart" convention as
 * foundry_convert.js's autoRelaunchAll(). */
async function ensureAllLiveGateways(ctx) {
  const agents = loadAgents();
  const slugs = Object.keys(agents).filter(s => agents[s].liveEnabled);
  for (const s of slugs) { try { await startLiveGateway(s, ctx); } catch (_) {} }
  return slugs.map(s => ({ slug: s, port: agents[s].livePort }));
}

// Returns true if it handled the request (mirrors api_v1.js's handle() convention).
//
// Generic proxy, not just the one "/run" action: whatever the underlying
// converted app exposes under ITS OWN /api/* (here: /api/agents/run,
// /api/products, /api/products/simulate-draw, /api/agents/generate-rma-doc)
// is reachable the same way, one level down from the slug -- so a customer
// gets the app's full real capability set through this one door, without
// ever touching its UI/static assets (those live outside /api/* on the
// target, so this can't be pointed at them no matter what subPath is asked
// for) or anything else in UNAI Studio.
async function handle(req, res, urlPath, ctx) {
  // POST .../launch — the same Bearer key that authorizes the JSON API also
  // launches (or resumes) this slug's live browser link and hands back a
  // ready-to-open URL, so a customer never has to know a port number in
  // advance or hardcode one: they call this endpoint, then open whatever
  // url it returns. Checked before the generic proxy below so "launch"
  // itself is never mistaken for a path on the underlying app's own API.
  const mLaunch = /^\/api\/customer-agents\/([^/]+)\/launch$/.exec(urlPath);
  if (mLaunch) {
    const slugName = decodeURIComponent(mLaunch[1]);
    if (!authorizeSlug(req, slugName)) {
      res.writeHead(401, { "Content-Type": "application/json", "WWW-Authenticate": "Bearer" });
      res.end(JSON.stringify({ error: "unauthorized — provide Authorization: Bearer <your customer key> for this agent" }));
      return true;
    }
    const agent = loadAgents()[slugName];
    if (!agent) { res.writeHead(404, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "unknown agent" })); return true; }
    try {
      if (!agent.liveEnabled) await enableLiveLink(slugName, ctx);
      else await startLiveGateway(slugName, ctx);   // idempotent — no-op if this process's gateway is already up
      const freshAgent = loadAgents()[slugName];
      const key = tokenFrom(req);
      const host = (req.headers.host || "localhost").split(":")[0];
      const url = `http://${host}:${freshAgent.livePort}/?key=${key}`;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, url, port: freshAgent.livePort, note: "open this URL in a browser — it signs you in once, then works as a normal bookmark" }));
    } catch (e) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "could not launch the live app" }));
    }
    return true;
  }

  const m = /^\/api\/customer-agents\/([^/]+)\/(.+)$/.exec(urlPath);
  if (!m) return false;
  const slugName = decodeURIComponent(m[1]);
  const subPath = m[2].replace(/^\/+/, "");

  if (!authorizeSlug(req, slugName)) {
    res.writeHead(401, { "Content-Type": "application/json", "WWW-Authenticate": "Bearer" });
    res.end(JSON.stringify({ error: "unauthorized — provide Authorization: Bearer <your customer key> for this agent" }));
    return true;
  }
  const agent = loadAgents()[slugName];
  if (!agent) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "unknown agent" }));
    return true;
  }

  let body = ""; req.on("data", c => body += c);
  await new Promise(r => req.on("end", r));

  try {
    // Bring the underlying app back up on demand if it's currently stopped --
    // a customer shouldn't have to know (or care) that the agent runs as a
    // local process that can be down between uses.
    let running = ctx.foundryConvert.getRunning(agent.convertedId);
    if (!running) { await ctx.foundryConvert.relaunchAnyApp(agent.convertedId); running = ctx.foundryConvert.getRunning(agent.convertedId); }
    if (!running) throw new Error("agent is not currently available");

    // previewUrl is the app's OWN real server (its actual business-logic
    // routes) -- url is UNAI's generic wrapper, a different, unrelated
    // capability-simulation API that would silently return the wrong thing
    // here. Always forwarded under /api/ on the target, regardless of
    // subPath, so this can never reach the app's UI/static files.
    const base = (running.previewUrl || running.url).replace(/\/$/, "");
    const target = `${base}/api/${subPath}`;
    const r = await fetch(target, {
      method: req.method,
      headers: { "Content-Type": req.headers["content-type"] || "application/json" },
      body: ["GET", "HEAD"].includes(req.method) ? undefined : (body || undefined),
      signal: AbortSignal.timeout(30000),
    });
    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch (_) { data = null; }
    if (!r.ok) {
      res.writeHead(r.status, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(sanitizeError(data)));
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(data !== null ? JSON.stringify(data) : text);
  } catch (e) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "agent temporarily unavailable" }));
  }
  return true;
}

module.exports = { handle, registerAgent, registerAgentAuto, issueKey, getOrIssueKey, revokeKey, loadAgents, loadKeys, enableLiveLink, ensureAllLiveGateways, proxyThrough };
