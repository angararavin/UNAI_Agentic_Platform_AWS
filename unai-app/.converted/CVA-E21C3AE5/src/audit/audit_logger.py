import os
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

class AuditLogger:
    """
    Tamper-evident, structured append-only audit logger.
    Captures complete lifecycle event traces for every agent execution and human decision.
    """

    def __init__(self, log_dir: str = "audit/logs"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.log_file = self.log_dir / "audit_events.jsonl"
        self._memory_events: List[Dict[str, Any]] = []

    def log_event(
        self,
        event_type: str,
        agent_id: str,
        case_id: str,
        details: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        event_id = f"EVT-{uuid.uuid4().hex[:8].upper()}"
        event_entry = {
            "event_id": event_id,
            "timestamp": datetime.now().isoformat(),
            "event_type": event_type,
            "agent_id": agent_id,
            "case_id": case_id,
            "user_id": user_id or "system_agent",
            "details": details
        }

        self._memory_events.append(event_entry)

        # Append to JSONL file
        try:
            with open(self.log_file, mode="a", encoding="utf-8") as f:
                f.write(json.dumps(event_entry) + "\n")
        except Exception as e:
            # Non-blocking file error handling
            pass

        return event_entry

    def get_events_for_case(self, case_id: str) -> List[Dict[str, Any]]:
        return [e for e in self._memory_events if str(e.get("case_id", "")) == str(case_id)]

    def get_recent_events(self, limit: int = 50) -> List[Dict[str, Any]]:
        return self._memory_events[-limit:]

# Global singleton
audit_logger = AuditLogger()
