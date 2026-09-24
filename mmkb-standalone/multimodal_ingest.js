// ==========================================================================
// multimodal_ingest.js — UNAI Multimodal Perception (L1 extension)
//
// Ingests images / slide diagrams into the SAME EmbeddedVectorStore the
// SharePoint Knowledge Assistant uses (knowledge_assistant.js), so retrieval
// and answerGrounded() never need to know a document came from a picture
// instead of a Word doc. Each image becomes ONE canonical doc, same shape as
// every other Knowledge Assistant source: { id, source, link, acl, text }.
//
// Pipeline per image:
//   1) VLM call (UNAI's one org key, via llm.js resolveConfig — OpenAI-
//      compatible gateway or a direct provider key) asks for BOTH a caption
//      and an OCR transcription in ONE structured JSON response (one call,
//      not two, for token economy).
//   2) No vision key configured -> fall back to a LOCAL OCR pass only
//      (optional 'tesseract.js' dependency, lazy-loaded the same way
//      server.js lazy-loads the optional 'pdf-parse' dependency), so
//      ingestion still produces searchable text without any provider key.
//   3) Neither available -> the doc is still indexed (by filename), so
//      fetchDocuments() never throws and one bad/unreachable image never
//      blocks the rest of the ingest batch.
//
// Configure the vision model with VISION_MODEL — set it explicitly, since
// not every provider's default text model is vision-capable (e.g. Mistral
// needs a "pixtral-*" id; OpenAI needs "gpt-4o*"/"gpt-4o-mini"; Gemini's
// "gemini-1.5-flash" is vision-capable out of the box).
// ==========================================================================
"use strict";
const fs = require("fs");
const path = require("path");
const { resolveConfig } = require("./llm.js");

const MIME_BY_EXT = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };

// Optional local OCR fallback — lazy-loaded, same pattern as server.js's
// optional 'pdf-parse' dependency: skip cleanly (npm i tesseract.js) if
// it isn't installed, rather than failing ingestion.
let _tesseract;
function _ocrLib() {
  if (_tesseract === undefined) { try { _tesseract = require("tesseract.js"); } catch (_) { _tesseract = null; } }
  return _tesseract;
}
async function localOcr(buf) {
  const t = _ocrLib();
  if (!t) return null;
  try {
    const { data } = await t.recognize(buf, "eng");
    const text = (data && data.text || "").trim();
    return text || null;
  } catch (_) { return null; }
}

function buildVisionPrompt() {
  return "You are the Perception layer of an autonomous business agent, reading an image or slide. " +
    'Return ONLY minified JSON: {"caption":"...","ocrText":"..."}. ' +
    '"caption" = one or two plain-English sentences describing what the image/diagram shows and its business meaning. ' +
    '"ocrText" = every piece of legible text visible in the image, verbatim, in reading order (empty string if none). ' +
    "Do not invent text that is not visible.";
}

function safeParseJson(s) {
  let t = String(s || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = t.indexOf("{"), end = t.lastIndexOf("}");
  if (start >= 0 && end >= start) t = t.slice(start, end + 1);
  try { return JSON.parse(t); } catch (_) { return null; }
}

/** One real vision call. Returns {caption, ocrText, provider, model, tokensIn, tokensOut} or null (no key / failure). */
async function captionAndOcr(imageBuf, mime, overrideKey) {
  const cfg = resolveConfig(overrideKey);
  if (!cfg.ok) return null;
  const model = process.env.VISION_MODEL || cfg.model;
  const b64 = Buffer.isBuffer(imageBuf) ? imageBuf.toString("base64") : imageBuf;
  const body = {
    model, temperature: 0.1, max_tokens: 500,
    messages: [{ role: "user", content: [
      { type: "text", text: buildVisionPrompt() },
      { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
    ] }],
  };
  try {
    const res = await fetch(cfg.base.replace(/\/$/, "") + "/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${cfg.key}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!text) return null;
    const parsed = safeParseJson(text);
    const u = data.usage || {};
    return { caption: (parsed && parsed.caption) || "", ocrText: (parsed && parsed.ocrText) || "",
      provider: cfg.label, model, tokensIn: u.prompt_tokens || 0, tokensOut: u.completion_tokens || 0 };
  } catch (_) { return null; }
}

/**
 * One image/slide file -> one canonical doc, same shape every other
 * Knowledge Assistant source produces ({id, source, link, acl, text}).
 */
async function ingestImage({ filePath, id, acl, link, overrideKey } = {}) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_BY_EXT[ext] || "image/png";
  const name = path.basename(filePath);

  let caption = "", ocrText = "";
  const meta = { kind: "image", file: name, captionSource: "none" };
  const vlm = await captionAndOcr(buf, mime, overrideKey);
  if (vlm) {
    caption = vlm.caption; ocrText = vlm.ocrText;
    Object.assign(meta, { captionSource: vlm.provider, model: vlm.model, tokensIn: vlm.tokensIn, tokensOut: vlm.tokensOut });
  } else {
    const local = await localOcr(buf);
    if (local) { ocrText = local; meta.captionSource = "local-ocr (tesseract.js)"; }
    else { meta.captionSource = "none (no vision key configured, and tesseract.js not installed — indexed by filename only)"; }
  }
  const text = [caption, ocrText].filter(Boolean).join("\n\n") ||
    `(no vision model or OCR available — image "${name}" indexed by filename only)`;
  return { id: id || name, source: name, link: link || filePath, acl: acl || ["all"], text, meta };
}

/** Source adapter with the SAME fetchDocuments() interface as
 * MockSharePointSource / GraphSharePointSource (knowledge_assistant.js) —
 * a folder of images/slides, so it drops straight into KnowledgeAssistant's
 * `source` option, or merges alongside SharePoint docs in a multi-source
 * ingest. One bad/unreadable file is caught per-file, not fatal to the batch.
 */
class ImageSlideSource {
  constructor({ dir, acl, overrideKey } = {}) {
    this.dir = dir; this.acl = acl || ["all"]; this.overrideKey = overrideKey;
  }
  async fetchDocuments() {
    const files = fs.readdirSync(this.dir).filter(f => MIME_BY_EXT[path.extname(f).toLowerCase()]);
    const docs = [];
    for (const f of files) {
      const filePath = path.join(this.dir, f);
      try { docs.push(await ingestImage({ filePath, acl: this.acl, overrideKey: this.overrideKey })); }
      catch (e) { docs.push({ id: f, source: f, link: filePath, acl: this.acl, text: `(failed to ingest: ${e.message})`, meta: { kind: "image", error: e.message } }); }
    }
    return docs;
  }
}

module.exports = { ImageSlideSource, ingestImage, captionAndOcr, localOcr };

// --- Local demo: node multimodal_ingest.js [imagePath] -----------------------
// Proves the full path: real file -> caption+OCR (or graceful fallback) ->
// indexed in the SAME EmbeddedVectorStore -> retrievable by semantic search —
// not a special-cased demo, the exact plumbing knowledge_assistant.js uses.
if (require.main === module) {
  (async () => {
    const { EmbeddedVectorStore } = require("./engine.js");
    const target = process.argv[2] || path.join(__dirname, "..", "assets", "slide-1.jpg");
    console.log("Ingesting:", target);
    const cfg = resolveConfig();
    console.log("Vision key:", cfg.ok
      ? `LIVE via ${cfg.label} (model: ${process.env.VISION_MODEL || cfg.model})`
      : "none set -> local OCR fallback (or filename-only if tesseract.js isn't installed)");

    const doc = await ingestImage({ filePath: target });
    console.log("\n--- Ingested doc ---");
    console.log("source:", doc.source);
    console.log("captionSource:", doc.meta.captionSource);
    console.log("text:\n" + doc.text);

    const store = new EmbeddedVectorStore();
    store.upsertSync([{ id: doc.id, source: doc.source, text: doc.text, tags: ["image", "slide"], link: doc.link, acl: doc.acl }]);
    const hits = store.searchSync({ text: "what does this slide show", terms: ["slide", "show", "diagram"], topK: 1 });
    console.log("\n--- Retrieval check (same EmbeddedVectorStore the Knowledge Assistant uses) ---");
    console.log(hits.length ? `found "${doc.source}" via vector search (score ${hits[0].score})` : "no hit");
  })();
}
