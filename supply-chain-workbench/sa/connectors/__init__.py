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
from .base import CatalogConnector
from .simulated import SimulatedCatalog, CATALOGS
__all__ = ["CatalogConnector", "SimulatedCatalog", "CATALOGS"]
# Real connectors import lazily (need vendor SDKs):
#   from sa.connectors.snowflake import SnowflakeConnector
#   from sa.connectors.databricks import DatabricksConnector
