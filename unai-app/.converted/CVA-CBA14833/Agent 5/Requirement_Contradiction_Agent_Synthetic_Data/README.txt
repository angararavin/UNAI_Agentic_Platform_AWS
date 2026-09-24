Requirement Contradiction Agent — Synthetic Flat-File Dataset
All records are synthetic for POC/demo/testing.

Purpose: detect conflicting, duplicated, cancelled, overlapping or double-counted
material requirements across production, sales, MRP, forecast and maintenance.

Join: plant_id + material_id define planning scope; requirement_id identifies demand.

Scenarios: duplicate overlap; legitimate competing demand; firm+forecast collision;
cancelled demand; sales+MRP double counting; maintenance+forecast overlap.

Suggested output: contradiction_type, evidence, affected_requirements,
net_requirement_estimate, priority, recommended_action, confidence,
approval_required, verification_plan.

Use deterministic arithmetic for quantities. Use the LLM for evidence synthesis,
explanation and orchestration. Validate exact SAP semantics/APIs for the target
S/4HANA release before production implementation.
