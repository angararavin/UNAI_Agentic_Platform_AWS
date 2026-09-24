// ==========================================================================
// Mercury Knowledge Assistant — STANDALONE app
//
// Runs WITHOUT the rest of the UNAI platform (no Studio, no other agents).
// It carries only the runtime pieces it needs: the knowledge assistant plus
// UNAI's vector store + model gateway (knowledge_assistant.js -> engine.js,
// llm.js). Zero external dependencies. Own admin key screen — the org key is
// set from the UI, not an env var.
//
//   node mercury-assistant-standalone/server.js
//   open http://localhost:8090          (ask)   ·   /admin   (set the org key)
//
// To deploy truly separately, copy these three files next to this one:
//   knowledge_assistant.js, engine.js, llm.js
// ==========================================================================
const http = require("http"), url = require("url");
const { KnowledgeAssistant, setOrgModelKey } = require("../knowledge_assistant.js");
const { resolveConfig } = require("../llm.js");

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "changeme";   // gate the key screen
const ka = new KnowledgeAssistant();
const ready = ka.ingest();

const send = (res, c, t, b) => { res.writeHead(c, { "Content-Type": t }); res.end(b); };
const json = (res, c, o) => send(res, c, "application/json", JSON.stringify(o));
const body = req => new Promise(r => { let b = ""; req.on("data", c => b += c); req.on("end", () => { try { r(JSON.parse(b || "{}")); } catch { r({}); } }); });

const ASK = `<!doctype html><meta charset=utf8><title>Mercury Assistant</title>
<style>body{font:15px/1.5 Arial;max-width:720px;margin:40px auto;color:#333536}
h1{color:#13214A}.bar{height:6px;background:#21A6BD;margin:-40px -40px 24px}
input,select,button{font:15px Arial;padding:8px 10px}input{width:60%}
button{background:#21A6BD;color:#fff;border:0;border-radius:6px;cursor:pointer}
pre{background:#F4F6F7;padding:16px;border-radius:8px;white-space:pre-wrap}
small{color:#6B7480}a{color:#17795E}</style>
<div class=bar></div><h1>Mercury Knowledge Assistant</h1>
<p><small>Ask a question, or ask for a document. Answers are trimmed to what your role can access.
&nbsp;·&nbsp;<a href=/admin>admin</a> &nbsp;·&nbsp; model: <span id=m>…</span></small></p>
<p>Role: <select id=g><option value=all>all (standard)</option><option value=finance>finance</option></select>
&nbsp;<input id=q placeholder="e.g. What is BST?" onkeydown="if(event.key==='Enter')go()">
<button onclick=go()>Ask</button></p><pre id=o>…</pre>
<script>
fetch('/api/status').then(r=>r.json()).then(s=>m.textContent=s.model)
async function go(){o.textContent='…';const groups=g.value==='finance'?['all','finance']:['all'];
const r=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:q.value,groups})}).then(r=>r.json());
o.textContent=r.render+(r.grounded?'\\n\\n[answered live via the org model key]':r.type==='answer'?'\\n\\n[modeled — set the org key in /admin for live answers]':'')}
</script>`;

const ADMIN = `<!doctype html><meta charset=utf8><title>Admin · model key</title>
<style>body{font:15px/1.5 Arial;max-width:560px;margin:40px auto;color:#333536}
h1{color:#13214A}.bar{height:6px;background:#BF0D3F;margin:-40px -40px 24px}
label{display:block;margin:12px 0 4px;font-weight:bold}input{width:100%;padding:8px;font:14px Arial}
button{margin-top:16px;background:#13214A;color:#fff;border:0;border-radius:6px;padding:10px 16px;cursor:pointer}
small{color:#6B7480}code{background:#F4F6F7;padding:1px 5px}</style>
<div class=bar></div><h1>Set the org model key</h1>
<p><small>One key for everyone (admin only). Nothing here is sent to users; the key is held server-side.
For a Microsoft shop use Azure OpenAI: base URL = your endpoint, model = your deployment.</small></p>
<label>Admin token</label><input id=tok placeholder="ADMIN_TOKEN">
<label>API key</label><input id=key placeholder="Azure/OpenAI/Mistral key">
<label>Base URL (Azure/gateway; blank = Mistral)</label><input id=base placeholder="https://YOUR.openai.azure.com">
<label>Model / deployment</label><input id=model placeholder="gpt-4o">
<button onclick=save()>Apply</button><pre id=o></pre>
<script>async function save(){const r=await fetch('/api/model-key',{method:'POST',
headers:{'Content-Type':'application/json','x-admin-token':tok.value},
body:JSON.stringify({key:key.value,baseUrl:base.value,model:model.value})}).then(r=>r.json());
o.textContent=JSON.stringify(r,null,2)}</script>`;

const server = http.createServer(async (req, res) => {
  const u = url.parse(req.url, true);
  if (req.method === "GET" && u.pathname === "/") return send(res, 200, "text/html", ASK);
  if (req.method === "GET" && u.pathname === "/admin") return send(res, 200, "text/html", ADMIN);
  if (req.method === "GET" && u.pathname === "/api/status") { const c = resolveConfig(); return json(res, 200, { model: c.ok ? `${c.label} · ${c.model}` : "none (modeled)" }); }
  if (req.method === "POST" && u.pathname === "/api/ask") { await ready; const b = await body(req); return json(res, 200, await ka.ask(b.query || "", { id: b.user || "anon", groups: b.groups || ["all"] })); }
  if (req.method === "POST" && u.pathname === "/api/model-key") {
    if ((req.headers["x-admin-token"] || "") !== ADMIN_TOKEN) return json(res, 403, { error: "admin only — wrong ADMIN_TOKEN" });
    return json(res, 200, setOrgModelKey(await body(req)));
  }
  send(res, 404, "text/plain", "not found");
});
const PORT = process.env.PORT || 8090;
server.listen(PORT, () => console.log(`[Mercury Assistant · standalone] http://localhost:${PORT}   (admin key screen: /admin, ADMIN_TOKEN='${ADMIN_TOKEN}')`));
