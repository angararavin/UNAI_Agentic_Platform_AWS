"""
Agent 02: Phantom Inventory Intelligence Agent (LangGraph Workflow)
Reconciles physical inventory discrepancies against operational usabilities (blocked, QA hold, reserved, expired, wrong bin).
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

from tools import InventoryCalculationTools, LocalPhantomDataLoader
try:
    from src.core.llm_factory import LLMFactory
except ImportError:
    LLMFactory = None

class PhantomAgentState(TypedDict):
    stock_id: str
    material_id: str
    plant_id: str
    storage_location: str
    physical_stock: float
    blocked_stock: float
    quality_hold_stock: float
    reserved_stock: float
    wrong_location_stock: float
    expired_stock: float
    reconciliation: Dict[str, Any]
    demand_coverage: Dict[str, Any]
    disposition: Dict[str, Any]
    explanation: str
    hitl_status: str

def fetch_inventory_state(state: PhantomAgentState) -> Dict[str, Any]:
    """Ensures input stock records and planted quantities are populated."""
    return {
        "stock_id": state.get("stock_id", "UNKNOWN"),
        "material_id": state.get("material_id", "UNKNOWN"),
        "plant_id": state.get("plant_id", "UNKNOWN"),
        "storage_location": state.get("storage_location", "UNKNOWN"),
        "physical_stock": float(state.get("physical_stock", 0.0)),
        "blocked_stock": float(state.get("blocked_stock", 0.0)),
        "quality_hold_stock": float(state.get("quality_hold_stock", 0.0)),
        "reserved_stock": float(state.get("reserved_stock", 0.0)),
        "wrong_location_stock": float(state.get("wrong_location_stock", 0.0)),
        "expired_stock": float(state.get("expired_stock", 0.0)),
    }

def reconcile_usable_stock(state: PhantomAgentState) -> Dict[str, Any]:
    """Pure deterministic arithmetic reconciling physical and usable stock."""
    recon = InventoryCalculationTools.calculate_usable_stock(
        physical_qty=state.get("physical_stock", 0.0),
        blocked_qty=state.get("blocked_stock", 0.0),
        quality_hold_qty=state.get("quality_hold_stock", 0.0),
        reserved_qty=state.get("reserved_stock", 0.0),
        wrong_location_qty=state.get("wrong_location_stock", 0.0),
        expired_qty=state.get("expired_stock", 0.0)
    )
    return {"reconciliation": recon}

def evaluate_demand_coverage(state: PhantomAgentState) -> Dict[str, Any]:
    """Evaluates whether remaining usable stock covers immediate production/sales demand."""
    usable = state.get("reconciliation", {}).get("usable_qty", 0.0)
    # Default demand estimate if not injected
    cov = InventoryCalculationTools.evaluate_demand_coverage(
        usable_qty=usable,
        next_7d_demand=float(state.get("demand_coverage", {}).get("next_7d_demand", 300.0)),
        next_30d_demand=float(state.get("demand_coverage", {}).get("next_30d_demand", 1000.0))
    )
    return {"demand_coverage": cov}

def formulate_disposition(state: PhantomAgentState) -> Dict[str, Any]:
    """Determines policy action and human-in-the-loop requirement."""
    recon = state.get("reconciliation", {})
    cov = state.get("demand_coverage", {})
    disp = InventoryCalculationTools.map_inventory_action(recon, cov)

    hitl_status = "PENDING_APPROVAL" if disp.get("consequential_action_required", False) else "AUTO_RESOLVED"
    return {
        "disposition": disp,
        "hitl_status": hitl_status
    }

def synthesize_explanation(state: PhantomAgentState) -> Dict[str, Any]:
    """Synthesizes natural language justification for the plant manager or inventory analyst."""
    recon = state.get("reconciliation", {})
    disp = state.get("disposition", {})
    cov = state.get("demand_coverage", {})
    p = recon.get("physical_qty", 0.0)
    u = recon.get("usable_qty", 0.0)
    phantom = recon.get("phantom_qty", 0.0)
    cause = recon.get("primary_phantom_cause", "NONE")
    action = disp.get("recommended_action", "NO_ACTION_HEALTHY")

    prompt = (
        f"Material {state.get('material_id')} at Plant {state.get('plant_id')} shows physical stock of {p} units, "
        f"but only {u} units are operationally usable ({phantom} units phantom inventory). "
        f"Primary discrepancy driver: {cause}. Recommended action: {action}. "
        f"7-day demand is {cov.get('next_7d_demand')} units."
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
            f"Material {state.get('material_id')} at Plant {state.get('plant_id')} (SLoc {state.get('storage_location')}) "
            f"has {p} physical units recorded, yet only {u} units are operationally usable due to {phantom} units tied up in {cause}. "
            f"Immediate action '{action}' is formulated to safeguard line operations and prevent stockouts."
        )

    return {"explanation": text}

def create_phantom_agent_graph():
    """Builds and compiles the LangGraph StateGraph for Phantom Inventory."""
    workflow = StateGraph(PhantomAgentState)

    workflow.add_node("fetch_inventory_state", fetch_inventory_state)
    workflow.add_node("reconcile_usable_stock", reconcile_usable_stock)
    workflow.add_node("evaluate_demand_coverage", evaluate_demand_coverage)
    workflow.add_node("formulate_disposition", formulate_disposition)
    workflow.add_node("synthesize_explanation", synthesize_explanation)

    workflow.set_entry_point("fetch_inventory_state")
    workflow.add_edge("fetch_inventory_state", "reconcile_usable_stock")
    workflow.add_edge("reconcile_usable_stock", "evaluate_demand_coverage")
    workflow.add_edge("evaluate_demand_coverage", "formulate_disposition")
    workflow.add_edge("formulate_disposition", "synthesize_explanation")
    workflow.add_edge("synthesize_explanation", END)

    return workflow.compile()
