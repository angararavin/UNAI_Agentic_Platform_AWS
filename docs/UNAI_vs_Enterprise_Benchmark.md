<!--
  UNAI - Universal Supply-Chain Agent (Cognitive Runtime)
  Copyright (c) 2026 Ravin Angara / Bristlecone. All rights reserved.
  PROPRIETARY & CONFIDENTIAL. See LICENSE.  [UNAI-COPYRIGHT v1]
-->

# UNAI vs the enterprise LLM‑benchmark framework

**Source:** TrueFoundry — *"LLM Benchmarking for Enterprise Production: How to Evaluate Models for Your Actual Use Case"* (updated May 2026).
**Why it matters for the pitch:** if someone challenges the token claim with "what about the benchmarks?", this is the honest, strong answer.

## The one thing to say first
That article is an **evaluation framework, not a token leaderboard** — it publishes **no** head‑to‑head token numbers to beat. Its central argument is that public benchmarks (MMLU, HumanEval) don't predict production, and the metric that actually decides the enterprise bill — **cost‑per‑outcome (tokens per *completed task*, not per token)** — is *"almost never reported."* **That is precisely the metric UNAI is built to reduce.** So we don't claim to "beat a benchmark"; we claim to win the dimension the framework says matters most, and we prove it on the provider's own usage counters.

## The four dimensions — and UNAI's position

| Dimension (from the framework) | UNAI's position |
|---|---|
| **1 · Output quality** (task‑specific rubric / judge, run blind) | Every decision emits an evidence object (confidence, attribution, uncertainty, counterfactual) + a governance gate. Rubric‑/judge‑ready; agentic quality measured at the **outcome** level, which the framework recommends. |
| **2 · Cost per outcome** (tokens per completed task; include cache) | **UNAI's structural edge.** Shared cognition is paid **once per goal**, not once per specialist → **~53–80% fewer tokens per completed task** (demo), additive with prompt caching. This is the framework's "most important, least reported" metric. `token_benchmark.py` now prints **cost per completed task** for Gen‑1 vs UNAI vs UNAI+caching. |
| **3 · Latency under load** (P50/P95/P99 · TTFT · ITL · TPOT) | Turn latency tracked today; **fewer LLM calls per task** lowers tail latency and TPOT. TTFT + percentiles are wired when a streaming gateway is connected (marked ○ in the app's observability). |
| **4 · Consistency & reliability** (variance across runs, failure modes) | Deterministic plan + governance gates + **circuit‑breaker** on loops/max‑steps + **one audit trail → replay/compensation**. Failure‑mode behavior is drawn explicitly in the Architecture tab. |

## Positioning: UNAI is complementary to a gateway, not competing with one
TrueFoundry's product is an **AI gateway** (routing, semantic cache, A/B tests, cost tracking, auto‑rollback). UNAI operates one layer up — it **reduces the tokens a task needs in the first place**. They **compound**: run UNAI *through* an OpenAI‑compatible gateway and you get UNAI's per‑task token cut **plus** the gateway's caching/routing savings. This is a partnership story, not a bake‑off.

## How to prove it live (their own recommended method)
The framework says the most reliable signal is **cost‑per‑outcome on your real workload**, measured on the provider's usage counters. `token_benchmark.py` does exactly that — point it at any OpenAI‑compatible endpoint and it reports Gen‑1 vs UNAI vs UNAI+caching using the API's own `prompt_tokens` / `completion_tokens`. Run it in the room.

## Honest caveats (say them before you're asked)
- No public number is being "beaten" — this is a framework, and our in‑app percentages are **modeled** until a gateway is connected.
- Cost‑per‑outcome savings are **workload‑dependent** (~53–80% here); a single‑capability task saves little; only the *repeated* overhead shrinks.
- Latency/quality on *your* data must be validated with a production A/B test (the framework's gold standard), which the gateway makes easy.
