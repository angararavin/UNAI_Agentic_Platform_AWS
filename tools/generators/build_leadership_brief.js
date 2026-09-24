/*
 * UNAI - Universal Supply-Chain Agent (Cognitive Runtime)
 * Copyright (c) 2026 Ravin Angara / Bristlecone. All rights reserved.
 * 
 * PROPRIETARY & CONFIDENTIAL. This file, and the architecture, methods and
 * ideas it embodies, are the exclusive property of the copyright holders.
 * No part may be copied, reproduced, modified, distributed, reverse-engineered,
 * or used to create derivative works without prior written permission.
 * Shared under confidentiality; unauthorized use or disclosure is prohibited.
 * See LICENSE. Integrity: this file is listed in copyright/MANIFEST.sha256.
 * SPDX-License-Identifier: LicenseRef-UNAI-Proprietary   [UNAI-COPYRIGHT v1]
 */
const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
        Footer, PageNumber } = require("docx");

const NAVY = "14233F", TEAL = "0E9E80", MUT = "5D6B8C", CORAL = "B23A30";
const P = (children, opts = {}) => new Paragraph({ children, spacing: { after: 120 }, ...opts });
const R = (t, o = {}) => new TextRun({ text: t, font: "Arial", ...o });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 },
  children: [new TextRun({ text: t, bold: true, font: "Arial", size: 26, color: NAVY })] });
const bullet = (runs) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: runs });

const shade = (hex) => ({ fill: hex, type: ShadingType.CLEAR, color: "auto" });
const cell = (runs, opts = {}) => new TableCell({
  margins: { top: 60, bottom: 60, left: 110, right: 110 },
  shading: opts.shading, width: opts.width,
  children: [new Paragraph({ alignment: opts.align || AlignmentType.LEFT, children: runs })] });
const th = (t, w) => cell([new TextRun({ text: t, bold: true, font: "Arial", size: 18, color: "FFFFFF" })],
  { shading: shade(NAVY), width: { size: w, type: WidthType.PERCENTAGE } });
const td = (t, w, o = {}) => cell([new TextRun({ text: t, font: "Arial", size: 18, color: o.color || "222222", bold: o.bold })],
  { width: { size: w, type: WidthType.PERCENTAGE }, align: o.align, shading: o.shading });
const table = (rows) => new Table({ width: { size: 100, type: WidthType.PERCENTAGE },
  borders: { top:{style:BorderStyle.SINGLE,size:2,color:"D9E0EA"}, bottom:{style:BorderStyle.SINGLE,size:2,color:"D9E0EA"},
    left:{style:BorderStyle.NONE}, right:{style:BorderStyle.NONE},
    insideHorizontal:{style:BorderStyle.SINGLE,size:2,color:"EDF1F6"}, insideVertical:{style:BorderStyle.NONE} },
  rows });

const doc = new Document({
  styles: { default: { document: { run: { font: "Arial", size: 20 } } } },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
    footers: { default: new Footer({ children: [ new Paragraph({ alignment: AlignmentType.CENTER,
      children: [ new TextRun({ text: "Bristlecone · Internal — figures are models, not forecasts · not for external distribution · page ", font: "Arial", size: 14, color: MUT }),
                  new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 14, color: MUT }) ] }) ] }) },
    children: [
      new Paragraph({ spacing: { after: 40 }, children: [ new TextRun({ text: "UNAI COGNITIVE RUNTIME", bold: true, font: "Arial", size: 18, color: TEAL }) ] }),
      new Paragraph({ spacing: { after: 40 }, children: [ new TextRun({ text: "The Bristlecone Leadership Case", bold: true, font: "Arial", size: 40, color: NAVY }) ] }),
      P([ R("For a go/no-go, three things matter: why we uniquely win, what the customer saves and gains, and what Bristlecone makes. This one-pager answers all three. UNAI is a ", { color: "333333" }),
          R("shared cognitive runtime", { bold: true, color: NAVY }),
          R(" — perception, memory, ontology, planning, evidence and governance built ", { color: "333333" }),
          R("once", { italics: true, color: "333333" }),
          R(", with thin domain executors on top. It consolidates agents; it does not orchestrate them.", { color: "333333" }) ]),

      H1("1 · Unique differentiation — why we win"),
      P([ R("This is a category, not a feature. The market ships orchestrators and MCP routers that keep N separate agents and N² coordination. UNAI removes the agents.", { color: "333333" }) ]),
      bullet([ R("Consolidation, not orchestration: ", { bold: true }), R("N specialist agents collapse to one runtime (e.g., RMA 15 → 1; 105 → 21 layer builds, −80%). Fewer things to build, secure and maintain.") ]),
      bullet([ R("One canonical ontology, zero re-mapping: ", { bold: true }), R("SAP, Databricks/Snowflake/BigQuery and ServiceNow map once to shared meaning, so a use case built on one warehouse runs on another by switching an adapter.") ]),
      bullet([ R("A structural moat — SAP-compliant by design: ", { bold: true }), R("UNAI reads the governed lakehouse copy, in-tenant, read-only first — compliant with SAP’s API Policy (v4/2026) that bars third-party agents from calling SAP APIs directly. Competitors that hit SAP directly cannot match this posture.") ]),
      bullet([ R("Accountable and neutral: ", { bold: true }), R("every decision carries evidence + a governance gate; one observability surface; cloud- and model-neutral (any OpenAI-compatible gateway, including Claude). No lock-in.") ]),

      H1("2 · Customer value — save and become more profitable"),
      P([ R("The runtime pays back on the biggest AI line — ", { color: "333333" }),
          R("inference is ~85% of enterprise AI budgets", { bold: true }),
          R(" — because the shared cognition (ontology context + one plan) is paid once per goal instead of once per specialist. Modeled savings, tunable in the app:", { color: "333333" }) ]),
      table([
        new TableRow({ tableHeader: true, children: [ th("Model", 34), th("100k agent runs/day", 33), th("1M runs/day", 33) ] }),
        new TableRow({ children: [ td("Claude Sonnet 4.6", 34), td("$178k / yr", 33, { color: TEAL, bold: true }), td("$1.78M / yr", 33, { color: TEAL, bold: true }) ] }),
        new TableRow({ children: [ td("Claude Opus 4.6", 34, {}), td("$297k / yr", 33, { color: TEAL, bold: true }), td("$2.97M / yr", 33, { color: TEAL, bold: true }) ] }),
      ]),
      P([ R("Conservative floor — counts only input tokens saved on a light 5-call workflow. Real agent tasks run 20–50 LLM calls, so multiply by ~4–10× (Sonnet @ 100k runs/day ≈ $3.6M/yr). Prompt caching is additive (up to −90% on the shared prefix).", { size: 16, color: MUT, italics: true }) ]),
      bullet([ R("~80% fewer builds: ", { bold: true }), R("seven layers once + a pack per use case (not N×7) → ~4-month payback and ~$3.6M three-year build/run savings for a 10-capability estate.") ]),
      bullet([ R("Outcomes beyond IT: ", { bold: true }), R("faster disruption response and planning cycles (industry: 2–5% margin improvement, 60% faster planning), fewer stock-outs, lower working capital.") ]),
      bullet([ R("Easy to justify: ", { bold: true }), R("list price is ~31% of modeled customer value — the customer keeps the majority.") ]),

      H1("3 · Commercial value — what Bristlecone makes"),
      P([ R("Four reinforcing streams on one platform: ", { color: "333333" }),
          R("subscription + implementation + agent-conversion + managed run", { bold: true }),
          R(". Land with a use case, expand as packs are added (high net revenue retention). ~$327k average ACV for a 10-pack estate, growing per account.", { color: "333333" }) ]),
      table([
        new TableRow({ tableHeader: true, children: [ th("Horizon", 34), th("Customers", 33), th("Total revenue (model)", 33) ] }),
        new TableRow({ children: [ td("Year 1 · prove", 34), td("~10", 33), td("~$5M", 33, { color: TEAL, bold: true }) ] }),
        new TableRow({ children: [ td("Year 2 · expand", 34), td("~40", 33), td("~$22M", 33, { color: TEAL, bold: true }) ] }),
        new TableRow({ children: [ td("Year 3 · scale", 34), td("~120", 33), td("~$65M", 33, { color: TEAL, bold: true }) ] }),
        new TableRow({ children: [ td("~Year 7 · target", 34, { bold: true }), td("~800", 33, { bold: true }), td("~$1B ( $620M sub + $372M svc )", 33, { color: NAVY, bold: true }) ] }),
      ]),
      P([ R("The Cognitive Runtime is the wedge: it consolidates a customer’s agent sprawl (conversion services), then compounds through packs (subscription) and operation (managed run) — Bristlecone’s SI strength monetized on a product, not just a project.", { color: "333333" }) ]),

      H1("The ask"),
      P([ R("Greenlight a 6-week, read-only pilot ", { bold: true, color: NAVY }),
          R("on one use case (Supplier Disruption) against a customer’s Databricks — measured value in six weeks, expand on proof. The substrate is already built.", { color: "333333" }) ]),
    ],
  }],
});

Packer.toBuffer(doc).then(buf => { fs.writeFileSync(process.argv[2] || "UNAI_Leadership_Case_Brief.docx", buf); console.log("wrote brief"); });
