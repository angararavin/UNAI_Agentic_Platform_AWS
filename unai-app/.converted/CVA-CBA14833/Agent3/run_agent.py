"""
Agent 03: Material Twin-Location Intelligence Agent - Standalone POC Runner
Executes the compiled LangGraph workflow over all 10 curated demo scenarios in demo_cases.csv.
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

from tools import LocalTwinLocationDataLoader
from agent import create_twin_location_agent_graph

def main():
    print("=" * 80)
    print("AGENT 03: MATERIAL TWIN-LOCATION BALANCING AGENT (POC RUNNER)")
    print("=" * 80)

    loader = LocalTwinLocationDataLoader()
    try:
        demo_df = loader.load_demo_cases()
        mat_df = loader.load_materials().set_index("material_id")
        price_map = mat_df["unit_value"].to_dict()
    except Exception as e:
        print(f"Error loading datasets: {e}")
        return

    print(f"\nDiscovered {len(demo_df)} curated demonstration transfer cases:")
    for idx, row in demo_df.iterrows():
        print(f"  {idx+1:2d}. Option: {row['transfer_option_id']} | Mat: {row['material_id']} | Route: {row['source_plant']} -> {row['destination_plant']} | Qty: {row['candidate_qty']} | Scenario: {row['demo_scenario']}")

    print("\n" + "-" * 80)
    print("EXECUTING AGENT WORKFLOW ACROSS ALL 10 CASES:")
    print("-" * 80)

    app = create_twin_location_agent_graph()

    for idx, row in demo_df.iterrows():
        opt_id = str(row["transfer_option_id"])
        scenario = str(row["demo_scenario"])
        mat_id = str(row["material_id"])
        src = str(row["source_plant"])
        dst = str(row["destination_plant"])
        qty = float(row["candidate_qty"])
        unit_val = float(price_map.get(mat_id, 50.0))

        print(f"\n[Case {idx+1}/{len(demo_df)}] Evaluating Transfer {opt_id} ({mat_id}: {src} -> {dst} - {scenario})...")

        init_state = {
            "transfer_option_id": opt_id,
            "material_id": mat_id,
            "source_plant": src,
            "destination_plant": dst,
            "candidate_qty": qty,
            "distance_km": float(row["distance_km"]),
            "estimated_freight_cost": float(row["estimated_freight_cost"]),
            "transfer_lead_days": int(row["transfer_lead_days"]),
            "estimated_stockout_cost": float(row["estimated_stockout_cost"]),
            "unit_value": unit_val,
            "source_on_hand": 0.0,
            "source_demand_30d": 0.0,
            "source_safety_stock": 0.0,
            "source_protection": {},
            "economics": {},
            "explanation": "",
            "hitl_status": ""
        }

        t0 = time.perf_counter()
        final_state = app.invoke(init_state)
        latency_ms = (time.perf_counter() - t0) * 1000

        econ = final_state.get("economics", {})
        expl = final_state.get("explanation", "")
        hitl = final_state.get("hitl_status", "")

        print(f"  * Feasible Transfer Qty: {econ.get('feasible_transfer_qty')} units (Val: INR {econ.get('inventory_value_moved'):.2f})")
        print(f"  * Avoided Stockout Cost: INR {econ.get('avoided_stockout_cost'):.2f}")
        print(f"  * Freight Cost:          INR {econ.get('estimated_freight_cost'):.2f}")
        print(f"  * Net Economic Benefit:  INR {econ.get('estimated_net_benefit'):.2f}")
        print(f"  * Policy Decision:       {econ.get('decision')}")
        print(f"  * Human-in-Loop Status:  {hitl}")
        print(f"  * Execution Latency:     {latency_ms:.2f} ms")
        print(f"  * Synthesized Reasoning: {expl}")
        print("  " + "." * 70)

    print("\n" + "=" * 80)
    print("POC Execution Completed Successfully. All 10 cases evaluated.")
    print("=" * 80)

if __name__ == "__main__":
    main()
