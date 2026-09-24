"""
Agent 02: Phantom Inventory Intelligence Agent - Standalone POC Runner
Executes the compiled LangGraph workflow over all 16 curated demo scenarios in demo_cases.csv.
"""

import os
import sys
import time

agent_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(agent_dir)
if agent_dir not in sys.path:
    sys.path.insert(0, agent_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from tools import LocalPhantomDataLoader
from agent import create_phantom_agent_graph

def main():
    print("=" * 80)
    print("AGENT 02: PHANTOM INVENTORY DISCREPANCY & USABILITY AUDITOR (POC RUNNER)")
    print("=" * 80)

    loader = LocalPhantomDataLoader()
    try:
        demo_df = loader.load_demo_cases()
    except Exception as e:
        print(f"Error loading demo cases: {e}")
        return

    print(f"\nDiscovered {len(demo_df)} curated demonstration cases in synthetic dataset:")
    for idx, row in demo_df.iterrows():
        print(f"  {idx+1:2d}. Stock: {row['stock_id']} | Mat: {row['material_id']} | Plant: {row['plant_id']} | Scenario: {row['demo_scenario']} | Phys: {row['physical_qty']} | Calc Usable: {row['calculated_usable_qty']}")

    print("\n" + "-" * 80)
    print("EXECUTING AGENT WORKFLOW ACROSS ALL 16 CASES:")
    print("-" * 80)

    app = create_phantom_agent_graph()

    for idx, row in demo_df.iterrows():
        stock_id = str(row["stock_id"])
        scenario = str(row["demo_scenario"])
        mat_id = str(row["material_id"])
        plant_id = str(row["plant_id"])
        sloc = str(row["storage_location"])

        print(f"\n[Case {idx+1}/{len(demo_df)}] Investigating Stock {stock_id} ({mat_id} @ {plant_id}/{sloc} - {scenario})...")

        init_state = {
            "stock_id": stock_id,
            "material_id": mat_id,
            "plant_id": plant_id,
            "storage_location": sloc,
            "physical_stock": float(row["physical_qty"]),
            "blocked_stock": float(row["blocked_qty"]),
            "quality_hold_stock": float(row["quality_hold_qty"]),
            "reserved_stock": float(row["reserved_qty"]),
            "wrong_location_stock": float(row["wrong_location_qty"]),
            "expired_stock": float(row["expired_qty"]),
            "reconciliation": {},
            "demand_coverage": {},
            "disposition": {},
            "explanation": "",
            "hitl_status": ""
        }

        t0 = time.perf_counter()
        final_state = app.invoke(init_state)
        latency_ms = (time.perf_counter() - t0) * 1000

        recon = final_state.get("reconciliation", {})
        disp = final_state.get("disposition", {})
        cov = final_state.get("demand_coverage", {})
        expl = final_state.get("explanation", "")
        hitl = final_state.get("hitl_status", "")

        print(f"  * Physical Stock:        {recon.get('physical_qty')} units")
        print(f"  * Usable Stock:          {recon.get('usable_qty')} units (Phantom: {recon.get('phantom_qty')} | {recon.get('phantom_ratio')*100:.1f}%)")
        print(f"  * Primary Driver:        {recon.get('primary_phantom_cause')}")
        print(f"  * Phantom Risk:          {recon.get('phantom_risk')}")
        print(f"  * Recommended Action:    {disp.get('recommended_action')}")
        print(f"  * Human-in-Loop Status:  {hitl}")
        print(f"  * Execution Latency:     {latency_ms:.2f} ms")
        print(f"  * Synthesized Reasoning: {expl}")
        print("  " + "." * 70)

    print("\n" + "=" * 80)
    print("POC Execution Completed Successfully. All 16 cases evaluated.")
    print("=" * 80)

if __name__ == "__main__":
    main()
