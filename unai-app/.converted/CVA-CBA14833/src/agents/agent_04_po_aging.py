from typing import Dict, Any, List
from langgraph.graph import StateGraph, END
from src.core.state import AgentState
from src.agents.base_graph import BaseAgentWorkflow
from src.data.datasource import BaseDataSource
from src.tools.aging_tools import AgingCalculationTools
from src.core.llm_factory import LLMFactory
from src.workflow.approval_manager import approval_manager
from src.workflow.simulation_executor import simulation_executor

class POAgingAgentWorkflow(BaseAgentWorkflow):
    """
    Agent 04: PO Aging Intelligence Agent (SC-A04-POA-001)
    LangGraph StateGraph workflow for investigating aged purchase orders and validating need state.
    """

    def __init__(self, data_source: BaseDataSource):
        super().__init__(agent_id="agent_04", agent_name="PO Aging Intelligence Agent")
        self.ds = data_source

    def build_graph(self) -> StateGraph:
        builder = StateGraph(AgentState)

        # Nodes
        builder.add_node("ingest_aged_po", self.node_ingest_po)
        builder.add_node("compute_aging_metrics", self.node_compute_metrics)
        builder.add_node("diagnose_root_cause", self.node_diagnose)
        builder.add_node("llm_reasoning", self.node_llm_reasoning)
        builder.add_node("route_action", self.node_route_action)

        # Edges
        builder.set_entry_point("ingest_aged_po")
        builder.add_edge("ingest_aged_po", "compute_aging_metrics")
        builder.add_edge("compute_aging_metrics", "diagnose_root_cause")
        builder.add_edge("diagnose_root_cause", "llm_reasoning")
        builder.add_edge("llm_reasoning", "route_action")
        builder.add_edge("route_action", END)

        return builder

    def node_ingest_po(self, state: AgentState) -> AgentState:
        identifier = str(state.get("case_id") or state.get("input_data", {}).get("case_id", "CASE01")).strip()

        open_pos = self.ds.load_table("agent_04", "current_open_purchase_orders")
        po_rec = next((p for p in open_pos if str(p.get("case_id", "")).strip() == identifier or str(p.get("po_number", "")).strip() == identifier), None)
        if not po_rec and open_pos:
            po_rec = open_pos[0]
            identifier = str(po_rec.get("case_id", "CASE01")).strip()

        po_num = po_rec.get("po_number", "45001001") if po_rec else "45001001"

        # Load context
        reqs = self.ds.load_table("agent_04", "requirements")
        releases = self.ds.load_table("agent_04", "po_release_status")
        invoices = self.ds.load_table("agent_04", "invoice_status")
        changes = self.ds.load_table("agent_04", "po_change_history")

        req_rec = next((r for r in reqs if str(r.get("linked_po_number", "")).strip() == str(po_num)), {})
        rel_rec = next((r for r in releases if str(r.get("po_number", "")).strip() == str(po_num)), {})
        inv_rec = next((i for i in invoices if str(i.get("po_number", "")).strip() == str(po_num)), {})
        po_changes = [c for c in changes if str(c.get("po_number", "")).strip() == str(po_num)]

        state["case_id"] = identifier
        state["input_data"] = po_rec or {}
        state["context_data"] = {
            "requirement": req_rec,
            "release": rel_rec,
            "invoice": inv_rec,
            "changes": po_changes
        }
        return state

    def node_compute_metrics(self, state: AgentState) -> AgentState:
        po_rec = state.get("input_data", {})

        ord_q = float(po_rec.get("ordered_qty", 0.0))
        rec_q = float(po_rec.get("received_qty", 0.0))
        price = float(po_rec.get("net_unit_price", 0.0))
        po_date = po_rec.get("po_date", "2026-02-01")
        req_date = po_rec.get("requested_delivery_date", "2026-03-15")
        snap_date = po_rec.get("snapshot_date", "2026-09-10")

        aging_metrics = AgingCalculationTools.calculate_aging_metrics(
            ordered_qty=ord_q,
            received_qty=rec_q,
            net_unit_price=price,
            po_date_str=po_date,
            requested_delivery_date_str=req_date,
            snapshot_date_str=snap_date
        )

        state["deterministic_metrics"] = {
            "aging_metrics": aging_metrics
        }
        return state

    def node_diagnose(self, state: AgentState) -> AgentState:
        metrics = state.get("deterministic_metrics", {}).get("aging_metrics", {})
        ctx = state.get("context_data", {})

        diagnosis = AgingCalculationTools.diagnose_po_root_cause(
            aging_metrics=metrics,
            requirement_record=ctx.get("requirement"),
            release_record=ctx.get("release"),
            invoice_record=ctx.get("invoice"),
            change_history=ctx.get("changes")
        )

        state["policy_evaluation"] = diagnosis
        return state

    def node_llm_reasoning(self, state: AgentState) -> AgentState:
        po_rec = state.get("input_data", {})
        metrics = state.get("deterministic_metrics", {}).get("aging_metrics", {})
        policy = state.get("policy_evaluation", {})

        prompt = f"""
You are an expert SAP MM Purchasing & Accounts Payable Auditor.
Synthesize the aged PO diagnosis into a clear operational directive for the purchasing manager:

Case: {po_rec.get('case_id')} | PO Number: {po_rec.get('po_number')} (Item {po_rec.get('item')})
Supplier: {po_rec.get('supplier_id')}, Plant: {po_rec.get('plant_id')}, Material: {po_rec.get('material_id')}
Order Status: {metrics.get('ordered_qty')} ordered, {metrics.get('received_qty')} received, Remaining: {metrics.get('remaining_qty')} (Value: INR {metrics.get('po_value_remaining')})
Timeline: PO Date: {po_rec.get('po_date')}, Aging Days: {metrics.get('aging_days')} days, Overdue: {metrics.get('due_days')} days
Root Cause Diagnosis: {policy.get('root_cause')}
Recommended Resolution: {policy.get('recommended_action')}

Explain why this PO has remained open, whether the underlying demand is valid, and justify the recommended lifecycle action.
"""
        reasoning = LLMFactory.generate_completion(
            prompt=prompt,
            system_prompt="You are an enterprise SAP procurement auditor. Provide concise, legally and operationally rigorous reasoning."
        )

        if not reasoning or "System Note" in reasoning:
            reasoning = (
                f"PO {po_rec.get('po_number')} (Case {po_rec.get('case_id')}) has been open for {metrics.get('aging_days')} days "
                f"with {metrics.get('remaining_qty')} unfulfilled units (Value INR {metrics.get('po_value_remaining')}). "
                f"Root cause investigation identifies '{policy.get('root_cause')}': {policy.get('rationale')}. "
                f"Recommended workflow action: {policy.get('recommended_action')}."
            )

        state["reasoning_summary"] = reasoning
        state["confidence_score"] = 0.97
        return state

    def node_route_action(self, state: AgentState) -> AgentState:
        po_rec = state.get("input_data", {})
        policy = state.get("policy_evaluation", {})
        metrics = state.get("deterministic_metrics", {}).get("aging_metrics", {})
        rem_val = metrics.get("po_value_remaining", 0.0)

        consequential = policy.get("consequential_action_required", False)
        action_name = policy.get("recommended_action", "KEEP_OPEN")

        recommendation = {
            "action_type": action_name,
            "target_object_id": po_rec.get("po_number", "UNKNOWN"),
            "proposed_value": {
                "case_id": po_rec.get("case_id"),
                "root_cause": policy.get("root_cause"),
                "remaining_quantity": metrics.get("remaining_qty"),
                "remaining_value": rem_val
            },
            "rationale": state.get("reasoning_summary", ""),
            "estimated_economic_impact": rem_val,
            "requires_approval": consequential
        }

        state["recommendation"] = recommendation
        state["requires_approval"] = consequential

        if consequential:
            ticket = approval_manager.create_approval_request(
                agent_id="agent_04",
                case_id=state.get("case_id", ""),
                action_type=action_name,
                target_object_id=po_rec.get("po_number", "UNKNOWN"),
                proposed_value=recommendation["proposed_value"],
                rationale=recommendation["rationale"],
                estimated_impact=rem_val
            )
            state["approval_status"] = "PENDING"
            state["approval_id"] = ticket["approval_id"]
            state["execution_result"] = {
                "message": f"Action ticket {ticket['approval_id']} created. Awaiting procurement manager approval."
            }
            state["verification_status"] = "AWAITING_APPROVAL"
        else:
            state["approval_status"] = "NOT_REQUIRED"
            sim_res = simulation_executor.execute_action(
                action_type=action_name,
                target_object_id=po_rec.get("po_number", "UNKNOWN"),
                parameters={"status": "PO_MAINTAINED_OPEN"}
            )
            state["execution_result"] = sim_res
            state["verification_status"] = "VERIFIED_ACTIVE"

        return state
