# ==========================================================================
# UNAI - Universal Supply-Chain Agent (Cognitive Runtime)
# Copyright (c) 2026 Ravin Angara / Bristlecone. All rights reserved.
# Parametric animated-flow GIFs per use case + a 16:9 title version.
# Reads /tmp/flows.json (dumped from the engine) — real executor names.
# ==========================================================================
import math, os, json, re
from PIL import Image, ImageDraw, ImageFont

BG=(11,16,32); CARD=(14,23,41); LINE=(43,58,92)
TEAL=(34,211,170); PUR=(155,107,255); TXT=(219,228,245); MUT=(138,151,184); PULSE=(127,233,207)
SYSLAB={"SAP_MM":"SAP MM","SAP_SD":"SAP SD","SAP_FI":"SAP FI","SAP_IBP":"SAP IBP","SAP_S4":"SAP S/4",
        "ANALYTICS":"Analytics","SERVICENOW":"ServiceNow"}

def _font(sz, bold=False):
    p = ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
         else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    return ImageFont.truetype(p, sz) if os.path.exists(p) else ImageFont.load_default()

def ctext(d, x, y, t, sz, fill, bold=True):
    f=_font(sz, bold); w=d.textlength(t, font=f); d.text((x-w/2, y), t, font=f, fill=fill)

def clip(t, n):
    t=str(t); return t if len(t)<=n else t[:n-1]+"…"

def rbox(d, x, y, w, h, stroke):
    d.rounded_rectangle([x, y, x+w, y+h], radius=12, fill=CARD, outline=stroke, width=2)

def dashed(d, p1, p2, color, phase, dash=9, gap=9, width=3):
    x1,y1=p1; x2,y2=p2; dx=x2-x1; dy=y2-y1; L=math.hypot(dx,dy) or 1; ux,uy=dx/L,dy/L
    s=(-phase)%(dash+gap)
    while s<L:
        a=max(s,0); b=min(s+dash,L)
        if b>a: d.line([x1+ux*a,y1+uy*a,x1+ux*b,y1+uy*b], fill=color, width=width)
        s+=dash+gap

def make(cfg, filename, W=1040, title_sz=22, sub=True):
    systems=[SYSLAB.get(s,s) for s in cfg["systems"]][:4]
    execs=[clip(e,18) for e in cfg["execs"][:6]]; more=cfg["total"]-len(execs)
    n=len(execs); eW,eH,eGap=190,40,14; block=n*(eH+eGap)-eGap
    H=max(300, int(block+170)); cy=H/2+18
    SYS=(24,cy-70,170,140); PERC=(250,cy-48,150,96); COG=(455,cy-63,180,126); DEC=(W-176,cy-48,150,96)
    eX=650; eTop=cy-block/2
    eY=lambda i: eTop+i*(eH+eGap)
    frames=[]; N=44
    for fr in range(N):
        im=Image.new("RGB",(W,H),BG); d=ImageDraw.Draw(im); ph=fr*4
        ctext(d, W/2, 16, clip(cfg["name"],52), title_sz, TEAL)
        if sub: ctext(d, W/2, 16+title_sz+6, "read once · reason once · %d thin executors reuse the shared cognition"%cfg["total"], 12, MUT, False)
        dashed(d,(SYS[0]+SYS[2],cy),(PERC[0],cy),TEAL,ph); dashed(d,(PERC[0]+PERC[2],cy),(COG[0],cy),TEAL,ph)
        for i in range(n):
            dashed(d,(COG[0]+COG[2],cy),(eX,eY(i)+eH/2),PUR,ph); dashed(d,(eX+eW,eY(i)+eH/2),(DEC[0],cy),TEAL,ph)
        rbox(d,*SYS,LINE); ctext(d,SYS[0]+SYS[2]/2,SYS[1]+12,"Systems of record",11,MUT)
        for i,s in enumerate(systems): ctext(d,SYS[0]+SYS[2]/2,SYS[1]+38+i*24,s,13,TXT,False)
        rbox(d,*PERC,TEAL); ctext(d,PERC[0]+PERC[2]/2,PERC[1]+22,"Perception",15,TEAL)
        ctext(d,PERC[0]+PERC[2]/2,PERC[1]+46,"read data ONCE",12,TXT,False); ctext(d,PERC[0]+PERC[2]/2,PERC[1]+66,"via ontology",11,MUT,False)
        rbox(d,*COG,TEAL); ctext(d,COG[0]+COG[2]/2,COG[1]+20,"Shared cognition",15,TEAL)
        ctext(d,COG[0]+COG[2]/2,COG[1]+44,"Memory + Reasoning",12,TXT,False); ctext(d,COG[0]+COG[2]/2,COG[1]+66,"plan built ONCE",13,TXT)
        ctext(d,COG[0]+COG[2]/2,COG[1]+90,"(paid 1x)",11,MUT,False)
        for i,e in enumerate(execs):
            d.rounded_rectangle([eX,eY(i),eX+eW,eY(i)+eH],radius=9,fill=(26,20,46),outline=PUR,width=2)
            ctext(d,eX+eW/2,eY(i)+13,e,12,(217,202,255),False)
        if more>0: ctext(d,eX+eW/2,eY(n)+2,"+%d more executors"%more,11,MUT,False)
        rbox(d,*DEC,TEAL); ctext(d,DEC[0]+DEC[2]/2,DEC[1]+22,"Evidence · Action",13,TEAL)
        ctext(d,DEC[0]+DEC[2]/2,DEC[1]+44,"Explainability",12,TXT,False); ctext(d,DEC[0]+DEC[2]/2,DEC[1]+64,"→ decision",11,MUT,False)
        spine=[(SYS[0]+SYS[2],cy),(PERC[0],cy),(PERC[0]+PERC[2],cy),(COG[0],cy),(COG[0]+COG[2]/2,cy)]
        segL=[math.hypot(spine[i+1][0]-spine[i][0],spine[i+1][1]-spine[i][1]) for i in range(len(spine)-1)]
        tot=sum(segL); dist=(fr/N)*tot; acc=0; px,py=spine[0]
        for i in range(len(segL)):
            if dist<=acc+segL[i]:
                r=(dist-acc)/segL[i]; px=spine[i][0]+(spine[i+1][0]-spine[i][0])*r; py=spine[i][1]+(spine[i+1][1]-spine[i][1])*r; break
            acc+=segL[i]
        d.ellipse([px-6,py-6,px+6,py+6], fill=PULSE)
        frames.append(im)
    frames[0].save(filename, save_all=True, append_images=frames[1:], duration=70, loop=0, optimize=True)
    print("wrote", filename, os.path.getsize(filename)//1024, "KB")

flows=json.load(open("/tmp/flows.json"))
for c in flows:
    slug=re.sub(r"[^a-z0-9]+","_", c["key"].lower()).strip("_")
    make(c, "UNAI_Flow_%s.gif"%slug)

# 16:9 title-slide version (uses the first flow, wider canvas)
make(flows[0], "UNAI_Flow_Title_16x9.gif", W=1280, title_sz=26)
