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
Connect UNAI to a REAL Databricks workspace and stand up the canonical-ontology
system of record.  Nothing here needs editing — it reads connection details from
the environment so your token never touches the code.

SET THESE FIRST (see "Where to get them" in DATABRICKS_CONNECT.md):
    export DATABRICKS_SERVER_HOSTNAME=dbc-1821402b-4150.cloud.databricks.com
    export DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/<your-warehouse-id>
    export DATABRICKS_TOKEN=dapi...                 # a personal access token
    export DATABRICKS_CATALOG=unai                  # optional (default: unai)
    export DATABRICKS_SCHEMA=supply_chain           # optional

THEN:
    python3 -m pip install "databricks-sql-connector>=3.0"   # macOS: add --break-system-packages if needed
    python connect_databricks.py test         # verify the connection
    python connect_databricks.py create       # create UC catalog/schema + tables + seed
    python connect_databricks.py introspect   # list tables + columns from Unity Catalog
    python connect_databricks.py automap      # auto-induce the canonical ontology
    python connect_databricks.py demo         # run UNAI (read-only) against Databricks
"""
import os, sys

HOST   = os.environ.get("DATABRICKS_SERVER_HOSTNAME", "")
HTTP   = os.environ.get("DATABRICKS_HTTP_PATH", "")
TOKEN  = os.environ.get("DATABRICKS_TOKEN", "")
# Default to a SCHEMA inside your EXISTING catalog (needs only CREATE SCHEMA, not
# CREATE CATALOG). Override with env if you have a dedicated catalog.
CATALOG = os.environ.get("DATABRICKS_CATALOG", "workspace")
SCHEMA  = os.environ.get("DATABRICKS_SCHEMA", "unai_supply_chain")
SQL_FILE = os.path.join(os.path.dirname(__file__), "databricks_setup.sql")


def _need_env():
    miss = [k for k, v in [("DATABRICKS_SERVER_HOSTNAME", HOST), ("DATABRICKS_HTTP_PATH", HTTP),
                           ("DATABRICKS_TOKEN", TOKEN)] if not v]
    if miss:
        print("Missing env vars:", ", ".join(miss), "\nSee the header of this file / DATABRICKS_CONNECT.md.")
        sys.exit(1)


def _connect():
    _need_env()
    try:
        from databricks import sql
    except ImportError:
        print(f'Databricks driver not installed for this Python:\n  {sys.executable}\n'
              f'Install it into THIS interpreter:\n'
              f'  {sys.executable} -m pip install "databricks-sql-connector>=3.0"\n'
              f'(macOS: add --break-system-packages if it reports an externally-managed environment)')
        sys.exit(1)
    return sql.connect(server_hostname=HOST, http_path=HTTP, access_token=TOKEN)


def cmd_test():
    con = _connect()
    with con.cursor() as cur:
        cur.execute("SELECT current_user(), current_catalog(), current_version().dbsql_version")
        row = cur.fetchone()
    print(f"✓ connected to {HOST}\n  user={row[0]}  catalog={row[1]}  dbsql={row[2]}")


def cmd_create():
    con = _connect()
    # disruption-flow tables + (if present) the spares & RMA canonical ontology
    files = [SQL_FILE]
    for extra in ("databricks_setup_spares_rma.sql", "databricks_setup_planning.sql"):
        fp = os.path.join(os.path.dirname(__file__), extra)
        if os.path.exists(fp):
            files.append(fp)
    total_done = total_stmts = 0
    with con.cursor() as cur:
        for fpath in files:
            raw = open(fpath).read()
            raw = raw.replace("CREATE CATALOG IF NOT EXISTS unai", f"CREATE CATALOG IF NOT EXISTS {CATALOG}")
            raw = raw.replace("unai.supply_chain", f"{CATALOG}.{SCHEMA}")
            body = "\n".join(l for l in raw.splitlines() if not l.strip().startswith("--"))
            stmts = [s.strip() for s in body.split(";") if s.strip()]
            total_stmts += len(stmts)
            print(f"\n— {os.path.basename(fpath)} ({len(stmts)} statements) —")
            for i, s in enumerate(stmts, 1):
                head = s.splitlines()[0][:70]
                tolerant = s.upper().startswith(("CREATE CATALOG", "CREATE SCHEMA"))
                try:
                    cur.execute(s); total_done += 1
                    print(f"  [{i}/{len(stmts)}] {head}")
                except Exception as e:
                    if tolerant:
                        print(f"  [{i}/{len(stmts)}] skip ({head}) — {str(e).splitlines()[0][:80]}")
                    else:
                        print(f"  ✗ failed: {head}\n    {e}")
                        raise
    print(f"\n✓ created + seeded {CATALOG}.{SCHEMA}  ({total_done}/{total_stmts} statements across {len(files)} file(s))")
    print("  Disruption + Spares (IBP) + RMA canonical tables are provisioned. Run `introspect` / `automap` to induce the ontology.")
    print("  (if a CREATE CATALOG line was skipped, the schema was created inside your existing catalog — that's expected.)")


def _connector():
    from sa.connectors.databricks import DatabricksConnector
    return DatabricksConnector(HOST, HTTP, TOKEN, CATALOG, SCHEMA)


def cmd_introspect():
    _need_env(); conn = _connector()
    print(f"=== Unity Catalog: {CATALOG}.{SCHEMA} ===")
    for t in conn.list_tables():
        cols = conn.get_schema(t)
        print(f"\n  {t}  ({len(cols)} columns)")
        for c in cols:
            print(f"     {c['name']:<16} {c['dtype']:<10} {c.get('comment','')}")


def cmd_automap():
    _need_env()
    from sa.automap import auto_map
    conn = _connector()
    print(f"=== Auto-inducing canonical ontology from {CATALOG}.{SCHEMA} ===")
    tot = acc = mapped = 0
    todo = []   # fields needing a human: (table.column, concept-or-None, confidence)
    graph = {"source": "databricks", "catalog": CATALOG, "schema": SCHEMA,
             "tables": [], "concepts": [], "edges": []}   # induced-from-warehouse knowledge graph
    _concepts = set()
    for t in conn.list_tables():
        res = auto_map(conn.get_schema(t)); s = res["summary"]
        tot += s["columns"]; acc += s["auto_accepted"]; mapped += s["mapped"]
        graph["tables"].append({"name": t, "columns": s["columns"], "mapped": s["mapped"]})
        print(f"\n  {t}: {s['mapped']}/{s['columns']} mapped · {s['auto_accepted']} auto · {s['needs_review']} review")
        for m in res["mappings"]:
            print(f"     [{'auto ' if m['auto_accepted'] else 'REVIEW'}] {m['column']:<16} -> {(m['concept'] or '—'):<16} {m['confidence']}")
            if m["concept"]:
                _concepts.add(m["concept"])
                graph["edges"].append({"table": t, "column": m["column"], "concept": m["concept"],
                                       "confidence": m["confidence"], "auto": bool(m["auto_accepted"])})
            if not m["auto_accepted"]:
                todo.append((f"{t}.{m['column']}", m["concept"], m["confidence"]))
    graph["concepts"] = sorted(_concepts)
    review = mapped - acc
    unmapped = tot - mapped
    cov = round(100 * mapped / tot) if tot else 0
    autorate = round(100 * acc / tot) if tot else 0
    grade = "Excellent" if (cov >= 95 and autorate >= 80) else "Good" if cov >= 85 else "Fair" if cov >= 70 else "Needs work"
    print(f"\n=== MAPPING QUALITY [{grade}] ===")
    print(f"  Coverage:      {cov}%  ({mapped}/{tot} fields mapped to a canonical concept)")
    print(f"  Auto-accepted: {autorate}%  ({acc} fields, confidence >= 85%)")
    print(f"  Needs review:  {review} fields (mapped, confirm the concept)")
    print(f"  Unmapped:      {unmapped} fields (no confident match)")
    if todo:
        print("\n  RECOMMENDATIONS — manual mapping:")
        for name, concept, conf in todo:
            if concept:
                print(f"     • {name:<28} confirm -> {concept} ({conf}); correct if wrong")
            else:
                print(f"     • {name:<28} no match — assign a concept or add a synonym to the ontology")
    else:
        print("\n  ✓ Every field mapped with high confidence — no manual action needed.")
    # machine-readable knowledge graph induced from the warehouse (for the app UI)
    import json as _json
    graph["summary"] = {"columns": tot, "mapped": mapped, "auto_accepted": acc,
                        "coverage": cov, "autorate": autorate, "grade": grade}
    print("===UNAI_ONTOLOGY===" + _json.dumps(graph, default=str))


def cmd_demo():
    _need_env()
    from sa.adapters import DatabricksAdapter
    from sa.orchestrator import UNAI
    systems = {"DATABRICKS": DatabricksAdapter(HOST, HTTP, TOKEN, CATALOG, SCHEMA)}
    out = UNAI().run("mesh", systems, backend="DATABRICKS")     # writes are gated by default
    c, ob = out["compression"], out["observability"]
    print(f"\n=== UNAI on Databricks · {out['useCase']} ===")
    print("Agents:", c["ratio"], "| layer impls:", c["gen1LayerImpls"], "->", c["gen2LayerImpls"],
          f"({c['complexityReductionPct']}% less)")
    print("Decisions:", ob["decisions"], "| autonomy:", str(ob["autonomyRatePct"]) + "%",
          "| system calls:", ob["systemCalls"], "| ontology translations:", ob["ontologyTranslations"])
    # Machine-readable payload for the Studio UI: feeds the live, Databricks-MEASURED
    # numbers into the Observability / Gen-1-vs-UNAI / ROI dashboards. Must be the LAST line.
    import json as _json
    print("===UNAI_JSON===" + _json.dumps(out["render"], default=str))


# Use cases whose canonical tables are provisioned in this Databricks workspace and
# can therefore run LIVE. Others fall back to the in-app sample engine (UI handles it).
LIVE_SUPPORTED = {"disruption_response", "spares_planning_ibp", "rma_execution", "mesh",
                  "demand_planning", "inventory_optimization", "supply_planning",
                  "procurement_sourcing", "logistics_transportation", "production_planning"}


def cmd_run(use_case="disruption_response"):
    """Unified entry point: run the SELECTED use case live against Databricks.
    Same use-case key the JS engine uses, so the dropdown drives both paths."""
    _need_env()
    if use_case not in LIVE_SUPPORTED:
        # Signal the UI to run this use case on sample data instead.
        print(f"Live tables for '{use_case}' are not provisioned in this workspace.")
        print("===UNAI_UNSUPPORTED===" + use_case)
        return
    from sa.adapters import DatabricksAdapter
    from sa.orchestrator import UNAI
    systems = {"DATABRICKS": DatabricksAdapter(HOST, HTTP, TOKEN, CATALOG, SCHEMA)}
    out = UNAI().run(use_case, systems, backend="DATABRICKS")     # writes gated
    c, ob = out["compression"], out["observability"]
    print(f"\n=== UNAI on Databricks · {out['useCase']} ===")
    print("Agents:", c["ratio"], "| layer impls:", c["gen1LayerImpls"], "->", c["gen2LayerImpls"],
          f"({c['complexityReductionPct']}% less)")
    print("Decisions:", ob["decisions"], "| autonomy:", str(ob["autonomyRatePct"]) + "%",
          "| system calls:", ob["systemCalls"], "| ontology translations:", ob["ontologyTranslations"])
    import json as _json
    print("===UNAI_JSON===" + _json.dumps(out["render"], default=str))


def _guard_select(sql):
    """Read-only guard: allow a SINGLE SELECT/WITH, block DDL/DML, force a LIMIT."""
    s = (sql or "").strip().rstrip(";").strip()
    low = " " + s.lower().replace("\n", " ") + " "
    if not (s.lower().startswith("select") or s.lower().startswith("with")):
        raise ValueError("read-only: only SELECT / WITH queries are allowed")
    if ";" in s:
        raise ValueError("read-only: only a single statement is allowed")
    for b in [" insert ", " update ", " delete ", " merge ", " drop ", " alter ",
              " create ", " truncate ", " grant ", " revoke ", " call ", " copy "]:
        if b in low:
            raise ValueError("read-only: keyword not allowed: " + b.strip())
    if " limit " not in low and "fetch first" not in low:
        s += " LIMIT 200"
    return s


def cmd_query():
    import json as _json
    _need_env()
    sql = _guard_select(sys.argv[2] if len(sys.argv) > 2 else "")
    con = _connect(); cur = con.cursor(); cur.execute(sql)
    cols = [d[0] for d in cur.description]
    rows = [list(r) for r in cur.fetchmany(200)]
    print(f"{len(rows)} row(s) from Databricks")
    print("===UNAI_ROWS===" + _json.dumps({"columns": cols, "rows": rows, "sql": sql}, default=str))


def cmd_schema():
    import json as _json
    conn = _connector(); out = {}
    for t in conn.list_tables():
        out[t] = [c["name"] for c in conn.get_schema(t)]
    print("===UNAI_SCHEMA===" + _json.dumps({"catalog": CATALOG, "schema": SCHEMA, "tables": out}, default=str))


CMDS = {"test": cmd_test, "create": cmd_create, "introspect": cmd_introspect,
        "automap": cmd_automap, "demo": cmd_demo, "run": cmd_run,
        "query": cmd_query, "schema": cmd_schema}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "test"
    if cmd not in CMDS:
        print("usage: python connect_databricks.py [test|create|introspect|automap|demo|run <usecase>|query <sql>|schema]"); sys.exit(1)
    if cmd == "run":
        cmd_run(sys.argv[2] if len(sys.argv) > 2 else "disruption_response")
    else:
        CMDS[cmd]()
