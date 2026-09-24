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
The SEVEN SHARED LAYERS — implemented once, reused by every capability.

L1 Perception     read any system into canonical concepts (via the ontology)
L2 Memory         unified episodic + semantic store shared across capabilities
L3 Reasoning      decompose a goal into sub-tasks (LLM in prod; policy here)
L4 Evidence       confidence + attribution + uncertainty + counterfactual
L5 Action         universal write bus (canonical intent -> native call)
L6 Collaboration  A2A pub/sub (topics, not point-to-point)
L7 Explainability plain-English rationale + full audit trail

This is the 90%-shared substrate. Domain logic lives only in the tool packs.
"""
from __future__ import annotations
import time
from .ontology import OntologyMapper


class Layers:
    def __init__(self, systems: dict, mapper: OntologyMapper):
        self.systems = systems            # {system_key: adapter}
        self.mapper = mapper
        self.memory = {}
        self.last_system = None
        self.touched_systems = set()
        self.context_switches = 0
        self.actions = 0
        self.evidence_log = []
        self.audit_trail = []
        self.trace = []
        L = ["Perception", "Memory", "Reasoning", "Evidence", "Action", "Collaboration", "Explainability"]
        self.activity = {n: {"n": 0, "ms": 0.0, "last": ""} for n in L}

    def _hit(self, layer, sample="", ms=0.0):
        a = self.activity[layer]; a["n"] += 1; a["ms"] += ms
        if sample:
            a["last"] = sample

    def _switch(self, system_key):
        self.touched_systems.add(system_key)
        if self.last_system and self.last_system != system_key:
            self.context_switches += 1
            self.trace.append(("Context", f"switch {self.last_system} -> {system_key} (absorbed by ontology)"))
        self.last_system = system_key

    # L1 -----------------------------------------------------------------
    def perceive(self, system_key, entity, filter=None):
        t = time.perf_counter()
        self._switch(system_key)
        adapter = self.systems[system_key]
        native_rows = adapter.query(entity, filter or {})
        canonical = [self.mapper.to_canonical(adapter.system, r) for r in native_rows]
        self._hit("Perception", f"read {entity} from {system_key} -> {len(canonical)} canonical rows",
                  (time.perf_counter() - t) * 1000)
        self.trace.append(("Perception", f"read {entity} from {system_key} ({len(canonical)} rows)"))
        return canonical

    # L2 -----------------------------------------------------------------
    def remember(self, key, value):
        t = time.perf_counter(); self.memory[key] = value
        self._hit("Memory", f"store '{key}'", (time.perf_counter() - t) * 1000)

    def recall(self, key):
        t = time.perf_counter(); v = self.memory.get(key)
        self._hit("Memory", f"recall '{key}'", (time.perf_counter() - t) * 1000)
        return v

    # L3 -----------------------------------------------------------------
    def reason(self, goal):
        t = time.perf_counter(); plan = goal["plan"]
        self._hit("Reasoning", f"decomposed into {len(plan)} sub-tasks: " + ", ".join(s['capability'] for s in plan),
                  (time.perf_counter() - t) * 1000)
        self.trace.append(("Reasoning", f"decomposed '{goal['name']}' into {len(plan)} sub-tasks"))
        return plan

    # L4 -----------------------------------------------------------------
    def evidence(self, decision, drivers, value_gate=None):
        t = time.perf_counter()
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
        # optional value-based human-in-the-loop gate
        if value_gate is not None:
            over = value_gate["value"] > value_gate["limit"]
            ev["gate"] = (f"value ${value_gate['value']:,} > ${value_gate['limit']:,} approval limit"
                          if over else "within approval limit")
            if over:
                ev["autonomous"] = False
        ev["counterfactual"] = ("A lower-value / higher-confidence case would execute autonomously."
                                if not ev["autonomous"] else
                                "If confidence fell below 85% or value exceeded the limit, this would route to a human.")
        self.evidence_log.append(ev)
        self._hit("Evidence", f"{decision} -> conf {ev['confidence']} ({'auto' if ev['autonomous'] else 'human'})",
                  (time.perf_counter() - t) * 1000)
        self.trace.append(("Evidence", f"{decision} conf {ev['confidence']}"))
        return ev

    # L5 -----------------------------------------------------------------
    def act(self, system_key, op, canonical_payload):
        t = time.perf_counter()
        self._switch(system_key)
        adapter = self.systems[system_key]
        native = {}
        for concept, val in canonical_payload.items():
            f = self.mapper.field_for(adapter.system, concept)
            native[f or concept] = val
        res = adapter.write(op, native)
        self.actions += 1
        self.audit_trail.append({"ts": __import__("datetime").datetime.utcnow().isoformat(timespec="seconds"),
                                 "system": system_key, "op": op, "ref": res.get("ref"),
                                 "status": res.get("status"), "sku": canonical_payload.get("sku")})
        self._hit("Action", f"{op} on {system_key} -> {res.get('status')}", (time.perf_counter() - t) * 1000)
        self.trace.append(("Action", f"{op} on {system_key} -> {res.get('status')}"))
        return res

    # L6 -----------------------------------------------------------------
    def collaborate(self, topic, frm):
        t = time.perf_counter()
        self._hit("Collaboration", f"{frm} -> topic '{topic}'", (time.perf_counter() - t) * 1000)
        self.trace.append(("A2A", f"{frm} -> topic:{topic}"))

    # L7 -----------------------------------------------------------------
    def explain(self, ev):
        t = time.perf_counter()
        top = max(ev["attribution"], key=lambda d: d["share"]) if ev["attribution"] else {"name": "n/a", "share": 0}
        if ev["autonomous"]:
            tail = "Executed autonomously (confidence >=85% and within policy)."
        elif ev.get("gate", "").find(">") >= 0:
            tail = f"Routed to a human approver - {ev['gate']}."
        else:
            tail = "Routed to a human approver (confidence below 85%)."
        text = (f"{ev['decision']}. Confidence {round(ev['confidence']*100)}% ({ev['uncertainty']}). "
                f"Primary driver: {top['name']} ({round(top['share']*100)}% of the decision). " + tail)
        ev["explanation"] = text
        # PROD HOOK: set MISTRAL_API_KEY and call sa.llm.narrate(ev) here for a model-written rationale.
        self._hit("Explainability", text, (time.perf_counter() - t) * 1000)
        self.trace.append(("Explainability", text))
        return text
