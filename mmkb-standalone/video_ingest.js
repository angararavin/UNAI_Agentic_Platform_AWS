// ==========================================================================
// video_ingest.js — UNAI Multimodal Perception (L1 extension)
//
// Ingests video files into the SAME EmbeddedVectorStore the Knowledge
// Assistant uses (knowledge_assistant.js) — combining the OTHER two
// multimodal adapters instead of duplicating them:
//   - audio half: extract the audio track -> ASR -> time-windowed chunks,
//     reusing meeting_transcript_ingest.js's transcribeAudio/chunkCues so
//     retrieval behaves identically to a plain meeting recording.
//   - visual half: sample one frame every `frameIntervalSec` seconds -> the
//     SAME VLM caption+OCR call (and local-OCR fallback) multimodal_ingest.js
//     uses for images.
// Each transcript chunk's text is folded together with any frame caption/OCR
// whose timestamp falls inside that chunk's window, so ONE doc covers both
// what was said AND what was shown on screen at that moment — with a
// `#t=<sec>` deep-link back to it, same as meeting chunks.
//
// ffmpeg is required for frame/audio extraction — resolved lazily via the
// optional '@ffmpeg-installer/ffmpeg' dependency (bundles a static binary,
// no system install needed), falling back to a `ffmpeg` already on PATH.
// Neither available -> falls back to audio-only ingestion (video containers
// already transcribe fine via meeting_transcript_ingest.js's AUDIO_EXT path);
// visual frames are just skipped, flagged in meta — same graceful-degradation
// philosophy as the rest of this pipeline (a missing optional dependency
// narrows what gets indexed, never throws).
// ==========================================================================
"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");
const { captionAndOcr, localOcr } = require("./multimodal_ingest.js");
const { transcribeAudio, chunkCues, fmtTime, ingestTranscript } = require("./meeting_transcript_ingest.js");

const VIDEO_EXT = new Set([".mp4", ".mov", ".webm", ".mkv", ".avi"]);

// Resolved once per process, same lazy-require pattern as multimodal_ingest.js's
// optional tesseract.js.
let _ffmpegPath;
function ffmpegPath() {
  if (_ffmpegPath === undefined) {
    try { _ffmpegPath = require("@ffmpeg-installer/ffmpeg").path; }
    catch (_) {
      const probe = spawnSync(process.platform === "win32" ? "where" : "which", ["ffmpeg"]);
      _ffmpegPath = (probe.status === 0 && probe.stdout) ? String(probe.stdout).split(/\r?\n/)[0].trim() : null;
    }
  }
  return _ffmpegPath;
}
function runFfmpeg(args) {
  const bin = ffmpegPath();
  if (!bin) return null;
  const r = spawnSync(bin, args, { maxBuffer: 1024 * 1024 * 64 });
  return (r && r.status === 0) ? r : null;
}

/** Extracts the audio track to a temp 16kHz mono WAV (small + ASR-friendly). */
function extractAudioTrack(videoPath, tmpDir) {
  const out = path.join(tmpDir, "audio.wav");
  const r = runFfmpeg(["-y", "-i", videoPath, "-vn", "-ac", "1", "-ar", "16000", out]);
  return (r && fs.existsSync(out)) ? out : null;
}

/** Samples one frame every intervalSec seconds. Returns [{path, sec}]. */
// Real free-tier keys have a per-MINUTE rate limit, not just a per-call one --
// a long recording sampled every 20s can mean 40-50+ frames, and firing that
// many captionAndOcr calls back to back (even one at a time, no concurrency)
// blew straight through it on a real 60MB/~16min upload: every single call
// came back 429, and with only one provider/key configured there's nowhere
// to fail over to, so ALL of them silently degraded to "no describable
// frames". Capping the sampled frame count keeps a long video's total call
// count in the same ballpark as the short fixtures this pipeline was
// actually validated against, at the cost of coarser time coverage.
const MAX_FRAMES_PER_VIDEO = 12;
function extractFrames(videoPath, tmpDir, intervalSec) {
  const pattern = path.join(tmpDir, "frame_%04d.jpg");
  const r = runFfmpeg(["-y", "-i", videoPath, "-vf", `fps=1/${intervalSec}`, "-q:v", "3", pattern]);
  if (!r) return [];
  const files = fs.readdirSync(tmpDir).filter(f => /^frame_\d+\.jpg$/.test(f)).sort();
  let frames = files.map((f, idx) => ({ path: path.join(tmpDir, f), sec: idx * intervalSec }));
  if (frames.length > MAX_FRAMES_PER_VIDEO) {
    const step = frames.length / MAX_FRAMES_PER_VIDEO;
    frames = Array.from({ length: MAX_FRAMES_PER_VIDEO }, (_, i) => frames[Math.floor(i * step)]);
  }
  return frames;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * One video file -> MANY canonical docs (one per time-windowed chunk), each
 * shaped like every other Knowledge Assistant source ({id, source, link, acl,
 * text}) — text combines the spoken transcript for that window with any
 * on-screen visual caption/OCR from the same window.
 */
async function ingestVideo({ filePath, title, link, acl, overrideKey, frameIntervalSec = 20, maxSeconds, maxWords } = {}) {
  const name = path.basename(filePath, path.extname(filePath));
  const docTitle = title || name;
  const baseLink = link || filePath;
  const baseAcl = acl || ["all"];

  if (!ffmpegPath()) {
    // No ffmpeg at all — meeting_transcript_ingest.js already transcribes a
    // video container's audio track (it's in AUDIO_EXT), so reuse that
    // wholesale rather than duplicating the ASR call; visual frames are the
    // only thing lost, and that's flagged in meta so the UI can say so.
    const docs = await ingestTranscript({ filePath, title: docTitle, link, acl, overrideKey, maxSeconds, maxWords });
    docs.forEach(d => { d.source = d.source.replace(/^Meeting:/, "Video:"); d.meta = Object.assign({}, d.meta, { kind: "video", visualFrames: "skipped (ffmpeg not available)" }); });
    return docs;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "unai-video-"));
  try {
    // --- audio half ---
    let cues = [];
    const audioPath = extractAudioTrack(filePath, tmpDir);
    if (audioPath) {
      const asr = await transcribeAudio(fs.readFileSync(audioPath), "audio.wav", overrideKey);
      if (asr && asr.segments && asr.segments.length) cues = asr.segments.map(s => ({ start: s.start, end: s.end, speaker: "", text: (s.text || "").trim() }));
      else if (asr && asr.text) cues = [{ start: 0, end: 0, speaker: "", text: asr.text }];
    }
    const chunks = cues.length ? chunkCues(cues, { maxSeconds, maxWords }) : [];

    // --- visual half: same caption+OCR call, same fallback chain, as an image ---
    const frames = extractFrames(filePath, tmpDir, frameIntervalSec);
    const frameDocs = [];
    for (let i = 0; i < frames.length; i++) {
      const fr = frames[i];
      // Pace calls to this one configured key/provider -- see
      // MAX_FRAMES_PER_VIDEO's comment above; capping the count isn't enough
      // on its own when captionAndOcr is ALSO being called for other images
      // in the same ingest batch, so still space this video's own calls out.
      if (i > 0) await sleep(1500);
      const buf = fs.readFileSync(fr.path);
      let caption = "", ocrText = "";
      const vlm = await captionAndOcr(buf, "image/jpeg", overrideKey);
      if (vlm && (vlm.caption || vlm.ocrText)) { caption = vlm.caption; ocrText = vlm.ocrText; }
      else { const local = await localOcr(buf); if (local) ocrText = local; }   // covers both "no vlm" and "vlm rate-limited to empty"
      if (caption || ocrText) frameDocs.push({ sec: fr.sec, caption, ocrText });
    }

    // --- merge: fold each frame into whichever transcript chunk's time
    // window it falls inside; frames outside every window (or a silent
    // screen-recording with no transcript at all) become their own chunk ---
    let mergedChunks = chunks.map(ch => Object.assign({}, ch));
    const usedFrames = new Set();
    mergedChunks.forEach(ch => {
      frameDocs.filter(fd => fd.sec >= ch.startSec - frameIntervalSec / 2 && fd.sec <= ch.endSec + frameIntervalSec / 2)
        .forEach(fd => {
          usedFrames.add(fd);
          const visual = [fd.caption, fd.ocrText].filter(Boolean).join(" — ");
          if (visual) ch.text = (ch.text ? ch.text + "\n" : "") + `[On screen @ ${fmtTime(fd.sec)}]: ${visual}`;
        });
    });
    frameDocs.filter(fd => !usedFrames.has(fd)).forEach(fd => {
      const visual = [fd.caption, fd.ocrText].filter(Boolean).join(" — ");
      if (visual) mergedChunks.push({ startSec: fd.sec, endSec: fd.sec, speakers: [], text: `[On screen @ ${fmtTime(fd.sec)}]: ${visual}` });
    });
    mergedChunks.sort((a, b) => a.startSec - b.startSec);

    if (!mergedChunks.length) {
      // Text deliberately omits the filename -- see the matching note in
      // meeting_transcript_ingest.js's own ASR-failure placeholder.
      return [{ id: name, source: `Video: ${docTitle}`, link: baseLink, acl: baseAcl,
        text: `(this video has no transcript or frame captions indexed — no ASR/vision-capable model key is configured, or the video has neither speech nor legible on-screen content)`,
        meta: { kind: "video", framesSampled: frames.length, error: "empty" } }];
    }
    return mergedChunks.map((ch, idx) => ({
      id: `${name}__${idx}`,
      source: `Video: ${docTitle} @ ${fmtTime(ch.startSec)}`,
      link: baseLink + (Number.isFinite(ch.startSec) ? `#t=${Math.floor(ch.startSec)}` : ""),
      acl: baseAcl,
      text: ch.text,
      meta: { kind: "video", title: docTitle, startSec: ch.startSec, endSec: ch.endSec, speakers: ch.speakers || [], framesSampled: frames.length },
    }));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/** Source adapter, same fetchDocuments() interface as ImageSlideSource /
 * MeetingTranscriptSource — a folder of video files. One bad/unreadable file
 * is caught per-file, not fatal to the batch. */
class VideoSource {
  constructor({ dir, acl, overrideKey, frameIntervalSec, maxSeconds, maxWords } = {}) {
    this.dir = dir; this.acl = acl || ["all"]; this.overrideKey = overrideKey;
    this.frameIntervalSec = frameIntervalSec; this.maxSeconds = maxSeconds; this.maxWords = maxWords;
  }
  async fetchDocuments() {
    if (!fs.existsSync(this.dir)) return [];
    const files = fs.readdirSync(this.dir).filter(f => VIDEO_EXT.has(path.extname(f).toLowerCase()));
    const docs = [];
    for (const f of files) {
      const filePath = path.join(this.dir, f);
      try { docs.push(...await ingestVideo({ filePath, acl: this.acl, overrideKey: this.overrideKey, frameIntervalSec: this.frameIntervalSec, maxSeconds: this.maxSeconds, maxWords: this.maxWords })); }
      catch (e) { docs.push({ id: f, source: `Video: ${f}`, link: filePath, acl: this.acl, text: `(failed to ingest: ${e.message})`, meta: { kind: "video", error: e.message } }); }
    }
    return docs;
  }
}

module.exports = { VideoSource, ingestVideo, extractFrames, extractAudioTrack, ffmpegPath };

// --- Local demo: node video_ingest.js [videoPath] ----------------------------
// Proves the full path on a real (fixture) video: extract audio+frames ->
// transcribe + caption+OCR (or graceful fallback) -> merged, time-windowed
// chunks -> indexed in the SAME EmbeddedVectorStore -> retrievable with a
// working #t=<sec> deep-link — the exact plumbing knowledge_assistant.js uses.
if (require.main === module) {
  (async () => {
    const { EmbeddedVectorStore } = require("./engine.js");
    const { resolveConfig } = require("./llm.js");
    const target = process.argv[2] || path.join(__dirname, "fixtures", "videos", "demo-clip.mp4");
    console.log("Ingesting:", target);
    console.log("ffmpeg:", ffmpegPath() || "NOT FOUND -> audio-only fallback (via meeting_transcript_ingest.js)");
    const cfg = resolveConfig();
    console.log("Provider key:", cfg.ok ? `LIVE via ${cfg.label} (used for both ASR and vision calls)` : "none set -> local OCR fallback for frames, no transcript for audio");

    const docs = await ingestVideo({ filePath: target, title: "Demo Clip", link: "https://example.com/videos/demo-clip.mp4", frameIntervalSec: 5 });
    console.log(`\n--- Ingested ${docs.length} chunk(s) ---`);
    docs.forEach(d => console.log(`[${d.source}] link=${d.link}\n  ${d.text.replace(/\n/g, "\n  ")}\n`));

    const store = new EmbeddedVectorStore();
    store.upsertSync(docs.map(d => ({ id: d.id, source: d.source, text: d.text, tags: ["video"], link: d.link, acl: d.acl })));
    const hits = store.searchSync({ text: "what happens in this video", terms: ["video", "shows", "screen"], topK: 2 });
    console.log("--- Retrieval check (same EmbeddedVectorStore the Knowledge Assistant uses) ---");
    hits.forEach(h => console.log(`score ${h.score}  ${h.source}\n  ${h.text.replace(/\n/g, "\n  ")}`));
    if (!hits.length) console.log("no hit");
  })();
}
