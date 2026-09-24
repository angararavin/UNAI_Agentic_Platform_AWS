/* Demand Planning -- reference UNAI tool packs (generated, NOT required to run).
 * The live comparison uses the engine's generic capability handler automatically.
 * These are starting points if you want to hand-write real per-capability logic
 * and merge it into engine.js's TOOL_PACKS later. */
const TOOL_PACKS = {
  statistical_forecast(L) {                       // statistical forecast - undefined - ANALYTICS - sku
    const rows = L.perceive("ANALYTICS", "sku", {});
    const ev = L.evidence("statistical forecast", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
  demand_sensing(L) {                       // demand sensing - undefined - ANALYTICS - sku
    const rows = L.perceive("ANALYTICS", "sku", {});
    const ev = L.evidence("demand sensing", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
  consensus_demand(L) {                       // consensus demand - undefined - ANALYTICS - sku
    const rows = L.perceive("ANALYTICS", "sku", {});
    const ev = L.evidence("consensus demand", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
  promotions_uplift(L) {                       // promotions uplift - undefined - ANALYTICS - sku
    const rows = L.perceive("ANALYTICS", "sku", {});
    const ev = L.evidence("promotions uplift", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
  forecast_accuracy(L) {                       // forecast accuracy - undefined - ANALYTICS - sku
    const rows = L.perceive("ANALYTICS", "sku", {});
    const ev = L.evidence("forecast accuracy", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
};
module.exports = { TOOL_PACKS };
