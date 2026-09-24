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
"""Generate the UNAI wordmark/logo: a 'many converging into one' mark + wordmark.
Outputs dark-bg and light-bg PNGs (+ SVGs) into assets/brand/."""
import os
OUT = os.environ.get("OUTDIR", "assets/brand")
os.makedirs(OUT, exist_ok=True)

def svg(wordmark_color, tagline_color, mark_ring, mark_dot, tagline=True):
    # mark: 4 dots on the left arc, each linked into one ring on the right (many -> one)
    cx, cy, r = 84, 70, 24
    dots = [(20, 38), (16, 64), (22, 92), (38, 110)]
    lines = "".join(
        f'<line x1="{x+4}" y1="{y}" x2="{cx-r}" y2="{cy}" stroke="{mark_dot}" stroke-width="2.2" opacity="0.55"/>'
        for x, y in dots)
    blobs = "".join(f'<circle cx="{x}" cy="{y}" r="4.5" fill="{mark_dot}"/>' for x, y in dots)
    ring = (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{mark_ring}" stroke-width="7"/>'
            f'<circle cx="{cx}" cy="{cy}" r="6.5" fill="{mark_ring}"/>')
    tag = (f'<text x="150" y="108" font-family="DejaVu Sans, Arial, sans-serif" font-size="15.5" '
           f'fill="{tagline_color}" letter-spacing="0.5">one AI · the work of many</text>' if tagline else "")
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 140">
  {lines}{blobs}{ring}
  <text x="148" y="84" font-family="DejaVu Sans, Arial, sans-serif" font-size="66" font-weight="bold"
        fill="{wordmark_color}" letter-spacing="3">UNAI</text>
  {tag}
</svg>'''

VARIANTS = {
    "unai_logo_dark":  svg("#FFFFFF", "#9FB0D8", "#13b58c", "#4f8cff"),   # for dark backgrounds
    "unai_logo_light": svg("#1E2761", "#6B7689", "#13b58c", "#2F6DF0"),   # for light backgrounds
    "unai_mark_dark":  svg("#FFFFFF", "#9FB0D8", "#13b58c", "#4f8cff", tagline=False),
}

try:
    import cairosvg
    HAVE = True
except Exception:
    HAVE = False

for name, s in VARIANTS.items():
    with open(os.path.join(OUT, name + ".svg"), "w") as f:
        f.write(s)
    if HAVE:
        cairosvg.svg2png(bytestring=s.encode(), write_to=os.path.join(OUT, name + ".png"),
                         output_width=1120, background_color="rgba(0,0,0,0)")
print("wrote logos to", OUT, "(png:", HAVE, ")")
