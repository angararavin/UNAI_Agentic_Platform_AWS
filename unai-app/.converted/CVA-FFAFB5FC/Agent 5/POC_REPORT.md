# Agent 5: POC Validation Report

**Agent Name:** Requirement Contradiction & Competing Demand Disambiguator  
**Dataset:** `Requirement_Contradiction_Agent_Synthetic_Data`  
**Execution Timestamp:** 2026-09-19  
**Execution Engine:** LangGraph StateGraph + Deterministic Metrics Engine  

---

## 1. Executive Summary
Agent 5 was evaluated against the 6 curated demonstration contradiction cases designed by supply chain and master planning domain experts. The scenarios test duplicate overlapping requisitions, genuine competing customer demand, firm sales collisions with unconsumed PIR forecasts, cancelled order residuals, double-counting BOM linkages, and maintenance schedule collisions.

**Result Summary:**
- **Total Cases Tested:** 6
- **Classification Accuracy:** 6 / 6 (100%)
- **Average Workflow Latency:** 1.53 ms
- **Human-In-The-Loop Approval Enforced:** 5 / 6 cases flagged for planner review; 1 / 6 auto-resolved

---

## 2. Test Case Execution Results

| Case ID | Plant | Material | Material Name | Requirement Cluster | Diagnosed Contradiction | Policy Action | HITL Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CASE01** | PL01 | MAT2001 | Industrial Pump Seal | `REQ2001\|REQ2002\|REQ2003` | `DUPLICATE_OVERLAP` | `REVIEW_DEDUPLICATION` | `PENDING_APPROVAL` |
| **CASE02** | PL02 | MAT2002 | Servo Motor | `REQ2004\|REQ2005` | `VALID_COMPETING_DEMAND` | `KEEP_BOTH` | `AUTO_RESOLVED` |
| **CASE03** | PL02 | MAT2003 | Control PCB | `REQ2006\|REQ2007` | `FIRM_FORECAST_COLLISION` | `REVIEW_DEMAND_PRIORITY`| `PENDING_APPROVAL` |
| **CASE04** | PL03 | MAT2004 | Aluminium Housing | `REQ2008\|REQ2009` | `CANCELLED_REQUIREMENT_CONFLICT`| `REMOVE_CANCELLED_DEMAND`| `PENDING_APPROVAL` |
| **CASE05** | PL01 | MAT2005 | Packaging Tray | `REQ2010\|REQ2011` | `DOUBLE_COUNTING_RISK` | `RECONCILE_REQUIREMENT_LINK`| `PENDING_APPROVAL` |
| **CASE06** | PL03 | MAT2006 | Bearing Kit | `REQ2012\|REQ2013` | `FIRM_FORECAST_COLLISION` | `REVIEW_DEMAND_PRIORITY`| `PENDING_APPROVAL` |

---

## 3. Domain Insights & Key Findings

1. **Filtering False Contradictions (CASE02):**
   In CASE02, two distinct sales orders (`REQ2004` and `REQ2005`) for Servo Motors arrived in the same weekly bucket. Standard naive deduplication rules often flag identical part/date combinations as duplicates. The agent recognized distinct customer origin IDs, categorized the event as `VALID_COMPETING_DEMAND`, preserved both orders autonomously (`AUTO_RESOLVED`), and prevented an inadvertent customer cancellation.

2. **Forecast Cannibalization Prevention (CASE03 & CASE06):**
   When firm orders arrive, unconsumed PIR forecasts must be offset to prevent procurement from doubling raw material orders. The agent flagged the overlap with `REVIEW_DEMAND_PRIORITY`, protecting working capital.

3. **High-Throughput Reconciliation:**
   The entire cluster disambiguation workflow executed in ~1.5 ms per cluster, allowing MRP post-processing of thousands of requirement lines in real-time immediately following `MD01N` completion.
