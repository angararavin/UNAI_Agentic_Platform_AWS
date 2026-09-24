"""
Custom Flat File Data Source
Allows users to upload and query custom CSV, Excel (.xlsx/.xls), JSON, or Parquet files.
Applies intelligent SchemaMapper normalization and provides dynamic test cases.
"""

import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Union
import pandas as pd

from src.data.datasource import BaseDataSource
from src.data.schema_mapper import SchemaMapper
from src.data.flat_file_source import FlatFileDataSource

logger = logging.getLogger(__name__)

class CustomFlatFileDataSource(BaseDataSource):
    """
    Data source for user-supplied flat files.
    Enables custom CSV, Excel, and JSON ingestion with automatic schema mapping.
    """

    def __init__(self, upload_dir: Optional[Union[str, Path]] = None, fallback_to_synthetic: bool = True):
        self.upload_dir = Path(upload_dir or "data/custom_uploads").resolve()
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.fallback_to_synthetic = fallback_to_synthetic
        self._synthetic_fallback = FlatFileDataSource() if fallback_to_synthetic else None
        self._cache: Dict[str, List[Dict[str, Any]]] = {}
        self._metadata: Dict[str, Dict[str, Any]] = {}

    def _cache_key(self, agent_id: str, table_name: str) -> str:
        clean_table = str(table_name).lower().replace(".csv", "").replace(".xlsx", "").replace(".json", "")
        return f"{agent_id.lower()}::{clean_table}"

    def register_dataframe(self, agent_id: str, table_name: str, df: pd.DataFrame, source_name: str = "Uploaded File"):
        """
        Directly registers a pandas DataFrame as a named table for an agent.
        """
        mapped_df = SchemaMapper.map_dataframe(df)
        records = mapped_df.to_dict(orient="records")
        # Clean null values
        cleaned_records = [
            {k: ("" if pd.isna(v) else v) for k, v in r.items()}
            for r in records
        ]
        cache_key = self._cache_key(agent_id, table_name)
        self._cache[cache_key] = cleaned_records
        self._metadata[cache_key] = {
            "source_name": source_name,
            "row_count": len(cleaned_records),
            "columns": list(mapped_df.columns),
        }
        logger.info(f"Registered {len(cleaned_records)} rows into {cache_key} from {source_name}")

    def ingest_file(self, agent_id: str, table_name: str, file_path_or_buffer: Any, filename: str) -> Dict[str, Any]:
        """
        Parses an uploaded file buffer or path (CSV, Excel, JSON, Parquet),
        normalizes column headers, and saves to storage and cache.
        """
        name_lower = filename.lower()
        if name_lower.endswith(".csv"):
            df = pd.read_csv(file_path_or_buffer)
        elif name_lower.endswith((".xlsx", ".xls")):
            df = pd.read_excel(file_path_or_buffer)
        elif name_lower.endswith(".json"):
            df = pd.read_json(file_path_or_buffer)
        elif name_lower.endswith(".parquet"):
            df = pd.read_parquet(file_path_or_buffer)
        else:
            # Attempt default CSV parse
            df = pd.read_csv(file_path_or_buffer)

        # Save to disk persistence
        agent_dir = self.upload_dir / agent_id.lower()
        agent_dir.mkdir(parents=True, exist_ok=True)
        clean_table = table_name.lower().replace(".csv", "")
        saved_csv_path = agent_dir / f"{clean_table}.csv"
        
        # Save canonical mapped CSV
        mapped_df = SchemaMapper.map_dataframe(df)
        mapped_df.to_csv(saved_csv_path, index=False)

        self.register_dataframe(agent_id, table_name, df, source_name=filename)
        return {
            "table_name": table_name,
            "filename": filename,
            "rows": len(df),
            "columns": list(mapped_df.columns),
            "saved_path": str(saved_csv_path)
        }

    def load_table(self, agent_id: str, table_name: str, force_reload: bool = False) -> List[Dict[str, Any]]:
        cache_key = self._cache_key(agent_id, table_name)
        if not force_reload and cache_key in self._cache:
            return self._cache[cache_key]

        # Check if saved file exists in upload_dir
        clean_table = table_name.lower().replace(".csv", "")
        agent_dir = self.upload_dir / agent_id.lower()
        csv_file = agent_dir / f"{clean_table}.csv"

        if csv_file.exists():
            df = pd.read_csv(csv_file)
            self.register_dataframe(agent_id, table_name, df, source_name=csv_file.name)
            return self._cache[cache_key]

        # If not uploaded, fallback to synthetic data if enabled
        if self.fallback_to_synthetic and self._synthetic_fallback:
            try:
                return self._synthetic_fallback.load_table(agent_id, table_name)
            except Exception as e:
                logger.warning(f"Synthetic fallback failed for {agent_id}/{table_name}: {e}")

        return []

    def get_demo_cases(self, agent_id: str) -> List[Dict[str, Any]]:
        """
        Dynamically generates test cases based on user-uploaded records.
        """
        norm_id = str(agent_id).lower()
        # Derive primary keys based on agent type
        if norm_id in ("1", "agent_1", "agent_01", "po_promise_drift"):
            pos = self.load_table(agent_id, "current_purchase_orders")
            if pos:
                cases = []
                for p in pos[:10]:
                    cases.append({
                        "case_id": f"CUST-PO-{p.get('po_number', '')}",
                        "po_number": p.get("po_number", ""),
                        "supplier_id": p.get("supplier_id", ""),
                        "material_id": p.get("material_id", ""),
                        "plant_id": p.get("plant_id", ""),
                        "description": f"Custom PO {p.get('po_number')} ({p.get('supplier_id')})"
                    })
                return cases
        elif norm_id in ("2", "agent_2", "agent_02", "phantom_inventory"):
            inv = self.load_table(agent_id, "inventory_stock")
            if inv:
                cases = []
                for i in inv[:10]:
                    cases.append({
                        "case_id": f"CUST-INV-{i.get('material_id', '')}-{i.get('plant_id', '')}",
                        "material_id": i.get("material_id", ""),
                        "plant_id": i.get("plant_id", ""),
                        "storage_location": i.get("storage_location", "SL01"),
                        "description": f"Custom Material {i.get('material_id')} at Plant {i.get('plant_id')}"
                    })
                return cases
        elif norm_id in ("3", "agent_3", "agent_03", "twin_location"):
            pairs = self.load_table(agent_id, "twin_plant_pairs")
            if pairs:
                cases = []
                for pr in pairs[:10]:
                    cases.append({
                        "case_id": f"CUST-TWIN-{pr.get('material_id', '')}",
                        "material_id": pr.get("material_id", ""),
                        "source_plant": pr.get("source_plant_id", ""),
                        "destination_plant": pr.get("destination_plant_id", ""),
                        "description": f"Twin Pair {pr.get('source_plant_id')} -> {pr.get('destination_plant_id')}"
                    })
                return cases

        # Fallback to synthetic demo cases if custom cases cannot be derived
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

    def list_uploaded_tables(self) -> Dict[str, List[str]]:
        """Returns dict of agent_id -> list of custom uploaded table names."""
        result: Dict[str, List[str]] = {}
        for agent_dir in self.upload_dir.iterdir():
            if agent_dir.is_dir():
                tables = [f.stem for f in agent_dir.glob("*.csv")]
                result[agent_dir.name] = sorted(tables)
        return result

    def auto_detect_target(self, filename: str, df: pd.DataFrame) -> tuple[str, str]:
        """
        Determines the most likely (agent_id, table_name) based on filename and schema.
        """
        fn = filename.lower()
        cols = [SchemaMapper.canonical_column_name(c) for c in df.columns]

        # Agent 1 candidates
        if "delivery" in fn or "delay" in fn or "ekbe" in fn or "delay_days" in cols:
            return "agent_01", "historical_po_deliveries"
        if "po" in fn or "order" in fn or "ekpo" in fn or ("po_number" in cols and "delivered_quantity" not in cols):
            return "agent_01", "current_purchase_orders"
        if "mrp" in fn or "md04" in fn or "downstream" in fn:
            return "agent_01", "mrp_supply_context"

        # Agent 2 candidates
        if "quality" in fn or "qals" in fn or "insme" in cols or "quality_inspection_stock" in cols:
            return "agent_02", "quality_inspection"
        if "reservation" in fn or "resb" in fn or "reserved_quantity" in cols:
            return "agent_02", "stock_reservations"
        if "batch" in fn or "mcha" in fn or "sled" in fn or "shelf_life_expiration_date" in cols:
            return "agent_02", "batch_master"
        if "stock" in fn or "inventory" in fn or "mard" in fn or "unrestricted_stock" in cols or "labst" in fn:
            return "agent_02", "inventory_stock"

        # Agent 3 candidates
        if "twin" in fn or "transfer" in fn or "lane" in fn or ("source_plant_id" in cols and "destination_plant_id" in cols):
            return "agent_03", "twin_plant_pairs"
        if "freight" in fn or "logistics" in fn or "transfer_cost_per_unit" in cols:
            return "agent_03", "transfer_costs"

        # Agent 4 candidates
        if "aging" in fn or "aged" in fn or "days_open" in cols or "open_purchase_orders" in fn:
            return "agent_04", "open_purchase_orders"
        if "gr_ir" in fn or "grir" in fn or "ledger" in fn or "gr_ir_discrepancy" in cols:
            return "agent_04", "gr_ir_ledger"

        # Agent 5 candidates
        if "demand" in fn or "contradiction" in fn or "forecast" in fn or "frequency_changes" in cols or "demand_source" in cols:
            return "agent_05", "mrp_demand_stream"

        # Fallback default
        if "po_number" in cols:
            return "agent_01", "current_purchase_orders"
        elif "material_id" in cols:
            return "agent_02", "inventory_stock"
        return "agent_01", Path(filename).stem.lower().replace(" ", "_")

    def ingest_folder(self, folder_path: Union[str, Path]) -> Dict[str, Any]:
        """
        Scans a local directory, discovers all flat files (CSV, Excel, JSON, Parquet),
        auto-detects agent and table mappings, and ingests them.
        """
        p = Path(folder_path).resolve()
        if not p.exists() or not p.is_dir():
            raise FileNotFoundError(f"Directory not found: '{folder_path}'")

        supported_extensions = {".csv", ".xlsx", ".xls", ".json", ".parquet"}
        found_files = [f for f in p.iterdir() if f.is_file() and f.suffix.lower() in supported_extensions]

        ingested_tables = []
        for f in sorted(found_files):
            try:
                if f.suffix.lower() == ".csv":
                    df = pd.read_csv(f)
                elif f.suffix.lower() in (".xlsx", ".xls"):
                    df = pd.read_excel(f)
                elif f.suffix.lower() == ".json":
                    df = pd.read_json(f)
                elif f.suffix.lower() == ".parquet":
                    df = pd.read_parquet(f)
                else:
                    df = pd.read_csv(f)

                agent_id, table_name = self.auto_detect_target(f.name, df)
                self.register_dataframe(agent_id, table_name, df, source_name=f.name)

                # Persist to upload storage
                agent_dir = self.upload_dir / agent_id.lower()
                agent_dir.mkdir(parents=True, exist_ok=True)
                mapped_df = SchemaMapper.map_dataframe(df)
                mapped_df.to_csv(agent_dir / f"{table_name}.csv", index=False)

                ingested_tables.append({
                    "file_name": f.name,
                    "target_agent": agent_id,
                    "table_name": table_name,
                    "row_count": len(df),
                    "columns_count": len(mapped_df.columns)
                })
            except Exception as e:
                logger.warning(f"Error parsing file {f.name}: {e}")

        return {
            "status": "SUCCESS",
            "folder_path": str(p),
            "files_scanned": len(found_files),
            "tables_ingested": ingested_tables
        }

    def clear_cache(self):
        self._cache.clear()
