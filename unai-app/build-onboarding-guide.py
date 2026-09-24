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
"""UNAI Customer Onboarding Guide — polished multi-page PDF."""
import os, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle, FancyArrowPatch, FancyBboxPatch
from matplotlib.backends.backend_pdf import PdfPages

OUT = os.environ.get("OUTDIR", ".")
NAVY="#1E2761"; TEAL="#13b58c"; BLUE="#4f8cff"; INK="#1b2640"; GREY="#6b7689"; LIGHT="#eef3fb"; GREEN="#0c7a5e"; RED="#b23a30"

def newpage(pdf, header=True, foot="UNAI · Customer Onboarding Guide"):
    fig=plt.figure(figsize=(8.5,11)); ax=fig.add_axes([0,0,1,1]); ax.set_xlim(0,85); ax.set_ylim(0,110); ax.axis("off")
    if header:
        ax.add_patch(Rectangle((0,104),85,6,color=NAVY))
        ax.text(4,107,"UNAI",fontsize=15,fontweight="bold",color="white",va="center")
        ax.text(81,107,"Onboarding Guide",fontsize=10,color="#9FB0D8",va="center",ha="right")
    ax.add_patch(Rectangle((0,0),85,3.2,color=LIGHT))
    ax.text(4,1.6,foot,fontsize=8,color=GREY,va="center")
    ax.text(81,1.6,"Confidential",fontsize=8,color=GREY,va="center",ha="right")
    return fig,ax

def H1(ax,y,t): ax.text(4,y,t,fontsize=17,fontweight="bold",color=NAVY); return y-2.6
def H2(ax,y,t): ax.text(4,y,t,fontsize=12.5,fontweight="bold",color=TEAL); return y-2.0
def P(ax,y,t,c=INK,fs=10.3,x=4):
    ax.text(x,y,t,fontsize=fs,color=c,va="top",wrap=True); return y-2.0
def B(ax,y,t,c=INK):
    ax.text(5,y,"•",fontsize=10.3,color=TEAL,va="top"); ax.text(7,y,t,fontsize=10.3,color=c,va="top",wrap=True); return y-2.05

pdf=PdfPages(os.path.join(OUT,"UNAI_Onboarding_Guide.pdf"))

# ---- Cover ----
fig,ax=newpage(pdf,header=False)
ax.add_patch(Rectangle((0,70),85,40,color=NAVY))
cx,cy=14,93
for (x,y) in [(7,98),(6,93),(7,88)]:
    ax.add_patch(FancyArrowPatch((x,y),(cx-2.3,cy),arrowstyle="-",color=BLUE,lw=1.6,alpha=0.7)); ax.add_patch(Circle((x,y),0.6,color=BLUE))
ax.add_patch(Circle((cx,cy),2.6,fill=False,ec=TEAL,lw=3)); ax.add_patch(Circle((cx,cy),0.9,color=TEAL))
ax.text(20,93,"UNAI",fontsize=40,fontweight="bold",color="white",va="center")
ax.text(4,80,"Customer Onboarding Guide",fontsize=24,fontweight="bold",color="white")
ax.text(4,75.5,"Connect your systems, models and tables — and go live in under a week.",fontsize=12,color="#CADCFC")
y=62
y=P(ax,y,"This guide walks your team through connecting UNAI to your data platforms (Snowflake,",fs=11)
y=P(ax,y,"Databricks, SAP, Oracle, Microsoft Fabric, Salesforce, Adobe), letting UNAI auto-discover",fs=11)
y=P(ax,y,"your schemas, reviewing the proposed canonical mappings, and activating capabilities —",fs=11)
y=P(ax,y,"all inside your own tenant, with read-only access first and write-back gated.",fs=11)
y-=1.5
ax.add_patch(FancyBboxPatch((4,46),77,7,boxstyle="round,pad=0.3,rounding_size=0.6",fc=LIGHT,ec=TEAL))
ax.text(6,51.5,"What you'll achieve",fontsize=12,fontweight="bold",color=NAVY)
ax.text(6,48.7,"Connect → Auto-map → Review → Activate.  No bespoke integration project; data never leaves your perimeter.",fontsize=10,color=INK)
pdf.savefig(fig); plt.close(fig)

# ---- Page 2: What is UNAI + the 3 steps ----
fig,ax=newpage(pdf); y=99
y=H1(ax,y,"1 · What UNAI is, and how onboarding works")
y=P(ax,y,"UNAI is one adaptive agent that does the work of many. It reads your systems through a")
y=P(ax,y,"single canonical ontology, so onboarding a new source is configuration — not coding.")
y-=1
y=H2(ax,y,"The four steps")
for t in ["Connect — grant UNAI read-only access to your platform's catalog (no data movement).",
          "Auto-map — UNAI inspects your tables/columns and proposes canonical mappings with a confidence score.",
          "Review — approve the high-confidence mappings; correct the few flagged for review (minutes to hours).",
          "Activate — switch on the supply-chain capabilities (read-only first; write-back gated)."]:
    y=B(ax,y,t)
y-=0.6
# step ribbon
xs=["Connect","Auto-map","Review","Activate"]
for i,s in enumerate(xs):
    x=4+i*19.5
    ax.add_patch(FancyBboxPatch((x,y-4),17,3.2,boxstyle="round,pad=0.2,rounding_size=0.5",fc=NAVY))
    ax.text(x+8.5,y-2.4,f"{i+1}. {s}",fontsize=10,fontweight="bold",color="white",ha="center")
    if i<3: ax.text(x+18,y-2.4,"›",fontsize=16,color=GREY,ha="center")
y-=7
y=H2(ax,y,"Time to value")
y=B(ax,y,"Lakehouse track (Snowflake / Databricks): typically live in under a week.")
y=B(ax,y,"SAP S/4HANA: connectivity is quick; write-back follows certification.")
pdf.savefig(fig); plt.close(fig)

# ---- Page 3: What you need ----
fig,ax=newpage(pdf); y=99
y=H1(ax,y,"2 · What you need before you start")
y=P(ax,y,"A read-only role on the source, network access from where UNAI runs, and an owner to")
y=P(ax,y,"approve the mappings. UNAI runs inside your tenant wherever possible.")
y-=0.5
rows=[("Snowflake","A read-only role + warehouse; access to INFORMATION_SCHEMA. Install as a Snowflake Native App (runs in your account)."),
      ("Databricks","Unity Catalog read grant; a SQL warehouse / serverless. Install as a Databricks App (runs in your workspace)."),
      ("SAP S/4HANA","BTP destination or OData/RFC user (read); CDS view access. Write-back via gated BAPIs after certification."),
      ("Postgres / others","A read-only DB user + connection string; network route from the UNAI runtime."),
      ("Model access","One AI-gateway key (OpenRouter / LiteLLM / TrueFoundry / Bedrock) — UNAI does NOT need a key per model.")]
for nm,desc in rows:
    ax.add_patch(FancyBboxPatch((4,y-5.4),77,5.0,boxstyle="round,pad=0.2,rounding_size=0.5",fc=LIGHT,ec="#d7deea"))
    ax.text(6,y-1.4,nm,fontsize=11,fontweight="bold",color=NAVY)
    ax.text(6,y-3.6,desc,fontsize=9.6,color=INK,va="center",wrap=True)
    y-=6.0
pdf.savefig(fig); plt.close(fig)

# ---- Page 4: per-platform connection steps ----
fig,ax=newpage(pdf); y=99
y=H1(ax,y,"3 · Connecting each platform")
def steps(ax,y,title,items):
    y=H2(ax,y,title)
    for i,t in enumerate(items,1):
        ax.text(5,y,f"{i}.",fontsize=10,fontweight="bold",color=TEAL,va="top"); ax.text(8,y,t,fontsize=10,color=INK,va="top",wrap=True); y-=1.9
    return y-0.6
y=steps(ax,y,"Snowflake",["Install the UNAI Native App from Marketplace (or your private listing).",
    "Grant the app a read-only role on the target database/schema.",
    "Run 'Introspect' — UNAI reads INFORMATION_SCHEMA + Horizon tags.",
    "Review mappings, approve, activate. Data never leaves your account."])
y=steps(ax,y,"Databricks",["Install the UNAI App into your workspace.",
    "Grant Unity Catalog read on the catalog/schema.",
    "Run 'Introspect' — UNAI reads information_schema + UC tags/lineage.",
    "Review, approve, activate (serverless sandbox, UC-governed)."])
y=steps(ax,y,"SAP S/4HANA",["Expose CDS views / OData (read) via BTP Integration Suite.",
    "Provide a read user or BTP destination; UNAI wraps these as MCP tools.",
    "Introspect CDS annotations + DDIC; review mappings.",
    "Activate read-only; enable gated BAPI write-back after certification."])
pdf.savefig(fig); plt.close(fig)

# ---- Page 5: reviewing mappings ----
fig,ax=newpage(pdf); y=99
y=H1(ax,y,"4 · Reviewing & approving mappings")
y=P(ax,y,"UNAI proposes a canonical concept for each column with a confidence score and a reason.")
y=P(ax,y,"High-confidence proposals are auto-accepted; the rest are queued for a quick human review.")
y-=0.5
y=H2(ax,y,"Example (auto-discovered from a raw schema)")
ex=[("PRODUCT_KEY","sku","0.98","auto-accept"),("UNITS_AVAIL","on_hand_qty","0.92","auto-accept"),
    ("VENDOR_NO","supplier","0.86","auto-accept"),("YRMO","period","0.80","review"),("ZZ_AUDIT","—","0.00","review")]
ax.text(6,y,"SOURCE COLUMN",fontsize=9,fontweight="bold",color=GREY); ax.text(30,y,"CANONICAL",fontsize=9,fontweight="bold",color=GREY)
ax.text(50,y,"CONF",fontsize=9,fontweight="bold",color=GREY); ax.text(62,y,"MODE",fontsize=9,fontweight="bold",color=GREY); y-=1.8
for c,k,cf,md in ex:
    col=GREEN if md=="auto-accept" else RED
    ax.text(6,y,c,fontsize=9.6,color=INK); ax.text(30,y,k,fontsize=9.6,color=INK)
    ax.text(50,y,cf,fontsize=9.6,color=INK); ax.text(62,y,md,fontsize=9.6,color=col,fontweight="bold"); y-=1.7
y-=1
y=H2(ax,y,"What to check")
for t in ["Confirm the few 'review' rows (ambiguous names, custom Z-fields, legacy flags).",
          "Approved mappings persist to a versioned Mapping Registry and configure the agent.",
          "Re-run anytime when schemas change — UNAI only re-proposes what changed."]:
    y=B(ax,y,t)
pdf.savefig(fig); plt.close(fig)

# ---- Page 6: security, model access, FAQ ----
fig,ax=newpage(pdf); y=99
y=H1(ax,y,"5 · Security, model access & FAQ")
y=H2(ax,y,"Security & data residency")
for t in ["Runs inside your tenant (Snowflake Native App / Databricks App / your Kubernetes).",
          "Read-only first; write-back is gated by confidence + value thresholds, with human-in-the-loop.",
          "PII detected and redacted before any model call; full audit trail of every action.",
          "Responsible-AI guardrails are pre-packaged (injection screening, safety, policy)."]:
    y=B(ax,y,t)
y-=0.4
y=H2(ax,y,"Model access — one key, many models")
y=P(ax,y,"Point UNAI at a single AI-gateway (OpenRouter / LiteLLM / TrueFoundry / Bedrock). You")
y=P(ax,y,"manage one credential; UNAI routes the cheap model for routine work and a premium model")
y=P(ax,y,"for hard reasoning — saving tokens and cost. No per-model keys to maintain.")
y-=0.4
y=H2(ax,y,"FAQ")
faq=[("Does our data leave our environment?","No — UNAI runs in your tenant; read-only by default."),
     ("How long does onboarding take?","Lakehouse: under a week. SAP: quick to connect, write-back after certification."),
     ("What if a mapping is wrong?","Correct it in review; the registry is versioned and improves over time."),
     ("Do we need many API keys?","No — one AI-gateway key covers all models.")]
for q,a in faq:
    ax.text(5,y,"Q:",fontsize=9.6,fontweight="bold",color=NAVY); ax.text(8,y,q,fontsize=9.6,fontweight="bold",color=INK); y-=1.7
    ax.text(8,y,"A: "+a,fontsize=9.6,color=GREY); y-=2.1
pdf.savefig(fig); plt.close(fig)

pdf.close()
print("wrote UNAI_Onboarding_Guide.pdf to", OUT)
