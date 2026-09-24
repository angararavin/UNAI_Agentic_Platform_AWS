# SAP Supply Chain Agentic AI Platform — Distribution Package

This directory contains the production-ready distribution package for the **SAP Supply Chain Agentic AI Platform**.

## 1. Package Contents Overview
- `Agent 1/` to `Agent 5/`: Standalone agent micro-packages (each with `agent.py`, `tools.py`, `run_agent.py`, and synthetic CSV data).
- `src/`: Central platform enterprise engine (Core, Data Hub, Math Tools, Agents, HITL Workflow, REST API, Streamlit UI).
- `docs/`: Complete enterprise documentation suite (Architecture, Deployment, SDLC, User Manual, Admin Guide, SLA Reporting, Knowledge Transfer).
- `tests/`: Pytest automated testing suite (100% passing).
- `HOW_TO_USE_SINGLE_AGENT.md`: Complete guide on file locations, CLI execution, Python imports, and REST API calls for each individual agent.
- `.env.sample` & `.env.example`: Sanitized configuration templates (No private keys or live credentials included).
- `requirements.txt`: Locked Python dependency manifest.
- `run.ps1`: One-click startup script for Windows Server.

## 2. Quick Setup & Launch
1. Create a Python 3.11+ virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .\.venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Initialize environment configuration:
   ```bash
   cp .env.sample .env
   ```
4. Verify all tests pass:
   ```bash
   pytest tests/ -v
   ```
5. Launch the Platform:
   - **FastAPI REST Backend (Port 8000)**:
     ```bash
     python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000
     ```
   - **Streamlit Command Center (Port 8501)**:
     ```bash
     streamlit run src/ui/app.py --server.port 8501
     ```

## 3. Running Any Single Agent
Refer to `HOW_TO_USE_SINGLE_AGENT.md` for full command references, input parameters, and REST API curl examples.
