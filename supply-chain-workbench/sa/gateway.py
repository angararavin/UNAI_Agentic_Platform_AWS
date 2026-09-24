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
UNAI AI Gateway — one key, many models.

Instead of holding a separate API key for every model/provider, UNAI talks to a
single gateway endpoint with ONE key; the gateway fans out to many providers and
models. This works with any OpenAI-compatible gateway — OpenRouter, LiteLLM
(open-source), TrueFoundry AI Gateway, Portkey — or Amazon Bedrock.

Benefits the gateway gives UNAI:
  • one credential to manage + rotate (not N per-model keys)
  • policy-based ROUTING: cheap/fast model for the 80% hot path, premium model
    for hard reasoning  -> direct token & cost savings
  • response CACHING for repeated calls
  • per-call token + cost accounting (feeds observability)

Offline by default (deterministic mock); set GATEWAY_BASE_URL + GATEWAY_API_KEY
to call a real OpenAI-compatible gateway. Cost numbers are ILLUSTRATIVE — set
your contracted rates in MODEL_CATALOG.
"""
from __future__ import annotations
import os, hashlib

# model -> {provider, tier, $ per 1M input tokens, $ per 1M output tokens}  (illustrative)
MODEL_CATALOG = {
    "mistral-small-latest":  {"provider": "mistral",    "tier": "hot",     "in": 0.20, "out": 0.60},
    "mistral-large-latest":  {"provider": "mistral",    "tier": "premium", "in": 2.00, "out": 6.00},
    "gpt-4o-mini":           {"provider": "openai",     "tier": "hot",     "in": 0.15, "out": 0.60},
    "claude-haiku":          {"provider": "anthropic",  "tier": "hot",     "in": 0.25, "out": 1.25},
    "claude-sonnet":         {"provider": "anthropic",  "tier": "premium", "in": 3.00, "out": 15.00},
    "bedrock-nova-lite":     {"provider": "bedrock",    "tier": "hot",     "in": 0.06, "out": 0.24},
}
# routing policy: task kind -> model tier
POLICY = {"hot": "mistral-small-latest", "premium": "mistral-large-latest"}

# any OpenAI-compatible gateway exposes ONE base_url + ONE key for ALL models below:
GATEWAYS = {
    "openrouter":  "https://openrouter.ai/api/v1",
    "litellm":     "http://litellm:4000/v1",          # self-hosted OSS proxy
    "truefoundry": "https://<org>.truefoundry.com/api/llm/v1",
    "portkey":     "https://api.portkey.ai/v1",
    "bedrock":     "(AWS SDK — bedrock-runtime; IAM, no API key)",
}

_est_tokens = lambda s: max(1, len(s or "") // 4)   # ~4 chars/token


class GatewayClient:
    def __init__(self, base_url=None, api_key=None, policy=None):
        # ONE credential for ALL models (gateway holds the per-provider keys)
        self.base_url = base_url or os.environ.get("GATEWAY_BASE_URL")
        self.api_key = api_key or os.environ.get("GATEWAY_API_KEY")
        self.policy = policy or POLICY
        self.cache = {}
        self.calls, self.tokens_in, self.tokens_out, self.cost, self.cache_hits = 0, 0, 0, 0.0, 0

    def _model_for(self, kind):
        return self.policy.get(kind, self.policy["hot"])

    def _price(self, model, tin, tout):
        m = MODEL_CATALOG[model]
        return (tin / 1e6) * m["in"] + (tout / 1e6) * m["out"]

    def complete(self, prompt, kind="hot", max_tokens=120):
        """Return {text, model, tokens_in, tokens_out, cost, cached}."""
        model = self._model_for(kind)
        key = hashlib.sha1((model + "|" + prompt).encode()).hexdigest()
        if key in self.cache:
            self.cache_hits += 1
            return {**self.cache[key], "cached": True}
        tin = _est_tokens(prompt)
        if self.base_url and self.api_key:
            text, tout = self._call_real(model, prompt, max_tokens)   # one key, any model
        else:
            text = f"[mock:{model}] " + prompt[:60]                   # offline deterministic
            tout = min(max_tokens, _est_tokens(text))
        cost = self._price(model, tin, tout)
        self.calls += 1; self.tokens_in += tin; self.tokens_out += tout; self.cost += cost
        res = {"text": text, "model": model, "tokens_in": tin, "tokens_out": tout, "cost": round(cost, 6), "cached": False}
        self.cache[key] = res
        return res

    def _call_real(self, model, prompt, max_tokens):
        # OpenAI-compatible: same call shape for OpenRouter / LiteLLM / TrueFoundry / Portkey
        import urllib.request, json
        body = json.dumps({"model": model, "messages": [{"role": "user", "content": prompt}],
                           "max_tokens": max_tokens, "temperature": 0.2}).encode()
        req = urllib.request.Request(self.base_url.rstrip("/") + "/chat/completions", data=body,
              headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.loads(r.read())
        text = data["choices"][0]["message"]["content"]
        tout = (data.get("usage") or {}).get("completion_tokens", _est_tokens(text))
        return text, tout

    def stats(self):
        return {"calls": self.calls, "tokens_in": self.tokens_in, "tokens_out": self.tokens_out,
                "total_tokens": self.tokens_in + self.tokens_out, "cost_usd": round(self.cost, 5),
                "cache_hits": self.cache_hits}
