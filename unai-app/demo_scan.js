#!/usr/bin/env node
/*
 * demo_scan.js — UNAI demo pre-flight STATIC scanner.
 * ---------------------------------------------------------------------------
 * Hunts for the class of defect that embarrasses a live CIO/customer demo:
 * hardcoded verdicts that fire regardless of the data, template/placeholder
 * text that can leak on screen, references to deprecated models, values that
 * can render as NaN/undefined, and stale dates. It is a HEURISTIC lint — it
 * flags things for a human to eyeball, it does not "prove" correctness.
 *
 *   node demo_scan.js            # scan default file set, human report
 *   node demo_scan.js --json     # machine-readable
 *   node demo_scan.js f1 f2 ...  # scan specific files
 *
 * Exit code: 2 if any HIGH finding, 1 if only MEDIUM, 0 if clean/low-only —
 * so it can gate a pre-demo check or CI.
 */
const fs = require("fs");
const path = require("path");

const argv = process.argv.slice(2);
const asJson = argv.includes("--json");
const fileArgs = argv.filter(a => !a.startsWith("--"));
const DEFAULT_FILES = ["index.html", "server.js", "engine.js", "sdlc_factory.js",
  "gateway.js", "llm.js", "containment.js", "misalignment.js"];
const files = (fileArgs.length ? fileArgs : DEFAULT_FILES)
  .map(f => path.resolve(__dirname, f)).filter(f => fs.existsSync(f));

// ---- rules -----------------------------------------------------------------
// Each rule: { id, sev, why, test(line)->bool, note? }. Kept deliberately
// specific so the report is short enough to actually act on before a demo.
const CUR_YEAR = new Date().getFullYear();
const DEPRECATED_MODELS = [
  /gemini-1\.5/i, /gemini-1\.0/i, /gemini-2\.0/i, /\bgemini-pro\b/i, /\btext-bison\b/i,
  /gpt-4-32k/i, /gpt-4-0314/i, /gpt-4-0613/i, /\bgpt-3\.5/i, /text-davinci/i,
  /\bclaude-2\b/i, /\bclaude-1\b/i, /claude-instant/i, /claude-3-(?:opus|sonnet|haiku)-2024/i,
  /mistral-medium-2312/i,
];
// Verdict phrases that assert a comparative result. Risky ONLY when they sit in
// a string literal that has no sign of being data-driven (no ternary/interp on
// the line). These are the "hardcoded claim" family — exactly the Gen-1 bug.
const VERDICTS = [
  /not cheaper/i, /\bis cheaper\b/i, /not faster/i, /\bis faster\b/i, /\bnot slower\b/i,
  /always (?:cheaper|faster|lower|wins?|works)/i, /\bguaranteed\b/i, /never fails?/i,
  /\b100% (?:lower|cheaper|faster|savings?|accurate)\b/i, /zero cost/i, /\bno cost\b/i,
  /\bis (?:higher|lower) than\b/i,
];
// Placeholder/TODO text that would embarrass if it reached the screen. NOTE:
// bare "placeholder" is excluded — it is overwhelmingly the HTML input attribute
// (placeholder="…"), correct UX, not a leak.
const TEMPLATE_LEAK = [
  /template preview/i, /lorem ipsum/i, /\bTBD\b/, /\bTODO\b/, /\bFIXME\b/,
  /coming soon/i, /\bXXX\b/, /dummy (?:data|text|value)/i, /placeholder text/i, /REPLACE_ME/i,
  /\bpathetic\b/i, /\bWIP\b/, /fill me in/i,
];
const NAN_LITERALS = [ /["'`][^"'`]*\b(?:NaN|undefined|Infinity)\b[^"'`]*["'`]/ ];
function isTypeofGuard(line){ return /typeof\s+[\w.$]+\s*[!=]==?\s*["']undefined["']|[!=]==?\s*["']undefined["']/.test(line); }
function isPlaceholderAttr(line){ return /placeholder\s*=/.test(line); }

function isStringLiteralLine(line){ return /["'`]/.test(line); }
// A line is "data-driven" if a computed value flows into the string: an
// interpolation, a ternary, string concatenation with a variable, or a known
// data ref. Such lines are NOT hardcoded verdicts.
function looksDataDriven(line){
  return /\$\{/.test(line)
    || /[?][^:]*:/.test(line)
    || /\+\s*\(?\s*[A-Za-z_$]/.test(line)
    || /[A-Za-z_$][\w$.\[\]]*\s*\+/.test(line)
    || /\b(?:es|gc|ts|pj|ef|d|lat|e)\.[A-Za-z_$]/.test(line)
    || /toFixed|toLocaleString|Math\.|Number\(/.test(line);
}
// Strip a trailing // line comment so DEPRECATED checks don't fire on prose that
// merely NAMES a dead model (e.g. "// gemini-1.5 is shut down").
function stripLineComment(line){ return line.replace(/\/\/.*$/, ""); }
function isPriceCardEntry(line){ return /\[\s*["'][^"']+["']\s*,\s*[\d.]+\s*,\s*[\d.]+\s*\]/.test(line); }

const findings = [];
function add(file, ln, sev, id, why, snippet){
  findings.push({ file: path.basename(file), line: ln, sev, id, why, snippet: snippet.trim().slice(0,160) });
}

for(const file of files){
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    const ln = i+1;
    // comments are context, not shipped claims — skip obvious comment lines
    const isComment = /^\s*(\/\/|\*|<!--)/.test(line);

    // 1) deprecated model ids (anywhere, incl. config/defaults). Strip trailing
    //    comments so prose naming a dead model isn't flagged; price-card rate
    //    entries are reference data, not a selected default → LOW.
    { const codeOnly = stripLineComment(line);
      for(const re of DEPRECATED_MODELS){ if(re.test(codeOnly)){
        const sev = isPriceCardEntry(codeOnly) ? "LOW" : "HIGH";
        add(file, ln, sev, "DEPRECATED_MODEL",
          sev==="LOW" ? "Deprecated model in a rate-card entry (reference pricing, not a default) — remove if unused."
                      : "References a shut-down/deprecated model id as a default — will 404 live unless self-heal catches it.", line); break; } } }

    // 2) template / placeholder leak in a string that could render (input
    //    placeholder="…" attributes are correct UX, not leaks — excluded)
    if(!isComment && !isPlaceholderAttr(line)){ for(const re of TEMPLATE_LEAK){ if(re.test(line) && isStringLiteralLine(line)){
      add(file, ln, "HIGH", "TEMPLATE_LEAK", "Placeholder/TODO text inside a string that may reach the screen.", line); break; } } }

    // 3) hardcoded verdict claim not guarded by data
    if(!isComment){ for(const re of VERDICTS){ if(re.test(line) && isStringLiteralLine(line) && !looksDataDriven(line)){
      add(file, ln, "HIGH", "HARDCODED_CLAIM", "A comparative verdict in a static string — fires regardless of the actual numbers.", line); break; } } }

    // 4) NaN/undefined/Infinity baked into an output string (not a typeof guard)
    if(!isComment && !isTypeofGuard(line)){ for(const re of NAN_LITERALS){ if(re.test(line)){
      add(file, ln, "MEDIUM", "NAN_LITERAL", "Literal NaN/undefined/Infinity inside a string — likely a render bug.", line); break; } } }

    // 5) NaN render risk: .toFixed()/.toLocaleString() on a DEEP property chain
    //    (a.b.c — the kind that is often optional/undefined) with no ||0/??/round
    //    guard on the line. Local numeric vars (avg.toFixed) are not flagged.
    if(!isComment){
      const m = line.match(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*){2,}|[A-Za-z_$][\w$]*\[[^\]]+\])\.(toFixed|toLocaleString)\s*\(/);
      if(m){ const recv = m[1];
        const guarded = /\|\|\s*0|\?\?|\?\.|Math\.round|Math\.max|Number\(/.test(line);
        if(!guarded) add(file, ln, "MEDIUM", "NAN_RISK",
          "`"+recv+"."+m[2]+"()` on a nested property with no `||0`/`??`/round guard — renders NaN if any link is undefined.", line);
      }
    }

    // 6) stale hardcoded year in a visible string (not this year, not a range/comment)
    if(!isComment && isStringLiteralLine(line)){
      const ym = line.match(/["'`][^"'`]*\b(20\d{2})\b[^"'`]*["'`]/);
      if(ym){ const y = Number(ym[1]);
        if(y < CUR_YEAR - 0 && y >= 2020 && !/©|copyright|\/v\d|202\d-\d/i.test(line)){
          // only flag past years that look like content, downgrade to LOW
          if(y < CUR_YEAR) add(file, ln, "LOW", "STALE_DATE",
            "Hardcoded past year "+y+" in a visible string — confirm it isn't a stale label.", line);
        }
      }
    }
  });

  // 7) contradiction: a single function that literally states both a thing and its negation
  const fnRe = /function\s+([A-Za-z0-9_$]+)\s*\(/g; let fm;
  const idxs = [];
  while((fm = fnRe.exec(text))) idxs.push({ name: fm[1], start: fm.index });
  idxs.forEach((f, k) => {
    const body = text.slice(f.start, k+1<idxs.length ? idxs[k+1].start : f.start+6000);
    const pairs = [["is cheaper","not cheaper"], ["is faster","not faster"], ["is higher","is lower"]];
    for(const [a,b] of pairs){ if(new RegExp(a,"i").test(body) && new RegExp(b,"i").test(body)){
      const lnAt = text.slice(0, f.start).split("\n").length;
      add(file, lnAt, "MEDIUM", "CONTRADICTION",
        "Function `"+f.name+"` contains both \""+a+"\" and \""+b+"\" — verify they're mutually-exclusive branches, not a stale pair.", "function "+f.name+"(…)"); break; } }
  });
}

// ---- report ----------------------------------------------------------------
const order = { HIGH:0, MEDIUM:1, LOW:2 };
findings.sort((a,b)=> order[a.sev]-order[b.sev] || a.file.localeCompare(b.file) || a.line-b.line);
const counts = findings.reduce((m,f)=>(m[f.sev]=(m[f.sev]||0)+1,m),{});

if(asJson){ console.log(JSON.stringify({ scanned: files.map(f=>path.basename(f)), counts, findings }, null, 2)); }
else {
  console.log("\n=== UNAI demo pre-flight scan ===");
  console.log("Scanned: "+files.map(f=>path.basename(f)).join(", "));
  console.log("Findings: "+(counts.HIGH||0)+" HIGH · "+(counts.MEDIUM||0)+" MEDIUM · "+(counts.LOW||0)+" LOW\n");
  let cur="";
  for(const f of findings){ if(f.sev!==cur){ cur=f.sev; console.log("── "+cur+" ──"); }
    console.log("  ["+f.id+"] "+f.file+":"+f.line+"  "+f.why);
    console.log("      "+f.snippet); }
  if(!findings.length) console.log("  ✓ clean — no risky patterns found.");
  console.log("");
}
const code = (counts.HIGH? 2 : counts.MEDIUM? 1 : 0);
process.exit(code);
