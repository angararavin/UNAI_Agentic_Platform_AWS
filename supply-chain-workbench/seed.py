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
"""Create the schema and load a small, realistic sample into a DuckDB database.
Run standalone (`python seed.py`) or import build_duckdb() from the demo."""
import os
import duckdb

DDL = os.path.join(os.path.dirname(__file__), "datamodel", "ddl.sql")

PRODUCTS = [("FG-1001", "Smart Thermostat", "Electronics"),
            ("FG-1002", "Door Sensor", "Electronics"),
            ("FG-1003", "Water Pump", "Industrial")]
LOCATIONS = [("DC-EAST", "US-East", "DC"), ("DC-WEST", "US-West", "DC")]
SUPPLIERS = [("V-2207", "Acme APAC", "APAC"), ("V-3310", "EuroParts", "EU"), ("V-9001", "Backup Co", "US")]
SALES = [("FG-1001", "DC-EAST", "2026-05", 1280), ("FG-1002", "DC-EAST", "2026-05", 410),
         ("FG-1003", "DC-WEST", "2026-05", 600)]
INVENTORY = [  # sku, dc, on_hand, in_transit, safety, reorder, lead, unit_cost, vendor
    ("FG-1001", "DC-EAST", 540, 120, 600, 900, 21, 42.5, "V-2207"),
    ("FG-1002", "DC-EAST", 1180, 0, 400, 700, 14, 18.0, "V-2207"),
    ("FG-1003", "DC-WEST", 220, 60, 300, 500, 28, 96.0, "V-3310")]
FORECAST = [("FG-1001", "DC-EAST", "2026-06", 1450), ("FG-1002", "DC-EAST", "2026-06", 380),
            ("FG-1003", "DC-WEST", "2026-06", 900)]   # high-value SKU → trips the $50K approval gate
RISK = [("V-2207", 0.78, True, "APAC", "Port strike — APAC lanes"),
        ("V-3310", 0.20, False, "EU", "Nominal"),
        ("V-9001", 0.10, False, "US", "Backup, nominal")]
SHIPMENTS = [  # id, sku, dc, carrier, status, eta_days, planned_eta, in_transit
    ("SHP-501", "FG-1001", "DC-EAST", "Maersk", "CUSTOMS", 12, 7, 120),
    ("SHP-502", "FG-1003", "DC-WEST", "DHL", "IN_TRANSIT", 5, 6, 60),
    ("SHP-503", "FG-1002", "DC-EAST", "FedEx", "IN_TRANSIT", 9, 4, 200)]


def build_duckdb(path: str = ":memory:") -> "duckdb.DuckDBPyConnection":
    con = duckdb.connect(path)
    with open(DDL) as f:
        con.execute(f.read())
    con.executemany("INSERT INTO dim_product VALUES (?,?,?)", PRODUCTS)
    con.executemany("INSERT INTO dim_location VALUES (?,?,?)", LOCATIONS)
    con.executemany("INSERT INTO dim_supplier VALUES (?,?,?)", SUPPLIERS)
    con.executemany("INSERT INTO fct_sales VALUES (?,?,?,?)", SALES)
    con.executemany("INSERT INTO fct_inventory VALUES (?,?,?,?,?,?,?,?,?)", INVENTORY)
    con.executemany("INSERT INTO feat_forecast VALUES (?,?,?,?)", FORECAST)
    con.executemany("INSERT INTO feat_supplier_risk VALUES (?,?,?,?,?)", RISK)
    con.executemany("INSERT INTO fct_shipment VALUES (?,?,?,?,?,?,?,?)", SHIPMENTS)
    return con


if __name__ == "__main__":
    con = build_duckdb("supply_chain.duckdb")
    n = con.execute("SELECT COUNT(*) FROM fct_inventory").fetchone()[0]
    print(f"Seeded supply_chain.duckdb — {n} inventory rows, "
          f"{con.execute('SELECT COUNT(*) FROM feat_forecast').fetchone()[0]} forecast rows.")
