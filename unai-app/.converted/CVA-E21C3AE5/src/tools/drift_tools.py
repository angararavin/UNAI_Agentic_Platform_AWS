import math
from typing import List, Dict, Any, Optional
from datetime import datetime

class DriftCalculationTools:
    """
    Pure deterministic calculation engine for Agent 01 (PO Promise Drift).
    Strictly isolated from LLM probabilistic operations.
    """

    @staticmethod
    def compute_supplier_stats(historical_deliveries: List[Dict[str, Any]], supplier_id: str) -> Dict[str, Any]:
        """
        Computes historical delay statistics for a given supplier from receipt events.
        """
        delays = []
        for d in historical_deliveries:
            if str(d.get("supplier_id", "")).strip() == str(supplier_id).strip():
                try:
                    delay_val = float(d.get("delivery_delay_days", 0))
                    delays.append(delay_val)
                except (ValueError, TypeError):
                    continue

        if not delays:
            return {
                "supplier_id": supplier_id,
                "historical_delivery_count": 0,
                "avg_delay_days": 0.0,
                "median_delay_days": 0.0,
                "p90_delay_days": 0.0,
                "late_delivery_rate_pct": 0.0,
                "severe_delay_rate_gt3d_pct": 0.0,
                "delay_std_days": 0.0,
                "behavior_profile": "UNKNOWN_INSUFFICIENT_HISTORY",
                "is_sparse_data": True
            }

        delays.sort()
        n = len(delays)
        avg_delay = sum(delays) / n
        median_delay = delays[n // 2] if n % 2 != 0 else (delays[n // 2 - 1] + delays[n // 2]) / 2.0
        p90_idx = min(int(math.ceil(0.90 * n)) - 1, n - 1)
        p90_delay = delays[p90_idx]

        late_count = sum(1 for d in delays if d > 0)
        severe_count = sum(1 for d in delays if d > 3.0)

        late_rate = (late_count / n) * 100.0
        severe_rate = (severe_count / n) * 100.0

        variance = sum((d - avg_delay) ** 2 for d in delays) / n
        std_dev = math.sqrt(variance)

        # Classify behavior profile
        if late_rate < 25.0:
            profile = "RELIABLE_STABLE"
        elif severe_rate > 20.0 or avg_delay > 3.5:
            profile = "CHRONIC_LATE"
        else:
            profile = "MODERATE_VARIABILITY"

        return {
            "supplier_id": supplier_id,
            "historical_delivery_count": n,
            "avg_delay_days": round(avg_delay, 2),
            "median_delay_days": round(median_delay, 2),
            "p90_delay_days": round(p90_delay, 2),
            "late_delivery_rate_pct": round(late_rate, 1),
            "severe_delay_rate_gt3d_pct": round(severe_rate, 1),
            "delay_std_days": round(std_dev, 2),
            "behavior_profile": profile,
            "is_sparse_data": n < 10
        }

    @staticmethod
    def calculate_downstream_exposure(
        po_record: Dict[str, Any],
        mrp_context: Optional[Dict[str, Any]] = None,
        downstream_impact: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Determines the operational criticality and exposure value if supply is delayed.
        """
        mrp = mrp_context or {}
        impact = downstream_impact or {}

        try:
            days_cover = int(impact.get("days_of_cover_without_po", mrp.get("days_until_material_shortage", 5)))
        except (ValueError, TypeError):
            days_cover = 5

        try:
            exposure_val = float(impact.get("estimated_exposure_value", 0.0))
        except (ValueError, TypeError):
            exposure_val = 0.0

        try:
            affected_prod = int(impact.get("affected_production_orders", 0))
            affected_sales = int(impact.get("affected_sales_orders", 0))
            units_at_risk = int(impact.get("production_units_at_risk", 0))
        except (ValueError, TypeError):
            affected_prod, affected_sales, units_at_risk = 0, 0, 0

        material_criticality = str(impact.get("material_criticality", "Medium")).strip().capitalize()
        is_high_impact = impact.get("high_business_impact", "NO").upper() == "YES" or days_cover <= 2 or affected_prod > 0

        return {
            "days_of_cover_without_po": days_cover,
            "estimated_exposure_value": round(exposure_val, 2),
            "affected_production_orders": affected_prod,
            "affected_sales_orders": affected_sales,
            "production_units_at_risk": units_at_risk,
            "material_criticality": material_criticality,
            "is_high_impact": is_high_impact
        }

    @staticmethod
    def evaluate_drift_policy(
        supplier_stats: Dict[str, Any],
        downstream_metrics: Dict[str, Any],
        confirmation_change_count: int = 0
    ) -> Dict[str, Any]:
        """
        Deterministically evaluates policy thresholds and assigns risk band.
        """
        late_rate = supplier_stats.get("late_delivery_rate_pct", 0.0)
        severe_rate = supplier_stats.get("severe_delay_rate_gt3d_pct", 0.0)
        avg_delay = supplier_stats.get("avg_delay_days", 0.0)
        is_sparse = supplier_stats.get("is_sparse_data", False)
        days_cover = downstream_metrics.get("days_of_cover_without_po", 10)
        is_high_impact = downstream_metrics.get("is_high_impact", False)

        # Calculate composite risk score (0 - 100)
        # Weightings: late rate 40%, severe rate 30%, cover vulnerability 30%
        cover_penalty = max(0, (10 - days_cover) * 10)  # max 100 if 0 days cover
        change_penalty = min(30, confirmation_change_count * 10)

        risk_score = (late_rate * 0.35) + (severe_rate * 0.35) + (cover_penalty * 0.20) + (change_penalty * 0.10)
        risk_score = max(0.0, min(100.0, risk_score))

        # Risk band policy
        if risk_score >= 75.0 or (is_high_impact and avg_delay > 2.0):
            risk_band = "SEVERE"
            default_action = "EXPEDITE_AND_RESCHEDULE_LINE"
            consequential = True
        elif risk_score >= 50.0 or is_high_impact:
            risk_band = "HIGH"
            default_action = "SUPPLIER_FOLLOW_UP"
            consequential = True
        elif risk_score >= 25.0:
            risk_band = "MEDIUM"
            default_action = "MONITOR_INFORMATIONAL"
            consequential = False
        else:
            risk_band = "LOW"
            default_action = "NO_ACTION_ON_TRACK"
            consequential = False

        if is_sparse:
            default_action = "FLAG_NEW_SUPPLIER_VERIFY_COMMITTMENT"

        return {
            "risk_score": round(risk_score, 1),
            "risk_band": risk_band,
            "default_action": default_action,
            "consequential_action_required": consequential,
            "predicted_drift_days": round(avg_delay, 1)
        }
