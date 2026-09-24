#!/usr/bin/env python3
"""
sign_manifest.py - build a SHA-256 manifest of every source file so you have
tamper-evident proof of exactly what you authored. Run:

    python3 copyright/sign_manifest.py

Writes copyright/MANIFEST.sha256. Then create a DETACHED SIGNATURE over it with
your private key (this is your real "digital signature"):

    # GPG (recommended):
    gpg --output copyright/MANIFEST.sha256.asc --detach-sign --armor copyright/MANIFEST.sha256
    # verify later:
    gpg --verify copyright/MANIFEST.sha256.asc copyright/MANIFEST.sha256

    # OR OpenSSL with an RSA/EC key you control:
    openssl dgst -sha256 -sign private_key.pem -out copyright/MANIFEST.sha256.sig copyright/MANIFEST.sha256
    openssl dgst -sha256 -verify public_key.pem -signature copyright/MANIFEST.sha256.sig copyright/MANIFEST.sha256

Commit MANIFEST.sha256 + the signature; keep your private key OFF the repo.
Anyone can then verify the code is byte-for-byte your authorized original.
"""
import hashlib
import os
import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "copyright", "MANIFEST.sha256")
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", "JSONkey"}
# never hash secrets, local config, or the manifest/signature itself
SKIP_NAMES = {"MANIFEST.sha256", "MANIFEST.sha256.asc", "MANIFEST.sha256.sig", ".bqconfig.json", ".DS_Store"}
SKIP_PATTERNS = ("sap-ai-ewm-automation-", "-key.json", "service-account", "serviceaccount")

def skip(fn):
    if fn in SKIP_NAMES:
        return True
    low = fn.lower()
    return any(p in low for p in SKIP_PATTERNS)

def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()

def main():
    rows = []
    for dp, dns, fns in os.walk(ROOT):
        dns[:] = [d for d in dns if d not in SKIP_DIRS]
        for fn in fns:
            if skip(fn):
                continue
            p = os.path.join(dp, fn)
            rel = os.path.relpath(p, ROOT).replace(os.sep, "/")
            try:
                rows.append((sha256(p), rel))
            except Exception:
                pass
    rows.sort(key=lambda r: r[1])
    stamp = datetime.datetime.utcnow().isoformat(timespec="seconds") + "Z"
    header = [
        "# UNAI - Universal Supply-Chain Agent (Cognitive Runtime)",
        "# Copyright (c) 2026 Ravin Angara / Bristlecone. All rights reserved.",
        "# SHA-256 integrity manifest. Sign this file with your private key",
        "# (see copyright/sign_manifest.py header). Format: <sha256>  <path>",
        f"# generated: {stamp}   files: {len(rows)}",
        "",
    ]
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(header))
        for digest, rel in rows:
            f.write(f"{digest}  {rel}\n")
    print(f"wrote {OUT}  ({len(rows)} files hashed)")
    print("Next: sign it →  gpg --output copyright/MANIFEST.sha256.asc --detach-sign --armor copyright/MANIFEST.sha256")

if __name__ == "__main__":
    main()
