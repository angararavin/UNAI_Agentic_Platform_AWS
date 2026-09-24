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
Semantic Auto-Mapper — automatic ontology induction (Perception bootstrap / L0).

Today the ontology is hand-authored. This module lets UNAI *auto-recognize* a
source schema and propose its mapping to the canonical concepts, with a
confidence score, a rationale, and human-in-the-loop gating — so onboarding a
new system (SAP, Oracle, Databricks, Snowflake, Salesforce, MS Fabric, Adobe)
becomes "connect → review → go" instead of hand-coding a dictionary.

Inputs per column (sourced from a platform's CATALOG, which is the accelerator):
    {"name": <native field>, "dtype": <type>, "samples": [...], "comment": <glossary>}

Strategy (offline, deterministic — no API key needed):
  1. KNOWN-FIELD index   — every native field already in the ontology maps instantly.
  2. SYNONYM / token match — business synonyms ("material","item" -> sku).
  3. VALUE-PROFILE heuristics — currency-looking -> unit_cost, YYYY-MM -> period, etc.
Confidence >= 0.85 auto-accepts; below that routes to a human review queue.

PROD HOOK: with a Mistral/Claude key, replace `_llm_propose` to send the column
metadata + samples and return {concept, confidence, rationale} — the control
flow here is identical. Catalog metadata (Unity Catalog, Snowflake Horizon,
Salesforce Describe, SAP CDS annotations, Purview, Adobe XDM) makes the LLM
proposal far more accurate; XDM is already canonical (near-direct crosswalk).
"""
from __future__ import annotations
import re
from .ontology import ONTOLOGY, SYSTEMS, ALIASES

# canonical concept -> business synonyms / tokens (beyond the native names in ONTOLOGY)
SYNONYMS = {
    "sku": ["sku", "material", "item", "product", "matnr", "prod", "article", "partno", "part_no"],
    "product_name": ["name", "description", "desc", "maktx", "productname"],
    "category": ["category", "type", "group", "mtart", "family"],
    "location": ["location", "plant", "dc", "warehouse", "wh", "site", "werks", "facility", "store"],
    "region": ["region", "geo", "area", "zone"],
    "supplier": ["supplier", "vendor", "lifnr", "shipper", "seller"],
    "on_hand_qty": ["onhand", "on_hand", "stock", "qty_on_hand", "labst", "available", "units_avail", "inventory"],
    "in_transit_qty": ["in_transit", "intransit", "transit", "trame"],
    "safety_stock": ["safety", "safety_stock", "safetystk", "eisbe", "buffer"],
    "reorder_point": ["reorder", "rop", "minbe", "min_stock"],
    "lead_time_days": ["lead_time", "leadtime", "plifz", "lt_days"],
    "unit_cost": ["unit_cost", "cost", "price", "unitprice", "unit_prc", "stprs", "dmbtr"],
    "sales_qty": ["sales", "sold", "kwmeng", "demand_qty", "order_qty"],
    "forecast_qty": ["forecast", "fcst", "yhat", "predicted", "demand_plan"],
    "supplier_risk": ["risk", "risk_score", "supplier_risk"],
    "purchase_order": ["po", "purchase_order", "ebeln", "po_id", "ponum"],
    "shipment_id": ["shipment", "tracking", "vbeln", "asn", "tracking_no"],
    "carrier": ["carrier", "tdlnr", "scac"],
    "eta_days": ["eta", "eta_days", "arrival"],
    "period": ["period", "month", "spmon", "yearmonth", "fiscal_period"],
}

_norm = lambda s: re.sub(r"[^a-z0-9]+", "", (s or "").lower())

def _known_index():
    idx = {}
    for concept, m in ONTOLOGY.items():
        for sysname in SYSTEMS:
            f = m.get(sysname)
            if f:
                idx[_norm(f)] = concept
    for concept, names in ALIASES.items():
        for n in names:
            idx[_norm(n)] = concept
    return idx
KNOWN = _known_index()

def _value_profile(samples):
    vals = [s for s in (samples or []) if s not in (None, "")]
    if not vals:
        return None
    s0 = str(vals[0])
    if re.fullmatch(r"\d{4}-\d{2}", s0):
        return "period"
    if all(re.fullmatch(r"-?\d+(\.\d+)?", str(v)) for v in vals):
        flo = [float(v) for v in vals]
        if any("." in str(v) for v in vals) and max(flo) < 100000:
            return "unit_cost"        # decimal money-ish
        return "on_hand_qty"          # integer quantity-ish
    return None

def _propose(col):
    name, samples, comment = col.get("name", ""), col.get("samples"), col.get("comment", "")
    n = _norm(name)
    # 1. known native field (already in the ontology) -> instant, high confidence
    if n in KNOWN:
        return KNOWN[n], 0.98, f"native field '{name}' is already in the ontology"
    # 2. synonym / token match — tiered: exact name > substring in name > in comment
    cn = _norm(comment)
    best = None  # (confidence, concept, rationale)
    for concept, toks in SYNONYMS.items():
        for t in toks:
            tn = _norm(t)
            if not tn:
                continue
            if tn == n:
                return concept, 0.92, f"column name matches '{t}' -> {concept}"
            if tn in n and len(tn) >= 3:
                cand = (0.86, concept, f"name contains '{t}' -> {concept}")
            elif tn in cn and len(tn) >= 3:
                cand = (0.80, concept, f"comment matches '{t}' -> {concept}")
            else:
                continue
            if best is None or cand[0] > best[0]:
                best = cand
    if best:
        return best[1], best[0], best[2]
    # 3. value-profile heuristic
    vp = _value_profile(samples)
    if vp:
        return vp, 0.66, f"value profile of samples suggests {vp}"
    return None, 0.0, "no confident match — needs a human mapping"

def auto_map(schema, threshold=0.85):
    """schema: list of column dicts. Returns mappings + a summary."""
    out = []
    for col in schema:
        concept, conf, why = _propose(col)
        out.append({
            "column": col.get("name"),
            "concept": concept,
            "confidence": round(conf, 2),
            "auto_accepted": bool(concept) and conf >= threshold,
            "needs_review": (not concept) or conf < threshold,
            "rationale": why,
        })
    mapped = [m for m in out if m["concept"]]
    auto = [m for m in out if m["auto_accepted"]]
    return {
        "mappings": out,
        "summary": {
            "columns": len(out),
            "mapped": len(mapped),
            "auto_accepted": len(auto),
            "needs_review": len(out) - len(auto),
            "coverage_pct": round(100 * len(mapped) / len(out)) if out else 0,
            "auto_pct": round(100 * len(auto) / len(out)) if out else 0,
        },
    }
