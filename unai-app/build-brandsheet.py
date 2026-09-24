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
"""UNAI brand sheet — one-page PDF (logo, colors, pronunciation, the readings, rules)."""
import os, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle, FancyArrowPatch
from matplotlib.backends.backend_pdf import PdfPages

OUT = os.environ.get("OUTDIR", ".")
NAVY="#1E2761"; TEAL="#13b58c"; BLUE="#4f8cff"; INK="#1b2640"; GREY="#6b7689"; LIGHT="#f3f6fc"
fig = plt.figure(figsize=(8.5, 11)); ax = fig.add_axes([0,0,1,1]); ax.set_xlim(0,85); ax.set_ylim(0,110); ax.axis("off")
ax.add_patch(Rectangle((0,103),85,7,color=NAVY))
ax.text(4,106.2,"UNAI — Brand Sheet",fontsize=20,fontweight="bold",color="white",va="center")
ax.text(81,106.2,"v1.0",fontsize=11,color="#9FB0D8",va="center",ha="right")

# logo mark (many -> one)
cx,cy=11,95
for (x,y) in [(5,99),(4,95),(5,91)]:
    ax.add_patch(FancyArrowPatch((x,y),(cx-2.0,cy),arrowstyle="-",color=BLUE,lw=1.4,alpha=0.6))
    ax.add_patch(Circle((x,y),0.5,color=BLUE))
ax.add_patch(Circle((cx,cy),2.2,fill=False,ec=TEAL,lw=2.6)); ax.add_patch(Circle((cx,cy),0.7,color=TEAL))
ax.text(16,95,"UNAI",fontsize=34,fontweight="bold",color=NAVY,va="center")
ax.text(16.3,90.5,"one AI · the work of many",fontsize=12,color=GREY,va="center")

def H(y,t): ax.text(4,y,t,fontsize=13,fontweight="bold",color=TEAL)
def P(y,t,c=INK,fs=10.5): ax.text(4,y,t,fontsize=fs,color=c,va="top",wrap=True)

H(85,"Pronunciation")
P(82.6,"“oo-NYE”  (two syllables).  Always written as ONE word: UNAI — never “Un AI” with a space.")

H(78,"What it means — four readings, one idea")
P(75.6,"•  Basque “shepherd” — one who guides the many.")
P(73.1,"•  “one + AI” — the letters themselves.")
P(70.6,"•  “Un AI” = “One AI” — in French/Spanish, un = one.")
P(68.1,"•  A nod to unity — many specialist agents become one adaptive agent.")

H(63,"Category descriptor (use alongside the name)")
P(60.6,"UNAI — a consolidation super agent.")

H(55.5,"Colour palette")
sw=[("Navy",NAVY,"#1E2761"),("Teal",TEAL,"#13B58C"),("Blue",BLUE,"#4F8CFF"),("Ink",INK,"#1B2640"),("Light",LIGHT,"#F3F6FC")]
for i,(nm,hexc,lbl) in enumerate(sw):
    x=4+i*16
    ax.add_patch(FancyBboxPatch((x,48),13,5,boxstyle="round,pad=0.1,rounding_size=0.4",fc=hexc,ec="#d0d0d0",lw=0.6))
    ax.text(x+0.6,52.2,nm,fontsize=9,fontweight="bold",color="white" if nm in("Navy","Teal","Blue","Ink") else INK)
    ax.text(x+0.6,49.0,lbl,fontsize=8,color="white" if nm in("Navy","Teal","Blue","Ink") else GREY)

H(43.5,"The mark")
P(41.1,"Many small nodes converging into one ring = the shepherd gathering the many into one.")
P(38.6,"Use the wordmark lockup on light or dark backgrounds (unai_logo_light/​dark). Keep clear space ≥ the ring's height.")

H(33.5,"Do / Don't")
P(31.1,"DO:  write UNAI as one word · pronounce oo-NYE · lead with the tagline “one AI that does the work of many.”",c="#0C7A5E")
P(28.1,"DON'T:  split as “Un AI” in body copy · read it as the prefix “un-” (not/anti) · use it for the orchestrator pattern.",c="#B23A30")

H(23,"Naming origin (for the record)")
P(20.6,"Chosen after broad cross-language search; no AI company found using the name (a Basque first name, e.g. Unai Emery,",fs=9.5)
P(18.6,"but clean as a tech brand). Formal trademark/domain clearance recommended before external launch.",fs=9.5)

ax.add_patch(Rectangle((0,0),85,4,color=LIGHT))
ax.text(4,2,"Bristlecone · UNAI — Confidential",fontsize=9,color=GREY,va="center")
pdf=PdfPages(os.path.join(OUT,"UNAI_Brand_Sheet.pdf")); pdf.savefig(fig); pdf.close()
fig.savefig(os.path.join(OUT,"UNAI_Brand_Sheet.png"),dpi=150)
print("wrote UNAI_Brand_Sheet.pdf + .png to",OUT)
