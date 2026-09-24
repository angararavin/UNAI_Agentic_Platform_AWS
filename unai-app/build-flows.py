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
"""Render the four architecture flows (from architecture-flows.md) to PNGs + a PDF,
using matplotlib only (no browser / Mermaid CLI needed)."""
import os, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from matplotlib.backends.backend_pdf import PdfPages

OUT = os.environ.get("OUTDIR", ".")
NAVY="#16203a"; ACC="#2f6df0"; TEAL="#13b58c"; PURP="#9b6bff"; AMBER="#e6a52b"; RED="#e2574c"
BLUE="#3a6fb0"; ORANGE="#e07b2a"; GREY="#6b7689"; INK="#10203a"

def box(ax,x,y,w,h,t,fc,ec,tc=INK,fs=10,bold=True):
    ax.add_patch(FancyBboxPatch((x,y),w,h,boxstyle="round,pad=0.02,rounding_size=0.08",fc=fc,ec=ec,lw=1.4))
    ax.text(x+w/2,y+h/2,t,ha="center",va="center",fontsize=fs,color=tc,fontweight="bold" if bold else "normal")
def arrow(ax,x1,y1,x2,y2,c="#8a97b2",lw=1.3,style="-|>"):
    ax.add_patch(FancyArrowPatch((x1,y1),(x2,y2),arrowstyle=style,mutation_scale=13,color=c,lw=lw))
def newax(title):
    fig,ax=plt.subplots(figsize=(11,6.3)); ax.set_xlim(0,11); ax.set_ylim(0,10); ax.axis("off")
    ax.text(0.2,9.6,title,ha="left",fontsize=15,fontweight="bold",color=NAVY)
    return fig,ax

# ---- Flow 1: platform ------------------------------------------------------
def flow1():
    fig,ax=newax("Flow 1 — Generation-2 UNAI Platform (Mistral-centric, cloud-neutral)")
    box(ax,3.9,8.4,3.2,0.7,"Planner / API → Orchestrator\n(Mistral Large · tool calling)","#ffe7d2",ORANGE,"#6b3410",9)
    for i,l in enumerate(["L1\nPerception","L2\nMemory","L3\nReasoning","L4\nEvidence","L5\nAction","L6\nCollab","L7\nExplain"]):
        box(ax,0.5+i*1.45,6.9,1.3,0.95,l,"#d8f3ea",TEAL,"#0c4a3a",8.5)
    ax.text(5.5,8.05,"Seven shared layers — built once, reused by every capability",ha="center",fontsize=9.5,color="#0c4a3a",fontweight="bold")
    for i,p in enumerate(["Disruption","Demand","Inventory","Procurement","Finance"]):
        box(ax,1.0+i*1.85,5.5,1.6,0.7,p,"#ece1ff",PURP,"#3b2270",9)
    ax.text(5.5,6.45,"Lightweight tool packs (only domain-specific code)",ha="center",fontsize=9.5,color="#3b2270",fontweight="bold")
    box(ax,2.9,4.25,5.2,0.7,"Canonical Business Ontology  (MATNR→sku · EBELN→purchase_order)","#fdeccd",AMBER,"#6b4708",9)
    box(ax,0.6,2.5,3.1,1.0,"Memory fabric\nPostgreSQL+pgvector · Redis","#dfe9f6",BLUE,"#1d3a5f",8.5)
    box(ax,3.95,2.5,3.1,1.0,"Mistral serving\nLa Plateforme OR self-host vLLM","#ffe1cc",ORANGE,"#6b3410",8.5)
    box(ax,7.3,2.5,3.1,1.0,"Systems of Record (MCP)\nSAP MM · SD · FI","#cfeefb","#0fa0d8","#08475e",8.5)
    box(ax,2.0,1.4,7.0,0.6,"A2A event bus — NATS / Kafka · mistral-embed for RAG grounding","#e7e2f5","#7d5bbe","#3b2270",8.5,False)
    box(ax,2.0,0.55,7.0,0.6,"Data-residency perimeter — self-host keeps data on-prem · PII redaction · audit logs","#eef1f7",GREY,"#2a3550",8.5,False)
    for a in [(5.5,8.4,5.5,7.9),(5.5,6.9,5.5,6.25),(5.5,5.5,5.5,4.98),(5.5,4.25,2.1,3.55),(5.5,4.25,5.5,3.55),(5.5,4.25,8.9,3.55)]:
        arrow(ax,*a)
    return fig

# ---- Flow 2: Gen1 vs Gen2 --------------------------------------------------
def flow2():
    fig,ax=newax("Flow 2 — Gen-1 (many specialist agents) vs Gen-2 (one UNAI)")
    ax.text(2.7,8.6,"GEN 1 — many specialist agents",ha="center",fontsize=12,fontweight="bold",color="#b23a30")
    pos=[(0.5,6.4),(2.1,6.4),(3.6,6.4),(0.5,4.9),(2.1,4.9),(3.6,4.9)]
    for i,(x,y) in enumerate(pos):
        box(ax,x,y,1.35,1.15,f"Agent {i+1}\n7 layers","#f7dcd9",RED,"#6e201a",8.5)
    box(ax,0.7,3.1,4.3,1.2,"45 point-to-point links\n70 layer impls · 878 hrs/mo","#fbeae8",RED,"#b23a30",9.5)
    arrow(ax,5.2,5.3,6.3,5.3,TEAL,2.2)
    ax.text(5.75,5.75,"90%\nremoved",ha="center",fontsize=9.5,fontweight="bold",color=TEAL)
    ax.text(8.4,8.6,"GEN 2 — one UNAI",ha="center",fontsize=12,fontweight="bold",color="#0c7a5e")
    box(ax,6.7,5.7,3.6,1.4,"Universal UNAI\n7 shared layers · Mistral","#d8f3ea",TEAL,"#0c4a3a",10)
    box(ax,6.7,4.2,1.7,1.0,"10 tool\npacks","#ece1ff",PURP,"#3b2270",9)
    box(ax,8.6,4.2,1.7,1.0,"A2A\npub/sub (NATS)","#dbe7ff",ACC,"#15355f",8.5)
    box(ax,6.7,3.1,3.6,0.8,"17 impls · 80 hrs/mo\nnew capability = config","#dff3ea",TEAL,"#0c7a5e",9)
    return fig

# ---- Flow 3: disruption-response sequence ----------------------------------
def flow3():
    fig,ax=newax("Flow 3 — Disruption-response execution & context switching")
    actors=[("Planner",0.9,GREY),("Orchestrator\n(Mistral)",2.7,ORANGE),("Ontology",4.4,AMBER),
            ("Analytics",6.0,BLUE),("SAP SD",7.4,"#0fa0d8"),("SAP MM",8.7,"#0fa0d8"),("SAP FI",10.0,"#0fa0d8")]
    xs={}
    for name,x,c in actors:
        box(ax,x-0.62,8.5,1.24,0.6,name,"#eef2f9",c,INK,8); xs[name.split("\n")[0]]=x
        ax.plot([x,x],[1.0,8.5],color="#d3dae8",lw=1,zorder=0)
    steps=[("Planner","Orchestrator","goal: respond to disruption",8.0),
           ("Orchestrator","Analytics","detect supplier risk",7.3),
           ("Analytics","Ontology","native → canonical (0 re-map)",6.6),
           ("Orchestrator","SAP SD","re-forecast demand (KWMENG)",5.9),
           ("Orchestrator","SAP MM","read stock + write safety stock",5.2),
           ("Orchestrator","SAP FI","verify spend context (DMBTR)",4.5),
           ("Orchestrator","SAP MM","raise PO (auto / human-gated)",3.8),
           ("Orchestrator","Planner","plain-English rationale + audit",3.1)]
    for i,(a,b,t,y) in enumerate(steps):
        x1,x2=xs[a],xs[b]; c=ACC if x2>=x1 else TEAL
        arrow(ax,x1,y,x2,y,c,1.4)
        ax.text((x1+x2)/2,y+0.12,f"{i+1}. {t}",ha="center",fontsize=7.6,color=INK)
    ax.text(5.5,1.9,"5 system transitions · 0 schema re-maps — the ontology absorbs every dialect change",
            ha="center",fontsize=9,style="italic",color=GREY)
    return fig

# ---- Flow 4: substitution principle ----------------------------------------
def flow4():
    fig,ax=newax("Flow 4 — The substitution principle (the whole thesis in one picture)")
    box(ax,4.6,8.4,1.8,0.7,"Business goal","#dbe7ff",ACC,"#15355f",10)
    box(ax,4.4,7.0,2.2,0.7,"L3 Reasoning\ndecompose","#fdeccd",AMBER,"#6b4708",9)
    for i,t in enumerate(["capability A","capability B","capability C","capability D"]):
        box(ax,1.0+i*2.4,5.5,2.0,0.7,t,"#ece1ff",PURP,"#3b2270",9)
    box(ax,2.9,3.9,5.2,0.8,"Same 7 shared layers + canonical ontology","#d8f3ea",TEAL,"#0c4a3a",10)
    box(ax,4.4,2.4,2.2,0.7,"Any system of record","#cfeefb","#0fa0d8","#08475e",9)
    box(ax,0.6,2.4,3.2,0.95,"Gen-1: 4 agents · 28 impls\n6 schema re-maps","#fbeae8",RED,"#b23a30",9)
    box(ax,7.2,2.4,3.2,0.95,"Gen-2: 1 agent · 11 impls\n0 re-maps","#dff3ea",TEAL,"#0c7a5e",9)
    arrow(ax,5.5,8.4,5.5,7.75);
    for i in range(4): arrow(ax,5.5,7.0,2.0+i*2.4,6.25)
    for i in range(4): arrow(ax,2.0+i*2.4,5.5,5.5,4.75)
    arrow(ax,5.5,3.9,5.5,3.15)
    ax.text(5.5,1.7,"Each capability would be a whole 7-layer agent in Gen-1; in Gen-2 they share one substrate.",
            ha="center",fontsize=9,style="italic",color=GREY)
    return fig

flows=[("flow1_platform",flow1),("flow2_gen1_vs_gen2",flow2),("flow3_sequence",flow3),("flow4_substitution",flow4)]
pdf=PdfPages(os.path.join(OUT,"Super_Agent_Architecture_Flows.pdf"))
for name,fn in flows:
    fig=fn(); fig.savefig(os.path.join(OUT,name+".png"),dpi=160,bbox_inches="tight"); pdf.savefig(fig,bbox_inches="tight"); plt.close(fig)
pdf.close()
print("wrote 4 PNGs + Super_Agent_Architecture_Flows.pdf to", OUT)
