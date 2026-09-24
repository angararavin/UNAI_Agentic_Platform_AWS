"""
Data Source Manager
Central orchestrator for data sources across all 5 SAP autonomous agents.
Allows seamless switching between Synthetic Benchmark Data (demo mode),
Custom Flat Files (CSV, Excel, JSON, Local Folders), and Relational Databases (SQL).
"""

import json
import logging
from enum import Enum
from pathlib import Path
from typing import Dict, Any, Optional, List, Union

from src.data.datasource import BaseDataSource
from src.data.flat_file_source import FlatFileDataSource
from src.data.flat_file_custom_source import CustomFlatFileDataSource
from src.data.db_source import DatabaseDataSource

logger = logging.getLogger(__name__)

class DataSourceMode(str, Enum):
    SYNTHETIC = "SYNTHETIC"
    CUSTOM_FLAT_FILE = "CUSTOM_FLAT_FILE"
    DATABASE = "DATABASE"

class DataSourceManager:
    """
    Singleton data source manager.
    Maintains active data source configuration, persistence, and agent routing.
    """

    _instance: Optional["DataSourceManager"] = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(DataSourceManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, config_dir: Optional[str] = None):
        if getattr(self, "_initialized", False) and config_dir is None:
            return

        self.config_dir = Path(config_dir or "data/config").resolve()
        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.config_file = self.config_dir / "data_sources.json"

        # Instantiate sub-sources
        self.synthetic_source = FlatFileDataSource()
        self.custom_flat_file_source = CustomFlatFileDataSource(fallback_to_synthetic=True)
        self.database_source: Optional[DatabaseDataSource] = None

        # Default mode is SYNTHETIC benchmark data
        self.active_mode: DataSourceMode = DataSourceMode.SYNTHETIC
        self.active_folder_path: Optional[str] = None
        self.active_db_url: Optional[str] = None
        self.db_table_mappings: Dict[str, str] = {}
        self.db_custom_queries: Dict[str, str] = {}
        self.saved_db_profiles: List[Dict[str, Any]] = []

        # Load persisted config if available
        self._load_config()
        self._initialized = True

    def get_active_source(self) -> BaseDataSource:
        """Returns the currently active data source implementation."""
        if self.active_mode == DataSourceMode.CUSTOM_FLAT_FILE:
            return self.custom_flat_file_source
        elif self.active_mode == DataSourceMode.DATABASE and self.database_source:
            return self.database_source
        else:
            return self.synthetic_source

    def set_mode(self, mode: DataSourceMode) -> Dict[str, Any]:
        """Switches the active data ingestion mode."""
        self.active_mode = mode
        self._save_config()
        logger.info(f"Switched data source mode to: {self.active_mode.value}")
        return self.get_status()

    def ingest_custom_folder(self, folder_path: Union[str, Path]) -> Dict[str, Any]:
        """
        Ingests all flat files (CSV, Excel, JSON, Parquet) from a specified local directory,
        activates CUSTOM_FLAT_FILE mode, and persists the setting.
        """
        res = self.custom_flat_file_source.ingest_folder(folder_path)
        self.active_folder_path = str(Path(folder_path).resolve())
        self.active_mode = DataSourceMode.CUSTOM_FLAT_FILE
        self._save_config()
        return res

    def configure_database(
        self,
        connection_url: str,
        custom_table_mappings: Optional[Dict[str, str]] = None,
        custom_queries: Optional[Dict[str, str]] = None,
        profile_name: Optional[str] = None,
        activate: bool = True
    ) -> Dict[str, Any]:
        """Configures, optionally saves profile, and optionally activates a relational database source."""
        self.active_db_url = connection_url.strip()
        self.db_table_mappings = custom_table_mappings or {}
        self.db_custom_queries = custom_queries or {}

        self.database_source = DatabaseDataSource(
            connection_url=self.active_db_url,
            custom_table_mappings=self.db_table_mappings,
            custom_queries=self.db_custom_queries,
            fallback_to_synthetic=True
        )

        test_result = self.database_source.test_connection()
        if activate and test_result.get("status") == "CONNECTED":
            self.active_mode = DataSourceMode.DATABASE

        if profile_name:
            # Check if profile name already exists, update or add
            existing = next((p for p in self.saved_db_profiles if p.get("name") == profile_name), None)
            if existing:
                existing["connection_url"] = self.active_db_url
                existing["table_mappings"] = self.db_table_mappings
            else:
                self.saved_db_profiles.append({
                    "name": profile_name,
                    "connection_url": self.active_db_url,
                    "table_mappings": self.db_table_mappings,
                    "masked_url": self.database_source._mask_url(self.active_db_url)
                })

        self._save_config()
        return {
            "test_result": test_result,
            "status": self.get_status()
        }

    def get_saved_db_profiles(self) -> List[Dict[str, Any]]:
        """Returns list of saved database connection profiles."""
        return self.saved_db_profiles

    def delete_db_profile(self, profile_name: str):
        """Removes a saved database profile."""
        self.saved_db_profiles = [p for p in self.saved_db_profiles if p.get("name") != profile_name]
        self._save_config()

    def get_status(self) -> Dict[str, Any]:
        """Returns the current data source health and configuration status."""
        active_source = self.get_active_source()
        is_synthetic = self.active_mode == DataSourceMode.SYNTHETIC
        is_custom_file = self.active_mode == DataSourceMode.CUSTOM_FLAT_FILE
        is_db = self.active_mode == DataSourceMode.DATABASE

        db_test = None
        if self.database_source:
            db_test = self.database_source.test_connection()

        return {
            "active_mode": self.active_mode.value,
            "display_name": (
                "🟢 Synthetic Benchmark Datasets (Demo Mode)" if is_synthetic else
                "📂 Custom Flat Files & Folders" if is_custom_file else
                "🗄️ Relational Database (SQL)"
            ),
            "source_class": active_source.__class__.__name__,
            "active_folder_path": self.active_folder_path,
            "database_connected": bool(self.database_source and db_test and db_test.get("status") == "CONNECTED"),
            "database_url_masked": self.database_source._mask_url(self.active_db_url) if (self.database_source and self.active_db_url) else None,
            "custom_uploaded_tables": self.custom_flat_file_source.list_uploaded_tables(),
            "saved_db_profiles": self.saved_db_profiles,
            "config_file": str(self.config_file)
        }

    def _save_config(self):
        try:
            payload = {
                "active_mode": self.active_mode.value,
                "active_folder_path": self.active_folder_path,
                "active_db_url": self.active_db_url,
                "db_table_mappings": self.db_table_mappings,
                "db_custom_queries": self.db_custom_queries,
                "saved_db_profiles": self.saved_db_profiles,
            }
            with open(self.config_file, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
        except Exception as e:
            logger.warning(f"Failed to persist data source config: {e}")

    def _load_config(self):
        if not self.config_file.exists():
            return
        try:
            with open(self.config_file, "r", encoding="utf-8") as f:
                payload = json.load(f)
            mode_str = payload.get("active_mode", "SYNTHETIC")
            self.active_mode = DataSourceMode(mode_str)
            self.active_folder_path = payload.get("active_folder_path")
            self.active_db_url = payload.get("active_db_url")
            self.db_table_mappings = payload.get("db_table_mappings", {})
            self.db_custom_queries = payload.get("db_custom_queries", {})
            self.saved_db_profiles = payload.get("saved_db_profiles", [])

            if self.active_db_url:
                self.database_source = DatabaseDataSource(
                    connection_url=self.active_db_url,
                    custom_table_mappings=self.db_table_mappings,
                    custom_queries=self.db_custom_queries,
                    fallback_to_synthetic=True
                )
            
            # If a custom folder was active, re-ingest it silently if it exists
            if self.active_folder_path and Path(self.active_folder_path).exists():
                try:
                    self.custom_flat_file_source.ingest_folder(self.active_folder_path)
                except Exception:
                    pass
        except Exception as e:
            logger.warning(f"Failed to load data source config: {e}")

# Global singleton instance
data_source_manager = DataSourceManager()
