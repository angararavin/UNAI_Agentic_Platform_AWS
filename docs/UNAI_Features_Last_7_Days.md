# UNAI — Features Added (Last 7 Days)

*Universal Agentic Runtime · Bristlecone · Confidential*

A summary of everything shipped this cycle. The platform's demonstrator, connectors,
LLM routing, documentation and commercial collateral were all extended, and a major new
differentiation layer — the **Supply-Chain Cognition Layer** — was designed and built end-to-end.
All changes are verified by the Test Buddy suite (**51/51 checks green**).

---

## 1. Supply-Chain Cognition Layer (the new differentiation moat)

The headline addition — turns the canonical ontology from a per-engagement artifact into a
compounding, defensible asset. Built as `cognition.js`, exposed as an in-app **Cognition Layer ★**
view and via `/api/cognition`, `/api/onboard`, `/api/onboard-confirm`, `/api/resolve`.

- **Learning ontology library** — 63 canonical concepts with 300+ cross-deployment field-name
  aliases across 13 domains. Every confirmed mapping teaches it (persisted server-side), so
  onboarding gets faster and more accurate with each deployment — a data network effect.
- **Causal world model** — domain cause→effect edges (supplier risk → lead time → safety stock;
  promo → demand lift & cannibalization; ADU → DDMRP buffer; net-flow → replenishment) plus
  reusable formulas (safety stock, reorder point, spares demand, DDMRP buffer, net-flow position).
- **Confidence-scored self-onboarding** — paste any system's schema (or a foreign ERP), and UNAI
  auto-maps each column to a canonical concept with a confidence score and method, reports coverage,
  flags unmatched columns for human confirmation, and shows which use cases unlock.
- **Run-time resolver** — confirmed mappings register a per-system resolver that the engine's
  `OntologyMapper` consults at run time (learned mapping wins over the built-in ontology), so a
  freshly self-onboarded system is queryable the instant onboarding finishes — no code change.

## 2. SAP IBP-grounded use-case catalog (32 use cases)

Grounded in the SAP IBP 2311 module set.

- **32 supply-chain use cases** across Demand (statistical/curve-based forecasting, sensing, outlier
  correction, lifecycle, S&OP consensus, promotion, cannibalization, accuracy monitoring), Inventory
  (IO, MEIO, safety stock, service-level prediction, DDR/DDMRP, MRO, excess & obsolescence),
  Supply/Response (order-based response, allocation, net-requirements, capacity, production,
  synchronized planning), Procurement/Logistics, Aftermarket (spares, returns, RMA), and
  Control Tower + Sustainability (CO2).
- **Per-use-case domain packs** — each catalog agent runs a *real domain step* (its actual method +
  world-model formula on the right concepts), not a generic executor. Visible in the Execution view.
- **One-click build** — new Agent Foundry mode **⑤ IBP use-case catalog**: select → Build → registered,
  runnable agent → Run & watch.
- **Catalog UI** — module-grouped catalog shown in the Cognition view and in both decks.

## 3. Neo4j ontology store

- **Connector** (`connect_neo4j.py`) — test / publish / fetch against Neo4j AuraDB (free tier supported).
- **Full publish** — persists the base ontology **plus** all 63 cognition concepts (with aliases) and
  every learned per-system mapping, so Neo4j becomes the single durable source of the canonical layer.
- **Knowledge Graph round-trip** — read the ontology back from Neo4j into the KG view.
- **Base vs. learned distinction** — self-onboarded mappings render in gold with a legend entry, in
  both graph and table views.

## 4. Agent creation & runtime

- **Compose-a-team** — build several capabilities at once as one multi-capability runtime (N → 1),
  with sample teams (6 supply-chain, 6 commercial).
- **Agent Marketplace** — curated, certified agent/capability packs; paste-a-spec import.
- **Execution view** — watch an agent run end-to-end, per-step token attribution (shared cognition
  vs. thin executor), now showing the domain method + formula per step.
- **Live, feasibility-aware tools** — OpenStreetMap places + OSRM routing; the drive-time/ETA tool
  now detects impossible journeys (different landmasses / sub-geodesic routes) and returns an honest
  air-travel estimate instead of a bogus drive time.

## 5. LLM routing & cost (economizer)

- **Quota-aware multi-provider router** — tries providers in order, fails over on 429/5xx/timeout.
- **Claude economizer** — native Anthropic adapter that auto-caches the shared context envelope
  (prompt caching ~90% off cached input), added without replacing the OpenAI→Mistral defaults;
  token/cache metering surfaced in the Data Assistant and Governance panel.
- **Tier-based model routing** — light tasks → cheaper models; heavy reasoning → larger models.
- **FinOps utility** — scenario-driven pricing (new / convert / enhance).

## 6. Data connectors & assistant

- **Live warehouse connectors** — Databricks, Snowflake (key-pair, MFA-safe), BigQuery; read-only,
  SELECT-guarded `query` / `schema` / `automap`.
- **Data Assistant** — templates + guarded free-form NL→SQL over connected warehouses.
- *(DuckDB & Postgres adapters exist in the workbench; not yet surfaced as live KG sources.)*

## 7. Architecture, documentation & collateral

- **Redrawn platform architecture** — new master diagram (SVG/PNG) covering the full current build;
  embedded in the in-app Architecture view, the Technical Specification, and the Executive deck.
- **Technical Specification v2.2** — full rewrite: 7 layers, Agent Foundry, ontology + Neo4j store,
  router/economizer, data plane, execution/observability/governance, API surface, component map,
  token economics, security/compliance, roadmap, and the Supply-Chain Cognition Layer with the live
  32-use-case catalog table.
- **Commercial deck** — 10 slides + catalog: four customer segments, four offering models, three
  revenue scenarios (Moderate / Aggressive / Very aggressive), 2-year plan, plain-English glossary,
  and a confidential internal-economics appendix.
- **Positioning brief** — one-page "Consolidation, not coordination" honest competitive framing.
- **Executive briefing deck** — architecture slide + use-case catalog slide added.

## 8. Platform hygiene & consolidation

- **Full rename to UNAI** — `superagent-app/` → `unai-app/`, the `SuperAgent` class → `UNAI` (JS + Python,
  with back-compat aliases), all `Super_Agent_*` / `Superagent_*` deliverables → `UNAI_*`, and branding
  strings — every reference updated and re-verified.
- **Navigation redesign** — purpose-journey + role-filter left navigation (replacing the mode toggle).
- **Governance & observability** — autonomy thresholds, value limits, evidence + confidence, one audit
  trail, live execution trace, token/cost meter.
- **Verification** — Test Buddy suite expanded to 51 automated checks (engine, LLM router, cognition
  layer, frontend, server), gating every rebuild.

---

*All figures and models in the commercial collateral are illustrative and benchmark-anchored;
validate against real cost/pricing data before external use.*
