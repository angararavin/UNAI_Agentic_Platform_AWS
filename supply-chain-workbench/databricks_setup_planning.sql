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
-- UNAI · Databricks — canonical ontology for the PLANNING use cases:
-- Demand Planning · Inventory Optimization · Supply/S&OP · Procurement &
-- Sourcing · Logistics & Transportation · Production/Manufacturing.
-- Companion to databricks_setup.sql. Every column carries a `canonical:`
-- COMMENT so `automap` induces the ontology straight from Unity Catalog.
-- Run:  python connect_databricks.py create
-- =============================================================================

-- ---- Demand Planning --------------------------------------------------------
CREATE TABLE IF NOT EXISTS unai.supply_chain.pl_demand_plan (
  sku           STRING COMMENT 'canonical: sku',
  dc            STRING COMMENT 'canonical: location',
  forecast_qty  INT    COMMENT 'canonical: forecast_qty — statistical baseline',
  consensus_qty INT    COMMENT 'canonical: consensus_demand',
  promo_uplift  DOUBLE COMMENT 'canonical: promo_uplift',
  fcst_accuracy DOUBLE COMMENT 'canonical: forecast_accuracy'
) USING DELTA;

-- ---- Inventory Optimization -------------------------------------------------
CREATE TABLE IF NOT EXISTS unai.supply_chain.pl_inv_health (
  sku           STRING COMMENT 'canonical: sku',
  dc            STRING COMMENT 'canonical: location',
  inv_turns     DOUBLE COMMENT 'canonical: inv_turns',
  excess_qty    INT    COMMENT 'canonical: excess_qty',
  safety_stock  INT    COMMENT 'canonical: safety_stock',
  reorder_point INT    COMMENT 'canonical: reorder_point'
) USING DELTA;

-- ---- Supply / S&OP Planning -------------------------------------------------
CREATE TABLE IF NOT EXISTS unai.supply_chain.pl_supply_plan (
  sku      STRING COMMENT 'canonical: sku',
  dc       STRING COMMENT 'canonical: location',
  cap_qty  INT    COMMENT 'canonical: capacity_qty',
  mps_qty  INT    COMMENT 'canonical: mps_qty',
  alloc_qty INT   COMMENT 'canonical: allocation_qty'
) USING DELTA;

-- ---- Procurement & Sourcing -------------------------------------------------
CREATE TABLE IF NOT EXISTS unai.supply_chain.pl_procurement (
  sku            STRING COMMENT 'canonical: sku',
  vendor         STRING COMMENT 'canonical: supplier',
  spend_amt      DOUBLE COMMENT 'canonical: spend_amount',
  supplier_score DOUBLE COMMENT 'canonical: supplier_score',
  contract_id    STRING COMMENT 'canonical: contract_id'
) USING DELTA;

-- ---- Logistics & Transportation ---------------------------------------------
CREATE TABLE IF NOT EXISTS unai.supply_chain.pl_logistics (
  sku          STRING COMMENT 'canonical: sku',
  carrier      STRING COMMENT 'canonical: carrier',
  transit_days INT    COMMENT 'canonical: transit_days',
  freight_cost DOUBLE COMMENT 'canonical: freight_cost',
  otif_pct     DOUBLE COMMENT 'canonical: otif'
) USING DELTA;

-- ---- Production / Manufacturing ---------------------------------------------
CREATE TABLE IF NOT EXISTS unai.supply_chain.pl_production (
  sku        STRING COMMENT 'canonical: sku',
  dc         STRING COMMENT 'canonical: location',
  work_order STRING COMMENT 'canonical: work_order',
  run_rate   INT    COMMENT 'canonical: run_rate',
  oee_pct    DOUBLE COMMENT 'canonical: oee',
  cap_qty    INT    COMMENT 'canonical: capacity_qty'
) USING DELTA;

-- ---- Seed -------------------------------------------------------------------
TRUNCATE TABLE unai.supply_chain.pl_demand_plan;
INSERT INTO unai.supply_chain.pl_demand_plan VALUES
 ('FG-1001','DC-EAST',1450,1500,0.18,0.86),('FG-1002','DC-EAST',380,400,0.05,0.78),('FG-1003','DC-WEST',720,900,0.22,0.71);
TRUNCATE TABLE unai.supply_chain.pl_inv_health;
INSERT INTO unai.supply_chain.pl_inv_health VALUES
 ('FG-1001','DC-EAST',8.2,0,600,900),('FG-1002','DC-EAST',3.1,480,400,700),('FG-1003','DC-WEST',5.4,60,300,500);
TRUNCATE TABLE unai.supply_chain.pl_supply_plan;
INSERT INTO unai.supply_chain.pl_supply_plan VALUES
 ('FG-1001','DC-EAST',1600,1500,1450),('FG-1003','DC-WEST',850,820,800);
TRUNCATE TABLE unai.supply_chain.pl_procurement;
INSERT INTO unai.supply_chain.pl_procurement VALUES
 ('FG-1001','V-2207',544000.0,0.82,'CTR-4471'),('FG-1003','V-3310',211200.0,0.91,'CTR-5588');
TRUNCATE TABLE unai.supply_chain.pl_logistics;
INSERT INTO unai.supply_chain.pl_logistics VALUES
 ('FG-1001','Maersk',12,4200.0,0.94),('FG-1003','DHL',5,1800.0,0.88);
TRUNCATE TABLE unai.supply_chain.pl_production;
INSERT INTO unai.supply_chain.pl_production VALUES
 ('FG-1001','DC-EAST','WO-88012',120,0.79,1600),('FG-1003','DC-WEST','WO-88090',75,0.85,850);
