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
Pluggable system-of-record adapters. Every adapter implements the SAME tiny
interface — query(entity, filter) and write(op, payload) — so the Super Agent's
seven layers never change when you swap the backend.

Runnable today (free):  DuckDBAdapter, PostgresAdapter
Drop-in for production:  SnowflakeAdapter, DatabricksAdapter  (same interface)

`entity` is a logical name (e.g. "inventory"); each adapter maps it to its own
physical table. Rows are returned with that backend's NATIVE column names; the
Perception layer maps them to canonical concepts via the ontology.
"""
from __future__ import annotations
import datetime as _dt


class BaseAdapter:
    system = "BASE"

    def __init__(self):
        self.calls = 0

    def query(self, entity: str, filter: dict | None = None) -> list[dict]:
        raise NotImplementedError

    def write(self, op: str, payload: dict) -> dict:
        raise NotImplementedError


# --- logical entity -> physical table (medallion gold/feature layer) -----------
DUCKDB_TABLES = {
    "product": "dim_product", "location": "dim_location", "supplier": "dim_supplier",
    "sales": "fct_sales", "inventory": "fct_inventory", "forecast": "feat_forecast",
    "supplier_risk": "feat_supplier_risk", "shipment": "fct_shipment", "po": "fct_po",
}


class DuckDBAdapter(BaseAdapter):
    """Runnable lakehouse-style backend. `con` is a duckdb connection."""
    system = "DUCKDB"

    def __init__(self, con, tables: dict | None = None):
        super().__init__()
        self.con = con
        self.tables = tables or DUCKDB_TABLES

    def query(self, entity, filter=None):
        self.calls += 1
        table = self.tables.get(entity, entity)
        sql = f"SELECT * FROM {table}"
        params = []
        if filter:
            sql += " WHERE " + " AND ".join(f"{k} = ?" for k in filter)
            params = list(filter.values())
        cur = self.con.execute(sql, params)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]

    def write(self, op, payload):
        self.calls += 1
        ts = _dt.datetime.utcnow().isoformat(timespec="seconds")
        if op == "SAFETY_STOCK_UPDATE":
            self.con.execute(
                "UPDATE fct_inventory SET safety_stock = ? WHERE sku_id = ? AND dc_code = ?",
                [payload["safety_stock"], payload["sku_id"], payload["dc_code"]],
            )
        # every write is also appended to an audit table (created by the DDL)
        self.con.execute(
            "INSERT INTO agent_actions (ts, op, sku_id, dc_code, detail, status) VALUES (?,?,?,?,?,?)",
            [ts, op, payload.get("sku_id"), payload.get("dc_code"), str(payload), payload.get("status", "DONE")],
        )
        ref = f"{op[:2]}-{abs(hash(str(payload))) % 1_000_000:06d}"
        return {"ref": ref, "status": payload.get("status", "DONE"), "op": op}


class PostgresAdapter(BaseAdapter):
    """Runnable on a free Postgres. Requires `psycopg` (pip install psycopg[binary])."""
    system = "POSTGRES"

    def __init__(self, dsn: str, tables: dict | None = None):
        super().__init__()
        import psycopg  # imported lazily so DuckDB-only users need nothing
        self.con = psycopg.connect(dsn, autocommit=True)
        self.tables = tables or DUCKDB_TABLES  # same physical names work in Postgres

    def query(self, entity, filter=None):
        self.calls += 1
        table = self.tables.get(entity, entity)
        sql = f"SELECT * FROM {table}"
        params = []
        if filter:
            sql += " WHERE " + " AND ".join(f"{k} = %s" for k in filter)
            params = list(filter.values())
        with self.con.cursor() as cur:
            cur.execute(sql, params)
            cols = [d[0] for d in cur.description]
            return [dict(zip(cols, row)) for row in cur.fetchall()]

    def write(self, op, payload):
        self.calls += 1
        ts = _dt.datetime.utcnow().isoformat(timespec="seconds")
        with self.con.cursor() as cur:
            if op == "SAFETY_STOCK_UPDATE":
                cur.execute("UPDATE fct_inventory SET safety_stock=%s WHERE sku_id=%s AND dc_code=%s",
                            [payload["safety_stock"], payload["sku_id"], payload["dc_code"]])
            cur.execute("INSERT INTO agent_actions (ts,op,sku_id,dc_code,detail,status) VALUES (%s,%s,%s,%s,%s,%s)",
                        [ts, op, payload.get("sku_id"), payload.get("dc_code"), str(payload), payload.get("status", "DONE")])
        return {"ref": f"{op[:2]}-{abs(hash(str(payload)))%1_000_000:06d}", "status": payload.get("status", "DONE"), "op": op}


# ---------------------------------------------------------------------------
# Production targets — same interface, real connection skeletons. Fill creds
# and the orchestrator/layers are UNCHANGED.
# ---------------------------------------------------------------------------
class SnowflakeAdapter(BaseAdapter):
    """Snowflake gold marts. pip install snowflake-connector-python"""
    system = "SNOWFLAKE"

    def __init__(self, **conn):
        super().__init__()
        import snowflake.connector
        self.con = snowflake.connector.connect(**conn)   # account, user, password, warehouse, database, schema
        self.tables = {k: v.upper() for k, v in DUCKDB_TABLES.items()}

    def query(self, entity, filter=None):
        self.calls += 1
        table = self.tables.get(entity, entity.upper())
        sql = f"SELECT * FROM {table}"
        params = []
        if filter:
            sql += " WHERE " + " AND ".join(f"{k} = %s" for k in filter)
            params = list(filter.values())
        cur = self.con.cursor()
        cur.execute(sql, params)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]

    def write(self, op, payload):
        self.calls += 1
        # MERGE/INSERT into a recommendations table; omitted for brevity
        return {"ref": "SF-stub", "status": payload.get("status", "DONE"), "op": op}


class BigQueryAdapter(BaseAdapter):
    """Google BigQuery canonical tables. pip install google-cloud-bigquery.
    Reads the UNAI canonical tables published by connect_bigquery.py (same
    column dialect as Databricks), so the ontology/layers are unchanged."""
    system = "BIGQUERY"

    def __init__(self, project, dataset, location="US"):
        super().__init__()
        from google.cloud import bigquery
        self._bq = bigquery
        self.client = bigquery.Client(project=project, location=location)
        self.project, self.dataset = project, dataset
        self.tables = DUCKDB_TABLES

    def query(self, entity, filter=None):
        self.calls += 1
        # logical entity -> physical table (fall back to the entity name itself so
        # spares/RMA/planning tables like ib_install_base / rma_case resolve too)
        table = f"`{self.project}.{self.dataset}.{self.tables.get(entity, entity)}`"
        sql = f"SELECT * FROM {table}"
        job_config = None
        if filter:
            conds, params = [], []
            for i, (k, v) in enumerate(filter.items()):
                conds.append(f"{k} = @p{i}")
                params.append(self._bq.ScalarQueryParameter(f"p{i}", "STRING", str(v)))
            sql += " WHERE " + " AND ".join(conds)
            job_config = self._bq.QueryJobConfig(query_parameters=params)
        rows = self.client.query(sql, job_config=job_config).result()
        return [dict(r.items()) for r in rows]

    def write(self, op, payload):
        # Read-only first: writes are gated (recommendation only) on BigQuery.
        self.calls += 1
        return {"ref": "BQ-gated", "status": payload.get("status", "RECOMMENDED"), "op": op}


class DatabricksAdapter(BaseAdapter):
    """Databricks SQL warehouse over Delta. pip install databricks-sql-connector"""
    system = "DATABRICKS"

    def __init__(self, server_hostname, http_path, access_token, catalog="main", schema="supply_chain"):
        super().__init__()
        from databricks import sql
        self.con = sql.connect(server_hostname=server_hostname, http_path=http_path, access_token=access_token)
        self.catalog, self.schema = catalog, schema
        self.tables = DUCKDB_TABLES

    def query(self, entity, filter=None):
        self.calls += 1
        table = f"{self.catalog}.{self.schema}.{self.tables.get(entity, entity)}"
        sql = f"SELECT * FROM {table}"
        params = []
        if filter:
            sql += " WHERE " + " AND ".join(f"{k} = ?" for k in filter)
            params = list(filter.values())
        with self.con.cursor() as cur:
            cur.execute(sql, params)
            cols = [d[0] for d in cur.description]
            return [dict(zip(cols, row)) for row in cur.fetchall()]

    def write(self, op, payload):
        self.calls += 1
        return {"ref": "DBX-stub", "status": payload.get("status", "DONE"), "op": op}
