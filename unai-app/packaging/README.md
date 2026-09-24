# UNAI — IP protection & secure packaging

How to ship UNAI without giving away the source. Layered defense — no single
control is absolute on hardware you don't own, so combine them and price the
strongest tiers as the premium.

## Protection tiers (map to the buy models)

| Tier | Deployment | What ships | IP protection | Best for |
|---|---|---|---|---|
| **1 — Hosted kernel** | Managed service | Thin **connector** only | Kernel never leaves Bristlecone; strongest | Most customers |
| **2 — Sealed appliance (TEE)** | In-tenant appliance | Compiled kernel in a **confidential-computing enclave** | Admin-proof, attestable | Regulated / no-egress |
| **3 — Self-hosted, hardened** | Customer tenant | Compiled binary + native secret core | Deterrence + license + legal | IT-mature buyers |

Set the mode with `UNAI_DEPLOY_MODE` (`hosted-kernel` | `appliance` | `self-hosted`);
see `deployment.js` for the kernel-vs-connector boundary.

**Tier 1 is wired in code.** `kernel-client.js` routes cognitive runs either to a
remote control plane (`hosted-kernel`, via `UNAI_KERNEL_URL` + `UNAI_KERNEL_KEY`)
or to the local engine (self-hosted/appliance). `kernel-server.js` is the
reference control plane (it holds `engine.js`). To keep the *shipped* connector
free of the kernel, exclude `engine.js`/`kernel-server.js` from the connector
build for hosted-mode customers:

```bash
UNAI_KERNEL_KEY=secret KERNEL_PORT=4900 node kernel-server.js        # Bristlecone side
UNAI_DEPLOY_MODE=hosted-kernel UNAI_KERNEL_URL=http://<host>:4900 \
  UNAI_KERNEL_KEY=secret node server.js                             # customer connector
```

## Build pipeline (Tier 2/3)

`protect-build.sh` is a reference pipeline. It does NOT run here — run it in your
release environment. Stages:

1. **Native secret core** — move the crown-jewel algorithms (token-economics,
   ontology heuristics, planning) into a compiled Rust/N-API `.node` or WASM
   module. Orchestration stays in JS; the secret math is never JS.
2. **Obfuscate** the remaining JS — `javascript-obfuscator` (control-flow
   flattening, string encryption, self-defending).
3. **Compile away source** — V8 bytecode (`bytenode`) or a single binary
   (Node SEA / `pkg` / `nexe`). No readable `.js` ships.
4. **Watermark** — stamp a per-customer build fingerprint (the license
   `watermark`) so any leak is traceable to a source.
5. **Container / appliance** — ship an image only (no mounted source); for
   Tier 2, run inside a TEE and enable remote attestation.
6. **Sign** — SBOM + artifact signatures + `copyright/MANIFEST.sha256`
   integrity check at boot (already asserted in source headers).

## Licensing (all tiers)

Every instance is gated by a signed, node-locked license (`license.js`).
Mint with `tools/mint-license.js` (private key stays offline / in a KMS — never
ships). A copied image fails the tenant lock or the expiry.

## Legal stack (necessary, not sufficient)

Patent (from the invention disclosure — protects the method even if code is
seen), trade-secret program (NDAs, access logs, confidentiality legends),
EULA (no reverse-engineering / decompile, audit rights), and **source escrow**
(released only on defined triggers) instead of source delivery.
