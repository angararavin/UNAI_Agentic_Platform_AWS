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
UNAI telemetry — OpenTelemetry-native observability.

Emits a span per layer/operation plus GenAI metrics (tokens, cost, latency,
confidence, autonomy). If the OpenTelemetry SDK is installed it exports real OTLP
spans (to any OTEL collector → Grafana/Tempo, Datadog, Honeycomb, Langfuse,
Arize Phoenix, TrueFoundry); otherwise it falls back to an in-memory/JSON
exporter so it always runs.
"""
from __future__ import annotations
import time, json, contextlib

try:
    from opentelemetry import trace as _otel_trace        # real OTEL if present
    _HAVE_OTEL = True
except Exception:
    _HAVE_OTEL = False

# GenAI semantic-convention-style attribute keys
ATTR = {"model": "gen_ai.request.model", "tin": "gen_ai.usage.input_tokens",
        "tout": "gen_ai.usage.output_tokens", "cost": "gen_ai.usage.cost_usd",
        "conf": "unai.decision.confidence", "auto": "unai.decision.autonomous"}

EXPORTERS = {  # documented targets; OTLP endpoint covers most
    "otel_collector": "OTLP gRPC/HTTP → Grafana Tempo, Datadog, Honeycomb",
    "langfuse": "LLM tracing/eval (OTEL or SDK)",
    "arize_phoenix": "LLM observability (OTEL)",
    "truefoundry": "LLM gateway + observability",
}


class Tracer:
    def __init__(self, service="unai"):
        self.service = service
        self.spans = []
        self.metrics = {"calls": 0, "tokens_in": 0, "tokens_out": 0, "cost_usd": 0.0,
                        "decisions": 0, "autonomous": 0}
        self._otel = _otel_trace.get_tracer(service) if _HAVE_OTEL else None

    @contextlib.contextmanager
    def span(self, name, attrs=None):
        attrs = attrs or {}
        t0 = time.perf_counter()
        otel_cm = self._otel.start_as_current_span(name) if self._otel else contextlib.nullcontext()
        with otel_cm as os_span:
            try:
                yield
            finally:
                ms = round((time.perf_counter() - t0) * 1000, 3)
                rec = {"name": name, "ms": ms, "attrs": attrs}
                self.spans.append(rec)
                if os_span is not None:
                    for k, v in attrs.items():
                        os_span.set_attribute(k, v)

    def record_llm(self, model, tin, tout, cost):
        self.metrics["calls"] += 1; self.metrics["tokens_in"] += tin
        self.metrics["tokens_out"] += tout; self.metrics["cost_usd"] += cost

    def record_decision(self, autonomous):
        self.metrics["decisions"] += 1
        self.metrics["autonomous"] += 1 if autonomous else 0

    def export(self, exporter="otel_collector"):
        self.metrics["cost_usd"] = round(self.metrics["cost_usd"], 5)
        payload = {"service": self.service, "exporter": exporter,
                   "otel_sdk_present": _HAVE_OTEL, "spans": self.spans, "metrics": self.metrics}
        return payload

    def to_json(self):
        return json.dumps(self.export(), indent=2)
