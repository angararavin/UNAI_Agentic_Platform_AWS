# Data Lakehouse Options for the Super Agent

The Super Agent doesn't care which lakehouse or warehouse holds the data — every
backend is reached through one adapter (`query`/`write`) and reconciled by the
canonical ontology. So the platform choice is purely about cost, governance,
data residency, and the skills you already have. Here are the realistic options,
from "run it on your laptop today" to "enterprise multi-engine."

## At a glance

| Option | Type | Open source | Best for | Super Agent adapter |
|--------|------|-------------|----------|---------------------|
| **DuckDB + Iceberg** | Single-node engine + open table format | ✅ | Dev / POC / the runnable demo; small-mid marts | `DuckDBAdapter` (+ `pyiceberg`) |
| **Apache Iceberg + Trino** | Open table format + distributed SQL | ✅ | Vendor-neutral, multi-engine lakehouse at scale | thin Trino adapter (DB-API) |
| **Delta Lake (OSS) + Spark** | Open table format + Spark | ✅ | Easiest migration from a Databricks design | Spark/DB-API adapter |
| **Apache Hudi + Spark/Flink** | Upsert/CDC table format | ✅ | Streaming + heavy incremental/CDC supply-chain data | Spark/DB-API adapter |
| **Postgres** | OLTP / small analytics | ✅ | Smallest footprint, transactional marts, dev | `PostgresAdapter` |
| **Snowflake** | Managed cloud warehouse | ❌ | Governed gold marts, BI/serving, low ops | `SnowflakeAdapter` |
| **Databricks** | Managed lakehouse + ML | ❌ | Bronze→silver, feature engineering, ML at scale | `DatabricksAdapter` |

## The two open-source options you picked

### DuckDB + Apache Iceberg  (lightweight, runnable now)
- **What:** DuckDB is a fast single-node analytical engine; Iceberg is an open table
  format (snapshots, schema evolution, time travel) on object storage (S3/MinIO/local).
- **Why:** zero infrastructure for dev and POCs; reads Iceberg tables that the same
  organisation can also query from Spark/Trino in prod. Great "build it on your laptop,
  scale it later without rewriting the table format" path.
- **Super Agent:** the shipped `DuckDBAdapter` already runs the demo. Point DuckDB at an
  Iceberg catalog with `pyiceberg` and the agent code is unchanged.
  ```python
  # pip install "pyiceberg[duckdb]"
  from pyiceberg.catalog import load_catalog
  cat = load_catalog("local", **{"type": "sql", "uri": "sqlite:///cat.db",
                                  "warehouse": "file:///data/warehouse"})
  # register Iceberg tables, then query via DuckDB's iceberg_scan / the adapter
  ```

### Apache Iceberg + Trino  (vendor-neutral, scalable)
- **What:** Iceberg tables on object storage, queried by Trino (distributed MPP SQL).
  Multiple engines (Trino, Spark, Flink, DuckDB) read the *same* tables — no lock-in.
- **Why:** the most open, scalable lakehouse; separates storage from compute; ideal when
  several teams/engines must share governed supply-chain data.
- **Super Agent:** add a ~30-line `TrinoAdapter` over the `trino` DB-API client using the
  same `query`/`write` signature as the others (write via `INSERT`/`MERGE INTO`).

## How the medallion maps onto each
- **Bronze (raw):** landed SAP IDoc/CDC, carrier feeds, POS — object storage (Iceberg/Hudi/Delta) or staging schema.
- **Silver (conformed):** cleaned, deduped, conformed keys — Spark/dbt transforms.
- **Gold / feature:** the dimensional facts + ML feature tables the agent reads (`datamodel/ddl.sql`).
The ontology means the gold layer can live in **any** of the engines above (or several at
once) and the Super Agent reads them identically.

## Recommended path for "I don't have Snowflake/Databricks yet"
1. **Now:** DuckDB (this repo) — build and prove all four use cases for free.
2. **Team scale:** move gold/feature tables to **Iceberg**, query with **Trino**; keep DuckDB for dev.
3. **If/when you adopt managed platforms:** drop in `SnowflakeAdapter` (gold marts) and/or
   `DatabricksAdapter` (silver + ML features). No change to the seven layers, the tool packs,
   or the orchestrator — only the adapter wiring in `run_demo.py`.
