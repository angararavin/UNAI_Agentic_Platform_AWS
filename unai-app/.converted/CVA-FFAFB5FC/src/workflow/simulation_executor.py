import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from src.core.config import settings

class SimulationActionExecutor:
    """
    Simulates consequential SAP S/4HANA transactional mutations.
    Guards production systems with ENABLE_WRITE_ACTIONS=false default.
    Maintains a simulated state store and records execution diffs.
    """

    def __init__(self):
        self._simulated_state: Dict[str, Dict[str, Any]] = {}
        self._execution_history: list = []

    def execute_action(
        self,
        action_type: str,
        target_object_id: str,
        parameters: Dict[str, Any],
        approval_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes an action against the simulation state store.
        If ENABLE_WRITE_ACTIONS is True, this is where live BAPI/OData clients would be triggered.
        """
        execution_id = f"EXEC-{uuid.uuid4().hex[:8].upper()}"
        timestamp = datetime.now().isoformat()

        # Capture before state
        before_state = self._simulated_state.get(target_object_id, {
            "object_id": target_object_id,
            "status": "ORIGINAL",
            "modified": False
        })

        # Apply simulated update
        after_state = dict(before_state)
        after_state["last_action"] = action_type
        after_state["last_updated"] = timestamp
        after_state["modified"] = True
        after_state["approval_reference"] = approval_id
        after_state.update(parameters)

        self._simulated_state[target_object_id] = after_state

        result = {
            "execution_id": execution_id,
            "timestamp": timestamp,
            "action_type": action_type,
            "target_object_id": target_object_id,
            "mode": "LIVE_WRITE" if settings.ENABLE_WRITE_ACTIONS else "SIMULATED_SAFE",
            "status": "SUCCESS",
            "before_state": before_state,
            "after_state": after_state,
            "sap_simulation_message": f"Successfully simulated '{action_type}' on object '{target_object_id}'. System state reconciled."
        }

        self._execution_history.append(result)
        return result

    def get_simulated_state(self, target_object_id: str) -> Optional[Dict[str, Any]]:
        return self._simulated_state.get(target_object_id)

    def list_executions(self) -> list:
        return list(self._execution_history)

# Global singleton
simulation_executor = SimulationActionExecutor()
