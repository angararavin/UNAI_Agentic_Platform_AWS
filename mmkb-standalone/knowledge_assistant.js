// ==========================================================================
// knowledge_assistant.js — UNAI SharePoint Knowledge Assistant
//
// Re-platforms a personal-Copilot SharePoint Q&A agent onto the UNAI shared
// runtime, so ALL users hit UNAI's org-level model key (not one person's
// Copilot seat) and answers are permission-trimmed, grounded and cited.
//
// Built on UNAI's real plumbing:
//   - retrieval  -> EmbeddedVectorStore (engine.js), with per-user ACL trimming
//   - answering  -> answerGrounded (llm.js), UNAI's model-neutral gateway
//                   (one org key: GATEWAY_API_KEY / Azure OpenAI / Mistral),
//                   with prompt-cache token savings; deterministic fallback
//                   when no key is set ("modeled" mode).
//
// The SharePoint source is behind a swappable interface: MockSharePointSource
// for local runs; GraphSharePointSource (stub below) for production — fill in
// the Microsoft Graph calls + delegated auth per the build guide.
// ==========================================================================
const { EmbeddedVectorStore } = require("./engine.js");
const { answerGrounded, resolveConfig } = require("./llm.js");
const gw = require("./gateway.js");   // costUsd(model, tokIn, tokOut) -- same rate table the AI Gateway panel uses

// --- Document shape: { id, source (display name), link, acl:[groups], text } ---
// acl "all" = every authenticated user; otherwise an Entra ID group name.
const MERCURY_DOCS = [
  { id: "rasci", source: "Project Mercury 2.0_RASCI Matrix.pptx",
    link: "https://monster.sharepoint.com/sites/Mercury/Shared%20Documents/RASCI.pptx", acl: ["all"],
    text: "RASCI matrix for Project Mercury 2.0. The RM Planner is Responsible for building and maintaining the replenishment plan, running weekly net-requirements, and raising exceptions; Accountable to the S&OP lead; Consulted with Supply Planning and Procurement; Informed to the Control Tower. The Demand Planner owns the consensus forecast." },
  { id: "bst", source: "Mercury_BST_Definition.docx",
    link: "https://monster.sharepoint.com/sites/Mercury/Shared%20Documents/BST.docx", acl: ["all"],
    text: "BST stands for Business Standard Template. In Project Mercury it is the standardized data and process template that every region adopts so plans, master data and KPIs are comparable across markets. Deviations require a documented exception approved by the regional lead." },
  { id: "sop", source: "Mercury_SOP_ReplenishmentProcess.docx",
    link: "https://monster.sharepoint.com/sites/Mercury/Shared%20Documents/SOP.docx", acl: ["all"],
    text: "Standard operating procedure for replenishment. Buffers are set with DDMRP; the RM Planner reviews red-zone breaches daily and confirms transfer orders before cutoff." },
  { id: "budget", source: "Mercury_Budget_FY26_CONFIDENTIAL.xlsx",
    link: "https://monster.sharepoint.com/sites/Mercury/Finance/Budget_FY26.xlsx", acl: ["finance"],
    text: "Confidential FY26 program budget for Project Mercury: total ~$4.2M across licenses, integration and change management." },
];

class MockSharePointSource {
  async fetchDocuments() { return MERCURY_DOCS; }
}

// Production connector — Microsoft Graph. Fill in tenant values (see build guide).
//
// cfg:
//   sitePath     "contoso.sharepoint.com:/sites/Mercury"   (host:/sites/{name})
//   tenantId, clientId, clientSecret                       app-only (client credentials) — for scheduled ingest
//   getToken()   async () => "<user delegated token>"      delegated — retrieval runs AS the user (Graph trims)
//   extractText  async (buffer, filename) => "plain text"  pluggable Office/PDF extractor (see note)
//   folderPath   optional sub-path within the library
class GraphSharePointSource {
  constructor(cfg = {}) { Object.assign(this, cfg); this.graph = "https://graph.microsoft.com/v1.0"; }
  async _token() {
    if (this.getToken) return this.getToken();                       // delegated — caller supplies the user's token
    const body = new URLSearchParams({ client_id: this.clientId, client_secret: this.clientSecret,
      scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" });
    const r = await fetch(`https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`, { method: "POST", body });
    const j = await r.json(); if (!j.access_token) throw new Error("Graph token: " + JSON.stringify(j));
    return j.access_token;
  }
  async _get(path, token) {
    const r = await fetch(this.graph + path, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`Graph ${r.status} on ${path}`); return r.json();
  }
  // Map each file's SharePoint permissions to acl groups. "all" = whole org.
  async _acl(driveId, itemId, token) {
    try {
      const p = await this._get(`/drives/${driveId}/items/${itemId}/permissions`, token);
      const groups = [];
      for (const perm of p.value || []) {
        const g = perm.grantedToV2 && perm.grantedToV2.group;
        if (g && (g.displayName || g.id)) groups.push(g.displayName || g.id);
        if (perm.link && perm.link.scope === "organization") groups.push("all");
      }
      return groups.length ? [...new Set(groups)] : ["all"];
    } catch (_) { return ["all"]; }   // fail closed to org-wide only if you trust the library; else return []
  }
  async fetchDocuments() {
    const token = await this._token();
    const site = await this._get(`/sites/${this.sitePath}`, token);
    const drives = await this._get(`/sites/${site.id}/drives`, token);
    const drive = drives.value[0];
    const root = this.folderPath ? `/drives/${drive.id}/root:/${this.folderPath}:/children` : `/drives/${drive.id}/root/children`;
    const items = await this._get(root, token);
    const docs = [];
    for (const it of items.value) {
      if (it.folder) continue;                                       // (recurse for nested folders in production)
      let text = "";
      try {
        const buf = await (await fetch(`${this.graph}/drives/${drive.id}/items/${it.id}/content`,
          { headers: { Authorization: `Bearer ${token}` } })).arrayBuffer();
        text = this.extractText ? await this.extractText(Buffer.from(buf), it.name) : "";
      } catch (_) { /* skip unreadable file */ }
      docs.push({ id: it.id, source: it.name, link: it.webUrl, acl: await this._acl(drive.id, it.id, token), text });
    }
    return docs;
  }
}

// Combines several fetchDocuments()-shaped sources (SharePoint, images/slides
// via multimodal_ingest.js's ImageSlideSource, and — once built — meeting
// transcripts) into ONE source, so a KnowledgeAssistant indexes all of them
// under one call to ingest(). Each underlying source stays swappable/mockable
// on its own; this just fans out fetchDocuments() and concatenates the docs.
class MultiSource {
  constructor(sources) { this.sources = sources || []; }
  // Sequential, not Promise.all -- every image/video source here makes real
  // VLM caption/OCR calls against the SAME one configured gateway key, which
  // has its own rate limit. Running them all concurrently meant a big video
  // (48 frame-caption calls in a tight loop) competed with 20+ image sources
  // firing at the exact same time, and consistently lost: every one of its
  // calls got rate-limited and silently fell through to "no describable
  // content" -- reproducible on a real 60MB upload, not a one-off. An
  // isolated call to just that video's own fetchDocuments() succeeded every
  // time, confirming the content and the calls were fine; only the
  // concurrent contention was the problem. Slower overall, but every source
  // now gets the key to itself.
  async fetchDocuments() {
    const lists = [];
    for (const s of this.sources) { lists.push(await s.fetchDocuments().catch(() => [])); }
    return lists.flat();
  }
}

const STOP = new Set(["the","a","an","of","for","and","or","to","in","is","are","what","who","how","me","show","find","where"]);
const terms = q => (q.toLowerCase().match(/[a-z0-9]+/g) || []).filter(w => w.length > 2 && !STOP.has(w));

// Intent: is the user asking FOR a document (return link) or a QUESTION (answer)?
function wantsDocument(q) {
  const doc = /\b(show|find|open|link|document|file|deck|slide|send me|where is|get me|download)\b/i.test(q);
  const ask = /\b(what|who|how|why|when|which|explain|responsib|define|meaning|summar)\b/i.test(q);
  return doc && !ask;
}

class KnowledgeAssistant {
  constructor({ source, store } = {}) {
    this.source = source || new MockSharePointSource();
    this.store = store || new EmbeddedVectorStore();
    this._byId = {}; this.indexed = false;
    // Running session totals for the token-economics report (see ask()) --
    // real tokens actually billed on the retrieval side vs. an estimate of
    // what stuffing the WHOLE indexed corpus into every prompt would have
    // cost instead of just the top-5 retrieved chunks. Resets with the
    // process, same convention as the rest of this app's in-memory counters.
    this.economics = { queries: 0, tokensIn: 0, tokensOut: 0, costUsd: 0, retrievalContextTokens: 0, fullCorpusContextTokens: 0 };
  }
  async ingest() {
    const docs = await this.source.fetchDocuments();
    await this.store.upsert(docs.map(d => ({ id: d.id, source: d.source, text: d.text, tags: terms(d.source), link: d.link, acl: d.acl })));
    this._byId = Object.fromEntries(docs.map(d => [d.id, d]));
    this.indexed = true;
    return { indexed: docs.length };
  }
  // Zeroes the running economics counters -- e.g. the UI's "Reset session"
  // button, so a demo/testing round of questions (mine or anyone else's on
  // this same server process) doesn't silently inflate what someone else
  // sees as "this session"'s numbers. Does NOT touch the index itself.
  resetEconomics() { this.economics = { queries: 0, tokensIn: 0, tokensOut: 0, costUsd: 0, retrievalContextTokens: 0, fullCorpusContextTokens: 0 }; }
  _permitted(doc, user) {
    const acl = doc.acl || [];
    return acl.includes("all") || acl.some(g => (user.groups || []).includes(g));
  }
  // Main entry: answer a query AS a specific user (permission-trimmed).
  async ask(query, user = { id: "anon", groups: [] }) {
    if (!this.indexed) await this.ingest();
    const denied = Object.values(this._byId).filter(d => !this._permitted(d, user)).map(d => d.id);
    const hits = this.store.searchSync({ text: query, terms: terms(query), topK: 5, exclude: denied });
    if (!hits.length) {
      return { type: "none", render: "I couldn't find anything you have access to on that. Try rephrasing, or request access if you expect a document here." };
    }
    // Document request -> return the link (RESPONSE PRIORITY rule).
    if (wantsDocument(query)) {
      const top = this._byId[hits[0].id];
      return { type: "document", source: top.source,
        render: `📄 Document Name: ${top.source}\n🔗 Link: ${top.link}` };
    }
    // Question -> grounded answer + source name(s), links removed from the body.
    const context = hits.map(h => `[${this._byId[h.id].source}]\n${h.text}`).join("\n\n");
    const cfg = resolveConfig();               // UNAI's ORG key (GATEWAY_API_KEY / Azure / Mistral)
    let body, grounded = false, provider = "modeled", real = null, groundingFailure = null;
    if (cfg.ok) {
      const r = await answerGrounded(query, context, cfg).catch(e => { groundingFailure = "threw: " + e.message; return null; });
      if (r && r.content) { body = stripUrls(r.content).trim(); grounded = true; provider = r.provider || cfg.label; real = r; }
      else if (r) groundingFailure = "empty content, tried: " + (r.tried || []).join(", ");
    }
    if (!body) body = extractive(hits, this._byId, query);   // deterministic fallback (no key / offline)
    const sources = hits.slice(0, 3).map(h => this._byId[h.id].source);

    // ---- Token economics: real cost of targeted retrieval vs. an estimate
    // of naively stuffing the WHOLE indexed corpus into every prompt instead
    // of just the top-5 chunks the vector search actually picked. Character
    // count / 4 is the same rough tokens-per-char convention used elsewhere
    // in this app when no real tokenizer is on hand -- it's an ESTIMATE for
    // the naive side; the retrieval side uses the REAL billed tokensIn/Out
    // from the actual call whenever one happened (grounded === true).
    const CHARS_PER_TOKEN = 4;
    const retrievalContextTokensEst = Math.round(context.length / CHARS_PER_TOKEN);
    const fullCorpusChars = Object.values(this._byId).reduce((sum, d) => sum + (d.text || "").length, 0);
    const fullCorpusContextTokensEst = Math.round(fullCorpusChars / CHARS_PER_TOKEN);
    const realTokensIn = real ? (real.tokensIn || 0) : 0;
    const realTokensOut = real ? (real.tokensOut || 0) : 0;
    const model = (real && real.model) || cfg.model || null;
    const costUsd = grounded ? gw.costUsd(model, realTokensIn, realTokensOut) : 0;
    // Naive tokensIn = the real call's input, minus the (compressed) context
    // it actually sent, plus what the FULL corpus would have added instead --
    // isolates the retrieval-vs-naive delta to just the context size, not the
    // fixed system-prompt/question overhead both sides share equally.
    const naiveTokensIn = grounded ? Math.max(realTokensIn, realTokensIn - retrievalContextTokensEst + fullCorpusContextTokensEst) : fullCorpusContextTokensEst;
    const naiveCostUsd = grounded ? gw.costUsd(model, naiveTokensIn, realTokensOut) : 0;
    const contextSavingsPct = fullCorpusContextTokensEst ? Math.round(100 * (fullCorpusContextTokensEst - retrievalContextTokensEst) / fullCorpusContextTokensEst) : 0;

    this.economics.queries += 1;
    this.economics.tokensIn += realTokensIn;
    this.economics.tokensOut += realTokensOut;
    this.economics.costUsd += costUsd;
    this.economics.retrievalContextTokens += retrievalContextTokensEst;
    this.economics.fullCorpusContextTokens += fullCorpusContextTokensEst;
    const avgContextSavingsPct = this.economics.fullCorpusContextTokens
      ? Math.round(100 * (this.economics.fullCorpusContextTokens - this.economics.retrievalContextTokens) / this.economics.fullCorpusContextTokens) : 0;

    const economics = {
      measured: grounded,   // false = no live key right now; tokensIn/Out/costUsd below are genuinely 0, not modeled
      model, tokensIn: realTokensIn, tokensOut: realTokensOut, tokensTotal: realTokensIn + realTokensOut, costUsd,
      docsInCorpus: Object.keys(this._byId).length, docsRetrieved: hits.length,
      retrievalContextTokensEst, fullCorpusContextTokensEst, contextSavingsPct,
      naiveTokensInEst: naiveTokensIn, naiveCostUsd,
      cumulative: { queries: this.economics.queries, tokensIn: this.economics.tokensIn, tokensOut: this.economics.tokensOut,
        costUsd: this.economics.costUsd, avgContextSavingsPct },
    };
    return { type: "answer", grounded, provider, economics, groundingFailure,
      render: `Answer: ${body}\nSource: ${sources.join(", ")}`, sources };
  }
}

function stripUrls(s) { return s.replace(/https?:\/\/\S+/g, "").replace(/\s{2,}/g, " "); }
function extractive(hits, byId, query) {
  const t = terms(query), top = byId[hits[0].id];
  const sent = (top.text.match(/[^.]+\./g) || [top.text]).map(s => s.trim())
    .map(s => ({ s, score: t.reduce((a, w) => a + (s.toLowerCase().includes(w) ? 1 : 0), 0) }))
    .sort((a, b) => b.score - a.score);
  return (sent[0] && sent[0].s) || top.text.slice(0, 240);
}

// Admin-only: set the ONE org model key at runtime from the agent UI — no env
// var, no restart. Mirrors UNAI's Governance session-key control (/api/set-key).
// Wire this behind an admin check (a single org key for everyone, never per-user).
function setOrgModelKey({ key, baseUrl, model } = {}) {
  if (key) process.env.GATEWAY_API_KEY = key;
  if (baseUrl) process.env.GATEWAY_BASE_URL = baseUrl;   // e.g. your Azure OpenAI endpoint
  if (model) process.env.GATEWAY_MODEL = model;          // e.g. your Azure deployment name
  const cfg = resolveConfig();
  return { ok: cfg.ok, provider: cfg.label, model: cfg.model };   // safe to show in UI (no key echoed)
}

module.exports = { KnowledgeAssistant, MockSharePointSource, GraphSharePointSource, MultiSource, setOrgModelKey, MERCURY_DOCS };

// --- Local demo: node knowledge_assistant.js -----------------------------
if (require.main === module) {
  (async () => {
    const ka = new KnowledgeAssistant();
    await ka.ingest();
    const alice = { id: "alice", groups: ["all"] };            // regular user
    const fin = { id: "fin", groups: ["all", "finance"] };     // finance user
    const cfg = resolveConfig();
    console.log("LLM key:", cfg.ok ? `LIVE via ${cfg.label} (${cfg.model})` : "none set -> modeled/extractive answers\n");
    for (const q of ["Show me the RASCI Matrix", "What are the responsibilities of an RM Planner?", "What is BST?"]) {
      const r = await ka.ask(q, alice);
      console.log("Q:", q, "\n" + r.render + `\n[${r.type}${r.grounded ? " · live" : r.type === "answer" ? " · modeled" : ""}]\n`);
    }
    console.log("--- permission trim ---");
    console.log("regular user asks for the budget:\n" + (await ka.ask("What is the Mercury budget?", alice)).render);
    console.log("\nfinance user asks for the budget:\n" + (await ka.ask("What is the Mercury budget?", fin)).render);

    // --- Multimodal: SharePoint + images/slides + meeting transcripts, one assistant ---
    console.log("\n--- multimodal (SharePoint + images/slides + meeting transcripts) ---");
    const path = require("path");
    const { ImageSlideSource } = require("./multimodal_ingest.js");
    const { MeetingTranscriptSource } = require("./meeting_transcript_ingest.js");
    const mm = new KnowledgeAssistant({
      source: new MultiSource([
        new MockSharePointSource(),
        new ImageSlideSource({ dir: path.join(__dirname, "..", "assets"), acl: ["all"] }),
        new MeetingTranscriptSource({ dir: path.join(__dirname, "fixtures", "meetings"), acl: ["all"] }),
      ]),
    });
    const r0 = await mm.ingest();
    console.log(`indexed ${r0.indexed} docs (SharePoint + images/slides + meeting transcripts combined)`);
    const r1 = await mm.ask("what does slide-1 say and who was it prepared for?", alice);
    console.log("Q: what does slide-1 say and who was it prepared for?\n" + r1.render + `\n[${r1.type}]`);
    const r2 = await mm.ask("why was the FG-1003 purchase order held for approval instead of executing automatically?", alice);
    console.log("\nQ: why was the FG-1003 purchase order held for approval instead of executing automatically?\n" + r2.render + `\n[${r2.type}]`);
  })();
}
