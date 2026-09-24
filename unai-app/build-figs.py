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
"""Regenerate fig_arch.png and fig_gen.png with UNAI branding."""
import os, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
OUT = os.environ.get("OUTDIR", "assets")

def box(ax,x,y,w,h,t,fc,ec,tc='#10203a',fs=10,bold=True):
    ax.add_patch(FancyBboxPatch((x,y),w,h,boxstyle="round,pad=0.02,rounding_size=0.08",fc=fc,ec=ec,lw=1.4))
    ax.text(x+w/2,y+h/2,t,ha='center',va='center',fontsize=fs,color=tc,fontweight='bold' if bold else 'normal',wrap=True)

# ---- fig_arch (Mistral-centric, UNAI) ----
fig,ax=plt.subplots(figsize=(9.6,6.2)); ax.set_xlim(0,10); ax.set_ylim(0,10); ax.axis('off')
ax.text(5,9.6,'UNAI Platform — Mistral-centric, cloud-neutral',ha='center',fontsize=13.5,fontweight='bold',color='#16203a')
box(ax,3.15,8.3,3.7,0.8,'Planner / API  →  Cognitive Runtime (UNAI)\n(ONE process today · Mistral Large · shared layers)','#ffe7d2','#e07b2a',fs=10,tc='#6b3410')
for i,l in enumerate(['L1\nPerception','L2\nMemory','L3\nReasoning','L4\nEvidence','L5\nAction','L6\nCollab','L7\nExplain']):
    box(ax,0.35+i*1.34,6.7,1.2,1.0,l,'#d8f3ea','#13b58c',tc='#0c4a3a',fs=9)
ax.text(5,7.95,'Seven shared layers — built once, reused by every capability',ha='center',fontsize=10,color='#0c4a3a',fontweight='bold')
for i,p in enumerate(['Disruption','Demand','Inventory','Procurement','Finance']):
    box(ax,0.9+i*1.7,5.25,1.5,0.8,p,'#ece1ff','#9b6bff',tc='#3b2270',fs=9)
ax.text(5,6.2,'Lightweight tool packs (only domain-specific code)',ha='center',fontsize=10,color='#3b2270',fontweight='bold')
box(ax,2.6,4.0,4.8,0.8,'Canonical Business Ontology\nMATNR→sku · EBELN→purchase_order · WERKS→plant','#fdeccd','#e6a52b',tc='#6b4708',fs=9)
box(ax,0.4,2.4,3.0,1.05,'Memory fabric\nPostgreSQL + pgvector\nRedis (hot path)','#dfe9f6','#3a6fb0',fs=8.5,tc='#1d3a5f')
box(ax,3.55,2.4,2.9,1.05,'Mistral serving\nLa Plateforme (EU) OR\nself-hosted vLLM (on-prem)','#ffe1cc','#e07b2a',fs=8.5,tc='#6b3410')
box(ax,6.6,2.4,3.0,1.05,'Systems of Record (MCP adapters)\nSAP MM · SD · FI\nvia BTP OData / BAPI','#cfeefb','#0fa0d8',fs=8.5,tc='#08475e')
box(ax,2.0,1.45,6.0,0.62,'A2A bus — scale-out & hand-off ONLY (optional) · in-memory at v1, pluggable to NATS/Kafka','#e7e2f5','#7d5bbe',fs=9,tc='#3b2270',bold=False)
box(ax,2.0,0.55,6.0,0.62,'Data-residency perimeter — self-host keeps data on-prem · PII redaction · audit log retention','#e9eef7','#7d8aa6',fs=8.5,tc='#2a3550',bold=False)
for (x1,y1,x2,y2) in [(5,8.3,5,7.75),(5,6.7,5,6.07),(5,5.25,5,4.82),(5,4.0,1.9,3.47),(5,4.0,5,3.47),(5,4.0,8.1,3.47)]:
    ax.add_patch(FancyArrowPatch((x1,y1),(x2,y2),arrowstyle='-|>',mutation_scale=13,color='#8a97b2',lw=1.2))
plt.tight_layout(); plt.savefig(os.path.join(OUT,'fig_arch.png'),dpi=160,bbox_inches='tight'); plt.close()

# ---- fig_gen (Gen1 vs Gen2 = UNAI) ----
fig,ax=plt.subplots(figsize=(9.6,4.4)); ax.set_xlim(0,10); ax.set_ylim(0,6); ax.axis('off')
ax.text(2.5,5.6,'GEN 1 — many specialist agents',ha='center',fontsize=12,fontweight='bold',color='#b23a30')
pos=[(0.4,3.7),(1.9,3.7),(3.4,3.7),(0.4,2.3),(1.9,2.3),(3.4,2.3)]
for i,(x,y) in enumerate(pos):
    box(ax,x,y,1.3,1.1,f'Agent {i+1}\n7 layers','#f7dcd9','#e2574c',tc='#6e201a',fs=8)
ax.text(2.5,1.6,'45 point-to-point links\n70 layer impls · 878 hrs/mo',ha='center',fontsize=9,color='#b23a30')
ax.add_patch(FancyArrowPatch((4.9,3.0),(5.7,3.0),arrowstyle='-|>',mutation_scale=18,color='#7d8aa6',lw=2))
ax.text(5.3,3.35,'90%\nremoved',ha='center',fontsize=9,fontweight='bold',color='#13b58c')
ax.text(7.9,5.6,'GEN 2 — one UNAI',ha='center',fontsize=12,fontweight='bold',color='#0c7a5e')
box(ax,6.4,2.9,3.0,1.3,'UNAI\n7 shared layers','#d8f3ea','#13b58c',tc='#0c4a3a',fs=10)
box(ax,6.4,1.7,1.4,0.9,'10 tool\npacks','#ece1ff','#9b6bff',tc='#3b2270',fs=9)
box(ax,8.0,1.7,1.4,0.9,'A2A\npub/sub','#dbe7ff','#2f6df0',fs=9,tc='#15355f')
ax.text(7.9,1.3,'17 impls · 80 hrs/mo · new capability = config',ha='center',fontsize=9,color='#0c7a5e')
plt.tight_layout(); plt.savefig(os.path.join(OUT,'fig_gen.png'),dpi=160,bbox_inches='tight'); plt.close()
print("regenerated fig_arch.png + fig_gen.png (UNAI) in", OUT)
