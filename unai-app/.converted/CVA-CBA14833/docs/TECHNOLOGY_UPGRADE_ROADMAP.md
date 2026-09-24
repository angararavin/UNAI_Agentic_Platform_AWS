# TECHNOLOGY UPGRADE ROADMAP & TEAM EVOLUTION
## Market Intelligence, Technology Radar & Skillset Evolution Advisory

**Version:** 1.2.0  
**Authors:** Chief Technology Officer & Principal AI Architect  
**Advisory Frequency:** Quarterly Evaluation  

---

## 1. Executive Summary

This document establishes the strategic technology roadmap and upskilling trajectory for the Bcone SAP Supply Chain Agentic AI Platform. While the initial release successfully establishes a local, zero-marginal-cost baseline using **Ollama (Gemma4/Llama3.2)** and **LangGraph StateGraphs**, scaling toward multi-plant enterprise adoption requires planned technology and talent upgrades.

---

## 2. Technology Radar Matrix

```mermaid
quadrantChart
    title AI Technology Radar for SAP Supply Chain
    x-axis Low Readiness --> High Enterprise Readiness
    y-axis Low Strategic Impact --> High Strategic Impact
    quadrant-1 ADOPT (Immediate Production)
    quadrant-2 TRIAL (Pilot & Benchmark)
    quadrant-3 ASSESS (Research & Feasibility)
    quadrant-4 HOLD (Legacy / Deprecate)
    "LangGraph StateGraph": [0.85, 0.90]
    "Ollama Local Inference": [0.80, 0.70]
    "Deterministic Math Tools": [0.95, 0.95]
    "vLLM High-Throughput Runtime": [0.70, 0.85]
    "Qwen 2.5 14B/32B (Tool Calling)": [0.65, 0.80]
    "Model Context Protocol (MCP)": [0.60, 0.75]
    "DeepSeek-R1 (Reasoning Verification)": [0.55, 0.85]
    "SAP GenAI Hub (Joule Integration)": [0.75, 0.80]
    "Prompt-Only Arithmetic": [0.20, 0.10]
```

---

## 3. Four-Quadrant Evolutionary Breakdown

### Quadrant 1: Foundational Models (LLMs)
| Model | Status | Strategic Evaluation | Recommended Action |
| :--- | :--- | :--- | :--- |
| **gemma4:latest** | Deployed | Primary local reasoning model. Excellent instruction following and contextual explanation. | Retain as current baseline for single-node local runs. |
| **llama3.2:latest** | Deployed | Fast 2GB parameter classifier. Low latency for initial triage and JSON extraction. | Retain as default fast fallback. |
| **Qwen 2.5 (14B/32B)** | Trial | Superior open-weights model for multi-tool structured calling and JSON schema adherence. | Benchmark for next hardware upgrade (16GB-24GB VRAM). |
| **DeepSeek-R1 (14B/32B)** | Assess | Native reasoning model with chain-of-thought verification for complex multi-plant network tradeoffs. | Pilot on Agent 03 and Agent 05 complex edge cases. |
| **SAP GenAI Hub** | Trial | SAP-native enterprise AI gateway supporting enterprise data residency and SAP Joule grounding. | Target for Phase 2 hybrid cloud integration when live S/4HANA connects. |

### Quadrant 2: High-Performance Inference Runtimes
* **Current: Ollama Engine**: Zero-setup local inference server. Perfect for single-user development and local desktop deployments.
* **Target: vLLM / SGLang**: PagedAttention inference server delivering 4x–8x higher token throughput under concurrent user requests. Recommended when transitioning from local POC to departmental multi-user pilots.

### Quadrant 3: Agentic Protocols & Enterprise Connectors
* **Current: LangGraph StateGraph**: Industry standard for cyclic, auditable, and stateful agent workflows.
* **Upgrade: LangGraph Sqlite / Postgres Checkpointer**: Enables asynchronous, long-lived human approval workflows spanning hours or days across browser reloads.
* **Upgrade: Model Context Protocol (MCP)**: Wrap SAP BAPIs (e.g. `BAPI_PO_CHANGE`, `BAPI_REQUISITION_DELETE`) and CDS views into standardized MCP servers for modular, secure agent tool calling.

### Quadrant 4: Team Skillset & Organization Evolution
To maintain engineering leadership, the virtual organization recommends structured upskilling across four core teams:

1. **Procurement & Inventory Planners**:
   - *Skill*: Human-in-the-Loop Agent Supervision.
   - *Training*: Understanding agent confidence scores, reviewing synthesized evidence, and auditing simulated before/after transaction states.
2. **AI & Agentic Engineers**:
   - *Skill*: Advanced LangGraph State Persistence & Multi-Agent Subgraphs.
   - *Training*: Building resilient asynchronous checkpointers, multi-agent inter-communication, and custom tool schemas.
3. **SAP Solution Architects**:
   - *Skill*: Core Data Services (CDS) Views & OData v4 Client Design.
   - *Training*: Modeling real-time supply chain CDS views (`I_PurchaseOrderItem`, `I_MaterialStock_2`) optimized for AI agent consumption.
4. **QA & Test Automation Engineers**:
   - *Skill*: LLM-as-a-Judge & Automated Rationale Benchmarking.
   - *Training*: Writing automated evaluation suites that benchmark explanation accuracy, hallucination drift, and policy compliance over time.
