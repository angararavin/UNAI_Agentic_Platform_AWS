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
const pptxgen = require("pptxgenjs");
const p = new pptxgen();
p.layout = "LAYOUT_WIDE"; // 13.3 x 7.5
p.author = "Bristlecone"; p.title = "The UNAI Architecture";

const NAVY="1E2761", NAVY2="283A5E", ICE="CADCFC", TEAL="13B58C", AMBER="E6A52B", RED="E2574C", INK="1B2640", GREY="6B7689", LIGHT="F3F6FC", WHITE="FFFFFF";
const ASSET = process.env.ASSET || ".";
const sh = () => ({ type:"outer", color:"000000", blur:8, offset:3, angle:135, opacity:0.12 });
const W=13.3;

function titleBar(s, kicker, title, dark){
  s.addText(kicker.toUpperCase(), {x:0.6,y:0.42,w:12,h:0.3,fontSize:12,bold:true,color:dark?TEAL:TEAL,charSpacing:3,margin:0});
  s.addText(title, {x:0.6,y:0.7,w:12.1,h:0.85,fontSize:30,bold:true,color:dark?WHITE:NAVY,fontFace:"Georgia",margin:0});
}
function card(s,x,y,w,h,fill){ s.addShape(p.shapes.ROUNDED_RECTANGLE,{x,y,w,h,fill:{color:fill||WHITE},line:{color:"E3E9F4",width:1},rectRadius:0.08,shadow:sh()}); }

/* ---------- 1. TITLE ---------- */
let s = p.addSlide(); s.background={color:NAVY};
s.addShape(p.shapes.OVAL,{x:10.2,y:-2.2,w:6,h:6,fill:{color:NAVY2}});
s.addShape(p.shapes.OVAL,{x:11.4,y:3.8,w:4.5,h:4.5,fill:{color:"22306B"}});
s.addImage({path:`${ASSET}/unai_logo_dark.png`,x:0.8,y:0.85,w:3.4,h:0.85,altText:"UNAI"});
s.addText("From Many Specialist Agents\nto One Adaptive Agent", {x:0.8,y:2.1,w:11.2,h:1.9,fontSize:42,bold:true,color:WHITE,fontFace:"Georgia",lineSpacingMultiple:1.0,margin:0});
s.addText("Feasibility, architecture & a working application  ·  Why · What · How", {x:0.82,y:4.15,w:11,h:0.4,fontSize:17,color:ICE,italic:true,margin:0});
s.addText([{text:"UNAI (oo-NYE)",options:{bold:true,color:WHITE}},{text:"  ·  Basque “shepherd” (one who guides the many) · “one + AI” · and “Un AI” = “One AI” (un = one). A consolidation runtime.",options:{color:"9FB0D8"}}],{x:0.82,y:4.62,w:11.6,h:0.6,fontSize:13,italic:true,margin:0});
s.addText([{text:"Prepared for Ravin Angara, Bristlecone",options:{breakLine:true}},{text:"Version 1.0 · June 22, 2026 · Companion to the UNAI Technical Specification"}],{x:0.82,y:6.2,w:11,h:0.8,fontSize:12,color:"9FB0D8",margin:0});

/* ---------- 2. VERDICT ---------- */
s = p.addSlide(); s.background={color:WHITE};
titleBar(s,"The question — how possible is this?","Verdict: feasible today, and working in the app we built");
const stats=[["4 : 1","agents → used","one UNAI ran a 4-agent workflow"],["90%","layer-complexity ↓","70 → 7 shared layer implementations"],["0","schema re-maps","context switching absorbed by the ontology"],["4–7 mo","payback","$18–32M three-year NPV"]];
stats.forEach((st,i)=>{const x=0.6+i*3.08; card(s,x,1.8,2.85,2.2,LIGHT);
  s.addText(st[0],{x,y:2.0,w:2.85,h:0.95,fontSize:40,bold:true,color:NAVY,align:"center",fontFace:"Georgia",margin:0});
  s.addText(st[1],{x,y:2.95,w:2.85,h:0.4,fontSize:14,bold:true,color:TEAL,align:"center",margin:0});
  s.addText(st[2],{x:x+0.15,y:3.35,w:2.55,h:0.6,fontSize:11,color:GREY,align:"center",margin:0});});
card(s,0.6,4.35,12.1,2.4,NAVY);
s.addText("Why it works",{x:0.95,y:4.55,w:11,h:0.4,fontSize:16,bold:true,color:TEAL,margin:0});
s.addText([
  {text:"~90% of what makes an agent “an agent” — perception, memory, reasoning, evidence, action, collaboration, explainability — is identical across domains.",options:{breakLine:true,bullet:true,color:ICE,fontSize:14,paraSpaceAfter:8}},
  {text:"Build those seven layers once; each new capability becomes configuration, not a multi-week engineering project.",options:{breakLine:true,bullet:true,color:ICE,fontSize:14,paraSpaceAfter:8}},
  {text:"Every primitive (Mistral Large/Small tool calling, BTP OData/BAPI as MCP tools, NATS pub/sub, Postgres+pgvector, Kubernetes) is available today — cloud-neutral and self-hostable. Remaining risk is organizational, not technical.",options:{bullet:true,color:ICE,fontSize:14}},
],{x:1.0,y:5.0,w:11.2,h:1.6,margin:0});

/* ---------- 2b. PLAIN-LANGUAGE ANALOGY ---------- */
s = p.addSlide(); s.background={color:WHITE};
titleBar(s,"In plain terms","Many specialists, or one versatile worker");
card(s,0.6,1.8,5.95,4.9,LIGHT);
s.addText("The old way — many specialists",{x:0.95,y:2.05,w:5.2,h:0.4,fontSize:16,bold:true,color:"B23A30",margin:0});
s.addText([
  {text:"Hire a separate specialist for every job",options:{bullet:true,breakLine:true,fontSize:14,color:INK,paraSpaceAfter:9}},
  {text:"Each one is rebuilt to read your systems, keep its own memory, decide, message every other agent, and explain itself",options:{bullet:true,breakLine:true,fontSize:14,color:INK,paraSpaceAfter:9}},
  {text:"The same plumbing, rebuilt over and over — 10 agents = 70 builds + 45 wires",options:{bullet:true,fontSize:14,color:INK}},
],{x:0.95,y:2.55,w:5.3,h:3.9,margin:0});
card(s,6.75,1.8,5.95,4.9,NAVY);
s.addText("UNAI — one versatile worker",{x:7.1,y:2.05,w:5.2,h:0.4,fontSize:16,bold:true,color:TEAL,margin:0});
s.addText([
  {text:"One worker already owns the plumbing — the 7 shared layers",options:{bullet:true,breakLine:true,fontSize:14,color:ICE,paraSpaceAfter:9}},
  {text:"It just picks up a small playbook (tool pack) for each new job",options:{bullet:true,breakLine:true,fontSize:14,color:ICE,paraSpaceAfter:9}},
  {text:"Build the expensive 90% once; only the cheap 10% changes per task",options:{bullet:true,breakLine:true,fontSize:14,color:ICE,paraSpaceAfter:9}},
  {text:"Adding a capability = configuration, not a new agent",options:{bullet:true,fontSize:14,color:ICE}},
],{x:7.1,y:2.55,w:5.3,h:3.9,margin:0});
s.addText("Result: one agent does the work of many — proven live in the app (4 agents → 1; at 10-agent scale, 70 builds → 7).",
  {x:0.6,y:6.85,w:12.1,h:0.5,fontSize:13,italic:true,color:GREY,align:"center",margin:0});

/* ---------- 3. WHY ---------- */
s = p.addSlide(); s.background={color:WHITE};
titleBar(s,"Why","One agent per job does not scale");
const probs=[["Duplicated engineering","10 agents = 70 layer implementations. Seven near-identical perception layers, memory stores, action handlers — each separately built, tested, secured."],
["Quadratic collaboration","Point-to-point comms scale as N×(N−1)/2. Ten agents = 45 channels; an eleventh forces edits to every existing agent."],
["Repeated context switching","Every agent re-learns that MATNR means “material”, and re-maps the schema again on each move between systems of record."]];
probs.forEach((pr,i)=>{const y=1.85+i*1.55; card(s,0.6,y,8.4,1.4,LIGHT);
  s.addShape(p.shapes.OVAL,{x:0.85,y:y+0.42,w:0.55,h:0.55,fill:{color:RED}});
  s.addText(String(i+1),{x:0.85,y:y+0.42,w:0.55,h:0.55,fontSize:20,bold:true,color:WHITE,align:"center",valign:"middle",margin:0});
  s.addText(pr[0],{x:1.6,y:y+0.18,w:7.2,h:0.4,fontSize:16,bold:true,color:NAVY,margin:0});
  s.addText(pr[1],{x:1.6,y:y+0.56,w:7.25,h:0.75,fontSize:12,color:INK,margin:0});});
card(s,9.25,1.85,3.45,4.55,NAVY);
s.addText("Steady-state burden\nof a 10-agent estate",{x:9.5,y:2.15,w:3,h:0.8,fontSize:14,bold:true,color:ICE,align:"center",margin:0});
s.addText("878",{x:9.25,y:3.0,w:3.45,h:1.0,fontSize:54,bold:true,color:TEAL,align:"center",fontFace:"Georgia",margin:0});
s.addText("maintenance hours / month",{x:9.4,y:4.0,w:3.15,h:0.4,fontSize:12,color:ICE,align:"center",margin:0});
s.addText("70",{x:9.25,y:4.55,w:3.45,h:0.85,fontSize:40,bold:true,color:WHITE,align:"center",fontFace:"Georgia",margin:0});
s.addText("layer implementations",{x:9.4,y:5.4,w:3.15,h:0.4,fontSize:12,color:ICE,align:"center",margin:0});

/* ---------- 4. WHAT (architecture) ---------- */
s = p.addSlide(); s.background={color:WHITE};
titleBar(s,"What","The seven-layer UNAI");
s.addImage({path:`${ASSET}/fig_arch.png`,x:0.55,y:1.7,w:8.3,h:5.36,altText:"UNAI platform architecture"});
card(s,9.05,1.75,3.65,5.25,LIGHT);
s.addText("Built once, shared everywhere",{x:9.3,y:1.95,w:3.2,h:0.5,fontSize:15,bold:true,color:NAVY,margin:0});
s.addText([
  {text:"7 universal layers implemented a single time",options:{bullet:true,breakLine:true,fontSize:12.5,color:INK,paraSpaceAfter:7}},
  {text:"Domain logic lives only in lightweight tool packs",options:{bullet:true,breakLine:true,fontSize:12.5,color:INK,paraSpaceAfter:7}},
  {text:"A canonical ontology maps every system’s native fields (MATNR→sku, EBELN→purchase_order)",options:{bullet:true,breakLine:true,fontSize:12.5,color:INK,paraSpaceAfter:7}},
  {text:"Systems of record are pluggable adapters — swap SQLite for live SAP, engine unchanged",options:{bullet:true,breakLine:true,fontSize:12.5,color:INK,paraSpaceAfter:7}},
  {text:"Runs on the customer’s own Kubernetes — any cloud or on-prem; self-host Mistral for full data residency",options:{bullet:true,fontSize:12.5,color:INK}},
],{x:9.3,y:2.5,w:3.2,h:4.3,margin:0});

/* ---------- 5. MANY -> ONE ---------- */
s = p.addSlide(); s.background={color:WHITE};
titleBar(s,"Proof · measured in the app","Many agents collapse into one");
s.addChart(p.charts.BAR,[
  {name:"Gen 1",labels:["Agents deployed","Layer impls","Schema re-maps"],values:[4,28,6]},
  {name:"Gen 2 (UNAI)",labels:["Agents deployed","Layer impls","Schema re-maps"],values:[1,11,0]},
],{x:0.6,y:1.85,w:7.2,h:4.9,barDir:"col",chartColors:[RED,TEAL],showValue:true,dataLabelPosition:"outEnd",dataLabelColor:INK,dataLabelFontSize:12,
  catAxisLabelColor:GREY,valAxisLabelColor:GREY,valGridLine:{color:"E2E8F0",size:0.5},catGridLine:{style:"none"},showLegend:true,legendPos:"b",legendColor:INK,chartArea:{fill:{color:WHITE}}});
card(s,8.05,1.85,4.65,4.9,LIGHT);
s.addText("The disruption-response run",{x:8.3,y:2.05,w:4.1,h:0.4,fontSize:15,bold:true,color:NAVY,margin:0});
s.addText([
  {text:"4 capabilities — detect → re-forecast → rebalance → procure",options:{bullet:true,breakLine:true,fontSize:13,color:INK,paraSpaceAfter:9}},
  {text:"In Gen-1, each is a whole 7-layer specialist agent",options:{bullet:true,breakLine:true,fontSize:13,color:INK,paraSpaceAfter:9}},
  {text:"One UNAI delivered all four — a 4:1 substitution",options:{bullet:true,breakLine:true,fontSize:13,color:INK,paraSpaceAfter:9}},
  {text:"At a 10-agent scale: 70→7 layer impls, ~90% reduction",options:{bullet:true,fontSize:13,color:INK}},
],{x:8.3,y:2.55,w:4.15,h:3.0,margin:0});
s.addText([
  {text:"The math: ",options:{bold:true,color:NAVY,fontSize:11.5}},
  {text:"4 agents × 7 layers = 28 builds  →  7 shared layers + 4 tool packs = 11  (build the 7 once, reuse). 28−11 ≈ 60% less; 70→7 ≈ 90% at 10-agent scale. Real engine output.",options:{color:GREY,fontSize:11.5,italic:true}},
],{x:8.3,y:5.62,w:4.2,h:1.05,margin:0});

/* ---------- 6. CONTEXT SWITCHING ---------- */
s = p.addSlide(); s.background={color:WHITE};
titleBar(s,"How · system-of-record switching","One concept, four dialects — mapped once");
const rows=[
  [{text:"Canonical",options:{bold:true,color:WHITE,fill:{color:NAVY}}},{text:"SAP MM",options:{bold:true,color:WHITE,fill:{color:NAVY}}},{text:"SAP SD",options:{bold:true,color:WHITE,fill:{color:NAVY}}},{text:"SAP FI",options:{bold:true,color:WHITE,fill:{color:NAVY}}},{text:"Analytics",options:{bold:true,color:WHITE,fill:{color:NAVY}}}],
  ["sku","MATNR","MATNR","MATKL","sku_id"],["plant","WERKS","WERKS","BUKRS","dc_code"],
  ["on-hand qty","LABST","KWMENG","—","qty_on_hand"],["supplier","LIFNR","—","LIFNR","vendor_id"],["purchase order","EBELN","—","EBELN","po_id"]];
s.addTable(rows,{x:0.6,y:1.85,w:7.6,h:4.0,colW:[1.8,1.45,1.45,1.45,1.45],fontSize:12.5,color:INK,fontFace:"Consolas",align:"center",valign:"middle",border:{pt:0.5,color:"D7DEEA"},rowH:0.62});
card(s,8.45,1.85,4.25,4.55,NAVY);
s.addText("The cost collapses",{x:8.7,y:2.05,w:3.8,h:0.4,fontSize:15,bold:true,color:TEAL,margin:0});
s.addText([{text:"5",options:{fontSize:30,bold:true,color:WHITE,fontFace:"Georgia"}},{text:"  transitions across systems",options:{fontSize:13,color:ICE}}],{x:8.7,y:2.55,w:3.8,h:0.6,margin:0});
s.addText([{text:"Gen-1: ",options:{bold:true,color:RED,fontSize:13}},{text:"5 schema re-maps (one per transition, in every agent)",options:{color:ICE,fontSize:13}}],{x:8.7,y:3.35,w:3.85,h:0.8,margin:0});
s.addText([{text:"Gen-2: ",options:{bold:true,color:TEAL,fontSize:13}},{text:"0 re-maps — the ontology resolved each system once, reused everywhere",options:{color:ICE,fontSize:13}}],{x:8.7,y:4.2,w:3.85,h:1.0,margin:0});
s.addText("New-ERP onboarding: 4–6 weeks → 2–3 days (config, not code)",{x:8.7,y:5.5,w:3.85,h:0.7,fontSize:12,italic:true,color:ICE,margin:0});

/* ---------- 7. LIVE DEMO ---------- */
s = p.addSlide(); s.background={color:WHITE};
titleBar(s,"Live demo","Supplier disruption response, end to end");
s.addText("Port strike hits APAC supplier V-2207 (risk 0.78). One UNAI runs the full response:",{x:0.6,y:1.7,w:12,h:0.5,fontSize:14,color:INK,margin:0});
const flow=["Detect (analytics)","Re-forecast +12% (analytics + SD)","Rebalance stock (SAP MM)","Procure & reroute (MM + FI)"];
flow.forEach((f,i)=>{const x=0.6+i*3.18; card(s,x,2.25,2.95,1.0,LIGHT);
  s.addText(`${i+1}`,{x:x+0.15,y:2.4,w:0.5,h:0.5,fontSize:18,bold:true,color:TEAL,margin:0});
  s.addText(f,{x:x+0.55,y:2.4,w:2.3,h:0.7,fontSize:12.5,bold:true,color:NAVY,valign:"middle",margin:0});
  if(i<3) s.addText("›",{x:x+2.92,y:2.45,w:0.3,h:0.6,fontSize:26,color:GREY,align:"center",margin:0});});
const HD=t=>({text:t,options:{bold:true,color:WHITE,fill:{color:NAVY}}});
const po=[
  [HD("SKU"),HD("Qty"),HD("Supplier"),HD("Value"),HD("Conf."),HD("Mode")],
  ["FG-1001","1,084","V-9001 (backup)","$46,070","98%",{text:"Autonomous",options:{color:"0C7A5E",bold:true}}],
  ["FG-1003","586","V-3310","$56,256","88%",{text:"Human appr.",options:{color:"B23A30",bold:true}}]];
s.addTable(po,{x:0.6,y:3.6,w:7.6,colW:[1.15,0.85,2.0,1.2,0.85,1.55],fontSize:11.5,color:INK,align:"center",valign:"middle",border:{pt:0.5,color:"D7DEEA"},rowH:0.5});
card(s,8.45,3.6,4.25,3.15,NAVY);
s.addText("Why one agent wins here",{x:8.7,y:3.78,w:3.8,h:0.4,fontSize:14,bold:true,color:TEAL,margin:0});
s.addText([
  {text:"Detection, forecasting and procurement share one memory fabric",options:{bullet:true,breakLine:true,color:ICE,fontSize:12,paraSpaceAfter:7}},
  {text:"So FG-1001 auto-reroutes off the disrupted supplier — a cross-capability call",options:{bullet:true,breakLine:true,color:ICE,fontSize:12,paraSpaceAfter:7}},
  {text:"FG-1003 ($56K > $50K limit) is held for a buyer — human-in-the-loop governance",options:{bullet:true,breakLine:true,color:ICE,fontSize:12,paraSpaceAfter:7}},
  {text:"Every decision: confidence, attribution & rationale; actions persisted to SQLite",options:{bullet:true,color:ICE,fontSize:12}},
],{x:8.7,y:4.25,w:3.8,h:2.4,margin:0});

/* ---------- 7b. EXPLAINABILITY ---------- */
s = p.addSlide(); s.background={color:WHITE};
titleBar(s,"Not a black box","Built-in explainability — all seven layers, every decision");
const L7=[["L1","Perception","6×"],["L2","Memory","7×"],["L3","Reasoning","1×"],["L4","Evidence","5×"],["L5","Action","3×"],["L6","Collab","4×"],["L7","Explain","5×"]];
L7.forEach((l,i)=>{const x=0.6+i*1.74; card(s,x,1.75,1.6,1.15,LIGHT);
  s.addText(l[0],{x,y:1.86,w:1.6,h:0.3,fontSize:12,bold:true,color:TEAL,align:"center",margin:0});
  s.addText(l[1],{x:x+0.05,y:2.16,w:1.5,h:0.35,fontSize:12,bold:true,color:NAVY,align:"center",margin:0});
  s.addText(l[2]+" run",{x,y:2.52,w:1.6,h:0.3,fontSize:11,color:GREY,align:"center",margin:0});});
s.addText("Every one of the seven shared layers fired in the run — proof they are implemented once and exercised together.",{x:0.6,y:3.05,w:12,h:0.4,fontSize:12.5,italic:true,color:GREY,margin:0});
card(s,0.6,3.6,12.1,3.25,NAVY);
s.addText("Worked example — the rationale the agent recorded for the held PO",{x:0.95,y:3.8,w:11.4,h:0.4,fontSize:15,bold:true,color:TEAL,margin:0});
s.addText([
  {text:"Decision  ",options:{bold:true,color:WHITE,fontSize:14}},{text:"Raise PO for FG-1003 (586 units, $56,256)",options:{color:ICE,fontSize:14,breakLine:true}},
],{x:0.95,y:4.3,w:11.3,h:0.4,margin:0});
s.addText([
  {text:"Confidence ",options:{bold:true,color:WHITE,fontSize:13}},{text:"88% (±12%)    ",options:{color:ICE,fontSize:13}},
  {text:"Primary driver ",options:{bold:true,color:WHITE,fontSize:13}},{text:"stock-out revenue risk (86% of the decision)",options:{color:ICE,fontSize:13}},
],{x:0.95,y:4.75,w:11.3,h:0.4,margin:0});
s.addText([
  {text:"Gate ",options:{bold:true,color:WHITE,fontSize:13}},{text:"value $56,256 > $50,000 approval limit → routed to a human approver",options:{color:ICE,fontSize:13,breakLine:true}},
],{x:0.95,y:5.2,w:11.3,h:0.4,margin:0});
s.addText([
  {text:"What-if  ",options:{bold:true,color:WHITE,fontSize:13}},{text:"a PO at or below $50,000 would execute autonomously; this one needs a buyer’s sign-off.",options:{color:ICE,fontSize:13,italic:true}},
],{x:0.95,y:5.7,w:11.3,h:0.4,margin:0});
s.addText("Full audit trail retained for SOX · FDA 21 CFR Part 11 · Basel III.",{x:0.95,y:6.25,w:11.3,h:0.4,fontSize:12,color:"9FB0D8",margin:0});

/* ---------- 8. COST/BENEFIT ---------- */
s = p.addSlide(); s.background={color:WHITE};
titleBar(s,"Cost, benefit & efficiency","Build seven layers once; value compounds");
s.addChart(p.charts.BAR,[{name:"USD (millions)",labels:["Yr-1 investment","Annual value (low)","Annual value (high)"],values:[2.5,9.0,14.0]}],
  {x:0.6,y:1.95,w:6.6,h:4.7,barDir:"col",chartColors:[GREY,TEAL,NAVY],showValue:true,dataLabelPosition:"outEnd",dataLabelColor:INK,dataLabelFontSize:13,
   catAxisLabelColor:GREY,valAxisLabelColor:GREY,valGridLine:{color:"E2E8F0",size:0.5},showLegend:false,chartArea:{fill:{color:WHITE}}});
const kp=[["~90%","layer-complexity reduction (70→7)"],["91%","maintenance-hour reduction (878→80)"],["~95%","faster new-ERP onboarding & agent build"],["$23M","3-year NPV (midpoint, 12% discount)"]];
kp.forEach((k,i)=>{const y=1.95+i*1.2; card(s,7.45,y,5.25,1.05,LIGHT);
  s.addText(k[0],{x:7.6,y:y+0.12,w:1.9,h:0.8,fontSize:30,bold:true,color:NAVY,align:"center",fontFace:"Georgia",valign:"middle",margin:0});
  s.addText(k[1],{x:9.45,y:y+0.1,w:3.15,h:0.85,fontSize:13,color:INK,valign:"middle",margin:0});});

/* ---------- 9. ROADMAP + REC ---------- */
s = p.addSlide(); s.background={color:NAVY};
s.addText("ROADMAP & RECOMMENDATION",{x:0.6,y:0.5,w:12,h:0.4,fontSize:13,bold:true,color:TEAL,charSpacing:3,margin:0});
s.addText("A 16-week path — start with an 8-week proof",{x:0.6,y:0.85,w:12,h:0.7,fontSize:28,bold:true,color:WHITE,fontFace:"Georgia",margin:0});
const ph=[["1 · Foundation","Wk 1–4","Read SAP S/4HANA inventory; explainable recommendation"],
["2 · First UNAI","Wk 5–8","Inventory UNAI in production; first autonomous PO"],
["3 · Multi-agent mesh","Wk 9–12","3+ capabilities collaborate; 29-sec disruption response"],
["4 · Hardening","Wk 13–16","GA; 10K+ autonomous decisions/day at 99.9% uptime"]];
ph.forEach((q,i)=>{const x=0.6+i*3.08; s.addShape(p.shapes.ROUNDED_RECTANGLE,{x,y:2.0,w:2.85,h:2.4,fill:{color:NAVY2},line:{color:"34457A",width:1},rectRadius:0.08});
  s.addText(q[1],{x,y:2.2,w:2.85,h:0.4,fontSize:13,bold:true,color:TEAL,align:"center",margin:0});
  s.addText(q[0],{x:x+0.2,y:2.6,w:2.45,h:0.6,fontSize:15,bold:true,color:WHITE,align:"center",margin:0});
  s.addText(q[2],{x:x+0.2,y:3.2,w:2.45,h:1.1,fontSize:11.5,color:ICE,align:"center",margin:0});});
s.addShape(p.shapes.ROUNDED_RECTANGLE,{x:0.6,y:4.75,w:12.1,h:2.15,fill:{color:TEAL},rectRadius:0.08});
s.addText("Recommendation",{x:0.95,y:4.95,w:11,h:0.4,fontSize:16,bold:true,color:NAVY,margin:0});
s.addText([
  {text:"Proceed with a Phase 1–2 engagement — 8 weeks, ~$800K — to put the first Inventory Optimization UNAI into production with planner oversight.",options:{breakLine:true,fontSize:15,color:"06302A",bold:true,paraSpaceAfter:8}},
  {text:"It validates the architecture, demonstrates ROI early, and de-risks the full mesh. The working UNAI Studio app already proves the substitution and context-switch collapse end to end.",options:{fontSize:13.5,color:"0A3A33"}},
],{x:0.95,y:5.4,w:11.4,h:1.4,margin:0});

p.writeFile({fileName: process.env.OUT || "Super_Agent_Executive_Deck.pptx"}).then(f=>console.log("wrote",f));
