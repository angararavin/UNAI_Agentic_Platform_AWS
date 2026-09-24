// ==========================================================================
// deployment.js — runtime deployment mode + the IP-protection boundary.
//
// Declares HOW this instance is deployed and, crucially, WHERE the "secret
// sauce" lives. The split-runtime boundary is the strongest IP control: keep
// the KERNEL (the real IP) off the customer's premises and ship only the thin
// CONNECTOR. This module records the mode and the boundary so the app, the API
// and the docs stay consistent; wiring the kernel as a remote service is the
// build-out that follows (a stub client is the next step).
//
// Modes (UNAI_DEPLOY_MODE):
//   hosted-kernel : kernel in Bristlecone control plane; only the connector ships (strongest IP)
//   appliance     : sealed VM/HW image; kernel compiled/encrypted, ideally in a TEE
//   self-hosted   : full stack in the customer tenant; protect via compiled core + license + legal
// ==========================================================================

const MODE = process.env.UNAI_DEPLOY_MODE || "self-hosted";

// What is the protected KERNEL vs the shippable CONNECTOR.
const BOUNDARY = {
  kernel: [
    "Shared cognitive runtime — the 7-layer orchestration (engine.js)",
    "Canonical ontology + mappers (the SAP/SCM semantic layer)",
    "Planning + token-economics model",
    "Learning / self-healing logic",
    "Capability tool-pack logic (the domain IP)",
  ],
  connector: [
    "API / transport (server.js, /api/v1)",
    "Data adapters — read the customer's systems locally (data residency)",
    "Studio UI",
    "License + containment enforcement",
  ],
};

const NOTE = {
  "hosted-kernel": "Kernel runs in the Bristlecone control plane; only the connector ships to the customer tenant. The secret sauce never leaves your control.",
  "appliance": "Sealed appliance; kernel compiled/encrypted and ideally run inside a TEE (Nitro/SEV-SNP/Confidential VM) so even a customer root admin can't read it.",
  "self-hosted": "Full stack in the customer tenant; protect with a compiled/native secret core, node-locked licensing, watermarking, and the legal stack (patent + trade-secret + EULA + escrow).",
};

function status() {
  return { mode: MODE, kernelHosted: MODE === "hosted-kernel", boundary: BOUNDARY, note: NOTE[MODE] || NOTE["self-hosted"] };
}

module.exports = { MODE, BOUNDARY, status };
