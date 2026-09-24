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
 * ocm_store.js — per-engagement context + history, persisted as one JSON file
 * per engagement (same atomic-file pattern the adk_spares_rma_demo project
 * uses for its own demo state — no new DB dependency for what is, for now, a
 * single-practitioner demo). Satisfies R-01 (capture + edit engagement
 * context) and R-06 (persist across sessions) from the OCM solution brief.
 * ========================================================================== */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "data", "ocm_engagements");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const CONTEXT_FIELDS = [
  "clientName", "industry", "scopeSummary", "geography", "orgSize",
  "technology", "phase", "stakeholderGroups", "timeline", "changeMaturity", "constraints",
];

function filePath(id) { return path.join(DATA_DIR, id + ".json"); }

function emptyContext() {
  const c = {}; CONTEXT_FIELDS.forEach(f => c[f] = ""); return c;
}

function listEngagements() {
  if (!fs.existsSync(DATA_DIR)) return [];
  return fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => { try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf8")); } catch (_) { return null; } })
    .filter(Boolean)
    .map(e => ({ id: e.id, name: e.context.clientName || e.id, technology: e.context.technology,
      phase: e.context.phase, updatedAt: e.updatedAt, historyCount: (e.history || []).length }))
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

function getEngagement(id) {
  const fp = filePath(id);
  if (!fs.existsSync(fp)) return null;
  try { return JSON.parse(fs.readFileSync(fp, "utf8")); } catch (_) { return null; }
}

function saveEngagement(e) {
  e.updatedAt = new Date().toISOString();
  // Atomic write: write to a temp file then rename, so a crash mid-write never
  // corrupts the engagement's saved state (same reasoning as the ADK demo's
  // JsonStore — this file is the only copy of this engagement's history).
  const fp = filePath(e.id), tmp = fp + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(e, null, 2));
  fs.renameSync(tmp, fp);
  return e;
}

function createEngagement(context) {
  const id = crypto.randomUUID();
  const e = {
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    context: Object.assign(emptyContext(), context || {}),
    history: [],
  };
  return saveEngagement(e);
}

function updateContext(id, patch) {
  const e = getEngagement(id);
  if (!e) return null;
  e.context = Object.assign({}, e.context, patch || {});
  return saveEngagement(e);
}

function appendHistory(id, entry) {
  const e = getEngagement(id);
  if (!e) return null;
  e.history.push(Object.assign({ ranAt: new Date().toISOString() }, entry));
  return saveEngagement(e);
}

// Which required-for-good-output fields are still blank, so a capability can
// ask ONE clarifying question instead of guessing (a lightweight R-02) rather
// than fabricating specifics it was never given.
function missingFields(context, required) {
  return (required || CONTEXT_FIELDS).filter(f => !String(context[f] || "").trim());
}

module.exports = { CONTEXT_FIELDS, listEngagements, getEngagement, createEngagement, updateContext, appendHistory, missingFields };
