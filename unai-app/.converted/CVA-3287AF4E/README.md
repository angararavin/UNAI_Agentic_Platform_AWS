# Order Surge Impact Analysis — Autonomous Multi-Agent Supply Chain Intelligence

> An enterprise-grade, autonomous multi-agent decision support system built with **LangChain**, **LangGraph**, **TypeScript**, **React 19**, **Tailwind CSS**, and **Express**. Powered by **Google Gemini**, local **Ollama**, or custom **OpenAI-compatible** reasoning engines, featuring rigorous **Human-in-the-Loop (HITL)** operational governance.

---

## Table of Contents

1. [Executive Summary & What It Is](#1-executive-summary--what-it-is)
2. [Why This Platform Exists](#2-why-this-platform-exists)
3. [How It Works: Autonomous Multi-Agent Architecture](#3-how-it-works-autonomous-multi-agent-architecture)
   - [Agent 1: Demand Analyst Agent](#agent-1-demand-analyst-agent)
   - [Agent 2: Supply Impact Analyst Agent](#agent-2-supply-impact-analyst-agent)
   - [Agent 3: Planner Recommendation Agent](#agent-3-planner-recommendation-agent)
   - [Agent 4: Human-in-the-Loop (HITL) Governance Gate](#agent-4-human-in-the-loop-hitl-governance-gate)
4. [Step-by-Step Installation & Run Guide for macOS](#4-step-by-step-installation--run-guide-for-macos)
5. [Step-by-Step Installation & Run Guide for Windows](#5-step-by-step-installation--run-guide-for-windows)
6. [AI Reasoning Engine Configuration (Gemini, Ollama, OpenAI)](#6-ai-reasoning-engine-configuration)
7. [How to Use the Application: End-to-End Walkthrough](#7-how-to-use-the-application-end-to-end-walkthrough)
8. [Data Catalog & SKUs Deep-Dive](#8-data-catalog--skus-deep-dive)
9. [Full API Reference & Server Endpoints](#9-full-api-reference--server-endpoints)
10. [Project Directory & File Structure](#10-project-directory--file-structure)
11. [Troubleshooting & Frequently Asked Questions](#11-troubleshooting--frequently-asked-questions)

---

## 1. Executive Summary & What It Is

**Order Surge Impact Analysis** is an intelligent supply chain orchestration engine. When a customer or sales channel places an unexpected, unforecasted order spike (e.g., +150% volume requested in 7 days), conventional Enterprise Resource Planning (ERP) systems either blind-accept the order (leading to stockouts for existing commitments) or reject it outright (sacrificing revenue and customer satisfaction).

This platform acts as an **autonomous supply chain command center**:
- **Simulates Multi-Tier Impact in Seconds**: Quantifies immediate warehouse stock depletion, inbound Purchase Order (PO) pipeline arrivals, tier-1 supplier lead times, and manufacturing line capacity headroom.
- **Formulates Actionable Mitigation Levers**: Instead of merely stating "there is a shortage", it synthesizes concrete, cost-modeled remedies (e.g., air-freighting component POs, spinning up weekend assembly shifts, reallocating non-critical buffer stock, or negotiating partial split-shipments).
- **Enforces Human-in-the-Loop Governance**: AI models never dispatch unvetted purchase orders autonomously. A human supply chain director retains final authority to authorize specific levers, adjust committed volumes, override delivery dates, and execute mock ERP dispatches.

---

## 2. Why This Platform Exists

In modern supply chain operations (electronics, automotive, aerospace, industrial equipment):
1. **The Bullwhip Effect**: Unforecasted spikes trigger panic-buying from upstream suppliers, inflating carrying costs and tying up working capital.
2. **Siloed Planning**: Demand planners, warehouse inventory managers, and plant operations supervisors typically coordinate via scattered spreadsheets and slow email threads.
3. **Expensive Blind Expediting**: Planners frequently authorize emergency air-freight when a simple 2-day partial split-shipment or a 1-day overtime shift would have satisfied the customer at zero extra freight cost.

This application unifies demand sensing, inventory simulation, and operational execution into a single, cohesive, multi-agent workflow that completes in under 3 seconds.

---

## 3. How It Works: Autonomous Multi-Agent Architecture

The core pipeline is built as a **LangGraph StateGraph** state machine. Each agent specializes in a distinct supply chain discipline, receiving accumulated state, performing quantitative and qualitative reasoning, and passing enriched state to the downstream agent.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LangGraph State Workflow                        │
│                                                                        │
│   [ Surge Input Parameters ]                                           │
│               │                                                        │
│               ▼                                                        │
│   ┌────────────────────────┐                                           │
│   │  Demand Analyst Agent  │ ──► Calculates run-rate velocity, surge   │
│   └───────────┬────────────┘     delta, and customer priority score   │
│               ▼                                                        │
│   ┌────────────────────────┐                                           │
│   │  Supply Impact Analyst │ ──► Simulates multi-day inventory curve,  │
│   └───────────┬────────────┘     stockout day, and open PO arrivals    │
│               ▼                                                        │
│   ┌────────────────────────┐                                           │
│   │ Planner Recommendation │ ──► Formulates prioritized mitigation     │
│   └───────────┬────────────┘     matrix, cost impact & tradeoffs       │
│               ▼                                                        │
│   ┌────────────────────────┐                                           │
│   │ Human-in-the-Loop Gate │ ──► Planner authorizes/modifies actions;  │
│   └────────────────────────┘     triggers ERP PO & dispatch alerts     │
└────────────────────────────────────────────────────────────────────────┘
```

### Agent 1: Demand Analyst Agent
- **Inputs**: Target SKU, requested surge volume, target fulfillment horizon (days), customer name, customer priority SLA (Critical / High / Standard), and trigger reason.
- **Quantitative Math**:
  - `Normal Baseline Demand = Baseline Daily Forecast × Target Days`
  - `Surge Order Delta = Requested Surge Quantity - Normal Baseline Demand`
  - `Surge Percentage = (Surge Delta / Normal Baseline Demand) × 100`
  - `Required Run-Rate Velocity = Requested Surge Quantity / Target Days`
- **Output**: Determines demand severity tier (`low`, `moderate`, `high`, `critical`), run-rate acceleration multiple, customer SLA weight, and an executive briefing on demand feasibility.

### Agent 2: Supply Impact Analyst Agent
- **Inputs**: Output of Demand Agent + current SKU inventory on-hand, safety stock threshold, reserved inventory, open purchase orders (PO schedule and quantities), supplier standard lead time, supplier expedite air-freight lead time, and assembly line daily capacity.
- **Day-by-Day Simulation**:
  - Evaluates warehouse stock level for every day `t ∈ [1, horizon]`.
  - Integrates in-transit POs that arrive on or before day `t`.
  - Identifies the exact **Projected Stockout Day** where cumulative demand exceeds free inventory.
  - Computes **Net Inventory Balance** at the horizon cutoff (`Available Supply - Surge Demand`).
- **Output**: Net stock balance, stockout day indicator, supplier expedite feasibility, plant overtime capacity headroom, and high-risk bottleneck flags.

### Agent 3: Planner Recommendation Agent
- **Inputs**: Output of Demand & Supply Agents + cost structures (expedite fees per unit, overtime production cost per unit, margin implications).
- **Reasoning**:
  - Formulates 3–5 concrete operational action items with estimated cost in USD, responsible functional owner (Procurement, Operations, Logistics, Account Management), and risk severity.
  - Levers include:
    1. *Supplier Expedite*: Convert inbound sea freight POs to priority air freight.
    2. *Production Overtime*: Spin up weekend shifts on designated manufacturing lines.
    3. *Buffer Stock Reallocation*: Temporarily draw down unassigned buffer stock while replenishing under safety stock floors.
    4. *Partial Split-Shipment*: Negotiate an immediate delivery of on-hand units followed by remainder upon PO arrival.
- **Output**: Synthesizes a primary recommended strategy name, comprehensive trade-off matrix, budget ceiling, and recoverable volume calculation.

### Agent 4: Human-in-the-Loop (HITL) Governance Gate
- **Purpose**: Operational safety checkpoint preventing hallucinations or unapproved capital expenditure.
- **Capabilities**:
  - **Granular Lever Selection**: Supply chain planners can toggle each mitigation action on or off with instantaneous authorized budget recalculation. Includes **Select all** and **Clear all** batch toggles.
  - **Volume & Date Overrides**: Planners can adjust the committed quantity or extend the fulfillment window based on real-world conversations with the customer.
  - **Planner Rationale Notes**: Mandatory or optional text notes documenting the business justification for audit compliance.
  - **Execution Dispatch**: Upon approval, the system executes simulated ERP Purchase Orders (with auto-generated PO numbers e.g. `PO-EXP-84920`), supplier priority notifications, and internal warehouse staging tasks.

---

## 4. Step-by-Step Installation & Run Guide for macOS

Follow these instructions to run the application natively on macOS (Apple Silicon M1/M2/M3/M4 or Intel).

### Prerequisites
- macOS 12 Monterey, macOS 13 Ventura, macOS 14 Sonoma, or newer.
- **Terminal** (built-in) or **iTerm2**.
- **Node.js** (v18, v20, or v22 LTS recommended).
- **Git**.

### Step 1: Install Homebrew (if not already installed)
Open your Terminal and run:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
Follow the on-screen instructions to add Homebrew to your `PATH`.

### Step 2: Install Git and Node.js
Using Homebrew:
```bash
brew install git node
```
Verify the installation:
```bash
node -v   # Should output v18.x, v20.x, or v22.x
npm -v    # Should output 9.x or 10.x
git --version
```

*(Optional Alternative)* Using **NVM** (Node Version Manager):
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.zshrc
nvm install 20
nvm use 20
```

### Step 3: Clone or Open the Project
Navigate to your desired workspace directory:
```bash
cd ~/Projects/order-surge-impact-analysis
```

### Step 4: Install Dependencies
Run npm install to install all frontend, backend, LangChain, and LangGraph packages:
```bash
npm install
```

### Step 5: Configure Environment Variables
Copy the sample environment file to create `.env`:
```bash
cp .env.example .env
```
Open `.env` in your text editor (TextEdit, VS Code, Cursor, or Nano):
```bash
nano .env
```
Provide your Google Gemini API Key or configure your preferred engine:
```env
GEMINI_API_KEY="AIzaSyYourActualGoogleGeminiAPIKeyHere"
LLM_PROVIDER="gemini"
```
*(If using Ollama or a custom endpoint, see Section 6).*

### Step 6: Start the Development Server
```bash
npm run dev
```
You will see output in the terminal:
```
Server running on http://localhost:3000
```
Open your browser and navigate to **`http://localhost:3000`**.

### Step 7: Building for Production (Optional)
To test the production bundled build:
```bash
npm run build
npm run start
```

---

## 5. Step-by-Step Installation & Run Guide for Windows

Follow these instructions to run the application on Windows 10 or Windows 11.

### Option A: Standard Windows Setup (PowerShell / Command Prompt)

#### Step 1: Install Node.js & Git
1. Download and run the **Node.js LTS installer** (v20 or v22) from [nodejs.org](https://nodejs.org/). Make sure "Add to PATH" is checked.
2. Download and install **Git for Windows** from [git-scm.com](https://git-scm.com/).
3. *(Alternative via Windows Package Manager)*:
   Open **PowerShell as Administrator** and run:
   ```powershell
   winget install OpenJS.NodeJS.LTS
   winget install Git.Git
   ```
4. Restart your PowerShell or Command Prompt window and verify:
   ```powershell
   node -v
   npm -v
   git --version
   ```

#### Step 2: Clone or Open the Project
In PowerShell or Command Prompt:
```powershell
cd C:\Users\<YourUsername>\Projects\order-surge-impact-analysis
```

#### Step 3: Install Dependencies
```powershell
npm install
```

#### Step 4: Configure the Environment File
In PowerShell:
```powershell
Copy-Item .env.example .env
```
*(In Command Prompt)*:
```cmd
copy .env.example .env
```
Open `.env` in Notepad or VS Code:
```powershell
notepad .env
```
Fill in your API key:
```env
GEMINI_API_KEY=AIzaSyYourActualGoogleGeminiAPIKeyHere
LLM_PROVIDER=gemini
```

#### Step 5: Start the Application
```powershell
npm run dev
```
Open your web browser and visit **`http://localhost:3000`**.

---

### Option B: Windows Subsystem for Linux (WSL 2 — Recommended for Developers)

If you prefer a native Linux environment on Windows:
1. Open PowerShell as Administrator and run:
   ```powershell
   wsl --install
   ```
2. Restart your computer if prompted and launch **Ubuntu** from the Start Menu.
3. In Ubuntu, install Node.js:
   ```bash
   sudo apt update
   sudo apt install -y curl git
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```
4. Navigate to your project, install, and run:
   ```bash
   cd /mnt/c/Users/<YourUsername>/Projects/order-surge-impact-analysis
   npm install
   cp .env.example .env
   npm run dev
   ```
5. Access the app in Windows Chrome/Edge at **`http://localhost:3000`**.

---

## 6. AI Reasoning Engine Configuration

The platform supports three distinct reasoning engines. You can switch between them simply by setting `LLM_PROVIDER` in your `.env` file:

| Provider | `LLM_PROVIDER` | Requirements | Best For |
| :--- | :--- | :--- | :--- |
| **Google Gemini** | `gemini` | `GEMINI_API_KEY` | Fastest, zero-setup cloud reasoning with high structured JSON compliance. |
| **Local Ollama** | `ollama` | `OLLAMA_BASE_URL`, `OLLAMA_MODEL` | 100% offline, private local AI running on your Mac/PC GPU. |
| **Custom OpenAI API** | `custom_api` | `CUSTOM_AI_API_BASE_URL`, `CUSTOM_AI_API_KEY`, `CUSTOM_AI_MODEL` | Corporate LLM proxies, vLLM, LM Studio, Azure OpenAI, or OpenAI GPT-4o. |

### Configuration 1: Google Gemini (Default)
1. Obtain a free Gemini API key from [Google AI Studio](https://aistudio.google.com/).
2. In `.env`:
   ```env
   LLM_PROVIDER="gemini"
   GEMINI_API_KEY="AIzaSyYourKeyHere"
   ```

### Configuration 2: Local Ollama (100% Offline & Private)
1. Download Ollama from [ollama.com](https://ollama.com/).
2. Pull your model of choice (e.g. Llama 3.2 or Mistral):
   ```bash
   ollama pull llama3.2
   ```
3. Start the Ollama server:
   ```bash
   ollama serve
   ```
4. In `.env`:
   ```env
   LLM_PROVIDER="ollama"
   OLLAMA_BASE_URL="http://localhost:11434"
   OLLAMA_MODEL="llama3.2"
   ```

### Configuration 3: Custom OpenAI-Compatible Gateway
Supports OpenAI, LM Studio, LocalAI, vLLM, LiteLLM, or Azure OpenAI:
```env
LLM_PROVIDER="custom_api"
CUSTOM_AI_API_BASE_URL="https://api.openai.com/v1"
CUSTOM_AI_API_KEY="sk-proj-YourKeyHere"
CUSTOM_AI_MODEL="gpt-4o-mini"
```

---

## 7. How to Use the Application: End-to-End Walkthrough

### Step 1: Inspect Target SKU Cards
- The top grid presents all active supply chain items.
- **Hover Over Any Card**: An interactive, portal-rendered specifications card appears showing:
  - Free available stock vs. reserved stock vs. safety stock floor.
  - In-transit open Purchase Orders scheduled for arrival.
  - Component supplier name, standard maritime lead time, and air-freight expedite cost.
  - Dedicated manufacturing line capacity and daily surge headroom.
- **Click Any Card**: Selects that SKU as the active subject for surge simulation.

### Step 2: Set Surge Parameters & Quick Presets
In the **Simulate Demand Surge** panel:
- Adjust **Surge Order Quantity (Units)**: The total units the customer is requesting.
- Adjust **Target Fulfillment Horizon (Days)**: The requested delivery window.
- Select **Customer Priority SLA**: `Critical`, `High`, or `Standard`.
- Enter **Customer Account Name**: e.g., `Apex Automotive`, `Titan Heavy Industries`.
- **Quick Scenario Presets**:
  - `+50% Flash Sale`: Moderate demand increase.
  - `+100% Contract Ramp`: High-volume surge with tight timelines.
  - `+200% Emergency Spike`: Severe supply stress test triggering multi-tier mitigation levers.
- Click **Launch Multi-Agent Analysis**.

### Step 3: Observe Multi-Agent Progress
The **Pipeline Steps** tracker visually animates through the sequential stages:
1. `Demand Analyst` &rarr; Run-rate acceleration and delta quantification.
2. `Supply Impact` &rarr; Multi-day stockout curves and constraint mapping.
3. `Planner Recommendations` &rarr; Operational mitigation strategy synthesis.
4. `Human Decision Gate` &rarr; Awaiting operational authorization.

### Step 4: Examine Analytical Graphs & Visualizations
- **Demand Agent Card**:
  - *Demand vs Baseline Bar Chart*: Visually contrast baseline velocity with surge requirements.
  - *Run-Rate KPI Pills*: Hover over any metric for detailed formula breakdowns.
- **Supply Agent Card**:
  - *Inventory Depletion Timeline Area Chart*: See the exact day stock dips below safety floors or reaches zero.
  - *Supply Composition Bar Chart*: Visually verify on-hand free inventory vs. in-transit PO arrival days.
- **Planner Agent Card**:
  - *Mitigation Volume Contribution Chart*: Visual breakdown of units recovered via supplier expedite vs plant overtime vs buffer reallocation.
  - *Cost Breakdown*: Understand exact premium spend ($USD) required for each lever.

### Step 5: Exercise Human-in-the-Loop Governance
Under the **Human-in-the-Loop Governance Gate**:
1. **Authorize/De-Authorize Levers**:
   - Check or uncheck individual mitigation actions.
   - Use the **Select all** or **Clear all** buttons to batch-select.
   - The **Authorized Budget** counter updates in real time.
2. **Override Terms (Optional)**:
   - Modify **Authorized Surge Quantity** if offering a partial allocation.
   - Modify **Delivery Commitment Days** if counter-offering a feasible timeline.
3. **Planner Directives**: Type internal planner notes for downstream teams.
4. **Submit Decision**:
   - **Authorize All Actions**: Commits all actions and automatically generates simulated ERP POs.
   - **Approve with Modifications**: Approves only selected levers with adjusted quantities.
   - **Reject Surge Order**: Formally declines the surge with recorded rationale to protect baseline contracts.

### Step 6: Review Dispatch Logs & History
- Click **Runs** in the top-right header to open the **Analysis History Drawer**.
- Search past runs by SKU or customer name.
- Click **Export Report** to download an executive Markdown summary, CSV, or raw JSON.

---

## 8. Data Catalog & SKUs Deep-Dive

The platform includes a realistic enterprise component database:

### 1. `SKU-ELEC-401` — Lithium-Ion 48V Battery Module
- **Category**: Power & Energy Storage
- **Unit Cost**: $420.00
- **Baseline Daily Forecast**: 120 units/day
- **Current Warehouse Stock**: 1,450 units (200 reserved, 250 safety stock floor)
- **Open Purchase Orders**:
  - `PO-10821`: 400 units arriving Day 3
  - `PO-10894`: 600 units arriving Day 7
- **Supplier**: EnerSys Global Dynamics (Standard: 14 days, Expedite: 4 days, +$38/unit)
- **Manufacturing Plant**: Line A-Lithium Assembly (Capacity: 150 units/day, Surge Headroom: +45 units/day)

### 2. `SKU-CHIP-902` — Industrial ARM-M4 Cortex Microcontroller
- **Category**: Semiconductors
- **Unit Cost**: $64.00
- **Baseline Daily Forecast**: 350 units/day
- **Current Warehouse Stock**: 3,100 units (500 reserved, 600 safety stock floor)
- **Open Purchase Orders**:
  - `PO-20412`: 1,200 units arriving Day 4
  - `PO-20499`: 1,800 units arriving Day 9
- **Supplier**: SiliconFoundry Pacific (Standard: 21 days, Expedite: 5 days, +$9/unit)
- **Manufacturing Plant**: SMT Line 3 Semiconductor Insertion (Capacity: 450 units/day, Surge Headroom: +110 units/day)

### 3. `SKU-MECH-108` — Precision Hydraulic Actuator Assembly
- **Category**: Mechanical & Hydraulics
- **Unit Cost**: $210.00
- **Baseline Daily Forecast**: 80 units/day
- **Current Warehouse Stock**: 850 units (150 reserved, 180 safety stock floor)
- **Open Purchase Orders**:
  - `PO-30118`: 250 units arriving Day 2
  - `PO-30182`: 350 units arriving Day 6
- **Supplier**: Apex Motion Mechanics (Standard: 18 days, Expedite: 5 days, +$28/unit)
- **Manufacturing Plant**: Cell-Hydraulics Heavy Robotic Workcell (Capacity: 110 units/day, Surge Headroom: +30 units/day)

---

## 9. Full API Reference & Server Endpoints

All backend endpoints are hosted on the Express server:

| Method | Endpoint | Description | Request Body |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health, items count, history count | None |
| `GET` | `/api/config` | LLM providers status & active engine | None |
| `POST` | `/api/config/test` | Ping & latency benchmark for an AI engine | `{ provider: string, baseUrl?: string, model?: string, apiKey?: string }` |
| `POST` | `/api/config/provider` | Switch session preferred reasoning engine | `{ provider: 'gemini' \| 'ollama' \| 'custom_api' }` |
| `GET` | `/api/supply-chain/items` | List all supply chain items with full inventory specs | None |
| `GET` | `/api/supply-chain/items/:sku` | Get single item inventory details | None |
| `POST` | `/api/supply-chain/items` | Add or update a supply chain SKU | Full `SupplyItem` JSON object |
| `POST` | `/api/analyze-surge` | Execute the 3-agent LangGraph pipeline | `{ sku: string, surgeQuantity: number, targetFulfillmentDays: number, customerName?: string, customerPriority?: string, triggerReason?: string }` |
| `GET` | `/api/analysis-history` | List all historical analysis runs | None |
| `POST` | `/api/analysis/:id/human-decision` | Submit human governance decision & trigger ERP POs | `{ status: 'approved' \| 'modified' \| 'rejected', reviewedBy: string, approvedActionIds: string[], plannerNotes?: string, allocatedSurgeUnits?: number, deliveryCommitmentDays?: number }` |

---

## 10. Project Directory & File Structure

```
order-surge-impact-analysis/
├── .env.example                     # Environment template (Gemini, Ollama, OpenAI)
├── package.json                     # Scripts & dependencies (LangGraph, React, Express)
├── tsconfig.json                    # Strict TypeScript configuration
├── vite.config.ts                   # Vite client build configuration
├── server.ts                        # Unified Express API & Vite server entry point
├── metadata.json                    # Application identity & studio capabilities
│
├── server/                          # Backend Multi-Agent System
│   ├── agents/
│   │   ├── demand-agent.ts          # Agent 1: Run-rate velocity & delta analysis
│   │   ├── supply-agent.ts          # Agent 2: Stockout timeline & constraint simulation
│   │   ├── planner-agent.ts         # Agent 3: Action matrix & mitigation strategies
│   │   └── hitl-agent.ts            # Agent 4: Decision processing & mock ERP PO generation
│   ├── data/
│   │   └── inventory.ts             # Initial SKU dataset (inventory, POs, suppliers)
│   └── workflow/
│       ├── graph.ts                 # LangGraph StateGraph state machine definition
│       └── llm-client.ts            # Multi-provider LLM abstraction (Gemini, Ollama, OpenAI)
│
└── src/                             # Modern React 19 Frontend
    ├── main.tsx                     # React client DOM root
    ├── App.tsx                      # Main workspace orchestrator & state manager
    ├── types.ts                     # TypeScript shared interfaces & enums
    │
    ├── components/
    │   ├── layout/
    │   │   ├── Header.tsx           # Clean header with HITL badges & history toggle
    │   │   └── HistoryDrawer.tsx    # Slide-over past runs drawer with report export
    │   ├── forms/
    │   │   ├── SkuSelector.tsx      # Target SKU visual cards with portal hover specs
    │   │   └── SurgeInputForm.tsx   # Surge simulation inputs & preset triggers
    │   ├── agents/
    │   │   ├── PipelineSteps.tsx    # 4-stage sequential progress tracker
    │   │   ├── DemandAgentView.tsx  # Demand charts & KPI tooltips
    │   │   ├── SupplyAgentView.tsx  # Inventory depletion curve & PO schedules
    │   │   ├── PlannerAgentView.tsx # Strategy recommendations & cost matrix
    │   │   └── HumanInTheLoopCard.tsx # Operational governance checklist & dispatch
    │   └── ui/
    │       ├── Button.tsx           # Accessible button component
    │       ├── Card.tsx             # Card container
    │       ├── Badge.tsx            # Status & priority badges
    │       └── Tooltip.tsx          # Portal-rendered viewport-clamped tooltip
    └── index.css                    # Tailwind CSS imports
```

---

## 11. Troubleshooting & Frequently Asked Questions

### Q1: "Port 3000 is already in use"
If port 3000 is occupied by another process:
- **macOS / Linux**:
  ```bash
  lsof -ti:3000 | xargs kill -9
  ```
- **Windows (PowerShell)**:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
  ```

### Q2: "Cannot connect to Ollama"
1. Verify Ollama is running:
   ```bash
   curl http://localhost:11434/api/tags
   ```
2. If running Ollama on a different machine or inside Docker, set `OLLAMA_BASE_URL="http://<HOST_IP>:11434"` in your `.env`.
3. In Ollama, ensure CORS allows requests by launching with:
   ```bash
   OLLAMA_ORIGINS="*" ollama serve
   ```

### Q3: "Invalid Gemini API Key"
1. Check that `GEMINI_API_KEY` is pasted correctly in `.env` without surrounding quotes or whitespace.
2. Ensure you have active quota in Google AI Studio.

### Q4: "Checkboxes in the Human Review card won't toggle"
This has been resolved. In earlier versions, clicking the checkbox triggered event bubbling to the parent row, causing the state to toggle twice. The event propagation is stopped, keyboard navigation (`Space`/`Enter`) is supported, and **Select all** / **Clear all** batch buttons are available.

### Q5: How do I deploy this to production (e.g. Cloud Run, VPS, Docker)?
The app is configured for single-command production packaging:
```bash
npm run build
npm run start
```
The build script bundles the backend server into `dist/server.cjs` and the frontend into `dist/`, completely resolving ESM/CJS dependencies and serving the SPA statically while exposing the `/api/*` endpoints.

---

## License

MIT License — free for academic, personal, and commercial supply chain engineering.
