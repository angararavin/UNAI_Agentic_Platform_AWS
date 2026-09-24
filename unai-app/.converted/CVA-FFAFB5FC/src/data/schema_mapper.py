"""
Schema Mapper & Column Normalizer
Handles cross-ERP schema variations, mapping technical SAP names (e.g. EBELN, MATNR, WERKS)
and standard business aliases into canonical keys expected by the 5 autonomous agents.
"""

from typing import Dict, List, Any, Optional, Set
import pandas as pd
import logging

logger = logging.getLogger(__name__)

class SchemaMapper:
    """
    Intelligent schema mapping engine for SAP, legacy ERP, and generic CSV/DB inputs.
    """

    # Comprehensive alias dictionary: Canonical Key -> Set of known aliases (lowercased, stripped)
    ALIAS_MAP: Dict[str, Set[str]] = {
        # Agent 1 & Core Identifiers
        "po_number": {
            "po_number", "ebeln", "purchaseorder", "purchase_order", "po_id", 
            "ponumber", "order_id", "po", "purchasing_document", "doc_number"
        },
        "line_item": {
            "line_item", "ebelp", "item", "po_item", "line_no", "item_no", "item_id", "posnr"
        },
        "supplier_id": {
            "supplier_id", "lifnr", "vendor_id", "vendor", "supplier", "vendor_code", "partner_id"
        },
        "supplier_name": {
            "supplier_name", "name1", "vendor_name", "suppliername", "partner_name"
        },
        "material_id": {
            "material_id", "matnr", "material", "part_number", "sku", "item_code", "material_no", "part_no"
        },
        "plant_id": {
            "plant_id", "werks", "plant", "factory", "site_id", "facility", "location_id"
        },
        "order_date": {
            "order_date", "bedat", "podate", "po_date", "creation_date", "doc_date", "created_on"
        },
        "promised_delivery_date": {
            "promised_delivery_date", "eindt", "promised_date", "delivery_date", 
            "scheduled_delivery_date", "promised_delivery", "committed_date", "target_date"
        },
        "actual_delivery_date": {
            "actual_delivery_date", "budat", "gr_date", "actual_date", "receipt_date", "delivery_actual"
        },
        "order_quantity": {
            "order_quantity", "menge", "order_qty", "po_quantity", "quantity", "ordered_quantity", "qty"
        },
        "delivered_quantity": {
            "delivered_quantity", "wemng", "gr_quantity", "delivered_qty", "received_quantity", "gr_qty"
        },
        "unit_price": {
            "unit_price", "netpr", "price", "unit_cost", "rate", "cost_per_unit"
        },
        "delay_days": {
            "delay_days", "delay", "days_late", "delay_variance", "variance_days", "lateness"
        },
        "lead_time_days": {
            "lead_time_days", "plifz", "lead_time", "planned_lead_time"
        },

        # Agent 2: Inventory & Usability
        "storage_location": {
            "storage_location", "lgort", "storage_loc", "sloc", "loc_id", "bin"
        },
        "unrestricted_stock": {
            "unrestricted_stock", "labst", "unrestricted", "available_stock", "free_stock", "unrestricted_qty"
        },
        "blocked_stock": {
            "blocked_stock", "speme", "blocked", "blocked_qty", "hold_qty"
        },
        "quality_inspection_stock": {
            "quality_inspection_stock", "insme", "qi_stock", "qa_stock", "quality_stock", "inspection_stock"
        },
        "reserved_quantity": {
            "reserved_quantity", "resb_menge", "reserved_qty", "committed_qty", "reserved", "allocations"
        },
        "open_sales_order_quantity": {
            "open_sales_order_quantity", "so_menge", "sales_order_qty", "so_demand", "sales_demand"
        },
        "shelf_life_expiration_date": {
            "shelf_life_expiration_date", "vfdat", "expiry_date", "sled", "expiration_date", "best_before"
        },
        "batch_number": {
            "batch_number", "charg", "batch", "lot_number", "lot_id"
        },

        # Agent 3: Twin Location
        "source_plant_id": {
            "source_plant_id", "source_plant", "from_plant", "surplus_plant", "supplying_plant", "src_plant"
        },
        "destination_plant_id": {
            "destination_plant_id", "destination_plant", "to_plant", "deficit_plant", "receiving_plant", "target_plant", "dest_plant"
        },
        "transit_time_days": {
            "transit_time_days", "transit_days", "transfer_time", "transit_time", "transport_time"
        },
        "transfer_cost_per_unit": {
            "transfer_cost_per_unit", "freight_cost", "shipping_cost", "transfer_freight_cost", "freight_rate"
        },
        "stockout_penalty_per_unit": {
            "stockout_penalty_per_unit", "penalty_per_unit", "stockout_cost", "downtime_penalty", "penalty_cost"
        },
        "distance_km": {
            "distance_km", "distance", "dist_km", "distance_miles"
        },

        # Agent 4: PO Aging
        "days_open": {
            "days_open", "po_age_days", "aging_days", "days_aged", "age_days", "open_days"
        },
        "gr_amount": {
            "gr_amount", "gr_value", "goods_receipt_amount", "gr_total", "wrbtr_gr"
        },
        "ir_amount": {
            "ir_amount", "ir_value", "invoice_amount", "ir_total", "wrbtr_ir"
        },
        "gr_ir_discrepancy": {
            "gr_ir_discrepancy", "gr_ir_diff", "imbalance_amount", "gr_ir_gap", "variance_amount"
        },
        "last_activity_date": {
            "last_activity_date", "last_touch_date", "modified_date", "last_receipt_date", "aedat"
        },

        # Agent 5: Contradiction & Demand
        "demand_source": {
            "demand_source", "origin", "source_type", "stream", "signal_type", "mrp_element"
        },
        "demand_quantity": {
            "demand_quantity", "req_quantity", "requirement_qty", "forecast_qty", "demand_qty", "plan_menge"
        },
        "requirement_date": {
            "requirement_date", "need_date", "due_date", "target_date", "mrp_date", "bdatu"
        },
        "frequency_changes": {
            "frequency_changes", "change_count", "oscillation_count", "revisions", "changes_last_30d"
        }
    }

    # Inverted lookup table: alias -> canonical key
    _LOOKUP: Dict[str, str] = {}
    for canonical, aliases in ALIAS_MAP.items():
        for a in aliases:
            _LOOKUP[a] = canonical

    @classmethod
    def canonical_column_name(cls, col_name: str) -> str:
        """
        Translates any column name to its canonical name if recognized,
        or returns clean snake_case otherwise.
        """
        cleaned = str(col_name).strip().lower().replace(" ", "_").replace("-", "_").replace(".", "_")
        return cls._LOOKUP.get(cleaned, cleaned)

    @classmethod
    def map_record(cls, record: Dict[str, Any]) -> Dict[str, Any]:
        """
        Maps a single dictionary record to use canonical column names.
        """
        mapped: Dict[str, Any] = {}
        for k, v in record.items():
            canonical_k = cls.canonical_column_name(k)
            # Retain first found or non-empty value
            if canonical_k not in mapped or (mapped[canonical_k] in (None, "", "null") and v not in (None, "", "null")):
                mapped[canonical_k] = v
        return mapped

    @classmethod
    def map_dataframe(cls, df: pd.DataFrame) -> pd.DataFrame:
        """
        Maps all column names in a pandas DataFrame to canonical names.
        """
        new_cols = {col: cls.canonical_column_name(col) for col in df.columns}
        renamed = df.rename(columns=new_cols)
        # Handle duplicate columns if any resulted from mapping
        renamed = renamed.loc[:, ~renamed.columns.duplicated()]
        return renamed

    @classmethod
    def inspect_schema(cls, columns: List[str]) -> Dict[str, Any]:
        """
        Inspects given columns and reports which canonical fields were matched.
        """
        detected: Dict[str, str] = {}
        unrecognized: List[str] = []
        for col in columns:
            canonical = cls.canonical_column_name(col)
            if canonical in cls.ALIAS_MAP:
                detected[col] = canonical
            else:
                unrecognized.append(col)

        return {
            "total_columns": len(columns),
            "matched_canonical_fields": detected,
            "unrecognized_columns": unrecognized,
            "recognized_ratio": round(len(detected) / max(len(columns), 1), 2)
        }
