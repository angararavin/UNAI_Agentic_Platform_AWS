import os
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional

class PerformanceReporter:
    """
    Timely Agent Performance Reporting Engine.
    Tracks execution metrics, decision latencies, HITL velocity, and economic impact.
    Generates structured executive digests.
    """

    def __init__(self, export_dir: str = "audit/reports"):
        self.export_dir = Path(export_dir)
        self.export_dir.mkdir(parents=True, exist_ok=True)
        self._execution_records: List[Dict[str, Any]] = []

    def record_run_telemetry(
        self,
        agent_id: str,
        case_id: str,
        latency_ms: float,
        approval_status: str,
        economic_impact: float = 0.0,
        ground_truth_matched: bool = True
    ):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "agent_id": agent_id,
            "case_id": case_id,
            "latency_ms": latency_ms,
            "approval_status": approval_status,
            "economic_impact": economic_impact,
            "ground_truth_matched": ground_truth_matched
        }
        self._execution_records.append(entry)

    def generate_digest(self) -> Dict[str, Any]:
        """
        Synthesizes operational metrics across all agent executions.
        """
        total_runs = len(self._execution_records)
        if total_runs == 0:
            return {
                "generated_at": datetime.now().isoformat(),
                "total_executions": 0,
                "overall_accuracy_pct": 100.0,
                "avg_latency_ms": 0.0,
                "total_economic_impact": 0.0,
                "approval_breakdown": {"PENDING": 0, "APPROVED": 0, "REJECTED": 0, "NOT_REQUIRED": 0},
                "agent_metrics": {}
            }

        avg_lat = sum(r["latency_ms"] for r in self._execution_records) / total_runs
        matched_runs = sum(1 for r in self._execution_records if r.get("ground_truth_matched", True))
        accuracy_pct = (matched_runs / total_runs) * 100.0
        total_impact = sum(r.get("economic_impact", 0.0) for r in self._execution_records)

        # Approvals
        approvals = {"PENDING": 0, "APPROVED": 0, "REJECTED": 0, "NOT_REQUIRED": 0}
        for r in self._execution_records:
            st = r.get("approval_status", "NOT_REQUIRED")
            approvals[st] = approvals.get(st, 0) + 1

        # Per-agent metrics
        agent_groups: Dict[str, List[Dict[str, Any]]] = {}
        for r in self._execution_records:
            aid = r["agent_id"]
            agent_groups.setdefault(aid, []).append(r)

        agent_summary = {}
        for aid, recs in agent_groups.items():
            n = len(recs)
            agent_summary[aid] = {
                "runs": n,
                "avg_latency_ms": round(sum(x["latency_ms"] for x in recs) / n, 1),
                "accuracy_pct": round((sum(1 for x in recs if x.get("ground_truth_matched", True)) / n) * 100.0, 1),
                "economic_impact": round(sum(x.get("economic_impact", 0.0) for x in recs), 2)
            }

        return {
            "generated_at": datetime.now().isoformat(),
            "total_executions": total_runs,
            "overall_accuracy_pct": round(accuracy_pct, 1),
            "avg_latency_ms": round(avg_lat, 1),
            "total_economic_impact": round(total_impact, 2),
            "approval_breakdown": approvals,
            "agent_metrics": agent_summary
        }

    def export_markdown_report(self, filename: Optional[str] = None) -> str:
        digest = self.generate_digest()
        fname = filename or f"agent_performance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        report_path = self.export_dir / fname

        md = f"""# SAP Supply Chain AI Agent Performance & SLA Report
**Generated At:** {digest['generated_at']}  
**Reporting Status:** Active SLA Telemetry  

---

## 1. Executive Operational Summary
* **Total Agent Executions:** {digest['total_executions']}
* **Overall Decision Accuracy:** {digest['overall_accuracy_pct']}%
* **Average Execution Latency:** {digest['avg_latency_ms']} ms
* **Cumulative Value Captured / Protected:** ₹ {digest['total_economic_impact']:,.2f}

---

## 2. Human-in-the-Loop Approval Velocity
* **Approved:** {digest['approval_breakdown'].get('APPROVED', 0)}
* **Pending Review:** {digest['approval_breakdown'].get('PENDING', 0)}
* **Rejected:** {digest['approval_breakdown'].get('REJECTED', 0)}
* **Informational / No Approval Needed:** {digest['approval_breakdown'].get('NOT_REQUIRED', 0)}

---

## 3. Performance by Agent Domain
| Agent ID | Executions | Avg Latency (ms) | Accuracy | Value Impact |
| :--- | :---: | :---: | :---: | :---: |
"""
        for aid, data in digest["agent_metrics"].items():
            md += f"| `{aid}` | {data['runs']} | {data['avg_latency_ms']} | {data['accuracy_pct']}% | ₹ {data['economic_impact']:,.2f} |\n"

        md += "\n---\n*Report compiled by Agent Performance & Observability Lead.*\n"

        with open(report_path, mode="w", encoding="utf-8") as f:
            f.write(md)

        return str(report_path)

# Global singleton
performance_reporter = PerformanceReporter()
