import os
import csv
import time
from pathlib import Path
from typing import Dict, Any, List, TypedDict, Optional
from langgraph.graph import StateGraph, END
try:
    from tools import DriftCalculationTools
except ImportError:
    from .tools import DriftCalculationTools

class AgentState(TypedDict, total=False):
    agent_id: str
    case_id: str
    input_data: Dict[str, Any]
    context_data: Dict[str, Any]
    deterministic_metrics: Dict[str, Any]
    policy_evaluation: Dict[str, Any]
    reasoning_summary: str
    recommendation: Dict[str, Any]
    confidence_score: float
    requires_approval: bool
    approval_status: str
    execution_result: Dict[str, Any]
    latency_ms: float

class PODriftAgent:
    """
    Standalone POC LangGraph Agent for Agent 01: PO Promise Drift (SC-A01-PPO-001)
    """

    def __init__(self, data_dir: Optional[str] = None):
        if data_dir:
            self.data_dir = Path(data_dir)
        else:
            self.data_dir = Path(__file__).resolve().parent / "PO_Promise_Drift_Synthetic_Data"
        self._cache: Dict[str, List[Dict[str, Any]]] = {}
        self.graph = self._build_graph().compile()

    def _load_csv(self, filename: str) -> List[Dict[str, Any]]:
        if filename in self._cache:
            return self._cache[filename]
        filepath = self.data_dir / (filename if filename.endswith(".csv") else f"{filename}.csv")
        records = []
        if filepath.exists():
            with open(filepath, mode="r", encoding="utf-8", errors="ignore") as f:
                reader = csv.DictReader(f)
                for r in reader:
                    records.append({k.strip(): v.strip() for k, v in r.items() if k})
        self._cache[filename] = records
        return records

    def _build_graph(self) -> StateGraph:
        b = StateGraph(AgentState)
        b.add_node("ingest", self._node_ingest)
        b.add_node("compute_metrics", self._node_compute_metrics)
        b.add_node("evaluate_policy", self._node_evaluate_policy)
        b.add_node("synthesize_reasoning", self._node_synthesize_reasoning)
        b.add_node("route_action", self._node_route_action)

        b.set_entry_point("ingest")
        b.add_edge("ingest", "compute_metrics")
        b.add_edge("compute_metrics", "evaluate_policy")
        b.add_edge("evaluate_policy", "synthesize_reasoning")
        b.add_edge("synthesize_reasoning", "route_action")
        b.add_edge("route_action", END)
        return b

    def _node_ingest(self, state: AgentState) -> AgentState:
        po_num = str(state.get("case_id", "450010000")).strip()
        current_pos = self._load_csv("current_purchase_orders")
        po_rec = next((p for p in current_pos if p.get("po_number", "") == po_num), None)
        if not po_rec and current_pos:
            po_rec = current_pos[0]
            po_num = po_rec.get("po_number", "450010000")

        supp_id = po_rec.get("supplier_id", "SUP1001") if po_rec else "SUP1001"
        history = self._load_csv("historical_po_deliveries")
        mrp = self._load_csv("mrp_supply_context")
        impact = self._load_csv("downstream_impact")

        mrp_rec = next((m for m in mrp if m.get("po_number") == po_num), {})
        impact_rec = next((i for i in impact if i.get("po_number") == po_num), {})

        state["case_id"] = po_num
        state["input_data"] = po_rec or {}
        state["context_data"] = {
            "supplier_id": supp_id,
            "historical_deliveries": [h for h in history if h.get("supplier_id") == supp_id],
            "mrp_context": mrp_rec,
            "downstream_impact": impact_rec
        }
        return state

    def _node_compute_metrics(self, state: AgentState) -> AgentState:
        ctx = state.get("context_data", {})
        stats = DriftCalculationTools.compute_supplier_stats(
            ctx.get("historical_deliveries", []),
            ctx.get("supplier_id", "")
        )
        downstream = DriftCalculationTools.calculate_downstream_exposure(
            state.get("input_data", {}),
            ctx.get("mrp_context", {}),
            ctx.get("downstream_impact", {})
        )
        state["deterministic_metrics"] = {
            "supplier_stats": stats,
            "downstream_metrics": downstream
        }
        return state

    def _node_evaluate_policy(self, state: AgentState) -> AgentState:
        m = state.get("deterministic_metrics", {})
        po_rec = state.get("input_data", {})
        changes = int(po_rec.get("confirmation_change_count", 0))

        policy = DriftCalculationTools.evaluate_drift_policy(
            m.get("supplier_stats", {}),
            m.get("downstream_metrics", {}),
            changes
        )
        state["policy_evaluation"] = policy
        return state

    def _node_synthesize_reasoning(self, state: AgentState) -> AgentState:
        po_rec = state.get("input_data", {})
        m = state.get("deterministic_metrics", {})
        pol = state.get("policy_evaluation", {})

        s_stats = m.get("supplier_stats", {})
        down = m.get("downstream_metrics", {})

        # Grounded reasoning
        reasoning = (
            f"Supplier {s_stats.get('supplier_id')} exhibits an observed late delivery rate of {s_stats.get('late_delivery_rate_pct')}% "
            f"(severe delay rate >3d of {s_stats.get('severe_delay_rate_gt3d_pct')}%) with an average drift of {s_stats.get('avg_delay_days')} days. "
            f"With only {down.get('days_of_cover_without_po')} days of inventory cover remaining and {down.get('affected_production_orders')} "
            f"production orders threatened (estimated business exposure INR {down.get('estimated_exposure_value')}), "
            f"policy dictates action '{pol.get('default_action')}'. Risk classified as {pol.get('risk_band')}."
        )

        state["reasoning_summary"] = reasoning
        state["confidence_score"] = 0.95 if not s_stats.get("is_sparse_data") else 0.60
        return state

    def _node_route_action(self, state: AgentState) -> AgentState:
        po_rec = state.get("input_data", {})
        pol = state.get("policy_evaluation", {})
        m = state.get("deterministic_metrics", {})

        consequential = pol.get("consequential_action_required", False)
        action_name = pol.get("default_action", "MONITOR_INFORMATIONAL")

        recommendation = {
            "action_type": action_name,
            "target_po": po_rec.get("po_number"),
            "supplier_id": po_rec.get("supplier_id"),
            "risk_band": pol.get("risk_band"),
            "predicted_drift_days": pol.get("predicted_drift_days"),
            "estimated_exposure_value": m.get("downstream_metrics", {}).get("estimated_exposure_value"),
            "requires_human_approval": consequential
        }

        state["recommendation"] = recommendation
        state["requires_approval"] = consequential
        state["approval_status"] = "PENDING_APPROVAL" if consequential else "AUTO_RECONCILED"
        state["execution_result"] = {
            "mode": "SIMULATION_SAFE",
            "action": action_name,
            "status": "AWAITING_SUPERVISOR_SIGN_OFF" if consequential else "LOGGED_ON_TRACK"
        }
        return state

    def run(self, case_id: str) -> AgentState:
        t0 = time.time()
        res = self.graph.invoke({"case_id": str(case_id)})
        res["latency_ms"] = round((time.time() - t0) * 1000.0, 2)
        return res
