// ==========================================================================
// meeting_transcript_ingest.js — UNAI Multimodal Perception (L1 extension)
//
// Ingests meeting transcripts into the SAME EmbeddedVectorStore the
// Knowledge Assistant uses (knowledge_assistant.js) — the transcript half of
// multimodal_ingest.js's image/slide adapter. A meeting becomes MANY docs
// (one per time-windowed chunk, not one giant blob), each shaped like every
// other Knowledge Assistant source: { id, source, link, acl, text }, plus a
// timestamped deep-link back to the moment in the recording it came from.
//
// Two input paths:
//   1) TEXT transcript already in hand (.vtt / .srt / plain "Speaker: text"
//      lines) — the common case: Teams/Zoom/Otter.ai all export one of
//      these. Parsed for real, no model call needed.
//   2) RAW AUDIO — an ASR call (Whisper-shape /audio/transcriptions, one
//      org key via llm.js resolveConfig) turns it into the same cue shape
//      first. No ASR-capable key configured -> the file is still indexed
//      (by filename, flagged in meta) so ingestion never throws.
//
// Chunking: consecutive cues are grouped into ~90s / ~350-word windows (not
// one vector per whole meeting) so retrieval can cite WHEN something was
// said, and a reader can jump straight to that moment via the `#t=<sec>`
// deep-link on `link`.
// ==========================================================================
"use strict";
const fs = require("fs");
const path = require("path");
const { resolveConfig } = require("./llm.js");

const AUDIO_EXT = new Set([".mp3", ".wav", ".m4a", ".mp4", ".webm", ".ogg"]);
const TRANSCRIPT_EXT = new Set([".vtt", ".srt", ".txt", ...AUDIO_EXT]);

function parseTimeToSeconds(t) {
  const parts = String(t).trim().replace(",", ".").split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}
function fmtTime(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// --- WebVTT / SRT parser -----------------------------------------------------
// Cue blocks: optional id line, a "HH:MM:SS.mmm --> HH:MM:SS.mmm" timing line,
// then one or more text lines until a blank line. Speaker as `<v Name>text`
// (WebVTT) or a leading "Name:" (common in exported transcripts either way).
const TIMING_RE = /^\s*((?:\d{2}:)?\d{2}:\d{2}[.,]\d{3})\s*-->\s*((?:\d{2}:)?\d{2}:\d{2}[.,]\d{3})/;
function parseVtt(text) {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  const cues = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(TIMING_RE);
    if (m) {
      const start = parseTimeToSeconds(m[1]), end = parseTimeToSeconds(m[2]);
      i++;
      const textLines = [];
      while (i < lines.length && lines[i].trim() !== "") { textLines.push(lines[i]); i++; }
      const raw = textLines.join(" ").replace(/\s+/g, " ").trim();
      const vm = raw.match(/^<v\s+([^>]+)>\s*(.*)$/i) || raw.match(/^([A-Za-z][\w .'-]{0,40}):\s*(.*)$/);
      cues.push({ start, end, speaker: vm ? vm[1].trim() : "", text: vm ? vm[2].trim() : raw });
    } else { i++; }
  }
  return cues;
}

// --- Plain "[MM:SS] Speaker: text" / "Speaker: text" / bare-line transcript --
// No real timestamps in a bare line -> assign an incrementing pseudo-time
// (15s/line) purely so chunkCues() still groups it into sensible windows.
function parsePlainTranscript(text) {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n").map(l => l.trim()).filter(Boolean);
  let t = 0;
  return lines.map(line => {
    const timed = line.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*([A-Za-z][\w .'-]{0,40}):\s*(.*)$/);
    if (timed) { const start = parseTimeToSeconds(timed[1]); t = start; return { start, end: start, speaker: timed[2].trim(), text: timed[3].trim() }; }
    const spoken = line.match(/^([A-Za-z][\w .'-]{0,40}):\s*(.*)$/);
    const rec = spoken ? { start: t, end: t, speaker: spoken[1].trim(), text: spoken[2].trim() } : { start: t, end: t, speaker: "", text: line };
    t += 15;
    return rec;
  });
}

/** Group consecutive cues into ~maxSeconds / ~maxWords windows. */
function chunkCues(cues, { maxSeconds = 90, maxWords = 350 } = {}) {
  const out = [];
  let cur = null;
  for (const c of cues) {
    const words = (c.text || "").split(/\s+/).filter(Boolean).length;
    if (!cur || (c.start - cur.startSec > maxSeconds) || (cur.wordCount + words > maxWords)) {
      if (cur) out.push(cur);
      cur = { startSec: c.start, endSec: c.end, speakers: new Set(), lines: [], wordCount: 0 };
    }
    if (c.speaker) cur.speakers.add(c.speaker);
    cur.lines.push(c.speaker ? `${c.speaker}: ${c.text}` : c.text);
    cur.wordCount += words;
    cur.endSec = c.end;
  }
  if (cur) out.push(cur);
  return out.map(ch => ({ startSec: ch.startSec, endSec: ch.endSec, speakers: [...ch.speakers], text: ch.lines.join("\n") }));
}

/** Real ASR call (Whisper-shape /audio/transcriptions). Returns
 * {text, segments, provider, model} or null (no key / unsupported / failure) —
 * caller falls back to "indexed by filename only", same philosophy as the
 * vision path in multimodal_ingest.js. NOT exercised by the local demo below
 * (no audio fixture / ASR key in this environment) — wire a real key + audio
 * file to prove it live. */
async function transcribeAudio(buf, filename, overrideKey) {
  const cfg = resolveConfig(overrideKey);
  if (!cfg.ok) return null;
  const model = process.env.ASR_MODEL || "whisper-1";
  try {
    const form = new FormData();
    form.append("file", new Blob([buf]), filename);
    form.append("model", model);
    form.append("response_format", "verbose_json");   // asks for {text, segments:[{start,end,text}]}
    const res = await fetch(cfg.base.replace(/\/$/, "") + "/audio/transcriptions", {
      method: "POST", headers: { Authorization: `Bearer ${cfg.key}` }, body: form,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { text: data.text || "", segments: data.segments || null, provider: cfg.label, model };
  } catch (_) { return null; }
}

/**
 * One meeting file -> MANY canonical docs (one per time-windowed chunk),
 * each shaped like every other Knowledge Assistant source
 * ({id, source, link, acl, text}) plus a `#t=<sec>` deep-link and speaker/
 * time metadata.
 */
async function ingestTranscript({ filePath, title, link, acl, overrideKey, maxSeconds, maxWords } = {}) {
  const ext = path.extname(filePath).toLowerCase();
  const name = path.basename(filePath, ext);
  const docTitle = title || name;
  const baseLink = link || filePath;
  const baseAcl = acl || ["all"];

  let cues;
  if (AUDIO_EXT.has(ext)) {
    const buf = fs.readFileSync(filePath);
    const asr = await transcribeAudio(buf, path.basename(filePath), overrideKey);
    if (asr && asr.segments && asr.segments.length) cues = asr.segments.map(s => ({ start: s.start, end: s.end, speaker: "", text: (s.text || "").trim() }));
    else if (asr && asr.text) cues = [{ start: 0, end: 0, speaker: "", text: asr.text }];
    else return [{ id: name, source: `Meeting: ${docTitle}`, link: baseLink, acl: baseAcl,
      text: `(no ASR provider configured, or transcription failed — audio file "${path.basename(filePath)}" could not be transcribed)`,
      meta: { kind: "meeting", file: path.basename(filePath), captionSource: "none (no ASR key / call failed)" } }];
  } else {
    const raw = fs.readFileSync(filePath, "utf8");
    cues = (ext === ".vtt" || ext === ".srt") ? parseVtt(raw) : parsePlainTranscript(raw);
  }

  const chunks = chunkCues(cues, { maxSeconds, maxWords });
  if (!chunks.length) return [{ id: name, source: `Meeting: ${docTitle}`, link: baseLink, acl: baseAcl,
    text: `(transcript file "${path.basename(filePath)}" contained no parseable cues)`, meta: { kind: "meeting", error: "empty" } }];
  return chunks.map((ch, idx) => ({
    id: `${name}__${idx}`,
    source: `Meeting: ${docTitle} @ ${fmtTime(ch.startSec)}`,
    link: baseLink + (Number.isFinite(ch.startSec) ? `#t=${Math.floor(ch.startSec)}` : ""),
    acl: baseAcl,
    text: ch.text,
    meta: { kind: "meeting", title: docTitle, startSec: ch.startSec, endSec: ch.endSec, speakers: ch.speakers },
  }));
}

/** Source adapter with the SAME fetchDocuments() interface as
 * ImageSlideSource / MockSharePointSource — a folder of transcripts
 * (.vtt/.srt/.txt) or audio files. One bad/unreadable file is caught
 * per-file, not fatal to the batch. */
class MeetingTranscriptSource {
  constructor({ dir, acl, overrideKey, maxSeconds, maxWords } = {}) {
    this.dir = dir; this.acl = acl || ["all"]; this.overrideKey = overrideKey;
    this.maxSeconds = maxSeconds; this.maxWords = maxWords;
  }
  async fetchDocuments() {
    const files = fs.readdirSync(this.dir).filter(f => TRANSCRIPT_EXT.has(path.extname(f).toLowerCase()));
    const docs = [];
    for (const f of files) {
      const filePath = path.join(this.dir, f);
      try { docs.push(...await ingestTranscript({ filePath, acl: this.acl, overrideKey: this.overrideKey, maxSeconds: this.maxSeconds, maxWords: this.maxWords })); }
      catch (e) { docs.push({ id: f, source: `Meeting: ${f}`, link: filePath, acl: this.acl, text: `(failed to ingest: ${e.message})`, meta: { kind: "meeting", error: e.message } }); }
    }
    return docs;
  }
}

module.exports = { MeetingTranscriptSource, ingestTranscript, parseVtt, parsePlainTranscript, chunkCues, transcribeAudio, fmtTime };

// --- Local demo: node meeting_transcript_ingest.js [vttPath] -----------------
// Proves the full path on a real (fixture) transcript: parse -> time-windowed
// chunks -> indexed in the SAME EmbeddedVectorStore -> retrievable with a
// working #t=<sec> deep-link — the exact plumbing knowledge_assistant.js uses.
if (require.main === module) {
  (async () => {
    const { EmbeddedVectorStore } = require("./engine.js");
    const target = process.argv[2] || path.join(__dirname, "fixtures", "meetings", "disruption-response-review.vtt");
    console.log("Ingesting:", target);
    const cfg = resolveConfig();
    console.log("ASR key:", cfg.ok ? `configured via ${cfg.label} (only used for AUDIO input; this fixture is already text)` : "none set (fine — this fixture is a text .vtt, no ASR needed)");

    const docs = await ingestTranscript({ filePath: target, title: "Supplier Disruption Response Review", link: "https://meet.example.com/rec/abc123" });
    console.log(`\n--- Ingested ${docs.length} chunk(s) ---`);
    docs.forEach(d => console.log(`[${d.source}] speakers=${(d.meta.speakers || []).join(",")} link=${d.link}\n  ${d.text.replace(/\n/g, "\n  ")}\n`));

    const store = new EmbeddedVectorStore();
    store.upsertSync(docs.map(d => ({ id: d.id, source: d.source, text: d.text, tags: ["meeting"], link: d.link, acl: d.acl })));
    const hits = store.searchSync({ text: "why was the FG-1003 purchase order held for approval", terms: ["fg", "1003", "held", "approval", "human"], topK: 2 });
    console.log("--- Retrieval check (same EmbeddedVectorStore the Knowledge Assistant uses) ---");
    hits.forEach(h => console.log(`score ${h.score}  ${h.source}\n  ${h.text.replace(/\n/g, "\n  ")}`));
    if (!hits.length) console.log("no hit");
  })();
}
