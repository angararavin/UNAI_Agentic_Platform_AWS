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
SimulatedCatalog — realistic, messy sample catalogs per platform so the whole
onboarding flow (introspect → auto-map → review) runs OFFLINE, with no live
credentials. Swap for the real SnowflakeConnector / DatabricksConnector / SAP
connector and the rest of the pipeline is unchanged.
"""
from __future__ import annotations
from .base import CatalogConnector

# Each entry: table -> list of {name, dtype, comment, samples}
CATALOGS = {
    "snowflake": {  # governed gold marts (UPPER_CASE, well-described -> high auto-accept)
        "INV_GOLD": [
            {"name": "PRODUCT_KEY", "dtype": "VARCHAR", "comment": "product", "samples": ["FG-1001"]},
            {"name": "LOCATION_KEY", "dtype": "VARCHAR", "comment": "DC", "samples": ["DC-EAST"]},
            {"name": "ON_HAND_QTY", "dtype": "NUMBER", "comment": "stock on hand", "samples": [540]},
            {"name": "SAFETY_STOCK", "dtype": "NUMBER", "comment": "", "samples": [600]},
            {"name": "REORDER_PT", "dtype": "NUMBER", "comment": "reorder point", "samples": [900]},
            {"name": "UNIT_COST", "dtype": "FLOAT", "comment": "cost", "samples": [42.5]},
            {"name": "SUPPLIER_KEY", "dtype": "VARCHAR", "comment": "vendor", "samples": ["V-2207"]},
            {"name": "ZZ_AUDIT", "dtype": "VARCHAR", "comment": "internal", "samples": ["x"]},
        ],
        "FCST_GOLD": [
            {"name": "PRODUCT_KEY", "dtype": "VARCHAR", "comment": "product", "samples": ["FG-1001"]},
            {"name": "LOCATION_KEY", "dtype": "VARCHAR", "comment": "DC", "samples": ["DC-EAST"]},
            {"name": "FCST_QTY", "dtype": "NUMBER", "comment": "demand forecast", "samples": [1450]},
            {"name": "PERIOD", "dtype": "VARCHAR", "comment": "month", "samples": ["2026-06"]},
        ],
    },
    "databricks": {  # silver (lower_case, terser comments -> mix of auto + review)
        "inv_silver": [
            {"name": "prod_id", "dtype": "string", "comment": "", "samples": ["FG-1001"]},
            {"name": "wh", "dtype": "string", "comment": "warehouse", "samples": ["DC-WEST"]},
            {"name": "units_on_hand", "dtype": "int", "comment": "", "samples": [220]},
            {"name": "safety", "dtype": "int", "comment": "buffer", "samples": [300]},
            {"name": "cost_each", "dtype": "double", "comment": "", "samples": [96.0]},
            {"name": "vendor", "dtype": "string", "comment": "supplier", "samples": ["V-3310"]},
            {"name": "lt", "dtype": "int", "comment": "lead time days", "samples": [28]},
        ],
        "demand_silver": [
            {"name": "prod_id", "dtype": "string", "comment": "", "samples": ["FG-1003"]},
            {"name": "wh", "dtype": "string", "comment": "warehouse", "samples": ["DC-WEST"]},
            {"name": "yhat", "dtype": "double", "comment": "model forecast", "samples": [720]},
            {"name": "yr_mo", "dtype": "string", "comment": "period", "samples": ["2026-06"]},
        ],
    },
    "sap": {  # SAP CDS / DDIC native names (MATNR ... -> matched by the known-field index)
        "I_ProductStock": [
            {"name": "MATNR", "dtype": "CHAR", "comment": "Material", "samples": ["FG-1001"]},
            {"name": "WERKS", "dtype": "CHAR", "comment": "Plant", "samples": ["DC-EAST"]},
            {"name": "LABST", "dtype": "QUAN", "comment": "Unrestricted stock", "samples": [540]},
            {"name": "EISBE", "dtype": "QUAN", "comment": "Safety stock", "samples": [600]},
            {"name": "LIFNR", "dtype": "CHAR", "comment": "Vendor", "samples": ["V-2207"]},
            {"name": "STPRS", "dtype": "CURR", "comment": "Standard price", "samples": [42.5]},
            {"name": "ZZSCRAP", "dtype": "CHAR", "comment": "custom Z field", "samples": ["N"]},
        ],
    },
    "postgres": {
        "fct_inventory": [
            {"name": "sku_id", "dtype": "varchar", "comment": "", "samples": ["FG-1001"]},
            {"name": "dc_code", "dtype": "varchar", "comment": "", "samples": ["DC-EAST"]},
            {"name": "qty_on_hand", "dtype": "int", "comment": "", "samples": [540]},
            {"name": "safety_stock", "dtype": "int", "comment": "", "samples": [600]},
            {"name": "unit_cost", "dtype": "numeric", "comment": "", "samples": [42.5]},
            {"name": "vendor_id", "dtype": "varchar", "comment": "", "samples": ["V-2207"]},
        ],
    },
}


class SimulatedCatalog(CatalogConnector):
    def __init__(self, source: str):
        source = source.lower()
        if source not in CATALOGS:
            raise ValueError(f"source must be one of: {', '.join(CATALOGS)}")
        self.name = source
        self._cat = CATALOGS[source]

    def list_tables(self):
        return list(self._cat.keys())

    def get_schema(self, table):
        return [dict(c) for c in self._cat[table]]

    def query(self, table, filter=None):
        cols = self._cat[table]
        return [{c["name"]: (c["samples"][0] if c["samples"] else None) for c in cols}]

    def write(self, op, payload):
        return {"status": "GATED (simulated)", "op": op}
