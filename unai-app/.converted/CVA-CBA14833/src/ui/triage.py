"""
Cross-Agent Anomaly Triage Engine for SAP Supply Chain Control Tower.
Aggregates and prioritizes urgent anomalies across all 5 agents into a live operational feed.
"""

from typing import List, Dict, Any

def get_cross_agent_anomalies() -> List[Dict[str, Any]]:
    """
    Returns prioritized cross-agent anomaly items for the live triage feed.
    """
    return [
        {
            "priority": "CRITICAL",
            "agent_id": "agent_01",
            "agent_name": "PO Promise Drift",
            "case_id": "45001004",
            "target_object": "PO 45001004 (SUP1007)",
            "risk_score": 81.4,
            "financial_impact": 19718.75,
            "summary": "Severe vendor delay (6.0d drift, 97.7% late rate). Only 1 day of inventory cover remains; 5 production orders threatened.",
            "recommended_action": "EXPEDITE_AND_RESCHEDULE_LINE",
            "hitl_status": "NEEDS_APPROVAL"
        },
        {
            "priority": "CRITICAL",
            "agent_id": "agent_02",
            "agent_name": "Phantom Inventory",
            "case_id": "STK100008",
            "target_object": "Stock STK100008 (PL01/A01)",
            "risk_score": 100.0,
            "financial_impact": 61100.00,
            "summary": "100% phantom deficit. Over-reserved commitment exceeds physical stock (1405 reserved vs 1222 on hand).",
            "recommended_action": "VALIDATE_RESERVATION",
            "hitl_status": "NEEDS_APPROVAL"
        },
        {
            "priority": "HIGH",
            "agent_id": "agent_03",
            "agent_name": "Material Twin-Location",
            "case_id": "TR70002",
            "target_object": "Transfer TR70002 (PL03 -> PL04)",
            "risk_score": 92.5,
            "financial_impact": 30773.84,
            "summary": "Critical component stockout at Plant 04. Inter-plant STO unlocks net economic ROI of ₹ 30,773.84 after ₹ 846 freight.",
            "recommended_action": "TRANSFER_RECOMMENDED",
            "hitl_status": "NEEDS_APPROVAL"
        },
        {
            "priority": "HIGH",
            "agent_id": "agent_04",
            "agent_name": "PO Aging Intelligence",
            "case_id": "CASE04",
            "target_object": "PO 45001004 (PL03/MAT1005)",
            "risk_score": 75.0,
            "financial_impact": 520000.00,
            "summary": "Open 128 days with ₹ 520,000 residual capital committed. Underlying sales requirement has been CANCELLED.",
            "recommended_action": "CLOSE_OR_CANCEL_WORKFLOW",
            "hitl_status": "NEEDS_APPROVAL"
        },
        {
            "priority": "HIGH",
            "agent_id": "agent_05",
            "agent_name": "Requirement Contradiction",
            "case_id": "CASE03",
            "target_object": "Cluster REQ2006|REQ2007 (PL02)",
            "risk_score": 70.0,
            "financial_impact": 45000.00,
            "summary": "Unconsumed forecast (PIR) collides with firm sales order. Double-procurement risk requires forecast consumption.",
            "recommended_action": "REVIEW_DEMAND_PRIORITY",
            "hitl_status": "NEEDS_APPROVAL"
        },
        {
            "priority": "MEDIUM",
            "agent_id": "agent_01",
            "agent_name": "PO Promise Drift",
            "case_id": "45001002",
            "target_object": "PO 45001002 (SUP1001)",
            "risk_score": 61.9,
            "financial_impact": 18246.71,
            "summary": "Acute supplier deterioration. Zero days cover remaining; 2 production orders in immediate jeopardy.",
            "recommended_action": "EXPEDITE_AND_RESCHEDULE_LINE",
            "hitl_status": "NEEDS_APPROVAL"
        },
        {
            "priority": "LOW",
            "agent_id": "agent_04",
            "agent_name": "PO Aging Intelligence",
            "case_id": "CASE02",
            "target_object": "PO 45001002 (PL01/MAT1002)",
            "risk_score": 15.0,
            "financial_impact": 2100000.00,
            "summary": "Aged order (184 days) with high capital value. Required for valid upcoming production run next month.",
            "recommended_action": "KEEP_OPEN",
            "hitl_status": "AUTO_RESOLVED"
        },
        {
            "priority": "LOW",
            "agent_id": "agent_05",
            "agent_name": "Requirement Contradiction",
            "case_id": "CASE02",
            "target_object": "Cluster REQ2004|REQ2005 (PL02)",
            "risk_score": 10.0,
            "financial_impact": 32000.00,
            "summary": "Two distinct customer sales orders arriving in same bucket. Legitimate competing demand confirmed.",
            "recommended_action": "KEEP_BOTH",
            "hitl_status": "AUTO_RESOLVED"
        }
    ]
