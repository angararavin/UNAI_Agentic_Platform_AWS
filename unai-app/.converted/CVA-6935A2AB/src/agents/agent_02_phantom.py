from typing import Dict, Any, List
from langgraph.graph import StateGraph, END
from src.core.state import AgentState
from src.agents.base_graph import BaseAgentWorkflow
from src.data.datasource import BaseDataSource
from src.tools.inventory_tools import InventoryCalculationTools
from src.core.llm_factory import LLMFactory
from src.workflow.approval_manager import approval_manager
from src.workflow.simulation_executor import simulation_executor

class PhantomInventoryAgentWorkflow(BaseAgentWorkflow):
    """
    Agent 02: Phantom Inventory Agent (SC-A02-PHI-001)
    LangGraph StateGraph workflow for ERP physical vs. usable operational inventory reconciliation.
    """

    def __init__(self, data_source: BaseDataSource):
        super().__init__(agent_id="agent_02", agent_name="Phantom Inventory Agent")
        self.ds = data_source

    def build_graph(self) -> StateGraph:
        builder = StateGraph(AgentState)

        # Nodes
        builder.add_node("ingest_stock_and_constraints", self.node_ingest_stock)
        builder.add_node("compute_usable_metrics", self.node_compute_metrics)
        builder.add_node("classify_and_evaluate_policy", self.node_evaluate_policy)
        builder.add_node("llm_reasoning", self.node_llm_reasoning)
        builder.add_node("route_action", self.node_route_action)

        # Edges
        builder.set_entry_point("ingest_stock_and_constraints")
        builder.add_edge("ingest_stock_and_constraints", "compute_usable_metrics")
        builder.add_edge("compute_usable_metrics", "classify_and_evaluate_policy")
        builder.add_edge("classify_and_evaluate_policy", "llm_reasoning")
        builder.add_edge("llm_reasoning", "route_action")
        builder.add_edge("route_action", END)

        return builder

    def node_ingest_stock(self, state: AgentState) -> AgentState:
        stock_id = str(state.get("case_id") or state.get("input_data", {}).get("stock_id", "STK100000")).strip()

        stocks = self.ds.load_table("agent_02", "inventory_stock")
        stock_rec = next((s for s in stocks if str(s.get("stock_id", "")).strip() == stock_id), None)
        if not stock_rec and stocks:
            stock_rec = stocks[0]
            stock_id = str(stock_rec.get("stock_id", "STK100000")).strip()

        demands = self.ds.load_table("agent_02", "demand_requirements")
        demand_rec = next((d for d in demands if str(d.get("stock_id", "")).strip() == stock_id), {})

        state["case_id"] = stock_id
        state["input_data"] = stock_rec or {}
        state["context_data"] = {
            "demand": demand_rec
        }
        return state

    def node_compute_metrics(self, state: AgentState) -> AgentState:
        rec = state.get("input_data", {})
        ctx = state.get("context_data", {})
        demand_rec = ctx.get("demand", {})

        p_qty = float(rec.get("physical_qty", 0.0))
        b_qty = float(rec.get("blocked_qty", 0.0))
        q_qty = float(rec.get("quality_hold_qty", 0.0))
        r_qty = float(rec.get("reserved_qty", 0.0))
        w_qty = float(rec.get("wrong_location_qty", 0.0))
        e_qty = float(rec.get("expired_qty", 0.0))

        phantom_metrics = InventoryCalculationTools.calculate_usable_stock(
            physical_qty=p_qty,
            blocked_qty=b_qty,
            quality_hold_qty=q_qty,
            reserved_qty=r_qty,
            wrong_location_qty=w_qty,
            expired_qty=e_qty
        )

        d7 = float(demand_rec.get("next_7d_demand", 0.0))
        d30 = float(demand_rec.get("next_30d_demand", 0.0))

        coverage_metrics = InventoryCalculationTools.evaluate_demand_coverage(
            usable_qty=phantom_metrics["usable_qty"],
            next_7d_demand=d7,
            next_30d_demand=d30
        )

        state["deterministic_metrics"] = {
            "phantom_metrics": phantom_metrics,
            "coverage_metrics": coverage_metrics
        }
        return state

    def node_evaluate_policy(self, state: AgentState) -> AgentState:
        metrics = state.get("deterministic_metrics", {})
        policy = InventoryCalculationTools.map_inventory_action(
            metrics.get("phantom_metrics", {}),
            metrics.get("coverage_metrics", {})
        )
        state["policy_evaluation"] = policy
        return state

    def node_llm_reasoning(self, state: AgentState) -> AgentState:
        rec = state.get("input_data", {})
        metrics = state.get("deterministic_metrics", {})
        policy = state.get("policy_evaluation", {})

        pm = metrics.get("phantom_metrics", {})
        cm = metrics.get("coverage_metrics", {})

        prompt = f"""
You are an expert SAP MM/IM Inventory Management Agent.
Synthesize the factual inventory reconciliation into an operational explanation for the plant warehouse manager:

Stock ID: {rec.get('stock_id')} (Material: {rec.get('material_id')}, Plant: {rec.get('plant_id')}, Storage Loc: {rec.get('storage_location')})
ERP Reported Physical Qty: {pm.get('physical_qty')}
Operationally Usable Qty: {pm.get('usable_qty')}
Phantom (Unusable) Qty: {pm.get('phantom_qty')} (Ratio: {pm.get('phantom_ratio')})
Primary Cause: {pm.get('primary_phantom_cause')}
Unavailable Breakdown: {pm.get('unavailable_breakdown')}
Forward Demand: Next 7d: {cm.get('next_7d_demand')} units, Next 30d: {cm.get('next_30d_demand')} units
Operational Usable Coverage: {cm.get('usable_30d_coverage_ratio')}x of 30-day demand
Recommended Disposition: {policy.get('recommended_action')}

Explain why this phantom inventory creates risk for upcoming requirements and why the proposed recovery action is essential.
"""
        reasoning = LLMFactory.generate_completion(
            prompt=prompt,
            system_prompt="You are an enterprise SAP inventory specialist. Provide precise, factual reconciliation analysis."
        )

        if not reasoning or "System Note" in reasoning:
            reasoning = (
                f"For material {rec.get('material_id')} at plant {rec.get('plant_id')}, physical stock reports {pm.get('physical_qty')} units "
                f"but true operational usability is restricted to {pm.get('usable_qty')} units due to {pm.get('primary_phantom_cause')} "
                f"({pm.get('phantom_qty')} units phantom). With next 30-day demand requiring {cm.get('next_30d_demand')} units, "
                f"immediate action ({policy.get('recommended_action')}) is required to prevent downstream stockout."
            )

        state["reasoning_summary"] = reasoning
        state["confidence_score"] = 0.98
        return state

    def node_route_action(self, state: AgentState) -> AgentState:
        rec = state.get("input_data", {})
        policy = state.get("policy_evaluation", {})
        metrics = state.get("deterministic_metrics", {})
        phantom_q = metrics.get("phantom_metrics", {}).get("phantom_qty", 0.0)

        consequential = policy.get("consequential_action_required", False)
        action_name = policy.get("recommended_action", "NO_ACTION_HEALTHY")

        recommendation = {
            "action_type": action_name,
            "target_object_id": rec.get("stock_id", "UNKNOWN"),
            "proposed_value": {
                "material_id": rec.get("material_id"),
                "plant_id": rec.get("plant_id"),
                "phantom_quantity_to_resolve": phantom_q
            },
            "rationale": state.get("reasoning_summary", ""),
            "estimated_economic_impact": phantom_q * 150.0,  # Estimated inventory carrying value
            "requires_approval": consequential
        }

        state["recommendation"] = recommendation
        state["requires_approval"] = consequential

        if consequential:
            ticket = approval_manager.create_approval_request(
                agent_id="agent_02",
                case_id=state.get("case_id", ""),
                action_type=action_name,
                target_object_id=rec.get("stock_id", "UNKNOWN"),
                proposed_value=recommendation["proposed_value"],
                rationale=recommendation["rationale"],
                estimated_impact=recommendation["estimated_economic_impact"]
            )
            state["approval_status"] = "PENDING"
            state["approval_id"] = ticket["approval_id"]
            state["execution_result"] = {
                "message": f"Action ticket {ticket['approval_id']} created. Awaiting warehouse manager approval."
            }
            state["verification_status"] = "AWAITING_APPROVAL"
        else:
            state["approval_status"] = "NOT_REQUIRED"
            sim_res = simulation_executor.execute_action(
                action_type=action_name,
                target_object_id=rec.get("stock_id", "UNKNOWN"),
                parameters={"status": "USABLE_VALIDATED"}
            )
            state["execution_result"] = sim_res
            state["verification_status"] = "VERIFIED_HEALTHY"

        return state
