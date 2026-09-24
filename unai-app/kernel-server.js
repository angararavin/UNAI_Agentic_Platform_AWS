// ==========================================================================
// kernel-server.js — REFERENCE hosted kernel (the Bristlecone control plane).
//
// This is the OTHER side of the split: it holds engine.js and executes the
// cognitive runtime, exposing one endpoint the connector calls. In production
// this runs in Bristlecone's cloud (or a sealed appliance); the customer's
// connector calls it over the network and never ships engine.js.
//
//   Run:   UNAI_KERNEL_KEY=secret KERNEL_PORT=4900 node kernel-server.js
//   Then run the connector with:
//     UNAI_DEPLOY_MODE=hosted-kernel UNAI_KERNEL_URL=http://<host>:4900 \
//     UNAI_KERNEL_KEY=secret node server.js
// ==========================================================================

const http = require("http");
const { UNAI } = require("./engine.js");

const KEY = process.env.UNAI_KERNEL_KEY || "";
const PORT = Number(process.env.KERNEL_PORT || 4900);

const server = http.createServer((req, res) => {
  const send = (code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };

  if (req.url === "/kernel/health" && req.method === "GET") return send(200, { ok: true, kernel: "unai", version: 1 });

  if (req.url === "/kernel/run" && req.method === "POST") {
    if (KEY) { const h = req.headers.authorization || ""; if (h !== "Bearer " + KEY) return send(401, { error: "unauthorized" }); }
    let b = ""; req.on("data", c => b += c); req.on("end", () => {
      try {
        const { goal, config } = JSON.parse(b || "{}");
        const agent = new UNAI(config || {});
        const out = agent.run(goal);
        send(200, { ok: true, out });
      } catch (e) { send(500, { error: e.message }); }
    });
    return;
  }
  send(404, { error: "not found" });
});

server.listen(PORT, () => console.log(`[unai-kernel] control plane on http://localhost:${PORT}  (auth: ${KEY ? "on" : "off"})`));
