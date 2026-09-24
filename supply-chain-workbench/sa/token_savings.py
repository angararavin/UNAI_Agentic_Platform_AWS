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
Token-economics estimator — how UNAI saves tokens (and $) vs the many-agent way.

Where the savings come from:
  1. ONE shared system prompt instead of one per specialist agent.
  2. ONE canonical-ontology context instead of each agent re-loading every
     system's schema on every call (the big one).
  3. Lightweight tool packs instead of full per-agent tool definitions.
  4. Gateway ROUTING: the cheap/fast model for the 80% hot path.
  5. Response caching for repeated calls.

All per-call token figures are TRANSPARENT ASSUMPTIONS (tune to your prompts).
Costs use sa.gateway.MODEL_CATALOG (illustrative).
"""
from __future__ import annotations
from .gateway import MODEL_CATALOG
from .orchestrator import USE_CASES, GEN1_AGENTS

# --- assumptions (tokens) ---
SYS_PROMPT   = 700    # agent system/identity prompt
SCHEMA_CTX   = 1200   # schema/context the agent must carry, PER system it reads
TOOL_DEFS_G1 = 500    # full tool/function definitions per agent
ONTOLOGY_CTX = 900    # ONE canonical context (Gen-2) — replaces per-agent schema
TOOLPACK_G2  = 130    # lightweight tool-pack definition per capability
TASK_TOK     = 300    # the actual task content per call
OUT_TOK      = 250    # output tokens per decision

# systems each capability reads (drives Gen-1 schema reloading)
CAP_SYSTEMS = {"demand_forecast": 2, "inventory_optimize": 2, "supplier_risk": 1, "logistics_eta": 2}
G1_MODEL = "mistral-large-latest"   # Gen-1: premium model for everything
G2_HOT   = "mistral-small-latest"   # Gen-2: hot path
G2_PREM  = "mistral-large-latest"   # Gen-2: premium for ~20% of calls

def _cost(model, tin, tout):
    m = MODEL_CATALOG[model]; return (tin/1e6)*m["in"] + (tout/1e6)*m["out"]

def estimate(capabilities):
    # Gen-1: each capability = its own agent; reloads sys+tools+schema(per system) every call
    g1_in = g1_out = 0
    for c in capabilities:
        g1_in += SYS_PROMPT + TOOL_DEFS_G1 + CAP_SYSTEMS.get(c, 1) * SCHEMA_CTX + TASK_TOK
        g1_out += OUT_TOK
    g1_cost = _cost(G1_MODEL, g1_in, g1_out)

    # Gen-2: ONE shared system prompt + ONE ontology context (amortized once),
    # then only a small tool pack + task per capability; 80% hot / 20% premium
    g2_in = SYS_PROMPT + ONTOLOGY_CTX + sum(TOOLPACK_G2 + TASK_TOK for _ in capabilities)
    g2_out = OUT_TOK * len(capabilities)
    n = len(capabilities); hot = max(0, round(n * 0.8)); prem = n - hot
    # attribute shared input once at hot tier; per-call outputs split hot/premium
    g2_cost = _cost(G2_HOT, g2_in, OUT_TOK*hot) + _cost(G2_PREM, 0, OUT_TOK*prem)

    saved = (g1_in+g1_out) - (g2_in+g2_out)
    return {
        "gen1_tokens": g1_in+g1_out, "gen2_tokens": g2_in+g2_out,
        "saved_tokens": saved, "saved_pct": round(100*saved/(g1_in+g1_out)),
        "gen1_cost": round(g1_cost,5), "gen2_cost": round(g2_cost,5),
        "saved_cost": round(g1_cost-g2_cost,5),
        "cost_saved_pct": round(100*(g1_cost-g2_cost)/g1_cost) if g1_cost else 0,
    }

def table():
    rows = []
    for key, uc in USE_CASES.items():
        caps = [s["capability"] for s in uc["plan"]]
        e = estimate(caps); e["use_case"] = uc["name"]; e["key"] = key; rows.append(e)
    return rows

if __name__ == "__main__":
    print("\n=== UNAI token economics (per run · illustrative assumptions) ===")
    print(f"{'use case':<40}{'Gen-1 tok':>10}{'Gen-2 tok':>10}{'saved':>8}{'$ saved':>10}")
    for r in table():
        print(f"{r['use_case']:<40}{r['gen1_tokens']:>10,}{r['gen2_tokens']:>10,}"
              f"{str(r['saved_pct'])+'%':>8}{('$'+format(r['saved_cost'],'.4f')):>10}")
    print("\nDrivers: one shared system prompt + one ontology context (no per-agent schema reload),"
          "\nlightweight tool packs, hot-path model routing, and response caching.")
