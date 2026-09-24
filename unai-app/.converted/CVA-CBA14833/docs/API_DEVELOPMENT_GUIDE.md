# API Builders & Integration Engineering Guide: SAP Supply Chain Agentic AI Platform

> **Target Audience:** API Engineers, Backend Developers, Integration Architects, SAP NetWeaver/BTP Middleware Engineers, and Technical Leads.  
> **Purpose:** Step-by-step architectural blueprint and development manual for building, extending, and integrating RESTful, Event-Driven, and Agentic APIs for both **individual specialized agents** and **multi-agent composite workflows**.

---

## 1. Architectural Blueprint: The Agentic API Layer

In this platform, APIs do not just query databases—they orchestrate **autonomous cognitive cycles** comprising deterministic empirical math, LangGraph state machines, SAP data connectors, and Human-in-the-Loop (HITL) governance gates.

### 1.1 End-to-End API Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                             CONSUMER / INTEGRATION CLIENTS                                  │
│  SAP S/4HANA (IDocs/Events)  │  SAP Fiori / UI  │  External Microservices  │  cURL / Postman │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │ HTTP / REST / JSON
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                           API TRANSPORT & GATEWAY (FastAPI / ASGI)                          │
│  • CORS Middleware   • Request Idempotency   • Exception Handlers   • OpenAPI / Swagger Docs│
│  Location: src/api/main.py (Port 8000)                                                      │
└───────────────────────┬─────────────────────────────────────────────┬───────────────────────┘
                        │                                             │
                        ▼                                             ▼
       ┌─────────────────────────────────┐           ┌─────────────────────────────────┐
       │   INDIVIDUAL AGENT ENDPOINTS    │           │    AGENTIC & COMPOSITE ROUTER   │
       │   POST /api/v1/agents/{id}/run  │           │   POST /api/v1/orchestrator/    │
       │   GET  /api/v1/agents/{id}/cases│           │   POST /api/v1/simulation/     │
       └────────────────┬────────────────┘           └────────────────┬────────────────┘
                        │                                             │
                        ▼                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                      VALIDATION & SCHEMA ADAPTATION (Pydantic v2)                           │
│  • Strong Type Coercion   • Input Range Sanity   • SAP German Alias Mapper (EKPO, MARC, etc.)│
│  Locations: src/core/models.py, src/data/schema_mapper.py                                   │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                     COGNITIVE ORCHESTRATION ENGINE (LangGraph StateGraph)                   │
│  State Propagation: Ingestion ──▶ Deterministic Math ──▶ Policy Engine ──▶ Synthesizer     │
│  Locations: src/agents/base_graph.py, src/agents/agent_01_drift.py ... agent_05_*.py        │
└───────────────────────┬─────────────────────────────────────────────┬───────────────────────┘
                        │                                             │
                        ▼                                             ▼
       ┌─────────────────────────────────┐           ┌─────────────────────────────────┐
       │   DETERMINISTIC MATH ENGINES    │           │    PLUGGABLE DATA SOURCES HUB   │
       │   (100% Arithmetic Precision)   │           │   (Synthetic CSV / SQL / RFC)   │
       │   src/tools/*_tools.py          │           │   src/data/manager.py           │
       └────────────────┬────────────────┘           └────────────────┬────────────────┘
                        │                                             │
                        └──────────────────────┬──────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                     GOVERNANCE, AUDIT & CONVENTIONAL SAFETY GATES                           │
│  • Consequential Action Gating: requires_approval flag                                      │
│  • Human-in-the-Loop Ticket Store: src/workflow/approval_manager.py                         │
│  • Append-Only Event Stream: src/audit/audit_logger.py (JSONL)                              │
│  • Sub-Second SLA Telemetry: src/audit/performance_reporter.py                              │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
                                               ▼ HTTP 200 / 202
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                     STRUCTURED STANDARDIZED API RESPONSE (JSON)                             │
│  { status, agent_id, latency_ms, deterministic_metrics, policy_evaluation, recommendation }  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Complete Repository File & Path Directory for API Builders

Every API builder must be familiar with the following file locations across the repository and the deployment package (`bcone_sap_agents_deploy/`):

| Component Role | Source File Path | Key Responsibilities |
| :--- | :--- | :--- |
| **API Application Entrypoint** | [`src/api/main.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/api/main.py) | FastAPI app initialization, CORS, middleware, and master endpoint routes. |
| **Pydantic Data Models** | [`src/core/models.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/core/models.py) | Inbound request schemas, response models, risk enums, action objects. |
| **Central Agent Registry** | [`src/agents/__init__.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/agents/__init__.py) | `get_agent(agent_id)` factory loader for instantiating LangGraph agents. |
| **Common State Machine Base** | [`src/agents/base_graph.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/agents/base_graph.py) | Abstract `BaseAgentWorkflow` base class with deterministic node hooks. |
| **Agent 1 Graph & Tools** | [`src/agents/agent_01_drift.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/agents/agent_01_drift.py) & [`src/tools/drift_tools.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/tools/drift_tools.py) | PO drift calculations, supplier historical goods receipt stats. |
| **Agent 2 Graph & Tools** | [`src/agents/agent_02_phantom.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/agents/agent_02_phantom.py) & [`src/tools/inventory_tools.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/tools/inventory_tools.py) | Usable stock arithmetic (QA holds, reservations, expired stock). |
| **Agent 3 Graph & Tools** | [`src/agents/agent_03_twin.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/agents/agent_03_twin.py) & [`src/tools/transfer_tools.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/tools/transfer_tools.py) | Inter-plant twin location stock balancing & freight arbitrage. |
| **Agent 4 Graph & Tools** | [`src/agents/agent_04_aging.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/agents/agent_04_aging.py) & [`src/tools/aging_tools.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/tools/aging_tools.py) | 3-way match, open commitment aging, and GR/IR discrepancy engine. |
| **Agent 5 Graph & Tools** | [`src/agents/agent_05_contradiction.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/agents/agent_05_contradiction.py) & [`src/tools/contradiction_tools.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/tools/contradiction_tools.py) | MRP flapping, requirement collision, and planned order deduplication. |
| **Pluggable Data Sources** | [`src/data/manager.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/data/manager.py) | Dynamic switching between Synthetic, Custom CSV folder, and SQL Database. |
| **SAP German Alias Mapper** | [`src/data/schema_mapper.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/data/schema_mapper.py) | Translates raw SAP BAPI/IDoc headers (`EBELN`, `MATNR`, `WERKS`) to clean JSON. |
| **Path Resolver** | [`src/data/path_resolver.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/data/path_resolver.py) | Resilient path normalization for dataset mapping. |
| **HITL Governance Store** | [`src/workflow/approval_manager.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/workflow/approval_manager.py) | In-memory & persisted ticket registry for human approvals. |
| **Audit Logger (JSONL)** | [`src/audit/audit_logger.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/audit/audit_logger.py) | Append-only forensic compliance logging. |
| **SLA Telemetry Engine** | [`src/audit/performance_reporter.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/audit/performance_reporter.py) | Sub-second latency tracking, daily digest generation. |
| **Platform Settings** | [`src/core/config.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/core/config.py) | Pydantic BaseSettings loading from `.env`. |
| **Automated API Tests** | [`tests/test_hitl_and_reporting.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/tests/test_hitl_and_reporting.py) | Pytest API integration tests (using Starlette TestClient). |

---

## 3. How to Build APIs for Individual Agents (Step-by-Step Flow)

Follow this 6-step developer flow whenever you need to add a new endpoint or extend an existing agent's API surface.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   STEP 1     │ ──▶ │   STEP 2     │ ──▶ │   STEP 3     │
│ Define Schema│     │ Deterministic│     │ Wire Into    │
│  (Pydantic)  │     │ Math Tools   │     │ LangGraph    │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   STEP 6     │ ◀── │   STEP 5     │ ◀── │   STEP 4     │
│ Automated    │     │ Log Audit &  │     │ Expose REST  │
│ Pytest Test  │     │ SLA Metrics  │     │ Endpoint     │
└──────────────┘     └──────────────┘     └──────────────┘
```

### Step 1: Define Strong Inbound & Outbound Schemas
In [`src/core/models.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/core/models.py), define explicit Pydantic request and response models. Never accept raw, untyped JSON dictionaries.

```python
# Example: Adding a dedicated payload schema for Agent 1 (PO Drift)
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class PODriftExecutionRequest(BaseModel):
    po_number: str = Field(..., description="SAP 10-digit PO Number (EKKO-EBELN)", example="450010000")
    po_line_item: int = Field(10, description="SAP PO Item Index (EKPO-EBELP)", example=10)
    supplier_id: str = Field(..., description="Vendor Master Account (LFA1-LIFNR)", example="SUP1004")
    material_id: str = Field(..., description="Material Master SKU (MARA-MATNR)", example="MAT-1001")
    plant_id: str = Field(..., description="Receiving Plant Code (T001W-WERKS)", example="PLNT-1000")
    promised_delivery_date: str = Field(..., description="Confirmed Date (YYYY-MM-DD)", example="2026-10-15")
    current_date: Optional[str] = Field(None, description="Audit evaluation date (defaults to today)")

    class Config:
        json_schema_extra = {
            "example": {
                "po_number": "450010000",
                "po_line_item": 10,
                "supplier_id": "SUP1004",
                "material_id": "MAT-1001",
                "plant_id": "PLNT-1000",
                "promised_delivery_date": "2026-10-15"
            }
        }
```

### Step 2: Implement Isolated Deterministic Math Tools
Calculations must **never** be performed by an LLM prompt. Always execute pure, verifiable Python mathematics in [`src/tools/`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/tools/).

```python
# Example from src/tools/drift_tools.py:
def calculate_empirical_drift(supplier_id: str, historical_records: list) -> dict:
    delays = [r["delay_days"] for r in historical_records if r["supplier_id"] == supplier_id]
    if not delays:
        return {"avg_delay": 0.0, "p90_delay": 0.0, "late_rate_pct": 0.0}
    
    avg_delay = float(np.mean(delays))
    p90_delay = float(np.percentile(delays, 90))
    late_count = sum(1 for d in delays if d > 0)
    late_rate_pct = (late_count / len(delays)) * 100.0
    
    return {
        "historical_count": len(delays),
        "avg_delay_days": round(avg_delay, 2),
        "p90_delay_days": round(p90_delay, 2),
        "late_delivery_rate_pct": round(late_rate_pct, 1)
    }
```

### Step 3: Wire Tools into the Agent's LangGraph StateGraph
Connect the tool outputs to the state machine in [`src/agents/agent_01_drift.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/agents/agent_01_drift.py):

```python
# Inside the StateGraph node definition:
def compute_metrics_node(state: AgentState) -> Dict[str, Any]:
    supplier_stats = calculate_empirical_drift(state["supplier_id"], records)
    policy = evaluate_corporate_policy(supplier_stats, state["days_of_cover"])
    
    # State update
    return {
        "deterministic_metrics": supplier_stats,
        "policy_evaluation": policy,
        "requires_hitl": policy["risk_band"] in ["HIGH", "SEVERE"]
    }
```

### Step 4: Expose the Endpoint in FastAPI (`src/api/main.py`)
Add the route handler with proper status codes, tags, and exception handling:

```python
from fastapi import APIRouter, HTTPException, Depends
from src.core.models import PODriftExecutionRequest, AgentExecutionResult

router = APIRouter(prefix="/api/v1/agents", tags=["Individual Agents"])

@router.post("/agent_01/evaluate", response_model=AgentExecutionResult)
def evaluate_po_drift(payload: PODriftExecutionRequest):
    """
    Evaluates empirical vendor delivery latency and predicts purchase order drift.
    """
    try:
        agent_wf = get_agent("agent_01")
        
        initial_state = {
            "case_id": f"API-{payload.po_number}",
            "input_data": payload.model_dump()
        }
        
        # Execute workflow
        result_state = agent_wf.run(initial_state)
        
        return AgentExecutionResult(
            agent_id="agent_01",
            case_id=result_state["case_id"],
            status="COMPLETED",
            deterministic_metrics=result_state.get("deterministic_metrics", {}),
            policy_evaluation=result_state.get("policy_evaluation", {}),
            reasoning_summary=result_state.get("reasoning_summary", ""),
            recommendation=result_state.get("recommendation"),
            confidence_score=result_state.get("confidence_score", 1.0),
            approval_status=result_state.get("approval_status", "NOT_REQUIRED"),
            latency_ms=result_state.get("latency_ms", 0.0)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent 1 Execution Failed: {str(e)}")
```

### Step 5: Log Telemetry and HITL Approvals
The core agent automatically registers consequential actions into the `approval_manager` and outputs structured JSONL logs via `audit_logger`.

### Step 6: Write Automated Pytest Validation
Add test coverage in [`tests/test_hitl_and_reporting.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/tests/test_hitl_and_reporting.py):

```python
def test_agent_01_api_endpoint():
    from starlette.testclient import TestClient
    from src.api.main import app

    client = TestClient(app)
    response = client.post("/api/v1/agents/agent_01/run", json={
        "agent_id": "agent_01",
        "input_override": {
            "po_number": "450010000",
            "supplier_id": "SUP1004",
            "material_id": "MAT-1001",
            "plant_id": "PLNT-1000"
        }
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert "deterministic_metrics" in data
    assert data["latency_ms"] < 2000.0  # Sub-2 second SLA
```

---

## 4. How to Build Agentic & Composite APIs (Multi-Agent Workflows)

Single-agent endpoints execute one domain. **Agentic APIs** orchestrate multiple agents sequentially or in parallel based on real-time business events.

### 4.1 Pattern 1: Intelligent Event Triage & Autonomous Dispatcher
When SAP fires a change event (e.g., via SAP Event Mesh or Kafka), the client does not know which agent to run. The **Triage API** analyzes the payload and dispatches it to the correct specialist:

```python
# Pattern: Central Triage & Dispatch Endpoint
@app.post("/api/v1/orchestrator/dispatch")
def dispatch_sap_event(event: Dict[str, Any] = Body(...)):
    """
    Intelligently inspects SAP Event Mesh change notifications (IDoc / CDHDR)
    and routes them to the appropriate specialized agent.
    """
    sap_table = event.get("sap_table", "").upper()
    event_type = event.get("event_type", "").upper()
    
    target_agent = None
    if sap_table in ["EKKO", "EKPO", "EKET", "EKBE"]:
        if "CONFIRMATION" in event_type or "SCHEDULE" in event_type:
            target_agent = "agent_01"  # PO Promise Drift
        elif "AGING" in event_type or "INVOICE_VARIANCE" in event_type:
            target_agent = "agent_04"  # PO Aging & GR/IR
    elif sap_table in ["MARD", "MSKA", "RESB", "QALS"]:
        target_agent = "agent_02"      # Phantom Inventory
    elif sap_table in ["MARC", "T001W"]:
        target_agent = "agent_03"      # Twin Location Arbitrage
    elif sap_table in ["EBAN", "PLAF", "MD04"]:
        target_agent = "agent_05"      # MRP Contradiction
        
    if not target_agent:
        raise HTTPException(status_code=400, detail=f"Unrecognized SAP event source: {sap_table}")
        
    # Execute selected agent
    agent_wf = get_agent(target_agent)
    result = agent_wf.run({"case_id": event.get("event_id", "EVENT"), "input_data": event.get("payload", {})})
    return {
        "dispatched_to": target_agent,
        "execution_result": result
    }
```

### 4.2 Pattern 2: Multi-Echelon Sequential Cascade
In high-severity supply chain events, one agent's output feeds the next. For example:
1. **Agent 1** detects that a PO for steering pumps will drift by +3 days, leaving Plant 1000 with 0 days of cover.
2. **Agent 2** immediately audits Plant 1000's warehouse to see if any blocked stock can be fast-tracked by QA.
3. If usable stock is still insufficient, **Agent 3** immediately checks sister Plant 2000 for available surplus and calculates truck freight arbitrage.
4. **Agent 5** consolidates the MRP requisitions so duplicate planned orders are cancelled.

```python
# Pattern: Multi-Agent Cascade Endpoint
@app.post("/api/v1/orchestrator/cascade")
def execute_multi_echelon_cascade(po_number: str, material_id: str, plant_id: str):
    audit_trail = []
    
    # 1. Evaluate PO Drift
    a1_result = get_agent("agent_01").run({"case_id": "C1", "input_data": {"po_number": po_number}})
    audit_trail.append({"step": "PO_DRIFT", "result": a1_result})
    
    # 2. Check if downstream risk requires inventory verification
    if a1_result.get("policy_evaluation", {}).get("risk_band") in ["HIGH", "SEVERE"]:
        a2_result = get_agent("agent_02").run({"case_id": "C2", "input_data": {"material_id": material_id, "plant_id": plant_id}})
        audit_trail.append({"step": "USABLE_STOCK_AUDIT", "result": a2_result})
        
        # 3. If usable stock deficit exists, trigger sister plant balancing
        net_usable = a2_result.get("deterministic_metrics", {}).get("net_usable_stock", 0)
        if net_usable <= 0:
            a3_result = get_agent("agent_03").run({"case_id": "C3", "input_data": {"material_id": material_id, "deficit_plant_id": plant_id, "required_quantity": 200}})
            audit_trail.append({"step": "TWIN_LOCATION_MATCH", "result": a3_result})
            
    return {
        "cascade_status": "COMPLETED",
        "stages_executed": len(audit_trail),
        "audit_trail": audit_trail
    }
```

### 4.3 Pattern 3: Asynchronous Long-Running Jobs with Polling
For batch analysis across 10,000+ purchase orders:
1. `POST /api/v1/jobs/batch-run` returns `202 Accepted` with a `job_id`.
2. The job executes in the background using `asyncio` or Celery.
3. `GET /api/v1/jobs/{job_id}` returns `{ status: "PROCESSING", progress: 65% }` until completed.

---

## 5. Master API Specification & Schema Reference

### 5.1 Active Platform REST Endpoints (Port 8000)

| Method | Endpoint URL | Request Body | Response Object | SLA Latency | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | None | `{ status, env, models }` | `< 5 ms` | Liveness & Readiness probe. |
| `GET` | `/api/v1/agents` | None | `{ agents: [...] }` | `< 10 ms` | List all 5 registered agents & metadata. |
| `GET` | `/api/v1/agents/{id}/cases` | None | `{ count, cases: [...] }` | `< 25 ms` | Fetch benchmark demo test cases for agent. |
| `POST` | `/api/v1/agents/{id}/run` | `AgentExecutionRequest` | `AgentExecutionResult` | `< 1500 ms` | **Execute single agent StateGraph workflow.** |
| `GET` | `/api/v1/approvals` | `?pending_only=true` | `{ approvals: [...] }` | `< 15 ms` | Fetch HITL governance tickets. |
| `POST` | `/api/v1/approvals/{id}/action` | `ApprovalDecisionRequest` | `{ status, ticket }` | `< 30 ms` | Record Human Reviewer sign-off / rejection. |
| `GET` | `/api/v1/reporting/digest` | None | Performance digest object | `< 50 ms` | Get real-time sub-second SLA metrics. |
| `POST` | `/api/v1/reporting/export` | None | `{ status, filepath }` | `< 100 ms` | Export markdown performance report. |
| `GET` | `/api/v1/audit/logs` | `?limit=50` | `{ events: [...] }` | `< 20 ms` | Retrieve immutable JSONL audit records. |
| `GET` | `/api/v1/data-sources/status` | None | Data source health object | `< 15 ms` | Check active ingestion mode (CSV/DB). |
| `POST` | `/api/v1/data-sources/switch` | `{ mode: "DATABASE" }` | Status confirmation | `< 50 ms` | Switch ingestion mode dynamically. |
| `POST` | `/api/v1/data-sources/test-db` | `{ connection_url }` | `{ status, tables }` | `< 200 ms` | Test SQL connection without activating. |
| `POST` | `/api/v1/data-sources/configure-db`| `{ connection_url, ... }` | Ingestion status | `< 300 ms` | Configure & activate enterprise SQL source. |

---

## 6. Enterprise Production Best Practices for API Teams

### 1. SAP German Field Alias Translation
SAP payloads frequently arrive with German technical abbreviations (`EBELN`, `MATNR`, `WERKS`, `MENGE`, `LGORT`).  
Always use [`src/data/schema_mapper.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/data/schema_mapper.py) to translate fields before entering agent workflows:
```python
from src.data.schema_mapper import schema_mapper

# Inbound raw SAP IDoc / RFC dictionary
clean_payload = schema_mapper.map_dict_keys("agent_01", raw_sap_payload)
# Result: {"EBELN": "450010000"} -> {"po_number": "450010000"}
```

### 2. Idempotency Keys (`X-Idempotency-Key`)
When clients dispatch action approvals or agent runs, provide an idempotency header (`X-Idempotency-Key: <UUID>`). Ensure your API middleware rejects duplicate execution attempts to prevent duplicate Purchase Order updates in SAP.

### 3. Circuit Breakers & Consequential Action Gating
Always respect the `ENABLE_WRITE_ACTIONS` configuration setting:
- When `ENABLE_WRITE_ACTIONS=false` (Production Default): The API **must never** execute write operations (BAPIs/RFCs) automatically. All consequential actions must produce an approval ticket with status `PENDING_APPROVAL`.
- When `ENABLE_WRITE_ACTIONS=true`: Only pre-approved, low-risk actions (`LOW` or `MEDIUM` risk bands) may execute straight-through without human authorization.

### 4. Interactive Swagger & ReDoc Documentation
FastAPI automatically generates interactive documentation accessible at:
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc UI:** `http://localhost:8000/redoc`
- **OpenAPI JSON Schema:** `http://localhost:8000/openapi.json`
