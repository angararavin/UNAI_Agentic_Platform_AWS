// ==========================================================================
// containment.js — Agent Safety & Containment controls for UNAI.
//
// The posture is CONTAINMENT, not a promise that an agent never misbehaves:
// least privilege, hard human gates on impact, no undeclared network reach,
// always-on detection, and a kill switch — so a misbehaving agent can't do
// much and is caught fast. This module is the single enforcement point; the
// server, engine and API all consult it.
//
// State is process-level (in-memory) for now; in production back it with the
// tenant store + KMS. Every state change and every block is recorded to an
// in-memory event log (the "always-on detection" surface) and should also be
// mirrored to the decision+outcome ledger.
// ==========================================================================

const EVENTS = [];                       // recent containment events (capped)
const EVENT_CAP = 500;

// ---- Regulatory / standards framework mapping ---------------------------
// Each containment control is designed against a NAMED clause of the frameworks
// UNAI's governance targets: the NIST AI Risk Management Framework (AI RMF 1.0 —
// GOVERN / MAP / MEASURE / MANAGE), the EU AI Act (Regulation (EU) 2024/1689,
// high-risk obligations Art. 9–17), and the SOC 2 Trust Services Criteria
// (Security / Availability / Processing Integrity / Confidentiality / Privacy).
// This makes the mapping a first-class property of the runtime guardrail (read
// via status()/compliance()), not just prose in a doc generator.
//
// HONEST SCOPE — read before quoting this anywhere:
//   • This is a self-assessment control-to-clause MAPPING: what each mechanism is
//     BUILT TO SATISFY. It is NOT a certification, attestation, or third-party
//     conformity assessment.
//   • SOC 2 is an AUDITED attestation — a licensed CPA firm must examine the
//     controls over a period and issue a Type I/II report. UNAI has NOT undergone
//     that audit, so UNAI is "designed toward SOC 2", NOT "SOC 2 compliant".
//   • EU AI Act conformity requires a formal risk classification + DPIA (route to
//     counsel — see the Licensing Manifest). NIST AI RMF is voluntary guidance,
//     not a pass/fail certification.
// The attestation status below states this plainly so no surface can overclaim.
const FRAMEWORKS = {
  standards: [
    { id: "NIST_AI_RMF", name: "NIST AI Risk Management Framework (AI RMF 1.0)" },
    { id: "EU_AI_ACT",   name: "EU AI Act (Regulation (EU) 2024/1689)" },
    { id: "SOC2_TSC",    name: "SOC 2 Trust Services Criteria (AICPA)" },
  ],
  // Independent, verifiable status — what is ATTESTED vs merely DESIGNED-FOR.
  attestation: {
    soc2:      { status: "not_attested", note: "No SOC 2 Type I/II audit performed. Controls are designed toward the TSC; an independent CPA audit is required to claim compliance." },
    euAiAct:   { status: "not_assessed", note: "No formal AI Act risk classification or DPIA completed. Route to counsel before EU market placement." },
    nistAiRmf: { status: "self_aligned", note: "Voluntary framework — controls self-mapped to AI RMF functions; no external assessment." },
    thirdPartyAudit: false,
  },
  controls: [
    { control: "Human-in-the-loop gate + kill switch (safe mode forces every high-impact action to human approval)",
      nist: ["MANAGE-1", "MANAGE-2.3"], euAiAct: ["Article 14 — Human oversight"], soc2: ["CC7.4 — incident response", "PI1.2 — processing integrity"] },
    { control: "Confidence gate + risk-tiered action policy (autonomy only above threshold and within value limits)",
      nist: ["MAP-1", "MEASURE-2"], euAiAct: ["Article 9 — Risk management system"], soc2: ["PI1.1 — processing integrity", "CC3.1 — risk assessment"] },
    { control: "Always-on detection + immutable audit event log + decision→outcome ledger",
      nist: ["MEASURE-2.7", "GOVERN-1.4"], euAiAct: ["Article 12 — Record-keeping / automatic logging"], soc2: ["CC7.2 — monitoring", "CC7.3 — evaluation of events"] },
    { control: "Egress allowlist + least-privilege containment (no undeclared network reach)",
      nist: ["MANAGE-2.2"], euAiAct: ["Article 15 — Accuracy, robustness and cybersecurity"], soc2: ["CC6.1 — logical access", "CC6.6 — boundary protection"] },
    { control: "Evidence engine — confidence, attribution, uncertainty bounds surfaced per decision",
      nist: ["MEASURE-2.9"], euAiAct: ["Article 13 — Transparency & provision of information",
                                        "Article 15 — Accuracy, robustness and cybersecurity"], soc2: ["PI1.4 — accurate output", "PI1.5 — complete output"] },
    { control: "Governance policy controls (thresholds, action policy, allowlist) with change-logging",
      nist: ["GOVERN-1", "GOVERN-2"], euAiAct: ["Article 17 — Quality management system"], soc2: ["CC8.1 — change management", "CC5.2 — control activities"] },
  ],
};

const state = {
  // KILL SWITCH — when on, no action executes autonomously: every action-kind
  // decision is forced to human approval (autonomy threshold made unreachable).
  safeMode: process.env.UNAI_SAFE_MODE === "1",
  // EGRESS ALLOWLIST — hostnames the platform may reach outbound. Empty = allow
  // (but log) for local/demo; set UNAI_EGRESS_ALLOWLIST to lock it down.
  egressAllowlist: (process.env.UNAI_EGRESS_ALLOWLIST || "")
    .split(",").map(s => s.trim().toLowerCase()).filter(Boolean),
  // ACTION POLICY — 'gated' (default: high-impact actions require approval via the
  // value/confidence gate), 'deny' (block all actions), 'allow' (trust the gate only).
  actionPolicy: (process.env.UNAI_ACTION_POLICY || "gated"),
  // Per-run action cap — a circuit breaker against runaway loops.
  maxActionsPerRun: Number(process.env.UNAI_MAX_ACTIONS_PER_RUN || 50),
};

function record(kind, data) {
  const e = { ts: new Date().toISOString(), kind, ...(data || {}) };
  EVENTS.push(e); if (EVENTS.length > EVENT_CAP) EVENTS.shift();
  return e;
}
function recentEvents(n = 50) { return EVENTS.slice(-n).reverse(); }

function status() {
  return {
    safeMode: state.safeMode,
    actionPolicy: state.actionPolicy,
    egressAllowlist: state.egressAllowlist.slice(),
    egressLocked: state.egressAllowlist.length > 0,
    maxActionsPerRun: state.maxActionsPerRun,
    recentBlocks: EVENTS.filter(e => /block|deny|kill/.test(e.kind)).slice(-10).reverse(),
    // Named-framework alignment is a property of the guardrail itself.
    frameworks: FRAMEWORKS.standards.map(s => s.name),
    attestation: FRAMEWORKS.attestation,
  };
}

// ---- Compliance mapping (read-only) -------------------------------------
// Returns the full control-to-clause mapping + the honest attestation status.
// Consumed by the Governance/Access surfaces and the API so the platform can
// SHOW which named clauses each control targets — without overclaiming that any
// of them is independently certified.
function compliance() {
  return {
    standards: FRAMEWORKS.standards,
    attestation: FRAMEWORKS.attestation,
    controls: FRAMEWORKS.controls,
    disclaimer: "Self-assessment control mapping — NOT a certification or audited attestation. " +
      "SOC 2 requires an independent CPA Type I/II audit (not performed). EU AI Act conformity " +
      "requires a formal risk classification + DPIA (route to counsel). NIST AI RMF is voluntary guidance.",
  };
}

// ---- Kill switch --------------------------------------------------------
function setKillSwitch(on, who) {
  state.safeMode = !!on;
  record(on ? "kill_switch_on" : "kill_switch_off", { who: who || "system" });
  return status();
}

// ---- Egress control -----------------------------------------------------
function hostOf(url) { try { return new URL(url).hostname.toLowerCase(); } catch (_) { return ""; } }
function egressAllowed(url) {
  const host = hostOf(url);
  if (!state.egressAllowlist.length) return { allowed: true, host, reason: "allowlist-empty" };
  const ok = state.egressAllowlist.some(a => host === a || host.endsWith("." + a));
  return { allowed: ok, host, reason: ok ? "allowlisted" : "not-allowlisted" };
}
// Throwing guard for outbound HTTP call sites (llm.js, connectors).
function assertEgress(url, context) {
  const r = egressAllowed(url);
  if (!r.allowed) {
    record("egress_blocked", { host: r.host, context: context || null });
    const err = new Error(`egress blocked by containment: ${r.host} not in allowlist`);
    err.code = "EGRESS_BLOCKED"; throw err;
  }
  return true;
}
function setEgressAllowlist(list, who) {
  state.egressAllowlist = (Array.isArray(list) ? list : String(list || "").split(","))
    .map(s => String(s).trim().toLowerCase()).filter(Boolean);
  record("egress_allowlist_set", { who: who || "system", allowlist: state.egressAllowlist.slice() });
  return status();
}

// ---- Action policy ------------------------------------------------------
// Consulted by run entry points. Returns how a run must be constrained.
function runConstraints(requested) {
  const c = Object.assign({}, requested || {});
  if (state.safeMode || state.actionPolicy === "deny") {
    // Force every action-kind decision to human approval: make the autonomy
    // threshold unreachable so nothing acts without a person. Reuses the
    // existing governance gate rather than a second code path.
    c.autonomyThreshold = 1.01;
    c._containment = state.safeMode ? "safe_mode" : "deny_policy";
    record("run_forced_hitl", { reason: c._containment, useCase: requested && requested._uc });
  }
  if (Number.isFinite(state.maxActionsPerRun)) c.maxActions = state.maxActionsPerRun;
  return c;
}
function setActionPolicy(policy, who) {
  if (["gated", "deny", "allow"].includes(policy)) {
    state.actionPolicy = policy; record("action_policy_set", { who: who || "system", policy });
  }
  return status();
}

module.exports = {
  status, recentEvents, record, compliance,
  setKillSwitch, setEgressAllowlist, setActionPolicy,
  egressAllowed, assertEgress, runConstraints,
  FRAMEWORKS,
  get safeMode() { return state.safeMode; },
};
