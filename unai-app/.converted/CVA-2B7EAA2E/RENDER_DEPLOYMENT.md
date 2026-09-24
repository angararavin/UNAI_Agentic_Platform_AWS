# Production Deployment Guide: Deploying to Render Dashboard

This guide provides clear, tested, step-by-step instructions to deploy the **Autonomous RMA Multi-Agent Control Tower** directly onto the **Render** cloud platform ([render.com](https://render.com)) using either your **NVIDIA NIM API** or an **Ollama** server.

---

## Method 1: Deploying via Render Dashboard (Recommended)

### Step 1: Push Your Code to GitHub / GitLab
1. Initialize git and push your repository to your GitHub or GitLab account:
   ```bash
   git add .
   git commit -m "feat: configure autonomous RMA multi-agent platform for Render"
   git push origin main
   ```

---

### Step 2: Create a New Web Service on Render
1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click the **"New +"** button in the top navigation and select **"Web Service"**.
3. Choose **"Build and deploy from a Git repository"** and click **"Next"**.
4. Connect your GitHub/GitLab account and select your repository.

---

### Step 3: Configure Build & Runtime Settings
In the Web Service configuration page, fill in the following parameters:

| Field | Value | Notes |
| :--- | :--- | :--- |
| **Name** | `rma-control-tower` (or your preferred name) | Unique service slug on Render |
| **Region** | Choose the region closest to you (e.g. *Oregon (US West)* or *Frankfurt (EU)*) | Low-latency zone |
| **Branch** | `main` (or your deployment branch) | Production branch |
| **Root Directory** | *(Leave blank)* | Uses root of repo |
| **Runtime** | **Node** | Node.js 18+ or 20+ |
| **Build Command** | `npm install && npm run build` | Builds Vite client & bundles Node server to `dist/server.cjs` |
| **Start Command** | `npm run start` | Runs `node dist/server.cjs` |
| **Instance Type** | **Free** or **Starter** | Free tier is fully supported |

---

### Step 4: Configure Environment Variables

Scroll down to the **"Environment Variables"** section and click **"Add Environment Variable"** for each item below:

#### If using NVIDIA NIM API (Recommended for Cloud AI):
| Key | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables optimized production asset serving |
| `DEFAULT_AI_ENGINE` | `custom` | Directs the agents to use the OpenAI-compatible NVIDIA NIM endpoint |
| `CUSTOM_API_URL` | `https://integrate.api.nvidia.com/v1` | Official NVIDIA NIM API base URL |
| `CUSTOM_API_KEY` | `nvapi-your-secret-key` | Your NVIDIA API key from [build.nvidia.com](https://build.nvidia.com) |
| `CUSTOM_MODEL` | `meta/llama-3.1-70b-instruct` | Target model (e.g., `meta/llama-3.1-70b-instruct` or `meta/llama-3.3-70b-instruct`) |
| `AGENT_1_THRESHOLD` | `85` | Autonomous confidence threshold for Failure Disposition (0-100) |
| `AGENT_2_THRESHOLD` | `80` | Autonomous confidence threshold for Dwell Micro-SLO (0-100) |
| `AGENT_3_THRESHOLD` | `90` | Autonomous confidence threshold for RDD Urgency (0-100) |
| `AGENT_4_THRESHOLD` | `95` | Autonomous confidence threshold for Spare Reintegration (0-100) |

*Note: Render automatically sets the `PORT` environment variable. The server listens on `process.env.PORT` automatically.*

#### If using a Remote Ollama Server:
If you host Ollama on an external server or Cloud VM accessible via HTTPS:
| Key | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Production mode |
| `DEFAULT_AI_ENGINE` | `ollama` | Directs agents to your Ollama instance |
| `OLLAMA_HOST` | `https://ollama.yourdomain.com` | Accessible URL to your Ollama API endpoint |
| `OLLAMA_MODEL` | `llama3` | Pulled model name (e.g., `llama3`, `mistral`, `qwen2.5`) |

---

### Step 5: Configure Health Check Path
1. Under **"Advanced"**, find the **"Health Check Path"** field.
2. Enter:
   ```text
   /api/health
   ```
   *Render will ping `/api/health` before routing traffic, guaranteeing zero-downtime deploys.*

---

### Step 6: Deploy
1. Click **"Create Web Service"** at the bottom of the page.
2. Render will automatically pull the repo, run `npm install`, compile the Vite UI, bundle `server.ts` into `dist/server.cjs`, and launch the service.
3. Monitor the deployment in the **Logs** tab:
   ```text
   ==> Building service...
   ==> Running 'npm install && npm run build'
   ...
   vite v6.2.3 building for production...
   dist/index.html
   dist/assets/...
   dist/server.cjs (node CommonJS bundle)
   ==> Uploading build...
   ==> Starting service with 'npm run start'
   Server running on port 10000
   ==> Health check passed! Service is live at: https://rma-control-tower.onrender.com
   ```

---

## Method 2: 1-Click Deploy via Render Blueprint (`render.yaml`)

Because the repository includes a `render.yaml` specification file at the root:

1. Open your [Render Dashboard](https://dashboard.render.com).
2. Click **"New +"** -> **"Blueprint"**.
3. Connect your repository.
4. Render will read `render.yaml` and configure:
   - Web service name: `rma-control-tower`
   - Runtime: `node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`
   - Health Check: `/api/health`
5. It will prompt you only to fill in your secret `CUSTOM_API_KEY` (NVIDIA NIM key).
6. Click **"Apply"** to deploy immediately.

---

## Verifying Deployment

Once live at your `https://<your-subdomain>.onrender.com` URL:
1. Open the URL in your browser.
2. Verify the top header shows:
   - **Active Engine Badge**: Displays `NVIDIA NIM: meta/llama-3.1-70b-instruct` (or `Ollama`) with the `.env` indicator.
   - **4 Specialized Hardware Agents**: Agent 1 (Disposition), Agent 2 (Dwell Time), Agent 3 (Urgency), Agent 4 (Reintegration).
   - **Control Tower**: Unified multi-agent orchestration, fleet health gauges, and Human-in-the-Loop review queue.
3. Test an execution by clicking **"Run All 4 Agents"** on the Control Tower or running individual agents. All decisions execute against your live backend with autonomous threshold routing.

---

## Troubleshooting

- **502 Bad Gateway / Cold Start:**
  On Render Free tier, services spin down after 15 minutes of inactivity. The first request takes 30-40 seconds to spin back up. Upgrade to Starter instance type for persistent zero-sleep compute.
- **Health Check Failing:**
  Ensure the Health Check Path is set to `/api/health`. The server returns `{"status":"ok"}`.
- **NVIDIA NIM Authentication Error:**
  Verify your `CUSTOM_API_KEY` begins with `nvapi-...` and is generated from [build.nvidia.com](https://build.nvidia.com).
