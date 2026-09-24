# UNAI Studio — Changelog

*Bristlecone · Confidential*

## 2026-08-13 — Converted agent: standalone run + in-app Playground

- **Standalone**: verified the converted **NVIDIA Supply-Chain Control Tower** React app (`react-example-unai/`) runs on the UNAI shared runtime — boots on Express+Vite, serves the full UI, and `/api/agents/run` returns real decisions (rma-triage, demand-sensing, …) with a live per-run `unaiTokenComparison`. Made the server **PORT-configurable** (`PORT=4000 npm run dev`) so it runs alongside the UNAI app (:3000), and added a one-command **`run.sh`**.
- **In-app**: added a **Converted Agents Playground** view to the UNAI app (nav under "2 · Build agents"). It embeds the running converted app via an iframe (URL configurable + remembered), with start instructions and the conversion/token-savings context — the clean way to bring a full external React agent into UNAI without rewriting it.

## 2026-08-12 — "How UNAI works" explainer (1-pager, animated, exec-deck appendix)

- **1-pager** (`UNAI_How_It_Works_1pager.png/.pdf/.svg`): the hospital analogy (many stacks → one shared building of seven layers + thin capability packs), the runtime steps, the "how does it know which agents exist?" answer (declared manifests in a catalog), and the payoff (cost scales with value, not agent count). IP-safe.
- **Animated voice-over explainer** (`UNAI_How_It_Works_Video.html`): a ~95s self-contained reel — Für Elise underscore + narration (voice picker; "ooh-nye" pronunciation) walking through old-way → fuse → seven shared layers → thin packs → runtime → catalog-of-manifests → payoff.
- **Exec deck**: added the 1-pager as an **Appendix — How UNAI works** slide in `UNAI_Executive_Leadership_Deck.pptx` (both copies; non-destructive; 28 slides; validated).

## 2026-08-11 — Knowledge Graph: per-agent scoping + human-readable explanation

- **Confirmed and fixed:** the Knowledge Graph previously always showed the *full* canonical ontology even for a single agent, because the Focus picker excluded built (manifest) agents — only predefined use cases could be focused.
- The Focus dropdown now has an **"Agents (built)"** group. Selecting an agent (or use case) draws a **purpose-built subgraph** of just the concepts it uses.
- **Graph is never empty and never over-broad.** Agents whose concepts are all *derived* (e.g. Outlier Correction → forecast_error, corrected_history) now show those concept nodes instead of a blank canvas; use cases added to the engine but not mapped into the cognition layer (e.g. `ocm_change_management`) show a clear "not mapped yet" note + their capability list instead of the whole ontology.
- **Richer, accurate explanation panel** under the graph, distinguishing:
  - **Inputs** the agent reads from systems, with the exact `SYSTEM.field` for each (from the ontology);
  - **Derived** concepts the agent *computes* in its domain step (not raw fields) — previously mislabelled "no system mapping";
  - concepts grouped by domain, and **how they relate** — *mapping* edges (concept → system field) vs *influence* edges (one concept raises/lowers another, from the world model), plus the domain step/formula.
- Root cause documented: the engine's ontology graph carried 48 raw concepts while the cognition layer defines 63 (incl. ~22 derived); the view now reconciles both.

### OCM Change Management — mapped into the cognition layer
- `ocm_change_management` was added to the engine by the other developer but never given canonical concepts. It's now a **first-class cognition use case**: 8 change-management concepts added to the ontology/library (stakeholder influence & support, change readiness, training completion, milestone status, comms coverage, change risk, adoption rate) with `SERVICENOW`/`ANALYTICS` field mappings (matching the `ocm_*` BigQuery tables), plus its needs/module/domain-step and world-model relationships (readiness/training/support raise adoption; change risk lowers it). It now renders a real knowledge graph + explanation (5 concepts: 4 inputs + `change_risk` derived) and appears in the catalog (34 use cases). Applied to both the app and the runner runtime.
- **Runner output card:** added an illustrative `ocm_adoption` sample dataset (adoption signals per stakeholder group) to the runner's analytics store, and wired the OCM agent's `measurement_plan` capability to produce a data-driven "Agent output" — a recommendation ("Prioritize Finance — lowest readiness / highest resistance…"), the records read, and an adoption-rate headline — while keeping OCM's full 10-capability narrative. Runner bundle zip rebuilt.

## 2026-08-10 (part 4) — Multi-bar explainability + KPI caption fix

### Explainability chart
- Reverted the confidence chart from a single cumulative bar back to a **multi-bar waterfall** — prior + one bar per evidence driver → final, against the 0.85 gate. Numbered callouts 1–4 kept with the same legend meanings.

### KPI consistency fix
- The Build & Run "Agents needed : used" tile showed e.g. **8:2** while its caption read "consolidated into 1". The caption and the plain-English explainer now derive the denominator from the actual ratio, so they always match (8:2 → "consolidated into 2").

*Note: after a project-folder loss, the repository was restored from git (which was current through part 3) and these two part-4 fixes were re-applied and verified (Test Buddy 50/50 green). New collateral produced this session — `UNAI_Platform_Extension_Roadmap.pptx` and `UNAI_Platform_Extension_Roadmap_OnePager.pdf` — lives in the project root.*

## 2026-08-09 (part 3) — Glossary info icons, smarter Assistant, Data Assistant fixes

### Info icons for terms under "Prove the value"
- Added a central **glossary** (32 terms — capability pack, shared cognitive runtime, canonical ontology, Gen-1 baseline, agent substitution, tokens/token model, progressive disclosure, confidence waterfall, autonomy threshold/rate, context switching, repeated-schema tax, naive baseline N×S vs S+N, prompt caching, thin executor, ROI/payback, TCO, FinOps, cost-per-outcome, connector, autonomy usage, value anchor, T-shirt tiers, NRR, measured vs modeled, …).
- Each Prove-the-value view (Observability, Gen-1 vs UNAI, Your App vs UNAI, Commercial, Benefits, ROI, FinOps, Pricing) now shows a **"Key terms — hover ⓘ"** strip with detailed hover explanations, drawn from that glossary.

### Assistant can explain any term
- The glossary is merged into the Assistant's knowledge base, so any term question is answerable in-app (with the existing "Refine with AI" option when a model is connected).

### Data Assistant fixes
- **Bug fix:** free-form NL→SQL failed with "llm is not defined" (an undefined variable in `/api/query`); it now resolves the model config correctly.
- **Concept routing:** a conceptual question typed into the Data Assistant (e.g. "what is a capability pack?") is now **answered from the Assistant glossary** instead of being forced through NL→SQL, with a one-click "Open in full Assistant".
- **Collapse fixed:** the Data Assistant drawer now closes via its ×, the **Esc** key, or clicking the **backdrop** outside it.

---

## 2026-08-09 (part 2) — Expert View keeps features; runner shows real consolidation savings

### Expert View — full app, only the help text hidden
- Refined Expert View per feedback: it now keeps **all features, panels and confidence/waterfall bars** (the Explainability & evidence panel is no longer hidden). Only the **metric-explaining help text** is removed — the "?" explainer boxes and the "How to read it" tutorial/reference (`body.expertmode` hides `.explainer`, `.howref`, `#howReadRef` only, not `.detailonly`).

### Runner — each use case runs as a team of agents
- Each of the 33 use cases now executes as the **team of specialist agents a first-gen build would need** (domain modeling + retrieval + mapping + validation + action), consolidated onto one shared runtime. Team size scales with the use case's concept count (3–5 agents), so the **token savings are meaningful and vary by use case** (≈50–64% vs a first-gen build) instead of the near-zero/negative delta a single-capability run showed.
- **Coherent token KPIs:** the savings % now compares **modeled UNAI vs modeled Gen-1** on the same basis (no more mixing a measured UNAI number against a modeled Gen-1 baseline). When a key is connected, the **measured live tokens** (the shared runtime's explainability calls, from the provider's counters) are shown on a **separate, clearly-labeled line**. The tiles also name the consolidated agents.

---

## 2026-08-09 — Agent output in the runner + Expert View

### Agent Runner now shows a real result
- Every agent run now renders an **Agent output** card: the **recommendation** it makes, the **method + formula** applied, the **records it read**, a per-record **→ result** column, and a **Produced** headline KPI. Output is built from each use case's *own* concepts and computed with its own logic, so every one of the 33 agents returns a distinct, use-case-specific result (e.g. safety stock via z·σ·√LT, spares demand via install_base·failure_rate·age_factor, net requirements, promo-adjusted demand, allocated spend, CO2e). Badged **illustrative sample data** — a key still makes the token counts real; connecting a warehouse makes the data real.
- Threaded through `/api/run`; runner UI renders it above the decision cards. Downloadable zip + per-agent bundles rebuilt.

### "Public view" renamed to "Expert View" — full app minus explainability
- The second role is now **Expert View** (login toggle, tags, `unai_role=expert`, `EXPERT_PASSWORD`; legacy `PUBLIC_PASSWORD` still accepted).
- Behaviour changed: Expert View is now the **same app as Admin with all navigation/views intact** — only the detailed **explainability surfaces** (`.explainer`, `.detailonly`, the How-to-read reference) are hidden (`body.expertmode`). The old Public mode additionally hid Exec·Revenue, Leadership, Workbench, Governance and Onboarding; those are **no longer hidden** in Expert View.

---

## 2026-08-08 (part 4) — Per-agent runnable bundles

### One-click "download this agent and run it"
- Agent Foundry → **⑤ IBP use-case catalog**: every use case now has a **▶ run** button beside **⬇ config**. **▶ run** downloads a ready-to-run bundle preset to just that one agent (the full runtime + all 33 agents + a `public/default.json`); the runner opens with that agent already selected and a banner ("This bundle is preset to …"), with the other 32 still available in the dropdown.
- New server route `/api/agent-bundle?id=<agent>` builds the zip on the fly from the sibling `unai-agent-runner/` source, using a **zero-dependency pure-JS ZIP writer** (store method + CRC32) added to `server.js` — no external `zip` binary required. If the runner source folder isn't beside the app at deploy time, the route returns a clear message pointing to `/api/runner-bundle`.
- Runner UI (`unai-agent-runner/public/index.html`) reads `/default.json` on load to preselect the bundled agent.

**Verified:** `server.js` syntax clean; generated zip passes `unzip -t`; extracted bundle boots, serves `/default.json`, and runs the preset agent; app `index.html` divs balanced (1072/1072) + inline JS clean; Test Buddy 50/50 green.

---

## 2026-08-08 (part 3) — Access control, presenter modes & code-protection build

### Two-role login (choose the mode at sign-in)
- The login screen now has an **Admin | Public view** picker + password. **Admin** (`APP_PASSWORD`) launches the full app; **Public** (`PUBLIC_PASSWORD`) launches a broad-audience view with detailed explanations and internal views hidden and **no in-app unlock**. A **Log out** switches roles. Passwords are env-configurable; `APP_PASSWORD=""` disables the wall.

### Presenter / audience controls (in-app)
- **Audience: Full / Public** toggle (Full is password-gated) — Public hides all `.explainer` boxes, the Explainability & evidence panel, and internal admin nav items (Exec·Revenue, Leadership, Workbench, Governance, Onboarding).
- **Watermark** overlay — tiles the viewer's name + live timestamp + "DO NOT DISTRIBUTE" across the screen (deters/traces demo leaks; refreshes every 30s).

### Code-protection distribution build
- `build_dist.js` produces `dist/unai-app/` (shipped as `UNAI_App_Dist.zip`): **all source comments stripped** (engine.js 257 comment-lines → 0) and code minified, with global names preserved so the app still runs (server + client verified). Honest limits documented: it's a deterrent, not encryption; the strong protection is moving the runtime server-side.

**Honesty note:** the audience/role controls are presentation/access controls (cookie + client-enforced), not a hard security boundary; aggressive client-side obfuscation was rejected because it broke the SPA's global-attachment pattern.

---

## 2026-08-08 (part 2) — Downloadable agents, unified explainability, grounded Commercialize pages, PR/FAQ

### Downloadable agents
- **UNAI Agent Runner** — a zero-dependency standalone bundle (`unai-agent-runner/`, shipped as `UNAI_Agent_Runner.zip`): the shared runtime + all **33 use-case agent manifests** + a local UI. Paste an LLM key, pick any agent, run it locally, and see **UNAI token usage** (real/measured with a key, modeled otherwise) and the **savings per use case**. Includes a Dockerfile for cloud (in-tenant) deploy.
- **In-app downloads** — Agent Foundry → **⑤ IBP use-case catalog**: a **⬇** per agent (downloads that manifest) and **⬇ Download all agents (JSON)**. Deployment view: **⬇ Download runnable bundle** (server route `/api/runner-bundle` streams the runner zip).

### Explainability — one format, always shown
- Unified every decision card onto a **single renderer** (`decisionCardHTML`) — the reference "How to read it" and every card now use the identical format (no more SVG-vs-HTML mismatch).
- Each card **always** shows an explanation narrative (generated from its own evidence if the model/template didn't supply one) — fixes cards that previously rendered no explanation.
- Numbered callouts (1–4 on the bar, 5 badge, 6 rationale) on every card; the reference legend stays **visible** (no auto-collapse).
- Added a distinct **match-score legend** for the ontology auto-map surface (mapping score ≠ decision-autonomy score).

### Commercialize pages regrounded
- **Exec · Revenue** and **Leadership Case** rebased from the old $1B model to the realistic bottom-up plan: **TAM ~$16.8B → SAM ~$4B → SOM ~$95M base / ~$180M upside by 2030**, FY26→FY30 ramp, ~120 customers, ~$61M subscription + ~$34M services. **$1B repositioned as the long-term aspiration.** In-app FAQ updated to match.

### New collateral
- **UNAI Studio PR/FAQ** (`UNAI_Studio_PRFAQ.docx`) — a one-page, Amazon-style press release + FAQ: commercial goals, revenue channels, blast radius/reach, why-now significance, and real-vs-modeled. Grounded; placeholders for names/dates.

---

## 2026-08-08 — Product hardening, grounded commercials & demo

### App (`unai-consolidated/unai-app`)
- **Measured vs Modeled clarity** — info-icon tooltips + Measured/Modeled badges on every Observability KPI tile; plain-language definitions and legends added across Observability, Execution, ROI and the "Your App vs UNAI" views. UNAI's per-step decisions relabeled as **demo logic** (vs. real, measured tokens) so a token-cost win is not misread as decision-for-decision parity.
- **In-app token benchmark** — a "Run head-to-head / Run benchmark" button backed by a new `/api/benchmark` endpoint, with a **per-agent** token & cost breakdown and an expandable "repeated-schema tax" explainability. `token_benchmark.py` now emits per-agent rows and an `explain` block.
- **Session LLM key** — a Governance "Session key" control plus `/api/set-key` and `/api/clear-key`, so one pasted key makes **every** page live immediately with no restart. `resolveConfig` now defaults base/model to Mistral when only a key is given.
- **Commercial Agents view** — a measured head-to-head, a cited capability-comparison table (UNAI vs Google ADK / CrewAI / LangGraph / MS Agent Framework / OpenAI Agents SDK), and an A2A agent-card importer that maps external skills to canonical concepts.
- **Deployment view** — cloud-agnostic deploy targets (Docker, Kubernetes, Databricks Apps, Snowflake SPCS, Google Cloud Run, AWS ECS, Azure Container Apps, SAP BTP/Kyma, on-prem) with copyable artifacts, plus an **"Access the agent + ontology from your warehouse"** section with runnable SQL for Snowflake, BigQuery and Databricks.

### Fixes & hardening
- Fixed a `DEPLOY_PLATFORMS` identifier collision (deck code vs `engine.js`) that was blanking the entire left navigation; added a full-DOM test to catch this class of bug.
- Fixed a `narrateOne()` return-shape bug (object vs string) that could hang the session-key call and break the "Test connection" button.
- Server hardened: `unhandledRejection` / `uncaughtException` guards so a bad key or network hiccup can't kill it, and a clear `EADDRINUSE` message when a stale server holds the port.

### Collateral & documents
- **Executive Leadership deck** — reframed from a sales pitch into a board decision deck, then **regrounded** to a realistic bottom-up model: TAM $16.8B → SAM ~$4B → SOM ~$95M base / ~$180M upside (with $1B repositioned as a long-term aspiration). Added "wedge" and per-champion "sell-now" slides, and a new **Hardening Road** section (team composition, six monthly releases, delivery cadence & resourcing ramp).
- **Accuracy corrections** — the ~175-agent portfolio is described as a pipeline to onboard (built for customers, not yet on UNAI), and Mahindra references were removed pending an actual review.
- **UNAI Studio elevator one-pager** (why / what / how + value + differentiation).
- **UNAI Studio 4-page Commercial Brief** — revenue channels, how we charge, client gains, commercial goals; vertical-agnostic.
- **UNAI Studio animated demo** — a self-contained HTML explainer and a GIF export (full product story, ~75s / ~17s loop).
- **Grounded revenue research** — TAM/SAM/SOM model sourced from Gartner (SCM software w/ agentic AI, $53B by 2030) and Mordor (agentic SC & logistics, $16.8B).

*All revenue and market figures are illustrative and benchmark-anchored; agent counts are Bristlecone portfolio actuals (built for customers, not yet onboarded onto UNAI). Validate before external or contractual use.*
