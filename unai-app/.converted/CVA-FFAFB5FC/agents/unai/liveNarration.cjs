/* liveNarration.cjs — an OPTIONAL, real LLM call for the "if UNAI also
 * narrated via an LLM" side of the token comparison. Reads a provider key
 * from the environment (MISTRAL_API_KEY by default, or a GATEWAY_* trio for
 * any OpenAI-compatible endpoint) and makes ONE real chat-completions call
 * per decision — same OpenAI-compatible shape UNAI Studio's own llm.js uses,
 * reimplemented minimally here rather than bundling that proprietary file.
 *
 * No key configured -> narrateReal() resolves to null and the caller falls
 * back to a local token estimate (tokenCompare.cjs's prior behavior). This
 * never blocks or fails a run: any network/API error is caught and treated
 * the same as "no key."
 */
"use strict";

function resolveConfig() {
  const base = process.env.GATEWAY_BASE_URL || (process.env.MISTRAL_API_KEY ? "https://api.mistral.ai/v1" : "");
  const key = process.env.GATEWAY_API_KEY || process.env.MISTRAL_API_KEY || "";
  const model = process.env.GATEWAY_MODEL || "mistral-small-latest";
  return { base, key, model, ok: !!(base && key) };
}

function buildPrompt(ev) {
  const drivers = (ev.attribution || []).map(d => `- ${d.name}: ${Math.round(d.share * 100)}% of the decision`).join("\n");
  return "You are the Explainability layer of an autonomous supply-chain agent. " +
    "Write ONE concise business-English sentence (max 40 words) explaining this decision to a planner. " +
    "Use ONLY the facts below; do not invent numbers. State whether it executed autonomously or was routed to a human, and why.\n\n" +
    `Decision: ${ev.decision}\nConfidence: ${Math.round(ev.confidence * 100)}% (uncertainty ${ev.uncertainty})\n` +
    `Autonomy threshold: ${Math.round((ev.threshold || 0.85) * 100)}%\nDrivers:\n${drivers}\n` +
    `Outcome: ${ev.autonomous ? "executed autonomously" : "routed to a human approver"}\n` +
    (ev.gate ? `Governance gate: ${ev.gate}\n` : "");
}

/** Real call for one decision. Returns null if no key or on any failure. */
async function narrateReal(ev, timeoutMs = 15000) {
  const cfg = resolveConfig();
  if (!cfg.ok) return null;
  const prompt = buildPrompt(ev);
  const t0 = Date.now();   // measure real wall-clock latency of this narration call
  try {
    const res = await fetch(cfg.base.replace(/\/$/, "") + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${cfg.key}` },
      body: JSON.stringify({ model: cfg.model, messages: [{ role: "user", content: prompt }], temperature: 0.2, max_tokens: 80 }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    const u = data?.usage || {};
    if (!text) return null;
    return { text: text.trim(), promptTokens: u.prompt_tokens || 0, completionTokens: u.completion_tokens || 0, ms: Date.now() - t0, model: cfg.model, provider: cfg.base.includes("mistral") ? "mistral" : "gateway" };
  } catch (_e) {
    return null; // network/timeout/TLS — never block the run over this
  }
}

module.exports = { narrateReal, resolveConfig, buildPrompt };
