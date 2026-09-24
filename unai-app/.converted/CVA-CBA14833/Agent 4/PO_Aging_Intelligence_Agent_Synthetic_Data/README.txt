PO Aging Intelligence Agent — Synthetic Demo Dataset
==========================================================
All records are synthetic and intended for POC/demo/testing only.

Purpose:
Train/test an agent that investigates aged open purchase orders, diagnoses the
reason an order remains open, determines whether the supply is still needed,
and recommends a controlled next action.

Join keys:
- po_number + item identify PO line
- supplier_id, plant_id, material_id connect master/context files
- case_id links demo cases to ground truth

Key scenarios:
CASE01 valid future demand
CASE02 old but still valid near-term demand
CASE03 partial delivery with residual quantity
CASE04 cancelled requirement
CASE05 fully received / close
CASE06 closed requirement + no supplier confirmation
CASE07 repeated reschedules
CASE08 valid future demand despite low age
CASE09 blocked PO
CASE10 intentionally long-horizon forecast
CASE11 completed receipt / cancelled demand
CASE12 recent active requirement

Suggested agent output:
root_cause, evidence, demand_status, supply_status, recommended_action,
approval_required, confidence, risk, and verification_plan.

Important:
invoice_status.csv is optional. Exact SAP API/CDS/table names vary by S/4HANA
edition, release, configuration and customer extensions. Do not hard-code
synthetic field semantics as production SAP semantics without validation.
