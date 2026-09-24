from typing import Optional
from src.data.datasource import BaseDataSource
from src.data.flat_file_source import FlatFileDataSource
from src.data.manager import data_source_manager
from src.agents.agent_01_drift import PODriftAgentWorkflow
from src.agents.agent_02_phantom import PhantomInventoryAgentWorkflow
from src.agents.agent_03_twin_location import TwinLocationAgentWorkflow
from src.agents.agent_04_po_aging import POAgingAgentWorkflow
from src.agents.agent_05_contradiction import RequirementContradictionAgentWorkflow

# Shared default data source for backward compatibility
default_data_source = FlatFileDataSource()

_AGENT_CLASSES = {
    "agent_01": PODriftAgentWorkflow,
    "agent_02": PhantomInventoryAgentWorkflow,
    "agent_03": TwinLocationAgentWorkflow,
    "agent_04": POAgingAgentWorkflow,
    "agent_05": RequirementContradictionAgentWorkflow,
}

_AGENT_REGISTRY = {
    "agent_01": PODriftAgentWorkflow(default_data_source),
    "agent_02": PhantomInventoryAgentWorkflow(default_data_source),
    "agent_03": TwinLocationAgentWorkflow(default_data_source),
    "agent_04": POAgingAgentWorkflow(default_data_source),
    "agent_05": RequirementContradictionAgentWorkflow(default_data_source),
}

def _resolve_canonical_id(agent_id: str) -> str:
    norm = str(agent_id).lower().strip()
    if norm in ("1", "agent_1", "agent 1", "sc-a01-ppo-001", "drift"):
        return "agent_01"
    elif norm in ("2", "agent_2", "agent 2", "sc-a02-phi-001", "phantom"):
        return "agent_02"
    elif norm in ("3", "agent_3", "agent 3", "agent3", "sc-a03-mtl-001", "twin"):
        return "agent_03"
    elif norm in ("4", "agent_4", "agent 4", "sc-a04-poa-001", "aging"):
        return "agent_04"
    elif norm in ("5", "agent_5", "agent 5", "sc-a05-rca-001", "contradiction"):
        return "agent_05"
    elif norm in _AGENT_CLASSES:
        return norm
    else:
        raise ValueError(f"Agent '{agent_id}' not found in registry. Supported: {list(_AGENT_CLASSES.keys())}")

def get_agent(agent_id: str, data_source: Optional[BaseDataSource] = None):
    """
    Returns an initialized LangGraph workflow instance for the given agent ID.
    Dynamically binds to the active data source (Synthetic, Custom Flat File, or Database)
    unless an explicit data source is supplied.
    """
    canonical_id = _resolve_canonical_id(agent_id)
    active_ds = data_source if data_source is not None else data_source_manager.get_active_source()
    workflow_cls = _AGENT_CLASSES[canonical_id]
    return workflow_cls(active_ds)
