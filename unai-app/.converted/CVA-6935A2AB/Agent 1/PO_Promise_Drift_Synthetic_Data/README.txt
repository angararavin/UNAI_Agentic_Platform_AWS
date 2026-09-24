PO Promise Drift Agent — Synthetic Demo Dataset
=====================================================
Purpose
-------
Synthetic, non-production data for building and demonstrating Agent 01.
No real supplier/customer/company information is included.

Files
-----
1. suppliers.csv                 Supplier master
2. materials.csv                Material master
3. plants.csv                   Plant master
4. historical_po_deliveries.csv Historical PO commitments vs actual receipts
5. current_purchase_orders.csv  Current open POs and confirmations
6. supplier_confirmations.csv   Confirmation history / changes
7. downstream_impact.csv        Production/customer impact context
8. mrp_supply_context.csv       Demand, stock and shortage context
9. supplier_scorecard.csv       Derived historical supplier statistics
10. risk_policy.csv             Example risk/action policy
11. demo_cases.csv              Hand-picked presentation scenarios

Recommended Agent Flow
----------------------
current_purchase_orders
 -> supplier_confirmations
 -> historical_po_deliveries / supplier_scorecard
 -> drift prediction
 -> downstream_impact + mrp_supply_context
 -> policy evaluation
 -> recommendation
 -> human approval
 -> simulated SAP action
 -> verification

Suggested target
----------------
Create a label such as:
promise_drift = 1 if actual_receipt_date > confirmed_delivery_date + tolerance_days

For a real ML experiment, build the label only from events known after the prediction timestamp.
Do not use actual_receipt_date or future information as features.

Demo scenarios
--------------
CHRONIC_LATE: supplier has persistent delay behavior.
RECENT_DETERIORATION: recent performance should be weighted more heavily.
NEW_SUPPLIER: sparse-history fallback.
HIGH_IMPACT: high probability/risk should be prioritized because downstream impact is large.
PARTIAL_CONFIRMATION: quantity commitment risk.
MULTIPLE_CHANGES: repeated confirmation changes.
STABLE / NORMAL_VARIANCE: controls.

All dates and IDs are synthetic.
