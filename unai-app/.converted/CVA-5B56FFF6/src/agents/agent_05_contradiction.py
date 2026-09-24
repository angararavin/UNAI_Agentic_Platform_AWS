from typing import Dict, Any, List
from langgraph.graph import StateGraph, END
from src.core.state import AgentState
from src.agents.base_graph import BaseAgentWorkflow
from src.data.datasource import BaseDataSource
from src.tools.contradiction_tools import ContradictionCalculationTools
from src.core.llm_factory import LLMFactory
from src.workflow.approval_manager import approval_manager
from src.workflow.simulation_executor import simulation_executor

class RequirementContradictionAgentWorkflow(BaseAgentWorkflow):
    """
    Agent 05: Requirement Contradiction Agent (SC-A05-RCA-001)
    LangGraph StateGraph workflow for detecting conflicting, duplicate, or cancelled requirements before MRP.
    """

    def __init__(self, data_source: BaseDataSource):
        super().__init__(agent_id="agent_05", agent_name="Requirement Contradiction Agent")
        self.ds = data_source

    def build_graph(self) -> StateGraph:
        builder = StateGraph(AgentState)

        # Nodes
        builder.add_node("ingest_demand_cluster", self.node_ingest_demand)
        builder.add_node("compute_contradiction_metrics", self.node_compute_metrics)
        builder.add_node("llm_reasoning", self.node_llm_reasoning)
        builder.add_node("route_action", self.node_route_action)

        # Edges
        builder.set_entry_point("ingest_demand_cluster")
        builder.add_edge("ingest_demand_cluster", "compute_contradiction_metrics")
        builder.add_edge("compute_contradiction_metrics", "llm_reasoning")
        builder.add_edge("llm_reasoning", "route_action")
        builder.add_edge("route_action", END)

        return builder

    def node_ingest_demand(self, state: AgentState) -> AgentState:
        identifier = str(state.get("case_id") or state.get("input_data", {}).get("case_id", "CASE01")).strip()

        demo_cases = self.ds.load_table("agent_05", "demo_cases")
        case_rec = next((c for c in demo_cases if str(c.get("case_id", "")).strip() == identifier), None)
        if not case_rec and demo_cases:
            case_rec = demo_cases[0]
            identifier = str(case_rec.get("case_id", "CASE01")).strip()

        plant_id = case_rec.get("plant_id", "PL01") if case_rec else "PL01"
        material_id = case_rec.get("material_id", "MAT2001") if case_rec else "MAT2001"

        all_reqs = self.ds.load_table("agent_05", "requirements")
        matching_reqs = [
            r for r in all_reqs
            if str(r.get("plant_id", "")).strip() == plant_id and str(r.get("material_id", "")).strip() == material_id
        ]

        all_supplies = self.ds.load_table("agent_05", "supply_context")
        matching_supplies = [
            s for s in all_supplies
            if str(s.get("plant_id", "")).strip() == plant_id and str(s.get("material_id", "")).strip() == material_id
        ]

        all_res = self.ds.load_table("agent_05", "reservations")
        matching_res = [
            rs for rs in all_res
            if str(rs.get("plant_id", "")).strip() == plant_id and str(rs.get("material_id", "")).strip() == material_id
        ]

        state["case_id"] = identifier
        state["input_data"] = case_rec or {"case_id": identifier, "plant_id": plant_id, "material_id": material_id}
        state["context_data"] = {
            "plant_id": plant_id,
            "material_id": material_id,
            "requirements": matching_reqs,
            "supplies": matching_supplies,
            "reservations": matching_res
        }
        return state

    def node_compute_metrics(self, state: AgentState) -> AgentState:
        ctx = state.get("context_data", {})
        plant_id = ctx.get("plant_id", "")
        mat_id = ctx.get("material_id", "")
        reqs = ctx.get("requirements", [])
        supplies = ctx.get("supplies", [])
        res = ctx.get("reservations", [])

        classification = ContradictionCalculationTools.classify_contradiction(
            plant_id=plant_id,
            material_id=mat_id,
            requirements=reqs,
            reservations=res,
            supply_records=supplies
        )

        net_demand = ContradictionCalculationTools.calculate_net_demand(reqs, supplies)

        state["deterministic_metrics"] = {
            "net_demand": net_demand,
            "demand_count": len(reqs),
            "supply_count": len(supplies),
            "classification": classification
        }
        state["policy_evaluation"] = classification
        return state

    def node_llm_reasoning(self, state: AgentState) -> AgentState:
        case_rec = state.get("input_data", {})
        metrics = state.get("deterministic_metrics", {})
        policy = state.get("policy_evaluation", {})

        prompt = f"""
You are an expert SAP PP/MRP Demand Planning Specialist.
Synthesize the demand contradiction diagnosis into an actionable recommendation for the production planner:

Case: {case_rec.get('case_id')} | Material: {case_rec.get('material_id')}, Plant: {case_rec.get('plant_id')}
Contradiction Classification: {policy.get('contradiction_type')}
Affected Requirements: {policy.get('affected_requirements')}
Net Deterministic Demand: {metrics.get('net_demand')} units (from {metrics.get('demand_count')} requirements)
Recommended Action: {policy.get('recommended_action')}
Standard Rationale: {policy.get('rationale')}

Provide a clear explanation to the planner on how to resolve this requirement conflict to maintain clean net MRP inputs.
"""
        reasoning = LLMFactory.generate_completion(
            prompt=prompt,
            system_prompt="You are an enterprise SAP MRP planning specialist. Provide concise, planning-accurate analysis."
        )

        if not reasoning or "System Note" in reasoning:
            reasoning = (
                f"Cluster analysis for material {case_rec.get('material_id')} at plant {case_rec.get('plant_id')} (Case {case_rec.get('case_id')}): "
                f"Classified as '{policy.get('contradiction_type')}'. {policy.get('rationale')} "
                f"Total net calculated demand is {metrics.get('net_demand')} units. Recommended resolution: {policy.get('recommended_action')}."
            )

        state["reasoning_summary"] = reasoning
        state["confidence_score"] = 0.98
        return state

    def node_route_action(self, state: AgentState) -> AgentState:
        case_rec = state.get("input_data", {})
        policy = state.get("policy_evaluation", {})
        metrics = state.get("deterministic_metrics", {})
        net_d = metrics.get("net_demand", 0.0)

        consequential = policy.get("consequential_action_required", False)
        action_name = policy.get("recommended_action", "KEEP_BOTH")

        recommendation = {
            "action_type": action_name,
            "target_object_id": case_rec.get("case_id", "UNKNOWN"),
            "proposed_value": {
                "material_id": case_rec.get("material_id"),
                "plant_id": case_rec.get("plant_id"),
                "contradiction_type": policy.get("contradiction_type"),
                "affected_requirements": policy.get("affected_requirements"),
                "net_demand": net_d
            },
            "rationale": state.get("reasoning_summary", ""),
            "estimated_economic_impact": net_d * 200.0,
            "requires_approval": consequential
        }

        state["recommendation"] = recommendation
        state["requires_approval"] = consequential

        if consequential:
            ticket = approval_manager.create_approval_request(
                agent_id="agent_05",
                case_id=state.get("case_id", ""),
                action_type=action_name,
                target_object_id=case_rec.get("case_id", "UNKNOWN"),
                proposed_value=recommendation["proposed_value"],
                rationale=recommendation["rationale"],
                estimated_impact=recommendation["estimated_economic_impact"]
            )
            state["approval_status"] = "PENDING"
            state["approval_id"] = ticket["approval_id"]
            state["execution_result"] = {
                "message": f"Action ticket {ticket['approval_id']} created. Awaiting demand planning lead approval."
            }
            state["verification_status"] = "AWAITING_APPROVAL"
        else:
            state["approval_status"] = "NOT_REQUIRED"
            sim_res = simulation_executor.execute_action(
                action_type=action_name,
                target_object_id=case_rec.get("case_id", "UNKNOWN"),
                parameters={"status": "DEMAND_CONFIRMED_VALID"}
            )
            state["execution_result"] = sim_res
            state["verification_status"] = "VERIFIED_VALID"

        return state
