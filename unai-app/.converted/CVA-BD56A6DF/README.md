# NVIDIA AI Supply Chain Solution & Multi-Agent Control Tower

An enterprise-grade multi-agent supply chain orchestration, diagnostics, and planning application. Built for high-volume enterprise hardware operations, this application integrates live customer RMA return diagnostics, multi-node demand forecasting (S&OP, Sensing, and NPI launch ramps), and intelligent supply chain control tower reasoning powered directly by the **NVIDIA NIM API** (e.g., `meta/llama-3.3-70b-instruct`).

---

## 🚀 Architectural Overview

The control tower coordinates specialized autonomous agent modules:

1. **RMA & Forecasts Multi-Agent Orchestration Suite**: Integrates live customer return claims and multi-agent demand forecasting into a unified executive control view.
2. **RMA Triage Agent**: Evaluates hardware defect signatures, computes standard 36-month enterprise warranties, and determines optimal routing pathways (Self-Troubleshoot, Factory Refurbish, or Direct Replacement).
3. **Dynamic Demand Sensing Agent**: Ingests real-time signals and order anomalies to compute 13-week reactive reforecast curves and detect demand spikes.
4. **Demand Forecast Agent (S&OP)**: Handles 26-week baseline consensus sales plans, multi-model AI forecasting, and regional overrides.
5. **NPI Forecasting & Launch Agent**: Executes champion-challenger neural network models (LSTM vs ARIMA vs XGBoost) for next-generation hardware introductions (e.g., Blackwell B200 / Rubin architectures).
6. **Refurbish & Repair Agent**: Performs reverse-logistics cost-benefit analysis and schedules factory labor queues for returned GPU boards.

---

## 🔑 Environment Configuration (`.env`)

The application uses environment variables to authenticate with the **NVIDIA NIM API** and configure runtime settings.

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

### Environment Variables

```env
# NVIDIA API Configuration
# Required to connect to NVIDIA NIM endpoints.
# Get your key from: https://build.nvidia.com/explore/discover
NVIDIA_API_KEY="nvapi-YOUR_NVIDIA_NIM_API_KEY_HERE"

# Default model used for multi-agent reasoning
NVIDIA_MODEL="meta/llama-3.3-70b-instruct"

# NVIDIA NIM API Endpoint Base URL
NVIDIA_BASE_URL="https://integrate.api.nvidia.com/v1"

# Application runtime settings
PORT=3000
NODE_ENV="production"
```

---

## 🌐 Deploying to Render via GitHub (Step-by-Step)

### Option A: Web Service Deployment (Node Native)

1. **Push Code to GitHub Repository**:
   Ensure all repository files (including `package.json`, `server.ts`, `.env.example`) are committed and pushed to your GitHub repository.

2. **Create New Web Service on Render**:
   - Log into [Render Dashboard](https://dashboard.render.com).
   - Click **New +** and select **Web Service**.
   - Select your connected **GitHub repository**.

3. **Configure Settings**:
   - **Name**: `nvidia-supply-chain`
   - **Language**: `Node`
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

4. **Environment Variables**:
   In the **Environment Variables** section, add:
   - `NVIDIA_API_KEY` = `nvapi-YOUR_ACTUAL_KEY`
   - `NVIDIA_MODEL` = `meta/llama-3.3-70b-instruct`
   - `NODE_ENV` = `production`
   - `PORT` = `3000`

5. **Deploy Service**:
   Click **Create Web Service**. Render will run `npm run build` and launch `node dist/server.cjs` automatically.

---

### Option B: Docker Deployment on Render

Render will automatically detect the root `Dockerfile` if you choose Docker runtime:

1. Click **New +** -> **Web Service** on Render.
2. Choose your **GitHub repository**.
3. Select **Docker** as the Runtime environment.
4. Add your Environment Variables (`NVIDIA_API_KEY`, etc.).
5. Click **Create Web Service**.

---

## 🛠️ Local Development & Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Launch Dev Server
```bash
npm run dev
```
Access at: `http://localhost:3000`

---

## 📦 Production Build locally

```bash
npm run build
npm start
```

---

## 🧩 Tech Stack

- **Frontend**: React 19, Vite 6, Tailwind CSS, Motion Animations, Lucide Icons, Recharts.
- **Backend**: Express.js, TypeScript (`tsx` in dev, `esbuild` for production bundling).
- **AI Integration**: Official SDK configured with custom endpoint targeting **NVIDIA NIM API** (`https://integrate.api.nvidia.com/v1`).
