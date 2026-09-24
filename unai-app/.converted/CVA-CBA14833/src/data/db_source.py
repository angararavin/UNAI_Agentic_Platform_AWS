"""
Database Data Source
Connects to ANY relational database supported by SQLAlchemy or SQLite
(SQLite, PostgreSQL, MySQL, SQL Server, Oracle, SAP HANA) and maps tables to agent entities.
"""

import time
import logging
from typing import List, Dict, Any, Optional
import pandas as pd
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.engine import Engine

from src.data.datasource import BaseDataSource
from src.data.schema_mapper import SchemaMapper
from src.data.flat_file_source import FlatFileDataSource

logger = logging.getLogger(__name__)

class DatabaseDataSource(BaseDataSource):
    """
    Production-grade database adapter for SAP and enterprise relational databases.
    Connects via SQLAlchemy URL with table mapping, schema normalization, and dynamic case querying.
    """

    # Default mapping from agent table name to common DB table candidates
    DEFAULT_TABLE_MAPPINGS: Dict[str, List[str]] = {
        # Agent 1
        "current_purchase_orders": ["current_purchase_orders", "purchase_orders", "ekpo", "po_items", "orders"],
        "historical_po_deliveries": ["historical_po_deliveries", "po_deliveries", "ekbe", "delivery_history", "goods_receipts"],
        "mrp_supply_context": ["mrp_supply_context", "mrp_stock", "md04", "mrp_elements"],
        "downstream_impact": ["downstream_impact", "production_orders", "afpo", "downstream_orders"],

        # Agent 2
        "inventory_stock": ["inventory_stock", "mard", "stock", "material_stock", "inventory"],
        "quality_inspection": ["quality_inspection", "qals", "qa_inspection", "inspection_lots"],
        "stock_reservations": ["stock_reservations", "resb", "reservations", "order_reservations"],
        "batch_master": ["batch_master", "mcha", "mch1", "batches", "batch_expiry"],

        # Agent 3
        "twin_plant_pairs": ["twin_plant_pairs", "twin_plants", "sister_plants", "plant_network"],
        "plant_inventory": ["plant_inventory", "plant_stock", "mard_all", "all_plants_stock"],
        "transfer_costs": ["transfer_costs", "logistics_rates", "freight_costs", "shipping_rates"],

        # Agent 4
        "open_purchase_orders": ["open_purchase_orders", "open_pos", "ekko_ekpo", "aged_pos"],
        "gr_ir_ledger": ["gr_ir_ledger", "gr_ir_balances", "fbl3n", "clearing_accounts"],

        # Agent 5
        "mrp_demand_stream": ["mrp_demand_stream", "mrp_requirements", "pbim", "pbed", "demand_signals"],
        "order_amendments": ["order_amendments", "schedule_line_changes", "eket_changes", "po_changes"],
    }

    def __init__(
        self,
        connection_url: str,
        custom_table_mappings: Optional[Dict[str, str]] = None,
        custom_queries: Optional[Dict[str, str]] = None,
        fallback_to_synthetic: bool = True
    ):
        self.connection_url = connection_url.strip()
        self.custom_table_mappings = custom_table_mappings or {}
        self.custom_queries = custom_queries or {}
        self.fallback_to_synthetic = fallback_to_synthetic
        self._synthetic_fallback = FlatFileDataSource() if fallback_to_synthetic else None
        self._engine: Optional[Engine] = None
        self._cached_tables: Dict[str, List[Dict[str, Any]]] = {}

    def get_engine(self) -> Engine:
        if self._engine is None:
            # Special handling for sqlite relative path
            url = self.connection_url
            if url.startswith("sqlite:///") and not url.startswith("sqlite:////") and ":memory:" not in url:
                # Ensure valid sqlite URI
                pass
            self._engine = create_engine(url, pool_pre_ping=True)
        return self._engine

    def test_connection(self) -> Dict[str, Any]:
        """
        Executes connection handshake, measures ping latency, and returns discovered tables.
        """
        start = time.time()
        try:
            engine = self.get_engine()
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            elapsed_ms = round((time.time() - start) * 1000, 2)
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            views = inspector.get_view_names()

            return {
                "status": "CONNECTED",
                "latency_ms": elapsed_ms,
                "database_url_masked": self._mask_url(self.connection_url),
                "discovered_tables": sorted(tables),
                "discovered_views": sorted(views),
                "total_tables": len(tables) + len(views),
                "error": None
            }
        except Exception as e:
            elapsed_ms = round((time.time() - start) * 1000, 2)
            return {
                "status": "ERROR",
                "latency_ms": elapsed_ms,
                "database_url_masked": self._mask_url(self.connection_url),
                "discovered_tables": [],
                "discovered_views": [],
                "total_tables": 0,
                "error": str(e)
            }

    def _mask_url(self, url: str) -> str:
        """Masks database passwords in connection URL for safe logging/display."""
        if "@" in url and "://" in url:
            prefix, rest = url.split("://", 1)
            creds, host_part = rest.split("@", 1)
            if ":" in creds:
                user, _ = creds.split(":", 1)
                return f"{prefix}://{user}:****@{host_part}"
        return url

    def _resolve_table_or_query(self, agent_id: str, table_name: str) -> Optional[str]:
        """
        Determines the SQL query or table name to query for a given agent entity.
        """
        cache_key = f"{agent_id.lower()}::{table_name.lower().replace('.csv', '')}"
        
        # 1. Custom user query specified for this entity
        if cache_key in self.custom_queries:
            return self.custom_queries[cache_key]
        if table_name in self.custom_queries:
            return self.custom_queries[table_name]

        # 2. Custom user table mapping
        if cache_key in self.custom_table_mappings:
            return f"SELECT * FROM {self.custom_table_mappings[cache_key]}"
        if table_name in self.custom_table_mappings:
            return f"SELECT * FROM {self.custom_table_mappings[table_name]}"

        # 3. Match against discovered DB tables
        try:
            inspector = inspect(self.get_engine())
            existing_tables = [t.lower() for t in (inspector.get_table_names() + inspector.get_view_names())]
            clean_name = table_name.lower().replace(".csv", "")
            
            # Exact match
            if clean_name in existing_tables:
                return f"SELECT * FROM {clean_name}"

            # Candidate match from default mappings
            candidates = self.DEFAULT_TABLE_MAPPINGS.get(clean_name, [])
            for cand in candidates:
                if cand.lower() in existing_tables:
                    return f"SELECT * FROM {cand}"
        except Exception as e:
            logger.warning(f"Error inspecting DB tables: {e}")

        return None

    def load_table(self, agent_id: str, table_name: str, force_reload: bool = False) -> List[Dict[str, Any]]:
        cache_key = f"{agent_id.lower()}::{table_name.lower().replace('.csv', '')}"
        if not force_reload and cache_key in self._cached_tables:
            return self._cached_tables[cache_key]

        sql = self._resolve_table_or_query(agent_id, table_name)
        if sql:
            try:
                engine = self.get_engine()
                df = pd.read_sql_query(sql, con=engine)
                mapped_df = SchemaMapper.map_dataframe(df)
                records = mapped_df.to_dict(orient="records")
                cleaned_records = [
                    {k: ("" if pd.isna(v) else v) for k, v in r.items()}
                    for r in records
                ]
                self._cached_tables[cache_key] = cleaned_records
                return cleaned_records
            except Exception as e:
                logger.error(f"Error executing DB query for {cache_key} ('{sql}'): {e}")

        # Fallback to synthetic if table not present in DB
        if self.fallback_to_synthetic and self._synthetic_fallback:
            try:
                return self._synthetic_fallback.load_table(agent_id, table_name)
            except Exception as e:
                logger.warning(f"Synthetic fallback failed for {cache_key}: {e}")

        return []

    def get_demo_cases(self, agent_id: str) -> List[Dict[str, Any]]:
        """
        Extracts sample/demo case IDs dynamically from the database.
        """
        norm_id = str(agent_id).lower()
        if norm_id in ("1", "agent_1", "agent_01", "po_promise_drift"):
            pos = self.load_table(agent_id, "current_purchase_orders")
            if pos:
                cases = []
                for p in pos[:10]:
                    cases.append({
                        "case_id": f"DB-PO-{p.get('po_number', '')}",
                        "po_number": p.get("po_number", ""),
                        "supplier_id": p.get("supplier_id", ""),
                        "material_id": p.get("material_id", ""),
                        "plant_id": p.get("plant_id", ""),
                        "description": f"Live DB PO {p.get('po_number')} (Vendor: {p.get('supplier_id')})"
                    })
                return cases
        elif norm_id in ("2", "agent_2", "agent_02", "phantom_inventory"):
            inv = self.load_table(agent_id, "inventory_stock")
            if inv:
                cases = []
                for i in inv[:10]:
                    cases.append({
                        "case_id": f"DB-INV-{i.get('material_id', '')}-{i.get('plant_id', '')}",
                        "material_id": i.get("material_id", ""),
                        "plant_id": i.get("plant_id", ""),
                        "storage_location": i.get("storage_location", "SL01"),
                        "description": f"Live DB Material {i.get('material_id')} (Plant {i.get('plant_id')})"
                    })
                return cases

        # Fallback to synthetic demo cases
        if self.fallback_to_synthetic and self._synthetic_fallback:
            return self._synthetic_fallback.get_demo_cases(agent_id)
        return []

    def get_record(self, agent_id: str, table_name: str, key_column: str, key_value: Any) -> Optional[Dict[str, Any]]:
        records = self.load_table(agent_id, table_name)
        target_str = str(key_value).strip()
        canonical_key = SchemaMapper.canonical_column_name(key_column)
        for r in records:
            if str(r.get(canonical_key, r.get(key_column, ""))).strip() == target_str:
                return dict(r)
        return None

    def get_records_filtered(self, agent_id: str, table_name: str, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        records = self.load_table(agent_id, table_name)
        matched = []
        canonical_filters = {SchemaMapper.canonical_column_name(k): v for k, v in filters.items()}
        for r in records:
            match = True
            for k, expected in canonical_filters.items():
                actual = str(r.get(k, "")).strip()
                if actual != str(expected).strip():
                    match = False
                    break
            if match:
                matched.append(dict(r))
        return matched

    def clear_cache(self):
        self._cached_tables.clear()
