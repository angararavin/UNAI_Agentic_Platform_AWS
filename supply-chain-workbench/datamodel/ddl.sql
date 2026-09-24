-- UNAI - Universal Supply-Chain Agent (Cognitive Runtime)
-- Copyright (c) 2026 Ravin Angara / Bristlecone. All rights reserved.
--
-- PROPRIETARY & CONFIDENTIAL. This file, and the architecture, methods and
-- ideas it embodies, are the exclusive property of the copyright holders.
-- No part may be copied, reproduced, modified, distributed, reverse-engineered,
-- or used to create derivative works without prior written permission.
-- Shared under confidentiality; unauthorized use or disclosure is prohibited.
-- See LICENSE. Integrity: this file is listed in copyright/MANIFEST.sha256.
-- SPDX-License-Identifier: LicenseRef-UNAI-Proprietary   [UNAI-COPYRIGHT v1]
-- =============================================================================
-- Canonical Supply-Chain Data Model  (medallion: bronze -> silver -> gold/feature)
-- -----------------------------------------------------------------------------
-- This DDL is intentionally engine-portable: it runs as-is on DuckDB AND Postgres.
-- For Snowflake/Databricks the same logical model maps to gold marts / Delta tables
-- (UPPER-case columns on Snowflake; the Super Agent reconciles either via the ontology).
--
-- Layering in a real lakehouse:
--   BRONZE  raw landed extracts (SAP IDocs/CDC, carrier feeds, POS)         <- ingestion
--   SILVER  cleaned, conformed, deduplicated (Databricks/Spark transforms)  <- quality
--   GOLD    dimensional facts + ML feature tables (what the agent reads)     <- serving
-- The tables below are the GOLD / FEATURE layer the Super Agent consumes.
-- Column names are the DuckDB/Postgres "native" dialect in the ontology.
-- =============================================================================

-- ---- Dimensions -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dim_product (
  sku_id        VARCHAR PRIMARY KEY,
  product_name  VARCHAR,
  category      VARCHAR
);

CREATE TABLE IF NOT EXISTS dim_location (
  dc_code   VARCHAR PRIMARY KEY,
  region    VARCHAR,
  echelon   VARCHAR          -- e.g. 'DC', 'REGIONAL', 'STORE'
);

CREATE TABLE IF NOT EXISTS dim_supplier (
  vendor_id        VARCHAR PRIMARY KEY,
  supplier_name    VARCHAR,
  supplier_region  VARCHAR
);

-- ---- Facts ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fct_sales (
  sku_id     VARCHAR,
  dc_code    VARCHAR,
  period     VARCHAR,         -- YYYY-MM
  sales_qty  INTEGER
);

CREATE TABLE IF NOT EXISTS fct_inventory (
  sku_id         VARCHAR,
  dc_code        VARCHAR,
  qty_on_hand    INTEGER,
  in_transit     INTEGER,
  safety_stock   INTEGER,
  reorder_point  INTEGER,
  lead_time      INTEGER,
  unit_cost      DOUBLE,
  vendor_id      VARCHAR
);

CREATE TABLE IF NOT EXISTS fct_shipment (
  shipment_id  VARCHAR,
  sku_id       VARCHAR,
  dc_code      VARCHAR,
  carrier      VARCHAR,
  status       VARCHAR,       -- 'IN_TRANSIT','CUSTOMS','DELIVERED'
  eta_days     INTEGER,       -- predicted days to arrival
  planned_eta  INTEGER,       -- promised days
  in_transit   INTEGER
);

CREATE TABLE IF NOT EXISTS fct_po (
  po_id      VARCHAR,
  sku_id     VARCHAR,
  dc_code    VARCHAR,
  vendor_id  VARCHAR,
  po_qty     INTEGER,
  unit_cost  DOUBLE,
  status     VARCHAR
);

-- ---- ML feature tables (produced on Databricks/Spark in prod) ---------------
CREATE TABLE IF NOT EXISTS feat_forecast (
  sku_id    VARCHAR,
  dc_code   VARCHAR,
  period    VARCHAR,
  fcst_qty  INTEGER
);

CREATE TABLE IF NOT EXISTS feat_supplier_risk (
  vendor_id   VARCHAR,
  risk_score  DOUBLE,
  disrupted   BOOLEAN,
  region      VARCHAR,
  note        VARCHAR
);

-- ---- Agent write-back (audit of autonomous/recommended actions) -------------
CREATE TABLE IF NOT EXISTS agent_actions (
  ts       VARCHAR,
  op       VARCHAR,
  sku_id   VARCHAR,
  dc_code  VARCHAR,
  detail   VARCHAR,
  status   VARCHAR
);
