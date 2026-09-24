MATERIAL TWIN-LOCATION AGENT — SYNTHETIC DATA
===============================================
Purpose
-------
Synthetic SAP-style flat files for Agent 03. The dataset demonstrates simultaneous surplus
at one plant and shortage at another, plus transfer economics and downstream impact.

Core concept
------------
The agent must not simply detect surplus + shortage. It must decide whether moving inventory
is beneficial after considering:
- current and future demand
- safety stock at source
- destination shortage
- criticality
- transfer quantity
- freight cost
- transit time
- stockout/business exposure
- future source-plant risk

Files
-----
plants.csv
materials.csv
plant_material_stock.csv
plant_material_demand.csv
plant_lanes.csv
candidate_transfer_options.csv
downstream_impact.csv
transfer_decision_ground_truth.csv
demo_cases.csv
README.txt

Suggested agent loop
--------------------
1. Detect plant/material surplus-shortage pairs.
2. Retrieve future demand and safety-stock context.
3. Identify candidate source/destination quantities.
4. Retrieve lane cost and transit information.
5. Assess source protection and destination business impact.
6. Simulate transfer options.
7. Calculate net benefit / service impact.
8. Apply policy and approval thresholds.
9. Recommend or execute controlled stock transfer.
10. Verify post-transfer inventory and demand coverage.

Important
---------
All data is synthetic and intended for POC/demo development.
Exact SAP tables, CDS views, APIs and movement types must be validated for the target S/4HANA release.
