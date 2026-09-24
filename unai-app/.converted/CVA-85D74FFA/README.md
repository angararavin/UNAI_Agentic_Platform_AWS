# Google's Agentic Control Tower

A production-grade, multi-agent orchestration platform designed for enterprise hardware Return Merchandise Authorization (RMA) lifecycle operations, featuring Google Material & Google Sans styling, light & dark themes, and multi-engine support (NVIDIA NIM API, local Ollama, Cloud AI, and deterministic rules). The platform monitors high-density hardware trays through failure triage, dwell time SLA enforcement, multi-factor urgency escalation, and spare-pool inventory reintegration.

---

## Key Features

- **4 Autonomous Specialized Agents**:
  - **Agent 1: Failure Disposition**: Diagnostic log triage (DCHA/ECC/PCIe) to determine Scrap vs. Internal Rework vs. Vendor Return.
  - **Agent 2: Dwell Time Monitoring**: Real-time micro-SLO tracking and bottleneck escalation across repair stages.
  - **Agent 3: Dynamic Urgency Flagging**: Multi-factor synthesis of datacenter spare inventory, line-down impact, and carrier availability.
  - **Agent 4: Spare-Pool Reintegration**: Optical barcode serial verification and automated inventory restocking with audit quarantine.
- **Human-in-the-Loop Threshold Governance**: Automated routing above confidence thresholds with mandatory human review workflows for edge cases.
- **Provider-Agnostic Multi-Engine Flexibility**:
  - **Custom REST / OpenAI-Compatible Endpoint** (vLLM, Ollama OpenAI proxy, LM Studio, LiteLLM, FastChat)
  - **Local Ollama** (offline, private on-premise open-weights models)
  - **Managed Cloud AI API** (high-throughput cloud reasoning)
  - **Rule Heuristic Engine** (zero-token, deterministic fallback)
- **Comprehensive Audit Ledger**: Full traceability of all agent decisions, confidence scores, token telemetry, and human review actions.

---

## Quick Start & Local Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/rma-agentic-control-tower.git
cd rma-agentic-control-tower
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your preferred engine in `.env` (choose any of the modes below):

#### Mode A: NVIDIA NIM API (High-Performance Enterprise Microservices)
```env
DEFAULT_AI_ENGINE="custom"
CUSTOM_API_URL="https://integrate.api.nvidia.com/v1"
CUSTOM_API_KEY="nvapi-your-nvidia-nim-key"
CUSTOM_MODEL="meta/llama-3.1-70b-instruct" # or nvidia/nemotron-4-340b-instruct
```

#### Mode B: Local Ollama (100% Offline & Private On-Premise)
```bash
# 1. Start Ollama
ollama serve

# 2. Pull model
ollama pull llama3
```
In `.env`:
```env
DEFAULT_AI_ENGINE="ollama"
OLLAMA_HOST="http://localhost:11434"
OLLAMA_MODEL="llama3"
```

#### Mode C: Other OpenAI-Compatible or vLLM Endpoints
```env
DEFAULT_AI_ENGINE="custom"
CUSTOM_API_URL="http://localhost:8000/v1" # or custom endpoint
CUSTOM_API_KEY="" # optional if unauthenticated
CUSTOM_MODEL="your-model-name"
```

#### Mode C: Managed Cloud AI API
```env
DEFAULT_AI_ENGINE="api"
AI_API_KEY="your-api-key"
AI_MODEL="gemini-2.5-flash"
```

#### Mode D: Zero-Token Rule Heuristic Engine (Default Fallback)
```env
DEFAULT_AI_ENGINE="heuristic"
```

### 4. Start Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## Production Build & Run

To build and run the unified full-stack application for production:

```bash
# Build frontend assets into dist/ and bundle the Node.js server into dist/server.cjs
npm run build

# Start the production server
npm run start
```

---

## Provider-Agnostic Multi-Engine Configuration (.env)

All engine options and safety threshold rules are configured 100% via your `.env` file (or Render dashboard environment variables). No UI tabs or manual sliders required.

### 1. NVIDIA NIM API (Recommended Enterprise GPU Microservices)
To run with your official NVIDIA NIM API key (`nvapi-...` from [build.nvidia.com](https://build.nvidia.com)):
```env
DEFAULT_AI_ENGINE="custom"
CUSTOM_API_URL="https://integrate.api.nvidia.com/v1"
CUSTOM_API_KEY="nvapi-your-nvidia-nim-key"
CUSTOM_MODEL="meta/llama-3.1-70b-instruct"
```

### 2. Local or Remote Ollama (Self-Hosted / Private On-Premise)
To run with an Ollama instance:
```env
DEFAULT_AI_ENGINE="ollama"
OLLAMA_HOST="http://localhost:11434" # or https://ollama.yourdomain.com for cloud instances
OLLAMA_MODEL="llama3"
```

### 3. Human Approval Safety Thresholds (Configured via .env)
Configure the autonomous confidence score boundary (0-100) for each agent:
```env
AGENT_1_THRESHOLD=85  # Failure Disposition threshold
AGENT_2_THRESHOLD=80  # Dwell Micro-SLO threshold
AGENT_3_THRESHOLD=90  # Outage Urgency threshold
AGENT_4_THRESHOLD=95  # Spare-Pool Reintegration threshold
```

---

## Deploying on Render via GitHub

For a full step-by-step walk-through, see [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md).

### Step 1: Push Code to GitHub
```bash
git add .
git commit -m "feat: deploy autonomous RMA control tower"
git push origin main
```

### Step 2: Create a Web Service on Render
1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> **Web Service**.
3. Connect your repository.

### Step 3: Configure Build & Start Commands
Fill in the deployment settings:
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`
- **Health Check Path**: `/api/health`

### Step 4: Add Environment Variables in Render Dashboard
Add the following keys under the **Environment Variables** section:

#### For NVIDIA NIM API:
| Key | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production bundle serving |
| `DEFAULT_AI_ENGINE` | `custom` | Directs agents to NVIDIA NIM |
| `CUSTOM_API_URL` | `https://integrate.api.nvidia.com/v1` | Official NVIDIA NIM endpoint |
| `CUSTOM_API_KEY` | `nvapi-...` | Your NVIDIA API key |
| `CUSTOM_MODEL` | `meta/llama-3.1-70b-instruct` | Target model |
| `AGENT_1_THRESHOLD` | `85` | Agent 1 confidence threshold (0-100) |
| `AGENT_2_THRESHOLD` | `80` | Agent 2 confidence threshold (0-100) |
| `AGENT_3_THRESHOLD` | `90` | Agent 3 confidence threshold (0-100) |
| `AGENT_4_THRESHOLD` | `95` | Agent 4 confidence threshold (0-100) |

#### For Ollama on Remote VPS / Cloud VM:
| Key | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Production mode |
| `DEFAULT_AI_ENGINE` | `ollama` | Directs agents to Ollama |
| `OLLAMA_HOST` | `https://ollama.yourdomain.com` | Accessible Ollama endpoint |
| `OLLAMA_MODEL` | `llama3` | Target model |

### Step 5: Deploy & Monitor
Click **Create Web Service**. Render will compile the production bundle (`dist/index.html` + `dist/server.cjs`) and serve on port dynamically assigned by Render. Render monitors `/api/health` to ensure healthy zero-downtime routing.

*(Optional)* You can also use Render's **Blueprint** deployment by selecting **New + -> Blueprint** to deploy using the included `render.yaml` specification.

---

## Directory Structure

```
.
├── server.ts                     # Main Express server entry point & API routes
├── server/
│   ├── README.md                 # Detailed backend architecture guide
│   ├── agentEngine.ts            # Central agent orchestrator export
│   ├── recordsStore.ts           # Audit ledger, persistent in-memory store & metrics
│   └── agents/
│       ├── common.ts             # Pluggable AI gateway (Custom API, Ollama, Cloud AI)
│       ├── agent1Disposition.ts   # Agent 1: Failure Disposition triage
│       ├── agent2DwellTime.ts     # Agent 2: Dwell time & micro-SLO monitoring
│       ├── agent3Urgency.ts       # Agent 3: Dynamic multi-factor urgency escalation
│       └── agent4SparePool.ts     # Agent 4: Return receipt & inventory reintegration
├── src/
│   ├── App.tsx                   # Main React dashboard layout & tab router
│   ├── types.ts                  # Shared TypeScript interfaces & types
│   └── ui/                       # Dashboard views, agent detail panels & charts
├── .env.example                  # Environment configuration template
├── package.json                  # Dependencies and build scripts
└── vite.config.ts                # Vite build and plugin configuration
```

---

## License
MIT License
