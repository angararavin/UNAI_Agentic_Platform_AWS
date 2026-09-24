// ==========================================================================
// kernel-client.js — the split-runtime boundary in code.
//
// The cognitive KERNEL (engine.js — the 7-layer runtime, ontology, planning,
// economics) is the IP. This client decides WHERE it runs:
//
//   hosted-kernel : POST the goal to the Bristlecone control plane (UNAI_KERNEL_URL);
//                   the connector never loads engine.js — the secret sauce never ships.
//   self-hosted / appliance : run engine.js in-process (current behaviour).
//
// So the SAME connector binary can be shipped to a customer in hosted mode with
// no kernel inside it, or run fully local for an on-prem tier — one switch
// (UNAI_DEPLOY_MODE), no code change in the callers.
// ==========================================================================

const deployment = require("./deployment.js");

async function runAgent(goal, opts = {}) {
  const mode = deployment.MODE;

  if (mode === "hosted-kernel") {
    const base = process.env.UNAI_KERNEL_URL;
    if (!base) throw new Error("hosted-kernel mode requires UNAI_KERNEL_URL (the control-plane endpoint)");
    // Containment still governs egress even for the kernel call.
    try { require("./containment.js").assertEgress(base, "kernel"); } catch (e) { if (e.code === "EGRESS_BLOCKED") throw e; }
    const key = process.env.UNAI_KERNEL_KEY || "";
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs || 60000);
    try {
      const res = await fetch(base.replace(/\/$/, "") + "/kernel/run", {
        method: "POST", signal: ctrl.signal,
        headers: Object.assign({ "Content-Type": "application/json" }, key ? { Authorization: "Bearer " + key } : {}),
        body: JSON.stringify({ goal, config: opts.config || {} }),
      });
      if (!res.ok) throw new Error("kernel " + res.status + ": " + (await res.text()).slice(0, 200));
      const j = await res.json();
      return j.out || j;
    } finally { clearTimeout(timer); }
  }

  // self-hosted / appliance: the kernel runs here. Loaded lazily so a hosted
  // connector never even requires engine.js.
  const { UNAI } = require("./engine.js");
  const agent = new UNAI(opts.config || {});
  return agent.run(goal, opts.systems);
}

function info() {
  return { mode: deployment.MODE, remote: deployment.MODE === "hosted-kernel",
    kernelUrl: deployment.MODE === "hosted-kernel" ? (process.env.UNAI_KERNEL_URL || null) : null };
}

module.exports = { runAgent, info };
