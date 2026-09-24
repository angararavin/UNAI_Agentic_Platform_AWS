/*
 * adk_spares_rma_standalone.js — same adapter logic as the full app's
 * adapters/adk_spares_rma.js, but self-contained for a cloud deployment: it
 * reads from a bundled data snapshot (data/adk_seed.json, a real export from
 * the adk_spares_rma_demo app) instead of a path on someone's laptop, and
 * writes to a per-instance ephemeral copy (Cloud Run containers don't keep a
 * persistent disk, so each cold start gets a fresh copy of the same seed —
 * that's expected here, not a bug).
 */
const fs = require("fs");
const path = require("path");
const os = require("os");

function buildAdkSparesRmaAdapters() {
  const seedPath = path.join(__dirname, "..", "data", "adk_seed.json");
  const copyPath = path.join(os.tmpdir(), "unai_spares_state.json");

  if (!fs.existsSync(copyPath)) fs.copyFileSync(seedPath, copyPath);

  const load = () => JSON.parse(fs.readFileSync(copyPath, "utf8"));
  const save = (data) => fs.writeFileSync(copyPath, JSON.stringify(data, null, 2));

  const primaryLocation = (part) => {
    const locs = part.locations || {};
    const keys = Object.keys(locs);
    if (!keys.length) return "DEFAULT";
    return keys.reduce((best, k) => (locs[k] > locs[best] ? k : best), keys[0]);
  };
  const mean = (arr) => (arr && arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const stdev = (arr) => { if (!arr || arr.length < 2) return 0;
    const m = mean(arr); return Math.sqrt(mean(arr.map(x => (x - m) ** 2))); };

  function partsList() { return Object.values(load().parts || {}); }

  const ANALYTICS = {
    id: "ANALYTICS", label: "ADK spares demo — derived analytics views", calls: 0,
    query(entity, filter = {}) {
      this.calls++;
      const parts = partsList();
      let rows = [];
      if (entity === "failure_model") {
        rows = parts.map(p => ({ sku_id: p.part_id, dc_code: primaryLocation(p),
          fail_rate: p.monthly_failure_rate, install_base: p.installed_base,
          age_factor: +((p.avg_age_months || 24) / 24).toFixed(2) }));
      } else if (entity === "spares_forecast") {
        rows = parts.map(p => ({ sku_id: p.part_id, dc_code: primaryLocation(p),
          fcst_qty: Math.round(mean(p.demand_history)),
          variability: mean(p.demand_history) ? +(stdev(p.demand_history) / mean(p.demand_history)).toFixed(2) : 0 }));
      } else if (entity === "returns_model") {
        rows = parts.map(p => ({ sku_id: p.part_id,
          return_prob: p.return_realization_rate, yield_rate: p.refurb_yield,
          return_lag_days: Math.round((p.return_lag_months || 0) * 30) }));
      }
      return rows.filter(r => Object.keys(filter).every(k => r[k] === filter[k]));
    },
    write() { this.calls++; return { status: "OK" }; },
  };

  const SAP_IBP = {
    id: "SAP_IBP", label: "ADK spares demo — IBP-style planning view", calls: 0,
    query(entity, filter = {}) {
      this.calls++;
      const parts = partsList();
      let rows = [];
      if (entity === "install_base") {
        rows = parts.map(p => ({ PRDID: p.part_id, LOCID: primaryLocation(p),
          INSTBASE: p.installed_base, AGEMNTH: p.avg_age_months,
          LEADTIME: Math.round((p.lead_time_months || 0) * 30) }));
      } else if (entity === "inv_target") {
        rows = parts.map(p => {
          const fcst = Math.round(mean(p.demand_history));
          const safety = Math.round((p.minimum_location_stock || 0) * Object.keys(p.locations || {}).length);
          return { PRDID: p.part_id, LOCID: primaryLocation(p),
            TGTPOS: Math.round(fcst * (p.lead_time_months || 0)) + safety,
            SAFETY: safety, SVCLVL: p.service_level, FCSTQTY: fcst };
        });
      }
      return rows.filter(r => Object.keys(filter).every(k => r[k] === filter[k]));
    },
    write() { this.calls++; return { status: "OK" }; },
  };

  const SAP_S4 = {
    id: "SAP_S4", label: "ADK spares demo — S/4-style execution view", calls: 0,
    query(entity, filter = {}) {
      this.calls++;
      const parts = partsList();
      let rows = [];
      if (entity === "stock") {
        rows = parts.map(p => ({ MATNR: p.part_id, WERKS: primaryLocation(p),
          LABST: p.on_hand, EISBE: Math.round((p.minimum_location_stock || 0) * Object.keys(p.locations || {}).length),
          UMLME: p.open_orders, STPRS: p.unit_cost }));
      } else if (entity === "refurb") {
        rows = parts.map(p => ({ WERKS: primaryLocation(p),
          CAPACITY: p.refurb_capacity_per_month, COSTPU: Math.round((p.unit_cost || 0) * 0.30) }));
      }
      return rows.filter(r => Object.keys(filter).every(k => r[k] === filter[k]));
    },
    write(op, payload) {
      this.calls++;
      const data = load();
      const sku = payload.MATNR, plant = payload.WERKS;
      const part = data.parts[sku];
      const logTxn = (type, extra) => { (data.unai_transactions = data.unai_transactions || []).push(
        { type, part_id: sku, at: new Date().toISOString(), ...extra }); };
      if (op === "STOCK_TRANSFER" && part) {
        part.locations = part.locations || {};
        part.locations[plant] = (part.locations[plant] || 0) + (payload.qty || 0);
        logTxn("UNAI_STOCK_TRANSFER", { plant, qty: payload.qty });
        save(data);
        return { EBELN: "ST" + Math.floor(Math.random() * 1e6), status: "CREATED", payload };
      }
      if (op === "PO_CREATE" && part) {
        part.open_orders = (part.open_orders || 0) + (payload.qty || 0);
        logTxn("UNAI_PO_CREATE", { qty: payload.qty, unit_cost: payload.STPRS });
        save(data);
        return { EBELN: "45" + Math.floor(Math.random() * 1e6), status: "CREATED", payload };
      }
      if (op === "REPAIR_ORDER") {
        logTxn("UNAI_REPAIR_ORDER", { qty: payload.qty, rma: payload.rma || null });
        save(data);
        return { EBELN: "RO" + Math.floor(Math.random() * 1e6), status: "SCHEDULED", payload };
      }
      if (op === "GOODS_ISSUE") return { status: "POSTED", payload };
      return { status: "OK" };
    },
  };

  const SERVICENOW = {
    id: "SERVICENOW", label: "ADK spares demo — ServiceNow-style RMA view", calls: 0,
    query() { this.calls++; return []; },   // not read by spares_planning_ibp
    write(op, payload) {
      this.calls++;
      const data = load();
      (data.unai_transactions = data.unai_transactions || []).push(
        { type: "UNAI_" + op, at: new Date().toISOString(), ...payload });
      save(data);
      return { status: "UPDATED", payload };
    },
  };

  return { ANALYTICS, SAP_IBP, SAP_S4, SERVICENOW, copyPath, resetState: () => fs.copyFileSync(seedPath, copyPath) };
}

module.exports = { buildAdkSparesRmaAdapters };
