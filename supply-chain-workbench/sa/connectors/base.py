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
Catalog connectors — the onboarding front door.

A CatalogConnector knows how to *introspect* a source platform (list tables,
describe columns with types/comments/sample values) so the Semantic Auto-Mapper
can induce the canonical ontology automatically. It also exposes query/write so
the same object doubles as a runtime adapter once mappings are approved.

Every connector implements the same four methods, so onboarding any platform is
"connect → introspect → auto-map → review → activate" with no bespoke code.
"""
from __future__ import annotations


class ColumnInfo(dict):
    """{'name','dtype','comment','samples'} — the input the auto-mapper expects."""


class CatalogConnector:
    name = "base"

    # --- introspection (used by onboarding / auto-mapper) ---
    def list_tables(self) -> list[str]:
        raise NotImplementedError

    def get_schema(self, table: str) -> list[dict]:
        """Return [{name, dtype, comment, samples:[...]}] for one table."""
        raise NotImplementedError

    # --- runtime (used by the Action/Perception layers after mapping) ---
    def query(self, table: str, filter: dict | None = None) -> list[dict]:
        raise NotImplementedError

    def write(self, op: str, payload: dict) -> dict:
        raise NotImplementedError

    # convenience: introspect every table at once
    def introspect(self) -> dict:
        return {t: self.get_schema(t) for t in self.list_tables()}
