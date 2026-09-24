"""
Agent 05: Requirement Contradiction Intelligence Tools
Deterministic calculation engine for demand contradiction disambiguation and net requirement reconciliation.
"""

from typing import Dict, Any, List, Optional
import os
import pandas as pd

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
        has_firm = any("PRODUCTION" in t or "SALES" in t or "MAINTENANCE" in t for t in req_types)
        has_forecast = any("FORECAST" in t or "PIR" in t for t in req_types)
        if has_firm and has_forecast:
            return {
                "contradiction_type": "FIRM_FORECAST_COLLISION",
                "recommended_action": "REVIEW_DEMAND_PRIORITY",
                "rationale": "Firm and forecast requirements overlap and may double-count demand.",
                "consequential_action_required": True,
                "affected_requirements": "|".join(r.get("requirement_id", "") for r in active_reqs)
            }

        # 2. Check DOUBLE COUNTING
        if "SALES_ORDER" in req_types and any("DEPENDENT" in t or "RESERVATION" in t or "MRP" in t for t in req_types):
            return {
                "contradiction_type": "DOUBLE_COUNTING_RISK",
                "recommended_action": "RECONCILE_REQUIREMENT_LINK",
                "rationale": "Sales and MRP requirements appear to represent the same underlying need.",
                "consequential_action_required": True,
                "affected_requirements": "|".join(r.get("requirement_id", "") for r in active_reqs)
            }

        # 3. Check DUPLICATE OVERLAP vs VALID COMPETING DEMAND
        if len(active_reqs) > 1:
            unique_sources = set(sources)
            if len(set(dates)) <= 1 and len(unique_sources) <= 1:
                return {
                    "contradiction_type": "DUPLICATE_OVERLAP",
                    "recommended_action": "REVIEW_DEDUPLICATION",
                    "rationale": "Multiple open requirements collectively overlap the same material and horizon; confirm distinct business objects.",
                    "consequential_action_required": True,
                    "affected_requirements": "|".join(r.get("requirement_id", "") for r in active_reqs)
                }
            else:
                return {
                    "contradiction_type": "VALID_COMPETING_DEMAND",
                    "recommended_action": "KEEP_BOTH",
                    "rationale": "Two distinct firm requirements; no contradiction if supply is allocated correctly.",
                    "consequential_action_required": False,
                    "affected_requirements": "|".join(r.get("requirement_id", "") for r in active_reqs)
                }

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


class LocalContradictionDataLoader:
    """Loads CSV files locally from Requirement_Contradiction_Agent_Synthetic_Data directory."""

    def __init__(self, data_dir: Optional[str] = None):
        if data_dir is None:
            base = os.path.dirname(os.path.abspath(__file__))
            data_dir = os.path.join(base, "Requirement_Contradiction_Agent_Synthetic_Data")
        self.data_dir = data_dir

    def load_demo_cases(self) -> pd.DataFrame:
        return pd.read_csv(os.path.join(self.data_dir, "demo_cases.csv"))

    def load_requirements(self) -> pd.DataFrame:
        return pd.read_csv(os.path.join(self.data_dir, "requirements.csv"))

    def load_reservations(self) -> pd.DataFrame:
        return pd.read_csv(os.path.join(self.data_dir, "reservations.csv"))

    def load_supply_context(self) -> pd.DataFrame:
        return pd.read_csv(os.path.join(self.data_dir, "supply_context.csv"))

    def load_ground_truth(self) -> pd.DataFrame:
        return pd.read_csv(os.path.join(self.data_dir, "contradiction_ground_truth.csv"))
