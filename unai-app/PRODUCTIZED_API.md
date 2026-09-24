# UNAI Productized API — `api-server.js`

Internal reference for the customer-facing API surface, built to answer: *"we want to
create an API endpoint to the customer instead of exposing our platform."*

## Why this exists

`server.js` (UNAI Studio) is the internal workbench — Agent Foundry, the Converted
Agents Playground, a login-gated UI, session cookies, dozens of demo/observability
tabs. None of that is something a customer's backend should ever touch or even be
able to reach.

`api-server.js` is a **separate, minimal process** that exposes only `/api/v1` —
same engine, same route handler (`api_v1.js`) the Studio uses for that path — with
nothing else reachable. Deploy it as its own service (own container, own port, own
security group) and a customer's network path never touches platform code.

## Files involved

| File | Role |
|---|---|
| `api-server.js` | **New.** Standalone entry point — boots only `/api/v1`, Bearer-token auth only, no Studio cookie fallback. |
| `api_v1.js` | The route handler both `server.js` and `api-server.js` call into. Owns agents, runs, ontology, connections, containment. |
| `openapi.yaml` | The OpenAPI 3.0 spec for the whole surface — served live at `GET /api/v1/openapi.yaml`. Basis for generating SDKs later. |

`server.js` still mounts `/api/v1` too (for the in-app "API v1" surface Studio users
can also call), but that's incidental — `api-server.js` is what you actually hand a
customer.

## Architecture split

| | `server.js` (Studio) | `api-server.js` (customer) |
|---|---|---|
| Agent Foundry (build/convert) | ✓ | ✗ |
| Converted Agents Playground | ✓ | ✗ |
| Login-wall HTML / session cookies | ✓ | ✗ (no cookie concept exists here) |
| Governance / observability tabs | ✓ | ✗ |
| `/api/v1/*` | ✓ (cookie *or* Bearer token) | ✓ (**Bearer token only** — `isAuthed` is hardwired to `() => false`) |

## Auth model

- `Authorization: Bearer <token>`
- Valid tokens: `UNAI_API_KEYS` env var (comma-separated), or one auto-generated at
  boot and printed to the log (`unai_<32 hex chars>`) if the env var isn't set.
- **Known gap:** keys are a flat list — no per-customer scoping, quotas, rate
  limits, or revocation yet. Fine for a first customer or two; needs a real keys
  table before broader rollout.
- `GET /`, `GET /api/v1`, and `GET /api/v1/openapi.yaml` are public (no token
  needed) so a developer can discover the API before getting a key.

## Endpoint reference

### Agents & runs — the business-decision layer
| Method | Path | What |
|---|---|---|
| GET | `/agents` | List built-in use cases + customer-created agents |
| POST | `/agents` | Create an agent from `{name, capabilities:[{label, kind:'perception'|'action', system?}]}` |
| POST | `/agents/{id}/run` | Run it. Returns `decisions[]`, `evidence[]` (full internal detail), `observability`, `containment` |
| GET | `/runs` | Last 50 runs, summarized |
| GET | `/runs/{id}` | Re-fetch one run's `decisions[]` without re-running |

### Data foundation & ontology
| Method | Path | What |
|---|---|---|
| GET | `/ontology` | Canonical concepts to author agents against (zero re-map) |
| GET | `/connections` | Data-foundation connectors + configured status |
| POST | `/connections` | Register a connection (`databricks`\|`snowflake`\|`bigquery`\|`neo4j`\|`llm`) |

### Knowledge
| Method | Path | What |
|---|---|---|
| POST | `/knowledge/ask` | Ask the shared SharePoint-style Knowledge Assistant (permission-trimmed) |

### Governance (Agent Safety & Containment)
| Method | Path | What |
|---|---|---|
| GET | `/containment` | Safe-mode status + recent gated events |
| POST | `/containment/kill` | Kill switch — force every action to human approval |
| POST | `/containment/egress` | Set the outbound egress allowlist (hostnames) |
| POST | `/containment/policy` | Set the action policy — `gated`\|`deny`\|`allow` |

### Meta
| Method | Path | What |
|---|---|---|
| GET | `/health` | `{ok, safeMode, agents, license}` |
| GET | `/license` | Licensing/entitlement status |
| GET | `/deployment` | Deployment mode (local engine vs. remote control-plane "kernel") |

## The business-decision layer (`decisions[]`)

Added in `api_v1.js`'s `decisionsFromEvidence()`, shared by both `POST
/agents/{id}/run` and `GET /runs/{id}` so they return identically-shaped data. This
is the stable, customer-facing shape — decoupled from internal engine fields
(`waterfall`, `base`, `threshold`, etc. stay only in the raw `evidence[]` array for
callers who want full internal detail).

```json
{
  "decision": "Raise PO for FG-1003 (586 units, $56,256)",
  "autonomous": false,
  "confidencePct": 88,
  "explanation": "Confidence 88% cleared the 85% autonomy threshold, but a policy rule applied — value $56,256 > $50,000 approval limit — so it routed to a human reviewer.",
  "primaryDriver": { "name": "stock-out revenue risk", "sharePct": 86 },
  "gate": "value $56,256 > $50,000 approval limit",
  "rootCause": "...",
  "reasoningSteps": ["...", "..."],
  "recommendedAction": "Route to buyer for sign-off; PO is pre-staged and executes on approval."
}
```

**Fix made this session:** `explanation` (the actual plain-English sentence, from
`engine.js`'s `Layers.explain()`) was previously missing from `GET /runs/{id}`'s
response — only structured sub-fields (`rootCause`, `reasoningSteps`,
`recommendedAction`) were mapped, not the sentence itself. Now both endpoints
include it.

## Quickstart

No packaged SDK exists yet — these are direct calls against the real endpoints,
using each language's stdlib/global fetch only.

**Python**
```python
import requests

BASE = "https://api.yourcompany.com/api/v1"
KEY  = "unai_••••••••••••••••"

r = requests.post(f"{BASE}/agents/disruption_response/run",
    headers={"Authorization": f"Bearer {KEY}"})
run = r.json()

for d in run["decisions"]:
    status = "autonomous" if d["autonomous"] else "needs sign-off"
    print(f"[{d['confidencePct']}% · {status}] {d['explanation']}")
```

**Node**
```js
const BASE = "https://api.yourcompany.com/api/v1";
const KEY  = "unai_••••••••••••••••";

const run = await fetch(`${BASE}/agents/disruption_response/run`, {
  method: "POST",
  headers: { Authorization: `Bearer ${KEY}` },
}).then(r => r.json());

for (const d of run.decisions) {
  const status = d.autonomous ? "autonomous" : "needs sign-off";
  console.log(`[${d.confidencePct}% · ${status}] ${d.explanation}`);
}
```

## Running it

```bash
cd unai-app
UNAI_API_KEYS=your_real_customer_key PORT=8081 node api-server.js
```

Prints:
```
[unai-api] Customer-facing API ONLY on this process — no Studio UI, no Agent Foundry, nothing else is reachable here.
[unai-api] http://localhost:8081/api/v1
[unai-api] Bearer key: your_real_customer_key
[unai-api] Spec: http://localhost:8081/api/v1/openapi.yaml
```

## What's built vs. what's still needed

| Status | Item |
|---|---|
| ✅ Done | Standalone process isolated from the Studio (`api-server.js`) |
| ✅ Done | Clean `decisions[]` business-decision shape with plain-English `explanation` |
| ✅ Done | OpenAPI spec, served live |
| ⚠️ Syntax-checked only | `api-server.js` boot + isolation was not verified with a live HTTP round-trip in this session — do that before relying on it |
| ❌ Not built | Real installable SDKs (Python package, npm package) — spec exists to generate them from |
| ❌ Not built | Per-customer API key scoping, quotas, expiry, revocation |
| ❌ Not built | Rate limiting / usage metering (needed before this is billable) |
| ❌ Not built | Production deployment (own container/port/security-group — see the earlier AWS deployment notes for this app) |

## Related session artifact

A visual reference page (architecture split diagram, endpoint list, worked
decision-layer example) was published during this session:
https://claude.ai/artifact/1Vx44ktuGr6QwxX9SUpcqL
