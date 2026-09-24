# MULTI-PLATFORM DEPLOYMENT GUIDE
## Native Windows Server, Linux Systemd, PM2 & Enterprise Cloud (Zero Docker Required)

**Version:** 1.3.0  
**Status:** Enterprise Production Standard (Zero Docker Architecture)  

---

## 1. Local & Bare-Metal Setup (Windows, Linux, macOS)

### Prerequisites:
- Python 3.11+ (Python 3.13 tested and verified)
- Local Ollama or remote vLLM endpoint running on `http://localhost:11434` with models:
  ```bash
  ollama pull gemma4:latest
  ollama pull llama3.2:latest
  ```

### Step 1: Clone & Setup Virtual Environment
```bash
cd "C:\Users\ashwa\OneDrive\Desktop\VS Code\Bcone SAP Agents"
python -m venv .venv

# On Windows:
.\.venv\Scripts\activate

# On Linux / macOS:
source .venv/bin/activate
```

### Step 2: Install Pinned Dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Configure Environment
Copy `.env.example` to `.env` and verify ports and Ollama endpoints:
```bash
cp .env.example .env
```

### Step 4: Run Automated Verification Tests
```bash
pytest tests/ -v
```

### Step 5: Start Services Manually
In Terminal 1 (FastAPI REST Backend):
```bash
uvicorn src.api.main:app --host 0.0.0.0 --port 8000
```

In Terminal 2 (Streamlit Control Tower UI):
```bash
streamlit run src/ui/app.py --server.port 8501
```

Access the Control Tower at: **`http://localhost:8501`**  
Access the Swagger REST API at: **`http://localhost:8000/docs`**

---

## 2. Production Service Deployment (Zero Docker Architecture)

For enterprise organizations where **Docker is restricted or prohibited**, deploy directly as persistent native background services on Windows Server or Linux VMs.

### Option A: Windows Server Production Deployment (via NSSM / Windows Services)

1. **Download NSSM (Non-Sucking Service Manager):**
   Place `nssm.exe` in `C:\tools\nssm\` or system PATH.

2. **Install FastAPI Backend as Windows Service:**
   ```powershell
   nssm install BconeSAP_API "C:\Users\ashwa\OneDrive\Desktop\VS Code\Bcone SAP Agents\.venv\Scripts\uvicorn.exe" "src.api.main:app --host 0.0.0.0 --port 8000"
   nssm set BconeSAP_API AppDirectory "C:\Users\ashwa\OneDrive\Desktop\VS Code\Bcone SAP Agents"
   nssm set BconeSAP_API Start SERVICE_AUTO_START
   nssm start BconeSAP_API
   ```

3. **Install Streamlit Command Center as Windows Service:**
   ```powershell
   nssm install BconeSAP_UI "C:\Users\ashwa\OneDrive\Desktop\VS Code\Bcone SAP Agents\.venv\Scripts\streamlit.exe" "run src/ui/app.py --server.port 8501 --server.headless true"
   nssm set BconeSAP_UI AppDirectory "C:\Users\ashwa\OneDrive\Desktop\VS Code\Bcone SAP Agents"
   nssm set BconeSAP_UI Start SERVICE_AUTO_START
   nssm start BconeSAP_UI
   ```

Both services will now start automatically upon Windows boot, survive user logouts, and restart on any crash.

---

### Option B: Linux Production Deployment (via Systemd)

1. **Create FastAPI Service Unit (`/etc/systemd/system/bcone-api.service`):**
   ```ini
   [Unit]
   Description=Bcone SAP Agentic AI FastAPI Backend
   After=network.target

   [Service]
   Type=simple
   User=sap_agent
   WorkingDirectory=/opt/bcone-sap-agents
   ExecStart=/opt/bcone-sap-agents/.venv/bin/uvicorn src.api.main:app --host 0.0.0.0 --port 8000
   Restart=always
   RestartSec=5

   [Install]
   WantedBy=multi-user.target
   ```

2. **Create Streamlit Service Unit (`/etc/systemd/system/bcone-ui.service`):**
   ```ini
   [Unit]
   Description=Bcone SAP Control Tower UI
   After=bcone-api.service

   [Service]
   Type=simple
   User=sap_agent
   WorkingDirectory=/opt/bcone-sap-agents
   ExecStart=/opt/bcone-sap-agents/.venv/bin/streamlit run src/ui/app.py --server.port 8501 --server.headless true
   Restart=always
   RestartSec=5

   [Install]
   WantedBy=multi-user.target
   ```

3. **Enable & Start Services:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now bcone-api
   sudo systemctl enable --now bcone-ui
   ```

---

### Option C: Cross-Platform Process Management (via PM2)

If Node.js is installed on your server, PM2 provides zero-configuration, robust process supervision for Python:
```bash
pm2 start ".\.venv\Scripts\uvicorn.exe src.api.main:app --host 0.0.0.0 --port 8000" --name "sap-api"
pm2 start ".\.venv\Scripts\streamlit.exe run src/ui/app.py --server.port 8501 --server.headless true" --name "sap-ui"
pm2 save
pm2 startup
```

---

## 3. Enterprise Cloud Deployment (AWS / Azure / GCP / Kubernetes)

### Production Hardening Guidelines:
1. **Host Ollama / Model Serving**:
   - For enterprise scale, host `vLLM` or `Ollama` on a GPU-enabled node (e.g. AWS `g5.xlarge` or Azure `Standard_NV36adms_A10_v5`).
   - Point `OLLAMA_BASE_URL` in `.env` to the internal VPC cluster address.
2. **Reverse Proxy & TLS**:
   - Terminate SSL/TLS at an Application Load Balancer or Caddy/Nginx reverse proxy.
   - Forward traffic to port `8501` (Control Tower) and port `8000` (API).
3. **Data Volume Mounts**:
   - Mount synthetic data or SAP flat-file extracts as read-only volumes (`:ro`).
   - Mount `audit/logs` and `audit/reports` to persistent cloud block storage (EBS / Azure Managed Disks).
