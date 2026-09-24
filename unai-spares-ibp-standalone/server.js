/*
 * server.js — standalone Spares Planning (IBP) demo.
 * One use case, one page: runs UNAI's spares_planning_ibp against a real
 * data snapshot from the adk_spares_rma_demo app, with live Gemini
 * rationale + real token counts when GEMINI_API_KEY is set.
 *
 * Run:   node server.js          (PORT env var, default 8080 — Cloud Run sets it)
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { UNAI } = require("./engine.js");
const { enrichEvidence } = require("./llm.js");
const { buildAdkSparesRmaAdapters } = require("./adapters/adk_spares_rma_standalone.js");

const PORT = process.env.PORT || 8080;
const APP_PW = process.env.APP_PASSWORD === undefined ? "" : process.env.APP_PASSWORD;
const APP_WALL = APP_PW !== "";
const SESSION_TOKEN = crypto.randomBytes(24).toString("hex");
function isAuthed(req) {
  if (!APP_WALL) return true;
  const cookie = req.headers.cookie || "";
  const m = cookie.match(/(?:^|;\s*)spares_auth=([a-f0-9]+)/);
  return !!m && m[1] === SESSION_TOKEN;
}
const MIME = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css" };

const server = http.createServer((req, res) => {
  if (req.url === "/api/login" && req.method === "POST") {
    let body = ""; req.on("data", c => body += c); req.on("end", () => {
      let pw = ""; try { pw = JSON.parse(body || "{}").pw || ""; } catch (_) {}
      if (!APP_WALL || pw === APP_PW) {
        res.writeHead(200, { "Content-Type": "application/json", "Set-Cookie": `spares_auth=${SESSION_TOKEN}; HttpOnly; Path=/; SameSite=Strict` });
        return res.end(JSON.stringify({ ok: true }));
      }
      res.writeHead(401, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: false }));
    }); return;
  }
  if (req.url === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, wall: APP_WALL, gemini: !!process.env.GEMINI_API_KEY }));
  }
  if (!isAuthed(req) && req.url !== "/login.html") {
    if (req.url.startsWith("/api/")) { res.writeHead(401, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ ok: false, error: "sign in" })); }
    res.writeHead(302, { Location: "/login.html" }); return res.end();
  }
  if (req.url === "/api/run" && req.method === "POST") {
    (async () => {
      try {
        const { ANALYTICS, SAP_IBP, SAP_S4, SERVICENOW } = buildAdkSparesRmaAdapters();
        const out = new UNAI({ name: "UNAI" }).run("spares_planning_ibp", { ANALYTICS, SAP_IBP, SAP_S4, SERVICENOW });
        out.rationale = await enrichEvidence(out.evidence);
        if (out.rationale && out.rationale.used !== "template" && out.rationale.calls) {
          out.observability.liveTokens = { provider: out.rationale.provider, model: out.rationale.model,
            calls: out.rationale.calls, tokensIn: out.rationale.tokensIn, tokensOut: out.rationale.tokensOut,
            tokensTotal: out.rationale.tokensIn + out.rationale.tokensOut };
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(out));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      }
    })();
    return;
  }
  // static files
  let file = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const fp = path.join(__dirname, "public", path.normalize(file).replace(/^(\.\.[/\\])+/, ""));
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(fp)] || "text/plain" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`[spares-ibp] http://localhost:${PORT}`);
  console.log(`[spares-ibp] login wall: ${APP_WALL ? "ON" : "OFF (set APP_PASSWORD to enable)"} · gemini: ${process.env.GEMINI_API_KEY ? "configured" : "not set (template rationales)"}`);
});
