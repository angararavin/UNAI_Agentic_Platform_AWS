# ==========================================================================
# UNAI - Universal Supply-Chain Agent (Cognitive Runtime)
# Copyright (c) 2026 Ravin Angara / Bristlecone. All rights reserved.
#
# PROPRIETARY & CONFIDENTIAL. This file, and the architecture, methods and
# ideas it embodies, are the exclusive property of the copyright holders.
# No part may be copied, reproduced, modified, distributed, reverse-engineered,
# or used to create derivative works without prior written permission.
# Shared under confidentiality; unauthorized use or disclosure is prohibited.
# See LICENSE. Integrity: this file is listed in copyright/MANIFEST.sha256.
# SPDX-License-Identifier: LicenseRef-UNAI-Proprietary   [UNAI-COPYRIGHT v1]
# ==========================================================================
import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

OUT = sys.argv[1] if len(sys.argv) > 1 else "Super_Agent_Cost_Benefit.xlsx"
NAVY="1F3A66"; ACC="2F6DF0"; TEAL="13B58C"; LIGHT="EEF3FB"; LIGHTT="E2F4EE"; GREY="6B7689"
HEAD=Font(name="Arial",bold=True,color="FFFFFF",size=11)
TITLE=Font(name="Arial",bold=True,color=NAVY,size=16)
SUB=Font(name="Arial",italic=True,color=GREY,size=10)
BOLD=Font(name="Arial",bold=True,size=11)
NORM=Font(name="Arial",size=11)
GREEN=Font(name="Arial",bold=True,color="0C7A5E",size=11)
BLUE=Font(name="Arial",color="0000FF",size=11)
fill=lambda c:PatternFill("solid",fgColor=c)
thin=Side(style="thin",color="CCD5E4")
BORDER=Border(left=thin,right=thin,top=thin,bottom=thin)
center=Alignment(horizontal="center",vertical="center")
left=Alignment(horizontal="left",vertical="center",wrap_text=True)
wb=Workbook(); wb.remove(wb.active)

def header_row(ws,row,headers,widths):
    for i,h in enumerate(headers):
        c=ws.cell(row=row,column=1+i,value=h); c.font=HEAD; c.fill=fill(NAVY); c.alignment=center; c.border=BORDER
    for i,w in enumerate(widths): ws.column_dimensions[get_column_letter(1+i)].width=w

def banner(ws,title,sub):
    ws["A1"]=title; ws["A1"].font=TITLE; ws["A2"]=sub; ws["A2"].font=SUB
    ws.sheet_view.showGridLines=False

K={}  # key cell references for the Summary

# ============ COMPLEXITY & EFFICIENCY ============
ws=wb.create_sheet("Complexity & Efficiency")
banner(ws,"Architectural Complexity & Maintenance — Gen 1 vs Gen 2","Source: UNAI Technical Specification §4 (10-agent enterprise estate). Blue = input.")
agents=[("Demand Forecasting","Supply Chain",120),("Inventory Optimization","Supply Chain",95),
("Supplier Risk","Procurement",80),("Logistics Tracking","Logistics",110),("Production Scheduling","Supply Chain",90),
("Disruption Response","Supply Chain",85),("Finance NL Query","Finance",70),("Procurement","Procurement",75),
("Returns Optimization","Supply Chain",65),("Maintenance Prediction","Maintenance",88)]
r=4; header_row(ws,r,["Agent","Domain","Gen-1 layers","Gen-1 maint (hrs/mo)","Gen-2 layers (shared)","Gen-2 maint (hrs/mo)"],[24,16,13,18,18,18])
r0=r+1
for i,(name,dom,maint) in enumerate(agents):
    rr=r0+i
    ws.cell(row=rr,column=1,value=name).font=NORM; ws.cell(row=rr,column=2,value=dom).font=NORM
    ws.cell(row=rr,column=3,value=7).font=NORM; ws.cell(row=rr,column=4,value=maint).font=BLUE
    ws.cell(row=rr,column=5,value=0).font=NORM; ws.cell(row=rr,column=6,value=8).font=BLUE
    for col in range(1,7):
        cc=ws.cell(row=rr,column=col); cc.border=BORDER; cc.alignment=center if col>=3 else left; cc.fill=fill(LIGHT if i%2 else "FFFFFF")
rt=r0+len(agents)
ws.cell(row=rt,column=1,value="TOTAL").font=BOLD
for col,let in [(3,"C"),(4,"D"),(5,"E"),(6,"F")]:
    ws.cell(row=rt,column=col,value=f"=SUM({let}{r0}:{let}{rt-1})").font=BOLD
for col in range(1,7):
    cc=ws.cell(row=rt,column=col); cc.border=BORDER; cc.fill=fill(LIGHTT); cc.alignment=center if col>=3 else left
d=rt+3
ws.cell(row=d,column=1,value="Derived efficiency").font=Font(name="Arial",bold=True,color=ACC,size=12)
drows=[("Gen-2 shared layers (built once)","=7","0"),
("Gen-2 tool packs (lightweight, 1 per agent)",f"={len(agents)}","0"),
("Gen-1 layer implementations (10×7)",f"=C{rt}","0"),
("Layer-implementation reduction (layers only, 70→7)",f"=1-B{d+1}/B{d+3}","0%"),
("Reduction incl. tool packs (70→17, conservative)",f"=1-(B{d+1}+B{d+2})/B{d+3}","0%"),
("Gen-1 maintenance (hrs/mo)",f"=D{rt}","0"),
("Gen-2 maintenance (hrs/mo)",f"=F{rt}","0"),
("Maintenance reduction",f"=1-B{d+7}/B{d+6}","0%")]
for i,(label,formula,fmt) in enumerate(drows):
    rr=d+1+i
    ws.cell(row=rr,column=1,value=label).font=NORM
    c=ws.cell(row=rr,column=2,value=formula); c.font=GREEN if "reduction" in label else BOLD; c.number_format=fmt; c.alignment=center
    for col in (1,2):
        cc=ws.cell(row=rr,column=col); cc.border=BORDER; cc.fill=fill(LIGHT if i%2 else "FFFFFF")
K["complx_reduction"]=f"'Complexity & Efficiency'!B{d+4}"
K["maint_reduction"]=f"'Complexity & Efficiency'!B{d+8}"

# ============ COST-BENEFIT ============
ws=wb.create_sheet("Cost-Benefit")
banner(ws,"Cost, Benefit & ROI","Source: UNAI Technical Specification §9. Blue = input. All totals/ROI are formulas.")
r=4; header_row(ws,r,["Item","Detail","Low ($M)","High ($M)"],[36,28,14,14])
build=[("Build — engineering (8 FTE × 16 wk)",1.28,1.28),("Build — platform architecture + Mistral setup + prototyping",0.12,0.12),
("Build — SAP sandbox + BTP licenses",0.08,0.08),("Build — security audit + pen test",0.06,0.06),("Build — PM + QA",0.16,0.16)]
r0=r+1
for i,(name,lo,hi) in enumerate(build):
    rr=r0+i; ws.cell(row=rr,column=1,value=name).font=NORM
    ws.cell(row=rr,column=3,value=lo).font=BLUE; ws.cell(row=rr,column=4,value=hi).font=BLUE
    for col in range(1,5):
        cc=ws.cell(row=rr,column=col); cc.border=BORDER; cc.fill=fill(LIGHT if i%2 else "FFFFFF")
        if col>=3: cc.number_format='$#,##0.00'; cc.alignment=center
rb=r0+len(build)
ws.cell(row=rb,column=1,value="Build subtotal").font=BOLD
ws.cell(row=rb,column=3,value=f"=SUM(C{r0}:C{rb-1})").font=BOLD; ws.cell(row=rb,column=4,value=f"=SUM(D{r0}:D{rb-1})").font=BOLD
for col in range(1,5):
    cc=ws.cell(row=rb,column=col); cc.border=BORDER; cc.fill=fill(LIGHTT)
    if col>=3: cc.number_format='$#,##0.00'; cc.alignment=center
run=[("Run — Mistral inference (Small 80% / Large 20%; API or self-host GPU)",0.20,0.34),("Run — Kubernetes compute (orchestrator + agents)",0.11,0.11),
("Run — PostgreSQL + pgvector",0.072,0.072),("Run — Redis + NATS + networking",0.048,0.048),
("Run — Monitoring + logging + PII redaction",0.036,0.036),("Run — maintenance team (2 FTE)",0.24,0.24)]
rr0=rb+1
for i,(name,lo,hi) in enumerate(run):
    rr=rr0+i; ws.cell(row=rr,column=1,value=name).font=NORM
    ws.cell(row=rr,column=3,value=lo).font=BLUE; ws.cell(row=rr,column=4,value=hi).font=BLUE
    for col in range(1,5):
        cc=ws.cell(row=rr,column=col); cc.border=BORDER; cc.fill=fill(LIGHT if i%2 else "FFFFFF")
        if col>=3: cc.number_format='$#,##0.00'; cc.alignment=center
rrun=rr0+len(run)
ws.cell(row=rrun,column=1,value="Annual run subtotal").font=BOLD
ws.cell(row=rrun,column=3,value=f"=SUM(C{rr0}:C{rrun-1})").font=BOLD; ws.cell(row=rrun,column=4,value=f"=SUM(D{rr0}:D{rrun-1})").font=BOLD
for col in range(1,5):
    cc=ws.cell(row=rrun,column=col); cc.border=BORDER; cc.fill=fill(LIGHTT)
    if col>=3: cc.number_format='$#,##0.00'; cc.alignment=center
ri=rrun+1
ws.cell(row=ri,column=1,value="Year-1 investment (build + 1yr run)").font=Font(name="Arial",bold=True,color=NAVY,size=11)
ws.cell(row=ri,column=3,value=f"=C{rb}+C{rrun}").font=GREEN; ws.cell(row=ri,column=4,value=f"=D{rb}+D{rrun}").font=GREEN
for col in (1,3,4):
    cc=ws.cell(row=ri,column=col); cc.border=BORDER; cc.fill=fill(LIGHTT)
    if col>=3: cc.number_format='$#,##0.00'; cc.alignment=center
rv=ri+2
ws.cell(row=rv,column=1,value="Annual value created").font=Font(name="Arial",bold=True,color=ACC,size=12)
header_row(ws,rv+1,["Value driver","Basis","Low ($M)","High ($M)"],[36,28,14,14])
value=[("Inventory carrying-cost reduction","15–22%",3.2,4.8),("Stockout prevention","revenue protection",2.1,3.5),
("Planner productivity","40% gain",1.4,2.0),("Disruption response","revenue protected",1.5,2.2),
("Fraud / duplicate-invoice prevention","AP controls",0.8,1.5)]
v0=rv+2
for i,(name,basis,lo,hi) in enumerate(value):
    rr=v0+i; ws.cell(row=rr,column=1,value=name).font=NORM; ws.cell(row=rr,column=2,value=basis).font=NORM
    ws.cell(row=rr,column=3,value=lo).font=BLUE; ws.cell(row=rr,column=4,value=hi).font=BLUE
    for col in range(1,5):
        cc=ws.cell(row=rr,column=col); cc.border=BORDER; cc.fill=fill(LIGHT if i%2 else "FFFFFF")
        if col>=3: cc.number_format='$#,##0.00'; cc.alignment=center
vt=v0+len(value)
ws.cell(row=vt,column=1,value="Annual value total").font=BOLD
ws.cell(row=vt,column=3,value=f"=SUM(C{v0}:C{vt-1})").font=GREEN; ws.cell(row=vt,column=4,value=f"=SUM(D{v0}:D{vt-1})").font=GREEN
for col in range(1,5):
    cc=ws.cell(row=vt,column=col); cc.border=BORDER; cc.fill=fill(LIGHTT)
    if col>=3: cc.number_format='$#,##0.00'; cc.alignment=center
roi=vt+2
ws.cell(row=roi,column=1,value="ROI").font=Font(name="Arial",bold=True,color=ACC,size=12)
header_row(ws,roi+1,["Metric","","Low","High"],[36,28,14,14])
disc=roi+2
ws.cell(row=disc,column=1,value="Discount rate (input)").font=NORM
c=ws.cell(row=disc,column=3,value=0.12); c.font=BLUE; c.number_format='0%'; c.alignment=center
nb=disc+1
ws.cell(row=nb,column=1,value="Net annual benefit (value − run)").font=NORM
ws.cell(row=nb,column=3,value=f"=C{vt}-C{rrun}").font=NORM; ws.cell(row=nb,column=4,value=f"=D{vt}-D{rrun}").font=NORM
pb=nb+1
ws.cell(row=pb,column=1,value="Payback period (months)").font=BOLD
ws.cell(row=pb,column=3,value=f"=C{ri}/C{nb}*12").font=GREEN; ws.cell(row=pb,column=4,value=f"=D{ri}/D{nb}*12").font=GREEN
g3=pb+1
ws.cell(row=g3,column=1,value="3-yr gross benefit").font=NORM
ws.cell(row=g3,column=3,value=f"=C{nb}*3").font=NORM; ws.cell(row=g3,column=4,value=f"=D{nb}*3").font=NORM
npv=g3+1
ws.cell(row=npv,column=1,value="3-yr NPV (discounted)").font=BOLD
ws.cell(row=npv,column=3,value=f"=-C{ri}+C{nb}/(1+$C${disc})+C{nb}/(1+$C${disc})^2+C{nb}/(1+$C${disc})^3").font=GREEN
ws.cell(row=npv,column=4,value=f"=-D{ri}+D{nb}/(1+$C${disc})+D{nb}/(1+$C${disc})^2+D{nb}/(1+$C${disc})^3").font=GREEN
for rr in (nb,pb,g3,npv):
    for col in range(1,5):
        cc=ws.cell(row=rr,column=col); cc.border=BORDER; cc.fill=fill(LIGHT if (rr-nb)%2 else "FFFFFF")
        if col>=3 and ws.cell(row=rr,column=col).value is not None: cc.alignment=center
        if col>=3 and rr!=pb: cc.number_format='$#,##0.00'
        if col>=3 and rr==pb: cc.number_format='0.0'
K["invest"]=f"'Cost-Benefit'!C{ri}"; K["val_lo"]=f"'Cost-Benefit'!C{vt}"; K["val_hi"]=f"'Cost-Benefit'!D{vt}"
K["payback"]=f"'Cost-Benefit'!C{pb}"; K["npv_lo"]=f"'Cost-Benefit'!C{npv}"; K["npv_hi"]=f"'Cost-Benefit'!D{npv}"

# ============ RUN METRICS ============
ws=wb.create_sheet("Run Metrics")
banner(ws,"Measured Run — Supplier Disruption Response","Output of the working UNAI Studio app (node run-demo.js --sqlite). Real engine outputs.")
header_row(ws,4,["Metric","Gen-1","Gen-2","Note","Reduction"],[36,12,12,28,14])
data=[("Agents deployed",4,1,"4 specialist agents → 1 UNAI",True),
("Layer implementations",28,11,"28 (4×7) → 7 shared + 4 packs",True),
("System transitions during run",5,5,"transitions unavoidable in both",True),
("Systems of record touched",4,4,"SAP MM, SD, FI, Analytics store",True),
("Schema re-maps (context-switch cost)",5,0,"ontology absorbs all re-maps",True),
("Ontology field translations",0,62,"one central mapper",False),
("A2A messages",0,4,"pub/sub topics",False),
("Shared layers exercised",0,7,"all 7 layers fired (see Explainability tab)",False),
("Autonomous actions executed",0,3,"1 PO + 2 safety-stock updates",False),
("Human-approval-gated actions",0,1,"$56K PO > $50K limit (HITL)",False)]
for i,(label,g1,g2,note,red) in enumerate(data):
    rr=5+i
    ws.cell(row=rr,column=1,value=label).font=NORM
    ws.cell(row=rr,column=2,value=g1).font=NORM; ws.cell(row=rr,column=3,value=g2).font=BOLD
    ws.cell(row=rr,column=4,value=note).font=NORM
    c=ws.cell(row=rr,column=5)
    if red: c.value=f"=IF(B{rr}=0,\"—\",1-C{rr}/B{rr})"; c.number_format='0%'; c.font=GREEN
    else: c.value="—"
    c.alignment=center
    for col in range(1,6):
        cc=ws.cell(row=rr,column=col); cc.border=BORDER; cc.fill=fill(LIGHT if i%2 else "FFFFFF")
        if col in (2,3): cc.alignment=center
K["agents_g1"]="'Run Metrics'!B5"; K["agents_g2"]="'Run Metrics'!C5"; K["remap_reduction"]="'Run Metrics'!E9"

# ============ EXPLAINABILITY (per-decision evidence from the run) ============
ws=wb.create_sheet("Explainability")
banner(ws,"Explainability & Evidence — every decision traced","Output of the Evidence + Explainability layers. Each decision carries confidence, attribution, uncertainty, a gate, and a rationale.")
header_row(ws,4,["Decision","Confidence","Uncertainty","Primary driver (share)","Mode","Governance gate"],[34,12,12,26,15,22])
ev=[("Disruption detected: port strike — APAC lanes",0.93,"±7%","supplier risk score (70%)","Autonomous","within policy"),
("Demand re-forecast (+12% pull-forward)",0.88,"±12%","open sales orders (57%)","Autonomous","within policy"),
("Inventory rebalanced — 2 SKUs short",0.92,"±8%","forecast-vs-onhand gap (69%)","Autonomous","within policy"),
("Raise PO FG-1001 (1,084u, $46,070) — rerouted",0.98,"±2%","stock-out revenue risk (63%)","Autonomous","≤ $50K limit"),
("Raise PO FG-1003 (586u, $56,256)",0.88,"±12%","stock-out revenue risk (86%)","Human approval","$56,256 > $50K limit")]
for i,(dec,conf,unc,drv,mode,gate) in enumerate(ev):
    rr=5+i
    ws.cell(row=rr,column=1,value=dec).font=NORM
    c=ws.cell(row=rr,column=2,value=conf); c.number_format='0%'; c.alignment=center
    c.font=Font(name="Arial",bold=True,color="0C7A5E" if conf>=0.85 else "B23A30",size=11)
    ws.cell(row=rr,column=3,value=unc).font=NORM; ws.cell(row=rr,column=3).alignment=center
    ws.cell(row=rr,column=4,value=drv).font=NORM
    cm=ws.cell(row=rr,column=5,value=mode); cm.alignment=center
    cm.font=Font(name="Arial",bold=True,color="0C7A5E" if mode=="Autonomous" else "B23A30",size=11)
    ws.cell(row=rr,column=6,value=gate).font=NORM
    for col in range(1,7):
        cc=ws.cell(row=rr,column=col); cc.border=BORDER; cc.fill=fill(LIGHT if i%2 else "FFFFFF")
        if col not in (2,3,5): cc.alignment=left
ws.cell(row=12,column=1,value="Autonomy threshold = 85% confidence AND within the $50,000 value-based approval limit (human-in-the-loop above it).").font=Font(name="Arial",italic=True,color=GREY,size=10)
ws.cell(row=13,column=1,value="All 5 decisions ≥ 85% confidence; the held PO is gated on VALUE, not confidence — demonstrating policy-based governance.").font=Font(name="Arial",italic=True,color=GREY,size=10)

# ============ SUMMARY (built last, moved to front) ============
ws=wb.create_sheet("Summary")
banner(ws,"UNAI — Cost, Benefit & Efficiency","Companion to the UNAI Architecture document. Figures link from the other tabs.")
r=4; header_row(ws,r,["Headline metric","Value"],[50,22]); r+=1
kpis=[("Layer-complexity reduction (10-agent scale)",f"={K['complx_reduction']}","0%"),
("Maintenance-hour reduction",f"={K['maint_reduction']}","0%"),
("Agents deployed → used (measured disruption run)",f"={K['agents_g1']}&\":\"&{K['agents_g2']}",None),
("Schema re-maps eliminated (context switch)",f"={K['remap_reduction']}","0%"),
("Year-1 investment",f"=\"$\"&TEXT({K['invest']},\"0.0\")&\"M\"",None),
("Annual value — midpoint",f"=\"$\"&TEXT(({K['val_lo']}+{K['val_hi']})/2,\"0.0\")&\"M\"",None),
("Payback (months, low)",f"={K['payback']}","0.0"),
("3-yr NPV midpoint",f"=\"$\"&TEXT(({K['npv_lo']}+{K['npv_hi']})/2,\"0\")&\"M\"",None)]
for i,(label,formula,fmt) in enumerate(kpis):
    rr=r+i
    ws.cell(row=rr,column=1,value=label).font=NORM
    c=ws.cell(row=rr,column=2,value=formula); c.font=GREEN; c.alignment=center
    if fmt: c.number_format=fmt
    for col in (1,2):
        cc=ws.cell(row=rr,column=col); cc.border=BORDER; cc.fill=fill(LIGHT if i%2 else "FFFFFF")
vr=r+len(kpis)+1
ws.cell(row=vr,column=1,value="Verdict: technically feasible today; ~90% complexity reduction at enterprise scale; 4–7 month payback.").font=Font(name="Arial",bold=True,color=NAVY,size=11)

wb.move_sheet("Summary",-(len(wb.sheetnames)-1))
wb.save(OUT); print("saved",OUT)
