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
-- UNAI · Databricks — canonical ontology for the SPARES PLANNING (IBP) and
-- RMA EXECUTION flows. Companion to databricks_setup.sql (which creates the
-- catalog/schema + disruption-flow tables). Column names use UNAI's canonical
-- dialect and every column carries a `canonical:` COMMENT, so the Semantic
-- Auto-Mapper induces the ontology directly from Unity Catalog / Horizon.
-- Run:  python connect_databricks.py create        (runs this file too)
-- =============================================================================

-- ---- Spares planning · install base + targets (SAP IBP) ---------------------
CREATE TABLE IF NOT EXISTS unai.supply_chain.ib_install_base (
  sku          STRING COMMENT 'canonical: sku',
  dc           STRING COMMENT 'canonical: location',
  install_base INT    COMMENT 'canonical: install_base_qty — deployed fleet',
  age_months   INT    COMMENT 'canonical: asset_age_months',
  lead_time    INT    COMMENT 'canonical: lead_time_days'
) USING DELTA;

CREATE TABLE IF NOT EXISTS unai.supply_chain.ib_inv_target (
  sku           STRING COMMENT 'canonical: sku',
  dc            STRING COMMENT 'canonical: location',
  target_pos    INT    COMMENT 'canonical: target_stock — target inventory position',
  safety_stock  INT    COMMENT 'canonical: safety_stock',
  service_level DOUBLE COMMENT 'canonical: service_level',
  forecast_qty  INT    COMMENT 'canonical: forecast_qty — spares forecast'
) USING DELTA;

-- ---- Spares planning · BQML feature tables ---------------------------------
CREATE TABLE IF NOT EXISTS unai.supply_chain.feat_failure (
  sku          STRING COMMENT 'canonical: sku',
  dc           STRING COMMENT 'canonical: location',
  fail_rate    DOUBLE COMMENT 'canonical: failure_rate — annualized',
  age_factor   DOUBLE COMMENT 'canonical: age_factor — Weibull',
  install_base INT    COMMENT 'canonical: install_base_qty'
) USING DELTA;

CREATE TABLE IF NOT EXISTS unai.supply_chain.feat_spares_forecast (
  sku          STRING COMMENT 'canonical: sku',
  dc           STRING COMMENT 'canonical: location',
  forecast_qty INT    COMMENT 'canonical: forecast_qty',
  variability  DOUBLE COMMENT 'canonical: demand_variability'
) USING DELTA;

CREATE TABLE IF NOT EXISTS unai.supply_chain.feat_returns (
  sku             STRING COMMENT 'canonical: sku',
  return_prob     DOUBLE COMMENT 'canonical: return_prob',
  return_lag_days INT    COMMENT 'canonical: return_lag_days',
  yield_rate      DOUBLE COMMENT 'canonical: yield_rate — refurb yield'
) USING DELTA;

-- ---- Spares planning · refurbish capacity (S/4HANA) ------------------------
CREATE TABLE IF NOT EXISTS unai.supply_chain.s4_refurb (
  dc            STRING COMMENT 'canonical: location',
  capacity      INT    COMMENT 'canonical: refurb_capacity — repair throughput/mo',
  cost_per_unit DOUBLE COMMENT 'canonical: refurb_cost'
) USING DELTA;

-- ---- RMA execution · cases (ServiceNow-sourced) ----------------------------
CREATE TABLE IF NOT EXISTS unai.supply_chain.rma_case (
  rma_id      STRING  COMMENT 'canonical: rma_id',
  sku         STRING  COMMENT 'canonical: sku',
  status      STRING  COMMENT 'canonical: rma_status',
  warranty    STRING  COMMENT 'canonical: warranty_status',
  claim_value DOUBLE  COMMENT 'canonical: claim_value',
  entitled    BOOLEAN COMMENT 'canonical: entitlement',
  oem         STRING  COMMENT 'canonical: supplier — OEM',
  symptom     STRING  COMMENT 'free text — reported symptom'
) USING DELTA;

-- ---- Seed (idempotent-ish) --------------------------------------------------
TRUNCATE TABLE unai.supply_chain.ib_install_base;
INSERT INTO unai.supply_chain.ib_install_base VALUES
 ('GPU-H100','DC-EAST',12000,26,35),('SSD-3840','DC-EAST',48000,14,18),('PSU-2200','DC-WEST',9000,31,28);
TRUNCATE TABLE unai.supply_chain.ib_inv_target;
INSERT INTO unai.supply_chain.ib_inv_target VALUES
 ('GPU-H100','DC-EAST',720,240,0.98,505),('SSD-3840','DC-EAST',1100,300,0.97,864),('PSU-2200','DC-WEST',820,280,0.99,603);
TRUNCATE TABLE unai.supply_chain.feat_failure;
INSERT INTO unai.supply_chain.feat_failure VALUES
 ('GPU-H100','DC-EAST',0.042,1.35,12000),('SSD-3840','DC-EAST',0.018,1.10,48000),('PSU-2200','DC-WEST',0.067,1.60,9000);
TRUNCATE TABLE unai.supply_chain.feat_spares_forecast;
INSERT INTO unai.supply_chain.feat_spares_forecast VALUES
 ('GPU-H100','DC-EAST',505,0.28),('SSD-3840','DC-EAST',864,0.19),('PSU-2200','DC-WEST',603,0.41);
TRUNCATE TABLE unai.supply_chain.feat_returns;
INSERT INTO unai.supply_chain.feat_returns VALUES
 ('GPU-H100',0.62,34,0.78),('SSD-3840',0.40,21,0.91),('PSU-2200',0.55,28,0.66);
TRUNCATE TABLE unai.supply_chain.s4_refurb;
INSERT INTO unai.supply_chain.s4_refurb VALUES ('DC-EAST',600,1800.0),('DC-WEST',350,210.0);
TRUNCATE TABLE unai.supply_chain.rma_case;
INSERT INTO unai.supply_chain.rma_case VALUES
 ('RMA0012841','GPU-H100','RECEIVED','IN_WARRANTY',24500.0,true,'NVIDIA','Xid 79 fall-off-bus'),
 ('RMA0012842','PSU-2200','RECEIVED','OUT_WARRANTY',890.0,false,'Delta','No power-on');
