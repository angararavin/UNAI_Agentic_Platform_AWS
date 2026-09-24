# UNAI Platform

A **real, runnable** Generation-2 Universal UNAI Runtime. Build one adaptive agent,
run a live business use case (supplier disruption response), and see the proof:
how many specialist agents the work would normally take, how many were actually
used (one), and how context switching across SAP MM/SD/FI and an analytics store collapses
because every system is read/written through one canonical ontology.

This is not a scripted demo. The orchestration logic, the 7 shared layers, the
ontology translation, the A2A bus, and the substitution/context-switch metrics are
all executed by real code (`engine.js`). The systems of record are real SQLite
tables (`db.js`) using each system's native field names.

The results screen depicts **all seven layers** (with the live invocation count and
last operation of each) and a full **explainability panel**: every decision carries a
confidence score, weighted attribution, an uncertainty band, a what-if counterfactual,
and a plain-English rationale. A value-based governance gate ($50K limit) routes
high-value actions to a human approver — visible in the run as one staged PO.

## Run it (macOS, step by step)

```bash
# 1. Check Node — need 22.5+ for the built-in SQLite. If missing: brew install node
node -v

# 2. Go to the app folder (quotes because the path has a space)
cd "/Users/Ravin.Angara/Claude/Projects/UNAIs/unai-app"

# 3. Start the server (no npm install required — uses Node's core modules + node:sqlite)
node server.js
#    → prints: [unai] http://localhost:3000

# 4. Open the app in your browser
open http://localhost:3000
```

Press **Build & Execute**. The header shows `Mode: server + SQLite`. Each run reads/writes
real SQLite tables; raised POs and safety-stock updates are persisted and queryable.

Stop the server with `Ctrl+C`.

### Optional — live Mistral rationales
By default the Explainability layer uses deterministic templates. To have **Mistral** write
each rationale instead, either paste a key into the app's "Mistral API key" field, or:

```bash
export MISTRAL_API_KEY="your-key-here"
node server.js
```

No extra packages needed (uses Node's built-in `fetch`, calling the Mistral Chat Completions
API). If the key is missing or the call fails, it silently falls back to the template — the
app always works. Override the model with `MISTRAL_MODEL` (default `mistral-small-latest`).

### Zero-install alternative
Just open `index.html` in a browser (double-click). Runs in-memory; everything works except
SQLite persistence and Mistral (both need server mode).

### Headless verification
```bash
node run-demo.js            # in-memory
node run-demo.js --sqlite   # SQLite-backed
```

## Tabs
- **Build & Run** — define the UNAI and execute the use case; substitution, context-switch, explainability + waterfall panels.
- **Architecture** — the seven-layer, Mistral-centric, cloud-neutral stack rendered in-page, plus the canonical-ontology dialect table.
- **Benefits** — the value story (complexity ↓, substitution, payback, data residency, unified observability); live figures update after each run.
- **Observability** — runtime telemetry from the last run: per-layer latency/invocations, system-of-record calls, LLM inference calls, autonomy gauge, and the action audit trail.

## Explainability features
- **SHAP-style confidence waterfall** per decision: a 0.60 prior plus each driver's signed
  contribution building to the final confidence, with the 0.85 autonomy threshold marked.
- **Seven-layer activity panel**: every layer with its live invocation count and last op.
- **Mistral or template rationale**, tagged per decision so you can see the source.
- **Value-based human-in-the-loop gate** ($50K): high-value actions are staged for approval.

## What each file does
| File | Role |
|------|------|
| `engine.js` | The UNAI: 7 shared layers, orchestrator, A2A bus, ontology mapper, metrics. Runs in browser and Node. |
| `db.js` | SQLite-backed systems of record (SAP MM/SD/FI + analytics store) with native schemas. |
| `server.js` | Serves the UI and runs the engine against SQLite over `/api/run`. |
| `index.html` | The Studio UI — build the agent, execute, see the proof + waterfalls. |
| `llm.js` | Optional Mistral-backed rationale generation, with template fallback. |
| `run-demo.js` | Headless run + metrics print (used for verification). |

## Plugging in live systems
Every adapter implements just two methods: `query(entity, filter)` and
`write(op, payload)`. Replace any SQLite adapter with a live SAP S/4HANA
OData/BAPI client or an analytics-store client implementing the same two methods — the
orchestrator and the seven layers are unchanged. That substitutability is the
architecture's central claim, made concrete.
# unaiagentic
