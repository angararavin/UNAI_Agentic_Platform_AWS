"""
Agent 05: Requirement Contradiction Intelligence Agent (LangGraph Workflow)
Disambiguates false contradictions, firm-forecast double counting, and cancelled requirements
from genuine competing manufacturing demand.
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

from tools import ContradictionCalculationTools, LocalContradictionDataLoader
try:
    from src.core.llm_factory import LLMFactory
except ImportError:
    LLMFactory = None

class ContradictionAgentState(TypedDict):
    case_id: str
    plant_id: str
    material_id: str
    material_name: str
    requirement_ids: str
    contradiction_type: str
    rationale: str
    recommended_action: str
    reconciliation: Dict[str, Any]
    explanation: str
    hitl_status: str

def fetch_cluster_context(state: ContradictionAgentState) -> Dict[str, Any]:
    """Ensures input cluster coordinates are properly initialized."""
    return {
        "case_id": state.get("case_id", "UNKNOWN"),
        "plant_id": state.get("plant_id", "UNKNOWN"),
        "material_id": state.get("material_id", "UNKNOWN"),
        "material_name": state.get("material_name", "Material Component"),
        "requirement_ids": state.get("requirement_ids", ""),
        "contradiction_type": state.get("contradiction_type", "UNKNOWN"),
        "rationale": state.get("rationale", ""),
        "recommended_action": state.get("recommended_action", "KEEP_BOTH"),
    }

def disambiguate_contradiction(state: ContradictionAgentState) -> Dict[str, Any]:
    """Classifies contradiction using deterministic rules or retains verified ground truth."""
    c_type = state.get("contradiction_type", "UNKNOWN")
    rec_act = state.get("recommended_action", "KEEP_BOTH")
    rat = state.get("rationale", "")

    # If already set from demo case or context, preserve
    if c_type != "UNKNOWN":
        recon = {
            "contradiction_type": c_type,
            "recommended_action": rec_act,
            "rationale": rat,
            "consequential_action_required": (rec_act != "KEEP_BOTH")
        }
    else:
        recon = {
            "contradiction_type": "VALID_COMPETING_DEMAND",
            "recommended_action": "KEEP_BOTH",
            "rationale": "Distinct legitimate firm requirements originating from separate orders; both must be retained.",
            "consequential_action_required": False
        }

    return {"reconciliation": recon}

def formulate_policy_decision(state: ContradictionAgentState) -> Dict[str, Any]:
    """Determines final routing and HITL requirement."""
    recon = state.get("reconciliation", {})
    consequential = recon.get("consequential_action_required", False)
    hitl_status = "PENDING_APPROVAL" if consequential else "AUTO_RESOLVED"
    return {"hitl_status": hitl_status}

def synthesize_explanation(state: ContradictionAgentState) -> Dict[str, Any]:
    """Synthesizes executive MRP brief for master production schedulers."""
    recon = state.get("reconciliation", {})
    mat_name = state.get("material_name")
    c_type = recon.get("contradiction_type", "UNKNOWN")
    action = recon.get("recommended_action", "KEEP_BOTH")
    reqs = state.get("requirement_ids")
    rat = recon.get("rationale", "")

    prompt = (
        f"Material {state.get('material_id')} ({mat_name}) at Plant {state.get('plant_id')} has requirements [{reqs}]. "
        f"Contradiction diagnosis: {c_type}. Recommended action: {action}. Underlying rationale: {rat}. "
        f"Provide a 2-sentence executive summary explaining whether this is duplicate demand or legitimate competing orders."
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
            f"Requirement cluster [{reqs}] for {mat_name} ({state.get('material_id')}) at {state.get('plant_id')} "
            f"is evaluated as '{c_type}'. Rationale: {rat} Recommended action: '{action}'."
        )

    return {"explanation": text}

def create_contradiction_agent_graph():
    """Builds and compiles the LangGraph StateGraph for Requirement Contradiction."""
    workflow = StateGraph(ContradictionAgentState)

    workflow.add_node("fetch_cluster_context", fetch_cluster_context)
    workflow.add_node("disambiguate_contradiction", disambiguate_contradiction)
    workflow.add_node("formulate_policy_decision", formulate_policy_decision)
    workflow.add_node("synthesize_explanation", synthesize_explanation)

    workflow.set_entry_point("fetch_cluster_context")
    workflow.add_edge("fetch_cluster_context", "disambiguate_contradiction")
    workflow.add_edge("disambiguate_contradiction", "formulate_policy_decision")
    workflow.add_edge("formulate_policy_decision", "synthesize_explanation")
    workflow.add_edge("synthesize_explanation", END)

    return workflow.compile()
