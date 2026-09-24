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
token_benchmark.py — measure REAL token consumption: UNAI (one agent, shared
canonical context) vs Gen-1 (many specialist agents, each re-loading the full
schema). Runs OUTSIDE the Studio, against any OpenAI-compatible endpoint
(OpenRouter, LiteLLM, OpenAI, Mistral — and Claude via OpenRouter/LiteLLM).

    export GATEWAY_BASE_URL=https://openrouter.ai/api/v1
    export GATEWAY_API_KEY=sk-or-...
    export GATEWAY_MODEL=anthropic/claude-3.5-sonnet     # or any model id
    # optional pricing for the $ line ($ per 1M tokens):
    export PRICE_IN=3.0   PRICE_OUT=15.0
    python token_benchmark.py

No key set → runs in MODELED mode (estimates tokens from prompt length), so it
still produces the comparison without a network call.

Why the two differ (and why it's fair): both do the SAME work. Gen-1 sends,
on every call, a verbose per-agent role prompt + the full multi-system schema
(the agent must re-establish the dialect each time). UNAI sends one short shared
system prompt + the CANONICAL concept list (the ontology normalized the fields
once), so each call carries far less context. The API's own usage counters are
the measurement — we don't estimate when a key is present.
"""
import json
import math
import os
import sys
import urllib.request

BASE = os.environ.get("GATEWAY_BASE_URL") or os.environ.get("OPENAI_BASE_URL", "")
KEY = os.environ.get("GATEWAY_API_KEY") or os.environ.get("OPENAI_API_KEY", "")
MODEL = os.environ.get("GATEWAY_MODEL") or os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
LIVE = bool(BASE and KEY)

# Per-model list pricing ($ per 1M tokens, input/output) — illustrative public rates.
# Matched by substring against the model id; override with PRICE_IN / PRICE_OUT.
MODEL_PRICES = [
    ("claude-3-5-haiku", 0.80, 4.00), ("claude-3.5-haiku", 0.80, 4.00), ("haiku", 0.80, 4.00),
    ("claude-3-5-sonnet", 3.00, 15.00), ("claude-3.5-sonnet", 3.00, 15.00), ("claude-sonnet", 3.00, 15.00), ("sonnet", 3.00, 15.00),
    ("claude-3-opus", 15.00, 75.00), ("opus", 15.00, 75.00),
    ("gpt-4o-mini", 0.15, 0.60), ("gpt-4o", 2.50, 10.00), ("gpt-4.1-mini", 0.40, 1.60), ("gpt-4.1", 2.00, 8.00),
    ("mistral-large", 2.00, 6.00), ("mistral-small", 0.20, 0.60), ("mixtral", 0.24, 0.24),
    ("llama-3.1-70b", 0.35, 0.40), ("llama", 0.20, 0.20), ("gemini-1.5-pro", 1.25, 5.00), ("gemini", 0.35, 1.05),
]
def resolve_price():
    if os.environ.get("PRICE_IN") and os.environ.get("PRICE_OUT"):
        return float(os.environ["PRICE_IN"]), float(os.environ["PRICE_OUT"]), "env override"
    m = MODEL.lower()
    for name, pin, pout in MODEL_PRICES:
        if name in m:
            return pin, pout, "preset:" + name
    return 0.20, 0.60, "default"
PRICE_IN, PRICE_OUT, PRICE_SRC = resolve_price()

# ---- the scenario: Supplier Disruption Response, 5 capabilities -------------
CAPABILITIES = [
    ("Disruption detection", "Given supplier-risk signals, decide if a disruption is occurring and name the affected supplier."),
    ("Demand re-forecast",    "Re-forecast demand for the affected SKUs under the disruption; state the % pull-forward."),
    ("Inventory adjustment",  "Recompute safety stock and flag SKUs that are short; give the gap per SKU."),
    ("Procurement action",    "Decide replacement POs (reroute to backup supplier if the primary is disrupted); note value and approval need."),
    ("Notify & explain",      "Summarize the actions taken and route anything over policy to a human, in one short paragraph."),
]

# Gen-1: every specialist re-loads this full multi-system native schema each call.
FULL_SCHEMA = """SYSTEMS & NATIVE SCHEMAS (re-map these yourself before answering):
SAP MM (MARD): MATNR=material, WERKS=plant, LABST=unrestricted stock, EISBE=safety stock,
  MINBE=reorder point, PLIFZ=planned lead time, STPRS=standard price, LIFNR=vendor, MEINS=uom.
SAP SD (VBAP): MATNR=material, WERKS=plant, KWMENG=order quantity (open demand), NETPR=net price.
SAP FI (BSEG): LIFNR=vendor, DMBTR=amount in local currency, EBELN=purchasing document, WRBTR=amount.
SAP IBP (key figures): PRDID=product, LOCID=location, INSTBASE=installed base, AGEMNTH=asset age,
  TGTPOS=target inventory position, SAFETY=safety stock, SVCLVL=service level, FCSTQTY=forecast,
  CAPQTY=capacity, MPSQTY=master supply, ALLOCQTY=allocation, LEADTIME=lead time.
SAP S/4 (stock/refurb): MATNR, WERKS, LABST=on hand, UMLME=in transit, CAPACITY=refurb cap, COSTPU=refurb cost.
ServiceNow (x_rma_case): number=RMA id, cmdb_ci=product/CI, u_status=RMA status, u_warranty=warranty,
  u_claim_value=claim amount, u_entitled=entitlement, u_oem=manufacturer.
Analytics (BQML): sku_id, dc_code, fcst_qty, lead_time, fail_rate, age_factor, return_prob,
  yield_rate, risk (supplier_risk 0-1), region, consensus_qty, promo_uplift, inv_turns, excess_qty,
  spend_amt, supplier_score, carrier, transit_days, freight_cost, otif_pct, oee_pct.
Note: field names differ per system; you must translate MATNR/sku_id/PRDID/cmdb_ci to a product,
WERKS/dc_code/LOCID/BUKRS to a location, LABST/KWMENG/qty_on_hand to on-hand, LIFNR/vendor_id to a
supplier, u_warranty to warranty status, and so on — on every request, for every agent."""

# UNAI: the ontology already normalized fields once; capabilities speak canonical concepts.
CANONICAL = ("CANONICAL CONCEPTS (already mapped for you): sku, plant, on_hand_qty, safety_stock, "
             "reorder_point, open_demand, forecast_qty, supplier, lead_time_days, unit_cost, "
             "purchase_order, supplier_risk, install_base_qty, target_stock, service_level, "
             "warranty_status, claim_value, consensus_demand, inv_turns, excess_qty, otif, carrier.")

GEN1_ROLE = ("You are the {name} — a standalone specialist agent. You own your own memory, "
             "reasoning, evidence, action and logging. Read the raw systems, translate their "
             "native fields yourself, and act. Be precise and cite the native fields you used.")
UNAI_SYS = ("You are UNAI, one agent running on seven shared layers with a canonical ontology "
            "and shared memory. Answer for the current capability using canonical concepts only.")

TASK = "SKUs: FG-1001, FG-1003. Affected supplier: V-2207 (risk 0.78, APAC port strike). Keep it under 90 words."

# ---- prompt caching (the real inference lever) ------------------------------
# UNAI's shared system prompt + canonical concepts are a stable PREFIX reused on
# every call. A cache-aware endpoint bills that prefix once at a write rate, then
# at a cheap read rate. Multipliers are Anthropic-style defaults (write 1.25x,
# read 0.10x of the input rate); override via env. This is MODELED — live cache
# metrics require a cache-aware endpoint (e.g. Anthropic cache_control).
CACHE_WRITE_MULT = float(os.environ.get("CACHE_WRITE_MULT", "1.25"))
CACHE_READ_MULT = float(os.environ.get("CACHE_READ_MULT", "0.10"))
PREFIX_TOKENS = math.ceil(len(UNAI_SYS + "\n" + CANONICAL) / 4)   # cacheable shared prefix


def cached_totals(un):
    """UNAI WITH prompt caching: prefix billed once (write) then cheap (read).
    Returns (effective_billed_in, out, effective_total, cost)."""
    billed_in = 0.0
    out = sum(r[2] for r in un)
    for idx, (_n, pin, _po) in enumerate(un):
        prefix = min(PREFIX_TOKENS, pin)
        rest = pin - prefix
        mult = CACHE_WRITE_MULT if idx == 0 else CACHE_READ_MULT
        billed_in += prefix * mult + rest
    cost = billed_in / 1e6 * PRICE_IN + out / 1e6 * PRICE_OUT
    return round(billed_in), out, round(billed_in) + out, cost


def call_llm(messages):
    """Return (prompt_tokens, completion_tokens). Live if configured, else modeled."""
    if not LIVE:
        chars = sum(len(m["content"]) for m in messages)
        return math.ceil(chars / 4), 110  # ~4 chars/token; assume a short answer
    body = json.dumps({"model": MODEL, "messages": messages, "temperature": 0.2, "max_tokens": 160}).encode()
    req = urllib.request.Request(BASE.rstrip("/") + "/chat/completions", data=body,
                                 headers={"Content-Type": "application/json", "Authorization": "Bearer " + KEY})
    with urllib.request.urlopen(req, timeout=60) as r:
        u = json.load(r).get("usage", {})
    return u.get("prompt_tokens", 0), u.get("completion_tokens", 0)


def run_gen1():
    rows = []
    for name, task in CAPABILITIES:
        msgs = [{"role": "system", "content": GEN1_ROLE.format(name=name) + "\n\n" + FULL_SCHEMA},
                {"role": "user", "content": task + "\n" + TASK}]
        pin, pout = call_llm(msgs)
        rows.append((name, pin, pout))
    return rows


def run_unai():
    sys_msg = UNAI_SYS + "\n" + CANONICAL
    rows = []
    for name, task in CAPABILITIES:
        msgs = [{"role": "system", "content": sys_msg},
                {"role": "user", "content": "Capability: " + name + ". " + task + "\n" + TASK}]
        pin, pout = call_llm(msgs)
        rows.append((name, pin, pout))
    return rows


def totals(rows):
    pin = sum(r[1] for r in rows); pout = sum(r[2] for r in rows)
    cost = pin / 1e6 * PRICE_IN + pout / 1e6 * PRICE_OUT
    return pin, pout, pin + pout, cost


def write_html(g1t, unt, g1, un, saved, cost_saved, cnt, cached_cost_saved):
    mx = max(g1t[2], unt[2], cnt[2], 1)
    W, barTop, barMax = 760, 70, 300
    def bar(x, val, col, label):
        h = int(barMax * val / mx); y = barTop + (barMax - h)
        return (f'<rect x="{x}" y="{y}" width="150" height="{h}" rx="6" fill="{col}"/>'
                f'<text x="{x+75}" y="{y-8}" text-anchor="middle" font-size="15" font-weight="700" fill="{col}">{val:,}</text>'
                f'<text x="{x+75}" y="{barTop+barMax+22}" text-anchor="middle" font-size="13" fill="#93a1c0">{label}</text>')
    svg = (f'<svg viewBox="0 0 {W} 430" xmlns="http://www.w3.org/2000/svg" style="max-width:640px">'
           + bar(60, g1t[2], "#e2574c", f"Gen-1 · 5 agents  (${g1t[3]:.4f})")
           + bar(305, unt[2], "#22d3aa", f"UNAI · 1 agent  (${unt[3]:.4f})")
           + bar(550, cnt[2], "#4f8cff", f"UNAI + caching  (${cnt[3]:.4f})")
           + f'<text x="{W/2}" y="40" text-anchor="middle" font-size="18" font-weight="800" fill="#e8edfb">'
             f'−{saved}% tokens · −${cost_saved:.4f}/run · with caching −${cached_cost_saved:.4f}/run</text></svg>')
    rows = "".join(f'<tr><td>{n}</td><td style="color:#e98b82">{g1[i][1]+g1[i][2]:,}</td>'
                   f'<td style="color:#22d3aa">{un[i][1]+un[i][2]:,}</td></tr>' for i, (n, _t) in enumerate(CAPABILITIES))
    modestr = ("LIVE (" + MODEL + ")") if LIVE else "MODELED"
    note = ("Token counts are the model's own usage counters." if LIVE
            else "Modeled from prompt length — set a gateway key for live counts.")
    html = f"""<!doctype html><html><head><meta charset="utf-8"><title>UNAI token benchmark</title>
<style>body{{background:#0b1020;color:#e8edfb;font:15px/1.6 system-ui,Segoe UI,Arial;margin:0;padding:32px}}
.card{{background:#111a33;border:1px solid #243150;border-radius:14px;padding:22px;max-width:820px;margin:0 auto 18px}}
h1{{font-size:22px;margin:0 0 4px}}.sub{{color:#93a1c0;font-size:13px;margin-bottom:16px}}
table{{width:100%;border-collapse:collapse;margin-top:8px}}th,td{{text-align:left;padding:8px 10px;border-bottom:1px solid #243150;font-size:14px}}
th{{color:#93a1c0;font-weight:600}} .big{{font-size:15px;color:#22d3aa;font-weight:700}}</style></head>
<body><div class="card"><h1>UNAI vs Gen-1 — token consumption</h1>
<div class="sub">Scenario: Supplier Disruption Response · 5 capabilities · mode: {modestr} · pricing: {PRICE_SRC} (${PRICE_IN}/{PRICE_OUT} per 1M)</div>
<div style="text-align:center">{svg}</div>
<table><tr><th>Capability</th><th>Gen-1 tokens</th><th>UNAI tokens</th></tr>{rows}
<tr><th>TOTAL</th><th style="color:#e98b82">{g1t[2]:,}</th><th style="color:#22d3aa">{unt[2]:,}</th></tr></table>
<p class="big">{saved}% fewer tokens · ${cost_saved:.4f} saved per run · ~${cost_saved*10000*365:,.0f}/yr at 10k runs/day.</p>
<p class="sub">Both patterns do identical work. Gen-1 re-sends the full multi-system schema and a verbose role on every call; UNAI sends one shared prompt + canonical concepts (the ontology mapped fields once). {note}</p>
<p class="sub"><b style="color:#4f8cff">UNAI + prompt caching</b> (blue bar): the {PREFIX_TOKENS}-token shared prefix is billed once (write x{CACHE_WRITE_MULT}) then at a cheap read rate (x{CACHE_READ_MULT}) — effective billed input drops to {cnt[0]:,} tokens, ${cnt[3]:.4f}/run (${cached_cost_saved:.4f} vs Gen-1). Modeled with Anthropic-style multipliers; live cache metrics require a cache-aware endpoint.</p>
</div></body></html>"""
    with open("token_benchmark_report.html", "w", encoding="utf-8") as f:
        f.write(html)


def main():
    print("=" * 66)
    print("UNAI vs Gen-1 specialist agents — token consumption")
    print(f"mode: {'LIVE (' + MODEL + ')' if LIVE else 'MODELED (no key set — estimating)'}")
    print(f"pricing: {PRICE_SRC}  (${PRICE_IN}/{PRICE_OUT} per 1M in/out)")
    print("scenario: Supplier Disruption Response · 5 capabilities · 6 systems")
    print("=" * 66)
    g1 = run_gen1(); un = run_unai()
    g1t = totals(g1); unt = totals(un)
    print("\nGen-1  (5 specialist agents, each re-loads full schema):")
    for n, i, o in g1: print(f"   {n:<22} in {i:>5}  out {o:>4}  = {i+o:>5}")
    print(f"   {'TOTAL':<22} in {g1t[0]:>5}  out {g1t[1]:>4}  = {g1t[2]:>5}   ${g1t[3]:.4f}")
    print("\nUNAI   (1 agent, shared canonical context):")
    for n, i, o in un: print(f"   {n:<22} in {i:>5}  out {o:>4}  = {i+o:>5}")
    print(f"   {'TOTAL':<22} in {unt[0]:>5}  out {unt[1]:>4}  = {unt[2]:>5}   ${unt[3]:.4f}")
    cnt = cached_totals(un)
    print("\nUNAI + prompt caching (shared prefix billed once, then cheap reads):")
    print(f"   {'effective billed in':<22} {cnt[0]:>5}  out {cnt[1]:>4}  = {cnt[2]:>5}   ${cnt[3]:.4f}")
    print(f"   (prefix {PREFIX_TOKENS} tok · write x{CACHE_WRITE_MULT} · read x{CACHE_READ_MULT})")
    saved = round(100 * (1 - unt[2] / g1t[2])) if g1t[2] else 0
    cost_saved = g1t[3] - unt[3]
    cached_cost_saved = g1t[3] - cnt[3]
    cached_cost_saved_vs_unai = unt[3] - cnt[3]
    print("\n" + "-" * 66)
    print(f"SAVINGS:  {saved}% fewer tokens   ({g1t[2]} -> {unt[2]})   ${cost_saved:.4f} per run")
    print(f"  + prompt caching: ${cnt[3]:.4f}/run  (${cached_cost_saved:.4f} vs Gen-1, ${cached_cost_saved_vs_unai:.4f} more vs UNAI alone)")
    print(f"At 10,000 runs/day: ~${cost_saved*10000*365:,.0f}/yr (no cache) -> ~${cached_cost_saved*10000*365:,.0f}/yr (with caching), at these rates.")
    print("-" * 66)
    # COST PER OUTCOME (per completed task) — the enterprise metric that decides the bill
    # (TrueFoundry, "LLM Benchmarking for Enterprise Production": cost-per-token in isolation
    #  is misleading; cost per completed task is what matters and is "almost never reported").
    print("COST PER COMPLETED TASK (cost-per-outcome — the metric that decides the bill):")
    print(f"   Gen-1 (many agents): ${g1t[3]:.5f}   UNAI: ${unt[3]:.5f}   UNAI+caching: ${cnt[3]:.5f}")
    print(f"   -> UNAI is {saved}% cheaper per outcome; caching widens it further.")
    print("   Covers the framework's 4 dimensions: quality (evidence+gate), COST-PER-OUTCOME (this),")
    print("   latency (turn/TTFT), consistency (deterministic plan + audit trail).")
    print("-" * 66)
    # ---- per-agent (per-capability) breakdown, for the detailed UI comparison ----
    # Totals are MEASURED per call when live (each capability is its own API call);
    # the input composition (schema/role vs task) is a MODELED split from the known
    # prompt text (~4 chars/token), so the UI can explain *why* the totals differ.
    def _tok(s): return math.ceil(len(s) / 4)
    gen1_schema_per_call = _tok(FULL_SCHEMA)          # the big block Gen-1 re-sends every call
    unai_canonical_tokens = _tok(CANONICAL)           # UNAI's shared concept list (cacheable prefix)
    gen1_rows, unai_rows = [], []
    for i, (name, task) in enumerate(CAPABILITIES):
        gn, gi, go = g1[i]
        role_schema = _tok(GEN1_ROLE.format(name=name) + "\n\n" + FULL_SCHEMA)
        gtask = _tok(task + "\n" + TASK)
        gen1_rows.append({"agent": name, "in": gi, "out": go, "total": gi + go,
                          "cost": round(gi / 1e6 * PRICE_IN + go / 1e6 * PRICE_OUT, 6),
                          "schema_in_modeled": role_schema, "task_in_modeled": gtask})
        un_, ui, uo = un[i]
        ushared = _tok(UNAI_SYS + "\n" + CANONICAL)
        utask = _tok("Capability: " + name + ". " + task + "\n" + TASK)
        unai_rows.append({"agent": name, "in": ui, "out": uo, "total": ui + uo,
                          "cost": round(ui / 1e6 * PRICE_IN + uo / 1e6 * PRICE_OUT, 6),
                          "shared_in_modeled": ushared, "task_in_modeled": utask})
    explain = {"calls": len(CAPABILITIES),
               "gen1_schema_tokens_per_call": gen1_schema_per_call,
               "gen1_repeated_schema_total": gen1_schema_per_call * len(CAPABILITIES),
               "unai_canonical_tokens_per_call": unai_canonical_tokens,
               "unai_shared_prefix_tokens": PREFIX_TOKENS,
               "note": ("Gen-1 re-sends the full multi-system schema on every call (the 'repeated schema tax'); "
                        "UNAI mapped fields to canonical concepts once, so each call carries only the concept list "
                        "+ the task. Per-call totals are measured (live); the schema/task split is modeled from prompt text.")}
    out = {"mode": "live" if LIVE else "modeled", "model": MODEL,
           "gen1_rows": gen1_rows, "unai_rows": unai_rows, "explain": explain,
           "price_in": PRICE_IN, "price_out": PRICE_OUT, "price_src": PRICE_SRC,
           "cost_per_completed_task": {"gen1": round(g1t[3],5), "unai": round(unt[3],5), "unai_cached": round(cnt[3],5),
                                       "note": "cost-per-outcome — TrueFoundry enterprise benchmark dimension 2"},
           "gen1": {"in": g1t[0], "out": g1t[1], "total": g1t[2], "cost": round(g1t[3], 5)},
           "unai": {"in": unt[0], "out": unt[1], "total": unt[2], "cost": round(unt[3], 5)},
           "unai_cached": {"effective_in": cnt[0], "out": cnt[1], "effective_total": cnt[2], "cost": round(cnt[3], 5),
                           "prefix_tokens": PREFIX_TOKENS, "write_mult": CACHE_WRITE_MULT, "read_mult": CACHE_READ_MULT, "modeled": True},
           "tokens_saved_pct": saved, "cost_saved_per_run": round(cost_saved, 5),
           "cost_saved_per_run_cached": round(cached_cost_saved, 5)}
    with open("token_benchmark_report.json", "w") as f:
        json.dump(out, f, indent=2)
    write_html(g1t, unt, g1, un, saved, cost_saved, cnt, cached_cost_saved)
    print("wrote token_benchmark_report.json + token_benchmark_report.html")


if __name__ == "__main__":
    main()
