from enum import Enum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class AgentType(str, Enum):
    AGENT_01 = "agent_01"
    AGENT_02 = "agent_02"
    AGENT_03 = "agent_03"
    AGENT_04 = "agent_04"
    AGENT_05 = "agent_05"

class RiskBand(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    SEVERE = "SEVERE"

class ApprovalStatus(str, Enum):
    NOT_REQUIRED = "NOT_REQUIRED"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    MORE_INFO = "MORE_INFO"

class ConsequentialAction(BaseModel):
    action_type: str = Field(..., description="E.g., ADJUST_PO_DELIVERY_DATE, RELOCATE_STOCK, CREATE_STO_TRANSFER, CLOSE_PO, DEDUPLICATE_REQUIREMENTS")
    target_object_id: str = Field(..., description="ID of PO, Stock, Transfer, or Requirement")
    proposed_value: Any = Field(None, description="Proposed value or parameter changes")
    rationale: str = Field(..., description="Operational explanation")
    estimated_economic_impact: float = Field(0.0, description="Financial value or cost avoidance in local currency")
    requires_approval: bool = Field(True, description="Safety flag enforcing human-in-the-loop gate")

class AgentExecutionRequest(BaseModel):
    agent_id: str
    case_id: Optional[str] = None
    input_override: Optional[Dict[str, Any]] = None

class AgentExecutionResult(BaseModel):
    agent_id: str
    case_id: str
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    status: str = "COMPLETED"
    deterministic_metrics: Dict[str, Any] = Field(default_factory=dict)
    policy_evaluation: Dict[str, Any] = Field(default_factory=dict)
    reasoning_summary: str = ""
    recommendation: Optional[ConsequentialAction] = None
    confidence_score: float = 1.0
    approval_status: ApprovalStatus = ApprovalStatus.NOT_REQUIRED
    execution_output: Optional[Dict[str, Any]] = None
    verification_status: str = "PENDING"
    audit_events: List[Dict[str, Any]] = Field(default_factory=list)
    latency_ms: float = 0.0

class ApprovalDecisionRequest(BaseModel):
    approval_id: str
    decision: str = Field(..., description="APPROVED, REJECTED, or MORE_INFO")
    reviewer: str = Field("human_supervisor", description="User or role executing decision")
    notes: Optional[str] = None
