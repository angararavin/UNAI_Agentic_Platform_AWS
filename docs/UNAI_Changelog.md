# UNAI Studio — Changelog

*Bristlecone · Confidential*

## 2026-08-15 — Spec Factory: PDF upload support (optional pdf-parse)

- Spec Factory uploads now accept **.pdf** in addition to .docx/.txt/.md. PDF text is extracted server-side via an **optional `pdf-parse`** dependency (added to optionalDependencies), lazy-loaded — if it isn't installed the file is skipped with a clear hint ("PDF support needs: npm i pdf-parse"), so the app still runs zero-dependency by default. Verified graceful-degrade path.

## 2026-08-15 — Spec Factory: multi-file upload, explainability, honest token label

- **Document upload** — the Spec Factory now accepts one or more **.docx / .txt / .md** files (BRD + AS-IS + blueprint), extracted server-side by a pure-Node DOCX reader (zip + inflateRaw over word/document.xml — zero dependency, offline). Files are read once, combined, and fed to the extract-once brief. (PDF/.doc not supported in text mode — convert or paste.) Verified on the real EWM_LP_BBP / AS-IS_EWM docs.
- **Explainability panel** — each generation now shows: method (read-once → grounded sections → formula effort), sources read, the deterministic **effort audit** (base + add-ons → dev → +40% test → +10% buffer → total), and the **extract-once canonical brief** every section was grounded in.
- **Honesty fix** — relabeled the “% fewer input tokens” meter as a **processing/latency** metric, not a $ saving, with an explicit note that a caching baseline already makes those input tokens cheap (so the real $ wins are deterministic effort + fewer calls). Prevents the number being read as an 83% cost cut.

## 2026-08-15 — SDLC Spec Factory use case (BRD/FS → Technical Spec) integrated

- Integrated the external SAP SDLC AI Factory into UNAI as a runnable use case, **restructured onto the UNAI redesign**: reads the BRD **once** into a compact brief, generates each TS section from that brief (not the full doc per call), and computes the **effort estimate by formula (0 tokens)** from the ported effort matrix. New `sdlc_factory.js` (ported core section prompts + effort model), `POST /api/sdlc/generate` (uses the shared LLM gateway; template preview + real effort with no key), and a new **Spec Factory** page (Build agents group): paste a BRD, pick object type + complexity add-ons, Generate → section-by-section TS + deterministic effort + a run-economy meter (calls, tokens, ~% fewer input tokens vs re-reading the full BRD per section) + download .md. Every generation is logged to the Decision Ledger. Honest framing per the token analysis: savings are from extract-once + deterministic effort + call reduction, not consolidation.

## 2026-08-15 — Recursive self-healing: calibration → auto-adjust autonomy

- Closed the loop on the ledger: **per-use-case calibration now drives autonomy**. When a use case is consistently **over-confident** (predicted confidence ≫ actual accuracy, ≥5 scored outcomes, gap > 10%), the platform **auto-raises that use case's autonomy threshold** (step 0.05, cap 0.98) so borderline decisions route to a human until it re-earns trust; **under-confident** relaxes it (floor 0.70). Each adjustment is **audited** into the ledger (`mode: self_heal`) and the **healed threshold is applied on the next run** (wins over the request config). Endpoint `POST /api/ledger/heal`; `GET /api/ledger` now returns `overrides` + per-use-case `calibration`. New UI: "⚙ Recalibrate autonomy (self-heal)" button + a "Self-healed autonomy thresholds" card on the Decision Ledger page. Verified: over-confident use case (pred 92% vs actual 67%) auto-raised 0.85 → 0.90 and the next run applied it. (Demo `simulate` injects a realistic over-confidence bias so the loop is visible without real actuals.)

## 2026-08-15 — Decision + outcome ledger (self-healing Year 1)

- New **Decision Ledger** — every run appends its decisions (use case, confidence, threshold, autonomy, mode) to a persistent JSONL ledger; universal (all agents, incl. Foundry-converted). Outcomes can be attached (API, or simulated for demo), and the ledger computes **autonomy rate, mean confidence, accuracy, a confidence-calibration gap (over/under-confident), and a drift signal** (recent vs prior mean confidence). This is the retrospective self-healing substrate the roadmap's drift detection + learning loop build on. New page under *Prove the value* with KPI tiles, calibration/drift readout, recent-decisions table, and simulate/clear controls. Endpoints: `/api/ledger`, `/api/ledger/outcome`, `/api/ledger/simulate`, `/api/ledger/clear`. Verified: 2 runs → 8 decisions; simulate → 75% accuracy vs 94% confidence surfaced as a +19% over-confidence calibration gap.

## 2026-08-15 — Roadmap quick wins: auto tiered routing + context compression

- **Auto tiered routing** — `chatWithFailover` now auto-picks simple/medium/complex from the request itself (`pickTier`): cheap asks use the cheap model, only heavy reasoning escalates. Applies wherever the router is used (Assistant, grounded answers); callers can still force a tier or `autoTier:false`. Only swaps the model when `LLM_MODEL_SIMPLE/MEDIUM/COMPLEX` are configured — otherwise harmless.
- **Context compression** — `compressContext` trims/dedupes the reused context envelope (collapse blank runs, drop duplicate lines, cap length) before it's sent; applied in `answerGrounded`. Fewer input tokens for the same grounding, stacking with prompt caching + the semantic cache.
- (Structured-output caps already in place; Batch API remains a larger follow-up.) Verified: tiering classifies simple/complex correctly; Test Buddy 52/53.

## 2026-08-15 — Semantic query cache + synonym normalization (universal)

- Beyond prompt caching: re-phrased repeats — "how many meters have problems / issues / defects" — now resolve to **one canonical signature** (synonym normalization) with an embedding-cosine fallback for looser paraphrases, and are **answered from cache at 0 new tokens**. Context-scoped, TTL'd, invalidatable on data change. Lives in the engine (universal), exported, and wired into the Assistant (`/api/ask`) with an "⚡ answered from a semantically-equivalent prior question" badge. Seeded defect/meter/count/open/supplier/stock synonym sets. Verified: the four phrasings collapse to `count|defect|meter` and hit at 0 tokens; different context correctly misses.
- **Proposal delivered:** *UNAI — Efficiency & Self-Healing Roadmap* (docx+pdf in UNAI_DECKS) — further token-saving mechanisms (tiered routing, context compression, structured output, batch, distillation) + retrospective (decision/outcome ledger, drift detection, learning loop) and recursive (reflection/re-plan loop, ontology self-repair, cost self-governance) self-healing, with "in UNAI today" vs "proposed" clearly separated.

## 2026-08-15 — Detailed explainability: per-agent toggle (default ON), universal

- **Detailed explainability** — live, audited per-decision rationales (L7 live×N) — is now a **per-agent toggle, default ON**, implemented at the engine seam so **every** existing use case AND any **Foundry-created/converted** agent inherits it automatically (`config.detailedExplainability`, echoed in run output). OFF → template rationales at **0 live tokens** (the governance value-add spend is opt-out). Wired in both the **Studio app** (Build & Run checkbox → `/api/run`, gates `enrichEvidence`) and the standalone **Agent Runner** (checkbox → `/api/run`, gates live narration). Honest framing: the live×N calls are the value-add spend, separated from the core decision.

## 2026-08-15 — Tough Questions (red-team) page + one-pager

- New **Tough Questions** page in the app (under *Understand it*): plain-language, CIO-friendly objection handling — 12 hard questions across Reliability / Data model / Security & trust / Buying & market / Proof, each with a straight answer and, where a concern is partly fair, an explicit "the honest bit" concession. Flags the two to war-game hardest (the cross-vendor common language; why a hyperscaler won't just copy this). Category filter; Classic + New layouts.
- **Collateral:** matching **Tough Questions one-pager** (docx+pdf) in UNAI_DECKS.

## 2026-08-15 — Go-to-Market / commercialization package

- New **How to Buy** page in the app (under *Commercialize*): six buying models (self-host subscription, managed service, use-case packs, outcome/value-share, embedded/OEM, pilot→enterprise), an interactive **landscape → recommended deployment** selector across SAP/IBP/o9/Blue Yonder/Databricks/Snowflake/MS Fabric/Salesforce, illustrative tiered pricing (Foundation/Growth/Enterprise + add-ons), and a layered savings story (~$4.4M 3-yr illustrative value). Classic + New layouts.
- **Collateral (all in UNAI_DECKS):** editable **Pricing & Savings Model** (Excel — inputs → 3-yr TCO vs point-solutions / build-your-own / Gen-1 compute / analyst labour, zero formula errors), **How to Buy one-pager** (docx+pdf), **Commercialization & Pricing deck** (7-slide pptx), and a **GTM Strategy memo** (docx+pdf). Savings led by consolidation + build-vs-buy; compute/labour as reinforcement; no 1/n token overclaim.

## 2026-08-15 — Competitive Analysis page + one-pager

- New **Competitive Analysis** page in the app (under Architecture → *Understand it*): compares 15 similar-sounding agent architectures — Microsoft Magentic-One / Copilot Studio, IBM watsonx Orchestrate, Google ADK+A2A, Amazon Bedrock+AgentCore, Salesforce Agentforce (Atlas), ServiceNow AI Agents, SAP Joule Agents, LangGraph, CrewAI, MS Agent Framework (AutoGen+SK), OpenAI Agents SDK, o9, Kinaxis, Blue Yonder — against UNAI's **shared-cognitive-kernel** thesis. Category filter, a matrix (shared-cognition badge · what they actually share · closeness · key difference · SAP/SCM fit), a pinned UNAI row, and a **fair-play** section conceding the two genuinely close cases (Salesforce Atlas, o9 EKG) plus an honest-positioning note. Works in Classic + New layouts; sourced from 2025-26 vendor docs.
- **Collateral:** IP-safe **Competitive Analysis one-pager** (docx+pdf) in `UNAI_DECKS`, mirroring the RAG/Access one-pagers.

## 2026-08-15 — Vector store ships by default (Qdrant) + connectors to any

- UNAI now **ships a vector store out of the box** — no BYO required. New pluggable **VectorStore layer** in `engine.js`: a single interface (`upsert`/`query`/`health`), a zero-config **embedded** index (dependency-free, real cosine similarity) so Agentic RAG runs **offline/air-gapped**, and REST connectors for **Qdrant (product default)**, Chroma, Weaviate, Pinecone, Milvus, pgvector, Databricks Vector Search and Azure AI Search. Provider is chosen via `UNAI_VECTOR_*`; unreachable backends **fall back to the embedded mirror** so a demo never breaks. `ragRetrieve` now routes through the active store — the multi-hop teaching moment is preserved on every backend.
- **App:** new **Governance → Vector store** card shows the active backend, lists the full connector catalogue, and lets you switch backend (persisted).
- **Deploy stack:** `docker-compose.yml` bundles **Qdrant + UNAI** and a one-shot `vector_seed.js` that provisions the `unai_kb` collection and loads the KB before the app starts (`docker compose up --build` → app on 8080, Qdrant on 6333). Added `.env.example` and `VECTOR_STORE.md`.
- **Collateral:** the **Agentic RAG on UNAI** one-pager (docx+pdf) updated to state UNAI ships Qdrant by default with connectors to any vector DB.

## 2026-08-15 — Agentic RAG demo use case

- New **"Agentic RAG — knowledge retrieval"** use case: the Reasoning layer drives an iterative **retrieve → ground → cite** loop over a governed knowledge base, and **re-retrieves (multi-hop)** when round-1 evidence is insufficient (the credit-window gap) before answering — with **citations + confidence**. Demonstrates agentic RAG on the shared layers (Perception = retrieval, Memory = context, Evidence = grounding/sufficiency). Engine use-case count 12 → 13.

## 2026-08-15 — New layout (opt-in), Classic preserved

- Added a **Layout: Classic / New** toggle (top-right, persisted). **Classic is the default and completely untouched.** The **New** layout adopts the approved Zoho/HubSpot enterprise shell — implemented as a CSS/JS *mode* (`body.layout-new`) layered over the existing markup, so **every view, control and feature stays exactly where it is and keeps working** (nothing removed).
- New layout adds: a slim app bar with a **global search** that filters the nav, an **icon + label sidebar**, decluttered header, and roomier rounded cards / bigger page titles. Reviewable standalone mockup shipped first (`UNAI_Layout_New_Mockup.html`).

## 2026-08-15 — Roles & Access (RBAC): who can run which agent, and its scope

- Answers the M&M security question in the product. New **Roles & Access** model (Admin / Supply Planner / Analyst / Auditor) defines, per role: **which agents are visible & runnable** and each role's **autonomy cap + spend cap + view-only** scope. Enforced three ways: the Build & Run **agent dropdown is filtered** to the role's allowed agents, **runs are gated** (blocked with a clear message if the role lacks access or is view-only), and the role's caps are **folded into the Evidence→Action governance gate** (e.g., Analyst never auto-executes; Auditor is read-only).
- **"Acting as…" selector** in the top bar to demo it live; **Access editor** in Governance → Roles & Access (edit each role's agents + caps, persisted). Positioned as the policy surface that wires to enterprise **SSO/IdP groups** in production.

## 2026-08-15 — UX refresh: light/dark theme toggle + Bristlecone branding

- Reviewed the sample UX designs (NetSuite / Zoho One / HubSpot) and applied the **Zoho One structure + HubSpot polish** (dark sidebar + clean content, rounded cards with soft depth). Added a **theme toggle** in the header (persisted): refined **dark (default)** and a clean **light** theme. In light mode the content surfaces flip to light while the **sidebar and header stay dark** (with readable light text) for a premium look.
- Added the **Bristlecone** wordmark to the header alongside UNAI — white variant on the dark theme, full-color on light — served from `assets/brand/`.
- **Original design preserved** (not deleted) at `unai-app/_design_backup/`. Known follow-up: some deep-custom accent panels still render dark in light mode; iterative light-mode polish to follow.

## 2026-08-13 — Architecture Analogy promoted to its own page

- Moved the food-trucks-vs-UNAI-kitchen **Architecture Analogy** out of the Build & Run results area into its **own page under Architecture** (5 · Understand it → "Architecture Analogy"). The card is relocated into a dedicated view on load; the interactive Food Trucks / UNAI Kitchen / Side-by-Side toggle is unchanged.

## 2026-08-13 — Governance settings panel (spend cap, threshold, require-approval)

- Made the previously-hardcoded governance values **engine-configurable**: `APPROVAL_LIMIT` ($50k, 4 packs) now reads `config.valueLimit`; the 0.85 autonomy threshold in the Evidence layer now reads `config.autonomyThreshold`. Backward-compatible defaults; the server already forwards `config` to the engine, so it works on both the client and server run paths.
- New **"Autonomy & spend guardrails"** card at the top of the **Governance** tab: editable **spend cap per action ($)**, **confidence threshold (%)**, and a **require-approval-for-every-write** toggle. Saved to localStorage and merged into every run, the plan preview, and HITL execute — so the gate honors what you set, for any agent (built or converted). Verified: threshold 0.99 → 0% autonomy, 0.50 → 80%; a low spend cap holds POs for sign-off.

## 2026-08-13 — Agent Lifecycle animation (new + converted agents)

- New **"Agent Lifecycle"** page under Architecture (5 · Understand it) — an animated, step-by-step walkthrough of the whole process for a **new (built) agent** (describe goal → compose manifest → map ontology → governance → register → run) and a **converted agent** (submit spec → analyze vs 7 layers → map tools/data → absorb → conversion report → emit manifest → run). Both share the same run-time steps (Reason → Perceive → Evidence → Gate/HITL → Act → Explain), reinforcing "same runtime." Auto-play + Next/Prev/Pause/Restart; the seven-shared-layers strip lights up per run-time step. Shipped as a standalone shareable `UNAI_Agent_Lifecycle.html` and embedded in-app via iframe.

## 2026-08-13 — HITL made universal (all use cases + new/converted agents)

- Plan preview is generic (every use case + any built/converted agent gets it automatically). Routed the **generic pack** (which all built/converted agents run on) through the gated `proposeAction` chokepoint, so interactive Approve/Reject is **automatic for new/converted agents** — no per-agent wiring.
- Added a **governance toggle** ("require human approval for every high-consequence write") that forces HITL even on trusted actions, for any agent — with a checkbox in the preview panel. Unified the read-vs-write classifier into one shared regex (fixes false positives like "read_ledger").

## 2026-08-13 — Plan preview + human-in-the-loop (see the reasoning before it acts)

- **Plan preview (dry run).** New "🔍 Preview plan & approvals" button runs the Reasoning layer + Evidence gates **without committing anything** and shows what the agent *intends* to do: the ordered plan, each step classified **read vs high-consequence write**, and per-step disposition — *auto-execute (trusted)* vs *HOLD for human approval* — with the gate reason. This surfaces the run-time interception point (the **Evidence→Action gate**) that was previously only visible after the fact.
- **Interactive human-in-the-loop.** Held high-consequence actions now flow through a single gated chokepoint (`proposeAction`) and appear as pending approvals with **Approve / Reject** buttons. "Execute with my approvals" then runs for real: approved actions commit, rejected ones are blocked and logged (`REJECTED_BY_HUMAN`), and the committed-actions summary + audit trail reflect exactly what happened. Engine adds `dryRun` and `approvals` config, `planPreview`/`stagedActions`/`pendingApprovals` on the result, and a dry mode that stages writes instead of committing them. Backward compatible; other use cases unchanged (verified). Demo it on the telemetry use case: the shutdown is held → Approve executes it, Reject logs the block.

## 2026-08-13 — Signal Integrity: shared, use-case-agnostic transient/glitch handling

- **New shared-layer service (built once, inherited by every use case).** Added `ingestSignal` (Perception — records a raw reading with `{source, sourceHealth, timestamp, consequence}` into a rolling per-concept time-series) and `assessSignal` (Memory — reconciles the window for corroboration, persistence, and a spike-and-revert *transient* flag, returning a 0–1 trust score). The Evidence engine now takes an optional `integrity` arg: signal trust discounts confidence and an **unconfirmed transient forces a hold**, with Explainability narrating why. This is cross-cutting — a capability declares only its signals + consequence; the shared layers apply data-quality, corroboration, debounce, and belief-revision uniformly. Backward compatible (existing `evidence(decision, drivers)` calls unchanged).
- **Demo use case** `telemetry_signal_integrity` ("Equipment Telemetry — signal integrity"): a FAILURE alarm from one source at T0, reverting to OK at T1 (sensor glitch). The runtime **holds the emergency shutdown** (trust 0.30, corroboration 1/2 — below policy; 0 actions written to the audit trail) and at T1 **recovers to "telemetry inaccuracy, not an actual failure"**, downgrading the sensor and flagging it for calibration — with no use-case-specific rules. Visible live in the seven-shared-layers, Evidence, and Explainability panels. Added to the Build & Run dropdown; engine use-case count 11 → 12 (test updated).

## 2026-08-13 — Architecture analogy, 878 backup, and layer-count fix

- **Architecture Analogy slide** added to **every** `.pptx` (42 decks) — the "12 food trucks vs 1 UNAI kitchen" illustration (48 → 16 tasks, 66.7% fewer cognitive ops), rebranded from the internal "APEX" codename to **UNAI**. Native editable vector slide (Georgia/theme palette), idempotent generator.
- **App**: folded an interactive version (Food Trucks / UNAI Kitchen / Side-by-Side toggle) into the How-UNAI-Works area of the Build & Run view.
- **Exec deck "Where 878 comes from"**: added a backup slide (after the "One agent per job does not scale" WHY slide) + speaker notes to all 7 copies of `UNAI_Executive_Deck.pptx`, deriving the 878 maintenance-hours figure (878 ÷ 10 ≈ 88 hrs/agent/mo) with a sensitivity box, so the modeled number is defensible when challenged.
- **Bug fix — layer-build count**: `gen2LayerImpls` was `7 + plan.length` while `gen1LayerImpls` was `agents × 7`; for spares/RMA (27 agents, 26 plan steps) this rendered **33** instead of **34**. Now `7 + gen1AgentCount` (one pack per specialist replaced), so the KPI reads **189 → 34** (27 packs) with reduction **−82%**. All other use cases unchanged. Applied across all active `engine.js` copies.

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

## Spec Factory — detailed, token-focused explainability + UNAI-vs-existing comparison
- sdlc_factory.js: return now includes `tokenBreakdown` (sourceTokens, briefTokens, sections, baselineInput, redesignInput, savedInputPct, perSectionBaseline/Redesign), a `comparison` block (baseline vs redesign: input tokens processed + LLM calls), and effort scope fields (`multiObject`, `detectedObjectTypes`, `scopeNote`) that warn when a source is really a multi-object program.
- index.html Spec Factory explainability panel reworked into three parts: (1) "How UNAI reduces the input tokens" — step-by-step with the actual numbers (read source once → brief; each section reads the brief not the full source; deterministic effort = 0 tokens; total processed input vs baseline → % fewer); (2) a "UNAI vs the existing agent" table (input read per section, input tokens processed, LLM calls, effort method, explainability) with the honest caveat that the existing agent already caches the source, so the token reduction is mainly processing/latency, not a like-for-like $ cut; (3) effort audit spelled out arithmetically (base + add-ons → dev → 40% test → 10% buffer capped 4h → total ÷ 8h/day) plus the multi-object scope warning.
- Verified: node --check on sdlc_factory.js + server.js; largest inline page script node --check OK; div balance 1337/1337; boot + live POST /api/sdlc/generate returns the new fields.

## Spec Factory — multiple documents + auto-detected object type
- sdlc_factory.js: generateSpec now produces a chosen SET of documents from ONE extract-once brief. Added Functional Spec (7 sections), Test Plan (5), and Requirements Traceability Matrix, alongside the existing Technical Spec (6). New `documents` param (default ["ts"]); returns `docs:[{key,title,markdown,sections}]` plus a combined `markdown`, and `documentsGenerated`.
- Auto-detect object type: `detectObjectTypes()` reads SAP object types straight from the source; `computeEffortAuto()` itemises base+test+buffer per detected object and sums them. objectType defaults to "auto" (server + UI) so the user no longer has to guess. Picking a specific type still uses the single-object formula with complexity add-ons.
- index.html Spec Factory: added a "Documents to generate" checkbox group (FS + TS on by default; Test Plan + Traceability optional); object-type dropdown now leads with "Auto-detect (recommended)" and is labelled as effort-only; output renders each document in its own card with a per-document .md download plus a "Download all"; effort audit shows the itemised per-object table when auto-detected (or the single-object arithmetic otherwise).
- server.js: /api/sdlc/generate accepts `documents` + objectType "auto"; ledger entry records which documents were generated.
- Verified: node --check on sdlc_factory.js + server.js; largest inline page script node --check OK; div balance 1343/1343; direct factory unit test (4 docs, 19 sections, 5 object types itemised) + live HTTP POST both return the new shape.

## Efficiency roadmap: structured output + batch path (both shipped)
- llm.js: structured/constrained output in the shared gateway — `opts.json` (OpenAI response_format:json_object; Anthropic assistant-prefill "{" + brace restore) and `opts.stop` (stop_sequences / stop) to cap the priciest tokens. New `chatJSON()` (parse + one stricter retry) and `safeJsonParse()` (fence-tolerant); both exported so every caller inherits it.
- server.js: `/api/sdlc/batch` — each uploaded file (or pasted item) is treated as a SEPARATE BRD; jobs run through one warm runtime at bounded concurrency (3), returning per-BRD results + docs + an aggregate economy roll-up and a compact structured cross-batch summary (chatJSON, deterministic fallback). Honest note: maps to the provider Batch API (~50% off) in production; here the win is one warm path + shared brief/cache per item. Logs a batch entry to the Decision Ledger.
- index.html Spec Factory: "Batch mode" checkbox (treat each file as a separate BRD); batch renderer with per-BRD cards, per-document downloads, "Download all", batch-economy meter and summary.
- Verified: node --check llm/server/sdlc_factory; page script node --check OK; div balance 1343/1343; boot + GET / 200 + POST /api/sdlc/batch 200; direct factory + HTTP batch (2 BRDs → FS+TS each, per-object itemised effort, aggregate) confirmed.

## Collateral: UNAI Phased Delivery Roadmap deck (with SDLC track)
- UNAI_DECKS/Presentations/UNAI_Phased_Roadmap_2026.pptx (+ PDFs/…pdf) — 8-slide exec deck: shipped baseline; near-term engine items (structured output + batch shipped, retrieval pruning / cache-ontology hygiene / closed learning loop next); bigger self-healing items; the SDLC track (shipped/next/later); big-ticket bets in 3 phases; a 3-year horizon table; the ≥70%-reuse + complement-don't-compete rules with the honest per-account caveat. Marks shipped vs proposed throughout. Validated (pptx XSD) + visual QA.

## 2026-08-24 — Merged with parallel branch (unaiagentic-main (2))
- Reconciled two independently-evolved copies of this project. From the "(2)" branch: Spec Factory (SDLC BRD/FS → Technical Spec, batch mode, PDF upload), Decision Ledger + self-healing autonomy calibration, semantic query cache (engine.js), LLM efficiency quick-wins (auto-tiered routing, context compression, structured-output/JSON helpers in llm.js), detailed-explainability per-agent toggle, `_design_backup/`, a separate `unai-gateway/` project. From this branch (unchanged, kept as-is): the Agent Foundry conversion pipeline (`foundry_convert.js` — folder-to-agent conversion, Streamlit launch, real backend-swap, download-as-zip), `ocm_capabilities.js`/`ocm_store.js`, the `dc_hw_rma`/`sap_sdlc_generation` use cases. Every difference found was a clean addition on one side, not a conflicting edit — no functionality was dropped from either branch. Referenced roadmap deck (UNAI_Phased_Roadmap_2026.pptx) was mentioned in the other branch's changelog but not present in its actual files — not recovered.

## Detailed explainability on EVERY decision (built + converted agents)
- engine.js: explain() now attaches a reference-level `ev.detailed` to every decision — { summary, decision, confidencePct, uncertainty, outcome, primaryDriver, contributingFactors[], reasoningSteps[4], rootCause, evidence[], gate{autonomous,thresholdPct,reason,counterfactual}, recommendedAction, confidenceWaterfall, source }. Deterministic, 0 tokens, built from the Evidence object. Because run() returns evidence[] and the Foundry copies engine.js verbatim into every converted agent, EVERY built and converted agent inherits this automatically. Modeled on the hand-built NVIDIA agent's reasoning depth (root cause, drivers, steps, recommended action).
- engine.js: new exported `enrichExplainability(evidenceLog, chatJSON, max)` — when a model is reachable, rewrites rootCause/reasoningSteps/recommendedAction of the most-gated decisions into live, decision-specific prose (structured output via chatJSON) and marks source:"live"; deterministic template otherwise. Honest: capped, labelled.
- server.js: /api/run calls enrichExplainability when detailed explainability is ON and a provider is configured.
- index.html: Build & Run decision cards now render a collapsible "Detailed reasoning" block (root cause, primary driver, step-by-step reasoning, contributing-factor pills, recommended action) with a live/template tag.
- foundry_convert.js: the converted-app page (the Playground embed) now renders per-decision explainability cards from ev.detailed instead of dumping raw JSON — root cause, reasoning steps, drivers, recommended action (raw JSON still available under a details toggle).
- Verified: node --check engine/server/llm/foundry; page script node --check; div balance 1343/1343; direct run asserts ev.detailed on all decisions; enrichExplainability upgrades prose with a stub model; live HTTP /api/run returns full ev.detailed on all 5 decisions.

## Playground: unified in-process agent runner (no terminal)
- index.html Playground page: added "Run any UNAI agent" — a single dropdown listing built-in use cases + Foundry-converted manifests (from USE_CASES) + all OCM capabilities (/api/ocm/capabilities) + the SDLC Spec Factory. Everything runs IN-PROCESS on the shared runtime — no terminal, no npm.
  - Use case / manifest → /api/run → renders each decision via decisionCardHTML (root cause, reasoning steps, drivers, recommended action) + a token-economics summary (7-layer In/Out/Total from observability.layerTokensReal, savings vs one-agent-per-task, decisions/autonomy).
  - OCM capability → inline engagement picker + model key → /api/ocm/run → grounded, cited reasoning card with confidence/gate/drivers/sources.
  - SDLC → inline BRD box → /api/sdlc/generate → documents + extract-once token summary + deterministic effort.
- The external converted-app iframe is retained and reframed as an OPTIONAL side-by-side comparison ("the original app's own UI"); the in-process runner is now the default way to run + see detailed explainability. Answers the "why do I need a separate terminal" friction: only the external UI embed ever needed one.
- Verified: page script node --check; div balance; boot; /api/ocm/capabilities (10) + /api/run (5 decisions w/ detailed + layer tokens) smoke.

## Playground unified runner: show the agent's actual OUTPUT
- The unified runner now renders each run's real business output (from o.results — the data each capability produced: affected suppliers, reforecasts, shortfalls, purchase orders, RMA dispositions, retrieved sources/answers, etc.), not just the explainability. Generic renderer: arrays-of-objects → tables, arrays → chips, scalars → key/value; empty capabilities skipped; flattens a capability's .output sub-object.
- playRenderRun order is now: "Agent output — what it actually produced" → token economics → decision reasoning & explainability. This mirrors the NVIDIA converted-app's "actual run with output" but for every UNAI-native agent, in-process.
- Verified: page script check; div balance; live /api/run for disruption_response yields 4 output blocks (Disruption Detect, Demand Reforecast, Inventory Adjust, Procurement Act).
