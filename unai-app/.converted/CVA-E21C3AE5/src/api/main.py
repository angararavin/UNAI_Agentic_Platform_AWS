from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, List, Optional
from src.core.config import settings
from src.core.models import AgentExecutionRequest, ApprovalDecisionRequest
from src.data.path_resolver import PathResolver
from src.data.flat_file_source import FlatFileDataSource
from src.data.manager import data_source_manager, DataSourceMode
from src.agents import get_agent, default_data_source
from src.workflow.approval_manager import approval_manager
from src.audit.audit_logger import audit_logger
from src.audit.performance_reporter import performance_reporter
from src.advisory.tech_radar import tech_radar

app = FastAPI(
    title="Bcone SAP Supply Chain Agentic AI Platform",
    description="Enterprise Multi-Agent Control Tower powered by LangChain, LangGraph, and Ollama",
    version="1.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "Bcone SAP Agentic AI Backend",
        "env": settings.APP_ENV,
        "ollama_url": settings.OLLAMA_BASE_URL,
        "primary_model": settings.OLLAMA_MODEL,
        "fallback_model": settings.OLLAMA_FALLBACK_MODEL,
        "write_actions_enabled": settings.ENABLE_WRITE_ACTIONS
    }

@app.get("/api/v1/agents")
def list_agents():
    """Returns metadata for all 5 registered supply chain agents."""
    resolver = PathResolver()
    agents = []
    for k in resolver.get_all_agent_keys():
        meta = resolver.get_metadata(k)
        agents.append({
            "key": k,
            **meta
        })
    return {"agents": agents}

@app.get("/api/v1/agents/{agent_id}/cases")
def list_agent_cases(agent_id: str):
    """Retrieves curated demo and benchmark cases for the specified agent."""
    try:
        active_ds = data_source_manager.get_active_source()
        cases = active_ds.get_demo_cases(agent_id)
        if not cases:
            cases = default_data_source.get_demo_cases(agent_id)
        return {
            "agent_id": agent_id,
            "count": len(cases),
            "cases": cases
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Failed to fetch cases for '{agent_id}': {e}")

@app.post("/api/v1/agents/{agent_id}/run")
def run_agent(agent_id: str, request: Optional[AgentExecutionRequest] = None):
    """Executes the compiled LangGraph workflow for the given agent and scenario."""
    try:
        agent_wf = get_agent(agent_id)
        case_id = request.case_id if request and request.case_id else None
        input_data = request.input_override if request and request.input_override else {}

        initial_state = {
            "case_id": case_id or "DEFAULT_CASE",
            "input_data": input_data
        }

        result_state = agent_wf.run(initial_state)

        return {
            "status": "SUCCESS",
            "agent_id": agent_wf.agent_id,
            "case_id": result_state.get("case_id"),
            "latency_ms": result_state.get("latency_ms"),
            "confidence_score": result_state.get("confidence_score"),
            "deterministic_metrics": result_state.get("deterministic_metrics"),
            "policy_evaluation": result_state.get("policy_evaluation"),
            "reasoning_summary": result_state.get("reasoning_summary"),
            "recommendation": result_state.get("recommendation"),
            "approval_status": result_state.get("approval_status"),
            "approval_id": result_state.get("approval_id"),
            "execution_result": result_state.get("execution_result"),
            "verification_status": result_state.get("verification_status")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution error in '{agent_id}': {e}")

@app.get("/api/v1/approvals")
def get_approvals(pending_only: bool = False):
    """Lists approval tickets for Human-in-the-Loop review."""
    if pending_only:
        return {"approvals": approval_manager.list_pending_approvals()}
    return {"approvals": approval_manager.list_all_approvals()}

@app.post("/api/v1/approvals/{approval_id}/action")
def decide_approval(approval_id: str, request: ApprovalDecisionRequest):
    """Records human decision (APPROVED, REJECTED, MORE_INFO) on a consequential action ticket."""
    try:
        updated_ticket = approval_manager.record_decision(
            approval_id=approval_id,
            decision=request.decision,
            reviewer=request.reviewer,
            notes=request.notes
        )
        audit_logger.log_event(
            event_type="HUMAN_APPROVAL_DECISION",
            agent_id=updated_ticket["agent_id"],
            case_id=updated_ticket["case_id"],
            details={
                "approval_id": approval_id,
                "decision": request.decision,
                "reviewer": request.reviewer,
                "notes": request.notes
            }
        )
        return {"status": "UPDATED", "ticket": updated_ticket}
    except KeyError as ke:
        raise HTTPException(status_code=404, detail=str(ke))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

@app.get("/api/v1/reporting/digest")
def get_performance_digest():
    """Generates real-time SLA and agent performance digest."""
    return performance_reporter.generate_digest()

@app.post("/api/v1/reporting/export")
def export_performance_report():
    """Exports performance report to Markdown file."""
    filepath = performance_reporter.export_markdown_report()
    return {"status": "EXPORTED", "filepath": filepath}

@app.get("/api/v1/advisory/tech-radar")
def get_tech_radar():
    """Returns the market technology radar and team upskilling roadmap."""
    return tech_radar.get_radar_overview()

@app.get("/api/v1/advisory/upgrade-proposal")
def get_upgrade_proposal():
    """Returns structured quarterly technology upgrade proposal."""
    return tech_radar.generate_upgrade_proposal()

@app.get("/api/v1/audit/logs")
def get_audit_logs(limit: int = 50):
    """Fetches recent append-only audit trail records."""
    return {"events": audit_logger.get_recent_events(limit)}

# ==============================================================================
# DATA SOURCES & INGESTION MANAGEMENT ENDPOINTS
# ==============================================================================

@app.get("/api/v1/data-sources/status")
def get_data_sources_status():
    """Returns the current data source health, configuration, and active mode."""
    return data_source_manager.get_status()

@app.post("/api/v1/data-sources/switch")
def switch_data_source_mode(request: Dict[str, Any] = Body(...)):
    """
    Switches the active data ingestion mode.
    Accepted modes: 'SYNTHETIC', 'CUSTOM_FLAT_FILE', 'DATABASE'
    """
    mode_str = request.get("mode", "SYNTHETIC").upper()
    try:
        mode_enum = DataSourceMode(mode_str)
        return data_source_manager.set_mode(mode_enum)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid mode '{mode_str}'. Supported: {[m.value for m in DataSourceMode]}"
        )

@app.post("/api/v1/data-sources/test-db")
def test_database_connection(request: Dict[str, Any] = Body(...)):
    """Tests connection to a specified SQL database URL without activating it."""
    url = request.get("connection_url", "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="Missing 'connection_url'")
    from src.data.db_source import DatabaseDataSource
    source = DatabaseDataSource(url)
    return source.test_connection()

@app.post("/api/v1/data-sources/configure-db")
def configure_database_source(request: Dict[str, Any] = Body(...)):
    """Configures and optionally activates a relational database data source."""
    url = request.get("connection_url", "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="Missing 'connection_url'")
    activate = bool(request.get("activate", True))
    mappings = request.get("table_mappings")
    queries = request.get("custom_queries")
    return data_source_manager.configure_database(
        connection_url=url,
        custom_table_mappings=mappings,
        custom_queries=queries,
        activate=activate
    )
