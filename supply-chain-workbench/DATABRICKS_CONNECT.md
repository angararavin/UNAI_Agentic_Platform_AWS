# Connect UNAI to your Databricks (canonical-ontology system of record)

Your workspace: **`dbc-1f9111b9-92d4.cloud.databricks.com`** (workspace id 7474647742968062).
Warehouse: **unai-supply-chain**, catalog **workspace**, schema **unai_supply_chain**.
This wires that workspace in as a system of record — read-only by default, writes gated.

## 1. Get the two connection details (2 minutes)

**Server hostname** — `dbc-1f9111b9-92d4.cloud.databricks.com` (already known).

**HTTP Path** — in your workspace: **SQL → SQL Warehouses → (pick or create a Serverless warehouse) → Connection details → HTTP Path**. Looks like `/sql/1.0/warehouses/abc123def456`.

**Personal access token (PAT)** — top-right avatar → **Settings → Developer → Access tokens → Generate new token**. Copy it (starts with `dapi…`). A read-only-capable user/role is enough for introspection; table creation needs `CREATE` on the catalog (or have an admin run `databricks_setup.sql` once).

## 2. Set environment + install the driver

```bash
cd "/Users/Ravin.Angara/Claude/Projects/Super Agents/supply-chain-workbench"
export DATABRICKS_SERVER_HOSTNAME=dbc-1f9111b9-92d4.cloud.databricks.com
export DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/6869e5264e0abb27
export DATABRICKS_TOKEN=dapi-xxxxxxxxxxxxxxxx
# optional: export DATABRICKS_CATALOG=workspace  DATABRICKS_SCHEMA=unai_supply_chain
python3 -m pip install "databricks-sql-connector>=3.0"   # macOS: add --break-system-packages if needed
```

## 3. Run it

```bash
python connect_databricks.py test         # ✓ connected to … user/catalog/version
python connect_databricks.py create       # creates unai.supply_chain + 10 Delta tables + seed
python connect_databricks.py introspect   # lists tables + columns from Unity Catalog
python connect_databricks.py automap      # auto-induces the canonical ontology (per table)
python connect_databricks.py demo         # runs UNAI (read-only) against Databricks
```

If you can't create tables yourself, hand `databricks_setup.sql` to a workspace admin
(or paste it into a SQL editor) — it's plain Unity Catalog SQL.

## What gets created

`create` runs three SQL files into `unai.supply_chain` (all Delta, every column carries a
`canonical:` COMMENT so the auto-mapper induces the ontology straight from Unity Catalog):

**1. Disruption flow** (`databricks_setup.sql`) — `dim_product`, `dim_location`, `dim_supplier`,
`fct_sales`, `fct_inventory`, `fct_shipment`, `fct_po`, `feat_forecast`, `feat_supplier_risk`,
plus `agent_actions` (write-back audit).

**2. Spares (IBP) + RMA** (`databricks_setup_spares_rma.sql`) — `ib_install_base`, `ib_inv_target`,
`feat_failure`, `feat_spares_forecast`, `feat_returns`, `s4_refurb`, `rma_case`.

**3. Planning domains** (`databricks_setup_planning.sql`) — `pl_demand_plan` (Demand Planning),
`pl_inv_health` (Inventory Optimization), `pl_supply_plan` (Supply/S&OP), `pl_procurement`
(Procurement & Sourcing), `pl_logistics` (Logistics & Transportation), `pl_production`
(Production/Manufacturing).

Because of the `COMMENT`s:

- the **canonical ontology maps them with zero re-mapping** (the agent reads `sku`, `on_hand_qty`,
  `forecast_qty`, `consensus_demand`, `otif`, … regardless of Databricks' native names), and
- the **auto-mapper** + Unity Catalog/Horizon get strong semantic signals for any *other* tables
  you point it at.

All nine use cases (Disruption · Demand Planning · Inventory Optimization · Supply/S&OP ·
Procurement · Logistics · Production · Spares/IBP · RMA) can then run **live** via
`python connect_databricks.py run <use_case>` or the Studio's **Data source → Live Databricks**.

## Notes
- **Read-only first.** `demo` only reads; write-back (`PO_CREATE`, `SAFETY_STOCK_UPDATE`) is gated
  until you explicitly enable it after review.
- **Your token never leaves your machine** — it's read from the environment, not stored in code.
- To run UNAI *inside* your workspace (data never leaves), package this as a **Databricks App**
  (serverless, Unity-Catalog-governed) — the same adapter code applies.
