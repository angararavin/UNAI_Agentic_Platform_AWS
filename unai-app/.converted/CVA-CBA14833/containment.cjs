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

// Known-good outbound destinations, populated by default so egress is NOT an
// open "allow anything" list out of the box (the OpenAI–Hugging Face incident
// lesson: restrict outbound to approved destinations, deny by default). Operators
// extend this with their own data-source hosts via UNAI_EGRESS_ALLOWLIST.
const DEFAULT_EGRESS_ALLOWLIST = [
  "api.openai.com", "api.anthropic.com", "api.mistral.ai",
  "generativelanguage.googleapis.com", "api.groq.com", "api.deepseek.com",
  "api.together.xyz", "api.together.ai", "openrouter.ai",
  "router.project-osrm.org",
];
const state = {
  // KILL SWITCH — when on, no action executes autonomously: every action-kind
  // decision is forced to human approval (autonomy threshold made unreachable).
  safeMode: process.env.UNAI_SAFE_MODE === "1",
  // EGRESS ALLOWLIST — hostnames the platform may reach outbound. Defaults to the
  // known provider/tool hosts; env value REPLACES the default when set.
  egressAllowlist: (process.env.UNAI_EGRESS_ALLOWLIST != null
    ? String(process.env.UNAI_EGRESS_ALLOWLIST).split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
    : DEFAULT_EGRESS_ALLOWLIST.slice()),
  // EGRESS MODE — 'enforce' blocks non-allowlisted hosts; 'monitor' allows but
  // LOGS every unlisted destination (visibility without breakage). Safe mode
  // always enforces. Default 'monitor' so an unknown connector host is surfaced,
  // not silently broken — set UNAI_EGRESS_MODE=enforce (recommended in prod).
  egressMode: (process.env.UNAI_EGRESS_MODE === "enforce" ? "enforce" : "monitor"),
  // ACTION POLICY — 'gated' (default: high-impact actions require approval via the
  // value/confidence gate), 'deny' (block all actions), 'allow' (trust the gate only).
  actionPolicy: (process.env.UNAI_ACTION_POLICY || "gated"),
  // Per-run action cap — a circuit breaker against runaway loops.
  maxActionsPerRun: Number(process.env.UNAI_MAX_ACTIONS_PER_RUN || 50),
  // ANOMALY AUTO-HALT — a rolling cross-run action-rate monitor. If action volume
  // over the window exceeds the threshold, safe mode is auto-engaged (the report's
  // "rapid, automatic shutdown on anomalous activity" lesson).
  anomaly: { windowMs: 60000, maxActions: Number(process.env.UNAI_ANOMALY_MAX_ACTIONS || 300), hits: [], tripped: false },
};

function record(kind, data) {
  const e = { ts: new Date().toISOString(), kind, ...(data || {}) };
  EVENTS.push(e); if (EVENTS.length > EVENT_CAP) EVENTS.shift();
  try { maybeAlert(e); } catch (_) {}
  return e;
}
function recentEvents(n = 50) { return EVENTS.slice(-n).reverse(); }

// ---- Alerting & 24/7 escalation -----------------------------------------
// Critical containment events raise an alert (optionally POSTed to a webhook so
// they page a human), and if a critical alert is not acknowledged within the
// escalation window it auto-escalates and puts the platform into safe mode. This
// implements the report's "notify quickly, auto-pause if not cleared" control.
const ALERTS = [];
const SEVERITY = { auto_halt: "critical", egress_blocked: "high", kill_switch_on: "high",
  alert_escalated: "critical", run_forced_hitl: "low",
  misalignment_flagged: "high", misalignment_critical: "critical" };
const RANK = { low: 1, medium: 2, high: 3, critical: 4 };
state.alerts = {
  webhookUrl: process.env.UNAI_ALERT_WEBHOOK || "",
  minSeverity: (process.env.UNAI_ALERT_MIN_SEVERITY || "high"),
  escalateAfterMs: Number(process.env.UNAI_ALERT_ESCALATE_MS || 30 * 60000),
  autoPauseOnEscalate: process.env.UNAI_ALERT_AUTOPAUSE !== "0",
};
function severityOf(kind) { return SEVERITY[kind] || "low"; }
function dispatchWebhook(alert) {
  const url = state.alerts.webhookUrl;
  if (!url || typeof fetch !== "function") return;
  try {
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "unai-containment", alert }),
      signal: (typeof AbortSignal !== "undefined" && AbortSignal.timeout) ? AbortSignal.timeout(5000) : undefined })
      .catch(() => {});   // fire-and-forget; alerting must never block or throw
  } catch (_) {}
}
function maybeAlert(e) {
  if (e.kind === "alert_raised" || e.kind === "alert_escalated" || e.kind === "alert_ack") return;
  const sev = severityOf(e.kind);
  if ((RANK[sev] || 0) < (RANK[state.alerts.minSeverity] || 3)) return;
  const alert = { id: "al" + Date.now().toString(36) + Math.floor(Math.random() * 1e3),
    ts: Date.now(), kind: e.kind, severity: sev, status: "open", event: e };
  ALERTS.push(alert); if (ALERTS.length > 500) ALERTS.shift();
  dispatchWebhook(alert);
  return alert;
}
function checkEscalations() {
  const now = Date.now(); const out = [];
  for (const a of ALERTS) {
    if (a.status !== "open") continue;
    if (now - a.ts >= state.alerts.escalateAfterMs) {
      a.status = "escalated"; a.escalatedAt = now; out.push(a.id);
      record("alert_escalated", { alertId: a.id, kind: a.kind, severity: a.severity });
      if (state.alerts.autoPauseOnEscalate && !state.safeMode) setKillSwitch(true, "auto:escalation-timeout");
    }
  }
  return out;
}
function acknowledgeAlert(id, who) {
  const a = ALERTS.find(x => x.id === id);
  if (a && a.status !== "acknowledged") { a.status = "acknowledged"; a.ackBy = who || "unknown"; a.ackAt = Date.now();
    record("alert_ack", { alertId: id, who: a.ackBy }); }
  return a || null;
}
function listAlerts(n = 50) { return ALERTS.slice(-n).reverse(); }
function alertsSummary() { return { open: ALERTS.filter(a => a.status === "open").length,
  escalated: ALERTS.filter(a => a.status === "escalated").length, total: ALERTS.length,
  webhookSet: !!state.alerts.webhookUrl, minSeverity: state.alerts.minSeverity,
  escalateAfterMs: state.alerts.escalateAfterMs, autoPauseOnEscalate: state.alerts.autoPauseOnEscalate }; }
function setAlertConfig(cfg, who) {
  if (cfg && typeof cfg.webhookUrl === "string") state.alerts.webhookUrl = cfg.webhookUrl.trim();
  if (cfg && ["low", "medium", "high", "critical"].includes(cfg.minSeverity)) state.alerts.minSeverity = cfg.minSeverity;
  if (cfg && Number.isFinite(cfg.escalateAfterMs)) state.alerts.escalateAfterMs = cfg.escalateAfterMs;
  if (cfg && typeof cfg.autoPauseOnEscalate === "boolean") state.alerts.autoPauseOnEscalate = cfg.autoPauseOnEscalate;
  record("alert_config_set", { who: who || "system" });
  return alertsSummary();
}
// Periodic escalation sweep — unref'd so it never keeps the process alive, and
// skipped under test runners.
if (!process.env.UNAI_NO_TIMERS) {
  const _esc = setInterval(() => { try { checkEscalations(); } catch (_) {} }, 60000);
  if (_esc && _esc.unref) _esc.unref();
}

function status() {
  return {
    safeMode: state.safeMode,
    actionPolicy: state.actionPolicy,
    egressAllowlist: state.egressAllowlist.slice(),
    egressLocked: state.egressAllowlist.length > 0,
    egressMode: state.egressMode,
    egressEnforcing: state.egressMode === "enforce" || state.safeMode,
    maxActionsPerRun: state.maxActionsPerRun,
    anomaly: { windowMs: state.anomaly.windowMs, maxActions: state.anomaly.maxActions,
      windowCount: state.anomaly.hits.length, tripped: state.anomaly.tripped },
    alerts: alertsSummary(),
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
    const enforcing = state.egressMode === "enforce" || state.safeMode;
    if (enforcing) {
      record("egress_blocked", { host: r.host, context: context || null });
      const err = new Error(`egress blocked by containment: ${r.host} not in allowlist`);
      err.code = "EGRESS_BLOCKED"; throw err;
    }
    // monitor mode — surface the unlisted destination for visibility, then allow.
    record("egress_unlisted", { host: r.host, context: context || null, note: "allowed (monitor mode); set UNAI_EGRESS_MODE=enforce to block" });
  }
  return true;
}
function setEgressMode(mode, who) {
  if (mode === "enforce" || mode === "monitor") { state.egressMode = mode; record("egress_mode_set", { who: who || "system", mode }); }
  return status();
}
function setEgressAllowlist(list, who) {
  state.egressAllowlist = (Array.isArray(list) ? list : String(list || "").split(","))
    .map(s => String(s).trim().toLowerCase()).filter(Boolean);
  record("egress_allowlist_set", { who: who || "system", allowlist: state.egressAllowlist.slice() });
  return status();
}

// ---- Anomaly auto-halt --------------------------------------------------
// Feed each run's action count here. If the rolling action rate over the window
// exceeds the threshold, engage safe mode automatically and log the trip. This
// is the platform's "detect anomalous activity and halt automatically" control.
function recordActions(n, context) {
  const count = Math.max(0, Number(n) || 0);
  const now = Date.now();
  for (let i = 0; i < count; i++) state.anomaly.hits.push(now);
  const cutoff = now - state.anomaly.windowMs;
  state.anomaly.hits = state.anomaly.hits.filter(t => t >= cutoff);
  const windowCount = state.anomaly.hits.length;
  let tripped = false;
  if (windowCount > state.anomaly.maxActions && !state.safeMode) {
    tripped = true; state.anomaly.tripped = true;
    record("auto_halt", { reason: "anomalous action rate", windowCount, threshold: state.anomaly.maxActions, windowMs: state.anomaly.windowMs, context: context || null });
    setKillSwitch(true, "auto:anomaly-monitor");
  }
  return { windowCount, threshold: state.anomaly.maxActions, tripped, safeMode: state.safeMode };
}
function setAnomalyConfig(cfg, who) {
  if (cfg && Number.isFinite(cfg.maxActions)) state.anomaly.maxActions = cfg.maxActions;
  if (cfg && Number.isFinite(cfg.windowMs)) state.anomaly.windowMs = cfg.windowMs;
  record("anomaly_config_set", { who: who || "system", maxActions: state.anomaly.maxActions, windowMs: state.anomaly.windowMs });
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
  setKillSwitch, setEgressAllowlist, setEgressMode, setActionPolicy,
  egressAllowed, assertEgress, runConstraints,
  recordActions, setAnomalyConfig,
  listAlerts, alertsSummary, acknowledgeAlert, setAlertConfig, checkEscalations,
  FRAMEWORKS,
  get safeMode() { return state.safeMode; },
};
