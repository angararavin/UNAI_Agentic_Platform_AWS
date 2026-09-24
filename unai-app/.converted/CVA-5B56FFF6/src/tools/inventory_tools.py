from typing import Dict, Any, List, Optional
from datetime import datetime

class InventoryCalculationTools:
    """
    Pure deterministic calculation engine for Agent 02 (Phantom Inventory).
    Enforces exact arithmetic reconciliation between physical and usable inventory.
    """

    @staticmethod
    def calculate_usable_stock(
        physical_qty: float,
        blocked_qty: float = 0.0,
        quality_hold_qty: float = 0.0,
        reserved_qty: float = 0.0,
        wrong_location_qty: float = 0.0,
        expired_qty: float = 0.0
    ) -> Dict[str, Any]:
        """
        Calculates usable operational stock and phantom inventory metrics.
        Formula:
        Usable = max(0, Physical - Blocked - QualityHold - Reserved - WrongLocation - Expired)
        """
        p = max(0.0, float(physical_qty))
        b = max(0.0, float(blocked_qty))
        q = max(0.0, float(quality_hold_qty))
        r = max(0.0, float(reserved_qty))
        w = max(0.0, float(wrong_location_qty))
        e = max(0.0, float(expired_qty))

        total_unavailable = b + q + r + w + e
        usable_qty = max(0.0, p - total_unavailable)
        phantom_qty = p - usable_qty
        phantom_ratio = (phantom_qty / p) if p > 0 else 0.0

        # Primary phantom category
        breakdown = {
            "STATUS_BLOCKED": b,
            "QUALITY_HOLD": q,
            "RESERVED_COMMITMENT": r,
            "WRONG_LOCATION": w,
            "EXPIRED_SHELF_LIFE": e
        }
        primary_cause = max(breakdown, key=breakdown.get) if phantom_qty > 0 else "NONE"

        # Risk classification
        if phantom_ratio >= 0.50:
            risk = "HIGH"
        elif phantom_ratio >= 0.20:
            risk = "MEDIUM"
        elif phantom_ratio > 0.0:
            risk = "LOW"
        else:
            risk = "NONE"

        return {
            "physical_qty": round(p, 2),
            "usable_qty": round(usable_qty, 2),
            "phantom_qty": round(phantom_qty, 2),
            "phantom_ratio": round(phantom_ratio, 3),
            "primary_phantom_cause": primary_cause,
            "phantom_risk": risk,
            "unavailable_breakdown": {k: round(v, 2) for k, v in breakdown.items()}
        }

    @staticmethod
    def evaluate_demand_coverage(
        usable_qty: float,
        next_7d_demand: float = 0.0,
        next_30d_demand: float = 0.0
    ) -> Dict[str, Any]:
        """
        Determines if usable stock covers upcoming operational demand.
        """
        d7 = max(0.0, float(next_7d_demand))
        d30 = max(0.0, float(next_30d_demand))

        coverage_7d = (usable_qty / d7) if d7 > 0 else (99.0 if usable_qty > 0 else 0.0)
        coverage_30d = (usable_qty / d30) if d30 > 0 else (99.0 if usable_qty > 0 else 0.0)

        is_shortage_immediate = usable_qty < d7
        is_shortage_30d = usable_qty < d30

        return {
            "next_7d_demand": round(d7, 2),
            "next_30d_demand": round(d30, 2),
            "usable_7d_coverage_ratio": round(coverage_7d, 2),
            "usable_30d_coverage_ratio": round(coverage_30d, 2),
            "is_shortage_immediate": is_shortage_immediate,
            "is_shortage_30d": is_shortage_30d
        }

    @staticmethod
    def audit_reservation_status(reservation_record: Dict[str, Any], demand_records: List[Dict[str, Any]]) -> str:
        """
        Checks if a reservation is legitimate or stale.
        """
        mat_id = str(reservation_record.get("material_id", "")).strip()
        plant_id = str(reservation_record.get("plant_id", "")).strip()

        # Check if matching open demand exists
        has_active_demand = any(
            str(d.get("material_id", "")).strip() == mat_id and
            str(d.get("plant_id", "")).strip() == plant_id and
            float(d.get("next_30d_demand", 0)) > 0
            for d in demand_records
        )

        return "VALID_RESERVATION" if has_active_demand else "STALE_RESERVATION"

    @staticmethod
    def map_inventory_action(phantom_metrics: Dict[str, Any], coverage_metrics: Dict[str, Any]) -> Dict[str, Any]:
        """
        Maps deterministic reconciliation state to actionable workflow disposition.
        """
        cause = phantom_metrics.get("primary_phantom_cause", "NONE")
        is_shortage = coverage_metrics.get("is_shortage_immediate", False)

        if cause == "STATUS_BLOCKED":
            action = "RELEASE_OR_RESOLVE_STATUS"
            rationale = "Blocked stock in storage location requires disposition or unblocking review."
            consequential = True
        elif cause == "QUALITY_HOLD":
            action = "ESCALATE_TO_QUALITY"
            rationale = "Stock held under QM inspection lot. Usage decision QA11 required; cannot release autonomously."
            consequential = True
        elif cause == "RESERVED_COMMITMENT":
            action = "VALIDATE_RESERVATION"
            rationale = "Reservation committed to order. Verify demand currency before de-allocating."
            consequential = True
        elif cause == "WRONG_LOCATION":
            action = "RELOCATE"
            rationale = "Physical stock located in staging or non-standard bin. Initiate relocation transfer order."
            consequential = True
        elif cause == "EXPIRED_SHELF_LIFE":
            action = "REVIEW_DISPOSITION"
            rationale = "Material batch past shelf-life date. Scrap or quality re-test disposition required."
            consequential = True
        else:
            action = "NO_ACTION_HEALTHY"
            rationale = "Inventory is fully usable and meets operational coverage thresholds."
            consequential = False

        return {
            "recommended_action": action,
            "action_rationale": rationale,
            "consequential_action_required": consequential,
            "priority": "HIGH" if is_shortage else ("MEDIUM" if consequential else "LOW")
        }
