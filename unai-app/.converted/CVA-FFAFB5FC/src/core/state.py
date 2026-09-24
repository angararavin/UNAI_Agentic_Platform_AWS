from typing import TypedDict, Dict, Any, List, Optional

class AgentState(TypedDict, total=False):
    """
    Standard state schema passed through LangGraph StateGraph nodes for all 5 SAP agents.
    """
    agent_id: str
    case_id: str
    input_data: Dict[str, Any]
    context_data: Dict[str, Any]
    deterministic_metrics: Dict[str, Any]
    policy_evaluation: Dict[str, Any]
    reasoning_summary: str
    recommendation: Optional[Dict[str, Any]]
    confidence_score: float
    requires_approval: bool
    approval_status: str
    approval_id: Optional[str]
    execution_result: Optional[Dict[str, Any]]
    verification_status: str
    audit_events: List[Dict[str, Any]]
    error: Optional[str]
    start_time: float
    end_time: float
    latency_ms: float
    # Set by the UNAI backend swap in each agent_NN_*.py's node_llm_reasoning
    # (see src/agents/unai_bridge.py). LangGraph's StateGraph only propagates
    # keys declared on this TypedDict -- omitting these silently drops them
    # from the final state even though the node sets them.
    model_used: str
    unai_token_comparison: Optional[Dict[str, Any]]
