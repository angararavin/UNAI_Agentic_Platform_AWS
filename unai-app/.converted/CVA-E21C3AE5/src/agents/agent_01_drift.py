from typing import Dict, Any, List
from langgraph.graph import StateGraph, END
from src.core.state import AgentState
from src.agents.base_graph import BaseAgentWorkflow
from src.data.datasource import BaseDataSource
from src.tools.drift_tools import DriftCalculationTools
from src.core.llm_factory import LLMFactory
from src.workflow.approval_manager import approval_manager
from src.workflow.simulation_executor import simulation_executor

class PODriftAgentWorkflow(BaseAgentWorkflow):
    """
    Agent 01: PO Promise Drift Agent (SC-A01-PPO-001)
    LangGraph StateGraph workflow for supplier delivery reliability and drift prediction.
    """

    def __init__(self, data_source: BaseDataSource):
        super().__init__(agent_id="agent_01", agent_name="PO Promise Drift Agent")
        self.ds = data_source

    def build_graph(self) -> StateGraph:
        builder = StateGraph(AgentState)

        # Nodes
        builder.add_node("ingest_evidence", self.node_ingest_evidence)
        builder.add_node("compute_deterministic_metrics", self.node_compute_metrics)
        builder.add_node("evaluate_policy", self.node_evaluate_policy)
        builder.add_node("llm_reasoning", self.node_llm_reasoning)
        builder.add_node("route_action", self.node_route_action)

        # Edges
        builder.set_entry_point("ingest_evidence")
        builder.add_edge("ingest_evidence", "compute_deterministic_metrics")
        builder.add_edge("compute_deterministic_metrics", "evaluate_policy")
        builder.add_edge("evaluate_policy", "llm_reasoning")
        builder.add_edge("llm_reasoning", "route_action")
        builder.add_edge("route_action", END)

        return builder

    def node_ingest_evidence(self, state: AgentState) -> AgentState:
        po_number = str(state.get("case_id") or state.get("input_data", {}).get("po_number", "450010000")).strip()

        # Load PO record
        current_pos = self.ds.load_table("agent_01", "current_purchase_orders")
        po_rec = next((p for p in current_pos if str(p.get("po_number", "")).strip() == po_number), None)
        if not po_rec and current_pos:
            po_rec = current_pos[0]
            po_number = str(po_rec.get("po_number", "450010000")).strip()

        supplier_id = po_rec.get("supplier_id", "SUP1001") if po_rec else "SUP1001"
        material_id = po_rec.get("material_id", "MAT1001") if po_rec else "MAT1001"

        # Load auxiliary context
        history = self.ds.load_table("agent_01", "historical_po_deliveries")
        mrp_list = self.ds.load_table("agent_01", "mrp_supply_context")
        impact_list = self.ds.load_table("agent_01", "downstream_impact")

        mrp_rec = next((m for m in mrp_list if str(m.get("po_number", "")).strip() == po_number), {})
        impact_rec = next((i for i in impact_list if str(i.get("po_number", "")).strip() == po_number), {})

        state["case_id"] = po_number
        state["input_data"] = po_rec or {}
        state["context_data"] = {
            "supplier_id": supplier_id,
            "material_id": material_id,
            "historical_deliveries": [h for h in history if str(h.get("supplier_id", "")).strip() == supplier_id],
            "mrp_context": mrp_rec,
            "downstream_impact": impact_rec
        }
        return state

    def node_compute_metrics(self, state: AgentState) -> AgentState:
        ctx = state.get("context_data", {})
        supplier_id = ctx.get("supplier_id", "")
        history = ctx.get("historical_deliveries", [])
        mrp = ctx.get("mrp_context", {})
        impact = ctx.get("downstream_impact", {})

        stats = DriftCalculationTools.compute_supplier_stats(history, supplier_id)
        downstream = DriftCalculationTools.calculate_downstream_exposure(state.get("input_data", {}), mrp, impact)

        state["deterministic_metrics"] = {
            "supplier_stats": stats,
            "downstream_metrics": downstream
        }
        return state

    def node_evaluate_policy(self, state: AgentState) -> AgentState:
        metrics = state.get("deterministic_metrics", {})
        po_rec = state.get("input_data", {})
        change_count = int(po_rec.get("confirmation_change_count", 0))

        policy = DriftCalculationTools.evaluate_drift_policy(
            metrics.get("supplier_stats", {}),
            metrics.get("downstream_metrics", {}),
            change_count
        )
        state["policy_evaluation"] = policy
        return state

    def node_llm_reasoning(self, state: AgentState) -> AgentState:
        po_rec = state.get("input_data", {})
        metrics = state.get("deterministic_metrics", {})
        policy = state.get("policy_evaluation", {})

        supplier_stats = metrics.get("supplier_stats", {})
        downstream = metrics.get("downstream_metrics", {})

        prompt = f"""
You are an expert SAP MM Purchasing Agent analyzing delivery risk.
Synthesize the factual evidence below into a concise explanation (2-3 sentences) for the buyer:

PO Number: {po_rec.get('po_number')}
Supplier: {supplier_stats.get('supplier_id')} (Historical Late Rate: {supplier_stats.get('late_delivery_rate_pct')}%, Severe Delay >3d Rate: {supplier_stats.get('severe_delay_rate_gt3d_pct')}%, Avg Delay: {supplier_stats.get('avg_delay_days')} days)
Confirmed Date: {po_rec.get('confirmed_delivery_date')} (Requested: {po_rec.get('requested_delivery_date')})
Downstream Exposure: {downstream.get('days_of_cover_without_po')} days stock cover remaining, {downstream.get('affected_production_orders')} production orders at risk, Exposure: INR {downstream.get('estimated_exposure_value')}
Risk Policy Band: {policy.get('risk_band')}
Recommended Action: {policy.get('default_action')}

Explain why this delivery commitment is at risk and why the proposed buyer action is justified.
"""
        reasoning = LLMFactory.generate_completion(
            prompt=prompt,
            system_prompt="You are an enterprise SAP supply chain specialist. Provide direct, factual, professional analysis without filler."
        )

        # High-confidence deterministic fallback if LLM offline
        if not reasoning or "System Note" in reasoning:
            reasoning = (
                f"Supplier {supplier_stats.get('supplier_id')} exhibits an observed late rate of {supplier_stats.get('late_delivery_rate_pct')}% "
                f"with an average delivery drift of {supplier_stats.get('avg_delay_days')} days. With only {downstream.get('days_of_cover_without_po')} "
                f"days of inventory cover remaining and {downstream.get('affected_production_orders')} production orders exposed, proactive "
                f"intervention ({policy.get('default_action')}) is warranted under corporate policy."
            )

        state["reasoning_summary"] = reasoning
        state["confidence_score"] = 0.95 if not supplier_stats.get("is_sparse_data") else 0.65
        return state

    def node_route_action(self, state: AgentState) -> AgentState:
        po_rec = state.get("input_data", {})
        policy = state.get("policy_evaluation", {})
        metrics = state.get("deterministic_metrics", {})
        impact_val = float(metrics.get("downstream_metrics", {}).get("estimated_exposure_value", 0.0))

        consequential = policy.get("consequential_action_required", False)
        action_name = policy.get("default_action", "MONITOR_INFORMATIONAL")

        recommendation = {
            "action_type": action_name,
            "target_object_id": po_rec.get("po_number", "UNKNOWN"),
            "proposed_value": {
                "adjusted_delivery_date": "EXPEDITED_CONFIRMATION",
                "predicted_delay_days": policy.get("predicted_drift_days", 0)
            },
            "rationale": state.get("reasoning_summary", ""),
            "estimated_economic_impact": impact_val,
            "requires_approval": consequential
        }

        state["recommendation"] = recommendation
        state["requires_approval"] = consequential

        if consequential:
            ticket = approval_manager.create_approval_request(
                agent_id="agent_01",
                case_id=state.get("case_id", ""),
                action_type=action_name,
                target_object_id=po_rec.get("po_number", "UNKNOWN"),
                proposed_value=recommendation["proposed_value"],
                rationale=recommendation["rationale"],
                estimated_impact=impact_val
            )
            state["approval_status"] = "PENDING"
            state["approval_id"] = ticket["approval_id"]
            state["execution_result"] = {
                "message": f"Action ticket {ticket['approval_id']} created. Awaiting human planner approval."
            }
            state["verification_status"] = "AWAITING_APPROVAL"
        else:
            state["approval_status"] = "NOT_REQUIRED"
            sim_res = simulation_executor.execute_action(
                action_type=action_name,
                target_object_id=po_rec.get("po_number", "UNKNOWN"),
                parameters={"status": "ON_TRACK"}
            )
            state["execution_result"] = sim_res
            state["verification_status"] = "VERIFIED_ON_TRACK"

        return state
