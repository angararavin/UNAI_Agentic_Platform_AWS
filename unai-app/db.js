/*
 * UNAI - Universal Supply-Chain Agent (Cognitive Runtime)
 * Copyright (c) 2026 Ravin Angara / Bristlecone. All rights reserved.
 * 
 * PROPRIETARY & CONFIDENTIAL. This file, and the architecture, methods and
 * ideas it embodies, are the exclusive property of the copyright holders.
 * No part may be copied, reproduced, modified, distributed, reverse-engineered,
 * or used to create derivative works without prior written permission.
 * Shared under confidentiality; unauthorized use or disclosure is prohibited.
 * See LICENSE. Integrity: this file is listed in copyright/MANIFEST.sha256.
 * SPDX-License-Identifier: LicenseRef-UNAI-Proprietary   [UNAI-COPYRIGHT v1]
 */
/* =============================================================================
 * db.js — SQLite-backed systems of record
 * -----------------------------------------------------------------------------
 * Creates/seeds a REAL SQLite database whose tables mirror SAP MM/SD/FI and a
 * Analytics store export, each using that system's NATIVE field names.
 * Exposes adapters with the SAME interface as engine.js (query/write), so the
 * orchestrator runs against a real database with real SQL — not in-memory data.
 *
 * Backend preference:
 *   1. node:sqlite        (built into Node 22.5+, zero install)   ← default
 *   2. better-sqlite3     (if installed)
 *   3. in-memory fallback (engine.js adapters) — handled by caller
 * ========================================================================== */
const path = require("path");
const os = require("os");
const fs = require("fs");
// Prefer an explicit path, then the app folder, then a temp dir (some mounted
// or network filesystems don't support SQLite locking and error on write).
const DB_PATH = process.env.UNAI_DB || path.join(__dirname, "systems_of_record.db");
const FALLBACK_DB = path.join(os.tmpdir(), "unai_systems_of_record.db");

// ---- pick a SQLite driver --------------------------------------------------
let driver = null;
try {
  const { DatabaseSync } = require("node:sqlite");
  driver = { kind: "node:sqlite", open: (p) => new DatabaseSync(p) };
} catch (_) {
  try {
    const Better = require("better-sqlite3");
    driver = { kind: "better-sqlite3", open: (p) => new Better(p) };
  } catch (_) { driver = null; }
}

// open at DB_PATH, transparently falling back to a temp dir if the primary
// location can't be written (e.g. SQLite locking unsupported on the mount)
function openDb() {
  const tryOpen = (p) => { const d = driver.open(p); d.exec("CREATE TABLE IF NOT EXISTS _probe(x); INSERT INTO _probe VALUES(1); DELETE FROM _probe;"); return { db: d, path: p }; };
  try { return tryOpen(DB_PATH); }
  catch (e) { return tryOpen(FALLBACK_DB); }
}

function buildSqliteAdapters() {
  if (!driver) throw new Error("no SQLite driver available");
  const opened = openDb();
  const db = opened.db;
  const activePath = opened.path;

  db.exec(`
    CREATE TABLE IF NOT EXISTS sap_mm_mard (MATNR TEXT, WERKS TEXT, LABST REAL, EISBE REAL, MINBE REAL, PLIFZ REAL, STPRS REAL, LIFNR TEXT);
    CREATE TABLE IF NOT EXISTS sap_sd_vbap (MATNR TEXT, WERKS TEXT, KWMENG REAL);
    CREATE TABLE IF NOT EXISTS sap_fi_bseg (LIFNR TEXT, DMBTR REAL, EBELN TEXT);
    CREATE TABLE IF NOT EXISTS bq_forecast (sku_id TEXT, dc_code TEXT, fcst_qty REAL, lead_time REAL);
    CREATE TABLE IF NOT EXISTS bq_supplier_risk (vendor_id TEXT, risk REAL, region TEXT, note TEXT);
    CREATE TABLE IF NOT EXISTS sap_mm_po (EBELN TEXT, MATNR TEXT, WERKS TEXT, LIFNR TEXT, MENGE REAL, STPRS REAL, status TEXT, created_at TEXT);
  `);

  const count = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
  const seedIfEmpty = (table, rows) => {
    if (count(table) > 0) return;
    const cols = Object.keys(rows[0]);
    const stmt = db.prepare(`INSERT INTO ${table} (${cols.join(",")}) VALUES (${cols.map(c => "$" + c).join(",")})`);
    rows.forEach(r => { const o = {}; cols.forEach(c => o[c] = r[c]); stmt.run(o); });
  };

  seedIfEmpty("sap_mm_mard", [
    { MATNR:"FG-1001", WERKS:"DC-EAST", LABST:540,  EISBE:600, MINBE:900, PLIFZ:21, STPRS:42.5, LIFNR:"V-2207" },
    { MATNR:"FG-1002", WERKS:"DC-EAST", LABST:1180, EISBE:400, MINBE:700, PLIFZ:14, STPRS:18.0, LIFNR:"V-2207" },
    { MATNR:"FG-1003", WERKS:"DC-WEST", LABST:220,  EISBE:300, MINBE:500, PLIFZ:28, STPRS:96.0, LIFNR:"V-3310" },
  ]);
  seedIfEmpty("sap_sd_vbap", [
    { MATNR:"FG-1001", WERKS:"DC-EAST", KWMENG:1300 },
    { MATNR:"FG-1002", WERKS:"DC-EAST", KWMENG:420 },
    { MATNR:"FG-1003", WERKS:"DC-WEST", KWMENG:610 },
  ]);
  seedIfEmpty("sap_fi_bseg", [
    { LIFNR:"V-2207", DMBTR:42.5, EBELN:"4500001" },
    { LIFNR:"V-3310", DMBTR:96.0, EBELN:"4500002" },
  ]);
  seedIfEmpty("bq_forecast", [
    { sku_id:"FG-1001", dc_code:"DC-EAST", fcst_qty:1450, lead_time:21 },
    { sku_id:"FG-1002", dc_code:"DC-EAST", fcst_qty:380,  lead_time:14 },
    { sku_id:"FG-1003", dc_code:"DC-WEST", fcst_qty:720,  lead_time:28 },
  ]);
  seedIfEmpty("bq_supplier_risk", [
    { vendor_id:"V-2207", risk:0.78, region:"APAC", note:"Port strike — APAC lanes" },
    { vendor_id:"V-3310", risk:0.20, region:"EU",   note:"Nominal" },
  ]);

  const TBL = {
    SAP_MM: { MARD:"sap_mm_mard" },
    SAP_SD: { VBAP:"sap_sd_vbap" },
    SAP_FI: { BSEG:"sap_fi_bseg" },
    ANALYTICS: { forecast:"bq_forecast", supplier_risk:"bq_supplier_risk" },
  };

  function makeAdapter(id, label) {
    return {
      id, label, calls: 0,
      query(entity, filter = {}) {
        this.calls++;
        const table = (TBL[id] || {})[entity];
        if (!table) return [];
        const where = Object.keys(filter);
        let sql = `SELECT * FROM ${table}`;
        const params = {};
        if (where.length) { sql += " WHERE " + where.map(c => `${c}=$${c}`).join(" AND "); where.forEach(c => params[c] = filter[c]); }
        return db.prepare(sql).all(params);
      },
      write(op, payload) {
        this.calls++;
        if (op === "PO_CREATE") {
          const EBELN = "45" + Math.floor(Math.random() * 1e6);
          db.prepare(`INSERT INTO sap_mm_po (EBELN,MATNR,WERKS,LIFNR,MENGE,STPRS,status,created_at)
                      VALUES ($EBELN,$MATNR,$WERKS,$LIFNR,$MENGE,$STPRS,'CREATED',$ts)`)
            .run({ EBELN, MATNR:payload.MATNR||null, WERKS:payload.WERKS||null, LIFNR:payload.supplier||payload.LIFNR||null,
                   MENGE:payload.qty||payload.MENGE||0, STPRS:payload.STPRS||0, ts:new Date().toISOString() });
          return { EBELN, status:"CREATED", payload };
        }
        if (op === "SAFETY_STOCK_UPDATE") {
          db.prepare(`UPDATE sap_mm_mard SET EISBE=$EISBE WHERE MATNR=$MATNR AND WERKS=$WERKS`)
            .run({ EISBE:payload.EISBE, MATNR:payload.MATNR, WERKS:payload.WERKS });
          return { MATNR:payload.MATNR, EISBE:payload.EISBE, status:"UPDATED" };
        }
        return { status:"OK" };
      },
    };
  }

  return {
    backend: driver.kind,
    dbPath: activePath,
    systems: {
      SAP_MM: makeAdapter("SAP_MM", "SAP S/4HANA · MM"),
      SAP_SD: makeAdapter("SAP_SD", "SAP S/4HANA · SD"),
      SAP_FI: makeAdapter("SAP_FI", "SAP S/4HANA · FI"),
      ANALYTICS: makeAdapter("ANALYTICS", "Analytics store"),
    },
  };
}

module.exports = { buildSqliteAdapters, hasSqlite: !!driver, driver: driver && driver.kind, DB_PATH };
