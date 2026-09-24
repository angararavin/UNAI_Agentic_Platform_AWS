import pytest
from src.workflow.approval_manager import approval_manager
from src.workflow.simulation_executor import simulation_executor
from src.audit.performance_reporter import performance_reporter
from src.advisory.tech_radar import tech_radar
from src.api.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_approval_manager():
    ticket = approval_manager.create_approval_request(
        agent_id="agent_01",
        case_id="CASE_TEST",
        action_type="TEST_ACTION",
        target_object_id="OBJ_123",
        proposed_value={"key": "val"},
        rationale="Test rationale",
        estimated_impact=5000.0
    )
    app_id = ticket["approval_id"]
    assert ticket["status"] == "PENDING"

    updated = approval_manager.record_decision(app_id, "APPROVED", reviewer="TestLead")
    assert updated["status"] == "APPROVED"
    assert updated["reviewer"] == "TestLead"

def test_simulation_executor():
    res = simulation_executor.execute_action(
        action_type="SIMULATED_PO_CHANGE",
        target_object_id="PO_TEST",
        parameters={"delivery_date": "2026-10-01"}
    )
    assert res["status"] == "SUCCESS"
    assert "SIMULATED" in res["mode"]
    assert simulation_executor.get_simulated_state("PO_TEST")["modified"] is True

def test_performance_reporter_and_tech_radar():
    performance_reporter.record_run_telemetry(
        agent_id="agent_01",
        case_id="CASE01",
        latency_ms=120.0,
        approval_status="APPROVED",
        economic_impact=10000.0,
        ground_truth_matched=True
    )
    digest = performance_reporter.generate_digest()
    assert digest["total_executions"] >= 1
    assert digest["overall_accuracy_pct"] == 100.0

    radar = tech_radar.get_radar_overview()
    assert "radar_data" in radar
    assert len(radar["radar_data"]["models"]) > 0

def test_api_endpoints():
    r_health = client.get("/health")
    assert r_health.status_code == 200
    assert r_health.json()["status"] == "HEALTHY"

    r_agents = client.get("/api/v1/agents")
    assert r_agents.status_code == 200
    assert len(r_agents.json()["agents"]) == 5

    r_cases = client.get("/api/v1/agents/agent_01/cases")
    assert r_cases.status_code == 200

    r_radar = client.get("/api/v1/advisory/tech-radar")
    assert r_radar.status_code == 200
