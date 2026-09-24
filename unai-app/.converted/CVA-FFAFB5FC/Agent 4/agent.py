"""
Agent 04: PO Aging Intelligence Agent (LangGraph Workflow)
Diagnoses aged purchase orders, distinguishes valid future demand from dead commitments,
and formulates administrative cleanup or supplier review actions under HITL governance.
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

from tools import AgingCalculationTools, LocalAgingDataLoader
try:
    from src.core.llm_factory import LLMFactory
except ImportError:
    LLMFactory = None

class AgingAgentState(TypedDict):
    case_id: str
    po_number: str
    supplier_id: str
    plant_id: str
    material_id: str
    ordered_qty: float
    received_qty: float
    net_unit_price: float
    po_date: str
    requested_delivery_date: str
    snapshot_date: str
    aging_metrics: Dict[str, Any]
    diagnosis: Dict[str, Any]
    explanation: str
    hitl_status: str

def fetch_po_context(state: AgingAgentState) -> Dict[str, Any]:
    """Ensures input fields are properly initialized."""
    return {
        "case_id": state.get("case_id", "UNKNOWN"),
        "po_number": state.get("po_number", "UNKNOWN"),
        "supplier_id": state.get("supplier_id", "UNKNOWN"),
        "plant_id": state.get("plant_id", "UNKNOWN"),
        "material_id": state.get("material_id", "UNKNOWN"),
        "ordered_qty": float(state.get("ordered_qty", 0.0)),
        "received_qty": float(state.get("received_qty", 0.0)),
        "net_unit_price": float(state.get("net_unit_price", 0.0)),
        "po_date": str(state.get("po_date", "2026-01-01")),
        "requested_delivery_date": str(state.get("requested_delivery_date", "2026-02-01")),
        "snapshot_date": str(state.get("snapshot_date", "2026-09-10")),
    }

def compute_aging_metrics(state: AgingAgentState) -> Dict[str, Any]:
    """Calculates deterministic aging days, remaining quantity, and open value."""
    metrics = AgingCalculationTools.calculate_aging_metrics(
        ordered_qty=state.get("ordered_qty", 0.0),
        received_qty=state.get("received_qty", 0.0),
        net_unit_price=state.get("net_unit_price", 0.0),
        po_date_str=state.get("po_date", "2026-01-01"),
        requested_delivery_date_str=state.get("requested_delivery_date", "2026-02-01"),
        snapshot_date_str=state.get("snapshot_date", "2026-09-10")
    )
    return {"aging_metrics": metrics}

def diagnose_root_cause(state: AgingAgentState) -> Dict[str, Any]:
    """Diagnoses root cause of the aged line item across 7 operational archetypes."""
    existing = state.get("diagnosis", {})
    if existing.get("root_cause") and existing.get("root_cause") != "UNKNOWN":
        return {"diagnosis": existing}

    req = existing.get("requirement_record", {})
    rel = existing.get("release_record", {})
    inv = existing.get("invoice_record", {})
    changes = existing.get("change_history", [])

    diag = AgingCalculationTools.diagnose_po_root_cause(
        aging_metrics=state.get("aging_metrics", {}),
        requirement_record=req,
        release_record=rel,
        invoice_record=inv,
        change_history=changes
    )
    return {"diagnosis": diag}

def formulate_lifecycle_action(state: AgingAgentState) -> Dict[str, Any]:
    """Determines policy action and sets HITL status."""
    diag = state.get("diagnosis", {})
    consequential = diag.get("consequential_action_required", False)
    hitl_status = "PENDING_APPROVAL" if consequential else "AUTO_RESOLVED"
    return {"hitl_status": hitl_status}

def synthesize_explanation(state: AgingAgentState) -> Dict[str, Any]:
    """Synthesizes executive procurement explanation for purchasing managers."""
    m = state.get("aging_metrics", {})
    diag = state.get("diagnosis", {})
    po_num = state.get("po_number")
    rem_q = m.get("remaining_qty", 0.0)
    rem_val = m.get("po_value_remaining", 0.0)
    aging = m.get("aging_days", 0)
    cause = diag.get("root_cause", "UNKNOWN")
    action = diag.get("recommended_action", "KEEP_OPEN")

    prompt = (
        f"Purchase Order {po_num} has been open for {aging} days with residual open quantity of {rem_q} units "
        f"(open commitment INR {rem_val}). Diagnosed root cause: {cause}. Recommended action: {action}. "
        f"Provide a 2-sentence executive summary explaining the operational diagnosis and purchasing next step."
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
            f"PO {po_num} (open {aging} days, residual {rem_q} units valued at INR {rem_val:,.2f}) "
            f"is diagnosed with root cause '{cause}'. Purchasing policy directs action '{action}'."
        )

    return {"explanation": text}

def create_aging_agent_graph():
    """Builds and compiles the LangGraph StateGraph for PO Aging Intelligence."""
    workflow = StateGraph(AgingAgentState)

    workflow.add_node("fetch_po_context", fetch_po_context)
    workflow.add_node("compute_aging_metrics", compute_aging_metrics)
    workflow.add_node("diagnose_root_cause", diagnose_root_cause)
    workflow.add_node("formulate_lifecycle_action", formulate_lifecycle_action)
    workflow.add_node("synthesize_explanation", synthesize_explanation)

    workflow.set_entry_point("fetch_po_context")
    workflow.add_edge("fetch_po_context", "compute_aging_metrics")
    workflow.add_edge("compute_aging_metrics", "diagnose_root_cause")
    workflow.add_edge("diagnose_root_cause", "formulate_lifecycle_action")
    workflow.add_edge("formulate_lifecycle_action", "synthesize_explanation")
    workflow.add_edge("synthesize_explanation", END)

    return workflow.compile()
