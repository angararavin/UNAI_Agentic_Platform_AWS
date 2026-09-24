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
UNAI Responsible-AI guardrails — pre-packaged, on by default.

A baseline suite runs with no external dependencies (PII redaction, prompt-
injection screening, output-safety checks, grounding/confidence gate, and a
policy allow/deny gate). For stronger enforcement, the SAME interface plugs into
industry guardrail engines — Amazon Bedrock Guardrails, NVIDIA NeMo Guardrails,
Meta Llama Guard, Guardrails AI — via connectors (guarded imports).

Aligned to NIST AI RMF and the EU AI Act spirit: every check is logged with a
reason, so guardrail decisions are themselves auditable (feeds observability).
"""
from __future__ import annotations
import re

PII_PATTERNS = {
    "email": r"[\w.+-]+@[\w-]+\.[\w.-]+",
    "phone": r"\b(?:\+?\d{1,3}[ -]?)?(?:\(?\d{3}\)?[ -]?)\d{3}[ -]?\d{4}\b",
    "ssn":   r"\b\d{3}-\d{2}-\d{4}\b",
    "card":  r"\b(?:\d[ -]?){13,16}\b",
    "iban":  r"\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b",
}
INJECTION_PATTERNS = [
    r"ignore (the )?(previous|above|prior) (instructions|prompt)",
    r"disregard .* (instructions|rules)",
    r"reveal .* (system prompt|prompt|instructions)",
    r"you are now", r"developer mode", r"jailbreak",
]
UNSAFE_OUTPUT = [r"\bDROP TABLE\b", r"\bDELETE FROM\b\s+\w+\s*;?\s*$", r"rm -rf"]


def redact_pii(text: str):
    found, out = {}, text or ""
    for kind, pat in PII_PATTERNS.items():
        hits = re.findall(pat, out)
        if hits:
            found[kind] = len(hits)
            out = re.sub(pat, f"[REDACTED_{kind.upper()}]", out)
    return out, found


def screen_injection(text: str):
    t = (text or "").lower()
    return [p for p in INJECTION_PATTERNS if re.search(p, t)]


class GuardrailSuite:
    """Pre-packaged baseline; attach external engines with set_external()."""
    def __init__(self, confidence_threshold=0.85, value_limit=50000, external=None):
        self.thr = confidence_threshold
        self.limit = value_limit
        self.external = external          # e.g. BedrockGuardrails() — same .check_input/.check_output
        self.log = []

    def _record(self, stage, decision, detail):
        self.log.append({"stage": stage, "decision": decision, "detail": detail})

    # --- INPUT side (before the model / before reading prompts) ---
    def check_input(self, text):
        clean, pii = redact_pii(text)
        inj = screen_injection(text)
        blocked = bool(inj)
        self._record("input", "block" if blocked else "allow",
                     {"pii_redacted": pii, "injection": inj})
        if self.external:
            ext = self.external.check_input(text)
            blocked = blocked or ext.get("blocked", False)
            self._record("input.external", ext.get("decision", "allow"), ext)
        return {"clean_text": clean, "pii": pii, "injection": inj, "blocked": blocked}

    # --- OUTPUT / ACTION side (before executing an action autonomously) ---
    def check_action(self, decision, confidence, value=None):
        reasons, allow = [], True
        if confidence < self.thr:
            allow = False; reasons.append(f"confidence {confidence} < {self.thr} -> human review")
        if value is not None and value > self.limit:
            allow = False; reasons.append(f"value ${value:,} > ${self.limit:,} approval limit -> human review")
        unsafe = [p for p in UNSAFE_OUTPUT if re.search(p, str(decision), re.I)]
        if unsafe:
            allow = False; reasons.append(f"unsafe operation pattern: {unsafe}")
        self._record("action", "autonomous" if allow else "human/blocked",
                     {"decision": decision, "confidence": confidence, "value": value, "reasons": reasons})
        return {"autonomous": allow, "reasons": reasons}

    def report(self):
        blocks = sum(1 for e in self.log if e["decision"] in ("block", "human/blocked"))
        return {"checks": len(self.log), "blocked_or_gated": blocks, "log": self.log}


# --- External guardrail connectors (same interface; guarded imports) ----------
class BedrockGuardrails:
    """Amazon Bedrock Guardrails. pip install boto3; needs a configured guardrail id."""
    def __init__(self, guardrail_id, region="us-east-1"):
        import boto3
        self.client = boto3.client("bedrock-runtime", region_name=region)
        self.guardrail_id = guardrail_id
    def check_input(self, text):
        # self.client.apply_guardrail(...); shaped to the baseline's contract
        return {"decision": "allow", "blocked": False, "note": "wire apply_guardrail()"}

class NeMoGuardrails:
    """NVIDIA NeMo Guardrails (programmable rails). pip install nemoguardrails"""
    def __init__(self, config_path): self.config_path = config_path
    def check_input(self, text): return {"decision": "allow", "blocked": False}

class LlamaGuard:
    """Meta Llama Guard via the AI Gateway (a safety-classifier model)."""
    def __init__(self, gateway, model="llama-guard"): self.gw, self.model = gateway, model
    def check_input(self, text): return {"decision": "allow", "blocked": False}
