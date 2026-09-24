#!/usr/bin/env python3
"""
Agent 01: PO Promise Drift Agent — Standalone POC Runner
Executes LangGraph agent across all 8 curated test cases and displays structured operational dossiers.
"""

import sys
import json
from pathlib import Path

# Add directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from agent import PODriftAgent

def main():
    print("=" * 80)
    print("  SAP SUPPLY CHAIN AGENT 01: PO PROMISE DRIFT AGENT (SC-A01-PPO-001)")
    print("  Standalone Proof-of-Concept (POC) Test Execution")
    print("=" * 80)

    agent = PODriftAgent()
    demo_cases = agent._load_csv("demo_cases")

    print(f"\nDiscovered {len(demo_cases)} curated demonstration cases in synthetic dataset:")
    for idx, c in enumerate(demo_cases, 1):
        print(f"  {idx}. PO: {c.get('po_number')} | Scenario: {c.get('demo_scenario')} | Purpose: {c.get('demo_purpose')}")

    print("\n" + "-" * 80)
    print("EXECUTING AGENT WORKFLOW ACROSS ALL CASES:")
    print("-" * 80)

    for i, c in enumerate(demo_cases, 1):
        po_num = c.get("po_number")
        print(f"\n[Case {i}/{len(demo_cases)}] Investigating PO {po_num} ({c.get('demo_scenario')})...")
        
        result = agent.run(po_num)
        
        pol = result.get("policy_evaluation", {})
        m = result.get("deterministic_metrics", {})
        rec = result.get("recommendation", {})
        s_stats = m.get("supplier_stats", {})
        down = m.get("downstream_metrics", {})

        print(f"  * Supplier ID:             {s_stats.get('supplier_id')} (Late Rate: {s_stats.get('late_delivery_rate_pct')}%, Avg Delay: {s_stats.get('avg_delay_days')}d)")
        print(f"  * Downstream Exposure:     {down.get('days_of_cover_without_po')} days cover | Prod Orders at Risk: {down.get('affected_production_orders')}")
        print(f"  * Risk Classification:     {pol.get('risk_band')} (Composite Score: {pol.get('risk_score')}/100)")
        print(f"  * Recommended Action:      {rec.get('action_type')}")
        print(f"  * Human-in-Loop Status:    {result.get('approval_status')}")
        print(f"  * Execution Latency:       {result.get('latency_ms')} ms")
        print(f"  * Synthesized Reasoning:   {result.get('reasoning_summary')}")
        print("  " + "." * 70)

    print("\n" + "=" * 80)
    print("POC Execution Completed Successfully. All 8 cases evaluated.")
    print("=" * 80)

if __name__ == "__main__":
    main()
