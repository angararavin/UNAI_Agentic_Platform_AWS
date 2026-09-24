/* react-example -- reference UNAI tool packs (generated, NOT required to run).
 * The live comparison uses the engine's generic capability handler automatically.
 * These are starting points if you want to hand-write real per-capability logic
 * and merge it into engine.js's TOOL_PACKS later. */
const TOOL_PACKS = {
  demand_analyst_node(L) {                       // demand Analyst Node - Action - ANALYTICS - sku
    const rows = L.perceive("ANALYTICS", "sku", {});
    const ev = L.evidence("demand Analyst Node", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    // L.act("ANALYTICS", "UPDATE", { sku: /* value */ }); // gated write-back
    return { rows, evidence: ev };
  },
  human_review_init_node(L) {                       // human Review Init Node - Action - ANALYTICS - sku
    const rows = L.perceive("ANALYTICS", "sku", {});
    const ev = L.evidence("human Review Init Node", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    // L.act("ANALYTICS", "UPDATE", { sku: /* value */ }); // gated write-back
    return { rows, evidence: ev };
  },
  process_human_decision(L) {                       // process Human Decision - Action - ANALYTICS - sku
    const rows = L.perceive("ANALYTICS", "sku", {});
    const ev = L.evidence("process Human Decision", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    // L.act("ANALYTICS", "UPDATE", { sku: /* value */ }); // gated write-back
    return { rows, evidence: ev };
  },
  planner_recommendation_node(L) {                       // planner Recommendation Node - Action - SAP_IBP - sku
    const rows = L.perceive("SAP_IBP", "sku", {});
    const ev = L.evidence("planner Recommendation Node", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    // L.act("SAP_IBP", "UPDATE", { sku: /* value */ }); // gated write-back
    return { rows, evidence: ev };
  },
  supply_impact_analyst_node(L) {                       // supply Impact Analyst Node - Action - ANALYTICS - sku
    const rows = L.perceive("ANALYTICS", "sku", {});
    const ev = L.evidence("supply Impact Analyst Node", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    // L.act("ANALYTICS", "UPDATE", { sku: /* value */ }); // gated write-back
    return { rows, evidence: ev };
  },
  run_order_surge_analysis(L) {                       // run Order Surge Analysis - Action - SAP_SD - sku
    const rows = L.perceive("SAP_SD", "sku", {});
    const ev = L.evidence("run Order Surge Analysis", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    // L.act("SAP_SD", "UPDATE", { sku: /* value */ }); // gated write-back
    return { rows, evidence: ev };
  },
  create_order_surge_graph(L) {                       // create Order Surge Graph - Action - SAP_SD - sku
    const rows = L.perceive("SAP_SD", "sku", {});
    const ev = L.evidence("create Order Surge Graph", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    // L.act("SAP_SD", "UPDATE", { sku: /* value */ }); // gated write-back
    return { rows, evidence: ev };
  },
  call_llm(L) {                       // call LLM - Action - ANALYTICS - sku
    const rows = L.perceive("ANALYTICS", "sku", {});
    const ev = L.evidence("call LLM", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    // L.act("ANALYTICS", "UPDATE", { sku: /* value */ }); // gated write-back
    return { rows, evidence: ev };
  },
  is_custom_api_configured(L) {                       // is Custom Api Configured - Action - ANALYTICS - sku
    const rows = L.perceive("ANALYTICS", "sku", {});
    const ev = L.evidence("is Custom Api Configured", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    // L.act("ANALYTICS", "UPDATE", { sku: /* value */ }); // gated write-back
    return { rows, evidence: ev };
  },
  is_gemini_configured(L) {                       // is Gemini Configured - Action - ANALYTICS - sku
    const rows = L.perceive("ANALYTICS", "sku", {});
    const ev = L.evidence("is Gemini Configured", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    // L.act("ANALYTICS", "UPDATE", { sku: /* value */ }); // gated write-back
    return { rows, evidence: ev };
  },
  get_llmclient(L) {                       // get LLMClient - Perception - ANALYTICS - sku
    const rows = L.perceive("ANALYTICS", "sku", {});
    const ev = L.evidence("get LLMClient", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    return { rows, evidence: ev };
  },
  determine_initial_provider(L) {                       // determine Initial Provider - Action - ANALYTICS - sku
    const rows = L.perceive("ANALYTICS", "sku", {});
    const ev = L.evidence("determine Initial Provider", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    // L.act("ANALYTICS", "UPDATE", { sku: /* value */ }); // gated write-back
    return { rows, evidence: ev };
  },
  load_data(L) {                       // load Data - Action - ANALYTICS - sku
    const rows = L.perceive("ANALYTICS", "sku", {});
    const ev = L.evidence("load Data", [{ name: "sku", weight: 0.2 }]);
    L.explain(ev);
    // L.act("ANALYTICS", "UPDATE", { sku: /* value */ }); // gated write-back
    return { rows, evidence: ev };
  },
};
module.exports = { TOOL_PACKS };
