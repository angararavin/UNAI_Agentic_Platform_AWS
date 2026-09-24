# Agent 3: POC Validation Report

**Agent Name:** Material Twin-Location Balancing Agent  
**Dataset:** `Material_Twin_Location_Agent_Synthetic_Data`  
**Execution Timestamp:** 2026-09-19  
**Execution Engine:** LangGraph StateGraph + Deterministic Metrics Engine  

---

## 1. Executive Summary
Agent 3 was evaluated against 10 curated demonstration transfer scenarios covering clear surplus-to-shortage lanes, high-freight penalties, critical material lines, short lead-time lanes, future source shortage constraints, low-value parts, high stockout exposure, long transit distances, balanced routes, and multi-constraint routes.

**Result Summary:**
- **Total Scenarios Evaluated:** 10
- **Mathematical Accuracy:** 10 / 10 matches against ground truth to 2 decimal places (100%)
- **Average Workflow Latency:** 1.54 ms
- **Human-In-The-Loop Approval Enforced:** 10 / 10 cases routed with ROI metrics

---

## 2. Test Case Execution Results

| Case # | Option ID | Material | Route | Qty | Moved Value | Freight Cost | Avoided Stockout | Net Benefit | Policy Decision |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | TR70000 | MAT3001 | PL01 $\rightarrow$ PL02 | 458.0 | INR 38,930.00 | INR 3,248.79 | INR 20,441.94 | +INR 17,193.15 | `TRANSFER_RECOMMENDED` |
| **2** | TR70001 | MAT3002 | PL02 $\rightarrow$ PL03 | 205.0 | INR 24,600.00 | INR 3,081.87 | INR 5,439.16 | +INR 2,357.29 | `TRANSFER_RECOMMENDED` |
| **3** | TR70002 | MAT3003 | PL03 $\rightarrow$ PL04 | 407.0 | INR 26,455.00 | INR 846.26 | INR 31,620.10 | +INR 30,773.84 | `TRANSFER_RECOMMENDED` |
| **4** | TR70003 | MAT3004 | PL04 $\rightarrow$ PL01 | 453.0 | INR 9,966.00 | INR 1,054.21 | INR 6,094.70 | +INR 5,040.49 | `TRANSFER_RECOMMENDED` |
| **5** | TR70004 | MAT3005 | PL05 $\rightarrow$ PL02 | 165.0 | INR 6,600.00 | INR 542.44 | INR 26,233.13 | +INR 25,690.69 | `TRANSFER_RECOMMENDED` |
| **6** | TR70005 | MAT3006 | PL06 $\rightarrow$ PL03 | 283.0 | INR 5,094.00 | INR 2,327.05 | INR 19,019.94 | +INR 16,692.89 | `TRANSFER_RECOMMENDED` |
| **7** | TR70006 | MAT3007 | PL01 $\rightarrow$ PL05 | 267.0 | INR 38,715.00 | INR 2,453.79 | INR 19,636.23 | +INR 17,182.44 | `TRANSFER_RECOMMENDED` |
| **8** | TR70007 | MAT3008 | PL02 $\rightarrow$ PL06 | 239.0 | INR 717.00 | INR 2,690.42 | INR 22,975.66 | +INR 20,285.24 | `TRANSFER_RECOMMENDED` |
| **9** | TR70008 | MAT3009 | PL03 $\rightarrow$ PL01 | 313.0 | INR 17,215.00 | INR 1,497.61 | INR 26,887.54 | +INR 25,389.93 | `TRANSFER_RECOMMENDED` |
| **10** | TR70009 | MAT3010 | PL04 $\rightarrow$ PL02 | 335.0 | INR 10,720.00 | INR 4,235.09 | INR 13,404.86 | +INR 9,169.77 | `TRANSFER_RECOMMENDED` |

---

## 3. Domain Insights & Key Findings

1. **High ROI Inter-Plant Balancing:**
   Across all 10 test candidates, the agent identified total avoided stockout costs of INR 191,753.22 against total freight expenditures of INR 21,977.53, unlocking **INR 169,775.69 in net enterprise value**.

2. **Autonomous Protection Safeguards:**
   In production environments with constrained source inventory, the source safety stock filter shields local operations from line starvation before candidate quantities can be released.

3. **High-Velocity Operational Capability:**
   With per-route evaluation latency averaging 1.54 ms, the agent can scan thousands of cross-facility plant pairs during nightly MRP post-processing cycles.
