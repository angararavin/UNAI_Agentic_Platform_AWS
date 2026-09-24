# RMA Agentic Control Tower — Backend Architecture & Service Guide

Welcome to the **RMA Agentic Control Tower** backend service. This service orchestrates an intelligent multi-agent hardware return-merchandise authorization (RMA) lifecycle pipeline, tracking components across diagnostics, vendor rework, dwell-time thresholds, logistics prioritization, and inventory reintegration.

---

## Architecture Overview

The backend is built as a production-ready Express service with full TypeScript support, hosting both the REST API and serving the client application bundle.

```
+-----------------------------------------------------------------------------------+
|                           RMA AGENTIC CONTROL TOWER                               |
+-----------------------------------------------------------------------------------+
|  [Agent 1: Disposition]  [Agent 2: Dwell Time]  [Agent 3: Urgency]  [Agent 4: Reintegration]
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                       PLUGGABLE MULTI-ENGINE AI GATEWAY                            |
+--------------------------+-----------------------+--------------------------------+
|  Custom REST / OpenAI API|  Local Ollama Engine  |  Managed Cloud AI API          |
|  (vLLM, LM Studio, etc.) |  (Offline / On-Prem)  |  (High Throughput Cloud LLM)   |
+--------------------------+-----------------------+--------------------------------+
                                         │ Fallback
                                         ▼
+-----------------------------------------------------------------------------------+
|                             RULE HEURISTIC ENGINE                                 |
|                       (Zero-Dependency Deterministic)                             |
+-----------------------------------------------------------------------------------+
```

### The 4 Autonomous Agents

1. **Agent 1: Failure-Based Disposition Agent** (`/server/agents/agent1Disposition.ts`)
   - Analyzes hardware part numbers (MPN), diagnostic logs (e.g., DCHA logs), and error signatures (e.g., memory parity, thermal runaway, PCIe training errors).
   - Generates deterministic disposition classifications: `REWORK_INTERNAL`, `VENDOR_RMA_RETURN`, or `SCRAP_RECYCLE`.
   - Computes confidence scores and flags records for human review when below threshold.

2. **Agent 2: Dwell Time Monitoring & Escalation Agent** (`/server/agents/agent2DwellTime.ts`)
   - Continuously monitors stage hours against micro-SLOs (e.g., Burn-in Chamber, Diagnostic Bench, Vendor Transit).
   - Detects bottlenecks, calculates escalation tiers (`NORMAL`, `WATCHLIST`, `WARNING`, `CRITICAL`), and issues automated routing recommendations.

3. **Agent 3: Dynamic Urgency Flagging Agent** (`/server/agents/agent3Urgency.ts`)
   - Synthesizes live buffer inventories, data center criticality, line-down risk, and carrier availability (e.g., Next Flight Out).
   - Assigns priority tiers (`CRITICAL`, `EXPEDITE`, `STANDARD`, `DEFERRED`) with structured multi-factor reasoning.

4. **Agent 4: Return Receipt & Spare-Pool Reintegration Agent** (`/server/agents/agent4SparePool.ts`)
   - Verifies optical serial barcodes, QA certification checklists, and warranty entitlement against RMA manifests.
   - Executes automated inventory reintegration into active cluster spare pools, or routes discrepancies to audit quarantine.

---

## AI Execution Engines

The backend supports 4 flexible execution engines switchable on the fly:

| Engine | Description | Configuration |
| :--- | :--- | :--- |
| **`custom`** | Any custom REST or OpenAI-compatible endpoint (vLLM, Ollama OpenAI layer, LM Studio, LiteLLM, FastChat) | `CUSTOM_API_URL`, `CUSTOM_API_KEY`, `CUSTOM_MODEL` |
| **`ollama`** | Local or self-hosted Ollama server running offline models (e.g., Llama 3, Mistral, Qwen) | `OLLAMA_HOST`, `OLLAMA_MODEL` |
| **`api`** | Managed Cloud AI endpoint for high-speed server-side reasoning | `AI_API_KEY` / `LLM_API_KEY`, `AI_MODEL` |
| **`heuristic`** | Deterministic domain rule engine (runs with zero network latency & zero tokens) | Out of the box, no configuration required |

---

## Installation & Local Development Guide

### Prerequisites
- **Node.js**: Version 18.x, 20.x, or higher
- **npm**: Version 9.x or higher
- *(Optional)* **Ollama**: If running local open-weights models (`curl -fsSL https://ollama.com/install.sh | sh`)

### Step 1: Clone and Install Dependencies
```bash
git clone <your-repository-url>
cd rma-agentic-control-tower
npm install
```

### Step 2: Configure Environment Variables
Copy the environment template:
```bash
cp .env.example .env
```

Edit `.env` according to your preferred engine:

#### Option A: Using a Custom REST API / OpenAI-Compatible Endpoint
```env
DEFAULT_AI_ENGINE="custom"
CUSTOM_API_URL="https://api.openai.com/v1" # or http://localhost:8000/v1
CUSTOM_API_KEY="your-api-key"
CUSTOM_MODEL="gpt-4o-mini"
```

#### Option B: Using Local Ollama
```bash
# Start Ollama service
ollama serve

# Pull your preferred model
ollama pull llama3
```
In `.env`:
```env
DEFAULT_AI_ENGINE="ollama"
OLLAMA_HOST="http://localhost:11434"
OLLAMA_MODEL="llama3"
```

#### Option C: Using Managed Cloud API
```env
DEFAULT_AI_ENGINE="api"
AI_API_KEY="your-cloud-api-key"
AI_MODEL="gemini-2.5-flash"
```

#### Option D: Zero-Configuration Heuristic Mode
```env
DEFAULT_AI_ENGINE="heuristic"
```

### Step 3: Run the Development Server
```bash
npm run dev
```
The unified full-stack server starts at `http://localhost:3000`.

### Step 4: Build for Production
```bash
npm run build
npm run start
```
This builds the client assets into `dist/` and bundles the backend server into `dist/server.cjs` via `esbuild`.

---

## API Endpoints Reference

### System & Settings
- `GET /api/health` — Health check status and timestamp
- `GET /api/settings` — Current active engine, model names, and connection status
- `POST /api/settings` — Update active engine (`custom`, `ollama`, `api`, `heuristic`), URLs, and keys
- `POST /api/settings/test-connection` — Test connectivity to Ollama, Custom API, or Cloud AI
- `POST /api/settings/thresholds` — Update confidence thresholds for agents

### Agent Execution
- `POST /api/agent/1/run` — Execute Failure-Based Disposition Agent
- `POST /api/agent/2/run` — Execute Dwell Time Monitoring & Escalation Agent
- `POST /api/agent/3/run` — Execute Urgency Flagging Agent
- `POST /api/agent/4/run` — Execute Return Receipt & Spare-Pool Reintegration Agent
- `POST /api/fleet/kickoff` — Orchestrate simultaneous batch execution across all 4 agents

### Records & Audit Ledger
- `GET /api/records` — Fetch all execution records (supports `?agentId=`, `?status=`, `?search=`)
- `POST /api/records/manual` — Submit manual audit record
- `POST /api/records/:id/review` — Human review action (`approved`, `rejected`, `overridden`)
- `GET /api/analytics` — Fleet KPIs, auto-approval rates, latency metrics, and savings
