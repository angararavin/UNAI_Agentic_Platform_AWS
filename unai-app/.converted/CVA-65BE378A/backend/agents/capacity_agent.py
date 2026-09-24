import csv
from pathlib import Path
from backend.config import DATA_DIR


class CapacityAgent:
    """
    Agent 3 / Team 3 (Sub-Agent A): Capacity Lead Agent (Operations Team)
    Calculates manufacturing footprint impact:
        - Capacity loss % per exposed plant
        - Plant status (Critical / High / Moderate / Low)
        - Recovery timeline estimate per plant (days)
        - Weighted average capacity loss across all exposed plants
    """

    DEFAULT_RECOVERY_DAYS_BASE = 14
    DEFAULT_REDUNDANCY_FACTOR = 0.35

    def __init__(self):
        self.plant_capacity_path = DATA_DIR / "plant_capacity.csv"
        self._plant_capacity = self._load_csv(self.plant_capacity_path)
        self._capacity_by_plant = {row["plant_id"]: row for row in self._plant_capacity}

    def calculate_capacity_impact(self, exposure_result: dict, disruption_event: dict) -> dict:
        disruption_id = exposure_result.get("disruption_id", "UNKNOWN")

        if exposure_result.get("is_synthetic"):
            return self._synthetic_result(
                disruption_id,
                reason="Upstream exposure data is synthetic — defaulting to parametric capacity estimation"
            )

        exposed_plants = exposure_result.get("exposed_plants", [])
        if not exposed_plants:
            return self._empty_result(disruption_id, reason="No plants exposed — zero manufacturing capacity impact")

        severity_score = disruption_event.get("severityScore", 50)
        try:
            severity_score = float(severity_score)
        except (TypeError, ValueError):
            severity_score = 50.0

        if severity_score == 0:
            return self._empty_result(disruption_id, reason="Normal baseline operations ($0 severity)")

        plant_results = [
            self._assess_plant(plant, severity_score)
            for plant in exposed_plants
        ]

        summary = self._summarize(plant_results)

        return {
            "disruption_id": disruption_id,
            "severity_score_used": severity_score,
            "plants": plant_results,
            "plants_exposed_count": len(plant_results),
            "plants_at_critical_risk": summary["critical_count"],
            "weighted_avg_capacity_loss_pct": summary["weighted_avg_capacity_loss_pct"],
            "max_recovery_days": summary["max_recovery_days"],
            "is_synthetic": False,
            "source": "Capacity Analysis (plant_capacity.csv + exposure data)",
        }

    def _assess_plant(self, plant: dict, severity_score: float) -> dict:
        plant_id = plant.get("plant_id")
        plant_name = plant.get("plant_name")
        parts_exposed = plant.get("parts_exposed", [])

        from backend.data_loader import get_data_loader
        dl = get_data_loader()

        # Check line-level capacity from capacity.csv
        enterprise_lines = dl.capacity_by_plant.get(plant_id, [])
        capacity_row = self._capacity_by_plant.get(plant_id)
        capacity_data_available = bool(enterprise_lines or capacity_row)

        if enterprise_lines:
            total_weekly_cap = sum(l["weekly_capacity_units"] for l in enterprise_lines)
            baseline_capacity = round(total_weekly_cap / 7.0, 1) if total_weekly_cap > 0 else 1200.0
            avg_utilization = sum(l["utilization_pct"] for l in enterprise_lines) / len(enterprise_lines)
            recovery_days_base = self.DEFAULT_RECOVERY_DAYS_BASE
            # Higher utilization leaves less buffer redundancy
            redundancy_factor = max(0.1, min(0.6, (100.0 - avg_utilization) / 100.0))
        elif capacity_row:
            baseline_capacity = self._safe_float(capacity_row.get("baseline_capacity_units_per_day"))
            recovery_days_base = self._safe_float(
                capacity_row.get("recovery_days_base"), self.DEFAULT_RECOVERY_DAYS_BASE
            )
            redundancy_factor = self._safe_float(
                capacity_row.get("redundancy_factor"), self.DEFAULT_REDUNDANCY_FACTOR
            )
        else:
            baseline_capacity = 1200.0
            recovery_days_base = self.DEFAULT_RECOVERY_DAYS_BASE
            redundancy_factor = self.DEFAULT_REDUNDANCY_FACTOR

        redundancy_factor = min(max(redundancy_factor, 0.0), 1.0)
        exposure_fraction = min(len(parts_exposed) / max(len(parts_exposed), 1), 1.0) if parts_exposed else 1.0

        capacity_loss_pct = round(
            min(100.0, exposure_fraction * (severity_score / 100.0) * 100.0 * (1 - redundancy_factor)),
            1,
        )

        recovery_days = round(
            recovery_days_base * (0.5 + severity_score / 100.0) * (1 + (exposure_fraction * 0.5)),
            1,
        )

        if capacity_loss_pct >= 50:
            status = "Critical"
        elif capacity_loss_pct >= 25:
            status = "High"
        elif capacity_loss_pct >= 10:
            status = "Moderate"
        else:
            status = "Low"

        return {
            "plant_id": plant_id,
            "plant_name": plant_name,
            "parts_exposed_count": len(parts_exposed),
            "baseline_capacity_units_per_day": baseline_capacity,
            "capacity_loss_pct": capacity_loss_pct,
            "estimated_recovery_days": recovery_days,
            "status": status,
            "redundancy_factor_used": redundancy_factor,
            "capacity_data_available": capacity_data_available,
        }

    @staticmethod
    def _summarize(plant_results: list) -> dict:
        critical_count = sum(1 for p in plant_results if p["status"] == "Critical")
        max_recovery_days = max((p["estimated_recovery_days"] for p in plant_results), default=0)

        weighted_total = 0.0
        weight_sum = 0.0
        for p in plant_results:
            weight = p["baseline_capacity_units_per_day"] or 1.0
            weighted_total += p["capacity_loss_pct"] * weight
            weight_sum += weight

        weighted_avg = round(weighted_total / weight_sum, 1) if weight_sum else 0.0

        return {
            "critical_count": critical_count,
            "max_recovery_days": max_recovery_days,
            "weighted_avg_capacity_loss_pct": weighted_avg,
        }

    def _empty_result(self, disruption_id: str, reason: str) -> dict:
        return {
            "disruption_id": disruption_id,
            "severity_score_used": 0,
            "plants": [],
            "plants_exposed_count": 0,
            "plants_at_critical_risk": 0,
            "weighted_avg_capacity_loss_pct": 0.0,
            "max_recovery_days": 0,
            "is_synthetic": False,
            "source": "Capacity Analysis (Zero Impact)",
            "note": reason,
        }

    def _synthetic_result(self, disruption_id: str, reason: str) -> dict:
        return {
            "disruption_id": disruption_id,
            "severity_score_used": None,
            "plants": [],
            "plants_exposed_count": 0,
            "plants_at_critical_risk": 0,
            "weighted_avg_capacity_loss_pct": 0.0,
            "max_recovery_days": 0,
            "is_synthetic": True,
            "source": "Synthetic/Placeholder — No Data Found",
            "note": reason,
        }

    @staticmethod
    def _safe_float(value, default=None):
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
