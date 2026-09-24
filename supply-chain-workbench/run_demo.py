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
Runnable end-to-end demo on a FREE engine (DuckDB) — no Snowflake/Databricks needed.

    pip install duckdb
    python run_demo.py            # runs the full 4-use-case mesh
    python run_demo.py demand_forecast   # or any single use case

Swap the backend by changing one line (see `systems=` below): a PostgresAdapter,
SnowflakeAdapter, or DatabricksAdapter with the SAME interface — the agent code is
unchanged. That substitutability is the whole point.
"""
import sys
from seed import build_duckdb
from sa.adapters import DuckDBAdapter
from sa.orchestrator import UNAI, USE_CASES

def main():
    use_case = sys.argv[1] if len(sys.argv) > 1 else "mesh"
    if use_case not in USE_CASES:
        print("use case must be one of:", ", ".join(USE_CASES)); return

    con = build_duckdb(":memory:")
    systems = {"DUCKDB": DuckDBAdapter(con)}          # <-- swap for Postgres/Snowflake/Databricks here
    out = UNAI().run(use_case, systems, backend="DUCKDB")

    c, ob = out["compression"], out["observability"]
    print(f"\n=== {out['useCase']}  ·  agent: {out['agent']} ===")
    print("Capabilities run        :", ", ".join(out["capabilities"]))
    print("Gen-1 specialist agents :", c["gen1Agents"], "->", c["unaisUsed"],
          f"UNAI(s)  ({c['ratio']})  [{', '.join(c['unais'])}]")
    print("Layer implementations   :", c["gen1LayerImpls"], "->", c["gen2LayerImpls"],
          f"({c['complexityReductionPct']}% reduction)")
    print("Decisions               :", ob["decisions"], "| autonomous:", ob["autonomousDecisions"],
          "| human-gated:", ob["humanGatedDecisions"], "| autonomy:", str(ob["autonomyRatePct"]) + "%")
    print("System calls            :", ob["systemCalls"], "| ontology translations:", ob["ontologyTranslations"])
    print("Context switches/re-maps:", ob["contextSwitches"], "/", ob["schemaRemaps"],
          "| actions:", ob["actionsExecuted"], "| total layer ms:", ob["totalMs"])

    pos = out["results"].get("inventory_optimize", {}).get("purchaseOrders", [])
    if pos:
        print("\n-- Replenishment decisions --")
        for p in pos:
            print(f"  {p['sku']} @ {p['location']}  qty {p['qty']}  ${p['value']:,}  "
                  f"conf {p['confidence']}  -> {'AUTO ' + p['po'] if p['autonomous'] else 'HUMAN APPROVAL'}")
    exc = out["results"].get("logistics_eta", {}).get("exceptions", [])
    if exc:
        print("\n-- Logistics ETA exceptions --")
        for e in exc:
            print(f"  {e['shipment_id']} ({e['carrier']})  +{e['slip_days']}d late  conf {e['confidence']}")

if __name__ == "__main__":
    main()
