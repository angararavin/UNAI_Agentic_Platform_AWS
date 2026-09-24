# USER GUIDE: SAP SUPPLY CHAIN AGENTIC AI CONTROL TOWER
## For Buyers, Planners, Warehouse Managers, and Logistics Specialists

**Version:** 1.2.0  
**Target Audience:** Supply Chain Operations & Planning Teams  

---

## 1. Introduction

Welcome to the **Bcone SAP Supply Chain Agentic AI Platform**. This platform deploys five autonomous AI agents acting as tireless digital co-pilots across your procurement, inventory, logistics, and planning workflows. 

Each agent continuously evaluates transactions, calculates operational risks using deterministic business formulas, uses local AI to synthesize explainable evidence, and prepares actionable proposals.

---

## 2. Agent Operational Playbooks

### 2.1 Buyer Guide: PO Promise Drift Agent (`SC-A01-PPO-001`)
* **When to use**: When evaluating whether an open purchase order commitment date is trustworthy.
* **How to interpret outputs**:
  - **Risk Band**: `LOW` (delivery on track), `MEDIUM` (minor drift expected), `HIGH` / `SEVERE` (critical delay threatening production/sales).
  - **Days of Cover Without PO**: How many days until plant runs out of stock without this delivery.
  - **Action**: Review proposed expedite request or revised schedule line date, then click **Approve Action** in the Control Tower.

### 2.2 Warehouse Manager Guide: Phantom Inventory Agent (`SC-A02-PHI-001`)
* **When to use**: When physical stock in SAP does not match stock available for immediate production or shipping.
* **How to interpret outputs**:
  - **Phantom Quantity**: Total stock that cannot be operationally consumed.
  - **Primary Cause**: Blocked status, quality inspection hold, reservation commitment, wrong storage bin, or expired batch.
  - **Action**: Execute status unblocking, initiate bin relocation, or route for formal QM usage decision (`QA11`).

### 2.3 Logistics Planner Guide: Material Twin-Location Agent (`SC-A03-MTL-001`)
* **When to use**: When one plant experiences an impending shortage while another plant holds surplus.
* **How to interpret outputs**:
  - **Protected Source Stock**: The agent strictly safeguards safety stock + 30-day forward demand at the source plant.
  - **Estimated Net Benefit**: $\text{Avoided Stockout Cost} - \text{Freight Cost}$.
  - **Action**: If net benefit is positive and source is protected, approve the **Stock Transport Order (STO)**.

### 2.4 Procurement Lead Guide: PO Aging Intelligence Agent (`SC-A04-POA-001`)
* **When to use**: During weekly/monthly open PO reviews (orders open >90 days).
* **How to interpret outputs**:
  - **Root Cause**: `FULLY_RECEIVED`, `PO_BLOCKED`, `INVOICE_MISMATCH`, `REQUIREMENT_CANCELLED`, `REPEATED_RESCHEDULE`, `VALID_FUTURE_DEMAND`.
  - **Action**: Safely close dead POs, release blocked orders, or route invoice disputes to Accounts Payable.

### 2.5 Demand Planner Guide: Requirement Contradiction Agent (`SC-A05-RCA-001`)
* **When to use**: Prior to daily/weekly MRP runs to ensure net demand signals are clean.
* **How to interpret outputs**:
  - **Classification**: `DUPLICATE_OVERLAP` (duplicate orders), `FIRM_FORECAST_COLLISION` (forecast overlapping sales order), `CANCELLED_CONFLICT` (cancelled order still counting as active), or `VALID_COMPETING_DEMAND` (two legitimate orders).
  - **Action**: Cleanse duplicate demands or consume forecast to prevent unnecessary procurement.

---

## 3. Using the Streamlit Control Tower UI

1. **Access the Application**: Open `http://localhost:8501` in your browser.
2. **Select an Agent**: Use the sidebar to choose the domain agent (e.g. Agent 01, Agent 02, etc.).
3. **Choose a Scenario**: Select a curated case from the dropdown or inspect real-time data.
4. **Click "Run LangGraph State Machine"**: The agent executes its 6-step state machine.
5. **Review the Dossier**:
   - Inspect the **Top Metric Row** for operational diagnosis and economic impact.
   - Read the **LLM Evidence Synthesis** for a plain-English explanation.
   - Inspect the **Deterministic Business Calculations** table for audit verification.
6. **Actioning Human Approvals**:
   - If an action requires approval, click **✅ Approve Action** or **❌ Reject Action**.
   - Your decision, timestamp, and operator ID are permanently logged in the audit trail.
