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
-- UNAI · Databricks (Unity Catalog) — canonical-ontology system of record
-- -----------------------------------------------------------------------------
-- Run in a Databricks SQL editor / notebook, OR via:  python connect_databricks.py create
-- Column names use UNAI's Databricks dialect so the canonical ontology maps them
-- with ZERO re-mapping; the COMMENTs feed Unity Catalog / Horizon + auto-mapping.
-- Tables are gold/feature (Delta). Three-level names: <catalog>.<schema>.<table>.
-- =============================================================================
CREATE CATALOG IF NOT EXISTS unai;
CREATE SCHEMA  IF NOT EXISTS unai.supply_chain;

-- ---- Dimensions -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS unai.supply_chain.dim_product (
  sku          STRING COMMENT 'canonical: sku — product identifier',
  product_name STRING COMMENT 'canonical: product_name',
  category     STRING COMMENT 'canonical: category'
) USING DELTA;

CREATE TABLE IF NOT EXISTS unai.supply_chain.dim_location (
  dc       STRING COMMENT 'canonical: location — distribution centre',
  region   STRING COMMENT 'canonical: region',
  echelon  STRING COMMENT 'canonical: echelon (DC / REGIONAL / STORE)'
) USING DELTA;

CREATE TABLE IF NOT EXISTS unai.supply_chain.dim_supplier (
  vendor         STRING COMMENT 'canonical: supplier',
  supplier_name  STRING COMMENT 'canonical: product_name of supplier',
  vendor_region  STRING COMMENT 'canonical: supplier_region'
) USING DELTA;

-- ---- Facts ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS unai.supply_chain.fct_sales (
  sku STRING COMMENT 'canonical: sku', dc STRING COMMENT 'canonical: location',
  period STRING COMMENT 'canonical: period (YYYY-MM)', sales_qty INT COMMENT 'canonical: sales_qty'
) USING DELTA;

CREATE TABLE IF NOT EXISTS unai.supply_chain.fct_inventory (
  sku STRING COMMENT 'canonical: sku', dc STRING COMMENT 'canonical: location',
  on_hand INT COMMENT 'canonical: on_hand_qty', in_transit INT COMMENT 'canonical: in_transit_qty',
  safety_stock INT COMMENT 'canonical: safety_stock', reorder_point INT COMMENT 'canonical: reorder_point',
  lead_time INT COMMENT 'canonical: lead_time_days', unit_cost DOUBLE COMMENT 'canonical: unit_cost',
  vendor STRING COMMENT 'canonical: supplier'
) USING DELTA;

CREATE TABLE IF NOT EXISTS unai.supply_chain.fct_shipment (
  shipment_id STRING COMMENT 'canonical: shipment_id', sku STRING COMMENT 'canonical: sku',
  dc STRING COMMENT 'canonical: location', carrier STRING COMMENT 'canonical: carrier',
  status STRING COMMENT 'canonical: ship_status', eta_days INT COMMENT 'canonical: eta_days',
  planned_eta INT COMMENT 'canonical: planned_eta', in_transit INT COMMENT 'canonical: in_transit_qty'
) USING DELTA;

CREATE TABLE IF NOT EXISTS unai.supply_chain.fct_po (
  po_id STRING COMMENT 'canonical: purchase_order', sku STRING COMMENT 'canonical: sku',
  dc STRING COMMENT 'canonical: location', vendor STRING COMMENT 'canonical: supplier',
  po_qty INT COMMENT 'canonical: po_qty', unit_cost DOUBLE COMMENT 'canonical: unit_cost',
  status STRING COMMENT 'canonical: ship_status'
) USING DELTA;

-- ---- ML feature tables ------------------------------------------------------
CREATE TABLE IF NOT EXISTS unai.supply_chain.feat_forecast (
  sku STRING COMMENT 'canonical: sku', dc STRING COMMENT 'canonical: location',
  period STRING COMMENT 'canonical: period', yhat INT COMMENT 'canonical: forecast_qty'
) USING DELTA;

CREATE TABLE IF NOT EXISTS unai.supply_chain.feat_supplier_risk (
  vendor STRING COMMENT 'canonical: supplier', risk_score DOUBLE COMMENT 'canonical: supplier_risk',
  disrupted BOOLEAN COMMENT 'canonical: disruption_flag', region STRING COMMENT 'canonical: region',
  note STRING COMMENT 'free text'
) USING DELTA;

-- ---- Agent write-back (audit of autonomous/recommended actions) -------------
CREATE TABLE IF NOT EXISTS unai.supply_chain.agent_actions (
  ts STRING, op STRING, sku STRING, dc STRING, detail STRING, status STRING
) USING DELTA;

-- ---- Seed (idempotent-ish: truncate then insert a small sample) -------------
TRUNCATE TABLE unai.supply_chain.dim_product;
INSERT INTO unai.supply_chain.dim_product VALUES
 ('FG-1001','Smart Thermostat','Electronics'),('FG-1002','Door Sensor','Electronics'),('FG-1003','Water Pump','Industrial');
TRUNCATE TABLE unai.supply_chain.dim_location;
INSERT INTO unai.supply_chain.dim_location VALUES ('DC-EAST','US-East','DC'),('DC-WEST','US-West','DC');
TRUNCATE TABLE unai.supply_chain.dim_supplier;
INSERT INTO unai.supply_chain.dim_supplier VALUES
 ('V-2207','Acme APAC','APAC'),('V-3310','EuroParts','EU'),('V-9001','Backup Co','US');
TRUNCATE TABLE unai.supply_chain.fct_sales;
INSERT INTO unai.supply_chain.fct_sales VALUES
 ('FG-1001','DC-EAST','2026-05',1280),('FG-1002','DC-EAST','2026-05',410),('FG-1003','DC-WEST','2026-05',600);
TRUNCATE TABLE unai.supply_chain.fct_inventory;
INSERT INTO unai.supply_chain.fct_inventory VALUES
 ('FG-1001','DC-EAST',540,120,600,900,21,42.5,'V-2207'),
 ('FG-1002','DC-EAST',1180,0,400,700,14,18.0,'V-2207'),
 ('FG-1003','DC-WEST',220,60,300,500,28,96.0,'V-3310');
TRUNCATE TABLE unai.supply_chain.feat_forecast;
INSERT INTO unai.supply_chain.feat_forecast VALUES
 ('FG-1001','DC-EAST','2026-06',1450),('FG-1002','DC-EAST','2026-06',380),('FG-1003','DC-WEST','2026-06',900);
TRUNCATE TABLE unai.supply_chain.feat_supplier_risk;
INSERT INTO unai.supply_chain.feat_supplier_risk VALUES
 ('V-2207',0.78,true,'APAC','Port strike — APAC lanes'),
 ('V-3310',0.20,false,'EU','Nominal'),('V-9001',0.10,false,'US','Backup, nominal');
TRUNCATE TABLE unai.supply_chain.fct_shipment;
INSERT INTO unai.supply_chain.fct_shipment VALUES
 ('SHP-501','FG-1001','DC-EAST','Maersk','CUSTOMS',12,7,120),
 ('SHP-502','FG-1003','DC-WEST','DHL','IN_TRANSIT',5,6,60),
 ('SHP-503','FG-1002','DC-EAST','FedEx','IN_TRANSIT',9,4,200);
