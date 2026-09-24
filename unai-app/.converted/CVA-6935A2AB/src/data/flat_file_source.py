import csv
from pathlib import Path
from typing import List, Dict, Any, Optional
from src.data.datasource import BaseDataSource
from src.data.path_resolver import PathResolver

class FlatFileDataSource(BaseDataSource):
    """
    Concrete data source implementation for flat-file CSV synthetic datasets.
    Provides fast, cached table access and filtering for all 5 SAP supply chain agents.
    """

    def __init__(self, base_dir: Optional[str] = None):
        self.resolver = PathResolver(base_dir)
        self._cache: Dict[str, List[Dict[str, Any]]] = {}

    def _cache_key(self, agent_id: str, table_name: str) -> str:
        return f"{agent_id.lower()}::{table_name.lower().replace('.csv', '')}"

    def load_table(self, agent_id: str, table_name: str, force_reload: bool = False) -> List[Dict[str, Any]]:
        cache_key = self._cache_key(agent_id, table_name)
        if not force_reload and cache_key in self._cache:
            return self._cache[cache_key]

        csv_path = self.resolver.get_csv_path(agent_id, table_name)
        records: List[Dict[str, Any]] = []

        with open(csv_path, mode="r", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Strip keys and clean whitespace
                cleaned_row = {k.strip() if k else "": v.strip() if isinstance(v, str) else v for k, v in row.items() if k}
                records.append(cleaned_row)

        self._cache[cache_key] = records
        return records

    def get_demo_cases(self, agent_id: str) -> List[Dict[str, Any]]:
        return self.load_table(agent_id, "demo_cases.csv")

    def get_record(self, agent_id: str, table_name: str, key_column: str, key_value: Any) -> Optional[Dict[str, Any]]:
        records = self.load_table(agent_id, table_name)
        target_str = str(key_value).strip()
        for r in records:
            if str(r.get(key_column, "")).strip() == target_str:
                return dict(r)
        return None

    def get_records_filtered(self, agent_id: str, table_name: str, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        records = self.load_table(agent_id, table_name)
        matched = []
        for r in records:
            match = True
            for k, expected in filters.items():
                actual = str(r.get(k, "")).strip()
                if actual != str(expected).strip():
                    match = False
                    break
            if match:
                matched.append(dict(r))
        return matched

    def clear_cache(self):
        self._cache.clear()
