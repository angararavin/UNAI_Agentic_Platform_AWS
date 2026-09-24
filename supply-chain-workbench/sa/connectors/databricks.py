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
Databricks (Unity Catalog) connector — real introspection scaffold.

Reads catalog/schema/tables + column metadata from Unity Catalog's
information_schema, so the auto-mapper can induce the ontology. Read-only by
default; write-back via Delta MERGE is gated. Requires:
pip install databricks-sql-connector and a UC read grant.

Deploy note: as a Databricks App this runs in a serverless sandbox inside the
customer's workspace and inherits Unity Catalog governance, auth and audit.
"""
from __future__ import annotations
from .base import CatalogConnector


class DatabricksConnector(CatalogConnector):
    name = "databricks"

    def __init__(self, server_hostname, http_path, access_token, catalog, schema, sample_rows=5):
        from databricks import sql  # lazy import
        self.con = sql.connect(server_hostname=server_hostname, http_path=http_path, access_token=access_token)
        self.catalog, self.schema, self.sample_rows = catalog, schema, sample_rows

    def _fqn(self, table):
        return f"`{self.catalog}`.`{self.schema}`.`{table}`"

    def list_tables(self):
        with self.con.cursor() as cur:
            cur.execute(f"SELECT table_name FROM {self.catalog}.information_schema.tables WHERE table_schema = ?", [self.schema])
            return [r[0] for r in cur.fetchall()]

    def get_schema(self, table):
        with self.con.cursor() as cur:
            cur.execute(
                f"SELECT column_name, full_data_type, comment FROM {self.catalog}.information_schema.columns "
                f"WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position", [self.schema, table])
            cols = cur.fetchall()
            try:
                cur.execute(f"SELECT * FROM {self._fqn(table)} LIMIT {self.sample_rows}")
                rows = cur.fetchall(); names = [d[0] for d in cur.description]
                samples = {n: [r[i] for r in rows] for i, n in enumerate(names)}
            except Exception:
                samples = {}
        return [{"name": c[0], "dtype": c[1], "comment": c[2] or "", "samples": samples.get(c[0], [])} for c in cols]

    def query(self, table, filter=None):
        with self.con.cursor() as cur:
            sql = f"SELECT * FROM {self._fqn(table)}"; params = []
            if filter:
                sql += " WHERE " + " AND ".join(f"{k}=?" for k in filter); params = list(filter.values())
            cur.execute(sql, params); cols = [d[0] for d in cur.description]
            return [dict(zip(cols, r)) for r in cur.fetchall()]

    def write(self, op, payload):
        return {"status": "GATED", "op": op, "note": "enable Delta MERGE write-back after certification"}
