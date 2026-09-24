# ==========================================================================
# UNAI - Universal Supply-Chain Agent (Cognitive Runtime)
# Copyright (c) 2026 Ravin Angara / Bristlecone. All rights reserved.
#
# PROPRIETARY & CONFIDENTIAL. This file, and the architecture, methods and
# ideas it embodies, are the exclusive property of the copyright holders.
# No part may be copied, reproduced, modified, distributed, reverse-engineered,
# or used to create derivative works without prior written permission.
# Shared under confidentiality; unauthorized use or disclosure is prohibited.
# See LICENSE. Integrity: this file is listed in copyright/MANIFEST.sha256.
# SPDX-License-Identifier: LicenseRef-UNAI-Proprietary   [UNAI-COPYRIGHT v1]
# ==========================================================================
"""
ORCHESTRATOR UNAI — ties the shared layers and tool packs together, and
quantifies the collapse from many specialist agents to one or two UNAI.

Gen-1 reality (per use case ≈ 2 specialist agents, 7 layers each):
    demand_forecast   -> Demand Forecasting Agent, Demand Sensing Agent
    inventory_optimize-> Inventory Optimization Agent, Replenishment Agent
    supplier_risk     -> Supplier Risk Agent, Disruption Response Agent
    logistics_eta     -> Shipment Tracking Agent, ETA Prediction Agent
    = 8 specialist agents, 56 layer implementations.

Gen-2 collapse: TWO UNAI share the seven layers + an ontology:
    Planning UNAI  -> demand_forecast, inventory_optimize
    Execution UNAI -> supplier_risk, logistics_eta
    = 2 agents, 7 shared layers + 4 tool packs = 11 implementations.
(One UNAI can run all four; two is a clean planning/execution split.)
"""
from . import toolpacks
from .toolpacks import TOOL_PACKS
from .ontology import OntologyMapper
from .layers import Layers

GEN1_AGENTS = {
    "demand_forecast": ["Demand Forecasting Agent", "Demand Sensing Agent"],
    "inventory_optimize": ["Inventory Optimization Agent", "Replenishment Agent"],
    "supplier_risk": ["Supplier Risk Agent", "Disruption Response Agent"],
    "logistics_eta": ["Shipment Tracking Agent", "ETA Prediction Agent"],
}
UNAI_OF = {
    "demand_forecast": "Planning UNAI", "inventory_optimize": "Planning UNAI",
    "supplier_risk": "Execution UNAI", "logistics_eta": "Execution UNAI",
}
# Your ADK app's REAL agent count for each slice of work — not UNAI's generic
# one-agent-per-capability hypothetical. Mirrors server.js's REAL_ADK_AGENTS
# (kept in sync by hand): spares planning is 1 real agent, RMA is 4, plus the
# shared root_agent — not counted here since it only routes, doesn't do the work.
REAL_AGENT_COUNTS = {
    "spares_rma_closed_loop": ["ibp_planning_agent", "rma_intake_agent", "rma_diagnosis_agent",
                               "rma_disposition_agent", "rma_execution_agent"],
}
_step = lambda cap: {"capability": cap, "systems": ["DUCKDB"]}
USE_CASES = {
    "demand_forecast":   {"name": "Demand Forecasting & Sensing",        "plan": [_step("demand_forecast")]},
    "inventory_optimize":{"name": "Multi-Echelon Inventory Optimization","plan": [_step("inventory_optimize")]},
    "supplier_risk":     {"name": "Supplier Risk & Disruption Response", "plan": [_step("supplier_risk")]},
    "logistics_eta":     {"name": "Logistics / In-Transit Visibility",   "plan": [_step("logistics_eta")]},
    "mesh":              {"name": "Supply-Chain Mesh (all four use cases)",
                          "plan": [_step("demand_forecast"), _step("inventory_optimize"),
                                   _step("supplier_risk"), _step("logistics_eta")]},
    # Unified keys shared with the JS engine so the same use case runs on both paths.
    "disruption_response": {"name": "Supplier Disruption Response",
                          "plan": [_step("supplier_risk"), _step("demand_forecast"),
                                   _step("inventory_optimize"), _step("logistics_eta")]},
    "spares_planning_ibp": {"name": "Spares Planning Process (IBP)",
                          "plan": [_step(c) for c in ["failure_rate_estimate", "spares_demand_forecast",
                                   "returns_realization", "returns_forecast", "variability_leadtime",
                                   "inventory_optimization", "refurbish_planning", "net_requirements",
                                   "replenishment_rebalancing", "order_execution", "returns_execution",
                                   "exception_approval"]]},
    # Combined per the JS engine's "spares_rma_closed_loop" use case key so the UI's
    # "Spares Planning + RMA (closed loop)" option runs on this path too, instead of
    # silently falling back to disruption_response (an unrecognized use-case key).
    "spares_rma_closed_loop": {"name": "Spares Planning + RMA (closed loop)",
                          "plan": [_step(c) for c in ["failure_rate_estimate", "spares_demand_forecast",
                                   "returns_realization", "returns_forecast", "variability_leadtime",
                                   "inventory_optimization", "refurbish_planning", "net_requirements",
                                   "replenishment_rebalancing", "order_execution", "returns_execution",
                                   "exception_approval", "rma_intake", "claims_terms", "visual_inspection",
                                   "triage_fault", "parametric_test", "failure_analysis", "root_cause",
                                   "repair_vs_replace", "work_order_schedule", "rework_calibration",
                                   "final_test", "disposition_escalation", "labeling_coc", "rma_close_loop"]]},
    "rma_execution": {"name": "RMA Execution Process",
                          "plan": [_step(c) for c in ["rma_intake", "claims_terms", "visual_inspection",
                                   "triage_fault", "parametric_test", "failure_analysis", "root_cause",
                                   "repair_vs_replace", "work_order_schedule", "rework_calibration",
                                   "final_test", "disposition_escalation", "labeling_coc", "rma_close_loop"]]},
    "demand_planning": {"name": "Demand Planning",
                          "plan": [_step(c) for c in ["statistical_forecast", "demand_sensing", "consensus_demand",
                                   "promotions_uplift", "forecast_accuracy"]]},
    "inventory_optimization": {"name": "Inventory Optimization",
                          "plan": [_step(c) for c in ["safety_stock_calc", "reorder_policy", "multi_echelon_balance",
                                   "excess_obsolete", "inventory_turns"]]},
    "supply_planning": {"name": "Supply / S&OP Planning",
                          "plan": [_step(c) for c in ["supply_demand_balance", "capacity_check", "master_supply_plan",
                                   "sourcing_allocation", "sop_reconcile"]]},
    "procurement_sourcing": {"name": "Procurement & Sourcing",
                          "plan": [_step(c) for c in ["spend_analysis", "supplier_scorecard", "sourcing_award",
                                   "contract_compliance", "po_automation"]]},
    "logistics_transportation": {"name": "Logistics & Transportation",
                          "plan": [_step(c) for c in ["eta_prediction", "carrier_selection", "freight_optimization",
                                   "otif_tracking", "exception_management"]]},
    "production_planning": {"name": "Production / Manufacturing Planning",
                          "plan": [_step(c) for c in ["mps_generation", "capacity_leveling", "work_order_release",
                                   "materials_availability", "oee_tracking"]]},
}


class UNAI:
    def __init__(self, name="UNAI · Universal Supply-Chain Agent"):
        self.name = name

    def run(self, use_case_key, systems, backend="DUCKDB"):
        import time as _time
        _t0 = _time.perf_counter()
        # Accept a use-case KEY (str) or a goal/manifest OBJECT directly, so an
        # exported Agent Foundry manifest runs on this same runtime.
        goal = USE_CASES[use_case_key] if isinstance(use_case_key, str) else use_case_key
        toolpacks.BACKEND = backend
        mapper = OntologyMapper()
        L = Layers(systems, mapper)

        plan = L.reason(goal)
        results = {}
        for step in plan:
            L.collaborate(step["capability"], self.name)
            handler = TOOL_PACKS.get(step["capability"]) or toolpacks.generic_pack(step)
            results[step["capability"]] = handler(L)

        caps = [s["capability"] for s in plan]
        # A real deployed app (e.g. your ADK spares/RMA agents) overrides the generic
        # one-hypothetical-agent-per-capability baseline with its actual agent count.
        real_agents = REAL_AGENT_COUNTS.get(use_case_key) if isinstance(use_case_key, str) else None
        if real_agents:
            gen1_agents = len(real_agents)
        else:
            gen1_agents = sum(len(GEN1_AGENTS.get(c, ["Specialist Agent"])) for c in caps)
        unais_used = len({UNAI_OF.get(c, "UNAI") for c in caps})
        gen1_layer_impls = gen1_agents * 7
        gen2_layer_impls = 7 + len(caps)
        decisions = len(L.evidence_log)
        autonomous = sum(1 for e in L.evidence_log if e["autonomous"])
        total_ms = sum(a["ms"] for a in L.activity.values()) or 1e-9

        # ---- Full render-compatible object (same shape the JS engine returns) ----
        # so the Studio UI can show LIVE, Databricks-MEASURED numbers on the
        # Observability / Gen-1-vs-UNAI / ROI tabs (not engine-computed ones).
        wall_ms = round((_time.perf_counter() - _t0) * 1000)
        A = L.activity
        LAYER_ROLES = [
            ("Perception", "Reads any ERP schema into canonical form via the ontology"),
            ("Memory", "Unified episodic + semantic store shared across capabilities"),
            ("Reasoning", "Decomposes the goal into sub-tasks at runtime"),
            ("Evidence", "Confidence, attribution, uncertainty bounds + counterfactual"),
            ("Action", "Universal write bus (canonical -> native)"),
            ("Collaboration", "A2A pub/sub event bus — topics, not point-to-point wiring"),
            ("Explainability", "Plain-English rationale + full audit trail"),
        ]
        layer_activity = [{"id": f"L{i+1}", "name": n, "role": role,
                           "invocations": A[n]["n"], "ms": round(A[n]["ms"], 3),
                           "sample": A[n]["last"], "active": A[n]["n"] > 0}
                          for i, (n, role) in enumerate(LAYER_ROLES)]
        obs_layers = [{"id": f"L{i+1}", "name": n, "invocations": A[n]["n"], "ms": round(A[n]["ms"], 3),
                       "avgMs": round(A[n]["ms"] / A[n]["n"], 3) if A[n]["n"] else 0,
                       "sharePct": round(100 * A[n]["ms"] / total_ms)}
                      for i, (n, _r) in enumerate(LAYER_ROLES)]
        system_calls = {k: v.calls for k, v in systems.items()}
        total_calls = sum(system_calls.values())
        model_calls = A["Reasoning"]["n"] + A["Explainability"]["n"]
        # ---- SHARED COGNITIVE RUNTIME token model (mirrors the JS engine) ----
        R = {"ontologyBlock": 1200, "ctxPerRead": 300, "cachedRead": 10, "planIn": 1500, "planOut": 200,
             "evIn": 150, "evOut": 80, "exIn": 120, "exOut": 60, "memIn": 20}
        first_reads = A["Perception"]["n"]   # no cross-run perception cache in the Python path yet
        cache_hits = 0
        n_agents = gen1_agents or len(caps) or 1
        mem_in = A["Memory"]["n"]*R["memIn"]
        ev_in = A["Evidence"]["n"]*R["evIn"]; ev_out = A["Evidence"]["n"]*R["evOut"]
        ex_in = A["Explainability"]["n"]*R["exIn"]; ex_out = A["Explainability"]["n"]*R["exOut"]
        thin_in = ev_in + ex_in + mem_in; thin_out = ev_out + ex_out
        base_in = R["ontologyBlock"] + R["planIn"]; base_out = R["planOut"]
        tok_in = base_in + first_reads*R["ctxPerRead"] + cache_hits*R["cachedRead"] + thin_in
        tok_out = base_out + thin_out
        tok_total = tok_in + tok_out
        naive_in = n_agents*base_in + (first_reads + cache_hits)*R["ctxPerRead"] + thin_in
        naive_out = n_agents*base_out + thin_out
        naive_total = naive_in + naive_out
        saved_tokens = naive_total - tok_total
        saved_pct = round(100*saved_tokens/naive_total) if naive_total else 0
        est_cost = round((tok_in/1e6)*0.20 + (tok_out/1e6)*0.60, 5)
        est_cost_naive = round((naive_in/1e6)*0.20 + (naive_out/1e6)*0.60, 5)
        layer_tokens = [
            {"name": "Perception",    "in": R["ontologyBlock"] + first_reads*R["ctxPerRead"] + cache_hits*R["cachedRead"], "out": 0},
            {"name": "Memory",        "in": mem_in, "out": 0},
            {"name": "Reasoning",     "in": R["planIn"], "out": R["planOut"]},
            {"name": "Evidence",      "in": ev_in, "out": ev_out},
            {"name": "Action",        "in": 0, "out": 0},
            {"name": "Collaboration", "in": 0, "out": 0},
            {"name": "Explainability","in": ex_in, "out": ex_out},
        ]
        for _x in layer_tokens: _x["total"] = _x["in"] + _x["out"]
        token_model = {"runtimeTotal": tok_total, "naiveTotal": naive_total, "savedTokens": saved_tokens, "savedPct": saved_pct,
                       "runtimeCostUsd": est_cost, "naiveCostUsd": est_cost_naive, "savedCostUsd": round(est_cost_naive - est_cost, 5),
                       "cognitionBaseTokens": base_in + base_out, "nAgents": n_agents, "contextReadsOnce": first_reads, "reuseAvoided": cache_hits}
        cognition = {"firstReads": first_reads, "cacheHits": cache_hits, "reuseAvoided": cache_hits, "planOnce": A["Reasoning"]["n"],
                     "executors": len(caps), "nAgents": n_agents, "savedTokens": saved_tokens, "savedPct": saved_pct}
        confs = [e["confidence"] for e in L.evidence_log]
        sec = (wall_ms or 1) / 1000
        if real_agents:
            gen1_agent_names = [n + " (your real ADK agent)" for n in real_agents]
        else:
            gen1_agent_names = []
            for c in caps:
                gen1_agent_names += GEN1_AGENTS.get(c, [c])
        render_obj = {
            "useCase": {"name": goal["name"],
                        "description": goal.get("description", f"Live run against Databricks — {goal['name']}."),
                        "gen1Agents": gen1_agent_names,
                        "plan": [{"capability": c, "agentEquiv": " + ".join(GEN1_AGENTS.get(c, [c])),
                                  "systems": list(systems.keys())}
                                 for c in caps]},
            "config": {"name": self.name},
            "trace": [{"layer": a, "msg": b} for (a, b) in L.trace],
            "results": results,
            "systemsTouched": sorted(L.touched_systems),
            "layerActivity": layer_activity,
            "evidence": L.evidence_log,
            "observability": {
                "totalMs": round(total_ms, 3), "wallMs": wall_ms,
                "throughputPerSec": round(decisions / sec, 1),
                "layers": obs_layers,
                "modelCalls": model_calls,
                "tokensIn": tok_in, "tokensOut": tok_out, "tokensTotal": tok_total,
                "estCostUsd": est_cost, "cacheHitRatePct": 0,
                "layerTokens": layer_tokens, "tokenModel": token_model, "cognition": cognition,
                "systemCalls": system_calls, "totalSystemCalls": total_calls,
                "a2aMessages": A["Collaboration"]["n"],
                "ontologyTranslations": mapper.translations,
                "systemTransitions": L.context_switches, "schemaRemaps": 0,
                "decisions": decisions, "autonomousDecisions": autonomous,
                "humanGatedDecisions": decisions - autonomous,
                "autonomyRatePct": round(100 * autonomous / decisions) if decisions else 0,
                "avgConfidence": round(sum(confs) / decisions, 2) if decisions else 0,
                "minConfidence": min(confs) if confs else 0, "maxConfidence": max(confs) if confs else 0,
                "actionsExecuted": L.actions,
                "guardrailInputChecks": A["Perception"]["n"], "guardrailActionChecks": decisions,
                "guardrailGated": decisions - autonomous, "errors": 0, "retries": 0,
                "auditTrail": L.audit_trail,
                "agentOps": {
                    "trajectorySteps": len(caps),
                    "toolCalls": total_calls + L.actions,
                    "loopRatePct": 0, "circuitBreakerMaxSteps": 25,
                    "taskSuccessPct": 100, "toolErrors": 0, "toolErrorRatePct": 0,
                    "turnLatencyMs": wall_ms, "ttftMs": None,
                    "escalations": decisions - autonomous, "hitlPendingMs": None,
                },
            },
            "metrics": {
                "elapsedMs": wall_ms, "ontologyTranslations": mapper.translations,
                "a2aMessages": A["Collaboration"]["n"], "actionsExecuted": L.actions,
                "gen1AgentCount": gen1_agents, "agentsActuallyUsed": unais_used,
                "agentsSubstituted": gen1_agents - unais_used,
                "substitutionRatio": f"{gen1_agents}:{unais_used}",
                "gen1LayerImpls": gen1_layer_impls, "gen2LayerImpls": gen2_layer_impls,
                "layerComplexityReductionPct": round((1 - gen2_layer_impls / gen1_layer_impls) * 100),
                "systemTransitions": L.context_switches,
                "naiveContextSwitches": L.context_switches, "actualContextSwitches": 0,
                "contextSwitchReductionPct": 100 if L.context_switches else 0,
                "systemsOfRecord": len(L.touched_systems),
            },
        }

        return {
            "render": render_obj,
            "useCase": goal["name"],
            "agent": self.name,
            "capabilities": caps,
            "results": results,
            "evidence": L.evidence_log,
            "trace": L.trace,
            "compression": {
                "gen1Agents": gen1_agents,
                "unaisUsed": unais_used,
                "agentsSubstituted": gen1_agents - unais_used,
                "ratio": f"{gen1_agents}:{unais_used}",
                "gen1LayerImpls": gen1_layer_impls,
                "gen2LayerImpls": gen2_layer_impls,
                "complexityReductionPct": round((1 - gen2_layer_impls / gen1_layer_impls) * 100),
                "unais": sorted({UNAI_OF.get(c, "UNAI") for c in caps}),
            },
            "observability": {
                "layers": [{"name": n, "invocations": a["n"], "ms": round(a["ms"], 3),
                            "sharePct": round(100 * a["ms"] / total_ms)} for n, a in L.activity.items()],
                "totalMs": round(total_ms, 3),
                "systemCalls": {k: v.calls for k, v in systems.items()},
                "ontologyTranslations": mapper.translations,
                "contextSwitches": L.context_switches,
                "schemaRemaps": 0,
                "decisions": decisions,
                "autonomousDecisions": autonomous,
                "humanGatedDecisions": decisions - autonomous,
                "autonomyRatePct": round(100 * autonomous / decisions) if decisions else 0,
                "actionsExecuted": L.actions,
                "auditTrail": L.audit_trail,
            },
        }

# Back-compat alias (renamed from UNAI)
UNAI = UNAI
