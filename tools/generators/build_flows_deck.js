/*
 * UNAI - Universal Supply-Chain Agent (Cognitive Runtime)
 * Copyright (c) 2026 Ravin Angara / Bristlecone. All rights reserved.
 * Builds UNAI_Flows_Deck.pptx — an animated "How UNAI works, per use case" deck.
 */
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const flows = JSON.parse(fs.readFileSync("/tmp/flows.json", "utf8"));

const NAVY = "0B1020", TEAL = "22D3AA", PUR = "9B6BFF", TXT = "E8EDFB", MUT = "8A97B8";
const p = new pptxgen();
p.layout = "LAYOUT_WIDE";                       // 13.3 x 7.5
p.defineSlideMaster({ title: "UNAI", background: { color: NAVY } });
const foot = s => s.addText("Bristlecone · UNAI Cognitive Runtime · modeled figures — not for external distribution",
  { x: 0.5, y: 7.08, w: 12.3, h: 0.3, fontSize: 9, color: MUT, align: "left", margin: 0 });

// 1 · Title
let s = p.addSlide({ masterName: "UNAI" });
s.addText("UNAI", { x: 0.6, y: 0.45, w: 12, h: 0.9, fontSize: 46, bold: true, color: TEAL, margin: 0 });
s.addText("How it works — per use case", { x: 0.6, y: 1.4, w: 12, h: 0.6, fontSize: 28, bold: true, color: TXT, margin: 0 });
s.addText("One shared brain. Many thin executors. Read once, reason once — then reuse the cognition.",
  { x: 0.6, y: 2.05, w: 12, h: 0.5, fontSize: 15, italic: true, color: MUT, margin: 0 });
s.addImage({ path: "UNAI_Flow_Title_16x9.gif", x: 2.9, y: 2.75, w: 7.5, h: 4.22 });
foot(s);

// 2 · How to read
s = p.addSlide({ masterName: "UNAI" });
s.addText("How to read these flows", { x: 0.6, y: 0.4, w: 12, h: 0.6, fontSize: 30, bold: true, color: TEAL, margin: 0 });
const steps = [
  ["Systems of record", "SAP / Snowflake / Databricks / BigQuery — read through one canonical ontology."],
  ["Perception — read ONCE", "The data is pulled a single time, not once per specialist."],
  ["Shared cognition — reason ONCE", "Memory + planning happen one time. This is the expensive step, paid 1×."],
  ["Thin executors", "Each tool pack applies a domain lens — no re-reading, no re-planning."],
  ["Evidence · Action · Explainability", "One governed, auditable decision."],
];
s.addText(steps.map((t, i) => ({ text: `${i + 1}.  ${t[0]} — `, options: { bold: true, color: TEAL, breakLine: false } })).flatMap((o, i) =>
  [o, { text: steps[i][1] + "\n", options: { color: TXT, breakLine: true } }]),
  { x: 0.6, y: 1.25, w: 5.6, h: 5.4, fontSize: 15, paraSpaceAfter: 10, valign: "top", margin: 0 });
s.addImage({ path: "UNAI_Flow_Animation.gif", x: 6.5, y: 2.0, w: 6.3, h: 2.77 });
foot(s);

// 3..N · one per use case
flows.forEach(c => {
  const s = p.addSlide({ masterName: "UNAI" });
  const nAgents = String(c.ratio || "").split(":")[0] || c.total;
  s.addText(c.name, { x: 0.6, y: 0.35, w: 12.1, h: 0.6, fontSize: 27, bold: true, color: TEAL, margin: 0 });
  s.addText(`reads once · reasons once · ${c.total} thin executors reuse the shared cognition`,
    { x: 0.6, y: 0.96, w: 12.1, h: 0.35, fontSize: 13, color: MUT, margin: 0 });
  s.addImage({ path: `UNAI_Flow_${c.key}.gif`, x: 0.55, y: 1.45, w: 12.2, h: 5.16 });
  s.addText([
    { text: `${nAgents} specialist agents → 1 UNAI`, options: { bold: true, color: TXT } },
    { text: `      −${c.savedPct}% tokens (modeled)`, options: { bold: true, color: TEAL } },
    { text: `      one read · one plan`, options: { color: MUT } },
  ], { x: 0.6, y: 6.68, w: 12.1, h: 0.4, fontSize: 15, align: "center", margin: 0 });
  foot(s);
});

// closing
s = p.addSlide({ masterName: "UNAI" });
s.addText("One shared brain, every use case", { x: 0.6, y: 0.5, w: 12, h: 0.8, fontSize: 34, bold: true, color: TEAL, margin: 0 });
s.addText([
  { text: "Consolidation, not orchestration. ", options: { bold: true, color: TXT, breakLine: true } },
  { text: "Every use case reads its data once and reasons once; capabilities are thin tool packs that reuse that shared cognition. Adding a capability is +1 pack, not +1 seven-layer agent. Warehouse- and model-neutral, SAP-compliant, and it now also does progressive disclosure, tier-based model routing and prompt caching — so it runs on any platform and compounds with Databricks' own cost levers.", options: { color: MUT } },
], { x: 0.6, y: 1.5, w: 12, h: 3, fontSize: 17, paraSpaceAfter: 10, valign: "top", margin: 0 });
foot(s);

p.writeFile({ fileName: "UNAI_Flows_Deck.pptx" }).then(f => console.log("wrote", f));
