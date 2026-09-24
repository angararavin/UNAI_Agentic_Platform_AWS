#!/usr/bin/env python3
"""
apply_headers.py - prepend a copyright/proprietary notice to every source file.
Idempotent (skips files that already carry the UNAI-COPYRIGHT marker), shebang-
and doctype-aware, and safe to re-run. Run:  python3 copyright/apply_headers.py
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
YEAR = "2026"
HOLDER = "Ravin Angara / Bristlecone"
MARKER = "UNAI-COPYRIGHT"

LINES = [
    "UNAI - Universal Supply-Chain Agent (Cognitive Runtime)",
    f"Copyright (c) {YEAR} {HOLDER}. All rights reserved.",
    "",
    "PROPRIETARY & CONFIDENTIAL. This file, and the architecture, methods and",
    "ideas it embodies, are the exclusive property of the copyright holders.",
    "No part may be copied, reproduced, modified, distributed, reverse-engineered,",
    "or used to create derivative works without prior written permission.",
    "Shared under confidentiality; unauthorized use or disclosure is prohibited.",
    "See LICENSE. Integrity: this file is listed in copyright/MANIFEST.sha256.",
    f"SPDX-License-Identifier: LicenseRef-UNAI-Proprietary   [{MARKER} v1]",
]

# extension -> comment style
STYLE = {
    ".js": "block", ".mjs": "block", ".jsx": "block", ".css": "block",
    ".py": "hash", ".sql": "dash", ".html": "html", ".htm": "html",
}
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", "JSONkey", "copyright"}
SKIP_FILES = {"package-lock.json"}

def render(style):
    if style == "block":
        body = "\n".join(" * " + l for l in LINES)
        return "/*\n" + body + "\n */\n"
    if style == "hash":
        bar = "# " + "=" * 74
        return bar + "\n" + "\n".join(("# " + l).rstrip() for l in LINES) + "\n" + bar + "\n"
    if style == "dash":
        return "\n".join(("-- " + l).rstrip() for l in LINES) + "\n"
    if style == "html":
        return "<!--\n" + "\n".join("  " + l for l in LINES) + "\n-->\n"
    return ""

def apply(path, style):
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        src = f.read()
    if MARKER in src[:2000]:
        return False  # already has header
    header = render(style)
    lines = src.split("\n")
    insert_at = 0
    if lines and lines[0].startswith("#!"):
        insert_at = 1  # keep shebang first
    elif style == "html":
        for i, ln in enumerate(lines[:3]):
            if ln.strip().lower().startswith("<!doctype"):
                insert_at = i + 1; break
    pre = "\n".join(lines[:insert_at])
    post = "\n".join(lines[insert_at:])
    out = (pre + "\n" if pre else "") + header + post
    with open(path, "w", encoding="utf-8") as f:
        f.write(out)
    return True

def main():
    changed = skipped = 0
    for dp, dns, fns in os.walk(ROOT):
        dns[:] = [d for d in dns if d not in SKIP_DIRS]
        for fn in fns:
            if fn in SKIP_FILES:
                continue
            ext = os.path.splitext(fn)[1].lower()
            if ext not in STYLE:
                continue
            p = os.path.join(dp, fn)
            try:
                if apply(p, STYLE[ext]):
                    changed += 1; print("  + " + os.path.relpath(p, ROOT))
                else:
                    skipped += 1
            except Exception as e:
                print("  ! " + os.path.relpath(p, ROOT) + " : " + str(e))
    print(f"\nheaders applied to {changed} file(s); {skipped} already had one.")

if __name__ == "__main__":
    main()
