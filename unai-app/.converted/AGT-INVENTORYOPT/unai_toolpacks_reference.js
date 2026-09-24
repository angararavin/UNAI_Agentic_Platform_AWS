/* Inventory Optimization -- reference UNAI tool packs (generated, NOT required to run).
 * The live comparison uses the engine's generic capability handler automatically.
 * These are starting points if you want to hand-write real per-capability logic
 * and merge it into engine.js's TOOL_PACKS later. */
const TOOL_PACKS = {
  safety_stock_calc(L) {                       // Safety-Stock Agent - undefined - SAP_MM - sku
    const rows = L.perceive("SAP_MM", "sku", {});
    const ev = L.evidence("Safety-Stock Agent", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
  reorder_policy(L) {                       // Reorder Policy Agent - undefined - SAP_MM - sku
    const rows = L.perceive("SAP_MM", "sku", {});
    const ev = L.evidence("Reorder Policy Agent", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
  multi_echelon_balance(L) {                       // Multi-Echelon Balancing Agent - undefined - SAP_MM - sku
    const rows = L.perceive("SAP_MM", "sku", {});
    const ev = L.evidence("Multi-Echelon Balancing Agent", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
  excess_obsolete(L) {                       // Excess & Obsolete Agent - undefined - ANALYTICS - sku
    const rows = L.perceive("ANALYTICS", "sku", {});
    const ev = L.evidence("Excess & Obsolete Agent", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
  inventory_turns(L) {                       // Inventory Turns Agent - undefined - ANALYTICS - sku
    const rows = L.perceive("ANALYTICS", "sku", {});
    const ev = L.evidence("Inventory Turns Agent", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
};
module.exports = { TOOL_PACKS };
