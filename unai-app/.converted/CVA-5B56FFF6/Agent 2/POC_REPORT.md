# Agent 2: POC Validation Report

**Agent Name:** Phantom Inventory Discrepancy & Usability Auditor  
**Dataset:** `Phantom_Inventory_Agent_Synthetic_Data`  
**Execution Timestamp:** 2026-09-19  
**Execution Engine:** LangGraph StateGraph + Deterministic Metrics Engine  

---

## 1. Executive Summary
Agent 2 was evaluated against the 16 curated demonstration scenarios representing typical enterprise warehouse discrepancies: blocked lots, quality inspection holds, over-committed reservations, displaced inventory, batch expiration, near-expiry risks, negative available stock, and mixed multi-constraint discrepancies.

**Result Summary:**
- **Total Cases Tested:** 16
- **Passed Operational Checks:** 16 / 16 (100%)
- **Average Workflow Latency:** 1.34 ms
- **Human-In-The-Loop Approval Enforced:** 16 / 16 cases flagged for operational sign-off

---

## 2. Test Case Execution Results

| Case # | Stock ID | Plant | Material | Scenario | Phys Qty | Usable Qty | Phantom Qty | Driver | Risk Band | Action Formulated |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | STK100000 | PL01 | MAT2007 | `BLOCKED` | 1090.0 | 435.0 | 655.0 (60.1%) | `STATUS_BLOCKED` | `HIGH` | `RELEASE_OR_RESOLVE_STATUS` |
| **2** | STK100001 | PL02 | MAT2007 | `QUALITY_HOLD` | 567.0 | 199.0 | 368.0 (64.9%) | `QUALITY_HOLD` | `HIGH` | `ESCALATE_TO_QUALITY` |
| **3** | STK100002 | PL01 | MAT2002 | `RESERVED` | 1092.0 | 455.0 | 637.0 (58.3%) | `RESERVED_COMMITMENT` | `HIGH` | `VALIDATE_RESERVATION` |
| **4** | STK100003 | PL03 | MAT2001 | `WRONG_LOCATION` | 1295.0 | 601.0 | 694.0 (53.6%) | `WRONG_LOCATION` | `HIGH` | `RELOCATE` |
| **5** | STK100004 | PL04 | MAT2001 | `EXPIRED` | 328.0 | 161.0 | 167.0 (50.9%) | `EXPIRED_SHELF_LIFE` | `HIGH` | `REVIEW_DISPOSITION` |
| **6** | STK100005 | PL03 | MAT2009 | `SHELF_LIFE_RISK`| 1236.0 | 950.0 | 286.0 (23.1%) | `EXPIRED_SHELF_LIFE` | `MEDIUM` | `REVIEW_DISPOSITION` |
| **7** | STK100008 | PL01 | MAT2005 | `NEGATIVE_AVAIL` | 1222.0 | 0.0 | 1222.0 (100%) | `RESERVED_COMMITMENT` | `HIGH` | `VALIDATE_RESERVATION` |
| **8** | STK100009 | PL03 | MAT2009 | `MIXED` | 1106.0 | 334.0 | 772.0 (69.8%) | `RESERVED_COMMITMENT` | `HIGH` | `VALIDATE_RESERVATION` |
| **9** | STK100010 | PL03 | MAT2002 | `BLOCKED` | 967.0 | 469.0 | 498.0 (51.5%) | `STATUS_BLOCKED` | `HIGH` | `RELEASE_OR_RESOLVE_STATUS` |
| **10** | STK100011 | PL03 | MAT2010 | `QUALITY_HOLD` | 151.0 | 97.0 | 54.0 (35.8%) | `QUALITY_HOLD` | `MEDIUM` | `ESCALATE_TO_QUALITY` |
| **11** | STK100012 | PL01 | MAT2002 | `RESERVED` | 350.0 | 99.0 | 251.0 (71.7%) | `RESERVED_COMMITMENT` | `HIGH` | `VALIDATE_RESERVATION` |
| **12** | STK100013 | PL02 | MAT2005 | `WRONG_LOCATION` | 1145.0 | 662.0 | 483.0 (42.2%) | `WRONG_LOCATION` | `MEDIUM` | `RELOCATE` |
| **13** | STK100014 | PL04 | MAT2007 | `EXPIRED` | 706.0 | 395.0 | 311.0 (44.1%) | `EXPIRED_SHELF_LIFE` | `MEDIUM` | `REVIEW_DISPOSITION` |
| **14** | STK100015 | PL01 | MAT2001 | `SHELF_LIFE_RISK`| 1090.0 | 866.0 | 224.0 (20.6%) | `EXPIRED_SHELF_LIFE` | `MEDIUM` | `REVIEW_DISPOSITION` |
| **15** | STK100018 | PL02 | MAT2010 | `NEGATIVE_AVAIL` | 962.0 | 0.0 | 962.0 (100%) | `RESERVED_COMMITMENT` | `HIGH` | `VALIDATE_RESERVATION` |
| **16** | STK100019 | PL03 | MAT2009 | `MIXED` | 47.0 | 16.0 | 31.0 (66.0%) | `RESERVED_COMMITMENT` | `HIGH` | `VALIDATE_RESERVATION` |

---

## 3. Domain Insights & Key Findings

1. **Negative Available Stock Protection:**
   In Case 7 (STK100008) and Case 15 (STK100018), reservations exceeded physical stock (e.g., 1405 reserved vs 1222 physical). Standard systems occasionally display negative numbers or fail silent. Agent 2 floor-capped usable inventory at 0.0 units, isolated the 100% phantom deficit, and flagged high risk with immediate `VALIDATE_RESERVATION` routing.

2. **Root Cause Isolation:**
   In multi-constraint environments (Case 8 & 16), where blocked stock, inspection hold, and reservations coexist on the same material line, the agent ranked the drivers and identified `RESERVED_COMMITMENT` as the primary capacity bottleneck.

3. **Sub-2ms Operational Throughput:**
   Because all inventory arithmetic is strictly deterministic Python and explanation generation operates with structured templates, the pipeline processed all 16 complex warehouse scenarios in less than 25 milliseconds total.
