/* bridge.cjs — the Python<->UNAI bridge for this app.
 *
 * This app (unlike the other conversions in this series) is Python
 * (FastAPI + Streamlit + LangGraph), not Node/TypeScript -- engine.cjs and
 * cognition.cjs are pure JS, so they can't be `import`ed directly from
 * Python. This script is the seam: src/agents/unai_bridge.py spawns
 * `node agents/unai/bridge.cjs` as a short-lived subprocess per decision,
 * writes one JSON request to its stdin, and reads one JSON response from
 * its stdout. Everything else about the backend swap (which real UNAI
 * capability answers which agent's question, reshaping output back into
 * the original schema, the real per-run token comparison) is identical in
 * spirit to the Node/TS apps in this series -- just carried across a
 * process boundary instead of an in-process require().
 *
 * Request (stdin, JSON): { capability, systems, agentId, systemInstruction,
 *   prompt, completionText }
 *   - capability/systems/agentId: which real UNAI capability to run, and
 *     its exact systems array (lifted from engine.js's own USE_CASES, not
 *     guessed -- see each agent_NN_*.py's comment for the citation).
 *   - systemInstruction/prompt: the EXACT text this agent's original LLM
 *     call would have sent (built in Python, since Python already has all
 *     the real deterministic-metrics data) -- tokenized here for real via
 *     gpt-tokenizer, never sent to any LLM.
 *   - completionText: the real fallback/reshaped reasoning text this run
 *     produced, used as the completion-size proxy for the original side.
 *
 * Response (stdout, JSON): { ok, evidence, tokenComparison } or
 *   { ok: false, error }.
 */
"use strict";

global.COGNITION = require("./cognition.cjs");
const { UNAI } = require("./engine.cjs");
const { encode } = require("gpt-tokenizer");
const { narrateReal, resolveConfig } = require("./liveNarration.cjs");
const tok = s => encode(String(s == null ? "" : s)).length;

function unaiPromptFor(ev) {
  const drivers = (ev.attribution || []).map(d => `- ${d.name}: ${Math.round(d.share * 100)}% of the decision`).join("\n");
  return "You are the Explainability layer of an autonomous supply-chain agent. " +
    "Write ONE concise business-English sentence (max 40 words) explaining this decision to a planner. " +
    "Use ONLY the facts below; do not invent numbers. State whether it executed autonomously or was routed to a human, and why.\n\n" +
    `Decision: ${ev.decision}\nConfidence: ${Math.round(ev.confidence * 100)}% (uncertainty ${ev.uncertainty})\n` +
    `Autonomy threshold: ${Math.round((ev.threshold || 0.85) * 100)}%\nDrivers:\n${drivers}\n` +
    `Outcome: ${ev.autonomous ? "executed autonomously" : "routed to a human approver"}\n` +
    (ev.gate ? `Governance gate: ${ev.gate}\n` : "");
}
const UNAI_COMPLETION_CAP = 40;

async function main() {
  let raw = "";
  process.stdin.on("data", c => raw += c);
  process.stdin.on("end", async () => {
    try {
      const req = JSON.parse(raw || "{}");
      const { capability, systems, agentId, systemInstruction, prompt, completionText } = req;
      const goal = { name: agentId || capability, plan: [{ capability, agentEquiv: capability.replace(/_/g, " "), systems }], gen1Agents: [capability] };
      const res = new UNAI({ name: agentId || capability }).run(goal);
      const c = res.results[capability];
      if (!c) throw new Error(`Capability '${capability}' did not resolve (check the systems array).`);
      const ev = c.evidence;

      const originalPromptTokens = tok(systemInstruction) + tok(prompt);
      const originalCompletionTokens = tok(completionText);
      const originalTotal = originalPromptTokens + originalCompletionTokens;

      const keyConfigured = resolveConfig().ok;
      let unai = null, callFailedDespiteKey = false, live = null;
      const real = keyConfigured ? await narrateReal(ev).catch(() => null) : null;
      if (real) {
        const unaiTotal = real.promptTokens + real.completionTokens;
        unai = { promptTokens: real.promptTokens, completionTokens: real.completionTokens, total: unaiTotal, measured: "live", provider: real.provider, model: real.model };
        live = { explanation: real.text };
      } else {
        callFailedDespiteKey = keyConfigured;
        const p = tok(unaiPromptFor(ev));
        unai = { promptTokens: p, completionTokens: UNAI_COMPLETION_CAP, total: p + UNAI_COMPLETION_CAP, measured: "estimated" };
      }
      const reductionPct = originalTotal ? Math.round((1 - unai.total / originalTotal) * 100) : null;

      let methodology;
      if (unai.measured === "live") {
        methodology = `LIVE measured call to ${unai.provider} (${unai.model}) for the UNAI side — real usage.prompt_tokens/completion_tokens from that provider's own API response. Original-app side is a local BPE tokenization (gpt-tokenizer) of the real prompt text, since the original app's own LLM endpoint isn't called here.`;
      } else if (callFailedDespiteKey) {
        methodology = "A provider key IS configured, but this run's live narration call failed (network error, timeout, or a non-2xx response such as a rate limit) — falling back to a local token ESTIMATE for the UNAI side rather than a measured one. Original-app side is a real BPE tokenization (gpt-tokenizer, cl100k_base) of the actual prompt text this run would have used.";
      } else {
        methodology = "Real BPE tokenization (gpt-tokenizer, cl100k_base) of the actual prompt text this run would have used — not the original app's exact model tokenizer, so treat as accurate order-of-magnitude, not exact billing. Nothing here is sent to any LLM (no provider key configured).";
      }

      // Per-layer token consumption: res.observability.layerTokens already
      // attributes this run's tokens across UNAI's own 7 layers (L1..L7) --
      // modeled, shared-runtime rates, the SAME model used for the
      // whole-run comparison above. Most layers are 0 (deterministic reads/
      // writes/reasoning); only Explainability (and sometimes Reasoning)
      // touch anything token-shaped.
      const LAYER_IDS = ["L1", "L2", "L3", "L4", "L5", "L6", "L7"];
      const layerTokens = (res.observability && res.observability.layerTokens) || [];
      const perLayerTokens = layerTokens.map((l, i) => ({ id: LAYER_IDS[i] || `L${i + 1}`, name: l.name, in: l.in || 0, out: l.out || 0, total: l.total != null ? l.total : (l.in || 0) + (l.out || 0) }));

      const tokenComparison = {
        methodology,
        original: { label: "Original app: 1 full LLM call (this agent's real prompt)", promptTokens: originalPromptTokens, completionTokens: originalCompletionTokens, total: originalTotal },
        unaiIfLlmNarrated: { label: unai.measured === "live" ? `UNAI, LIVE ${unai.provider} call: 1 shared explainability call` : "UNAI, IF it also narrated via an LLM: 1 shared explainability call (estimated)", ...unai, ...(live || {}) },
        unaiActual: { label: "UNAI, as actually run just now: real ported formula, no LLM call", total: 0 },
        reductionPctIfLlmNarrated: reductionPct,
        perLayerTokens: perLayerTokens.length ? perLayerTokens : null,
        perLayerMeasured: perLayerTokens.length ? "modeled" : null,
      };

      process.stdout.write(JSON.stringify({ ok: true, evidence: ev, tokenComparison }));
    } catch (e) {
      process.stdout.write(JSON.stringify({ ok: false, error: String((e && e.message) || e) }));
    }
  });
}
main();
