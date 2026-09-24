# UNAI Agent Runner

Run any of the **33 UNAI supply-chain use-case agents** on your own machine or in the cloud.
Input your LLM key, pick an agent, and see **UNAI's token usage** and the **savings vs a first-gen
many-agent build** — per use case.

> The agents are declarative manifests that run on the **UNAI shared cognitive runtime** (the seven
> layers + canonical ontology), not 33 separate programs. This runner *is* that runtime plus the
> 33 agent manifests (in `agents/`).

## Run locally

```
cd unai-agent-runner
node server.js            # no npm install needed — zero dependencies
```

Open **http://localhost:8080**. Then:

1. Paste an **LLM key** (Mistral, or any OpenAI-compatible key) and click **Use key** — used for this
   session only, never written to disk. (Leave blank to run **modeled** — savings still shown.)
2. Pick an **agent** (33 use cases, grouped by SAP IBP module).
3. Click **Run agent**.

You'll see: **UNAI tokens / run** (real & measured when a key is connected), **Gen-1 many-agent tokens**
(modeled baseline), **% fewer tokens**, estimated cost, decisions & autonomy rate, and the per-decision
confidence bars (0.60 prior → evidence → 0.85 autonomy line).

### Use a key without the UI
```
export MISTRAL_API_KEY=sk-...        # or GATEWAY_API_KEY + GATEWAY_BASE_URL + GATEWAY_MODEL
node server.js
```

## Run in the cloud

It's a single zero-dependency Node service — deploy the container anywhere (in-tenant):

```
docker build -t unai-agent-runner .
docker run -p 8080:8080 -e GATEWAY_API_KEY=... unai-agent-runner
```

Works on Google Cloud Run, AWS ECS/Fargate, Azure Container Apps, Kubernetes (EKS/GKE/AKS),
Snowflake SPCS, or a Databricks App — same image, secrets from the platform's secret manager.

## What's real vs modeled

- **Real (measured):** UNAI's token counts when an LLM key is connected (the provider's own usage counters).
- **Modeled:** the Gen-1 many-agent baseline and the savings %, computed from a transparent token model.
- Agent counts (33 use cases across 20 domains) and the domain steps are real; revenue/market figures
  elsewhere in the UNAI collateral are illustrative — validate before external use.

## Files
- `server.js` — the runner (serves the UI + `/api/run`, `/api/set-key`).
- `engine.js`, `cognition.js`, `llm.js` — the UNAI shared runtime + domain library + LLM router.
- `agents/*.json` — the 33 downloadable agent manifests (one per use case) + `_index.json`.
- `public/index.html` — the local UI.

*Proprietary & Confidential — Bristlecone.*
