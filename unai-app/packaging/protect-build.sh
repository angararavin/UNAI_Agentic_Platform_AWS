#!/usr/bin/env bash
# ==========================================================================
# protect-build.sh — REFERENCE IP-protection build pipeline (run in your
# release environment, NOT on a customer machine). Produces a shippable
# artifact with no readable source. Review + pin tool versions before use.
# ==========================================================================
set -euo pipefail
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${OUT:-$APP_DIR/dist}"
WATERMARK="${WATERMARK:-wm_dev}"     # pass the per-customer license watermark
mkdir -p "$OUT"

echo "==> 1. (Manual) Ensure the secret core is a compiled native/WASM module."
echo "    e.g. a Rust N-API crate built to secret_core.node, required by engine.js."

echo "==> 2. Obfuscate remaining JS"
# npm i -g javascript-obfuscator
# javascript-obfuscator "$APP_DIR" --output "$OUT/src" \
#   --control-flow-flattening true --string-array-encoding rc4 \
#   --self-defending true --exclude node_modules

echo "==> 3. Stamp per-customer watermark"
# find "$OUT/src" -name '*.js' -exec sed -i '' "1s|^|/* build:${WATERMARK} */\n|" {} +

echo "==> 4. Compile away source (choose one)"
# bytenode:  npx bytenode --compile "$OUT/src/server.js"      # -> server.jsc (V8 bytecode)
# single binary (Node SEA / pkg):
#   npx pkg "$OUT/src/server.js" --targets node20-linux-x64 --output "$OUT/unai-server"

echo "==> 5. Container (ship image only, no source mounts)"
# docker build -t unai:${WATERMARK} -f packaging/Dockerfile "$OUT"
# For Tier-2: run the image inside a TEE (AWS Nitro Enclave / Azure Confidential VM
# / AMD SEV-SNP) and enable remote attestation.

echo "==> 6. Sign + integrity manifest"
# (cd "$OUT" && find . -type f -print0 | xargs -0 shasum -a 256 > MANIFEST.sha256)
# cosign sign / gpg --detach-sign the artifact.

echo "==> 7. License: mint a node-locked, watermarked license for this customer"
# node tools/mint-license.js --customer "Acme" --tenant acme-prod --plan Growth \
#   --days 365 --watermark "${WATERMARK}" --out dist/license.key

echo "Done. Artifact in: $OUT  (commented stages are the real work — enable per your toolchain.)"
