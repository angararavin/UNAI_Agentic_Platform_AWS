# ARCHITECTURE SPECIFICATION
## Bcone SAP Supply Chain Agentic AI Platform

**Version:** 1.2.0  
**Status:** Approved & Implemented  
**Date:** 2026-09-19  
**Core Frameworks:** LangChain 1.4+, LangGraph 1.2+, Ollama, FastAPI, Streamlit  

---

## 1. Architectural Philosophy & Governance

The Bcone SAP Supply Chain Agentic AI Platform delivers an enterprise-grade, multi-agent control tower engineered specifically for SAP S/4HANA environments. Its architecture is anchored in five non-negotiable design principles:

1. **Strict Separation of Deterministic Math and LLM Reasoning**:
   - The LLM is **never** permitted to calculate numerical values, inventory balances, statistical delay percentiles, freight economics, or net demand sums.
   - All business arithmetic is executed by pure, deterministic Python engines (`src/tools/`).
   - The LLM acts strictly as an **orchestrator, qualitative context synthesizer, and operational explanation engine**.
2. **LangGraph Cyclic State Machine Execution**:
   - Every agent operates as a compiled LangGraph `StateGraph`.
   - Node transitions are explicit, state is strictly typed (`AgentState`), and checkpointer interfaces enable auditability and asynchronous Human-in-the-Loop interruptions.
3. **Transaction Safety Gate (Human-in-the-Loop)**:
   - Consequential transactions (adjusting PO delivery dates, creating Stock Transport Orders, de-allocating reservations, cancelling requirements) are intercepted at an approval gate.
   - With `ENABLE_WRITE_ACTIONS=false` by default, actions execute against a local simulation store (`SimulationActionExecutor`), requiring explicit operator approval.
4. **Clean Data Abstraction Layer**:
   - All agents interface through `BaseDataSource`. Current flat-file synthetic datasets run seamlessly on `FlatFileDataSource`, while `SAPDataSource` provides forward-compatible stubs marked `REQUIRES SAP VALIDATION` for live S/4HANA CDS Views and OData v4 clients.
5. **Continuous Telemetry & Market Evolution Advisory**:
   - Automated performance tracking across latency, accuracy, and value capture (`PerformanceReporter`).
   - Market intelligence advisory board (`TechnologyRadarAdvisory`) tracking models, high-throughput inference runtimes (vLLM), and protocols (MCP).

---

## 2. System Component Topology

```mermaid
graph TD
    subgraph UI & Client Tier
        ST[Streamlit Control Tower & Admin Panel :8501]
        REST_CLI[External Client / Enterprise Portal]
    end

    subgraph API & Gateway Tier
        API[FastAPI Gateway :8000]
        ROUTER[Agent & Approval Router]
    end

    subgraph Agentic Orchestration Tier (LangGraph)
        A1[Agent 01: PO Promise Drift]
        A2[Agent 02: Phantom Inventory]
        A3[Agent 03: Material Twin-Location]
        A4[Agent 04: PO Aging Intelligence]
        A5[Agent 05: Requirement Contradiction]
    end

    subgraph Deterministic Calculation Tools (Non-LLM)
        T1[Drift Tools]
        T2[Inventory Tools]
        T3[Transfer Tools]
        T4[Aging Tools]
        T5[Contradiction Tools]
    end

    subgraph Inference & LLM Tier
        LLM_FAC[LLM Factory & Fallback Client]
        OLLAMA[(Local Ollama Instance :11434)]
        M_PRIMARY[Primary: gemma4:latest]
        M_FALLBACK[Fallback: llama3.2:latest]
    end

    subgraph Safety & Governance Tier
        HITL[Approval Manager]
        SIM[Simulation Action Executor]
        AUDIT[Audit Logger :jsonl]
        REPORTER[Performance Reporter]
        RADAR[Technology Radar Advisory]
    end

    subgraph Data Access Layer
        DS_LAYER[BaseDataSource Abstraction]
        CSV_SRC[(Flat-File Synthetic Datasets)]
        SAP_SRC[(Future S/4HANA CDS / OData)]
    end

    ST --> API
    REST_CLI --> API
    API --> ROUTER
    ROUTER --> A1 & A2 & A3 & A4 & A5

    A1 --> T1 & LLM_FAC
    A2 --> T2 & LLM_FAC
    A3 --> T3 & LLM_FAC
    A4 --> T4 & LLM_FAC
    A5 --> T5 & LLM_FAC

    LLM_FAC --> OLLAMA
    OLLAMA --> M_PRIMARY
    OLLAMA --> M_FALLBACK

    A1 & A2 & A3 & A4 & A5 --> HITL
    HITL --> SIM
    A1 & A2 & A3 & A4 & A5 --> AUDIT
    A1 & A2 & A3 & A4 & A5 --> REPORTER
    API --> RADAR

    A1 & A2 & A3 & A4 & A5 --> DS_LAYER
    DS_LAYER --> CSV_SRC
    DS_LAYER -.->|REQUIRES SAP VALIDATION| SAP_SRC
```

---

## 3. Agent-Specific LangGraph StateGraph Topologies

### 3.1 Agent 01: PO Promise Drift Agent (`SC-A01-PPO-001`)
- **Domain**: Procurement (MM-PUR)
- **StateGraph Nodes**:
  1. `ingest_evidence`: Joins PO line item, supplier confirmation events, and MRP shortage horizon.
  2. `compute_deterministic_metrics`: Calculates historical supplier delay statistics (mean, median, P90, severe late rate) and downstream inventory coverage days.
  3. `evaluate_policy`: Maps statistics to corporate risk band (`LOW`, `MEDIUM`, `HIGH`, `SEVERE`) and default action.
  4. `llm_reasoning`: Synthesizes buyer-facing explanation from factual metrics.
  5. `route_action`: Intercepts consequential expedites/reschedules for human approval; logs informational monitoring.

### 3.2 Agent 02: Phantom Inventory Agent (`SC-A02-PHI-001`)
- **Domain**: Inventory & Quality Management (MM-IM / QM)
- **StateGraph Nodes**:
  1. `ingest_stock_and_constraints`: Ingests storage-location stock balances, batch shelf life, and open reservations.
  2. `compute_usable_metrics`: Enforces arithmetic $\text{Usable} = \max(0, \text{Physical} - \text{Blocked} - \text{Hold} - \text{Reserved} - \text{WrongLocation} - \text{Expired})$.
  3. `classify_and_evaluate_policy`: Determines primary phantom cause and evaluates forward demand coverage.
  4. `llm_reasoning`: Explains operational stockout risks to warehouse manager.
  5. `route_action`: Routes unblocking, relocation, or QM escalation for approval.

### 3.3 Agent 03: Material Twin-Location Agent (`SC-A03-MTL-001`)
- **Domain**: Inter-Plant Supply Network & Logistics (MM-IM / LE)
- **StateGraph Nodes**:
  1. `ingest_transfer_option`: Loads candidate multi-plant transfer lane, stock balances, and demand profiles.
  2. `compute_source_and_economics`: Calculates source surplus after strictly reserving safety stock and 30d demand; computes net benefit ($\text{Avoided Stockout} - \text{Freight}$).
  3. `llm_reasoning`: Explains logistics trade-offs to supply chain planner.
  4. `route_action`: Dispatches Stock Transport Order (STO) proposal for director approval or auto-rejects unviable transfers.

### 3.4 Agent 04: PO Aging Intelligence Agent (`SC-A04-POA-001`)
- **Domain**: Procurement, Receiving & Accounts Payable (MM-PUR / FI-AP)
- **StateGraph Nodes**:
  1. `ingest_aged_po`: Ingests PO lines aged >90 days with goods receipt history and invoice matching records.
  2. `compute_aging_metrics`: Calculates elapsed days, overdue days, remaining quantity, and exposure value.
  3. `diagnose_root_cause`: Deterministically classifies root cause (`FULLY_RECEIVED`, `PO_BLOCKED`, `INVOICE_MISMATCH`, `REQUIREMENT_CANCELLED`, `REPEATED_RESCHEDULE`, `PARTIAL_DELIVERY_RESIDUAL`, `VALID_FUTURE_DEMAND`).
  4. `llm_reasoning`: Drafts audit summary for procurement lead.
  5. `route_action`: Gates PO closure or cancellation workflows for approval.

### 3.5 Agent 05: Requirement Contradiction Agent (`SC-A05-RCA-001`)
- **Domain**: Demand Planning & Material Requirements Planning (PP-MRP / SD)
- **StateGraph Nodes**:
  1. `ingest_demand_cluster`: Ingests overlapping requirements across sales, production, maintenance, and forecast.
  2. `compute_contradiction_metrics`: Classifies contradiction taxonomy (`DUPLICATE_OVERLAP`, `VALID_COMPETING_DEMAND`, `FIRM_FORECAST_COLLISION`, `CANCELLED_REQUIREMENT_CONFLICT`, `DOUBLE_COUNTING_RISK`) and computes net demand.
  3. `llm_reasoning`: Generates reconciliation rationale for demand planner.
  4. `route_action`: Routes forecast consumption or deduplication action for human approval.

---

## 4. Security, Safety & Audit Architecture

1. **Local Inference Guarantee**: Ollama runs entirely on the host loopback (`127.0.0.1:11434`). No proprietary transactional data leaves the secure environment.
2. **Read-Only System of Record Default**: Flat files and future SAP endpoints are protected by `ENABLE_WRITE_ACTIONS=false`.
3. **Immutable JSONL Audit Trail**: Every node execution, calculation output, LLM completion, and human approval decision is written to `audit/logs/audit_events.jsonl` with nanosecond timestamps and unique UUIDs.
