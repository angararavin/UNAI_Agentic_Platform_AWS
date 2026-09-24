/*
 * SDLC Spec Factory — BRD/FS → Technical Spec, the UNAI-redesigned way.
 * ---------------------------------------------------------------------------
 * Ported from the external SAP SDLC AI Factory, restructured onto UNAI's
 * "extract once, generate from a small brief" pattern + deterministic effort:
 *   1) Perception/Memory : read the BRD ONCE → a compact canonical brief
 *   2) Reasoning         : classify the object type
 *   3) Action (0 tokens) : compute effort by FORMULA from the effort matrix
 *   4) Action (thin)     : generate each TS section from the SMALL brief
 *   5) Collaboration     : compile to one Markdown document
 * Runs live via the shared LLM gateway (chatWithFailover) when a key is set,
 * else returns a deterministic template preview (effort is always real).
 */

const zlib = require("zlib");
// --- Pure-Node document text extraction (zero-dependency; offline/in-tenant) --
// DOCX = a ZIP; read word/document.xml via the central directory + inflateRaw.
function extractDocxText(buf){
  try{
    let eocd=-1;
    for(let i=buf.length-22;i>=0 && i>buf.length-22-65536;i--){ if(buf.readUInt32LE(i)===0x06054b50){ eocd=i; break; } }
    if(eocd<0) return "";
    const cdCount=buf.readUInt16LE(eocd+10); let off=buf.readUInt32LE(eocd+16); let docXml=null;
    for(let n=0;n<cdCount && off+46<=buf.length;n++){
      if(buf.readUInt32LE(off)!==0x02014b50) break;
      const method=buf.readUInt16LE(off+10), compSize=buf.readUInt32LE(off+20);
      const nameLen=buf.readUInt16LE(off+28), extraLen=buf.readUInt16LE(off+30), commentLen=buf.readUInt16LE(off+32);
      const lho=buf.readUInt32LE(off+42);
      const name=buf.toString("utf8",off+46,off+46+nameLen);
      if(name==="word/document.xml"){
        const lNameLen=buf.readUInt16LE(lho+26), lExtraLen=buf.readUInt16LE(lho+28);
        const dataStart=lho+30+lNameLen+lExtraLen; const comp=buf.subarray(dataStart,dataStart+compSize);
        const raw = method===8 ? zlib.inflateRawSync(comp) : comp; docXml=raw.toString("utf8"); break;
      }
      off += 46 + nameLen + extraLen + commentLen;
    }
    if(!docXml) return "";
    return docXml
      .replace(/<w:p[ >\/]/g,"\n<w:p ").replace(/<\/w:p>/g,"\n").replace(/<w:tab[^>]*>/g,"\t").replace(/<w:br[^>]*>/g,"\n")
      .replace(/<[^>]+>/g," ")
      .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#\d+;/g," ")
      .replace(/[ \t]+/g," ").replace(/ *\n */g,"\n").replace(/\n{3,}/g,"\n\n")
      .split("\n").filter(l=>!/^\s*\d{3,}(\s+\d{3,})+\s*$/.test(l)).join("\n").trim();   // drop drawing-coordinate noise
  }catch(e){ return ""; }
}
function extractText(name, buf){
  const n=String(name||"").toLowerCase();
  if(n.endsWith(".docx")) return extractDocxText(buf);
  if(n.endsWith(".txt")||n.endsWith(".md")||n.endsWith(".csv")) return buf.toString("utf8");
  return "";   // .pdf / .doc not supported in pure-Node text mode — see note
}

// --- Technical Spec sections (condensed from the agent's prompts.py) ---------
const SECTIONS = [
  { key: "overview", title: "1. Overview & Business Need",
    ask: "Write the Overview & Business Need for the Technical Spec: 2-3 short paragraphs on the business requirement, objective, and scope. Use ONLY the brief." },
  { key: "functional", title: "2. Functional Details",
    ask: "Write Functional Details: the functional flow and the specific processing logic the development must implement, as concise numbered steps. Use ONLY the brief." },
  { key: "data_dictionary", title: "3. Data Dictionary",
    ask: "Produce a Data Dictionary as a Markdown table (Object | Type | Key Fields | Description) for the tables/structures/CDS this development needs. If not in the brief, propose SAP best-practice and mark '(proposed)'." },
  { key: "interfaces", title: "4. Interfaces / Integration",
    ask: "Describe Interfaces/Integration (inbound/outbound, technology e.g. OData/IDoc/RFC/CPI, trigger, payload summary) as a short list. If none, state 'No external interface required'." },
  { key: "error_handling", title: "5. Error Handling & Logging",
    ask: "Write Error Handling & Logging: validations, error messages, and logging approach (e.g. application log/BAL) as a concise list." },
  { key: "assumptions", title: "6. Assumptions, Prerequisites & Dependencies",
    ask: "List Assumptions, Prerequisites and Dependencies as concise bullets." },
];

// --- Functional Spec sections -----------------------------------------------
const FS_SECTIONS = [
  { key: "context", title: "1. Business Context & Objective",
    ask: "Write Business Context & Objective: 2-3 short paragraphs on the business background, the problem being solved, the objective, and the scope. Use ONLY the brief." },
  { key: "asis_tobe", title: "2. As-Is vs To-Be Process",
    ask: "Describe the current (As-Is) process and the proposed (To-Be) process. Prefer a short two-column Markdown table (As-Is | To-Be). Use ONLY the brief." },
  { key: "requirements", title: "3. Functional Requirements",
    ask: "List the functional requirements as a Markdown table (ID | Requirement | Priority). Number IDs FR-01, FR-02, … Each requirement must be atomic and testable. Use ONLY the brief." },
  { key: "process_flow", title: "4. Process Flow / Functional Design",
    ask: "Describe the end-to-end functional flow the solution follows, as concise numbered steps (trigger → processing → output). Use ONLY the brief." },
  { key: "fields", title: "5. Field-Level Design & Validations",
    ask: "Produce a Markdown table (Field | Source / Target | Validation / Rule) covering input, output and derived fields with their validation rules. If a field is inferred, mark '(proposed)'." },
  { key: "authorizations", title: "6. Authorizations & Roles",
    ask: "Describe the roles and authorization checks required (authorization objects / role restrictions). If none are stated, propose SAP best-practice and mark '(proposed)'." },
  { key: "fs_assumptions", title: "7. Assumptions, Dependencies & Out-of-Scope",
    ask: "List Assumptions, Dependencies and explicit Out-of-Scope items as concise bullets. Use ONLY the brief." },
];

// --- Test Plan sections ------------------------------------------------------
const TEST_SECTIONS = [
  { key: "test_scope", title: "1. Test Scope & Approach",
    ask: "Write a short Test Scope & Approach: what will be tested (unit, integration), the strategy, and entry/exit criteria. Use ONLY the brief." },
  { key: "unit_tests", title: "2. Unit Test Cases",
    ask: "Produce a Markdown table of unit test cases (ID | Scenario | Preconditions | Steps | Expected Result). Number IDs UT-01, UT-02, … Cover the main processing logic in the brief." },
  { key: "integration_tests", title: "3. Integration Test Cases",
    ask: "Produce a Markdown table of integration test cases (ID | Scenario | Steps | Expected Result). Number IDs IT-01, IT-02, … Focus on interfaces and end-to-end flow. If no integration exists, state 'Not applicable' with one row explaining why." },
  { key: "negative_tests", title: "4. Negative & Edge Cases",
    ask: "Produce a Markdown table of negative / edge test cases (ID | Scenario | Steps | Expected Result). Number IDs NT-01, NT-02, … Cover validations, missing data and error handling." },
  { key: "test_data", title: "5. Test Data Requirements",
    ask: "List the test data required to execute the above cases (master data, config, sample records) as concise bullets. Use ONLY the brief." },
];

// --- Traceability (single generated matrix) ---------------------------------
const TRACE_SECTIONS = [
  { key: "matrix", title: "Requirements Traceability Matrix",
    ask: "Produce ONE Markdown table linking requirements to design and tests: (Req ID | Requirement | FS Section | TS Object / Section | Test Case ID). Use FR-xx for requirements and UT-xx/IT-xx for tests, consistent with a functional spec, technical spec and test plan derived from the same brief. Use ONLY the brief." },
];

// --- Document catalogue ------------------------------------------------------
const DOC_DEFS = {
  fs:           { key:"fs",           title:"Functional Specification",          sections:FS_SECTIONS },
  ts:           { key:"ts",           title:"Technical Specification",           sections:SECTIONS, effort:true },
  testplan:     { key:"testplan",     title:"Test Plan",                         sections:TEST_SECTIONS },
  traceability: { key:"traceability", title:"Requirements Traceability Matrix",  sections:TRACE_SECTIONS },
};
const DOC_ORDER = ["fs","ts","testplan","traceability"];

// --- Deterministic effort model (from effort_matrix_mnm.txt) -----------------
// Baselines in HOURS by object type + fixed add-ons. This is a FORMULA — no LLM.
const EFFORT_BASE = {
  "report": 16, "classic abap": 16, "form": 20, "adobe form": 24,
  "interface": 24, "odata": 24, "segw odata": 24, "rap": 28, "fiori": 32,
  "workflow": 32, "enhancement": 12, "conversion": 20, "module pool": 28, "web dynpro": 28,
};
const ADDONS = {
  dynamic_selection: 1, extra_validation: 0.25, extra_join: 0.75, calc_field: 0.25,
  interactive_alv: 1.5, email: 2, file_io: 1, cpi_api: 2, bapi_call: 1.5, ddic_structure: 0.5,
};
function normObj(s){ s=String(s||"").toLowerCase();
  for(const k of Object.keys(EFFORT_BASE)) if(s.includes(k)) return k;
  if(/idoc|proxy|rfc|bapi|web ?service|cpi|pi\/po/.test(s)) return "interface";
  if(/ui5|fiori/.test(s)) return "fiori"; if(/cds|odata/.test(s)) return "odata";
  return "report"; }
function computeEffort(objectType, features={}){
  const base=EFFORT_BASE[normObj(objectType)] ?? 16; let add=0; const lines=[];
  const f=features||{};
  const map=[["dynamicSelection","dynamic_selection","Dynamic selection screen"],
    ["validations","extra_validation","Extra validations",true],["joins","extra_join","Extra table joins",true],
    ["calcFields","calc_field","Calculation fields",true],["interactiveAlv","interactive_alv","Interactive ALV"],
    ["email","email","Email (CL_BCS)"],["fileIo","file_io","File download/upload"],
    ["cpiApi","cpi_api","CPI/API interface",true],["bapiCalls","bapi_call","BAPI calls w/ error handling",true],
    ["ddicStructures","ddic_structure","Custom DDIC structures",true]];
  for(const [fk,ak,label,perN] of map){ const v=f[fk]; if(!v) continue;
    const n = perN ? Number(v)||0 : 1; const hrs=ADDONS[ak]*n; if(hrs>0){ add+=hrs; lines.push(`${label}${perN?` ×${n}`:""}: +${hrs}h`); } }
  const dev=base+add; const unitTest=Math.round(dev*0.4*10)/10; const buffer=Math.min(4, Math.round((dev+unitTest)*0.1*10)/10);
  const total=Math.round((dev+unitTest+buffer)*10)/10;
  return { objectType:normObj(objectType), baseHours:base, addOnHours:Math.round(add*10)/10, addOns:lines,
    devHours:Math.round(dev*10)/10, unitTestHours:unitTest, bufferHours:buffer, totalHours:total, totalDays:Math.round(total/8*10)/10 };
}

// --- Object-type auto-detection (so the user need not pick) ------------------
const OBJ_PATTERNS = [
  ["report",      /\breport\b|\balv\b|classic abap|list output/],
  ["interface",   /interface|\bidoc\b|\brfc\b|\bbapi\b|proxy|\bcpi\b|pi\/po|web ?service|inbound|outbound/],
  ["odata",       /odata|\bcds\b|segw|gateway service/],
  ["fiori",       /fiori|ui5|sapui5|rap\b|restful abap/],
  ["workflow",    /workflow|flexible workflow|approval process/],
  ["form",        /adobe form|smartform|sapscript|\bform\b|print output/],
  ["enhancement", /enhancement|\bbadi\b|user ?exit|\bexit\b|implicit enhancement/],
  ["conversion",  /conversion|migration|\blsmw\b|\bltmc\b|data load|data upload/],
  ["module pool", /module pool|dialog program|screen program/],
  ["web dynpro",  /web dynpro/],
];
function detectObjectTypes(text){
  const t=String(text||"").toLowerCase(); const found=[];
  for(const [name,re] of OBJ_PATTERNS){ if(re.test(t)) found.push(name); }
  return [...new Set(found)];
}
// Effort when the type is auto-detected: single object → normal formula;
// multiple objects → itemise base+test+buffer per object and sum (add-ons need
// per-object refinement, so they are intentionally left off the multi-object roll-up).
function computeEffortAuto(detected, features){
  const list = (detected && detected.length) ? detected : ["report"];
  if(list.length===1) return computeEffort(list[0], features);
  const items = list.map(t=>{
    const base=EFFORT_BASE[normObj(t)] ?? 16;
    const dev=base; const test=Math.round(dev*0.4*10)/10;
    const buf=Math.min(4, Math.round((dev+test)*0.1*10)/10);
    const tot=Math.round((dev+test+buf)*10)/10;
    return { objectType:normObj(t), baseHours:base, devHours:dev, unitTestHours:test, bufferHours:buf, totalHours:tot, totalDays:Math.round(tot/8*10)/10 };
  });
  const totalHours=Math.round(items.reduce((a,b)=>a+b.totalHours,0)*10)/10;
  return { itemized:true, objectType:"multiple ("+list.length+")", items, addOns:[],
    baseHours:0, addOnHours:0, devHours:0, unitTestHours:0, bufferHours:0,
    totalHours, totalDays:Math.round(totalHours/8*10)/10 };
}

// Render the effort estimate as Markdown (single or itemised).
function effortMarkdown(effort){
  if(effort.itemized){
    const rows=effort.items.map(it=>`| ${it.objectType} | ${it.baseHours} | ${it.unitTestHours} | ${it.bufferHours} | ${it.totalHours} (${it.totalDays} d) |`).join("\n");
    return "## Effort Estimate (deterministic — auto-detected objects, computed by formula, 0 tokens)\n\n"+
      `_Auto-detected ${effort.items.length} object types; effort is itemised per object and summed._\n\n`+
      "| Object type | Base (h) | Unit test (40%) | Buffer | Total |\n|---|---|---|---|---|\n"+rows+
      `\n| **All objects** |  |  |  | **${effort.totalHours} h (${effort.totalDays} days)** |\n`;
  }
  return "## Effort Estimate (deterministic — computed by formula, 0 tokens)\n\n"+
    `| Item | Value |\n|---|---|\n| Object type | ${effort.objectType} |\n| Base | ${effort.baseHours} h |`+
    (effort.addOns&&effort.addOns.length?`\n| Add-ons | ${effort.addOns.join("; ")} |`:"")+
    `\n| Development | ${effort.devHours} h |\n| Unit test (40%) | ${effort.unitTestHours} h |\n| Buffer (10%, max 4h) | ${effort.bufferHours} h |\n| **Total** | **${effort.totalHours} h (${effort.totalDays} days)** |\n`;
}

// --- Generation -------------------------------------------------------------
const _sleep = ms => new Promise(r=>setTimeout(r, ms));
// callLLM with backoff retries. chatWithFailover does NOT throw on quota/rate/
// timeout — it returns { content:null }. Under concurrency, a couple of parallel
// calls get throttled and would silently fall back to a template stub, which is
// what makes a live run look half-broken. So retry a null/empty result a few
// times with backoff (free-tier keys recover after their per-minute cooldown),
// and only give up when the provider is genuinely unavailable.
async function callLLM(chat, system, user, maxTokens, opts){
  if(typeof chat!=="function") return null;
  const o = opts||{};
  const tries = Math.max(1, o.retries==null ? 3 : o.retries);
  let last = null;
  for(let i=0;i<tries;i++){
    try{
      const r = await chat([{role:"system",content:system},{role:"user",content:user}],
        { max_tokens: maxTokens||700, temperature: o.temperature });
      last = r || null;
      if(r && r.content) return r;                 // success (may still be thin/truncated — caller checks)
    }catch(_){ /* treat as transient */ }
    if(i<tries-1) await _sleep(600*(i+1) + Math.floor(Math.random()*250));   // 0.6s, 1.2s, … + jitter
  }
  return last;   // {content:null,...} — caller renders an honest "did not generate" note
}

// A section is INCOMPLETE if the model was cut off (finish_reason "length"),
// produced a stub, or emitted a table it never finished. Detecting this is what
// stops a truncated half-table from ever reaching a customer's screen.
function incompleteReason(body, finishReason){
  const b = String(body||"").trim();
  if(!b) return "empty";
  if(finishReason === "length") return "truncated (hit token cap)";
  if(b.replace(/\s+/g," ").length < 60) return "thin";
  const lines = b.split("\n");
  const tableLines = lines.filter(l=>/^\s*\|.*\|\s*$/.test(l) || /^\s*\|/.test(l));
  if(tableLines.length){
    // a well-formed table = header row + separator row + >=1 data row
    const hasSep = lines.some(l=>/^\s*\|?[\s:|-]*-{3,}[\s:|-]*\|?\s*$/.test(l) && l.includes("-"));
    const dataRows = tableLines.filter(l=>!/-{3,}/.test(l)).length - 1;   // minus the header
    if(hasSep && dataRows < 1) return "table has no data rows";
    // last content line is an unterminated table row → cut off mid-row
    const lastNonEmpty = [...lines].reverse().find(l=>l.trim());
    if(lastNonEmpty && /^\s*\|/.test(lastNonEmpty) && !/\|\s*$/.test(lastNonEmpty)) return "truncated table row";
  }
  return null;
}

// Clean up common model output defects so the rendered spec always looks tidy:
//  - collapse padded separator rows ( |:------------------| → |:---| )
//  - drop a trailing, unterminated table row (a cut-off fragment)
//  - normalise excessive blank lines
function sanitizeMd(body){
  let b = String(body||"");
  b = b.split("\n").map(line=>{
    if(/^\s*\|?[\s:|-]*-{3,}[\s:|-]*\|?\s*$/.test(line) && line.includes("|")){
      return line.replace(/:?-{2,}:?/g, m=> m.startsWith(":")&&m.endsWith(":") ? ":---:" : m.startsWith(":") ? ":---" : m.endsWith(":") ? "---:" : "---");
    }
    return line;
  }).join("\n");
  const lines = b.split("\n");
  const lastIdx = (()=>{ for(let i=lines.length-1;i>=0;i--) if(lines[i].trim()) return i; return -1; })();
  if(lastIdx>=0){ const l=lines[lastIdx]; if(/^\s*\|/.test(l) && !/\|\s*$/.test(l)){ lines.splice(lastIdx,1); } }   // dangling row
  return lines.join("\n").replace(/\n{3,}/g,"\n\n").trim();
}
async function generateSpec({ brd, objectType, features, sections, documents }, chat){
  // Which documents to produce (default: Technical Spec, for backward compat).
  let wantDocs = (documents && documents.length) ? documents.filter(d=>DOC_DEFS[d]) : ["ts"];
  if(!wantDocs.length) wantDocs = ["ts"];
  wantDocs = DOC_ORDER.filter(d=>wantDocs.includes(d));
  // Legacy: `sections` filters the TS section set only.
  const tsFilter = (sections && sections.length) ? sections : null;

  const metrics = { calls:0, tokensIn:0, tokensOut:0, mode:"template", provider:null, model:null };
  const acc = t => { if(!t || !t.content) return; metrics.calls++; metrics.tokensIn+=(t.tokensIn||0); metrics.tokensOut+=(t.tokensOut||0); if(t.provider){metrics.mode="live";metrics.provider=t.provider;} if(t.model){metrics.model=t.model;} };

  // 1) EXTRACT ONCE — the BRD is read a single time into a compact brief.
  //    Every section of every document is then grounded in this SMALL brief.
  const explain = []; let msExtract = 0;   // per-section explainability + latency
  let brief = String(brd||"").slice(0, 20000);
  const _t0e = Date.now();
  const ext = await callLLM(chat,
    "You are a senior SAP analyst. Read the BRD/FS and produce a STRUCTURED canonical brief (up to ~500 words) that a spec writer can build every section from without re-reading the source. Capture, with real specifics from the source: the business objective; each SAP object/module involved; key tables & fields; interfaces & integrations (IDoc/RFC/BAPI/CPI/OData/REST/EDI as applicable); validations & business rules; roles/authorizations; non-functional requirements (volume, frequency, SLA); and any assumptions. Use short headed lists. Keep every concrete detail from the source — do not over-compress. No preamble.",
    "BRD:\n"+brief, 900);
  msExtract = Date.now() - _t0e;
  if(ext && ext.content){ acc(ext); brief = ext.content.trim(); }

  // 2) DETERMINISTIC EFFORT — formula, 0 tokens. Auto-detect object type unless one was picked.
  const auto = !objectType || String(objectType).toLowerCase()==="auto";
  const detected = detectObjectTypes(String(brief||"")+" "+String(brd||""));
  const effort = auto ? computeEffortAuto(detected.length?detected:["report"], features)
                      : computeEffort(objectType, features);
  const brdTokForScope = Math.round(String(brd||"").length/4);
  effort.autoDetected = auto;
  effort.detectedObjectTypes = detected;
  effort.multiObject = (effort.itemized===true) || detected.length>4 || brdTokForScope>4000;
  effort.scopeNote = effort.itemized
    ? ("Auto-detected "+effort.items.length+" object types from the source; effort is itemised per object and summed below.")
    : (effort.multiObject
        ? ("This source looks like a multi-object program ("+detected.length+" object types mentioned). The figure below is for ONE "+effort.objectType+" object — pick 'Auto-detect' to itemise per object.")
        : ("Estimate for one "+effort.objectType+" object."));

  // 3) GENERATE — all sections of all documents, grounded in the brief, run
  //    CONCURRENTLY (bounded) so wall-clock ≈ the slowest section, not the sum.
  const docs = []; let totalSections = 0; let msSumSeq = 0;
  const genSys = (dk, strict) => "You are a senior SAP "+(dk==="fs"?"functional":dk==="testplan"?"test":"technical")+" consultant writing one section of a formal specification for a client deliverable. Write ONLY that section, in clean GitHub-flavoured Markdown. Requirements: open with a 1–2 sentence context line, then use bullet lists and/or COMPLETE Markdown tables; be specific and implementation-ready using correct SAP terminology (tables, fields, transactions, objects); aim for a substantive section (~180–320 words). "
    + "TABLE RULES: every table MUST be fully populated with at least 3 real data rows and MUST be finished — never stop mid-row. Use exactly three dashes per column in the separator row (e.g. `| --- | --- | --- |`); do NOT pad separators with long runs of dashes. Keep tables to 3–5 columns. "
    + "Where the brief lacks a detail, supply a sensible SAP best-practice default and mark it '(proposed)'. Do NOT repeat the section title (it is added for you) and add no preamble or sign-off."
    + (strict ? " IMPORTANT: your previous attempt was cut off or incomplete — be more concise in prose and make sure the section, including every table, is COMPLETE within the response." : "");
  const userFor = (t) => "CANONICAL BRIEF (built once from the source; ground the section strictly in this):\n"+brief+"\n\nWrite this section: "+t.s.ask;
  const SEC_TOK = Math.max(800, Math.min(4000, Number(process.env.SDLC_SECTION_TOKENS || 1500)));
  const REPAIR_TOK = Math.max(SEC_TOK, Math.min(4000, Number(process.env.SDLC_REPAIR_TOKENS || 2400)));
  // build the flat task list (doc order, then section order)
  const tasks = [];
  for(const dk of wantDocs){ const def = DOC_DEFS[dk]; let secs = def.sections;
    if(dk==="ts" && tsFilter) secs = secs.filter(s=>tsFilter.includes(s.key));
    secs.forEach((s, idx) => tasks.push({ dk, def, s, idx })); }
  const results = new Array(tasks.length);
  const CONC = Math.max(1, Math.min(8, Number(process.env.SDLC_CONCURRENCY || 4)));
  const _wall0 = Date.now();
  let cursor = 0;
  async function worker(){ while(cursor < tasks.length){ const i = cursor++; const t = tasks[i];
    const _t0 = Date.now();
    const r = await callLLM(chat, genSys(t.dk), userFor(t), SEC_TOK);
    results[i] = { t, r, ms: Date.now() - _t0, repaired:false }; } }
  await Promise.all(Array.from({ length: Math.min(CONC, tasks.length) }, () => worker()));

  // REPAIR SWEEP (serial, concurrency 1): any section that failed outright
  // (null content — provider was throttled/timed out) or came back truncated/
  // thin gets ONE more attempt, now with a larger token budget and a stricter
  // "finish the table" instruction. Serial + spaced so it doesn't re-trigger the
  // rate limit that caused the failure. This is what removes the "half the
  // sections are template stubs / tables cut off" defect from a live run.
  const anyLiveEarly = results.some(x => x.r && x.r.content);
  if(anyLiveEarly){
    for(let i=0;i<results.length;i++){
      const { t, r } = results[i];
      const failed = !(r && r.content);
      const bad = (r && r.content) ? incompleteReason(r.content, r.finishReason) : "no-response";
      if(!failed && !bad) continue;
      const r2 = await callLLM(chat, genSys(t.dk, true), userFor(t), REPAIR_TOK, { retries: failed ? 3 : 2 });
      const better = r2 && r2.content && (failed || !incompleteReason(r2.content, r2.finishReason)
        || String(r2.content).length > String((r&&r.content)||"").length);   // accept if fixed or at least fuller
      if(better){ results[i] = { t, r: r2, ms: (results[i].ms||0) + 0, repaired:true, repairReason: bad||"no-response" }; }
      else if(r && r.content){ results[i].repairReason = bad; }   // keep original, flag it
    }
  }
  const msWall = Date.now() - _wall0;
  // Was ANYTHING generated live this run? Distinguishes "no model configured"
  // (a setup state) from "some sections were throttled" (a transient state) so
  // the per-section note tells the truth about which one happened.
  const anyLiveFinal = results.some(x => x.r && x.r.content);
  // assemble (results are already in doc/section order) + per-section explainability
  const byDoc = {};
  for(const { t, r, ms, repaired, repairReason } of results){
    msSumSeq += (ms||0); acc(r); totalSections++;
    const hasContent = !!(r && r.content);
    let body, live, incomplete=null;
    if(hasContent){
      body = sanitizeMd(r.content);
      incomplete = incompleteReason(body, r.finishReason);
      live = true;
    } else {
      // Honest note — never a fake "template" that looks like the product shipped blank.
      body = anyLiveFinal
        ? "> ⚠ This section did not generate on this run (the model provider was rate-limited or timed out). Click **Generate** again to complete it — no content is fabricated."
        : "> ℹ No model is connected, so this section was not generated. Add a model key on the Governance tab and click **Generate** to produce content. The effort estimate above is real (computed by formula, 0 tokens).";
      live = false;
    }
    const proposed = live && /\(proposed\)/i.test(body);
    const thin = live && body.replace(/\s+/g," ").trim().length < 60;
    const needsAuthor = live && (proposed || thin || !!incomplete);
    explain.push({ doc: t.def.title, docKey: t.def.key, section: t.s.title,
      mode: live ? (incomplete?"live-incomplete":"live") : "failed",
      tokensIn: (r&&r.tokensIn)||0, tokensOut: (r&&r.tokensOut)||0,
      ms: ms||0, proposed, needsAuthor, incomplete: incomplete||null, repaired: !!repaired,
      repairReason: repairReason||null });
    (byDoc[t.dk] = byDoc[t.dk] || []).push({ idx: t.idx, title: t.s.title, body });
  }
  for(const dk of wantDocs){ const def = DOC_DEFS[dk];
    const arr = (byDoc[dk] || []).sort((a,b)=>a.idx-b.idx);
    const parts = arr.map(x => "## "+x.title+"\n\n"+x.body);
    let dmd = `# ${def.title}\n\n_Generated by UNAI SDLC Spec Factory · extract-once, one brief for every document_\n\n`+parts.join("\n\n");
    if(def.effort) dmd += "\n\n"+effortMarkdown(effort);
    docs.push({ key:def.key, title:def.title, markdown:dmd, sections:arr.length });
  }

  // Combined document (all requested docs, in canonical order) — kept as `markdown` for back-compat.
  const md = docs.map(d=>d.markdown).join("\n\n---\n\n");

  // 4) HONEST token accounting across ALL sections of ALL documents.
  const brdTok = Math.round(String(brd||"").length/4);      // full source, in tokens
  const briefTok = Math.round(String(brief||"").length/4);
  const nSec = totalSections;
  const baselineInput = brdTok*(nSec+1);                     // external agent re-reads full source per section (+extract)
  const redesignInput = brdTok + briefTok*nSec;             // read once, then the small brief per section
  const savedInputPct = baselineInput>0 ? Math.round(100*(1-redesignInput/baselineInput)) : 0;
  const tokenBreakdown = { sourceTokens: brdTok, briefTokens: briefTok, sections: nSec,
    documents: docs.length, baselineInput, redesignInput, savedInputPct,
    perSectionBaseline: brdTok, perSectionRedesign: briefTok };

  // 5) EXPLAINABILITY + LATENCY summary (real, from this run).
  const anyLive = metrics.mode === "live";
  const liveSecs = explain.filter(e => e.mode === "live" || e.mode === "live-incomplete");
  const cleanLive = explain.filter(e => e.mode === "live");            // live AND complete
  const incompleteSecs = explain.filter(e => e.mode === "live-incomplete");
  const failedSecs = explain.filter(e => e.mode === "failed");         // provider error / no response
  const repairedSecs = explain.filter(e => e.repaired);
  const msAvg = liveSecs.length ? Math.round(liveSecs.reduce((a,e)=>a+e.ms,0)/liveSecs.length) : 0;
  const needsAuthor = explain.filter(e => e.needsAuthor);
  const explainSummary = { total: explain.length, live: liveSecs.length,
    complete: cleanLive.length, incomplete: incompleteSecs.length, failed: failedSecs.length,
    repaired: repairedSecs.length,
    template: failedSecs.length,   // back-compat alias (failed == not drafted this run)
    needsAuthor: needsAuthor.length,
    autoDrafted: cleanLive.length - needsAuthor.filter(e=>e.mode==="live").length,
    noModel: !anyLive,                                   // nothing was drafted at all
    // A live run is "clean" for demo purposes only if every section drafted and
    // none is truncated/failed. The UI uses this to decide whether to show a
    // green "all sections generated" state or a "N need a re-run" warning.
    demoClean: anyLive && failedSecs.length===0 && incompleteSecs.length===0,
    tokensIn: metrics.tokensIn, tokensOut: metrics.tokensOut };
  const msTotalWall = anyLive ? (msExtract + msWall) : 0;              // real wall-clock
  const msSumSequential = anyLive ? (msExtract + msSumSeq) : 0;        // if run one-by-one
  const latency = {
    measured: anyLive,
    msTotal: msTotalWall,
    msExtract: anyLive ? msExtract : 0,
    msSections: anyLive ? msWall : 0,
    msAvgPerSection: msAvg,
    concurrency: CONC,
    msSumSequential,
    // Sections run concurrently, so wall-clock is far below the one-by-one sum.
    msSavedByParallel: anyLive ? Math.max(0, msSumSequential - msTotalWall) : 0,
    // The effort estimate is computed by FORMULA (0 model calls) — a naive agent
    // would spend one more model call on it, so ~one call's latency is avoided.
    effortCallsAvoided: 1,
    msSavedByDeterministicEffort: anyLive ? msAvg : 0,
    note: anyLive
      ? ("Real wall-clock. "+totalSections+" sections generated concurrently (×"+CONC+"), so total is far below the "+Math.round(msSumSequential/1000)+"s one-by-one sum. Effort estimate is deterministic (0 model latency).")
      : "Connect a model on the Governance tab to measure generation latency."
  };
  return { markdown: md, docs, documentsGenerated: docs.map(d=>d.key),
    effort, metrics, brief, sectionsGenerated: totalSections, tokenBreakdown,
    explain, explainSummary, latency,
    comparison:{ baseline:{ inputTokensProcessed:baselineInput, llmCalls:nSec+1 },
                 redesign:{ inputTokensProcessed:redesignInput, llmCalls:metrics.calls }, savedInputPct } };
}

module.exports = { generateSpec, computeEffort, computeEffortAuto, detectObjectTypes,
  SECTIONS, FS_SECTIONS, TEST_SECTIONS, TRACE_SECTIONS, DOC_DEFS, DOC_ORDER, extractText, extractDocxText };
