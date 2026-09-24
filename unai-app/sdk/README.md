# UNAI SDK (v1)

Thin clients for the UNAI API (`/api/v1`). No dependencies — `unai_sdk.js` uses
`fetch` (Node 18+ or the browser); `unai_sdk.py` uses the Python standard library.

The API is documented by the OpenAPI spec served at `GET /api/v1/openapi.yaml`.

## Auth

All calls except the index and the spec require a Bearer token:

```
Authorization: Bearer <token>
```

Tokens come from `UNAI_API_KEYS` (comma-separated) on the server, or one is
generated at boot and printed to the log. Ask your UNAI admin for a key.

## The create → run → connect flow

Agents are authored against the **canonical ontology**, not your raw schema, and
run against **seeded systems-of-record with no data connection**. Connect your
real data foundation later by registering a connection — the agent doesn't change.

### JavaScript

```js
const { UNAIClient } = require("./unai_sdk.js");
const unai = new UNAIClient({ baseUrl: "https://<host>", token: process.env.UNAI_API_KEY });

const { ontology } = await unai.ontology();               // concepts to map to
const { id } = await unai.createAgent({
  name: "Spares Triage",
  capabilities: [
    { label: "Read stock", kind: "perception", system: "SAP_MM" },
    { label: "Create PO",  kind: "action",     system: "SAP_MM" },
  ],
});
const run = await unai.run(id);                            // runs on seed data
console.log(run.observability, run.containment);

await unai.configureConnection("databricks", { host: "…", token: "…" }); // connect real data
await unai.kill(true);                                     // safety: engage the kill switch
```

### Python

```python
import os
from unai_sdk import UNAIClient
unai = UNAIClient(base_url="https://<host>", token=os.environ["UNAI_API_KEY"])

onto = unai.ontology()
made = unai.create_agent(name="Spares Triage", capabilities=[
    {"label": "Read stock", "kind": "perception", "system": "SAP_MM"},
    {"label": "Create PO",  "kind": "action",     "system": "SAP_MM"},
])
run = unai.run(made["id"])
unai.configure_connection("databricks", {"host": "…", "token": "…"})
unai.kill(True)
```

## Methods

| JS | Python | Endpoint |
|----|--------|----------|
| `health()` | `health()` | `GET /health` |
| `ontology()` | `ontology()` | `GET /ontology` |
| `listAgents()` | `list_agents()` | `GET /agents` |
| `createAgent(manifest)` | `create_agent(name, capabilities)` | `POST /agents` |
| `run(id, config?)` | `run(id, config=None)` | `POST /agents/{id}/run` |
| `listConnections()` | `list_connections()` | `GET /connections` |
| `configureConnection(type, config)` | `configure_connection(type, config)` | `POST /connections` |
| `containment()` | `containment()` | `GET /containment` |
| `kill(on)` | `kill(on)` | `POST /containment/kill` |
| `setEgress(list)` | `set_egress(list)` | `POST /containment/egress` |
| `setPolicy(policy)` | `set_policy(policy)` | `POST /containment/policy` |

> v1 — API shapes may evolve before GA. Per-tenant tokens, rate limits and a
> published package are on the platform-hardening roadmap.
