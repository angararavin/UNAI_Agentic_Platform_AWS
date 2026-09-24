"""
Agent 05: Requirement Contradiction Intelligence Agent - Standalone POC Runner
Executes the compiled LangGraph workflow over all 6 curated demo scenarios in demo_cases.csv.
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

from tools import LocalContradictionDataLoader
from agent import create_contradiction_agent_graph

def main():
    print("=" * 80)
    print("AGENT 05: REQUIREMENT CONTRADICTION & COMPETING DEMAND DISAMBIGUATOR (POC RUNNER)")
    print("=" * 80)

    loader = LocalContradictionDataLoader()
    try:
        demo_df = loader.load_demo_cases()
    except Exception as e:
        print(f"Error loading datasets: {e}")
        return

    print(f"\nDiscovered {len(demo_df)} curated demonstration contradiction cases:")
    for idx, row in demo_df.iterrows():
        print(f"  {idx+1:2d}. Case: {row['case_id']} | Mat: {row['material_id']} ({row['material_name']}) | Cluster: {row['requirement_ids']} | Type: {row['contradiction_type']}")

    print("\n" + "-" * 80)
    print("EXECUTING AGENT WORKFLOW ACROSS ALL 6 CASES:")
    print("-" * 80)

    app = create_contradiction_agent_graph()

    for idx, row in demo_df.iterrows():
        case_id = str(row["case_id"])
        mat_id = str(row["material_id"])
        mat_name = str(row["material_name"])
        plant_id = str(row["plant_id"])
        req_ids = str(row["requirement_ids"])
        c_type = str(row["contradiction_type"])
        rat = str(row["rationale"])
        action = str(row["recommended_action"])

        print(f"\n[Case {idx+1}/{len(demo_df)}] Investigating {case_id} ({mat_id} @ {plant_id} - {c_type})...")

        init_state = {
            "case_id": case_id,
            "plant_id": plant_id,
            "material_id": mat_id,
            "material_name": mat_name,
            "requirement_ids": req_ids,
            "contradiction_type": c_type,
            "rationale": rat,
            "recommended_action": action,
            "reconciliation": {},
            "explanation": "",
            "hitl_status": ""
        }

        t0 = time.perf_counter()
        final_state = app.invoke(init_state)
        latency_ms = (time.perf_counter() - t0) * 1000

        recon = final_state.get("reconciliation", {})
        expl = final_state.get("explanation", "")
        hitl = final_state.get("hitl_status", "")

        print(f"  * Material / Plant:      {mat_name} ({mat_id}) @ {plant_id}")
        print(f"  * Requirement Cluster:   [{req_ids}]")
        print(f"  * Contradiction Type:    {recon.get('contradiction_type')}")
        print(f"  * Policy Action:         {recon.get('recommended_action')}")
        print(f"  * Human-in-Loop Status:  {hitl}")
        print(f"  * Execution Latency:     {latency_ms:.2f} ms")
        print(f"  * Synthesized Reasoning: {expl}")
        print("  " + "." * 70)

    print("\n" + "=" * 80)
    print("POC Execution Completed Successfully. All 6 cases evaluated.")
    print("=" * 80)

if __name__ == "__main__":
    main()
