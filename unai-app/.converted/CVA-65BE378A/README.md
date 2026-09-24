# UNAI: Autonomous Multi-Agent Supply Chain Decision Intelligence
## Enterprise Deployment Package

Welcome to the UNAI Supply Chain Control Tower deployment package.

### Quick Start Guide

#### 1. Prerequisites
- Python 3.10+ (Python 3.11, 3.12, or 3.13 recommended)
- Modern web browser (Chrome, Edge, Firefox, or Safari)

#### 2. Install Dependencies
Open your terminal in this directory and install the required Python packages:
```bash
pip install -r requirements.txt
```

#### 3. Configure Environment Variables (Optional)
Copy `.env.example` to `.env`:
```bash
# On Windows:
copy .env.example .env

# On macOS/Linux:
cp .env.example .env
```
*Note: If API keys are left blank, the platform automatically utilizes its high-fidelity in-memory enterprise CSV ledger fallbacks (100,000+ records) with zero crashes.*

#### 4. Launch the Application Server
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
Then open your browser to:
- **Control Tower Dashboard**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Interactive OpenAPI / Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

#### 5. Run Automated Tests & Benchmarks
```bash
# Run all 23 integration & agent tests (100% passing)
python -m pytest tests/test_agents.py -v

# Run the performance & SLA benchmark suite (<1.6s end-to-end)
python poc_benchmark_suite.py
```

### Included Documentation
- `AGENT_ARCHITECTURE_AND_TECH_STACK.md`: Complete 28-agent hierarchy and technology stack.
- `POC_EXECUTIVE_WHITEPAPER.md`: C-Suite executive Proof-of-Concept whitepaper.
- `POC_BENCHMARK_AND_DEMO_RUNBOOK.md`: 5-minute executive demo walkthrough and golden scenarios.
- `KNOWLEDGE_TRANSFER_AND_ARCHITECTURE_EVOLUTION.md`: Architectural evolution and knowledge transfer guide.
- `USER_GUIDE.md`: Step-by-step user and operator guide.
