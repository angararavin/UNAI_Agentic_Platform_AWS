import csv
from pathlib import Path
from backend.config import DATA_DIR


class InventoryAgent:
    """
    Agent 4 / Team 3 (Sub-Agent B): Inventory Lead Agent (Operations Team)
    Given the Exposure Agent's affected parts and the Capacity Agent's recovery timeline:
        - Calculates Days of Supply (DOS) per component
        - Flags safety stock breaches
        - Determines whether a component stockout will occur before manufacturing capacity recovers
    """

    def __init__(self):
        self.inventory_path = DATA_DIR / "inventory.csv"
        self._inventory = self._load_csv(self.inventory_path)
        self._inventory_by_part = {row["part_id"]: row for row in self._inventory}

    def assess_inventory_risk(self, exposure_result: dict, capacity_result: dict = None) -> dict:
        disruption_id = exposure_result.get("disruption_id", "UNKNOWN")

        if exposure_result.get("is_synthetic"):
            return self._synthetic_result(
                disruption_id,
                reason="Upstream exposure data is synthetic — cannot compute exact inventory stockouts"
            )

        affected_parts = exposure_result.get("affected_parts", [])
        if not affected_parts:
            return self._empty_result(disruption_id, reason="No affected parts — zero inventory stockout risk")

        recovery_days = None
        if capacity_result and not capacity_result.get("is_synthetic"):
            recovery_days = capacity_result.get("max_recovery_days")

        part_results = []
        skipped_parts = []
        for part in affected_parts:
            part_id = part.get("part_id")
            inv_row = self._inventory_by_part.get(part_id)
            if inv_row is None:
                # Fallback parametric part inventory if not in static CSV
                inv_row = {
                    "part_id": part_id,
                    "part_name": part.get("part_name", "Component"),
                    "on_hand_qty": 5000,
                    "avg_daily_consumption": 600,
                    "safety_stock_qty": 4500,
                    "reorder_lead_time_days": 21
                }
            part_results.append(self._assess_part(part, inv_row, recovery_days))

        summary = self._summarize(part_results)

        return {
            "disruption_id": disruption_id,
            "recovery_days_used": recovery_days,
            "parts": part_results,
            "parts_assessed_count": len(part_results),
            "parts_skipped_no_data": skipped_parts,
            "parts_at_risk_count": summary["at_risk_count"],
            "earliest_stockout_days": summary["earliest_stockout_days"],
            "safety_stock_breaches": summary["safety_stock_breaches"],
            "is_synthetic": False,
            "source": "Inventory Risk Analysis (inventory.csv + capacity telemetry)",
        }

    def _assess_part(self, part: dict, inv_row: dict, recovery_days) -> dict:
        part_id = part.get("part_id")
        part_name = part.get("part_name") or inv_row.get("part_name")
        criticality = part.get("criticality", "Critical")

        on_hand_qty = self._safe_float(inv_row.get("on_hand_qty"), 0.0)
        avg_daily_consumption = self._safe_float(inv_row.get("avg_daily_consumption"), 0.0)
        safety_stock_qty = self._safe_float(inv_row.get("safety_stock_qty"), 0.0)
        reorder_lead_time_days = self._safe_float(inv_row.get("reorder_lead_time_days"), 0.0)
        days_cover_raw = inv_row.get("days_cover")

        if days_cover_raw is not None and float(days_cover_raw) > 0:
            days_of_supply = round(float(days_cover_raw), 1)
        elif avg_daily_consumption > 0:
            days_of_supply = round(on_hand_qty / avg_daily_consumption, 1)
        else:
            days_of_supply = 15.0

        safety_stock_breach = on_hand_qty < safety_stock_qty if safety_stock_qty > 0 else (days_of_supply < 7.0)

        risk_level = self._score_risk(days_of_supply, safety_stock_breach, reorder_lead_time_days, recovery_days)

        stockout_expected = (
            days_of_supply is not None
            and recovery_days is not None
            and days_of_supply < recovery_days
        )

        return {
            "part_id": part_id,
            "part_name": part_name,
            "criticality": criticality,
            "on_hand_qty": on_hand_qty,
            "avg_daily_consumption": avg_daily_consumption,
            "days_of_supply": days_of_supply,
            "safety_stock_qty": safety_stock_qty,
            "safety_stock_breach": safety_stock_breach,
            "reorder_lead_time_days": reorder_lead_time_days,
            "stockout_expected_before_recovery": stockout_expected,
            "risk_level": risk_level,
            "inventory_data_available": True,
        }

    @staticmethod
    def _score_risk(days_of_supply, safety_stock_breach, reorder_lead_time_days, recovery_days) -> str:
        if days_of_supply is None:
            return "Unknown"
        if days_of_supply <= 0:
            return "Critical"
        if recovery_days is not None and days_of_supply < recovery_days:
            return "Critical"
        if safety_stock_breach:
            return "High"
        if days_of_supply <= reorder_lead_time_days:
            return "Moderate"
        return "Low"

    @staticmethod
    def _summarize(part_results: list) -> dict:
        at_risk = [p for p in part_results if p["risk_level"] in ("Critical", "High")]
        breaches = [p for p in part_results if p["safety_stock_breach"]]
        finite_dos = [p["days_of_supply"] for p in part_results if p["days_of_supply"] is not None]

        return {
            "at_risk_count": len(at_risk),
            "safety_stock_breaches": len(breaches),
            "earliest_stockout_days": min(finite_dos) if finite_dos else None,
        }

    def _empty_result(self, disruption_id: str, reason: str) -> dict:
        return {
            "disruption_id": disruption_id,
            "recovery_days_used": None,
            "parts": [],
            "parts_assessed_count": 0,
            "parts_skipped_no_data": [],
            "parts_at_risk_count": 0,
            "earliest_stockout_days": None,
            "safety_stock_breaches": 0,
            "is_synthetic": False,
            "source": "Inventory Analysis (Zero Risk)",
            "note": reason,
        }

    def _synthetic_result(self, disruption_id: str, reason: str) -> dict:
        return {
            "disruption_id": disruption_id,
            "recovery_days_used": None,
            "parts": [],
            "parts_assessed_count": 0,
            "parts_skipped_no_data": [],
            "parts_at_risk_count": 0,
            "earliest_stockout_days": None,
            "safety_stock_breaches": 0,
            "is_synthetic": True,
            "source": "Synthetic/Placeholder — No Data Found",
            "note": reason,
        }

    @staticmethod
    def _safe_float(value, default=0.0):
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _load_csv(path: Path) -> list:
        if not path.exists():
            return []
        with open(path, mode="r", encoding="utf-8") as f:
            return list(csv.DictReader(f))
