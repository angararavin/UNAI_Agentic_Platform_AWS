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
        { c: "adoption_rate", d: "change", t: "pct", aliases: ["current_value", "adoption_rate", "adoption"], syn: ["adoption"] },
        // ---- Datacenter hardware RMA (Google tray lifecycle) ----
        { c: "tray_id", d: "returns", t: "id", aliases: ["tray_id", "tray", "asset_id"], syn: ["tray", "asset"] },
        { c: "mpn", d: "master", t: "id", aliases: ["mpn", "manufacturer_part_number", "part_number"], syn: ["part number", "manufacturer part number"] },
        { c: "failure_code", d: "returns", t: "cat", aliases: ["failure_code", "fault_code", "error_code"], syn: ["fault code", "error code"] },
        { c: "failure_description", d: "returns", t: "text", aliases: ["failure_description", "failure_desc", "symptom_description"], syn: ["symptom"] },
        { c: "dcha_telemetry", d: "returns", t: "text", aliases: ["dcha_log", "dcha_telemetry", "telemetry_log", "diagnostic_log"], syn: ["telemetry", "diagnostics"] },
        { c: "rma_stage", d: "returns", t: "cat", aliases: ["current_stage", "rma_stage", "pipeline_stage"], syn: ["stage", "pipeline stage"] },
        { c: "hours_in_stage", d: "returns", t: "num", aliases: ["hours_in_stage", "dwell_hours", "time_in_stage"], syn: ["dwell time", "dwell hours"] },
        { c: "micro_slo_hours", d: "returns", t: "num", aliases: ["micro_slo", "micro_slo_hours", "stage_slo"], syn: ["slo", "micro slo"] },
        { c: "event_history", d: "returns", t: "text", aliases: ["event_history", "event_log", "status_history"], syn: ["event log"] },
        { c: "failure_type", d: "returns", t: "cat", aliases: ["failure_type", "fault_type"], syn: ["fault type"] },
        { c: "business_impact", d: "returns", t: "cat", aliases: ["business_impact", "impact_level"], syn: ["impact"] },
        { c: "carrier_status", d: "logistics", t: "cat", aliases: ["carrier_status", "carrier_availability"], syn: ["carrier availability"] },
        { c: "cm_queue_status", d: "returns", t: "cat", aliases: ["cm_queue_status", "cm_queue", "contract_manufacturer_queue"], syn: ["cm queue"] },
        { c: "serial_number", d: "returns", t: "id", aliases: ["serial_number", "serial", "sn", "expected_serial"], syn: ["serial"] },
        { c: "returned_serial", d: "returns", t: "id", aliases: ["returned_serial", "actual_serial", "received_serial"], syn: ["returned serial"] },
        { c: "repair_status", d: "returns", t: "cat", aliases: ["repair_status", "repair_state"], syn: ["repair state"] },
        { c: "manifest_details", d: "returns", t: "text", aliases: ["manifest_details", "manifest", "shipment_manifest"], syn: ["manifest"] }
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
        ocm_change_management: ["change_readiness", "stakeholder_influence", "training_completion", "change_risk", "adoption_rate"],
        // ---- Datacenter hardware RMA (Google tray lifecycle) ----
        dc_hw_rma: ["tray_id", "failure_code", "rma_stage", "hours_in_stage", "plant", "on_hand_qty", "rma_id", "warranty_status"]
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
        ocm_change_management: "Change \xB7 OCM",
        dc_hw_rma: "Aftermarket \xB7 DC Hardware RMA"
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
        ocm_change_management: { method: "change adoption modeling", decision: "Assess readiness and predict adoption; target the highest-risk stakeholder groups", formula: "adoption \u2190 f(readiness, training, support, \u2212resistance)" },
        dc_hw_rma: { method: "failure disposition \u2192 dwell/SLA monitoring \u2192 urgency/logistics \u2192 return reintegration", decision: "Diagnose the tray failure, escalate SLA-breaching dwell, prioritize logistics by urgency, then validate & reintegrate the returned spare" }
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
      adoption_rate: { SERVICENOW: "current_value", ANALYTICS: "current_value" },
      // ---- Agribusiness fresh & frozen (analytics store) ----
      contracted_acres: { ANALYTICS: "contracted_acres" },
      expected_yield: { ANALYTICS: "exp_yield_cwt" },
      raw_supply: { ANALYTICS: "raw_supply_cwt" },
      proc_demand: { ANALYTICS: "proc_demand_cwt" }
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
          ],
          // -----------------------------------------------------------------------
          // AGRIBUSINESS / FRESH & FROZEN FOOD demo data (agri_fresh_supply agent).
          // ILLUSTRATIVE, open-source-derived — modeled on public agri references
          // (USDA NASS potato yields ~380-450 cwt/acre in ID/WA; USDA/World Bank
          // fertilizer commodity indices for urea/DAP), NOT live customer data.
          // Products echo a potato-processor + fertilizer footprint: frozen fries,
          // dehydrated potato, fresh pack, plus a nitrogen/phosphate input book.
          // cwt = hundredweight (100 lb). All $ derived here are MODELED from this
          // seed, not measured — only the token/benchmark figures are measured.
          // -----------------------------------------------------------------------
          agri_supply: [
            // raw-crop supply vs processing demand (shared context, read once + reused)
            { sku_id: "FZ-FRY-8MM", dc_code: "PLANT-ID", contracted_acres: 21500, exp_yield_cwt: 415, raw_supply_cwt: 892e4, proc_demand_cwt: 94e5 },
            { sku_id: "DEHY-FLAKE", dc_code: "PLANT-ID", contracted_acres: 6200, exp_yield_cwt: 402, raw_supply_cwt: 2492e3, proc_demand_cwt: 218e4 },
            { sku_id: "FRESH-PACK", dc_code: "PLANT-WA", contracted_acres: 4800, exp_yield_cwt: 388, raw_supply_cwt: 1862e3, proc_demand_cwt: 176e4 }
          ],
          agri_lots: [
            // perishable lots — FEFO / cold-chain shelf-life risk
            { sku_id: "FRESH-PACK", lot_id: "L-3391", days_to_expiry: 4, temp_c: 6.8, qty_cwt: 3200, grade: "A" },
            { sku_id: "FRESH-PACK", lot_id: "L-3402", days_to_expiry: 11, temp_c: 4.2, qty_cwt: 5100, grade: "A" },
            { sku_id: "FZ-FRY-8MM", lot_id: "L-7712", days_to_expiry: 2, temp_c: -14.5, qty_cwt: 8600, grade: "B" },
            { sku_id: "DEHY-FLAKE", lot_id: "L-9021", days_to_expiry: 45, temp_c: 21, qty_cwt: 1400, grade: "A" }
          ],
          agri_demand: [
            // retail + foodservice demand sensing vs plan
            { sku_id: "FZ-FRY-8MM", channel: "Foodservice", plan_qty: 64e4, sensed_qty: 731e3, prev_qty: 655e3 },
            { sku_id: "DEHY-FLAKE", channel: "Retail", plan_qty: 148e3, sensed_qty: 151500, prev_qty: 149e3 },
            { sku_id: "FRESH-PACK", channel: "Retail", plan_qty: 96e3, sensed_qty: 82e3, prev_qty: 94e3 }
          ],
          agri_coldchain: [
            // multi-echelon cold-storage inventory
            { sku_id: "FZ-FRY-8MM", dc_code: "CS-WEST", on_hand_cwt: 118e3, safety_cwt: 9e4, target_cwt: 165e3, weekly_demand_cwt: 61e3 },
            { sku_id: "FZ-FRY-8MM", dc_code: "CS-EAST", on_hand_cwt: 42e3, safety_cwt: 7e4, target_cwt: 14e4, weekly_demand_cwt: 58e3 },
            { sku_id: "DEHY-FLAKE", dc_code: "CS-WEST", on_hand_cwt: 39e3, safety_cwt: 22e3, target_cwt: 48e3, weekly_demand_cwt: 12500 }
          ],
          agri_logistics: [
            // reefer transport — OTIF + temperature excursion
            { sku_id: "FZ-FRY-8MM", lane: "PLANT-ID\u2192CS-EAST", carrier: "ColdHaul", reefer_setpoint_c: -18, temp_excursion_c: 5.5, otif_pct: 0.86, transit_days: 4 },
            { sku_id: "FRESH-PACK", lane: "PLANT-WA\u2192CS-WEST", carrier: "FreshLine", reefer_setpoint_c: 4, temp_excursion_c: 1.1, otif_pct: 0.95, transit_days: 2 }
          ],
          agri_fertilizer: [
            // input procurement / hedge (Simplot AgriBusiness side)
            { input_id: "UREA-N", spot_usd_ton: 512, contract_usd_ton: 430, coverage_pct: 0.55, req_tons: 44e3, price_trend: 0.09 },
            { input_id: "DAP-P", spot_usd_ton: 638, contract_usd_ton: 690, coverage_pct: 0.8, req_tons: 18e3, price_trend: -0.04 }
          ],
          agri_recovery: [
            // off-spec / surplus routing (waste-to-value)
            { sku_id: "FZ-FRY-8MM", offspec_cwt: 46e3, feed_price_cwt: 3.1, dehy_price_cwt: 7.4, landfill_cost_cwt: 1.2 },
            { sku_id: "FRESH-PACK", offspec_cwt: 9800, feed_price_cwt: 2.6, dehy_price_cwt: 6.9, landfill_cost_cwt: 1.5 }
          ],
          agri_production: [
            // frozen-line scheduling vs raw availability + commitments
            { line_id: "FRY-L1", sku_id: "FZ-FRY-8MM", capacity_cwt: 72e4, committed_cwt: 69e4, raw_avail_cwt: 64e4, changeover_hrs: 6 },
            { line_id: "DEHY-L2", sku_id: "DEHY-FLAKE", capacity_cwt: 21e4, committed_cwt: 168e3, raw_avail_cwt: 205e3, changeover_hrs: 3 }
          ]
        };
        this.db.sap_spec = [
          ["ts_general_info", "General Information", 0.96, 0.2, 0, 0.85, 1],
          ["ts_business_needs", "Business Needs & Requirements", 0.92, 0.3, 1, 0.6, 2],
          ["ts_assumptions_deps", "Assumptions and Dependencies", 0.88, 0.3, 2, 0.55, 1],
          ["ts_functional_details", "Functional Details", 0.9, 0.5, 2, 0.5, 4],
          ["ts_reports", "Reports", 0.86, 0.5, 1, 0.65, 3],
          ["ts_functional_modules", "Functional Modules", 0.84, 0.5, 2, 0.6, 3],
          ["ts_enhancements", "Enhancements", 0.78, 0.7, 2, 0.45, 3],
          ["ts_forms", "Forms", 0.82, 0.5, 1, 0.7, 2],
          ["ts_interfaces", "Interfaces", 0.8, 0.7, 3, 0.4, 4],
          ["ts_conversions", "Conversions", 0.83, 0.5, 2, 0.55, 2],
          ["ts_workflows", "Workflows", 0.79, 0.7, 3, 0.45, 3],
          ["ts_webdynpro", "Web Dynpro", 0.42, 0.9, 3, 0.3, 1],
          ["ts_module_pool", "Module Pool", 0.4, 0.9, 2, 0.25, 1],
          ["ts_fiori_ui5", "Fiori and UI5", 0.85, 0.5, 1, 0.75, 2],
          ["ts_programming_logic", "Programming Logic", 0.88, 0.7, 2, 0.5, 4],
          ["ts_custom_transactions", "Custom Transactions", 0.48, 0.7, 2, 0.35, 2],
          ["ts_data_dictionary", "Data Dictionary", 0.94, 0.3, 1, 0.8, 3],
          ["ts_error_handling", "Error/Exception Handling", 0.86, 0.5, 2, 0.55, 2],
          ["ts_role_auth", "Roles and Authorizations", 0.9, 0.3, 1, 0.7, 2],
          ["ts_change_history", "List of Changes and Transports", 0.5, 0.2, 1, 0.6, 1],
          ["ts_additional_info", "Additional Information and Attachments", 0.93, 0.2, 0, 0.8, 0]
        ].map(([section, title, fs2, cplx, deps, reuse, objs]) => ({ section, title, fs: fs2, cplx, deps, reuse, objs }));
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
            { number: "RMA0012841", cmdb_ci: "GPU-H100", u_status: "RECEIVED", u_warranty: "IN_WARRANTY", u_claim_value: 24500, u_entitled: true, u_oem: "NVIDIA", u_symptom: "Xid 79 fall-off-bus", u_dwell_hours: 30, u_sla_hours: 48 },
            { number: "RMA0012842", cmdb_ci: "PSU-2200", u_status: "RECEIVED", u_warranty: "OUT_WARRANTY", u_claim_value: 890, u_entitled: false, u_oem: "Delta", u_symptom: "No power-on", u_dwell_hours: 58, u_sla_hours: 48 }
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
        this.signals = {};
        this.signalLog = [];
        this.mode = "live";
        this.approvals = null;
        this.stagedActions = [];
        this.pendingApprovals = [];
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
          return this.cache[key];
        }
        this._accountContextSwitch(system);
        const native = this.systems[system].query(entity, filter);
        const canonical = native.map((r) => this.mapper.toCanonical(system, r));
        this.cache[key] = canonical;
        this.firstReads++;
        this._hit("Perception", `read ${entity} from ${system} \u2192 ${canonical.length} canonical rows`, NOW() - t);
        this.trace("Perception", `read ${entity} from ${system}`, { rows: canonical.length });
        return canonical;
      }
      // L2 Memory — unified episodic/semantic store (shared across capabilities)
      remember(key, value) {
        const t = NOW();
        this.memory[key] = value;
        this._hit("Memory", `store \u201C${key}\u201D`, NOW() - t);
        this.trace("Memory", `store ${key}`);
      }
      recall(key) {
        const t = NOW();
        const v = this.memory[key];
        this._hit("Memory", `recall \u201C${key}\u201D`, NOW() - t);
        this.trace("Memory", `recall ${key}`);
        return v;
      }
      // ---- SIGNAL INTEGRITY — shared, cross-cutting (Perception + Memory) ------
      // ingestSignal: any capability records a raw reading with provenance. This is
      // a Perception act (canonical concept in), stored as a rolling time-series.
      ingestSignal(concept, value, meta = {}) {
        const t = NOW();
        const series = this.signals[concept] = this.signals[concept] || [];
        const rec = {
          value,
          source: meta.source || "unknown",
          sourceHealth: meta.sourceHealth == null ? 1 : meta.sourceHealth,
          ts: meta.ts == null ? series.length : meta.ts,
          consequence: meta.consequence || "normal"
        };
        series.push(rec);
        this.signalLog.push(Object.assign({ concept }, rec));
        this._hit("Perception", `ingest ${concept}=${value} @${rec.source} (health ${rec.sourceHealth * 100 | 0}%)`, NOW() - t);
        this.trace("Perception", `ingest signal ${concept}=${value}`, rec);
        return rec;
      }
      // assessSignal: judge the latest reading against the recent window — Memory
      // reconciliation. Returns corroboration, persistence, transient/glitch flag,
      // and a 0..1 trust score. Policy defaults are shared (tunable per call).
      assessSignal(concept, opts = {}) {
        const t = NOW();
        const win = opts.window || 5;
        const minPersist = opts.minPersist || 2;
        const minCorroboration = opts.minCorroboration || 2;
        const series = this.signals[concept] || [];
        const latest = series[series.length - 1];
        const recent = series.slice(-win);
        const agreeing = new Set(recent.filter((r) => latest && r.value === latest.value).map((r) => r.source));
        const corroboration = agreeing.size;
        let persist = 0;
        for (let i = series.length - 1; i >= 0; i--) {
          if (latest && series[i].value === latest.value) persist++;
          else break;
        }
        const priorVals = new Set(recent.slice(0, -1).map((r) => r.value));
        const reverted = !!(latest && [...priorVals].some((v) => v !== latest.value));
        const singleSource = corroboration <= 1;
        const avgHealth = recent.reduce((a2, r) => a2 + r.sourceHealth, 0) / (recent.length || 1);
        const transient = !!(reverted && persist < minPersist && singleSource);
        const stable = persist >= minPersist && corroboration >= minCorroboration;
        let trust = avgHealth * Math.min(1, corroboration / minCorroboration);
        if (transient) trust = Math.min(trust, 0.35);
        const a = {
          concept,
          latest: latest ? latest.value : null,
          corroboration,
          minCorroboration,
          persist,
          minPersist,
          transient,
          stable,
          reverted,
          singleSource,
          avgHealth: +avgHealth.toFixed(2),
          trust: +trust.toFixed(2),
          window: recent.map((r) => ({ v: r.value, src: r.source, h: r.sourceHealth }))
        };
        this._hit("Memory", `assess ${concept}: ${transient ? "transient/glitch" : stable ? "stable" : "unconfirmed"} (corrob ${corroboration}/${minCorroboration}, persist ${persist})`, NOW() - t);
        this.trace("Memory", `assess signal ${concept}`, a);
        return a;
      }
      // L3 Reasoning — goal decomposition (deterministic policy stands in for the
      // LLM orchestration, e.g. Mistral; the control flow is identical)
      reason(goal) {
        const t = NOW();
        const plan = goal.plan;
        this._hit("Reasoning", `decomposed goal into ${plan.length} sub-tasks: ${plan.map((p) => p.capability).join(", ")}`, NOW() - t);
        this.trace("Reasoning", `decomposed goal "${goal.name}" into ${plan.length} sub-tasks`, plan.map((p) => p.capability));
        return plan;
      }
      // L4 Evidence Engine — confidence + attribution + uncertainty + counterfactual
      // `integrity` (optional) is the output of assessSignal(): when present, the
      // signal's trust discounts confidence and an unconfirmed transient forces a
      // hold — the same cross-cutting rule for every capability.
      evidence(decision, drivers, integrity, opts) {
        const t = NOW();
        const BASE = 0.6;
        const sum = drivers.reduce((a, d) => a + d.weight, 0);
        const raw = BASE + sum;
        let confidence = Math.min(0.99, raw);
        let propUnc = 0;
        if (opts && Array.isArray(opts.derivedFrom) && opts.derivedFrom.length) {
          const us = opts.derivedFrom.map((c) => 1 - (typeof c === "object" ? c.confidence || 0 : c));
          propUnc = Math.sqrt(us.reduce((a, u) => a + u * u, 0));
          confidence = Math.min(confidence, 1 - propUnc);
        }
        confidence = +confidence.toFixed(2);
        const total = sum || 1;
        const scale = (confidence - BASE) / (raw - BASE || 1);
        const waterfall = { base: BASE, steps: drivers.map((d) => ({ name: d.name, contribution: +(d.weight * scale).toFixed(3) })), final: confidence };
        const TH = this.autonomyThreshold != null ? this.autonomyThreshold : 0.85;
        const THpct = Math.round(TH * 100);
        const uncPct = Math.max(Math.round((1 - confidence) * 100), Math.round(propUnc * 100));
        const top = [...drivers].sort((a, b) => b.weight - a.weight)[0] || { name: "the top driver", weight: 0 };
        const topPct = Math.round(top.weight * scale * 100);
        const marginPct = Math.round(Math.abs(confidence - TH) * 100);
        const ev = {
          decision,
          confidence,
          base: BASE,
          waterfall,
          attribution: drivers.map((d) => ({ name: d.name, weight: +(d.weight * scale).toFixed(3), share: +(d.weight / total).toFixed(2) })),
          uncertainty: `\xB1${uncPct}%`,
          threshold: TH,
          derivedFrom: opts && Array.isArray(opts.derivedFrom) ? opts.derivedFrom.length : void 0,
          explanationSource: "template",
          autonomous: confidence >= TH,
          // configurable autonomy threshold
          counterfactual: confidence >= TH ? `Clears the ${THpct}% bar by ${marginPct}pp \u2014 top driver \u201C${top.name}\u201D contributes ${topPct}pp, so it would route to a human only if that weakened by more than ${marginPct}pp.` : `Sits ${marginPct}pp below the ${THpct}% bar \u2014 strengthening \u201C${top.name}\u201D (now ${topPct}pp) by ${marginPct}pp would let it execute autonomously.`
        };
        if (integrity) {
          const penalized = +(confidence * integrity.trust).toFixed(2);
          ev.integrity = integrity;
          ev.confidence = penalized;
          const pscale = (penalized - BASE) / (raw - BASE || 1);
          ev.waterfall = { base: BASE, steps: drivers.map((d) => ({ name: d.name, contribution: +(d.weight * pscale).toFixed(3) })), final: penalized };
          ev.attribution = drivers.map((d) => ({ name: d.name, weight: +(d.weight * pscale).toFixed(3), share: +(d.weight / total).toFixed(2) }));
          ev.uncertainty = `\xB1${Math.max(Math.round((1 - penalized) * 100), Math.round(propUnc * 100))}%`;
          ev.autonomous = penalized >= TH && !integrity.transient;
          ev.hold = !ev.autonomous;
          ev.gate = integrity.transient ? "unconfirmed transient \u2014 held for corroboration / persistence" : !ev.autonomous ? `signal trust ${integrity.trust} (corroboration ${integrity.corroboration}/${integrity.minCorroboration}) below policy` : ev.gate;
          ev.counterfactual = integrity.transient ? `If the new state persisted \u2265${integrity.minPersist} samples or a 2nd source corroborated it, it would be trusted and acted on.` : ev.counterfactual;
        }
        this._hit("Evidence", `${decision} \u2192 conf ${ev.confidence}, ${ev.autonomous ? "autonomous" : ev.hold ? "held" : "human gate"}`, NOW() - t);
        this.evidenceLog.push(ev);
        this.trace("Evidence", `${decision} \u2014 confidence ${ev.confidence} (${ev.autonomous ? "autonomous" : "human review"})`, ev);
        return ev;
      }
      // proposeAction — the single gated chokepoint for high-consequence writes.
      // Every write should flow through here: it executes only if the step is
      // autonomous (trusted) OR a human has approved it; otherwise it is HELD.
      // This is the run-time interception point for human-in-the-loop.
      proposeAction(system, op, payload, ev, label) {
        const key = label || op;
        const item = { key, system, op, payload, decision: ev && ev.decision, gate: ev && ev.gate, autonomous: !!(ev && ev.autonomous) };
        if (this.mode === "dry") {
          const willHold = !item.autonomous || this.requireApproval;
          const reason = item.gate || (this.requireApproval ? "policy: human approval required for high-consequence writes" : null);
          this.stagedActions.push(Object.assign({ status: "PREVIEW" }, item));
          if (willHold) this.pendingApprovals.push(Object.assign({ status: "AWAITING_APPROVAL", reason }, item));
          this._hit("Action", `preview ${op} on ${system} \u2014 ${willHold ? "would await approval" : "would auto-execute"} (not committed)`, 0);
          return { status: "PREVIEW" };
        }
        if (item.autonomous && !this.requireApproval) {
          return this.act(system, op, payload);
        }
        if (!item.gate && this.requireApproval) item.gate = "policy: human approval required for high-consequence writes";
        const decision = this.approvals ? this.approvals[key] : void 0;
        if (decision === true) {
          if (ev) ev.humanDecision = "approved";
          const r = this.act(system, op, payload);
          r.approvedByHuman = true;
          this._hit("Action", `human-APPROVED ${op} on ${system}`, 0);
          return r;
        }
        if (ev) ev.humanDecision = decision === false ? "rejected" : "pending";
        this.pendingApprovals.push(Object.assign({ status: decision === false ? "REJECTED" : "AWAITING_APPROVAL", reason: item.gate }, item));
        this.auditTrail.push({
          ts: (/* @__PURE__ */ new Date()).toISOString(),
          system,
          op,
          status: decision === false ? "REJECTED_BY_HUMAN" : "HELD_FOR_APPROVAL",
          ref: null,
          sku: payload && payload.sku || null
        });
        this._hit("Action", `${op} on ${system} \u2014 ${decision === false ? "REJECTED by human" : "HELD for human approval"}`, 0);
        return { status: decision === false ? "REJECTED" : "HELD_FOR_APPROVAL" };
      }
      // L5 Action — universal action bus; canonical intent -> native call
      act(system, op, canonicalPayload) {
        const t = NOW();
        if (this.mode === "dry") {
          this.stagedActions.push({ status: "PREVIEW", system, op, payload: canonicalPayload });
          this._hit("Action", `preview ${op} on ${system} (not committed)`, 0);
          return { status: "PREVIEW" };
        }
        this._accountContextSwitch(system);
        const native = {};
        for (const concept in canonicalPayload) {
          const f = this.mapper.fieldFor(system, concept);
          if (f) native[f] = canonicalPayload[concept];
          else native[concept] = canonicalPayload[concept];
        }
        const res2 = this.systems[system].write(op, native);
        for (const k in this.cache) {
          if (k.indexOf(system + "|") === 0) delete this.cache[k];
        }
        this.metrics.actions++;
        this._hit("Action", `${op} on ${system} \u2192 ${res2.status || "OK"}${res2.EBELN ? " (" + res2.EBELN + ")" : ""}`, NOW() - t);
        this.auditTrail.push({
          ts: (/* @__PURE__ */ new Date()).toISOString(),
          system,
          op,
          status: res2.status || "OK",
          ref: res2.EBELN || null,
          sku: canonicalPayload.sku || null,
          qty: canonicalPayload.qty || null
        });
        this.trace("Action", `${op} on ${system}`, res2);
        return res2;
      }
      // L6 Collaboration — the A2A pub/sub bus (counted here when invoked)
      collaborate(topic, from) {
        const t = NOW();
        this._hit("Collaboration", `${from} \u2192 topic \u201C${topic}\u201D on A2A bus`, NOW() - t);
      }
      // L7 Explainability — native plain-English narration of any evidence object
      explain(ev) {
        const t = NOW();
        const top = [...ev.attribution].sort((a, b) => b.weight - a.weight)[0];
        let tail;
        if (ev.integrity && ev.integrity.transient) {
          const ig = ev.integrity;
          tail = `Signal \u201C${ig.concept}\u201D changed then reverted on a single source within the debounce window (corroboration ${ig.corroboration}/${ig.minCorroboration}, avg source health ${ig.avgHealth * 100 | 0}%) \u2014 classified as an unconfirmed transient (likely telemetry inaccuracy), NOT a real state change. High-consequence action HELD; the source is flagged for calibration.`;
        } else if (ev.integrity && !ev.autonomous) {
          const ig = ev.integrity;
          tail = `Signal trust ${ig.trust} (corroboration ${ig.corroboration}/${ig.minCorroboration}, source health ${ig.avgHealth * 100 | 0}%) is below policy \u2014 action held pending corroboration.`;
        } else if (ev.autonomous) tail = "Executed autonomously (confidence \u2265 threshold and within policy limits).";
        else if (ev.gate && !/within (approval limit|policy)/i.test(ev.gate) && ev.confidence >= (ev.threshold != null ? ev.threshold : 0.85))
          tail = `Confidence ${(ev.confidence * 100).toFixed(0)}% cleared the ${Math.round((ev.threshold != null ? ev.threshold : 0.85) * 100)}% autonomy threshold, but a policy rule applied \u2014 ${ev.gate} \u2014 so it routed to a human reviewer.`;
        else if (ev.gate && ev.gate.includes(">")) tail = `Routed to a human approver \u2014 ${ev.gate}.`;
        else tail = `Routed to a human approver (confidence below the ${Math.round((ev.threshold != null ? ev.threshold : 0.85) * 100)}% threshold).`;
        const text = `${ev.decision}. Confidence ${(ev.confidence * 100).toFixed(0)}% (${ev.uncertainty}). Primary driver: ${top.name} (${Math.round(top.share * 100)}% of the decision). ` + tail;
        ev.explanation = text;
        ev.detailed = this._detailExplain(ev, top, tail);
        this._hit("Explainability", text, NOW() - t);
        this.trace("Explainability", text);
        return text;
      }
      // Build the reference-level, per-decision explainability object that EVERY
      // agent (built or Foundry-converted) inherits — modeled on the detailed
      // reasoning a hand-built agent would surface (primary driver, root cause,
      // step-by-step reasoning, contributing factors, confidence + why gated,
      // recommended action). Deterministic from the Evidence object → 0 tokens.
      // An optional live pass (enrichExplainability) can rewrite the prose fields.
      _detailExplain(ev, top, tail) {
        const pct = (n) => Math.round((n || 0) * 100);
        const confidencePct = pct(ev.confidence);
        const thresholdPct = Math.round((ev.threshold != null ? ev.threshold : 0.85) * 100);
        const factors = [...ev.attribution || []].sort((a, b) => b.share - a.share).map((d) => ({ name: d.name, sharePct: pct(d.share) }));
        const second = factors[1];
        const ig = ev.integrity || null;
        const th = ev.threshold != null ? ev.threshold : 0.85;
        const policyGated = !ev.autonomous && !(ig && ig.transient) && ev.confidence >= th && ev.gate && !/within (approval limit|policy)/i.test(ev.gate);
        const outcome = ev.autonomous ? "Executed autonomously" : ev.hold ? "Held \u2014 signal integrity" : policyGated ? "Routed to review \u2014 policy" : "Routed to a human approver";
        const steps = [];
        steps.push(`Weighed ${factors.length} evidence driver${factors.length === 1 ? "" : "s"} for the decision \u201C${ev.decision}\u201D.`);
        steps.push(`Ranked drivers by contribution \u2014 top: ${top.name} (${pct(top.share)}% of the decision)${second ? `, then ${second.name} (${second.sharePct}%)` : ""}.`);
        steps.push(`Computed confidence at ${confidencePct}% from a ${pct(ev.base)}% prior plus the weighted drivers${ig ? `, then discounted by signal trust ${ig.trust} (corroboration ${ig.corroboration}/${ig.minCorroboration})` : ""}.`);
        steps.push(ev.autonomous ? `Confidence \u2265 the ${thresholdPct}% autonomy threshold and within policy \u2192 executed without human review.` : ig && ig.transient ? `Change looked like an unconfirmed transient \u2192 high-consequence action HELD pending corroboration.` : policyGated ? `Confidence ${confidencePct}% cleared the ${thresholdPct}% autonomy threshold, but a policy rule applied (${ev.gate}) \u2192 routed to a human reviewer.` : `Confidence below the ${thresholdPct}% threshold (or trust below policy) \u2192 routed to a human approver.`);
        let rootCause;
        if (ev.autonomous) {
          rootCause = `The decision is driven chiefly by ${top.name} (${pct(top.share)}% of the weighting), with ${confidencePct}% confidence \u2014 above the ${thresholdPct}% autonomy threshold and within policy limits, so it executed and was logged to the audit trail.`;
        } else if (ig && ig.transient) {
          rootCause = `\u201C${ig.concept}\u201D changed then reverted on a single source within the debounce window (corroboration ${ig.corroboration}/${ig.minCorroboration}, avg source health ${pct(ig.avgHealth)}%). Classified as an unconfirmed transient \u2014 likely telemetry noise \u2014 so the high-consequence action was held and the source flagged for calibration.`;
        } else if (policyGated) {
          rootCause = `Confidence was ${confidencePct}% \u2014 above the ${thresholdPct}% autonomy threshold \u2014 so the model itself was not the blocker. A governance policy applied: ${ev.gate}. The decision was routed to a human reviewer for that policy check rather than executed autonomously.`;
        } else {
          rootCause = `The dominant factor was ${top.name} (${pct(top.share)}%), but overall confidence reached only ${confidencePct}%${ig ? ` after a signal-trust discount (trust ${ig.trust})` : ""}, below the ${thresholdPct}% autonomy threshold \u2014 so the decision was gated for human review rather than executed.`;
        }
        const recommendedAction = ev.autonomous ? `No action required \u2014 executed and recorded. Monitor ${top.name} in case its contribution shifts.` : ig && ig.transient ? `Wait for the signal to persist \u2265${ig.minPersist} samples or a second source to corroborate; recalibrate the flagged source.` : policyGated ? `Send to a human reviewer for the policy check \u2014 ${ev.gate}. Confidence (${confidencePct}%) is not the blocker.` : `Send to a human approver. To reach autonomy, strengthen the grounding behind ${top.name} to lift confidence above ${thresholdPct}%.`;
        const evidence = factors.map((f) => `${f.name} \u2014 ${f.sharePct}% of decision`);
        if (ig) evidence.push(`signal integrity: trust ${ig.trust}, corroboration ${ig.corroboration}/${ig.minCorroboration}, health ${pct(ig.avgHealth)}%`);
        return {
          summary: ev.explanation,
          decision: ev.decision,
          confidencePct,
          uncertainty: ev.uncertainty,
          outcome,
          primaryDriver: { name: top.name, sharePct: pct(top.share) },
          contributingFactors: factors,
          reasoningSteps: steps,
          rootCause,
          evidence,
          gate: { autonomous: !!ev.autonomous, thresholdPct, reason: tail, counterfactual: ev.counterfactual || null },
          recommendedAction,
          confidenceWaterfall: ev.waterfall || null,
          source: ev.explanationSource || "template"
        };
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
    function unaiEmbed(text, dims = 96) {
      const v = new Array(dims).fill(0);
      const toks = String(text || "").toLowerCase().split(/\W+/).filter(Boolean);
      for (const tok of toks) {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < tok.length; i++) {
          h ^= tok.charCodeAt(i);
          h = Math.imul(h, 16777619);
        }
        v[(h >>> 0) % dims] += 1;
        const h2 = ((h >>> 7 ^ Math.imul(tok.length, 2654435761)) >>> 0) % dims;
        v[h2] += 0.5;
      }
      let n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
      return v.map((x) => x / n);
    }
    function cosine(a, b) {
      let s = 0;
      for (let i = 0; i < a.length; i++) s += a[i] * b[i];
      return s;
    }
    var EmbeddedVectorStore = class {
      constructor() {
        this.name = "UNAI Embedded";
        this.provider = "embedded";
        this.mode = "embedded";
        this._docs = [];
      }
      upsertSync(docs) {
        for (const d of docs) {
          const rec = { ...d, _vec: unaiEmbed((d.text || "") + " " + (d.tags || []).join(" ")) };
          const i = this._docs.findIndex((x) => x.id === d.id);
          if (i >= 0) this._docs[i] = rec;
          else this._docs.push(rec);
        }
        return { upserted: docs.length };
      }
      async upsert(docs) {
        return this.upsertSync(docs);
      }
      async health() {
        return { ok: true, provider: this.name, mode: this.mode, count: this._docs.length };
      }
      // Hybrid retrieval: a lexical recall gate + semantic (cosine) ranking.
      // mode:"semantic" = pure vector; default "hybrid" mirrors enterprise recall.
      searchSync({ text, terms, topK = 3, filter, exclude, mode = "hybrid" } = {}) {
        const want = new Set((terms || []).map((t) => t.toLowerCase()));
        const q = unaiEmbed(text || (terms || []).join(" "));
        let cand = this._docs.filter((d) => !(exclude || []).includes(d.id));
        if (filter) cand = cand.filter((d) => Object.entries(filter).every(([k, val]) => Array.isArray(d[k]) ? d[k].includes(val) : d[k] === val));
        return cand.map((d) => {
          const sem = cosine(q, d._vec);
          const lex = (d.tags || []).filter((t) => want.has(t)).length + (String(d.text).toLowerCase().split(/\W+/).filter((w) => want.has(w)).length ? 1 : 0);
          const score = mode === "semantic" ? sem : lex + 0.4 * sem;
          return { d, lex, sem, score };
        }).filter((r) => mode === "semantic" ? r.sem > 0.05 : r.lex > 0).sort((a, b) => b.score - a.score).slice(0, topK).map((r) => ({ id: r.d.id, source: r.d.source, text: r.d.text, tags: r.d.tags, score: +r.score.toFixed(4) }));
      }
      async query(opts) {
        return this.searchSync(opts);
      }
    };
    async function _fetchJSON(url, opts = {}, timeoutMs = 3500) {
      const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
      const t = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
      try {
        const r = await fetch(url, { ...opts, signal: ctl ? ctl.signal : void 0 });
        const body = await r.text();
        return { ok: r.ok, status: r.status, json: body ? JSON.parse(body) : null };
      } finally {
        if (t) clearTimeout(t);
      }
    }
    var RemoteVectorStore = class {
      constructor(cfg = {}) {
        this.cfg = cfg;
        this.provider = cfg.provider || "remote";
        this.name = cfg.provider || "remote";
        this.mode = "remote";
        this.collection = cfg.collection || "unai_kb";
        this.url = cfg.url || "";
        this.apiKey = cfg.apiKey || "";
        this._mirror = new EmbeddedVectorStore();
      }
      _headers() {
        return { "Content-Type": "application/json", ...this.apiKey ? this._auth() : {} };
      }
      _auth() {
        return { "api-key": this.apiKey, "Authorization": "Bearer " + this.apiKey };
      }
      async upsert(docs) {
        this._mirror.upsertSync(docs);
        try {
          return await this._upsertRemote(docs);
        } catch (e) {
          return { upserted: docs.length, note: "mirror only (" + e.message + ")" };
        }
      }
      async health() {
        try {
          return await this._healthRemote();
        } catch (e) {
          return { ok: false, provider: this.name, mode: "remote (unreachable \u2192 embedded fallback)", error: e.message, count: this._mirror._docs.length };
        }
      }
      async query(opts) {
        try {
          const r = await this._queryRemote(opts);
          if (r && r.length) return r;
        } catch (e) {
        }
        return this._mirror.searchSync(opts);
      }
      searchSync(opts) {
        return this._mirror.searchSync(opts);
      }
      // demo path (sync)
      // Provider-specific hooks (overridden below):
      async _healthRemote() {
        const r = await _fetchJSON(this.url);
        return { ok: r.ok, provider: this.name, mode: "remote", url: this.url };
      }
      async _upsertRemote() {
        throw new Error("not configured");
      }
      async _queryRemote() {
        throw new Error("not configured");
      }
    };
    var QdrantStore = class extends RemoteVectorStore {
      constructor(cfg) {
        super({ ...cfg, provider: "qdrant" });
        this.name = "Qdrant";
        this.url = cfg.url || "http://localhost:6333";
      }
      _headers() {
        return { "Content-Type": "application/json", ...this.apiKey ? { "api-key": this.apiKey } : {} };
      }
      async _healthRemote() {
        const r = await _fetchJSON(this.url + "/collections/" + this.collection, { headers: this._headers() });
        return { ok: r.ok, provider: "Qdrant", mode: "remote", url: this.url, collection: this.collection };
      }
      async _upsertRemote(docs) {
        const points = docs.map((d, i) => ({ id: i + 1, vector: unaiEmbed((d.text || "") + " " + (d.tags || []).join(" ")), payload: d }));
        const r = await _fetchJSON(
          this.url + "/collections/" + this.collection + "/points?wait=true",
          { method: "PUT", headers: this._headers(), body: JSON.stringify({ points }) }
        );
        if (!r.ok) throw new Error("qdrant upsert " + r.status);
        return { upserted: docs.length };
      }
      async _queryRemote({ text, terms, topK = 3, exclude } = {}) {
        const body = { vector: unaiEmbed(text || (terms || []).join(" ")), limit: topK + (exclude ? exclude.length : 0), with_payload: true };
        const r = await _fetchJSON(
          this.url + "/collections/" + this.collection + "/points/search",
          { method: "POST", headers: this._headers(), body: JSON.stringify(body) }
        );
        if (!r.ok) throw new Error("qdrant search " + r.status);
        return (r.json.result || []).map((p) => ({ ...p.payload, score: p.score })).filter((d) => !(exclude || []).includes(d.id)).slice(0, topK);
      }
    };
    var ChromaStore = class extends RemoteVectorStore {
      constructor(cfg) {
        super({ ...cfg, provider: "chroma" });
        this.name = "Chroma";
        this.url = cfg.url || "http://localhost:8000";
      }
      async _healthRemote() {
        const r = await _fetchJSON(this.url + "/api/v1/heartbeat");
        return { ok: r.ok, provider: "Chroma", mode: "remote", url: this.url };
      }
    };
    var WeaviateStore = class extends RemoteVectorStore {
      constructor(cfg) {
        super({ ...cfg, provider: "weaviate" });
        this.name = "Weaviate";
        this.url = cfg.url || "http://localhost:8080";
      }
      async _healthRemote() {
        const r = await _fetchJSON(this.url + "/v1/.well-known/ready", { headers: this._headers() });
        return { ok: r.ok, provider: "Weaviate", mode: "remote", url: this.url };
      }
    };
    var PineconeStore = class extends RemoteVectorStore {
      constructor(cfg) {
        super({ ...cfg, provider: "pinecone" });
        this.name = "Pinecone";
      }
      _headers() {
        return { "Content-Type": "application/json", "Api-Key": this.apiKey };
      }
      async _healthRemote() {
        const r = await _fetchJSON(this.url + "/describe_index_stats", { method: "POST", headers: this._headers(), body: "{}" });
        return { ok: r.ok, provider: "Pinecone", mode: "remote", url: this.url };
      }
      async _queryRemote({ text, terms, topK = 3 } = {}) {
        const r = await _fetchJSON(this.url + "/query", { method: "POST", headers: this._headers(), body: JSON.stringify({ vector: unaiEmbed(text || (terms || []).join(" ")), topK, includeMetadata: true }) });
        if (!r.ok) throw new Error("pinecone " + r.status);
        return (r.json.matches || []).map((m) => ({ ...m.metadata || {}, id: m.id, score: m.score }));
      }
    };
    var MilvusStore = class extends RemoteVectorStore {
      constructor(cfg) {
        super({ ...cfg, provider: "milvus" });
        this.name = "Milvus";
        this.url = cfg.url || "http://localhost:19530";
      }
    };
    var DatabricksVectorStore = class extends RemoteVectorStore {
      constructor(cfg) {
        super({ ...cfg, provider: "databricks" });
        this.name = "Databricks Vector Search";
      }
    };
    var AzureAISearchStore = class extends RemoteVectorStore {
      constructor(cfg) {
        super({ ...cfg, provider: "azure" });
        this.name = "Azure AI Search";
      }
    };
    var PgVectorStore = class extends RemoteVectorStore {
      // via a thin HTTP shim over Postgres/pgvector at deploy time
      constructor(cfg) {
        super({ ...cfg, provider: "pgvector" });
        this.name = "pgvector (Postgres)";
      }
    };
    var VECTOR_PROVIDERS = {
      embedded: () => new EmbeddedVectorStore(),
      qdrant: (c) => new QdrantStore(c),
      chroma: (c) => new ChromaStore(c),
      weaviate: (c) => new WeaviateStore(c),
      pinecone: (c) => new PineconeStore(c),
      milvus: (c) => new MilvusStore(c),
      databricks: (c) => new DatabricksVectorStore(c),
      azure: (c) => new AzureAISearchStore(c),
      pgvector: (c) => new PgVectorStore(c)
    };
    var VECTOR_CATALOGUE = [
      { id: "qdrant", label: "Qdrant", role: "Shipped default", note: "Bundled by the deploy stack; scales to production." },
      { id: "embedded", label: "UNAI Embedded", role: "Zero-config fallback", note: "In-process; runs offline/air-gapped, no setup." },
      { id: "chroma", label: "Chroma", role: "Connector", note: "Lightweight; great for dev / small KBs." },
      { id: "weaviate", label: "Weaviate", role: "Connector", note: "Hybrid search + modules." },
      { id: "pinecone", label: "Pinecone", role: "Connector", note: "Managed, serverless vector DB." },
      { id: "milvus", label: "Milvus", role: "Connector", note: "High-scale OSS vector DB." },
      { id: "pgvector", label: "pgvector", role: "Connector", note: "Reuse existing Postgres / lakehouse." },
      { id: "databricks", label: "Databricks Vector Search", role: "Connector", note: "Governed lakehouse-native." },
      { id: "azure", label: "Azure AI Search", role: "Connector", note: "Azure-native retrieval." }
    ];
    function vectorConfig() {
      const env = typeof process !== "undefined" && process.env ? process.env : {};
      const win = typeof window !== "undefined" ? window : {};
      return {
        provider: (env.UNAI_VECTOR_PROVIDER || win.UNAI_VECTOR_PROVIDER || "qdrant").toLowerCase(),
        url: env.UNAI_VECTOR_URL || win.UNAI_VECTOR_URL || "",
        apiKey: env.UNAI_VECTOR_API_KEY || win.UNAI_VECTOR_API_KEY || "",
        collection: env.UNAI_VECTOR_COLLECTION || win.UNAI_VECTOR_COLLECTION || "unai_kb"
      };
    }
    var _VS = null;
    var _VS_PROVIDER = null;
    function getVectorStore(cfg) {
      const c = cfg || vectorConfig();
      if (_VS && !cfg && _VS_PROVIDER === c.provider) return _VS;
      const make = VECTOR_PROVIDERS[c.provider] || VECTOR_PROVIDERS.embedded;
      let store;
      try {
        store = make(c);
      } catch (e) {
        store = new EmbeddedVectorStore();
      }
      store.upsertSync ? store.upsertSync(RAG_SEED) : store._mirror && store._mirror.upsertSync(RAG_SEED);
      _VS = store;
      _VS_PROVIDER = c.provider;
      return store;
    }
    function vectorStoreStatus() {
      const c = vectorConfig();
      const cat = VECTOR_CATALOGUE.find((v) => v.id === c.provider) || VECTOR_CATALOGUE[0];
      return { provider: c.provider, label: cat.label, role: cat.role, url: c.url || "(default)", collection: c.collection, catalogue: VECTOR_CATALOGUE };
    }
    var RAG_SEED = [
      { id: "WARR-01", source: "Warranty_Policy.pdf", text: "Standard product warranty is 24 months from ship date; extended warranty adds 12 months.", tags: ["warranty", "window", "eligibility"] },
      { id: "RMA-07", source: "RMA_SOP.md", text: "An RMA is eligible for credit when the unit is within warranty and the defect is confirmed by triage.", tags: ["rma", "credit", "eligibility", "warranty"] },
      { id: "CRD-03", source: "Returns_Credit.md", text: "Credit recovery must be processed within 30 days of the return being received.", tags: ["credit", "window", "returns"] },
      { id: "SLA-02", source: "Supplier_SLA.pdf", text: "Tier-1 suppliers commit to 98% OTIF; a breach triggers escalation to sourcing.", tags: ["supplier", "otif", "sla"] },
      { id: "SS-05", source: "SafetyStock_Policy.md", text: "Safety stock = z x sigma x sqrt(lead time); policies are reviewed quarterly.", tags: ["safety_stock", "inventory", "policy"] }
    ];
    var _ragEmbedded = new EmbeddedVectorStore();
    _ragEmbedded.upsertSync(RAG_SEED);
    function ragRetrieve(terms, exclude) {
      let store;
      try {
        store = getVectorStore();
      } catch (e) {
        store = _ragEmbedded;
      }
      const sync = store && typeof store.searchSync === "function" ? store : _ragEmbedded;
      return sync.searchSync({ terms, exclude, topK: 3, mode: "hybrid" }).map((r) => ({ id: r.id, source: r.source, text: r.text, tags: r.tags }));
    }
    var CONCEPT_SYNONYMS = {
      defect: ["defect", "defects", "problem", "problems", "issue", "issues", "fault", "faults", "faulty", "broken", "malfunction", "malfunctioning", "error", "errors", "anomaly", "anomalies"],
      meter: ["meter", "meters", "smart meter", "smart meters", "device", "devices", "unit", "units", "asset", "assets", "equipment"],
      count: ["how many", "count", "number of", "total number", "qty", "quantity"],
      open: ["open", "unresolved", "pending", "outstanding", "active", "ongoing"],
      supplier: ["supplier", "suppliers", "vendor", "vendors"],
      stock: ["stock", "inventory", "on hand", "on-hand", "available quantity"]
    };
    var _SYN = (() => {
      const m = {};
      for (const c in CONCEPT_SYNONYMS) for (const s of CONCEPT_SYNONYMS[c]) m[s] = c;
      return m;
    })();
    var _QSTOP = /* @__PURE__ */ new Set(["the", "a", "an", "of", "have", "has", "had", "with", "are", "is", "do", "does", "we", "that", "which", "in", "on", "for", "to", "and", "or", "by", "our", "their"]);
    function normalizeQuery(text) {
      let s = String(text || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
      const phrases = Object.keys(_SYN).filter((k) => k.includes(" ")).sort((a, b) => b.length - a.length);
      for (const p of phrases) if (s.includes(p)) s = s.split(p).join(_SYN[p]);
      const toks = s.split(" ").map((w) => _SYN[w] || w).filter(Boolean);
      const concepts = [...new Set(toks.filter((t) => !_QSTOP.has(t)))].sort();
      return { norm: toks.join(" "), signature: concepts.join("|") };
    }
    function _scopeKey(ctx) {
      let h = 5381;
      const s = String(ctx || "");
      for (let i = 0; i < s.length; i++) h = (h << 5) + h + s.charCodeAt(i) >>> 0;
      return "" + h;
    }
    var SemanticQueryCache = class {
      constructor(ttlMs = 10 * 60 * 1e3, threshold = 0.9) {
        this.ttl = ttlMs;
        this.th = threshold;
        this.entries = [];
        this.hits = 0;
        this.misses = 0;
      }
      invalidate() {
        this.entries = [];
      }
      // call on data change
      _fresh() {
        const now = Date.now();
        this.entries = this.entries.filter((e) => now - e.t < this.ttl);
      }
      lookup(question, ctx) {
        this._fresh();
        const { norm, signature } = normalizeQuery(question);
        const scope = _scopeKey(ctx);
        let e = this.entries.find((x) => x.signature === signature && x.scope === scope);
        if (e) {
          this.hits++;
          return { hit: true, via: "signature", answer: e.answer, signature };
        }
        const q = unaiEmbed(norm);
        let best = null, bs = 0;
        for (const x of this.entries) {
          if (x.scope !== scope) continue;
          const s = cosine(q, x.vec);
          if (s > bs) {
            bs = s;
            best = x;
          }
        }
        if (best && bs >= this.th) {
          this.hits++;
          return { hit: true, via: "semantic", score: +bs.toFixed(3), answer: best.answer, signature };
        }
        this.misses++;
        return { hit: false, signature };
      }
      store(question, answer, ctx) {
        const { norm, signature } = normalizeQuery(question);
        const scope = _scopeKey(ctx);
        this.entries = this.entries.filter((x) => !(x.signature === signature && x.scope === scope));
        this.entries.push({ t: Date.now(), signature, scope, vec: unaiEmbed(norm), answer });
        if (this.entries.length > 300) this.entries.shift();
      }
      stats() {
        const n = this.hits + this.misses;
        return { hits: this.hits, misses: this.misses, hitRate: n ? +(this.hits / n).toFixed(3) : 0, size: this.entries.length };
      }
    };
    var TOOL_PACKS = {
      // ---- DEMO: Agentic RAG — retrieve → ground → cite, with a multi-hop re-retrieve
      //           when the evidence is insufficient. Rides the shared layers; no
      //           use-case-specific plumbing beyond this thin pack. ----
      rag_decompose(L) {
        const q = "For a returned unit under warranty, can we issue credit \u2014 and within what window?";
        const subs = ["warranty eligibility", "credit window"];
        L.remember("rag_query", q);
        L.remember("rag_subs", subs);
        const ev = L.evidence(
          `Decomposed the question into ${subs.length} sub-queries: ${subs.join("; ")}`,
          [{ name: "query decomposition", weight: 0.28 }, { name: "source routing", weight: 0.1 }]
        );
        L.explain(ev);
        return { evidence: ev, output: { headline: `Query planned \u2192 ${subs.length} sub-queries`, question: q, subQueries: subs } };
      },
      rag_retrieve(L) {
        const hits = ragRetrieve(["warranty", "eligibility", "rma"]);
        L.remember("rag_round1", hits);
        const cites = hits.map((h) => h.source).join(", ");
        const ev = L.evidence(
          `Retrieved ${hits.length} passages (round 1) from: ${cites}`,
          [{ name: "semantic retrieval", weight: 0.26 }, { name: "ontology-scoped query", weight: 0.12 }]
        );
        L.explain(ev);
        return { evidence: ev, output: { headline: `Round 1: ${hits.length} passages retrieved`, sources: hits.map((h) => ({ id: h.id, source: h.source })) } };
      },
      rag_ground_answer(L) {
        const r1 = L.recall("rag_round1") || ragRetrieve(["warranty", "eligibility", "rma"]);
        const hasWindow = r1.some((d) => d.tags.includes("credit") && d.tags.includes("window"));
        let rounds = 1, used = r1.slice(), reretrieve = null;
        if (!hasWindow) {
          reretrieve = ragRetrieve(["credit", "window", "returns"], r1.map((d) => d.id));
          used = used.concat(reretrieve);
          rounds = 2;
        }
        const cites = [...new Set(used.map((d) => d.source))];
        const answer = "Yes \u2014 a returned unit is eligible for credit if it is within the 24-month warranty and the defect is confirmed by triage; the credit must be processed within 30 days of the return being received.";
        const ev = L.evidence(`Grounded answer with ${cites.length} citations`, [
          { name: "evidence corroboration", weight: 0.3 },
          { name: reretrieve ? "multi-hop re-retrieval (gap filled)" : "single-pass sufficiency", weight: 0.12 }
        ]);
        ev.citations = cites;
        ev.retrievalRounds = rounds;
        L.explain(ev);
        return { evidence: ev, output: {
          headline: `Answer grounded in ${cites.length} sources${reretrieve ? ` after ${rounds} retrieval rounds (multi-hop)` : ""}`,
          answer,
          citations: cites,
          retrievalRounds: rounds,
          note: reretrieve ? "Round 1 lacked the credit window; the agent re-retrieved to fill the gap before answering." : "Round 1 was sufficient."
        } };
      },
      // Detect supplier disruption from external signals (analytics store)
      // ---- DEMO: telemetry signal integrity (uses ONLY the shared service, so any
      //           use case inherits the same behaviour) ---------------------------
      // T0 — a FAILURE alarm arrives from one telemetry source of mediocre health.
      telemetry_ingest(L) {
        L.ingestSignal(
          "equipment_status",
          "FAILURE",
          { source: "telemetry_A", sourceHealth: 0.6, ts: 0, consequence: "high" }
        );
        const a0 = L.assessSignal("equipment_status");
        const ev = L.evidence("FAILURE alarm on Line 3 \u2014 proposed emergency shutdown", [
          { name: "failure alarm", weight: 0.3 },
          { name: "asset criticality", weight: 0.12 }
        ], a0);
        L.explain(ev);
        L.proposeAction("SAP_S4", "SHUTDOWN_ASSET", { sku: "LINE-3" }, ev, "Emergency shutdown \u2014 Line 3");
        L.remember("equip_t0", { assess: a0, held: ev.hold });
        return { evidence: ev, output: {
          headline: `T0 \u2014 FAILURE alarm: emergency shutdown ${ev.hold ? "HELD" : "executed"} (signal trust ${a0.trust}).`,
          detail: `Single source (telemetry_A), corroboration ${a0.corroboration}/${a0.minCorroboration}, source health ${a0.avgHealth * 100 | 0}%. Below policy \u2014 waiting for a 2nd reading before acting.`,
          assess: a0
        } };
      },
      // T1 — next tick, the same source reverts to OK: the alarm was a glitch.
      telemetry_reconcile(L) {
        L.ingestSignal(
          "equipment_status",
          "OK",
          { source: "telemetry_A", sourceHealth: 0.6, ts: 1, consequence: "high" }
        );
        const a1 = L.assessSignal("equipment_status");
        const ev = L.evidence("Reconcile equipment state \u2014 FAILURE reverted to OK within window", [
          { name: "spike-and-revert pattern", weight: 0.26 },
          { name: "no corroborating sensor", weight: 0.1 }
        ], a1);
        L.explain(ev);
        return { evidence: ev, output: {
          headline: "Recovered: telemetry inaccuracy, not an actual failure \u2014 no maintenance action taken.",
          detail: `equipment_status went FAILURE\u2192OK on a single source within the debounce window (corroboration ${a1.corroboration}/${a1.minCorroboration}); classified as a transient. Sensor telemetry_A health downgraded and flagged for calibration; equipment treated as healthy.`,
          assess: a1
        } };
      },
      // ---- Datacenter Hardware RMA — real logic over ServiceNow RMA + SAP refurb/stock ----
      // Each capability reads actual RMA fields (warranty, entitlement, claim value, dwell,
      // SLA) and SAP execution data (refurb cost, stock, safety stock) and produces a
      // differentiated, data-derived decision — not a fixed template.
      hw_failure_disposition(L) {
        const cases = L.systems.SERVICENOW.query("rma_case", {});
        const dispo = cases.map((c) => {
          if (c.u_warranty === "IN_WARRANTY" && c.u_entitled)
            return { unit: c.cmdb_ci, oem: c.u_oem, action: `OEM warranty claim \u2014 replace & recover $${(c.u_claim_value || 0).toLocaleString()}`, path: "warranty" };
          const stock = L.systems.SAP_S4.query("stock", { MATNR: c.cmdb_ci })[0] || {};
          const refurb = L.systems.SAP_S4.query("refurb", { WERKS: stock.WERKS })[0] || {};
          const replaceCost = stock.STPRS || 0, refurbCost = refurb.COSTPU || 0;
          const doRefurb = refurbCost && refurbCost < replaceCost;
          return { unit: c.cmdb_ci, oem: c.u_oem, action: doRefurb ? `Refurbish at ${stock.WERKS} ($${refurbCost} < replace $${replaceCost})` : `Scrap & replace ($${replaceCost})`, path: doRefurb ? "refurb" : "replace" };
        });
        const inW = cases.filter((c) => c.u_warranty === "IN_WARRANTY");
        const recover = inW.reduce((a, c) => a + (c.u_claim_value || 0), 0);
        const wWarr = +(0.1 + 0.1 * (inW.length / (cases.length || 1))).toFixed(2);
        const ev = L.evidence(`Disposition ${cases.length} returned units \u2014 ${dispo.map((d) => `${d.unit}: ${d.action}`).join("; ")}`, [
          { name: "warranty & entitlement state", weight: wWarr },
          { name: "claim-value vs refurb economics", weight: 0.08 },
          { name: "failure signature confirmed", weight: 0.04 }
        ]);
        L.explain(ev);
        ev.detailed.rootCause = `Each unit is dispositioned by warranty and entitlement first, then economics: ${inW.length} in-warranty unit(s) go to an OEM claim (recovering $${recover.toLocaleString()}); out-of-warranty units compare refurb cost against replacement. Fields are read from ServiceNow (warranty, entitlement, claim value) and SAP (refurb cost, stock price).`;
        ev.detailed.recommendedAction = dispo.map((d) => `${d.unit}: ${d.action}`).join("  \xB7  ");
        L.remember("rma_disposition", dispo);
        return { evidence: ev, output: { headline: `Dispositioned ${cases.length} units \u2014 $${recover.toLocaleString()} recoverable via warranty.`, detail: dispo.map((d) => `${d.unit} (${d.oem}): ${d.action}`).join(" | "), disposition: dispo } };
      },
      dwell_sla_monitor(L) {
        const cases = L.systems.SERVICENOW.query("rma_case", {}).map((c) => ({
          unit: c.cmdb_ci,
          dwell: c.u_dwell_hours || 0,
          sla: c.u_sla_hours || 0,
          breach: (c.u_dwell_hours || 0) > (c.u_sla_hours || Infinity)
        }));
        const breaches = cases.filter((c) => c.breach);
        const sev = breaches.length ? Math.max(...breaches.map((c) => (c.dwell - c.sla) / (c.sla || 1))) : 0;
        const ev = L.evidence(`Dwell vs SLA \u2014 ${breaches.length} of ${cases.length} units breached (${cases.map((c) => `${c.unit} ${c.dwell}h/${c.sla}h`).join(", ")})`, [
          { name: "dwell-vs-SLA margin", weight: +(0.14 + 0.06 * Math.min(sev, 1)).toFixed(2) },
          { name: "pipeline SLO coverage", weight: 0.1 }
        ]);
        L.explain(ev);
        ev.detailed.rootCause = `Dwell hours are compared against each unit's SLA from ServiceNow. ${breaches.length ? `${breaches.map((c) => c.unit).join(", ")} exceeded SLA (worst overrun ${Math.round(sev * 100)}%), flagged for expediting.` : "All units are within SLA."}`;
        ev.detailed.recommendedAction = breaches.length ? `Flag ${breaches.map((c) => c.unit).join(", ")} to the urgency/logistics step for expedite.` : "No expedite needed \u2014 all within SLA.";
        L.remember("rma_dwell", cases);
        return { evidence: ev, output: { headline: `${breaches.length} SLA breach(es) of ${cases.length}.`, detail: cases.map((c) => `${c.unit}: ${c.dwell}h vs ${c.sla}h SLA ${c.breach ? "BREACH" : "ok"}`).join(" | "), dwell: cases } };
      },
      urgency_logistics_plan(L) {
        const cases = L.systems.SERVICENOW.query("rma_case", {});
        const breachedUnits = cases.filter((c) => (c.u_dwell_hours || 0) > (c.u_sla_hours || Infinity)).map((c) => c.cmdb_ci);
        let exposure = 0, expUnit = null;
        for (const u of breachedUnits) {
          const s = L.systems.SAP_S4.query("stock", { MATNR: u })[0];
          if (s && s.EISBE) {
            const e = Math.max(0, (s.EISBE - s.LABST) / s.EISBE);
            if (e > exposure) {
              exposure = e;
              expUnit = u;
            }
          }
        }
        const wExp = +(0.06 + 0.1 * exposure).toFixed(2);
        const ev = L.evidence(`Urgency & logistics \u2014 expedite ${breachedUnits.join(", ") || "none"}${expUnit ? ` (stock-out exposure ${Math.round(exposure * 100)}% on ${expUnit})` : ""}`, [
          { name: "SLA-breach urgency", weight: 0.12 },
          { name: "stock-out exposure", weight: wExp }
        ]);
        L.explain(ev);
        ev.detailed.rootCause = `Units breaching SLA are cross-checked against SAP stock: ${expUnit ? `${expUnit} is ${Math.round(exposure * 100)}% below safety stock, so an expedite is proposed.` : "no material is below safety stock."} Expedite is a high-consequence action, so it routes through the gated action bus rather than executing directly.`;
        ev.detailed.recommendedAction = breachedUnits.length ? `Expedite ${breachedUnits.join(", ")} \u2014 routed for human approval (confidence below the autonomy threshold).` : "No expedite required.";
        if (breachedUnits.length) {
          try {
            L.proposeAction("SAP_S4", "STOCK_TRANSFER", { sku: expUnit || breachedUnits[0], mode: "expedite" }, ev, `Expedite RMA replacement \u2014 ${expUnit || breachedUnits[0]}`);
          } catch (e) {
          }
        }
        L.remember("rma_urgency", { breachedUnits, exposure, expUnit });
        return { evidence: ev, output: { headline: `Expedite proposed for ${breachedUnits.join(", ") || "none"} \u2014 ${ev.autonomous ? "auto" : "held for approval"}.`, detail: `Breached: ${breachedUnits.join(", ") || "none"}. Stock-out exposure ${Math.round(exposure * 100)}%${expUnit ? ` on ${expUnit}` : ""}.`, breachedUnits } };
      },
      return_reintegration(L) {
        const cases = L.systems.SERVICENOW.query("rma_case", {});
        const received = cases.filter((c) => c.u_status === "RECEIVED");
        const caps = L.systems.SAP_S4.query("refurb", {});
        const headroom = caps.reduce((a, r) => a + (r.CAPACITY || 0), 0);
        const ev = L.evidence(`Validate & reintegrate ${received.length} received unit(s); refurb capacity headroom ${headroom} units`, [
          { name: "return receipt validated", weight: 0.18 },
          { name: "refurb capacity headroom", weight: 0.12 }
        ]);
        L.explain(ev);
        ev.detailed.rootCause = `${received.length} unit(s) show status RECEIVED in ServiceNow and refurb capacity (${headroom} units across plants) is available in SAP, so receipts are validated and spares reintegrated; ServiceNow RMA status is written back to CLOSED on completion.`;
        ev.detailed.recommendedAction = `Post goods receipt + schedule refurb for ${received.map((c) => c.cmdb_ci).join(", ")}; set ServiceNow status \u2192 CLOSED.`;
        try {
          L.proposeAction("SAP_S4", "REPAIR_ORDER", { sku: received[0] && received[0].cmdb_ci, qty: received.length }, ev, `Reintegrate spares \u2014 ${received.length} unit(s)`);
        } catch (e) {
        }
        L.remember("rma_reintegration", { received: received.map((c) => c.number), headroom });
        return { evidence: ev, output: { headline: `Reintegrated ${received.length} unit(s); ${headroom} refurb slots available.`, detail: received.map((c) => `${c.number} (${c.cmdb_ci}) -> CLOSED`).join(" | "), received: received.map((c) => c.number) } };
      },
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
        const APPROVAL_LIMIT = L.valueLimit != null ? L.valueLimit : 5e4;
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
          let res2 = { EBELN: "\u2014", status: "PENDING_APPROVAL" };
          if (ev.autonomous) res2 = L.act("SAP_MM", "PO_CREATE", { sku: s.sku, plant: s.plant, supplier, qty: s.gap, unit_cost: s.unit_cost });
          pos.push({
            sku: s.sku,
            qty: s.gap,
            supplier,
            rerouted: reroute,
            po: res2.EBELN,
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
        const APPROVAL_LIMIT = L.valueLimit != null ? L.valueLimit : 5e4;
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
          `Exception routing \u2014 rebalancing moves: ${exceptions.length} of ${moves.length} need human approval (RMA-pipeline steps are gated separately)`,
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
        L.remember("final_test_gated", !ev.autonomous);
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
        if (L.recall("disposition") !== "REPAIR") {
          L.remember("coc_gated", false);
          return { skipped: true };
        }
        const coc = L.act("SAP_S4", "GOODS_ISSUE", { sku: r.sku, op: "RELABEL_COC" });
        const ev = L.evidence(
          `OCR-verified re-label + Certificate of Conformance generated`,
          [{ name: "OCR mark verification (VLM)", weight: 0.16 }, { name: "CoC policy", weight: 0.08 }]
        );
        L.explain(ev);
        L.remember("coc_gated", !ev.autonomous);
        return { coc, evidence: ev };
      },
      rma_close_loop(L) {
        const r = L.recall("rma") || {};
        const decision = L.recall("disposition");
        const valid = L.recall("claim_valid");
        const APPROVAL_LIMIT = L.valueLimit != null ? L.valueLimit : 5e4;
        const value = r.claim_value || 0;
        const overLimit = value > APPROVAL_LIMIT;
        const upstreamHeld = !!L.recall("final_test_gated") || !!L.recall("coc_gated");
        const ev = L.evidence(
          `Close loop: ${decision === "REPLACE" ? "issue replacement (pull spare from IBP plan)" : "restock good unit"} for ${r.rma_id} ($${value.toLocaleString()})`,
          [{ name: "warranty credit recovery", weight: valid ? 0.22 : 0.06 }, { name: "planning feedback", weight: 0.1 }]
        );
        ev.autonomous = ev.autonomous && valid && !overLimit && !upstreamHeld;
        ev.gate = !valid ? "out-of-warranty \u2014 needs sign-off" : overLimit ? `value > $${APPROVAL_LIMIT.toLocaleString()} approval limit` : upstreamHeld ? "upstream final test / Certificate of Conformance still in human review \u2014 hold restock until signed off" : "within policy";
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
        const APPROVAL_LIMIT = L.valueLimit != null ? L.valueLimit : 5e4;
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
    function sdlcSectionPack(capability) {
      return function(L) {
        const row = L.systems.ANALYTICS.query("sap_spec", { section: capability })[0] || { title: capability.replace(/^ts_/, "").replace(/_/g, " "), fs: 0.5, cplx: 0.5, deps: 1, reuse: 0.5, objs: 1 };
        const cplxLabel = row.cplx >= 0.8 ? "High" : row.cplx >= 0.45 ? "Medium" : "Low";
        const drivers = [
          { name: "FS coverage", weight: +(0.1 + 0.16 * row.fs).toFixed(2) },
          { name: "object complexity & effort", weight: +(0.02 + 0.06 * row.cplx).toFixed(2) },
          { name: "cross-section dependency risk", weight: +(-0.03 * row.deps).toFixed(2) },
          { name: "standard-object reuse", weight: +(0.02 + 0.05 * row.reuse).toFixed(2) }
        ];
        const ev = L.evidence(`Draft \u201C${row.title}\u201D \u2014 ${row.objs} object(s), ${cplxLabel} complexity, FS coverage ${Math.round(row.fs * 100)}%`, drivers);
        L.explain(ev);
        ev.detailed.rootCause = ev.autonomous ? `\u201C${row.title}\u201D is well-specified in the FS (coverage ${Math.round(row.fs * 100)}%, ${cplxLabel.toLowerCase()} complexity, ${row.objs} object(s), ${Math.round(row.reuse * 100)}% standard reuse) \u2014 the section drafts autonomously on the shared runtime and is logged to the audit trail.` : `\u201C${row.title}\u201D has thin FS coverage (${Math.round(row.fs * 100)}%) against ${cplxLabel.toLowerCase()} complexity and ${row.deps} cross-section dependency(ies), so overall confidence is below the autonomy threshold \u2014 the section is routed to a functional author rather than auto-drafted.`;
        ev.detailed.recommendedAction = ev.autonomous ? `Generate the \u201C${row.title}\u201D section and attach its rationale to the technical spec.` : `Route \u201C${row.title}\u201D to a functional author to close FS gaps before drafting (coverage ${Math.round(row.fs * 100)}%).`;
        return { evidence: ev, output: { headline: `${row.title}: ${ev.autonomous ? "drafted" : "routed to author"} (conf ${Math.round(ev.confidence * 100)}%).`, detail: `FS coverage ${Math.round(row.fs * 100)}% \xB7 ${cplxLabel} complexity \xB7 ${row.objs} object(s) \xB7 ${Math.round(row.reuse * 100)}% reuse \xB7 ${row.deps} dependency(ies).`, section: row.title } };
      };
    }
    [
      "ts_general_info",
      "ts_business_needs",
      "ts_assumptions_deps",
      "ts_functional_details",
      "ts_reports",
      "ts_functional_modules",
      "ts_enhancements",
      "ts_forms",
      "ts_interfaces",
      "ts_conversions",
      "ts_workflows",
      "ts_webdynpro",
      "ts_module_pool",
      "ts_fiori_ui5",
      "ts_programming_logic",
      "ts_custom_transactions",
      "ts_data_dictionary",
      "ts_error_handling",
      "ts_role_auth",
      "ts_change_history",
      "ts_additional_info"
    ].forEach((cap) => {
      TOOL_PACKS[cap] = sdlcSectionPack(cap);
    });
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
    var HIGH_CONSEQUENCE_RE = /create|update|write|issue|send|post|place|raise|execute|reorder|replenish|transfer|credit|replace|notify|shutdown|dispatch|commit/i;
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
        const isAct = HIGH_CONSEQUENCE_RE.test(step.capability || "");
        const ev = L.evidence(name, [{ name: "policy signal", weight: 0.22 }, { name: "data grounding", weight: 0.1 }]);
        L.explain(ev);
        if (isAct) {
          try {
            L.proposeAction(sys[0], "GENERIC_ACTION", { sku: "\u2014" }, ev, name);
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
      // Cross-cutting robustness demo: signal integrity / belief revision. NO
      // use-case-specific rules — it relies entirely on the shared Signal Integrity
      // service (ingestSignal + assessSignal + the evidence fold-in), so every other
      // use case gets identical transient/glitch handling for free.
      telemetry_signal_integrity: {
        name: "Equipment Telemetry \u2014 signal integrity (demo)",
        description: "A FAILURE alarm arrives from one telemetry source, then reverts to OK on the next tick (a sensor glitch). The shared Signal Integrity service HOLDS the high-consequence shutdown, reconciles the time-series, and recovers to \u201Ctelemetry inaccuracy, not an actual failure\u201D \u2014 with no use-case-specific code. Shows plan visibility + run-time interception at the Evidence\u2192Action gate.",
        // One specialist per capability, so the KPI ratio (N:1) matches the flow's
        // executor count (N) — no "4 vs 2" discrepancy.
        gen1Agents: ["Anomaly Detection Agent", "Failure Diagnosis Agent"],
        plan: [
          { capability: "telemetry_ingest", agentEquiv: "Anomaly Detection Agent", systems: ["ANALYTICS"] },
          { capability: "telemetry_reconcile", agentEquiv: "Failure Diagnosis Agent", systems: ["ANALYTICS"] }
        ]
      },
      // Combined per explicit request: your real adk_spares_rma_demo app is ONE
      // orchestrator (root_agent) routing between spares planning and RMA — not
      // two separate apps — so UNAI models it here as one use case too, instead
      // of two that get added together after the fact. Gen-1 baseline still
      // carries the full 27-specialist hypothetical (12 spares + 15 RMA); the
      // real-ADK override in server.js's REAL_ADK_AGENTS replaces that with your
      // actual 5 real agents when ADK_SPARES_RMA_PATH is set.
      // Agentic RAG demo: the Reasoning layer drives an iterative retrieve → ground →
      // cite loop, re-retrieving (multi-hop) when the evidence is insufficient. Rides
      // the same shared layers (Perception=retrieval, Memory=context, Evidence=grounding).
      agentic_rag: {
        name: "Agentic RAG \u2014 knowledge retrieval (demo)",
        description: "Answer a policy question by retrieving from a governed knowledge base, checking whether the evidence is sufficient, and re-retrieving (multi-hop) to fill any gap before answering \u2014 with citations and a confidence score. Shows agentic RAG on the shared layers: retrieval is Perception, context is Memory, grounding & sufficiency is Evidence.",
        gen1Agents: ["Query Planner Agent", "Retrieval Agent", "Grounding & Citation Agent"],
        plan: [
          { capability: "rag_decompose", agentEquiv: "Query Planner Agent", systems: ["ANALYTICS"] },
          { capability: "rag_retrieve", agentEquiv: "Retrieval Agent", systems: ["ANALYTICS"] },
          { capability: "rag_ground_answer", agentEquiv: "Grounding & Citation Agent", systems: ["ANALYTICS"] }
        ]
      },
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
          enabledLayers: ["Perception", "Memory", "Reasoning", "Evidence", "Action", "Collaboration", "Explainability"],
          // Detailed explainability = live, audited per-decision rationales (L7 live×N).
          // ON by default for EVERY agent, incl. Foundry-created/converted ones; a host
          // (server /api/run, the runner) can turn it off per agent to run template
          // rationales at 0 live tokens. This is the governance value-add spend.
          detailedExplainability: true
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
        L.mode = this.config.dryRun ? "dry" : "live";
        L.approvals = this.config.approvals || null;
        L.requireApproval = !!this.config.requireApproval;
        L.autonomyThreshold = this.config.autonomyThreshold != null ? this.config.autonomyThreshold : 0.85;
        L.valueLimit = this.config.valueLimit != null ? this.config.valueLimit : 5e4;
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
        const gen2LayerImpls = layersShared + gen1AgentCount;
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
          // detailed (live) explainability on for this run? (governance value-add spend)
          detailedExplainability: this.config.detailedExplainability !== false,
          // --- model / token economics (SHARED COGNITIVE RUNTIME, modeled) ---
          modelCalls,
          tokensIn: tokIn,
          tokensOut: tokOut,
          tokensTotal: tokTotal,
          estCostUsd: estCost,
          layerTokens,
          // per-layer breakdown (sums to tokensTotal)
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
        const reqAppr = !!this.config.requireApproval;
        const planPreview = plan.map((step, i) => {
          const r = results[step.capability] || {};
          const ev = r.evidence || {};
          const isWrite = HIGH_CONSEQUENCE_RE.test(step.capability || "");
          const held = isWrite && (!ev.autonomous || reqAppr);
          return {
            n: i + 1,
            capability: step.capability,
            agentEquiv: step.agentEquiv || null,
            systems: step.systems || [],
            consequence: isWrite ? "high-consequence write" : "read / analyze",
            decision: ev.decision || (step.capability || "").replace(/_/g, " "),
            confidence: ev.confidence == null ? null : ev.confidence,
            gate: ev.gate || null,
            autonomous: !!ev.autonomous,
            held,
            humanDecision: ev.humanDecision || null,
            disposition: !isWrite ? "read-only" : held ? "HOLD for human approval" : "auto-execute (trusted)"
          };
        });
        return {
          useCase: goal,
          businessCase: goal.business || null,
          // why this agent is run, in business terms
          config: this.config,
          trace: this.traceLog,
          results,
          systemsTouched: [...systemsTouched],
          layerActivity,
          evidence: L.evidenceLog,
          planPreview,
          stagedActions: L.stagedActions,
          pendingApprovals: L.pendingApprovals,
          dryRun: this.mode === "dry" || L.mode === "dry",
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
        L.remember("cb_base_conf", ev.confidence);
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
        L.remember("cb_act_conf", ev.confidence);
        return { evidence: ev };
      },
      cb_cannibalization_split(L) {
        const Ei = L.recall("cb_ei") || 1e5, Ai = L.recall("cb_ai") || 82e3, N = L.recall("cb_new") || 3e4;
        const TC = Math.max(0, Ei - Ai), IV = N - TC, cp = Math.round(100 * TC / N), ip = Math.round(100 * IV / N);
        L.remember("cb_TC", TC);
        L.remember("cb_IV", IV);
        const ev = L.evidence(
          `Cannibalized ${TC.toLocaleString()} units (${cp}%) \xB7 incremental ${IV.toLocaleString()} units (${ip}%) of the ${N.toLocaleString()}-unit launch`,
          [{ name: "lost sales Li = max(0, Ei\u2212Ai)", weight: 0.2 }, { name: "cannibalization %", weight: 0.12 }, { name: "incremental %", weight: 0.12 }],
          null,
          { derivedFrom: [L.recall("cb_base_conf"), L.recall("cb_act_conf")] }
        );
        L.explain(ev);
        ev.detailed.rootCause += " Method note: this split assumes the full baseline shortfall Li = max(0, Ei\u2212Ai) is attributable to the new SKU. Concurrent factors (competitor activity, promo timing, distribution changes) are not separately isolated \u2014 it is a correlational attribution, not an isolated measurement.";
        L.remember("cb_split_conf", ev.confidence);
        return { evidence: ev };
      },
      cb_portfolio_market(L) {
        const TC = L.recall("cb_TC") || 18e3;
        const ev = L.evidence(
          `Portfolio impact resolved by product family; ~${Math.round(TC / 3).toLocaleString()} units cannibalized in the top geography (source-SKU attribution ready)`,
          [{ name: "portfolio mix \u03A3IVp", weight: 0.14 }, { name: "geography TCM/NM", weight: 0.11 }, { name: "source-SKU attribution", weight: 0.08 }],
          null,
          { derivedFrom: [L.recall("cb_split_conf")] }
        );
        L.explain(ev);
        return { evidence: ev };
      },
      cb_financial_roi(L) {
        const TC = L.recall("cb_TC") || 18e3, IV = L.recall("cb_IV") || 12e3, price = 3.2, margin = 0.42, invest = 1e4;
        const trc = Math.round(TC * price), incRev = Math.round(IV * price), profit = Math.round(incRev * margin), roi = Math.round(100 * (profit - invest) / invest);
        const ev = L.evidence(
          `Revenue cannibalized $${trc.toLocaleString()} \xB7 incremental revenue $${incRev.toLocaleString()} \xB7 incremental profit $${profit.toLocaleString()} \xB7 launch ROI ${roi}%`,
          [{ name: "net selling price", weight: 0.12 }, { name: "margin %", weight: 0.1 }, { name: "launch investment", weight: 0.08 }, { name: "incremental-vs-cannibalized unit mix", weight: 0.06 }],
          null,
          { derivedFrom: [L.recall("cb_split_conf")] }
        );
        L.explain(ev);
        ev.autonomous = false;
        ev.gate = "financial output (launch ROI) \u2014 finance sign-off required";
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
    Object.assign(USE_CASES, {
      // Datacenter hardware RMA — converted from a 4-agent LangGraph POC (rma-agent-poc):
      // one physical tray's journey through failure disposition, dwell/SLA monitoring,
      // urgency/logistics, and return receipt & reintegration, on one shared runtime
      // instead of four separate specialist agents. Backing data lives in BigQuery
      // (sap-ai-ewm-automation.unai_supply_chain.dc_hw_rma_case).
      dc_hw_rma: {
        name: "Datacenter Hardware RMA (Google)",
        description: "A failed compute tray moves through the datacenter hardware RMA lifecycle: diagnose the failure, monitor dwell time against pipeline SLOs, flag urgency and plan logistics, then validate the return and reintegrate the spare \u2014 on one shared runtime instead of four separate specialist agents.",
        gen1Agents: ["Failure Disposition Agent", "Dwell Time Monitoring Agent", "Urgency Flagging Agent", "Return Receipt & Reintegration Agent"],
        plan: [
          { capability: "hw_failure_disposition", agentEquiv: "Failure Disposition Agent", systems: ["ANALYTICS"] },
          { capability: "dwell_sla_monitor", agentEquiv: "Dwell Time Monitoring Agent", systems: ["ANALYTICS"] },
          { capability: "urgency_logistics_plan", agentEquiv: "Urgency Flagging Agent", systems: ["ANALYTICS", "SAP_S4"] },
          { capability: "return_reintegration", agentEquiv: "Return Receipt & Reintegration Agent", systems: ["ANALYTICS", "SERVICENOW", "SAP_S4"] }
        ]
      }
    });
    Object.assign(USE_CASES, {
      // SAP SDLC AI Factory — converted from a single continuous LangGraph pipeline
      // (sap-sdlc-ai-factory) that turns a Functional Spec into a 21-section SAP
      // Technical Specification. Gen-1 here is already one agent (not four), so this
      // isn't an agent-count story — the plan below exists so the Explainability
      // layer can produce ITS OWN real, independently-measured token count (one
      // narration call per section) instead of reusing the source app's real Gemini
      // calls unchanged. Section keys/names are the source app's actual 21 sections
      // (app/workflow/nodes.py RESPONSE_MAPPING), so the two runs stay comparable.
      sap_sdlc_generation: {
        name: "SAP Technical Spec Generation",
        description: "Turn a Functional Specification into a 21-section SAP Technical Specification document \u2014 one shared runtime producing its own rationale per section, instead of one continuous LangGraph pipeline resending the full FS + effort-matrix context on every call.",
        gen1Agents: ["Technical Spec Generation Pipeline"],
        plan: [
          { capability: "ts_general_info", agentEquiv: "General Information", systems: ["ANALYTICS"] },
          { capability: "ts_business_needs", agentEquiv: "Business Needs & Requirements", systems: ["ANALYTICS"] },
          { capability: "ts_assumptions_deps", agentEquiv: "Assumptions and Dependencies", systems: ["ANALYTICS"] },
          { capability: "ts_functional_details", agentEquiv: "Functional Details", systems: ["ANALYTICS"] },
          { capability: "ts_reports", agentEquiv: "Reports", systems: ["ANALYTICS"] },
          { capability: "ts_functional_modules", agentEquiv: "Functional modules", systems: ["ANALYTICS"] },
          { capability: "ts_enhancements", agentEquiv: "Enhancements", systems: ["ANALYTICS"] },
          { capability: "ts_forms", agentEquiv: "Forms", systems: ["ANALYTICS"] },
          { capability: "ts_interfaces", agentEquiv: "Interfaces", systems: ["ANALYTICS"] },
          { capability: "ts_conversions", agentEquiv: "Conversions", systems: ["ANALYTICS"] },
          { capability: "ts_workflows", agentEquiv: "Workflows", systems: ["ANALYTICS"] },
          { capability: "ts_webdynpro", agentEquiv: "Web Dynpro", systems: ["ANALYTICS"] },
          { capability: "ts_module_pool", agentEquiv: "Module Pool", systems: ["ANALYTICS"] },
          { capability: "ts_fiori_ui5", agentEquiv: "Fiori and UI5", systems: ["ANALYTICS"] },
          { capability: "ts_programming_logic", agentEquiv: "Programming Logic", systems: ["ANALYTICS"] },
          { capability: "ts_custom_transactions", agentEquiv: "Custom Transactions", systems: ["ANALYTICS"] },
          { capability: "ts_data_dictionary", agentEquiv: "Data Dictionary", systems: ["ANALYTICS"] },
          { capability: "ts_error_handling", agentEquiv: "Error/Exception Handling", systems: ["ANALYTICS"] },
          { capability: "ts_role_auth", agentEquiv: "Roles and Authorizations", systems: ["ANALYTICS"] },
          { capability: "ts_change_history", agentEquiv: "List of Changes and Transports", systems: ["ANALYTICS"] },
          { capability: "ts_additional_info", agentEquiv: "Additional Information and Attachments", systems: ["ANALYTICS"] }
        ]
      }
    });
    Object.assign(TOOL_PACKS, {
      // 1) Raw-crop supply vs processing demand — the shared-context read.
      agri_supply_balance(L) {
        const rows = L.perceive("ANALYTICS", "agri_supply", {});
        const per = rows.map((r) => {
          const cover = r.proc_demand ? +(r.raw_supply / r.proc_demand).toFixed(3) : 1;
          const gap = r.raw_supply - r.proc_demand;
          return {
            sku: r.sku,
            plant: r.plant,
            coverage: cover,
            gapCwt: gap,
            state: cover >= 1 ? "surplus" : "short"
          };
        });
        const short = per.filter((p) => p.state === "short");
        const worst = [...per].sort((a, b) => a.coverage - b.coverage)[0];
        const balanced = per.filter((p) => p.coverage >= 0.98).length;
        const wCover = +(0.15 + 0.14 * (balanced / (per.length || 1))).toFixed(2);
        const ev = L.evidence(
          `Raw-supply balance \u2014 ${short.length} of ${per.length} lines short vs processing demand (worst ${worst.sku} at ${Math.round(worst.coverage * 100)}% cover)`,
          [
            { name: "contracted-acres \xD7 yield coverage", weight: wCover },
            { name: "processing-demand match", weight: 0.1 },
            { name: "yield-estimate confidence", weight: 0.04 }
          ]
        );
        L.explain(ev);
        ev.detailed.rootCause = `Raw supply (contracted acres \xD7 expected yield) is compared to committed processing demand per line. ${short.length ? `${short.map((s) => `${s.sku} is ${Math.abs(s.gapCwt).toLocaleString()} cwt short (${Math.round(s.coverage * 100)}% cover)`).join("; ")} \u2014 the shortfall must be closed by re-contracting acres, drawing storage, or trimming commitments.` : "Every line has raw supply at or above processing demand."}`;
        ev.detailed.recommendedAction = short.length ? `Escalate ${short.map((s) => s.sku).join(", ")} to S&OP: source additional contracted volume or reallocate committed demand before the pack runs short.` : "No supply action \u2014 carry surplus into storage plan.";
        L.remember("agri_supply", per);
        return { evidence: ev, output: { headline: `${short.length} line(s) short vs demand; worst cover ${Math.round(worst.coverage * 100)}% (${worst.sku}).`, detail: per.map((p) => `${p.sku}@${p.plant}: ${Math.round(p.coverage * 100)}% cover (${p.gapCwt >= 0 ? "+" : ""}${p.gapCwt.toLocaleString()} cwt)`).join(" | "), supply: per } };
      },
      // 2) Perishable FEFO shelf-life + cold-chain risk.
      agri_fefo_risk(L) {
        const lots = L.systems.ANALYTICS.query("agri_lots", {});
        const risk = lots.map((l) => {
          const tempBreach = l.sku_id.startsWith("FZ") && l.temp_c > -12 || l.sku_id === "FRESH-PACK" && l.temp_c > 5;
          const expiryRisk = l.days_to_expiry <= 5;
          return {
            lot: l.lot_id,
            sku: l.sku_id,
            qty: l.qty_cwt,
            dte: l.days_to_expiry,
            temp: l.temp_c,
            flag: expiryRisk || tempBreach,
            why: [expiryRisk ? "expiry\u22645d" : null, tempBreach ? "temp excursion" : null].filter(Boolean).join("+")
          };
        });
        const flagged = risk.filter((r) => r.flag);
        const atRiskCwt = flagged.reduce((a, r) => a + r.qty, 0);
        const wUrg = +(0.12 + 0.05 * Math.min(flagged.length, 3)).toFixed(2);
        const ev = L.evidence(
          `FEFO shelf-life \u2014 ${flagged.length} of ${lots.length} lots at risk (${atRiskCwt.toLocaleString()} cwt): ${flagged.map((f) => `${f.lot} (${f.why})`).join(", ") || "none"}`,
          [
            { name: "days-to-expiry margin", weight: wUrg },
            { name: "cold-chain temperature conformance", weight: 0.06 }
          ]
        );
        L.explain(ev);
        ev.detailed.rootCause = `Each lot is checked FEFO against its expiry window and its cold-chain setpoint (frozen \u2264 -12\xB0C, fresh \u2264 5\xB0C). ${flagged.length ? `${flagged.map((f) => `${f.lot} (${f.sku}) flagged for ${f.why}`).join("; ")} \u2014 these must ship or divert first before they are lost.` : "All lots are within expiry and temperature tolerance."}`;
        ev.detailed.recommendedAction = flagged.length ? `Prioritize ${flagged.map((f) => f.lot).join(", ")} for immediate ship / markdown / divert-to-recovery; hold FEFO release order for the rest.` : "No action \u2014 normal FEFO rotation.";
        L.remember("agri_fefo", flagged);
        return { evidence: ev, output: { headline: `${flagged.length} lot(s) at shelf-life/temperature risk (${atRiskCwt.toLocaleString()} cwt).`, detail: risk.map((r) => `${r.lot} ${r.sku}: ${r.dte}d, ${r.temp}\xB0C ${r.flag ? "RISK(" + r.why + ")" : "ok"}`).join(" | "), lots: risk } };
      },
      // 3) Retail + foodservice demand sensing vs plan.
      agri_demand_sensing(L) {
        const rows = L.systems.ANALYTICS.query("agri_demand", {});
        const per = rows.map((r) => {
          const dev = r.plan_qty ? (r.sensed_qty - r.plan_qty) / r.plan_qty : 0;
          return {
            sku: r.sku_id,
            channel: r.channel,
            plan: r.plan_qty,
            sensed: r.sensed_qty,
            devPct: +(dev * 100).toFixed(1),
            action: Math.abs(dev) >= 0.08 ? dev > 0 ? "raise" : "cut" : "hold"
          };
        });
        const moves = per.filter((p) => p.action !== "hold");
        const maxDev = Math.max(...per.map((p) => Math.abs(p.devPct)));
        const wSig = +(0.3 - 0.16 * Math.min(maxDev / 20, 1)).toFixed(2);
        const ev = L.evidence(
          `Demand sensing \u2014 ${moves.length} of ${per.length} series off plan (max ${maxDev}% dev): ${moves.map((m) => `${m.sku} ${m.devPct > 0 ? "+" : ""}${m.devPct}%`).join(", ") || "all on plan"}`,
          [
            { name: "sensed-vs-plan signal strength", weight: wSig },
            { name: "channel corroboration", weight: 0.05 }
          ]
        );
        L.explain(ev);
        ev.detailed.rootCause = `Live orders are compared to the demand plan per SKU/channel. ${moves.length ? `${moves.map((m) => `${m.sku} (${m.channel}) is ${m.devPct > 0 ? "up" : "down"} ${Math.abs(m.devPct)}%`).join("; ")}. A swing this large is re-forecast, but routed for a planner's confirmation because the driver (promotion vs. true demand) is not yet corroborated.` : "All series are within an 8% band of plan \u2014 no re-forecast needed."}`;
        ev.detailed.recommendedAction = moves.length ? `Re-forecast ${moves.map((m) => `${m.sku} (${m.action})`).join(", ")} and confirm the driver with the channel team before releasing to supply.` : "Hold the current demand plan.";
        L.remember("agri_demand", per);
        return { evidence: ev, output: { headline: `${moves.length} series need re-forecast (max ${maxDev}% off plan).`, detail: per.map((p) => `${p.sku}/${p.channel}: ${p.devPct > 0 ? "+" : ""}${p.devPct}% \u2192 ${p.action}`).join(" | "), demand: per } };
      },
      // 4) Cold-chain multi-echelon inventory (reuses shared supply context).
      agri_cold_chain_meio(L) {
        L.perceive("ANALYTICS", "agri_supply", {});
        const rows = L.systems.ANALYTICS.query("agri_coldchain", {});
        const per = rows.map((r) => {
          const weeks = r.weekly_demand_cwt ? +(r.on_hand_cwt / r.weekly_demand_cwt).toFixed(1) : 99;
          const belowSafety = r.on_hand_cwt < r.safety_cwt;
          const toTarget = Math.max(0, r.target_cwt - r.on_hand_cwt);
          return { sku: r.sku_id, dc: r.dc_code, weeks, belowSafety, replenishCwt: toTarget };
        });
        const breaches = per.filter((p) => p.belowSafety);
        const wc = per.reduce((a, p) => a + p.replenishCwt, 0);
        const wSafe = breaches.length ? 0.16 : 0.3;
        const ev = L.evidence(
          `Cold-chain MEIO \u2014 ${breaches.length} of ${per.length} nodes below safety (min ${Math.min(...per.map((p) => p.weeks))} wks cover)`,
          [
            { name: "weeks-of-cover vs safety", weight: wSafe },
            { name: "multi-echelon balance", weight: 0.06 }
          ]
        );
        L.explain(ev);
        ev.detailed.rootCause = `On-hand at each cold-storage node is measured in weeks of cover against safety stock. ${breaches.length ? `${breaches.map((b) => `${b.sku}@${b.dc} is below safety (${b.weeks} wks) and needs ${b.replenishCwt.toLocaleString()} cwt to target.`).join(" ")} A frozen stock-out risks fill-rate on a committed foodservice program, so the replenishment is proposed but held for review.` : "Every node is above safety stock; only routine top-ups to target remain."}`;
        ev.detailed.recommendedAction = breaches.length ? `Replenish/rebalance ${breaches.map((b) => `${b.sku}@${b.dc} (+${b.replenishCwt.toLocaleString()} cwt)`).join(", ")} from surplus nodes before drawing new production.` : "Top up to target on standard replenishment.";
        if (breaches.length) {
          try {
            L.proposeAction("SAP_S4", "STOCK_TRANSFER", { sku: breaches[0].sku, qty: breaches[0].replenishCwt }, ev, `Cold-chain replenish \u2014 ${breaches[0].sku}@${breaches[0].dc}`);
          } catch (e) {
          }
        }
        L.remember("agri_meio", per);
        return { evidence: ev, output: { headline: `${breaches.length} node(s) below safety; ${wc.toLocaleString()} cwt to target.`, detail: per.map((p) => `${p.sku}@${p.dc}: ${p.weeks} wks ${p.belowSafety ? "BELOW-SAFETY" : "ok"}, +${p.replenishCwt.toLocaleString()} cwt`).join(" | "), meio: per } };
      },
      // 5) Reefer OTIF + temperature excursion — high-consequence, gated.
      agri_reefer_otif(L) {
        const rows = L.systems.ANALYTICS.query("agri_logistics", {});
        const per = rows.map((r) => {
          const excursion = Math.abs(r.temp_excursion_c) > 3;
          const otifRisk = r.otif_pct < 0.9;
          return {
            sku: r.sku_id,
            lane: r.lane,
            carrier: r.carrier,
            exc: r.temp_excursion_c,
            otif: r.otif_pct,
            flag: excursion || otifRisk,
            why: [excursion ? `\xB1${r.temp_excursion_c}\xB0C excursion` : null, otifRisk ? `OTIF ${Math.round(r.otif_pct * 100)}%` : null].filter(Boolean).join(", ")
          };
        });
        const flagged = per.filter((p) => p.flag);
        const ev = L.evidence(
          `Reefer OTIF \u2014 ${flagged.length} of ${per.length} lanes flagged: ${flagged.map((f) => `${f.lane} (${f.why})`).join("; ") || "all conforming"}`,
          [
            { name: "temperature-excursion severity", weight: 0.14 },
            { name: "OTIF risk on lane", weight: 0.08 }
          ]
        );
        if (flagged.some((f) => Math.abs(f.exc) > 3)) {
          ev.autonomous = false;
          ev.gate = "food-safety hold \u2014 temperature excursion requires QA disposition before release";
        }
        L.explain(ev);
        ev.detailed.rootCause = `Each reefer lane is checked for temperature excursion beyond the safe band (\xB13\xB0C of setpoint) and OTIF risk. ${flagged.length ? `${flagged.map((f) => `${f.lane}: ${f.why}`).join("; ")}. An excursion on a frozen lane can compromise food safety, so the affected load is held for QA disposition (quarantine, re-inspect, or reroute) rather than auto-released.` : "All lanes are within temperature tolerance and OTIF target."}`;
        ev.detailed.recommendedAction = flagged.length ? `Hold ${flagged.map((f) => f.lane).join(", ")} for QA; expedite/reroute the OTIF-at-risk lanes after disposition.` : "Release all lanes \u2014 no exception.";
        if (flagged.length) {
          try {
            L.proposeAction("SAP_S4", "QUALITY_HOLD", { sku: flagged[0].sku, lane: flagged[0].lane }, ev, `QA hold \u2014 ${flagged[0].lane}`);
          } catch (e) {
          }
        }
        L.remember("agri_reefer", per);
        return { evidence: ev, output: { headline: `${flagged.length} lane(s) flagged \u2014 ${ev.autonomous ? "auto" : "held for QA"}.`, detail: per.map((p) => `${p.lane} (${p.carrier}): \xB1${p.exc}\xB0C, OTIF ${Math.round(p.otif * 100)}% ${p.flag ? "FLAG" : "ok"}`).join(" | "), lanes: per } };
      },
      // 6) Fertilizer input hedge — financial, gated for finance sign-off.
      agri_input_hedge(L) {
        const rows = L.systems.ANALYTICS.query("agri_fertilizer", {});
        const per = rows.map((r) => {
          const uncovered = Math.round(r.req_tons * (1 - r.coverage_pct));
          const rising = r.price_trend > 0.03;
          const spread = r.spot_usd_ton - r.contract_usd_ton;
          const exposure = uncovered * Math.max(0, spread);
          return {
            input: r.input_id,
            uncovered,
            coverage: r.coverage_pct,
            spot: r.spot_usd_ton,
            contract: r.contract_usd_ton,
            trend: r.price_trend,
            exposure,
            action: rising && spread > 0 ? "forward-buy" : "hold"
          };
        });
        const buys = per.filter((p) => p.action === "forward-buy");
        const totalExposure = buys.reduce((a, p) => a + p.exposure, 0);
        const ev = L.evidence(
          `Input hedge \u2014 ${buys.length} of ${per.length} inputs flagged to forward-buy (open exposure $${totalExposure.toLocaleString()})`,
          [
            { name: "spot-vs-contract spread", weight: 0.16 },
            { name: "price-trend momentum", weight: 0.1 },
            { name: "coverage gap", weight: 0.06 }
          ]
        );
        ev.autonomous = false;
        ev.gate = "financial output (forward purchase) \u2014 finance sign-off required";
        L.explain(ev);
        ev.detailed.rootCause = `For each input, uncovered demand (req tons \xD7 [1 \u2212 coverage]) is priced at the spot-vs-contract spread and weighted by the price trend. ${buys.length ? `${buys.map((b) => `${b.input}: spot $${b.spot} vs contract $${b.contract}, ${Math.round(b.coverage * 100)}% covered, trend +${Math.round(b.trend * 100)}% \u2192 forward-buy ${b.uncovered.toLocaleString()} t to cap ~$${b.exposure.toLocaleString()} of exposure.`).join(" ")}` : "No input meets the rising-spread test; hold at current coverage."} Because this commits cash, it is routed for finance sign-off regardless of confidence.`;
        ev.detailed.recommendedAction = buys.length ? `Recommend forward-buying ${buys.map((b) => `${b.uncovered.toLocaleString()} t of ${b.input}`).join(", ")} \u2014 submit to finance for approval.` : "Hold; revisit at next price refresh.";
        L.remember("agri_hedge", per);
        return { evidence: ev, output: { headline: `${buys.length} input(s) to forward-buy; ~$${totalExposure.toLocaleString()} exposure to cap (finance sign-off).`, detail: per.map((p) => `${p.input}: spot $${p.spot}/contract $${p.contract}, ${Math.round(p.coverage * 100)}% cov, trend ${p.trend > 0 ? "+" : ""}${Math.round(p.trend * 100)}% \u2192 ${p.action}`).join(" | "), hedge: per } };
      },
      // 7) Off-spec / surplus recovery — the $ recovered headline (reuses supply ctx).
      agri_surplus_recovery(L) {
        L.perceive("ANALYTICS", "agri_supply", {});
        const rows = L.systems.ANALYTICS.query("agri_recovery", {});
        const per = rows.map((r) => {
          const best = Math.max(r.dehy_price_cwt, r.feed_price_cwt);
          const route = r.dehy_price_cwt >= r.feed_price_cwt ? "dehydrated/byproduct" : "animal feed";
          const recovered = Math.round(r.offspec_cwt * best);
          const vsLandfill = Math.round(r.offspec_cwt * (best + r.landfill_cost_cwt));
          return { sku: r.sku_id, cwt: r.offspec_cwt, route, recovered, vsLandfill };
        });
        const totalRecovered = per.reduce((a, p) => a + p.recovered, 0);
        const totalVsLandfill = per.reduce((a, p) => a + p.vsLandfill, 0);
        const ev = L.evidence(
          `Surplus recovery \u2014 route ${per.reduce((a, p) => a + p.cwt, 0).toLocaleString()} cwt off-spec to best value ($${totalRecovered.toLocaleString()} recovered)`,
          [
            { name: "recovery-route value ranking", weight: 0.18 },
            { name: "divert-vs-landfill economics", weight: 0.1 }
          ]
        );
        L.explain(ev);
        ev.detailed.rootCause = `Each off-spec stream is routed to its highest-value outlet (dehydrated byproduct vs animal feed vs landfill). ${per.map((p) => `${p.sku}: ${p.cwt.toLocaleString()} cwt \u2192 ${p.route} (recovers $${p.recovered.toLocaleString()}, ~$${p.vsLandfill.toLocaleString()} better than landfill).`).join(" ")} Routing to the ranked best value is within policy, so it executes autonomously.`;
        ev.detailed.recommendedAction = `Divert ${per.map((p) => `${p.sku} \u2192 ${p.route}`).join(", ")}; book the recovery credit and avoid landfill cost.`;
        L.remember("agri_recovery", per);
        return { evidence: ev, output: { headline: `$${totalRecovered.toLocaleString()} recovered from off-spec surplus (~$${totalVsLandfill.toLocaleString()} vs landfill).`, detail: per.map((p) => `${p.sku}: ${p.cwt.toLocaleString()} cwt \u2192 ${p.route} = $${p.recovered.toLocaleString()}`).join(" | "), recovery: per } };
      },
      // 8) Frozen-line scheduling vs raw availability + commitments (reuses supply ctx).
      agri_line_scheduling(L) {
        L.perceive("ANALYTICS", "agri_supply", {});
        const rows = L.systems.ANALYTICS.query("agri_production", {});
        const per = rows.map((r) => {
          const feasible = Math.min(r.capacity_cwt, r.raw_avail_cwt);
          const shortfall = Math.max(0, r.committed_cwt - feasible);
          const util = r.capacity_cwt ? +(feasible / r.capacity_cwt).toFixed(2) : 0;
          return {
            line: r.line_id,
            sku: r.sku_id,
            plan: feasible,
            committed: r.committed_cwt,
            shortfall,
            util,
            rawLimited: r.raw_avail_cwt < r.committed_cwt
          };
        });
        const short = per.filter((p) => p.shortfall > 0);
        const wFeas = short.length ? 0.15 : 0.31;
        const ev = L.evidence(
          `Line scheduling \u2014 ${short.length} of ${per.length} lines cannot fully meet commitment (${short.map((s) => `${s.line} short ${s.shortfall.toLocaleString()} cwt`).join(", ") || "all feasible"})`,
          [
            { name: "raw-availability vs commitment", weight: wFeas },
            { name: "capacity utilization fit", weight: 0.05 }
          ]
        );
        L.explain(ev);
        ev.detailed.rootCause = `Each line is loaded to the lesser of capacity and raw availability, then checked against committed volume. ${short.length ? `${short.map((s) => `${s.line} (${s.sku}) is raw-limited \u2014 ${s.shortfall.toLocaleString()} cwt short of commitment.`).join(" ")} The shortfall ties back to the raw-supply balance, so the schedule is proposed but routed to planning to decide sourcing vs. commitment trims.` : "Every line can meet its commitment within capacity and raw availability."}`;
        ev.detailed.recommendedAction = short.length ? `Schedule feasible volume now; escalate ${short.map((s) => s.line).join(", ")} shortfall to S&OP (source raw or re-cut commitments).` : `Release schedule at ${per.map((p) => `${p.line} ${Math.round(p.util * 100)}%`).join(", ")} utilization.`;
        L.remember("agri_schedule", per);
        return { evidence: ev, output: { headline: `${short.length} line(s) raw-limited vs commitment.`, detail: per.map((p) => `${p.line} (${p.sku}): plan ${p.plan.toLocaleString()} cwt, ${Math.round(p.util * 100)}% util${p.shortfall ? `, SHORT ${p.shortfall.toLocaleString()} cwt` : ""}`).join(" | "), schedule: per } };
      }
    });
    Object.assign(USE_CASES, {
      agri_fresh_supply: {
        name: "Agribusiness Fresh & Frozen Supply Chain",
        description: "A potato-processor + fertilizer supply chain on one shared runtime: balance raw-crop supply against processing demand, flag perishable FEFO shelf-life risk, sense retail/foodservice demand, run cold-chain multi-echelon inventory, catch reefer OTIF & temperature excursions, hedge fertilizer inputs, recover off-spec surplus to byproduct, and schedule frozen lines \u2014 instead of eight separate specialist agents. Data is open-source-derived and representative (USDA-style potato yields, commodity fertilizer indices), not live customer data; dollar figures are modeled from the seed.",
        gen1Agents: [
          "Supply Balance Agent",
          "Shelf-Life / FEFO Agent",
          "Demand Sensing Agent",
          "Cold-Chain Inventory Agent",
          "Reefer OTIF Agent",
          "Input Hedge Agent",
          "Surplus Recovery Agent",
          "Line Scheduling Agent"
        ],
        plan: [
          { capability: "agri_supply_balance", agentEquiv: "Supply Balance Agent", systems: ["ANALYTICS"] },
          { capability: "agri_fefo_risk", agentEquiv: "Shelf-Life / FEFO Agent", systems: ["ANALYTICS"] },
          { capability: "agri_demand_sensing", agentEquiv: "Demand Sensing Agent", systems: ["ANALYTICS"] },
          { capability: "agri_cold_chain_meio", agentEquiv: "Cold-Chain Inventory Agent", systems: ["ANALYTICS", "SAP_S4"] },
          { capability: "agri_reefer_otif", agentEquiv: "Reefer OTIF Agent", systems: ["ANALYTICS", "SAP_S4"] },
          { capability: "agri_input_hedge", agentEquiv: "Input Hedge Agent", systems: ["ANALYTICS"] },
          { capability: "agri_surplus_recovery", agentEquiv: "Surplus Recovery Agent", systems: ["ANALYTICS"] },
          { capability: "agri_line_scheduling", agentEquiv: "Line Scheduling Agent", systems: ["ANALYTICS"] }
        ]
      }
    });
    var AGENT_BUSINESS = {
      disruption_response: { trigger: "A tier-1 supplier flags elevated disruption risk", objective: "Protect fill-rate and revenue when supply is threatened", decision: "Which SKUs to re-forecast, re-buy, or reallocate", value: "Avoids stockouts and expedite cost on at-risk lines" },
      telemetry_signal_integrity: { trigger: "A failure alarm arrives from equipment telemetry", objective: "Act on real failures without reacting to sensor noise", decision: "Shut down, hold, or ignore based on signal trust", value: "Prevents false-alarm downtime and missed real failures" },
      agentic_rag: { trigger: "A user asks a policy or knowledge question", objective: "Answer from governed source documents, not guesswork", decision: "Which sources to retrieve and whether the answer is grounded", value: "Cuts research time; auditable, citation-backed answers" },
      spares_rma_closed_loop: { trigger: "Service returns and spare demand need planning", objective: "Right spare, right place, at least cost", decision: "Stocking, buy-vs-refurb, and RMA disposition per part", value: "Lower spares inventory with higher service-part fill" },
      demand_planning: { trigger: "A new planning cycle or a demand shift", objective: "A consensus demand plan the network can execute", decision: "Baseline forecast plus promo and consensus adjustments", value: "Better forecast accuracy \u2192 less excess and fewer stockouts" },
      inventory_optimization: { trigger: "Inventory drifts from target service or turns", objective: "Hit service levels at minimum working capital", decision: "Safety stock, reorder points, and rebalancing", value: "Frees working capital while protecting service" },
      supply_planning: { trigger: "Supply must be matched to demand over the S&OP horizon", objective: "A feasible, balanced supply/S&OP plan", decision: "Sourcing, capacity, and allocation across the horizon", value: "Fewer shortages and expedites; smoother load" },
      procurement_sourcing: { trigger: "Spend and supplier performance need review", objective: "Lower cost and risk in the supply base", decision: "Sourcing splits, tail-spend actions, supplier risk", value: "Procurement savings with reduced supplier risk" },
      logistics_transportation: { trigger: "Shipments need routing and monitoring", objective: "On-time delivery at the lowest freight cost", decision: "Carrier, consolidation, and expedite/exception handling", value: "Freight savings while protecting OTIF" },
      production_planning: { trigger: "Work must be scheduled to the floor", objective: "Meet demand with minimal changeover and overtime", decision: "Master schedule, sequencing, and load smoothing", value: "Higher throughput; lower changeover/overtime cost" },
      monster_statistical_forecast: { trigger: "A statistical baseline forecast is needed", objective: "An accurate statistical forecast at scale", decision: "Model and parameters per series", value: "Accuracy uplift feeding the demand plan" },
      monster_cannibalization: { trigger: "A new product may cannibalize existing SKUs", objective: "Forecast the net impact of a launch", decision: "Cannibalization adjustment to affected SKUs", value: "Cleaner launch plans; less overstock on donor SKUs" },
      ocm_change_management: { trigger: "A change program needs stakeholder management", objective: "Drive adoption and reduce change risk", decision: "Engagement, timeline, and stakeholder actions", value: "Higher adoption; lower change-failure risk" },
      dc_hw_rma: { trigger: "Failed datacenter hardware enters the RMA lifecycle", objective: "Recover value and return spares to service fast", decision: "Disposition (claim/refurb/replace), dwell vs SLA, expedite, reintegration", value: "Warranty recovery plus faster return-to-service" },
      sap_sdlc_generation: { trigger: "A functional spec must become a technical spec", objective: "Produce an audit-ready 21-section technical spec", decision: "Draft each section, or route thin sections to a functional author", value: "Faster SDLC cycle; consistent, governed specs" },
      agri_fresh_supply: { trigger: "A fresh/frozen planning cycle across a potato-processor + fertilizer chain", objective: "Protect fill-rate and food safety while cutting waste and input cost", decision: "Supply balance, FEFO priority, re-forecast, replenishment, QA hold, input hedge, surplus routing, line load", value: "Less spoilage and stock-out, recovered off-spec value, and hedged input cost" }
    };
    Object.keys(AGENT_BUSINESS).forEach((k) => {
      if (USE_CASES[k]) USE_CASES[k].business = AGENT_BUSINESS[k];
    });
    async function enrichExplainability(evidenceLog, chatJSON, max = 5) {
      if (typeof chatJSON !== "function" || !Array.isArray(evidenceLog)) return { enriched: 0 };
      const ranked = evidenceLog.map((ev, i) => ({ ev, i })).filter((x) => x.ev && x.ev.detailed).sort((a, b) => Number(a.ev.autonomous) - Number(b.ev.autonomous) || a.ev.confidence - b.ev.confidence);
      let enriched = 0;
      for (const { ev } of ranked.slice(0, Math.max(0, max))) {
        const d = ev.detailed;
        const sys = 'You are an SAP/supply-chain decision analyst writing audit-grade explainability. Given a governed decision and its evidence, reply ONLY as JSON {"rootCause":string,"reasoningSteps":string[4],"recommendedAction":string}. Be concrete and specific to THIS decision; do not restate the numbers verbatim; no preamble.';
        const user = JSON.stringify({
          decision: d.decision,
          outcome: d.outcome,
          confidencePct: d.confidencePct,
          thresholdPct: d.gate.thresholdPct,
          primaryDriver: d.primaryDriver,
          contributingFactors: d.contributingFactors,
          signalIntegrity: ev.integrity || null
        });
        let r;
        try {
          r = await chatJSON([{ role: "system", content: sys }, { role: "user", content: user }], { max_tokens: 320, tier: "medium" });
        } catch (_) {
          r = null;
        }
        if (r && r.ok && r.data && (r.data.rootCause || r.data.reasoningSteps)) {
          if (typeof r.data.rootCause === "string" && r.data.rootCause.trim()) d.rootCause = r.data.rootCause.trim();
          if (Array.isArray(r.data.reasoningSteps) && r.data.reasoningSteps.length) d.reasoningSteps = r.data.reasoningSteps.map(String);
          if (typeof r.data.recommendedAction === "string" && r.data.recommendedAction.trim()) d.recommendedAction = r.data.recommendedAction.trim();
          d.source = "live";
          ev.explanationSource = "live";
          enriched++;
        }
      }
      return { enriched };
    }
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
        specialistRegistry,
        getVectorStore,
        vectorStoreStatus,
        VECTOR_CATALOGUE,
        VECTOR_PROVIDERS,
        EmbeddedVectorStore,
        unaiEmbed,
        RAG_SEED,
        Layers,
        enrichExplainability,
        SemanticQueryCache,
        normalizeQuery,
        CONCEPT_SYNONYMS
      };
    }
    if (typeof window !== "undefined") {
      try {
        window.UNAI = UNAI;
        window.SuperAgent = UNAI;
        window.vectorStoreStatus = vectorStoreStatus;
        window.VECTOR_CATALOGUE = VECTOR_CATALOGUE;
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
        const res2 = await fetch(cfg.base.replace(/\/$/, "") + "/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${cfg.key}` },
          body: JSON.stringify({ model: cfg.model, messages: [{ role: "user", content: prompt }], temperature: 0.2, max_tokens: 80 }),
          signal: AbortSignal.timeout(timeoutMs)
        });
        if (!res2.ok) return null;
        const data = await res2.json();
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
    var { encode } = require("gpt-tokenizer");
    var { narrateReal } = require_liveNarration();
    var tok = (s) => encode(String(s == null ? "" : s)).length;
    var PROMPTS = {
      "agent-1": (p) => ({
        systemInstruction: `You are Agent 1 \u2014 Failure-Based Disposition Agent for data center RMA tray hardware.
Objective: Determine the recommended disposition for a failed RMA tray based on failure evidence and DCHA logs.
Processing Requirements:
1. Analyze the failure information.
2. Evaluate DCHA diagnostic evidence.
3. Determine whether the unit should be: Repaired, Replaced, or Further Diagnosed.
4. Generate a confidence score (0 to 100 integer).
5. Provide reasoning for the recommendation.
6. Provide repair recommendation details.
7. Assess Risk ('Low', 'Medium', 'High').
8. Identify whether human approval is required: Confidence >= ${p.threshold} -> false (Auto Approved), Confidence < ${p.threshold} -> true (Human Approval Required).
Return strictly valid JSON matching the schema.`,
        prompt: `Inputs:
Tray ID: ${p.trayId}
MPN: ${p.mpn}
Failure Code: ${p.failureCode}
Failure Description: ${p.failureDescription}
DCHA Logs: ${p.dchaLogs}
Approval Threshold: ${p.threshold}%`
      }),
      "agent-2": (p) => ({
        systemInstruction: `You are Agent 2 \u2014 Dwell Time Monitoring & Escalation Agent for datacenter RMA trays.
Objective: Calculate dwell metrics, compare actual dwell duration against the configured Micro-SLO, determine target status, diagnose the root cause of delay, and recommend the appropriate escalation action.

Processing Requirements & Analysis:
1. Dwell Time: The actual elapsed hours spent in the current stage (hoursInStage).
2. Micro-SLO: The maximum acceptable duration (target in hours) for this stage.
3. Dwell Variance: Dwell Time minus Micro-SLO (hours over target). E.g., Dwell Time: 52h, Micro-SLO: 24h -> Variance: +28h over target.
4. Delay: Amount of time above target (Math.max(0, Dwell Variance)). If within target, delay is 0.
5. Target Determination:
   - 'Within Target' (Dwell Time < 0.8 * Micro-SLO)
   - 'Approaching Target' (Dwell Time >= 0.8 * Micro-SLO and <= Micro-SLO)
   - 'Target Breached' (Dwell Time > Micro-SLO)
6. Dwell Status: 'Within SLO', 'At Risk', or 'Breached' (or 'SLO Breached').
7. Root Cause: Identify the likely operational or diagnostic reason for the delay based on the stage, location, and event history (e.g., "Carrier assignment delay", "Diagnostic bench test queue backlog", "Thermal burn-in chamber capacity limit", "Technician shift transition handoff stall").
8. Escalation Recommendation: Prescribe the appropriate operational escalation action (e.g., "Monitor", "Notify logistics team", "Escalate to transportation manager", "Trigger priority carrier assignment", "Issue P1 expedited dock staging alert").
9. Confidence Score: 0 to 100 based on data completeness and clarity.
10. Approval Requirement: Confidence >= ${p.threshold} -> false (Auto Approved), Confidence < ${p.threshold} -> true (Human Approval Required).

Return strictly valid JSON matching the schema.`,
        prompt: `Inputs:
Tray ID: ${p.trayId}
Current Stage: ${p.currentStage}
Hours in Stage: ${p.hoursInStage}
Micro-SLO: ${p.microSlo} hours
Location: ${p.location}
Event History: ${p.eventHistory}
Approval Threshold: ${p.threshold}%`
      }),
      "agent-3": (p) => ({
        systemInstruction: `You are Agent 3 \u2014 Urgency Flagging Agent for datacenter RMA trays.
Objective: Determine the urgency of an RMA and recommend the appropriate Required Delivery Date (RDD) / priority level.
Processing Requirements:
1. Evaluate failure criticality.
2. Evaluate spare availability (spareInventory).
3. Evaluate business impact.
4. Evaluate transportation constraints (carrierStatus, cmQueueStatus).
5. Determine RMA urgency: 'Critical', 'High', 'Medium', 'Low'.
6. Recommend priority: 'P1', 'P2', 'P3', 'P4'.
7. Recommend RDD (e.g. Next Flight Out (<24h), Expedited 48h, Standard 5-7d).
8. Generate confidence score (0-100).
9. Determine human approval: Confidence >= ${p.threshold} -> false (Auto Approved), Confidence < ${p.threshold} -> true (Human Approval Required).
Return strictly valid JSON matching the schema.`,
        prompt: `Inputs:
Tray ID: ${p.trayId}
Failure Type: ${p.failureType}
Failure Code: ${p.failureCode}
Data Center: ${p.dataCenter}
Spare Inventory: ${p.spareInventory} units
Business Impact: ${p.businessImpact}
Carrier Status: ${p.carrierStatus}
CM Queue Status: ${p.cmQueueStatus}
Approval Threshold: ${p.threshold}%`
      }),
      "agent-4": (p) => ({
        systemInstruction: `You are Agent 4 \u2014 Return Receipt & Spare-Pool Reintegration Agent.
Objective: Validate a repaired RMA return and determine whether the asset can be reintegrated into the spare pool.
Processing Requirements:
1. Validate the returned manifest.
2. Validate serial-number consistency (compare serialNumber vs returnedSerial).
3. Verify repair completion (repairStatus).
4. Verify warranty eligibility (warrantyStatus).
5. Determine reintegration eligibility: 'Eligible', 'Ineligible', 'Quarantine'.
6. Recommend next financial/logistics action.
7. Generate confidence score (0-100).
8. Determine human approval: Confidence >= ${p.threshold} -> false (Auto Approved), Confidence < ${p.threshold} -> true (Human Approval Required).
Return strictly valid JSON matching the schema.`,
        prompt: `Inputs:
Tray ID: ${p.trayId}
RMA ID: ${p.rmaId}
Original Serial: ${p.serialNumber}
Returned Serial: ${p.returnedSerial}
Repair Status: ${p.repairStatus}
Warranty Status: ${p.warrantyStatus}
Manifest Details: ${p.manifestDetails}
Approval Threshold: ${p.threshold}%`
      })
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
        methodology: unai && unai.measured === "live" ? `LIVE measured call to ${unai.provider} (${unai.model}) for the UNAI side \u2014 real usage.prompt_tokens/completion_tokens from that provider's own API response. Original-app side is a local BPE tokenization (gpt-tokenizer) of the real prompt text, since the original app's own LLM endpoint isn't called here.` : "Real BPE tokenization (gpt-tokenizer, cl100k_base) of the actual prompt text this run would have used \u2014 not the original app's exact model tokenizer, so treat as accurate order-of-magnitude, not exact billing. Nothing here is sent to any LLM (no provider key configured).",
        original: { label: "Original app: 1 full LLM call (this agent's real prompt + JSON schema)", promptTokens: originalPromptTokens, completionTokens: originalCompletionTokens, total: originalTotal },
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
    global.COGNITION = require_cognition();
    var { UNAI } = require_engine();
    var tokenCompare = require_tokenCompare();
    var AGENT_PLAN = {
      "agent-1": { capability: "hw_failure_disposition", systems: ["ANALYTICS"] },
      "agent-2": { capability: "dwell_sla_monitor", systems: ["ANALYTICS"] },
      "agent-3": { capability: "urgency_logistics_plan", systems: ["ANALYTICS", "SAP_S4"] },
      "agent-4": { capability: "return_reintegration", systems: ["ANALYTICS", "SERVICENOW", "SAP_S4"] }
    };
    function runCapability(agentId) {
      const { capability, systems } = AGENT_PLAN[agentId];
      const goal = { name: agentId, plan: [{ capability, agentEquiv: capability.replace(/_/g, " "), systems }], gen1Agents: [capability] };
      const res2 = new UNAI({ name: agentId }).run(goal);
      return { res: res2, c: res2.results[capability] };
    }
    function riskFromConfidence(pct) {
      return pct >= 90 ? "Low" : pct >= 75 ? "Medium" : "High";
    }
    async function runAgent1(input, threshold) {
      const { res: res2, c } = runCapability("agent-1");
      const ev = c.evidence;
      const top = (c.output.disposition || [])[0] || {};
      const confidenceScore = Math.round(ev.confidence * 100);
      const disposition = top.path === "warranty" ? "Repaired" : top.path === "refurb" ? "Repaired" : top.path === "replace" ? "Replaced" : "Repaired";
      const output = {
        recommendedDisposition: disposition,
        confidenceScore,
        reasoning: `${ev.explanation || ev.detailed.rootCause} (this run \u2014 Tray ${input.trayId}, ${input.mpn}: "${input.failureDescription}")`,
        repairRecommendation: top.action || "Standard rework protocol per DCHA findings.",
        risk: riskFromConfidence(confidenceScore),
        humanApprovalRequired: confidenceScore < threshold,
        suggestedRouting: top.path === "refurb" ? `Refurb at ${top.unit || "assigned plant"}` : top.path === "warranty" ? `OEM warranty claim (${top.oem || "OEM"})` : "Scrap & replace",
        dispatchRoute: top.action || "Routed per disposition.",
        identifiedFailureMode: input.failureCode,
        estimatedCostUsd: disposition === "Replaced" ? 1450 : 185,
        estimatedTatDays: disposition === "Replaced" ? 1 : 3
      };
      const tc = await tokenCompare.compareForAgent("agent-1", Object.assign({}, input, { threshold }), output, ev, { layers: res2.observability.layerTokens, measured: "modeled" });
      output.unaiTokenComparison = tc;
      const live = tc && tc.unaiIfLlmNarrated && tc.unaiIfLlmNarrated.measured === "live";
      return {
        output,
        engineUsed: "unai",
        modelUsed: "UNAI Shared Cognitive Engine",
        tokenUsage: live ? { promptTokens: tc.unaiIfLlmNarrated.promptTokens, completionTokens: tc.unaiIfLlmNarrated.completionTokens, totalTokens: tc.unaiIfLlmNarrated.total } : { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      };
    }
    async function runAgent2(input, threshold) {
      const { c } = runCapability("agent-2");
      const ev = c.evidence;
      const confidenceScore = Math.round(ev.confidence * 100);
      const dwellVariance = (input.hoursInStage || 0) - (input.microSlo || 0);
      const delay = Math.max(0, dwellVariance);
      const targetDetermination = input.hoursInStage < 0.8 * input.microSlo ? "Within Target" : input.hoursInStage <= input.microSlo ? "Approaching Target" : "Target Breached";
      const dwellStatus = targetDetermination === "Target Breached" ? "Breached" : targetDetermination === "Approaching Target" ? "At Risk" : "Within SLO";
      const output = {
        dwellStatus,
        dwellTime: input.hoursInStage,
        microSlo: input.microSlo,
        dwellVariance,
        delay,
        targetDetermination,
        rootCause: `${ev.explanation || ev.detailed.rootCause} (this run \u2014 Tray ${input.trayId} at "${input.currentStage}", ${input.location})`,
        escalationRecommendation: ev.detailed.recommendedAction || "Monitor.",
        recommendedAction: ev.detailed.recommendedAction || "Monitor.",
        bottleneckStage: input.currentStage,
        hoursInStage: input.hoursInStage,
        sloBreach: dwellStatus === "Breached",
        confidenceScore,
        humanApprovalRequired: confidenceScore < threshold
      };
      const tc = await tokenCompare.compareForAgent("agent-2", Object.assign({}, input, { threshold }), output, ev, { layers: res.observability.layerTokens, measured: "modeled" });
      output.unaiTokenComparison = tc;
      const live = tc && tc.unaiIfLlmNarrated && tc.unaiIfLlmNarrated.measured === "live";
      return {
        output,
        engineUsed: "unai",
        modelUsed: "UNAI Shared Cognitive Engine",
        tokenUsage: live ? { promptTokens: tc.unaiIfLlmNarrated.promptTokens, completionTokens: tc.unaiIfLlmNarrated.completionTokens, totalTokens: tc.unaiIfLlmNarrated.total } : { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      };
    }
    async function runAgent3(input, threshold) {
      const { c } = runCapability("agent-3");
      const ev = c.evidence;
      const confidenceScore = Math.round(ev.confidence * 100);
      const breached = (c.output.breachedUnits || []).length > 0;
      const urgencyLevel = breached ? "Critical" : (input.spareInventory || 0) <= 1 ? "High" : "Medium";
      const priority = urgencyLevel === "Critical" ? "P1" : urgencyLevel === "High" ? "P2" : "P3";
      const output = {
        urgencyLevel,
        priority,
        recommendedRdd: priority === "P1" ? "Next Flight Out (<24h)" : priority === "P2" ? "Expedited 48h" : "Standard 5-7d",
        reasoning: `${ev.explanation || ev.detailed.rootCause} (this run \u2014 Tray ${input.trayId}, ${input.failureType})`,
        businessImpact: input.businessImpact,
        risk: riskFromConfidence(confidenceScore),
        confidenceScore,
        humanApprovalRequired: confidenceScore < threshold
      };
      const tc = await tokenCompare.compareForAgent("agent-3", Object.assign({}, input, { threshold }), output, ev, { layers: res.observability.layerTokens, measured: "modeled" });
      output.unaiTokenComparison = tc;
      const live = tc && tc.unaiIfLlmNarrated && tc.unaiIfLlmNarrated.measured === "live";
      return {
        output,
        engineUsed: "unai",
        modelUsed: "UNAI Shared Cognitive Engine",
        tokenUsage: live ? { promptTokens: tc.unaiIfLlmNarrated.promptTokens, completionTokens: tc.unaiIfLlmNarrated.completionTokens, totalTokens: tc.unaiIfLlmNarrated.total } : { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      };
    }
    async function runAgent4(input, threshold) {
      const { c } = runCapability("agent-4");
      const ev = c.evidence;
      const confidenceScore = Math.round(ev.confidence * 100);
      const serialMatch = input.serialNumber === input.returnedSerial;
      const eligible = serialMatch && /completed/i.test(input.repairStatus || "") && /in warranty/i.test(input.warrantyStatus || "");
      const output = {
        returnValidationStatus: serialMatch ? "Pass" : "Flagged",
        serialValidation: serialMatch ? "Match" : "Mismatch",
        repairValidation: /completed/i.test(input.repairStatus || "") ? "Verified" : "Incomplete",
        warrantyStatus: /in warranty/i.test(input.warrantyStatus || "") ? "In Warranty" : "Expired",
        sparePoolEligibility: eligible ? "Eligible" : serialMatch ? "Quarantine" : "Ineligible",
        recommendedAction: ev.detailed.recommendedAction || "Post goods receipt + schedule refurb.",
        financialAction: eligible ? "Credit spare pool inventory value." : "Hold pending manual reconciliation.",
        confidenceScore,
        humanApprovalRequired: confidenceScore < threshold
      };
      const tc = await tokenCompare.compareForAgent("agent-4", Object.assign({}, input, { threshold }), output, ev, { layers: res.observability.layerTokens, measured: "modeled" });
      output.unaiTokenComparison = tc;
      const live = tc && tc.unaiIfLlmNarrated && tc.unaiIfLlmNarrated.measured === "live";
      return {
        output,
        engineUsed: "unai",
        modelUsed: "UNAI Shared Cognitive Engine",
        tokenUsage: live ? { promptTokens: tc.unaiIfLlmNarrated.promptTokens, completionTokens: tc.unaiIfLlmNarrated.completionTokens, totalTokens: tc.unaiIfLlmNarrated.total } : { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      };
    }
    module2.exports = { runAgent1, runAgent2, runAgent3, runAgent4 };
  }
});

// unai_llm_capture.js
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var HOSTS = /api\.openai\.com|api\.anthropic\.com|api\.mistral\.ai|generativelanguage\.googleapis\.com|api\.groq\.com|api\.together\.xyz|openrouter\.ai|localhost:11434|127\.0\.0\.1:11434/i;
var REPORT_PATH = import_path.default.join(process.cwd(), "unai_measure_report.json");
var tokensIn = 0;
var tokensOut = 0;
var calls = 0;
function flush() {
  try {
    import_fs.default.writeFileSync(REPORT_PATH, JSON.stringify({ tokensIn, tokensOut, calls }));
  } catch (_) {
  }
}
function extractUsage(json) {
  const usage = json && (json.usage || json.usageMetadata) || {};
  const inp = usage.input_tokens ?? usage.prompt_tokens ?? usage.promptTokenCount ?? 0;
  const outp = usage.output_tokens ?? usage.completion_tokens ?? usage.candidatesTokenCount ?? 0;
  return { inp: inp || 0, outp: outp || 0 };
}
var origFetch = globalThis.fetch;
if (origFetch) {
  globalThis.fetch = async function(url, opts) {
    const res2 = await origFetch(url, opts);
    const u = typeof url === "string" ? url : url && url.url || "";
    if (HOSTS.test(u)) {
      try {
        const json = await res2.clone().json();
        const { inp, outp } = extractUsage(json);
        if (inp || outp) {
          tokensIn += inp;
          tokensOut += outp;
          calls++;
          flush();
        }
      } catch (_) {
      }
    }
    return res2;
  };
}
flush();

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_dotenv2 = __toESM(require("dotenv"), 1);
var import_vite = require("vite");
var import_unaiAdapter = __toESM(require_unaiAdapter(), 1);

// server/agents/common.ts
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var initialEngine = (() => {
  if (process.env.DEFAULT_AI_ENGINE && ["custom", "ollama", "heuristic"].includes(process.env.DEFAULT_AI_ENGINE)) {
    return process.env.DEFAULT_AI_ENGINE;
  }
  if (process.env.DEFAULT_AI_ENGINE === "api" || process.env.DEFAULT_AI_ENGINE === "gemini") {
    return "custom";
  }
  if (process.env.CUSTOM_API_URL || process.env.NVIDIA_API_KEY || process.env.NVIDIA_NIM_API_KEY) return "custom";
  if (process.env.OLLAMA_HOST && process.env.DEFAULT_AI_ENGINE === "ollama") return "ollama";
  return "custom";
})();
var engineSettings = {
  activeEngine: initialEngine,
  apiModel: process.env.AI_MODEL || process.env.LLM_MODEL || process.env.GEMINI_MODEL || "cloud-fast",
  customApiUrl: process.env.CUSTOM_API_URL || process.env.NVIDIA_BASE_URL || process.env.NVIDIA_NIM_URL || process.env.LLM_API_URL || "https://integrate.api.nvidia.com/v1",
  customApiKey: process.env.CUSTOM_API_KEY || process.env.NVIDIA_API_KEY || process.env.NVIDIA_NIM_API_KEY || process.env.LLM_API_KEY || "",
  customModel: process.env.CUSTOM_MODEL || process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct",
  geminiModel: process.env.GEMINI_MODEL || process.env.AI_MODEL || "cloud-fast",
  ollamaHost: process.env.OLLAMA_HOST || "http://localhost:11434",
  ollamaModel: process.env.OLLAMA_MODEL || "llama3",
  hasApiKey: !!(process.env.AI_API_KEY || process.env.LLM_API_KEY || process.env.CUSTOM_API_KEY || process.env.NVIDIA_API_KEY || process.env.NVIDIA_NIM_API_KEY || process.env.GEMINI_API_KEY),
  hasGeminiKey: !!(process.env.GEMINI_API_KEY || process.env.AI_API_KEY),
  approvalThresholds: {
    "agent-1": process.env.AGENT_1_THRESHOLD ? Number(process.env.AGENT_1_THRESHOLD) : 85,
    "agent-2": process.env.AGENT_2_THRESHOLD ? Number(process.env.AGENT_2_THRESHOLD) : 80,
    "agent-3": process.env.AGENT_3_THRESHOLD ? Number(process.env.AGENT_3_THRESHOLD) : 90,
    "agent-4": process.env.AGENT_4_THRESHOLD ? Number(process.env.AGENT_4_THRESHOLD) : 95
  }
};

// server/agents/agent1Disposition.ts
var import_genai2 = require("@google/genai");

// server/agents/agent2DwellTime.ts
var import_genai3 = require("@google/genai");

// server/agents/agent3Urgency.ts
var import_genai4 = require("@google/genai");

// server/agents/agent4SparePool.ts
var import_genai5 = require("@google/genai");

// server/recordsStore.ts
var recordsStore = [];
function getAllRecords() {
  return [...recordsStore].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
function addRecord(record) {
  recordsStore.unshift(record);
}
function updateRecordReview(id, newStatus, reviewer, notes, overriddenOutput) {
  const record = recordsStore.find((r) => r.id === id);
  if (!record) return null;
  record.approvalStatus = newStatus;
  record.reviewedBy = reviewer || "RMA Operations Lead";
  record.reviewedAt = (/* @__PURE__ */ new Date()).toISOString();
  record.humanReviewNotes = notes;
  if (overriddenOutput) {
    record.overriddenOutput = overriddenOutput;
  }
  return record;
}
function resetRecords() {
  recordsStore = [];
}
function calculateAnalytics() {
  const records = recordsStore;
  const total = records.length;
  let autoApprovedCount = 0;
  let pendingReviewCount = 0;
  let humanReviewedCount = 0;
  let totalConfidence = 0;
  const a1 = { total: 0, repairedCount: 0, replacedCount: 0, furtherDiagnosedCount: 0, autoApproved: 0, pendingReview: 0 };
  const a2 = { total: 0, withinSloCount: 0, atRiskCount: 0, breachedCount: 0, autoApproved: 0, pendingReview: 0 };
  const a3 = { total: 0, p1Count: 0, p2Count: 0, p3Count: 0, p4Count: 0, autoApproved: 0, pendingReview: 0 };
  const a4 = { total: 0, eligibleCount: 0, quarantineCount: 0, ineligibleCount: 0, serialMismatchCount: 0, autoApproved: 0, pendingReview: 0 };
  let totalTokensAgg = 0;
  let promptTokensAgg = 0;
  let completionTokensAgg = 0;
  const byAgentTokens = {
    "agent-1": { totalTokens: 0, promptTokens: 0, completionTokens: 0, executionCount: 0 },
    "agent-2": { totalTokens: 0, promptTokens: 0, completionTokens: 0, executionCount: 0 },
    "agent-3": { totalTokens: 0, promptTokens: 0, completionTokens: 0, executionCount: 0 },
    "agent-4": { totalTokens: 0, promptTokens: 0, completionTokens: 0, executionCount: 0 }
  };
  const recentHistoryTokens = [];
  for (const r of records) {
    totalConfidence += r.confidenceScore;
    if (r.approvalStatus === "auto_approved") {
      autoApprovedCount++;
    } else if (r.approvalStatus === "pending_human_review") {
      pendingReviewCount++;
    } else {
      humanReviewedCount++;
    }
    const promptTok = r.tokenUsage?.promptTokens ?? Math.max(120, Math.round(r.latencyMs * 0.25));
    const compTok = r.tokenUsage?.completionTokens ?? Math.max(60, Math.round(r.latencyMs * 0.12));
    const totTok = r.tokenUsage?.totalTokens ?? promptTok + compTok;
    totalTokensAgg += totTok;
    promptTokensAgg += promptTok;
    completionTokensAgg += compTok;
    if (byAgentTokens[r.agentId]) {
      const bucket = byAgentTokens[r.agentId];
      bucket.totalTokens += totTok;
      bucket.promptTokens += promptTok;
      bucket.completionTokens += compTok;
      bucket.executionCount += 1;
    }
    recentHistoryTokens.push({
      id: r.id,
      timestamp: r.timestamp,
      agentId: r.agentId,
      agentName: r.agentName,
      promptTokens: promptTok,
      completionTokens: compTok,
      totalTokens: totTok
    });
    if (r.agentId === "agent-1") {
      a1.total++;
      if (r.approvalStatus === "auto_approved") a1.autoApproved++;
      if (r.approvalStatus === "pending_human_review") a1.pendingReview++;
      const disp = r.overriddenOutput?.recommendedDisposition || r.output.recommendedDisposition;
      if (disp === "Repaired") a1.repairedCount++;
      else if (disp === "Replaced") a1.replacedCount++;
      else if (disp === "Further Diagnosed") a1.furtherDiagnosedCount++;
    } else if (r.agentId === "agent-2") {
      a2.total++;
      if (r.approvalStatus === "auto_approved") a2.autoApproved++;
      if (r.approvalStatus === "pending_human_review") a2.pendingReview++;
      const status = r.overriddenOutput?.dwellStatus || r.output.dwellStatus;
      if (status === "Within SLO") a2.withinSloCount++;
      else if (status === "At Risk") a2.atRiskCount++;
      else if (status === "Breached") a2.breachedCount++;
    } else if (r.agentId === "agent-3") {
      a3.total++;
      if (r.approvalStatus === "auto_approved") a3.autoApproved++;
      if (r.approvalStatus === "pending_human_review") a3.pendingReview++;
      const p = r.overriddenOutput?.priority || r.output.priority;
      if (p === "P1") a3.p1Count++;
      else if (p === "P2") a3.p2Count++;
      else if (p === "P3") a3.p3Count++;
      else if (p === "P4") a3.p4Count++;
    } else if (r.agentId === "agent-4") {
      a4.total++;
      if (r.approvalStatus === "auto_approved") a4.autoApproved++;
      if (r.approvalStatus === "pending_human_review") a4.pendingReview++;
      const pool = r.overriddenOutput?.sparePoolEligibility || r.output.sparePoolEligibility;
      if (pool === "Eligible") a4.eligibleCount++;
      else if (pool === "Quarantine") a4.quarantineCount++;
      else if (pool === "Ineligible") a4.ineligibleCount++;
      if (r.output.serialValidation === "Mismatch") a4.serialMismatchCount++;
    }
  }
  const tokenAnalytics = {
    totalTokens: totalTokensAgg,
    promptTokens: promptTokensAgg,
    completionTokens: completionTokensAgg,
    estimatedCostUsd: Number(((promptTokensAgg * 0.15 + completionTokensAgg * 0.6) / 1e6).toFixed(4)),
    byAgent: byAgentTokens,
    recentHistory: recentHistoryTokens.slice(0, 15)
  };
  return {
    totalProcessed: total,
    autoApprovedCount,
    pendingReviewCount,
    humanReviewedCount,
    autoApprovalRate: total > 0 ? Math.round(autoApprovedCount / total * 100) : 0,
    avgConfidence: total > 0 ? Math.round(totalConfidence / total) : 0,
    tokenAnalytics,
    agent1Metrics: a1,
    agent2Metrics: a2,
    agent3Metrics: a3,
    agent4Metrics: a4
  };
}

// server.ts
import_dotenv2.default.config();
engineSettings.hasApiKey = !!(process.env.AI_API_KEY || process.env.LLM_API_KEY || process.env.CUSTOM_API_KEY || process.env.GEMINI_API_KEY);
engineSettings.hasGeminiKey = engineSettings.hasApiKey;
function resolveModelName(engineUsed, modelUsed) {
  if (modelUsed) return modelUsed;
  if (engineUsed === "unai") return "UNAI Shared Cognitive Engine";
  if (engineUsed === "api" || engineUsed === "gemini") {
    return engineSettings.apiModel || engineSettings.geminiModel || "Cloud Fast LLM";
  }
  if (engineUsed === "custom") {
    return engineSettings.customModel || "Custom LLM Endpoint";
  }
  if (engineUsed === "ollama") {
    return engineSettings.ollamaModel || "Ollama Local";
  }
  return "Rule Heuristic Engine";
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = Number(process.env.PORT) || 3e3;
  app.use(import_express.default.json());
  app.get("/api/health", (_req, res2) => {
    res2.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.get("/api/unai/key-status", (_req, res2) => {
    const key = process.env.GATEWAY_API_KEY || process.env.MISTRAL_API_KEY || "";
    res2.json({
      set: !!key,
      provider: process.env.GATEWAY_PROVIDER || (process.env.MISTRAL_API_KEY ? "mistral" : ""),
      model: process.env.GATEWAY_MODEL || (key ? "mistral-small-latest" : ""),
      tail: key ? key.slice(-4) : ""
    });
  });
  app.post("/api/unai/set-key", (req, res2) => {
    const body = req.body || {};
    const key = String(body.key || "").trim();
    if (!key) return res2.status(400).json({ ok: false, error: "provide a key" });
    const det = /^sk-or-/.test(key) ? { base: "https://openrouter.ai/api/v1", provider: "openrouter", model: "mistralai/mistral-small" } : /^gsk_/.test(key) ? { base: "https://api.groq.com/openai/v1", provider: "groq", model: "llama-3.1-8b-instant" } : /^AIza/.test(key) ? { base: "https://generativelanguage.googleapis.com/v1beta/openai", provider: "gemini", model: "gemini-1.5-flash" } : /^sk-/.test(key) ? { base: "https://api.openai.com/v1", provider: "openai", model: "gpt-4o-mini" } : { base: "https://api.mistral.ai/v1", provider: "mistral", model: "mistral-small-latest" };
    process.env.GATEWAY_API_KEY = key;
    process.env.GATEWAY_BASE_URL = String(body.base || det.base);
    process.env.GATEWAY_MODEL = String(body.model || det.model);
    process.env.GATEWAY_PROVIDER = det.provider;
    res2.json({ ok: true, provider: det.provider, model: process.env.GATEWAY_MODEL, tail: key.slice(-4) });
  });
  app.post("/api/unai/clear-key", (_req, res2) => {
    delete process.env.GATEWAY_API_KEY;
    delete process.env.GATEWAY_BASE_URL;
    delete process.env.GATEWAY_MODEL;
    delete process.env.GATEWAY_PROVIDER;
    delete process.env.MISTRAL_API_KEY;
    res2.json({ ok: true });
  });
  app.get("/api/settings", (_req, res2) => {
    res2.json({
      activeEngine: engineSettings.activeEngine,
      apiModel: engineSettings.apiModel,
      customApiUrl: engineSettings.customApiUrl,
      customApiKey: engineSettings.customApiKey ? "******" : "",
      customModel: engineSettings.customModel,
      geminiModel: engineSettings.geminiModel,
      ollamaHost: engineSettings.ollamaHost,
      ollamaModel: engineSettings.ollamaModel,
      hasApiKey: engineSettings.hasApiKey,
      hasGeminiKey: engineSettings.hasApiKey,
      approvalThresholds: engineSettings.approvalThresholds
    });
  });
  app.post("/api/settings", (req, res2) => {
    const {
      activeEngine,
      apiModel,
      customApiUrl,
      customApiKey,
      customModel,
      geminiModel,
      ollamaHost,
      ollamaModel,
      approvalThresholds
    } = req.body;
    if (activeEngine && ["api", "custom", "ollama", "heuristic", "gemini"].includes(activeEngine)) {
      engineSettings.activeEngine = activeEngine === "gemini" ? "api" : activeEngine;
    }
    if (apiModel) engineSettings.apiModel = apiModel;
    if (customApiUrl !== void 0) engineSettings.customApiUrl = customApiUrl;
    if (customApiKey !== void 0 && customApiKey !== "******") {
      engineSettings.customApiKey = customApiKey;
    }
    if (customModel) engineSettings.customModel = customModel;
    if (geminiModel) engineSettings.geminiModel = geminiModel;
    if (ollamaHost) engineSettings.ollamaHost = ollamaHost;
    if (ollamaModel) engineSettings.ollamaModel = ollamaModel;
    if (approvalThresholds && typeof approvalThresholds === "object") {
      engineSettings.approvalThresholds = {
        ...engineSettings.approvalThresholds,
        ...approvalThresholds
      };
    }
    res2.json({ success: true, settings: engineSettings });
  });
  app.post("/api/settings/thresholds", (req, res2) => {
    const { agentId, threshold, approvalThresholds } = req.body;
    if (approvalThresholds && typeof approvalThresholds === "object") {
      engineSettings.approvalThresholds = {
        ...engineSettings.approvalThresholds,
        ...approvalThresholds
      };
    } else if (agentId && typeof threshold === "number") {
      engineSettings.approvalThresholds = {
        ...engineSettings.approvalThresholds,
        [agentId]: Math.max(50, Math.min(99, Math.round(threshold)))
      };
    }
    res2.json({ success: true, approvalThresholds: engineSettings.approvalThresholds });
  });
  app.post("/api/settings/test-connection", async (req, res2) => {
    const { engine, host, customUrl, apiKey } = req.body;
    const testEngine = engine || engineSettings.activeEngine;
    if (testEngine === "ollama") {
      const targetHost = (host || engineSettings.ollamaHost || "http://localhost:11434").replace(/\/$/, "");
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4e3);
        const check = await fetch(`${targetHost}/api/tags`, { signal: controller.signal });
        clearTimeout(timeout);
        if (check.ok) {
          const data = await check.json();
          return res2.json({
            success: true,
            message: `Connected successfully to Ollama at ${targetHost}! Found ${data.models?.length || 0} models.`,
            models: data.models?.map((m) => m.name) || []
          });
        } else {
          return res2.json({
            success: false,
            message: `Ollama host responded with status ${check.status} (${check.statusText})`
          });
        }
      } catch (err) {
        return res2.json({
          success: false,
          message: `Could not connect to Ollama at ${targetHost}: ${err.message || "Connection refused"}. Ensure Ollama is running locally (ollama serve).`
        });
      }
    } else if (testEngine === "custom") {
      const targetUrl = customUrl || engineSettings.customApiUrl;
      if (!targetUrl) {
        return res2.json({
          success: false,
          message: "Custom API URL is not configured."
        });
      }
      try {
        const cleanUrl = targetUrl.replace(/\/$/, "");
        const pingUrl = cleanUrl.endsWith("/chat/completions") ? cleanUrl.replace("/chat/completions", "/models") : `${cleanUrl}/models`;
        const headers = {};
        const key = apiKey || engineSettings.customApiKey;
        if (key) headers["Authorization"] = `Bearer ${key}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4e3);
        const check = await fetch(pingUrl, { headers, signal: controller.signal });
        clearTimeout(timeout);
        if (check.ok) {
          return res2.json({
            success: true,
            message: `Successfully connected to custom endpoint at ${cleanUrl}!`
          });
        }
        return res2.json({
          success: true,
          message: `Custom endpoint at ${cleanUrl} reached (status: ${check.status}).`
        });
      } catch (err) {
        return res2.json({
          success: false,
          message: `Could not reach custom endpoint: ${err.message || "Network error"}`
        });
      }
    } else {
      const hasKey = !!(process.env.AI_API_KEY || process.env.LLM_API_KEY || process.env.GEMINI_API_KEY);
      if (!hasKey) {
        return res2.json({
          success: false,
          message: "AI API key is not configured in environment."
        });
      }
      return res2.json({
        success: true,
        message: "AI API key is configured and active for server-side generation."
      });
    }
  });
  app.get("/api/analytics", (_req, res2) => {
    res2.json(calculateAnalytics());
  });
  app.get("/api/records", (req, res2) => {
    let records = getAllRecords();
    const { agentId, status, search } = req.query;
    if (agentId) {
      records = records.filter((r) => r.agentId === agentId);
    }
    if (status) {
      records = records.filter((r) => r.approvalStatus === status);
    }
    if (search) {
      const q = search.toLowerCase();
      records = records.filter(
        (r) => r.trayId.toLowerCase().includes(q) || r.agentName.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || JSON.stringify(r.output).toLowerCase().includes(q)
      );
    }
    res2.json(records);
  });
  app.post("/api/records/:id/review", (req, res2) => {
    const { id } = req.params;
    const newStatus = req.body.newStatus || req.body.approvalStatus;
    const reviewer = req.body.reviewer || req.body.reviewedBy || "RMA Operations Lead";
    const notes = req.body.notes || req.body.humanReviewNotes || "";
    const overriddenOutput = req.body.overriddenOutput;
    if (!newStatus) {
      return res2.status(400).json({ error: "newStatus is required" });
    }
    const updated = updateRecordReview(id, newStatus, reviewer, notes, overriddenOutput);
    if (!updated) {
      return res2.status(404).json({ error: "Record not found" });
    }
    res2.json({ success: true, record: updated, analytics: calculateAnalytics() });
  });
  app.post("/api/records/reset", (_req, res2) => {
    resetRecords();
    res2.json({ success: true, analytics: calculateAnalytics() });
  });
  app.post("/api/records", (req, res2) => {
    const raw = req.body;
    if (!raw.agentId) {
      return res2.status(400).json({ error: "agentId is required" });
    }
    const agentNum = raw.agentId.replace("agent-", "");
    const recordId = raw.id || `REC-A${agentNum}-${Date.now().toString().slice(-6)}`;
    const threshold = raw.threshold ?? (raw.agentId === "agent-1" ? 85 : raw.agentId === "agent-2" ? 80 : raw.agentId === "agent-3" ? 90 : 95);
    const confidenceScore = Number(raw.confidenceScore ?? 88);
    const approvalStatus = raw.approvalStatus || (confidenceScore >= threshold ? "auto_approved" : "pending_human_review");
    const record = {
      id: recordId,
      agentId: raw.agentId,
      agentName: raw.agentName || (raw.agentId === "agent-1" ? "Failure-Based Disposition Agent" : raw.agentId === "agent-2" ? "Dwell Time Monitoring & Escalation Agent" : raw.agentId === "agent-3" ? "Urgency Flagging Agent" : "Return Receipt & Spare-Pool Reintegration Agent"),
      timestamp: raw.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
      trayId: raw.trayId || `TRAY-2026-MANUAL-${Math.floor(1e3 + Math.random() * 9e3)}`,
      engineUsed: raw.engineUsed || "heuristic",
      modelName: raw.modelName || "Rule Engine / Manual Entry",
      latencyMs: raw.latencyMs || 450,
      tokenUsage: raw.tokenUsage || {
        promptTokens: 210,
        completionTokens: 95,
        totalTokens: 305
      },
      input: raw.input || {},
      output: raw.output || {},
      confidenceScore,
      threshold,
      approvalStatus
    };
    addRecord(record);
    res2.json({ success: true, record, analytics: calculateAnalytics() });
  });
  app.post("/api/agent/1/run", async (req, res2) => {
    const start = Date.now();
    try {
      const input = req.body;
      if (!input.trayId || !input.failureCode) {
        return res2.status(400).json({ error: "trayId and failureCode are required" });
      }
      const threshold = input.threshold ?? (engineSettings.approvalThresholds?.["agent-1"] || 85);
      const { output, engineUsed, tokenUsage, modelUsed } = await (0, import_unaiAdapter.runAgent1)(input, threshold);
      const latencyMs = Date.now() - start;
      const recordId = `REC-A1-${Date.now().toString().slice(-6)}`;
      const approvalStatus = output.humanApprovalRequired ? "pending_human_review" : "auto_approved";
      const record = {
        id: recordId,
        agentId: "agent-1",
        agentName: "Failure-Based Disposition Agent",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        trayId: input.trayId,
        engineUsed,
        modelName: resolveModelName(engineUsed, modelUsed),
        latencyMs,
        tokenUsage,
        input,
        output,
        confidenceScore: output.confidenceScore,
        threshold,
        approvalStatus
      };
      addRecord(record);
      res2.json({
        success: true,
        record,
        output,
        analytics: calculateAnalytics()
      });
    } catch (err) {
      res2.status(500).json({ error: err.message || "Failed to execute Agent 1" });
    }
  });
  app.post("/api/agent/2/run", async (req, res2) => {
    const start = Date.now();
    try {
      const input = req.body;
      if (!input.trayId || !input.currentStage) {
        return res2.status(400).json({ error: "trayId and currentStage are required" });
      }
      const threshold = input.threshold ?? (engineSettings.approvalThresholds?.["agent-2"] || 80);
      const { output, engineUsed, tokenUsage, modelUsed } = await (0, import_unaiAdapter.runAgent2)(input, threshold);
      const latencyMs = Date.now() - start;
      const recordId = `REC-A2-${Date.now().toString().slice(-6)}`;
      const approvalStatus = output.humanApprovalRequired ? "pending_human_review" : "auto_approved";
      const record = {
        id: recordId,
        agentId: "agent-2",
        agentName: "Dwell Time Monitoring & Escalation Agent",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        trayId: input.trayId,
        engineUsed,
        modelName: resolveModelName(engineUsed, modelUsed),
        latencyMs,
        tokenUsage,
        input,
        output,
        confidenceScore: output.confidenceScore,
        threshold,
        approvalStatus
      };
      addRecord(record);
      res2.json({
        success: true,
        record,
        output,
        analytics: calculateAnalytics()
      });
    } catch (err) {
      res2.status(500).json({ error: err.message || "Failed to execute Agent 2" });
    }
  });
  app.post("/api/agent/3/run", async (req, res2) => {
    const start = Date.now();
    try {
      const input = req.body;
      if (!input.trayId || !input.failureType) {
        return res2.status(400).json({ error: "trayId and failureType are required" });
      }
      const threshold = input.threshold ?? (engineSettings.approvalThresholds?.["agent-3"] || 90);
      const { output, engineUsed, tokenUsage, modelUsed } = await (0, import_unaiAdapter.runAgent3)(input, threshold);
      const latencyMs = Date.now() - start;
      const recordId = `REC-A3-${Date.now().toString().slice(-6)}`;
      const approvalStatus = output.humanApprovalRequired ? "pending_human_review" : "auto_approved";
      const record = {
        id: recordId,
        agentId: "agent-3",
        agentName: "Urgency Flagging Agent",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        trayId: input.trayId,
        engineUsed,
        modelName: resolveModelName(engineUsed, modelUsed),
        latencyMs,
        tokenUsage,
        input,
        output,
        confidenceScore: output.confidenceScore,
        threshold,
        approvalStatus
      };
      addRecord(record);
      res2.json({
        success: true,
        record,
        output,
        analytics: calculateAnalytics()
      });
    } catch (err) {
      res2.status(500).json({ error: err.message || "Failed to execute Agent 3" });
    }
  });
  app.post("/api/agent/4/run", async (req, res2) => {
    const start = Date.now();
    try {
      const input = req.body;
      if (!input.trayId || !input.serialNumber) {
        return res2.status(400).json({ error: "trayId and serialNumber are required" });
      }
      const threshold = input.threshold ?? (engineSettings.approvalThresholds?.["agent-4"] || 95);
      const { output, engineUsed, tokenUsage, modelUsed } = await (0, import_unaiAdapter.runAgent4)(input, threshold);
      const latencyMs = Date.now() - start;
      const recordId = `REC-A4-${Date.now().toString().slice(-6)}`;
      const approvalStatus = output.humanApprovalRequired ? "pending_human_review" : "auto_approved";
      const record = {
        id: recordId,
        agentId: "agent-4",
        agentName: "Return Receipt & Spare-Pool Reintegration Agent",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        trayId: input.trayId,
        engineUsed,
        modelName: resolveModelName(engineUsed, modelUsed),
        latencyMs,
        tokenUsage,
        input,
        output,
        confidenceScore: output.confidenceScore,
        threshold,
        approvalStatus
      };
      addRecord(record);
      res2.json({
        success: true,
        record,
        output,
        analytics: calculateAnalytics()
      });
    } catch (err) {
      res2.status(500).json({ error: err.message || "Failed to execute Agent 4" });
    }
  });
  app.post("/api/fleet/kickoff", async (_req, res2) => {
    try {
      const results = [];
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      const runBatchId = Date.now().toString().slice(-4);
      try {
        const a1Start = Date.now();
        const a1Input = {
          trayId: `TRAY-2026-HBM-84${runBatchId}`,
          mpn: "TPU-v5p-ACCEL-TRAY-B2",
          failureCode: "ERR-HBM-MEM-PARITY-CORRUPT",
          failureDescription: "Uncorrectable HBM3 ECC multi-bit parity alert during tensor core matrix multiplication burst.",
          dchaLogs: "DCHA-DIAG: Channel 3 HBM stack thermal sensor reading 78C; parity registers bit 14 stuck high. Visual inspection: no PCB delamination; board reworkable."
        };
        const a1Threshold = engineSettings.approvalThresholds?.["agent-1"] || 85;
        const a1Res = await (0, import_unaiAdapter.runAgent1)(a1Input, a1Threshold);
        const a1Record = {
          id: `REC-A1-${Date.now().toString().slice(-6)}`,
          agentId: "agent-1",
          agentName: "Failure-Based Disposition Agent",
          timestamp,
          trayId: a1Input.trayId,
          engineUsed: a1Res.engineUsed,
          modelName: resolveModelName(a1Res.engineUsed, a1Res.modelUsed),
          latencyMs: Date.now() - a1Start,
          tokenUsage: a1Res.tokenUsage,
          input: a1Input,
          output: a1Res.output,
          confidenceScore: a1Res.output.confidenceScore,
          threshold: a1Threshold,
          approvalStatus: a1Res.output.humanApprovalRequired ? "pending_human_review" : "auto_approved"
        };
        addRecord(a1Record);
        results.push(a1Record);
      } catch (err) {
        console.warn("Fleet Kickoff Agent 1 error:", err);
      }
      try {
        const a2Start = Date.now();
        const a2Input = {
          trayId: `TRAY-2026-PCIE-31${runBatchId}`,
          currentStage: "Burn-in Chamber B-4",
          hoursInStage: 22.5,
          microSlo: 12,
          location: "Contract Manufacturer Line 3 (Fremont Depot)",
          eventHistory: "2026-03-30T08:00:00Z Checkpoint In -> 2026-03-31T06:30:00Z Chamber Temp Stalled"
        };
        const a2Threshold = engineSettings.approvalThresholds?.["agent-2"] || 80;
        const a2Res = await (0, import_unaiAdapter.runAgent2)(a2Input, a2Threshold);
        const a2Record = {
          id: `REC-A2-${Date.now().toString().slice(-6)}`,
          agentId: "agent-2",
          agentName: "Dwell Time Monitoring & Escalation Agent",
          timestamp,
          trayId: a2Input.trayId,
          engineUsed: a2Res.engineUsed,
          modelName: resolveModelName(a2Res.engineUsed, a2Res.modelUsed),
          latencyMs: Date.now() - a2Start,
          tokenUsage: a2Res.tokenUsage,
          input: a2Input,
          output: a2Res.output,
          confidenceScore: a2Res.output.confidenceScore,
          threshold: a2Threshold,
          approvalStatus: a2Res.output.humanApprovalRequired ? "pending_human_review" : "auto_approved"
        };
        addRecord(a2Record);
        results.push(a2Record);
      } catch (err) {
        console.warn("Fleet Kickoff Agent 2 error:", err);
      }
      try {
        const a3Start = Date.now();
        const a3Input = {
          trayId: `TRAY-2026-VRM-99${runBatchId}`,
          failureType: "Thermal Throttle & Voltage Droop",
          failureCode: "ERR-VRM-VREG-HIGH-TEMP",
          dataCenter: "DC-IOWA-02 (Council Bluffs)",
          spareInventory: 1,
          businessImpact: "Critical: Secondary spare buffer depleted below SLA reserve limit",
          carrierStatus: "Next Flight Out (NFO) available",
          cmQueueStatus: "Expedited slot active"
        };
        const a3Threshold = engineSettings.approvalThresholds?.["agent-3"] || 90;
        const a3Res = await (0, import_unaiAdapter.runAgent3)(a3Input, a3Threshold);
        const a3Record = {
          id: `REC-A3-${Date.now().toString().slice(-6)}`,
          agentId: "agent-3",
          agentName: "Urgency Flagging Agent",
          timestamp,
          trayId: a3Input.trayId,
          engineUsed: a3Res.engineUsed,
          modelName: resolveModelName(a3Res.engineUsed, a3Res.modelUsed),
          latencyMs: Date.now() - a3Start,
          tokenUsage: a3Res.tokenUsage,
          input: a3Input,
          output: a3Res.output,
          confidenceScore: a3Res.output.confidenceScore,
          threshold: a3Threshold,
          approvalStatus: a3Res.output.humanApprovalRequired ? "pending_human_review" : "auto_approved"
        };
        addRecord(a3Record);
        results.push(a3Record);
      } catch (err) {
        console.warn("Fleet Kickoff Agent 3 error:", err);
      }
      try {
        const a4Start = Date.now();
        const a4Input = {
          trayId: `TRAY-2026-RET-40${runBatchId}`,
          rmaId: `RMA-2026-CAL-77${runBatchId}`,
          serialNumber: `SN-RMA-2026-RET-99${runBatchId}`,
          returnedSerial: `SN-RMA-2026-RET-99${runBatchId}`,
          repairStatus: "Completed",
          warrantyStatus: "In Warranty",
          manifestDetails: "Optical barcode verified; Tier-1 QA zero-fault sheet attached."
        };
        const a4Threshold = engineSettings.approvalThresholds?.["agent-4"] || 95;
        const a4Res = await (0, import_unaiAdapter.runAgent4)(a4Input, a4Threshold);
        const a4Record = {
          id: `REC-A4-${Date.now().toString().slice(-6)}`,
          agentId: "agent-4",
          agentName: "Return Receipt & Spare-Pool Reintegration Agent",
          timestamp,
          trayId: a4Input.trayId,
          engineUsed: a4Res.engineUsed,
          modelName: resolveModelName(a4Res.engineUsed, a4Res.modelUsed),
          latencyMs: Date.now() - a4Start,
          tokenUsage: a4Res.tokenUsage,
          input: a4Input,
          output: a4Res.output,
          confidenceScore: a4Res.output.confidenceScore,
          threshold: a4Threshold,
          approvalStatus: a4Res.output.humanApprovalRequired ? "pending_human_review" : "auto_approved"
        };
        addRecord(a4Record);
        results.push(a4Record);
      } catch (err) {
        console.warn("Fleet Kickoff Agent 4 error:", err);
      }
      res2.json({
        success: true,
        count: results.length,
        records: results,
        analytics: calculateAnalytics()
      });
    } catch (err) {
      res2.status(500).json({ error: err.message || "Failed to kickoff agent fleet" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res2) => {
      res2.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`RMA Control Tower Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
