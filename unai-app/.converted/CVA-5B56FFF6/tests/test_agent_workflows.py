import pytest
from src.agents import get_agent

def test_agent_01_workflow():
    agent = get_agent("agent_01")
    state = agent.run({"case_id": "450010000"})
    assert state["agent_id"] == "agent_01"
    assert "deterministic_metrics" in state
    assert "policy_evaluation" in state
    assert "reasoning_summary" in state
    assert state["latency_ms"] > 0

def test_agent_02_workflow():
    agent = get_agent("agent_02")
    state = agent.run({"case_id": "STK100000"})
    assert state["agent_id"] == "agent_02"
    assert "phantom_metrics" in state["deterministic_metrics"]
    assert state["latency_ms"] > 0

def test_agent_03_workflow():
    agent = get_agent("agent_03")
    state = agent.run({"case_id": "TR70000"})
    assert state["agent_id"] == "agent_03"
    assert "source_protection" in state["deterministic_metrics"]
    assert state["latency_ms"] > 0

def test_agent_04_workflow():
    agent = get_agent("agent_04")
    state = agent.run({"case_id": "CASE01"})
    assert state["agent_id"] == "agent_04"
    assert "aging_metrics" in state["deterministic_metrics"]
    assert state["latency_ms"] > 0

def test_agent_05_workflow():
    agent = get_agent("agent_05")
    state = agent.run({"case_id": "CASE01"})
    assert state["agent_id"] == "agent_05"
    assert "net_demand" in state["deterministic_metrics"]
    assert state["latency_ms"] > 0
