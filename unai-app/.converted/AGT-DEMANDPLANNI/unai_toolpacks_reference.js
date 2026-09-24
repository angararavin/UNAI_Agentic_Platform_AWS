/* Demand Planning -- reference UNAI tool packs (generated, NOT required to run).
 * The live comparison uses the engine's generic capability handler automatically.
 * These are starting points if you want to hand-write real per-capability logic
 * and merge it into engine.js's TOOL_PACKS later. */
const TOOL_PACKS = {
  statistical_forecast(L) {                       // Statistical Forecast Agent - undefined - ANALYTICS - sku
    const rows = L.perceive("ANALYTICS", "sku", {});
    const ev = L.evidence("Statistical Forecast Agent", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
  demand_sensing(L) {                       // Demand Sensing Agent - undefined - ANALYTICS - sku
    const rows = L.perceive("ANALYTICS", "sku", {});
    const ev = L.evidence("Demand Sensing Agent", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
  consensus_demand(L) {                       // Consensus Demand Agent - undefined - ANALYTICS - sku
    const rows = L.perceive("ANALYTICS", "sku", {});
    const ev = L.evidence("Consensus Demand Agent", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
  promotions_uplift(L) {                       // Promotions Uplift Agent - undefined - ANALYTICS - sku
    const rows = L.perceive("ANALYTICS", "sku", {});
    const ev = L.evidence("Promotions Uplift Agent", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
  forecast_accuracy(L) {                       // Forecast Accuracy Agent - undefined - ANALYTICS - sku
    const rows = L.perceive("ANALYTICS", "sku", {});
    const ev = L.evidence("Forecast Accuracy Agent", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
};
module.exports = { TOOL_PACKS };
