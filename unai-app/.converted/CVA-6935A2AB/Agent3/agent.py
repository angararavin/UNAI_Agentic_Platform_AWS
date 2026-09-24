"""
Agent 03: Material Twin-Location Intelligence Agent (LangGraph Workflow)
Evaluates multi-plant surplus/shortage imbalances, safeguards source plant safety stock,
and balances transfer freight cost against avoided production stockout exposure.
"""

import os
import sys
from typing import Dict, Any, TypedDict, Optional
from langgraph.graph import StateGraph, END

# Handle local vs root imports
agent_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(agent_dir)
if agent_dir not in sys.path:
    sys.path.insert(0, agent_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from tools import TransferCalculationTools, LocalTwinLocationDataLoader
try:
    from src.core.llm_factory import LLMFactory
except ImportError:
    LLMFactory = None

class TwinLocationAgentState(TypedDict):
    transfer_option_id: str
    material_id: str
    source_plant: str
    destination_plant: str
    candidate_qty: float
    distance_km: float
    estimated_freight_cost: float
    transfer_lead_days: int
    estimated_stockout_cost: float
    unit_value: float
    source_on_hand: float
    source_demand_30d: float
    source_safety_stock: float
    source_protection: Dict[str, Any]
    economics: Dict[str, Any]
    explanation: str
    hitl_status: str

def fetch_transfer_candidate(state: TwinLocationAgentState) -> Dict[str, Any]:
    """Ensures input fields are properly initialized."""
    return {
        "transfer_option_id": state.get("transfer_option_id", "UNKNOWN"),
        "material_id": state.get("material_id", "UNKNOWN"),
        "source_plant": state.get("source_plant", "UNKNOWN"),
        "destination_plant": state.get("destination_plant", "UNKNOWN"),
        "candidate_qty": float(state.get("candidate_qty", 0.0)),
        "distance_km": float(state.get("distance_km", 0.0)),
        "estimated_freight_cost": float(state.get("estimated_freight_cost", 0.0)),
        "transfer_lead_days": int(state.get("transfer_lead_days", 1)),
        "estimated_stockout_cost": float(state.get("estimated_stockout_cost", 0.0)),
        "unit_value": float(state.get("unit_value", 50.0)),
    }

def audit_source_protection(state: TwinLocationAgentState) -> Dict[str, Any]:
    """Shields source plant safety stock and 30-day forward demand."""
    oh = float(state.get("source_on_hand", 0.0))
    d30 = float(state.get("source_demand_30d", 0.0))
    ss = float(state.get("source_safety_stock", 0.0))

    if oh > 0:
        prot = TransferCalculationTools.calculate_source_protection(
            on_hand_source=oh,
            next_30d_demand_source=d30,
            safety_stock_source=ss
        )
    else:
        # If running from direct transfer candidate without full plant stock row, pass through
        prot = {
            "source_on_hand": oh,
            "source_next_30d_demand": d30,
            "source_safety_stock": ss,
            "source_protected_stock": d30 + ss,
            "available_source_surplus": float(state.get("candidate_qty", 0.0)),
            "has_surplus_after_protection": True
        }

    return {"source_protection": prot}

def evaluate_transfer_economics(state: TwinLocationAgentState) -> Dict[str, Any]:
    """Computes net economic benefit (avoided stockout cost vs freight cost)."""
    surplus = state.get("source_protection", {}).get("available_source_surplus", float(state.get("candidate_qty", 0.0)))
    
    econ = TransferCalculationTools.calculate_transfer_economics(
        candidate_qty=state.get("candidate_qty", 0.0),
        source_surplus=surplus,
        unit_value=state.get("unit_value", 50.0),
        estimated_freight_cost=state.get("estimated_freight_cost", 0.0),
        estimated_stockout_cost=state.get("estimated_stockout_cost", 0.0)
    )
    return {"economics": econ}

def formulate_policy_decision(state: TwinLocationAgentState) -> Dict[str, Any]:
    """Determines final routing and HITL requirement."""
    econ = state.get("economics", {})
    decision = econ.get("decision", "REJECT_UNFAVORABLE_ECONOMICS")
    consequential = econ.get("consequential_action_required", False)

    hitl_status = "PENDING_APPROVAL" if consequential else "AUTO_REJECTED"
    return {"hitl_status": hitl_status}

def synthesize_explanation(state: TwinLocationAgentState) -> Dict[str, Any]:
    """Synthesizes executive reasoning for logistics planners."""
    econ = state.get("economics", {})
    decision = econ.get("decision", "")
    net_ben = econ.get("estimated_net_benefit", 0.0)
    freight = econ.get("estimated_freight_cost", 0.0)
    stockout = econ.get("avoided_stockout_cost", 0.0)
    qty = econ.get("feasible_transfer_qty", 0.0)
    val = econ.get("inventory_value_moved", 0.0)

    prompt = (
        f"Material {state.get('material_id')} transfer proposal from {state.get('source_plant')} to {state.get('destination_plant')}: "
        f"Candidate quantity {qty} units (Value INR {val}). Freight cost is INR {freight}, while avoided destination stockout cost "
        f"is INR {stockout}, generating a net economic benefit of INR {net_ben}. Decision: {decision}. "
        f"Provide a 2-sentence executive summary justifying this stock transfer order."
    )

    use_llm = os.getenv("USE_LIVE_LLM", "false").lower() == "true"
    text = ""
    if use_llm and LLMFactory:
        try:
            res = LLMFactory.generate_completion(prompt)
            if res and not res.startswith("MOCK / RULE-BASED SYNTHESIS:"):
                text = res.strip()
        except Exception:
            pass

    if not text:
        text = (
            f"Inter-plant transfer of {qty} units of {state.get('material_id')} from {state.get('source_plant')} to {state.get('destination_plant')} "
            f"is evaluated with a net benefit of INR {net_ben:.2f} (avoiding INR {stockout:.2f} in line stockout cost against INR {freight:.2f} freight). "
            f"Policy disposition: {decision}."
        )

    return {"explanation": text}

def create_twin_location_agent_graph():
    """Builds and compiles the LangGraph StateGraph for Material Twin-Location."""
    workflow = StateGraph(TwinLocationAgentState)

    workflow.add_node("fetch_transfer_candidate", fetch_transfer_candidate)
    workflow.add_node("audit_source_protection", audit_source_protection)
    workflow.add_node("evaluate_transfer_economics", evaluate_transfer_economics)
    workflow.add_node("formulate_policy_decision", formulate_policy_decision)
    workflow.add_node("synthesize_explanation", synthesize_explanation)

    workflow.set_entry_point("fetch_transfer_candidate")
    workflow.add_edge("fetch_transfer_candidate", "audit_source_protection")
    workflow.add_edge("audit_source_protection", "evaluate_transfer_economics")
    workflow.add_edge("evaluate_transfer_economics", "formulate_policy_decision")
    workflow.add_edge("formulate_policy_decision", "synthesize_explanation")
    workflow.add_edge("synthesize_explanation", END)

    return workflow.compile()
