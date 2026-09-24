# KNOWLEDGE TRANSFER (KT) & MAINTENANCE PLAYBOOK
## Bcone SAP Supply Chain Agentic AI Platform

**Version:** 1.2.0  
**Target Audience:** Handover Engineering Team, SAP Solution Architects, and System Maintainers  

---

## 1. System Mental Model & Architecture

The Bcone platform is engineered as a **deterministic-first, LLM-synthesized agentic control loop**:

```text
Raw Enterprise Data -> Pure Python Math Tools -> Policy Evaluation -> LLM Qualitative Synthesis -> HITL Gate -> Simulated Execution -> Audit Logger
```

* **Core Rule**: Arithmetic is **never** delegated to an LLM. Any calculation involving inventory counts, currency, dates, or percentages belongs in `src/tools/`.
* **State Machine**: Built on **LangGraph `StateGraph`**. The state (`AgentState`) is an immutable typed dictionary passed sequentially across nodes.

---

## 2. Codebase Walkthrough

```text
src/
├── core/
│   ├── config.py             # Pydantic BaseSettings loading from .env
│   ├── models.py             # Domain models (ConsequentialAction, AgentExecutionResult, etc.)
│   ├── state.py              # LangGraph AgentState TypedDict schema
│   └── llm_factory.py        # LangChain ChatOllama wrapper with graceful REST fallback
│
├── data/
│   ├── path_resolver.py      # Normalizes dataset directory paths (e.g. 'Agent 1', 'Agent3')
│   ├── datasource.py         # Abstract BaseDataSource contract
│   ├── flat_file_source.py   # Concrete CSV loader with in-memory table caching
│   └── sap_source.py         # Forward-compatible stubs marked REQUIRES SAP VALIDATION
│
├── tools/                    # PURE DETERMINISTIC ENGINES (100% Non-LLM)
│   ├── drift_tools.py        # Delay stats, P90, late rate, coverage days
│   ├── inventory_tools.py    # Usable stock formula, shelf-life, reservation audit
│   ├── transfer_tools.py     # Source safety stock protection, freight vs stockout net benefit
│   ├── aging_tools.py        # Aging days, receipt delta, 3-way match
│   └── contradiction_tools.py# Overlap classification, net demand summation
│
├── agents/                   # LANGGRAPH STATEGRAPH WORKFLOWS
│   ├── base_graph.py         # Base workflow class with timing and telemetry
│   ├── agent_01_drift.py     # PO Promise Drift StateGraph
│   ├── agent_02_phantom.py   # Phantom Inventory StateGraph
│   ├── agent_03_twin_location.py # Material Twin-Location StateGraph
│   ├── agent_04_po_aging.py  # PO Aging Intelligence StateGraph
│   ├── agent_05_contradiction.py # Requirement Contradiction StateGraph
│   └── __init__.py           # Agent registry and get_agent() factory
│
├── workflow/
│   ├── approval_manager.py   # In-memory and ticketed HITL approval state store
│   └── simulation_executor.py# Simulated SAP mutation engine (ENABLE_WRITE_ACTIONS=false)
│
├── audit/
│   ├── audit_logger.py       # Tamper-evident append-only JSONL logger
│   └── performance_reporter.py# Operational SLA and accuracy aggregator
│
├── advisory/
│   └── tech_radar.py         # Technology radar and quarterly upgrade advisory
│
├── api/
│   └── main.py               # FastAPI REST service
│
└── ui/
    └── app.py                # Streamlit Enterprise Control Tower & Admin Panel
```

---

## 3. How to Add a New (6th) Agent

To add a new agent (e.g., `agent_06_invoice_dispute`):
1. **Create Calculation Tools**: Add `src/tools/invoice_tools.py` with pure deterministic math functions.
2. **Implement StateGraph**: Create `src/agents/agent_06_invoice.py` inheriting from `BaseAgentWorkflow`. Define nodes (`ingest`, `compute_metrics`, `evaluate_policy`, `llm_reasoning`, `route_action`).
3. **Register Agent**: In `src/agents/__init__.py`, instantiate the workflow and add it to `_AGENT_REGISTRY`.
4. **Add Path Mapping**: In `src/data/path_resolver.py`, map aliases for the new agent folder and dataset.
5. **Add Test Suite**: Create `tests/test_agent_06.py` and verify with `pytest`.

---

## 4. Connecting Live SAP S/4HANA (Transition from Flat Files)

When credentials and endpoints are provisioned for a live S/4HANA landscape:
1. Implement `src/data/sap_source.py` using **SAP Cloud SDK for Python** or PyRFC.
2. Map tables to standard CDS views:
   - `current_purchase_orders` $\rightarrow$ `I_PurchaseOrderItemAPI01`
   - `inventory_stock` $\rightarrow$ `I_MaterialStock_2`
   - `plant_material_stock` $\rightarrow$ `I_PlantStock`
   - `requirements` $\rightarrow$ `I_PlannedIndependentRequirement` / `I_ProductionOrderComponent`
3. Toggle `DataSource` factory to return `SAPDataSource` instead of `FlatFileDataSource`.
4. Validate live write APIs (e.g., `BAPI_PO_CHANGE` or OData v4 schedule line update) before setting `ENABLE_WRITE_ACTIONS=true`.

---

## 5. Troubleshooting Common Operational Scenarios

* **Ollama Connection Timeout**:
  - Verify Ollama is active on `http://localhost:11434`.
  - In PowerShell: `Get-Process -Name ollama`. If not running: `ollama serve`.
* **Port Conflict on 8000 or 8501**:
  - Update `FASTAPI_PORT` or `STREAMLIT_PORT` in `.env`.
* **Adding New Demo Scenarios**:
  - Append rows to `demo_cases.csv` in the appropriate agent synthetic data directory.
