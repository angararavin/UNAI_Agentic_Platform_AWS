# UNAI MCP server

Exposes UNAI agents as **MCP tools** so Claude (Desktop or Code) — or any MCP
client — can call UNAI. It wraps UNAI's `/api/v1` REST API; the UNAI server does
the work, this just speaks the MCP protocol.

Tools exposed: `unai_list_agents`, `unai_run_agent`, `unai_get_ontology`,
`unai_containment_status`.

## Setup

1. **Install deps** (once):
   ```bash
   cd unai-app/mcp && npm install
   ```
2. **Run the UNAI server** with an API key set (in `unai-app`):
   ```bash
   UNAI_API_KEYS=my-secret-key npm start      # serves http://localhost:3000
   ```
   (Or use the key printed in the boot log if you don't set `UNAI_API_KEYS`.)
3. **Register with Claude Desktop** — add to
   `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):
   ```json
   {
     "mcpServers": {
       "unai": {
         "command": "node",
         "args": ["/ABSOLUTE/PATH/TO/unai-app/mcp/mcp-server.js"],
         "env": {
           "UNAI_BASE_URL": "http://localhost:3000",
           "UNAI_API_KEY": "my-secret-key"
         }
       }
     }
   }
   ```
   Restart Claude Desktop. UNAI's tools now appear (the plug/hammer icon).

   **Claude Code** instead:
   ```bash
   claude mcp add unai --env UNAI_BASE_URL=http://localhost:3000 \
     --env UNAI_API_KEY=my-secret-key -- node /ABSOLUTE/PATH/TO/unai-app/mcp/mcp-server.js
   ```

## Try it
In Claude: *"List the UNAI agents"* → then *"Run the dc_hw_rma agent and summarise the decisions."*
Claude calls UNAI; the answer comes back governed (with UNAI's decisions, token
economics and containment status).

> Auth note: Claude authenticates to UNAI with the UNAI token above — UNAI does
> not need Claude's / OpenAI's / Gemini's API keys. UNAI's own model calls use
> the single model-neutral key set on the Governance tab.

## "Hi UNAI" menu (pick and run)

Type **`Hi UNAI`** in Claude Desktop and UNAI replies with a grouped, numbered
menu of every runnable agent (Demand & Forecasting, Inventory/Supply/Production,
Response & Disruption, Procurement & Logistics, Returns/Spares/RMA, Equipment/
Knowledge/Change). Reply with a number (or the agent name) and Claude runs it via
`unai_run_agent`, then summarizes the decisions and recommended actions.

- Driven by the `unai_menu` tool plus server-level `instructions`, so the plain
  greeting triggers the menu — the pick itself is a normal chat reply (the desktop
  client renders menu text, not clickable buttons).
- Two **native prompts** also appear in Claude Desktop's prompt picker (the "+"):
  **Hi UNAI (show menu)** and **Run a UNAI agent** (takes an `id`).
- The menu is built live from `/api/v1/agents`, so new agents appear automatically
  (any not in a named group fall under **More**).
