// ==========================================================================
// server.js — Token-Economics Knowledge Assistant (standalone)
//
// A single-purpose spin-off of UNAI Studio's Multimodal Knowledge Assistant:
// same real retrieval + real token-measurement engine (knowledge_assistant.js,
// engine.js, llm.js/gateway.js), stripped of every other UNAI Studio tab/
// feature and served behind one minimal page whose only job is to make the
// token economics of "retrieve top-5 chunks" vs. "stuff the whole corpus into
// the prompt" legible per-query and cumulatively. No login wall, no SQLite,
// no agent playground — just index -> ask -> see the real numbers.
// ==========================================================================
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const { resolveConfig, narrateOne } = require("./llm.js");

const PORT = process.env.PORT || 3300;

// ---- Knowledge Assistant: SharePoint-style docs + images/slides + meeting
// transcript + video fixtures + anything uploaded through this app's own
// upload button. Built lazily, cached for the process lifetime. -------------
let MMKB = null;
function buildMmkb() {
  const { KnowledgeAssistant, MockSharePointSource, MultiSource } = require("./knowledge_assistant.js");
  const { ImageSlideSource } = require("./multimodal_ingest.js");
  const { MeetingTranscriptSource } = require("./meeting_transcript_ingest.js");
  const { VideoSource } = require("./video_ingest.js");
  const { DocumentUploadSource } = require("./office_ingest.js");
  return new KnowledgeAssistant({
    source: new MultiSource([
      new MockSharePointSource(),
      new ImageSlideSource({ dir: path.join(__dirname, "assets"), acl: ["all"] }),
      new MeetingTranscriptSource({ dir: path.join(__dirname, "fixtures", "meetings"), acl: ["all"] }),
      new VideoSource({ dir: path.join(__dirname, "fixtures", "videos"), acl: ["all"] }),
      new DocumentUploadSource({ dir: path.join(__dirname, "fixtures", "uploads"), acl: ["all"] }),
    ]),
  });
}

// ---- Session-wide LLM key, same auto-detect-by-prefix convention as UNAI
// Studio's /api/set-key, trimmed to just the providers this standalone app
// needs to support. Stored in-process only (never written to disk). --------
function detectProvider(key) {
  if (/^sk-or-/.test(key))  return { base: "https://openrouter.ai/api/v1",                              provider: "openrouter", model: "mistralai/mistral-small" };
  if (/^gsk_/.test(key))    return { base: "https://api.groq.com/openai/v1",                            provider: "groq",       model: "llama-3.1-8b-instant" };
  if (/^AIza/.test(key))    return { base: "https://generativelanguage.googleapis.com/v1beta/openai",   provider: "gemini",     model: "gemini-3.6-flash" };
  if (/^sk-/.test(key))     return { base: "https://api.openai.com/v1",                                 provider: "openai",     model: "gpt-4o-mini" };
  return { base: "https://api.mistral.ai/v1", provider: "mistral", model: "mistral-small-latest" };
}

const MIME = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".ico": "image/x-icon" };

function sendJson(res, code, obj) { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); }
function readBody(req) { return new Promise(resolve => { let b = ""; req.on("data", c => b += c); req.on("end", () => resolve(b)); }); }

const server = http.createServer((req, res) => {
  const urlPath = req.url.split("?")[0];

  if (urlPath === "/api/health") {
    const cfg = resolveConfig();
    return sendJson(res, 200, { ok: true, keySet: cfg.ok, provider: cfg.ok ? cfg.label : null, model: cfg.ok ? cfg.model : null });
  }

  // Set/replace the one model key this process uses for every answer + a
  // live one-line test call, so the UI can confirm it actually works.
  if (urlPath === "/api/set-key" && req.method === "POST") {
    readBody(req).then(async body => {
      let key = ""; try { key = String(JSON.parse(body || "{}").key || "").trim(); } catch (_) {}
      if (!key) return sendJson(res, 400, { ok: false, error: "provide a key" });
      const det = detectProvider(key);
      process.env.GATEWAY_API_KEY = key;
      process.env.GATEWAY_BASE_URL = det.base;
      process.env.GATEWAY_MODEL = det.model;
      process.env.GATEWAY_PROVIDER = det.provider;
      const cfg = resolveConfig();
      const ev = { decision: "connection test", confidence: 0.9, uncertainty: "+/-10%", threshold: 0.85, attribution: [{ name: "test", share: 1 }], autonomous: true };
      let ok = false, sample = "", errDetail = "";
      try { const r = await narrateOne(ev, cfg); sample = r ? (typeof r === "string" ? r : (r.text || "")) : ""; ok = !!sample; }
      catch (e) { errDetail = (e && e.message) || String(e); }
      sendJson(res, 200, { ok, provider: det.provider, model: det.model, sample: sample.slice(0, 80),
        reason: ok ? null : `Key saved, but the test call failed: ${errDetail || "no error detail"}. It will still be used on the next question.` });
    });
    return;
  }

  // Upload a local file (video/image/pptx/docx/xlsx/pdf/txt/md) to be indexed
  // alongside the bundled samples — no live SharePoint connection needed.
  if (urlPath === "/api/mmkb/upload" && req.method === "POST") {
    readBody(req).then(body => {
      try {
        let j = {}; try { j = JSON.parse(body || "{}"); } catch (_) {}
        const filename = String(j.filename || "").replace(/[\\/]/g, "_").trim();
        const dataBase64 = String(j.dataBase64 || "");
        if (!filename || !dataBase64) return sendJson(res, 400, { ok: false, error: "provide filename and dataBase64" });
        const ext = path.extname(filename).toLowerCase();
        const VIDEO_EXT = new Set([".mp4", ".mov", ".webm", ".mkv", ".avi"]);
        const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
        const DOC_EXT = new Set([".pptx", ".docx", ".xlsx", ".pdf", ".txt", ".md"]);
        let destDir;
        if (VIDEO_EXT.has(ext)) destDir = path.join(__dirname, "fixtures", "videos");
        else if (IMAGE_EXT.has(ext)) destDir = path.join(__dirname, "assets");
        else if (DOC_EXT.has(ext)) destDir = path.join(__dirname, "fixtures", "uploads");
        else return sendJson(res, 400, { ok: false, error: `Unsupported file type "${ext}". Supported: video, image, pptx/docx/xlsx/pdf/txt/md.` });
        fs.mkdirSync(destDir, { recursive: true });
        const buf = Buffer.from(dataBase64, "base64");
        fs.writeFileSync(path.join(destDir, filename), buf);
        sendJson(res, 200, { ok: true, filename, bytes: buf.length, note: "Uploaded — click \"Build / rebuild index\" to index it." });
      } catch (e) { sendJson(res, 200, { ok: false, error: e.message }); }
    });
    return;
  }

  if (urlPath === "/api/mmkb/ingest" && req.method === "POST") {
    (async () => {
      try {
        if (!MMKB) MMKB = buildMmkb();
        const r = await MMKB.ingest();
        const docs = Object.values(MMKB._byId).map(d => ({ id: d.id, source: d.source, kind: (d.meta && d.meta.kind) || "sharepoint" }));
        sendJson(res, 200, { ok: true, indexed: r.indexed, docs });
      } catch (e) { sendJson(res, 200, { ok: false, error: e.message }); }
    })();
    return;
  }

  if (urlPath === "/api/mmkb/reset-economics" && req.method === "POST") {
    if (!MMKB) MMKB = buildMmkb();
    MMKB.resetEconomics();
    return sendJson(res, 200, { ok: true });
  }

  if (urlPath === "/api/mmkb/ask" && req.method === "POST") {
    readBody(req).then(async body => {
      try {
        let j = {}; try { j = JSON.parse(body || "{}"); } catch (_) {}
        const q = String(j.question || "").trim();
        if (!q) return sendJson(res, 400, { ok: false, error: "provide a question" });
        if (!MMKB) MMKB = buildMmkb();
        const r = await MMKB.ask(q, { id: "user", groups: ["all", "finance"] });
        sendJson(res, 200, { ok: true, ...r });
      } catch (e) { sendJson(res, 200, { ok: false, error: e.message }); }
    });
    return;
  }

  // ---- static files (index.html + assets/) ----
  let filePath = urlPath === "/" ? "/index.html" : urlPath;
  filePath = path.join(__dirname, path.normalize(filePath).replace(/^(\.\.[\/\\])+/, ""));
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Token-Economics Knowledge Assistant running at http://localhost:${PORT}`);
});
