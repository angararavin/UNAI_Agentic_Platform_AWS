# UNAI AI Gateway — token economizer (reference stub)

A small, zero-dependency proxy that sits **between apps you control and the Claude API** and
controls token spend. Point any OpenAI-compatible client at it (`base_url = http://localhost:8790/v1`).

> **Scope, honestly.** This governs traffic from apps *you* control. You **cannot** insert it
> between Anthropic's **Claude Desktop** app and the models — that client talks straight to
> Anthropic and is billed under your subscription. The supported way to influence Claude Desktop
> is the opposite direction: expose an **MCP server** it can call for compact, pre-distilled
> context. This gateway is for your own chat UIs, internal tools, IDE plugins, and services.

## What it does (the control features)

Per request, in order:

1. **Budget / quota** — a daily token cap (`DAILY_TOKEN_BUDGET`); over it, requests are refused (HTTP 429).
2. **Response cache** — exact-match cache keyed on model+system+user. A repeat returns the cached
   answer with **zero** model tokens.
3. **Model routing** — simple asks → a cheap model (Haiku); long or "analyze/plan/reason" asks → a
   larger model (Sonnet). Override per request with `"model"`.
4. **Prompt caching** — the shared system prompt is marked cacheable, so Claude bills cache **reads
   at 0.1× (90% off)**.
5. **Meter** — tokens in/out, cache reads, cost, and **savings vs a naive baseline** (same tokens,
   full rate, complex model, no cache). Dashboard at `/`, JSON at `/stats`.

## Run it

```bash
cd unai-gateway
node gateway.js                 # MODELED mode — no key, runs offline
# → dashboard http://localhost:8790/   ·   stats http://localhost:8790/stats
```

Live (measured) mode — forwards to the real Claude API:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export ROUTE_SIMPLE_MODEL=claude-haiku-4-5-20251001
export ROUTE_COMPLEX_MODEL=claude-sonnet-5     # use a valid current model id
export DAILY_TOKEN_BUDGET=2000000              # optional
node gateway.js
```

Send a request (OpenAI-compatible):

```bash
curl -s localhost:8790/v1/chat/completions -H 'content-type: application/json' -d '{
  "model":"auto",
  "messages":[{"role":"system","content":"You are a supply-chain assistant."},
              {"role":"user","content":"Summarize today’s open POs."}]
}'
# repeat the exact call → served from cache, 0 tokens
```

## Configuration

| Env | Default | Meaning |
|---|---|---|
| `PORT` | 8790 | Listen port |
| `ANTHROPIC_API_KEY` | — | Set to forward to Claude (else modeled mock) |
| `ROUTE_SIMPLE_MODEL` | claude-haiku-4-5-20251001 | Cheap model for simple asks |
| `ROUTE_COMPLEX_MODEL` | claude-sonnet-5 | Model for heavy reasoning |
| `DAILY_TOKEN_BUDGET` | 0 (∞) | Daily token cap; over it → 429 |
| `CACHE_TTL_MS` | 600000 | Response-cache TTL |

## How it reuses the existing platform

This is the same idea as `unai-app/llm.js` (native Claude adapter + `cache_control` prompt caching
+ router order) generalized into a standalone gateway with response caching, budgets and a meter.
In a full build it would fold into UNAI's governance (spend caps, RBAC, audit) and observability.

## Honest limits

- Savings come from **reuse and volume** — cached prefixes, repeated queries, trimmable context.
  A genuinely novel one-off prompt mostly gets routing + observability, not big savings.
- Prompt caching only discounts the **reused prefix** within its window (5 min, or 1 hr); reasoning
  and output tokens still bill in full each call.
- Prices in `gateway.js` are illustrative list rates — set real ones for your account.
