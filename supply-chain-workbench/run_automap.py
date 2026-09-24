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
"""Demo: point UNAI's Semantic Auto-Mapper at an UNKNOWN, messy source schema
(e.g. a Snowflake/Databricks table nobody has mapped) and watch it induce the
canonical ontology automatically.   Run:  python run_automap.py
"""
from sa.automap import auto_map

# A deliberately messy, never-before-seen schema (mixed naming conventions,
# as you'd get from a raw Snowflake/Databricks table or a Salesforce export).
UNKNOWN_SCHEMA = [
    {"name": "PROD_KEY",     "dtype": "string", "samples": ["FG-1001", "FG-1002"], "comment": "product identifier"},
    {"name": "WH",           "dtype": "string", "samples": ["DC-EAST", "DC-WEST"], "comment": "warehouse"},
    {"name": "UNITS_AVAIL",  "dtype": "int",    "samples": [540, 1180],            "comment": "stock available"},
    {"name": "SAFETY_STK",   "dtype": "int",    "samples": [600, 400],             "comment": ""},
    {"name": "VENDOR_NO",    "dtype": "string", "samples": ["V-2207"],             "comment": "supplier"},
    {"name": "UNIT_PRC",     "dtype": "decimal","samples": [42.5, 18.0],           "comment": "cost each"},
    {"name": "FCST",         "dtype": "int",    "samples": [1450, 380],            "comment": "demand forecast"},
    {"name": "YRMO",         "dtype": "string", "samples": ["2026-06"],            "comment": "period"},
    {"name": "ZZ_LEGACY_FLAG","dtype":"string", "samples": ["X", "X"],            "comment": "internal"},
]

res = auto_map(UNKNOWN_SCHEMA)
s = res["summary"]
print("\n=== UNAI Semantic Auto-Mapper — inducing canonical ontology from a raw schema ===")
print(f"columns {s['columns']} · mapped {s['mapped']} ({s['coverage_pct']}%) · "
      f"auto-accepted {s['auto_accepted']} ({s['auto_pct']}%) · needs review {s['needs_review']}\n")
print(f"{'SOURCE COLUMN':<16}{'-> CANONICAL':<18}{'CONF':<7}{'MODE':<14}RATIONALE")
for m in res["mappings"]:
    mode = "auto-accept" if m["auto_accepted"] else "HUMAN REVIEW"
    print(f"{m['column']:<16}{(m['concept'] or '—'):<18}{m['confidence']:<7}{mode:<14}{m['rationale']}")
print("\nLow-confidence rows go to a review queue; approved mappings persist to a "
      "versioned Mapping Registry and configure the Perception/Action layers — no hand-coding.")
