"""
UNAI Conversion Kit — the shared seven-layer runtime, extracted as a
domain-agnostic engine.

This file is the "build once" half of every UNAI conversion. Any converted
app (RMA triage, SAP SDLC document generation, the next one) wires its own
small toolpack of functions to these primitives; this file never changes per
app and carries zero vendor/domain assumptions — no SAP fields, no BigQuery,
no specific LLM SDK.

L1 Perception     read/receive whatever context this run needs
L2 Memory         store/recall values during a run
L3 Reasoning      decide a plan / decompose a goal into steps
L4 Evidence       confidence + attribution + uncertainty + a value-based gate
L5 Action         write a result somewhere (file, DB, response)
L6 Collaboration  route between steps / topics
L7 Explainability the ONLY layer that may call a real model. `narrate_fn` is
                  injected per app (real Gemini call for SDLC docs, a real
                  Mistral call for supply-chain, a deterministic template
                  when nothing is configured) — this file has no idea which.
"""
from __future__ import annotations
import time
from typing import Any, Callable, Optional

LAYER_NAMES = ["Perception", "Memory", "Reasoning", "Evidence", "Action", "Collaboration", "Explainability"]


class Layers:
    def __init__(self):
        self.memory: dict = {}
        self.activity = {n: {"n": 0, "ms": 0.0, "last": ""} for n in LAYER_NAMES}
        self.evidence_log: list = []
        self.audit_trail: list = []
        self.trace: list = []

    def _hit(self, layer: str, sample: str = "", ms: float = 0.0):
        a = self.activity[layer]
        a["n"] += 1
        a["ms"] += ms
        if sample:
            a["last"] = sample

    # L1 -----------------------------------------------------------------
    def perceive(self, read_fn: Callable, *args, **kwargs):
        """read_fn does the actual read (file, cache, API) — this just times/logs it."""
        t = time.perf_counter()
        result = read_fn(*args, **kwargs)
        name = getattr(read_fn, "__name__", "read")
        self._hit("Perception", f"read via {name}", (time.perf_counter() - t) * 1000)
        self.trace.append(("Perception", name))
        return result

    # L2 -----------------------------------------------------------------
    def remember(self, key: str, value: Any):
        t = time.perf_counter()
        self.memory[key] = value
        self._hit("Memory", f"store '{key}'", (time.perf_counter() - t) * 1000)

    def recall(self, key: str, default: Any = None):
        t = time.perf_counter()
        v = self.memory.get(key, default)
        self._hit("Memory", f"recall '{key}'", (time.perf_counter() - t) * 1000)
        return v

    # L3 -----------------------------------------------------------------
    def reason(self, plan_fn: Callable, *args, **kwargs):
        t = time.perf_counter()
        plan = plan_fn(*args, **kwargs)
        name = getattr(plan_fn, "__name__", "plan")
        self._hit("Reasoning", f"planned via {name}", (time.perf_counter() - t) * 1000)
        self.trace.append(("Reasoning", name))
        return plan

    # L4 -----------------------------------------------------------------
    def evidence(self, decision: str, drivers: list, value_gate: Optional[dict] = None) -> dict:
        BASE = 0.60
        raw = BASE + sum(d["weight"] for d in drivers)
        conf = min(0.99, raw)
        total = sum(d["weight"] for d in drivers) or 1
        scale = (conf - BASE) / (raw - BASE or 1)
        ev = {
            "decision": decision,
            "confidence": round(conf, 2),
            "base": BASE,
            "waterfall": {"base": BASE,
                          "steps": [{"name": d["name"], "contribution": round(d["weight"] * scale, 3)} for d in drivers],
                          "final": round(conf, 2)},
            "attribution": [{"name": d["name"], "share": round(d["weight"] / total, 2)} for d in drivers],
            "uncertainty": f"+/-{round((1 - conf) * 100)}%",
            "threshold": 0.85,
            "autonomous": conf >= 0.85,
        }
        if value_gate is not None:
            over = value_gate["value"] > value_gate["limit"]
            ev["gate"] = (f"value {value_gate['value']} > {value_gate['limit']} limit" if over else "within limit")
            if over:
                ev["autonomous"] = False
        self.evidence_log.append(ev)
        self._hit("Evidence", f"{decision} -> conf {ev['confidence']}", 0.0)
        self.trace.append(("Evidence", f"{decision} conf {ev['confidence']}"))
        return ev

    # L5 -----------------------------------------------------------------
    def act(self, write_fn: Callable, *args, **kwargs):
        t = time.perf_counter()
        result = write_fn(*args, **kwargs)
        name = getattr(write_fn, "__name__", "write")
        self.audit_trail.append({"ts": time.time(), "op": name})
        self._hit("Action", f"wrote via {name}", (time.perf_counter() - t) * 1000)
        self.trace.append(("Action", name))
        return result

    # L6 -----------------------------------------------------------------
    def collaborate(self, topic: str, frm: str = "orchestrator"):
        self._hit("Collaboration", f"{frm} -> topic '{topic}'", 0.0)
        self.trace.append(("Collaboration", topic))

    # L7 -----------------------------------------------------------------
    def explain(self, decision_name: str, narrate_fn: Optional[Callable] = None, *args, **kwargs):
        """narrate_fn is the app's REAL model call, injected by the adapter.
        Must return (text: str, telemetry: dict) where telemetry may include
        tokensIn/tokensOut/latencyMs — real numbers when narrate_fn is real,
        omitted entirely when it isn't. Falls back to a plain label when no
        narrate_fn is configured, matching the rest of this app's convention
        of degrading to a template rather than failing."""
        t = time.perf_counter()
        if narrate_fn is None:
            text, telem = f"[{decision_name}] — no live model configured", {}
        else:
            text, telem = narrate_fn(*args, **kwargs)
        ms = (time.perf_counter() - t) * 1000
        self._hit("Explainability", decision_name, ms)
        self.trace.append(("Explainability", decision_name))
        return text, telem

    # ---- generic instrumentation --------------------------------------------
    def step(self, layer: str, fn: Callable, *args, **kwargs):
        """For adapter calls that don't cleanly fit one of the 6 named
        signatures above (e.g. reusing an app's existing node function
        unchanged) — same timing/logging, any callable, any return shape."""
        t = time.perf_counter()
        result = fn(*args, **kwargs)
        name = getattr(fn, "__name__", "step")
        self._hit(layer, name, (time.perf_counter() - t) * 1000)
        self.trace.append((layer, name))
        return result

    # ---- summary -----------------------------------------------------------
    def token_totals(self) -> dict:
        """Sums whatever real telemetry explain() calls actually returned —
        zero assumption about which layers spend tokens; it's whatever the
        adapter's narrate_fn reported."""
        return getattr(self, "_token_totals", {"calls": 0, "tokensIn": 0, "tokensOut": 0})
