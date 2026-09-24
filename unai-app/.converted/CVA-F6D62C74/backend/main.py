import unai_llm_capture  # noqa: F401 -- see unai_llm_capture.py
import shutil
from pathlib import Path
from fastapi import FastAPI, Query, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from typing import Optional
from pydantic import BaseModel

from backend.agents.manager_agent import SupplyChainManagerAgent
from backend.agents.qa_copilot_agent import SupplyChainQACopilotAgent
from backend.config import DATA_DIR

app = FastAPI(
    title="Autonomous Supply Chain Risk & Decision Intelligence Copilot",
    description="Multi-agent platform for real-time sensing, multi-tier BOM exposure, manufacturing capacity, inventory DOS, customer OTIF impact, Groq SME recommendations, and Q&A Copilot.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager_agent = SupplyChainManagerAgent()
copilot_agent = SupplyChainQACopilotAgent(manager_agent=manager_agent)

class ChatRequest(BaseModel):
    question: str
    supplier: Optional[str] = "Foxconn"
    origin: Optional[str] = "Yantian Port"
    destination: Optional[str] = "Port of Long Beach"
    transport_mode: Optional[str] = "Ocean Freight"


@app.get("/api/pipeline")
def run_pipeline(
    supplier: str = Query(None, description="Supplier / Company Name"),
    country: str = Query(None, description="Country / Region"),
    city: str = Query(None, description="City / Production Hub"),
    origin: str = Query(None, description="Origin Facility / Port"),
    destination: str = Query(None, description="Destination Hub / Plant"),
    transport_mode: str = Query(None, description="Logistics Mode (Ocean, Air, Road/Rail)"),
    query: str = Query(None, description="Search query or keyword"),
    use_live_api: bool = Query(False, description="Use live Tavily, Marketaux, and Groq APIs"),
    force_no_event: bool = Query(False, description="Simulate baseline healthy operations (no event)")
):
    return manager_agent.run_pipeline(
        supplier=supplier,
        country=country,
        city=city,
        origin=origin,
        destination=destination,
        transport_mode=transport_mode,
        query=query,
        use_live_api=use_live_api,
        force_no_event=force_no_event
    )

@app.get("/api/disruptions")
def get_disruptions(
    supplier: str = Query(None),
    country: str = Query(None),
    city: str = Query(None),
    origin: str = Query(None),
    destination: str = Query(None),
    transport_mode: str = Query(None),
    query: str = Query(None),
    use_live_api: bool = Query(False),
    force_no_event: bool = Query(False)
):
    return manager_agent.sensing_agent.detect_disruptions(
        supplier=supplier,
        country=country,
        city=city,
        origin=origin,
        destination=destination,
        transport_mode=transport_mode,
        query=query,
        use_live_api=use_live_api,
        force_no_event=force_no_event
    )

@app.get("/api/exposure")
def get_exposure(supplier: str = Query("Foxconn")):
    event = {"supplier": supplier, "id": "EXP-QUERY", "severity": "High"}
    return manager_agent.exposure_agent.analyze_exposure(event)

@app.get("/api/financial")
def get_financial_impact(
    supplier: str = Query("Kyoto Electronics"),
    country: str = Query("Japan"),
    city: str = Query("Fukushima"),
    origin: str = Query(None),
    destination: str = Query(None),
    transport_mode: str = Query(None),
    severity: str = Query("High"),
    use_live_api: bool = Query(False)
):
    return manager_agent.financial_agent.calculate_impact(
        supplier_name=supplier,
        country=country,
        city=city,
        origin=origin,
        destination=destination,
        transport_mode=transport_mode,
        severity=severity,
        use_live_api=use_live_api
    )

@app.get("/api/suppliers/suggest")
def suggest_suppliers(q: str = Query("", description="Search query or partial supplier name"), limit: int = Query(10, description="Max results")):
    """
    Returns fuzzy matching and ranked supplier suggestions from suppliers.csv.
    """
    return manager_agent.exposure_agent.suggest_suppliers(query=q, limit=limit)

@app.get("/api/topology")
def get_topology_graph(
    origin: str = Query(None, description="Origin facility or port"),
    destination: str = Query(None, description="Destination hub or customer plant"),
    supplier: str = Query(None, description="Supplier name"),
    event_type: str = Query("Disruption Zone", description="Active disruption event type"),
    severity: str = Query("High", description="Severity level"),
    radius_km: float = Query(400.0, description="Epicenter impact radius in km")
):
    """
    Generates supply chain network topology nodes and links showing affected vs safe suppliers and receiver plants.
    """
    risk_event = {
        "event_type": event_type,
        "severity": severity,
        "supplier": supplier,
        "origin": origin,
        "destination": destination
    }
    return manager_agent.exposure_agent.generate_network_topology(
        origin=origin,
        destination=destination,
        supplier=supplier,
        risk_event=risk_event,
        radius_km=radius_km
    )

# Q&A Copilot Endpoints (Token-Efficient Multi-Tier Orchestration)
@app.post("/api/chat")
def chat_copilot(req: ChatRequest):
    return copilot_agent.answer_question(
        question=req.question,
        current_supplier=req.supplier or "Foxconn",
        current_origin=req.origin or "Yantian Port",
        current_dest=req.destination or "Port of Long Beach",
        current_mode=req.transport_mode or "Ocean Freight"
    )

@app.get("/api/chat")
def chat_copilot_get(
    q: str = Query(..., description="User question for supply chain copilot"),
    supplier: str = Query("Foxconn"),
    origin: str = Query("Yantian Port"),
    destination: str = Query("Port of Long Beach"),
    transport_mode: str = Query("Ocean Freight")
):
    return copilot_agent.answer_question(
        question=q,
        current_supplier=supplier,
        current_origin=origin,
        current_dest=destination,
        current_mode=transport_mode
    )

# -------------------------------------------------------------
# Enterprise CSV Ledger Upload Endpoints
# -------------------------------------------------------------

@app.post("/api/upload/risk-events")
async def upload_risk_events(file: UploadFile = File(...)):
    return await _save_csv(file, "risk_events.csv")

@app.post("/api/upload/supplier-financials")
async def upload_supplier_financials(file: UploadFile = File(...)):
    return await _save_csv(file, "supplier_financials.csv")

@app.post("/api/upload/revenue-impact")
async def upload_revenue_impact(file: UploadFile = File(...)):
    return await _save_csv(file, "revenue_impact.csv")

@app.post("/api/upload/suppliers")
async def upload_suppliers(file: UploadFile = File(...)):
    return await _save_csv(file, "suppliers.csv")

@app.post("/api/upload/bom")
async def upload_bom(file: UploadFile = File(...)):
    return await _save_csv(file, "bom.csv")

@app.post("/api/upload/plant-capacity")
async def upload_plant_capacity(file: UploadFile = File(...)):
    return await _save_csv(file, "plant_capacity.csv")

@app.post("/api/upload/inventory")
async def upload_inventory(file: UploadFile = File(...)):
    return await _save_csv(file, "inventory.csv")

@app.post("/api/upload/customer-orders")
async def upload_customer_orders(file: UploadFile = File(...)):
    return await _save_csv(file, "customer_orders.csv")

async def _save_csv(file: UploadFile, target_filename: str):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
    target_path = DATA_DIR / target_filename
    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"message": f"{target_filename} uploaded successfully", "filename": file.filename}

# Serve Frontend
frontend_dir = Path(__file__).resolve().parent.parent / "frontend"
if frontend_dir.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")

    @app.get("/")
    def read_root():
        return FileResponse(
            frontend_dir / "index.html",
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
