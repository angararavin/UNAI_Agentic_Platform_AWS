// ==========================================================================
// office_ingest.js — UNAI Multimodal Perception (L1 extension)
//
// Best-effort text extraction for uploaded Office files (.pptx/.docx/.xlsx)
// so they're queryable through the SAME Multimodal Knowledge Assistant as
// images/video/meetings, without a live SharePoint connection. Both formats
// are just a ZIP of XML parts, so this is a minimal self-contained ZIP
// reader (Node has no built-in one) + a generic "strip tags, keep text"
// extractor — not a full Office parser, but enough to make real slide/
// paragraph/cell text retrievable. PDFs reuse the already-available
// pdf-parse package instead of this ZIP path.
// ==========================================================================
"use strict";
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// ---- Minimal ZIP reader (stored + deflate only, which covers Office files) ----
// Office produces a plain, non-split, non-encrypted ZIP -- no need for a full
// zip64 / spanned-archive implementation here.
function readZipEntries(buf) {
  const EOCD_SIG = 0x06054b50, CEN_SIG = 0x02014b50, LOC_SIG = 0x04034b50;
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) { if (buf.readUInt32LE(i) === EOCD_SIG) { eocd = i; break; } }
  if (eocd < 0) throw new Error("not a zip (no EOCD record found)");
  const entryCount = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  const entries = [];
  let p = cdOffset;
  for (let i = 0; i < entryCount; i++) {
    if (buf.readUInt32LE(p) !== CEN_SIG) break;
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    entries.push({ name, method, compSize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries.map(e => {
    if (buf.readUInt32LE(e.localOffset) !== LOC_SIG) return { name: e.name, data: null };
    const nameLen = buf.readUInt16LE(e.localOffset + 26);
    const extraLen = buf.readUInt16LE(e.localOffset + 28);
    const dataStart = e.localOffset + 30 + nameLen + extraLen;
    const raw = buf.subarray(dataStart, dataStart + e.compSize);
    let data;
    try { data = e.method === 0 ? raw : zlib.inflateRawSync(raw); }
    catch (_) { data = null; }
    return { name: e.name, data };
  });
}

// Generic "visible text only" extractor: drop every tag, decode the handful
// of XML entities that show up in real documents, collapse whitespace. Works
// for both pptx run text (<a:t>...</a:t>) and docx paragraph text (<w:t>...
// </w:t>) since neither nests further tags inside the text itself.
function stripTags(xml) {
  return xml
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPptx(entries) {
  const slideRe = /^ppt\/slides\/slide(\d+)\.xml$/;
  const slides = entries
    .map(e => { const m = slideRe.exec(e.name); return m && e.data ? { n: Number(m[1]), text: stripTags(e.data.toString("utf8")) } : null; })
    .filter(Boolean)
    .sort((a, b) => a.n - b.n);
  return slides.map(s => `Slide ${s.n}: ${s.text}`).join("\n\n");
}
function extractDocx(entries) {
  const doc = entries.find(e => e.name === "word/document.xml");
  return doc && doc.data ? stripTags(doc.data.toString("utf8")) : "";
}
function extractXlsx(entries) {
  // Cell text in xlsx is indirected through a shared-strings table for any
  // non-numeric cell -- good enough for a best-effort "what's in this sheet"
  // extraction without fully modeling rows/columns/formulas.
  const shared = entries.find(e => e.name === "xl/sharedStrings.xml");
  if (!shared || !shared.data) return "";
  return stripTags(shared.data.toString("utf8"));
}

/** Best-effort text extraction for an uploaded Office file. Never throws --
 * an unrecognized or corrupt file just yields empty text (same graceful-
 * degradation convention as the rest of the multimodal pipeline). */
function extractOfficeText(buf, filename) {
  const ext = path.extname(filename).toLowerCase();
  if (![".pptx", ".docx", ".xlsx"].includes(ext)) return "";
  try {
    const entries = readZipEntries(buf);
    if (ext === ".pptx") return extractPptx(entries);
    if (ext === ".docx") return extractDocx(entries);
    if (ext === ".xlsx") return extractXlsx(entries);
  } catch (_) { /* not a valid zip, or an unexpected internal layout -- skip */ }
  return "";
}

// ---- fetchDocuments()-shaped source for uploaded documents (pptx/docx/xlsx/pdf/txt/md) ----
// Mirrors ImageSlideSource/VideoSource's own "scan a directory" convention so
// it drops into the same MultiSource list in buildMmkb() with no special-casing.
const DOC_EXT = new Set([".pptx", ".docx", ".xlsx", ".pdf", ".txt", ".md"]);
class DocumentUploadSource {
  constructor({ dir, acl } = {}) { this.dir = dir; this.acl = acl || ["all"]; }
  async fetchDocuments() {
    let files = [];
    try { files = fs.readdirSync(this.dir).filter(f => DOC_EXT.has(path.extname(f).toLowerCase())); } catch (_) { return []; }
    const docs = [];
    for (const f of files) {
      const filePath = path.join(this.dir, f);
      const ext = path.extname(f).toLowerCase();
      let text = "", error = null;
      try {
        const buf = fs.readFileSync(filePath);
        if (ext === ".pdf") {
          const pdfParse = require("pdf-parse");
          text = (await pdfParse(buf)).text || "";
        } else if (ext === ".txt" || ext === ".md") {
          text = buf.toString("utf8");
        } else {
          text = extractOfficeText(buf, f);
        }
      } catch (e) { error = e.message; }
      docs.push({
        id: "upload_" + f, source: f, link: filePath, acl: this.acl,
        text: text || (error ? `(failed to extract text: ${error})` : "(no extractable text found in this file)"),
        meta: { kind: "upload", ext, captionSource: ext === ".pdf" ? "pdf-parse" : (DOC_EXT.has(ext) ? "zip+xml text extraction" : "plain text") },
      });
    }
    return docs;
  }
}

module.exports = { extractOfficeText, DocumentUploadSource };
