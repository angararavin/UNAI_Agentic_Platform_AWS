<!--
  UNAI - Universal Supply-Chain Agent (Cognitive Runtime)
  Copyright (c) 2026 Ravin Angara / Bristlecone. All rights reserved.
  PROPRIETARY & CONFIDENTIAL. See LICENSE.  [UNAI-COPYRIGHT v1]
-->

# Digital signature & copyright — how to prove this code is yours

You cannot *prevent* someone with the source from copying it. What this setup
gives you is (1) clear **legal notice** of ownership on every file, (2) a
**proprietary license** that grants no rights, and (3) a **cryptographic digital
signature** that proves the exact code you authored and when — the thing that
actually matters if you ever need to enforce your rights.

## 1. What's already in the repo

- **Copyright header** on every source file (`copyright/apply_headers.py`, re-run any time you add files).
- **LICENSE** (proprietary, all rights reserved) + **NOTICE**.
- **copyright/MANIFEST.sha256** — a SHA-256 of every file (run `python3 copyright/sign_manifest.py`).

## 2. Sign the manifest (your real "digital signature")

A one-time GPG key, then a detached signature over the manifest:

```bash
# a) create a key once (use your name + ravin.angara@bristlecone.com)
gpg --full-generate-key            # choose RSA 4096 (or ECC)

# b) regenerate the manifest, then sign it
python3 copyright/sign_manifest.py
gpg --output copyright/MANIFEST.sha256.asc --detach-sign --armor copyright/MANIFEST.sha256

# c) export your PUBLIC key so others can verify (safe to share/commit)
gpg --armor --export ravin.angara@bristlecone.com > copyright/PUBLIC_KEY.asc
```

Anyone can now verify the code is your untouched original:

```bash
gpg --import copyright/PUBLIC_KEY.asc
gpg --verify copyright/MANIFEST.sha256.asc copyright/MANIFEST.sha256   # must say "Good signature"
python3 copyright/sign_manifest.py && git diff --exit-code copyright/MANIFEST.sha256  # no diff = unchanged
```

**Keep your PRIVATE key off the repo and off shared machines.** Only the public
key and the `.asc` signature get committed.

## 3. Sign your git commits & release tags (authorship on the repo)

```bash
# tell git which key to use
gpg --list-secret-keys --keyid-format=long        # copy the key id (after rsa4096/)
git config user.signingkey <YOUR_KEY_ID>
git config commit.gpgsign true                    # sign every commit from now on

# sign an official release tag
git tag -s v1.0 -m "UNAI v1.0 - signed release"
git push origin v1.0
```

On GitHub, add the public key under **Settings → SSH and GPG keys → New GPG key**
so your commits/tags show a green **Verified** badge — visible proof of authorship
to everyone you share with.

## 4. Recommended sharing workflow

1. `python3 copyright/apply_headers.py` (headers on any new files)
2. `python3 copyright/sign_manifest.py` (refresh hashes)
3. `gpg --detach-sign --armor copyright/MANIFEST.sha256` (sign)
4. commit (signed) + tag a signed release
5. share the repo/tag; recipients verify with your public key

## 5. Also worth doing (belt-and-suspenders)

- **Timestamp** the manifest hash with a free RFC-3161 authority or by committing
  it publicly, so the date is independently provable.
- Consider a **written NDA** with the group you share it with — legally the
  strongest deterrent, alongside these technical notices.
