import csv
import os
from pathlib import Path
from typing import Dict, List, Any, Optional

from backend.config import DATA_DIR

class EnterpriseDataLoader:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(EnterpriseDataLoader, cls).__new__(cls, *args, **kwargs)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, data_dir: Optional[Path] = None):
        if self._initialized:
            return
        self.data_dir = data_dir or DATA_DIR
        self.reload_all()
        self._initialized = True

    def reload_all(self):
        """Loads and indexes all enterprise flat files into high-performance memory structures."""
        self.agents: Dict[str, Dict[str, Any]] = {}
        self.bom_by_fg: Dict[str, List[Dict[str, Any]]] = {}
        self.bom_by_part: Dict[str, List[Dict[str, Any]]] = {}
        self.bom_by_vendor: Dict[str, List[Dict[str, Any]]] = {}
        self.finished_goods: Dict[str, Dict[str, Any]] = {}
        self.fg_by_plant: Dict[str, List[str]] = {}
        self.inventory_by_part: Dict[str, List[Dict[str, Any]]] = {}
        self.inventory_by_plant_part: Dict[str, Dict[str, Any]] = {}
        self.capacity_by_plant: Dict[str, List[Dict[str, Any]]] = {}
        self.customers: List[Dict[str, Any]] = []
        self.customers_by_id: Dict[str, Dict[str, Any]] = {}
        self.alt_sources_by_part: Dict[str, List[Dict[str, Any]]] = {}
        self.conflicts: List[Dict[str, Any]] = []
        self.cumulative_impact: List[Dict[str, Any]] = []
        self.timephased_by_signal: Dict[str, List[Dict[str, Any]]] = {}
        self.suppliers_master: Dict[str, Dict[str, Any]] = {}

        self._load_agents()
        self._load_finished_goods()
        self._load_bom()
        self._load_inventory()
        self._load_capacity()
        self._load_customers()
        self._load_alt_sources()
        self._load_conflicts()
        self._load_cumulative_impact()
        self._load_timephased()
        self._load_suppliers()

    def _get_path(self, filename: str) -> Path:
        return self.data_dir / filename

    def _read_csv(self, filename: str) -> List[Dict[str, str]]:
        path = self._get_path(filename)
        if not path.exists():
            return []
        rows = []
        with open(path, mode='r', encoding='utf-8', errors='ignore') as f:
            reader = csv.DictReader(f)
            for row in reader:
                clean_row = {k.strip(): v.strip() for k, v in row.items() if k is not None}
                rows.append(clean_row)
        return rows

    def _load_agents(self):
        rows = self._read_csv("agents.csv")
        for r in rows:
            aid = r.get("agent_id")
            if aid:
                self.agents[aid] = r

    def _load_finished_goods(self):
        rows = self._read_csv("finished_goods.csv")
        for r in rows:
            fg_id = r.get("fg_id")
            if not fg_id:
                continue
            item = {
                "fg_id": fg_id,
                "description": r.get("description", ""),
                "program": r.get("program", ""),
                "fg_family": r.get("fg_family", ""),
                "plant_id": r.get("plant_id", ""),
                "price_usd": float(r.get("price_usd", 0) or 0),
                "std_cost_usd": float(r.get("std_cost_usd", 0) or 0),
                "margin_pct": float(r.get("margin_pct", 0) or 0),
                "weekly_volume": int(float(r.get("weekly_volume", 0) or 0)),
                "lifecycle": r.get("lifecycle", "")
            }
            self.finished_goods[fg_id] = item
            plant = item["plant_id"]
            if plant:
                self.fg_by_plant.setdefault(plant, []).append(fg_id)

    def _load_bom(self):
        rows = self._read_csv("bom.csv")
        for r in rows:
            # Handle enterprise schema (fg_id, part_id, qty_per, bom_level, part_primary_vendor_id)
            # or legacy schema (part_id, part_name, supplier_id, product_id, criticality)
            fg_id = r.get("fg_id") or r.get("product_id") or "FG-GENERAL"
            part_id = r.get("part_id")
            if not part_id:
                continue
            
            vendor_id = r.get("part_primary_vendor_id") or r.get("supplier_id") or ""
            qty_per = float(r.get("qty_per", 1) or 1)
            bom_level = int(r.get("bom_level", 1) or 1)
            part_name = r.get("part_name") or f"Component {part_id}"
            criticality = r.get("criticality") or ("Critical" if bom_level == 1 else "Standard")

            entry = {
                "fg_id": fg_id,
                "part_id": part_id,
                "part_name": part_name,
                "qty_per": qty_per,
                "bom_level": bom_level,
                "vendor_id": vendor_id,
                "criticality": criticality
            }

            self.bom_by_fg.setdefault(fg_id, []).append(entry)
            self.bom_by_part.setdefault(part_id, []).append(entry)
            if vendor_id:
                self.bom_by_vendor.setdefault(vendor_id, []).append(entry)

    def _load_inventory(self):
        rows = self._read_csv("inventory.csv")
        for r in rows:
            part_id = r.get("part_id")
            if not part_id:
                continue
            plant_id = r.get("plant_id", "PL-01")
            on_hand = float(r.get("on_hand_qty", 0) or 0)
            days_cover = float(r.get("days_cover", 0) or 0)
            in_transit = float(r.get("in_transit_qty", 0) or 0)
            safety_stock = float(r.get("safety_stock_qty", 0) or 0)
            as_of = r.get("as_of_date", "")

            # If days_cover is 0 but daily consumption exists (legacy schema)
            if days_cover == 0 and "avg_daily_consumption" in r:
                cons = float(r.get("avg_daily_consumption", 1) or 1)
                days_cover = round(on_hand / cons, 1) if cons > 0 else 15

            item = {
                "plant_id": plant_id,
                "part_id": part_id,
                "part_name": r.get("part_name", f"Component {part_id}"),
                "on_hand_qty": on_hand,
                "days_cover": days_cover,
                "in_transit_qty": in_transit,
                "safety_stock_qty": safety_stock,
                "as_of_date": as_of
            }

            self.inventory_by_part.setdefault(part_id, []).append(item)
            key = f"{plant_id}:{part_id}"
            self.inventory_by_plant_part[key] = item

    def _load_capacity(self):
        rows = self._read_csv("capacity.csv")
        if not rows:
            # Try fallback plant_capacity.csv
            rows = self._read_csv("plant_capacity.csv")
            for r in rows:
                pid = r.get("plant_id", "PL-01")
                cap = float(r.get("baseline_capacity_units_per_day", 1000) or 1000)
                item = {
                    "plant_id": pid,
                    "line_id": f"{pid}-L1",
                    "fg_family": "General Assembly",
                    "weekly_capacity_units": cap * 7,
                    "utilization_pct": 85.0,
                    "changeover_hours": 4.0,
                    "status": "running"
                }
                self.capacity_by_plant.setdefault(pid, []).append(item)
            return

        for r in rows:
            pid = r.get("plant_id")
            if not pid:
                continue
            item = {
                "plant_id": pid,
                "line_id": r.get("line_id", ""),
                "fg_family": r.get("fg_family", ""),
                "weekly_capacity_units": float(r.get("weekly_capacity_units", 0) or 0),
                "utilization_pct": float(r.get("utilization_pct", 0) or 0),
                "changeover_hours": float(r.get("changeover_hours", 0) or 0),
                "status": r.get("status", "running")
            }
            self.capacity_by_plant.setdefault(pid, []).append(item)

    def _load_customers(self):
        rows = self._read_csv("customers.csv")
        if not rows:
            rows = self._read_csv("customer_orders.csv")
            for r in rows:
                cid = r.get("customer_id")
                if not cid:
                    continue
                item = {
                    "customer_id": cid,
                    "customer_name": r.get("customer_name", f"Customer {cid}"),
                    "customer_type": "Enterprise",
                    "region": "Global",
                    "country": "USA",
                    "tier_rank": "1" if r.get("is_strategic_tier1") == "True" else "2",
                    "otif_target_pct": 95.0,
                    "penalty_usd_per_day": float(r.get("sla_penalty_rate_daily", 0.01) or 0.01) * float(r.get("order_qty", 1000) or 1000) * float(r.get("unit_price_usd", 100) or 100),
                    "annual_revenue_usd": float(r.get("order_qty", 1000) or 1000) * float(r.get("unit_price_usd", 100) or 100) * 12,
                    "contract_type": "LTA"
                }
                self.customers.append(item)
                self.customers_by_id[cid] = item
            return

        for r in rows:
            cid = r.get("customer_id")
            if not cid:
                continue
            item = {
                "customer_id": cid,
                "customer_name": r.get("customer_name", f"Customer {cid}"),
                "customer_type": r.get("customer_type", "Standard"),
                "region": r.get("region", "Global"),
                "country": r.get("country", "Unknown"),
                "tier_rank": r.get("tier_rank", "2"),
                "otif_target_pct": float(r.get("otif_target_pct", 95) or 95),
                "penalty_usd_per_day": float(r.get("penalty_usd_per_day", 0) or 0),
                "annual_revenue_usd": float(r.get("annual_revenue_usd", 0) or 0),
                "contract_type": r.get("contract_type", "Standard")
            }
            self.customers.append(item)
            self.customers_by_id[cid] = item

    def _load_alt_sources(self):
        rows = self._read_csv("alt_sources.csv")
        for r in rows:
            part_id = r.get("part_id")
            if not part_id:
                continue
            item = {
                "part_id": part_id,
                "alt_vendor_id": r.get("alt_vendor_id", ""),
                "region": r.get("region", ""),
                "country": r.get("country", ""),
                "lead_time_weeks": float(r.get("lead_time_weeks", 0) or 0),
                "unit_cost_delta_pct": float(r.get("unit_cost_delta_pct", 0) or 0),
                "ppap_weeks": float(r.get("ppap_weeks", 0) or 0),
                "capacity_available_pct": float(r.get("capacity_available_pct", 0) or 0),
                "margin_delta_pt": float(r.get("margin_delta_pt", 0) or 0)
            }
            self.alt_sources_by_part.setdefault(part_id, []).append(item)

    def _load_conflicts(self):
        rows = self._read_csv("cross_signal_conflicts.csv")
        for r in rows:
            self.conflicts.append(r)

    def _load_cumulative_impact(self):
        rows = self._read_csv("cumulative_impact.csv")
        for r in rows:
            self.cumulative_impact.append(r)

    def _load_timephased(self):
        rows = self._read_csv("impact_timephased.csv")
        for r in rows:
            sig = r.get("signal_id")
            if sig:
                self.timephased_by_signal.setdefault(sig, []).append(r)

    def _load_suppliers(self):
        rows = self._read_csv("suppliers.csv")
        for r in rows:
            sid = r.get("supplier_id") or r.get("supplier_name")
            if sid:
                self.suppliers_master[sid] = r
                if "supplier_name" in r:
                    self.suppliers_master[r["supplier_name"]] = r

# Singleton accessor
def get_data_loader() -> EnterpriseDataLoader:
    return EnterpriseDataLoader()
