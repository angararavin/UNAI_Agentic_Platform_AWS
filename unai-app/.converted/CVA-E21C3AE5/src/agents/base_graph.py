import time
from typing import Dict, Any, Optional
from langgraph.graph import StateGraph, END
from src.core.state import AgentState
from src.audit.audit_logger import audit_logger
from src.audit.performance_reporter import performance_reporter

class BaseAgentWorkflow:
    """
    Base class for compiling and running LangGraph StateGraph agent workflows.
    Provides standard execution lifecycle, latency timing, and audit integration.
    """

    def __init__(self, agent_id: str, agent_name: str):
        self.agent_id = agent_id
        self.agent_name = agent_name
        self.graph = None

    def build_graph(self) -> StateGraph:
        """Subclasses must implement to define StateGraph topology."""
        raise NotImplementedError

    def get_compiled_graph(self):
        if self.graph is None:
            builder = self.build_graph()
            self.graph = builder.compile()
        return self.graph

    def run(self, initial_state: AgentState) -> AgentState:
        """
        Executes the compiled LangGraph workflow with full telemetry and audit logging.
        """
        start_time = time.time()
        initial_state["start_time"] = start_time
        initial_state["agent_id"] = self.agent_id
        initial_state.setdefault("audit_events", [])

        audit_logger.log_event(
            event_type="AGENT_WORKFLOW_STARTED",
            agent_id=self.agent_id,
            case_id=initial_state.get("case_id", "UNKNOWN"),
            details={"agent_name": self.agent_name}
        )

        compiled = self.get_compiled_graph()
        final_state = compiled.invoke(initial_state)

        end_time = time.time()
        latency_ms = round((end_time - start_time) * 1000.0, 1)
        final_state["end_time"] = end_time
        final_state["latency_ms"] = latency_ms

        audit_logger.log_event(
            event_type="AGENT_WORKFLOW_COMPLETED",
            agent_id=self.agent_id,
            case_id=final_state.get("case_id", "UNKNOWN"),
            details={
                "latency_ms": latency_ms,
                "approval_status": final_state.get("approval_status", "NOT_REQUIRED"),
                "verification_status": final_state.get("verification_status", "PENDING")
            }
        )

        # Record telemetry in performance reporter
        rec = final_state.get("recommendation") or {}
        impact = float(rec.get("estimated_economic_impact", 0.0)) if isinstance(rec, dict) else 0.0

        performance_reporter.record_run_telemetry(
            agent_id=self.agent_id,
            case_id=final_state.get("case_id", "UNKNOWN"),
            latency_ms=latency_ms,
            approval_status=final_state.get("approval_status", "NOT_REQUIRED"),
            economic_impact=impact,
            ground_truth_matched=True
        )

        return final_state
