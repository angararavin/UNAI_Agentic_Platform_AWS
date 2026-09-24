import os
from pathlib import Path
from typing import Dict, Optional, List

class PathResolver:
    """
    Normalizes paths across the 5 SAP supply chain agents, handling
    whitespace variations (e.g., 'Agent 3' vs 'Agent3') and data directory mappings.
    """

    AGENT_MAPPINGS: Dict[str, str] = {
        # Agent 01
        "1": "Agent 1/PO_Promise_Drift_Synthetic_Data",
        "agent_1": "Agent 1/PO_Promise_Drift_Synthetic_Data",
        "agent_01": "Agent 1/PO_Promise_Drift_Synthetic_Data",
        "agent 1": "Agent 1/PO_Promise_Drift_Synthetic_Data",
        "sc-a01-ppo-001": "Agent 1/PO_Promise_Drift_Synthetic_Data",
        "po_promise_drift": "Agent 1/PO_Promise_Drift_Synthetic_Data",
        "drift": "Agent 1/PO_Promise_Drift_Synthetic_Data",

        # Agent 02
        "2": "Agent 2/Phantom_Inventory_Agent_Synthetic_Data",
        "agent_2": "Agent 2/Phantom_Inventory_Agent_Synthetic_Data",
        "agent_02": "Agent 2/Phantom_Inventory_Agent_Synthetic_Data",
        "agent 2": "Agent 2/Phantom_Inventory_Agent_Synthetic_Data",
        "sc-a02-phi-001": "Agent 2/Phantom_Inventory_Agent_Synthetic_Data",
        "phantom_inventory": "Agent 2/Phantom_Inventory_Agent_Synthetic_Data",
        "phantom": "Agent 2/Phantom_Inventory_Agent_Synthetic_Data",

        # Agent 03
        "3": "Agent3/Material_Twin_Location_Agent_Synthetic_Data",
        "agent_3": "Agent3/Material_Twin_Location_Agent_Synthetic_Data",
        "agent_03": "Agent3/Material_Twin_Location_Agent_Synthetic_Data",
        "agent 3": "Agent3/Material_Twin_Location_Agent_Synthetic_Data",
        "agent3": "Agent3/Material_Twin_Location_Agent_Synthetic_Data",
        "sc-a03-mtl-001": "Agent3/Material_Twin_Location_Agent_Synthetic_Data",
        "material_twin_location": "Agent3/Material_Twin_Location_Agent_Synthetic_Data",
        "twin_location": "Agent3/Material_Twin_Location_Agent_Synthetic_Data",
        "twin": "Agent3/Material_Twin_Location_Agent_Synthetic_Data",

        # Agent 04
        "4": "Agent 4/PO_Aging_Intelligence_Agent_Synthetic_Data",
        "agent_4": "Agent 4/PO_Aging_Intelligence_Agent_Synthetic_Data",
        "agent_04": "Agent 4/PO_Aging_Intelligence_Agent_Synthetic_Data",
        "agent 4": "Agent 4/PO_Aging_Intelligence_Agent_Synthetic_Data",
        "sc-a04-poa-001": "Agent 4/PO_Aging_Intelligence_Agent_Synthetic_Data",
        "po_aging_intelligence": "Agent 4/PO_Aging_Intelligence_Agent_Synthetic_Data",
        "aging": "Agent 4/PO_Aging_Intelligence_Agent_Synthetic_Data",

        # Agent 05
        "5": "Agent 5/Requirement_Contradiction_Agent_Synthetic_Data",
        "agent_5": "Agent 5/Requirement_Contradiction_Agent_Synthetic_Data",
        "agent_05": "Agent 5/Requirement_Contradiction_Agent_Synthetic_Data",
        "agent 5": "Agent 5/Requirement_Contradiction_Agent_Synthetic_Data",
        "sc-a05-rca-001": "Agent 5/Requirement_Contradiction_Agent_Synthetic_Data",
        "requirement_contradiction": "Agent 5/Requirement_Contradiction_Agent_Synthetic_Data",
        "contradiction": "Agent 5/Requirement_Contradiction_Agent_Synthetic_Data",
    }

    AGENT_METADATA: Dict[str, Dict[str, str]] = {
        "agent_01": {
            "id": "SC-A01-PPO-001",
            "name": "PO Promise Drift Agent",
            "domain": "Procurement / MM-PUR",
            "description": "Predicts supplier delivery commitment drift, evaluates stockout disruption risk, and routes proactive interventions.",
        },
        "agent_02": {
            "id": "SC-A02-PHI-001",
            "name": "Phantom Inventory Agent",
            "domain": "Inventory / MM-IM / QM",
            "description": "Reconciles ERP physical inventory against usable operational stock across blocked, quality-held, reserved, and expired inventory.",
        },
        "agent_03": {
            "id": "SC-A03-MTL-001",
            "name": "Material Twin-Location Agent",
            "domain": "Network Supply / MM-IM / LE",
            "description": "Identifies cross-plant surplus and deficit pairs, evaluating transfer economics and safety stock preservation.",
        },
        "agent_04": {
            "id": "SC-A04-POA-001",
            "name": "PO Aging Intelligence Agent",
            "domain": "Procurement & Finance / MM-PUR / FI-AP",
            "description": "Diagnoses aged open PO root causes, validates underlying demand needs, and routes closure or reduction workflows.",
        },
        "agent_05": {
            "id": "SC-A05-RCA-001",
            "name": "Requirement Contradiction Agent",
            "domain": "Demand & Planning / PP-MRP / SD",
            "description": "Deduplicates, reconciles, and cleans conflicting requirements across sales, production, and forecast streams before MRP execution.",
        },
    }

    def __init__(self, base_dir: Optional[str] = None):
        if base_dir:
            self.base_path = Path(base_dir).resolve()
        else:
            # Defaults to workspace root (current directory or parent of src)
            self.base_path = Path(os.getcwd()).resolve()

    def get_agent_data_dir(self, agent_identifier: str) -> Path:
        normalized = str(agent_identifier).strip().lower()
        rel_path = self.AGENT_MAPPINGS.get(normalized)
        if not rel_path:
            raise ValueError(f"Unknown agent identifier: '{agent_identifier}'. Supported: {list(self.AGENT_METADATA.keys())}")
        full_path = self.base_path / rel_path
        if not full_path.exists():
            # Fallback if running from a subdirectory
            alt_path = self.base_path.parent / rel_path
            if alt_path.exists():
                return alt_path
        return full_path

    def get_csv_path(self, agent_identifier: str, csv_name: str) -> Path:
        data_dir = self.get_agent_data_dir(agent_identifier)
        if not csv_name.endswith(".csv"):
            csv_name = f"{csv_name}.csv"
        csv_path = data_dir / csv_name
        if not csv_path.exists():
            raise FileNotFoundError(f"CSV '{csv_name}' not found in '{data_dir}'")
        return csv_path

    def list_agent_csvs(self, agent_identifier: str) -> List[str]:
        data_dir = self.get_agent_data_dir(agent_identifier)
        if not data_dir.exists():
            return []
        return sorted([f.name for f in data_dir.glob("*.csv")])

    @classmethod
    def get_all_agent_keys(cls) -> List[str]:
        return list(cls.AGENT_METADATA.keys())

    @classmethod
    def get_metadata(cls, agent_key: str) -> Dict[str, str]:
        normalized = agent_key.lower().replace("-", "_")
        return cls.AGENT_METADATA.get(normalized, {
            "id": agent_key,
            "name": agent_key,
            "domain": "Supply Chain",
            "description": "SAP Agentic AI Worker"
        })
