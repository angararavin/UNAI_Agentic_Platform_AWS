PHANTOM INVENTORY AGENT — SYNTHETIC DEMO DATA
=============================================
Purpose
-------
Synthetic SAP-style flat files for building and demonstrating Agent 02.
All IDs, quantities and dates are synthetic.

Core concept
------------
ERP physical/stock quantity can differ from operationally usable inventory because stock may be:
- blocked
- under quality inspection/hold
- reserved by another demand
- physically in an unsuitable location
- expired
- approaching shelf-life constraints
- over-reserved / inconsistent
- duplicated or otherwise requiring reconciliation

Files
-----
inventory_stock.csv              Base stock by plant/material/location with planted scenarios
batch_shelf_life.csv             Batch age and expiry context
demand_requirements.csv          Near-term requirements and demand source
reservations.csv                 Reservations competing for stock
quality_holds.csv                Quality/inspection quantities
stock_movements.csv              Storage-location movement history
phantom_inventory_ground_truth.csv Expected phantom quantity and action labels
demo_cases.csv                   Curated demo scenarios
suppliers.csv / materials.csv / plants.csv  Reference master data

Suggested agent loop
--------------------
1. Detect candidate inventory.
2. Retrieve reservations, quality, batch and location evidence.
3. Calculate operationally usable quantity.
4. Compare usable stock against near-term demand.
5. Explain why stock is phantom.
6. Determine recovery/disposition option.
7. Apply policy and approval rules.
8. Optionally execute a controlled SAP action.
9. Verify the resulting stock/status.
10. Store outcome for evaluation.

Important
---------
For a production implementation, exact SAP tables/CDS views/APIs depend on S/4HANA release and customer configuration.
Do not use these synthetic values as SAP master/transaction data.
