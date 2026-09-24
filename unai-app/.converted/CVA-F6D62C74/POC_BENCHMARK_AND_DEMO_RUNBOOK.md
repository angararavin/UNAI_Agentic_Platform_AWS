# UNAI Supply Chain Control Tower
## PoC Demonstration Runbook & Golden Scenario Guide

**Prepared by**: Principal AI Architect & Supply Chain Engineering Team  
**System Version**: v2.5.0 Enterprise Multi-Agent Decision Intelligence  
**Target Audience**: Solutions Architects, Sales Engineers, Customer Success Leads, Executive Demo Presenters

---

## 1. Executive Demonstration Flow (5-Minute Script)

```
[00:00 - 01:00] INTRODUCE THE CONTROL TOWER
  • Open http://127.0.0.1:8000/
  • Highlight the 5-Step Dynamic Agent Orchestration Bar across the top.
  • Explain that the platform connects 9 autonomous agents to 100k+ enterprise records in real-time.

[01:00 - 02:30] SCENARIO 1: SEMICONDUCTOR FAB DISRUPTION (TSMC)
  • Enter Supplier: "TSMC", Origin: "Hsinchu", Destination: "Austin"
  • Click "Calculate Route Risk" (or "Run Agentic Pipeline").
  • Watch the 5 steps pulse dynamically in sequence (1 -> 2 -> 3 -> 4 -> 5).
  • Show the Center Blob Topology Canvas: Point out affected Tier-1 Foundry nodes vs safe regional nodes.
  • Highlight the Operations & Inventory metrics: Days of Supply (8.3 days) vs Capacity Recovery (24.8 days).
  • Review the Recommendation Leaderboard: Show Option 2 (Logistics Mode Expedite) vs Option 3 (Alternate Supplier).

[02:30 - 03:30] SCENARIO 2: NORMAL BASELINE RECOVERY ("Test Healthy")
  • Click "🟢 Test Healthy".
  • Observe instantaneous recalculation ($0 Revenue at Risk, 98% OTIF, 0 days recovery).
  • Demonstrates that the multi-agent system does not hallucinate false alarms.

[03:30 - 04:30] SCENARIO 3: INTERACTIVE Q&A COPILOT
  • Click "Ask Copilot" drawer at the bottom right.
  • Ask: "What is the revenue at risk and why is Option 2 recommended?"
  • Demonstrate instant 0-token / fast-path synthesis with exact numbers.

[04:30 - 05:00] SCENARIO 4: HIGH-CONTRAST LIGHT MODE
  • Click the theme toggle button (🌙 / ☀️).
  • Demonstrate crisp WCAG AAA compliance and glassmorphism styling in Light Mode.
```

---

## 2. Golden Demo Scenarios & Test Parameters

### Scenario A: High-Tech Semiconductor Crisis (TSMC → Austin Giga Plant)
- **Parameters**:
  - **Supplier**: `TSMC`
  - **Origin**: `Hsinchu, Taiwan`
  - **Destination**: `Austin, Texas, USA`
  - **Transport Mode**: `Ocean Freight`
- **What to Highlight**:
  - **AG-01 (Sensing)**: Detects East Asian earthquake fault line and seismic vulnerability.
  - **AG-02 (BOM & Topology)**: Maps silicon wafer dependency to `PL-01` (Austin Super-Giga Plant).
  - **AG-03/04 (Operations)**: Identifies 44.2% capacity loss and stockout horizon within 8.3 days.
  - **AG-05/07 (Recommendation)**: Option 2 (Priority Air Freight) recovers OTIF to 90.0% and cuts recovery to 2 weeks.

### Scenario B: Consumer Electronics Assembly (Foxconn → Long Beach Hub)
- **Parameters**:
  - **Supplier**: `Foxconn`
  - **Origin**: `Yantian Port, Shenzhen`
  - **Destination**: `Port of Long Beach, California`
  - **Transport Mode**: `Ocean Freight`
- **What to Highlight**:
  - **Supplier News Radar**: Displays upstream substrate availability and real-time news headlines.
  - **Commercial Impact**: Evaluates affected sales orders across Tier-1 strategic enterprise clients.

### Scenario C: Multi-Signal Resource Conflict Arbitration
- **Parameters**:
  - **Signals Evaluated**: `SIG-2026-0912` (Earthquake) + `SIG-2026-0913` (Port Congestion)
- **What to Highlight**:
  - **Conflict `CFL-01`**: Both disruptions claim the same trans-Pacific air lane in weeks 2–5, breaching the $1M freight cap.
  - **Arbitration Options**: Automatically generates trade-offs: *Prioritise P1 customers*, *Split lane 60/40*, or *Raise air freight cap*.
  - **Cumulative Impact**: De-duplicates affected finished goods across overlapping disruptions.

---

## 3. Automated Benchmark Execution

To run the full programmatic benchmark suite on any workstation or server:

```bash
# Run standalone PoC benchmark suite
python poc_benchmark_suite.py
```

### Expected Output
```text
================================================================================
>> UNAI ENTERPRISE MULTI-AGENT POC BENCHMARK & PERFORMANCE SUITE
================================================================================
[1/7] In-Memory Hash Matrix Ingestion:       983.48 ms (100k+ records indexed)
[2/7] AG-01: Risk Sensing & Weather:        1350.28 ms
[3/7] AG-02: 44k BOM Traversal & Topology:   150.91 ms
[4/7] AG-03/04: Capacity & 30k Inventory:      0.13 ms
[5/7] AG-06: Commercial SLAs & Revenue Math:   0.50 ms
[6/7] AG-05/07: SCM Trade-Off Decision:      360.18 ms
[7/7] Master Orchestrator End-to-End Run:   1594.33 ms
[Bonus] Supply Chain Q&A Copilot Synthesis:    0.01 ms
================================================================================
>> POC BENCHMARK SUMMARY: 8/8 SLA CHECKS PASSED
================================================================================
```

---

## 4. API Endpoints Quick Reference

| Endpoint | Method | Purpose | Sample Request |
| :--- | :---: | :--- | :--- |
| `/api/pipeline` | `GET` | Executes full 5-step multi-agent orchestration pipeline | `/api/pipeline?supplier=TSMC&origin=Hsinchu&destination=Austin` |
| `/api/topology` | `GET` | Returns nodes, links, and cluster blobs for graph canvas | `/api/topology?origin=Hsinchu&destination=Austin` |
| `/api/suppliers/suggest` | `GET` | Fuzzy autocomplete and registry lookup | `/api/suppliers/suggest?q=tsm` |
| `/api/chat` | `POST` | Interactive Q&A Copilot fast-path synthesis | `{"question": "What is revenue at risk?", "supplier": "TSMC"}` |
| `/api/upload/{dataset}` | `POST` | Multipart CSV dataset replacement | Upload `bom.csv`, `inventory.csv`, `customers.csv` |
