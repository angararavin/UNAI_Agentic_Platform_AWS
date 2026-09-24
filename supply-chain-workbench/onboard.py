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
UNAI onboarding — connect a source, auto-induce the canonical ontology, and
write a versioned mapping registry. Runs offline against a simulated catalog;
point it at a real connector and the flow is identical.

    python onboard.py snowflake     # or databricks | sap | postgres
"""
import sys, os, json
from sa.connectors.simulated import SimulatedCatalog, CATALOGS
from sa.automap import auto_map


def onboard(source: str):
    conn = SimulatedCatalog(source)
    registry = {"source": source, "version": 1, "tables": {}}
    for t in conn.list_tables():
        registry["tables"][t] = auto_map(conn.get_schema(t))
    os.makedirs("mappings", exist_ok=True)
    path = os.path.join("mappings", f"registry_{source}.json")
    with open(path, "w") as f:
        json.dump(registry, f, indent=2, default=str)
    return registry, path


def main():
    source = sys.argv[1] if len(sys.argv) > 1 else "snowflake"
    if source not in CATALOGS:
        print("source must be one of:", ", ".join(CATALOGS)); return
    reg, path = onboard(source)
    print(f"\n=== UNAI onboarding · source: {source} ===")
    tot = acc = rev = 0
    for table, res in reg["tables"].items():
        s = res["summary"]
        tot += s["columns"]; acc += s["auto_accepted"]; rev += s["needs_review"]
        print(f"\n  {table}  —  {s['mapped']}/{s['columns']} mapped, "
              f"{s['auto_accepted']} auto-accepted, {s['needs_review']} to review")
        for m in res["mappings"]:
            mode = "auto " if m["auto_accepted"] else "REVIEW"
            print(f"     [{mode}] {m['column']:<16} -> {(m['concept'] or '—'):<16} {m['confidence']}")
    print(f"\n  TOTAL: {tot} columns · {acc} auto-accepted · {rev} to review")
    print(f"  Mapping registry written -> {path}")


if __name__ == "__main__":
    main()
