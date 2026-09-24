# How to Use a Single Agent & Agent File Directory Map

This comprehensive manual explains **how to execute any single agent independently**, **where to find all code and data files for each agent**, and **how to integrate or invoke each agent** via Standalone CLI, Python Code, REST API, or the Web Command Center.

---

## 1. Architectural Layout: Standalone vs. Central Platform

Every agent in this platform is built with a **dual-architecture**:
1. **Standalone Micro-Agent Package (`Agent 1/` to `Agent 5/`)**: Fully isolated, zero-dependency runners with their own deterministic math engines, StateGraph workflows, and synthetic datasets. Perfect for unit testing, offline POC demonstrations, or embedding into external microservices.
2. **Central Platform Engine (`src/agents/`, `src/tools/`)**: Production-grade orchestration integrated with the Central Resilient Path Resolver, Pluggable Data Sources Hub (CSV/SQL/SAP RFC), Human-in-the-Loop (HITL) Governance, and the FastAPI / Streamlit Command Center.

```
Bcone SAP Agents/
├── Agent 1/                                   # Standalone Agent 1 Package
│   ├── agent.py                               # Standalone LangGraph StateGraph workflow
│   ├── tools.py                               # Standalone deterministic empirical drift math
│   ├── run_agent.py                           # Standalone CLI runner (8 validation cases)
│   ├── README.md                              # Standalone technical specification
│   ├── POC_REPORT.md                          # Standalone validation report
│   └── PO_Promise_Drift_Synthetic_Data/       # Standalone CSV dataset
│
├── Agent 2/                                   # Standalone Agent 2 Package
│   ├── agent.py                               # Standalone LangGraph StateGraph workflow
│   ├── tools.py                               # Standalone usable inventory calculation
│   ├── run_agent.py                           # Standalone CLI runner (16 validation cases)
│   ├── README.md                              # Standalone technical specification
│   ├── POC_REPORT.md                          # Standalone validation report
│   └── Phantom_Inventory_Agent_Synthetic_Data/# Standalone CSV dataset
│
├── Agent3/                                    # Standalone Agent 3 Package
│   ├── agent.py                               # Standalone LangGraph StateGraph workflow
│   ├── tools.py                               # Standalone safety stock & freight math
│   ├── run_agent.py                           # Standalone CLI runner (10 validation cases)
│   ├── README.md                              # Standalone technical specification
│   ├── POC_REPORT.md                          # Standalone validation report
│   └── Material_Twin_Location_Agent_Synthetic_Data/ # Standalone CSV dataset
│
├── Agent 4/                                   # Standalone Agent 4 Package
│   ├── agent.py                               # Standalone LangGraph StateGraph workflow
│   ├── tools.py                               # Standalone 3-way match & aging engine
│   ├── run_agent.py                           # Standalone CLI runner (12 validation cases)
│   ├── README.md                              # Standalone technical specification
│   ├── POC_REPORT.md                          # Standalone validation report
│   └── PO_Aging_Intelligence_Agent_Synthetic_Data/ # Standalone CSV dataset
│
├── Agent 5/                                   # Standalone Agent 5 Package
│   ├── agent.py                               # Standalone LangGraph StateGraph workflow
│   ├── tools.py                               # Standalone MRP contradiction math
│   ├── run_agent.py                           # Standalone CLI runner (6 validation cases)
│   ├── README.md                              # Standalone technical specification
│   ├── POC_REPORT.md                          # Standalone validation report
│   └── Requirement_Contradiction_Agent_Synthetic_Data/ # Standalone CSV dataset
│
└── src/                                       # Central Enterprise Platform
    ├── agents/                                # Central Agent Workflows
    │   ├── base_graph.py                      # Common StateGraph base class
    │   ├── agent_01_drift.py                  # Central Agent 1 implementation
    │   ├── agent_02_phantom.py                # Central Agent 2 implementation
    │   ├── agent_03_twin.py                   # Central Agent 3 implementation
    │   ├── agent_04_aging.py                  # Central Agent 4 implementation
    │   └── agent_05_contradiction.py          # Central Agent 5 implementation
    ├── tools/                                 # Central Deterministic Toolkits
    │   ├── drift_tools.py                     # Central drift & empirical distributions
    │   ├── inventory_tools.py                 # Central stock usability formulas
    │   ├── transfer_tools.py                  # Central inter-plant transfer arbitrage
    │   ├── aging_tools.py                     # Central open PO aging & GR/IR hygiene
    │   └── contradiction_tools.py             # Central MRP flapping & contradiction
    ├── core/                                  # Data models, AgentState, Configuration
    ├── data/                                  # Resilient Path Resolver, DB & File Connectors
    ├── api/                                   # FastAPI REST Endpoints (Port 8000)
    └── ui/                                    # Streamlit Command Center (Port 8501)
```

---

## 2. Four Ways to Run Any Single Agent

You can execute any individual agent using any of the four standard execution methods:

### Method 1: Standalone CLI Runner (Zero Setup)
Navigate to the root directory and run the agent's dedicated `run_agent.py` script. This executes deterministic test scenarios against local synthetic data and outputs full diagnostics directly to the terminal:

```bash
# Run Agent 1 (PO Promise Drift)
python "Agent 1/run_agent.py"

# Run Agent 2 (Phantom Inventory)
python "Agent 2/run_agent.py"

# Run Agent 3 (Material Twin-Location)
python "Agent3/run_agent.py"

# Run Agent 4 (PO Aging Intelligence)
python "Agent 4/run_agent.py"

# Run Agent 5 (Requirement Contradiction)
python "Agent 5/run_agent.py"
```

### Method 2: Programmatic Python Import

#### Option A: Using the Standalone Agent Package
```python
import sys
from pathlib import Path

# Add the agent directory to Python path
sys.path.insert(0, str(Path("./Agent 1").resolve()))

from agent import run_po_drift_agent

# Run agent with specific parameters
result = run_po_drift_agent(
    po_number="450010000",
    po_line_item=10,
    supplier_id="SUP1004",
    material_id="MAT-1001",
    plant_id="PLNT-1000",
    promised_delivery_date="2026-10-15",
    current_date="2026-10-10"
)

print(f"Risk Band: {result.get('risk_band')}")
print(f"Predicted Drift: {result.get('predicted_drift_days')} days")
print(f"Recommended Action: {result.get('recommended_action')}")
```

#### Option B: Using the Central Platform Engine
```python
from src.agents.agent_01_drift import build_po_drift_graph

# Instantiate the compiled LangGraph workflow
workflow = build_po_drift_graph()

# Execute analysis with target input state
initial_state = {
    "po_number": "450010000",
    "po_line_item": 10,
    "supplier_id": "SUP1004",
    "material_id": "MAT-1001",
    "plant_id": "PLNT-1000",
    "promised_delivery_date": "2026-10-15",
    "current_date": "2026-10-10",
    "confidence_score": 1.0,
    "requires_hitl": False
}

final_state = workflow.invoke(initial_state)

print("Policy Evaluation:", final_state.get("policy_evaluation"))
print("Proposed Actions:", final_state.get("proposed_actions"))
```

### Method 3: REST API Endpoint (FastAPI)
Ensure the backend server is running (`python -m uvicorn src.api.main:app --port 8000`), then dispatch an HTTP POST request:

#### Agent 1 Endpoint Example:
```bash
curl -X POST http://localhost:8000/api/v1/agents/agent_01/run \
  -H "Content-Type: application/json" \
  -d '{
    "po_number": "450010000",
    "po_line_item": 10,
    "supplier_id": "SUP1004",
    "material_id": "MAT-1001",
    "plant_id": "PLNT-1000",
    "promised_delivery_date": "2026-10-15",
    "current_date": "2026-10-10"
  }'
```

#### PowerShell Endpoint Example:
```powershell
$body = @{
    po_number = "450010000"
    po_line_item = 10
    supplier_id = "SUP1004"
    material_id = "MAT-1001"
    plant_id = "PLNT-1000"
    promised_delivery_date = "2026-10-15"
    current_date = "2026-10-10"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/v1/agents/agent_01/run" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

### Method 4: Interactive Web UI (Streamlit Command Center)
1. Open **`http://localhost:8501`** in your browser.
2. In the sidebar under **Operations Hub**, click **Agent Cockpit**.
3. In the dropdown selector, choose your specialized agent:
   - `🚚 Agent 1 — Delivery Truth Teller (PO Promise Drift)`
   - `👻 Agent 2 — Phantom Inventory Hunter (Stock Reality Check)`
   - `🏗️ Agent 3 — Inter-Plant Matchmaker (Sister Plant Balancing)`
   - `🧟 Agent 4 — Zombie PO Slayer (Aging Commitments)`
   - `🧘 Agent 5 — Demand Chaos Calmer (Requirement Contradiction)`
4. Select a pre-built demo case or type in custom SAP IDs.
5. Click **⚡ Run Agent Investigation** to view interactive Plotly waterfall charts, mathematical audit receipts, and human-in-the-loop action proposals.

---

## 3. Detailed Agent-by-Agent Reference Directory

---

### 🚚 Agent 1: Delivery Truth Teller (PO Promise Drift)
- **Technical SAP Code:** `SC-A01-PPO-001`
- **Business Mission:** Exposes empirical vendor delivery delays to prevent factory line starvation.
- **Business Analogy:** *A GPS traffic recalculator for purchase orders.*
- **SAP Tables Audited:** `EKKO` (PO Header), `EKPO` (Line Items), `EKET` (Delivery Schedules), `EKBE` (Goods Receipts / History).

#### File Locations:
| Asset | File Path |
| :--- | :--- |
| **Standalone Workflow** | [`Agent 1/agent.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent%201/agent.py) |
| **Standalone Math Tools** | [`Agent 1/tools.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent%201/tools.py) |
| **Standalone CLI Runner** | [`Agent 1/run_agent.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent%201/run_agent.py) |
| **Central Platform Graph** | [`src/agents/agent_01_drift.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/agents/agent_01_drift.py) |
| **Central Platform Tools** | [`src/tools/drift_tools.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/tools/drift_tools.py) |
| **Synthetic Dataset** | [`Agent 1/PO_Promise_Drift_Synthetic_Data/`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent%201/PO_Promise_Drift_Synthetic_Data/) |
| **Technical Documentation** | [`Agent 1/README.md`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent%201/README.md) |
| **Validation Report** | [`Agent 1/POC_REPORT.md`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent%201/POC_REPORT.md) |

#### Required Inputs:
- `po_number`: Purchase Order number (e.g., `"450010000"`)
- `po_line_item`: Line item index (e.g., `10`)
- `supplier_id`: Vendor code (e.g., `"SUP1004"`)
- `material_id`: Material SKU (e.g., `"MAT-1001"`)
- `plant_id`: Destination plant (e.g., `"PLNT-1000"`)
- `promised_delivery_date`: Confirmed date (e.g., `"2026-10-15"`)
- `current_date`: Valuation date (e.g., `"2026-10-10"`)

#### Key Outputs:
- `predicted_drift_days`: Probability-weighted empirical delay (e.g., `+1.24` days, P90 `+2.8` days).
- `days_of_cover_without_po`: Buffer stock remaining before line starvation.
- `risk_band`: `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW`.
- `action`: Supplier follow-up dispatch, safety stock consumption authorization, or line rescheduling.

---

### 👻 Agent 2: Phantom Inventory Hunter (Stock Reality Check)
- **Technical SAP Code:** `SC-A02-PHI-001`
- **Business Mission:** Audits discrepancies between SAP system stock and true usable inventory.
- **Business Analogy:** *A forensic accountant for warehouse shelves.*
- **SAP Tables Audited:** `MARD` (Storage Location Stock), `MSKA` (Sales Order Stock), `RESB` (Reservations), `QALS` (Inspection Lots).

#### File Locations:
| Asset | File Path |
| :--- | :--- |
| **Standalone Workflow** | [`Agent 2/agent.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent%202/agent.py) |
| **Standalone Math Tools** | [`Agent 2/tools.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent%202/tools.py) |
| **Standalone CLI Runner** | [`Agent 2/run_agent.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent%202/run_agent.py) |
| **Central Platform Graph** | [`src/agents/agent_02_phantom.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/agents/agent_02_phantom.py) |
| **Central Platform Tools** | [`src/tools/inventory_tools.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/tools/inventory_tools.py) |
| **Synthetic Dataset** | [`Agent 2/Phantom_Inventory_Agent_Synthetic_Data/`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent%202/Phantom_Inventory_Agent_Synthetic_Data/) |
| **Technical Documentation** | [`Agent 2/README.md`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent%202/README.md) |
| **Validation Report** | [`Agent 2/POC_REPORT.md`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent%202/POC_REPORT.md) |

#### Required Inputs:
- `material_id`: Material SKU (e.g., `"MAT-2001"`)
- `plant_id`: Warehouse plant code (e.g., `"PLNT-1000"`)
- `storage_location`: Target storage bay (e.g., `"SL01"`)
- `current_date`: Audit date (e.g., `"2026-10-10"`)

#### Usability Arithmetic Formula:
$$\text{Usable Stock} = \text{Unrestricted} - (\text{Blocked} + \text{QA Hold} + \text{Expired} + \text{Hard Reservations})$$

---

### 🏗️ Agent 3: Inter-Plant Matchmaker (Sister Plant Balancing)
- **Technical SAP Code:** `SC-A03-TWN-001`
- **Business Mission:** Solves plant stockouts by identifying excess inventory at sister plants and calculating transfer arbitrage.
- **Business Analogy:** *An internal ride-share coordinator for emergency materials.*
- **SAP Tables Audited:** `MARC` (Plant Stock), `T001W` (Plant Master), Freight Lane Master Tables.

#### File Locations:
| Asset | File Path |
| :--- | :--- |
| **Standalone Workflow** | [`Agent3/agent.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent3/agent.py) |
| **Standalone Math Tools** | [`Agent3/tools.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent3/tools.py) |
| **Standalone CLI Runner** | [`Agent3/run_agent.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent3/run_agent.py) |
| **Central Platform Graph** | [`src/agents/agent_03_twin.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/agents/agent_03_twin.py) |
| **Central Platform Tools** | [`src/tools/transfer_tools.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/tools/transfer_tools.py) |
| **Synthetic Dataset** | [`Agent3/Material_Twin_Location_Agent_Synthetic_Data/`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent3/Material_Twin_Location_Agent_Synthetic_Data/) |
| **Technical Documentation** | [`Agent3/README.md`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent3/README.md) |
| **Validation Report** | [`Agent3/POC_REPORT.md`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent3/POC_REPORT.md) |

#### Required Inputs:
- `deficit_plant_id`: Requesting plant (e.g., `"PLNT-1000"`)
- `material_id`: Material SKU (e.g., `"MAT-3001"`)
- `required_quantity`: Units required (e.g., `250`)
- `production_deadline`: Cut-off date (e.g., `"2026-10-18"`)

---

### 🧟 Agent 4: Zombie PO Slayer (Aging Commitments)
- **Technical SAP Code:** `SC-A04-AGP-001`
- **Business Mission:** Audits open PO commitments and GR/IR imbalances to release locked working capital.
- **Business Analogy:** *A debt collector and clutter shredder for old purchase orders.*
- **SAP Tables Audited:** `EKKO` (Header), `EKPO` (Items), `EKBE` (History), `RSEG` (Incoming Invoices).

#### File Locations:
| Asset | File Path |
| :--- | :--- |
| **Standalone Workflow** | [`Agent 4/agent.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent%204/agent.py) |
| **Standalone Math Tools** | [`Agent 4/tools.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent%204/tools.py) |
| **Standalone CLI Runner** | [`Agent 4/run_agent.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent%204/run_agent.py) |
| **Central Platform Graph** | [`src/agents/agent_04_aging.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/agents/agent_04_aging.py) |
| **Central Platform Tools** | [`src/tools/aging_tools.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/tools/aging_tools.py) |
| **Synthetic Dataset** | [`Agent 4/PO_Aging_Intelligence_Agent_Synthetic_Data/`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent%204/PO_Aging_Intelligence_Agent_Synthetic_Data/) |
| **Technical Documentation** | [`Agent 4/README.md`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent%204/README.md) |
| **Validation Report** | [`Agent 4/POC_REPORT.md`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent%204/POC_REPORT.md) |

#### Required Inputs:
- `po_number`: Target purchase order (e.g., `"450040001"`)
- `po_line_item`: Target line item (e.g., `10`)
- `current_date`: Evaluation date (e.g., `"2026-10-10"`)

---

### 🧘 Agent 5: Demand Chaos Calmer (Requirement Contradiction)
- **Technical SAP Code:** `SC-A05-REQ-001`
- **Business Mission:** Detects and resolves duplicate, oscillating, or flapping MRP requisitions.
- **Business Analogy:** *An air traffic controller resolving conflicting flight requests.*
- **SAP Tables Audited:** `EBAN` (Requisitions), `MD04` (Stock/Requirements List), `PLAF` (Planned Orders).

#### File Locations:
| Asset | File Path |
| :--- | :--- |
| **Standalone Workflow** | [`Agent 5/agent.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent%205/agent.py) |
| **Standalone Math Tools** | [`Agent 5/tools.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent%205/tools.py) |
| **Standalone CLI Runner** | [`Agent 5/run_agent.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent%205/run_agent.py) |
| **Central Platform Graph** | [`src/agents/agent_05_contradiction.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/agents/agent_05_contradiction.py) |
| **Central Platform Tools** | [`src/tools/contradiction_tools.py`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/src/tools/contradiction_tools.py) |
| **Synthetic Dataset** | [`Agent 5/Requirement_Contradiction_Agent_Synthetic_Data/`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent%205/Requirement_Contradiction_Agent_Synthetic_Data/) |
| **Technical Documentation** | [`Agent 5/README.md`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent%205/README.md) |
| **Validation Report** | [`Agent 5/POC_REPORT.md`](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/Bcone%20SAP%20Agents/Agent%205/POC_REPORT.md) |

#### Required Inputs:
- `material_id`: Material SKU (e.g., `"MAT-5001"`)
- `plant_id`: Production plant (e.g., `"PLNT-1000"`)
- `planning_horizon_days`: Lookahead window in days (e.g., `30`)

---

## 4. Testing & Verification Commands

To verify that all agents operate correctly and deterministically:

```bash
# Run all 27 automated platform unit and workflow tests
pytest tests/ -v

# Run individual agent standalone test suites
python "Agent 1/run_agent.py"
python "Agent 2/run_agent.py"
python "Agent3/run_agent.py"
python "Agent 4/run_agent.py"
python "Agent 5/run_agent.py"
```
