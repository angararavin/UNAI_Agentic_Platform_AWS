# UNAI for OpenAI

Two ways to let an OpenAI-based agent call UNAI, mirroring what `unai-app/mcp/`
does for Claude/MCP clients. Either way, UNAI does the actual work — these just
translate OpenAI's calling conventions into UNAI's `/api/v1` REST API.

## Option A — Function calling (Chat Completions / Assistants)

`tools.js` exports the same 8 tools as the MCP server (`unai_list_agents`,
`unai_run_agent`, `unai_get_ontology`, `unai_containment_status`,
`unai_configure_connection`, `unai_kill_switch`, `unai_list_runs`,
`unai_get_decision`), in OpenAI's JSON-Schema tool format instead of MCP's.

- `TOOLS` — pass directly as the `tools` param to `chat.completions.create`
  or an Assistant's tool list.
- `callTool(name, argsJson)` — call this when the model returns a
  `tool_calls` entry; feed the string result back as a `role:"tool"` message.

**Try the included CLI demo:**
```bash
# in unai-app: run the server with an API key
UNAI_API_KEYS=my-secret-key npm start          # serves http://localhost:3000

# in unai-app/openai:
OPENAI_API_KEY=sk-... UNAI_API_KEY=my-secret-key node openai-agent-cli.js
```
Then try: *"List the UNAI agents"* → *"Run dc_hw_rma and summarise the decisions."*

No extra npm install needed — it's plain `fetch()` against both APIs (Node 18+).

## Option B — Custom GPT Actions (no code at all)

ChatGPT's Custom GPTs and the Assistants API's Actions consume an **OpenAPI
spec directly** — UNAI already ships one at `unai-app/openapi.yaml`, covering
the same `/api/v1` surface. Point a Custom GPT's Action at your UNAI server's
`/openapi.yaml` (must be reachable over HTTPS — use a tunnel like `ngrok` for
local testing) and set Bearer auth with your `UNAI_API_KEYS` value. No server
file required for this path; it's the same REST API mcp-server.js and tools.js
already wrap.

## Which to use

- **Function calling** (`tools.js` + `openai-agent-cli.js`): you control the
  loop — embed UNAI calls inside your own OpenAI-based app/agent.
  Same shape as `mcp/mcp-server.js`, adapted to OpenAI's tool format.
- **Custom GPT Actions** (`openapi.yaml`): fastest path if you just want a
  ChatGPT GPT that can call UNAI, with no code to maintain.

> Auth note: same as MCP — OpenAI authenticates to UNAI with the UNAI token
> above. UNAI does not need OpenAI's API key; UNAI's own model calls use the
> single model-neutral key set on the Governance tab.
