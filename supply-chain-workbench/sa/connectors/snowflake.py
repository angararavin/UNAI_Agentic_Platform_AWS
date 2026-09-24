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
Snowflake catalog connector (real introspection scaffold).

Reads the customer's catalog via INFORMATION_SCHEMA + Horizon tags, so the
Semantic Auto-Mapper can induce the ontology. Read-only by default; write-back
via SQL MERGE is gated. Requires: pip install snowflake-connector-python and a
read-only role on the target database/schema.

Deploy note: as a Snowflake Native App this runs INSIDE the customer's account,
so data never leaves their perimeter.
"""
from __future__ import annotations
from .base import CatalogConnector


class SnowflakeConnector(CatalogConnector):
    name = "snowflake"

    def __init__(self, database, schema, sample_rows=5, **conn):
        import snowflake.connector  # lazy import
        # Set database/schema ON the session so INFORMATION_SCHEMA queries have a
        # current database (otherwise list_tables → "session has no current database").
        self.con = snowflake.connector.connect(database=database, schema=schema, **conn)
        self.database, self.schema, self.sample_rows = database, schema, sample_rows

    def list_tables(self):
        cur = self.con.cursor()
        cur.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = %s AND table_type IN ('BASE TABLE','VIEW')",
            [self.schema])
        return [r[0] for r in cur.fetchall()]

    def get_schema(self, table):
        cur = self.con.cursor()
        cur.execute(
            "SELECT column_name, data_type, comment FROM information_schema.columns "
            "WHERE table_schema = %s AND table_name = %s ORDER BY ordinal_position",
            [self.schema, table])
        cols = cur.fetchall()
        # governed sample: a few values per column to power value-profile heuristics
        try:
            cur.execute(f'SELECT * FROM "{self.database}"."{self.schema}"."{table}" LIMIT {self.sample_rows}')
            rows = cur.fetchall(); names = [d[0] for d in cur.description]
            samples = {n: [r[i] for r in rows] for i, n in enumerate(names)}
        except Exception:
            samples = {}
        return [{"name": c[0], "dtype": c[1], "comment": c[2] or "", "samples": samples.get(c[0], [])} for c in cols]

    def query(self, table, filter=None):
        cur = self.con.cursor()
        sql = f'SELECT * FROM "{self.database}"."{self.schema}"."{table}"'
        params = []
        if filter:
            sql += " WHERE " + " AND ".join(f"{k}=%s" for k in filter); params = list(filter.values())
        cur.execute(sql, params); cols = [d[0] for d in cur.description]
        return [dict(zip(cols, r)) for r in cur.fetchall()]

    def write(self, op, payload):
        # gated: implement SQL MERGE into a recommendations table; left as a controlled stub
        return {"status": "GATED", "op": op, "note": "enable write-back after certification"}
