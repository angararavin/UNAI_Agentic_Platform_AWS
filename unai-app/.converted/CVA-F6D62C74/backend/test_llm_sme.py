import sys
import json
sys.stdout.reconfigure(encoding='utf-8')
from backend.agents.manager_agent import SupplyChainManagerAgent

mgr = SupplyChainManagerAgent()
res = mgr.run_pipeline(
    supplier="TSMC", 
    origin="Hsinchu Tech Park", 
    destination="Austin, Texas", 
    transport_mode="Air Freight", 
    use_live_api=True
)

print("--- Pipeline Result ---")
print("Disruption Source:", res["disruptionEvent"]["source"])
print("Financial Data Source:", res["financialImpact"]["dataSource"])
print("Recommendation Engine:", res["recommendation"]["engine"])
print("Recommended Plan:", res["recommendation"]["recommendedPlan"])
print("Expected Benefit:", res["recommendation"]["expectedBenefit"])
print("\n--- Tradeoff Analysis ---")
print(res["recommendation"]["tradeOffAnalysis"])

print("\n--- 4 Mitigation Options ---")
for opt in res["recommendation"]["allOptions"]:
    print(f"[{opt['id']}] {opt['name']}")
    print(f"    Cost: ${opt['costUsd']:,} | OTIF: {opt['projectedOtif']} | Recovery: {opt['recoveryWeeks']} wks | Residual Risk: {opt.get('postMitigationRiskPct')}% | Rec: {opt['isRecommended']}")
