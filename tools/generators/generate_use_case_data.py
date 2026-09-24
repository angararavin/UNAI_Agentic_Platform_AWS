# ==========================================================================
# UNAI - Universal Supply-Chain Agent (Cognitive Runtime)
# Copyright (c) 2026 Ravin Angara / Bristlecone. All rights reserved.
# PROPRIETARY & CONFIDENTIAL. See LICENSE.  [UNAI-COPYRIGHT v1]
# --------------------------------------------------------------------------
# Generate downloadable CSVs for every use case: one data file per canonical
# table (native column names + sample rows) + a data-dictionary CSV describing
# the structures + a use-case -> tables map. Single source of truth =
# connect_bigquery.py (CANON_TABLES / SEED), which mirrors the Databricks DDL.
#   python3 generate_use_case_data.py
# ==========================================================================
import os, csv, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "supply-chain-workbench"))
import connect_bigquery as b   # CANON_TABLES: {table:[(col,type,concept)]}, SEED: {table:[rows]}

OUT = os.path.join(ROOT, "data"); os.makedirs(OUT, exist_ok=True)

USE_CASE_NAMES = {
    "disruption_response": "Supplier Disruption Response",
    "demand_planning": "Demand Planning",
    "inventory_optimization": "Inventory Optimization",
    "supply_planning": "Supply / S&OP Planning",
    "procurement_sourcing": "Procurement & Sourcing",
    "logistics_transportation": "Logistics & Transportation",
    "production_planning": "Production / Manufacturing Planning",
    "spares_planning_ibp": "Spares Planning (IBP)",
    "rma_execution": "RMA Execution",
}
# which canonical tables each use case reads (dims are shared reference data)
USE_CASE_TABLES = {
    "disruption_response": ["dim_product","dim_location","dim_supplier","fct_sales","fct_inventory","fct_shipment","fct_po","feat_forecast","feat_supplier_risk"],
    "demand_planning": ["pl_demand_plan","fct_sales","feat_forecast"],
    "inventory_optimization": ["fct_inventory","pl_inv_health"],
    "supply_planning": ["pl_supply_plan","pl_demand_plan"],
    "procurement_sourcing": ["pl_procurement"],
    "logistics_transportation": ["pl_logistics"],
    "production_planning": ["pl_production","pl_supply_plan","fct_inventory"],
    "spares_planning_ibp": ["ib_install_base","ib_inv_target","feat_failure","feat_spares_forecast","feat_returns","s4_refurb","fct_inventory"],
    "rma_execution": ["rma_case","s4_refurb"],
}
# reverse map: table -> [use case display names]
table_ucs = {}
for uc, tbls in USE_CASE_TABLES.items():
    for t in tbls:
        table_ucs.setdefault(t, []).append(USE_CASE_NAMES[uc])

# 1) per-table data CSVs (header = native columns, then sample rows)
n_data = 0
for tbl, cols in b.CANON_TABLES.items():
    with open(os.path.join(OUT, tbl + ".csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow([c[0] for c in cols])
        for row in b.SEED.get(tbl, []):
            w.writerow(list(row))
    n_data += 1

# 2) data dictionary (the data STRUCTURES) — one row per column
with open(os.path.join(OUT, "_DATA_DICTIONARY.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["use_case(s)", "table", "column", "data_type", "canonical_concept", "sample_rows"])
    for tbl, cols in b.CANON_TABLES.items():
        ucs = "; ".join(table_ucs.get(tbl, ["shared reference"]))
        nrows = len(b.SEED.get(tbl, []))
        for (col, typ, concept) in cols:
            w.writerow([ucs, tbl, col, typ, concept, nrows])

# 3) use-case -> tables map
with open(os.path.join(OUT, "_USE_CASE_TABLES.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["use_case_key", "use_case", "tables"])
    for uc, tbls in USE_CASE_TABLES.items():
        w.writerow([uc, USE_CASE_NAMES[uc], "; ".join(tbls)])

print(f"wrote {n_data} table CSVs + _DATA_DICTIONARY.csv + _USE_CASE_TABLES.csv to ./data/")
print(f"tables: {n_data} · columns: {sum(len(c) for c in b.CANON_TABLES.values())} · use cases: {len(USE_CASE_TABLES)}")
