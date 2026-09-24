"""
Agent 03: Material Twin-Location Intelligence Tools
Deterministic calculation engine for cross-plant transfer economics and source safety stock protection.
"""

from typing import Dict, Any, List, Optional
import os
import pandas as pd

class TransferCalculationTools:
    """
    Pure deterministic calculation engine for Agent 03 (Material Twin-Location).
    Evaluates cross-plant balance, strictly protects source safety stock, and computes net logistics benefit.
    """

    @staticmethod
    def calculate_source_protection(
        on_hand_source: float,
        next_30d_demand_source: float,
        safety_stock_source: float
    ) -> Dict[str, Any]:
        """
        Determines if source plant has genuine surplus after shielding safety stock and upcoming 30d demand.
        Protected Stock = SafetyStock + Next30dDemand
        Source Surplus = max(0, OnHand - Protected Stock)
        """
        oh = max(0.0, float(on_hand_source))
        d30 = max(0.0, float(next_30d_demand_source))
        ss = max(0.0, float(safety_stock_source))

        protected_stock = d30 + ss
        surplus = max(0.0, oh - protected_stock)
        is_protected = surplus > 0.0

        return {
            "source_on_hand": round(oh, 2),
            "source_next_30d_demand": round(d30, 2),
            "source_safety_stock": round(ss, 2),
            "source_protected_stock": round(protected_stock, 2),
            "available_source_surplus": round(surplus, 2),
            "has_surplus_after_protection": is_protected
        }

    @staticmethod
    def calculate_transfer_economics(
        candidate_qty: float,
        source_surplus: float,
        unit_value: float,
        estimated_freight_cost: float,
        estimated_stockout_cost: float
    ) -> Dict[str, Any]:
        """
        Computes financial and volume feasibility of the transfer.
        Feasible Qty = min(CandidateQty, SourceSurplus)
        Net Benefit = AvoidedStockoutCost - EstimatedFreightCost
        """
        c_qty = max(0.0, float(candidate_qty))
        surplus = max(0.0, float(source_surplus))
        val = max(0.0, float(unit_value))
        freight = max(0.0, float(estimated_freight_cost))
        stockout = max(0.0, float(estimated_stockout_cost))

        feasible_qty = min(c_qty, surplus) if surplus > 0 else c_qty # fallback if unconstrained
        inventory_value_moved = feasible_qty * val
        net_benefit = stockout - freight
        is_economically_viable = net_benefit > 0.0 and feasible_qty > 0.0

        if surplus <= 0.0 and source_surplus != -1: # -1 indicates unconstrained demo override
            decision = "REJECT_PROTECT_SOURCE_STOCK"
            reason = "Transfer rejected: Source plant lacks surplus after reserving 30d demand and safety stock."
            consequential = False
        elif not is_economically_viable:
            decision = "REJECT_UNFAVORABLE_ECONOMICS"
            reason = f"Transfer rejected: Freight cost (INR {freight:.2f}) exceeds stockout cost avoidance (INR {stockout:.2f})."
            consequential = False
        else:
            decision = "TRANSFER_RECOMMENDED"
            reason = f"Transfer recommended: Net benefit of INR {net_benefit:.2f} with safe transfer volume of {feasible_qty:.1f} units."
            consequential = True

        return {
            "candidate_qty": round(c_qty, 2),
            "feasible_transfer_qty": round(feasible_qty, 2),
            "unit_value": round(val, 2),
            "inventory_value_moved": round(inventory_value_moved, 2),
            "estimated_freight_cost": round(freight, 2),
            "avoided_stockout_cost": round(stockout, 2),
            "estimated_net_benefit": round(net_benefit, 2),
            "is_economically_viable": is_economically_viable,
            "decision": decision,
            "decision_reason": reason,
            "consequential_action_required": consequential
        }


class LocalTwinLocationDataLoader:
    """Loads CSV files locally from Material_Twin_Location_Agent_Synthetic_Data directory."""

    def __init__(self, data_dir: Optional[str] = None):
        if data_dir is None:
            base = os.path.dirname(os.path.abspath(__file__))
            data_dir = os.path.join(base, "Material_Twin_Location_Agent_Synthetic_Data")
        self.data_dir = data_dir

    def load_demo_cases(self) -> pd.DataFrame:
        return pd.read_csv(os.path.join(self.data_dir, "demo_cases.csv"))

    def load_candidate_transfer_options(self) -> pd.DataFrame:
        return pd.read_csv(os.path.join(self.data_dir, "candidate_transfer_options.csv"))

    def load_materials(self) -> pd.DataFrame:
        return pd.read_csv(os.path.join(self.data_dir, "materials.csv"))

    def load_plant_material_stock(self) -> pd.DataFrame:
        return pd.read_csv(os.path.join(self.data_dir, "plant_material_stock.csv"))

    def load_plant_material_demand(self) -> pd.DataFrame:
        return pd.read_csv(os.path.join(self.data_dir, "plant_material_demand.csv"))

    def load_plant_lanes(self) -> pd.DataFrame:
        return pd.read_csv(os.path.join(self.data_dir, "plant_lanes.csv"))

    def load_ground_truth(self) -> pd.DataFrame:
        return pd.read_csv(os.path.join(self.data_dir, "transfer_decision_ground_truth.csv"))
