/*
 * UNAI - Universal Supply-Chain Agent (Cognitive Runtime)
 * Copyright (c) 2026 Ravin Angara / Bristlecone. All rights reserved.
 *
 * PROPRIETARY & CONFIDENTIAL. This file, and the architecture, methods and
 * ideas it embodies, are the exclusive property of the copyright holders.
 * No part may be copied, reproduced, modified, distributed, reverse-engineered,
 * or used to create derivative works without prior written permission.
 * Shared under confidentiality; unauthorized use or disclosure is prohibited.
 * See LICENSE. Integrity: this file is listed in copyright/MANIFEST.sha256.
 * SPDX-License-Identifier: LicenseRef-UNAI-Proprietary   [UNAI-COPYRIGHT v1]
 */
/* =============================================================================
 * ocm_capabilities.js — the 10 real OCM capabilities (solution brief Section
 * 4's starter-prompt library), each reasoning over the ACTUAL engagement
 * context (ocm_store.js) + retrieved KB excerpts (ocm_kb_seed.js), instead of
 * the old fixed-scenario canned text. This is R-03/R-04 for real: same
 * capability set, real content grounded in real input.
 *
 * KB_SEED below is PLACEHOLDER example content, clearly labeled as such — it
 * demonstrates the grounding + citation mechanism (R-05) end-to-end, but the
 * firm's actual OCM methodology docs should replace it before this is used on
 * a real engagement. Swap KB_SEED for real content; nothing else changes.
 *
 * buildEvidence() below is what makes this a real UNAI use case architecturally,
 * not just a bespoke RAG app that happens to live in this repo: it runs the
 * real content through engine.js's Layers.evidence()/explain() — the same
 * confidence/attribution/waterfall machinery every other UNAI capability uses
 * — so this gets a real confidence score and lands in the same observability
 * shape as the rest of the platform. Autonomy is force-gated to false always
 * (see buildEvidence's comment) per the brief's own guardrail: every OCM
 * output is a draft, never presented as autonomously approved.
 * ========================================================================== */
const { Layers } = require("./engine.js");

const KB_SEED = [
  { id: "OCM-001", source: "[EXAMPLE] Change_Management_Playbook.md — Sponsorship",
    text: "Visible, active sponsorship at the point closest to the affected teams (not just VP-level) is the single strongest predictor of adoption. A sponsor who only appears at kickoff and go-live is a readiness risk.",
    tags: ["sponsorship", "readiness", "change plan", "stakeholder"] },
  { id: "OCM-002", source: "[EXAMPLE] Change_Management_Playbook.md — Phasing",
    text: "A change plan sized to a short runway should sequence in three bands: mobilize (confirm sponsorship, close stakeholder gaps), build capability (enablement, comms drafted), cutover (hypercare, fallback rehearsed). Each band gates into the next on readiness, not just the calendar date.",
    tags: ["change plan", "phasing", "rollout", "cutover"] },
  { id: "OCM-003", source: "[EXAMPLE] Stakeholder_Method.md — Segmentation",
    text: "Segment stakeholders on two axes: influence over the decision and impact of the change on their day-to-day work. High-influence/high-impact groups need direct, frequent engagement; low-influence/high-impact groups need clear communication and an escalation path, not just an FYI.",
    tags: ["stakeholder", "stakeholder analysis", "segmentation"] },
  { id: "OCM-004", source: "[EXAMPLE] Readiness_Framework.md — Dimensions",
    text: "Assess readiness across four dimensions: sponsorship visibility, capability (has the org been trained/resourced), capacity (do people have time to change on top of business-as-usual), and sentiment (what people actually say in 1:1s vs. in surveys). A gap in any one dimension can stall the whole rollout.",
    tags: ["readiness", "readiness assessment", "capacity", "sentiment"] },
  { id: "OCM-005", source: "[EXAMPLE] Change_Impact_Method.md — Dimensions",
    text: "Impact analysis should cover people (roles/responsibilities changed), process (steps added, removed, or resequenced), technology (systems touched, access changes), and policy (approvals, controls, compliance implications). Rank by which dimension carries the largest delta for the affected group.",
    tags: ["change impact", "impact analysis", "cia", "process", "technology", "policy"] },
  { id: "OCM-006", source: "[EXAMPLE] Resistance_Patterns.md — Common triggers",
    text: "Resistance concentrates where a change removes a familiar workaround (e.g., a parallel spreadsheet), threatens perceived expertise, or arrives without a visible 'what's in it for me.' Naming the specific workaround being retired, and who relies on it, is more effective mitigation than generic reassurance.",
    tags: ["resistance", "resistance prediction", "mitigation"] },
  { id: "OCM-007", source: "[EXAMPLE] Enablement_Method.md — Role-based paths",
    text: "Learning strategy should sequence managers ahead of their teams — a manager who is learning the new process live, alongside their own reports, cannot answer first-week questions credibly. Role-based paths (not one generic training) reduce time-to-competence.",
    tags: ["learning strategy", "training", "enablement", "manager"] },
  { id: "OCM-008", source: "[EXAMPLE] Comms_Method.md — Audience-channel fit",
    text: "Message the WHAT-CHANGES-FOR-YOU before the WHY-WE-DID-THIS for operational audiences; message the WHY first for sponsors and leadership. Match channel to audience — a single all-hands email under-serves a group needing a live Q&A.",
    tags: ["communications", "draft communications", "comms plan", "audience"] },
  { id: "OCM-009", source: "[EXAMPLE] Adoption_Metrics.md — Signals and thresholds",
    text: "Track adoption with a small number of weekly signals (active usage rate, help-desk ticket volume by topic, a short sentiment pulse) each with an explicit action threshold — a metric with no defined trigger for action is just a chart, not a management tool.",
    tags: ["measurement plan", "adoption", "metrics", "kpi"] },
  { id: "OCM-010", source: "[EXAMPLE] Rollout_Checklist.md — Sequencing",
    text: "Cutover-phase activities should be sequenced against go-live with explicit owners and timing: hypercare staffing confirmed, daily adoption pulse mechanism live, fallback/rollback procedure rehearsed (not just documented) before go-live, not after.",
    tags: ["rollout", "rollout checklist", "cutover", "go-live"] },
];

// Each capability: which context fields matter most for a good answer (used
// to decide whether to ask ONE clarifying question first — a lightweight,
// honest version of R-02's adaptive questioning, without a full multi-turn
// wizard), a KB search query, and the task instruction sent to the model.
const CAPABILITIES = [
  { id: "draft_change_plan", label: "Draft the change management plan",
    requiredFields: ["technology", "phase", "timeline", "stakeholderGroups"],
    kbQuery: "change plan phasing rollout cutover sponsorship",
    task: "Draft a phased change management plan for this engagement, sized to the stated timeline and stakeholder groups. Structure it as named phases with the key activities in each, and call out any dependency or gap you can see in the current plan." },
  { id: "stakeholder_analysis", label: "Build stakeholder analysis",
    requiredFields: ["stakeholderGroups", "industry", "technology"],
    kbQuery: "stakeholder segmentation influence impact",
    task: "Produce a stakeholder analysis: segment the named stakeholder groups by influence and impact, and recommend an engagement approach per group." },
  { id: "readiness_assessment", label: "Assess readiness",
    requiredFields: ["phase", "changeMaturity", "stakeholderGroups"],
    kbQuery: "readiness sponsorship capability capacity sentiment",
    task: "Assess this engagement's readiness across sponsorship, capability, capacity and sentiment. Name the specific exposure areas, not generic risk categories." },
  { id: "change_impact_analysis", label: "Run change impact analysis",
    requiredFields: ["technology", "scopeSummary", "stakeholderGroups"],
    kbQuery: "change impact people process technology policy",
    task: "Run a change impact analysis across people, process, technology and policy for this engagement. Identify which roles are most affected and why." },
  { id: "resistance_prediction", label: "Predict and mitigate resistance",
    requiredFields: ["changeMaturity", "stakeholderGroups", "constraints"],
    kbQuery: "resistance patterns mitigation workaround",
    task: "Predict likely resistance scenarios for this specific context, and propose a concrete countermeasure for each — name the group and the likely trigger, not a generic list." },
  { id: "learning_strategy", label: "Design the learning strategy",
    requiredFields: ["stakeholderGroups", "technology", "timeline"],
    kbQuery: "learning strategy enablement role-based training manager",
    task: "Design a role-based learning strategy: enablement paths per stakeholder group and a delivery schedule sequenced against the timeline." },
  { id: "rollout_checklist", label: "Give me the rollout checklist",
    requiredFields: ["phase", "timeline"],
    kbQuery: "rollout checklist cutover sequencing go-live",
    task: "Produce the execution-phase rollout checklist: activities in sequence, with an owner and timing for each, through go-live and immediate hypercare." },
  { id: "draft_communications", label: "Draft communications",
    requiredFields: ["stakeholderGroups", "phase"],
    kbQuery: "communications audience channel messaging",
    task: "Draft a communications message set: one message per stakeholder group, matched to an appropriate channel, aligned to the current phase." },
  { id: "measurement_plan", label: "What should we measure",
    requiredFields: ["technology", "phase"],
    kbQuery: "adoption metrics measurement thresholds",
    task: "Recommend an adoption measurement plan: the specific signals to track, cadence, and the threshold at which each should trigger action." },
  { id: "guide_me", label: "I am lost — Guide Me",
    requiredFields: ["phase"],
    kbQuery: "readiness sponsorship rollout checklist next actions",
    task: "Given everything known about this engagement so far (context and prior history below), identify the three highest-priority actions to take next, in priority order, and say why each matters now." },
];

function findCapability(id) { return CAPABILITIES.find(c => c.id === id) || null; }

// Simple keyword-overlap search over KB_SEED — the same embedded-store idea
// engine.js's EmbeddedVectorStore uses, kept dependency-free here since the
// KB is small and this module has to run standalone too (it's shipped inside
// the "Standalone app" zip alongside engine.js/llm.js).
function searchKb(query, topK) {
  const words = new Set(String(query || "").toLowerCase().split(/\W+/).filter(Boolean));
  return KB_SEED
    .map(d => {
      const hay = (d.text + " " + d.tags.join(" ")).toLowerCase();
      const score = [...words].reduce((s, w) => s + (hay.includes(w) ? 1 : 0), 0);
      return { d, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK || 3)
    .map(r => r.d);
}

// Builds the grounded "context" block passed to llm.js's answerGrounded() —
// the engagement's real intake fields + prior history + retrieved KB excerpts
// with their sources, so the model reasons over real input and can cite where
// each fact came from, instead of freely generating from the capability name.
function buildContextBlock(engagement, cap) {
  const ctx = engagement.context || {};
  const lines = ["ENGAGEMENT CONTEXT:"];
  Object.keys(ctx).forEach(k => { if (String(ctx[k] || "").trim()) lines.push(`- ${k}: ${ctx[k]}`); });
  const hist = (engagement.history || []).slice(-3);
  if (hist.length) {
    lines.push("", "RECENT PRIOR OUTPUTS (for continuity — don't repeat verbatim):");
    hist.forEach(h => lines.push(`- [${h.capability}] ${String(h.text || "").slice(0, 200)}...`));
  }
  const kb = searchKb(cap.kbQuery, 3);
  if (kb.length) {
    lines.push("", "KNOWLEDGE BASE EXCERPTS (cite by source when you use one):");
    kb.forEach(d => lines.push(`- [${d.source}] ${d.text}`));
  }
  return { text: lines.join("\n"), kbUsed: kb.map(d => d.source) };
}

function buildQuestion(cap) {
  return `You are the OCM Change Management Agent, a practitioner-level collaborator on this technology adoption ` +
    `engagement — not a generic content generator. Task: ${cap.task}\n\n` +
    `Ground your answer ONLY in the ENGAGEMENT CONTEXT and KNOWLEDGE BASE EXCERPTS provided. When you use a ` +
    `knowledge-base fact, cite its source in brackets, e.g. [source name]. Where the context is genuinely too thin ` +
    `to give a specific answer (not just "could be more detail"), say plainly what's missing instead of inventing ` +
    `specifics. Keep it concrete and specific to THIS engagement, not generic change-management advice. Start your ` +
    `answer with "DRAFT — practitioner review required." on its own line, since every output here is a draft, never ` +
    `a final, approved deliverable.`;
}

// Builds a REAL Evidence object (confidence, attribution waterfall, gate) via
// engine.js's shared Layers.evidence()/explain() — the same mechanism every
// other UNAI capability's confidence score comes from — instead of a bespoke
// score invented just for OCM. Drivers are grounded in real signals about
// THIS run, not fixed placeholder weights:
//  - how much of the engagement's intake is actually filled in
//  - whether the answer found anything in the knowledge base
//  - whether there's prior history on this engagement to build on
// Autonomy is then force-gated to false — NOT confidence-based — because the
// brief's own guardrail (Section 7) says every OCM output is a draft and the
// agent must never present itself as the approving authority. That's a fixed
// policy decision for this use case, not a threshold call, so it overrides
// whatever L.evidence() computed from confidence alone.
function buildEvidence(engagement, cap, kbUsed) {
  const ctx = engagement.context || {};
  const fields = Object.keys(ctx);
  const filled = fields.filter(f => String(ctx[f] || "").trim()).length;
  const drivers = [
    { name: "engagement context completeness", weight: +(0.05 + 0.15 * (filled / (fields.length || 1))).toFixed(3) },
  ];
  if (kbUsed && kbUsed.length) drivers.push({ name: "knowledge base grounding", weight: +(0.10 + 0.05 * Math.min(kbUsed.length, 3)).toFixed(3) });
  if ((engagement.history || []).length) drivers.push({ name: "prior engagement history", weight: 0.08 });

  const L = new Layers({}, null, {}, { actions: 0, contextSwitches: 0 }, () => {});
  const ev = L.evidence(cap.label, drivers);
  ev.autonomous = false;
  ev.gate = "OCM governance guardrail — every output is a draft; human review is mandatory regardless of confidence (brief Section 7).";
  ev.explanation = `${cap.label}. Confidence ${(ev.confidence * 100).toFixed(0)}% (${ev.uncertainty}). Practitioner review required before use.`;
  return ev;
}

// A direct, single-call model invocation with a per-call override key —
// llm.js's answerGrounded()/chatWithFailover() only read providers from
// server-side env vars, with no way to pass a pasted UI key through, so this
// mirrors narrateOne()'s fetch/error handling but for an arbitrary prompt
// (narrateOne is hardcoded to its own Explainability-specific buildPrompt).
async function callModel(systemText, userText, cfg, maxTokens) {
  const res = await fetch(cfg.base.replace(/\/$/, "") + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${cfg.key}` },
    body: JSON.stringify({ model: cfg.model, temperature: 0.3, max_tokens: maxTokens || 700,
      messages: [{ role: "system", content: systemText }, { role: "user", content: userText }] }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}${body ? ": " + body.slice(0, 200) : ""}`);
  }
  const data = await res.json();
  const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  const u = (data && data.usage) || {};
  if (!text) throw new Error("provider responded 200 OK but with no message content in the response");
  return { text: text.trim(), tokensIn: u.prompt_tokens || 0, tokensOut: u.completion_tokens || 0 };
}

module.exports = { KB_SEED, CAPABILITIES, findCapability, searchKb, buildContextBlock, buildQuestion, buildEvidence, callModel };
