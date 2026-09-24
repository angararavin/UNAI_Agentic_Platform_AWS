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
"""Append two slides (shared cognitive runtime + savings) to the exec deck,
matching its existing design system, then reorder them after 'THE APPROACH'."""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn
import copy

F = "UNAI_Executive_Briefing.pptx"
p = Presentation(F)
BLANK = p.slide_layouts[0]   # deck ships a single blank layout

# --- idempotent: drop any previously-added runtime slides before re-adding ---
MARKERS = ("cognition once, thin executors", "What the upgrade buys")
def slide_text(s): return " ".join(sh.text_frame.text for sh in s.shapes if sh.has_text_frame)
_lst = p.slides._sldIdLst
for sid in list(_lst):
    idx = list(_lst).index(sid)
    if any(mk in slide_text(p.slides[idx]) for mk in MARKERS):
        rId = sid.get(qn("r:id"))
        _lst.remove(sid)
        if rId:
            p.part.drop_rel(rId)   # drop the rel so the orphan part isn't re-written (no dup parts)

TEAL="0E9E80"; TEAL2="22D3AA"; NAVY="14233F"; NAVY2="13203A"; MUT="5D6B8C"
PURPLE="EFE7FF"; AMBER="FBEFD6"; CARD="F3F7FC"; ICE="E2FBF3"; CORAL="E2574C"; WHITE="FFFFFF"
def C(h): return RGBColor.from_string(h)

def _noauto(tf):
    tf.word_wrap=True
    try: tf.auto_size=None
    except Exception: pass

def txt(s, l,t,w,h, text, size, color, bold=False, font="Calibri", align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, spacing=None):
    tb=s.shapes.add_textbox(Inches(l),Inches(t),Inches(w),Inches(h)); tf=tb.text_frame; _noauto(tf)
    tf.margin_left=0; tf.margin_right=0; tf.margin_top=0; tf.margin_bottom=0; tf.vertical_anchor=anchor
    lines=text.split("\n")
    for i,ln in enumerate(lines):
        para=tf.paragraphs[0] if i==0 else tf.add_paragraph()
        para.alignment=align
        if spacing: para.line_spacing=spacing
        r=para.add_run(); r.text=ln; f=r.font; f.size=Pt(size); f.bold=bold; f.name=font; f.color.rgb=C(color)
    return tb

def rect(s,l,t,w,h,fill,rounded=True,line=None):
    shp=s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE,
                           Inches(l),Inches(t),Inches(w),Inches(h))
    shp.fill.solid(); shp.fill.fore_color.rgb=C(fill)
    if line: shp.line.color.rgb=C(line); shp.line.width=Pt(1)
    else: shp.line.fill.background()
    shp.shadow.inherit=False
    return shp

def kicker(s,label):
    rect(s,0.70,0.62,0.18,0.18,TEAL2,rounded=False)
    txt(s,0.98,0.50,11,0.35,label,12,TEAL,bold=True)

def header(s,label,title,sub,sub_top=1.78):
    kicker(s,label)
    txt(s,0.70,0.86,11.93,0.85,title,30,NAVY,bold=True,font="Cambria")
    txt(s,0.70,sub_top,11.93,0.9,sub,15,MUT,spacing=1.05)

def icon_num(s,l,t,n,d=0.6):
    rect(s,l,t,d,d,NAVY2)
    txt(s,l,t+0.02,d,d-0.04,n,16,WHITE,bold=True,align=PP_ALIGN.CENTER,anchor=MSO_ANCHOR.MIDDLE)

def add_blank():
    return p.slides.add_slide(BLANK)

# ---------- SLIDE A: the upgrade ----------
s=add_blank()
header(s,"THE UPGRADE","A shared cognitive runtime — cognition once, thin executors on top",
  "The recommended evolution of the architecture: provide perception, memory, ontology, evidence and "
  "planning ONCE per goal; lightweight domain executors sit on top. Like an OS with shared services and "
  "lightweight workers — not N agents each re-doing cognition.", sub_top=2.12)
# left card — cognitive view
rect(s,0.70,3.15,5.75,3.55,WHITE,line="E4EAF3")
txt(s,1.05,3.35,5.2,0.4,"Cognitive view — how one agent thinks",16,NAVY,bold=True,font="Cambria")
rows=[("Perception","shared · once",TEAL),("Memory","shared",TEAL),("Reasoning / Planner","plan once",TEAL),
      ("Evidence","per executor",MUT),("Action / Collaboration","per executor",MUT),("Explainability","per executor",MUT)]
y=3.92
for name,tag,col in rows:
    txt(s,1.05,y+0.02,3.3,0.32,name,12.5,NAVY,bold=True,anchor=MSO_ANCHOR.MIDDLE)
    chip=PURPLE if col==MUT else ICE
    rect(s,4.55,y,1.75,0.34,chip)
    txt(s,4.55,y+0.02,1.75,0.30,tag,10.5,(MUT if col==MUT else TEAL),bold=True,align=PP_ALIGN.CENTER,anchor=MSO_ANCHOR.MIDDLE)
    y+=0.445
# right card — platform view
rect(s,6.68,3.15,5.95,3.55,CARD,line="E4EAF3")
txt(s,7.0,3.35,5.4,0.4,"Platform view — how the system is built",16,NAVY,bold=True,font="Cambria")
flow=["Conversation","Planner","Ontology  (shared meaning)","Knowledge / Evidence",
      "Specialized executors","Optimization / solvers","Enterprise systems · SAP · lakehouse · ServiceNow"]
y=3.84
for i,step in enumerate(flow):
    icon_num(s,7.0,y,str(i+1),d=0.32)
    bold = step.startswith(("Planner","Ontology"))
    txt(s,7.48,y+0.01,5.0,0.32,step,11,NAVY if bold else MUT,bold=bold,anchor=MSO_ANCHOR.MIDDLE)
    y+=0.355
txt(s,7.0,6.36,5.5,0.28,"Governance is cross-cutting across every layer.",10.5,TEAL,bold=True)
# bottom honest note
rect(s,0.70,6.88,11.93,0.48,AMBER)
txt(s,0.95,6.90,11.5,0.44,"Honest framing: the seven layers are our reference architecture — not an industry standard "
    "(real ones run 4–10+). This eliminates duplicated retrieval & reasoning; it is not a fixed 1/N token cut.",
    10.5,"7A5B12",anchor=MSO_ANCHOR.MIDDLE)

# ---------- SLIDE B: the savings ----------
s=add_blank()
header(s,"THE SAVINGS","What the upgrade buys — measured on the demonstrator",
  "The cognition base (ontology context + one plan) is paid once per goal instead of once per specialist, and "
  "context is retrieved once then reused from cache. Savings scale with how many specialists share the work.")
# stat callouts
stats=[("58%–80%","fewer tokens / run",PURPLE,TEAL),("once","cognition base paid per goal",ICE,TEAL),
       ("1 plan","built per goal · context reused",CARD,NAVY),("+caching","prefix billed once, then cheap reads",AMBER,"7A5B12")]
x=0.70
for big,lab,bg,fg in stats:
    rect(s,x,2.85,2.86,1.35,bg)
    txt(s,x+0.2,2.98,2.5,0.6,big,30,fg,bold=True,font="Cambria")
    txt(s,x+0.2,3.62,2.5,0.5,lab,11,MUT,spacing=1.0)
    x+=3.04
# comparison bars: naive vs shared runtime (measured)
txt(s,0.70,4.45,11.9,0.35,"Naive (one agent per specialist)  vs  UNAI shared runtime — tokens / run (modeled by the engine)",12.5,NAVY,bold=True)
data=[("Disruption · 4 agents",15590,6600),("Spares (IBP) · 12 agents",43210,11020),("RMA · 15 agents",50560,9960)]
mx=50560; x0=3.05; barw=8.9; y=4.95
for name,naive,unai in data:
    txt(s,0.70,y-0.02,2.3,0.3,name,10.5,MUT)
    rect(s,x0,y,barw*naive/mx,0.22,CORAL,rounded=False)
    txt(s,x0+barw*naive/mx+0.08,y-0.04,1.2,0.3,f"{naive:,}",9.5,CORAL,bold=True)
    rect(s,x0,y+0.30,barw*unai/mx,0.22,TEAL2,rounded=False)
    txt(s,x0+barw*unai/mx+0.08,y+0.26,1.2,0.3,f"{unai:,}",9.5,TEAL,bold=True)
    y+=0.72
txt(s,0.70,y+0.02,11.9,0.6,
    "Benchmarked live/modeled by token_benchmark.py (disruption flow: 3,082 → 1,452 tokens, −53%; prompt caching "
    "cuts billed input further). Single-capability goals save little — as expected. Genuine cost reduction on the "
    "shared prefix comes from prompt / KV-cache reuse where the model supports it.",
    10.5,MUT,spacing=1.05)

# ---------- reorder: move the two new slides to just after slide 4 (index 3) ----------
sldIdLst=p.slides._sldIdLst
ids=list(sldIdLst)
newA,newB=ids[-2],ids[-1]
sldIdLst.remove(newA); sldIdLst.remove(newB)
# insert after the 4th existing slide (now ids without the two appended -> position 4)
anchor=list(sldIdLst)[3]
anchor.addnext(newB); anchor.addnext(newA)  # A then B right after slide 4

p.save(F)

# ---- finalize: drop any orphan duplicate parts python-pptx may leave behind ----
import zipfile, os
from collections import OrderedDict
zin = zipfile.ZipFile(F)
byname = OrderedDict()
for info in zin.infolist():
    data = zin.open(info).read()
    if info.filename in byname:
        if b"lakehouse" in data:            # keep the FIXED upgrade slide on collision
            byname[info.filename] = data
        # else keep the first (identical savings slide) — fine
    else:
        byname[info.filename] = data
zin.close()
zout = zipfile.ZipFile(F + ".tmp", "w", zipfile.ZIP_DEFLATED)
for name, data in byname.items():
    zout.writestr(name, data)
zout.close()
os.replace(F + ".tmp", F)
print("saved", F, "· slides:", len(Presentation(F).slides))
