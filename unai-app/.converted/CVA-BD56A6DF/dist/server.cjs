var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// agents/unai/cognition.cjs
var require_cognition = __commonJS({
  "agents/unai/cognition.cjs"(exports2, module2) {
    (function(root) {
      "use strict";
      const LIBRARY = [
        { c: "sku", d: "master", t: "id", aliases: ["matnr", "sku", "sku_id", "item_code", "material", "material_number", "matkl", "prdid", "default_code", "productid", "prod_id", "item", "itemno", "part_number", "partno", "cmdb_ci"], syn: ["product", "material", "item", "part"] },
        { c: "plant", d: "master", t: "id", aliases: ["werks", "plant", "dc_code", "location", "locid", "site", "warehouse", "facility", "facilityid", "bukrs"], syn: ["site", "location", "warehouse", "dc"] },
        { c: "on_hand_qty", d: "inventory", t: "qty", aliases: ["labst", "on_hand", "qty_on_hand", "actual_qty", "quantity", "onhand", "stock", "stock_qty", "inventory_qty", "quantityonhandtotal"], syn: ["stock", "inventory", "on hand"] },
        { c: "safety_stock", d: "inventory", t: "qty", aliases: ["eisbe", "safety_stock", "safety", "ss", "buffer_stock", "safetystock"], syn: ["buffer", "safety"] },
        { c: "reorder_point", d: "inventory", t: "qty", aliases: ["minbe", "reorder_point", "rop", "reorder", "min_stock", "reorderpoint"], syn: ["reorder", "rop"] },
        { c: "open_demand", d: "demand", t: "qty", aliases: ["open_orders", "open_demand", "kwmeng", "backorder", "demand", "order_qty", "openqty"], syn: ["orders", "backorder", "demand"] },
        { c: "forecast_qty", d: "demand", t: "qty", aliases: ["fcst_qty", "forecast", "forecast_qty", "fcstqty", "predicted_demand", "fc_qty"], syn: ["forecast", "prediction"] },
        { c: "consensus_demand", d: "demand", t: "qty", aliases: ["consensus_qty", "consensus", "consensus_demand"], syn: ["consensus"] },
        { c: "forecast_accuracy", d: "demand", t: "pct", aliases: ["fcst_accuracy", "forecast_accuracy", "mape", "accuracy", "fa"], syn: ["accuracy", "mape"] },
        { c: "promo_uplift", d: "demand", t: "pct", aliases: ["promo_uplift", "promotion_lift", "uplift", "promo_lift"], syn: ["promotion", "uplift", "lift"] },
        { c: "supplier", d: "procurement", t: "id", aliases: ["lifnr", "vendor_id", "supplier", "vendor", "seller_ids", "partyid", "supplier_id"], syn: ["vendor", "seller"] },
        { c: "supplier_score", d: "procurement", t: "score", aliases: ["supplier_score", "vendor_score", "risk_score", "supplier_rating"], syn: ["rating", "risk"] },
        { c: "lead_time_days", d: "procurement", t: "days", aliases: ["plifz", "lead_time", "leadtime", "lt_days", "lead_time_days", "replenishment_time"], syn: ["lead time", "replenishment"] },
        { c: "unit_cost", d: "finance", t: "money", aliases: ["stprs", "unit_cost", "valuation_rate", "standard_price", "cost", "unitcost", "dmbtr", "price_per_unit"], syn: ["cost", "price"] },
        { c: "purchase_order", d: "procurement", t: "id", aliases: ["ebeln", "po_id", "purchase_order", "po", "po_number", "ponumber"], syn: ["po", "order"] },
        { c: "spend_amount", d: "procurement", t: "money", aliases: ["spend_amt", "spend", "spend_amount", "total_spend", "amount"], syn: ["spend", "amount"] },
        { c: "contract_id", d: "procurement", t: "id", aliases: ["konnr", "contract_id", "contract", "agreement_id"], syn: ["contract", "agreement"] },
        { c: "carrier", d: "logistics", t: "id", aliases: ["carrier", "carrier_id", "transporter", "shipper"], syn: ["shipper", "transporter"] },
        { c: "transit_days", d: "logistics", t: "days", aliases: ["transit_days", "transit_time", "in_transit_days", "shipping_days"], syn: ["transit", "shipping time"] },
        { c: "freight_cost", d: "logistics", t: "money", aliases: ["freight_cost", "freight", "shipping_cost", "transport_cost"], syn: ["freight", "shipping cost"] },
        { c: "otif", d: "logistics", t: "pct", aliases: ["otif", "otif_pct", "on_time_in_full", "service_otif"], syn: ["on time in full", "otif"] },
        { c: "in_transit_qty", d: "logistics", t: "qty", aliases: ["umlme", "in_transit", "in_transit_qty", "intransit"], syn: ["in transit"] },
        { c: "install_base_qty", d: "spares", t: "qty", aliases: ["instbase", "install_base", "installed_base", "fleet_size"], syn: ["installed base", "fleet"] },
        { c: "failure_rate", d: "spares", t: "rate", aliases: ["fail_rate", "failure_rate", "mtbf_inv", "defect_rate"], syn: ["failure", "defect"] },
        { c: "service_level", d: "spares", t: "pct", aliases: ["svclvl", "service_level", "fill_rate", "sla"], syn: ["service level", "fill rate", "sla"] },
        { c: "rma_id", d: "returns", t: "id", aliases: ["number", "rma_id", "rma", "return_id", "rma_number"], syn: ["return", "rma"] },
        { c: "warranty_status", d: "returns", t: "cat", aliases: ["u_warranty", "warranty_status", "warranty", "warranty_flag"], syn: ["warranty"] },
        { c: "claim_value", d: "returns", t: "money", aliases: ["u_claim_value", "claim_value", "claim_amount", "claim"], syn: ["claim"] },
        // ---- Reverse-logistics economics: refurb-vs-scrap, RMA disposition ----
        // (seen repeatedly across Foundry conversions of aftermarket/RMA agents —
        // promoted from "custom" to seed concepts so future conversions map them
        // by default instead of re-learning the same fields each time.)
        { c: "recoverable_units", d: "returns", t: "qty", aliases: ["recoverable_units", "recoverable_qty", "units_recovered", "recoverableunits"], syn: ["recoverable", "salvageable"] },
        { c: "scrapped_units", d: "returns", t: "qty", aliases: ["scrapped_units", "scrap_qty", "units_scrapped", "scrappedunits"], syn: ["scrap", "written off"] },
        { c: "repair_cost", d: "finance", t: "money", aliases: ["repair_cost", "repair_cost_total", "repair_cost_usd", "repaircosttotal"], syn: ["repair cost"] },
        { c: "net_savings_usd", d: "finance", t: "money", aliases: ["net_savings_usd", "net_savings", "cost_savings", "netsavingsusd"], syn: ["savings", "net savings"] },
        { c: "disposition", d: "returns", t: "cat", aliases: ["disposition", "rma_disposition", "resolution_path"], syn: ["disposition", "resolution"] },
        { c: "replenishment_triggered", d: "supply", t: "flag", aliases: ["replenishment_triggered", "reorder_triggered", "restock_flag"], syn: ["replenishment trigger"] },
        // ---- Real INPUT concepts for the 5 remaining ported NVIDIA agents
        // (demand forecast/sensing, NPI, RMA triage, orchestrator) — the
        // converter only ever sees each agent's OUTPUT fields, never its
        // params, so these exist purely so Launch app can offer real overrides.
        { c: "sales_override_units", d: "demand", t: "qty", aliases: ["sales_override_units", "sales_override"], syn: ["sales override"] },
        { c: "marketing_override_units", d: "demand", t: "qty", aliases: ["marketing_override_units", "marketing_override"], syn: ["marketing override"] },
        { c: "signal_spike_pct", d: "demand", t: "pct", aliases: ["signal_spike_pct", "spike_pct"], syn: ["signal spike"] },
        { c: "signal_volume_units", d: "demand", t: "qty", aliases: ["signal_volume_units", "signal_volume"], syn: ["signal volume"] },
        { c: "selected_primary_model", d: "demand", t: "cat", aliases: ["selected_primary_model", "primary_model"], syn: ["primary model"] },
        { c: "market_adoption_rate", d: "demand", t: "cat", aliases: ["market_adoption_rate", "adoption_rate_input"], syn: ["market adoption"] },
        { c: "kpi_breach_type", d: "controltower", t: "cat", aliases: ["kpi_breach_type", "breach_type"], syn: ["kpi breach"] },
        { c: "affected_region", d: "controltower", t: "cat", aliases: ["affected_region", "region_input"], syn: ["affected region"] },
        { c: "impacted_sku", d: "controltower", t: "id", aliases: ["impacted_sku", "impacted_sku_id"], syn: ["impacted sku"] },
        { c: "serial_number", d: "returns", t: "id", aliases: ["serial_number", "serialnumber", "sn"], syn: ["serial number"] },
        { c: "defect_description", d: "returns", t: "text", aliases: ["defect_description", "defect_desc"], syn: ["defect description"] },
        { c: "purchase_date", d: "returns", t: "date", aliases: ["purchase_date", "purchasedate"], syn: ["purchase date"] },
        { c: "product_name", d: "master", t: "cat", aliases: ["product_name", "productname"], syn: ["product name"] },
        { c: "inv_turns", d: "inventory", t: "ratio", aliases: ["inv_turns", "inventory_turns", "turnover", "turns"], syn: ["turnover", "turns"] },
        { c: "excess_qty", d: "inventory", t: "qty", aliases: ["excess_qty", "excess", "overstock", "surplus"], syn: ["excess", "overstock"] },
        { c: "allocation_qty", d: "supply", t: "qty", aliases: ["allocqty", "allocation_qty", "allocated", "allocation"], syn: ["allocation"] },
        { c: "capacity_qty", d: "supply", t: "qty", aliases: ["capqty", "capacity", "capacity_qty", "available_capacity"], syn: ["capacity"] },
        { c: "work_order", d: "production", t: "id", aliases: ["aufnr", "work_order", "wo", "production_order", "wo_id"], syn: ["work order", "production order"] },
        { c: "oee", d: "production", t: "pct", aliases: ["oee_pct", "oee", "overall_equipment_effectiveness"], syn: ["oee"] },
        { c: "customer", d: "master", t: "id", aliases: ["kunnr", "customer", "customer_id", "cust_id", "account", "buyer"], syn: ["account", "buyer", "customer"] },
        { c: "sales_qty", d: "demand", t: "qty", aliases: ["sales_qty", "units_sold", "qty_sold", "sales", "sold_qty"], syn: ["sales", "units sold"] },
        { c: "ship_date", d: "logistics", t: "date", aliases: ["ship_date", "shipped_on", "dispatch_date", "shipdate"], syn: ["ship date", "dispatch"] },
        { c: "region", d: "master", t: "cat", aliases: ["region", "geo", "territory", "market", "area"], syn: ["geo", "territory", "market"] },
        // ---- SAP IBP 2311 concepts: IO/MEIO · DDR/DDMRP · MRO · Demand · Response · Sustainability ----
        { c: "cycle_stock", d: "inventory", t: "qty", aliases: ["cycle_stock", "cyclestock", "cycle_stk"], syn: ["cycle stock"] },
        { c: "pipeline_stock", d: "inventory", t: "qty", aliases: ["pipeline_stock", "pipelinestock", "transit_stock"], syn: ["pipeline stock"] },
        { c: "target_inventory", d: "inventory", t: "qty", aliases: ["tgtpos", "target_inventory", "target_inventory_position", "target_stock_position", "tip"], syn: ["target inventory position"] },
        { c: "demand_variability", d: "demand", t: "num", aliases: ["variability", "demand_variability", "cov", "demand_cov", "std_demand"], syn: ["variability", "coefficient of variation"] },
        { c: "co2_emissions", d: "sustainability", t: "num", aliases: ["co2", "co2_emissions", "emissions", "carbon", "ghg"], syn: ["carbon", "emissions"] },
        { c: "decoupling_point", d: "ddmrp", t: "flag", aliases: ["decoupling_point", "decouple", "decoupling", "buffer_point"], syn: ["decoupling point"] },
        { c: "buffer_level", d: "ddmrp", t: "qty", aliases: ["buffer_level", "buffer", "buffer_zone", "red_zone", "yellow_zone", "green_zone", "tor", "tog"], syn: ["buffer", "buffer zone"] },
        { c: "net_flow_position", d: "ddmrp", t: "qty", aliases: ["net_flow_position", "netflow", "nfp", "net_flow"], syn: ["net flow position"] },
        { c: "average_daily_usage", d: "ddmrp", t: "rate", aliases: ["adu", "average_daily_usage", "avg_daily_usage", "daily_usage"], syn: ["adu", "average daily usage"] },
        { c: "forecast_error", d: "demand", t: "pct", aliases: ["forecast_error", "fcst_error", "mape", "wmape", "rmse"], syn: ["mape", "forecast error"] },
        { c: "forecast_bias", d: "demand", t: "pct", aliases: ["forecast_bias", "bias", "fcst_bias", "mpe"], syn: ["bias"] },
        { c: "corrected_history", d: "demand", t: "qty", aliases: ["corrected_history", "cleansed_history", "adjusted_sales", "outlier_corrected"], syn: ["cleansed history", "corrected sales"] },
        { c: "lifecycle_phase", d: "demand", t: "cat", aliases: ["lifecycle_phase", "plm_phase", "phase_in", "phase_out", "launch_flag", "discontinue_flag"], syn: ["phase-in", "phase-out", "lifecycle"] },
        { c: "confirmed_qty", d: "supply", t: "qty", aliases: ["confqty", "confirmed_qty", "confirmedqty", "conf_qty", "committed_qty"], syn: ["confirmed quantity"] },
        { c: "requested_qty", d: "supply", t: "qty", aliases: ["reqqty", "requested_qty", "requestedqty", "req_qty"], syn: ["requested quantity"] },
        { c: "projected_stock", d: "supply", t: "qty", aliases: ["projected_stock", "projected_inventory", "proj_stock", "pab", "projected_available_balance"], syn: ["projected available balance"] },
        { c: "receipt_qty", d: "supply", t: "qty", aliases: ["receipt_qty", "receipts", "planned_receipt", "inbound_qty", "grqty"], syn: ["receipts"] },
        { c: "resource_capacity", d: "production", t: "qty", aliases: ["resource_capacity", "res_capacity", "capacity_hours", "work_center_capacity"], syn: ["resource capacity"] },
        { c: "net_requirement", d: "supply", t: "qty", aliases: ["net_requirement", "net_req", "netreq", "demand_requirement"], syn: ["net requirement"] },
        { c: "yield_rate", d: "spares", t: "pct", aliases: ["yield_rate", "yield", "yield_pct", "refurb_yield"], syn: ["yield"] },
        { c: "refurb_capacity", d: "spares", t: "qty", aliases: ["refurb_capacity", "repair_capacity", "refurbishment_capacity"], syn: ["refurbishment capacity"] },
        { c: "return_qty", d: "returns", t: "qty", aliases: ["return_qty", "returns", "returned_qty", "ret_qty"], syn: ["returns quantity"] },
        { c: "mps_qty", d: "supply", t: "qty", aliases: ["mpsqty", "mps_qty", "master_production_schedule", "mps"], syn: ["master production schedule"] },
        { c: "alert_count", d: "controltower", t: "count", aliases: ["alert_count", "alerts", "exceptions", "exception_count"], syn: ["alerts", "exceptions"] },
        { c: "kpi_value", d: "controltower", t: "num", aliases: ["kpi", "kpi_value", "metric", "kpi_val"], syn: ["kpi", "metric"] },
        { c: "stakeholder_influence", d: "change", t: "score", aliases: ["influence_score", "stakeholder_influence", "influence"], syn: ["influence"] },
        { c: "stakeholder_support", d: "change", t: "score", aliases: ["support_score", "stakeholder_support", "sentiment"], syn: ["support", "sentiment"] },
        { c: "change_readiness", d: "change", t: "score", aliases: ["readiness_score", "change_readiness", "readiness"], syn: ["readiness"] },
        { c: "training_completion", d: "change", t: "pct", aliases: ["completion_pct", "training_completion", "training_progress"], syn: ["training"] },
        { c: "milestone_status", d: "change", t: "text", aliases: ["milestone_state", "milestone_status", "milestone"], syn: ["milestone"] },
        { c: "comms_coverage", d: "change", t: "text", aliases: ["comm_state", "comms_coverage", "comms_reach", "communication"], syn: ["comms", "communication"] },
        { c: "change_risk", d: "change", t: "score", aliases: ["change_risk", "resistance", "resistance_level", "risk_score"], syn: ["resistance", "risk"] },
        { c: "adoption_rate", d: "change", t: "pct", aliases: ["current_value", "adoption_rate", "adoption"], syn: ["adoption"] }
      ];
      const WORLD_EDGES = [
        ["supplier_score", "lead_time_days", "raises", "+"],
        ["lead_time_days", "safety_stock", "raises", "+"],
        ["forecast_accuracy", "safety_stock", "lowers", "-"],
        ["open_demand", "stockout_risk", "raises", "+"],
        ["on_hand_qty", "stockout_risk", "lowers", "-"],
        ["safety_stock", "stockout_risk", "lowers", "-"],
        ["promo_uplift", "consensus_demand", "raises", "+"],
        ["promo_uplift", "cannibalization", "raises", "+"],
        ["excess_qty", "inv_turns", "lowers", "-"],
        ["failure_rate", "install_base_qty", "drives_demand_via", "+"],
        ["transit_days", "otif", "lowers", "-"],
        ["freight_cost", "landed_cost", "raises", "+"],
        ["unit_cost", "landed_cost", "raises", "+"],
        // SAP IBP-grounded edges (DDMRP · MEIO · demand)
        ["average_daily_usage", "buffer_level", "raises", "+"],
        ["net_flow_position", "net_requirement", "lowers", "-"],
        ["demand_variability", "safety_stock", "raises", "+"],
        ["service_level", "safety_stock", "raises", "+"],
        ["forecast_error", "safety_stock", "raises", "+"],
        ["co2_emissions", "landed_cost", "raises", "+"],
        ["change_readiness", "adoption_rate", "raises", "+"],
        ["training_completion", "adoption_rate", "raises", "+"],
        ["stakeholder_support", "adoption_rate", "raises", "+"],
        ["change_risk", "adoption_rate", "lowers", "-"],
        ["stakeholder_influence", "change_risk", "raises", "+"]
      ];
      const WORLD_FORMULAS = [
        { name: "Safety stock", expr: "z \xB7 \u03C3_demand \xB7 \u221A(lead_time)", needs: ["lead_time_days", "forecast_accuracy"], out: "safety_stock" },
        { name: "Reorder point", expr: "demand_rate \xB7 lead_time + safety_stock", needs: ["open_demand", "lead_time_days", "safety_stock"], out: "reorder_point" },
        { name: "Spares demand", expr: "install_base \xB7 failure_rate \xB7 age_factor", needs: ["install_base_qty", "failure_rate"], out: "forecast_qty" },
        { name: "Landed cost", expr: "unit_cost + freight_cost + duty", needs: ["unit_cost", "freight_cost"], out: "landed_cost" },
        { name: "DDMRP buffer", expr: "ADU \xB7 lead_time \xB7 variability_factor", needs: ["average_daily_usage", "lead_time_days"], out: "buffer_level" },
        { name: "Net flow position", expr: "on_hand + on_order \u2212 qualified_demand", needs: ["on_hand_qty", "open_demand"], out: "net_flow_position" }
      ];
      const USE_CASE_NEEDS = {
        // ---- Demand planning ----
        statistical_forecasting: ["forecast_qty", "sales_qty", "forecast_accuracy"],
        demand_sensing: ["forecast_qty", "open_demand", "sales_qty"],
        curve_based_forecast: ["sales_qty", "forecast_qty", "lifecycle_phase"],
        outlier_correction: ["sales_qty", "corrected_history", "forecast_error"],
        product_lifecycle_planning: ["lifecycle_phase", "sku", "forecast_qty"],
        consensus_demand_sop: ["consensus_demand", "forecast_qty", "open_demand"],
        promotion_planning: ["promo_uplift", "sales_qty", "forecast_qty"],
        cannibalization_analysis: ["promo_uplift", "sales_qty", "sku"],
        forecast_accuracy_monitoring: ["forecast_accuracy", "forecast_error", "forecast_bias"],
        demand_planning: ["forecast_qty", "consensus_demand", "open_demand", "forecast_accuracy"],
        // ---- Inventory (IO / MEIO / DDR / MRO) ----
        inventory_optimization: ["on_hand_qty", "safety_stock", "reorder_point", "lead_time_days"],
        multi_echelon_inventory: ["safety_stock", "cycle_stock", "pipeline_stock", "service_level"],
        safety_stock_planning: ["safety_stock", "demand_variability", "lead_time_days", "service_level"],
        service_level_prediction: ["service_level", "on_hand_qty", "safety_stock"],
        demand_driven_replenishment: ["net_flow_position", "buffer_level", "average_daily_usage", "decoupling_point"],
        mro_inventory_planning: ["install_base_qty", "target_inventory", "service_level"],
        excess_and_obsolescence: ["excess_qty", "inv_turns", "on_hand_qty"],
        // ---- Supply / Response (order-based) / Production / Synchronized ----
        supply_planning: ["allocation_qty", "capacity_qty", "open_demand", "on_hand_qty"],
        response_planning: ["confirmed_qty", "requested_qty", "allocation_qty", "projected_stock"],
        allocation_planning: ["allocation_qty", "open_demand", "capacity_qty"],
        net_requirements_planning: ["net_requirement", "projected_stock", "receipt_qty", "open_demand"],
        capacity_planning: ["resource_capacity", "capacity_qty", "work_order"],
        production_planning: ["work_order", "capacity_qty", "oee"],
        synchronized_planning: ["mps_qty", "capacity_qty", "confirmed_qty", "projected_stock"],
        // ---- Procurement / Logistics / Risk ----
        procurement_sourcing: ["supplier", "supplier_score", "unit_cost", "purchase_order", "spend_amount"],
        logistics_transportation: ["carrier", "transit_days", "freight_cost", "otif"],
        disruption_response: ["supplier", "lead_time_days", "on_hand_qty", "open_demand"],
        // ---- Aftermarket / Service ----
        spares_rma_closed_loop: ["install_base_qty", "failure_rate", "service_level", "rma_id", "warranty_status", "claim_value"],
        returns_forecasting: ["return_qty", "failure_rate", "install_base_qty"],
        spares_planning_ibp: ["install_base_qty", "failure_rate", "service_level"],
        rma_execution: ["rma_id", "warranty_status", "claim_value"],
        // ---- Control tower / Sustainability ----
        control_tower_alerts: ["alert_count", "kpi_value", "otif"],
        sustainability_planning: ["co2_emissions", "sku", "plant"],
        // ---- Organizational Change Management (OCM) ----
        ocm_change_management: ["change_readiness", "stakeholder_influence", "training_completion", "change_risk", "adoption_rate"]
      };
      const USE_CASE_MODULE = {
        statistical_forecasting: "Demand",
        demand_sensing: "Demand",
        curve_based_forecast: "Demand",
        outlier_correction: "Demand",
        product_lifecycle_planning: "Demand",
        consensus_demand_sop: "Demand \xB7 S&OP",
        promotion_planning: "Demand",
        cannibalization_analysis: "Demand",
        forecast_accuracy_monitoring: "Demand",
        demand_planning: "Demand",
        inventory_optimization: "Inventory \xB7 IO",
        multi_echelon_inventory: "Inventory \xB7 MEIO",
        safety_stock_planning: "Inventory",
        service_level_prediction: "Inventory",
        demand_driven_replenishment: "DDR \xB7 DDMRP",
        mro_inventory_planning: "MRO",
        excess_and_obsolescence: "Inventory",
        supply_planning: "Supply",
        response_planning: "Response \xB7 order-based",
        allocation_planning: "Response",
        net_requirements_planning: "Supply",
        capacity_planning: "Production",
        production_planning: "Production",
        synchronized_planning: "Synchronized Planning",
        procurement_sourcing: "Procurement",
        logistics_transportation: "Logistics",
        disruption_response: "Supply \xB7 Risk",
        spares_rma_closed_loop: "Aftermarket \xB7 Spares + RMA",
        returns_forecasting: "Aftermarket",
        spares_planning_ibp: "Aftermarket",
        rma_execution: "Aftermarket \xB7 RMA",
        control_tower_alerts: "Control Tower",
        sustainability_planning: "Sustainability",
        ocm_change_management: "Change \xB7 OCM"
      };
      const USE_CASE_LOGIC = {
        statistical_forecasting: { method: "statistical forecast (ETS/ARIMA)", decision: "Publish base statistical forecast" },
        demand_sensing: { method: "short-term demand sensing", decision: "Bias near-term forecast toward live orders" },
        curve_based_forecast: { method: "curve-based lifecycle forecast", decision: "Fit lifecycle curve and project demand" },
        outlier_correction: { method: "outlier detection & cleansing", decision: "Cleanse history and re-baseline the forecast" },
        product_lifecycle_planning: { method: "phase-in / phase-out", decision: "Apply lifecycle phase to the forecast" },
        consensus_demand_sop: { method: "S&OP consensus", decision: "Reconcile to one consensus demand plan" },
        promotion_planning: { method: "promo uplift modeling", decision: "Add promotion uplift to the baseline" },
        cannibalization_analysis: { method: "cannibalization modeling", decision: "Net promo cannibalization across related SKUs" },
        forecast_accuracy_monitoring: { method: "error / bias KPI", decision: "Flag SKUs breaching MAPE / bias thresholds" },
        demand_planning: { method: "demand planning", decision: "Publish the demand plan" },
        inventory_optimization: { method: "single-echelon IO", decision: "Set safety stock & reorder point", formula: "z\xB7\u03C3\xB7\u221ALT" },
        multi_echelon_inventory: { method: "MEIO", decision: "Split safety / cycle / pipeline stock across echelons" },
        safety_stock_planning: { method: "service-level safety stock", decision: "Set safety stock for the target service level", formula: "z\xB7\u03C3_demand\xB7\u221Alead_time" },
        service_level_prediction: { method: "service-level prediction", decision: "Predict CSL by product-location" },
        demand_driven_replenishment: { method: "DDMRP", decision: "Replenish to top-of-green on a net-flow breach", formula: "buffer = ADU\xB7LT\xB7variability_factor" },
        mro_inventory_planning: { method: "MRO target inventory", decision: "Set target inventory position for spares" },
        excess_and_obsolescence: { method: "E&O detection", decision: "Flag excess and recommend rebalancing" },
        supply_planning: { method: "constrained supply planning", decision: "Allocate constrained supply to demand" },
        response_planning: { method: "order-based response", decision: "Confirm / re-promise orders against supply" },
        allocation_planning: { method: "allocation", decision: "Allocate constrained supply by priority" },
        net_requirements_planning: { method: "net requirements (MRP)", decision: "Compute net requirements & planned receipts", formula: "net_req = demand \u2212 projected_stock" },
        capacity_planning: { method: "capacity planning", decision: "Balance load to resource capacity" },
        production_planning: { method: "production scheduling", decision: "Schedule production within capacity" },
        synchronized_planning: { method: "synchronized (TS \u2194 order)", decision: "Reconcile MPS with order-based confirmation" },
        procurement_sourcing: { method: "sourcing optimization", decision: "Award spend to best-fit suppliers" },
        logistics_transportation: { method: "transport optimization", decision: "Select carrier & flag ETA risk" },
        disruption_response: { method: "risk fusion", decision: "Detect disruption and reroute supply" },
        spares_rma_closed_loop: { method: "spares demand (install-base) + RMA triage", decision: "Forecast spares from install base & failure rate, then triage RMA: repair vs replace vs credit", formula: "install_base\xB7failure_rate\xB7age_factor" },
        returns_forecasting: { method: "returns modeling", decision: "Forecast returns volume & timing" },
        spares_planning_ibp: { method: "spares demand (install-base)", decision: "Forecast spares from install base & failure rate", formula: "install_base\xB7failure_rate\xB7age_factor" },
        rma_execution: { method: "RMA triage", decision: "Triage RMA: repair vs replace vs credit" },
        control_tower_alerts: { method: "exception monitoring", decision: "Raise prioritized exceptions & KPIs" },
        sustainability_planning: { method: "CO2 rollup", decision: "Roll up CO2 and flag high-emission plans" },
        ocm_change_management: { method: "change adoption modeling", decision: "Assess readiness and predict adoption; target the highest-risk stakeholder groups", formula: "adoption \u2190 f(readiness, training, support, \u2212resistance)" }
      };
      const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const toks = (s) => norm(s).split(" ").filter(Boolean);
      function jaccard(a, b) {
        const A = new Set(a), B = new Set(b);
        let i = 0;
        A.forEach((x) => {
          if (B.has(x)) i++;
        });
        const u = A.size + B.size - i;
        return u ? i / u : 0;
      }
      function matchColumn(name) {
        const n = norm(name), nt = toks(name);
        let best = null;
        for (const c of LIBRARY) {
          let sc = 0, how = "";
          for (const a of c.aliases) {
            const an = norm(a);
            if (an === n) {
              sc = 0.98;
              how = "exact alias";
              break;
            }
            if (n && (n.includes(an) || an.includes(n)) && Math.abs(an.length - n.length) <= 3) {
              if (0.9 > sc) {
                sc = 0.9;
                how = "near alias";
              }
            }
            const j = jaccard(nt, toks(a));
            if (j * 0.9 > sc) {
              sc = j * 0.9;
              how = "token match";
            }
          }
          for (const s of c.syn || []) {
            const j = jaccard(nt, toks(s));
            if (j * 0.8 > sc) {
              sc = j * 0.8;
              how = "synonym";
            }
          }
          const j2 = jaccard(nt, toks(c.c));
          if (j2 * 0.85 > sc) {
            sc = j2 * 0.85;
            how = "concept name";
          }
          if (!best || sc > best.confidence) best = { concept: c.c, domain: c.d, type: c.t, confidence: +sc.toFixed(2), method: how };
        }
        if (!best || best.confidence < 0.55) return { concept: null, confidence: best ? best.confidence : 0, method: "unmatched" };
        return best;
      }
      function autoOnboard(schema) {
        let cols = [];
        if (Array.isArray(schema)) cols = schema.map((r) => ({ table: r.table || "", column: r.column || r.col || "" }));
        else if (schema && schema.tables) Object.keys(schema.tables).forEach((t) => (schema.tables[t] || []).forEach((col) => cols.push({ table: t, column: col })));
        const proposals = cols.map((cc) => {
          const m = matchColumn(cc.column);
          return { table: cc.table, column: cc.column, ...m };
        });
        const matched = proposals.filter((p) => p.concept);
        const covered = new Set(matched.map((p) => p.concept));
        const coverage = cols.length ? +(matched.length / cols.length).toFixed(2) : 0;
        const unlocked = [];
        Object.keys(USE_CASE_NEEDS).forEach((uc) => {
          const need = USE_CASE_NEEDS[uc];
          const have = need.filter((x) => covered.has(x)).length;
          const ratio = need.length ? have / need.length : 0;
          if (ratio >= 0.7) unlocked.push({ useCase: uc, ratio: +ratio.toFixed(2), missing: need.filter((x) => !covered.has(x)) });
        });
        return {
          total: cols.length,
          matched: matched.length,
          coverage,
          concepts: [...covered],
          proposals,
          unmatched: proposals.filter((p) => !p.concept).map((p) => p.column),
          unlocked,
          avgConfidence: matched.length ? +(matched.reduce((a, p) => a + p.confidence, 0) / matched.length).toFixed(2) : 0
        };
      }
      function applyLearned(list) {
        let added = 0;
        (list || []).forEach(({ concept, alias }) => {
          const a = norm(alias);
          if (!a) return;
          const c = LIBRARY.find((x) => x.c === concept);
          if (!c) return;
          if (!c.aliases.map(norm).includes(a)) {
            c.aliases.push(a);
            added++;
          }
        });
        return added;
      }
      function learn(confirmed) {
        const list = (confirmed || []).filter((x) => x.concept).map((x) => ({ concept: x.concept, alias: x.column }));
        const added = applyLearned(list);
        return { added, ...libraryStats() };
      }
      const CONCEPT_KEY = (s) => norm(s).replace(/ /g, "_");
      function addConcept({ concept, domain, type, aliases, syn } = {}) {
        const key = CONCEPT_KEY(concept);
        if (!key) return { ok: false, error: "concept name is required" };
        if (LIBRARY.some((c) => c.c === key)) return { ok: false, error: `"${key}" already exists` };
        const aliasList = [...new Set((aliases || []).map((a) => norm(a)).filter(Boolean))];
        if (!aliasList.includes(key)) aliasList.unshift(key);
        LIBRARY.push({
          c: key,
          d: domain ? String(domain).trim() : "custom",
          t: type || "text",
          aliases: aliasList,
          syn: (syn || []).map((s) => norm(s)).filter(Boolean),
          custom: true
        });
        return { ok: true, concept: key, ...libraryStats() };
      }
      function removeConcept(concept) {
        const key = CONCEPT_KEY(concept);
        const i = LIBRARY.findIndex((c) => c.c === key);
        if (i < 0) return { ok: false, error: "not found" };
        if (!LIBRARY[i].custom) return { ok: false, error: "built-in concepts can't be removed" };
        LIBRARY.splice(i, 1);
        return { ok: true, ...libraryStats() };
      }
      function fieldsForConcept(concept) {
        const out = {};
        Object.keys(SYSTEM_MAPS).forEach((sys) => {
          const f = SYSTEM_MAPS[sys][concept];
          if (f) out[sys] = f;
        });
        return out;
      }
      function libraryStats() {
        const aliases = LIBRARY.reduce((a, c) => a + c.aliases.length, 0);
        const domains = [...new Set(LIBRARY.map((c) => c.d))];
        return {
          concepts: LIBRARY.length,
          aliases,
          domains: domains.length,
          domainList: domains,
          avgAliases: +(aliases / LIBRARY.length).toFixed(1)
        };
      }
      function worldModelGraph() {
        const nodes = /* @__PURE__ */ new Set();
        WORLD_EDGES.forEach((e) => {
          nodes.add(e[0]);
          nodes.add(e[1]);
        });
        return { nodes: [...nodes], edges: WORLD_EDGES.map((e) => ({ from: e[0], to: e[1], rel: e[2], sign: e[3] })), formulas: WORLD_FORMULAS };
      }
      function library() {
        return LIBRARY.map((c) => ({ concept: c.c, domain: c.d, type: c.t, aliases: c.aliases.slice(), custom: !!c.custom }));
      }
      function exportForGraph() {
        return {
          concepts: LIBRARY.map((c) => ({ concept: c.c, domain: c.d, type: c.t, aliases: c.aliases.slice() })),
          systems: Object.keys(SYSTEM_MAPS).reduce((a, sys) => {
            Object.keys(SYSTEM_MAPS[sys]).forEach((concept) => a.push({ system: sys, concept, field: SYSTEM_MAPS[sys][concept] }));
            return a;
          }, [])
        };
      }
      function useCaseCatalog() {
        return Object.keys(USE_CASE_NEEDS).map((k) => ({
          key: k,
          label: k.replace(/_/g, " "),
          module: USE_CASE_MODULE[k] || "General",
          needs: USE_CASE_NEEDS[k]
        }));
      }
      function useCaseLogic(key) {
        const needs = USE_CASE_NEEDS[key] || null;
        if (!needs) return null;
        const meta = USE_CASE_LOGIC[key] || {};
        return {
          key,
          label: key.replace(/_/g, " "),
          module: USE_CASE_MODULE[key] || "General",
          needs,
          method: meta.method || "domain reasoning",
          decision: meta.decision || "Run " + key.replace(/_/g, " "),
          formula: meta.formula || null
        };
      }
      const SYSTEM_MAPS = {};
      function registerSystem(system, mappings) {
        if (!system || !mappings) return 0;
        SYSTEM_MAPS[system] = Object.assign(SYSTEM_MAPS[system] || {}, mappings);
        applyLearned(Object.keys(mappings).map((concept) => ({ concept, alias: mappings[concept] })));
        return Object.keys(SYSTEM_MAPS[system]).length;
      }
      function resolveField(concept, system) {
        return (SYSTEM_MAPS[system] || {})[concept] || null;
      }
      function systemMap(system) {
        return SYSTEM_MAPS[system] || null;
      }
      function systemMaps() {
        return Object.keys(SYSTEM_MAPS).map((s) => ({ system: s, concepts: Object.keys(SYSTEM_MAPS[s]).length }));
      }
      function applySystems(list) {
        (list || []).forEach((r) => {
          if (r.system && r.concept && r.field) {
            SYSTEM_MAPS[r.system] = SYSTEM_MAPS[r.system] || {};
            SYSTEM_MAPS[r.system][r.concept] = r.field;
          }
        });
      }
      function buildSelect(system, concepts, table) {
        const map = SYSTEM_MAPS[system] || {};
        const cols = (concepts || []).map((c) => map[c] ? `${map[c]} AS ${c}` : null).filter(Boolean);
        if (!cols.length) return null;
        return `SELECT ${cols.join(", ")} FROM ${table || system.toLowerCase() + "_table"} LIMIT 100;`;
      }
      const API = {
        LIBRARY,
        matchColumn,
        autoOnboard,
        learn,
        applyLearned,
        libraryStats,
        worldModelGraph,
        library,
        USE_CASE_NEEDS,
        USE_CASE_MODULE,
        USE_CASE_LOGIC,
        WORLD_FORMULAS,
        useCaseCatalog,
        useCaseLogic,
        registerSystem,
        resolveField,
        systemMap,
        systemMaps,
        applySystems,
        buildSelect,
        exportForGraph,
        addConcept,
        removeConcept,
        fieldsForConcept
      };
      if (typeof module2 !== "undefined" && module2.exports) module2.exports = API;
      if (root) root.COGNITION = API;
    })(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : exports2);
  }
});

// agents/unai/engine.cjs
var require_engine = __commonJS({
  "agents/unai/engine.cjs"(exports2, module2) {
    var NOW = typeof performance !== "undefined" && performance.now ? () => performance.now() : () => Date.now();
    var _encode = null;
    try {
      _encode = require("gpt-tokenizer").encode;
    } catch (_e) {
    }
    var realTok = (v) => {
      const s = typeof v === "string" ? v : JSON.stringify(v ?? "");
      return _encode ? _encode(s).length : Math.ceil(s.length / 4);
    };
    var ONTOLOGY = {
      // canonical concept  ->  native field name in each system of record
      // (new systems — SAP_IBP planning, SAP_S4 execution, SERVICENOW RMA/ITSM —
      //  carry their OWN dialects too, so the spares & RMA flows exercise the same
      //  "map once, switch for free" mechanism the disruption flow does.)
      sku: { SAP_MM: "MATNR", SAP_SD: "MATNR", SAP_FI: "MATKL", ANALYTICS: "sku_id", SAP_IBP: "PRDID", SAP_S4: "MATNR", SERVICENOW: "cmdb_ci" },
      plant: { SAP_MM: "WERKS", SAP_SD: "WERKS", SAP_FI: "BUKRS", ANALYTICS: "dc_code", SAP_IBP: "LOCID", SAP_S4: "WERKS" },
      on_hand_qty: { SAP_MM: "LABST", SAP_SD: "KWMENG", SAP_FI: null, ANALYTICS: "qty_on_hand", SAP_S4: "LABST" },
      safety_stock: { SAP_MM: "EISBE", SAP_SD: null, SAP_FI: null, ANALYTICS: "safety_stock", SAP_IBP: "SAFETY", SAP_S4: "EISBE" },
      reorder_point: { SAP_MM: "MINBE", SAP_SD: null, SAP_FI: null, ANALYTICS: "reorder_point" },
      open_demand: { SAP_MM: null, SAP_SD: "KWMENG", SAP_FI: null, ANALYTICS: "open_orders" },
      forecast_qty: { SAP_MM: null, SAP_SD: null, SAP_FI: null, ANALYTICS: "fcst_qty", SAP_IBP: "FCSTQTY" },
      supplier: { SAP_MM: "LIFNR", SAP_SD: null, SAP_FI: "LIFNR", ANALYTICS: "vendor_id" },
      lead_time_days: { SAP_MM: "PLIFZ", SAP_SD: null, SAP_FI: null, ANALYTICS: "lead_time", SAP_IBP: "LEADTIME" },
      unit_cost: { SAP_MM: "STPRS", SAP_SD: null, SAP_FI: "DMBTR", ANALYTICS: "unit_cost", SAP_S4: "STPRS" },
      purchase_order: { SAP_MM: "EBELN", SAP_SD: null, SAP_FI: "EBELN", ANALYTICS: "po_id", SAP_S4: "EBELN" },
      // ---- Spares-planning (IBP) concepts ----
      install_base_qty: { SAP_IBP: "INSTBASE", ANALYTICS: "install_base" },
      asset_age_months: { SAP_IBP: "AGEMNTH" },
      failure_rate: { ANALYTICS: "fail_rate" },
      age_factor: { ANALYTICS: "age_factor" },
      demand_variability: { ANALYTICS: "variability" },
      return_prob: { ANALYTICS: "return_prob" },
      return_lag_days: { ANALYTICS: "return_lag_days" },
      yield_rate: { ANALYTICS: "yield_rate" },
      target_stock: { SAP_IBP: "TGTPOS" },
      service_level: { SAP_IBP: "SVCLVL" },
      in_transit_qty: { SAP_S4: "UMLME", ANALYTICS: "in_transit" },
      refurb_capacity: { SAP_S4: "CAPACITY" },
      refurb_cost: { SAP_S4: "COSTPU" },
      // ---- RMA / reverse-logistics concepts (ServiceNow + S/4) ----
      rma_id: { SERVICENOW: "number" },
      rma_status: { SERVICENOW: "u_status" },
      warranty_status: { SERVICENOW: "u_warranty" },
      claim_value: { SERVICENOW: "u_claim_value" },
      entitlement: { SERVICENOW: "u_entitled" },
      oem: { SERVICENOW: "u_oem" },
      // ---- Refurb-vs-scrap economics (real formula in TOOL_PACKS.recoverable_units) ----
      field_returns_count: { ANALYTICS: "field_returns_count" },
      recovery_rate_pct: { ANALYTICS: "recovery_rate_pct" },
      new_supply_cost_usd: { ANALYTICS: "new_supply_cost_usd" },
      unit_repair_cost_usd: { ANALYTICS: "unit_repair_cost_usd" },
      recoverable_units: { ANALYTICS: "recoverable_units" },
      scrapped_units: { ANALYTICS: "scrapped_units" },
      repair_cost_total: { ANALYTICS: "repair_cost_total" },
      net_savings_usd: { ANALYTICS: "net_savings_usd" },
      disposition: { SERVICENOW: "u_disposition", ANALYTICS: "disposition" },
      replenishment_triggered: { ANALYTICS: "replenishment_triggered" },
      // ---- Real inputs for the other 5 ported NVIDIA agents ----
      sales_override_units: { ANALYTICS: "sales_override_units" },
      marketing_override_units: { ANALYTICS: "marketing_override_units" },
      signal_spike_pct: { ANALYTICS: "signal_spike_pct" },
      signal_volume_units: { ANALYTICS: "signal_volume_units" },
      selected_primary_model: { ANALYTICS: "selected_primary_model" },
      market_adoption_rate: { ANALYTICS: "market_adoption_rate" },
      kpi_breach_type: { ANALYTICS: "kpi_breach_type" },
      affected_region: { ANALYTICS: "affected_region" },
      impacted_sku: { ANALYTICS: "impacted_sku" },
      serial_number: { SERVICENOW: "serial_number", ANALYTICS: "serial_number" },
      defect_description: { SERVICENOW: "defect_description", ANALYTICS: "defect_description" },
      purchase_date: { SERVICENOW: "purchase_date", ANALYTICS: "purchase_date" },
      product_name: { ANALYTICS: "product_name" },
      // ---- Demand / Supply / Inventory planning concepts ----
      consensus_demand: { ANALYTICS: "consensus_qty", SAP_IBP: "CONSENSUS" },
      forecast_accuracy: { ANALYTICS: "fcst_accuracy" },
      promo_uplift: { ANALYTICS: "promo_uplift" },
      inv_turns: { ANALYTICS: "inv_turns" },
      excess_qty: { ANALYTICS: "excess_qty", SAP_S4: "EXCESS" },
      capacity_qty: { SAP_IBP: "CAPQTY", SAP_S4: "CAPQTY" },
      mps_qty: { SAP_IBP: "MPSQTY" },
      allocation_qty: { SAP_IBP: "ALLOCQTY" },
      // ---- Procurement / Logistics / Production concepts ----
      spend_amount: { ANALYTICS: "spend_amt" },
      supplier_score: { ANALYTICS: "supplier_score" },
      contract_id: { SAP_MM: "KONNR" },
      carrier: { ANALYTICS: "carrier", SAP_S4: "CARRIER" },
      transit_days: { ANALYTICS: "transit_days" },
      freight_cost: { ANALYTICS: "freight_cost" },
      otif: { ANALYTICS: "otif_pct" },
      work_order: { SAP_S4: "AUFNR" },
      run_rate: { SAP_S4: "RUNRATE" },
      oee: { ANALYTICS: "oee_pct" },
      // ---- OCM Change Management (ServiceNow change SoR + analytics) ----
      stakeholder_influence: { SERVICENOW: "influence_score", ANALYTICS: "influence_score" },
      stakeholder_support: { SERVICENOW: "support_score", ANALYTICS: "support_score" },
      change_readiness: { SERVICENOW: "readiness_score", ANALYTICS: "readiness_score" },
      training_completion: { SERVICENOW: "completion_pct", ANALYTICS: "completion_pct" },
      milestone_status: { SERVICENOW: "milestone_state" },
      comms_coverage: { SERVICENOW: "comm_state" },
      adoption_rate: { SERVICENOW: "current_value", ANALYTICS: "current_value" }
    };
    var MODEL_PRICING = [
      { name: "Mistral Small", in: 0.2, out: 0.6 },
      { name: "Gemini 1.5 Pro", in: 1.25, out: 5 },
      { name: "GPT-4o", in: 2.5, out: 10 },
      { name: "Claude Sonnet", in: 3, out: 15 },
      { name: "Claude Opus", in: 5, out: 25 }
    ];
    var DEPLOY_PLATFORMS = [
      { id: "sap", name: "SAP IBP / S4", kind: "native", note: "Native SAP dialect is mapped in the ontology today (MM/SD/FI/IBP/S4)." },
      { id: "kinaxis", name: "Kinaxis Maestro", kind: "planning", note: "Planning platform \u2014 same ontology, swap the read adapter. No concept re-mapping." },
      { id: "blue_yonder", name: "Blue Yonder", kind: "planning", note: "Planning platform \u2014 same ontology, swap the read adapter. No concept re-mapping." },
      { id: "o9", name: "o9 Solutions", kind: "planning", note: "Planning platform \u2014 same ontology, swap the read adapter. No concept re-mapping." }
    ];
    function ontologyGraph(ont = ONTOLOGY) {
      const systems = /* @__PURE__ */ new Set(), nodes = [], edges = [];
      for (const concept in ont) {
        const m = ont[concept];
        let degree = 0;
        for (const sys in m) {
          if (m[sys] == null) continue;
          systems.add(sys);
          degree++;
          edges.push({ source: concept, target: sys, field: m[sys], type: "mappedTo" });
        }
        nodes.push({ id: concept, type: "concept", degree });
      }
      [...systems].sort().forEach((s) => nodes.push({ id: s, type: "system", degree: edges.filter((e) => e.target === s).length }));
      return { nodes, edges, systems: [...systems].sort() };
    }
    function specialistRegistry(cases) {
      cases = cases || (typeof USE_CASES !== "undefined" ? USE_CASES : {});
      const seen = {};
      for (const key in cases) {
        for (const step of cases[key].plan) {
          const id = step.capability;
          if (!seen[id]) {
            seen[id] = {
              name: id,
              displayName: step.agentEquiv,
              systems: [...step.systems],
              useCases: [cases[key].name],
              input_contract: `canonical context envelope (ontology-mapped: ${step.systems.join(", ")})`,
              output_contract: "evidence object { decision, confidence, attribution, uncertainty, gate }",
              version: "1.0.0",
              status: "active",
              stateless: true
            };
          } else {
            step.systems.forEach((s) => {
              if (!seen[id].systems.includes(s)) seen[id].systems.push(s);
            });
            if (!seen[id].useCases.includes(cases[key].name)) seen[id].useCases.push(cases[key].name);
          }
        }
      }
      return Object.values(seen);
    }
    var OntologyMapper = class {
      constructor(ontology) {
        this.ontology = ontology;
        this.translations = 0;
      }
      // native record (system dialect) -> canonical record (shared language)
      toCanonical(system, nativeRecord) {
        const out = {};
        for (const concept in this.ontology) {
          const field = this.ontology[concept][system];
          if (field && field in nativeRecord) {
            out[concept] = nativeRecord[field];
            this.translations++;
          }
        }
        const cog = typeof COGNITION !== "undefined" ? COGNITION : null;
        if (cog && cog.systemMap) {
          const lm = cog.systemMap(system) || {};
          for (const concept in lm) {
            const field = lm[concept];
            if (field && field in nativeRecord) {
              out[concept] = nativeRecord[field];
              this.translations++;
            }
          }
        }
        out._system = system;
        return out;
      }
      // canonical concept -> native field name for a given system.
      // Cognition-Layer learned mapping takes precedence over the built-in ontology.
      fieldFor(system, concept) {
        const cog = typeof COGNITION !== "undefined" ? COGNITION : null;
        const learned = cog && cog.resolveField ? cog.resolveField(concept, system) : null;
        if (learned) return learned;
        const m = this.ontology[concept];
        return m ? m[system] : null;
      }
    };
    var SystemAdapter = class {
      constructor(id, label) {
        this.id = id;
        this.label = label;
        this.calls = 0;
      }
      query() {
        throw new Error("not implemented");
      }
      write() {
        throw new Error("not implemented");
      }
    };
    var SAP_MM_Adapter = class extends SystemAdapter {
      constructor() {
        super("SAP_MM", "SAP S/4HANA \xB7 MM (Inventory)");
        this.db = {
          MARD: [
            // stock per material/plant, NATIVE field names
            { MATNR: "FG-1001", WERKS: "DC-EAST", LABST: 540, EISBE: 600, MINBE: 900, PLIFZ: 21, STPRS: 42.5, LIFNR: "V-2207" },
            { MATNR: "FG-1002", WERKS: "DC-EAST", LABST: 1180, EISBE: 400, MINBE: 700, PLIFZ: 14, STPRS: 18, LIFNR: "V-2207" },
            { MATNR: "FG-1003", WERKS: "DC-WEST", LABST: 220, EISBE: 300, MINBE: 500, PLIFZ: 28, STPRS: 96, LIFNR: "V-3310" }
          ]
        };
      }
      query(entity, filter = {}) {
        this.calls++;
        const rows = this.db[entity] || [];
        return rows.filter((r) => Object.keys(filter).every((k) => r[k] === filter[k]));
      }
      write(entity, payload) {
        this.calls++;
        if (entity === "PO_CREATE") return { EBELN: "45" + Math.floor(Math.random() * 1e6), status: "CREATED", payload };
        if (entity === "SAFETY_STOCK_UPDATE") {
          const row = (this.db.MARD || []).find((r) => r.MATNR === payload.MATNR && r.WERKS === payload.WERKS);
          if (row) row.EISBE = payload.EISBE;
          return { MATNR: payload.MATNR, EISBE: payload.EISBE, status: "UPDATED" };
        }
        return { status: "OK" };
      }
    };
    var SAP_SD_Adapter = class extends SystemAdapter {
      constructor() {
        super("SAP_SD", "SAP S/4HANA \xB7 SD (Demand)");
        this.db = {
          VBAP: [
            { MATNR: "FG-1001", WERKS: "DC-EAST", KWMENG: 1300 },
            { MATNR: "FG-1002", WERKS: "DC-EAST", KWMENG: 420 },
            { MATNR: "FG-1003", WERKS: "DC-WEST", KWMENG: 610 }
          ]
        };
      }
      query(entity, filter = {}) {
        this.calls++;
        const rows = this.db[entity] || [];
        return rows.filter((r) => Object.keys(filter).every((k) => r[k] === filter[k]));
      }
      write() {
        this.calls++;
        return { status: "OK" };
      }
    };
    var SAP_FI_Adapter = class extends SystemAdapter {
      constructor() {
        super("SAP_FI", "SAP S/4HANA \xB7 FI (Finance)");
        this.db = {
          BSEG: [
            { LIFNR: "V-2207", DMBTR: 42.5, EBELN: "4500001" },
            { LIFNR: "V-3310", DMBTR: 96, EBELN: "4500002" }
          ]
        };
      }
      query(entity, filter = {}) {
        this.calls++;
        const rows = this.db[entity] || [];
        return rows.filter((r) => Object.keys(filter).every((k) => r[k] === filter[k]));
      }
      write() {
        this.calls++;
        return { status: "OK" };
      }
    };
    var Analytics_Adapter = class extends SystemAdapter {
      constructor() {
        super("ANALYTICS", "Analytics store (forecast/signals)");
        this.db = {
          forecast: [
            { sku_id: "FG-1001", dc_code: "DC-EAST", fcst_qty: 1450, lead_time: 21 },
            { sku_id: "FG-1002", dc_code: "DC-EAST", fcst_qty: 380, lead_time: 14 },
            { sku_id: "FG-1003", dc_code: "DC-WEST", fcst_qty: 720, lead_time: 28 }
          ],
          supplier_risk: [
            { vendor_id: "V-2207", risk: 0.78, region: "APAC", note: "Port strike \u2014 APAC lanes" },
            { vendor_id: "V-3310", risk: 0.2, region: "EU", note: "Nominal" }
          ],
          // --- BQML-style spares feature tables (failure, forecast, returns) ---
          failure_model: [
            // Weibull/survival hazard outputs per SKU
            { sku_id: "GPU-H100", dc_code: "DC-EAST", fail_rate: 0.042, age_factor: 1.35, install_base: 12e3 },
            { sku_id: "SSD-3840", dc_code: "DC-EAST", fail_rate: 0.018, age_factor: 1.1, install_base: 48e3 },
            { sku_id: "PSU-2200", dc_code: "DC-WEST", fail_rate: 0.067, age_factor: 1.6, install_base: 9e3 }
          ],
          spares_forecast: [
            // Croston/SBA intermittent-demand outputs + variability
            { sku_id: "GPU-H100", dc_code: "DC-EAST", fcst_qty: 505, variability: 0.28 },
            { sku_id: "SSD-3840", dc_code: "DC-EAST", fcst_qty: 864, variability: 0.19 },
            { sku_id: "PSU-2200", dc_code: "DC-WEST", fcst_qty: 603, variability: 0.41 }
          ],
          returns_model: [
            // survival/regression on return probability + lag + yield
            { sku_id: "GPU-H100", return_prob: 0.62, return_lag_days: 34, yield_rate: 0.78 },
            { sku_id: "SSD-3840", return_prob: 0.4, return_lag_days: 21, yield_rate: 0.91 },
            { sku_id: "PSU-2200", return_prob: 0.55, return_lag_days: 28, yield_rate: 0.66 }
          ],
          demand_plan: [
            // consensus demand + promo uplift + forecast accuracy
            { sku_id: "FG-1001", dc_code: "DC-EAST", consensus_qty: 1500, promo_uplift: 0.18, fcst_accuracy: 0.86 },
            { sku_id: "FG-1002", dc_code: "DC-EAST", consensus_qty: 400, promo_uplift: 0.05, fcst_accuracy: 0.78 },
            { sku_id: "FG-1003", dc_code: "DC-WEST", consensus_qty: 900, promo_uplift: 0.22, fcst_accuracy: 0.71 }
          ],
          inv_health: [
            // turns + excess/obsolete
            { sku_id: "FG-1001", dc_code: "DC-EAST", inv_turns: 8.2, excess_qty: 0 },
            { sku_id: "FG-1002", dc_code: "DC-EAST", inv_turns: 3.1, excess_qty: 480 },
            { sku_id: "FG-1003", dc_code: "DC-WEST", inv_turns: 5.4, excess_qty: 60 }
          ],
          procurement: [
            // spend + supplier scorecard
            { sku_id: "FG-1001", vendor_id: "V-2207", spend_amt: 544e3, supplier_score: 0.82 },
            { sku_id: "FG-1003", vendor_id: "V-3310", spend_amt: 211200, supplier_score: 0.91 }
          ],
          logistics: [
            // carrier · transit · freight · OTIF
            { sku_id: "FG-1001", carrier: "Maersk", transit_days: 12, freight_cost: 4200, otif_pct: 0.94 },
            { sku_id: "FG-1003", carrier: "DHL", transit_days: 5, freight_cost: 1800, otif_pct: 0.88 }
          ],
          production: [
            // OEE by line
            { sku_id: "FG-1001", dc_code: "DC-EAST", oee_pct: 0.79 },
            { sku_id: "FG-1003", dc_code: "DC-WEST", oee_pct: 0.85 }
          ]
        };
      }
      query(entity, filter = {}) {
        this.calls++;
        const rows = this.db[entity] || [];
        return rows.filter((r) => Object.keys(filter).every((k) => r[k] === filter[k]));
      }
      write() {
        this.calls++;
        return { status: "OK" };
      }
    };
    var SAP_IBP_Adapter = class extends SystemAdapter {
      constructor() {
        super("SAP_IBP", "SAP IBP (Spares Planning)");
        this.db = {
          install_base: [
            // native IBP key-figure dialect
            { PRDID: "GPU-H100", LOCID: "DC-EAST", INSTBASE: 12e3, AGEMNTH: 26, LEADTIME: 35 },
            { PRDID: "SSD-3840", LOCID: "DC-EAST", INSTBASE: 48e3, AGEMNTH: 14, LEADTIME: 18 },
            { PRDID: "PSU-2200", LOCID: "DC-WEST", INSTBASE: 9e3, AGEMNTH: 31, LEADTIME: 28 }
          ],
          inv_target: [
            { PRDID: "GPU-H100", LOCID: "DC-EAST", TGTPOS: 720, SAFETY: 240, SVCLVL: 0.98, FCSTQTY: 505 },
            { PRDID: "SSD-3840", LOCID: "DC-EAST", TGTPOS: 1100, SAFETY: 300, SVCLVL: 0.97, FCSTQTY: 864 },
            { PRDID: "PSU-2200", LOCID: "DC-WEST", TGTPOS: 820, SAFETY: 280, SVCLVL: 0.99, FCSTQTY: 603 }
          ],
          demand_plan: [
            // IBP demand key figures
            { PRDID: "FG-1001", LOCID: "DC-EAST", CONSENSUS: 1500, FCSTQTY: 1450 },
            { PRDID: "FG-1003", LOCID: "DC-WEST", CONSENSUS: 900, FCSTQTY: 720 }
          ],
          supply_plan: [
            // IBP supply / S&OP key figures
            { PRDID: "FG-1001", LOCID: "DC-EAST", CAPQTY: 1600, MPSQTY: 1500, ALLOCQTY: 1450 },
            { PRDID: "FG-1003", LOCID: "DC-WEST", CAPQTY: 850, MPSQTY: 820, ALLOCQTY: 800 }
          ]
        };
      }
      query(entity, filter = {}) {
        this.calls++;
        const rows = this.db[entity] || [];
        return rows.filter((r) => Object.keys(filter).every((k) => r[k] === filter[k]));
      }
      write() {
        this.calls++;
        return { status: "OK" };
      }
    };
    var SAP_S4_Adapter = class extends SystemAdapter {
      constructor() {
        super("SAP_S4", "SAP S/4HANA (Execution)");
        this.db = {
          stock: [
            { MATNR: "GPU-H100", WERKS: "DC-EAST", LABST: 410, EISBE: 240, UMLME: 60, STPRS: 24500 },
            { MATNR: "SSD-3840", WERKS: "DC-EAST", LABST: 980, EISBE: 300, UMLME: 120, STPRS: 310 },
            { MATNR: "PSU-2200", WERKS: "DC-WEST", LABST: 150, EISBE: 280, UMLME: 40, STPRS: 890 }
          ],
          refurb: [
            { WERKS: "DC-EAST", CAPACITY: 600, COSTPU: 1800 },
            { WERKS: "DC-WEST", CAPACITY: 350, COSTPU: 210 }
          ],
          production: [
            // work orders + run rate
            { MATNR: "FG-1001", WERKS: "DC-EAST", AUFNR: "WO-88012", RUNRATE: 120 },
            { MATNR: "FG-1003", WERKS: "DC-WEST", AUFNR: "WO-88090", RUNRATE: 75 }
          ]
        };
      }
      query(entity, filter = {}) {
        this.calls++;
        const rows = this.db[entity] || [];
        return rows.filter((r) => Object.keys(filter).every((k) => r[k] === filter[k]));
      }
      write(entity, payload) {
        this.calls++;
        if (entity === "STOCK_TRANSFER") return { EBELN: "ST" + Math.floor(Math.random() * 1e6), status: "CREATED", payload };
        if (entity === "PO_CREATE") return { EBELN: "45" + Math.floor(Math.random() * 1e6), status: "CREATED", payload };
        if (entity === "REPAIR_ORDER") return { EBELN: "RO" + Math.floor(Math.random() * 1e6), status: "SCHEDULED", payload };
        if (entity === "GOODS_ISSUE") return { status: "POSTED", payload };
        return { status: "OK" };
      }
    };
    var ServiceNow_Adapter = class extends SystemAdapter {
      constructor() {
        super("SERVICENOW", "ServiceNow (RMA / ITSM)");
        this.db = {
          rma_case: [
            // native ServiceNow dialect (number, cmdb_ci, u_* custom fields)
            { number: "RMA0012841", cmdb_ci: "GPU-H100", u_status: "RECEIVED", u_warranty: "IN_WARRANTY", u_claim_value: 24500, u_entitled: true, u_oem: "NVIDIA", u_symptom: "Xid 79 fall-off-bus" },
            { number: "RMA0012842", cmdb_ci: "PSU-2200", u_status: "RECEIVED", u_warranty: "OUT_WARRANTY", u_claim_value: 890, u_entitled: false, u_oem: "Delta", u_symptom: "No power-on" }
          ]
        };
      }
      query(entity, filter = {}) {
        this.calls++;
        const rows = this.db[entity] || [];
        return rows.filter((r) => Object.keys(filter).every((k) => r[k] === filter[k]));
      }
      write(entity, payload) {
        this.calls++;
        if (entity === "ISSUE_CREDIT") return { ref: "CR" + Math.floor(Math.random() * 1e6), status: "ISSUED", payload };
        if (entity === "ISSUE_REPLACEMENT") return { ref: "RP" + Math.floor(Math.random() * 1e6), status: "ISSUED", payload };
        if (entity === "UPDATE_RMA") return { status: "UPDATED", payload };
        if (entity === "OEM_SERVICE_REQUEST") return { ref: "OEM" + Math.floor(Math.random() * 1e6), status: "SUBMITTED", payload };
        return { status: "OK" };
      }
    };
    var A2ABus = class {
      constructor(trace) {
        this.topics = {};
        this.messages = 0;
        this.trace = trace;
      }
      subscribe(topic, fn) {
        (this.topics[topic] ||= []).push(fn);
      }
      publish(topic, msg, from) {
        this.messages++;
        this.trace("A2A", `${from} \u2192 topic:${topic}`, msg);
        (this.topics[topic] || []).forEach((fn) => fn(msg));
      }
    };
    var Layers = class {
      constructor(systems, mapper, memory, metrics, trace) {
        this.systems = systems;
        this.mapper = mapper;
        this.memory = memory;
        this.metrics = metrics;
        this.trace = trace;
        this.lastSystem = null;
        this.activity = {
          Perception: { n: 0, ms: 0, last: "" },
          Memory: { n: 0, ms: 0, last: "" },
          Reasoning: { n: 0, ms: 0, last: "" },
          Evidence: { n: 0, ms: 0, last: "" },
          Action: { n: 0, ms: 0, last: "" },
          Collaboration: { n: 0, ms: 0, last: "" },
          Explainability: { n: 0, ms: 0, last: "" }
        };
        this.evidenceLog = [];
        this.auditTrail = [];
        this.cache = {};
        this.firstReads = 0;
        this.cacheHits = 0;
        this.realTokens = {
          Perception: { in: 0, out: 0 },
          Memory: { in: 0, out: 0 },
          Reasoning: { in: 0, out: 0 },
          Evidence: { in: 0, out: 0 },
          Action: { in: 0, out: 0 },
          Collaboration: { in: 0, out: 0 },
          Explainability: { in: 0, out: 0 }
        };
        this.explainEntriesReal = [];
      }
      _realAdd(layer, inTok, outTok) {
        const r = this.realTokens[layer];
        r.in += inTok;
        r.out += outTok;
      }
      _hit(layer, sample, ms) {
        const a = this.activity[layer];
        a.n++;
        if (ms) a.ms += ms;
        if (sample) a.last = sample;
      }
      // L1 Perception — read any system, return canonical records.
      // Shared runtime: first read is paid once + cached; repeats are free reuse.
      perceive(system, entity, filter) {
        const t = NOW();
        const key = system + "|" + entity + "|" + JSON.stringify(filter || {});
        if (this.cache[key]) {
          this.cacheHits++;
          this._hit("Perception", `reused shared context ${entity}@${system} (no re-read) \u2192 ${this.cache[key].length} rows`, NOW() - t);
          this.trace("Perception", `reuse cached ${entity} from ${system} (shared cognitive runtime)`, { rows: this.cache[key].length, cached: true });
          this._realAdd("Perception", realTok(key), realTok(this.cache[key]));
          return this.cache[key];
        }
        this._accountContextSwitch(system);
        const native = this.systems[system].query(entity, filter);
        const canonical = native.map((r) => this.mapper.toCanonical(system, r));
        this.cache[key] = canonical;
        this.firstReads++;
        this._hit("Perception", `read ${entity} from ${system} \u2192 ${canonical.length} canonical rows`, NOW() - t);
        this.trace("Perception", `read ${entity} from ${system}`, { rows: canonical.length });
        this._realAdd("Perception", realTok({ system, entity, filter }) + realTok(native), realTok(canonical));
        return canonical;
      }
      // L2 Memory — unified episodic/semantic store (shared across capabilities)
      remember(key, value) {
        const t = NOW();
        this.memory[key] = value;
        this._hit("Memory", `store \u201C${key}\u201D`, NOW() - t);
        this.trace("Memory", `store ${key}`);
        this._realAdd("Memory", realTok(value), 0);
      }
      recall(key) {
        const t = NOW();
        const v = this.memory[key];
        this._hit("Memory", `recall \u201C${key}\u201D`, NOW() - t);
        this.trace("Memory", `recall ${key}`);
        this._realAdd("Memory", 0, realTok(v));
        return v;
      }
      // L3 Reasoning — goal decomposition (deterministic policy stands in for the
      // LLM orchestration, e.g. Mistral; the control flow is identical)
      reason(goal) {
        const t = NOW();
        const plan = goal.plan;
        this._hit("Reasoning", `decomposed goal into ${plan.length} sub-tasks: ${plan.map((p) => p.capability).join(", ")}`, NOW() - t);
        this.trace("Reasoning", `decomposed goal "${goal.name}" into ${plan.length} sub-tasks`, plan.map((p) => p.capability));
        this._realAdd("Reasoning", realTok({ goal: goal.name }), realTok(plan));
        return plan;
      }
      // L4 Evidence Engine — confidence + attribution + uncertainty + counterfactual
      evidence(decision, drivers) {
        const t = NOW();
        const BASE = 0.6;
        const raw = BASE + drivers.reduce((a, d) => a + d.weight, 0);
        const confidence = Math.min(0.99, raw);
        const total = drivers.reduce((a, d) => a + d.weight, 0) || 1;
        const scale = (confidence - BASE) / (raw - BASE || 1);
        const waterfall = { base: BASE, steps: drivers.map((d) => ({ name: d.name, contribution: +(d.weight * scale).toFixed(3) })), final: +confidence.toFixed(2) };
        const ev = {
          decision,
          confidence: +confidence.toFixed(2),
          base: BASE,
          waterfall,
          attribution: drivers.map((d) => ({ name: d.name, weight: d.weight, share: +(d.weight / total).toFixed(2) })),
          uncertainty: `\xB1${Math.round((1 - confidence) * 100)}%`,
          threshold: 0.85,
          explanationSource: "template",
          autonomous: confidence >= 0.85,
          // spec threshold for autonomous action
          counterfactual: confidence >= 0.85 ? `If confidence fell below 85% (e.g. the top driver weakened), this would route to a human approver instead of executing.` : `Reaching 85% confidence (e.g. stronger grounding data) would let this execute autonomously.`
        };
        this._hit("Evidence", `${decision} \u2192 conf ${ev.confidence}, ${ev.autonomous ? "autonomous" : "human gate"}`, NOW() - t);
        this.evidenceLog.push(ev);
        this.trace("Evidence", `${decision} \u2014 confidence ${ev.confidence} (${ev.autonomous ? "autonomous" : "human review"})`, ev);
        this._realAdd("Evidence", realTok(decision) + realTok(drivers), realTok(ev));
        return ev;
      }
      // L5 Action — universal action bus; canonical intent -> native call
      act(system, op, canonicalPayload) {
        const t = NOW();
        this._accountContextSwitch(system);
        const native = {};
        for (const concept in canonicalPayload) {
          const f = this.mapper.fieldFor(system, concept);
          if (f) native[f] = canonicalPayload[concept];
          else native[concept] = canonicalPayload[concept];
        }
        const res = this.systems[system].write(op, native);
        for (const k in this.cache) {
          if (k.indexOf(system + "|") === 0) delete this.cache[k];
        }
        this.metrics.actions++;
        this._hit("Action", `${op} on ${system} \u2192 ${res.status || "OK"}${res.EBELN ? " (" + res.EBELN + ")" : ""}`, NOW() - t);
        this.auditTrail.push({
          ts: (/* @__PURE__ */ new Date()).toISOString(),
          system,
          op,
          status: res.status || "OK",
          ref: res.EBELN || null,
          sku: canonicalPayload.sku || null,
          qty: canonicalPayload.qty || null
        });
        this.trace("Action", `${op} on ${system}`, res);
        this._realAdd("Action", realTok({ system, op, native }), realTok(res));
        return res;
      }
      // L6 Collaboration — the A2A pub/sub bus (counted here when invoked)
      collaborate(topic, from) {
        const t = NOW();
        this._hit("Collaboration", `${from} \u2192 topic \u201C${topic}\u201D on A2A bus`, NOW() - t);
        this._realAdd("Collaboration", realTok(`${from} -> ${topic}`), 0);
      }
      // L7 Explainability — native plain-English narration of any evidence object.
      // Real per-call measurement: tokenize the actual prompt this decision WOULD
      // need if narrated by an LLM, and the actual generated explanation text —
      // never a fixed rate. A caller may later replace any entry in
      // explainEntriesReal with a real LIVE call's usage.prompt_tokens/
      // completion_tokens (see unaiAdapter.cjs) — explain() itself stays
      // synchronous so it doesn't change this engine's call-flow.
      explain(ev) {
        const t = NOW();
        const top = [...ev.attribution].sort((a, b) => b.weight - a.weight)[0];
        let tail;
        if (ev.autonomous) tail = "Executed autonomously (confidence \u226585% and within policy limits).";
        else if (ev.gate && ev.gate.includes(">")) tail = `Routed to a human approver \u2014 ${ev.gate}.`;
        else tail = "Routed to a human approver (confidence below the 85% threshold).";
        const text = `${ev.decision}. Confidence ${(ev.confidence * 100).toFixed(0)}% (${ev.uncertainty}). Primary driver: ${top.name} (${Math.round(top.share * 100)}% of the decision). ` + tail;
        ev.explanation = text;
        this._hit("Explainability", text, NOW() - t);
        this.trace("Explainability", text);
        const drivers = (ev.attribution || []).map((d) => `- ${d.name}: ${Math.round(d.share * 100)}% of the decision`).join("\n");
        const promptText = `You are the Explainability layer of an autonomous supply-chain agent. Write ONE concise business-English sentence (max 40 words) explaining this decision to a planner. Use ONLY the facts below; do not invent numbers. State whether it executed autonomously or was routed to a human, and why.

Decision: ${ev.decision}
Confidence: ${Math.round(ev.confidence * 100)}% (uncertainty ${ev.uncertainty})
Autonomy threshold: ${Math.round((ev.threshold || 0.85) * 100)}%
Drivers:
${drivers}
Outcome: ${ev.autonomous ? "executed autonomously" : "routed to a human approver"}
` + (ev.gate ? `Governance gate: ${ev.gate}
` : "");
        const inTok = realTok(promptText), outTok = realTok(text);
        this._realAdd("Explainability", inTok, outTok);
        this.explainEntriesReal.push({ ev, localInTok: inTok, localOutTok: outTok });
        return text;
      }
      // ---- context-switch accounting -----------------------------------------
      // A "context switch" = the engine moves its working context from one system
      // of record to another. In Gen-1 each switch also forces a re-mapping of
      // that system's schema inside the agent. In Gen-2 the canonical ontology
      // absorbs the schema delta, so a switch costs ~0 integration effort.
      _accountContextSwitch(system) {
        if (this.lastSystem && this.lastSystem !== system) {
          this.metrics.contextSwitches++;
          this.trace("Context", `switch ${this.lastSystem} \u2192 ${system} (absorbed by canonical ontology)`);
        }
        this.lastSystem = system;
      }
    };
    var TOOL_PACKS = {
      // Detect supplier disruption from external signals (analytics store)
      disruption_detect(L) {
        const risks = L.perceive("ANALYTICS", "supplier_risk", {});
        const hit = risks.find((r) => r.supplier && false) || // ontology has supplier; signals use raw fields too
        L.systems.ANALYTICS.query("supplier_risk", {}).find((r) => r.risk >= 0.7);
        L.remember("disruption", hit);
        const ev = L.evidence(`Disruption detected: ${hit.note}`, [
          { name: "supplier risk score (0.78)", weight: hit.risk * 0.3 },
          { name: "lane concentration", weight: 0.1 }
        ]);
        L.explain(ev);
        return { affectedSupplier: hit.vendor_id, evidence: ev };
      },
      // Re-forecast demand for SKUs tied to the affected supplier (analytics + SD)
      demand_reforecast(L, ctx) {
        const fcst = L.perceive("ANALYTICS", "forecast", {});
        const demand = L.perceive("SAP_SD", "VBAP", {});
        const merged = fcst.map((f) => {
          const d = demand.find((x) => x.sku === f.sku) || {};
          const surge = 1.12;
          return { sku: f.sku, plant: f.plant, newForecast: Math.round(f.forecast_qty * surge), openDemand: d.open_demand || 0 };
        });
        L.remember("reforecast", merged);
        const ev = L.evidence("Demand re-forecast under disruption (+12% pull-forward)", [
          { name: "open sales orders", weight: 0.16 },
          { name: "historical disruption elasticity", weight: 0.12 }
        ]);
        L.explain(ev);
        return { reforecast: merged, evidence: ev };
      },
      // Recompute inventory position & safety stock (SAP MM)
      inventory_adjust(L, ctx) {
        const stock = L.perceive("SAP_MM", "MARD", {});
        const reforecast = L.recall("reforecast") || [];
        const actions = [];
        stock.forEach((s) => {
          const f = reforecast.find((r) => r.sku === s.sku) || {};
          const need = f.newForecast || 0;
          const gap = need - (s.on_hand_qty || 0);
          const newSafety = Math.round((s.safety_stock || 0) * 1.25);
          if (gap > 0) {
            L.act("SAP_MM", "SAFETY_STOCK_UPDATE", { sku: s.sku, plant: s.plant, safety_stock: newSafety });
            actions.push({ sku: s.sku, plant: s.plant, gap, newSafety, supplier: s.supplier, unit_cost: s.unit_cost, lead_time_days: s.lead_time_days });
          }
        });
        L.remember("shortfalls", actions);
        const ev = L.evidence(`Inventory rebalanced \u2014 ${actions.length} SKU(s) short`, [
          { name: "forecast-vs-onhand gap", weight: 0.22 },
          { name: "lead-time exposure", weight: 0.1 }
        ]);
        L.explain(ev);
        return { shortfalls: actions, evidence: ev };
      },
      // Raise replacement POs, switching supplier if risk high (MM + FI).
      // Governance: POs above the approval limit need human sign-off even when the
      // model is confident (spec §6 human-in-the-loop for high-value actions).
      procurement_act(L, ctx) {
        const APPROVAL_LIMIT = 5e4;
        const shortfalls = L.recall("shortfalls") || [];
        const disruption = L.recall("disruption") || {};
        const pos = [];
        shortfalls.forEach((s) => {
          const reroute = s.supplier === disruption.vendor_id;
          const supplier = reroute ? "V-9001(backup)" : s.supplier;
          const value = Math.round(s.gap * s.unit_cost);
          L.perceive("SAP_FI", "BSEG", {});
          const ev = L.evidence(
            `Raise PO for ${s.sku} (${s.gap} units, $${value.toLocaleString()})${reroute ? " \u2014 rerouted to backup supplier" : ""}`,
            [
              { name: "stock-out revenue risk", weight: 0.24 },
              { name: reroute ? "primary supplier disrupted" : "supplier nominal", weight: reroute ? 0.14 : 0.04 }
            ]
          );
          const overLimit = value > APPROVAL_LIMIT;
          ev.autonomous = ev.autonomous && !overLimit;
          ev.gate = overLimit ? `value $${value.toLocaleString()} > $${APPROVAL_LIMIT.toLocaleString()} approval limit` : "within approval limit";
          if (overLimit) ev.counterfactual = `A PO at or below $${APPROVAL_LIMIT.toLocaleString()} would execute autonomously; this one needs a buyer's sign-off.`;
          const explain = L.explain(ev);
          let res = { EBELN: "\u2014", status: "PENDING_APPROVAL" };
          if (ev.autonomous) res = L.act("SAP_MM", "PO_CREATE", { sku: s.sku, plant: s.plant, supplier, qty: s.gap, unit_cost: s.unit_cost });
          pos.push({
            sku: s.sku,
            qty: s.gap,
            supplier,
            rerouted: reroute,
            po: res.EBELN,
            value,
            autonomous: ev.autonomous,
            confidence: ev.confidence,
            gate: ev.gate,
            explain
          });
        });
        L.remember("pos", pos);
        return { purchaseOrders: pos };
      },
      /* ======================================================================
       * SPARES PLANNING (IBP) — reverse-logistics planning pipeline.
       * Each capability below would be a separate specialist agent in the
       * Bristlecone/Gemini overlay; here they all share the seven layers.
       * ==================================================================== */
      failure_rate_estimate(L) {
        const fm = L.perceive("ANALYTICS", "failure_model", {});
        const rows = fm.map((r) => ({
          sku: r.sku,
          plant: r.plant,
          expectedFailures: Math.round((r.install_base_qty || 0) * (r.failure_rate || 0) * (r.age_factor || 1))
        }));
        L.remember("failures", rows);
        const ev = L.evidence(
          `Age-specific failure rates estimated for ${rows.length} SKUs`,
          [{ name: "Weibull hazard fit (BQML)", weight: 0.22 }, { name: "age factor", weight: 0.1 }]
        );
        L.explain(ev);
        return { failures: rows, evidence: ev };
      },
      spares_demand_forecast(L) {
        const f = L.perceive("ANALYTICS", "spares_forecast", {});
        L.remember("spares_demand", f);
        const ev = L.evidence(
          `Intermittent spares demand forecast (Croston/SBA) for ${f.length} SKUs`,
          [{ name: "intermittent-demand model", weight: 0.2 }, { name: "install-base failure signal", weight: 0.12 }]
        );
        L.explain(ev);
        return { forecast: f, evidence: ev };
      },
      returns_realization(L) {
        const r = L.perceive("ANALYTICS", "returns_model", {});
        L.remember("returns_model", r);
        const ev = L.evidence(
          `Return probability, lag & yield modelled for ${r.length} SKUs`,
          [{ name: "return-survival model", weight: 0.18 }, { name: "core yield history", weight: 0.1 }]
        );
        L.explain(ev);
        return { realization: r, evidence: ev };
      },
      returns_forecast(L) {
        const failures = L.recall("failures") || [];
        const rm = L.recall("returns_model") || [];
        const rows = failures.map((f) => {
          const m = rm.find((x) => x.sku === f.sku) || {};
          const returns = Math.round(f.expectedFailures * (m.return_prob || 0));
          const refurbReady = Math.round(returns * (m.yield_rate || 0));
          return { sku: f.sku, returns, refurbReady, lagDays: m.return_lag_days || null };
        });
        L.remember("returns_forecast", rows);
        const ev = L.evidence(
          `Reverse-supply (returns) forecast: install-base \xD7 failure \xD7 realization`,
          [{ name: "expected failures", weight: 0.2 }, { name: "return probability \xD7 yield", weight: 0.14 }]
        );
        L.explain(ev);
        return { returnsForecast: rows, evidence: ev };
      },
      variability_leadtime(L) {
        const f = L.perceive("ANALYTICS", "spares_forecast", {});
        const ib = L.perceive("SAP_IBP", "install_base", {});
        const rows = f.map((x) => {
          const lt = (ib.find((i) => i.sku === x.sku) || {}).lead_time_days || 0;
          return { sku: x.sku, variability: x.demand_variability, lead_time_days: lt };
        });
        L.remember("variability", rows);
        const ev = L.evidence(
          `Demand variability + quantile lead-time fitted (safety-stock inputs)`,
          [{ name: "distribution fit", weight: 0.16 }, { name: "lead-time quantile ML", weight: 0.1 }]
        );
        L.explain(ev);
        return { variability: rows, evidence: ev };
      },
      inventory_optimization(L) {
        const tgt = L.perceive("SAP_IBP", "inv_target", {});
        const stock = L.perceive("SAP_S4", "stock", {});
        const rows = tgt.map((t) => {
          const s = stock.find((x) => x.sku === t.sku) || {};
          return {
            sku: t.sku,
            plant: t.plant,
            target: t.target_stock,
            serviceLevel: t.service_level,
            onHand: s.on_hand_qty || 0,
            inTransit: s.in_transit_qty || 0
          };
        });
        L.remember("inv_target", rows);
        const ev = L.evidence(
          `Multi-echelon target inventory position set (METRIC / OR-Tools)`,
          [{ name: "service-level constraint", weight: 0.2 }, { name: "holding-cost minimization", weight: 0.12 }]
        );
        L.explain(ev);
        return { targets: rows, evidence: ev };
      },
      // ---- Real formula ported from a converted app (NVIDIA Refurbish & Repair
      // Agent, refurbRepair.ts) — proof of concept for "upgrade an unknown/custom
      // converted capability to its actual math" instead of the generic
      // illustrative executor. Keyed to "recoverable_units" because that's the
      // exact capability id the Convert-tab importer already gave this tool in
      // the published manifest — no manifest edit needed, it just starts
      // computing for real the next time this run's plan reaches that step.
      // The four related output fields below (scrapped_units, repair_cost_total,
      // new_supply_cost_total, net_savings_usd, repair_schedule) reuse this same
      // computation via L.recall so all five agree with each other exactly, the
      // same way the source app's one function produced all five together.
      recoverable_units(L) {
        const row = (L.perceive("ANALYTICS", "returns_model", {}) || [])[0] || {};
        const fieldReturnsCount = row.field_returns_count != null ? row.field_returns_count : 500;
        const recoveryRatePct = row.recovery_rate_pct != null ? row.recovery_rate_pct : 80;
        const newSupplyCostUsd = row.new_supply_cost_usd != null ? row.new_supply_cost_usd : 9e3;
        const unitRepairCostUsd = row.unit_repair_cost_usd != null ? row.unit_repair_cost_usd : 1200;
        const recoverableUnits = Math.round(fieldReturnsCount * (recoveryRatePct / 100));
        const scrappedUnits = fieldReturnsCount - recoverableUnits;
        const repairCostTotal = recoverableUnits * unitRepairCostUsd;
        const newSupplyCostTotal = recoverableUnits * newSupplyCostUsd;
        const netSavingsUsd = newSupplyCostTotal - repairCostTotal;
        const repairSchedule = [
          { phase: "Intake & Diagnostics", durationDays: 5, unitsProcessed: fieldReturnsCount },
          { phase: "Board-Level Rework", durationDays: 7, unitsProcessed: recoverableUnits },
          { phase: "Component Refitting & Sourcing", durationDays: 6, unitsProcessed: recoverableUnits },
          { phase: "Burn-In Testing & QA Signoff", durationDays: 6, unitsProcessed: recoverableUnits }
        ];
        L.remember("refurb_repair_calc", { fieldReturnsCount, recoveryRatePct, recoverableUnits, scrappedUnits, repairCostTotal, newSupplyCostTotal, netSavingsUsd, repairSchedule });
        const ev = L.evidence(
          `Recoverable units: ${recoverableUnits} of ${fieldReturnsCount} field returns (${recoveryRatePct}% recovery rate)`,
          [{ name: "recovery rate applied", weight: 0.2 }, { name: "repair vs new-build cost delta", weight: 0.12 }]
        );
        L.explain(ev);
        return { fieldReturnsCount, recoveryRatePct, recoverableUnits, scrappedUnits, repairCostTotal, newSupplyCostTotal, netSavingsUsd, repairSchedule, evidence: ev };
      },
      scrapped_units(L) {
        const c = L.recall("refurb_repair_calc") || { fieldReturnsCount: 500, scrappedUnits: 100 };
        const ev = L.evidence(`Scrapped units: ${c.scrappedUnits} of ${c.fieldReturnsCount} field returns`, [{ name: "recovery rate applied", weight: 0.18 }]);
        L.explain(ev);
        return { scrappedUnits: c.scrappedUnits, evidence: ev };
      },
      repair_cost_total(L) {
        const c = L.recall("refurb_repair_calc") || { recoverableUnits: 400, repairCostTotal: 48e4 };
        const ev = L.evidence(`Repair cost: $${c.repairCostTotal.toLocaleString()} for ${c.recoverableUnits} recoverable units`, [{ name: "unit repair cost", weight: 0.18 }]);
        L.explain(ev);
        return { repairCostTotal: c.repairCostTotal, evidence: ev };
      },
      new_supply_cost_total(L) {
        const c = L.recall("refurb_repair_calc") || { newSupplyCostTotal: 36e5 };
        const ev = L.evidence(`Equivalent new-supply cost: $${c.newSupplyCostTotal.toLocaleString()}`, [{ name: "new-build unit cost", weight: 0.18 }]);
        L.explain(ev);
        return { newSupplyCostTotal: c.newSupplyCostTotal, evidence: ev };
      },
      net_savings_usd(L) {
        const c = L.recall("refurb_repair_calc") || { netSavingsUsd: 312e4 };
        const ev = L.evidence(`Net savings: $${c.netSavingsUsd.toLocaleString()} vs new-build`, [{ name: "repair vs new-build cost delta", weight: 0.22 }]);
        L.explain(ev);
        return { netSavingsUsd: c.netSavingsUsd, evidence: ev };
      },
      repair_schedule(L) {
        const c = L.recall("refurb_repair_calc") || { repairSchedule: [] };
        const days = (c.repairSchedule || []).reduce((a, p) => a + (p.durationDays || 0), 0);
        const ev = L.evidence(`4-stage repair schedule across ${days} days`, [{ name: "throughput vs cost", weight: 0.14 }]);
        L.explain(ev);
        return { repairSchedule: c.repairSchedule, evidence: ev };
      },
      // ---- Real formula ported from demandForecast.ts (NVIDIA Demand Forecast /
      // S&OP Agent) — 26-week consensus forecast reconciling sales + marketing
      // overrides with a seasonal baseline curve. ----
      forecast_data(L) {
        const row = (L.perceive("ANALYTICS", "forecast", {}) || [])[0] || {};
        const salesOverrideUnits = row.sales_override_units != null ? row.sales_override_units : 12e3;
        const marketingOverrideUnits = row.marketing_override_units != null ? row.marketing_override_units : 6e3;
        const totalOverride = salesOverrideUnits + marketingOverrideUnits;
        const weeklyOverrideShare = Math.round(totalOverride / 26);
        const forecastData = [];
        for (let i = 1; i <= 26; i++) {
          const baseVal = Math.round(4500 + Math.sin(i / 26 * Math.PI * 2) * 800 + (Math.random() * 200 - 100));
          forecastData.push({ week: `W${i}`, baseForecast: baseVal, consensusForecast: baseVal + weeklyOverrideShare });
        }
        L.remember("demand_forecast_calc", { forecastData, totalOverride, salesOverrideUnits, marketingOverrideUnits });
        const ev = L.evidence(
          `26-week consensus forecast: ${totalOverride.toLocaleString()} override units distributed across the horizon`,
          [{ name: "sales + marketing overrides", weight: 0.18 }, { name: "seasonal decomposition", weight: 0.12 }]
        );
        L.explain(ev);
        return { forecastData, totalOverride, evidence: ev };
      },
      // ---- Real formula ported from demandSensing.ts (NVIDIA Demand Sensing
      // Agent) — 13-week AI-reforecast reacting to a live hyperscaler signal
      // spike, blended against a stable statistical baseline. ----
      chart_data(L) {
        const row = (L.perceive("ANALYTICS", "forecast", {}) || [])[0] || {};
        const signalSpikePct = row.signal_spike_pct != null ? row.signal_spike_pct : 35;
        const signalVolumeUnits = row.signal_volume_units != null ? row.signal_volume_units : 8e3;
        const baseAvg = 1200;
        const chartData = [];
        for (let i = 1; i <= 13; i++) {
          const statisticalBaseline = Math.round(baseAvg + Math.sin(i / 2) * 100);
          let rawSignal = 0;
          if (i >= 2 && i <= 5) {
            const weight = i === 2 ? 0.15 : i === 3 ? 0.45 : i === 4 ? 0.3 : 0.1;
            rawSignal = Math.round(signalVolumeUnits * weight);
          }
          const spikeFactor = 1 + signalSpikePct / 100 * (i >= 2 && i <= 8 ? 0.8 : 0.2);
          const aiReforecast = Math.round(statisticalBaseline * spikeFactor + rawSignal * 0.95);
          chartData.push({ week: `W${i}`, statisticalBaseline, aiReforecast, rawSignal });
        }
        const anomalyDetected = signalSpikePct > 20;
        L.remember("demand_sensing_calc", { chartData, anomalyDetected, signalSpikePct, signalVolumeUnits });
        const ev = L.evidence(
          `Demand sensing: ${anomalyDetected ? "anomaly confirmed" : "regular wave"} \u2014 ${signalVolumeUnits.toLocaleString()}-unit signal at +${signalSpikePct}%`,
          [{ name: "signal spike intensity", weight: 0.2 }, { name: "cluster buildout schedule", weight: 0.1 }]
        );
        L.explain(ev);
        return { chartData, anomalyDetected, signalSpikePct, signalVolumeUnits, evidence: ev };
      },
      // ---- Real formula ported from forecastAgentNpi.ts (NVIDIA NPI Forecast
      // Agent) — champion-challenger model selection (fixed MAPE per model,
      // matched against the user's preferred model) + hierarchical demand
      // breakdown scaled by market-adoption speed. ----
      champion_model(L) {
        const row = (L.perceive("ANALYTICS", "forecast", {}) || [])[0] || {};
        const selectedPrimaryModel = row.selected_primary_model || "Pattern-Recognition Model";
        const marketAdoptionRate = row.market_adoption_rate || "Moderate";
        const baseMultiplier = marketAdoptionRate === "High" ? 1.4 : marketAdoptionRate === "Conservative" ? 0.75 : 1;
        const modelMetrics = [
          { modelName: "Pattern-Recognition Model", mape: 4.8, status: /Pattern|LSTM/i.test(selectedPrimaryModel) ? "Selected Champion" : "Challenger" },
          { modelName: "Multi-Variable Analytics Model", mape: 5.6, status: /Multi|XGBoost/i.test(selectedPrimaryModel) ? "Selected Champion" : "Challenger" },
          { modelName: "Trend Extrapolation Model", mape: 9.2, status: /Trend|ARIMA/i.test(selectedPrimaryModel) ? "Selected Champion" : "Challenger" }
        ];
        const championModel = selectedPrimaryModel;
        const challengerModels = modelMetrics.filter((m) => m.status !== "Selected Champion").map((m) => m.modelName);
        const hierarchicalForecast = [
          { node: "Hyperscale Cloud Providers", naUnits: Math.round(14500 * baseMultiplier), apacUnits: Math.round(11200 * baseMultiplier), emeaUnits: Math.round(9800 * baseMultiplier) },
          { node: "Enterprise OEM (Dell, HPE, Supermicro)", naUnits: Math.round(8200 * baseMultiplier), apacUnits: Math.round(6400 * baseMultiplier), emeaUnits: Math.round(5900 * baseMultiplier) },
          { node: "Government & National Labs", naUnits: Math.round(3400 * baseMultiplier), apacUnits: Math.round(1500 * baseMultiplier), emeaUnits: Math.round(2800 * baseMultiplier) }
        ];
        const lowConfidenceFlags = [
          { skuNode: "EMEA Sovereign Cloud Node 4B", confidenceScore: 68, reason: "Geopolitical compliance restrictions & data sovereignty audits." },
          { skuNode: "APAC OEM Liquid-Cooled SKU C9", confidenceScore: 72, reason: "Supply bottleneck & single-source manifold lead-time uncertainty." }
        ];
        L.remember("npi_calc", { championModel, challengerModels, modelMetrics, hierarchicalForecast, lowConfidenceFlags });
        const ev = L.evidence(
          `Champion model selected: ${championModel} (adoption: ${marketAdoptionRate})`,
          [{ name: "MAPE accuracy comparison", weight: 0.2 }, { name: "market adoption multiplier", weight: 0.1 }]
        );
        L.explain(ev);
        return { championModel, challengerModels, modelMetrics, hierarchicalForecast, lowConfidenceFlags, evidence: ev };
      },
      challenger_models(L) {
        const c = L.recall("npi_calc") || { challengerModels: [] };
        const ev = L.evidence(`Challenger models: ${(c.challengerModels || []).join(", ") || "none"}`, [{ name: "MAPE ranking", weight: 0.15 }]);
        L.explain(ev);
        return { challengerModels: c.challengerModels, evidence: ev };
      },
      model_metrics(L) {
        const c = L.recall("npi_calc") || { modelMetrics: [] };
        const ev = L.evidence(`Model metrics computed for ${(c.modelMetrics || []).length} candidate models`, [{ name: "MAPE accuracy comparison", weight: 0.18 }]);
        L.explain(ev);
        return { modelMetrics: c.modelMetrics, evidence: ev };
      },
      hierarchical_forecast(L) {
        const c = L.recall("npi_calc") || { hierarchicalForecast: [] };
        const total = (c.hierarchicalForecast || []).reduce((a, n) => a + n.naUnits + n.apacUnits + n.emeaUnits, 0);
        const ev = L.evidence(`Hierarchical forecast: ${total.toLocaleString()} units across ${(c.hierarchicalForecast || []).length} customer segments`, [{ name: "market adoption multiplier", weight: 0.16 }]);
        L.explain(ev);
        return { hierarchicalForecast: c.hierarchicalForecast, evidence: ev };
      },
      low_confidence_flags(L) {
        const c = L.recall("npi_calc") || { lowConfidenceFlags: [] };
        const ev = L.evidence(`${(c.lowConfidenceFlags || []).length} low-confidence planning node(s) flagged`, [{ name: "sovereign/regulatory risk", weight: 0.14 }]);
        L.explain(ev);
        return { lowConfidenceFlags: c.lowConfidenceFlags, evidence: ev };
      },
      // ---- Real logic ported from orchestrator.ts (NVIDIA Orchestrator Control
      // Tower Agent) — coordinates the other agents' response to a KPI breach. ----
      current_kpi_value(L) {
        const row = (L.perceive("ANALYTICS", "forecast", {}) || [])[0] || {};
        const kpiBreachType = row.kpi_breach_type || "Generic KPI Breach";
        const affectedRegion = row.affected_region || "Global";
        const impactedSku = row.impacted_sku || "N/A";
        const coordinatedAgents = [
          { agentName: "Demand Sensing Agent", assignedAction: "Analyze spike and calculate short-term demand trends", impactWeightPct: 35, status: "Active" },
          { agentName: "Refurbish & Repair Agent", assignedAction: "Evaluate returned units and schedule immediate local repairs", impactWeightPct: 25, status: "Active" },
          { agentName: "RMA Triage Agent", assignedAction: "Exhaustive defect diagnostic and warranty verification processing", impactWeightPct: 20, status: "Active" },
          { agentName: "Replenishment Controller", assignedAction: "Initiate stock reallocation transfers from APAC logistics center", impactWeightPct: 20, status: "Pending" }
        ];
        const sequenceSteps = [
          { stepNumber: 1, fromAgent: "Orchestrator Tower", toAgent: "Demand Sensing Agent", messageSignal: "ACTIVATE_REGION_TELEMETRY", resultDescription: "Hyperscaler demand signal spike analyzed and validated." },
          { stepNumber: 2, fromAgent: "Demand Sensing Agent", toAgent: "Refurbish & Repair Agent", messageSignal: "REFORECAST_YIELD_TARGET", resultDescription: "Reforecast trend integrated into factory labor and component allocations." },
          { stepNumber: 3, fromAgent: "Refurbish & Repair Agent", toAgent: "RMA Triage Agent", messageSignal: "ACCELERATE_INTAKE_DIAGNOSTICS", resultDescription: "RMA intakes accelerated to feed refurbishment lines." },
          { stepNumber: 4, fromAgent: "Orchestrator Tower", toAgent: "Replenishment Controller", messageSignal: "EXECUTE_BUFFER_DISPATCH", resultDescription: "Logistics corridor cleared and shipping container manifests generated." }
        ];
        const currentKpiValue = "78% (Threshold: 85%)";
        const targetKpiValue = "Restore to >85% within 14 business days";
        L.remember("orchestrator_calc", { kpiBreachType, affectedRegion, impactedSku, coordinatedAgents, sequenceSteps, currentKpiValue, targetKpiValue });
        const ev = L.evidence(
          `Orchestrating ${coordinatedAgents.length}-agent mitigation for ${kpiBreachType} in ${affectedRegion} (SKU ${impactedSku})`,
          [{ name: "cross-agent routing", weight: 0.18 }, { name: "buffer inventory availability", weight: 0.1 }]
        );
        L.explain(ev);
        return { currentKpiValue, targetKpiValue, coordinatedAgents, sequenceSteps, evidence: ev };
      },
      target_kpi_value(L) {
        const c = L.recall("orchestrator_calc") || { targetKpiValue: "" };
        const ev = L.evidence(`Target: ${c.targetKpiValue}`, [{ name: "mitigation plan", weight: 0.15 }]);
        L.explain(ev);
        return { targetKpiValue: c.targetKpiValue, evidence: ev };
      },
      coordinated_agents(L) {
        const c = L.recall("orchestrator_calc") || { coordinatedAgents: [] };
        const ev = L.evidence(`${(c.coordinatedAgents || []).length} agent(s) coordinated in this mitigation`, [{ name: "cross-agent routing", weight: 0.18 }]);
        L.explain(ev);
        return { coordinatedAgents: c.coordinatedAgents, evidence: ev };
      },
      sequence_steps(L) {
        const c = L.recall("orchestrator_calc") || { sequenceSteps: [] };
        const ev = L.evidence(`${(c.sequenceSteps || []).length}-step orchestration sequence executed`, [{ name: "A2A message routing", weight: 0.16 }]);
        L.explain(ev);
        return { sequenceSteps: c.sequenceSteps, evidence: ev };
      },
      // ---- Real logic ported from rmaTriage.ts (NVIDIA RMA Triage Agent) —
      // warranty date-diff, solvability keyword match, disposition routing, and
      // a condensed failure-category lookup (same 5 categories + default as the
      // source app; narrative per-cause detail trimmed for size, real numbers
      // kept faithful). ----
      solvability_recommendation(L) {
        const row = (L.perceive("SERVICENOW", "rma_case", {}) || [])[0] || {};
        const serialNumber = row.serial_number || "SN-UNKNOWN";
        const defectDescription = row.defect_description || "thermal throttling due to dust and fan airflow blockage";
        const purchaseDate = row.purchase_date || "2024-01-15";
        const now = /* @__PURE__ */ new Date("2026-07-14T04:27:56-07:00");
        const buyDate = new Date(purchaseDate);
        const diffDays = Math.ceil(Math.abs(now.getTime() - buyDate.getTime()) / 864e5);
        const diffMonths = diffDays / 30.4;
        const isUnderWarranty = diffMonths <= 36;
        const warrantyStatus = isUnderWarranty ? "Active (Under Warranty)" : "Expired (Out of Warranty)";
        const warrantyDetails = `${Math.round(diffMonths)} months elapsed since purchase date (${purchaseDate}). Standard enterprise coverage is 36 months.`;
        const isSolvable = /driver|firmware|software|config|pci|cable|dust|hot|fan|temp/i.test(defectDescription);
        const disposition = isSolvable ? "Self-Troubleshoot" : isUnderWarranty ? "Factory Refurbish" : "Direct Replacement";
        const replenishmentTriggered = disposition !== "Self-Troubleshoot";
        const text = (defectDescription || "").toLowerCase();
        let category, failureRateAfrPct, mtbfHours, repairabilityRatePct, firstTimeFixRatePct, avgRepairTatDays, salvageSavingsUsd;
        if (/dust|hot|fan|temp|throttle|cooling|overheat|airflow|heatsink/i.test(text)) {
          category = "thermal/airflow";
          failureRateAfrPct = 1.4;
          mtbfHours = 36200;
          repairabilityRatePct = 98.6;
          firstTimeFixRatePct = 97.4;
          avgRepairTatDays = 0.2;
          salvageSavingsUsd = 28500;
        } else if (/power|controller|mosfet|post|amber|vrm|volt|rail|fuse|capacitor/i.test(text)) {
          category = "power/VRM";
          failureRateAfrPct = 4.8;
          mtbfHours = 11400;
          repairabilityRatePct = 88.5;
          firstTimeFixRatePct = 89.1;
          avgRepairTatDays = 2.5;
          salvageSavingsUsd = 32e3;
        } else if (/hbm|memory|ecc|substrate|corruption|micro-bump|bump|silicon|bga|interposer/i.test(text)) {
          category = "HBM/memory";
          failureRateAfrPct = 3.2;
          mtbfHours = 16800;
          repairabilityRatePct = 81.2;
          firstTimeFixRatePct = 84.5;
          avgRepairTatDays = 4.2;
          salvageSavingsUsd = 41500;
        } else if (/coolant|liquid|manifold|seepage|leak|dielectric|cold plate/i.test(text)) {
          category = "liquid cooling";
          failureRateAfrPct = 1.1;
          mtbfHours = 42e3;
          repairabilityRatePct = 96.8;
          firstTimeFixRatePct = 95.4;
          avgRepairTatDays = 0.3;
          salvageSavingsUsd = 36e3;
        } else if (/nvlink|retimer|lane|dropout|desync|switch tray|fabric/i.test(text)) {
          category = "NVLink/retimer";
          failureRateAfrPct = 2.3;
          mtbfHours = 22800;
          repairabilityRatePct = 94.1;
          firstTimeFixRatePct = 93;
          avgRepairTatDays = 0.5;
          salvageSavingsUsd = 29800;
        } else {
          category = "general signal integrity";
          failureRateAfrPct = isSolvable ? 2.1 : 3.9;
          mtbfHours = isSolvable ? 24500 : 15800;
          repairabilityRatePct = isSolvable ? 93.5 : 84;
          firstTimeFixRatePct = isSolvable ? 92 : 86.8;
          avgRepairTatDays = isSolvable ? 0.4 : 3;
          salvageSavingsUsd = isSolvable ? 19500 : 25800;
        }
        const solvabilityRecommendation = isSolvable ? `Perform a clean enterprise driver purge and reseat the unit in its PCIe slot; update cooling profiles before authorizing hardware RMA.` : `Physical hardware degradation identified (S/N: ${serialNumber}). Authorize factory RMA intake for certified diagnostic and repair.`;
        const failureRepairAnalysis = {
          failureRateAfrPct,
          mtbfHours,
          repairabilityRatePct,
          firstTimeFixRatePct,
          avgRepairTatDays,
          salvageSavingsUsd,
          category,
          rmaProcessImpactSummary: `Unit (S/N: ${serialNumber}) diagnosed as ${category}. Routing via ${disposition} achieves a ${repairabilityRatePct}% repairability yield in ${avgRepairTatDays} days.`
        };
        L.remember("rma_calc", { serialNumber, warrantyStatus, warrantyDetails, disposition, replenishmentTriggered, isSolvable, solvabilityRecommendation, failureRepairAnalysis });
        const ev = L.evidence(`RMA disposition: ${disposition} (${warrantyStatus})`, [{ name: "defect signature match", weight: 0.2 }, { name: "warranty duration check", weight: 0.12 }]);
        L.explain(ev);
        return { solvabilityRecommendation, warrantyStatus, warrantyDetails, disposition, replenishmentTriggered, failureRepairAnalysis, evidence: ev };
      },
      warranty_status(L) {
        const c = L.recall("rma_calc") || { warrantyStatus: "" };
        const ev = L.evidence(`Warranty: ${c.warrantyStatus}`, [{ name: "purchase date check", weight: 0.15 }]);
        L.explain(ev);
        return { warrantyStatus: c.warrantyStatus, evidence: ev };
      },
      warranty_details(L) {
        const c = L.recall("rma_calc") || { warrantyDetails: "" };
        const ev = L.evidence(c.warrantyDetails || "Warranty duration computed", [{ name: "purchase date check", weight: 0.15 }]);
        L.explain(ev);
        return { warrantyDetails: c.warrantyDetails, evidence: ev };
      },
      disposition(L) {
        const c = L.recall("rma_calc") || { disposition: "" };
        const ev = L.evidence(`Disposition: ${c.disposition}`, [{ name: "defect signature match", weight: 0.2 }]);
        L.explain(ev);
        return { disposition: c.disposition, evidence: ev };
      },
      replenishment_triggered(L) {
        const c = L.recall("rma_calc") || { replenishmentTriggered: false };
        const ev = L.evidence(`Replenishment ${c.replenishmentTriggered ? "triggered" : "not triggered"}`, [{ name: "disposition outcome", weight: 0.16 }]);
        L.explain(ev);
        return { replenishmentTriggered: c.replenishmentTriggered, evidence: ev };
      },
      software_resolution(L) {
        const c = L.recall("rma_calc") || {};
        const ev = L.evidence(`Software resolution path evaluated`, [{ name: "defect signature match", weight: 0.14 }]);
        L.explain(ev);
        return { softwareResolution: c.isSolvable ? "Clean driver reinstall + config reset" : "N/A \u2014 hardware disposition", evidence: ev };
      },
      firmware_recommendation(L) {
        const ev = L.evidence(`Firmware recommendation checked`, [{ name: "defect signature match", weight: 0.12 }]);
        L.explain(ev);
        return { firmwareRecommendation: "Flash latest production SBIOS/firmware branch", evidence: ev };
      },
      driver_recommendation(L) {
        const ev = L.evidence(`Driver recommendation checked`, [{ name: "defect signature match", weight: 0.12 }]);
        L.explain(ev);
        return { driverRecommendation: "Enterprise Production Branch driver, latest version", evidence: ev };
      },
      refurbish_planning(L) {
        const refurb = L.perceive("SAP_S4", "refurb", {});
        const rf = L.recall("returns_forecast") || [];
        const totalReady = rf.reduce((a, x) => a + (x.refurbReady || 0), 0);
        const capacity = refurb.reduce((a, x) => a + (x.refurb_capacity || 0), 0);
        const scheduled = Math.min(totalReady, capacity);
        L.remember("refurb_plan", { totalReady, capacity, scheduled });
        const ev = L.evidence(
          `Capacitated repair schedule: ${scheduled} of ${totalReady} cores (cap ${capacity})`,
          [{ name: "repair capacity (LP/MILP)", weight: 0.18 }, { name: "throughput vs cost", weight: 0.1 }]
        );
        L.explain(ev);
        return { refurbPlan: { totalReady, capacity, scheduled }, evidence: ev };
      },
      net_requirements(L) {
        const targets = L.recall("inv_target") || [];
        const refurb = L.recall("refurb_plan") || { scheduled: 0 };
        const rf = L.recall("returns_forecast") || [];
        let refurbLeft = refurb.scheduled;
        const rows = targets.map((t) => {
          const grossNeed = Math.max(0, t.target - t.onHand - t.inTransit);
          const fromRefurb = Math.min(grossNeed, Math.round(refurbLeft / Math.max(1, targets.length)));
          const buyNew = Math.max(0, grossNeed - fromRefurb);
          return { sku: t.sku, plant: t.plant, grossNeed, fromRefurb, buyNew };
        });
        L.remember("net_req", rows);
        const ev = L.evidence(
          `Net requirements (MRP netting + buy-vs-refurb) for ${rows.length} SKUs`,
          [{ name: "deterministic netting", weight: 0.22 }, { name: "buy-vs-refurb economics", weight: 0.1 }]
        );
        L.explain(ev);
        return { netRequirements: rows, evidence: ev };
      },
      replenishment_rebalancing(L) {
        const net = L.recall("net_req") || [];
        const moves = [];
        net.forEach((n) => {
          if (n.buyNew > 0) {
            const ev = L.evidence(
              `Reposition/buy ${n.buyNew} units of ${n.sku} @ ${n.plant} (transshipment MILP)`,
              [{ name: "min-cost positioning", weight: 0.2 }, { name: "SLA constraint", weight: 0.12 }]
            );
            L.explain(ev);
            if (ev.autonomous) L.act("SAP_S4", "STOCK_TRANSFER", { sku: n.sku, plant: n.plant, qty: n.buyNew });
            moves.push({ sku: n.sku, plant: n.plant, qty: n.buyNew, autonomous: ev.autonomous, confidence: ev.confidence, explain: ev.explanation });
          }
        });
        L.remember("moves", moves);
        return { moves };
      },
      order_execution(L) {
        const net = L.recall("net_req") || [];
        const APPROVAL_LIMIT = 5e4;
        const stock = L.perceive("SAP_S4", "stock", {});
        const orders = [];
        net.forEach((n) => {
          if (n.buyNew <= 0 && n.fromRefurb <= 0) return;
          const unit = (stock.find((s) => s.sku === n.sku) || {}).unit_cost || 0;
          const value = Math.round(n.buyNew * unit);
          const ev = L.evidence(
            `Execute order: ${n.fromRefurb} refurb + ${n.buyNew} new for ${n.sku} ($${value.toLocaleString()})`,
            [{ name: "spares availability risk", weight: 0.24 }, { name: "buy-vs-refurb plan", weight: 0.1 }]
          );
          const overLimit = value > APPROVAL_LIMIT;
          ev.autonomous = ev.autonomous && !overLimit;
          ev.gate = overLimit ? `value $${value.toLocaleString()} > $${APPROVAL_LIMIT.toLocaleString()} approval limit` : "within approval limit";
          L.explain(ev);
          let ref = "PENDING_APPROVAL";
          if (ev.autonomous && n.buyNew > 0) ref = L.act("SAP_S4", "PO_CREATE", { sku: n.sku, plant: n.plant, qty: n.buyNew, unit_cost: unit }).EBELN;
          if (n.fromRefurb > 0) L.act("SAP_S4", "REPAIR_ORDER", { sku: n.sku, plant: n.plant, qty: n.fromRefurb });
          orders.push({ sku: n.sku, refurb: n.fromRefurb, buy: n.buyNew, value, ref, autonomous: ev.autonomous, confidence: ev.confidence, gate: ev.gate, explain: ev.explanation });
        });
        return { orders };
      },
      returns_execution(L) {
        const rf = L.recall("returns_forecast") || [];
        const triggered = rf.filter((r) => r.returns > 0).map((r) => {
          L.act("SERVICENOW", "UPDATE_RMA", { sku: r.sku, qty: r.returns, op: "RETURN_TRIGGER" });
          return { sku: r.sku, returns: r.returns };
        });
        const ev = L.evidence(
          `Returns/RMA execution triggered for ${triggered.length} SKUs \u2014 closes the refurbish loop`,
          [{ name: "returns forecast", weight: 0.18 }, { name: "warranty/credit recovery", weight: 0.1 }]
        );
        L.explain(ev);
        return { triggered, evidence: ev };
      },
      exception_approval(L) {
        const moves = L.recall("moves") || [];
        const exceptions = moves.filter((m) => !m.autonomous);
        const ev = L.evidence(
          `Exception routing: ${exceptions.length} item(s) need human approval, rest auto-executed`,
          [{ name: "anomaly detection", weight: 0.16 }, { name: "tiered routing policy", weight: 0.1 }]
        );
        L.explain(ev);
        return { exceptions, evidence: ev };
      },
      /* ======================================================================
       * RMA EXECUTION — reverse-logistics disposition pipeline on one case.
       * 15 specialist agents in the overlay; one UNAI here. Mixes ML / VLM /
       * LLM / OPT / rules behind the same evidence + governance layers.
       * ==================================================================== */
      rma_intake(L) {
        const cases = L.perceive("SERVICENOW", "rma_case", {});
        const c = cases[0] || {};
        const raw = L.systems.SERVICENOW.query("rma_case", {})[0] || {};
        const rec = {
          rma_id: c.rma_id,
          sku: c.sku,
          warranty: c.warranty_status,
          claim_value: c.claim_value,
          entitled: c.entitlement,
          oem: c.oem,
          symptom: raw.u_symptom || ""
        };
        L.remember("rma", rec);
        const ev = L.evidence(
          `RMA intake parsed: ${rec.rma_id} (${rec.sku}) \u2014 \u201C${rec.symptom}\u201D`,
          [{ name: "Document AI extraction", weight: 0.22 }, { name: "CMDB match", weight: 0.1 }]
        );
        L.explain(ev);
        return { rma: rec, evidence: ev };
      },
      claims_terms(L) {
        const r = L.recall("rma") || {};
        const valid = r.warranty === "IN_WARRANTY" && r.entitled;
        const ev = L.evidence(
          `Claim & terms ${valid ? "validated" : "flagged (out-of-warranty / not entitled)"} for ${r.rma_id}`,
          [{ name: "policy validation", weight: valid ? 0.22 : 0.06 }, { name: "entitlement check", weight: 0.1 }]
        );
        L.explain(ev);
        L.remember("claim_valid", valid);
        return { valid, evidence: ev };
      },
      visual_inspection(L) {
        const r = L.recall("rma") || {};
        const grade = /no power|burn|crack/i.test(r.symptom) ? "C (damage visible)" : "A (cosmetic OK)";
        const ev = L.evidence(
          `VLM cosmetic grade: ${grade}`,
          [{ name: "vision damage grading", weight: 0.18 }, { name: "intake photos", weight: 0.08 }]
        );
        ev.explanationSource = "VLM";
        L.explain(ev);
        return { grade, evidence: ev };
      },
      triage_fault(L) {
        const r = L.recall("rma") || {};
        const cls = /xid|fall-off-bus/i.test(r.symptom) ? "GPU bus fault" : /power/i.test(r.symptom) ? "Power subsystem" : "General";
        L.remember("fault_class", cls);
        const ev = L.evidence(
          `Triage fault classification: ${cls}`,
          [{ name: "failure-mode classifier", weight: 0.2 }, { name: "case retrieval", weight: 0.08 }]
        );
        L.explain(ev);
        return { faultClass: cls, evidence: ev };
      },
      parametric_test(L) {
        const ev = L.evidence(
          `Electrical parametric test (ATE): spec violation detected on rail`,
          [{ name: "anomaly on ATE traces", weight: 0.18 }, { name: "spec-limit check", weight: 0.1 }]
        );
        L.explain(ev);
        return { evidence: ev };
      },
      failure_analysis(L) {
        const ev = L.evidence(
          `FA vision (SEM/X-ray): solder-joint void localized at BGA corner`,
          [{ name: "defect localization (VLM)", weight: 0.16 }, { name: "X-ray imagery", weight: 0.08 }]
        );
        ev.explanationSource = "VLM";
        L.explain(ev);
        return { evidence: ev };
      },
      root_cause(L) {
        const cls = L.recall("fault_class") || "fault";
        const ev = L.evidence(
          `Root cause identified via RAG over FA reports + KB: thermal-cycling fatigue (${cls})`,
          [{ name: "RAG over FA + KB", weight: 0.22 }, { name: "precedent cases", weight: 0.1 }]
        );
        L.explain(ev);
        return { evidence: ev };
      },
      repair_vs_replace(L) {
        const r = L.recall("rma") || {};
        const refurb = L.perceive("SAP_S4", "refurb", {});
        const stock = L.perceive("SAP_S4", "stock", {});
        const repairCost = (refurb[0] || {}).refurb_cost || 0;
        const residual = (stock.find((s) => s.sku === r.sku) || {}).unit_cost || 0;
        const decision = repairCost < residual * 0.6 ? "REPAIR" : "REPLACE";
        L.remember("disposition", decision);
        const ev = L.evidence(
          `Disposition: ${decision} (repair $${repairCost.toLocaleString()} vs residual $${residual.toLocaleString()})`,
          [{ name: "cost/residual-value optimization", weight: decision === "REPAIR" ? 0.22 : 0.18 }, { name: "yield expectation", weight: 0.08 }]
        );
        L.explain(ev);
        return { decision, repairCost, residual, evidence: ev };
      },
      work_order_schedule(L) {
        const r = L.recall("rma") || {};
        const decision = L.recall("disposition");
        if (decision !== "REPAIR") return { skipped: true };
        L.act("SAP_S4", "REPAIR_ORDER", { sku: r.sku, qty: 1, rma: r.rma_id });
        const ev = L.evidence(
          `Repair work order scheduled (capacitated MILP) for ${r.sku}`,
          [{ name: "capacitated scheduling", weight: 0.2 }, { name: "repair-cell availability", weight: 0.08 }]
        );
        L.explain(ev);
        return { evidence: ev };
      },
      rework_calibration(L) {
        const decision = L.recall("disposition");
        if (decision !== "REPAIR") return { skipped: true };
        const ev = L.evidence(
          `Vision-guided BGA reball + ML calibration to spec complete`,
          [{ name: "guided rework (VLM)", weight: 0.16 }, { name: "ML trim/calibration", weight: 0.1 }]
        );
        L.explain(ev);
        return { evidence: ev };
      },
      final_test(L) {
        const decision = L.recall("disposition");
        const pass = decision === "REPAIR";
        L.remember("final_pass", pass);
        const ev = L.evidence(
          `Final functional test: ${pass ? "PASS" : "n/a (replace path)"}`,
          [{ name: "anomaly + spec final disposition", weight: pass ? 0.2 : 0.06 }]
        );
        L.explain(ev);
        return { pass, evidence: ev };
      },
      disposition_escalation(L) {
        const valid = L.recall("claim_valid");
        const decision = L.recall("disposition");
        const ev = L.evidence(
          `Agentic disposition: ${decision}${valid ? "" : " \u2014 escalated (claim not auto-valid)"}`,
          [{ name: "failure summary", weight: 0.18 }, { name: "tiered routing", weight: valid ? 0.1 : 0.02 }]
        );
        if (!valid) {
          ev.autonomous = false;
          ev.gate = "claim not auto-validated \u2014 human review";
        }
        L.explain(ev);
        return { evidence: ev };
      },
      labeling_coc(L) {
        const r = L.recall("rma") || {};
        if (L.recall("disposition") !== "REPAIR") return { skipped: true };
        const coc = L.act("SAP_S4", "GOODS_ISSUE", { sku: r.sku, op: "RELABEL_COC" });
        const ev = L.evidence(
          `OCR-verified re-label + Certificate of Conformance generated`,
          [{ name: "OCR mark verification (VLM)", weight: 0.16 }, { name: "CoC policy", weight: 0.08 }]
        );
        L.explain(ev);
        return { coc, evidence: ev };
      },
      rma_close_loop(L) {
        const r = L.recall("rma") || {};
        const decision = L.recall("disposition");
        const valid = L.recall("claim_valid");
        const APPROVAL_LIMIT = 5e4;
        const value = r.claim_value || 0;
        const overLimit = value > APPROVAL_LIMIT;
        const ev = L.evidence(
          `Close loop: ${decision === "REPLACE" ? "issue replacement (pull spare from IBP plan)" : "restock good unit"} for ${r.rma_id} ($${value.toLocaleString()})`,
          [{ name: "warranty credit recovery", weight: valid ? 0.22 : 0.06 }, { name: "planning feedback", weight: 0.1 }]
        );
        ev.autonomous = ev.autonomous && valid && !overLimit;
        ev.gate = !valid ? "out-of-warranty \u2014 needs sign-off" : overLimit ? `value > $${APPROVAL_LIMIT.toLocaleString()}` : "within policy";
        L.explain(ev);
        let ref = "PENDING_APPROVAL";
        if (ev.autonomous) {
          ref = decision === "REPLACE" ? L.act("SERVICENOW", "ISSUE_REPLACEMENT", { sku: r.sku, rma: r.rma_id }).ref : L.act("SERVICENOW", "ISSUE_CREDIT", { sku: r.sku, rma: r.rma_id, amount: value }).ref;
        }
        return { rma: r.rma_id, decision, value, ref, autonomous: ev.autonomous, gate: ev.gate, explain: ev.explanation };
      },
      /* ======================================================================
       * DEMAND PLANNING — bespoke evidence (distinct drivers per capability)
       * ==================================================================== */
      statistical_forecast(L) {
        const f = L.perceive("ANALYTICS", "forecast", {});
        const total = f.reduce((a, x) => a + (x.forecast_qty || 0), 0);
        L.remember("baseline_fcst", f);
        const ev = L.evidence(
          `Statistical baseline forecast \u2014 ${f.length} series, ${total.toLocaleString()} units`,
          [{ name: "seasonality + trend fit", weight: 0.2 }, { name: `history depth (${f.length} series)`, weight: 0.08 }]
        );
        L.explain(ev);
        return { forecast: f, total, evidence: ev };
      },
      demand_sensing(L) {
        const demand = L.perceive("SAP_SD", "VBAP", {});
        const base = L.recall("baseline_fcst") || L.perceive("ANALYTICS", "forecast", {});
        const signal = demand.reduce((a, x) => a + (x.open_demand || 0), 0);
        const sensed = base.map((f) => {
          const d = demand.find((x) => x.sku === f.sku) || {};
          return { sku: f.sku, plant: f.plant, sensed: Math.round(0.75 * (f.forecast_qty || 0) + 0.25 * (d.open_demand || 0) * 1.1) };
        });
        L.remember("sensed", sensed);
        const ev = L.evidence(
          `Demand sensing vs live orders \u2014 ${signal.toLocaleString()} units of open demand`,
          [{ name: "live order signal", weight: 0.16 }, { name: "short-term elasticity", weight: 0.1 }]
        );
        L.explain(ev);
        return { sensed, signal, evidence: ev };
      },
      consensus_demand(L) {
        const dp = L.perceive("ANALYTICS", "demand_plan", {});
        const acc = dp.length ? dp.reduce((a, x) => a + (x.forecast_accuracy || 0), 0) / dp.length : 0;
        L.remember("consensus", dp);
        const ev = L.evidence(
          `Consensus demand reconciled \u2014 ${dp.length} SKUs, avg accuracy ${Math.round(acc * 100)}%`,
          [{ name: "planner consensus alignment", weight: 0.18 }, { name: `forecast accuracy ${Math.round(acc * 100)}%`, weight: +(acc * 0.12).toFixed(3) }]
        );
        if (acc < 0.75) {
          ev.autonomous = false;
          ev.gate = `avg accuracy ${Math.round(acc * 100)}% < 75% \u2014 planner sign-off`;
        }
        L.explain(ev);
        return { consensus: dp, accuracy: acc, evidence: ev };
      },
      promotions_uplift(L) {
        const dp = L.recall("consensus") || L.perceive("ANALYTICS", "demand_plan", {});
        const up = dp.length ? dp.reduce((a, x) => a + (x.promo_uplift || 0), 0) / dp.length : 0;
        const ev = L.evidence(
          `Promotions uplift modeled \u2014 avg +${Math.round(up * 100)}%`,
          [{ name: "promo price elasticity", weight: +(0.12 + up * 0.4).toFixed(3) }, { name: "cannibalization guardrail", weight: 0.08 }]
        );
        L.explain(ev);
        return { uplift: up, evidence: ev };
      },
      forecast_accuracy(L) {
        const dp = L.perceive("ANALYTICS", "demand_plan", {});
        const worst = dp.reduce((m, x) => Math.min(m, x.forecast_accuracy != null ? x.forecast_accuracy : 1), 1);
        const ev = L.evidence(
          `Forecast-accuracy tracking \u2014 worst SKU ${Math.round(worst * 100)}% (MAPE/bias)`,
          [{ name: "accuracy trend", weight: +(worst * 0.22).toFixed(3) }, { name: "bias correction", weight: 0.06 }]
        );
        if (worst < 0.75) {
          ev.autonomous = false;
          ev.gate = `SKU accuracy ${Math.round(worst * 100)}% < 75% \u2014 flag to planner`;
        }
        L.explain(ev);
        return { worst, evidence: ev };
      },
      /* ======================================================================
       * INVENTORY OPTIMIZATION — bespoke evidence
       * ==================================================================== */
      safety_stock_calc(L) {
        const stock = L.perceive("SAP_MM", "MARD", {});
        const avg = stock.length ? Math.round(stock.reduce((a, s) => a + (s.safety_stock || 0), 0) / stock.length) : 0;
        L.remember("ss_stock", stock);
        const ev = L.evidence(
          `Safety-stock sizing \u2014 ${stock.length} SKUs, avg buffer ${avg} units`,
          [{ name: "service-level target (95%)", weight: 0.2 }, { name: "demand + lead-time variability", weight: 0.1 }]
        );
        L.explain(ev);
        return { avgSafety: avg, evidence: ev };
      },
      reorder_policy(L) {
        const stock = L.recall("ss_stock") || L.perceive("SAP_MM", "MARD", {});
        const breaches = stock.filter((s) => (s.on_hand_qty || 0) <= (s.reorder_point || 0)).length;
        const ev = L.evidence(
          `Reorder policy \u2014 ${breaches}/${stock.length} SKUs at/below reorder point`,
          [{ name: "reorder-point vs lead-time demand", weight: 0.22 }, { name: "order-cost / EOQ balance", weight: 0.08 }]
        );
        L.explain(ev);
        return { breaches, evidence: ev };
      },
      multi_echelon_balance(L) {
        const tgt = L.perceive("SAP_IBP", "inv_target", {});
        const stock = L.perceive("SAP_S4", "stock", {});
        const moves = tgt.filter((t) => {
          const s = stock.find((x) => x.sku === t.sku) || {};
          return (s.on_hand_qty || 0) < (t.target_stock || 0);
        }).length;
        const ev = L.evidence(
          `Multi-echelon rebalance \u2014 ${moves} SKU(s) below target position`,
          [{ name: "echelon imbalance", weight: 0.18 }, { name: "holding-cost minimization", weight: 0.1 }]
        );
        if (moves > 0 && ev.autonomous) L.act("SAP_S4", "STOCK_TRANSFER", { sku: (tgt[0] || {}).sku, qty: 0 });
        L.explain(ev);
        return { moves, evidence: ev };
      },
      excess_obsolete(L) {
        const ih = L.perceive("ANALYTICS", "inv_health", {});
        const excess = ih.reduce((a, x) => a + (x.excess_qty || 0), 0);
        const ev = L.evidence(
          `Excess & obsolete scan \u2014 ${excess.toLocaleString()} units flagged`,
          [{ name: "excess exposure vs turns", weight: 0.16 }, { name: "write-down risk", weight: 0.08 }]
        );
        if (excess > 300) {
          ev.autonomous = false;
          ev.gate = `${excess.toLocaleString()} excess units > 300 \u2014 finance review before markdown`;
        }
        L.explain(ev);
        return { excess, evidence: ev };
      },
      inventory_turns(L) {
        const ih = L.perceive("ANALYTICS", "inv_health", {});
        const worst = ih.reduce((m, x) => Math.min(m, x.inv_turns != null ? x.inv_turns : 99), 99);
        const ev = L.evidence(
          `Inventory-turns tracking \u2014 worst ${worst.toFixed(1)}\xD7 vs 6\xD7 target`,
          [{ name: "turns vs target", weight: +Math.min(0.24, worst / 6 * 0.24).toFixed(3) }, { name: "working-capital impact", weight: 0.08 }]
        );
        if (worst < 4) {
          ev.autonomous = false;
          ev.gate = `turns ${worst.toFixed(1)}\xD7 < 4\xD7 \u2014 planner review`;
        }
        L.explain(ev);
        return { worst, evidence: ev };
      },
      /* ======================================================================
       * SUPPLY / S&OP PLANNING — bespoke evidence
       * ==================================================================== */
      supply_demand_balance(L) {
        const sp = L.perceive("SAP_IBP", "supply_plan", {});
        const fc = L.perceive("ANALYTICS", "forecast", {});
        const supply = sp.reduce((a, x) => a + (x.mps_qty || 0), 0);
        const demand = fc.reduce((a, x) => a + (x.forecast_qty || 0), 0);
        const gap = demand - supply;
        L.remember("sd_gap", gap);
        const ev = L.evidence(
          `Supply\u2013demand balance \u2014 supply ${supply.toLocaleString()} vs demand ${demand.toLocaleString()} (gap ${gap})`,
          [{ name: "net supply-demand gap", weight: +(gap <= 0 ? 0.24 : 0.12).toFixed(3) }, { name: "S&OP horizon coverage", weight: 0.08 }]
        );
        if (gap > 0) {
          ev.autonomous = false;
          ev.gate = `demand exceeds supply by ${gap} \u2014 S&OP escalation`;
        }
        L.explain(ev);
        return { gap, evidence: ev };
      },
      capacity_check(L) {
        const sp = L.perceive("SAP_IBP", "supply_plan", {});
        const head = sp.map((x) => (x.capacity_qty || 0) - (x.mps_qty || 0));
        const minHead = head.length ? Math.min(...head) : 0;
        const ev = L.evidence(
          `Capacity check \u2014 tightest headroom ${minHead} units`,
          [{ name: "capacity headroom", weight: +(minHead > 50 ? 0.22 : 0.1).toFixed(3) }, { name: "bottleneck resource load", weight: 0.08 }]
        );
        if (minHead <= 50) {
          ev.autonomous = false;
          ev.gate = `headroom ${minHead} \u2264 50 \u2014 capacity escalation`;
        }
        L.explain(ev);
        return { minHead, evidence: ev };
      },
      master_supply_plan(L) {
        const sp = L.perceive("SAP_IBP", "supply_plan", {});
        const mps = sp.reduce((a, x) => a + (x.mps_qty || 0), 0);
        const ev = L.evidence(
          `Master supply plan set \u2014 ${mps.toLocaleString()} units across ${sp.length} SKUs`,
          [{ name: "MPS feasibility vs capacity", weight: 0.2 }, { name: "time-phased balance", weight: 0.08 }]
        );
        L.explain(ev);
        return { mps, evidence: ev };
      },
      sourcing_allocation(L) {
        const sp = L.perceive("SAP_IBP", "supply_plan", {});
        const alloc = sp.reduce((a, x) => a + (x.allocation_qty || 0), 0);
        const ev = L.evidence(
          `Sourcing allocation \u2014 ${alloc.toLocaleString()} units allocated to sites/suppliers`,
          [{ name: "min-cost allocation", weight: 0.18 }, { name: "supplier capacity limits", weight: 0.1 }]
        );
        L.explain(ev);
        return { alloc, evidence: ev };
      },
      sop_reconcile(L) {
        const gap = L.recall("sd_gap");
        const ev = L.evidence(
          `S&OP reconciliation \u2014 ${gap == null ? "balanced" : gap > 0 ? "closing a " + gap + "-unit shortfall" : "supply covers demand"}`,
          [{ name: "consensus S&OP sign-off", weight: +(gap != null && gap > 0 ? 0.12 : 0.22).toFixed(3) }, { name: "financial reconciliation", weight: 0.08 }]
        );
        if (gap != null && gap > 0) {
          ev.autonomous = false;
          ev.gate = "open shortfall \u2014 exec S&OP approval";
        }
        L.explain(ev);
        return { evidence: ev };
      },
      /* ======================================================================
       * PROCUREMENT & SOURCING — bespoke evidence
       * ==================================================================== */
      spend_analysis(L) {
        const pr = L.perceive("ANALYTICS", "procurement", {});
        const spend = pr.reduce((a, x) => a + (x.spend_amount || 0), 0);
        const top = pr.slice().sort((a, b) => (b.spend_amount || 0) - (a.spend_amount || 0))[0] || {};
        const conc = spend ? Math.round(100 * (top.spend_amount || 0) / spend) : 0;
        L.remember("proc", pr);
        const ev = L.evidence(
          `Spend analysis \u2014 $${spend.toLocaleString()} total, top vendor ${conc}% concentration`,
          [{ name: "spend concentration", weight: +(conc > 60 ? 0.12 : 0.2).toFixed(3) }, { name: "tail-spend visibility", weight: 0.08 }]
        );
        L.explain(ev);
        return { spend, conc, evidence: ev };
      },
      supplier_scorecard(L) {
        const pr = L.recall("proc") || L.perceive("ANALYTICS", "procurement", {});
        const worst = pr.reduce((m, x) => Math.min(m, x.supplier_score != null ? x.supplier_score : 1), 1);
        const ev = L.evidence(
          `Supplier scorecard \u2014 lowest score ${Math.round(worst * 100)}%`,
          [{ name: "quality + OTD performance", weight: +(worst * 0.22).toFixed(3) }, { name: "risk & compliance", weight: 0.08 }]
        );
        if (worst < 0.85) {
          ev.autonomous = false;
          ev.gate = `supplier score ${Math.round(worst * 100)}% < 85% \u2014 sourcing review`;
        }
        L.explain(ev);
        return { worst, evidence: ev };
      },
      sourcing_award(L) {
        const pr = L.recall("proc") || L.perceive("ANALYTICS", "procurement", {});
        const best = pr.slice().sort((a, b) => (b.supplier_score || 0) - (a.supplier_score || 0))[0] || {};
        const ev = L.evidence(
          `Sourcing award \u2014 best supplier ${best.supplier || "n/a"} (score ${Math.round((best.supplier_score || 0) * 100)}%)`,
          [{ name: "total-cost-of-ownership", weight: 0.2 }, { name: "award-split risk", weight: 0.08 }]
        );
        if (ev.autonomous) L.act("SAP_MM", "PO_CREATE", { sku: best.sku, supplier: best.supplier, qty: 0 });
        L.explain(ev);
        return { supplier: best.supplier, evidence: ev };
      },
      contract_compliance(L) {
        const pr = L.recall("proc") || L.perceive("ANALYTICS", "procurement", {});
        const ev = L.evidence(
          `Contract compliance \u2014 ${pr.length} active suppliers checked vs contract terms`,
          [{ name: "on-contract coverage", weight: 0.18 }, { name: "price/rebate adherence", weight: 0.08 }]
        );
        L.explain(ev);
        return { evidence: ev };
      },
      po_automation(L) {
        const pr = L.recall("proc") || L.perceive("ANALYTICS", "procurement", {});
        const APPROVAL_LIMIT = 5e4;
        const top = pr.slice().sort((a, b) => (b.spend_amount || 0) - (a.spend_amount || 0))[0] || {};
        const value = Math.round(top.spend_amount || 0);
        const ev = L.evidence(
          `PO automation \u2014 raise PO for ${top.sku || "top SKU"} ($${value.toLocaleString()})`,
          [{ name: "replenishment need", weight: 0.24 }, { name: "budget availability", weight: 0.06 }]
        );
        const over = value > APPROVAL_LIMIT;
        ev.autonomous = ev.autonomous && !over;
        ev.gate = over ? `value $${value.toLocaleString()} > $${APPROVAL_LIMIT.toLocaleString()} approval limit` : "within approval limit";
        let ref = "PENDING_APPROVAL";
        if (ev.autonomous) ref = L.act("SAP_MM", "PO_CREATE", { sku: top.sku, supplier: top.supplier, qty: 0 }).EBELN;
        L.explain(ev);
        return { po: ref, value, evidence: ev };
      },
      /* ======================================================================
       * LOGISTICS & TRANSPORTATION — bespoke evidence
       * ==================================================================== */
      eta_prediction(L) {
        const lg = L.perceive("ANALYTICS", "logistics", {});
        const avg = lg.length ? Math.round(lg.reduce((a, x) => a + (x.transit_days || 0), 0) / lg.length) : 0;
        L.remember("lanes", lg);
        const ev = L.evidence(
          `ETA prediction \u2014 ${lg.length} lanes, avg transit ${avg}d`,
          [{ name: "transit-time model", weight: 0.2 }, { name: "port/customs signal", weight: 0.08 }]
        );
        L.explain(ev);
        return { avg, evidence: ev };
      },
      carrier_selection(L) {
        const lg = L.recall("lanes") || L.perceive("ANALYTICS", "logistics", {});
        const best = lg.slice().sort((a, b) => (b.otif || 0) - (a.otif || 0))[0] || {};
        const ev = L.evidence(
          `Carrier selection \u2014 best OTIF ${best.carrier || "n/a"} (${Math.round((best.otif || 0) * 100)}%)`,
          [{ name: "carrier OTIF reliability", weight: +((best.otif || 0) * 0.2).toFixed(3) }, { name: "rate vs service trade-off", weight: 0.1 }]
        );
        L.explain(ev);
        return { carrier: best.carrier, evidence: ev };
      },
      freight_optimization(L) {
        const lg = L.recall("lanes") || L.perceive("ANALYTICS", "logistics", {});
        const freight = lg.reduce((a, x) => a + (x.freight_cost || 0), 0);
        const ev = L.evidence(
          `Freight optimization \u2014 $${freight.toLocaleString()} spend, consolidation modeled`,
          [{ name: "load consolidation savings", weight: 0.18 }, { name: "mode-shift opportunity", weight: 0.1 }]
        );
        L.explain(ev);
        return { freight, evidence: ev };
      },
      otif_tracking(L) {
        const lg = L.recall("lanes") || L.perceive("ANALYTICS", "logistics", {});
        const worst = lg.reduce((m, x) => Math.min(m, x.otif != null ? x.otif : 1), 1);
        const ev = L.evidence(
          `OTIF tracking \u2014 lowest lane ${Math.round(worst * 100)}%`,
          [{ name: "on-time-in-full trend", weight: +(worst * 0.22).toFixed(3) }, { name: "SLA breach risk", weight: 0.08 }]
        );
        if (worst < 0.9) {
          ev.autonomous = false;
          ev.gate = `OTIF ${Math.round(worst * 100)}% < 90% \u2014 logistics review`;
        }
        L.explain(ev);
        return { worst, evidence: ev };
      },
      exception_management(L) {
        const lg = L.recall("lanes") || L.perceive("ANALYTICS", "logistics", {});
        const late = lg.filter((x) => (x.transit_days || 0) > 10);
        const ev = L.evidence(
          `Exception management \u2014 ${late.length} lane(s) predicted late (>10d)`,
          [{ name: "predicted ETA slip", weight: 0.16 }, { name: "expedite cost/benefit", weight: 0.1 }]
        );
        if (late.length && ev.autonomous) L.act("SAP_S4", "GOODS_ISSUE", { sku: (late[0] || {}).sku, op: "EXPEDITE" });
        L.explain(ev);
        return { late: late.length, evidence: ev };
      },
      /* ======================================================================
       * PRODUCTION / MANUFACTURING PLANNING — bespoke evidence
       * ==================================================================== */
      mps_generation(L) {
        const sp = L.perceive("SAP_IBP", "supply_plan", {});
        const mps = sp.reduce((a, x) => a + (x.mps_qty || 0), 0);
        const ev = L.evidence(
          `Master production schedule \u2014 ${mps.toLocaleString()} units planned`,
          [{ name: "MPS vs demand coverage", weight: 0.2 }, { name: "changeover minimization", weight: 0.08 }]
        );
        L.explain(ev);
        return { mps, evidence: ev };
      },
      capacity_leveling(L) {
        const sp = L.perceive("SAP_IBP", "supply_plan", {});
        const load = sp.map((x) => x.capacity_qty || 0 ? (x.mps_qty || 0) / (x.capacity_qty || 1) : 0);
        const peak = load.length ? Math.max(...load) : 0;
        const ev = L.evidence(
          `Capacity leveling \u2014 peak line load ${Math.round(peak * 100)}%`,
          [{ name: "load smoothing", weight: +(peak > 0.95 ? 0.12 : 0.2).toFixed(3) }, { name: "overtime avoidance", weight: 0.08 }]
        );
        if (peak > 0.95) {
          ev.autonomous = false;
          ev.gate = `peak load ${Math.round(peak * 100)}% > 95% \u2014 planner leveling`;
        }
        L.explain(ev);
        return { peak, evidence: ev };
      },
      work_order_release(L) {
        const wo = L.perceive("SAP_S4", "production", {});
        const ev = L.evidence(
          `Work-order release \u2014 ${wo.length} orders ready for the floor`,
          [{ name: "materials + capacity ready", weight: 0.22 }, { name: "schedule adherence", weight: 0.08 }]
        );
        if (wo.length && ev.autonomous) L.act("SAP_S4", "REPAIR_ORDER", { sku: (wo[0] || {}).sku, qty: 0, op: "WO_RELEASE" });
        L.explain(ev);
        return { released: wo.length, evidence: ev };
      },
      materials_availability(L) {
        const stock = L.perceive("SAP_MM", "MARD", {});
        const short = stock.filter((s) => (s.on_hand_qty || 0) < (s.safety_stock || 0));
        const ev = L.evidence(
          `Materials availability \u2014 ${short.length}/${stock.length} components below safety`,
          [{ name: "component coverage", weight: +(short.length ? 0.12 : 0.22).toFixed(3) }, { name: "supplier lead-time risk", weight: 0.08 }]
        );
        if (short.length) {
          ev.autonomous = false;
          ev.gate = `${short.length} component(s) short \u2014 expedite/approve before release`;
        }
        L.explain(ev);
        return { short: short.length, evidence: ev };
      },
      oee_tracking(L) {
        const pr = L.perceive("ANALYTICS", "production", {});
        const worst = pr.reduce((m, x) => Math.min(m, x.oee != null ? x.oee : 1), 1);
        const ev = L.evidence(
          `OEE tracking \u2014 lowest line ${Math.round(worst * 100)}%`,
          [{ name: "availability \xD7 performance \xD7 quality", weight: +(worst * 0.22).toFixed(3) }, { name: "downtime pattern", weight: 0.08 }]
        );
        if (worst < 0.8) {
          ev.autonomous = false;
          ev.gate = `OEE ${Math.round(worst * 100)}% < 80% \u2014 maintenance review`;
        }
        L.explain(ev);
        return { worst, evidence: ev };
      }
    };
    var PROBE_ENTITIES = {
      SAP_MM: ["MARD"],
      SAP_SD: ["VBAP"],
      SAP_FI: ["BSEG"],
      ANALYTICS: ["forecast", "supplier_risk", "demand_plan", "inv_health", "procurement", "logistics", "production", "spares_forecast", "failure_model", "returns_model"],
      SAP_IBP: ["inv_target", "demand_plan", "supply_plan", "install_base"],
      SAP_S4: ["stock", "production", "refurb"],
      SERVICENOW: ["rma_case"]
    };
    function cognitionUseCasePack(step) {
      return function(L) {
        const cog = typeof COGNITION !== "undefined" ? COGNITION : null;
        const key = (step.capability || "").replace(/^cap_/, "");
        const logic = cog && cog.useCaseLogic ? cog.useCaseLogic(key) : null;
        const needs = logic && logic.needs || [];
        let sys = (step.systems || []).filter((s) => L.systems[s]);
        if (!sys.length) sys = ["ANALYTICS"];
        sys.forEach((s) => {
          const ents = PROBE_ENTITIES[s] || ["_probe"];
          for (const e of ents) {
            try {
              if (L.perceive(s, e, {}).length) break;
            } catch (_) {
            }
          }
        });
        const decision = logic && logic.decision || (step.capability || "capability").replace(/_/g, " ");
        const drivers = needs.length ? needs.slice(0, 4).map((c, i) => ({ name: c.replace(/_/g, " "), weight: +(0.3 - i * 0.05).toFixed(2) })) : [{ name: "data grounding", weight: 0.2 }];
        const ev = L.evidence(decision, drivers);
        if (logic) {
          ev.method = logic.method;
          ev.module = logic.module;
          if (logic.formula) ev.formula = logic.formula;
        }
        L.explain(ev);
        return { evidence: ev };
      };
    }
    function genericToolPack(step) {
      return function(L) {
        let sys = (step.systems || []).filter((s) => L.systems[s]);
        if (!sys.length) sys = ["ANALYTICS"];
        sys.forEach((s) => {
          const ents = PROBE_ENTITIES[s] || ["_probe"];
          for (const e of ents) {
            try {
              if (L.perceive(s, e, {}).length) break;
            } catch (_) {
            }
          }
        });
        const name = (step.agentEquiv || step.capability || "capability").toString().replace(/_/g, " ");
        const isAct = /create|update|write|issue|send|post|place|raise|execute|reorder|replenish|transfer|credit|replace|notify/i.test(step.capability || "");
        const ev = L.evidence(name, [{ name: "policy signal", weight: 0.22 }, { name: "data grounding", weight: 0.1 }]);
        L.explain(ev);
        if (isAct && ev.autonomous) {
          try {
            L.act(sys[0], "GENERIC_ACTION", { sku: "\u2014" });
          } catch (e) {
          }
        }
        return { evidence: ev };
      };
    }
    var USE_CASES = {
      disruption_response: {
        name: "Supplier Disruption Response",
        description: "A port strike hits a key APAC supplier. Detect \u2192 re-forecast demand \u2192 rebalance inventory \u2192 raise replacement POs, fully autonomously, across SAP MM/SD/FI and an analytics store.",
        // In a Gen-1 world EACH of these is a separate specialist agent with its own 7 layers:
        gen1Agents: ["Disruption Response Agent", "Demand Forecasting Agent", "Inventory Optimization Agent", "Procurement Agent"],
        plan: [
          { capability: "disruption_detect", agentEquiv: "Disruption Response Agent", systems: ["ANALYTICS"] },
          { capability: "demand_reforecast", agentEquiv: "Demand Forecasting Agent", systems: ["ANALYTICS", "SAP_SD"] },
          { capability: "inventory_adjust", agentEquiv: "Inventory Optimization Agent", systems: ["SAP_MM"] },
          { capability: "procurement_act", agentEquiv: "Procurement Agent", systems: ["SAP_MM", "SAP_FI"] }
        ]
      },
      // Combined per explicit request: your real adk_spares_rma_demo app is ONE
      // orchestrator (root_agent) routing between spares planning and RMA — not
      // two separate apps — so UNAI models it here as one use case too, instead
      // of two that get added together after the fact. Gen-1 baseline still
      // carries the full 27-specialist hypothetical (12 spares + 15 RMA); the
      // real-ADK override in server.js's REAL_ADK_AGENTS replaces that with your
      // actual 5 real agents when ADK_SPARES_RMA_PATH is set.
      spares_rma_closed_loop: {
        name: "Spares Planning + RMA (closed loop)",
        description: "One orchestrator, two aftermarket workflows: spares planning (install-base failure \u2192 intermittent demand \u2192 returns/refurbish \u2192 multi-echelon target \u2192 net requirements \u2192 replenishment & execution) and RMA execution (intake \u2192 claim/terms \u2192 inspection \u2192 triage \u2192 parametric test \u2192 failure analysis \u2192 root cause \u2192 repair-vs-replace \u2192 work order \u2192 rework/calibration \u2192 final test \u2192 disposition \u2192 CoC \u2192 close the loop to planning). Mirrors the Bristlecone IBP overlay plus the RMA overlay \u2014 27 specialist agents between them \u2014 but one UNAI runs both across SAP IBP, S/4HANA, ServiceNow and the BQML feature store.",
        gen1Agents: [
          "Reliability & Failure-Rate Agent",
          "Spares Demand Forecast Agent",
          "Returns Realization Agent",
          "Returns Forecast Agent",
          "Variability & Lead-Time Agent",
          "Inventory Optimization Agent",
          "Refurbish Planning Agent",
          "Net Requirements Agent",
          "Replenishment & Rebalancing Agent",
          "Order Execution Agent",
          "Returns Execution Agent",
          "Exception & Approval Agent",
          "RMA Intake Agent",
          "Claims & Terms Agent",
          "Visual Inspection Agent",
          "Triage Agent",
          "Parametric Test Agent",
          "FA Vision Agent",
          "Root-Cause Agent",
          "Repair-vs-Replace Agent",
          "Work-Order Scheduling Agent",
          "Rework Guidance Agent",
          "Calibration Agent",
          "Final Test Agent",
          "Disposition & Escalation Agent",
          "Labeling & CoC Agent",
          "Returns & Credit Recovery Agent"
        ],
        plan: [
          { capability: "failure_rate_estimate", agentEquiv: "Reliability & Failure-Rate Agent", systems: ["ANALYTICS"] },
          { capability: "spares_demand_forecast", agentEquiv: "Spares Demand Forecast Agent", systems: ["ANALYTICS"] },
          { capability: "returns_realization", agentEquiv: "Returns Realization Agent", systems: ["ANALYTICS"] },
          { capability: "returns_forecast", agentEquiv: "Returns Forecast Agent", systems: ["ANALYTICS"] },
          { capability: "variability_leadtime", agentEquiv: "Variability & Lead-Time Agent", systems: ["ANALYTICS", "SAP_IBP"] },
          { capability: "inventory_optimization", agentEquiv: "Inventory Optimization Agent", systems: ["SAP_IBP", "SAP_S4"] },
          { capability: "refurbish_planning", agentEquiv: "Refurbish Planning Agent", systems: ["SAP_S4"] },
          { capability: "net_requirements", agentEquiv: "Net Requirements Agent", systems: ["SAP_IBP"] },
          { capability: "replenishment_rebalancing", agentEquiv: "Replenishment & Rebalancing Agent", systems: ["SAP_S4"] },
          { capability: "order_execution", agentEquiv: "Order Execution Agent", systems: ["SAP_S4"] },
          { capability: "returns_execution", agentEquiv: "Returns Execution Agent", systems: ["SERVICENOW"] },
          { capability: "exception_approval", agentEquiv: "Exception & Approval Agent", systems: ["SAP_S4"] },
          { capability: "rma_intake", agentEquiv: "RMA Intake Agent", systems: ["SERVICENOW"] },
          { capability: "claims_terms", agentEquiv: "Claims & Terms Agent", systems: ["SERVICENOW"] },
          { capability: "visual_inspection", agentEquiv: "Visual Inspection Agent", systems: ["SERVICENOW"] },
          { capability: "triage_fault", agentEquiv: "Triage Agent", systems: ["SERVICENOW"] },
          { capability: "parametric_test", agentEquiv: "Parametric Test Agent", systems: ["SERVICENOW"] },
          { capability: "failure_analysis", agentEquiv: "FA Vision Agent", systems: ["SERVICENOW"] },
          { capability: "root_cause", agentEquiv: "Root-Cause Agent", systems: ["SERVICENOW"] },
          { capability: "repair_vs_replace", agentEquiv: "Repair-vs-Replace Agent", systems: ["SAP_S4"] },
          { capability: "work_order_schedule", agentEquiv: "Work-Order Scheduling Agent", systems: ["SAP_S4"] },
          { capability: "rework_calibration", agentEquiv: "Rework Guidance Agent", systems: ["SAP_S4"] },
          { capability: "final_test", agentEquiv: "Final Test Agent", systems: ["SAP_S4"] },
          { capability: "disposition_escalation", agentEquiv: "Disposition & Escalation Agent", systems: ["SERVICENOW"] },
          { capability: "labeling_coc", agentEquiv: "Labeling & CoC Agent", systems: ["SAP_S4"] },
          { capability: "rma_close_loop", agentEquiv: "Returns & Credit Recovery Agent", systems: ["SERVICENOW", "SAP_IBP"] }
        ]
      },
      demand_planning: {
        name: "Demand Planning",
        description: "End-to-end demand plan: statistical baseline forecast \u2192 demand sensing against live orders \u2192 consensus demand \u2192 promotions uplift \u2192 forecast-accuracy tracking. Across the analytics/BQML store, SAP SD and SAP IBP \u2014 one UNAI instead of a forecasting mesh.",
        gen1Agents: ["Statistical Forecast Agent", "Demand Sensing Agent", "Consensus Demand Agent", "Promotions Uplift Agent", "Forecast Accuracy Agent"],
        plan: [
          { capability: "statistical_forecast", agentEquiv: "Statistical Forecast Agent", systems: ["ANALYTICS"] },
          { capability: "demand_sensing", agentEquiv: "Demand Sensing Agent", systems: ["ANALYTICS", "SAP_SD"] },
          { capability: "consensus_demand", agentEquiv: "Consensus Demand Agent", systems: ["ANALYTICS", "SAP_IBP"] },
          { capability: "promotions_uplift", agentEquiv: "Promotions Uplift Agent", systems: ["ANALYTICS"] },
          { capability: "forecast_accuracy", agentEquiv: "Forecast Accuracy Agent", systems: ["ANALYTICS"] }
        ]
      },
      inventory_optimization: {
        name: "Inventory Optimization",
        description: "Multi-echelon inventory optimization: safety-stock sizing \u2192 reorder policy \u2192 multi-echelon rebalancing \u2192 excess & obsolete detection \u2192 turns improvement. Across SAP MM, SAP IBP and the analytics store.",
        gen1Agents: ["Safety-Stock Agent", "Reorder Policy Agent", "Multi-Echelon Balancing Agent", "Excess & Obsolete Agent", "Inventory Turns Agent"],
        plan: [
          { capability: "safety_stock_calc", agentEquiv: "Safety-Stock Agent", systems: ["SAP_MM"] },
          { capability: "reorder_policy", agentEquiv: "Reorder Policy Agent", systems: ["SAP_MM"] },
          { capability: "multi_echelon_balance", agentEquiv: "Multi-Echelon Balancing Agent", systems: ["SAP_MM", "SAP_IBP"] },
          { capability: "excess_obsolete", agentEquiv: "Excess & Obsolete Agent", systems: ["ANALYTICS"] },
          { capability: "inventory_turns", agentEquiv: "Inventory Turns Agent", systems: ["ANALYTICS"] }
        ]
      },
      supply_planning: {
        name: "Supply / S&OP Planning",
        description: "Supply & S&OP planning: balance supply vs demand \u2192 capacity check \u2192 master supply plan \u2192 sourcing allocation \u2192 S&OP reconciliation. Across SAP IBP, SAP MM and the analytics store.",
        gen1Agents: ["Supply-Demand Balance Agent", "Capacity Agent", "Master Supply Plan Agent", "Sourcing Allocation Agent", "S&OP Reconciliation Agent"],
        plan: [
          { capability: "supply_demand_balance", agentEquiv: "Supply-Demand Balance Agent", systems: ["SAP_IBP", "ANALYTICS"] },
          { capability: "capacity_check", agentEquiv: "Capacity Agent", systems: ["SAP_IBP"] },
          { capability: "master_supply_plan", agentEquiv: "Master Supply Plan Agent", systems: ["SAP_IBP"] },
          { capability: "sourcing_allocation", agentEquiv: "Sourcing Allocation Agent", systems: ["SAP_IBP", "SAP_MM"] },
          { capability: "sop_reconcile", agentEquiv: "S&OP Reconciliation Agent", systems: ["SAP_IBP"] }
        ]
      },
      procurement_sourcing: {
        name: "Procurement & Sourcing",
        description: "Source-to-pay intelligence: spend analysis \u2192 supplier scorecarding \u2192 sourcing award \u2192 contract compliance \u2192 PO automation. Across the analytics store, SAP MM and SAP FI.",
        gen1Agents: ["Spend Analysis Agent", "Supplier Scorecard Agent", "Sourcing Award Agent", "Contract Compliance Agent", "PO Automation Agent"],
        plan: [
          { capability: "spend_analysis", agentEquiv: "Spend Analysis Agent", systems: ["ANALYTICS", "SAP_FI"] },
          { capability: "supplier_scorecard", agentEquiv: "Supplier Scorecard Agent", systems: ["ANALYTICS"] },
          { capability: "sourcing_award", agentEquiv: "Sourcing Award Agent", systems: ["SAP_MM"] },
          { capability: "contract_compliance", agentEquiv: "Contract Compliance Agent", systems: ["SAP_MM"] },
          { capability: "po_automation", agentEquiv: "PO Automation Agent", systems: ["SAP_MM"] }
        ]
      },
      logistics_transportation: {
        name: "Logistics & Transportation",
        description: "In-transit visibility & transportation planning: ETA prediction \u2192 carrier selection \u2192 freight optimization \u2192 OTIF tracking \u2192 exception management. Across the analytics store and SAP S/4HANA.",
        gen1Agents: ["ETA Prediction Agent", "Carrier Selection Agent", "Freight Optimization Agent", "OTIF Tracking Agent", "Exception Management Agent"],
        plan: [
          { capability: "eta_prediction", agentEquiv: "ETA Prediction Agent", systems: ["ANALYTICS"] },
          { capability: "carrier_selection", agentEquiv: "Carrier Selection Agent", systems: ["ANALYTICS"] },
          { capability: "freight_optimization", agentEquiv: "Freight Optimization Agent", systems: ["ANALYTICS"] },
          { capability: "otif_tracking", agentEquiv: "OTIF Tracking Agent", systems: ["ANALYTICS"] },
          { capability: "exception_management", agentEquiv: "Exception Management Agent", systems: ["SAP_S4"] }
        ]
      },
      production_planning: {
        name: "Production / Manufacturing Planning",
        description: "Make-plan execution: master production schedule \u2192 capacity leveling \u2192 work-order release \u2192 materials availability \u2192 OEE tracking. Across SAP IBP, SAP S/4HANA, SAP MM and the analytics store.",
        gen1Agents: ["MPS Agent", "Capacity Leveling Agent", "Work-Order Release Agent", "Materials Availability Agent", "OEE Tracking Agent"],
        plan: [
          { capability: "mps_generation", agentEquiv: "MPS Agent", systems: ["SAP_IBP"] },
          { capability: "capacity_leveling", agentEquiv: "Capacity Leveling Agent", systems: ["SAP_IBP"] },
          { capability: "work_order_release", agentEquiv: "Work-Order Release Agent", systems: ["SAP_S4"] },
          { capability: "materials_availability", agentEquiv: "Materials Availability Agent", systems: ["SAP_MM"] },
          { capability: "oee_tracking", agentEquiv: "OEE Tracking Agent", systems: ["ANALYTICS"] }
        ]
      }
    };
    var UNAI = class {
      constructor(config = {}) {
        this.config = Object.assign({
          name: "Universal UNAI",
          enabledLayers: ["Perception", "Memory", "Reasoning", "Evidence", "Action", "Collaboration", "Explainability"]
        }, config);
        this.traceLog = [];
        this.trace = (layer, msg, data) => this.traceLog.push({ t: Date.now(), layer, msg, data });
      }
      // `injectedSystems` (optional) lets a host (e.g. the SQLite server) supply
      // live/db-backed adapters. Default = in-memory adapters defined above.
      // Accepts a use-case KEY (string) or a goal OBJECT directly (e.g. an Agent
      // Foundry manifest turned into a plan) so published/converted agents can run.
      run(useCaseKey, injectedSystems) {
        const goal = typeof useCaseKey === "string" ? USE_CASES[useCaseKey] : useCaseKey;
        this.traceLog = [];
        const mapper = new OntologyMapper(ONTOLOGY);
        const defaults = {
          SAP_MM: new SAP_MM_Adapter(),
          SAP_SD: new SAP_SD_Adapter(),
          SAP_FI: new SAP_FI_Adapter(),
          ANALYTICS: new Analytics_Adapter(),
          SAP_IBP: new SAP_IBP_Adapter(),
          SAP_S4: new SAP_S4_Adapter(),
          SERVICENOW: new ServiceNow_Adapter()
        };
        const systems = Object.assign(defaults, injectedSystems || {});
        const scenario = this.config.scenario;
        if (scenario && Object.keys(scenario).length) {
          Object.keys(systems).forEach((sysId) => {
            const real = systems[sysId];
            systems[sysId] = {
              get calls() {
                return real.calls;
              },
              query(entity, filter) {
                const rows = real.query(entity, filter);
                if (rows && rows.length) {
                  Object.keys(scenario).forEach((concept) => {
                    const field = mapper.fieldFor(sysId, concept);
                    if (field) rows[0][field] = scenario[concept];
                  });
                }
                return rows;
              },
              write(op, payload) {
                return real.write(op, payload);
              }
            };
          });
        }
        const memory = {};
        const metrics = { actions: 0, contextSwitches: 0 };
        const bus = new A2ABus(this.trace);
        const L = new Layers(systems, mapper, memory, metrics, this.trace);
        const t0 = Date.now();
        const plan = L.reason(goal);
        const results = {};
        const systemsTouched = /* @__PURE__ */ new Set();
        plan.forEach((step) => {
          L.collaborate(step.capability, this.config.name);
          bus.publish(step.capability, { from: this.config.name }, "Orchestrator");
          const cog = typeof COGNITION !== "undefined" ? COGNITION : null;
          const cogKey = /^cap_/.test(step.capability || "") ? (step.capability || "").replace(/^cap_/, "") : null;
          const isCog = cog && cog.USE_CASE_NEEDS && cogKey && cog.USE_CASE_NEEDS[cogKey];
          const handler = TOOL_PACKS[step.capability] || (isCog ? cognitionUseCasePack(step) : genericToolPack(step));
          results[step.capability] = handler(L, results);
          (step.systems || []).forEach((s) => systemsTouched.add(s));
        });
        const elapsed = Date.now() - t0;
        const layersShared = 7;
        const capabilities = plan.length;
        const gen1AgentCount = goal.gen1Agents.length;
        const gen1LayerImpls = gen1AgentCount * layersShared;
        const gen2LayerImpls = layersShared + capabilities;
        const agentsActuallyUsed = 1;
        const systemTransitions = metrics.contextSwitches;
        const naiveContextSwitches = systemTransitions;
        const actualContextSwitches = 0;
        const LAYER_DEFS = [
          ["Perception", "Reads any ERP schema into canonical form via the ontology"],
          ["Memory", "Unified episodic + semantic store shared across capabilities"],
          ["Reasoning", "Decomposes the goal into sub-tasks at runtime"],
          ["Evidence", "Confidence, attribution, uncertainty bounds + counterfactual"],
          ["Action", "Universal SAP BAPI/OData action bus (canonical \u2192 native)"],
          ["Collaboration", "A2A pub/sub event bus \u2014 topics, not point-to-point wiring"],
          ["Explainability", "Plain-English rationale + full audit trail"]
        ];
        const layerActivity = LAYER_DEFS.map(([name, role], i) => ({
          id: `L${i + 1}`,
          name,
          role,
          invocations: L.activity[name].n,
          ms: +L.activity[name].ms.toFixed(3),
          sample: L.activity[name].last,
          active: L.activity[name].n > 0
        }));
        const totalLayerMs = layerActivity.reduce((a, l) => a + l.ms, 0) || 1;
        const decisions = L.evidenceLog.length;
        const autonomousDecisions = L.evidenceLog.filter((e) => e.autonomous).length;
        const systemCalls = {};
        Object.keys(systems).forEach((k) => {
          systemCalls[k] = systems[k].calls || 0;
        });
        const A = L.activity;
        const modelCalls = A.Reasoning.n + A.Explainability.n;
        const R = {
          ontologyBlock: 1200,
          ctxPerRead: 300,
          cachedRead: 10,
          planIn: 1500,
          planOut: 200,
          evIn: 150,
          evOut: 80,
          exIn: 120,
          exOut: 60,
          memIn: 20
        };
        const firstReads = L.firstReads, cacheHits = L.cacheHits;
        const nAgents = gen1AgentCount || capabilities || 1;
        const memIn = A.Memory.n * R.memIn;
        const evIn = A.Evidence.n * R.evIn, evOut = A.Evidence.n * R.evOut;
        const exIn = A.Explainability.n * R.exIn, exOut = A.Explainability.n * R.exOut;
        const thinIn = evIn + exIn + memIn, thinOut = evOut + exOut;
        const PD = !(this.config && this.config.progressiveDisclosure === false);
        const ontologyFull = R.ontologyBlock;
        const ontologyServed = PD ? 180 + firstReads * 60 : ontologyFull;
        const baseIn = ontologyServed + R.planIn, baseOut = R.planOut;
        const naiveBaseIn = ontologyFull + R.planIn;
        const tokIn = baseIn + firstReads * R.ctxPerRead + cacheHits * R.cachedRead + thinIn;
        const tokOut = baseOut + thinOut;
        const tokTotal = tokIn + tokOut;
        const naiveIn = nAgents * naiveBaseIn + (firstReads + cacheHits) * R.ctxPerRead + thinIn;
        const naiveOut = nAgents * baseOut + thinOut;
        const naiveTotal = naiveIn + naiveOut;
        const savedTokens = naiveTotal - tokTotal;
        const savedPct = naiveTotal ? Math.round(100 * savedTokens / naiveTotal) : 0;
        const estCost = +(tokIn / 1e6 * 0.2 + tokOut / 1e6 * 0.6).toFixed(5);
        const estCostNaive = +(naiveIn / 1e6 * 0.2 + naiveOut / 1e6 * 0.6).toFixed(5);
        const layerTokens = [
          { name: "Perception", in: ontologyServed + firstReads * R.ctxPerRead + cacheHits * R.cachedRead, out: 0 },
          { name: "Memory", in: memIn, out: 0 },
          { name: "Reasoning", in: R.planIn, out: R.planOut },
          { name: "Evidence", in: evIn, out: evOut },
          { name: "Action", in: 0, out: 0 },
          { name: "Collaboration", in: 0, out: 0 },
          { name: "Explainability", in: exIn, out: exOut }
        ].map((x) => ({ ...x, total: x.in + x.out }));
        const layerTokensReal = Object.keys(L.realTokens).map((name) => {
          const r = L.realTokens[name];
          return { name, in: r.in, out: r.out, total: r.in + r.out };
        });
        const explainEntriesReal = L.explainEntriesReal;
        const tokenTrace = [{
          layer: "Perception",
          id: "L1",
          step: 0,
          msg: `Ontology context served (${PD ? "progressive disclosure \u2014 lean, scoped registry" : "full schema dump"}), paid once for this goal`,
          tokensIn: ontologyServed,
          tokensOut: 0
        }];
        this.traceLog.forEach((e, i) => {
          if (e.layer === "Perception") {
            const cached = /reuse cached/.test(e.msg);
            tokenTrace.push({
              layer: "Perception",
              id: "L1",
              step: i + 1,
              msg: cached ? `${e.msg} \u2014 cache hit, reused` : `${e.msg} \u2014 first read, cached for reuse`,
              tokensIn: cached ? R.cachedRead : R.ctxPerRead,
              tokensOut: 0
            });
          } else if (e.layer === "Memory") {
            tokenTrace.push({ layer: "Memory", id: "L2", step: i + 1, msg: e.msg, tokensIn: R.memIn, tokensOut: 0 });
          } else if (e.layer === "Reasoning") {
            tokenTrace.push({
              layer: "Reasoning",
              id: "L3",
              step: i + 1,
              msg: `${e.msg} \u2014 goal-decomposition plan, paid once for the whole run`,
              tokensIn: R.planIn,
              tokensOut: R.planOut
            });
          } else if (e.layer === "Evidence") {
            tokenTrace.push({ layer: "Evidence", id: "L4", step: i + 1, msg: e.msg, tokensIn: R.evIn, tokensOut: R.evOut });
          } else if (e.layer === "Explainability") {
            tokenTrace.push({ layer: "Explainability", id: "L7", step: i + 1, msg: e.msg, tokensIn: R.exIn, tokensOut: R.exOut });
          } else if (e.layer === "Action") {
            tokenTrace.push({ layer: "Action", id: "L5", step: i + 1, msg: `${e.msg} \u2014 write-only, no model call`, tokensIn: 0, tokensOut: 0 });
          } else if (e.layer === "A2A") {
            tokenTrace.push({ layer: "Collaboration", id: "L6", step: i + 1, msg: `${e.msg} \u2014 route-only, no model call`, tokensIn: 0, tokensOut: 0 });
          }
        });
        const tokenRates = {
          ctxPerRead: R.ctxPerRead,
          cachedRead: R.cachedRead,
          planIn: R.planIn,
          planOut: R.planOut,
          evIn: R.evIn,
          evOut: R.evOut,
          exIn: R.exIn,
          exOut: R.exOut,
          memIn: R.memIn,
          ontologyServed
        };
        const domainsSpanned = systemsTouched.size;
        const layersFired = layerActivity.filter((l) => l.active).length;
        const complexityTier = capabilities >= 6 || domainsSpanned >= 3 ? "complex" : capabilities <= 2 && domainsSpanned <= 1 ? "simple" : "medium";
        const tierLayerBudget = { simple: 4, medium: 6, complex: 7 }[complexityTier];
        const router = {
          tier: complexityTier,
          capabilities,
          domainsSpanned,
          layersConsidered: 7,
          layersFired,
          // measured this run
          layerBudget: tierLayerBudget,
          // ceiling the tier permits
          activeLayers: layerActivity.filter((l) => l.active).map((l) => l.name),
          rationale: `${capabilities} executor(s) across ${domainsSpanned} domain(s) \u2192 ${complexityTier} tier (\u2264${tierLayerBudget} cognitive layers)`
        };
        const S = layersFired, N = nAgents;
        const opsModel = {
          S,
          N,
          unaiOps: S + N,
          baselineOps: N * S,
          opsReductionPct: N * S ? Math.round(100 * (1 - (S + N) / (N * S))) : 0,
          unaiReads: firstReads,
          // each source read once by the shared runtime
          cachedReuse: cacheHits,
          // later needs served from cache
          baselineReads: nAgents * (firstReads + cacheHits),
          // each agent re-fetches everything
          readsReductionPct: nAgents * (firstReads + cacheHits) ? Math.round(100 * (1 - firstReads / (nAgents * (firstReads + cacheHits)))) : 0
        };
        const crossLlm = MODEL_PRICING.map((m) => {
          const unaiCostUsd = +(tokIn / 1e6 * m.in + tokOut / 1e6 * m.out).toFixed(6);
          const baselineCostUsd = +(naiveIn / 1e6 * m.in + naiveOut / 1e6 * m.out).toFixed(6);
          return {
            model: m.name,
            inRate: m.in,
            outRate: m.out,
            unaiCostUsd,
            baselineCostUsd,
            savedCostUsd: +(baselineCostUsd - unaiCostUsd).toFixed(6),
            savedPct: baselineCostUsd ? Math.round(100 * (baselineCostUsd - unaiCostUsd) / baselineCostUsd) : 0
          };
        });
        const perAgentContext = Math.round((firstReads + cacheHits) * R.ctxPerRead / (nAgents || 1));
        const perAgentThin = Math.round((thinIn + thinOut) / (nAgents || 1));
        const agentNames = goal.gen1Agents && goal.gen1Agents.length ? goal.gen1Agents : null;
        const baselineAgents = Array.from({ length: nAgents }, (_, i) => {
          const cognitionTokens = naiveBaseIn + baseOut;
          return {
            agent: agentNames ? agentNames[i % agentNames.length] : `Specialist ${i + 1}`,
            cognitionTokens,
            contextTokens: perAgentContext,
            thinTokens: perAgentThin,
            totalTokens: cognitionTokens + perAgentContext + perAgentThin
          };
        });
        const benchmark = {
          modeled: true,
          method: "Both paths itemized with the same modeled token rates. For live numbers, run token_benchmark.py against an OpenAI-compatible endpoint \u2014 it reports Gen-1 vs UNAI vs UNAI+caching from the API's own prompt_tokens/completion_tokens.",
          unai: { path: "S+N \u2014 shared cognition once, N thin executors", tokensIn: tokIn, tokensOut: tokOut, tokensTotal: tokTotal, ops: S + N },
          baseline: { path: "N\xD7S \u2014 every agent reloads cognition", tokensIn: naiveIn, tokensOut: naiveOut, tokensTotal: naiveTotal, ops: N * S, agents: baselineAgents },
          savedTokens,
          savedPct
        };
        const confs = L.evidenceLog.map((e) => e.confidence);
        const sec = (elapsed || 1) / 1e3;
        const perLayer = layerActivity.map((l) => ({
          id: l.id,
          name: l.name,
          invocations: l.invocations,
          ms: l.ms,
          avgMs: l.invocations ? +(l.ms / l.invocations).toFixed(3) : 0,
          sharePct: Math.round(100 * l.ms / totalLayerMs)
        }));
        const observability = {
          // --- latency & throughput ---
          totalMs: +totalLayerMs.toFixed(3),
          wallMs: elapsed,
          throughputPerSec: +(decisions / sec).toFixed(1),
          layers: perLayer,
          // --- model / token economics (SHARED COGNITIVE RUNTIME, modeled) ---
          modelCalls,
          tokensIn: tokIn,
          tokensOut: tokOut,
          tokensTotal: tokTotal,
          estCostUsd: estCost,
          layerTokens,
          // per-layer breakdown (sums to tokensTotal)
          layerTokensReal,
          // REAL per-layer breakdown (BPE-tokenized actual data, not modeled rates)
          explainEntriesReal,
          // per-decision entries for layerTokensReal.Explainability — upgradeable to a live LLM measurement
          tokenTrace,
          // per-invocation breakdown (sums to layerTokens)
          tokenRates,
          // the rates applied, for the explainability legend
          // shared-runtime vs naive per-agent baseline — the upgrade savings story
          tokenModel: {
            runtimeTotal: tokTotal,
            naiveTotal,
            savedTokens,
            savedPct,
            runtimeCostUsd: estCost,
            naiveCostUsd: estCostNaive,
            savedCostUsd: +(estCostNaive - estCost).toFixed(5),
            cognitionBaseTokens: baseIn + baseOut,
            nAgents,
            contextReadsOnce: firstReads,
            reuseAvoided: cacheHits
          },
          // shared-cognition telemetry
          cognition: {
            firstReads,
            cacheHits,
            reuseAvoided: cacheHits,
            planOnce: A.Reasoning.n,
            executors: capabilities,
            nAgents,
            savedTokens,
            savedPct
          },
          // --- APEX-derived: router · operations · cross-LLM · benchmark ---
          router,
          // complexity tier + minimum-sufficient layers
          opsModel,
          // S+N vs N×S + 1-read-vs-N
          crossLlm,
          // same tokens, five price sheets
          benchmark,
          // both paths itemized (auditable)
          progressiveDisclosure: {
            enabled: PD,
            fullOntologyTokens: ontologyFull,
            servedTokens: ontologyServed,
            savedTokens: Math.max(0, ontologyFull - ontologyServed)
          },
          // lean registry vs schema-dump
          cacheHitRatePct: firstReads + cacheHits ? Math.round(100 * cacheHits / (firstReads + cacheHits)) : 0,
          // --- data access ---
          systemCalls,
          totalSystemCalls: Object.values(systemCalls).reduce((a, b) => a + b, 0),
          a2aMessages: bus.messages,
          ontologyTranslations: mapper.translations,
          systemTransitions,
          schemaRemaps: 0,
          // --- decisions / autonomy ---
          decisions,
          autonomousDecisions,
          humanGatedDecisions: decisions - autonomousDecisions,
          autonomyRatePct: decisions ? Math.round(100 * autonomousDecisions / decisions) : 0,
          avgConfidence: decisions ? +(confs.reduce((a, b) => a + b, 0) / decisions).toFixed(2) : 0,
          minConfidence: confs.length ? Math.min(...confs) : 0,
          maxConfidence: confs.length ? Math.max(...confs) : 0,
          actionsExecuted: metrics.actions,
          // --- governance / reliability ---
          guardrailInputChecks: A.Perception.n,
          // every read is screened
          guardrailActionChecks: decisions,
          // every action is gated
          guardrailGated: decisions - autonomousDecisions,
          errors: 0,
          retries: 0,
          auditTrail: L.auditTrail,
          // --- three-layer agent observability (autonomy · LLM · system) ---
          agentOps: {
            trajectorySteps: capabilities,
            // reasoning/tool steps per task
            toolCalls: Object.values(systemCalls).reduce((a, b) => a + b, 0) + metrics.actions,
            loopRatePct: 0,
            // deterministic here; circuit-breaker below
            circuitBreakerMaxSteps: 25,
            // hard stop → escalate if exceeded
            taskSuccessPct: 100,
            // run completed within step limit
            toolErrors: 0,
            toolErrorRatePct: 0,
            turnLatencyMs: elapsed,
            // Think → Act → Observe
            ttftMs: null,
            // planned: needs a streaming gateway
            escalations: decisions - autonomousDecisions,
            // graceful human hand-offs
            hitlPendingMs: null
            // planned: approval-queue timing
          }
        };
        return {
          useCase: goal,
          config: this.config,
          trace: this.traceLog,
          results,
          systemsTouched: [...systemsTouched],
          layerActivity,
          evidence: L.evidenceLog,
          observability,
          metrics: {
            elapsedMs: elapsed,
            ontologyTranslations: mapper.translations,
            a2aMessages: bus.messages,
            actionsExecuted: metrics.actions,
            // agent substitution
            gen1AgentCount,
            agentsActuallyUsed,
            agentsSubstituted: gen1AgentCount - agentsActuallyUsed,
            substitutionRatio: `${gen1AgentCount}:${agentsActuallyUsed}`,
            // complexity
            gen1LayerImpls,
            gen2LayerImpls,
            layerComplexityReductionPct: Math.round((1 - gen2LayerImpls / gen1LayerImpls) * 100),
            // context switching (re-mapping cost, not raw transitions)
            systemTransitions,
            naiveContextSwitches,
            // Gen-1 schema re-maps required
            actualContextSwitches,
            // Gen-2 schema re-maps required
            contextSwitchReductionPct: naiveContextSwitches ? Math.round((1 - actualContextSwitches / naiveContextSwitches) * 100) : 0,
            systemsOfRecord: [...systemsTouched].length
          }
        };
      }
      // Gen-1: every time an agent touches a system it must load+map that system's
      // schema itself => one "switch" per (capability × system) pair.
      _naiveSwitches(plan) {
        return plan.reduce((a, s) => a + s.systems.length, 0);
      }
    };
    var _mread = (L, sys, ent) => {
      try {
        return L.perceive(sys, ent, {}) || [];
      } catch (e) {
        return [];
      }
    };
    Object.assign(TOOL_PACKS, {
      // --- Statistical Forecasting ---
      sf_sales_history(L) {
        const h = _mread(L, "ANALYTICS", "forecast");
        L.remember("sf_hist", h.length || 128);
        const ev = L.evidence(
          `Ingested sales history for ${h.length || 128} forecastable SKUs across IBP demand groups (POS + depletion)`,
          [{ name: "historical sales depth", weight: 0.16 }, { name: "POS + depletion history", weight: 0.12 }, { name: "SKU-hierarchy coverage", weight: 0.08 }]
        );
        L.explain(ev);
        return { evidence: ev };
      },
      sf_demand_drivers(L) {
        const n = L.recall("sf_hist") || 128;
        const ev = L.evidence(
          `Assembled 8 demand drivers for ${n} SKUs (price elasticity, promo calendar, weather, sporting events, competitor activity)`,
          [{ name: "price elasticity", weight: 0.14 }, { name: "promotions", weight: 0.13 }, { name: "weather & events", weight: 0.1 }, { name: "competitor activity", weight: 0.08 }]
        );
        L.explain(ev);
        return { evidence: ev };
      },
      sf_generate(L) {
        const n = L.recall("sf_hist") || 128;
        const ev = L.evidence(
          `Generated statistical forecast for ${n} SKUs (multi-driver regression + seasonality & trend)`,
          [{ name: "model fit (R\xB2)", weight: 0.18 }, { name: "seasonality", weight: 0.1 }, { name: "trend", weight: 0.08 }]
        );
        L.explain(ev);
        return { evidence: ev };
      },
      sf_accuracy_bias(L) {
        const ev = L.evidence(
          `Forecast accuracy 87% \xB7 bias +2.4% \xB7 confidence score 0.91 \xB7 range \xB19% (best/worst case)`,
          [{ name: "accuracy %", weight: 0.2 }, { name: "bias %", weight: 0.1 }, { name: "confidence score", weight: 0.12 }, { name: "forecast range", weight: 0.06 }]
        );
        L.explain(ev);
        return { evidence: ev };
      },
      sf_driver_contribution(L) {
        const ev = L.evidence(
          `Driver contribution: base +75%, promotions +14% lift, weather +6%, sporting events +5% \u2014 explainable to planners`,
          [{ name: "promo lift", weight: 0.16 }, { name: "weather contribution", weight: 0.08 }, { name: "event contribution", weight: 0.07 }, { name: "baseline", weight: 0.05 }]
        );
        L.explain(ev);
        return { evidence: ev };
      },
      // --- Forecast Cannibalization ---
      cb_baseline_expected(L) {
        const s = _mread(L, "ANALYTICS", "forecast");
        L.remember("cb_ei", 1e5);
        const ev = L.evidence(
          `Modeled expected sales Ei without the launch for ${s.length || 96} affected SKUs (pre-launch baseline + trend)`,
          [{ name: "pre-launch baseline", weight: 0.16 }, { name: "trend", weight: 0.09 }, { name: "seasonality", weight: 0.07 }]
        );
        L.explain(ev);
        return { evidence: ev };
      },
      cb_launch_actuals(L) {
        L.remember("cb_ai", 82e3);
        L.remember("cb_new", 3e4);
        const ev = L.evidence(
          `Captured post-launch actuals Ai and new-SKU sales N = 30,000 units across markets`,
          [{ name: "actual sales Ai", weight: 0.15 }, { name: "new-SKU sales N", weight: 0.12 }, { name: "distribution coverage", weight: 0.07 }]
        );
        L.explain(ev);
        return { evidence: ev };
      },
      cb_cannibalization_split(L) {
        const Ei = L.recall("cb_ei") || 1e5, Ai = L.recall("cb_ai") || 82e3, N = L.recall("cb_new") || 3e4;
        const TC = Math.max(0, Ei - Ai), IV = N - TC, cp = Math.round(100 * TC / N), ip = Math.round(100 * IV / N);
        L.remember("cb_TC", TC);
        L.remember("cb_IV", IV);
        const ev = L.evidence(
          `Cannibalized ${TC.toLocaleString()} units (${cp}%) \xB7 incremental ${IV.toLocaleString()} units (${ip}%) of the ${N.toLocaleString()}-unit launch`,
          [{ name: "lost sales Li = max(0, Ei\u2212Ai)", weight: 0.2 }, { name: "cannibalization %", weight: 0.12 }, { name: "incremental %", weight: 0.12 }]
        );
        L.explain(ev);
        return { evidence: ev };
      },
      cb_portfolio_market(L) {
        const TC = L.recall("cb_TC") || 18e3;
        const ev = L.evidence(
          `Portfolio impact resolved by product family; ~${Math.round(TC / 3).toLocaleString()} units cannibalized in the top geography (source-SKU attribution ready)`,
          [{ name: "portfolio mix \u03A3IVp", weight: 0.14 }, { name: "geography TCM/NM", weight: 0.11 }, { name: "source-SKU attribution", weight: 0.08 }]
        );
        L.explain(ev);
        return { evidence: ev };
      },
      cb_financial_roi(L) {
        const TC = L.recall("cb_TC") || 18e3, IV = L.recall("cb_IV") || 12e3, price = 3.2, margin = 0.42, invest = 1e4;
        const trc = Math.round(TC * price), incRev = Math.round(IV * price), profit = Math.round(incRev * margin), roi = Math.round(100 * (profit - invest) / invest);
        const ev = L.evidence(
          `Revenue cannibalized $${trc.toLocaleString()} \xB7 incremental revenue $${incRev.toLocaleString()} \xB7 incremental profit $${profit.toLocaleString()} \xB7 launch ROI ${roi}%`,
          [{ name: "net selling price", weight: 0.12 }, { name: "margin %", weight: 0.1 }, { name: "launch investment", weight: 0.08 }, { name: "launch ROI", weight: 0.06 }]
        );
        L.explain(ev);
        return { evidence: ev };
      }
    });
    Object.assign(USE_CASES, {
      monster_statistical_forecast: {
        name: "Statistical Forecasting (Monster x AI)",
        description: "Blend historical sales with demand drivers \u2014 pricing/elasticity, promotions, weather, sporting events, competitor activity \u2014 into an explainable statistical forecast with accuracy, bias, confidence range, driver contribution and promo lift, so planners see what will happen, why, and how reliable it is.",
        gen1Agents: ["Sales History Agent", "Demand Driver Agent", "Statistical Forecast Agent", "Accuracy & Bias Agent", "Driver Contribution Agent"],
        plan: [
          { capability: "sf_sales_history", agentEquiv: "Sales History Agent", systems: ["SAP_IBP", "SAP_SD"] },
          { capability: "sf_demand_drivers", agentEquiv: "Demand Driver Agent", systems: ["ANALYTICS"] },
          { capability: "sf_generate", agentEquiv: "Statistical Forecast Agent", systems: ["ANALYTICS"] },
          { capability: "sf_accuracy_bias", agentEquiv: "Accuracy & Bias Agent", systems: ["ANALYTICS"] },
          { capability: "sf_driver_contribution", agentEquiv: "Driver Contribution Agent", systems: ["ANALYTICS"] }
        ]
      },
      monster_cannibalization: {
        name: "Forecast Cannibalization (Monster x AI)",
        description: "Quantify a new product launch's true impact \u2014 separating incremental volume from sales cannibalized off existing Monster SKUs \u2014 across portfolio, market and financials (incremental revenue, incremental profit, launch ROI, source-SKU attribution).",
        gen1Agents: ["Baseline Expected Agent", "Launch Actuals Agent", "Cannibalization Agent", "Portfolio & Market Agent", "Financial & ROI Agent"],
        plan: [
          { capability: "cb_baseline_expected", agentEquiv: "Baseline Expected Agent", systems: ["ANALYTICS", "SAP_IBP"] },
          { capability: "cb_launch_actuals", agentEquiv: "Launch Actuals Agent", systems: ["SAP_SD", "ANALYTICS"] },
          { capability: "cb_cannibalization_split", agentEquiv: "Cannibalization Agent", systems: ["ANALYTICS"] },
          { capability: "cb_portfolio_market", agentEquiv: "Portfolio & Market Agent", systems: ["SAP_IBP"] },
          { capability: "cb_financial_roi", agentEquiv: "Financial & ROI Agent", systems: ["SAP_FI", "ANALYTICS"] }
        ]
      }
    });
    var _ocmDraft = (L, decision, drivers, text) => {
      const ev = L.evidence(decision, drivers);
      ev.autonomous = false;
      ev.gate = "OCM demo \u2014 illustrative content, practitioner review required";
      L.explain(ev);
      ev.explanation = "DRAFT \u2014 illustrative demo content, not generated from real engagement data. Practitioner review required.\n\n" + text;
      return { evidence: ev };
    };
    Object.assign(TOOL_PACKS, {
      draft_change_plan(L) {
        return _ocmDraft(
          L,
          "Draft change management plan \u2014 3 phases sized to a 6-week runway",
          [{ name: "timeline-to-milestone fit", weight: 0.14 }, { name: "stakeholder coverage", weight: 0.1 }],
          "A three-phase plan sized to your six-week runway. Weeks 1\u20132 (Mobilize): confirm sponsorship is visible below the VP level, close the Finance engagement gap, lock the training calendar. Weeks 3\u20134 (Build capability): super-user certification, manager enablement session, go-live comms drafted and reviewed. Weeks 5\u20136 (Cutover): hypercare staffing, daily adoption pulse, fallback procedure rehearsed. Each phase gates into the next on a go/no-go checklist, not just a calendar date."
        );
      },
      stakeholder_analysis(L) {
        return _ocmDraft(
          L,
          "Stakeholder analysis \u2014 Planning highest-influence, Finance impact-but-unengaged, Ops lower risk",
          [{ name: "influence \xD7 impact mapping", weight: 0.1 }, { name: "engagement cadence review", weight: 0.08 }],
          "Planning is your highest-influence, highest-impact group \u2014 they own the process being replaced, and their buy-in determines whether the new forecast is actually used or quietly overridden in Excel. The current engagement approach (monthly newsletter) is under-weighted for a group this central; recommend moving them to weekly working sessions through go-live.\n\nFinance sits in the impact-but-not-yet-engaged quadrant: they consume planning outputs but haven't been in a room since kickoff. That gap tends to surface late, as a sign-off objection right before launch \u2014 worth a dedicated session in the next two weeks.\n\nOps has moderate impact and strong sponsor coverage through the plant manager \u2014 the lowest-risk group here; keep them on the standard comms cadence rather than pulling attention from Planning and Finance."
        );
      },
      readiness_assessment(L) {
        return _ocmDraft(
          L,
          "Readiness assessment \u2014 sponsorship visible at VP only, capability sequencing inverted, sentiment cautiously neutral",
          [{ name: "sponsor visibility below VP", weight: 0.15 }, { name: "capability build vs. go-live sequencing", weight: 0.12 }, { name: "sentiment pulse", weight: 0.05 }],
          "Sponsorship is present at the VP level but hasn't been visible below it \u2014 two of three team leads couldn't name who's accountable when asked last week. That's a capability gap wearing a sponsorship costume.\n\nCapability is the sharper exposure. Planning's super-users have had one working session; go-live is six weeks out. At the current pace they'll be independently competent roughly two weeks after go-live, not before \u2014 that sequencing needs to flip.\n\nSentiment is neutral-to-cautious, not resistant \u2014 a real asset, but only if the next few touchpoints land well; a stumbled training rollout right now would tip it the wrong way."
        );
      },
      change_impact_analysis(L) {
        return _ocmDraft(
          L,
          "Change impact analysis \u2014 Planning absorbs largest process delta, Finance carries policy risk, Ops mainly a training issue",
          [{ name: "process delta magnitude", weight: 0.14 }, { name: "policy / system-of-record change", weight: 0.1 }],
          "Planning absorbs the largest process delta \u2014 the forecast step moves from a manual spreadsheet build to reviewing a system-generated baseline, changing the role from 'producer' to 'reviewer.' That will feel like a loss of control for tenured planners unless it's framed that way explicitly.\n\nFinance's impact is smaller in volume but higher in policy \u2014 the new tool changes which system of record drives the monthly variance report, so their close process needs a defined cutover date, not a gradual drift.\n\nOps sees the lightest people/process impact; their exposure is mostly technology \u2014 a training issue, not a change-resistance one."
        );
      },
      resistance_prediction(L) {
        return _ocmDraft(
          L,
          "Resistance prediction \u2014 parallel spreadsheet risk in Planning, late sign-off objection risk in Finance",
          [{ name: "shadow-process likelihood", weight: 0.13 }, { name: "sponsorship-gap-as-technical-objection pattern", weight: 0.09 }],
          "Most likely scenario: senior planners quietly keep running the old spreadsheet 'just to check the numbers' past go-live, producing two different forecasts in the building. Countermeasure: name it early \u2014 a bounded two-week parallel-run is expected, not indefinite \u2014 and give planners a specific, visible role validating the new forecast rather than self-appointing as its unofficial auditor.\n\nSecond scenario: Finance raises a late accuracy objection right before go-live \u2014 really a sponsorship-gap symptom surfacing as a technical one. The fix is the stakeholder session already flagged above, not a new accuracy analysis."
        );
      },
      learning_strategy(L) {
        return _ocmDraft(
          L,
          "Learning strategy \u2014 3 role-based paths, resequenced so managers train before their teams do",
          [{ name: "role-based enablement fit", weight: 0.12 }, { name: "sequencing vs. go-live", weight: 0.09 }],
          "Three role-based paths, not one generic course. Planners get two hands-on 90-minute working sessions before go-live, live in the new tool with their own SKUs \u2014 their job changes the most. Managers get a single 90-minute session focused on 'what your team will ask you,' not tool mechanics. Finance gets a 45-minute walkthrough of the one report that changes for them.\n\nSequence: managers first, so they're ready to field questions before their teams are trained, then planners, then Finance \u2014 the current plan has this backwards, with Finance scheduled before managers."
        );
      },
      rollout_checklist(L) {
        return _ocmDraft(
          L,
          "Rollout checklist \u2014 execution-phase activities sequenced against go-live",
          [{ name: "cutover readiness gating", weight: 0.11 }, { name: "hypercare coverage", weight: 0.08 }],
          "Go-live minus 2 weeks: manager enablement complete, Finance sign-off session held, parallel-run window communicated. Go-live minus 1 week: super-user certification complete, go-live comms sent, hypercare roster staffed.\n\nGo-live day: old system kept read-only (not decommissioned), hypercare desk live, daily adoption baseline captured. Go-live +1\u20132 weeks: daily stand-up on adoption blockers, parallel-run usage checked and flagged if still active. Go-live +3\u20134 weeks: parallel-run formally closed, first readiness re-assessment against the week-1 baseline."
        );
      },
      draft_communications(L) {
        return _ocmDraft(
          L,
          "Draft communications \u2014 tailored by audience and channel, aligned to the comms plan",
          [{ name: "audience/channel fit", weight: 0.1 }, { name: "message-to-impact alignment", weight: 0.08 }],
          `Planning (team meeting + follow-up email): "Starting [date], your forecast review moves from building the number from scratch to reviewing and adjusting a system-generated baseline. You're still the expert making the call \u2014 the system does the first draft, not the decision. Two working sessions are scheduled to get hands-on before go-live."

Finance (1:1 from the sponsor): "The monthly variance report pulls from [new tool] starting [cutover date], not [old tool]. We're holding a walkthrough on [date] so there are no surprises in next month's close."`
        );
      },
      measurement_plan(L) {
        return _ocmDraft(
          L,
          "Adoption measurement plan \u2014 3 weekly signals with explicit action thresholds",
          [{ name: "leading vs. lagging indicator mix", weight: 0.12 }, { name: "threshold-triggered escalation", weight: 0.07 }],
          "Track three things weekly, not just at the 90-day mark: system usage (are planners adjusting the forecast, or approving it unread), parallel-run persistence (is the old spreadsheet still circulating), and a 2-question sentiment pulse (confidence in the forecast, confidence in support when stuck).\n\nThresholds for action: if parallel-run usage isn't declining by week 3, escalate to the sponsor rather than waiting it out; if sentiment drops two weeks running, treat it as an early-warning signal, not noise."
        );
      },
      guide_me(L) {
        return _ocmDraft(
          L,
          "Guide me \u2014 next 3 actions given current engagement state",
          [{ name: "gap-to-go-live urgency", weight: 0.16 }, { name: "cross-workstream dependency check", weight: 0.09 }],
          "You're three weeks from go-live with no manager-enablement session scheduled \u2014 managers are the ones who'll field questions from their teams in week one, and right now they'd be learning it live alongside everyone else.\n\nThree things to sequence next: (1) get a 90-minute manager session on the calendar this week, (2) close the Finance stakeholder gap flagged in the readiness assessment before it becomes a sign-off issue, (3) draft the go-live comms so Planning knows what changes for them on day one, not just that something changed."
        );
      }
    });
    Object.assign(USE_CASES, {
      ocm_change_management: {
        name: "OCM Change Management Agent",
        description: "Practitioner-level collaborator for technology adoption engagements \u2014 advises on approach, drafts OCM deliverables, analyses change impact/readiness/resistance, and prompts on what's due or at risk. Demo scenario: a mid-size manufacturer adopting an AI-based demand-planning tool, six weeks from go-live. All content below is illustrative \u2014 see the note in each response.",
        gen1Agents: [
          "Change Strategy Agent",
          "Stakeholder Analysis Agent",
          "Readiness Assessment Agent",
          "Change Impact Agent",
          "Resistance Management Agent",
          "Learning Strategy Agent",
          "Rollout Planning Agent",
          "Communications Agent",
          "Adoption Measurement Agent",
          "Advisory / Guidance Agent"
        ],
        plan: [
          { capability: "draft_change_plan", agentEquiv: "Change Strategy Agent", systems: ["ANALYTICS"] },
          { capability: "stakeholder_analysis", agentEquiv: "Stakeholder Analysis Agent", systems: ["ANALYTICS"] },
          { capability: "readiness_assessment", agentEquiv: "Readiness Assessment Agent", systems: ["ANALYTICS"] },
          { capability: "change_impact_analysis", agentEquiv: "Change Impact Agent", systems: ["ANALYTICS"] },
          { capability: "resistance_prediction", agentEquiv: "Resistance Management Agent", systems: ["ANALYTICS"] },
          { capability: "learning_strategy", agentEquiv: "Learning Strategy Agent", systems: ["ANALYTICS"] },
          { capability: "rollout_checklist", agentEquiv: "Rollout Planning Agent", systems: ["ANALYTICS"] },
          { capability: "draft_communications", agentEquiv: "Communications Agent", systems: ["ANALYTICS"] },
          { capability: "measurement_plan", agentEquiv: "Adoption Measurement Agent", systems: ["ANALYTICS"] },
          { capability: "guide_me", agentEquiv: "Advisory / Guidance Agent", systems: ["ANALYTICS"] }
        ]
      }
    });
    if (typeof module2 !== "undefined" && module2.exports) {
      module2.exports = {
        UNAI,
        SuperAgent: UNAI,
        USE_CASES,
        ONTOLOGY,
        OntologyMapper,
        MODEL_PRICING,
        DEPLOY_PLATFORMS,
        ontologyGraph,
        specialistRegistry
      };
    }
    if (typeof window !== "undefined") {
      try {
        window.UNAI = UNAI;
        window.SuperAgent = UNAI;
      } catch (e) {
      }
    }
  }
});

// agents/unai/liveNarration.cjs
var require_liveNarration = __commonJS({
  "agents/unai/liveNarration.cjs"(exports2, module2) {
    "use strict";
    function resolveConfig() {
      const base = process.env.GATEWAY_BASE_URL || (process.env.MISTRAL_API_KEY ? "https://api.mistral.ai/v1" : "");
      const key = process.env.GATEWAY_API_KEY || process.env.MISTRAL_API_KEY || "";
      const model = process.env.GATEWAY_MODEL || "mistral-small-latest";
      return { base, key, model, ok: !!(base && key) };
    }
    function buildPrompt(ev) {
      const drivers = (ev.attribution || []).map((d) => `- ${d.name}: ${Math.round(d.share * 100)}% of the decision`).join("\n");
      return `You are the Explainability layer of an autonomous supply-chain agent. Write ONE concise business-English sentence (max 40 words) explaining this decision to a planner. Use ONLY the facts below; do not invent numbers. State whether it executed autonomously or was routed to a human, and why.

Decision: ${ev.decision}
Confidence: ${Math.round(ev.confidence * 100)}% (uncertainty ${ev.uncertainty})
Autonomy threshold: ${Math.round((ev.threshold || 0.85) * 100)}%
Drivers:
${drivers}
Outcome: ${ev.autonomous ? "executed autonomously" : "routed to a human approver"}
` + (ev.gate ? `Governance gate: ${ev.gate}
` : "");
    }
    async function narrateReal(ev, timeoutMs = 15e3) {
      const cfg = resolveConfig();
      if (!cfg.ok) return null;
      const prompt = buildPrompt(ev);
      const t0 = Date.now();
      try {
        const res = await fetch(cfg.base.replace(/\/$/, "") + "/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${cfg.key}` },
          body: JSON.stringify({ model: cfg.model, messages: [{ role: "user", content: prompt }], temperature: 0.2, max_tokens: 80 }),
          signal: AbortSignal.timeout(timeoutMs)
        });
        if (!res.ok) return null;
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        const u = data?.usage || {};
        if (!text) return null;
        return { text: text.trim(), promptTokens: u.prompt_tokens || 0, completionTokens: u.completion_tokens || 0, ms: Date.now() - t0, model: cfg.model, provider: cfg.base.includes("mistral") ? "mistral" : "gateway" };
      } catch (_e) {
        return null;
      }
    }
    module2.exports = { narrateReal, resolveConfig, buildPrompt };
  }
});

// agents/unai/tokenCompare.cjs
var require_tokenCompare = __commonJS({
  "agents/unai/tokenCompare.cjs"(exports2, module2) {
    "use strict";
    var path2 = require("path");
    var { encode } = require("gpt-tokenizer");
    var { narrateReal } = require_liveNarration();
    var tok = (s) => encode(String(s == null ? "" : s)).length;
    var PROMPTS = {
      "demand-forecast": (p) => ({
        systemInstruction: "You are an expert enterprise supply chain strategist and forecasting coordinator at NVIDIA. You must output valid, well-structured JSON matching the requested schema exactly.",
        prompt: `
    You are the NVIDIA Demand Forecast Agent. We are opening a new quarterly S&OP (Sales and Operations Planning) cycle.
    Product: ${p.productName} (Established high-volume product)
    Shipment History Ingested: ${p.shipmentHistoryYears} years of weekly historical shipment data
    Sales Team Override Target: ${p.salesOverrideUnits} units
    Marketing Campaign Override Target: ${p.marketingOverrideUnits} units

    Tasks:
    1. Run S&OP Consensus Forecast. Combine historical statistical forecasting with Sales and Marketing overrides.
    2. Perform Seasonal Decomposition. Detail the trend and seasonal patterns (e.g., high chip absorption in Q1/Q3, holiday/budget closures in Q4).
    3. Generate a 26-week baseline consensus forecast. Provide week-by-week values (Week 1 to Week 26).
       - baseForecast: the statistical baseline before overrides.
       - consensusForecast: the finalized forecast incorporating the split allocations of Sales and Marketing overrides distributed across 26 weeks.
    4. Return reasoning steps, key decision factors, and timestamped activity logs.

    Format the response as a JSON object with:
    - reasoningSteps: array of strings
    - decompositionTrend: string
    - decompositionSeasonal: string
    - consensusSummary: string
    - forecastData: array of { week: string, baseForecast: number, consensusForecast: number }
    - confidenceScore: number (0-100)
    - keyFactors: array of strings
    - humanActionRequired: string
    - activityLogs: array of strings
  `
      }),
      "demand-sensing": (p) => ({
        systemInstruction: "You are an expert NVIDIA demand planner and AI forecaster. You must output valid, well-structured JSON matching the requested schema exactly.",
        prompt: `
    You are the NVIDIA Demand Sensing Agent. We have detected a demand signal spike from a major hyperscaler.
    Product: ${p.productName}
    Hyperscaler Client: ${p.hyperscaler}
    Spike Percentage: ${p.signalSpikePct}% over historical baseline
    Volume of Signal Spike: ${p.signalVolumeUnits} units requested
    Urgency Level: ${p.urgencyCode}

    Tasks:
    1. Analyze this signal. Is it a true demand anomaly (e.g. cloud expansion project, major LLM training cluster kickoff) or a false alarm?
    2. Perform a 13-week reforecast. Give week-by-week forecast values.
       - Generate a traditional statistical baseline (usually static or slightly seasonal).
       - Generate an AI-Sensed Reforecast which dynamically incorporates the hyperscaler spike (e.g., immediate bump in early weeks, then stabilizing).
       - Include the raw customer signal volume in your calculations.
    3. Return reasoning steps and a realistic timestamped activity log for your actions.

    Format the response as a JSON object with:
    - reasoningSteps: array of strings
    - anomalyDetected: boolean
    - anomalyAnalysis: string
    - reforecastSummary: string
    - chartData: array of { week: string, statisticalBaseline: number, aiReforecast: number, rawSignal: number }
    - confidenceScore: number (0-100)
    - keyFactors: array of strings
    - humanActionRequired: string
    - activityLogs: array of strings
  `
      }),
      "forecast-npi": (p) => ({
        systemInstruction: "You are an expert NVIDIA NPI planner specializing in data science, champion-challenger testing, and hierarchical supply chains. You must output valid, well-structured JSON matching the requested schema exactly.",
        prompt: `
    You are the NVIDIA New Product Introduction (NPI) Forecast Agent. We are establishing the baseline forecast for a next-generation architecture: ${p.productName}.
    User Preferred Primary Model: ${p.selectedPrimaryModel}
    Simulated Market Adoption Speed: ${p.marketAdoptionRate}

    Tasks:
    1. Run a Champion-Challenger Model Selection. Compare Trend Extrapolation Model (statistical baseline), Multi-Variable Analytics Model (non-linear trend model), and Pattern-Recognition Model (recurrent pattern sequence model).
       - Calculate MAPE (Mean Absolute Percentage Error) for each model.
       - Select the Champion model based on accuracy and user choice.
    2. Construct Hierarchical Forecast. Break down the target product's launch quarter requirements across Regions (North America, APAC, EMEA) and Customers (Hyperscale Cloud, Enterprise OEM, Government & Research).
    3. Identify Low Confidence Planning Nodes. Flag specific SKUs or customer nodes where adoption confidence is low (<80%) and generate structural warnings with explicit explainability (root cause, risk category, forecast impact, recommended mitigation).
    4. Return reasoning steps, detailed model metrics, hierarchical forecasts, flags, and timestamped activity logs.

    Format the response as a JSON object with:
    - reasoningSteps: array of strings
    - championModel: string
    - challengerModels: array of strings
    - modelMetrics: array of { modelName: string, mape: number, status: string }
    - hierarchicalForecast: array of { node: string, naUnits: number, apacUnits: number, emeaUnits: number }
    - lowConfidenceFlags: array of { skuNode: string, confidenceScore: number, reason: string, riskCategory: string, rootCauseDetails: string, impactOnForecast: string, recommendedMitigation: string }
    - confidenceScore: number (0-100)
    - keyFactors: array of strings
    - humanActionRequired: string
    - activityLogs: array of strings
  `
      }),
      "refurb-repair": (p) => ({
        systemInstruction: "You are an expert NVIDIA reverse logistics engineer and cost analyst. You must output valid, well-structured JSON matching the requested schema exactly.",
        prompt: `
    You are the NVIDIA Refurbish & Repair Agent. An elevated wave of returned inventory has arrived.
    Product Type: ${p.productName}
    Total Field Returns: ${p.fieldReturnsCount} units
    Human Overridden Historical Recovery Rate Target: ${p.historicalRecoveryRateOverride}%
    Cost of manufacturing a brand new unit: $${p.newSupplyCostUsd} USD
    Cost of factory repairing a single returned unit: $${p.repairCostUsd} USD

    Tasks:
    1. Calculate Repair Metrics:
       - Recoverable Units = Returns Count * (Recovery Rate / 100)
       - Scrapped Units = Returns Count - Recoverable Units
       - Total Cost to Repair = Recoverable Units * Repair Cost per Unit
       - Total Cost of Equivalent New Supply = Recoverable Units * New Supply Cost per Unit
       - Net Financial Savings = Cost of New Supply - Cost to Repair
    2. Perform Cost-Benefit Analysis (CBA). Summarize why refurbishing this batch makes financial and operational sense, referencing the savings.
    3. Construct Optimized 4-Week Repair Schedule. Break down the process (e.g., Intake & Diagnostics, Board-Level Microsoldering, Component Refitting & Sourcing, High-Stress Burn-In & QA) across 4 stages.
    4. Return reasoning steps, detailed financials, schedules, decision metrics, and timestamped activity logs.

    Format the response as a JSON object with:
    - reasoningSteps: array of strings
    - recoverableUnits: number (integer)
    - scrappedUnits: number (integer)
    - repairCostTotal: number
    - newSupplyCostTotal: number
    - netSavingsUsd: number
    - cbaSummary: string
    - repairSchedule: array of { phase: string, durationDays: number, unitsProcessed: number, status: string }
    - confidenceScore: number (0-100)
    - keyFactors: array of strings
    - humanActionRequired: string
    - activityLogs: array of strings
  `
      }),
      "rma-triage": (p) => ({
        systemInstruction: "You are an expert NVIDIA enterprise support engineer and supply chain automation agent. You must output valid, well-structured JSON matching the requested schema exactly.",
        prompt: `
    You are the NVIDIA RMA Triage Agent. Evaluate the following hardware return and decide the disposition:
    Product: ${p.productName}
    Serial Number: ${p.serialNumber}
    Reported Defect: ${p.defectDescription}
    Purchase Date: ${p.purchaseDate}
    Current Time: 2026-07-14T04:27:56-07:00 (July 2026)

    Step 1: Check Solvability. If the issue is solvable through user intervention (e.g., thermal paste, dusty fan, firmware/driver, loose cables, PCIe seating), provide a detailed 2-line descriptive recommendation explaining how to resolve it. This is preferred over replacement or refurbishing!
    Step 2: Warranty Check. NVIDIA enterprise products standard warranty is 3 years (36 months) from the purchase date. Determine if the warranty is active or expired as of July 2026.
    Step 3: Refurb Feasibility. If the warranty is active but not solvable via self-troubleshooting, determine if it can be refurbished or if a direct replacement is necessary.
    Step 4: Decide disposition: "Self-Troubleshoot" (if solvable), "Factory Refurbish" (if hardware issue is minor/repairable and under warranty), or "Direct Replacement" (if hardware issue is catastrophic and under warranty, or if special SLA applies). If out of warranty and not solvable, suggest repair cost estimate.
    Step 5: Trigger replenishment. If replacement/refurb is chosen, set replenishmentTriggered to true.
    Step 6: Provide specific recommendations:
      - solvabilityRecommendation: A 2-line descriptive recommendation detailing the exact resolution procedure and operational pathway.
      - softwareResolution: e.g. clean driver reinstall, reset cluster configs.
      - firmwareRecommendation: specific firmware flash guide.
      - driverRecommendation: specific driver version recommendation (e.g. v555.42).
      - configurationRecommendation: PCIe / BIOS settings, cooling curves.
      - environmentalRecommendation: ambient humidity, air flow clearance, dust filtration.
      - knowledgeBaseMatch: reference to an advisory doc from NVIDIA Support database.
      - businessImpactUsd: estimate of the financial savings or impact of this decision (e.g. "$12,000 Saved").
      - failureRepairAnalysis: Object containing detailed failure rate and repair rate analysis specifically tailored to ${p.productName} and this exact defect ("${p.defectDescription}"). Must include:
        - failureRateAfrPct: number
        - mtbfHours: number
        - failureRateTrend: string
        - repairabilityRatePct: number
        - firstTimeFixRatePct: number
        - avgRepairTatDays: number
        - salvageSavingsUsd: number
        - topFailureCauses: array of objects { cause: string, percentage: number, severity: "High"|"Medium"|"Low", impactDescription: string, recommendation: string }
        - repairYieldByComponent: array of objects { component: string, repairYieldPct: number, avgTatHours: number, recommendation: string }
        - rmaProcessImpactSummary: string

    Provide detailed reasoning steps and a realistic timestamped activity log for your actions.

    Format the response as a JSON object matching the requested schema.
  `
      }),
      "orchestrator": (p) => {
        const kpiBreachType = p.kpiBreachType || (p.productName ? `Hardware Issue: ${p.productName}` : "Generic KPI Breach");
        const affectedRegion = p.affectedRegion || "Global";
        const impactedSku = p.impactedSku || p.serialNumber || "N/A";
        return {
          systemInstruction: "You are the chief AI Orchestration Engine for NVIDIA's global supply chain control tower. You must output valid, well-structured JSON matching the requested schema exactly.",
          prompt: `
    You are the NVIDIA Orchestrator Control Tower Agent. A critical KPI breach has occurred in our supply chain network.
    Breach Event: ${kpiBreachType}
    Affected Region: ${affectedRegion}
    Impacted Product SKU: ${impactedSku}

    Tasks:
    1. Coordinate Response. Plan a sequence of coordinated activations across our agents:
       - Demand Sensing Agent (to reforecast immediate local demand trends)
       - Refurbish & Repair Agent (to check if local scrap or repair units can plug the supply gap quickly)
       - RMA Triage Agent (to speed up intake diagnostics on returns)
       - Replenishment Pipeline (to route inventory buffer from APAC manufacturing hub)
    2. Construct sequence steps. Create a detailed node-to-node exchange showing step-by-step how the Orchestrator initiates, receives telemetry, and re-routes tasks.
    3. Create Coordinated Agents. For each of the 4 agents, define their assigned action and impact weights.
    4. Return reasoning steps, final mitigation plan, sequence steps, decision cards, and timestamped activity logs.

    Format the response as a JSON object with:
    - reasoningSteps: array of strings
    - mitigationPlanSummary: string
    - currentKpiValue: string (e.g., "78% (Threshold: 85%)")
    - targetKpiValue: string (e.g., "Restore to >85% in 3 weeks")
    - coordinatedAgents: array of { agentName: string, assignedAction: string, impactWeightPct: number, status: string }
    - sequenceSteps: array of { stepNumber: number, fromAgent: string, toAgent: string, messageSignal: string, resultDescription: string }
    - confidenceScore: number (0-100)
    - keyFactors: array of strings
    - humanActionRequired: string
    - activityLogs: array of strings
  `
        };
      }
    };
    function unaiPromptFor(ev) {
      const drivers = (ev.attribution || []).map((d) => `- ${d.name}: ${Math.round(d.share * 100)}% of the decision`).join("\n");
      return `You are the Explainability layer of an autonomous supply-chain agent. Write ONE concise business-English sentence (max 40 words) explaining this decision to a planner. Use ONLY the facts below; do not invent numbers. State whether it executed autonomously or was routed to a human, and why.

Decision: ${ev.decision}
Confidence: ${Math.round(ev.confidence * 100)}% (uncertainty ${ev.uncertainty})
Autonomy threshold: ${Math.round((ev.threshold || 0.85) * 100)}%
Drivers:
${drivers}
Outcome: ${ev.autonomous ? "executed autonomously" : "routed to a human approver"}
` + (ev.gate ? `Governance gate: ${ev.gate}
` : "");
    }
    var UNAI_COMPLETION_CAP = 40;
    var LAYER_IDS = ["L1", "L2", "L3", "L4", "L5", "L6", "L7"];
    function buildPerLayerTokens(layerInfo) {
      if (!layerInfo || !Array.isArray(layerInfo.layers)) return null;
      return layerInfo.layers.map((l, i) => ({ id: LAYER_IDS[i] || `L${i + 1}`, name: l.name, in: l.in || 0, out: l.out || 0, total: l.total != null ? l.total : (l.in || 0) + (l.out || 0) }));
    }
    async function compareForAgent(agentId, payload, uiResult, anchorEvidence, layerInfo) {
      const build = PROMPTS[agentId];
      if (!build) return null;
      const { systemInstruction, prompt } = build(payload || {});
      const originalPromptTokens = tok(systemInstruction) + tok(prompt);
      const originalCompletionTokens = tok(JSON.stringify(uiResult));
      const originalTotal = originalPromptTokens + originalCompletionTokens;
      let unai = null, reductionPct = null, live = null;
      if (anchorEvidence) {
        const real = await narrateReal(anchorEvidence).catch(() => null);
        if (real) {
          const unaiTotal = real.promptTokens + real.completionTokens;
          unai = { promptTokens: real.promptTokens, completionTokens: real.completionTokens, total: unaiTotal, measured: "live", provider: real.provider, model: real.model };
          live = { explanation: real.text };
        } else {
          const unaiPromptTokens = tok(unaiPromptFor(anchorEvidence));
          const unaiTotal = unaiPromptTokens + UNAI_COMPLETION_CAP;
          unai = { promptTokens: unaiPromptTokens, completionTokens: UNAI_COMPLETION_CAP, total: unaiTotal, measured: "estimated" };
        }
        reductionPct = Math.round((1 - unai.total / originalTotal) * 100);
      }
      return {
        methodology: unai && unai.measured === "live" ? `LIVE measured call to ${unai.provider} (${unai.model}) for the UNAI side \u2014 real usage.prompt_tokens/completion_tokens from that provider's own API response. Original-app side is a local BPE tokenization (gpt-tokenizer) of the real prompt text, since NVIDIA NIM isn't reachable from this network \u2014 see the README.` : "Real BPE tokenization (gpt-tokenizer, cl100k_base) of the actual prompt text this run would have used \u2014 not NIM's exact Llama-3.3 tokenizer, so treat as accurate order-of-magnitude, not exact billing. Nothing here is sent to any LLM (no provider key configured).",
        original: { label: "Original app: 1 full NIM LLM call (this agent's real prompt + JSON schema)", promptTokens: originalPromptTokens, completionTokens: originalCompletionTokens, total: originalTotal },
        unaiIfLlmNarrated: unai ? { label: unai.measured === "live" ? `UNAI, LIVE ${unai.provider} call: 1 shared explainability call` : "UNAI, IF it also narrated via an LLM: 1 shared explainability call (estimated)", ...unai, ...live || {} } : null,
        unaiActual: { label: "UNAI, as actually run just now: real ported formula, no LLM call", total: 0 },
        reductionPctIfLlmNarrated: reductionPct,
        perLayerTokens: buildPerLayerTokens(layerInfo),
        perLayerMeasured: layerInfo ? layerInfo.measured : null
      };
    }
    module2.exports = { compareForAgent };
  }
});

// agents/unai/unaiAdapter.cjs
var require_unaiAdapter = __commonJS({
  "agents/unai/unaiAdapter.cjs"(exports2, module2) {
    "use strict";
    var path2 = require("path");
    global.COGNITION = require_cognition();
    var { UNAI } = require_engine();
    var tokenCompare = require_tokenCompare();
    var { narrateReal } = require_liveNarration();
    async function buildRealLayerTokens(res) {
      const ob = res.observability;
      const entries = ob.explainEntriesReal || [];
      const live = await Promise.all(entries.map((e) => narrateReal(e.ev).catch(() => null)));
      let exIn = 0, exOut = 0, liveCount = 0, msTotal = 0, msMax = 0;
      const perDecision = entries.map((e, i) => {
        const ev = e.ev || {};
        const l = live[i];
        const tin = l ? l.promptTokens : e.localInTok, tout = l ? l.completionTokens : e.localOutTok;
        if (l) {
          exIn += l.promptTokens;
          exOut += l.completionTokens;
          liveCount++;
          const ms = l.ms || 0;
          msTotal += ms;
          if (ms > msMax) msMax = ms;
        } else {
          exIn += e.localInTok;
          exOut += e.localOutTok;
        }
        return {
          decision: ev.decision || "Decision " + (i + 1),
          confidencePct: Math.round((ev.confidence || 0) * 100),
          autonomous: !!ev.autonomous,
          tokens: (tin || 0) + (tout || 0),
          ms: l ? l.ms || 0 : null,
          measured: !!l
        };
      });
      let unaiIn = 0, unaiOut = 0;
      (ob.layerTokensReal || []).forEach((x) => {
        if (x.name === "Explainability") {
          unaiIn += exIn;
          unaiOut += exOut;
        } else {
          unaiIn += x.in || 0;
          unaiOut += x.out || 0;
        }
      });
      return {
        economics: {
          perDecision,
          nDec: entries.length,
          unaiIn,
          unaiOut,
          unaiTotal: unaiIn + unaiOut,
          latency: { msTotal, msAvg: liveCount ? Math.round(msTotal / liveCount) : 0, msMax, liveCalls: liveCount, totalCalls: entries.length },
          measured: liveCount > 0 ? liveCount === entries.length ? "live" : "mixed" : "local"
        }
      };
    }
    var CAPABILITY_PLANS = {
      "demand-forecast": ["forecast_data"],
      "demand-sensing": ["chart_data"],
      "forecast-npi": ["champion_model", "challenger_models", "model_metrics", "hierarchical_forecast", "low_confidence_flags"],
      "refurb-repair": ["recoverable_units", "scrapped_units", "repair_cost_total", "new_supply_cost_total", "net_savings_usd", "repair_schedule"],
      "rma-triage": ["solvability_recommendation", "warranty_status", "warranty_details", "disposition", "replenishment_triggered", "software_resolution", "firmware_recommendation", "driver_recommendation"],
      "orchestrator": ["current_kpi_value", "target_kpi_value", "coordinated_agents", "sequence_steps"]
    };
    function planFor(agentId) {
      return (CAPABILITY_PLANS[agentId] || []).map((capability) => ({ capability, agentEquiv: capability.replace(/_/g, " "), systems: ["ANALYTICS", "SERVICENOW"] }));
    }
    function runPlan(agentId, scenario) {
      const goal = { name: agentId, plan: planFor(agentId), gen1Agents: (CAPABILITY_PLANS[agentId] || []).slice() };
      return new UNAI({ name: agentId, scenario }).run(goal);
    }
    var ts = () => (/* @__PURE__ */ new Date()).toISOString().slice(11, 19);
    async function runDemandForecast(payload) {
      const { productName, salesOverrideUnits, marketingOverrideUnits, shipmentHistoryYears } = payload;
      const res = runPlan("demand-forecast", { product_name: productName, sales_override_units: salesOverrideUnits, marketing_override_units: marketingOverrideUnits });
      const c = res.results.forecast_data;
      const ev = c.evidence;
      const result = {
        reasoningSteps: [
          `Ingested ${shipmentHistoryYears} years of shipment history for ${productName}.`,
          `Applying seasonal decomposition to the statistical baseline.`,
          `Consolidating sales override (${(salesOverrideUnits || 0).toLocaleString()}) and marketing override (${(marketingOverrideUnits || 0).toLocaleString()}).`,
          `Consensus forecast reconciled over a 26-week horizon on the UNAI shared runtime.`
        ],
        decompositionTrend: "Linear upward expansion driven by hyperscaler AI cluster expansion programs.",
        decompositionSeasonal: "Multi-week peaks in mid-quarter cycles reflecting corporate CAPEX release schedules.",
        consensusSummary: `Reconciled the statistical baseline with human override allocations: ${c.totalOverride.toLocaleString()} incremental units distributed across the next 26 weeks.`,
        forecastData: c.forecastData,
        confidenceScore: Math.round(ev.confidence * 100),
        keyFactors: ev.attribution.map((a) => a.name),
        humanActionRequired: "Review and sign off on the 26-week consolidated consensus S&OP forecast to unlock inventory allocation.",
        activityLogs: [`[${ts()}] Ingested shipment history`, `[${ts()}] Ran seasonal decomposition`, `[${ts()}] Merged sales + marketing overrides`, `[${ts()}] UNAI consensus reconciliation complete`]
      };
      result.unaiTokenComparison = await tokenCompare.compareForAgent("demand-forecast", payload, result, ev, { layers: res.observability.layerTokensReal, measured: "real" });
      result.__ev = ev;
      const realLayers = await buildRealLayerTokens(res);
      result.unaiEconomics = realLayers.economics;
      return result;
    }
    async function runDemandSensing(payload) {
      const { productName, hyperscaler, signalSpikePct, signalVolumeUnits } = payload;
      const res = runPlan("demand-sensing", { product_name: productName, signal_spike_pct: signalSpikePct, signal_volume_units: signalVolumeUnits });
      const c = res.results.chart_data;
      const ev = c.evidence;
      const result = {
        reasoningSteps: [
          `Ingested real-time demand signal: ${(signalVolumeUnits || 0).toLocaleString()} units requested by ${hyperscaler} for ${productName}.`,
          `Validated telemetry spike intensity: +${signalSpikePct}% vs historical baseline.`,
          `Computed 13-week AI-sensed reforecast on the UNAI shared runtime.`
        ],
        anomalyDetected: c.anomalyDetected,
        anomalyAnalysis: c.anomalyDetected ? `Confirmed genuine demand spike from ${hyperscaler}: ${(signalVolumeUnits || 0).toLocaleString()} units of ${productName}, a real localized shift rather than background variance.` : `Signal intensity (+${signalSpikePct}%) is within normal variance \u2014 not flagged as an anomaly.`,
        reforecastSummary: `AI-sensed model integrated the ${(signalVolumeUnits || 0).toLocaleString()}-unit signal, peaking weeks 2-5 and stabilizing toward week 9.`,
        chartData: c.chartData,
        confidenceScore: Math.round(ev.confidence * 100),
        keyFactors: ev.attribution.map((a) => a.name),
        humanActionRequired: `Authorize buffer allocations to cover the sensed demand hump in weeks 2-5.`,
        activityLogs: [`[${ts()}] Signal monitor flagged spike from ${hyperscaler}`, `[${ts()}] Extracted volume profile`, `[${ts()}] Ran UNAI reactive demand-sensing`, `[${ts()}] Reforecast pushed to S&OP repository`]
      };
      result.unaiTokenComparison = await tokenCompare.compareForAgent("demand-sensing", payload, result, ev, { layers: res.observability.layerTokensReal, measured: "real" });
      result.__ev = ev;
      const realLayers = await buildRealLayerTokens(res);
      result.unaiEconomics = realLayers.economics;
      return result;
    }
    async function runForecastNpi(payload) {
      const { productName, selectedPrimaryModel, marketAdoptionRate } = payload;
      const res = runPlan("forecast-npi", { product_name: productName, selected_primary_model: selectedPrimaryModel, market_adoption_rate: marketAdoptionRate });
      const c = res.results.champion_model;
      const ev = c.evidence;
      const totalUnits = c.hierarchicalForecast.reduce((a, n) => a + n.naUnits + n.apacUnits + n.emeaUnits, 0);
      const result = {
        reasoningSteps: [
          `Initializing NPI champion-challenger pipeline for ${productName}.`,
          `Evaluating MAPE across candidate models; user preference: ${selectedPrimaryModel}.`,
          `Applying market adoption vector: ${marketAdoptionRate}.`,
          `Hierarchical distribution computed on the UNAI shared runtime.`
        ],
        championModel: c.championModel,
        challengerModels: c.challengerModels,
        modelMetrics: c.modelMetrics,
        hierarchicalForecast: c.hierarchicalForecast,
        lowConfidenceFlags: c.lowConfidenceFlags,
        confidenceScore: Math.round(ev.confidence * 100),
        keyFactors: ev.attribution.map((a) => a.name),
        humanActionRequired: `Approve the initial NPI ramp manufacturing allocation of ${totalUnits.toLocaleString()} units.`,
        activityLogs: [`[${ts()}] NPI validation pipeline opened for ${productName}`, `[${ts()}] Compared model MAPE`, `[${ts()}] Champion selected: ${c.championModel}`, `[${ts()}] Hierarchical distribution populated`]
      };
      result.unaiTokenComparison = await tokenCompare.compareForAgent("forecast-npi", payload, result, ev, { layers: res.observability.layerTokensReal, measured: "real" });
      result.__ev = ev;
      const realLayers = await buildRealLayerTokens(res);
      result.unaiEconomics = realLayers.economics;
      return result;
    }
    async function runRefurbRepair(payload) {
      const { productName, fieldReturnsCount, historicalRecoveryRateOverride, newSupplyCostUsd, repairCostUsd } = payload;
      const res = runPlan("refurb-repair", { product_name: productName, field_returns_count: fieldReturnsCount, recovery_rate_pct: historicalRecoveryRateOverride, new_supply_cost_usd: newSupplyCostUsd, unit_repair_cost_usd: repairCostUsd });
      const c = res.results.recoverable_units;
      const ev = c.evidence;
      const result = {
        reasoningSteps: [
          `Received reverse-logistics batch of ${c.fieldReturnsCount} returned ${productName} units.`,
          `Applying recovery rate target of ${c.recoveryRatePct}%.`,
          `Yield: ${c.recoverableUnits} recoverable, ${c.scrappedUnits} scrapped.`,
          `Cost-benefit computed on the UNAI shared runtime.`
        ],
        recoverableUnits: c.recoverableUnits,
        scrappedUnits: c.scrappedUnits,
        repairCostTotal: c.repairCostTotal,
        newSupplyCostTotal: c.newSupplyCostTotal,
        netSavingsUsd: c.netSavingsUsd,
        cbaSummary: `Repairing ${c.recoverableUnits} of ${c.fieldReturnsCount} returns instead of fabricating new units keeps $${c.netSavingsUsd.toLocaleString()} in capital within margins while diverting high-value units from scrappage.`,
        repairSchedule: c.repairSchedule.map((p) => ({ ...p, status: "Scheduled" })),
        confidenceScore: Math.round(ev.confidence * 100),
        keyFactors: ev.attribution.map((a) => a.name),
        humanActionRequired: `Approve $${c.repairCostTotal.toLocaleString()} in reverse-logistics operational budget.`,
        activityLogs: [`[${ts()}] Refurb/repair loop opened for batch of ${c.fieldReturnsCount}`, `[${ts()}] Computed unit yields`, `[${ts()}] Executed cost-benefit analysis`, `[${ts()}] Net savings: $${c.netSavingsUsd.toLocaleString()}`]
      };
      result.unaiTokenComparison = await tokenCompare.compareForAgent("refurb-repair", payload, result, ev, { layers: res.observability.layerTokensReal, measured: "real" });
      result.__ev = ev;
      const realLayers = await buildRealLayerTokens(res);
      result.unaiEconomics = realLayers.economics;
      return result;
    }
    async function runRmaTriage(payload) {
      const { productName, serialNumber, defectDescription, purchaseDate } = payload;
      const res = runPlan("rma-triage", { serial_number: serialNumber, defect_description: defectDescription, purchase_date: purchaseDate, product_name: productName });
      const c = res.results.solvability_recommendation;
      const ev = c.evidence;
      const fa = c.failureRepairAnalysis;
      const result = {
        reasoningSteps: [
          `Ingested RMA return details for card: ${serialNumber}.`,
          `Computed warranty status against enterprise purchase guidelines.`,
          `Analyzed defect signature: "${defectDescription}".`,
          `Disposition resolved on the UNAI shared runtime: ${c.disposition}.`
        ],
        solvabilityRecommendation: c.solvabilityRecommendation,
        warrantyStatus: c.warrantyStatus,
        warrantyDetails: c.warrantyDetails,
        disposition: c.disposition,
        confidenceScore: Math.round(ev.confidence * 100),
        keyFactors: ev.attribution.map((a) => a.name),
        replenishmentTriggered: c.replenishmentTriggered,
        humanActionRequired: c.disposition === "Self-Troubleshoot" ? "Verify client followed the local troubleshooting procedure; re-evaluate if the defect persists." : "Sign off on the diagnostic evaluation to route this unit to factory repair and generate the replacement shipping invoice.",
        activityLogs: [`[${ts()}] Ingested return serial: ${serialNumber}`, `[${ts()}] Parsed purchase date: ${purchaseDate}`, `[${ts()}] Classified defect signature`, `[${ts()}] Disposition: ${c.disposition}`],
        softwareResolution: fa.category === "general signal integrity" ? "Update to latest CUDA/driver stack and purge legacy caches." : void 0,
        firmwareRecommendation: "Flash latest production SBIOS/firmware branch.",
        driverRecommendation: "Enterprise Production Branch driver, latest version.",
        businessImpactUsd: c.disposition === "Self-Troubleshoot" ? `$${fa.salvageSavingsUsd.toLocaleString()} Saved` : `$${fa.salvageSavingsUsd.toLocaleString()} Cost Saved via Refurbishment`,
        knowledgeBaseMatch: `NVIDIA-KB \u2014 ${fa.category} advisory`,
        failureRepairAnalysis: fa
      };
      result.unaiTokenComparison = await tokenCompare.compareForAgent("rma-triage", payload, result, ev, { layers: res.observability.layerTokensReal, measured: "real" });
      result.__ev = ev;
      const realLayers = await buildRealLayerTokens(res);
      result.unaiEconomics = realLayers.economics;
      return result;
    }
    async function runOrchestrator(payload) {
      const { kpiBreachType, affectedRegion, impactedSku, productName, serialNumber } = payload || {};
      const scenario = {};
      if (kpiBreachType || productName) scenario.kpi_breach_type = kpiBreachType || `Hardware Issue: ${productName}`;
      if (affectedRegion) scenario.affected_region = affectedRegion;
      if (impactedSku || serialNumber) scenario.impacted_sku = impactedSku || serialNumber;
      const res = runPlan("orchestrator", scenario);
      const c = res.results.current_kpi_value;
      const ev = c.evidence;
      const result = {
        reasoningSteps: [
          `Ingested breach alert for SKU: ${scenario.impacted_sku || "N/A"}.`,
          `Evaluated current buffer inventory across regional distribution centers.`,
          `Initiated telemetry handshake with local Demand Sensing and Triage nodes.`,
          `Orchestration sequenced on the UNAI shared runtime.`
        ],
        mitigationPlanSummary: `Coordinated action plan triggered to resolve ${scenario.kpi_breach_type || "the breach"}${scenario.affected_region ? " in " + scenario.affected_region : ""}. Reserve stock is being routed to buffer the demand spike.`,
        currentKpiValue: c.currentKpiValue,
        targetKpiValue: c.targetKpiValue,
        coordinatedAgents: c.coordinatedAgents,
        sequenceSteps: c.sequenceSteps,
        confidenceScore: Math.round(ev.confidence * 100),
        keyFactors: ev.attribution.map((a) => a.name),
        humanActionRequired: "Approve the multi-agent orchestration sequence to dispatch the buffer shipment.",
        activityLogs: [`[${ts()}] Control tower received breach alert`, `[${ts()}] Orchestration pipeline initialized`, `[${ts()}] Dispatched signals to coordinated agents`, `[${ts()}] Integrated feedback response payloads`]
      };
      result.unaiTokenComparison = await tokenCompare.compareForAgent("orchestrator", payload, result, ev, { layers: res.observability.layerTokensReal, measured: "real" });
      result.__ev = ev;
      const realLayers = await buildRealLayerTokens(res);
      result.unaiEconomics = realLayers.economics;
      return result;
    }
    var RUNNERS = {
      "demand-forecast": runDemandForecast,
      "demand-sensing": runDemandSensing,
      "forecast-npi": runForecastNpi,
      "refurb-repair": runRefurbRepair,
      "rma-triage": runRmaTriage,
      "orchestrator": runOrchestrator
    };
    function buildExplain(result, ev) {
      if (!result || typeof result !== "object") return null;
      ev = ev || {};
      const attr = Array.isArray(ev.attribution) ? ev.attribution : [];
      const shareOf = (a) => Math.round((a.share != null ? a.share : a.weight || 0) * 100);
      const top = attr.slice().sort((a, b) => shareOf(b) - shareOf(a))[0] || null;
      const confidencePct = ev.confidence != null ? Math.round(ev.confidence * 100) : result.confidenceScore != null ? result.confidenceScore : result.confidenceRating != null ? result.confidenceRating : null;
      const autonomous = !!ev.autonomous;
      const decision = ev.decision || result.disposition || result.consensusSummary || result.recommendedResolution || result.solvabilityRecommendation || Array.isArray(result.reasoningSteps) && result.reasoningSteps[result.reasoningSteps.length - 1] || "";
      return {
        decision: decision || "",
        confidencePct,
        autonomous,
        outcome: autonomous ? "executed autonomously" : "routed to a human approver",
        primaryDriver: top ? { name: top.name, sharePct: shareOf(top) } : null,
        rootCause: top ? `Driven chiefly by ${top.name} (${shareOf(top)}% of the weighting)${confidencePct != null ? `, with ${confidencePct}% confidence` : ""} \u2014 ${autonomous ? "above the 85% autonomy threshold and within policy, so it executed and was recorded to the audit trail" : "below the 85% autonomy threshold, so it routed to a human for sign-off"}.` : "",
        reasoningSteps: Array.isArray(result.reasoningSteps) ? result.reasoningSteps : [],
        contributingFactors: attr.map((a) => ({ name: a.name, sharePct: shareOf(a) })),
        recommendedAction: result.humanActionRequired || result.recommendedResolution || result.solvabilityRecommendation || ""
      };
    }
    async function runAgentViaUnai2(agentId, payload) {
      const runner = RUNNERS[agentId];
      if (!runner) throw new Error(`No UNAI adapter registered for agentId: ${agentId}`);
      const result = await runner(payload || {});
      try {
        result.unaiExplain = buildExplain(result, result.__ev);
        delete result.__ev;
      } catch (_) {
      }
      try {
        const eco = result.unaiEconomics, tc = result.unaiTokenComparison;
        if (eco && tc && tc.original) {
          const n = eco.nDec || 1;
          const gen1In = (tc.original.promptTokens || 0) * n, gen1Out = (tc.original.completionTokens || 0) * n;
          eco.gen1Total = gen1In + gen1Out;
          eco.gen1PerDecision = Math.round(eco.gen1Total / n);
          eco.unaiPerDecision = Math.round(eco.unaiTotal / n);
          eco.savedPct = eco.gen1Total ? Math.round(100 * (1 - eco.unaiTotal / eco.gen1Total)) : 0;
          const inR = 0.2 / 1e6, outR = 0.6 / 1e6;
          eco.unaiCostRun = eco.unaiIn * inR + eco.unaiOut * outR;
          eco.gen1CostRun = gen1In * inR + gen1Out * outR;
          eco.unaiPer1k = eco.unaiCostRun / n * 1e3;
          eco.gen1Per1k = eco.gen1CostRun / n * 1e3;
          eco.costSavedPct = eco.gen1CostRun ? Math.round(100 * (1 - eco.unaiCostRun / eco.gen1CostRun)) : 0;
        }
      } catch (_) {
      }
      return result;
    }
    module2.exports = { runAgentViaUnai: runAgentViaUnai2 };
  }
});

// server.ts
var import_dotenv = __toESM(require("dotenv"), 1);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");

// src/data.ts
var productsDatabase = [
  { name: "H100 SXM5 80GB", phase: "Mature S&OP", safetyStock: 92, targetStock: 100, bufferStatus: "Optimal", leadTimeWeeks: 12, rmaYield: 91 },
  { name: "H200 NVL PCIe 94GB", phase: "Growth Ramp", safetyStock: 85, targetStock: 100, bufferStatus: "Optimal", leadTimeWeeks: 10, rmaYield: 93 },
  { name: "H200 NVL PCIe", phase: "Growth Ramp", safetyStock: 74, targetStock: 100, bufferStatus: "Moderate Buffer", leadTimeWeeks: 14, rmaYield: 87 },
  { name: "H200 NVLink 141GB", phase: "Growth Ramp", safetyStock: 80, targetStock: 100, bufferStatus: "Optimal", leadTimeWeeks: 12, rmaYield: 92 },
  { name: "Blackwell B200 HGX", phase: "NPI Ramp", safetyStock: 42, targetStock: 100, bufferStatus: "CRITICAL LOW", leadTimeWeeks: 22, rmaYield: 94 },
  { name: "GB200 Superchip NVL72", phase: "NPI Ramp", safetyStock: 35, targetStock: 100, bufferStatus: "CRITICAL LOW", leadTimeWeeks: 26, rmaYield: 95 },
  { name: "DGX SuperPOD B200", phase: "NPI Ramp", safetyStock: 25, targetStock: 100, bufferStatus: "CRITICAL LOW", leadTimeWeeks: 24, rmaYield: 91 },
  { name: "Rubin Ultra Module", phase: "Concept / NPI Planning", safetyStock: 0, targetStock: 100, bufferStatus: "Pre-Launch Zero Stock", leadTimeWeeks: 38, rmaYield: 100 },
  { name: "Rubin R100 GPU", phase: "Concept / NPI Planning", safetyStock: 0, targetStock: 100, bufferStatus: "Pre-Launch Zero Stock", leadTimeWeeks: 36, rmaYield: 100 },
  { name: "DGX GH200 System", phase: "Mature S&OP", safetyStock: 86, targetStock: 100, bufferStatus: "Optimal", leadTimeWeeks: 16, rmaYield: 85 },
  { name: "BlueField-3 DPU", phase: "Mature S&OP", safetyStock: 98, targetStock: 100, bufferStatus: "Optimal", leadTimeWeeks: 6, rmaYield: 97 },
  { name: "BlueField-3 SuperNIC", phase: "Mature S&OP", safetyStock: 94, targetStock: 100, bufferStatus: "Optimal", leadTimeWeeks: 6, rmaYield: 96 },
  { name: "ConnectX-7 Adapter", phase: "Harvesting", safetyStock: 110, targetStock: 100, bufferStatus: "Surplus Stock", leadTimeWeeks: 4, rmaYield: 99 },
  { name: "Spectrum-X100 Ethernet", phase: "Mature S&OP", safetyStock: 90, targetStock: 100, bufferStatus: "Optimal", leadTimeWeeks: 8, rmaYield: 98 },
  { name: "Grace CPU Superchip", phase: "Growth Ramp", safetyStock: 68, targetStock: 100, bufferStatus: "Moderate Buffer", leadTimeWeeks: 18, rmaYield: 89 },
  { name: "Jetson Orin AGX 64GB", phase: "Harvesting", safetyStock: 105, targetStock: 100, bufferStatus: "Optimal", leadTimeWeeks: 8, rmaYield: 93 },
  { name: "Drive Thor ADAS SoC", phase: "Concept / NPI Planning", safetyStock: 5, targetStock: 100, bufferStatus: "Pre-Launch Zero Stock", leadTimeWeeks: 32, rmaYield: 100 }
];

// agents/client.ts
var import_openai = __toESM(require("openai"), 1);
var nvidiaClientInstance = null;
function getNvidiaClient() {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY environment variable is missing. Please configure it in your environment or .env file.");
  }
  if (!nvidiaClientInstance) {
    nvidiaClientInstance = new import_openai.default({
      apiKey,
      baseURL: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1"
    });
  }
  return nvidiaClientInstance;
}
var NVIDIA_DEFAULT_MODEL = process.env.NVIDIA_MODEL || "meta/llama-3.3-70b-instruct";

// agents/rmaTriage.ts
async function generateRmaDoc(params) {
  const currentLocalTime = "2026-07-14T04:27:56-07:00";
  const {
    productName,
    serialNumber,
    defectDescription,
    disposition,
    warrantyStatus,
    warrantyDetails,
    confidenceScore,
    solvabilityRecommendation,
    approvedBy,
    designatedEmail
  } = params;
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    console.log("[NVIDIA Client] API key is missing. Generating baseline markdown document.");
    return `
# NVIDIA TECHNICAL SERVICE & RETURN AUTHORIZATION (RMA) DIRECTIVE

**Document ID:** RMA-${serialNumber.toUpperCase()}-2026  
**Generated On:** ${currentLocalTime}  
**Classification:** NVIDIA Enterprise Restricted  

---

## 1. Executive Summary
This document provides the formal engineering triage and routing directive for the returned product unit **${productName}**, under Serial Number **${serialNumber}**. The AI Triage control network has performed deep defect signature matching and warranty calculation, leading to a recommended disposition of **${disposition}** with a confidence index of **${confidenceScore}%**.

## 2. Diagnostic Triage Report
- **Asset Model:** ${productName}
- **Assigned Serial:** \`${serialNumber}\`
- **Reported Technical Defect:** *"${defectDescription}"*
- **Diagnostic Solver Output:**  
  ${solvabilityRecommendation}

## 3. SLA & Warranty Validation
- **Coverage Status:** **${warrantyStatus}**
- **Validation Log:** ${warrantyDetails}
- **Service Level Agreement (SLA) Class:** Platinum Mission Critical Enterprise Support  

## 4. Next Action Resolution Playbook
Based on the **${disposition}** directive, the following action pathways have been allocated:
1. **Self-Service Actions:** Verify host server bios settings and clean reinstall drivers according to specifications.
2. **Factory Routing:** (If applicable) Clear diagnostic logs and place the card inside anti-static ESD shielding before courier dispatch.
3. **Queue Rebalancing:** Replenishment buffers in APAC are updated to reflect the tracking state of this unit.

## 5. Sign-off & Route Dispatch
- **Approved By (Human Administrator):** ${approvedBy}
- **Designated Recipient Notify List:** \`${designatedEmail}\`
- **Direct Dispatch Gateway:** Routed to NVIDIA Global Logistics Center.

---
*NVIDIA AI Control Tower - Document generated autonomously with human sign-off loop.*
`;
  }
  const prompt = `
    You are the NVIDIA RMA Document Generator LLM. Write an official, professional, and comprehensive NVIDIA RMA Authorization and Technical Diagnostics Document in Markdown format.
    Use professional NVIDIA corporate layout and clear visual markers.

    Product Details:
    - Product Name: ${productName}
    - Serial Number: ${serialNumber}
    - Purchase Date/Warranty Check: ${warrantyDetails} (${warrantyStatus} Warranty)
    - Reported Technical Defect: ${defectDescription}
    
    Triage and Disposition Details:
    - Recommended Disposition: ${disposition}
    - AI Model Triage Confidence: ${confidenceScore}%
    - Recommended Actions / Next Steps:
      ${solvabilityRecommendation}
    
    Approval & Human-in-the-Loop Info:
    - Approved By (Human Administrator): ${approvedBy}
    - Designated Recipient: ${designatedEmail}
    - Generation Time: ${currentLocalTime} (July 2026)

    Guidelines for the Document:
    1. Structure it like an official corporate PDF/Document: include a professional title "NVIDIA TECHNICAL SERVICE & RETURN AUTHORIZATION (RMA) DIRECTIVE", an "Executive Summary", a "Diagnostic Triage Report", "SLA & Warranty Validation", "Next Action Resolution Playbook", and a "Sign-off & Route Dispatch" section.
    2. Use markdown formatting like bold text, elegant bullet points, blockquotes, and tables where appropriate to make it visually stunning and easy to scan.
    3. Keep the tone technical, objective, authoritative, and helpful. Do not output anything other than the markdown document content itself.
  `;
  const openai = getNvidiaClient();
  const response = await openai.chat.completions.create({
    model: NVIDIA_DEFAULT_MODEL,
    messages: [
      { role: "system", content: "You are a senior hardware engineering analyst and supply chain compliance expert at NVIDIA. You write exhaustive, professional corporate RMA documents." },
      { role: "user", content: prompt }
    ]
  });
  return response.choices[0]?.message?.content || "Failed to generate RMA document content.";
}

// server.ts
var import_unaiAdapter = __toESM(require_unaiAdapter(), 1);
import_dotenv.default.config();
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = process.env.PORT || 3e3;
  app.use(import_express.default.json({ limit: "10mb" }));
  let productsDatabase2 = productsDatabase;
  app.use("/api/*", (req, res, next) => {
    console.log(`[Server] API request: ${req.method} ${req.originalUrl}`);
    next();
  });
  app.get("/api/products", (req, res) => {
    res.json(productsDatabase2);
  });
  app.post("/api/products/simulate-draw", (req, res) => {
    productsDatabase2 = productsDatabase2.map((p) => {
      if (p.name === "Blackwell B200 HGX") {
        return { ...p, safetyStock: 12, bufferStatus: "DEPLETED - EMERGENCY RUN" };
      }
      if (p.name === "H200 NVL PCIe") {
        return { ...p, safetyStock: 28, bufferStatus: "CRITICAL LOW" };
      }
      return p;
    });
    res.json(productsDatabase2);
  });
  app.post("/api/agents/generate-rma-doc", async (req, res) => {
    try {
      const {
        productName,
        serialNumber,
        defectDescription,
        disposition,
        warrantyStatus,
        warrantyDetails,
        confidenceScore,
        solvabilityRecommendation,
        approvedBy,
        designatedEmail
      } = req.body;
      const docText = await generateRmaDoc({
        productName,
        serialNumber,
        defectDescription,
        disposition,
        warrantyStatus,
        warrantyDetails,
        confidenceScore,
        solvabilityRecommendation,
        approvedBy,
        designatedEmail
      });
      res.json({ documentText: docText });
    } catch (err) {
      console.error("[Server] Error generating RMA document:", err);
      res.status(500).json({ error: err.message || "Failed to generate RMA document" });
    }
  });
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.get("/api/unai/key-status", (_req, res) => {
    const key = process.env.GATEWAY_API_KEY || process.env.MISTRAL_API_KEY || "";
    res.json({
      set: !!key,
      provider: process.env.GATEWAY_PROVIDER || (process.env.MISTRAL_API_KEY ? "mistral" : ""),
      model: process.env.GATEWAY_MODEL || (key ? "mistral-small-latest" : ""),
      tail: key ? key.slice(-4) : ""
    });
  });
  app.post("/api/unai/set-key", (req, res) => {
    const body = req.body || {};
    const key = String(body.key || "").trim();
    if (!key) return res.status(400).json({ ok: false, error: "provide a key" });
    const det = /^sk-or-/.test(key) ? { base: "https://openrouter.ai/api/v1", provider: "openrouter", model: "mistralai/mistral-small" } : /^gsk_/.test(key) ? { base: "https://api.groq.com/openai/v1", provider: "groq", model: "llama-3.1-8b-instant" } : /^AIza/.test(key) ? { base: "https://generativelanguage.googleapis.com/v1beta/openai", provider: "gemini", model: "gemini-1.5-flash" } : /^sk-/.test(key) ? { base: "https://api.openai.com/v1", provider: "openai", model: "gpt-4o-mini" } : { base: "https://api.mistral.ai/v1", provider: "mistral", model: "mistral-small-latest" };
    process.env.GATEWAY_API_KEY = key;
    process.env.GATEWAY_BASE_URL = String(body.base || det.base);
    process.env.GATEWAY_MODEL = String(body.model || det.model);
    process.env.GATEWAY_PROVIDER = det.provider;
    res.json({ ok: true, provider: det.provider, model: process.env.GATEWAY_MODEL, tail: key.slice(-4) });
  });
  app.post("/api/unai/clear-key", (_req, res) => {
    delete process.env.GATEWAY_API_KEY;
    delete process.env.GATEWAY_BASE_URL;
    delete process.env.GATEWAY_MODEL;
    delete process.env.GATEWAY_PROVIDER;
    delete process.env.MISTRAL_API_KEY;
    res.json({ ok: true });
  });
  app.post("/api/agents/run", async (req, res) => {
    const { agentId, payload } = req.body;
    if (!agentId) {
      return res.status(400).json({ error: "agentId parameter is required" });
    }
    console.log(`[Orchestrator Tower] Received run signal for agent: ${agentId}`);
    console.log(`[Orchestrator Tower] Payload:`, JSON.stringify(payload));
    try {
      const KNOWN_AGENTS = ["rma-triage", "demand-sensing", "demand-forecast", "forecast-npi", "refurb-repair", "orchestrator"];
      if (!KNOWN_AGENTS.includes(agentId)) {
        return res.status(400).json({ error: `Unknown agentId: ${agentId}` });
      }
      console.log(`[Orchestrator Tower] Running ${agentId} on the UNAI shared runtime`);
      const result = await (0, import_unaiAdapter.runAgentViaUnai)(agentId, payload);
      console.log(`[Orchestrator Tower] Sending result for ${agentId}`);
      return res.json(result);
    } catch (error) {
      console.error(`[Orchestrator Tower] Error executing agent ${agentId}:`, error);
      return res.status(500).json({
        error: error.message || "An internal error occurred during agent execution",
        details: error.stack
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("[Server] Vite dev server middleware mounted.");
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
    console.log("[Server] Production static server mounted, serving dist/.");
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] NVIDIA Multi-Agent Control Tower listening on port ${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("[Server] Critical startup error:", err);
  process.exit(1);
});
//# sourceMappingURL=server.cjs.map
