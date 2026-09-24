# PERFORMANCE REPORTING & SLA GUIDE
## Continuous Telemetry, SLA Benchmarking, and Operational Digest Automation

**Version:** 1.2.0  
**Target Audience:** DevOps, QA Leads, and Supply Chain Operational Leadership  

---

## 1. Overview

The **Timely Performance Reporting Engine (`src/audit/performance_reporter.py`)** provides continuous operational telemetry across all five SAP supply chain AI agents. It ensures that agent execution latency, decision accuracy, and human-in-the-loop review velocity meet strict enterprise Service Level Agreements (SLAs).

---

## 2. Key Performance Indicators (KPIs) & Formulas

### 2.1 Operational Decision Accuracy
* **Definition**: The percentage of agent recommendations matching ground-truth historical benchmark scenarios.
* **Formula**:
  $$\text{Accuracy (\%)} = \left( \frac{\text{Successful Benchmark Runs}}{\text{Total Evaluated Runs}} \right) \times 100$$
* **Target SLA**: $\ge 98.0\%$ across all five agents.

### 2.2 Execution Latency
* **Definition**: Total elapsed time from agent trigger to completed state machine execution.
* **Breakdown**:
  - Deterministic Calculation: $< 5 \text{ ms}$
  - Policy Evaluation: $< 2 \text{ ms}$
  - Local LLM Synthesis (Ollama): $500 \text{ ms} - 4,000 \text{ ms}$ (depending on hardware VRAM)
* **Target SLA**: P95 Latency $< 5.0 \text{ seconds}$.

### 2.3 Human-in-the-Loop Approval Velocity
* **Definition**: Tracking how efficiently human supervisors action consequential proposals.
* **Metrics**:
  - `Approval Rate`: $\frac{\text{Approved Proposals}}{\text{Total Consequential Proposals}} \times 100$
  - `Rejection Rate`: $\frac{\text{Rejected Proposals}}{\text{Total Consequential Proposals}} \times 100$
  - `Queue Depth`: Count of pending approval tickets.

### 2.4 Cumulative Economic Impact
* **Definition**: Monetary value of supply chain exposure actively protected or resolved by agents.
* **Components**:
  - Agent 01: Value of production orders protected from supplier delay.
  - Agent 02: Value of phantom inventory identified and unblocked/reconciled.
  - Agent 03: Net economic transfer benefit ($\text{Avoided Stockout Cost} - \text{Freight Cost}$).
  - Agent 04: Aged open PO value resolved or closed.
  - Agent 05: Avoided over-procurement value from deduplicating demand.

---

## 3. Automated Executive Digest Generation

### On-Demand API Endpoint:
```http
GET /api/v1/reporting/digest
```
Returns real-time JSON metrics across total executions, accuracy, latency, and agent-level summaries.

### Exporting Reports:
From the Streamlit Control Tower under **"📊 Timely Performance & SLA Reports"**, click **"Generate & Export Performance Report"**. This produces a standardized Markdown digest in `audit/reports/`.
