<!--
  UNAI - Universal Supply-Chain Agent (Cognitive Runtime)
  Copyright (c) 2026 Ravin Angara / Bristlecone. All rights reserved.
  PROPRIETARY & CONFIDENTIAL. See LICENSE.  [UNAI-COPYRIGHT v1]
-->

# UNAI — Intro Video: Production Script & Storyboard

**Runtime:** ~75s cinematic sizzle · **Aspect:** 16:9 (1920×1080) · **Mood:** tense → hopeful → confident
**Palette:** deep navy `#080c18`/`#0d1426`, teal `#22d3aa`, alarm coral `#e2574c`, gold `#e6a52b`
**Type:** serif display (Cambria/Playfair) for hero lines; clean sans (Inter/Segoe) for body
**Music:** low pulsing drone + heartbeat (0–25s) → a "lift" / arpeggio swell at the turn (~28s) → driving, optimistic bed (30–70s) → resolve chord on logo
**VO:** one calm, authoritative voice (works well with ElevenLabs "confident narrator"). Pace unhurried; let the beats breathe.

> A playable version of this exact sequence is in **UNAI_Intro_Reel.html** — open it, press **F** for fullscreen, and screen‑record to export an MP4. Timings below match it.

---

### Scene 1 — Cold open (0:00–0:06)
- **Visual:** Black. A single amber clock readout fades in: **2:47 AM**. Faint red vignette pulses like an alarm. Distant server‑room hum.
- **On‑screen:** `2:47 AM.` → then `A key port just closed.` (coral)
- **VO:** *"It's 2:47 in the morning. A key port just went dark."*
- **SFX:** low boom on "closed."

### Scene 2 — The stakes (0:06–0:16)
- **Visual:** Numbers stack up like an incident ticker, each landing hard.
- **On‑screen:** `For a global supply chain, by sunrise that's…` → `40+ SKUs about to go short` · `$2.4M of revenue at risk` · `1 supplier → 12 downstream decisions`
- **VO:** *"By sunrise, that's forty products going short, millions in revenue at risk, and a dozen decisions that all have to happen at once."*

### Scene 3 — The broken status quo (0:16–0:26)
- **Visual:** A 6×2 grid of red "agent" tiles pops in; thin wires criss‑cross between them (N² tangle); a cost meter fills coral→gold and maxes out.
- **On‑screen:** `The usual answer: More agents.` / caption: *Each rebuilds the same seven layers. Each re‑reads the same data. Each one pays for it — again.*
- **VO:** *"The usual answer is more agents. A dozen specialists — each rebuilding the same plumbing, re‑reading the same data, and burning tokens doing it. More cost. More things to break."*
- **Music:** tension peaks.

### Scene 4 — The turn (0:26–0:33)
- **Visual:** The twelve tiles rush inward and **collapse into one glowing teal orb** that pulses, alive.
- **On‑screen:** `What if it were…` → `one mind?`
- **VO:** *"But what if it were… one mind?"*
- **Music:** the lift — drone resolves into a hopeful swell.

### Scene 5 — Reveal (0:33–0:43)
- **Visual:** Orb blooms into the wordmark. Four capability chips light left‑to‑right.
- **On‑screen:** `UNAI — the Cognitive Runtime` · chips: `Perceive · once` `Plan · once` `Evidence` `Act · governed`
- **VO:** *"This is UNAI — a shared cognitive runtime. Perception, memory, meaning, planning and governance, built once… and shared by every job it does."*

### Scene 6 — It acts (0:43–0:54)
- **Visual:** Four steps slide in as a clean vertical pipeline, each ticking green.
- **On‑screen:** `Detects the disruption` → `Re‑forecasts demand` → `Rebalances inventory` → `Reroutes the POs to a backup supplier` / caption: *minutes, not war‑rooms · every decision explained · high‑value actions gated to a human.*
- **VO:** *"So when that port closes, one runtime runs the whole chain reaction — detect, re‑forecast, rebalance, reroute — in minutes. Not war‑rooms. Every decision explained, every big move signed off by a human."*

### Scene 7 — The proof (0:54–1:03)
- **Visual:** Three stat blocks slam in.
- **On‑screen:** `15 → 1 agents` · `−64% tokens` · `100% governed decisions` / fine print: *Modeled on the live demonstrator · validated against real API usage counters.*
- **VO:** *"Fifteen agents become one. Up to two‑thirds fewer tokens. Every decision governed and audited."*
- **Note (honesty):** keep the fine‑print line on screen; these are modeled figures, provable live via `token_benchmark.py`.

### Scene 8 — The reach (1:03–1:11)
- **Visual:** Warehouse names fade up as a row; a subtle world/lakehouse motif behind.
- **On‑screen:** `One ontology. Any warehouse. SAP‑safe.` · `SAP · Databricks · Snowflake · BigQuery · ServiceNow` / caption: *reads the governed lakehouse copy — in‑tenant, read‑only first, cloud‑ and model‑neutral.*
- **VO:** *"One shared language across SAP, Databricks, Snowflake, BigQuery — reading the governed copy, safely, inside your walls."*

### Scene 9 — Close (1:11–1:20)
- **Visual:** Wordmark large, tagline, Bristlecone lockup; teal resolve.
- **On‑screen:** `UNAI` · `one AI that does the work of many.` · `The era of agent sprawl ends here.` · `Bristlecone · Cognitive Runtime`
- **VO:** *"UNAI. One AI that does the work of many. The era of agent sprawl ends here."*
- **Music:** resolve chord; hold 2s on logo.

---

## How to produce it
1. **Fastest:** open `UNAI_Intro_Reel.html` fullscreen, screen‑record (QuickTime / OBS / Loom), add the VO + music track over it in any editor. Done.
2. **Polished:** hand this script to a motion designer, or feed each scene's *Visual + On‑screen* to an AI video tool (Runway/Pika) and the *VO* lines to a voice tool (ElevenLabs). Cut to the music beats above.
3. **Voiceover tip:** generate the nine VO lines as separate clips so you can align each to its scene.

## Guardrails (so the drama stays defensible)
- Keep the "modeled · validated live" fine print in Scene 7. Don't drop hard $ guarantees.
- "15 → 1" and "−64%" match the app's demonstrator numbers — keep them consistent with what you'll show live.
- The "$2.4M / 40 SKUs" in Scene 2 are illustrative scenario dressing, not a customer promise.
