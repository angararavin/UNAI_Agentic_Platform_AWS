# Bcone SAP Supply Chain Agentic AI Platform
## Enterprise Multi-Agent Decision Support & Control Tower

[![Python 3.13](https://img.shields.io/badge/python-3.13-blue.svg)](https://www.python.org/downloads/)
[![LangGraph](https://img.shields.io/badge/Orchestration-LangGraph%201.2-orange.svg)](https://langchain-ai.github.io/langgraph/)
[![Ollama](https://img.shields.io/badge/Local%20LLM-Ollama%20(Gemma4%20%2F%20Llama3.2)-blueviolet.svg)](https://ollama.ai)
[![FastAPI](https://img.shields.io/badge/API-FastAPI%200.115-teal.svg)](https://fastapi.tiangolo.com)
[![Streamlit](https://img.shields.io/badge/Control%20Tower-Streamlit%201.38-red.svg)](https://streamlit.io)
[![Pytest](https://img.shields.io/badge/Tests-14%2F14%20Passed-green.svg)](https://docs.pytest.org)

An enterprise-grade, deterministic-first, agentic supply chain platform deploying **5 specialized AI agents** for SAP S/4HANA supply chain control loops. Powered locally by **LangGraph StateGraphs**, pure mathematical calculation engines, **Ollama (`gemma4` / `llama3.2`)**, a **FastAPI backend**, and an interactive **Streamlit Control Tower & Admin Panel**.

---

## 🌟 The Five SAP Supply Chain AI Agents

1. **Agent 01: PO Promise Drift Agent (`SC-A01-PPO-001`)**
   - *Domain*: Procurement / MM-PUR
   - *Mission*: Evaluates supplier confirmation reliability, calculates delay distributions (mean, median, P90), computes downstream stockout exposure, and routes proactive expedite/reschedule proposals.
2. **Agent 02: Phantom Inventory Agent (`SC-A02-PHI-001`)**
   - *Domain*: Inventory & Quality Management / MM-IM / QM
   - *Mission*: Reconciles ERP physical inventory against true usable operational stock:
     $$\text{Usable Qty} = \max(0, \text{Physical} - \text{Blocked} - \text{Hold} - \text{Reserved} - \text{WrongLoc} - \text{Expired})$$
3. **Agent 03: Material Twin-Location Agent (`SC-A03-MTL-001`)**
   - *Domain*: Network Supply & Logistics / MM-IM / LE
   - *Mission*: Detects simultaneous surplus and shortage pairs across plants, strictly protects source safety stock + 30d demand, and calculates net transfer economics ($\text{Avoided Stockout} - \text{Freight}$).
4. **Agent 04: PO Aging Intelligence Agent (`SC-A04-POA-001`)**
   - *Domain*: Procurement & Accounts Payable / MM-PUR / FI-AP
   - *Mission*: Investigates purchase orders open >90 days, audits 3-way match and receipt history, validates need-state currency, and recommends closure or reduction.
5. **Agent 05: Requirement Contradiction Agent (`SC-A05-RCA-001`)**
   - *Domain*: Demand & MRP Planning / PP-MRP / SD
   - *Mission*: Deduplicates overlapping demand, resolves firm order vs forecast (PIR) collisions, and computes clean net demand before MRP Live runs.

---

## 🏗️ Architecture & Core Tenets

```mermaid
graph LR
    Data[Synthetic Flat Files] --> MathTools[Pure Math Engines (Non-LLM)]
    MathTools --> Policy[Policy Evaluator]
    Policy --> LLM[Local Ollama Reasoning (Gemma4)]
    LLM --> Gate{Consequential Action?}
    Gate -->|Yes| Approvals[HITL Approvals Desk]
    Gate -->|No| AutoClose[Auto-Reconcile]
    Approvals -->|Approved| SimAction[Simulated SAP Action]
    SimAction --> Audit[Append-Only JSONL Audit Trail]
```

- **Deterministic Isolation**: LLMs never compute arithmetic. All formulas are executed in pure, typed Python functions.
- **Transaction Safety**: Consequential writeback actions require explicit human approval via the Admin Panel (`ENABLE_WRITE_ACTIONS=false` default).
- **Timely Performance Reports**: Real-time SLA telemetry, latency distributions, and exportable Markdown digests.
- **Technology Radar**: Built-in advisory board evaluating market models (Qwen 2.5, DeepSeek-R1, SAP GenAI Hub), runtimes (vLLM), and team upskilling paths.

---

## 🚀 Quickstart

### 1. Prerequisites
- Python 3.11+ (Python 3.13 verified)
- [Ollama](https://ollama.ai) running locally on `http://localhost:11434` with `gemma4:latest` and `llama3.2:latest`.

### 2. Installation
```bash
# Clone & Navigate
cd "C:\Users\ashwa\OneDrive\Desktop\VS Code\Bcone SAP Agents"

# Create Virtual Environment & Activate
python -m venv .venv
.\.venv\Scripts\activate

# Install Dependencies
pip install -r requirements.txt
```

### 3. Run Verification Tests
```bash
pytest tests/
```
Expected output: **14 passed (100% pass rate)**.

### 4. Launch Services
**One-Click Windows Script:**
```powershell
.\run.ps1
```

**Or Manual Startup:**
- **Terminal 1 (FastAPI REST API):**
  ```bash
  uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
  ```
- **Terminal 2 (Streamlit Control Tower UI):**
  ```bash
  streamlit run src/ui/app.py --server.port 8501
  ```

- Control Tower UI: [http://localhost:8501](http://localhost:8501)
- Swagger OpenAPI Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📚 Documentation Suite

All system documentation is available under `docs/`:
- [Architecture Specification (`docs/ARCHITECTURE.md`)](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/docs/ARCHITECTURE.md)
- [Enterprise SDLC Governance Plan (`docs/SDLC_PLAN.md`)](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/docs/SDLC_PLAN.md)
- [User Guide for Buyers & Planners (`docs/USER_GUIDE.md`)](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/docs/USER_GUIDE.md)
- [Admin Panel & Control Tower Manual (`docs/ADMIN_PANEL_GUIDE.md`)](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/docs/ADMIN_PANEL_GUIDE.md)
- [Performance Reporting & SLA Guide (`docs/PERFORMANCE_REPORTING_GUIDE.md`)](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/docs/PERFORMANCE_REPORTING_GUIDE.md)
- [Technology Upgrade Roadmap & Team Advisory (`docs/TECHNOLOGY_UPGRADE_ROADMAP.md`)](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/docs/TECHNOLOGY_UPGRADE_ROADMAP.md)
- [Multi-Platform Deployment Guide (`docs/DEPLOYMENT_GUIDE.md`)](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/docs/DEPLOYMENT_GUIDE.md)
- [Knowledge Transfer (KT) Playbook (`docs/KT_KNOWLEDGE_TRANSFER.md`)](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/docs/KT_KNOWLEDGE_TRANSFER.md)
