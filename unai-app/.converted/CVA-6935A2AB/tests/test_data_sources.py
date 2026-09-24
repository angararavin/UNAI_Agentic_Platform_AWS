"""
Tests for Data Sources, SchemaMapper, Custom Flat Files, and Relational Databases.
Validates that users can plug in any database or flat files, with seamless synthetic fallback.
"""

import pytest
import sqlite3
import pandas as pd
from typing import Dict, Any

from src.data.schema_mapper import SchemaMapper
from src.data.flat_file_custom_source import CustomFlatFileDataSource
from src.data.db_source import DatabaseDataSource
from src.data.manager import DataSourceManager, DataSourceMode
from src.agents import get_agent

def test_schema_mapper_sap_german_aliases():
    """Validates that German SAP technical field names are mapped to canonical keys."""
    sap_record = {
        "EBELN": "450099999",
        "EBELP": "10",
        "LIFNR": "SUP9999",
        "MATNR": "MAT9999",
        "WERKS": "1000",
        "LGORT": "0001",
        "MENGE": "250",
        "NETPR": "150.75",
        "LABST": "1200",
        "SPEME": "50"
    }

    mapped = SchemaMapper.map_record(sap_record)
    assert mapped["po_number"] == "450099999"
    assert mapped["line_item"] == "10"
    assert mapped["supplier_id"] == "SUP9999"
    assert mapped["material_id"] == "MAT9999"
    assert mapped["plant_id"] == "1000"
    assert mapped["storage_location"] == "0001"
    assert mapped["order_quantity"] == "250"
    assert mapped["unit_price"] == "150.75"
    assert mapped["unrestricted_stock"] == "1200"
    assert mapped["blocked_stock"] == "50"

def test_schema_mapper_dataframe():
    """Validates DataFrame column renaming and inspection."""
    df = pd.DataFrame([
        {"PurchaseOrder": "PO-101", "Vendor": "VEND1", "Material": "MAT1", "Plant": "PL01", "Quantity": 100},
        {"PurchaseOrder": "PO-102", "Vendor": "VEND2", "Material": "MAT2", "Plant": "PL02", "Quantity": 200}
    ])

    mapped_df = SchemaMapper.map_dataframe(df)
    assert "po_number" in mapped_df.columns
    assert "supplier_id" in mapped_df.columns
    assert "material_id" in mapped_df.columns
    assert "plant_id" in mapped_df.columns
    assert "order_quantity" in mapped_df.columns
    assert mapped_df["po_number"].iloc[0] == "PO-101"

    inspection = SchemaMapper.inspect_schema(list(df.columns))
    assert inspection["total_columns"] == 5
    assert inspection["recognized_ratio"] == 1.0

def test_custom_flat_file_data_source(tmp_path):
    """Validates CustomFlatFileDataSource registering and querying custom DataFrames."""
    ds = CustomFlatFileDataSource(upload_dir=tmp_path / "uploads", fallback_to_synthetic=True)

    # Register custom purchase orders
    custom_pos = pd.DataFrame([
        {"EBELN": "CUSTOM-PO-1", "LIFNR": "SUP-CUST-1", "MATNR": "MAT-CUST-1", "WERKS": "PL01", "MENGE": 1000},
        {"EBELN": "CUSTOM-PO-2", "LIFNR": "SUP-CUST-2", "MATNR": "MAT-CUST-2", "WERKS": "PL02", "MENGE": 2000}
    ])

    ds.register_dataframe("agent_01", "current_purchase_orders", custom_pos, source_name="custom_po.csv")

    loaded = ds.load_table("agent_01", "current_purchase_orders")
    assert len(loaded) == 2
    assert loaded[0]["po_number"] == "CUSTOM-PO-1"
    assert loaded[0]["supplier_id"] == "SUP-CUST-1"

    # Test dynamic demo cases derivation
    cases = ds.get_demo_cases("agent_01")
    assert len(cases) == 2
    assert cases[0]["po_number"] == "CUSTOM-PO-1"

def test_database_data_source_sqlite(tmp_path):
    """Validates DatabaseDataSource with SQLite database."""
    db_file = tmp_path / "test_sap.db"
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()

    # Create tables
    cursor.execute("""
    CREATE TABLE purchase_orders (
        ebeln TEXT PRIMARY KEY,
        lifnr TEXT,
        matnr TEXT,
        werks TEXT,
        menge REAL
    )
    """)
    cursor.execute("INSERT INTO purchase_orders VALUES ('SQL-PO-1', 'SUP-SQL-1', 'MAT-SQL-1', 'PL01', 500)")
    cursor.execute("INSERT INTO purchase_orders VALUES ('SQL-PO-2', 'SUP-SQL-2', 'MAT-SQL-2', 'PL02', 750)")
    conn.commit()
    conn.close()

    db_url = f"sqlite:///{db_file}"
    ds = DatabaseDataSource(
        connection_url=db_url,
        custom_table_mappings={"current_purchase_orders": "purchase_orders"},
        fallback_to_synthetic=True
    )

    # Test connection
    test_res = ds.test_connection()
    assert test_res["status"] == "CONNECTED"
    assert "purchase_orders" in test_res["discovered_tables"]

    # Load table with automatic schema mapping
    records = ds.load_table("agent_01", "current_purchase_orders")
    assert len(records) == 2
    assert records[0]["po_number"] == "SQL-PO-1"
    assert records[0]["supplier_id"] == "SUP-SQL-1"
    assert records[0]["order_quantity"] == 500

    # Get dynamic demo cases
    cases = ds.get_demo_cases("agent_01")
    assert len(cases) == 2
    assert cases[0]["po_number"] == "SQL-PO-1"

def test_data_source_manager_switching(tmp_path):
    """Validates switching modes between Synthetic, Custom Flat Files, and Database."""
    manager = DataSourceManager(config_dir=str(tmp_path / "config"))

    # Initial mode: SYNTHETIC
    assert manager.active_mode == DataSourceMode.SYNTHETIC
    status = manager.get_status()
    assert "Synthetic Benchmark" in status["display_name"]

    # Switch to CUSTOM_FLAT_FILE
    manager.set_mode(DataSourceMode.CUSTOM_FLAT_FILE)
    assert manager.active_mode == DataSourceMode.CUSTOM_FLAT_FILE

    # Configure and switch to DATABASE
    db_file = tmp_path / "mgr_test.db"
    conn = sqlite3.connect(db_file)
    conn.execute("CREATE TABLE dummy (id INT)")
    conn.commit()
    conn.close()

    res = manager.configure_database(f"sqlite:///{db_file}", activate=True)
    assert res["test_result"]["status"] == "CONNECTED"
    assert manager.active_mode == DataSourceMode.DATABASE

    # Reset back to SYNTHETIC
    manager.set_mode(DataSourceMode.SYNTHETIC)
    assert manager.active_mode == DataSourceMode.SYNTHETIC

def test_agent_execution_with_custom_source(tmp_path):
    """Validates that an agent workflow executes successfully using a custom data source."""
    ds = CustomFlatFileDataSource(upload_dir=tmp_path / "uploads", fallback_to_synthetic=True)

    # Register custom PO record
    custom_pos = pd.DataFrame([{
        "po_number": "450099001",
        "supplier_id": "SUP1001",
        "material_id": "MAT1001",
        "plant_id": "PL01",
        "order_quantity": 400
    }])
    ds.register_dataframe("agent_01", "current_purchase_orders", custom_pos)

    # Get agent initialized with custom data source
    agent = get_agent("agent_01", data_source=ds)
    assert agent.ds == ds

    # Execute workflow on custom case
    result = agent.run({"case_id": "450099001", "po_number": "450099001"})
    assert result is not None
    assert "deterministic_metrics" in result
    assert "policy_evaluation" in result

def test_custom_folder_ingestion(tmp_path):
    """Validates scanning and ingesting an entire directory of CSV and Excel files."""
    folder = tmp_path / "sap_data_dump"
    folder.mkdir()

    # Create multiple files in the directory
    po_df = pd.DataFrame([
        {"EBELN": "DIR-PO-100", "LIFNR": "SUP-DIR-1", "MATNR": "MAT-DIR-1", "MENGE": 650}
    ])
    po_df.to_csv(folder / "sap_purchase_orders.csv", index=False)

    stock_df = pd.DataFrame([
        {"MATNR": "MAT-DIR-1", "WERKS": "1000", "LGORT": "0001", "LABST": 1500}
    ])
    stock_df.to_csv(folder / "warehouse_inventory_stock.csv", index=False)

    # Ingest folder
    manager = DataSourceManager(config_dir=str(tmp_path / "config"))
    res = manager.ingest_custom_folder(folder)

    assert res["status"] == "SUCCESS"
    assert res["files_scanned"] == 2
    assert len(res["tables_ingested"]) == 2
    assert manager.active_mode == DataSourceMode.CUSTOM_FLAT_FILE

    # Verify tables are accessible
    active_source = manager.get_active_source()
    pos = active_source.load_table("agent_01", "current_purchase_orders")
    assert len(pos) == 1
    assert pos[0]["po_number"] == "DIR-PO-100"
