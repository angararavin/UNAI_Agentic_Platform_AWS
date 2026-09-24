import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from src.core.models import ApprovalStatus

class ApprovalManager:
    """
    Central Human-in-the-Loop approval manager.
    Enforces that consequential actions pause in PENDING state until approved by a human planner.
    """

    def __init__(self):
        self._approvals: Dict[str, Dict[str, Any]] = {}

    def create_approval_request(
        self,
        agent_id: str,
        case_id: str,
        action_type: str,
        target_object_id: str,
        proposed_value: Any,
        rationale: str,
        estimated_impact: float = 0.0
    ) -> Dict[str, Any]:
        """
        Creates a new pending approval ticket.
        """
        approval_id = f"APP-{uuid.uuid4().hex[:8].upper()}"
        ticket = {
            "approval_id": approval_id,
            "agent_id": agent_id,
            "case_id": case_id,
            "action_type": action_type,
            "target_object_id": target_object_id,
            "proposed_value": proposed_value,
            "rationale": rationale,
            "estimated_impact": round(float(estimated_impact), 2),
            "status": ApprovalStatus.PENDING.value,
            "created_at": datetime.now().isoformat(),
            "reviewed_at": None,
            "reviewer": None,
            "notes": None
        }
        self._approvals[approval_id] = ticket
        return ticket

    def get_approval(self, approval_id: str) -> Optional[Dict[str, Any]]:
        return self._approvals.get(approval_id)

    def list_pending_approvals(self) -> List[Dict[str, Any]]:
        return [t for t in self._approvals.values() if t["status"] == ApprovalStatus.PENDING.value]

    def list_all_approvals(self) -> List[Dict[str, Any]]:
        return list(self._approvals.values())

    def record_decision(
        self,
        approval_id: str,
        decision: str,
        reviewer: str = "human_planner",
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        ticket = self.get_approval(approval_id)
        if not ticket:
            raise KeyError(f"Approval ticket '{approval_id}' not found.")

        valid_decisions = [ApprovalStatus.APPROVED.value, ApprovalStatus.REJECTED.value, ApprovalStatus.MORE_INFO.value]
        norm_decision = decision.upper()
        if norm_decision not in valid_decisions:
            raise ValueError(f"Invalid decision: '{decision}'. Valid options: {valid_decisions}")

        ticket["status"] = norm_decision
        ticket["reviewed_at"] = datetime.now().isoformat()
        ticket["reviewer"] = reviewer
        ticket["notes"] = notes or ""
        return ticket

# Global singleton instance
approval_manager = ApprovalManager()
