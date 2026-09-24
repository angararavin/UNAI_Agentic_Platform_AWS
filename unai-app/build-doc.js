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
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, LevelFormat, TableOfContents, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak, ExternalHyperlink } = require("docx");
const LINK = (text, url) => new ExternalHyperlink({ children:[new TextRun({text, style:"Hyperlink", size:19})], link:url });

const NAVY="1F3A66", ACC="2F6DF0", TEAL="13B58C", RED="E2574C", AMBER="E6A52B", GREY="6B7689", LIGHT="EEF3FB", LIGHTT="E2F4EE";
const CW = 9360;

const H1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1, children:[new TextRun(t)] });
const H2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, children:[new TextRun(t)] });
const P  = (t,opts={}) => new Paragraph({ spacing:{after:140,line:276}, ...opts, children: Array.isArray(t)?t:[new TextRun(t)] });
const bullet = t => new Paragraph({ numbering:{reference:"b",level:0}, spacing:{after:70,line:264}, children: Array.isArray(t)?t:[new TextRun(t)] });
const B = t => new TextRun({text:t,bold:true});

function img(file,w){ const dims={fig_arch:[9.6,6.2],fig_gen:[9.6,4.4],fig_complexity:[6.2,3.6],fig_maint:[6.2,3.6],fig_run:[7.4,3.4],fig_cost:[6.4,3.6],fig_time:[6.4,3.6]}[file];
  const h=Math.round(w*dims[1]/dims[0]);
  return new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:120,after:60},children:[new ImageRun({type:"png",data:fs.readFileSync(file+".png"),transformation:{width:w,height:h},altText:{title:file,description:file,name:file}})]});}
const cap = t => new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:160},children:[new TextRun({text:t,italics:true,size:18,color:GREY})]});

function table(headers, rows, widths){
  const border={style:BorderStyle.SINGLE,size:1,color:"CCD5E4"};
  const borders={top:border,bottom:border,left:border,right:border};
  const mk=(text,opts={})=>new TableCell({borders,width:{size:opts.w,type:WidthType.DXA},
    shading:{fill:opts.fill||"FFFFFF",type:ShadingType.CLEAR},margins:{top:70,bottom:70,left:110,right:110},
    children:[new Paragraph({children:[new TextRun({text:String(text),bold:!!opts.bold,color:opts.color||"222B3A",size:19})]})]});
  const head=new TableRow({tableHeader:true,children:headers.map((h,i)=>mk(h,{w:widths[i],fill:NAVY,color:"FFFFFF",bold:true}))});
  const body=rows.map((r,ri)=>new TableRow({children:r.map((c,i)=>{
    const isObj=c&&typeof c==="object"&&!Array.isArray(c);
    return mk(isObj?c.t:c,{w:widths[i],fill:isObj&&c.fill?c.fill:(ri%2?LIGHT:"FFFFFF"),bold:isObj&&c.bold,color:isObj&&c.color});
  })}));
  return new Table({width:{size:CW,type:WidthType.DXA},columnWidths:widths,rows:[head,...body]});
}

function callout(title, lines, fill, bar){
  const border={style:BorderStyle.SINGLE,size:1,color:bar};
  return new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[CW],rows:[new TableRow({children:[
    new TableCell({borders:{top:border,bottom:border,right:border,left:{style:BorderStyle.SINGLE,size:24,color:bar}},
      shading:{fill,type:ShadingType.CLEAR},margins:{top:120,bottom:120,left:200,right:160},
      children:[new Paragraph({spacing:{after:60},children:[new TextRun({text:title,bold:true,size:22,color:NAVY})]},),
        ...lines.map(l=>new Paragraph({numbering:{reference:"b",level:0},spacing:{after:40},children:[new TextRun({text:l,size:20})]}))]})
  ]})]});
}

const styles={
  default:{document:{run:{font:"Arial",size:21,color:"222B3A"}}},
  paragraphStyles:[
    {id:"Heading1",name:"Heading 1",basedOn:"Normal",next:"Normal",quickFormat:true,
      run:{size:30,bold:true,font:"Arial",color:NAVY},paragraph:{spacing:{before:300,after:160},outlineLevel:0}},
    {id:"Heading2",name:"Heading 2",basedOn:"Normal",next:"Normal",quickFormat:true,
      run:{size:24,bold:true,font:"Arial",color:ACC},paragraph:{spacing:{before:220,after:120},outlineLevel:1}},
  ]
};
const numbering={config:[{reference:"b",levels:[{level:0,format:LevelFormat.BULLET,text:"•",alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:480,hanging:240}}}}]}]};

const title=[
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:1500,after:40},children:[new ImageRun({type:"png",data:fs.readFileSync("unai_logo_light.png"),transformation:{width:300,height:75},altText:{title:"UNAI",description:"UNAI logo",name:"UNAI"}})]}),
  new Paragraph({spacing:{before:60,after:60},alignment:AlignmentType.CENTER,children:[new TextRun({text:"The UNAI Architecture",bold:true,size:52,color:NAVY})]}),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:40},children:[new TextRun({text:"From Many Specialist Agents to One Adaptive Agent",size:28,color:ACC})]}),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:300},children:[new TextRun({text:"Feasibility, Architecture & a Working Application",size:24,color:GREY,italics:true})]}),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:40},children:[new TextRun({text:"Why · What · How",bold:true,size:22,color:TEAL})]}),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:60},children:[new TextRun({text:"UNAI  (oo-NYE)  ·  a consolidation runtime",size:20,color:NAVY,bold:true})]}),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:1400,after:20},children:[new TextRun({text:"Prepared for: Ravin Angara, Bristlecone",size:20,color:GREY})]}),
  new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:"Version 1.0 · June 22, 2026 · Companion to the UNAI Technical Specification",size:18,color:GREY})]}),
  new Paragraph({children:[new PageBreak()]}),
  new Paragraph({heading:HeadingLevel.HEADING_1,children:[new TextRun("Contents")]}),
  new TableOfContents("Contents",{hyperlink:true,headingStyleRange:"1-2"}),
  new Paragraph({children:[new PageBreak()]}),
];

const body=[
  H1("1. Verdict — How Possible Is This Approach?"),
  P([B("Highly possible, and demonstrably real. "),new TextRun("The approach in the technical specification is not speculative. Every primitive it depends on — LLM orchestration with function calling, a canonical ontology over heterogeneous schemas, a shared action bus, a pub/sub agent-to-agent protocol, and a built-in evidence/explainability layer — already exists in production today. To prove it rather than assert it, this engagement ships a working application, "),B("UNAI Studio"),new TextRun(", that builds one adaptive agent and executes a real business workflow end-to-end against live SQLite-backed systems of record.")]),
  callout("What the working app proves (measured, not claimed)",[
    "A single UNAI ran a 4-step disruption-response workflow that would conventionally require 4 separate specialist agents — a 4:1 substitution.",
    "Layer implementations dropped from 28 (4 agents × 7 layers) to 11 (7 shared layers + 4 lightweight tool packs) — a 61% reduction on this one use case; ~90% at a 10-agent enterprise scale.",
    "The agent crossed 4 systems of record (SAP MM, SD, FI, and an analytics/forecast store) with 5 runtime system transitions and 0 schema re-maps — context switching cost was fully absorbed by the canonical ontology.",
    "All seven layers were exercised in the run; every decision carried a confidence score, weighted attribution, an uncertainty band, a counterfactual, and a plain-English rationale — three actions executed autonomously and one ($56K PO) was correctly routed to a human approver under a value-based gate.",
  ],LIGHTT,TEAL),
  callout("The name — UNAI",[
    "UNAI (Basque: “shepherd” — one who guides the many; also reads literally as “one + AI”). Two syllables (“oo-NYE”), instantly memorable, and it embeds AI meaningfully.",
    "It carries a triple meaning: one-AI; the shepherd that herds many agents into one; and a nod to unity — exactly this architecture’s thesis of collapsing many specialist agents into a single adaptive one.",
    "Read as two words, “Un AI” means “One AI” — in French and Spanish “un” = “one” — which reinforces the thesis rather than undercutting it.",
    "Brand rule: always write it as a single word, UNAI (one consistent case), so it never reads as the English prefix “un-”. Lead with the tagline “one AI that does the work of many.”",
    "A preliminary scan found no AI company using the name (minor note: it is a Basque first name — e.g. football manager Unai Emery — but clean as a technology brand). “Super agent” is retained only as the category descriptor.",
  ],LIGHT,ACC),
  P([new TextRun("The headline number from the specification — a "),B("90% reduction in architectural complexity"),new TextRun(" — is therefore the right order of magnitude. It is mechanical: 90% of what makes an agent “an agent” (how it perceives, remembers, reasons, evidences, acts, collaborates, and explains) is identical across domains. Build those seven layers once and the marginal cost of each new business capability collapses from a multi-week engineering project to a configuration task.")]),
  P([B("The platform. "),new TextRun("This build is deliberately "),B("cloud-neutral and Mistral-centric"),new TextRun(": reasoning and explainability run on "),B("Mistral Large and Mistral Small"),new TextRun(" (tool calling), served either through "),B("Mistral La Plateforme"),new TextRun(" (EU-hosted) or "),B("self-hosted from the open-weight models on vLLM"),new TextRun(" inside the customer’s own perimeter. The orchestrator and agents run as containers on Kubernetes; the memory fabric is PostgreSQL + pgvector with Redis on the hot path; the A2A bus is NATS; SAP integration stays on BTP OData/BAPI wrapped as MCP tools. Nothing is tied to a single hyperscaler. The standout consequence is "),B("data residency"),new TextRun(": with self-hosted Mistral, no business data ever leaves the customer’s network — a stronger position than any managed-LLM design and a clean fit for GDPR and the EU AI Act.")]),
  P([B("The honest caveats. "),new TextRun("Feasibility is strong on the technical axis (~8.5/10) but gated by organizational factors — change management for planners moving from manual to autonomous decisions, and a genuine skills gap at the intersection of LLM orchestration and SAP BAPI semantics. LLM latency (2–8s per reasoning step) rules out sub-second use cases without caching, and self-hosting Mistral adds GPU-operations responsibility. None of these are project-killers; all have established mitigations covered in Section 9.")]),

  new Paragraph({children:[new PageBreak()]}),
  H1("2. Why — The Problem With One-Agent-Per-Job"),
  P("Enterprises adopting agentic AI tend to build a new, self-contained agent for every task: a demand-forecasting agent, an inventory agent, a procurement agent, and so on. Each one re-implements the same seven capabilities, wires its own connectors to the ERP, maintains its own memory, and talks to its peers over bespoke point-to-point integrations. This pattern does not scale."),
  H2("The cost compounds three ways"),
  bullet([B("Duplicated engineering. "),new TextRun("Ten agents means seventy layer implementations. Seven near-identical perception layers, seven memory stores, seven action handlers — each separately built, tested, secured, and maintained.")]),
  bullet([B("Quadratic collaboration. "),new TextRun("Point-to-point agent communication scales as N×(N−1)/2. Ten agents imply 45 bidirectional channels; adding an eleventh forces edits to every existing agent.")]),
  bullet([B("Repeated context switching. "),new TextRun("Every agent that touches SAP MM must independently learn that MATNR means “material” and LABST means “on-hand stock.” The same schema is re-mapped in agent after agent, and re-mapped again whenever an agent moves from one system of record to another.")]),
  P([new TextRun("The specification quantifies the steady-state burden of a ten-agent estate at "),B("878 maintenance hours per month"),new TextRun(" across "),B("70 layer implementations"),new TextRun(". That is the status quo the UNAI architecture is designed to dismantle.")]),
  img("fig_gen",540),
  cap("Figure 1 — The structural difference: many duplicated agents (left) versus one agent with shared layers and lightweight tool packs (right)."),

  new Paragraph({children:[new PageBreak()]}),
  H1("3. What — The Seven-Layer UNAI"),
  callout("In plain terms — how one agent absorbs the work of many",[
    "Think of the old way as hiring a separate specialist for every job. Each specialist must be built to read your systems, keep its own memory, make decisions, message every other specialist, and explain itself — the same plumbing, rebuilt over and over.",
    "A UNAI is one worker that already owns that plumbing — the seven shared layers — and simply picks up a small playbook (a tool pack) for each new job.",
    "So one agent does the work of many: the expensive 90% (the layers) is built once; only the cheap 10% (the playbook) changes per task. Adding a capability becomes a configuration, not a new agent.",
  ],LIGHTT,TEAL),
  P([new TextRun("A "),B("UNAI"),new TextRun(" is an agent whose seven universal layers are implemented once and shared across every business domain. Only two things stay domain-specific: the "),B("tool packs"),new TextRun(" (which SAP BAPIs to call, which analytics tables to read) and the "),B("ontology mappings"),new TextRun(" (what a stockout is, what a safety-stock formula looks like). Everything else is common infrastructure. Reasoning and explainability are served by Mistral; the surrounding fabric (Kubernetes, PostgreSQL + pgvector, Redis, NATS) is cloud-neutral and self-hostable.")]),
  img("fig_arch",540),
  cap("Figure 2 — The Mistral-centric, cloud-neutral UNAI platform: orchestrator, seven shared layers, tool packs, a canonical ontology, and pluggable systems of record."),
  H2("The seven layers"),
  table(["Layer","Role","Why it can be shared"],[
    ["L1 Perception","Reads any ERP schema into canonical form","Reading is generic once a field-mapping ontology exists"],
    ["L2 Memory","Unified episodic + semantic store","One memory fabric removes per-agent silos and 3× storage"],
    ["L3 Reasoning","Decomposes goals into sub-tasks at runtime","Goal decomposition is domain-agnostic LLM orchestration"],
    ["L4 Evidence","Confidence, attribution, uncertainty bounds","Evidence generation is identical regardless of decision"],
    ["L5 Action","Universal BAPI/OData action bus","One idempotent, retrying write path serves all domains"],
    ["L6 Collaboration","A2A pub/sub event bus","Topics replace N×N wiring; adding an agent is a subscribe"],
    ["L7 Explainability","Plain-English rationale + audit trail","Narration of evidence is the same mechanism everywhere"],
  ],[1900,4060,3400]),
  P([new TextRun("In the working app these seven layers are real code in "),B("engine.js"),new TextRun(". Each tool pack is a small handler (a dozen lines) that calls the shared layers — never its own copy of them. That single design choice is the whole thesis made concrete.")]),

  new Paragraph({children:[new PageBreak()]}),
  H1("4. How — The Working Application"),
  P([new TextRun("UNAI Studio is a real, runnable application, not a slideware mock-up. You build a UNAI (name it, toggle its layers, point it at connected systems), choose a business use case, and press "),B("Build & Execute"),new TextRun(". A single agent then runs the entire workflow live and the screen reports the proof metrics.")]),
  H2("Architecture of the app"),
  table(["Component","File","What it does"],[
    ["UNAI engine","engine.js","The 7 shared layers, orchestrator, A2A bus, canonical ontology mapper, and the substitution / context-switch metrics. Runs in the browser and under Node."],
    ["Systems of record","db.js","SAP MM / SD / FI and an analytics/forecast store as real SQLite tables, each using that system’s native field names."],
    ["Server","server.js","Serves the UI and runs the engine against SQLite over an HTTP API."],
    ["Studio UI","index.html","Build the agent, execute the use case, and view the proof dashboard and live execution trace."],
  ],[2300,1600,5460]),
  H2("Why it is genuinely a UNAI, not four agents in a trench coat"),
  bullet("The orchestrator decomposes the goal at runtime (L3) and routes each sub-task through the same shared layer instances — there is exactly one Perception, one Action, one Evidence implementation."),
  bullet("Each system of record is a pluggable adapter exposing just two methods, query() and write(). Swapping a SQLite adapter for a live SAP OData/BAPI client changes nothing in the engine — the central claim of substitutability, demonstrated."),
  bullet("The numbers on screen are computed from the actual run (call counts, ontology translations, transitions), not hard-coded."),
  callout("Run it yourself",[
    "Zero install: open index.html in a browser (in-memory mode).",
    "Full app with a real database: npm start, then open http://localhost:3000 (uses Node 22’s built-in SQLite — no native build).",
    "Headless proof: node run-demo.js --sqlite prints the metrics and writes POs to the database.",
  ],LIGHT,ACC),

  new Paragraph({children:[new PageBreak()]}),
  H1("5. Many Agents → One — The Substitution, Measured"),
  P("The disruption-response use case delivers four capabilities. In a Gen-1 architecture each is a separate specialist agent. In the UNAI run, one agent delivered all four:"),
  table(["Capability delivered","Gen-1: a whole agent","Gen-2: who ran it"],[
    ["Disruption detection","Disruption Response Agent (7 layers)","The one UNAI"],
    ["Demand re-forecast","Demand Forecasting Agent (7 layers)","The one UNAI"],
    ["Inventory rebalance","Inventory Optimization Agent (7 layers)","The one UNAI"],
    ["Replacement procurement","Procurement Agent (7 layers)","The one UNAI"],
  ],[3500,3760,2100]),
  img("fig_run",430),
  cap("Figure 3 — Measured output of the live run: agents used (4 → 1) and schema re-maps during context switching (6 → 0)."),
  table(["Metric","Gen-1","Gen-2 (measured)","Reduction"],[
    [{t:"Agents deployed",bold:true},"4","1","75% (4:1)"],
    [{t:"Layer implementations",bold:true},"28","11","61%"],
    [{t:"Schema re-maps (context switch)",bold:true},"5","0","100%"],
    ["Decisions: autonomous / human-gated","—","3 / 1","—"],
    ["Shared layers exercised","—","7 / 7","—"],
    ["End-to-end run time","—","< 20 ms*","—"],
  ],[3700,1700,2360,1600]),
  P([new TextRun("*Excludes real LLM inference latency; the deterministic reasoning policy in the demo stands in for the Mistral orchestration the production design uses.")]),
  H2("Where the reduction numbers come from"),
  P([new TextRun("An “implementation” is one layer you must build, test, secure and maintain. The arithmetic is mechanical:")]),
  bullet([B("Old way (Gen-1): "),new TextRun("each capability is its own specialist agent, and each agent builds its own 7 layers. For this 4-capability run that is 4 × 7 = "),B("28 implementations"),new TextRun(".")]),
  bullet([B("UNAI (Gen-2): "),new TextRun("the 7 layers are built once and shared, plus one lightweight tool pack per capability — 7 + 4 = "),B("11 implementations"),new TextRun(".")]),
  bullet([B("Reduction: "),new TextRun("28 − 11 = 17 fewer, i.e. 17 ÷ 28 ≈ "),B("61% less"),new TextRun(" to build and maintain for this run.")]),
  P([new TextRun("The key is that Gen-2 is "),B("not"),new TextRun(" “1 × 7” — it is “7 shared + N tool packs”, so the build count barely grows as capabilities are added. At a "),B("10-agent enterprise scale"),new TextRun(" the same mechanic gives 10 × 7 = 70 versus 7 shared layers (the specification’s headline), a ~90% reduction; counting tool packs too, 70 → 17 (~76%). The Development Workbench applies the identical arithmetic to its four supply-chain use cases: 8 specialist agents × 7 = 56 versus 7 + 4 = 11, an ~80% reduction.")]),

  new Paragraph({children:[new PageBreak()]}),
  H1("6. Simplifying Context Switching Across Systems of Record"),
  P([new TextRun("Moving from one system of record to another is where conventional agents bleed effort. The same business concept wears a different name in every system. The "),B("canonical business ontology"),new TextRun(" reconciles them once, centrally, so a system transition costs zero re-mapping work thereafter.")]),
  H2("The same concept, four dialects"),
  table(["Canonical concept","SAP MM","SAP SD","SAP FI","Analytics"],[
    ["sku","MATNR","MATNR","MATKL","sku_id"],
    ["plant","WERKS","WERKS","BUKRS","dc_code"],
    ["on-hand qty","LABST","KWMENG","—","qty_on_hand"],
    ["supplier","LIFNR","—","LIFNR","vendor_id"],
    ["purchase order","EBELN","—","EBELN","po_id"],
  ],[2560,1700,1700,1700,1700]),
  H2("Why the cost collapses"),
  P([new TextRun("During the run the agent moved between systems "),B("5 times"),new TextRun(" and resolved "),B("62 field translations"),new TextRun(", yet performed "),B("0 schema re-maps"),new TextRun(". The transitions themselves are unavoidable — work genuinely spans the analytics store, SAP SD, SAP MM, and SAP FI. What changes is the cost of each transition:")]),
  bullet([B("Gen-1: "),new TextRun("every transition forces the agent to re-establish and re-map the target system’s schema itself — one re-map per transition, repeated in every agent.")]),
  bullet([B("Gen-2: "),new TextRun("the ontology has already mapped each system once. A transition like MATNR→sku_id (SAP MM versus the analytics store) is resolved centrally and reused everywhere — the agent simply asks for “sku” regardless of which system answers.")]),
  P([new TextRun("Operationally this means onboarding a brand-new ERP drops from "),B("4–6 weeks to 2–3 days"),new TextRun(" (configuration, not code), and a new business capability ships in days rather than weeks.")]),

  new Paragraph({children:[new PageBreak()]}),
  H1("7. Live Demo — Supplier Disruption Response"),
  P("Scenario: a port strike disrupts a key APAC supplier (V-2207, risk score 0.78). The single UNAI detects the signal in the analytics store, re-forecasts demand (+12% pull-forward) across the analytics store and SAP SD, rebalances inventory and raises safety stock in SAP MM, verifies spend context in SAP FI, and raises replacement purchase orders — rerouting away from the disrupted supplier to a backup."),
  H2("Actions taken (persisted to the database)"),
  table(["PO","SKU","Qty","Supplier","Value","Conf.","Mode"],[
    ["45···","FG-1001","1,084",{t:"V-9001 (backup)",bold:true,color:"0C7A5E"},"$46,070","98%",{t:"Autonomous",bold:true,color:"0C7A5E"}],
    ["staged","FG-1003","586","V-3310","$56,256","88%",{t:"Human approval",bold:true,color:"B23A30"}],
  ],[1250,1300,1050,2560,1250,900,1050]),
  P([new TextRun("The FG-1001 line was automatically "),B("rerouted to a backup supplier"),new TextRun(" because its primary supplier was the disrupted one — a cross-capability decision a single UNAI makes trivially because detection, forecasting, and procurement share one memory fabric. The FG-1003 PO was "),B("correctly held for a human approver"),new TextRun(": at $56,256 it exceeds the $50,000 value-based approval limit, so even at 88% confidence the agent stages it rather than executing — the human-in-the-loop governance the specification calls for.")]),
  H2("Explainability — every decision is traced, not a black box"),
  P([new TextRun("This directly answers a common objection to autonomous agents. The Evidence and Explainability layers attach a full, auditable record to "),B("every"),new TextRun(" decision: a confidence score, weighted attribution of the drivers, an uncertainty band, a what-if counterfactual, and a plain-English rationale. The app surfaces all of it. For example, the held PO reads:")]),
  callout("Worked example — the rationale the app shows for the held PO",[
    "Decision: Raise PO for FG-1003 (586 units, $56,256).",
    "Confidence 88% (±12%). Primary driver: stock-out revenue risk (86% of the decision).",
    "Governance gate: value $56,256 > $50,000 approval limit.",
    "Counterfactual: a PO at or below $50,000 would execute autonomously; this one needs a buyer’s sign-off.",
    "Outcome: routed to a human approver — full audit trail retained for SOX / 21 CFR Part 11 / Basel III.",
  ],LIGHT,ACC),
  P([new TextRun("Across the run all "),B("seven layers were exercised"),new TextRun(" — Perception (6 reads), Memory (7 store/recall), Reasoning (1 decomposition), Evidence (5 evaluations), Action (3 writes), Collaboration (4 A2A messages), and Explainability (5 narrations) — and the app shows each layer’s invocation count and its last operation, so it is visible that one shared implementation of each layer served the whole workflow.")]),
  callout("What a four-agent estate would have needed here",[
    "4 separate agents, each with its own 7 layers, connectors, memory, and error handling.",
    "Hand-off integrations between detection → forecast → inventory → procurement.",
    "Independent schema mappings for each system each agent touches.",
    "The UNAI replaced all of it with one codebase, one memory, one ontology.",
  ],LIGHTT,TEAL),

  new Paragraph({children:[new PageBreak()]}),
  H1("8. Cost, Benefit & Efficiency"),
  P("The economics follow directly from the complexity reduction: build seven layers once, and both the build and the run amortize across every capability added thereafter."),
  img("fig_complexity",330),
  cap("Figure 4 — Layer implementations at a 10-agent enterprise scale: 70 → 17 (~90% reduction)."),
  img("fig_maint",330),
  cap("Figure 5 — Monthly maintenance burden: 878 → 80 hours (~91% reduction)."),
  img("fig_time",380),
  cap("Figure 6 — Time-to-value: new agent build and new ERP onboarding both fall ~95%."),
  H2("Three-year economics"),
  table(["Line","Low","High"],[
    [{t:"Year-1 investment (build + run)",bold:true},"$2.4M","$2.6M"],
    [{t:"Annual value created",bold:true,color:"0C7A5E"},"$9.0M","$14.0M"],
    ["  — Inventory carrying-cost reduction","$3.2M","$4.8M"],
    ["  — Stockout prevention","$2.1M","$3.5M"],
    ["  — Planner productivity (40%)","$1.4M","$2.0M"],
    ["  — Disruption response","$1.5M","$2.2M"],
    ["  — Fraud / duplicate-invoice prevention","$0.8M","$1.5M"],
    [{t:"Payback period",bold:true},"4 months","7 months"],
    [{t:"3-year NPV (12% discount)",bold:true,color:"0C7A5E"},"$18M","$32M"],
  ],[5360,2000,2000]),
  img("fig_cost",380),
  cap("Figure 7 — Year-1 investment against the annual value range; payback in 4–7 months."),

  new Paragraph({children:[new PageBreak()]}),
  H1("9. Feasibility & Risk"),
  table(["Dimension","Score","Assessment"],[
    [{t:"Technical",bold:true},"8.5 / 10","All required primitives — Mistral Large/Small with tool calling (La Plateforme or self-hosted vLLM), SAP BTP OData+BAPI as MCP tools, NATS pub/sub, PostgreSQL + pgvector, Redis, Kubernetes — are available today. Main constraints: LLM latency for sub-second paths and GPU capacity if self-hosting."],
    [{t:"Operational",bold:true},"7.5 / 10","Bristlecone’s SAP depth de-risks the hardest layer; existing accelerators cut ~40% of build. The stack runs on the customer’s existing Kubernetes footprint (any cloud or on-prem). Gated by change management, a real skills gap, and — if self-hosting Mistral — GPU/MLOps capability."],
    [{t:"Financial",bold:true},"9 / 10","4–7 month payback, $18–32M 3-yr NPV. Inference cost is the main variable; mitigated by Mistral Small for 80% of calls, caching, and the option to self-host (shifts variable token cost to fixed GPU cost)."],
    [{t:"Regulatory",bold:true},"8 / 10","Strengthened by the re-platform: self-hosted, open-weight Mistral means data never leaves the customer perimeter, and an EU-based provider aligns with GDPR. Evidence Engine gives full audit trails (SOX, 21 CFR Part 11, Basel III). EU AI Act high-risk classification still needs a conformity assessment."],
  ],[1900,1500,5960]),
  H2("Principal risks and mitigations"),
  bullet([B("LLM hallucination — "),new TextRun("require confidence ≥ 0.85 for autonomous action; ground with mistral-embed RAG over SAP data; below threshold routes to a human.")]),
  bullet([B("Runaway actions — "),new TextRun("per-agent action budgets, idempotency keys on all SAP writes, dead-letter after 3 retries, and a NATS kill-switch topic.")]),
  bullet([B("Data privacy — "),new TextRun("PII detection and redaction before any model call; with self-hosted Mistral, prompts never leave the perimeter; no PII in prompt logs.")]),
  bullet([B("Inference cost / GPU capacity — "),new TextRun("start on managed La Plateforme; Mistral Small for 80% of calls with response caching and daily token budgets; move latency- or residency-sensitive workloads to self-hosted GPUs with autoscaling.")]),
  bullet([B("Vendor lock-in (now very low) — "),new TextRun("open-weight models plus open protocols (MCP, NATS, PostgreSQL) keep the whole stack portable across clouds and on-prem; no hyperscaler dependency.")]),
  bullet([B("Organizational adoption — "),new TextRun("phased rollout with human-in-the-loop approval gates for the first 90 days; value thresholds (e.g., > $50K actions) keep humans accountable.")]),

  new Paragraph({children:[new PageBreak()]}),
  H1("10. Roadmap & Recommendation"),
  table(["Phase","Weeks","Milestone"],[
    ["1 · Foundation","1–4","Cloud-neutral landing zone (Kubernetes, Postgres+pgvector, Redis, NATS) + Mistral serving; first agent reads SAP S/4HANA inventory and returns an explainable recommendation."],
    ["2 · First UNAI","5–8","Inventory UNAI in production with planner oversight; first autonomous PO."],
    ["3 · Multi-agent mesh","9–12","3+ capabilities collaborating; 29-second end-to-end disruption response."],
    ["4 · Production hardening","13–16","GA readiness; 10K+ autonomous decisions/day at 99.9% uptime."],
  ],[2600,1200,5560]),
  H2("Recommendation"),
  callout("Proceed with a Phase 1–2 engagement",[
    "8 weeks, ~$800K, to deliver the first Inventory Optimization UNAI in production with planner oversight.",
    "This validates the architecture, demonstrates ROI early, and builds internal momentum before scaling to the full mesh in Phases 3–4.",
    "The working UNAI Studio app is the de-risking artifact: it already demonstrates the substitution and context-switch collapse end-to-end.",
  ],LIGHTT,TEAL),
  P([new TextRun("In short: the approach is not only possible, it is "),B("working in the accompanying application today"),new TextRun(". The remaining work is hardening, governance, and the disciplined organizational rollout that turns a proven architecture into production value.")]),

  // ===================== 11. WHAT IT IS / IS NOT + MCP/A2A =====================
  new Paragraph({children:[new PageBreak()]}),
  H1("11. What a UNAI Is, What It Is Not, and How It Differs from MCP and A2A"),
  P([new TextRun("“Super agent” is an overloaded term, so this section pins down precisely what this architecture is, separates it from the two protocols it is most often confused with — "),B("MCP"),new TextRun(" (Model Context Protocol) and "),B("A2A"),new TextRun(" (Agent-to-Agent) — and gives an honest read on novelty and where it sits in the market.")]),
  H2("What a UNAI IS"),
  bullet([B("One adaptive agent with seven shared layers. "),new TextRun("Perception, Memory, Reasoning, Evidence, Action, Collaboration, and Explainability are implemented once and reused across every domain.")]),
  bullet([B("A canonical-ontology agent. "),new TextRun("It reasons in business concepts (sku, supplier, forecast), not native field names, because one ontology gives every system a shared vocabulary.")]),
  bullet([B("A consolidation strategy. "),new TextRun("It reduces the number of agents and the build/maintenance count by sharing the substrate; a new capability is a lightweight tool pack (configuration), not a new agent.")]),
  bullet([B("Governed and explainable by construction. "),new TextRun("Confidence and value gates, human-in-the-loop for high-impact actions, and a full evidence/audit trail are part of the architecture, not bolted on.")]),
  H2("What a UNAI is NOT"),
  bullet([B("Not just an orchestrator/router. "),new TextRun("It is not merely a “front-door” agent that delegates to many specialist sub-agents — that pattern keeps the agent count high; this design lowers it.")]),
  bullet([B("Not a protocol. "),new TextRun("It does not replace MCP or A2A; it uses them as the tool-access and agent-messaging layers.")]),
  bullet([B("Not one giant prompt or model. "),new TextRun("The seven layers are real, separable services — not a single monolithic model call.")]),
  bullet([B("Not a data platform. "),new TextRun("It reads Snowflake, Databricks, Postgres, DuckDB or an Iceberg lakehouse through adapters; it does not store the data itself.")]),
  bullet([B("Not “no humans.” "),new TextRun("High-value or low-confidence actions are deliberately routed to a person.")]),

  H2("MCP vs A2A vs UNAI"),
  table(["Aspect","MCP","A2A","UNAI"],[
    [{t:"Level",bold:true},"Tool-access protocol","Agent-to-agent protocol","Application architecture"],
    [{t:"Standardizes",bold:true},"How an agent calls tools/data","How independent agents discover & delegate to each other","What an agent IS — shared layers + semantics"],
    [{t:"Problem solved",bold:true},"M×N tool integration","Cross-vendor agent interoperability","Many→one agent consolidation + semantic unification"],
    [{t:"Handles meaning?",bold:true},"No — transport only","No — messaging only","Yes — canonical ontology reconciles fields"],
    [{t:"Role in this design",bold:true},"Action/Perception transport to systems of record","The Collaboration layer (A2A bus)","The whole agent built on top of both"],
    [{t:"Status (as reported, 2026)",bold:true},"~97M monthly SDK downloads; 17k+ servers; Linux Foundation","150+ orgs; 22k+ GitHub stars; 50+ partners; Linux Foundation","Emerging; orchestrator variants shipping (e.g. Salesforce)"],
  ],[1700,2553,2553,2554]),
  P([new TextRun("The clean mental model: "),B("MCP makes each tool easy to reach; A2A lets separate agents talk; the UNAI makes one agent able to do the work of many over those tools."),new TextRun(" The first two are plumbing this architecture consumes; the third is the architecture itself.")]),

  H2("How the UNAI differentiates"),
  P([new TextRun("The market’s center of gravity is "),B("orchestration"),new TextRun(" — a front-door agent that decomposes a request and delegates to specialist sub-agents (for example, Salesforce Agentforce “unais”). That unifies the user experience but leaves the agent count, and the duplicated seven-layer plumbing, intact. This design differs on three axes:")]),
  bullet([B("Consolidation over orchestration — "),new TextRun("fewer agents, not a manager standing over many.")]),
  bullet([B("Semantic unification — "),new TextRun("a canonical ontology gives one meaning across systems; MCP and A2A standardize transport and messaging, not meaning.")]),
  bullet([B("Measured compression — "),new TextRun("the running app shows 28→11 implementations on one workflow, 56→11 across four supply-chain use cases, and ~90% at a 10-agent enterprise scale, each with built-in evidence and observability.")]),

  H2("Why it is not widely used yet"),
  bullet([B("Tooling momentum favors more agents, not fewer. "),new TextRun("MCP and A2A make it easy to add and connect agents; the ecosystem is optimizing the “maze,” not collapsing it.")]),
  bullet([B("Consolidation needs an upfront canonical ontology — "),new TextRun("organization-specific and harder than wiring a connector.")]),
  bullet([B("One broadly-scoped agent demands mature governance, "),new TextRun("evidence and observability before teams will trust it — a higher bar than many narrow bots (this design supplies exactly that).")]),
  bullet([B("Vendor incentives. "),new TextRun("Platforms monetize agent sprawl and orchestration; “build seven layers once and need fewer agents” is a customer-savings story, not a seat-expansion story.")]),
  bullet([B("Organizational inertia. "),new TextRun("Teams own their own agents; consolidation crosses team boundaries.")]),

  H2("Prior art, novelty & IP positioning"),
  P([B("An honest assessment for IP purposes. "),new TextRun("The term “super agent” is already in use — but predominantly for the "),B("orchestrator"),new TextRun(" pattern (a router over specialist sub-agents), so this is not a “never thought of” concept, and branding it that way would weaken rather than strengthen any filing. The building blocks also have precedents: shared-service / microkernel software design, ontology-based data integration and enterprise information integration, and multi-agent orchestration.")]),
  P([new TextRun("What is distinctive here is the "),B("specific combination"),new TextRun(": (1) implementing the seven agent layers once as a shared substrate; (2) a canonical business ontology as the semantic spine across heterogeneous systems of record; and (3) using that to measurably collapse N specialist agents into one or two, with quantified build/maintenance reduction, ontology-driven zero-re-map context switching, and built-in evidence and governance.")]),
  callout("Recommended IP path (not legal advice)",[
    "Treat “differentiated” as a positioning claim, not a legal novelty finding — patentability cannot be assessed without a formal search.",
    "Commission a prior-art and patentability search with IP counsel before filing; named precedents (Salesforce orchestrator unais, super-agent router research) must be addressed.",
    "Frame any application around the novel COMBINATION and specific mechanisms — e.g. the layer-sharing compression method and the ontology-driven zero-re-map context switching — not the term “super agent” itself.",
    "Internally, position this as a “consolidation UNAI” to distinguish it cleanly from the prevailing “orchestration unai.”",
  ],LIGHT,ACC),
  H2("Market signals (as reported by third parties, 2026)"),
  P([new TextRun("Adoption figures below are as reported by the cited sources and should be confirmed before external use: "),B("MCP"),new TextRun(" ~97M monthly SDK downloads and 17,000+ public servers, donated to the Linux Foundation; "),B("A2A"),new TextRun(" 150+ production organizations, 22,000+ GitHub stars and 50+ partners under the Linux Foundation; "),B("Salesforce Agentforce"),new TextRun(" ships “unais” in the orchestrator sense. No public, audited deployment of the consolidation architecture described here (shared layers + canonical ontology collapsing many agents into one) was found — which is the gap this work targets.")]),
  new Paragraph({spacing:{after:120},children:[new TextRun({text:"Sources: ",bold:true,size:19}),
    LINK("Salesforce — What Are UNAI", "https://www.salesforce.com/agentforce/ai-agents/unais/"), new TextRun({text:" · ",size:19}),
    LINK("Toward UNAI System with Hybrid AI Routers (arXiv)", "https://arxiv.org/pdf/2504.10519"), new TextRun({text:" · ",size:19}),
    LINK("MCP adoption statistics 2026", "https://www.digitalapplied.com/blog/mcp-adoption-statistics-2026-model-context-protocol"), new TextRun({text:" · ",size:19}),
    LINK("Model Context Protocol (Wikipedia)", "https://en.wikipedia.org/wiki/Model_Context_Protocol"), new TextRun({text:" · ",size:19}),
    LINK("A2A protocol adoption 2026", "https://www.glukhov.org/ai-systems/comparisons/a2a-protocol-2026-adoption")]}),

  // ===================== 12. AUTOMATIC ONTOLOGY INDUCTION =====================
  new Paragraph({children:[new PageBreak()]}),
  H1("12. Automatic Ontology Induction — the Semantic Auto-Mapper"),
  P([new TextRun("So far the canonical ontology has been hand-authored. The next architectural step lets UNAI "),B("automatically recognise a source system's data and induce its mapping to the canonical semantics"),new TextRun(" — so onboarding SAP, Oracle, Databricks, Snowflake, Salesforce, Microsoft Fabric or Adobe becomes “connect → review → go” rather than a hand-coded dictionary. This runs as a Perception bootstrap (call it Layer 0) that feeds the ontology the rest of the agent already depends on.")]),
  H2("How it works"),
  bullet([B("Ingest catalog metadata. "),new TextRun("Read the platform's own catalog — table/column names, data types, keys, comments and business glossary — plus a governed sample of values. The catalog is the accelerator; UNAI does not guess from raw bytes.")]),
  bullet([B("Propose mappings with evidence. "),new TextRun("For each field, propose a canonical concept with a confidence score and a plain-English rationale (LLM-assisted in production via Mistral, with embeddings and value-profile heuristics).")]),
  bullet([B("Validate and gate. "),new TextRun("Check the proposal against value profiles and constraints; auto-accept high-confidence mappings and route the rest to a human-in-the-loop review queue.")]),
  bullet([B("Persist and reuse. "),new TextRun("Approved mappings are written to a versioned Mapping Registry that configures the Perception and Action layers — and improves as reviewers correct it.")]),
  P([new TextRun("This is proven concretely in the workbench ("),B("sa/automap.py"),new TextRun("): pointed at a deliberately messy, never-seen schema it mapped "),B("8 of 9 columns (89%), auto-accepting 78%"),new TextRun(" and correctly sent the two ambiguous fields to human review — offline, with no model key required.")]),
  H2("The accelerator — each platform's native catalog"),
  table(["Platform","Native metadata / catalog","Connector","Canonical accelerator","Write-back"],[
    ["SAP S/4HANA","CDS annotations · DDIC · Datasphere","BTP OData V4 / RFC-BAPI (MCP-wrapped)","Semantic CDS annotations","BAPI (gated; cert.)"],
    ["Oracle (Fusion/EBS)","Data dictionary · Fusion REST metadata","JDBC / REST","Column comments","REST / API"],
    ["Databricks","Unity Catalog (tags, lineage)","SQL connector / Delta","UC tags + lineage","Delta MERGE"],
    ["Snowflake","Information Schema · Horizon catalog","Snowflake connector","Horizon tags","SQL MERGE"],
    ["Salesforce","Describe (sObject) metadata","REST / Bulk + Metadata API","Rich field metadata","REST upsert"],
    ["Microsoft Fabric","OneLake + Purview catalog","SQL endpoint / Delta","Purview glossary","Delta"],
    ["Adobe Exp. Platform","XDM (already canonical)","AEP API","XDM ≈ direct crosswalk","AEP API"],
  ],[1700,2100,1900,1900,1760]),
  P([new TextRun("The richer a platform's catalog and glossary, the higher the auto-accept rate. "),B("Adobe XDM"),new TextRun(" is already a standardised canonical model, so its mapping is near-direct; "),B("Unity Catalog, Snowflake Horizon, Salesforce Describe and SAP CDS annotations"),new TextRun(" all give strong semantic signals that lift confidence and shrink the human-review queue.")]),

  // ===================== 13. PLUG-AND-PLAY ADD-ON & DELIVERY =====================
  new Paragraph({children:[new PageBreak()]}),
  H1("13. Plug-and-Play Add-on & the 15-Day Delivery Model"),
  P([new TextRun("To keep implementation timelines minimal, UNAI is packaged to install "),B("into the customer's existing platform"),new TextRun(" rather than as a separate stack — and, where possible, to run inside their tenant so data never leaves their perimeter.")]),
  H2("Deployment vehicles"),
  table(["Vehicle","Runs where","Why it is fast / safe"],[
    [{t:"Snowflake Native App",bold:true},"Inside the customer's Snowflake account","Data never leaves their account; one-click install; Marketplace-distributable to 10k+ customers"],
    [{t:"Databricks App",bold:true},"Serverless sandbox in the customer's workspace","Inherits Unity Catalog governance, auth and audit; Marketplace install"],
    [{t:"Cloud-neutral Helm chart",bold:true},"Customer's Kubernetes on any hyperscaler","Same artifact on AWS/Azure/GCP/on-prem; listable on each cloud Marketplace"],
    [{t:"SAP (BTP)",bold:true},"SAP BTP (Kyma/Cloud Foundry) + Integration Suite","Stays within the SAP landscape; BAPI write-back gated and certifiable"],
  ],[2200,3300,3860]),
  H2("The deploy flow (lakehouse track, under a week)"),
  P([new TextRun("Install the add-on into the tenant → grant "),B("read-only catalog access"),new TextRun(" → UNAI auto-induces the ontology (minutes) → a person reviews and signs off the mappings (hours) → activate the supply-chain capabilities (read-only, or gated write-back) → live. No data leaves the customer's platform, and there is no bespoke integration project.")]),
  H2("Can Claude build all of this?"),
  P([new TextRun("Candidly: a model like Claude can build the "),B("large majority of the software"),new TextRun(", but not the whole product on its own — some of what is needed is access, certification and commercial packaging, not code.")]),
  callout("What Claude can build vs. what else you need",[
    "CAN build: the Semantic Auto-Mapper, the seven shared layers, adapter scaffolds for each platform, the canonical model, the orchestrator, the mapping-review UI, tests, Helm/IaC, and the Snowflake-Native-App / Databricks-App packaging code.",
    "ALSO NEED (not Claude): live system access + credentials per platform; vendor SDKs / sometimes licensed connectors (e.g. SAP RFC SDK); SME validation of mappings for accuracy; security, privacy (PII) and DPA review.",
    "ALSO NEED: write-back certification on real systems (especially SAP BAPIs); platform & marketplace listings — SAP ICC, Salesforce AppExchange, Snowflake/Databricks Partner, and cloud Marketplaces — which carry review lead times beyond the code.",
    "ALSO NEED: a model-serving endpoint (Mistral API or self-hosted) with ops; and productization — multi-tenancy, metering/licensing, support and SLAs.",
  ],LIGHTT,TEAL),
  H2("Is 15 days to build / under a week to deploy realistic?"),
  table(["Scope","In 15 days?","Note"],[
    [{t:"Single-track add-on MVP (Snowflake OR Databricks)",bold:true},{t:"Yes",bold:true,color:"0C7A5E"},"Read-only auto-ontology + UNAI supply-chain capabilities + review UI + Native/Databricks App packaging — built on the existing workbench."],
    ["Full multi-source product (all 7 platforms)",{t:"No",bold:true,color:"B23A30"},"Each connector pack adds days; build them as fast-follows once the framework exists."],
    ["SAP write-back + ICC certification",{t:"No",bold:true,color:"B23A30"},"Connectivity is quick; certification and BAPI write-back testing need real systems and lead time."],
    [{t:"Per-customer deploy (lakehouse track)",bold:true},{t:"< 1 week",bold:true,color:"0C7A5E"},"Install add-on, connect catalog, auto-map, review, go — provided the customer grants catalog + read access promptly."],
  ],[3360,1500,4500]),
  H2("Recommended phasing"),
  bullet([B("Track A — Days 0–15: "),new TextRun("Snowflake/Databricks supply-chain add-on MVP (read-only auto-ontology + capabilities + review UI), shipped as a Native App / Databricks App.")]),
  bullet([B("Track B — Weeks 3–10: "),new TextRun("SAP S/4HANA supply chain — BTP connectivity, CDS-metadata ingestion, gated BAPI write-back, and the SAP ICC certification track.")]),
  bullet([B("Track C — rolling: "),new TextRun("connector packs for Salesforce, Microsoft Fabric, Oracle and Adobe (Adobe XDM is quickest because it is already canonical).")]),
  P([new TextRun("In short: "),B("yes, a 15-day MVP and sub-week deploys are realistic for the Snowflake/Databricks supply-chain track"),new TextRun(", because their catalogs make auto-ontology tractable and their native-app frameworks run UNAI inside the customer's tenant. SAP supply chain is a strong fast-follow whose long pole is certification, not code.")]),
  new Paragraph({spacing:{after:120},children:[new TextRun({text:"Sources: ",bold:true,size:19}),
    LINK("Snowflake Native Apps", "https://www.snowflake.com/en/product/features/native-apps/"), new TextRun({text:" · ",size:19}),
    LINK("Databricks Apps on Marketplace", "https://www.databricks.com/blog/announcing-apps-databricks-marketplace"), new TextRun({text:" · ",size:19}),
    LINK("Adobe Experience Data Model (XDM)", "https://business.adobe.com/products/experience-platform/experience-data-model.html")]}),

  // ===================== 14. SIZING & CAPACITY =====================
  new Paragraph({children:[new PageBreak()]}),
  H1("14. Sizing & Capacity Guidelines"),
  P([new TextRun("UNAI is lightweight because it is one agent, not a fleet. The figures below are starting points (per environment); tune to measured load. Model serving can be a managed AI gateway (no GPUs) or self-hosted Mistral on GPUs for full data residency.")]),
  table(["Tier","Scale","Compute (K8s)","Memory fabric","Model serving","Throughput"],[
    [{t:"Small / POC",bold:true},"≤2k SKUs · 1–2 DCs","2 vCPU × 2 pods","Postgres 2 vCPU/8GB · Redis 1GB","Gateway API (Mistral Small)","~2k decisions/day"],
    [{t:"Mid",bold:true},"10k SKUs · 3–5 DCs","4 vCPU × 3 pods","Postgres 4 vCPU/16GB · Redis 4GB","Gateway (Small 80% / Large 20%)","~10–20k/day"],
    [{t:"Large",bold:true},"100k+ SKUs · 10+ DCs","8 vCPU × 4–6 pods (HPA)","Postgres 8 vCPU/32GB + replica · Redis 8GB+","Gateway at scale OR self-host 2–4× L40S/A100","100k+/day, 99.9%"],
  ],[1250,1850,1750,2160,1450,900]),
  P([new TextRun("Latency budget: 2–8s per reasoning step (cache the hot path; reserve the premium model for hard decisions). Run cost scales mainly with token volume — see Sections 17–18. Storage grows with episodic memory + audit retention (7-year retention is a few hundred GB at the Large tier).")]),

  // ===================== 15. RESPONSIBLE AI & GUARDRAILS =====================
  new Paragraph({children:[new PageBreak()]}),
  H1("15. Responsible AI & Safety Guardrails (pre-packaged)"),
  P([new TextRun("Guardrails ship "),B("on by default"),new TextRun(", aligned to the NIST AI RMF and the EU AI Act spirit. Every guardrail decision is logged with a reason, so the controls are themselves auditable. The baseline runs with no external dependencies; the same interface plugs into industry engines for stronger enforcement.")]),
  H2("Pre-packaged baseline (runs everywhere)"),
  bullet([B("PII detection & redaction "),new TextRun("before any model call (email, phone, card, SSN, IBAN).")]),
  bullet([B("Prompt-injection screening "),new TextRun("on all incoming/observed text (“ignore previous instructions”, jailbreak patterns).")]),
  bullet([B("Output / action safety "),new TextRun("— blocks unsafe operations; nothing destructive executes autonomously.")]),
  bullet([B("Grounding & confidence gate "),new TextRun("— below 85% confidence routes to a human; RAG-grounded on your data.")]),
  bullet([B("Policy / value gate "),new TextRun("— high-value actions (e.g. > $50K) require sign-off (human-in-the-loop).")]),
  P([new TextRun("Proven in the workbench ("),B("sa/guardrails.py"),new TextRun("): a malicious string with a card number and an injection attempt is blocked and redacted; a $56K action is correctly gated to a human.")]),
  H2("Pluggable enterprise guardrail engines (same interface)"),
  table(["Engine","Role"],[
    ["Amazon Bedrock Guardrails","Managed content filters, denied topics, PII, contextual grounding"],
    ["NVIDIA NeMo Guardrails","Programmable conversational rails / policies"],
    ["Meta Llama Guard","Safety-classifier model (via the AI gateway)"],
    ["Guardrails AI","Schema validators for structured, safe outputs"],
  ],[3200,6160]),

  // ===================== 16. OBSERVABILITY (OTEL) =====================
  new Paragraph({children:[new PageBreak()]}),
  H1("16. Enhanced Observability — OpenTelemetry-native"),
  P([new TextRun("Because the work runs through one agent, you get one unified telemetry surface. UNAI emits an "),B("OpenTelemetry"),new TextRun(" span per layer/operation plus GenAI metrics — tokens, cost, latency, confidence, autonomy rate — and a single action audit trail. With the OTEL SDK present it exports OTLP to any backend; otherwise it falls back to JSON so it always runs.")]),
  table(["Exporter / target","What you get"],[
    ["OpenTelemetry Collector (OTLP)","Fan-out to Grafana Tempo, Datadog, Honeycomb, New Relic"],
    ["Langfuse","LLM tracing, evals, prompt/version analytics"],
    ["Arize Phoenix","LLM observability & drift monitoring"],
    ["TrueFoundry","Combined AI gateway + observability"],
  ],[3200,6160]),
  P([new TextRun("GenAI attributes follow the OpenTelemetry semantic conventions (e.g. gen_ai.usage.input_tokens), so UNAI drops into existing dashboards without custom plumbing.")]),

  // ===================== 17. AI GATEWAY =====================
  new Paragraph({children:[new PageBreak()]}),
  H1("17. AI Gateway — One Key, Many Models"),
  P([new TextRun("Rather than maintaining a separate API key for every model, UNAI talks to a "),B("single AI-gateway endpoint with one credential"),new TextRun("; the gateway fans out to many providers. This removes per-model key sprawl and enables policy-based routing and caching — both of which cut cost.")]),
  table(["Gateway","Type","One key reaches"],[
    [{t:"OpenRouter",bold:true},"Managed","100+ models across providers"],
    [{t:"LiteLLM",bold:true},"Open source (self-host)","Any provider behind an OpenAI-compatible proxy"],
    [{t:"TrueFoundry",bold:true},"Managed / self-host","Gateway + guardrails + observability"],
    [{t:"Portkey",bold:true},"Managed","Routing, caching, governance"],
    [{t:"Amazon Bedrock",bold:true},"AWS (IAM, no key)","Anthropic, Mistral, Meta, Amazon Nova, etc."],
  ],[2000,2400,4960]),
  bullet([B("Routing: "),new TextRun("cheap/fast model for the ~80% hot path, premium model for hard reasoning.")]),
  bullet([B("Caching: "),new TextRun("repeated calls are served from cache (zero tokens).")]),
  bullet([B("Accounting: "),new TextRun("per-call tokens and cost are captured and fed to observability (Section 16).")]),
  P([new TextRun("Implemented in the workbench ("),B("sa/gateway.py"),new TextRun("): one client, OpenAI-compatible, routes hot vs premium and caches — demonstrated live (a repeated call is a cache hit).")]),

  // ===================== 18. TOKEN ECONOMICS & SAVINGS =====================
  new Paragraph({children:[new PageBreak()]}),
  H1("18. Token Economics & Savings"),
  P([new TextRun("UNAI saves tokens structurally: one shared system prompt and one canonical-ontology context replace the per-agent system prompt and per-agent schema reloading that a many-agent design pays on every call — plus lightweight tool packs, hot-path routing and caching. The estimates below are transparent assumptions (")
    ,B("sa/token_savings.py"),new TextRun("); tune them to your prompts.")]),
  table(["Use case (per run)","Gen-1 tokens","Gen-2 tokens","Saved"],[
    ["Demand forecasting & sensing","4,150","2,280","45%"],
    ["Multi-echelon inventory optimization","4,150","2,280","45%"],
    ["Supplier risk & disruption response","2,950","2,280","23%"],
    ["Logistics / in-transit visibility","4,150","2,280","45%"],
    [{t:"Supply-chain mesh (all four)",bold:true},{t:"15,400",bold:true},{t:"4,320",bold:true},{t:"72%",bold:true,color:"0C7A5E"}],
  ],[3360,2000,2000,2000]),
  P([new TextRun("The saving grows as more capabilities run together, because the shared system prompt and ontology context are amortised once across the whole mesh rather than reloaded per agent. On top of the token reduction, gateway routing shifts ~80% of calls to a model roughly 10× cheaper, compounding the cost saving.")]),
  new Paragraph({spacing:{after:120},children:[new TextRun({text:"Sources: ",bold:true,size:19}),
    LINK("OpenTelemetry GenAI semantic conventions", "https://opentelemetry.io/docs/specs/semconv/gen-ai/"), new TextRun({text:" · ",size:19}),
    LINK("OpenRouter", "https://openrouter.ai/"), new TextRun({text:" · ",size:19}),
    LINK("LiteLLM", "https://www.litellm.ai/"), new TextRun({text:" · ",size:19}),
    LINK("Amazon Bedrock Guardrails", "https://aws.amazon.com/bedrock/guardrails/")]}),

  new Paragraph({spacing:{before:300},alignment:AlignmentType.CENTER,children:[new TextRun({text:"Companion deliverables: UNAI Studio app (Auto-Mapper · Onboarding · Governance) · Onboarding Guide · Mermaid flows · Executive deck · Cost-benefit workbook · Brand sheet",size:18,italics:true,color:GREY})]}),
];

const doc=new Document({styles,numbering,features:{updateFields:true},sections:[{
  properties:{page:{size:{width:12240,height:15840},margin:{top:1440,right:1440,bottom:1440,left:1440}}},
  headers:{default:new Header({children:[new Paragraph({border:{bottom:{style:BorderStyle.SINGLE,size:4,color:"D7DEEA",space:4}},children:[new TextRun({text:"The UNAI Architecture — Feasibility, Architecture & Working App",size:16,color:GREY})]})]})},
  footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:"Bristlecone · Confidential · Page ",size:16,color:GREY}),new TextRun({children:[PageNumber.CURRENT],size:16,color:GREY})]})]})},
  children:[...title,...body],
}]});

Packer.toBuffer(doc).then(b=>{fs.writeFileSync(process.env.OUT||"Super_Agent_Architecture.docx",b);console.log("wrote",b.length,"bytes");});
