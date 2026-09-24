/* Supply / S&OP Planning -- reference UNAI tool packs (generated, NOT required to run).
 * The live comparison uses the engine's generic capability handler automatically.
 * These are starting points if you want to hand-write real per-capability logic
 * and merge it into engine.js's TOOL_PACKS later. */
const TOOL_PACKS = {
  supply_demand_balance(L) {                       // Supply-Demand Balance Agent - undefined - SAP_IBP - sku
    const rows = L.perceive("SAP_IBP", "sku", {});
    const ev = L.evidence("Supply-Demand Balance Agent", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
  capacity_check(L) {                       // Capacity Agent - undefined - SAP_IBP - sku
    const rows = L.perceive("SAP_IBP", "sku", {});
    const ev = L.evidence("Capacity Agent", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
  master_supply_plan(L) {                       // Master Supply Plan Agent - undefined - SAP_IBP - sku
    const rows = L.perceive("SAP_IBP", "sku", {});
    const ev = L.evidence("Master Supply Plan Agent", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
  sourcing_allocation(L) {                       // Sourcing Allocation Agent - undefined - SAP_IBP - sku
    const rows = L.perceive("SAP_IBP", "sku", {});
    const ev = L.evidence("Sourcing Allocation Agent", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
  sop_reconcile(L) {                       // S&OP Reconciliation Agent - undefined - SAP_IBP - sku
    const rows = L.perceive("SAP_IBP", "sku", {});
    const ev = L.evidence("S&OP Reconciliation Agent", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
};
module.exports = { TOOL_PACKS };
