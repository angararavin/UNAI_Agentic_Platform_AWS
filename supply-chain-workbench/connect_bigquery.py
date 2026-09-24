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
Connect UNAI to Google BigQuery and PUBLISH the canonical ontology there.
Credentials come from the environment (a service-account key OR gcloud ADC), so
nothing secret touches the code.

SET THESE FIRST (see the Connections tab):
    export GOOGLE_CLOUD_PROJECT=sap-ai-ewm-automation
    export BIGQUERY_DATASET=unai_supply_chain          # optional (default)
    export BIGQUERY_LOCATION=US                         # optional (your region)
    # auth — either a key file:
    export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
    # ...or run once:  gcloud auth application-default login

THEN:
    pip install google-cloud-bigquery
    python connect_bigquery.py test         # verify connection + dataset
    python connect_bigquery.py publish      # create dataset + canonical tables
                                            #   (column descriptions = the ontology)
                                            #   + a canonical_ontology registry table
    python connect_bigquery.py introspect   # list tables + columns + descriptions
    python connect_bigquery.py automap      # auto-induce the ontology from BQ
"""
import os
import sys

PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT", "")
DATASET = os.environ.get("BIGQUERY_DATASET", "unai_supply_chain")
LOCATION = os.environ.get("BIGQUERY_LOCATION", "US")

# Canonical tables mirror databricks_setup.sql EXACTLY (same table + column names,
# the Databricks/UNAI dialect), so the canonical ontology maps them with zero
# re-mapping AND the BigQueryAdapter can run any use case live.
# Each entry: (native column, BigQuery type, canonical concept).
CANON_TABLES = {
    "dim_product":  [("sku","STRING","sku"),("product_name","STRING","product_name"),("category","STRING","category")],
    "dim_location": [("dc","STRING","location"),("region","STRING","region"),("echelon","STRING","echelon")],
    "dim_supplier": [("vendor","STRING","supplier"),("supplier_name","STRING","product_name"),("vendor_region","STRING","supplier_region")],
    "fct_sales":    [("sku","STRING","sku"),("dc","STRING","location"),("period","STRING","period"),("sales_qty","INT64","sales_qty")],
    "fct_inventory":[("sku","STRING","sku"),("dc","STRING","location"),("on_hand","INT64","on_hand_qty"),("in_transit","INT64","in_transit_qty"),
                     ("safety_stock","INT64","safety_stock"),("reorder_point","INT64","reorder_point"),("lead_time","INT64","lead_time_days"),
                     ("unit_cost","FLOAT64","unit_cost"),("vendor","STRING","supplier")],
    "fct_shipment": [("shipment_id","STRING","shipment_id"),("sku","STRING","sku"),("dc","STRING","location"),("carrier","STRING","carrier"),
                     ("status","STRING","ship_status"),("eta_days","INT64","eta_days"),("planned_eta","INT64","planned_eta"),("in_transit","INT64","in_transit_qty")],
    "fct_po":       [("po_id","STRING","purchase_order"),("sku","STRING","sku"),("dc","STRING","location"),("vendor","STRING","supplier"),
                     ("po_qty","INT64","po_qty"),("unit_cost","FLOAT64","unit_cost"),("status","STRING","ship_status")],
    "feat_forecast":[("sku","STRING","sku"),("dc","STRING","location"),("period","STRING","period"),("yhat","INT64","forecast_qty")],
    "feat_supplier_risk":[("vendor","STRING","supplier"),("risk_score","FLOAT64","supplier_risk"),("disrupted","BOOL","disruption_flag"),
                     ("region","STRING","region"),("note","STRING","note")],
    # ---- Spares planning (IBP) + RMA execution (mirror databricks_setup_spares_rma.sql) ----
    "ib_install_base":[("sku","STRING","sku"),("dc","STRING","location"),("install_base","INT64","install_base_qty"),("age_months","INT64","asset_age_months"),("lead_time","INT64","lead_time_days")],
    "ib_inv_target":[("sku","STRING","sku"),("dc","STRING","location"),("target_pos","INT64","target_stock"),("safety_stock","INT64","safety_stock"),("service_level","FLOAT64","service_level"),("forecast_qty","INT64","forecast_qty")],
    "feat_failure":[("sku","STRING","sku"),("dc","STRING","location"),("fail_rate","FLOAT64","failure_rate"),("age_factor","FLOAT64","age_factor"),("install_base","INT64","install_base_qty")],
    "feat_spares_forecast":[("sku","STRING","sku"),("dc","STRING","location"),("forecast_qty","INT64","forecast_qty"),("variability","FLOAT64","demand_variability")],
    "feat_returns":[("sku","STRING","sku"),("return_prob","FLOAT64","return_prob"),("return_lag_days","INT64","return_lag_days"),("yield_rate","FLOAT64","yield_rate")],
    "s4_refurb":[("dc","STRING","location"),("capacity","INT64","refurb_capacity"),("cost_per_unit","FLOAT64","refurb_cost")],
    "rma_case":[("rma_id","STRING","rma_id"),("sku","STRING","sku"),("status","STRING","rma_status"),("warranty","STRING","warranty_status"),("claim_value","FLOAT64","claim_value"),("entitled","BOOL","entitlement"),("oem","STRING","supplier"),("symptom","STRING","symptom")],
    # ---- Planning use cases (mirror databricks_setup_planning.sql) ----
    "pl_demand_plan":[("sku","STRING","sku"),("dc","STRING","location"),("forecast_qty","INT64","forecast_qty"),("consensus_qty","INT64","consensus_demand"),("promo_uplift","FLOAT64","promo_uplift"),("fcst_accuracy","FLOAT64","forecast_accuracy")],
    "pl_inv_health":[("sku","STRING","sku"),("dc","STRING","location"),("inv_turns","FLOAT64","inv_turns"),("excess_qty","INT64","excess_qty"),("safety_stock","INT64","safety_stock"),("reorder_point","INT64","reorder_point")],
    "pl_supply_plan":[("sku","STRING","sku"),("dc","STRING","location"),("cap_qty","INT64","capacity_qty"),("mps_qty","INT64","mps_qty"),("alloc_qty","INT64","allocation_qty")],
    "pl_procurement":[("sku","STRING","sku"),("vendor","STRING","supplier"),("spend_amt","FLOAT64","spend_amount"),("supplier_score","FLOAT64","supplier_score"),("contract_id","STRING","contract_id")],
    "pl_logistics":[("sku","STRING","sku"),("carrier","STRING","carrier"),("transit_days","INT64","transit_days"),("freight_cost","FLOAT64","freight_cost"),("otif_pct","FLOAT64","otif")],
    "pl_production":[("sku","STRING","sku"),("dc","STRING","location"),("work_order","STRING","work_order"),("run_rate","INT64","run_rate"),("oee_pct","FLOAT64","oee"),("cap_qty","INT64","capacity_qty")],
    # ---- OCM Change Management Agent (mirror datamodel/ddl.sql's ocm_* tables) ----
    "ocm_stakeholder":[("stakeholder_id","STRING","stakeholder_id"),("full_name","STRING","stakeholder_name"),("job_role","STRING","job_role"),
                     ("stakeholder_group","STRING","stakeholder_group"),("region","STRING","region"),("influence_score","FLOAT64","influence_score"),
                     ("support_score","FLOAT64","support_score"),("last_contact_date","STRING","last_contact_date")],
    "ocm_readiness_survey":[("survey_id","STRING","survey_id"),("survey_wave","STRING","survey_wave"),("stakeholder_group","STRING","stakeholder_group"),
                     ("region","STRING","region"),("readiness_score","FLOAT64","readiness_score"),("respondent_count","INT64","respondent_count"),
                     ("top_concern","STRING","top_concern")],
    "ocm_training_plan":[("training_id","STRING","training_id"),("job_role","STRING","job_role"),("training_module","STRING","training_module"),
                     ("training_format","STRING","training_format"),("training_hours","INT64","training_hours"),
                     ("completion_pct","FLOAT64","completion_pct"),("go_live_gate","BOOL","go_live_gate")],
    "ocm_milestone":[("milestone_id","STRING","milestone_id"),("phase","STRING","phase"),("milestone_title","STRING","milestone_title"),
                     ("planned_date","STRING","planned_date"),("milestone_state","STRING","milestone_state"),("owner_name","STRING","owner_name")],
    "ocm_comms":[("comm_id","STRING","comm_id"),("audience","STRING","audience"),("channel","STRING","channel"),("cadence","STRING","cadence"),
                     ("topic","STRING","topic"),("comm_state","STRING","comm_state"),("scheduled_date","STRING","scheduled_date")],
    "ocm_risk":[("risk_id","STRING","risk_id"),("stakeholder_group","STRING","stakeholder_group"),("risk_driver","STRING","risk_driver"),
                     ("likelihood","FLOAT64","likelihood"),("impact","FLOAT64","impact"),("mitigation","STRING","mitigation")],
    "ocm_metric":[("metric_id","STRING","metric_id"),("metric_name","STRING","metric_name"),("baseline_value","FLOAT64","baseline_value"),
                     ("target_value","FLOAT64","target_value"),("current_value","FLOAT64","current_value"),("unit","STRING","unit")],
    # ---- Datacenter hardware RMA (converted from rma-agent-poc's 4 LangGraph agents) ----
    # One unified row per tray — the union of all 4 agents' real input fields.
    # "datacenter" and "spare_inventory" deliberately reuse the existing "location" and
    # "on_hand_qty" concepts already published from dim_location/fct_inventory (proof of
    # zero re-mapping); "rma_id"/"warranty_status" reuse the concepts already mapped from
    # ServiceNow via rma_case.
    "dc_hw_rma_case":[
        ("tray_id","STRING","tray_id"),("mpn","STRING","mpn"),
        ("failure_code","STRING","failure_code"),("failure_description","STRING","failure_description"),
        ("dcha_log","STRING","dcha_telemetry"),
        ("current_stage","STRING","rma_stage"),("hours_in_stage","INT64","hours_in_stage"),("micro_slo","INT64","micro_slo_hours"),
        ("datacenter","STRING","location"),("event_history","STRING","event_history"),
        ("failure_type","STRING","failure_type"),("spare_inventory","INT64","on_hand_qty"),
        ("business_impact","STRING","business_impact"),("carrier_status","STRING","carrier_status"),("cm_queue_status","STRING","cm_queue_status"),
        ("rma_id","STRING","rma_id"),("serial_number","STRING","serial_number"),("returned_serial","STRING","returned_serial"),
        ("repair_status","STRING","repair_status"),("warranty_status","STRING","warranty_status"),("manifest_details","STRING","manifest_details"),
    ],
}
SEED = {
    "dim_product": [("FG-1001","Smart Thermostat","Electronics"),("FG-1002","Door Sensor","Electronics"),("FG-1003","Water Pump","Industrial")],
    "dim_location": [("DC-EAST","US-East","DC"),("DC-WEST","US-West","DC")],
    "dim_supplier": [("V-2207","Acme APAC","APAC"),("V-3310","EuroParts","EU"),("V-9001","Backup Co","US")],
    "fct_sales": [("FG-1001","DC-EAST","2026-05",1280),("FG-1002","DC-EAST","2026-05",410),("FG-1003","DC-WEST","2026-05",600)],
    "fct_inventory": [("FG-1001","DC-EAST",540,120,600,900,21,42.5,"V-2207"),("FG-1002","DC-EAST",1180,0,400,700,14,18.0,"V-2207"),
                      ("FG-1003","DC-WEST",220,60,300,500,28,96.0,"V-3310")],
    "fct_shipment": [("SHP-501","FG-1001","DC-EAST","Maersk","CUSTOMS",12,7,120),("SHP-502","FG-1003","DC-WEST","DHL","IN_TRANSIT",5,6,60),
                     ("SHP-503","FG-1002","DC-EAST","FedEx","IN_TRANSIT",9,4,200)],
    "feat_forecast": [("FG-1001","DC-EAST","2026-06",1450),("FG-1002","DC-EAST","2026-06",380),("FG-1003","DC-WEST","2026-06",900)],
    "feat_supplier_risk": [("V-2207",0.78,True,"APAC","Port strike — APAC lanes"),("V-3310",0.20,False,"EU","Nominal"),("V-9001",0.10,False,"US","Backup, nominal")],
    "ib_install_base": [("GPU-H100","DC-EAST",12000,26,35),("SSD-3840","DC-EAST",48000,14,18),("PSU-2200","DC-WEST",9000,31,28)],
    "ib_inv_target": [("GPU-H100","DC-EAST",720,240,0.98,505),("SSD-3840","DC-EAST",1100,300,0.97,864),("PSU-2200","DC-WEST",820,280,0.99,603)],
    "feat_failure": [("GPU-H100","DC-EAST",0.042,1.35,12000),("SSD-3840","DC-EAST",0.018,1.10,48000),("PSU-2200","DC-WEST",0.067,1.60,9000)],
    "feat_spares_forecast": [("GPU-H100","DC-EAST",505,0.28),("SSD-3840","DC-EAST",864,0.19),("PSU-2200","DC-WEST",603,0.41)],
    "feat_returns": [("GPU-H100",0.62,34,0.78),("SSD-3840",0.40,21,0.91),("PSU-2200",0.55,28,0.66)],
    "s4_refurb": [("DC-EAST",600,1800.0),("DC-WEST",350,210.0)],
    "rma_case": [("RMA0012841","GPU-H100","RECEIVED","IN_WARRANTY",24500.0,True,"NVIDIA","Xid 79 fall-off-bus"),("RMA0012842","PSU-2200","RECEIVED","OUT_WARRANTY",890.0,False,"Delta","No power-on")],
    "pl_demand_plan": [("FG-1001","DC-EAST",1450,1500,0.18,0.86),("FG-1002","DC-EAST",380,400,0.05,0.78),("FG-1003","DC-WEST",720,900,0.22,0.71)],
    "pl_inv_health": [("FG-1001","DC-EAST",8.2,0,600,900),("FG-1002","DC-EAST",3.1,480,400,700),("FG-1003","DC-WEST",5.4,60,300,500)],
    "pl_supply_plan": [("FG-1001","DC-EAST",1600,1500,1450),("FG-1003","DC-WEST",850,820,800)],
    "pl_procurement": [("FG-1001","V-2207",544000.0,0.82,"CTR-4471"),("FG-1003","V-3310",211200.0,0.91,"CTR-5588")],
    "pl_logistics": [("FG-1001","Maersk",12,4200.0,0.94),("FG-1003","DHL",5,1800.0,0.88)],
    "pl_production": [("FG-1001","DC-EAST","WO-88012",120,0.79,1600),("FG-1003","DC-WEST","WO-88090",75,0.85,850)],
    "ocm_stakeholder": [
        ("STK-01","Maria Chen","VP Supply Chain","Executive Sponsor","Corporate",0.95,0.90,"2026-07-20"),
        ("STK-02","David Okafor","Warehouse Ops Manager","Warehouse Ops","DC-EAST",0.65,0.35,"2026-07-15"),
        ("STK-03","Priya Nair","Procurement Lead","Procurement","Corporate",0.70,0.55,"2026-07-18"),
        ("STK-04","Tom Becker","IT/Basis Manager","IT","Corporate",0.60,0.80,"2026-07-22"),
        ("STK-05","Lena Ruiz","Plant Ops Supervisor","Warehouse Ops","DC-WEST",0.55,0.30,"2026-07-10"),
        ("STK-06","James Park","Customer Service Lead","Customer Service","Corporate",0.40,0.60,"2026-07-19"),
        ("STK-07","Grace Liu","Finance Controller","Finance","Corporate",0.75,0.65,"2026-07-21"),
        ("STK-08","Ahmed Farouk","Union Shop Steward","Warehouse Ops","DC-EAST",0.80,0.20,"2026-07-05")],
    "ocm_readiness_survey": [
        ("SUR-01","Wave 1 - Design","Warehouse Ops","DC-EAST",0.55,42,"Fear of job redundancy under new WMS"),
        ("SUR-02","Wave 1 - Design","Warehouse Ops","DC-WEST",0.60,35,"Unclear new putaway process"),
        ("SUR-03","Wave 1 - Design","Procurement","Corporate",0.72,18,"New approval workflow complexity"),
        ("SUR-04","Wave 2 - Build","Warehouse Ops","DC-EAST",0.62,40,"Still learning new transaction codes"),
        ("SUR-05","Wave 2 - Build","Finance","Corporate",0.80,12,"Month-end close timing"),
        ("SUR-06","Wave 2 - Build","IT","Corporate",0.85,9,"Cutover weekend staffing")],
    "ocm_training_plan": [
        ("TRN-01","Warehouse Associate","S4 Inbound/Outbound Processing","ILT",8,0.48,True),
        ("TRN-02","Warehouse Supervisor","S4 Exception Handling & MFS","ILT",12,0.55,True),
        ("TRN-03","Procurement Buyer","S4 Sourcing & PO Workflow","eLearning",6,0.78,True),
        ("TRN-04","Finance Analyst","S4 FI/CO Period Close","eLearning",6,0.90,True),
        ("TRN-05","IT Support","S4 Basis & Incident Triage","ILT",16,0.95,True),
        ("TRN-06","Customer Service Rep","S4 Order-to-Cash Basics","eLearning",4,0.70,False)],
    "ocm_milestone": [
        ("MS-01","Prepare","Change Charter Approved","2026-04-15","COMPLETE","Maria Chen"),
        ("MS-02","Design","Stakeholder Analysis Signed Off","2026-05-20","COMPLETE","PMO"),
        ("MS-03","Design","Training Curriculum Finalized","2026-06-10","COMPLETE","L&D"),
        ("MS-04","Build","UAT Readiness Review","2026-07-25","AT_RISK","IT"),
        ("MS-05","Build","Warehouse Floor Walkthroughs","2026-08-01","OVERDUE","David Okafor"),
        ("MS-06","Test","Cutover Rehearsal #1","2026-08-20","ON_TRACK","PMO"),
        ("MS-07","Deploy","Go-Live Readiness Gate","2026-09-10","ON_TRACK","Maria Chen"),
        ("MS-08","Hypercare","30-Day Adoption Review","2026-10-10","ON_TRACK","PMO")],
    "ocm_comms": [
        ("COM-01","All Employees","Town Hall","Monthly","Why We're Changing to S4","SENT","2026-05-01"),
        ("COM-02","Warehouse Ops","Team Huddle","Weekly","New WMS Process Walkthrough","SENT","2026-07-01"),
        ("COM-03","Procurement","Email Digest","Bi-weekly","New PO Approval Workflow","SENT","2026-07-10"),
        ("COM-04","Warehouse Ops","Floor Signage + Huddle","Weekly","Cutover Countdown & Support Contacts","SCHEDULED","2026-08-15"),
        ("COM-05","Executive Sponsors","Steering Committee","Monthly","Go-Live Readiness Status","SCHEDULED","2026-08-20")],
    "ocm_risk": [
        ("RSK-01","Warehouse Ops","Fear of headcount reduction from automation",0.75,0.85,"Redeployment guarantee comms + union engagement sessions"),
        ("RSK-02","Procurement","New approval workflow seen as slower",0.45,0.50,"Fast-track approval SLA + buyer office hours"),
        ("RSK-03","IT","Cutover weekend staffing burnout",0.40,0.60,"Backup on-call rotation + war-room staffing plan"),
        ("RSK-04","Customer Service","Order status visibility gap during cutover",0.55,0.55,"Temporary manual status log + daily sync")],
    "ocm_metric": [
        ("MET-01","Employee Readiness Score",0.50,0.85,0.66,"score(0-1)"),
        ("MET-02","Training Completion Rate",0.00,0.95,0.68,"pct"),
        ("MET-03","Change Champion Coverage",0.00,1.00,0.60,"pct of sites covered"),
        ("MET-04","Net Sentiment (comms pulse)",-0.10,0.30,0.05,"net score")],
    # Verbatim from rma-agent-poc (data_1..4.py + sample_cases_agent_1.txt) — each
    # row only carries the fields its origin agent actually had; the rest is NULL.
    # Columns: tray_id, mpn, failure_code, failure_description, dcha_log,
    #   current_stage, hours_in_stage, micro_slo, datacenter, event_history,
    #   failure_type, spare_inventory, business_impact, carrier_status, cm_queue_status,
    #   rma_id, serial_number, returned_serial, repair_status, warranty_status, manifest_details
    "dc_hw_rma_case": [
        ("GF-10002","GF-H100-REV2","MEM-001","GPU memory ECC failures detected.",
         "ECC error count exceeded threshold. Memory bank 3 reporting faults. Temperature normal. Persistent failure across reboots.",
         None,None,None,None,None, None,None,None,None,None, None,None,None,None,None,None),
        ("GF-10003","GF-H100-REV3","NTF-001","Reported failure could not be reproduced.",
         "No active errors. Diagnostics passed. Thermal normal. PCIe healthy. Memory healthy.",
         None,None,None,None,None, None,None,None,None,None, None,None,None,None,None,None),
        ("GF-10001","GF-H100-REV2","PCIE-002","Intermittent PCIe link instability detected.",
         "PCIe retraining events detected. Link degraded from x16 to x8. Multiple correctable PCIe errors. No thermal violations. GPU memory healthy.",
         None,None,None,None,None, None,None,None,None,None, None,None,None,None,None,None),
        ("GF-1001",None,None,None,None,
         "3PL Pickup Queue",52,24,"DC-Spoke-01","Failure detected. Tray moved to drop zone. Awaiting 3PL pickup for 52 hours. No pickup confirmation received.",
         None,None,None,None,None, None,None,None,None,None,None),
        ("GF-3001",None,"CF-203",None,None,
         None,None,None,"US-CENTRAL-01",None,
         "Critical ML Tray Failure",0,"High","Available","Moderate",
         None,None,None,None,None,None),
        ("GF-4001",None,None,None,None,
         None,None,None,None,None,
         None,None,None,None,None,
         "RMA-2026-1001","SN-GF-12345","SN-GF-12345","Completed","Eligible",
         "Tray returned from Celestica. GPU board replaced. Functional test passed."),
    ],
}


def _client():
    if not PROJECT:
        print("Missing env var: GOOGLE_CLOUD_PROJECT (see this file's header / the Connections tab)."); sys.exit(1)
    try:
        from google.cloud import bigquery
    except ImportError:
        print("Install the driver:  pip install google-cloud-bigquery"); sys.exit(1)
    return bigquery.Client(project=PROJECT, location=LOCATION)


def _fqd():
    return f"`{PROJECT}.{DATASET}`"


def cmd_test():
    c = _client()
    row = list(c.query("SELECT session_user() AS u, current_timestamp() AS t").result())[0]
    print(f"connected to BigQuery  project={PROJECT}  location={LOCATION}  as {row.u}")
    from google.cloud.exceptions import NotFound
    try:
        c.get_dataset(f"{PROJECT}.{DATASET}"); print(f"  dataset {DATASET}: exists")
    except NotFound:
        print(f"  dataset {DATASET}: NOT found — run `publish` to create it")


def cmd_publish():
    c = _client()
    from google.cloud import bigquery
    ds = bigquery.Dataset(f"{PROJECT}.{DATASET}"); ds.location = LOCATION
    c.create_dataset(ds, exists_ok=True); print(f"✓ dataset {DATASET} ready ({LOCATION})")
    reg = []
    for tbl, cols in CANON_TABLES.items():
        coldefs = ",\n  ".join(f'{n} {t} OPTIONS(description="canonical: {concept}")' for n, t, concept in cols)
        c.query(f'CREATE OR REPLACE TABLE {_fqd()[:-1]}.{tbl}` (\n  {coldefs}\n) '
                f'OPTIONS(description="UNAI canonical table — column descriptions carry the ontology")').result()
        vals = SEED.get(tbl, [])
        if vals:
            def lit(v): return "NULL" if v is None else "TRUE" if v is True else "FALSE" if v is False else (str(v) if isinstance(v, (int, float)) else '"' + str(v).replace('"', '') + '"')
            rows = ",\n  ".join("(" + ", ".join(lit(v) for v in r) + ")" for r in vals)
            c.query(f'INSERT INTO {_fqd()[:-1]}.{tbl}` VALUES\n  {rows}').result()
        print(f"  ✓ {tbl}  ({len(cols)} cols, {len(vals)} seed rows)")
        for n, t, concept in cols:
            reg.append((concept, tbl, n))
    # publish the ontology registry table (concept -> table.native_field)
    c.query(f'CREATE OR REPLACE TABLE {_fqd()[:-1]}.canonical_ontology` ('
            f'concept STRING OPTIONS(description="canonical concept"), '
            f'source_table STRING, native_field STRING OPTIONS(description="native BigQuery column")) '
            f'OPTIONS(description="UNAI canonical ontology registry")').result()
    rows = ",\n  ".join(f'("{cc}","{tb}","{nf}")' for cc, tb, nf in reg)
    c.query(f'INSERT INTO {_fqd()[:-1]}.canonical_ontology` VALUES\n  {rows}').result()
    print(f"\n✓ published canonical_ontology registry ({len(reg)} concept mappings) to {PROJECT}.{DATASET}")
    print("  The ontology now lives in BigQuery: column descriptions carry `canonical:` tags, and")
    print("  canonical_ontology holds the concept↔field map. Run `automap` to induce it back.")


def _schemas(c):
    # native columns + their descriptions from INFORMATION_SCHEMA.COLUMN_FIELD_PATHS
    q = (f"SELECT table_name, field_path AS column_name, data_type, description "
         f"FROM {_fqd()[:-1]}.INFORMATION_SCHEMA.COLUMN_FIELD_PATHS` ORDER BY table_name")
    out = {}
    for r in c.query(q).result():
        out.setdefault(r.table_name, []).append({"name": r.column_name, "dtype": r.data_type, "comment": r.description or ""})
    return out


def cmd_introspect():
    c = _client()
    print(f"=== BigQuery: {PROJECT}.{DATASET} ===")
    for t, cols in _schemas(c).items():
        print(f"\n  {t}  ({len(cols)} columns)")
        for col in cols:
            print(f"     {col['name']:<16} {col['dtype']:<10} {col['comment']}")


def cmd_automap():
    c = _client()
    from sa.automap import auto_map
    print(f"=== Auto-inducing canonical ontology from {PROJECT}.{DATASET} ===")
    tot = acc = mapped = 0
    graph = {"source": "bigquery", "catalog": PROJECT, "schema": DATASET,
             "tables": [], "concepts": [], "edges": []}
    _concepts = set()
    for t, cols in _schemas(c).items():
        res = auto_map(cols); s = res["summary"]
        tot += s["columns"]; acc += s["auto_accepted"]; mapped += s["mapped"]
        graph["tables"].append({"name": t, "columns": s["columns"], "mapped": s["mapped"]})
        print(f"\n  {t}: {s['mapped']}/{s['columns']} mapped · {s['auto_accepted']} auto · {s['needs_review']} review")
        for m in res["mappings"]:
            print(f"     [{'auto ' if m['auto_accepted'] else 'REVIEW'}] {m['column']:<16} -> {(m['concept'] or '-'):<16} {m['confidence']}")
            if m["concept"]:
                _concepts.add(m["concept"])
                graph["edges"].append({"table": t, "column": m["column"], "concept": m["concept"],
                                       "confidence": m["confidence"], "auto": bool(m["auto_accepted"])})
    cov = round(100 * mapped / tot) if tot else 0
    autorate = round(100 * acc / tot) if tot else 0
    grade = "Excellent" if (cov >= 95 and autorate >= 80) else "Good" if cov >= 85 else "Fair" if cov >= 70 else "Needs work"
    print(f"\n=== MAPPING QUALITY ===  coverage {cov}%  ({mapped}/{tot}) · auto {acc} · review/unmapped {tot-acc}")
    import json as _json
    graph["concepts"] = sorted(_concepts)
    graph["summary"] = {"columns": tot, "mapped": mapped, "auto_accepted": acc,
                        "coverage": cov, "autorate": autorate, "grade": grade}
    print("===UNAI_ONTOLOGY===" + _json.dumps(graph, default=str))


def cmd_run(use_case="disruption_response"):
    """LIVE execution: read canonical tables from BigQuery through the
    BigQueryAdapter and run the use case on the shared seven-layer orchestrator,
    emitting the full render payload (===UNAI_JSON===) for the Studio dashboards."""
    if not PROJECT:
        print("Missing GOOGLE_CLOUD_PROJECT."); return
    try:
        from sa.adapters import BigQueryAdapter
        from sa.orchestrator import UNAI, USE_CASES
    except ImportError as e:
        print("dependency missing:", e, "\n(pip install google-cloud-bigquery)"); return
    if use_case not in USE_CASES:
        use_case = "disruption_response"
    try:
        # Register separate adapter instances under the same logical system names
        # the SQLite demo uses (ANALYTICS, SAP_MM, SAP_IBP, SERVICENOW — same
        # physical BigQuery dataset behind each). This lets the orchestrator's
        # context-switch accounting reflect the real SAP MM/SD/FI + IBP +
        # ServiceNow + analytics landscape being consolidated, instead of
        # collapsing everything into one flat "BIGQUERY" system where nothing
        # ever looks like a switch. Separate instances (not one shared adapter
        # under multiple keys) so each system's call count stays accurate.
        # systemsTouched/systemsOfRecord only report the ones a given use case
        # actually reads/writes (sa/layers.py tracks that), so registering all
        # four up front — rather than hand-picking per use case — is safe.
        systems = {k: BigQueryAdapter(PROJECT, DATASET, LOCATION)
                   for k in ("ANALYTICS", "SAP_MM", "SAP_IBP", "SERVICENOW")}
        out = UNAI().run(use_case, systems, backend="ANALYTICS")
    except Exception as e:
        print(f"live BigQuery run could not complete: {e}")
        print("→ ensure the canonical tables are published (click 'Publish ontology' first).")
        return
    r = out["render"]; m = r["metrics"]; ob = r["observability"]
    print(f"live BigQuery {PROJECT}.{DATASET} — {r['useCase']['name']}")
    print(f"  ✓ {ob['totalSystemCalls']} live reads · {m['substitutionRatio']} agents → 1 · "
          f"{ob['autonomyRatePct']}% autonomous · {ob['ontologyTranslations']} ontology translations")
    import json as _json
    print("===UNAI_JSON===" + _json.dumps(r, default=str))


def _guard_select(sql):
    """Read-only guard: allow a SINGLE SELECT/WITH, block DDL/DML, force a LIMIT."""
    s = (sql or "").strip().rstrip(";").strip()
    low = " " + s.lower().replace("\n", " ") + " "
    if not (s.lower().startswith("select") or s.lower().startswith("with")):
        raise ValueError("read-only: only SELECT / WITH queries are allowed")
    if ";" in s:
        raise ValueError("read-only: only a single statement is allowed")
    for b in [" insert ", " update ", " delete ", " merge ", " drop ", " alter ",
              " create ", " truncate ", " grant ", " revoke ", " call "]:
        if b in low:
            raise ValueError("read-only: keyword not allowed: " + b.strip())
    if " limit " not in low:
        s += " LIMIT 200"
    return s


def cmd_query():
    import json as _json
    sql = _guard_select(sys.argv[2] if len(sys.argv) > 2 else "")
    c = _client(); res = c.query(sql).result(max_results=200)
    cols = [f.name for f in res.schema]
    rows = [[r[cn] for cn in cols] for r in res]
    print(f"{len(rows)} row(s) from BigQuery")
    print("===UNAI_ROWS===" + _json.dumps({"columns": cols, "rows": rows, "sql": sql}, default=str))


def cmd_schema():
    import json as _json
    c = _client(); out = {}
    for t, cols in _schemas(c).items():
        out[t] = [col["name"] for col in cols]
    print("===UNAI_SCHEMA===" + _json.dumps({"catalog": PROJECT, "schema": DATASET, "tables": out}, default=str))


CMDS = {"test": cmd_test, "publish": cmd_publish, "create": cmd_publish, "introspect": cmd_introspect,
        "automap": cmd_automap, "run": cmd_run, "query": cmd_query, "schema": cmd_schema}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "test"
    if cmd not in CMDS:
        print("usage: python connect_bigquery.py [test|publish|introspect|automap|run <use_case>|query <sql>|schema]"); sys.exit(1)
    if cmd == "run":
        cmd_run(sys.argv[2] if len(sys.argv) > 2 else "disruption_response")
    else:
        CMDS[cmd]()
