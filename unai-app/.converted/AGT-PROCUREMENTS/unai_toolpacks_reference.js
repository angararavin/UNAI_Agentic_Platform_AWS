/* Procurement & Sourcing -- reference UNAI tool packs (generated, NOT required to run).
 * The live comparison uses the engine's generic capability handler automatically.
 * These are starting points if you want to hand-write real per-capability logic
 * and merge it into engine.js's TOOL_PACKS later. */
const TOOL_PACKS = {
  spend_analysis(L) {                       // Spend Analysis Agent - undefined - ANALYTICS - sku
    const rows = L.perceive("ANALYTICS", "sku", {});
    const ev = L.evidence("Spend Analysis Agent", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
  supplier_scorecard(L) {                       // Supplier Scorecard Agent - undefined - ANALYTICS - sku
    const rows = L.perceive("ANALYTICS", "sku", {});
    const ev = L.evidence("Supplier Scorecard Agent", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
  sourcing_award(L) {                       // Sourcing Award Agent - undefined - SAP_MM - sku
    const rows = L.perceive("SAP_MM", "sku", {});
    const ev = L.evidence("Sourcing Award Agent", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
  contract_compliance(L) {                       // Contract Compliance Agent - undefined - SAP_MM - sku
    const rows = L.perceive("SAP_MM", "sku", {});
    const ev = L.evidence("Contract Compliance Agent", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
  po_automation(L) {                       // PO Automation Agent - undefined - SAP_MM - sku
    const rows = L.perceive("SAP_MM", "sku", {});
    const ev = L.evidence("PO Automation Agent", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
};
module.exports = { TOOL_PACKS };
