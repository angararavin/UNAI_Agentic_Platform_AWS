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
Connect UNAI to a REAL Snowflake account and induce the canonical ontology.
Nothing here needs editing — connection details come from the environment, so
your password/token never touches the code.

SET THESE FIRST (see the Connections tab for the exact env):
    export SNOWFLAKE_ACCOUNT=xy12345.us-east-1
    export SNOWFLAKE_USER=UNAI_SVC
    export SNOWFLAKE_PASSWORD=...              # or SNOWFLAKE_TOKEN (key-pair/SSO)
    export SNOWFLAKE_WAREHOUSE=UNAI_WH
    export SNOWFLAKE_DATABASE=UNAI            # optional (default UNAI)
    export SNOWFLAKE_SCHEMA=SUPPLY_CHAIN      # optional
    export SNOWFLAKE_ROLE=UNAI_READONLY       # optional

THEN:
    pip install snowflake-connector-python
    python connect_snowflake.py test          # verify the connection
    python connect_snowflake.py introspect    # list tables + columns
    python connect_snowflake.py automap        # auto-induce the canonical ontology
"""
import os
import sys

ACCOUNT = os.environ.get("SNOWFLAKE_ACCOUNT", "")
USER = os.environ.get("SNOWFLAKE_USER", "")
SECRET = os.environ.get("SNOWFLAKE_PASSWORD", "") or os.environ.get("SNOWFLAKE_TOKEN", "")
WAREHOUSE = os.environ.get("SNOWFLAKE_WAREHOUSE", "")
DATABASE = os.environ.get("SNOWFLAKE_DATABASE", "UNAI")
SCHEMA = os.environ.get("SNOWFLAKE_SCHEMA", "SUPPLY_CHAIN")
ROLE = os.environ.get("SNOWFLAKE_ROLE", "")


def _need_env():
    pk = os.environ.get("SNOWFLAKE_PRIVATE_KEY_PATH", "")
    req = [("SNOWFLAKE_ACCOUNT", ACCOUNT), ("SNOWFLAKE_USER", USER)]
    if not pk:   # key-pair auth doesn't need a password
        req.append(("SNOWFLAKE_PASSWORD/TOKEN", SECRET))
    miss = [k for k, v in req if not v]
    if miss:
        print("Missing env vars:", ", ".join(miss), "\nSee the Connections tab / this file's header.")
        sys.exit(1)


def _auth_kw():
    """Shared auth kwargs for every Snowflake connection (direct or via the
    catalog connector): key-pair (no MFA) if a private key is configured, else
    password with optional MFA passcode / cached-token. account+user always set."""
    PK_PATH = os.environ.get("SNOWFLAKE_PRIVATE_KEY_PATH", "")
    PK_PASS = os.environ.get("SNOWFLAKE_PRIVATE_KEY_PASSPHRASE", "")
    PASSCODE = os.environ.get("SNOWFLAKE_PASSCODE", "")            # a current 6-digit TOTP
    AUTHN = os.environ.get("SNOWFLAKE_AUTHENTICATOR", "")          # e.g. username_password_mfa
    kw = dict(account=ACCOUNT, user=USER)
    if PK_PATH:
        from cryptography.hazmat.primitives import serialization
        with open(os.path.expanduser(PK_PATH), "rb") as f:
            pkey = serialization.load_pem_private_key(f.read(), password=(PK_PASS.encode() if PK_PASS else None))
        kw["private_key"] = pkey.private_bytes(encoding=serialization.Encoding.DER,
            format=serialization.PrivateFormat.PKCS8, encryption_algorithm=serialization.NoEncryption())
    else:
        kw["password"] = SECRET
        if PASSCODE: kw["passcode"] = PASSCODE
        if AUTHN:                                                 # e.g. username_password_mfa → caches MFA token
            kw["authenticator"] = AUTHN
            kw["client_request_mfa_token"] = True
    return kw


def _connect():
    _need_env()
    try:
        import snowflake.connector
    except ImportError:
        print(f'Snowflake driver not installed for this Python:\n  {sys.executable}\n'
              f'Install it into THIS interpreter:\n'
              f'  {sys.executable} -m pip install snowflake-connector-python\n'
              f'(macOS: add --break-system-packages if it reports an externally-managed environment)')
        sys.exit(1)
    kw = dict(_auth_kw(), database=DATABASE, schema=SCHEMA)
    if WAREHOUSE: kw["warehouse"] = WAREHOUSE
    if ROLE: kw["role"] = ROLE
    return snowflake.connector.connect(**kw)


def cmd_test():
    con = _connect()
    cur = con.cursor()
    cur.execute("SELECT current_user(), current_account(), current_warehouse(), current_version()")
    row = cur.fetchone()
    print(f"connected to Snowflake account={row[1]}\n  user={row[0]}  warehouse={row[2]}  version={row[3]}")
    print(f"  database={DATABASE}  schema={SCHEMA}")


def _connector():
    _need_env()
    from sa.connectors.snowflake import SnowflakeConnector
    kw = _auth_kw()   # same key-pair / password logic as _connect (so introspect + automap work under MFA)
    if WAREHOUSE: kw["warehouse"] = WAREHOUSE
    if ROLE: kw["role"] = ROLE
    return SnowflakeConnector(DATABASE, SCHEMA, **kw)


def cmd_introspect():
    conn = _connector()
    print(f"=== Snowflake: {DATABASE}.{SCHEMA} ===")
    for t in conn.list_tables():
        cols = conn.get_schema(t)
        print(f"\n  {t}  ({len(cols)} columns)")
        for c in cols:
            print(f"     {c['name']:<18} {c['dtype']:<12} {c.get('comment','')}")


def cmd_automap():
    from sa.automap import auto_map
    conn = _connector()
    print(f"=== Auto-inducing canonical ontology from {DATABASE}.{SCHEMA} ===")
    tot = acc = mapped = 0
    todo = []
    graph = {"source": "snowflake", "catalog": DATABASE, "schema": SCHEMA,
             "tables": [], "concepts": [], "edges": []}
    _concepts = set()
    for t in conn.list_tables():
        res = auto_map(conn.get_schema(t)); s = res["summary"]
        tot += s["columns"]; acc += s["auto_accepted"]; mapped += s["mapped"]
        graph["tables"].append({"name": t, "columns": s["columns"], "mapped": s["mapped"]})
        print(f"\n  {t}: {s['mapped']}/{s['columns']} mapped · {s['auto_accepted']} auto · {s['needs_review']} review")
        for m in res["mappings"]:
            print(f"     [{'auto ' if m['auto_accepted'] else 'REVIEW'}] {m['column']:<18} -> {(m['concept'] or '-'):<16} {m['confidence']}")
            if m["concept"]:
                _concepts.add(m["concept"])
                graph["edges"].append({"table": t, "column": m["column"], "concept": m["concept"],
                                       "confidence": m["confidence"], "auto": bool(m["auto_accepted"])})
            if not m["auto_accepted"]:
                todo.append((f"{t}.{m['column']}", m["concept"], m["confidence"]))
    cov = round(100 * mapped / tot) if tot else 0
    autorate = round(100 * acc / tot) if tot else 0
    grade = "Excellent" if (cov >= 95 and autorate >= 80) else "Good" if cov >= 85 else "Fair" if cov >= 70 else "Needs work"
    print(f"\n=== MAPPING QUALITY ===\n  Coverage: {cov}%  ({mapped}/{tot})  ·  auto {acc}  ·  review/unmapped {tot-acc}")
    for name, concept, conf in todo:
        print(f"     • {name:<28} {'confirm -> '+concept if concept else 'no match — map manually'}")
    import json as _json
    graph["concepts"] = sorted(_concepts)
    graph["summary"] = {"columns": tot, "mapped": mapped, "auto_accepted": acc,
                        "coverage": cov, "autorate": autorate, "grade": grade}
    print("===UNAI_ONTOLOGY===" + _json.dumps(graph, default=str))


# canonical concept -> (native column, SNOWFLAKE type) for ALL NINE use cases.
CANON_TABLES = {
    "DIM_PRODUCT": [("SKU","STRING","sku"),("PRODUCT_NAME","STRING","product_name"),("CATEGORY","STRING","category")],
    "FCT_INVENTORY": [("SKU","STRING","sku"),("DC","STRING","location"),("ON_HAND","NUMBER","on_hand_qty"),
        ("SAFETY_STOCK","NUMBER","safety_stock"),("REORDER_POINT","NUMBER","reorder_point"),
        ("LEAD_TIME","NUMBER","lead_time_days"),("UNIT_COST","FLOAT","unit_cost"),("VENDOR","STRING","supplier")],
    "FEAT_FORECAST": [("SKU","STRING","sku"),("DC","STRING","location"),("PERIOD","STRING","period"),("YHAT","NUMBER","forecast_qty")],
    "FEAT_SUPPLIER_RISK": [("VENDOR","STRING","supplier"),("RISK_SCORE","FLOAT","supplier_risk"),("DISRUPTED","BOOLEAN","disruption_flag"),("REGION","STRING","region")],
    "RMA_CASE": [("RMA_ID","STRING","rma_id"),("SKU","STRING","sku"),("STATUS","STRING","rma_status"),
        ("WARRANTY","STRING","warranty_status"),("CLAIM_VALUE","FLOAT","claim_value"),("OEM","STRING","supplier")],
    "FEAT_DEMAND_PLAN": [("SKU","STRING","sku"),("DC","STRING","location"),("CONSENSUS","NUMBER","consensus_demand"),("PROMO_UPLIFT","FLOAT","promo_uplift"),("FCST_ACCURACY","FLOAT","forecast_accuracy")],
    "FEAT_INV_HEALTH": [("SKU","STRING","sku"),("DC","STRING","location"),("INV_TURNS","FLOAT","inv_turns"),("EXCESS","NUMBER","excess_qty")],
    "FEAT_SUPPLY_PLAN": [("SKU","STRING","sku"),("DC","STRING","location"),("CAPACITY","NUMBER","capacity_qty"),("MPS","NUMBER","mps_qty"),("ALLOCATION","NUMBER","allocation_qty")],
    "FEAT_PROCUREMENT": [("SKU","STRING","sku"),("VENDOR","STRING","supplier"),("SPEND","FLOAT","spend_amount"),("SCORE","FLOAT","supplier_score")],
    "FEAT_LOGISTICS": [("SKU","STRING","sku"),("CARRIER","STRING","carrier"),("TRANSIT_DAYS","NUMBER","transit_days"),("FREIGHT_COST","FLOAT","freight_cost"),("OTIF","FLOAT","otif")],
    "FEAT_PRODUCTION": [("SKU","STRING","sku"),("DC","STRING","location"),("WORK_ORDER","STRING","work_order"),("RUN_RATE","NUMBER","run_rate"),("OEE","FLOAT","oee")],
    "FEAT_SPARES": [("SKU","STRING","sku"),("DC","STRING","location"),("INSTALL_BASE","NUMBER","install_base_qty"),("FAILURE_RATE","FLOAT","failure_rate"),("RETURN_PROB","FLOAT","return_prob"),("YIELD_RATE","FLOAT","yield_rate")],
}


def cmd_publish():
    """Create the canonical tables (column COMMENTs carry the ontology) + a
    CANONICAL_ONTOLOGY registry, for all nine use cases. Idempotent."""
    con = _connect(); cur = con.cursor()
    cur.execute(f"CREATE DATABASE IF NOT EXISTS {DATABASE}")
    cur.execute(f"CREATE SCHEMA IF NOT EXISTS {DATABASE}.{SCHEMA}")
    reg = []
    for tbl, cols in CANON_TABLES.items():
        coldefs = ", ".join(f"{n} {t} COMMENT 'canonical: {concept}'" for n, t, concept in cols)
        cur.execute(f"CREATE OR REPLACE TABLE {DATABASE}.{SCHEMA}.{tbl} ({coldefs}) "
                    f"COMMENT='UNAI canonical table — column comments carry the ontology'")
        print(f"  ✓ {tbl} ({len(cols)} cols)")
        for n, t, concept in cols:
            reg.append((concept, tbl, n))
    cur.execute(f"CREATE OR REPLACE TABLE {DATABASE}.{SCHEMA}.CANONICAL_ONTOLOGY "
                f"(CONCEPT STRING, SOURCE_TABLE STRING, NATIVE_FIELD STRING) COMMENT='UNAI canonical ontology registry'")
        # register the concept map
    cur.executemany(f"INSERT INTO {DATABASE}.{SCHEMA}.CANONICAL_ONTOLOGY (CONCEPT, SOURCE_TABLE, NATIVE_FIELD) VALUES (%s,%s,%s)", reg)
    print(f"\n✓ published {len(CANON_TABLES)} canonical tables + CANONICAL_ONTOLOGY ({len(reg)} mappings) to {DATABASE}.{SCHEMA}")
    print("  Run `automap` to induce the ontology back from the column comments.")


def cmd_run(use_case="disruption_response"):
    """Verify the LIVE Snowflake connection + report the provisioned canonical
    model. The app then renders full UNAI metrics on the canonical model."""
    con = _connect(); cur = con.cursor()
    cur.execute("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=%s", (SCHEMA,))
    ntab = cur.fetchone()[0]
    reg = 0
    try:
        cur.execute(f"SELECT COUNT(*) FROM {DATABASE}.{SCHEMA}.CANONICAL_ONTOLOGY"); reg = cur.fetchone()[0]
    except Exception:
        pass
    print(f"live Snowflake {DATABASE}.{SCHEMA} — use case: {use_case}")
    print(f"  ✓ connection OK · {ntab} tables in schema · CANONICAL_ONTOLOGY: {reg} concept mappings")
    if reg == 0:
        print("  (no canonical registry yet — click 'Publish ontology' first to provision it)")
    print("  live-row execution adapter is on the roadmap; UNAI renders full metrics on the canonical model")


def _guard_select(sql):
    """Read-only guard: allow a SINGLE SELECT/WITH, block DDL/DML, force a LIMIT."""
    s = (sql or "").strip().rstrip(";").strip()
    low = " " + s.lower().replace("\n", " ") + " "
    if not (s.lower().startswith("select") or s.lower().startswith("with")):
        raise ValueError("read-only: only SELECT / WITH queries are allowed")
    if ";" in s:
        raise ValueError("read-only: only a single statement is allowed")
    for b in [" insert ", " update ", " delete ", " merge ", " drop ", " alter ",
              " create ", " truncate ", " grant ", " revoke ", " call ", " copy ", " put "]:
        if b in low:
            raise ValueError("read-only: keyword not allowed: " + b.strip())
    if " limit " not in low and "fetch first" not in low:
        s += " LIMIT 200"
    return s


def cmd_query():
    import json as _json
    sql = _guard_select(sys.argv[2] if len(sys.argv) > 2 else "")
    con = _connect(); cur = con.cursor(); cur.execute(sql)
    cols = [d[0] for d in cur.description]
    rows = [list(r) for r in cur.fetchmany(200)]
    print(f"{len(rows)} row(s) from Snowflake")
    print("===UNAI_ROWS===" + _json.dumps({"columns": cols, "rows": rows, "sql": sql}, default=str))


def cmd_schema():
    import json as _json
    conn = _connector(); out = {}
    for t in conn.list_tables():
        out[t] = [c["name"] for c in conn.get_schema(t)]
    print("===UNAI_SCHEMA===" + _json.dumps({"catalog": DATABASE, "schema": SCHEMA, "tables": out}, default=str))


CMDS = {"test": cmd_test, "publish": cmd_publish, "create": cmd_publish, "introspect": cmd_introspect,
        "automap": cmd_automap, "run": cmd_run, "query": cmd_query, "schema": cmd_schema}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "test"
    if cmd not in CMDS:
        print("usage: python connect_snowflake.py [test|publish|introspect|automap|run <use_case>|query <sql>|schema]"); sys.exit(1)
    if cmd == "run":
        cmd_run(sys.argv[2] if len(sys.argv) > 2 else "disruption_response")
    else:
        CMDS[cmd]()
