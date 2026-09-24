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
run_agent.py — run an exported Agent Foundry manifest on the UNAI runtime.

Cloud-neutral by design: this is plain Python + the `sa/` shared-layer runtime.
Containerize it once (see the exported Dockerfile) and the SAME image runs on
AWS (ECS/EKS), Azure (AKS/ACI/Container Apps), GCP (Cloud Run/GKE) or on-prem
Kubernetes — no code changes, only environment configuration.

    python run_agent.py manifest.json

Backend + model are chosen entirely from environment variables (12-factor):
    UNAI_BACKEND=DUCKDB|DATABRICKS         (default DUCKDB demo seed)
    DATABRICKS_SERVER_HOSTNAME / DATABRICKS_HTTP_PATH / DATABRICKS_TOKEN
    DATABRICKS_CATALOG / DATABRICKS_SCHEMA
    GATEWAY_BASE_URL / GATEWAY_API_KEY / GATEWAY_MODEL  (optional; any provider)
"""
import json
import os
import sys
from sa.orchestrator import UNAI


def build_systems():
    backend = os.environ.get("UNAI_BACKEND", "DUCKDB").upper()
    if backend == "DATABRICKS":
        from sa.adapters import DatabricksAdapter
        sys_map = {"DATABRICKS": DatabricksAdapter(
            os.environ["DATABRICKS_SERVER_HOSTNAME"], os.environ["DATABRICKS_HTTP_PATH"],
            os.environ["DATABRICKS_TOKEN"], os.environ.get("DATABRICKS_CATALOG", "workspace"),
            os.environ.get("DATABRICKS_SCHEMA", "unai_supply_chain"))}
        return sys_map, "DATABRICKS"
    # default: local DuckDB with the bundled demo seed (no external system needed)
    from seed import build_duckdb
    from sa.adapters import DuckDBAdapter
    return {"DUCKDB": DuckDBAdapter(build_duckdb(":memory:"))}, "DUCKDB"


def manifest_to_goal(m):
    return {
        "name": m.get("name", "UNAI agent"),
        "plan": [{"capability": c["id"], "agentEquiv": c.get("label", c["id"]),
                  "systems": c.get("systems", [])} for c in m.get("capabilities", [])],
    }


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "manifest.json"
    with open(path) as f:
        m = json.load(f)
    systems, backend = build_systems()
    out = UNAI(m.get("name", "UNAI")).run(manifest_to_goal(m), systems, backend=backend)
    c, ob = out["compression"], out["observability"]
    print(f"\n=== {m.get('name','UNAI agent')} — ran on backend {backend} ===")
    print("Agents:", c["ratio"], "| layer impls:", c["gen1LayerImpls"], "->", c["gen2LayerImpls"],
          f"({c['complexityReductionPct']}% less)")
    print("Decisions:", ob["decisions"], "| autonomy:", str(ob["autonomyRatePct"]) + "%",
          "| actions:", ob["actionsExecuted"], "| ontology translations:", ob["ontologyTranslations"])
    # emit the full observability payload for logs / dashboards
    print("\n" + json.dumps(out["render"]["observability"], default=str))


if __name__ == "__main__":
    main()
