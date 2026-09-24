// ==========================================================================
// mint-license.js — BRISTLECONE-ONLY license signer. Do NOT ship this.
//
// Signs a UNAI license token with the ed25519 PRIVATE key. The private key
// never leaves Bristlecone (in production, keep it in a KMS/HSM, not a file).
// The matching PUBLIC key (license_pub.pem) ships with the app to verify.
//
// First run generates a keypair if none exists:
//   tools/keys/unai_license_priv.pem   (PRIVATE — gitignored, keep offline)
//   ../license_pub.pem                  (PUBLIC  — ships with the app)
//
// Usage:
//   node tools/mint-license.js --customer "Acme Corp" --tenant acme-prod \
//     --plan Growth --days 365 --features run,foundry,sdlc --out ../license.key
// ==========================================================================

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const KEYDIR = path.join(__dirname, "keys");
const PRIV = path.join(KEYDIR, "unai_license_priv.pem");
const PUB = path.join(__dirname, "..", "license_pub.pem");

function ensureKeys() {
  if (fs.existsSync(PRIV) && fs.existsSync(PUB)) return;
  fs.mkdirSync(KEYDIR, { recursive: true });
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  fs.writeFileSync(PRIV, privateKey.export({ type: "pkcs8", format: "pem" }));
  fs.writeFileSync(PUB, publicKey.export({ type: "spki", format: "pem" }));
  console.error("[mint] generated new keypair — PRIVATE stays offline: " + PRIV);
}

function arg(name, def) {
  const i = process.argv.indexOf("--" + name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const b64u = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function main() {
  ensureKeys();
  const priv = crypto.createPrivateKey(fs.readFileSync(PRIV, "utf8"));
  const days = Number(arg("days", 365));
  const feats = arg("features", "*").split(",").map(s => s.trim()).filter(Boolean);
  const customer = arg("customer", "Evaluation");
  const payload = {
    customer,
    tenant: arg("tenant", ""),               // node-lock; empty = not locked
    plan: arg("plan", "Growth"),
    features: feats,
    iat: Date.now(),
    exp: Date.now() + days * 86400000,
    watermark: arg("watermark", "wm_" + crypto.createHash("sha256").update(customer + Date.now()).digest("hex").slice(0, 12)),
  };
  const p = b64u(JSON.stringify(payload));
  const sig = b64u(crypto.sign(null, Buffer.from(p), priv));
  const token = p + "." + sig;
  const out = arg("out", "");
  if (out) { fs.writeFileSync(path.join(__dirname, out), token); console.error("[mint] wrote " + out); }
  console.log(token);
  console.error("[mint] issued to '" + customer + "' · plan " + payload.plan + " · tenant '" + (payload.tenant || "(unlocked)") + "' · expires " + new Date(payload.exp).toISOString().slice(0, 10) + " · watermark " + payload.watermark);
}
main();
