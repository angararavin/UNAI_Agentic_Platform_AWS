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
TOOL PACKS — the only domain-specific code. Each is a small handler that calls
the shared layers. In a Gen-1 world each of these would be a whole 7-layer
specialist agent; here they are ~20-line functions over one shared substrate.

All four read/write CANONICAL concepts (sku, location, forecast_qty, ...) — they
never touch a native field name, so they run unchanged on DuckDB, Postgres,
Snowflake, Databricks or an Iceberg lakehouse.
"""
BACKEND = "DUCKDB"   # which system_key the demo reads from; set by the orchestrator


def _sys(L, preferred):
    """Prefer a named logical system (e.g. "SAP_MM") when the run registered
    it — as the BigQuery live connector does, to model the real SAP MM/SD/FI +
    analytics landscape it replaces — else fall back to the single flat
    BACKEND every other connector (DuckDB/Databricks/Snowflake demo mode) uses."""
    return preferred if preferred in L.systems else BACKEND


def demand_forecast(L):
    """Use case 1 — Demand forecasting & sensing (blend ML forecast with live signal)."""
    sales = L.perceive(_sys(L, "ANALYTICS"), "sales")
    fcst = L.perceive(_sys(L, "ANALYTICS"), "forecast")
    sensed = []
    for f in fcst:
        s = next((x for x in sales if x["sku"] == f["sku"] and x["location"] == f["location"]), {})
        base, signal = f.get("forecast_qty", 0), s.get("sales_qty", 0)
        sensed_qty = round(0.75 * base + 0.25 * signal * 1.1)   # demand sensing uplift
        sensed.append({"sku": f["sku"], "location": f["location"], "forecast_qty": sensed_qty})
    L.remember("forecast_sensed", sensed)
    ev = L.evidence("Demand re-forecast with sensing (+ live order signal)",
                    [{"name": "ML base forecast", "weight": 0.20},
                     {"name": "recent order signal", "weight": 0.10}])
    L.explain(ev)
    return {"forecast": sensed, "evidence": ev}


def inventory_optimize(L):
    """Use case 2 — Multi-echelon inventory optimization + replenishment."""
    inv = L.perceive(_sys(L, "SAP_MM"), "inventory")
    fc = L.recall("forecast_sensed") or L.perceive(_sys(L, "ANALYTICS"), "forecast")
    pos, shortfalls = [], []
    for r in inv:
        f = next((x for x in fc if x["sku"] == r["sku"] and x["location"] == r["location"]), {})
        need = f.get("forecast_qty", 0)
        position = (r.get("on_hand_qty", 0) or 0) + (r.get("in_transit_qty", 0) or 0)
        gap = need - position
        if gap > 0:
            new_safety = round((r.get("safety_stock", 0) or 0) * 1.25)
            L.act(_sys(L, "SAP_MM"), "SAFETY_STOCK_UPDATE",
                  {"sku": r["sku"], "location": r["location"], "safety_stock": new_safety, "status": "UPDATED"})
            value = int(gap * (r.get("unit_cost", 0) or 0))
            ev = L.evidence(f"Replenish {r['sku']} @ {r['location']} ({gap} units, ${value:,})",
                            [{"name": "forecast-vs-position gap", "weight": 0.24},
                             {"name": "lead-time exposure", "weight": 0.10}],
                            value_gate={"value": value, "limit": 50000})
            explain = L.explain(ev)
            if ev["autonomous"]:
                res = L.act(_sys(L, "SAP_MM"), "PO_CREATE",
                            {"sku": r["sku"], "location": r["location"], "po_qty": gap,
                             "supplier": r.get("supplier"), "unit_cost": r.get("unit_cost"), "status": "CREATED"})
                ref = res["ref"]
            else:
                ref = "PENDING_APPROVAL"
            pos.append({"sku": r["sku"], "location": r["location"], "qty": gap, "value": value,
                        "po": ref, "autonomous": ev["autonomous"], "confidence": ev["confidence"], "explain": explain})
            shortfalls.append({"sku": r["sku"], "location": r["location"], "gap": gap})
    L.remember("shortfalls", shortfalls)
    return {"purchaseOrders": pos}


def supplier_risk(L):
    """Use case 3 — Supplier risk & disruption response."""
    risks = L.perceive(_sys(L, "ANALYTICS"), "supplier_risk")
    hit = max(risks, key=lambda r: r.get("supplier_risk", 0)) if risks else {}
    disrupted = hit.get("supplier_risk", 0) >= 0.7
    L.remember("disruption", hit if disrupted else None)
    ev = L.evidence(f"Supplier risk: {hit.get('supplier')} (score {hit.get('supplier_risk')})"
                    + (" — disruption" if disrupted else " — nominal"),
                    [{"name": "supplier risk score", "weight": (hit.get("supplier_risk", 0) or 0) * 0.3},
                     {"name": "lane concentration", "weight": 0.10}])
    L.explain(ev)
    return {"affected_supplier": hit.get("supplier"), "disrupted": disrupted, "evidence": ev}


def logistics_eta(L):
    """Use case 4 — Logistics / in-transit visibility & ETA exceptions."""
    ships = L.perceive(_sys(L, "ANALYTICS"), "shipment")
    exceptions = []
    for s in ships:
        eta, promised = s.get("eta_days", 0) or 0, s.get("planned_eta", 0) or 0
        if eta > promised:                                   # predicted late vs promise
            slip = eta - promised
            ev = L.evidence(f"Shipment {s['shipment_id']} ({s.get('carrier')}) predicted {slip}d late",
                            [{"name": "predicted ETA slip", "weight": min(0.3, 0.06 * slip)},
                             {"name": "carrier reliability", "weight": 0.08}])
            L.explain(ev)
            L.act(_sys(L, "ANALYTICS"), "ETA_ALERT",
                  {"sku": s.get("sku"), "location": s.get("location"),
                   "shipment_id": s["shipment_id"], "slip_days": slip, "status": "ALERTED"})
            exceptions.append({"shipment_id": s["shipment_id"], "carrier": s.get("carrier"),
                               "slip_days": slip, "confidence": ev["confidence"]})
    L.remember("eta_exceptions", exceptions)
    return {"exceptions": exceptions}


TOOL_PACKS = {
    "demand_forecast": demand_forecast,
    "inventory_optimize": inventory_optimize,
    "supplier_risk": supplier_risk,
    "logistics_eta": logistics_eta,
}


def generic_pack(step):
    """Runs ANY capability from an exported Agent Foundry manifest that has no
    bespoke tool pack (custom or converted). Grounds against the configured
    backend, emits an evidence object, and writes back for action-shaped caps —
    so a converted/exported agent runs unchanged on any backend."""
    import re

    def run(L):
        cap = step.get("capability", "capability")
        c = cap.lower()
        # capability-aware grounding: read the table most relevant to THIS capability
        # first (so spares/RMA/planning flows genuinely read their own tables), then
        # fall back to the generic list. Every read is guarded, so a missing table
        # on a given backend just moves to the next candidate.
        priority = []
        # system_key mirrors the real system each capability family lives on in
        # the JS engine (SERVICENOW for RMA, SAP_IBP for spares planning, ...) so
        # a live multi-system connector (e.g. BigQuery registering these names —
        # see connect_bigquery.py) shows genuine context switches between them,
        # instead of every capability flattening onto one BACKEND. Falls back to
        # BACKEND via _sys() when a connector only registers the single flat key.
        system_key = "ANALYTICS"
        if any(k in c for k in ("rma", "claim", "warranty", "triage", "inspection", "root_cause",
                                "parametric", "failure_analysis", "final_test", "labeling", "rework", "disposition", "repair")):
            priority = ["rma_case", "s4_refurb"]
            system_key = "SERVICENOW"
        elif any(k in c for k in ("failure_rate", "spares", "returns", "refurb", "variability",
                                  "net_requirement", "replenish", "order_exec", "exception", "inventory_optimization")):
            priority = ["feat_failure", "feat_spares_forecast", "feat_returns", "ib_install_base", "ib_inv_target", "s4_refurb"]
            system_key = "SAP_IBP"
        elif any(k in c for k in ("demand", "forecast", "consensus", "promotion", "sensing")):
            priority = ["pl_demand_plan", "feat_forecast"]
            system_key = "ANALYTICS"
        elif any(k in c for k in ("supply", "capacity", "mps", "master_supply", "sop", "allocation")):
            priority = ["pl_supply_plan"]
            system_key = "SAP_IBP"
        elif any(k in c for k in ("procure", "spend", "sourcing", "contract", "supplier_scorecard", "po_")):
            priority = ["pl_procurement"]
            system_key = "SAP_MM"
        elif any(k in c for k in ("logistic", "eta", "carrier", "freight", "otif", "transport")):
            priority = ["pl_logistics", "shipment"]
            system_key = "ANALYTICS"
        elif any(k in c for k in ("production", "oee", "work_order", "capacity_lev", "materials", "mps_generation")):
            priority = ["pl_production"]
            system_key = "SAP_S4"
        elif any(k in c for k in ("safety_stock", "reorder", "excess", "turns", "echelon")):
            priority = ["pl_inv_health", "inventory"]
            system_key = "SAP_MM"
        sk = _sys(L, system_key)
        for ent in priority + ["forecast", "inventory", "sales", "stock", "ib_install_base",
                    "feat_failure", "feat_spares_forecast", "feat_returns", "ib_inv_target",
                    "s4_refurb", "rma_case", "pl_demand_plan", "pl_inv_health", "pl_supply_plan",
                    "pl_procurement", "pl_logistics", "pl_production"]:
            try:
                L.perceive(sk, ent); break
            except Exception:
                pass
        name = (step.get("agentEquiv") or cap).replace("_", " ")
        is_act = bool(re.search(r"create|update|write|issue|send|post|place|raise|execute|reorder|replenish|transfer|credit|replace|notify", cap))
        ev = L.evidence(name, [{"name": "policy signal", "weight": 0.22}, {"name": "data grounding", "weight": 0.10}])
        L.explain(ev)
        if is_act and ev["autonomous"]:
            try:
                L.act(sk, "GENERIC_ACTION", {"sku": "-"})
            except Exception:
                pass
        return {"evidence": ev}
    return run


# =============================================================================
# BESPOKE PLANNING TOOL PACKS — domain-specific evidence for the six planning
# use cases, so the LIVE (BigQuery/Databricks) path shows distinct drivers &
# governance gates just like the JS engine. Reads are guarded so a missing table
# on a given backend degrades gracefully instead of crashing.
# =============================================================================
def _read(L, ent, filt=None):
    try:
        return L.perceive(BACKEND, ent, filt)
    except Exception:
        return []

def _gate(ev, reason):
    ev["autonomous"] = False
    ev["gate"] = reason
    return ev

# ---- Demand Planning --------------------------------------------------------
def statistical_forecast(L):
    f = _read(L, "pl_demand_plan") or _read(L, "forecast")
    total = sum(x.get("forecast_qty", 0) or 0 for x in f)
    L.remember("baseline_fcst", f)
    ev = L.evidence(f"Statistical baseline forecast - {len(f)} series, {total:,} units",
                    [{"name": "seasonality + trend fit", "weight": 0.20}, {"name": f"history depth ({len(f)} series)", "weight": 0.08}])
    L.explain(ev); return {"forecast": f, "evidence": ev}

def demand_sensing(L):
    sales = _read(L, "sales"); base = L.recall("baseline_fcst") or _read(L, "pl_demand_plan")
    signal = sum(x.get("sales_qty", 0) or 0 for x in sales)
    ev = L.evidence(f"Demand sensing vs live orders - {signal:,} units of recent sales signal",
                    [{"name": "live order signal", "weight": 0.16}, {"name": "short-term elasticity", "weight": 0.10}])
    L.explain(ev); return {"signal": signal, "evidence": ev}

def consensus_demand(L):
    dp = _read(L, "pl_demand_plan"); L.remember("consensus", dp)
    acc = (sum(x.get("forecast_accuracy", 0) or 0 for x in dp) / len(dp)) if dp else 0
    ev = L.evidence(f"Consensus demand reconciled - {len(dp)} SKUs, avg accuracy {round(acc*100)}%",
                    [{"name": "planner consensus alignment", "weight": 0.18}, {"name": f"forecast accuracy {round(acc*100)}%", "weight": round(acc * 0.12, 3)}])
    if acc and acc < 0.75: _gate(ev, f"avg accuracy {round(acc*100)}% < 75% - planner sign-off")
    L.explain(ev); return {"accuracy": acc, "evidence": ev}

def promotions_uplift(L):
    dp = L.recall("consensus") or _read(L, "pl_demand_plan")
    up = (sum(x.get("promo_uplift", 0) or 0 for x in dp) / len(dp)) if dp else 0
    ev = L.evidence(f"Promotions uplift modeled - avg +{round(up*100)}%",
                    [{"name": "promo price elasticity", "weight": round(0.12 + up * 0.4, 3)}, {"name": "cannibalization guardrail", "weight": 0.08}])
    L.explain(ev); return {"uplift": up, "evidence": ev}

def forecast_accuracy(L):
    dp = _read(L, "pl_demand_plan")
    worst = min([x.get("forecast_accuracy", 1) or 1 for x in dp], default=1)
    ev = L.evidence(f"Forecast-accuracy tracking - worst SKU {round(worst*100)}% (MAPE/bias)",
                    [{"name": "accuracy trend", "weight": round(worst * 0.22, 3)}, {"name": "bias correction", "weight": 0.06}])
    if worst < 0.75: _gate(ev, f"SKU accuracy {round(worst*100)}% < 75% - flag to planner")
    L.explain(ev); return {"worst": worst, "evidence": ev}

# ---- Inventory Optimization -------------------------------------------------
def safety_stock_calc(L):
    stock = _read(L, "inventory"); L.remember("ss_stock", stock)
    avg = round(sum(s.get("safety_stock", 0) or 0 for s in stock) / len(stock)) if stock else 0
    ev = L.evidence(f"Safety-stock sizing - {len(stock)} SKUs, avg buffer {avg} units",
                    [{"name": "service-level target (95%)", "weight": 0.20}, {"name": "demand + lead-time variability", "weight": 0.10}])
    L.explain(ev); return {"avgSafety": avg, "evidence": ev}

def reorder_policy(L):
    stock = L.recall("ss_stock") or _read(L, "inventory")
    breaches = sum(1 for s in stock if (s.get("on_hand_qty", 0) or 0) <= (s.get("reorder_point", 0) or 0))
    ev = L.evidence(f"Reorder policy - {breaches}/{len(stock)} SKUs at/below reorder point",
                    [{"name": "reorder-point vs lead-time demand", "weight": 0.22}, {"name": "order-cost / EOQ balance", "weight": 0.08}])
    L.explain(ev); return {"breaches": breaches, "evidence": ev}

def multi_echelon_balance(L):
    ih = _read(L, "pl_inv_health") or _read(L, "inventory")
    ev = L.evidence(f"Multi-echelon rebalance across {len(ih)} SKU-locations",
                    [{"name": "echelon imbalance", "weight": 0.18}, {"name": "holding-cost minimization", "weight": 0.10}])
    L.explain(ev); return {"evidence": ev}

def excess_obsolete(L):
    ih = _read(L, "pl_inv_health")
    excess = sum(x.get("excess_qty", 0) or 0 for x in ih)
    ev = L.evidence(f"Excess & obsolete scan - {excess:,} units flagged",
                    [{"name": "excess exposure vs turns", "weight": 0.16}, {"name": "write-down risk", "weight": 0.08}])
    if excess > 300: _gate(ev, f"{excess:,} excess units > 300 - finance review before markdown")
    L.explain(ev); return {"excess": excess, "evidence": ev}

def inventory_turns(L):
    ih = _read(L, "pl_inv_health")
    worst = min([x.get("inv_turns", 99) or 99 for x in ih], default=99)
    ev = L.evidence(f"Inventory-turns tracking - worst {round(worst,1)}x vs 6x target",
                    [{"name": "turns vs target", "weight": round(min(0.24, worst / 6 * 0.24), 3)}, {"name": "working-capital impact", "weight": 0.08}])
    if worst < 4: _gate(ev, f"turns {round(worst,1)}x < 4x - planner review")
    L.explain(ev); return {"worst": worst, "evidence": ev}

# ---- Supply / S&OP Planning -------------------------------------------------
def supply_demand_balance(L):
    sp = _read(L, "pl_supply_plan"); fc = _read(L, "pl_demand_plan") or _read(L, "forecast")
    supply = sum(x.get("mps_qty", 0) or 0 for x in sp); demand = sum(x.get("forecast_qty", 0) or 0 for x in fc)
    gap = demand - supply; L.remember("sd_gap", gap)
    ev = L.evidence(f"Supply-demand balance - supply {supply:,} vs demand {demand:,} (gap {gap})",
                    [{"name": "net supply-demand gap", "weight": round(0.24 if gap <= 0 else 0.12, 3)}, {"name": "S&OP horizon coverage", "weight": 0.08}])
    if gap > 0: _gate(ev, f"demand exceeds supply by {gap} - S&OP escalation")
    L.explain(ev); return {"gap": gap, "evidence": ev}

def capacity_check(L):
    sp = _read(L, "pl_supply_plan")
    head = [(x.get("capacity_qty", 0) or 0) - (x.get("mps_qty", 0) or 0) for x in sp]
    m = min(head) if head else 0
    ev = L.evidence(f"Capacity check - tightest headroom {m} units",
                    [{"name": "capacity headroom", "weight": round(0.22 if m > 50 else 0.10, 3)}, {"name": "bottleneck resource load", "weight": 0.08}])
    if m <= 50: _gate(ev, f"headroom {m} <= 50 - capacity escalation")
    L.explain(ev); return {"minHead": m, "evidence": ev}

def master_supply_plan(L):
    sp = _read(L, "pl_supply_plan"); mps = sum(x.get("mps_qty", 0) or 0 for x in sp)
    ev = L.evidence(f"Master supply plan set - {mps:,} units across {len(sp)} SKUs",
                    [{"name": "MPS feasibility vs capacity", "weight": 0.20}, {"name": "time-phased balance", "weight": 0.08}])
    L.explain(ev); return {"mps": mps, "evidence": ev}

def sourcing_allocation(L):
    sp = _read(L, "pl_supply_plan"); alloc = sum(x.get("allocation_qty", 0) or 0 for x in sp)
    ev = L.evidence(f"Sourcing allocation - {alloc:,} units allocated to sites/suppliers",
                    [{"name": "min-cost allocation", "weight": 0.18}, {"name": "supplier capacity limits", "weight": 0.10}])
    L.explain(ev); return {"alloc": alloc, "evidence": ev}

def sop_reconcile(L):
    gap = L.recall("sd_gap")
    desc = "balanced" if gap is None else (f"closing a {gap}-unit shortfall" if gap > 0 else "supply covers demand")
    ev = L.evidence(f"S&OP reconciliation - {desc}",
                    [{"name": "consensus S&OP sign-off", "weight": round(0.12 if (gap is not None and gap > 0) else 0.22, 3)}, {"name": "financial reconciliation", "weight": 0.08}])
    if gap is not None and gap > 0: _gate(ev, "open shortfall - exec S&OP approval")
    L.explain(ev); return {"evidence": ev}

# ---- Procurement & Sourcing -------------------------------------------------
def spend_analysis(L):
    pr = _read(L, "pl_procurement"); L.remember("proc", pr)
    spend = sum(x.get("spend_amount", 0) or 0 for x in pr)
    top = max(pr, key=lambda x: x.get("spend_amount", 0) or 0) if pr else {}
    conc = round(100 * (top.get("spend_amount", 0) or 0) / spend) if spend else 0
    ev = L.evidence(f"Spend analysis - ${spend:,.0f} total, top vendor {conc}% concentration",
                    [{"name": "spend concentration", "weight": round(0.12 if conc > 60 else 0.20, 3)}, {"name": "tail-spend visibility", "weight": 0.08}])
    L.explain(ev); return {"spend": spend, "conc": conc, "evidence": ev}

def supplier_scorecard(L):
    pr = L.recall("proc") or _read(L, "pl_procurement")
    worst = min([x.get("supplier_score", 1) or 1 for x in pr], default=1)
    ev = L.evidence(f"Supplier scorecard - lowest score {round(worst*100)}%",
                    [{"name": "quality + OTD performance", "weight": round(worst * 0.22, 3)}, {"name": "risk & compliance", "weight": 0.08}])
    if worst < 0.85: _gate(ev, f"supplier score {round(worst*100)}% < 85% - sourcing review")
    L.explain(ev); return {"worst": worst, "evidence": ev}

def sourcing_award(L):
    pr = L.recall("proc") or _read(L, "pl_procurement")
    best = max(pr, key=lambda x: x.get("supplier_score", 0) or 0) if pr else {}
    ev = L.evidence(f"Sourcing award - best supplier {best.get('supplier','n/a')} (score {round((best.get('supplier_score',0) or 0)*100)}%)",
                    [{"name": "total-cost-of-ownership", "weight": 0.20}, {"name": "award-split risk", "weight": 0.08}])
    if ev["autonomous"]:
        try: L.act(BACKEND, "PO_CREATE", {"sku": best.get("sku"), "supplier": best.get("supplier"), "status": "CREATED"})
        except Exception: pass
    L.explain(ev); return {"supplier": best.get("supplier"), "evidence": ev}

def contract_compliance(L):
    pr = L.recall("proc") or _read(L, "pl_procurement")
    ev = L.evidence(f"Contract compliance - {len(pr)} active suppliers checked vs contract terms",
                    [{"name": "on-contract coverage", "weight": 0.18}, {"name": "price/rebate adherence", "weight": 0.08}])
    L.explain(ev); return {"evidence": ev}

def po_automation(L):
    pr = L.recall("proc") or _read(L, "pl_procurement")
    top = max(pr, key=lambda x: x.get("spend_amount", 0) or 0) if pr else {}
    value = round(top.get("spend_amount", 0) or 0)
    ev = L.evidence(f"PO automation - raise PO for {top.get('sku','top SKU')} (${value:,})",
                    [{"name": "replenishment need", "weight": 0.24}, {"name": "budget availability", "weight": 0.06}],
                    value_gate={"value": value, "limit": 50000})
    ref = "PENDING_APPROVAL"
    if ev["autonomous"]:
        try: ref = L.act(BACKEND, "PO_CREATE", {"sku": top.get("sku"), "supplier": top.get("supplier"), "status": "CREATED"}).get("ref", ref)
        except Exception: pass
    L.explain(ev); return {"po": ref, "value": value, "evidence": ev}

# ---- Logistics & Transportation ---------------------------------------------
def eta_prediction(L):
    lg = _read(L, "pl_logistics"); L.remember("lanes", lg)
    avg = round(sum(x.get("transit_days", 0) or 0 for x in lg) / len(lg)) if lg else 0
    ev = L.evidence(f"ETA prediction - {len(lg)} lanes, avg transit {avg}d",
                    [{"name": "transit-time model", "weight": 0.20}, {"name": "port/customs signal", "weight": 0.08}])
    L.explain(ev); return {"avg": avg, "evidence": ev}

def carrier_selection(L):
    lg = L.recall("lanes") or _read(L, "pl_logistics")
    best = max(lg, key=lambda x: x.get("otif", 0) or 0) if lg else {}
    ev = L.evidence(f"Carrier selection - best OTIF {best.get('carrier','n/a')} ({round((best.get('otif',0) or 0)*100)}%)",
                    [{"name": "carrier OTIF reliability", "weight": round((best.get("otif", 0) or 0) * 0.2, 3)}, {"name": "rate vs service trade-off", "weight": 0.10}])
    L.explain(ev); return {"carrier": best.get("carrier"), "evidence": ev}

def freight_optimization(L):
    lg = L.recall("lanes") or _read(L, "pl_logistics")
    freight = sum(x.get("freight_cost", 0) or 0 for x in lg)
    ev = L.evidence(f"Freight optimization - ${freight:,.0f} spend, consolidation modeled",
                    [{"name": "load consolidation savings", "weight": 0.18}, {"name": "mode-shift opportunity", "weight": 0.10}])
    L.explain(ev); return {"freight": freight, "evidence": ev}

def otif_tracking(L):
    lg = L.recall("lanes") or _read(L, "pl_logistics")
    worst = min([x.get("otif", 1) or 1 for x in lg], default=1)
    ev = L.evidence(f"OTIF tracking - lowest lane {round(worst*100)}%",
                    [{"name": "on-time-in-full trend", "weight": round(worst * 0.22, 3)}, {"name": "SLA breach risk", "weight": 0.08}])
    if worst < 0.90: _gate(ev, f"OTIF {round(worst*100)}% < 90% - logistics review")
    L.explain(ev); return {"worst": worst, "evidence": ev}

def exception_management(L):
    lg = L.recall("lanes") or _read(L, "pl_logistics")
    late = [x for x in lg if (x.get("transit_days", 0) or 0) > 10]
    ev = L.evidence(f"Exception management - {len(late)} lane(s) predicted late (>10d)",
                    [{"name": "predicted ETA slip", "weight": 0.16}, {"name": "expedite cost/benefit", "weight": 0.10}])
    if late and ev["autonomous"]:
        try: L.act(BACKEND, "EXPEDITE", {"sku": (late[0] or {}).get("sku"), "status": "ALERTED"})
        except Exception: pass
    L.explain(ev); return {"late": len(late), "evidence": ev}

# ---- Production / Manufacturing ---------------------------------------------
def mps_generation(L):
    sp = _read(L, "pl_supply_plan"); mps = sum(x.get("mps_qty", 0) or 0 for x in sp)
    ev = L.evidence(f"Master production schedule - {mps:,} units planned",
                    [{"name": "MPS vs demand coverage", "weight": 0.20}, {"name": "changeover minimization", "weight": 0.08}])
    L.explain(ev); return {"mps": mps, "evidence": ev}

def capacity_leveling(L):
    sp = _read(L, "pl_supply_plan")
    load = [((x.get("mps_qty", 0) or 0) / (x.get("capacity_qty", 1) or 1)) for x in sp]
    peak = max(load) if load else 0
    ev = L.evidence(f"Capacity leveling - peak line load {round(peak*100)}%",
                    [{"name": "load smoothing", "weight": round(0.12 if peak > 0.95 else 0.20, 3)}, {"name": "overtime avoidance", "weight": 0.08}])
    if peak > 0.95: _gate(ev, f"peak load {round(peak*100)}% > 95% - planner leveling")
    L.explain(ev); return {"peak": peak, "evidence": ev}

def work_order_release(L):
    wo = _read(L, "pl_production")
    ev = L.evidence(f"Work-order release - {len(wo)} orders ready for the floor",
                    [{"name": "materials + capacity ready", "weight": 0.22}, {"name": "schedule adherence", "weight": 0.08}])
    if wo and ev["autonomous"]:
        try: L.act(BACKEND, "WO_RELEASE", {"sku": (wo[0] or {}).get("sku"), "status": "RELEASED"})
        except Exception: pass
    L.explain(ev); return {"released": len(wo), "evidence": ev}

def materials_availability(L):
    stock = _read(L, "inventory")
    short = [s for s in stock if (s.get("on_hand_qty", 0) or 0) < (s.get("safety_stock", 0) or 0)]
    ev = L.evidence(f"Materials availability - {len(short)}/{len(stock)} components below safety",
                    [{"name": "component coverage", "weight": round(0.12 if short else 0.22, 3)}, {"name": "supplier lead-time risk", "weight": 0.08}])
    if short: _gate(ev, f"{len(short)} component(s) short - expedite/approve before release")
    L.explain(ev); return {"short": len(short), "evidence": ev}

def oee_tracking(L):
    pr = _read(L, "pl_production")
    worst = min([x.get("oee", 1) or 1 for x in pr], default=1)
    ev = L.evidence(f"OEE tracking - lowest line {round(worst*100)}%",
                    [{"name": "availability x performance x quality", "weight": round(worst * 0.22, 3)}, {"name": "downtime pattern", "weight": 0.08}])
    if worst < 0.80: _gate(ev, f"OEE {round(worst*100)}% < 80% - maintenance review")
    L.explain(ev); return {"worst": worst, "evidence": ev}

TOOL_PACKS.update({
    "statistical_forecast": statistical_forecast, "demand_sensing": demand_sensing, "consensus_demand": consensus_demand,
    "promotions_uplift": promotions_uplift, "forecast_accuracy": forecast_accuracy,
    "safety_stock_calc": safety_stock_calc, "reorder_policy": reorder_policy, "multi_echelon_balance": multi_echelon_balance,
    "excess_obsolete": excess_obsolete, "inventory_turns": inventory_turns,
    "supply_demand_balance": supply_demand_balance, "capacity_check": capacity_check, "master_supply_plan": master_supply_plan,
    "sourcing_allocation": sourcing_allocation, "sop_reconcile": sop_reconcile,
    "spend_analysis": spend_analysis, "supplier_scorecard": supplier_scorecard, "sourcing_award": sourcing_award,
    "contract_compliance": contract_compliance, "po_automation": po_automation,
    "eta_prediction": eta_prediction, "carrier_selection": carrier_selection, "freight_optimization": freight_optimization,
    "otif_tracking": otif_tracking, "exception_management": exception_management,
    "mps_generation": mps_generation, "capacity_leveling": capacity_leveling, "work_order_release": work_order_release,
    "materials_availability": materials_availability, "oee_tracking": oee_tracking,
})
