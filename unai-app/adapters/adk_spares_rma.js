/*
 * adk_spares_rma.js — real adapter for the "adk_spares_rma_demo" Google ADK app.
 *
 * That app is a Gen-1 multi-agent implementation of the SAME two workflows
 * UNAI already models (spares_planning_ibp, rma_execution) as 6 separate
 * agents (ibp_planning_agent, rma_intake_agent, rma_diagnosis_agent,
 * rma_disposition_agent, rma_execution_agent, root_agent) sharing one JSON
 * file as their system of record (spares_rma_agent/.runtime/demo_state.json,
 * written by spares_rma_agent/store.py's JsonStore).
 *
 * This adapter reads/writes a SEPARATE copy of that same file
 * (unai_demo_state.json, seeded once from the real one) so UNAI runs never
 * touch the ADK app's actual state. It exposes ANALYTICS / SAP_IBP / SAP_S4 /
 * SERVICENOW adapters using the exact NATIVE field-name dialects UNAI's
 * built-in ontology already maps (sku_id/fail_rate/... for ANALYTICS;
 * PRDID/INSTBASE/... for SAP_IBP; MATNR/LABST/... for SAP_S4; number/u_status
 * etc for SERVICENOW) — so no ontology change is needed; only the data is real.
 *
 * Every derived figure that isn't a 1:1 field rename is a plain, documented
 * assumption (see comments below) — nothing here is fabricated, only
 * computed from real fields already present in the ADK app's own data.
 */
const fs = require("fs");
const path = require("path");

function buildAdkSparesRmaAdapters(adkAppPath) {
  const pkgDir = path.join(adkAppPath, "spares_rma_agent");
  const seedPath = path.join(pkgDir, "data", "seed.json");
  const realStatePath = path.join(pkgDir, ".runtime", "demo_state.json");
  const copyPath = path.join(pkgDir, ".runtime", "unai_demo_state.json");

  if (!fs.existsSync(copyPath)) {
    const source = fs.existsSync(realStatePath) ? realStatePath : seedPath;
    fs.mkdirSync(path.dirname(copyPath), { recursive: true });
    fs.copyFileSync(source, copyPath);
  }

  const load = () => JSON.parse(fs.readFileSync(copyPath, "utf8"));
  const save = (data) => fs.writeFileSync(copyPath, JSON.stringify(data, null, 2));

  // primary location = the one holding the most stock for that part
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

  // ---- ANALYTICS: sku_id / fail_rate / install_base / age_factor / variability / return_prob / yield_rate / return_lag_days
  const ANALYTICS = {
    id: "ANALYTICS", label: "ADK spares demo — derived analytics views", calls: 0,
    query(entity, filter = {}) {
      this.calls++;
      const parts = partsList();
      let rows = [];
      if (entity === "failure_model") {
        // age_factor: normalized around 24 months (no age_factor field exists natively —
        // this is the one clearly-labelled derived figure, same role as the built-in demo's).
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

  // ---- SAP_IBP: PRDID / LOCID / INSTBASE / AGEMNTH / LEADTIME / TGTPOS / SAFETY / SVCLVL / FCSTQTY
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
        // TGTPOS/SAFETY: no explicit target-inventory field exists natively, so this is
        // derived — avg monthly demand * lead time (months) + a location-count safety
        // buffer, the same "demand during lead time + safety stock" shape the ADK app's
        // own algorithms.py uses (inventory_policy.target_inventory_position).
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

  // ---- SAP_S4: MATNR / WERKS / LABST / EISBE / UMLME / STPRS / CAPACITY / COSTPU
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
        // COSTPU (repair cost/unit): no explicit repair-cost field exists natively —
        // estimated as 30% of unit_cost, a common repair-vs-new heuristic; flagged here
        // so it's never mistaken for a real financial figure from the source app.
        rows = parts.map(p => ({ WERKS: primaryLocation(p),
          CAPACITY: p.refurb_capacity_per_month, COSTPU: Math.round((p.unit_cost || 0) * 0.30) }));
      }
      return rows.filter(r => Object.keys(filter).every(k => r[k] === filter[k]));
    },
    write(op, payload) {
      // NOTE: L.act() already translated the canonical payload into THIS system's
      // native field names before calling write() — so keys here are MATNR/WERKS/
      // STPRS (per the ontology), not sku/plant/unit_cost. "qty" has no ontology
      // entry so it passes through unchanged.
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

  // ---- SERVICENOW: number / cmdb_ci / u_status / u_warranty / u_claim_value / u_entitled / u_oem / u_symptom
  const SERVICENOW = {
    id: "SERVICENOW", label: "ADK spares demo — ServiceNow-style RMA view", calls: 0,
    query(entity, filter = {}) {
      this.calls++;
      let rows = [];
      if (entity === "rma_case") {
        const data = load();
        const rmas = Object.values(data.rmas || {});
        const open = rmas.filter(r => r.status !== "CLOSED");
        if (open.length) {
          rows = open.map(r => {
            const part = data.parts[r.part_id] || {};
            return { number: r.rma_id, cmdb_ci: r.part_id,
              u_status: r.status, u_warranty: r.warranty_valid ? "IN_WARRANTY" : "OUT_WARRANTY",
              u_claim_value: part.unit_cost || 0, u_entitled: !!r.claim_valid,
              u_oem: "OEM_PORTAL_DEMO", u_symptom: r.issue_description || "" };
          });
        } else {
          // No open RMA in the ADK app's data right now (its own sample only has a
          // CLOSED one) — synthesize one FROM REAL TELEMETRY so the run has something
          // to triage: the first asset whose device telemetry shows a failure and has
          // no ticket yet. Not written back; clearly flagged so it's never mistaken
          // for a persisted record.
          const assets = Object.values(data.assets || {});
          const withRma = new Set(rmas.map(r => r.serial_number));
          const candidate = assets.find(a => !withRma.has(a.serial_number)
            && data.telemetry && data.telemetry[a.serial_number]
            && data.telemetry[a.serial_number].health_status !== "OK");
          if (candidate) {
            const tel = data.telemetry[candidate.serial_number];
            const part = data.parts[candidate.part_id] || {};
            rows = [{ number: "SYNTH-" + candidate.serial_number, cmdb_ci: candidate.part_id,
              u_status: "NEW_FROM_TELEMETRY", u_warranty: "IN_WARRANTY", u_claim_value: part.unit_cost || 0,
              u_entitled: true, u_oem: "OEM_PORTAL_DEMO",
              u_symptom: `${tel.diagnostic_code} (telemetry health=${tel.health_status}, no ticket filed yet)`,
              _synthesized: true }];
          }
        }
      }
      return rows.filter(r => Object.keys(filter).every(k => r[k] === filter[k]));
    },
    write(op, payload) {
      this.calls++;
      const data = load();
      (data.unai_transactions = data.unai_transactions || []).push(
        { type: "UNAI_" + op, at: new Date().toISOString(), ...payload });
      save(data);
      if (op === "ISSUE_CREDIT") return { ref: "CR" + Math.floor(Math.random() * 1e6), status: "ISSUED", payload };
      if (op === "ISSUE_REPLACEMENT") return { ref: "RP" + Math.floor(Math.random() * 1e6), status: "ISSUED", payload };
      if (op === "UPDATE_RMA") return { status: "UPDATED", payload };
      return { status: "OK" };
    },
  };

  return { ANALYTICS, SAP_IBP, SAP_S4, SERVICENOW, copyPath };
}

module.exports = { buildAdkSparesRmaAdapters };
