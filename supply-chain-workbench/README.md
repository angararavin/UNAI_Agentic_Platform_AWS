# UNAI — Supply-Chain Development Workbench

Build four supply-chain use cases from scratch as **one or two UNAIs**
instead of **eight specialist agents** — runnable today on free engines
(DuckDB / Postgres), drop-in for Snowflake, Databricks, or an Apache Iceberg
lakehouse via the *same* adapter interface.

## The four use cases
1. **Demand forecasting & sensing** — blend an ML forecast with the live order signal.
2. **Multi-echelon inventory optimization** — safety-stock + autonomous replenishment with a $50K human-in-the-loop gate.
3. **Supplier risk & disruption response** — fuse risk signals to detect disruption.
4. **Logistics / in-transit visibility** — predict ETA slips and raise exceptions.

In a Gen-1 architecture that's ~2 specialist agents each = **8 agents, 56 layer
implementations**. Here it collapses to a **Planning UNAI** (demand +
inventory) and an **Execution UNAI** (risk + logistics): **2 agents, 7
shared layers + 4 tool packs = 11 implementations (≈80% less)**.

## Run it (free, ~30 seconds)
```bash
pip install duckdb
python run_demo.py            # full 4-use-case mesh
python run_demo.py demand_forecast   # or any single use case
```

## Swap the backend — agent code unchanged
The engine reads/writes only **canonical concepts**; each adapter maps them to its
own native columns. To point at a real platform, change one line in `run_demo.py`:
```python
from sa.adapters import PostgresAdapter      # or SnowflakeAdapter / DatabricksAdapter
systems = {"POSTGRES": PostgresAdapter("postgresql://user:pw@host/db")}
out = UNAI().run("mesh", systems, backend="POSTGRES")
```
See `LAKEHOUSE_OPTIONS.md` for Snowflake, Databricks, Iceberg+Trino, DuckDB+Iceberg and Postgres.

## Layout
| Path | Role |
|------|------|
| `sa/ontology.py` | Canonical ontology + mapper (SAP·Snowflake·Databricks·Postgres·DuckDB·logistics). |
| `sa/adapters.py` | Pluggable systems of record — DuckDB/Postgres runnable; Snowflake/Databricks skeletons. |
| `sa/layers.py` | The seven shared layers (Perception…Explainability) with observability. |
| `sa/toolpacks.py` | The four use cases — the only domain-specific code. |
| `sa/orchestrator.py` | UNAI + agent-compression metrics (8→2). |
| `sa/automap.py` | Semantic Auto-Mapper — auto-induces the canonical ontology from any source schema, with confidence + human-in-the-loop. |
| `run_automap.py` | Demo: maps a messy unknown schema to canonical (89% coverage, 78% auto-accepted). |
| `datamodel/ddl.sql` | Medallion data model (bronze→silver→gold/feature); runs on DuckDB & Postgres. |
| `seed.py` | Schema + sample data loader (DuckDB). |
| `run_demo.py` | End-to-end runner. |

## Data model (gold / feature layer)
Dimensions `dim_product`, `dim_location`, `dim_supplier`; facts `fct_sales`,
`fct_inventory`, `fct_shipment`, `fct_po`; ML features `feat_forecast`,
`feat_supplier_risk`; agent write-back `agent_actions`. In a lakehouse these are
the **gold** tables, fed by **silver** (conformed) from **bronze** (raw SAP/carrier/POS
extracts) — built with dbt or Spark.
