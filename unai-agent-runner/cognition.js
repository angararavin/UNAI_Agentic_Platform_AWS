/*
 * UNAI - Universal Supply-Chain Agent (Cognitive Runtime)
 * Copyright (c) 2026 Ravin Angara / Bristlecone. All rights reserved.
 * PROPRIETARY & CONFIDENTIAL. See LICENSE.  [UNAI-COPYRIGHT v1]
 *
 * cognition.js — the Supply-Chain Cognition Layer.
 * Three differentiators, in one module (browser + Node):
 *   1) A canonical ontology LIBRARY that learns across deployments (a data /
 *      network-effect moat): concept -> anonymized field-name aliases.
 *   2) A causal WORLD MODEL (a domain / expertise moat): the runtime reasons
 *      like a supply-chain expert, not a generic LLM.
 *   3) Confidence-scored SELF-ONBOARDING (a speed moat): auto-map any schema to
 *      canonical concepts and show which use cases it unlocks.
 * Privacy: the library stores ONLY field-name patterns + concepts + domain
 * rules — never customer data or values.
 */
(function (root) {
  "use strict";

  // ---- 1. ONTOLOGY LIBRARY (seed corpus; grows via learn()) ----------------
  // concept: canonical term · domain · type · aliases (field-name patterns seen
  // across ERPs/warehouses) · syn (business synonyms).
  const LIBRARY = [
    { c:"sku", d:"master", t:"id", aliases:["matnr","sku","sku_id","item_code","material","material_number","matkl","prdid","default_code","productid","prod_id","item","itemno","part_number","partno","cmdb_ci"], syn:["product","material","item","part"] },
    { c:"plant", d:"master", t:"id", aliases:["werks","plant","dc_code","location","locid","site","warehouse","facility","facilityid","bukrs"], syn:["site","location","warehouse","dc"] },
    { c:"on_hand_qty", d:"inventory", t:"qty", aliases:["labst","on_hand","qty_on_hand","actual_qty","quantity","onhand","stock","stock_qty","inventory_qty","quantityonhandtotal"], syn:["stock","inventory","on hand"] },
    { c:"safety_stock", d:"inventory", t:"qty", aliases:["eisbe","safety_stock","safety","ss","buffer_stock","safetystock"], syn:["buffer","safety"] },
    { c:"reorder_point", d:"inventory", t:"qty", aliases:["minbe","reorder_point","rop","reorder","min_stock","reorderpoint"], syn:["reorder","rop"] },
    { c:"open_demand", d:"demand", t:"qty", aliases:["open_orders","open_demand","kwmeng","backorder","demand","order_qty","openqty"], syn:["orders","backorder","demand"] },
    { c:"forecast_qty", d:"demand", t:"qty", aliases:["fcst_qty","forecast","forecast_qty","fcstqty","predicted_demand","fc_qty"], syn:["forecast","prediction"] },
    { c:"consensus_demand", d:"demand", t:"qty", aliases:["consensus_qty","consensus","consensus_demand"], syn:["consensus"] },
    { c:"forecast_accuracy", d:"demand", t:"pct", aliases:["fcst_accuracy","forecast_accuracy","mape","accuracy","fa"], syn:["accuracy","mape"] },
    { c:"promo_uplift", d:"demand", t:"pct", aliases:["promo_uplift","promotion_lift","uplift","promo_lift"], syn:["promotion","uplift","lift"] },
    { c:"supplier", d:"procurement", t:"id", aliases:["lifnr","vendor_id","supplier","vendor","seller_ids","partyid","supplier_id"], syn:["vendor","seller"] },
    { c:"supplier_score", d:"procurement", t:"score", aliases:["supplier_score","vendor_score","risk_score","supplier_rating"], syn:["rating","risk"] },
    { c:"lead_time_days", d:"procurement", t:"days", aliases:["plifz","lead_time","leadtime","lt_days","lead_time_days","replenishment_time"], syn:["lead time","replenishment"] },
    { c:"unit_cost", d:"finance", t:"money", aliases:["stprs","unit_cost","valuation_rate","standard_price","cost","unitcost","dmbtr","price_per_unit"], syn:["cost","price"] },
    { c:"purchase_order", d:"procurement", t:"id", aliases:["ebeln","po_id","purchase_order","po","po_number","ponumber"], syn:["po","order"] },
    { c:"spend_amount", d:"procurement", t:"money", aliases:["spend_amt","spend","spend_amount","total_spend","amount"], syn:["spend","amount"] },
    { c:"contract_id", d:"procurement", t:"id", aliases:["konnr","contract_id","contract","agreement_id"], syn:["contract","agreement"] },
    { c:"carrier", d:"logistics", t:"id", aliases:["carrier","carrier_id","transporter","shipper"], syn:["shipper","transporter"] },
    { c:"transit_days", d:"logistics", t:"days", aliases:["transit_days","transit_time","in_transit_days","shipping_days"], syn:["transit","shipping time"] },
    { c:"freight_cost", d:"logistics", t:"money", aliases:["freight_cost","freight","shipping_cost","transport_cost"], syn:["freight","shipping cost"] },
    { c:"otif", d:"logistics", t:"pct", aliases:["otif","otif_pct","on_time_in_full","service_otif"], syn:["on time in full","otif"] },
    { c:"in_transit_qty", d:"logistics", t:"qty", aliases:["umlme","in_transit","in_transit_qty","intransit"], syn:["in transit"] },
    { c:"install_base_qty", d:"spares", t:"qty", aliases:["instbase","install_base","installed_base","fleet_size"], syn:["installed base","fleet"] },
    { c:"failure_rate", d:"spares", t:"rate", aliases:["fail_rate","failure_rate","mtbf_inv","defect_rate"], syn:["failure","defect"] },
    { c:"service_level", d:"spares", t:"pct", aliases:["svclvl","service_level","fill_rate","sla"], syn:["service level","fill rate","sla"] },
    { c:"rma_id", d:"returns", t:"id", aliases:["number","rma_id","rma","return_id","rma_number"], syn:["return","rma"] },
    { c:"warranty_status", d:"returns", t:"cat", aliases:["u_warranty","warranty_status","warranty","warranty_flag"], syn:["warranty"] },
    { c:"claim_value", d:"returns", t:"money", aliases:["u_claim_value","claim_value","claim_amount","claim"], syn:["claim"] },
    { c:"inv_turns", d:"inventory", t:"ratio", aliases:["inv_turns","inventory_turns","turnover","turns"], syn:["turnover","turns"] },
    { c:"excess_qty", d:"inventory", t:"qty", aliases:["excess_qty","excess","overstock","surplus"], syn:["excess","overstock"] },
    { c:"allocation_qty", d:"supply", t:"qty", aliases:["allocqty","allocation_qty","allocated","allocation"], syn:["allocation"] },
    { c:"capacity_qty", d:"supply", t:"qty", aliases:["capqty","capacity","capacity_qty","available_capacity"], syn:["capacity"] },
    { c:"work_order", d:"production", t:"id", aliases:["aufnr","work_order","wo","production_order","wo_id"], syn:["work order","production order"] },
    { c:"oee", d:"production", t:"pct", aliases:["oee_pct","oee","overall_equipment_effectiveness"], syn:["oee"] },
    { c:"customer", d:"master", t:"id", aliases:["kunnr","customer","customer_id","cust_id","account","buyer"], syn:["account","buyer","customer"] },
    { c:"sales_qty", d:"demand", t:"qty", aliases:["sales_qty","units_sold","qty_sold","sales","sold_qty"], syn:["sales","units sold"] },
    { c:"ship_date", d:"logistics", t:"date", aliases:["ship_date","shipped_on","dispatch_date","shipdate"], syn:["ship date","dispatch"] },
    { c:"region", d:"master", t:"cat", aliases:["region","geo","territory","market","area"], syn:["geo","territory","market"] },
    // ---- SAP IBP 2311 concepts: IO/MEIO · DDR/DDMRP · MRO · Demand · Response · Sustainability ----
    { c:"cycle_stock", d:"inventory", t:"qty", aliases:["cycle_stock","cyclestock","cycle_stk"], syn:["cycle stock"] },
    { c:"pipeline_stock", d:"inventory", t:"qty", aliases:["pipeline_stock","pipelinestock","transit_stock"], syn:["pipeline stock"] },
    { c:"target_inventory", d:"inventory", t:"qty", aliases:["tgtpos","target_inventory","target_inventory_position","target_stock_position","tip"], syn:["target inventory position"] },
    { c:"demand_variability", d:"demand", t:"num", aliases:["variability","demand_variability","cov","demand_cov","std_demand"], syn:["variability","coefficient of variation"] },
    { c:"co2_emissions", d:"sustainability", t:"num", aliases:["co2","co2_emissions","emissions","carbon","ghg"], syn:["carbon","emissions"] },
    { c:"decoupling_point", d:"ddmrp", t:"flag", aliases:["decoupling_point","decouple","decoupling","buffer_point"], syn:["decoupling point"] },
    { c:"buffer_level", d:"ddmrp", t:"qty", aliases:["buffer_level","buffer","buffer_zone","red_zone","yellow_zone","green_zone","tor","tog"], syn:["buffer","buffer zone"] },
    { c:"net_flow_position", d:"ddmrp", t:"qty", aliases:["net_flow_position","netflow","nfp","net_flow"], syn:["net flow position"] },
    { c:"average_daily_usage", d:"ddmrp", t:"rate", aliases:["adu","average_daily_usage","avg_daily_usage","daily_usage"], syn:["adu","average daily usage"] },
    { c:"forecast_error", d:"demand", t:"pct", aliases:["forecast_error","fcst_error","mape","wmape","rmse"], syn:["mape","forecast error"] },
    { c:"forecast_bias", d:"demand", t:"pct", aliases:["forecast_bias","bias","fcst_bias","mpe"], syn:["bias"] },
    { c:"corrected_history", d:"demand", t:"qty", aliases:["corrected_history","cleansed_history","adjusted_sales","outlier_corrected"], syn:["cleansed history","corrected sales"] },
    { c:"lifecycle_phase", d:"demand", t:"cat", aliases:["lifecycle_phase","plm_phase","phase_in","phase_out","launch_flag","discontinue_flag"], syn:["phase-in","phase-out","lifecycle"] },
    { c:"confirmed_qty", d:"supply", t:"qty", aliases:["confqty","confirmed_qty","confirmedqty","conf_qty","committed_qty"], syn:["confirmed quantity"] },
    { c:"requested_qty", d:"supply", t:"qty", aliases:["reqqty","requested_qty","requestedqty","req_qty"], syn:["requested quantity"] },
    { c:"projected_stock", d:"supply", t:"qty", aliases:["projected_stock","projected_inventory","proj_stock","pab","projected_available_balance"], syn:["projected available balance"] },
    { c:"receipt_qty", d:"supply", t:"qty", aliases:["receipt_qty","receipts","planned_receipt","inbound_qty","grqty"], syn:["receipts"] },
    { c:"resource_capacity", d:"production", t:"qty", aliases:["resource_capacity","res_capacity","capacity_hours","work_center_capacity"], syn:["resource capacity"] },
    { c:"net_requirement", d:"supply", t:"qty", aliases:["net_requirement","net_req","netreq","demand_requirement"], syn:["net requirement"] },
    { c:"yield_rate", d:"spares", t:"pct", aliases:["yield_rate","yield","yield_pct","refurb_yield"], syn:["yield"] },
    { c:"refurb_capacity", d:"spares", t:"qty", aliases:["refurb_capacity","repair_capacity","refurbishment_capacity"], syn:["refurbishment capacity"] },
    { c:"return_qty", d:"returns", t:"qty", aliases:["return_qty","returns","returned_qty","ret_qty"], syn:["returns quantity"] },
    { c:"mps_qty", d:"supply", t:"qty", aliases:["mpsqty","mps_qty","master_production_schedule","mps"], syn:["master production schedule"] },
    { c:"alert_count", d:"controltower", t:"count", aliases:["alert_count","alerts","exceptions","exception_count"], syn:["alerts","exceptions"] },
    { c:"kpi_value", d:"controltower", t:"num", aliases:["kpi","kpi_value","metric","kpi_val"], syn:["kpi","metric"] },
    { c:"stakeholder_influence", d:"change", t:"score", aliases:["influence_score","stakeholder_influence","influence"], syn:["influence"] },
    { c:"stakeholder_support", d:"change", t:"score", aliases:["support_score","stakeholder_support","sentiment"], syn:["support","sentiment"] },
    { c:"change_readiness", d:"change", t:"score", aliases:["readiness_score","change_readiness","readiness"], syn:["readiness"] },
    { c:"training_completion", d:"change", t:"pct", aliases:["completion_pct","training_completion","training_progress"], syn:["training"] },
    { c:"milestone_status", d:"change", t:"text", aliases:["milestone_state","milestone_status","milestone"], syn:["milestone"] },
    { c:"comms_coverage", d:"change", t:"text", aliases:["comm_state","comms_coverage","comms_reach","communication"], syn:["comms","communication"] },
    { c:"change_risk", d:"change", t:"score", aliases:["change_risk","resistance","resistance_level","risk_score"], syn:["resistance","risk"] },
    { c:"adoption_rate", d:"change", t:"pct", aliases:["current_value","adoption_rate","adoption"], syn:["adoption"] },
  ];

  // ---- 2. CAUSAL WORLD MODEL -----------------------------------------------
  // Directed causal edges the runtime uses to reason like a supply-chain expert.
  const WORLD_EDGES = [
    ["supplier_score","lead_time_days","raises","+"],
    ["lead_time_days","safety_stock","raises","+"],
    ["forecast_accuracy","safety_stock","lowers","-"],
    ["open_demand","stockout_risk","raises","+"],
    ["on_hand_qty","stockout_risk","lowers","-"],
    ["safety_stock","stockout_risk","lowers","-"],
    ["promo_uplift","consensus_demand","raises","+"],
    ["promo_uplift","cannibalization","raises","+"],
    ["excess_qty","inv_turns","lowers","-"],
    ["failure_rate","install_base_qty","drives_demand_via","+"],
    ["transit_days","otif","lowers","-"],
    ["freight_cost","landed_cost","raises","+"],
    ["unit_cost","landed_cost","raises","+"],
    // SAP IBP-grounded edges (DDMRP · MEIO · demand)
    ["average_daily_usage","buffer_level","raises","+"],
    ["net_flow_position","net_requirement","lowers","-"],
    ["demand_variability","safety_stock","raises","+"],
    ["service_level","safety_stock","raises","+"],
    ["forecast_error","safety_stock","raises","+"],
    ["co2_emissions","landed_cost","raises","+"],
    ["change_readiness","adoption_rate","raises","+"],
    ["training_completion","adoption_rate","raises","+"],
    ["stakeholder_support","adoption_rate","raises","+"],
    ["change_risk","adoption_rate","lowers","-"],
    ["stakeholder_influence","change_risk","raises","+"],
  ];
  // Reusable domain formulas (the "world model math").
  const WORLD_FORMULAS = [
    { name:"Safety stock", expr:"z · σ_demand · √(lead_time)", needs:["lead_time_days","forecast_accuracy"], out:"safety_stock" },
    { name:"Reorder point", expr:"demand_rate · lead_time + safety_stock", needs:["open_demand","lead_time_days","safety_stock"], out:"reorder_point" },
    { name:"Spares demand", expr:"install_base · failure_rate · age_factor", needs:["install_base_qty","failure_rate"], out:"forecast_qty" },
    { name:"Landed cost", expr:"unit_cost + freight_cost + duty", needs:["unit_cost","freight_cost"], out:"landed_cost" },
    { name:"DDMRP buffer", expr:"ADU · lead_time · variability_factor", needs:["average_daily_usage","lead_time_days"], out:"buffer_level" },
    { name:"Net flow position", expr:"on_hand + on_order − qualified_demand", needs:["on_hand_qty","open_demand"], out:"net_flow_position" },
  ];
  // Which canonical concepts each use case needs (drives "unlocked" logic).
  // Grounded in the SAP IBP module set: Demand · IO/MEIO · DDR/DDMRP · MRO ·
  // Response & Supply (order-based) · Synchronized Planning · Control Tower.
  const USE_CASE_NEEDS = {
    // ---- Demand planning ----
    statistical_forecasting:      ["forecast_qty","sales_qty","forecast_accuracy"],
    demand_sensing:               ["forecast_qty","open_demand","sales_qty"],
    curve_based_forecast:         ["sales_qty","forecast_qty","lifecycle_phase"],
    outlier_correction:           ["sales_qty","corrected_history","forecast_error"],
    product_lifecycle_planning:   ["lifecycle_phase","sku","forecast_qty"],
    consensus_demand_sop:         ["consensus_demand","forecast_qty","open_demand"],
    promotion_planning:           ["promo_uplift","sales_qty","forecast_qty"],
    cannibalization_analysis:     ["promo_uplift","sales_qty","sku"],
    forecast_accuracy_monitoring: ["forecast_accuracy","forecast_error","forecast_bias"],
    demand_planning:              ["forecast_qty","consensus_demand","open_demand","forecast_accuracy"],
    // ---- Inventory (IO / MEIO / DDR / MRO) ----
    inventory_optimization:       ["on_hand_qty","safety_stock","reorder_point","lead_time_days"],
    multi_echelon_inventory:      ["safety_stock","cycle_stock","pipeline_stock","service_level"],
    safety_stock_planning:        ["safety_stock","demand_variability","lead_time_days","service_level"],
    service_level_prediction:     ["service_level","on_hand_qty","safety_stock"],
    demand_driven_replenishment:  ["net_flow_position","buffer_level","average_daily_usage","decoupling_point"],
    mro_inventory_planning:       ["install_base_qty","target_inventory","service_level"],
    excess_and_obsolescence:      ["excess_qty","inv_turns","on_hand_qty"],
    // ---- Supply / Response (order-based) / Production / Synchronized ----
    supply_planning:              ["allocation_qty","capacity_qty","open_demand","on_hand_qty"],
    response_planning:            ["confirmed_qty","requested_qty","allocation_qty","projected_stock"],
    allocation_planning:          ["allocation_qty","open_demand","capacity_qty"],
    net_requirements_planning:    ["net_requirement","projected_stock","receipt_qty","open_demand"],
    capacity_planning:            ["resource_capacity","capacity_qty","work_order"],
    production_planning:          ["work_order","capacity_qty","oee"],
    synchronized_planning:        ["mps_qty","capacity_qty","confirmed_qty","projected_stock"],
    // ---- Procurement / Logistics / Risk ----
    procurement_sourcing:         ["supplier","supplier_score","unit_cost","purchase_order","spend_amount"],
    logistics_transportation:     ["carrier","transit_days","freight_cost","otif"],
    disruption_response:          ["supplier","lead_time_days","on_hand_qty","open_demand"],
    // ---- Aftermarket / Service ----
    spares_rma_closed_loop:       ["install_base_qty","failure_rate","service_level","rma_id","warranty_status","claim_value"],
    returns_forecasting:          ["return_qty","failure_rate","install_base_qty"],
    spares_planning_ibp:          ["install_base_qty","failure_rate","service_level"],
    rma_execution:                ["rma_id","warranty_status","claim_value"],
    // ---- Control tower / Sustainability ----
    control_tower_alerts:         ["alert_count","kpi_value","otif"],
    sustainability_planning:      ["co2_emissions","sku","plant"],
    // ---- Organizational Change Management (OCM) ----
    ocm_change_management:        ["change_readiness","stakeholder_influence","training_completion","change_risk","adoption_rate"],
  };
  // Module grouping (for the UI catalog) — mirrors the SAP IBP module set.
  const USE_CASE_MODULE = {
    statistical_forecasting:"Demand", demand_sensing:"Demand", curve_based_forecast:"Demand",
    outlier_correction:"Demand", product_lifecycle_planning:"Demand", consensus_demand_sop:"Demand · S&OP",
    promotion_planning:"Demand", cannibalization_analysis:"Demand", forecast_accuracy_monitoring:"Demand", demand_planning:"Demand",
    inventory_optimization:"Inventory · IO", multi_echelon_inventory:"Inventory · MEIO", safety_stock_planning:"Inventory",
    service_level_prediction:"Inventory", demand_driven_replenishment:"DDR · DDMRP", mro_inventory_planning:"MRO", excess_and_obsolescence:"Inventory",
    supply_planning:"Supply", response_planning:"Response · order-based", allocation_planning:"Response",
    net_requirements_planning:"Supply", capacity_planning:"Production", production_planning:"Production", synchronized_planning:"Synchronized Planning",
    procurement_sourcing:"Procurement", logistics_transportation:"Logistics", disruption_response:"Supply · Risk",
    spares_rma_closed_loop:"Aftermarket · Spares + RMA", returns_forecasting:"Aftermarket",
    spares_planning_ibp:"Aftermarket", rma_execution:"Aftermarket · RMA",
    control_tower_alerts:"Control Tower", sustainability_planning:"Sustainability",
    ocm_change_management:"Change · OCM",
  };
  // Domain logic per use case: the method it runs, the decision it makes, and the
  // world-model formula it applies — so a catalog agent runs REAL domain steps
  // (not a generic executor). Consumed by the engine's cognitionUseCasePack.
  const USE_CASE_LOGIC = {
    statistical_forecasting:{method:"statistical forecast (ETS/ARIMA)",decision:"Publish base statistical forecast"},
    demand_sensing:{method:"short-term demand sensing",decision:"Bias near-term forecast toward live orders"},
    curve_based_forecast:{method:"curve-based lifecycle forecast",decision:"Fit lifecycle curve and project demand"},
    outlier_correction:{method:"outlier detection & cleansing",decision:"Cleanse history and re-baseline the forecast"},
    product_lifecycle_planning:{method:"phase-in / phase-out",decision:"Apply lifecycle phase to the forecast"},
    consensus_demand_sop:{method:"S&OP consensus",decision:"Reconcile to one consensus demand plan"},
    promotion_planning:{method:"promo uplift modeling",decision:"Add promotion uplift to the baseline"},
    cannibalization_analysis:{method:"cannibalization modeling",decision:"Net promo cannibalization across related SKUs"},
    forecast_accuracy_monitoring:{method:"error / bias KPI",decision:"Flag SKUs breaching MAPE / bias thresholds"},
    demand_planning:{method:"demand planning",decision:"Publish the demand plan"},
    inventory_optimization:{method:"single-echelon IO",decision:"Set safety stock & reorder point",formula:"z·σ·√LT"},
    multi_echelon_inventory:{method:"MEIO",decision:"Split safety / cycle / pipeline stock across echelons"},
    safety_stock_planning:{method:"service-level safety stock",decision:"Set safety stock for the target service level",formula:"z·σ_demand·√lead_time"},
    service_level_prediction:{method:"service-level prediction",decision:"Predict CSL by product-location"},
    demand_driven_replenishment:{method:"DDMRP",decision:"Replenish to top-of-green on a net-flow breach",formula:"buffer = ADU·LT·variability_factor"},
    mro_inventory_planning:{method:"MRO target inventory",decision:"Set target inventory position for spares"},
    excess_and_obsolescence:{method:"E&O detection",decision:"Flag excess and recommend rebalancing"},
    supply_planning:{method:"constrained supply planning",decision:"Allocate constrained supply to demand"},
    response_planning:{method:"order-based response",decision:"Confirm / re-promise orders against supply"},
    allocation_planning:{method:"allocation",decision:"Allocate constrained supply by priority"},
    net_requirements_planning:{method:"net requirements (MRP)",decision:"Compute net requirements & planned receipts",formula:"net_req = demand − projected_stock"},
    capacity_planning:{method:"capacity planning",decision:"Balance load to resource capacity"},
    production_planning:{method:"production scheduling",decision:"Schedule production within capacity"},
    synchronized_planning:{method:"synchronized (TS ↔ order)",decision:"Reconcile MPS with order-based confirmation"},
    procurement_sourcing:{method:"sourcing optimization",decision:"Award spend to best-fit suppliers"},
    logistics_transportation:{method:"transport optimization",decision:"Select carrier & flag ETA risk"},
    disruption_response:{method:"risk fusion",decision:"Detect disruption and reroute supply"},
    spares_rma_closed_loop:{method:"spares demand (install-base) + RMA triage",decision:"Forecast spares from install base & failure rate, then triage RMA: repair vs replace vs credit",formula:"install_base·failure_rate·age_factor"},
    returns_forecasting:{method:"returns modeling",decision:"Forecast returns volume & timing"},
    spares_planning_ibp:{method:"spares demand (install-base)",decision:"Forecast spares from install base & failure rate",formula:"install_base·failure_rate·age_factor"},
    rma_execution:{method:"RMA triage",decision:"Triage RMA: repair vs replace vs credit"},
    control_tower_alerts:{method:"exception monitoring",decision:"Raise prioritized exceptions & KPIs"},
    sustainability_planning:{method:"CO2 rollup",decision:"Roll up CO2 and flag high-emission plans"},
    ocm_change_management:{method:"change adoption modeling",decision:"Assess readiness and predict adoption; target the highest-risk stakeholder groups",formula:"adoption ← f(readiness, training, support, −resistance)"},
  };

  // ---- helpers -------------------------------------------------------------
  const norm = s => String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const toks = s => norm(s).split(" ").filter(Boolean);
  function jaccard(a,b){ const A=new Set(a),B=new Set(b); let i=0; A.forEach(x=>{ if(B.has(x)) i++; }); const u=A.size+B.size-i; return u? i/u : 0; }

  // ---- 3. SELF-ONBOARDING: match a column to a canonical concept -----------
  function matchColumn(name){
    const n = norm(name), nt = toks(name);
    let best=null;
    for (const c of LIBRARY){
      let sc=0, how="";
      for (const a of c.aliases){
        const an=norm(a);
        if (an===n){ sc=0.98; how="exact alias"; break; }
        if (n && (n.includes(an)||an.includes(n)) && Math.abs(an.length-n.length)<=3){ if(0.9>sc){sc=0.9; how="near alias";} }
        const j=jaccard(nt, toks(a)); if (j*0.9>sc){ sc=j*0.9; how="token match"; }
      }
      for (const s of (c.syn||[])){ const j=jaccard(nt, toks(s)); if (j*0.8>sc){ sc=j*0.8; how="synonym"; } }
      // concept-name overlap
      const j2=jaccard(nt, toks(c.c)); if (j2*0.85>sc){ sc=j2*0.85; how="concept name"; }
      if (!best || sc>best.confidence) best={ concept:c.c, domain:c.d, type:c.t, confidence:+sc.toFixed(2), method:how };
    }
    if (!best || best.confidence < 0.55) return { concept:null, confidence: best?best.confidence:0, method:"unmatched" };
    return best;
  }

  function autoOnboard(schema){
    // schema: { tables: { name: [cols...] } }  OR  [ {table,column} ]
    let cols=[];
    if (Array.isArray(schema)) cols = schema.map(r=>({table:r.table||"", column:r.column||r.col||""}));
    else if (schema && schema.tables) Object.keys(schema.tables).forEach(t=>(schema.tables[t]||[]).forEach(col=>cols.push({table:t,column:col})));
    const proposals = cols.map(cc=>{ const m=matchColumn(cc.column); return { table:cc.table, column:cc.column, ...m }; });
    const matched = proposals.filter(p=>p.concept);
    const covered = new Set(matched.map(p=>p.concept));
    const coverage = cols.length ? +(matched.length/cols.length).toFixed(2) : 0;
    // which use cases are unlocked (>=70% of their needed concepts present)
    const unlocked=[];
    Object.keys(USE_CASE_NEEDS).forEach(uc=>{
      const need=USE_CASE_NEEDS[uc]; const have=need.filter(x=>covered.has(x)).length;
      const ratio=need.length? have/need.length : 0;
      if (ratio>=0.7) unlocked.push({ useCase:uc, ratio:+ratio.toFixed(2), missing:need.filter(x=>!covered.has(x)) });
    });
    return { total:cols.length, matched:matched.length, coverage,
      concepts:[...covered], proposals, unmatched:proposals.filter(p=>!p.concept).map(p=>p.column),
      unlocked, avgConfidence: matched.length? +(matched.reduce((a,p)=>a+p.confidence,0)/matched.length).toFixed(2):0 };
  }

  // ---- learning (anonymized): add confirmed field patterns to the library --
  function applyLearned(list){   // list: [{concept, alias}]
    let added=0;
    (list||[]).forEach(({concept,alias})=>{
      const a=norm(alias); if(!a) return;
      const c=LIBRARY.find(x=>x.c===concept); if(!c) return;
      if(!c.aliases.map(norm).includes(a)){ c.aliases.push(a); added++; }
    });
    return added;
  }
  function learn(confirmed){   // confirmed: [{column, concept}] -> teach patterns
    const list=(confirmed||[]).filter(x=>x.concept).map(x=>({concept:x.concept, alias:x.column}));
    const added=applyLearned(list);
    return { added, ...libraryStats() };
  }

  // ---- CUSTOM ONTOLOGY PARAMETERS: users extend the library with their own
  // canonical concepts (not just field names for existing ones). A custom
  // concept behaves exactly like a built-in one — matchColumn, autoOnboard and
  // the engine's OntologyMapper all see it the moment it's added — but carries
  // custom:true so the UI can tell it apart and only custom ones are removable.
  const CONCEPT_KEY = s => norm(s).replace(/ /g,"_");
  function addConcept({concept, domain, type, aliases, syn}={}){
    const key = CONCEPT_KEY(concept);
    if (!key) return { ok:false, error:"concept name is required" };
    if (LIBRARY.some(c => c.c === key)) return { ok:false, error:`"${key}" already exists` };
    const aliasList = [...new Set((aliases||[]).map(a=>norm(a)).filter(Boolean))];
    if (!aliasList.includes(key)) aliasList.unshift(key);
    LIBRARY.push({ c:key, d: domain ? String(domain).trim() : "custom", t: type || "text",
      aliases: aliasList, syn: (syn||[]).map(s=>norm(s)).filter(Boolean), custom:true });
    return { ok:true, concept:key, ...libraryStats() };
  }
  function removeConcept(concept){
    const key = CONCEPT_KEY(concept);
    const i = LIBRARY.findIndex(c => c.c === key);
    if (i < 0) return { ok:false, error:"not found" };
    if (!LIBRARY[i].custom) return { ok:false, error:"built-in concepts can't be removed" };
    LIBRARY.splice(i, 1);
    return { ok:true, ...libraryStats() };
  }
  // every {system: field} mapping registered so far for one concept — the
  // "parameters" view of a concept across every connected system of record.
  function fieldsForConcept(concept){
    const out = {};
    Object.keys(SYSTEM_MAPS).forEach(sys => { const f = SYSTEM_MAPS[sys][concept]; if (f) out[sys] = f; });
    return out;
  }

  // ---- introspection -------------------------------------------------------
  function libraryStats(){
    const aliases=LIBRARY.reduce((a,c)=>a+c.aliases.length,0);
    const domains=[...new Set(LIBRARY.map(c=>c.d))];
    return { concepts:LIBRARY.length, aliases, domains:domains.length, domainList:domains,
      avgAliases:+(aliases/LIBRARY.length).toFixed(1) };
  }
  function worldModelGraph(){
    const nodes=new Set();
    WORLD_EDGES.forEach(e=>{ nodes.add(e[0]); nodes.add(e[1]); });
    return { nodes:[...nodes], edges:WORLD_EDGES.map(e=>({from:e[0],to:e[1],rel:e[2],sign:e[3]})), formulas:WORLD_FORMULAS };
  }
  function library(){ return LIBRARY.map(c=>({concept:c.c,domain:c.d,type:c.t,aliases:c.aliases.slice(),custom:!!c.custom})); }
  // Everything the Neo4j ontology store should persist: the full concept library
  // (with cross-deployment aliases) + every learned per-system mapping.
  function exportForGraph(){
    return {
      concepts: LIBRARY.map(c=>({ concept:c.c, domain:c.d, type:c.t, aliases:c.aliases.slice() })),
      systems: Object.keys(SYSTEM_MAPS).reduce((a,sys)=>{ Object.keys(SYSTEM_MAPS[sys]).forEach(concept=>
        a.push({ system:sys, concept, field:SYSTEM_MAPS[sys][concept] })); return a; }, [])
    };
  }
  function useCaseCatalog(){ return Object.keys(USE_CASE_NEEDS).map(k=>({ key:k, label:k.replace(/_/g," "),
    module:USE_CASE_MODULE[k]||"General", needs:USE_CASE_NEEDS[k] })); }
  // Full domain profile for one use case — method, decision, formula, needed concepts.
  function useCaseLogic(key){
    const needs=USE_CASE_NEEDS[key]||null; if(!needs) return null;
    const meta=USE_CASE_LOGIC[key]||{};
    return { key, label:key.replace(/_/g," "), module:USE_CASE_MODULE[key]||"General",
      needs, method:meta.method||"domain reasoning", decision:meta.decision||("Run "+key.replace(/_/g," ")),
      formula:meta.formula||null };
  }

  // ---- 4. RUN-TIME RESOLVER: learned mappings feed the live agent -----------
  // Per-system canonical map: SYSTEM_MAPS[system] = { concept: nativeField }.
  // Populated when you confirm an onboarding for a named system; consulted by the
  // engine's OntologyMapper at run time, so a freshly-onboarded system is queryable
  // the instant mapping finishes — no code change, no hardcoded field names.
  const SYSTEM_MAPS = {};
  function registerSystem(system, mappings){
    if(!system || !mappings) return 0;
    SYSTEM_MAPS[system] = Object.assign(SYSTEM_MAPS[system] || {}, mappings);
    // every confirmed field is also a library alias for its concept (compounding)
    applyLearned(Object.keys(mappings).map(concept => ({ concept, alias: mappings[concept] })));
    return Object.keys(SYSTEM_MAPS[system]).length;
  }
  function resolveField(concept, system){ return (SYSTEM_MAPS[system] || {})[concept] || null; }
  function systemMap(system){ return SYSTEM_MAPS[system] || null; }
  function systemMaps(){ return Object.keys(SYSTEM_MAPS).map(s => ({ system:s, concepts:Object.keys(SYSTEM_MAPS[s]).length })); }
  function applySystems(list){ (list||[]).forEach(r => { if(r.system && r.concept && r.field){
    SYSTEM_MAPS[r.system] = SYSTEM_MAPS[r.system] || {}; SYSTEM_MAPS[r.system][r.concept] = r.field; } }); }
  // Build a real read-only query for a system FROM canonical concepts — this is an
  // executor speaking the system's dialect without ever knowing its native names.
  function buildSelect(system, concepts, table){
    const map = SYSTEM_MAPS[system] || {};
    const cols = (concepts||[]).map(c => map[c] ? `${map[c]} AS ${c}` : null).filter(Boolean);
    if(!cols.length) return null;
    return `SELECT ${cols.join(", ")} FROM ${table || (system.toLowerCase()+"_table")} LIMIT 100;`;
  }

  const API = { LIBRARY, matchColumn, autoOnboard, learn, applyLearned, libraryStats, worldModelGraph, library,
    USE_CASE_NEEDS, USE_CASE_MODULE, USE_CASE_LOGIC, WORLD_FORMULAS, useCaseCatalog, useCaseLogic,
    registerSystem, resolveField, systemMap, systemMaps, applySystems, buildSelect, exportForGraph,
    addConcept, removeConcept, fieldsForConcept };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (root) root.COGNITION = API;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
