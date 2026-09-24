// ==========================================================================
// license.js — signed, node-locked entitlement for commercial deployment.
//
// A UNAI deployment verifies a LICENSE TOKEN signed by Bristlecone's private
// key (kept offline / in a KMS). The token is public-key-verified here, is
// bound to the customer's tenant (node-lock), carries an expiry, and gates
// features/plan. This is the runtime hook that ties a running instance to a
// contract — so a copied image won't run elsewhere or past its term.
//
// Token format:  base64url(JSON payload) + "." + base64url(ed25519 signature)
// Payload: { customer, tenant, plan, features:[], iat, exp, watermark }
//
// The PUBLIC key ships with the app (license_pub.pem). The PRIVATE key never
// ships — see tools/mint-license.js. No private key here means no way to forge
// a license from the deployed code.
// ==========================================================================

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PUBKEY_PATH = path.join(__dirname, "license_pub.pem");
let PUBKEY = null;
try { PUBKEY = fs.readFileSync(PUBKEY_PATH, "utf8"); } catch (_) { /* unlicensed/dev */ }

const b64uDec = (s) => Buffer.from(String(s).replace(/-/g, "+").replace(/_/g, "/"), "base64");

// Tenant fingerprint the license is locked to. Set UNAI_TENANT_ID per customer
// deployment; falls back to the host name so a copied image to a new host fails
// the lock unless the operator also re-declares the tenant (auditable).
function tenantFingerprint() {
  return process.env.UNAI_TENANT_ID || ("host:" + require("os").hostname());
}

function verifyToken(token) {
  if (!PUBKEY) return { valid: false, reason: "no public key on this deployment (dev/unlicensed)" };
  if (!token || token.indexOf(".") < 0) return { valid: false, reason: "malformed token" };
  const [p, s] = token.split(".");
  let payload;
  try { payload = JSON.parse(b64uDec(p).toString("utf8")); } catch (_) { return { valid: false, reason: "bad payload" }; }
  let sigOk = false;
  try { sigOk = crypto.verify(null, Buffer.from(p), PUBKEY, b64uDec(s)); } catch (_) { sigOk = false; }
  if (!sigOk) return { valid: false, reason: "signature invalid (not issued by Bristlecone)", payload };
  const now = Date.now();
  if (payload.exp && now > payload.exp) return { valid: false, reason: "license expired", payload };
  if (payload.tenant && payload.tenant !== tenantFingerprint())
    return { valid: false, reason: `tenant lock mismatch (licensed to ${payload.tenant})`, payload };
  return { valid: true, payload };
}

// Load the active license from env UNAI_LICENSE or a license.key file.
function loadCurrent() {
  let token = process.env.UNAI_LICENSE || "";
  if (!token) { try { token = fs.readFileSync(path.join(__dirname, "license.key"), "utf8").trim(); } catch (_) {} }
  if (!token) return { licensed: false, mode: "unlicensed", reason: "no license installed (dev mode)", features: [], tenant: tenantFingerprint() };
  const v = verifyToken(token);
  const pl = v.payload || {};
  return {
    licensed: true, mode: v.valid ? "licensed" : "invalid", valid: v.valid, reason: v.reason || null,
    customer: pl.customer || null, plan: pl.plan || null, features: pl.features || [],
    tenant: pl.tenant || null, hostTenant: tenantFingerprint(),
    exp: pl.exp || null, expiresOn: pl.exp ? new Date(pl.exp).toISOString().slice(0, 10) : null,
    watermark: pl.watermark || null,
  };
}

let _cache = null;
function status() { if (!_cache) _cache = loadCurrent(); return _cache; }
function refresh() { _cache = loadCurrent(); return _cache; }
function hasFeature(f) { const s = status(); return s.mode === "licensed" && (s.features.includes("*") || s.features.includes(f)); }

module.exports = { verifyToken, loadCurrent, status, refresh, hasFeature, tenantFingerprint };
