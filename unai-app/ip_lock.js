// ==========================================================================
// ip_lock.js — encrypt proprietary UNAI modules at rest, and load them only
// with a key you hold.
//
// Layer 3 of the IP scheme (see license.js = who-can-run, kernel-server.js =
// don't-ship-at-all). This one ships the proprietary module as AES-256-GCM
// ciphertext; it decrypts in memory ONLY when the unlock key is present, so the
// source is never readable on disk or in the bundle.
//
//   Encrypt (build time — done by YOU, with your key):
//     UNAI_UNLOCK_KEY='your-passphrase' node ip_lock.js encrypt engine.js engine.enc
//     # ship engine.enc, NOT engine.js
//
//   Load (run time — needs the key):
//     const { loadEncrypted } = require("./ip_lock.js");
//     const engine = loadEncrypted("./engine.enc", process.env.UNAI_UNLOCK_KEY);
//
// HONEST LIMIT: the key must be present at runtime to decrypt, so whoever
// controls the running process (and the key) can capture the decrypted source
// in memory. This defeats casual inspection, source in a repo/bundle, and
// shipping readable code to a customer — it is NOT unbreakable against an
// adversary who owns the machine AND the key. For true secrecy, don't ship the
// module: run it behind kernel-server.js.
// ==========================================================================
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const Module = require("module");

const MAGIC = Buffer.from("UNAIENC1");   // header so we can detect/version the format
function keyFrom(secret) {
  if (!secret) throw new Error("ip_lock: no unlock key (set UNAI_UNLOCK_KEY).");
  return crypto.scryptSync(String(secret), "unai-ip-lock-v1", 32);   // 32-byte key from your passphrase
}

// Encrypt a source file -> [MAGIC | iv(12) | tag(16) | ciphertext]
function encryptModule(srcPath, outPath, secret) {
  const src = fs.readFileSync(srcPath);
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", keyFrom(secret), iv);
  const ct = Buffer.concat([c.update(src), c.final()]);
  fs.writeFileSync(outPath, Buffer.concat([MAGIC, iv, c.getAuthTag(), ct]));
  return { encrypted: outPath, bytes: ct.length };
}

// Decrypt to source text. Throws on wrong key or any tampering (GCM auth).
function decryptSource(encPath, secret) {
  const blob = fs.readFileSync(encPath);
  if (!blob.subarray(0, 8).equals(MAGIC)) throw new Error("ip_lock: not a UNAI-encrypted module.");
  const iv = blob.subarray(8, 20), tag = blob.subarray(20, 36), ct = blob.subarray(36);
  const d = crypto.createDecipheriv("aes-256-gcm", keyFrom(secret), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8");   // throws Error if key wrong / tampered
}

// Decrypt in memory and load as a CommonJS module. requires inside it resolve
// from `filename`'s directory (so sibling modules still work).
function loadEncrypted(encPath, secret, filename) {
  const src = decryptSource(encPath, secret);
  const fname = filename || encPath.replace(/\.enc$/, ".js");
  const m = new Module(fname, module);
  m.filename = fname;
  m.paths = Module._nodeModulePaths(path.dirname(fname));
  m._compile(src, fname);
  return m.exports;
}

module.exports = { encryptModule, decryptSource, loadEncrypted };

// --- CLI: node ip_lock.js encrypt <src.js> <out.enc>  (key from UNAI_UNLOCK_KEY) ---
if (require.main === module) {
  const [cmd, src, out] = process.argv.slice(2);
  const key = process.env.UNAI_UNLOCK_KEY;
  try {
    if (cmd === "encrypt" && src && out) { const r = encryptModule(src, out, key); console.log("encrypted", src, "->", out, "(" + r.bytes + " bytes ciphertext). Ship the .enc; delete/withhold the .js."); }
    else if (cmd === "test" && src) { const ex = loadEncrypted(src, key); console.log("loaded OK; exports:", Object.keys(ex).slice(0, 8).join(", ")); }
    else console.log("usage:\n  UNAI_UNLOCK_KEY=... node ip_lock.js encrypt <src.js> <out.enc>\n  UNAI_UNLOCK_KEY=... node ip_lock.js test <out.enc>");
  } catch (e) { console.error("ip_lock:", e.message); process.exit(1); }
}
