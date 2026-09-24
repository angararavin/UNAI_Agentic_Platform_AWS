from typing import Dict, Any, List
from langgraph.graph import StateGraph, END
from src.core.state import AgentState
from src.agents.base_graph import BaseAgentWorkflow
from src.data.datasource import BaseDataSource
from src.tools.transfer_tools import TransferCalculationTools
from src.core.llm_factory import LLMFactory
from src.agents.unai_bridge import run_unai
from src.workflow.approval_manager import approval_manager
from src.workflow.simulation_executor import simulation_executor

class TwinLocationAgentWorkflow(BaseAgentWorkflow):
    """
    Agent 03: Material Twin-Location Agent (SC-A03-MTL-001)
    LangGraph StateGraph workflow for inter-plant inventory balancing and transfer economics.
    """

    def __init__(self, data_source: BaseDataSource):
        super().__init__(agent_id="agent_03", agent_name="Material Twin-Location Agent")
        self.ds = data_source

    def build_graph(self) -> StateGraph:
        builder = StateGraph(AgentState)

        # Nodes
        builder.add_node("ingest_transfer_option", self.node_ingest_transfer)
        builder.add_node("compute_source_and_economics", self.node_compute_metrics)
        builder.add_node("llm_reasoning", self.node_llm_reasoning)
        builder.add_node("route_action", self.node_route_action)

        # Edges
        builder.set_entry_point("ingest_transfer_option")
        builder.add_edge("ingest_transfer_option", "compute_source_and_economics")
        builder.add_edge("compute_source_and_economics", "llm_reasoning")
        builder.add_edge("llm_reasoning", "route_action")
        builder.add_edge("route_action", END)

        return builder

    def node_ingest_transfer(self, state: AgentState) -> AgentState:
        transfer_id = str(state.get("case_id") or state.get("input_data", {}).get("transfer_option_id", "TR70000")).strip()

        candidates = self.ds.load_table("agent_03", "candidate_transfer_options")
        cand_rec = next((c for c in candidates if str(c.get("transfer_option_id", "")).strip() == transfer_id), None)
        if not cand_rec and candidates:
            cand_rec = candidates[0]
            transfer_id = str(cand_rec.get("transfer_option_id", "TR70000")).strip()

        src_plant = cand_rec.get("source_plant", "PL01") if cand_rec else "PL01"
        mat_id = cand_rec.get("material_id", "MAT3001") if cand_rec else "MAT3001"

        stocks = self.ds.load_table("agent_03", "plant_material_stock")
        src_stock = next((s for s in stocks if str(s.get("plant_id", "")).strip() == src_plant and str(s.get("material_id", "")).strip() == mat_id), {})

        demands = self.ds.load_table("agent_03", "plant_material_demand")
        src_demand = next((d for d in demands if str(d.get("plant_id", "")).strip() == src_plant and str(d.get("material_id", "")).strip() == mat_id), {})

        materials = self.ds.load_table("agent_03", "materials")
        mat_rec = next((m for m in materials if str(m.get("material_id", "")).strip() == mat_id), {})

        state["case_id"] = transfer_id
        state["input_data"] = cand_rec or {}
        state["context_data"] = {
            "source_stock": src_stock,
            "source_demand": src_demand,
            "material": mat_rec
        }
        return state

    def node_compute_metrics(self, state: AgentState) -> AgentState:
        cand = state.get("input_data", {})
        ctx = state.get("context_data", {})
        src_stock = ctx.get("source_stock", {})
        src_demand = ctx.get("source_demand", {})
        mat_rec = ctx.get("material", {})

        on_hand = float(src_stock.get("on_hand_qty", 0.0))
        d30 = float(src_demand.get("next_30d_demand", 0.0))
        safety_stock = float(src_stock.get("safety_stock", mat_rec.get("default_safety_stock", 50.0)))

        source_prot = TransferCalculationTools.calculate_source_protection(
            on_hand_source=on_hand,
            next_30d_demand_source=d30,
            safety_stock_source=safety_stock
        )

        cand_qty = float(cand.get("candidate_qty", 0.0))
        unit_val = float(mat_rec.get("unit_value", 85.0))
        freight = float(cand.get("estimated_freight_cost", 0.0))
        stockout = float(cand.get("estimated_stockout_cost", 0.0))

        economics = TransferCalculationTools.calculate_transfer_economics(
            candidate_qty=cand_qty,
            source_surplus=source_prot["available_source_surplus"],
            unit_value=unit_val,
            estimated_freight_cost=freight,
            estimated_stockout_cost=stockout
        )

        state["deterministic_metrics"] = {
            "source_protection": source_prot,
            "economics": economics
        }
        state["policy_evaluation"] = {
            "decision": economics["decision"],
            "decision_reason": economics["decision_reason"],
            "consequential_action_required": economics["consequential_action_required"]
        }
        return state

    def node_llm_reasoning(self, state: AgentState) -> AgentState:
        cand = state.get("input_data", {})
        metrics = state.get("deterministic_metrics", {})
        policy = state.get("policy_evaluation", {})

        sp = metrics.get("source_protection", {})
        ec = metrics.get("economics", {})

        prompt = f"""
You are an expert SAP Supply Network Planner.
Synthesize the inter-plant stock transfer proposal into a concise rationale for the logistics manager:

Transfer Option: {cand.get('transfer_option_id')}
Material: {cand.get('material_id')} from Source Plant {cand.get('source_plant')} to Destination {cand.get('destination_plant')}
Source Plant On-Hand: {sp.get('source_on_hand')} units (Protected Stock: {sp.get('source_protected_stock')}, Surplus: {sp.get('available_source_surplus')})
Requested Transfer Qty: {cand.get('candidate_qty')} units, Feasible Qty: {ec.get('feasible_transfer_qty')} units
Economics: Freight Cost: INR {ec.get('estimated_freight_cost')}, Avoided Stockout Cost: INR {ec.get('avoided_stockout_cost')}, Net Benefit: INR {ec.get('estimated_net_benefit')}
Decision: {policy.get('decision')}

Provide a clear explanation of whether this transfer should be approved or rejected based on source safety stock protection and net economic benefit.
"""
        system_prompt = "You are an enterprise SAP supply network specialist. Provide succinct, data-backed reasoning."
        fallback_reasoning = (
            f"Evaluation for material {cand.get('material_id')} moving {cand.get('source_plant')} -> {cand.get('destination_plant')}: "
            f"Source holds {sp.get('source_on_hand')} units, reserving {sp.get('source_protected_stock')} for safety and 30d demand, leaving "
            f"{sp.get('available_source_surplus')} available surplus. With freight cost of INR {ec.get('estimated_freight_cost')} vs avoided "
            f"stockout cost of INR {ec.get('avoided_stockout_cost')}, the net operational benefit is INR {ec.get('estimated_net_benefit')}. "
            f"Outcome: {policy.get('decision')}."
        )
        # multi_echelon_balance is this domain's real UNAI capability
        # (inter-plant/echelon stock rebalancing), systems ["SAP_MM","SAP_IBP"]
        # lifted verbatim from engine.js's own pre-built use case.
        try:
            ev, tc = run_unai(
                capability="multi_echelon_balance", systems=["SAP_MM", "SAP_IBP"], agent_id="agent_03",
                system_instruction=system_prompt, prompt=prompt, completion_text=fallback_reasoning,
            )
            reasoning = f"{ev.get('explanation') or fallback_reasoning} (this run — {cand.get('material_id')}, {cand.get('source_plant')} -> {cand.get('destination_plant')}.)"
            confidence = ev.get("confidence", 0.96)
        except Exception:
            reasoning = fallback_reasoning
            confidence = 0.96
            tc = None

        state["reasoning_summary"] = reasoning
        state["confidence_score"] = confidence
        state["unai_token_comparison"] = tc
        state["model_used"] = "UNAI Shared Cognitive Engine"
        return state

    def node_route_action(self, state: AgentState) -> AgentState:
        cand = state.get("input_data", {})
        policy = state.get("policy_evaluation", {})
        metrics = state.get("deterministic_metrics", {})
        ec = metrics.get("economics", {})

        consequential = policy.get("consequential_action_required", False)
        decision = policy.get("decision", "REJECT")

        recommendation = {
            "action_type": "CREATE_STO_TRANSFER" if consequential else decision,
            "target_object_id": cand.get("transfer_option_id", "UNKNOWN"),
            "proposed_value": {
                "source_plant": cand.get("source_plant"),
                "destination_plant": cand.get("destination_plant"),
                "material_id": cand.get("material_id"),
                "transfer_qty": ec.get("feasible_transfer_qty", 0.0),
                "movement_type": "351/101_STO"
            },
            "rationale": state.get("reasoning_summary", ""),
            "estimated_economic_impact": ec.get("estimated_net_benefit", 0.0),
            "requires_approval": consequential
        }

        state["recommendation"] = recommendation
        state["requires_approval"] = consequential

        if consequential:
            ticket = approval_manager.create_approval_request(
                agent_id="agent_03",
                case_id=state.get("case_id", ""),
                action_type="CREATE_STO_TRANSFER",
                target_object_id=cand.get("transfer_option_id", "UNKNOWN"),
                proposed_value=recommendation["proposed_value"],
                rationale=recommendation["rationale"],
                estimated_impact=recommendation["estimated_economic_impact"]
            )
            state["approval_status"] = "PENDING"
            state["approval_id"] = ticket["approval_id"]
            state["execution_result"] = {
                "message": f"Action ticket {ticket['approval_id']} created. Awaiting logistics director approval."
            }
            state["verification_status"] = "AWAITING_APPROVAL"
        else:
            state["approval_status"] = "NOT_REQUIRED"
            sim_res = simulation_executor.execute_action(
                action_type=decision,
                target_object_id=cand.get("transfer_option_id", "UNKNOWN"),
                parameters={"status": "TRANSFER_REJECTED_OR_INELIGIBLE"}
            )
            state["execution_result"] = sim_res
            state["verification_status"] = "VERIFIED_REJECTED"

        return state
