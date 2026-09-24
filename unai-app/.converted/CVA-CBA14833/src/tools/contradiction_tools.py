from typing import Dict, Any, List, Optional
from collections import defaultdict

class ContradictionCalculationTools:
    """
    Pure deterministic calculation engine for Agent 05 (Requirement Contradiction).
    Disambiguates duplicate/overlapping requirements from legitimate competing demand.
    """

    @staticmethod
    def classify_contradiction(
        plant_id: str,
        material_id: str,
        requirements: List[Dict[str, Any]],
        reservations: Optional[List[Dict[str, Any]]] = None,
        supply_records: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Evaluates a cluster of requirements for the same plant and material.
        Determines if they are contradictory or legitimate distinct demands.
        """
        active_reqs = [
            r for r in requirements
            if str(r.get("plant_id", "")).strip() == plant_id and
            str(r.get("material_id", "")).strip() == material_id
        ]

        if not active_reqs:
            return {
                "contradiction_type": "NO_REQUIREMENTS_FOUND",
                "recommended_action": "NO_ACTION",
                "rationale": "No requirements detected for this plant and material.",
                "consequential_action_required": False,
                "net_demand": 0.0
            }

        # Check for CANCELLED requirements still marked active
        cancelled_active = [r for r in active_reqs if str(r.get("status", "")).upper() == "CANCELLED"]
        if cancelled_active:
            req_ids = "|".join(r.get("requirement_id", "") for r in cancelled_active)
            return {
                "contradiction_type": "CANCELLED_REQUIREMENT_CONFLICT",
                "recommended_action": "REMOVE_CANCELLED_DEMAND",
                "rationale": f"Requirement(s) {req_ids} are flagged CANCELLED but still present in active planning schedule.",
                "consequential_action_required": True,
                "affected_requirements": req_ids
            }

        req_types = [str(r.get("requirement_type", "")).upper() for r in active_reqs]
        sources = [str(r.get("source_id", "")).upper() for r in active_reqs]
        dates = [str(r.get("requirement_date", "")).strip() for r in active_reqs]

        # 1. Check FIRM vs FORECAST Collision
        has_firm = any("PRODUCTION" in t or "SALES" in t for t in req_types)
        has_forecast = any("FORECAST" in t or "PIR" in t for t in req_types)
        if has_firm and has_forecast:
            return {
                "contradiction_type": "FIRM_FORECAST_COLLISION",
                "recommended_action": "REVIEW_DEMAND_PRIORITY",
                "rationale": "Unconsumed forecast (PIR) overlaps firm sales/production order. Forecast reduction required to avoid double-procurement.",
                "consequential_action_required": True,
                "affected_requirements": "|".join(r.get("requirement_id", "") for r in active_reqs)
            }

        # 2. Check DOUBLE COUNTING (Sales order and MRP dependent demand on same component)
        if "SALES_ORDER" in req_types and any("DEPENDENT" in t or "RESERVATION" in t for t in req_types):
            return {
                "contradiction_type": "DOUBLE_COUNTING_RISK",
                "recommended_action": "RECONCILE_REQUIREMENT_LINK",
                "rationale": "Sales order and MRP reservation both directly demand component; potential BOM link misconfiguration.",
                "consequential_action_required": True,
                "affected_requirements": "|".join(r.get("requirement_id", "") for r in active_reqs)
            }

        # 3. Check DUPLICATE OVERLAP vs VALID COMPETING DEMAND
        # If identical date and same source / generic orders -> DUPLICATE_OVERLAP
        # If distinct valid business objects (e.g. REQ2004 and REQ2005 from separate customers) -> VALID_COMPETING_DEMAND
        if len(active_reqs) > 1:
            unique_sources = set(sources)
            # If all are same type and same date
            if len(set(dates)) == 1 and len(unique_sources) <= 1:
                return {
                    "contradiction_type": "DUPLICATE_OVERLAP",
                    "recommended_action": "REVIEW_DEDUPLICATION",
                    "rationale": "Multiple open requirements collectively overlap the same material and horizon; confirm distinct business objects.",
                    "consequential_action_required": True,
                    "affected_requirements": "|".join(r.get("requirement_id", "") for r in active_reqs)
                }
            else:
                # Multiple requirements from distinct legitimate business sources
                return {
                    "contradiction_type": "VALID_COMPETING_DEMAND",
                    "recommended_action": "KEEP_BOTH",
                    "rationale": "Distinct legitimate firm requirements originating from separate orders; both must be retained.",
                    "consequential_action_required": False,
                    "affected_requirements": "|".join(r.get("requirement_id", "") for r in active_reqs)
                }

        # Single requirement
        return {
            "contradiction_type": "CONSISTENT_SINGLE_DEMAND",
            "recommended_action": "KEEP_OPEN",
            "rationale": "Single clean requirement; no contradiction detected.",
            "consequential_action_required": False,
            "affected_requirements": active_reqs[0].get("requirement_id", "")
        }

    @staticmethod
    def calculate_net_demand(
        requirements: List[Dict[str, Any]],
        supply_records: List[Dict[str, Any]],
        exclude_cancelled: bool = True
    ) -> float:
        """
        Computes net demand = sum(valid requirements) - sum(allocated supply).
        """
        total_demand = 0.0
        for r in requirements:
            if exclude_cancelled and str(r.get("status", "")).upper() == "CANCELLED":
                continue
            try:
                total_demand += float(r.get("required_qty", 0.0))
            except (ValueError, TypeError):
                continue

        total_supply = 0.0
        for s in supply_records:
            try:
                total_supply += float(s.get("supply_qty", 0.0))
            except (ValueError, TypeError):
                continue

        return round(max(0.0, total_demand - total_supply), 2)
