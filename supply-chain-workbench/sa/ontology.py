# ==========================================================================
# UNAI - Universal Supply-Chain Agent (Cognitive Runtime)
# Copyright (c) 2026 Ravin Angara / Bristlecone. All rights reserved.
#
# PROPRIETARY & CONFIDENTIAL. This file, and the architecture, methods and
# ideas it embodies, are the exclusive property of the copyright holders.
# No part may be copied, reproduced, modified, distributed, reverse-engineered,
# or used to create derivative works without prior written permission.
# Shared under confidentiality; unauthorized use or disclosure is prohibited.
# See LICENSE. Integrity: this file is listed in copyright/MANIFEST.sha256.
# SPDX-License-Identifier: LicenseRef-UNAI-Proprietary   [UNAI-COPYRIGHT v1]
# ==========================================================================
"""
Canonical Business Ontology — the single shared language of the Super Agent.

Every source system speaks its own dialect (SAP, a Snowflake gold mart, a
Databricks Delta/silver table, a Postgres OLTP store, a DuckDB dev lakehouse,
a third-party logistics feed). The ontology maps each system's NATIVE field
name to one canonical concept. The agent only ever reasons in canonical
concepts, so moving between systems costs ZERO per-agent re-mapping.

Map once, here. Reuse everywhere.
"""

# Systems we can reconcile. The runnable demo uses DUCKDB (and optionally POSTGRES);
# SNOWFLAKE / DATABRICKS / SAP / LOGISTICS show how the same ontology spans them.
SYSTEMS = ["SAP", "SNOWFLAKE", "DATABRICKS", "BIGQUERY", "POSTGRES", "DUCKDB", "LOGISTICS"]

# canonical concept -> { system: native field name }   (None = not present in that system)
ONTOLOGY = {
    # --- product / location / supplier dimensions ---
    "sku":            {"SAP": "MATNR", "SNOWFLAKE": "PRODUCT_KEY", "DATABRICKS": "sku",        "POSTGRES": "sku_id",     "DUCKDB": "sku_id",     "LOGISTICS": "item_no"},
    "product_name":   {"SAP": "MAKTX", "SNOWFLAKE": "PRODUCT_NAME","DATABRICKS": "product_name","POSTGRES": "product_name","DUCKDB": "product_name","LOGISTICS": None},
    "category":       {"SAP": "MTART", "SNOWFLAKE": "CATEGORY",    "DATABRICKS": "category",    "POSTGRES": "category",   "DUCKDB": "category",   "LOGISTICS": None},
    "location":       {"SAP": "WERKS", "SNOWFLAKE": "LOCATION_KEY","DATABRICKS": "dc",          "POSTGRES": "dc_code",    "DUCKDB": "dc_code",    "LOGISTICS": "facility"},
    "region":         {"SAP": "REGIO", "SNOWFLAKE": "REGION",      "DATABRICKS": "region",      "POSTGRES": "region",     "DUCKDB": "region",     "LOGISTICS": "region"},
    "echelon":        {"SAP": None,    "SNOWFLAKE": "ECHELON",     "DATABRICKS": "echelon",     "POSTGRES": "echelon",    "DUCKDB": "echelon",    "LOGISTICS": None},
    "supplier":       {"SAP": "LIFNR", "SNOWFLAKE": "SUPPLIER_KEY","DATABRICKS": "vendor",      "POSTGRES": "vendor_id",  "DUCKDB": "vendor_id",  "LOGISTICS": "shipper"},
    "supplier_region":{"SAP": "LAND1", "SNOWFLAKE": "SUPPLIER_REGION","DATABRICKS": "vendor_region","POSTGRES": "supplier_region","DUCKDB": "supplier_region","LOGISTICS": None},
    "period":         {"SAP": "SPMON", "SNOWFLAKE": "PERIOD",      "DATABRICKS": "period",      "POSTGRES": "period",     "DUCKDB": "period",     "LOGISTICS": None},

    # --- measures: sales / inventory / costs ---
    "sales_qty":      {"SAP": "KWMENG","SNOWFLAKE": "SALES_QTY",   "DATABRICKS": "sales_qty",   "POSTGRES": "sales_qty",  "DUCKDB": "sales_qty",  "LOGISTICS": None},
    "on_hand_qty":    {"SAP": "LABST", "SNOWFLAKE": "ON_HAND_QTY", "DATABRICKS": "on_hand",     "POSTGRES": "qty_on_hand","DUCKDB": "qty_on_hand","LOGISTICS": None},
    "in_transit_qty": {"SAP": "TRAME", "SNOWFLAKE": "IN_TRANSIT",  "DATABRICKS": "in_transit",  "POSTGRES": "in_transit", "DUCKDB": "in_transit", "LOGISTICS": "units"},
    "safety_stock":   {"SAP": "EISBE", "SNOWFLAKE": "SAFETY_STOCK","DATABRICKS": "safety_stock","POSTGRES": "safety_stock","DUCKDB": "safety_stock","LOGISTICS": None},
    "reorder_point":  {"SAP": "MINBE", "SNOWFLAKE": "REORDER_PT",  "DATABRICKS": "reorder_point","POSTGRES": "reorder_point","DUCKDB": "reorder_point","LOGISTICS": None},
    "lead_time_days": {"SAP": "PLIFZ", "SNOWFLAKE": "LEAD_TIME",   "DATABRICKS": "lead_time",   "POSTGRES": "lead_time",  "DUCKDB": "lead_time",  "LOGISTICS": None},
    "unit_cost":      {"SAP": "STPRS", "SNOWFLAKE": "UNIT_COST",   "DATABRICKS": "unit_cost",   "POSTGRES": "unit_cost",  "DUCKDB": "unit_cost",  "LOGISTICS": None},

    # --- features (Databricks-produced) ---
    "forecast_qty":   {"SAP": None,    "SNOWFLAKE": "FCST_QTY",    "DATABRICKS": "yhat",        "POSTGRES": "fcst_qty",   "DUCKDB": "fcst_qty",   "LOGISTICS": None},
    "supplier_risk":  {"SAP": None,    "SNOWFLAKE": "RISK_SCORE",  "DATABRICKS": "risk_score",  "POSTGRES": "risk_score", "DUCKDB": "risk_score", "LOGISTICS": None},
    "disruption_flag":{"SAP": None,    "SNOWFLAKE": "DISRUPTED",   "DATABRICKS": "disrupted",   "POSTGRES": "disrupted",  "DUCKDB": "disrupted",  "LOGISTICS": None},

    # --- procurement ---
    "purchase_order": {"SAP": "EBELN", "SNOWFLAKE": "PO_KEY",      "DATABRICKS": "po_id",       "POSTGRES": "po_id",      "DUCKDB": "po_id",      "LOGISTICS": "ref_po"},
    "po_qty":         {"SAP": "MENGE", "SNOWFLAKE": "PO_QTY",      "DATABRICKS": "po_qty",      "POSTGRES": "po_qty",     "DUCKDB": "po_qty",     "LOGISTICS": None},

    # --- logistics / shipments ---
    "shipment_id":    {"SAP": "VBELN", "SNOWFLAKE": "SHIPMENT_KEY","DATABRICKS": "shipment_id", "POSTGRES": "shipment_id","DUCKDB": "shipment_id","LOGISTICS": "tracking_no"},
    "carrier":        {"SAP": "TDLNR", "SNOWFLAKE": "CARRIER",     "DATABRICKS": "carrier",     "POSTGRES": "carrier",    "DUCKDB": "carrier",    "LOGISTICS": "carrier_scac"},
    "ship_status":    {"SAP": "STATUS","SNOWFLAKE": "SHIP_STATUS", "DATABRICKS": "status",      "POSTGRES": "status",     "DUCKDB": "status",     "LOGISTICS": "milestone"},
    "eta_days":       {"SAP": None,    "SNOWFLAKE": "ETA_DAYS",    "DATABRICKS": "eta_days",    "POSTGRES": "eta_days",   "DUCKDB": "eta_days",   "LOGISTICS": "eta_days"},
    "planned_eta":    {"SAP": "LFDAT", "SNOWFLAKE": "PLANNED_ETA", "DATABRICKS": "planned_eta", "POSTGRES": "planned_eta","DUCKDB": "planned_eta","LOGISTICS": "promised_eta"},
}

# --- Spares planning (IBP), RMA execution, and the planning use cases ---------
# Concepts + their Databricks/BigQuery dialect column names (from the setup DDL),
# so `automap`/coverage induce the ontology from the spares/RMA/planning tables.
_EXTRA = {
    "install_base_qty": "install_base", "asset_age_months": "age_months", "failure_rate": "fail_rate",
    "age_factor": "age_factor", "demand_variability": "variability", "return_prob": "return_prob",
    "return_lag_days": "return_lag_days", "yield_rate": "yield_rate", "target_stock": "target_pos",
    "service_level": "service_level", "refurb_capacity": "capacity", "refurb_cost": "cost_per_unit",
    "rma_id": "rma_id", "rma_status": "status", "warranty_status": "warranty", "claim_value": "claim_value",
    "entitlement": "entitled", "consensus_demand": "consensus_qty", "promo_uplift": "promo_uplift",
    "forecast_accuracy": "fcst_accuracy", "inv_turns": "inv_turns", "excess_qty": "excess_qty",
    "capacity_qty": "cap_qty", "mps_qty": "mps_qty", "allocation_qty": "alloc_qty",
    "spend_amount": "spend_amt", "supplier_score": "supplier_score", "contract_id": "contract_id",
    "transit_days": "transit_days", "freight_cost": "freight_cost", "otif": "otif_pct",
    "work_order": "work_order", "run_rate": "run_rate", "oee": "oee_pct",
    # ---- Datacenter hardware RMA (dc_hw_rma_case, converted from rma-agent-poc) ----
    "tray_id": "tray_id", "mpn": "mpn", "failure_code": "failure_code",
    "failure_description": "failure_description", "dcha_telemetry": "dcha_log",
    "rma_stage": "current_stage", "hours_in_stage": "hours_in_stage", "micro_slo_hours": "micro_slo",
    "event_history": "event_history", "failure_type": "failure_type", "business_impact": "business_impact",
    "carrier_status": "carrier_status", "cm_queue_status": "cm_queue_status",
    "serial_number": "serial_number", "returned_serial": "returned_serial",
    "repair_status": "repair_status", "manifest_details": "manifest_details",
}
for _concept, _col in _EXTRA.items():
    ONTOLOGY.setdefault(_concept, {})
    ONTOLOGY[_concept].update({"DATABRICKS": _col, "SNOWFLAKE": _col.upper(), "POSTGRES": _col, "DUCKDB": _col})

# BigQuery's UNAI canonical tables use the SAME column names as the Databricks
# dialect (published by connect_bigquery.py), so BIGQUERY reuses that mapping.
for _m in ONTOLOGY.values():
    _m["BIGQUERY"] = _m.get("DATABRICKS")

# Extra native spellings: a concept can have MORE than one native name across
# different tables in the SAME warehouse (e.g. BigQuery's fct_inventory calls
# it "on_hand" while dc_hw_rma_case calls it "spare_inventory" — both are real,
# both should resolve). Feeds automap's KNOWN index AND OntologyMapper.to_canonical
# (as a fallback read-only lookup) — but never field_for()/select_clause/writes,
# so existing live-query use cases keep writing through their one designated
# native field per system unchanged.
ALIASES = {
    "location": ["datacenter"],
    "on_hand_qty": ["spare_inventory"],
    "warranty_status": ["warranty_status"],
}


class OntologyMapper:
    """Translate native records <-> canonical concepts. Counts translations for observability."""

    def __init__(self, ontology=ONTOLOGY):
        self.ontology = ontology
        self.translations = 0

    def to_canonical(self, system: str, native_record: dict) -> dict:
        out = {}
        for concept, mapping in self.ontology.items():
            field = mapping.get(system)
            if field and field in native_record:
                out[concept] = native_record[field]
                self.translations += 1
        # A concept's one designated field per system can already be claimed by a
        # DIFFERENT table's column name (see ALIASES above) — fall back to any
        # extra known spelling actually present in this record.
        for concept, alt_names in ALIASES.items():
            if concept in out:
                continue
            for name in alt_names:
                if name in native_record:
                    out[concept] = native_record[name]
                    self.translations += 1
                    break
        out["_system"] = system
        return out

    def field_for(self, system: str, concept: str):
        """Canonical concept -> native field name for a given system."""
        return self.ontology.get(concept, {}).get(system)

    def select_clause(self, system: str, concepts) -> str:
        """Build a SQL `SELECT native AS canonical, ...` so any engine returns canonical columns."""
        parts = []
        for c in concepts:
            f = self.field_for(system, c)
            if f:
                parts.append(f'{f} AS {c}')
        return ", ".join(parts) if parts else "*"
