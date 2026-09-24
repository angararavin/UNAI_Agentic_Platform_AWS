# Enterprise Guidebook: SAP Supply Chain Agentic AI Platform

> **Target Audience:** Chief Technology Officer (CTO), Chief Supply Chain Officer (CSCO), SAP Domain Leads, Procurement Managers, Logistics Directors, and AI Engineers.

---

## 1. Why Do You Need to Select an Agent?

### 1.1 Why Multiple Specialized Agents Instead of One Monolithic AI?
In enterprise SAP supply chains, different problems belong to **completely different operational domains, data structures, regulatory policies, and human stakeholders**:

```
                              ┌─────────────────────────────────────────┐
                              │  Central SAP Event Mesh / Orchestrator  │
                              └────────────────────┬────────────────────┘
                                                   │
         ┌───────────────────┬─────────────────────┼─────────────────────┬───────────────────┐
         ▼                   ▼                     ▼                     ▼                   ▼
  ┌─────────────┐     ┌─────────────┐       ┌─────────────┐       ┌─────────────┐     ┌─────────────┐
  │  Agent 01   │     │  Agent 02   │       │  Agent 03   │       │  Agent 04   │     │  Agent 05   │
  │  PO Drift   │     │   Phantom   │       │Twin-Location│       │  PO Aging   │     │Contradiction│
  └──────┬──────┘     └──────┬──────┘       └──────┬──────┘       └──────┬──────┘     └──────┬──────┘
         ▼                   ▼                     ▼                     ▼                   ▼
    Procurement          Warehouse              Logistics           Purchasing AP         MRP / PP
  (Buyers, Vendors)   (Inventory, QM)        (Inter-Plant)         (Working Capital)    (Schedulers)
```

1. **Different Departmental Ownership:**
   - A Purchase Order promise date change belongs to the **Purchasing / Sourcing Team**.
   - A Quality Inspection block belongs to **Quality Management (QM)** and **Warehouse Supervisors**.
   - An Inter-Plant Stock Transfer Order (STO) belongs to **Central Supply Network Logistics**.
   - Aged residual cleanup belongs to **Procurement Operations & Accounts Payable**.
   - Duplicate MRP requisitions belong to **Master Production Schedulers (PP/DS)**.

2. **Different Business Objects & SAP Tables:**
   - An inventory balancing agent requires stock balances (`MARD`/`MARC`) and freight lane matrices (`T001W`).
   - A purchase order aging agent requires 3-way matching invoices (`RSEG`), goods receipts (`EKBE`), and release strategies (`EKKO`).
   - Combining these into a single monolithic prompt causes prompt pollution, severe LLM hallucinations, and loss of deterministic arithmetic precision.

3. **Production Mode vs. Investigation Cockpit Mode:**
   - **In Production (Automated Mode):** You **do not** manually select an agent. The platform's Event Mesh listens to SAP change documents (`CDHDR`), IDocs, and webhook triggers, automatically dispatching each anomaly to the correct specialized agent.
   - **In Cockpit (Investigation Bench):** The dropdown selector allows buyers, plant managers, and auditors to test, simulate, and inspect how each individual agent evaluates specific historical cases and edge conditions.

---

## 2. Comprehensive Agent Reference Guide

---

### 🏢 Agent 01: PO Promise Drift Agent (SC-A01-PPO-001)

#### 1. The Real-World Business Problem
When a buyer issues a Purchase Order (`ME21N`), the supplier confirms an initial delivery date (`EKET-EINDT`). Over time, suppliers routinely push their delivery dates or repeatedly miss commitments without formally warning the buyer. If the buyer does not proactively detect this "drift," manufacturing assembly lines run out of parts, production orders stall, and end-customer deliveries are delayed.

#### 2. What the Agent Does
- **Audits Supplier Reliability:** Calculates empirical delivery statistics from historical goods receipts (`MSEG`/`EKBE`) rather than trusting promised dates.
- **Evaluates Downstream Line Starvation:** Cross-references open POs against current stock cover and upcoming production schedules (`AFKO`/`MD04`).
- **Issues Preventative Action:** Formulates proactive follow-up requests or automated delivery line rescheduling before line starvation occurs.

#### 3. Mathematical & Policy Formulas
- **Empirical Late Delivery Rate:**
  $$\text{Late Rate} = \frac{\text{Historical Deliveries with Delay} > 0}{\text{Total Deliveries}}$$
- **Severe Delay Rate (>3 Days):**
  $$\text{Severe Rate} = \frac{\text{Deliveries with Delay} > 3\text{ days}}{\text{Total Deliveries}}$$
- **Days of Stock Cover Without PO:**
  $$\text{Days of Cover} = \frac{\text{Current Unrestricted Stock}}{\text{Average Daily Factory Consumption}}$$
- **Composite Risk Score (0 - 100):**
  $$\text{Risk} = 0.40 \times \text{Late Rate} + 0.35 \times \text{Severe Rate} + 0.25 \times \left(1 - \min\left(1, \frac{\text{Cover Days}}{10}\right)\right)$$

#### 4. Operational Actions & HITL Gates
| Condition | Risk Band | Mandated Action | Approval Required? |
| :--- | :--- | :--- | :--- |
| $\text{Risk Score} < 30$ | `LOW` | `MONITOR` | Autonomous (Logged) |
| $30 \le \text{Risk Score} \le 60$ | `MEDIUM` / `HIGH` | `SUPPLIER_FOLLOW_UP` | Buyer Queue (HITL) |
| $\text{Risk Score} > 60$ or $\text{Cover} \le 1\text{d}$ | `SEVERE` | `EXPEDITE_AND_RESCHEDULE_LINE` | Buyer Queue + Expedite Notice (HITL) |

---

### 📦 Agent 02: Phantom Inventory Discrepancy Agent (SC-A02-PHI-001)

#### 1. The Real-World Business Problem
In SAP inventory management (`MARD`), a warehouse might report **1,000 units on hand**. However, when assembly workers attempt to pick the parts, they discover that:
- 400 units are blocked (`SPEME`).
- 300 units are held under Quality Inspection (`INSME` / `QA11`).
- 250 units are committed to previous reservations (`RESB`).
- 50 units have expired past their shelf life (`MCHB-VFDAT`).
Only **0 units** are actually usable! This ghost stock is called **Phantom Inventory**. It tricks MRP into believing parts are available, resulting in emergency line shutdowns.

#### 2. What the Agent Does
- **Performs Deterministic Stock Usability Arithmetic:** Reconciles physical stock against all 5 unavailable constraints.
- **Isolates the Primary Deficit Driver:** Identifies exactly why inventory is locked (Blocked, QA Hold, Reservations, Wrong Bin, Expiration).
- **Proposes Targeted Disposition:** Routes tickets directly to the right specialist (Quality Inspector for QA11, Warehouse Lead for bin transfer, Planner for reservation cleanup).

#### 3. Mathematical & Policy Formulas
- **Operationally Usable Stock:**
  $$\text{Usable Stock} = \max\left(0, \text{Physical} - (\text{Blocked} + \text{QA Hold} + \text{Reserved} + \text{Wrong Location} + \text{Expired})\right)$$
- **Phantom Deficit Ratio:**
  $$\text{Phantom Ratio} = \frac{\text{Physical Stock} - \text{Usable Stock}}{\text{Physical Stock}}$$
- **Safety Rule:** Usable stock is strictly floor-capped at `0.0`. Negative stock is flagged immediately as high-risk over-commitment.

#### 4. Operational Actions & HITL Gates
| Primary Root Driver | Recommended Action | Routed Stakeholder |
| :--- | :--- | :--- |
| Blocked Storage Location | `RELEASE_OR_RESOLVE_STATUS` | Warehouse Supervisor (mvt 343) |
| Quality Inspection Lot | `ESCALATE_TO_QUALITY` | Quality Management Lead (QA11) |
| Stale Reservation Order | `VALIDATE_RESERVATION` | Production Planner (RESB) |
| Non-Standard Staging Bin | `RELOCATE` | Internal Logistics / Forklift Lead |
| Batch Expiration Passed | `REVIEW_DISPOSITION` | Scrap / Rework Committee (mvt 551) |

---

### 💰 Agent 03: Material Twin-Location Balancing Agent (SC-A03-MTL-001)

#### 1. The Real-World Business Problem
In multi-factory manufacturing enterprises:
- **Plant 02** suffers a critical raw material stockout that threatens to halt an assembly line costing ₹ 25,000/day in idle labor and SLA penalties.
- **Plant 01** holds a massive surplus of the exact same material with 90 days of excess buffer.
Standard SAP MRP runs independently per plant, leaving cross-plant transfers to manual phone calls and ad-hoc expedites. Furthermore, poorly planned transfers can starve the supplying plant or incur freight charges higher than the cost of the delay.

#### 2. What the Agent Does
- **Shields Source Safety Stock:** Guarantees that the supplying plant's 30-day demand and safety buffer are 100% protected before releasing any surplus.
- **Computes Lane-Level Logistics ROI:** Balances carrier freight costs, distance, and transit lead-time against the financial stockout cost avoided at the destination.
- **Generates Stock Transport Orders (STO):** Recommends automated inter-plant transfers (SAP document type `UB`) with positive economic ROI.

#### 3. Mathematical & Policy Formulas
- **Source Protected Stock Reserve:**
  $$\text{Protected Stock} = \text{Source 30-Day Demand} + \text{Source Safety Stock}$$
- **Available Source Surplus:**
  $$\text{Source Surplus} = \max\left(0, \text{Source On-Hand} - \text{Protected Stock}\right)$$
- **Feasible Transfer Volume:**
  $$\text{Feasible Qty} = \min\left(\text{Candidate Qty}, \text{Source Surplus}\right)$$
- **Net Logistics Economic Benefit:**
  $$\text{Net Benefit} = \text{Avoided Destination Stockout Cost} - \text{Estimated Freight Expense}$$

#### 4. Operational Actions & HITL Gates
| Condition | Policy Outcome | Action Taken |
| :--- | :--- | :--- |
| $\text{Source Surplus} \le 0$ | `REJECT_PROTECT_SOURCE_STOCK` | Transfer blocked: prevents starvating supplying plant. |
| $\text{Net Benefit} \le 0$ | `REJECT_UNFAVORABLE_ECONOMICS` | Transfer blocked: freight cost exceeds delay savings. |
| $\text{Net Benefit} > 0$ and $\text{Surplus} > 0$ | `TRANSFER_RECOMMENDED` | Routed to Central Logistics Queue for STO creation. |

---

### ⏳ Agent 04: PO Aging Intelligence Agent (SC-A04-POA-001)

#### 1. The Real-World Business Problem
Over months and years, enterprise ERP databases accumulate thousands of open purchase orders (`EKPO`). These aged orders tie up working capital on balance sheets, skew supplier lead-time algorithms, cause friction in Accounts Payable (`RBNI` - Goods Received / Not Invoiced), and distort MRP.

Naive cleanup scripts (e.g., "delete all POs older than 90 days") inadvertently cancel critical long-lead capital components or items required for upcoming production schedules.

#### 2. What the Agent Does
- **Calculates Exact Lifecycle Aging:** Computes days open since PO creation and days overdue since requested delivery date.
- **Performs 3-Way Match & Need Audit:** Cross-references received quantities (`EKBE`), invoice status (`RSEG`), purchasing release blocks (`EKKO`), and active demand orders (`MD04`).
- **Diagnoses 7 Root-Cause Archetypes:** Distinguishes healthy aged POs that must stay open from dead commitments ready for administrative closure.

#### 3. 7 Diagnostic Root-Cause Archetypes
```
1. FULLY_RECEIVED               ──► Residual is zero / Goods Receipt posted   ──► Action: CLOSE_PO
2. PO_BLOCKED                   ──► Active release strategy block             ──► Action: RELEASE_OR_BLOCK_RESOLUTION
3. INVOICE_MISMATCH             ──► AP price or quantity variance             ──► Action: FINANCE_AP_REVIEW
4. REQUIREMENT_CANCELLED        ──► Underlying production/sales order deleted  ──► Action: CLOSE_OR_CANCEL_WORKFLOW
5. REQUIREMENT_CLOSED           ──► Underlying production order completed     ──► Action: CLOSE_OR_CANCEL_WORKFLOW
6. REPEATED_RESCHEDULE          ──► Vendor pushed delivery date >= 2 times    ──► Action: SUPPLIER_REVIEW
7. VALID_FUTURE_DEMAND          ──► Mapped to valid upcoming production       ──► Action: KEEP_OPEN (Auto-Resolved)
```

#### 4. Operational Actions & HITL Gates
- **`KEEP_OPEN`:** Automatically resolved. Shields valid procurement from accidental cancellation without bothering buyers.
- **`CLOSE_PO` / `CANCEL` / `SUPPLIER_REVIEW`:** Flagged in HITL queue. Requires purchasing supervisor authorization before modifying SAP transaction tables.

---

### 🧩 Agent 05: Requirement Contradiction Agent (SC-A05-RCA-001)

#### 1. The Real-World Business Problem
In SAP Demand Planning and Master Production Scheduling (`MD04`), planners often observe multiple competing or conflicting demand records for the same material and plant. Schedulers struggle to determine:
- Did two separate MRP runs generate duplicate planned orders for the same assembly?
- Is unconsumed forecast (PIR) colliding with a newly arrived customer sales order, risking double-procurement?
- Has a cancelled work order left its component reservations active?
- Or are these two genuine, independent sales orders that both must be fulfilled?

#### 2. What the Agent Does
- **Clusters Requirements by Material & Horizon:** Analyzes demand sources, order categories, and creation timestamps.
- **Disambiguates True Demand from Noise:** Classifies the cluster into one of 5 distinct contradiction categories.
- **Computes Clean Reconciled Net Demand:** Strips out double-counted or obsolete quantities to provide an accurate procurement figure.

#### 3. Contradiction Classification Matrix
| Contradiction Archetype | SAP Operational Scenario | Recommended Action |
| :--- | :--- | :--- |
| `DUPLICATE_OVERLAP` | Overlapping MRP runs generated duplicate requisitions for the same day. | `REVIEW_DEDUPLICATION` (Purge duplicates) |
| `VALID_COMPETING_DEMAND` | Two distinct customers ordered parts; both orders are legitimate. | `KEEP_BOTH` (Auto-Resolved; Preserve supply) |
| `FIRM_FORECAST_COLLISION` | Firm sales order arrived; unconsumed PIR forecast must be reduced. | `REVIEW_DEMAND_PRIORITY` (Consume forecast) |
| `CANCELLED_REQUIREMENT_CONFLICT` | Production order marked TECO/CLSD but reservations remained active. | `REMOVE_CANCELLED_DEMAND` (Delete reservations) |
| `DOUBLE_COUNTING_RISK` | Sales order and sub-assembly both booked demand for the same component. | `RECONCILE_REQUIREMENT_LINK` (BOM realignment) |

---

## 3. Human-in-the-Loop (HITL) Governance Matrix

Every agent enforces the principle: **"Autonomous Analysis, Human-Authorized Execution."**

| Agent | Low-Risk Autonomous Path | High-Risk Gated HITL Path |
| :--- | :--- | :--- |
| **Agent 01 (PO Drift)** | Informational monitoring when supplier is on time. | Date rescheduling (`BAPI_PO_CHANGE`) or expediting orders when cover < 3 days. |
| **Agent 02 (Phantom Stock)** | Healthy stock reporting when usable availability is 100%. | Unblocking stock (`mvt 343`), scrap write-offs (`mvt 551`), or de-allocating reservations. |
| **Agent 03 (Twin Location)** | Rejection of non-viable transfers or shielded source stock. | Inter-plant Stock Transport Order creation (`BAPI_PO_CREATE1`). |
| **Agent 04 (PO Aging)** | Retaining valid open orders (`KEEP_OPEN`). | Cancelling purchase orders (`EKPO-LOEKZ`) or setting delivery completed (`ELIKZ`). |
| **Agent 05 (Contradiction)** | Confirming valid independent customer demand (`KEEP_BOTH`). | Deleting duplicate planned orders or cancelling dependent component reservations. |

---

## 4. Summary Table for Quick Reference

| Agent ID | Short Name | Core Question It Answers | Primary Business Benefit |
| :--- | :--- | :--- | :--- |
| **Agent 01** | **PO Promise Drift** | *"Is the vendor actually going to deliver on time, or will our factory line starve?"* | Prevents unexpected factory line shutdowns. |
| **Agent 02** | **Phantom Inventory** | *"How much of our on-hand inventory can we actually assemble right now?"* | Eliminates ghost stock & prevents false availability. |
| **Agent 03** | **Twin-Location** | *"Can Plant A's surplus solve Plant B's shortage profitably without starving Plant A?"* | Balances multi-plant inventory & unlocks freight ROI. |
| **Agent 04** | **PO Aging** | *"Which of our 6-month-old POs are dead weight vs. critical future parts?"* | Frees trapped working capital without deleting needed items. |
| **Agent 05** | **Contradiction** | *"Is this sudden demand spike real customer orders or duplicate MRP noise?"* | Stops double-purchasing and cleans planning signals. |

---

## 5. Illustrated Comic-Style Storyboards & Concrete Use Cases

Below are the panel-by-panel comic storyboards and detailed sample use cases for each autonomous agent.

---

### 📖 Issue #1: The Case of the Over-Optimistic Supplier (Agent 01: PO Promise Drift)

#### Comic Storyboard
```
┌────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────┐
│ PANEL 1: THE BLIND TRUST             [💥 DANGER LOOMING]│ PANEL 2: THE DETECTIVE ENTERS          [🔍 SCANNING EKBE]│
│                                                        │                                                        │
│ 🏭 Assembly Lead: "We need 500 steering pump units by  │ 🤖 Agent 01: "Never trust promised dates blindly!      │
│ Friday morning or Main Line 2 halts completely!"       │ Let's pull Supplier SUP1004's historical receipts (EKBE)│
│                                                        │ across their last 237 deliveries!"                     │
│ 🖥️ SAP EKPO: "PO 450010000 · Supplier SUP1004 ·        │                                                        │
│ Promised Date: Oct 15 (ON-TIME) · Status: Normal"       │ 📊 Empirical Reality: 237 Deliveries · Late Rate: 82.3%│
│                                                        │ P90 Delay: +2.8 Days · Average Drift: +1.24 Days!      │
├────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ PANEL 3: THE MATHEMATICAL CLASH        [🧮 PURE MATH]  │ PANEL 4: THE HEROIC RESCUE           [⚡ CRISIS AVERTED]│
│                                                        │                                                        │
│ 🤖 Agent 01: "Plant buffer stock is only 3 DAYS! With   │ 🚀 Action Gate: Proposed SUPPLIER_FOLLOW_UP & EXPEDITE │
│ 1.24 days expected delay, stock hits ZERO on Thursday!"│ Automated vendor escalation drafted for Buyer queue.   │
│                                                        │                                                        │
│ 📜 Policy Gate: Risk Score 45.5/100 (HIGH RISK) ·      │ 👤 Sourcing Buyer: "Approved with 1 click! Supplier    │
│ Capital Exposure: ₹21,148 at risk · 4 Sales Orders hit │ dispatched hot air-freight. Line 2 saved from stoppage!"│
└────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### Concrete Sample Use Case
- **Target Purchase Order:** `PO 450010000` (Line Item `10`)
- **Vendor & Material:** Supplier `SUP1004` (Precision Hydraulics), Material `MAT1001`
- **Plant Context:** Plant `PL01`, Order Qty: `500 units`, Daily Line Consumption: `166 units/day`
- **Empirical Metrics:**
  - Historical delivery records: `237`
  - Historical late delivery percentage: `82.3%`
  - Average latency drift: `+1.24 days` (P90 drift: `+2.8 days`)
  - Stock cover without PO: `3 days` (Buffer runs dry before delivery arrival)
- **Financial Exposure Defended:** `₹21,148.68` in assembly line starvation risk
- **HITL Governance Outcome:** Buyer approved expedited dispatch; vendor delivered buffer stock in time.

---

### 📦 Issue #2: The Mystery of the Ghost Pallets (Agent 02: Phantom Inventory)

#### Comic Storyboard
```
┌────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────┐
│ PANEL 1: THE INVENTORY MIRAGE           [👻 GHOST STOCK]│ PANEL 2: FORENSIC AUDIT            [🔬 QA & BATCH AUDIT]│
│                                                        │                                                        │
│ 🏭 Production Planner: "SAP MARD shows 1,200 units on  │ 🤖 Agent 02: "Physical stock is NOT usable stock!      │
│ hand in Warehouse SL01! Let's schedule 800 tonight!"   │ Let me check QM inspection lots (QALS), production     │
│                                                        │ reservations (RESB), and batch expiration (MCHB)!"     │
│ 🖥️ SAP MARD: "Material MAT2001 · Unrestricted LABST:   │                                                        │
│ 1,200 Units on balance sheet."                         │ 📋 The Audit: 400 QA hold · 350 reserved · 250 expired!│
├────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ PANEL 3: THE USABILITY WATERFALL    [💧 WATERFALL MATH]│ PANEL 4: THE MULTI-WAY ROUTING      [🎯 TARGETED RESOLVE]│
│                                                        │                                                        │
│ 🤖 Agent 02: Usable Stock = 1,200 - (400+350+250)      │ ⚡ Action Routed:                                      │
│               = ONLY 200 USABLE UNITS!                 │ 1. QM Lab Alert: Expedite test on 400 hold units.      │
│ "If you schedule 800 units, the line crashes tonight!" │ 2. Scrap Proposal: Write off 250 expired units (551).  │
│                                                        │ 3. Schedulers: Resequence shift to avoid downtime.     │
│ 📜 Policy: Phantom Deficit Ratio = 83.3% · HIGH RISK   │ 👤 Warehouse Lead: "Night shift shutdown averted!"     │
└────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### Concrete Sample Use Case
- **Material & Location:** `MAT2001` at Plant `1000`, Storage Location `SL01`
- **Nominal Physical Stock:** `1,200 units`
- **Discovered Constraints:**
  - Quality Inspection hold (`QALS`): `400 units`
  - Production order reservations (`RESB`): `350 units`
  - Batch shelf-life expiration (`MCHB`): `250 units`
- **True Usable Operational Stock:** `200 units`
- **Phantom Deficit:** `-1,000 units` (`83.3%` discrepancy)
- **Financial Exposure Defended:** `₹45,000` in stalled night-shift labor costs.

---

### 🚚 Issue #3: The Tale of Two Sister Plants (Agent 03: Twin-Location Arbitrage)

#### Comic Storyboard
```
┌────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────┐
│ PANEL 1: A TALE OF TWO CITIES      [⚡ STOCKOUT THREAT]│ PANEL 2: TWIN PLANT RADAR             [🌐 NETWORK SCOUT]│
│                                                        │                                                        │
│ 🏭 Plant Mumbai: "We are out of industrial bearings!   │ 🤖 Agent 03: "Scanning regional twin plants within     │
│ Emergency air-freight from Europe costs ₹120,000 and   │ 300 km transit radius! Plant Pune has 2,500 surplus!"   │
│ takes 3 weeks, halting our main assembly line!"        │                                                        │
│                                                        │ 🛡️ Safety Stock Shield Enforced:                       │
│ 🖥️ Plant Pune: Holds 2,500 units sitting idle in MARC. │ Pune 30-Day Demand: 1,000 · Safety Buffer: 500         │
│ Distance: 150 km. Isolated MRP doesn't see it!         │ Protected: 1,500 · Available for Transfer: 1,000 units!│
├────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ PANEL 3: THE ECONOMIC ARBITRAGE     [⚖️ FREIGHT VS ROI]│ PANEL 4: THE EXPRESS CONVOY          [🚚 STO DISPATCHED]│
│                                                        │                                                        │
│ 🤖 Agent 03:                                           │ 🚀 Execution: SAP Stock Transport Order (UB type)      │
│ • Avoided Emergency Air Freight: ₹120,000              │ created for 600 units from Pune to Mumbai.             │
│ • Dedicated Inter-Plant Freight: ₹8,500                │                                                        │
│ • Transit Time: 1 Day (vs. 21 Days Europe)             │ 👤 Network Logistics Lead: "Authorized with 1 click!   │
│ NET ARBITRAGE PROFIT = ₹111,500!                       │ Truck arrived next morning. ₹1.1 Lakh savings!"        │
└────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### Concrete Sample Use Case
- **Deficit Plant:** Mumbai (`PL01`), Material `MAT3001`, Deficit: `600 units`
- **Donor Sister Plant:** Pune (`PL02`), On-Hand: `2,500 units`, Distance: `150 km`
- **Donor Protection:** `1,500 units` shielded (30-day demand + safety reserve)
- **Transfer Volume:** `600 units` (Leaves `400 units` discretionary buffer in Pune)
- **Logistics Economics:**
  - Avoided stockout/downtime penalty: `₹120,000`
  - Freight transfer cost: `₹8,500` (`₹14.16/unit`)
  - Net Economic Benefit: `+₹111,500`

---

### ⏳ Issue #4: The Haunting of the Zombie POs (Agent 04: PO Aging Intelligence)

#### Comic Storyboard
```
┌────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────┐
│ PANEL 1: THE ACCUMULATED GHOSTS       [🧟 DEAD CAPITAL]│ PANEL 2: THREE-WAY MATCH AUTOPSY       [🔬 3-WAY MATCH]│
│                                                        │                                                        │
│ 💼 Finance Controller: "We have ₹12 Crores in open     │ 🤖 Agent 04: "Let's perform a surgical 3-way match on   │
│ purchase commitments over 90 days old! Run a batch     │ receipts (EKBE), invoices (RSEG), and demand (MD04)!"  │
│ script to delete all of them immediately!"             │                                                        │
│                                                        │ 📑 The Findings:                                       │
│ 🤖 Agent 04: "STOP! Blunt scripts cancel critical long-│ • PO 45003001: Long-lead turbine for next month (VALID)│
│ lead items! Let me diagnose the real root causes!"     │ • PO 45003005: 100% delivered, unbilled (ZOMBIE)!      │
├────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ PANEL 3: 7-ARCHETYPE TAXONOMY      [🧠 ROOT CAUSE MAP]│ PANEL 4: THE SURGICAL CLEANUP          [🎉 CLEAN LEDGER]│
│                                                        │                                                        │
│ 🤖 Agent 04:                                           │ 🚀 Resolution: Staged Delivery Completed indicator     │
│ 1. PO-45003001 ➜ VALID_FUTURE_DEMAND ➜ KEEP OPEN!      │ (ELIKZ) and AP accrual clearing in Approvals Desk.     │
│ 2. PO-45003005 ➜ DEAD_COMMITMENT ➜ DE-OBLIGATE!        │                                                        │
│ 3. PO-45003009 ➜ GR_IR_IMBALANCE ➜ AP CLEARING!        │ 👤 Procurement Controller: "Trapped working capital    │
│                                                        │ liberated, accruals balanced, zero assembly stops!"    │
└────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### Concrete Sample Use Case
- **Aged Purchase Order:** `PO 450030005`
- **Age Lifecycle:** `184 days open`, Requested delivery date passed `95 days ago`
- **Receipts vs Invoices:** `100%` goods received (`EKBE`), `0%` invoices pending (`RSEG`)
- **Downstream Demand:** Zero remaining demand orders in `MD04`
- **Classification:** `DEAD_COMMITMENT`
- **Outcome:** Set Delivery Completed Indicator (`ELIKZ`), releasing `₹85,000` in balance sheet commitment.

---

### 🛑 Issue #5: The Calamity of the Nervous MRP (Agent 05: Requirement Contradiction)

#### Comic Storyboard
```
┌────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────┐
│ PANEL 1: THE MRP CHAOS          [🌀 SYSTEM NERVOUSNESS]│ PANEL 2: SIGNAL CLUSTERING      [🧩 SIGNAL RECOGNITION]│
│                                                        │                                                        │
│ 🏭 Master Scheduler: "MRP regenerated 12 planned orders│ 🤖 Agent 05: "Clustering all requirements across Plant,│
│ for raw steel today, cancelled 8 yesterday, and moved  │ Material, and 14-Day Horizon to isolate true customer  │
│ dates inside the freeze fence! Buyers are frantic!"    │ demand from artificial MRP noise!"                     │
│                                                        │                                                        │
│ 🖥️ SAP MD04: Overlapping planning runs · 14 schedule   │ 📊 Result: Gross Demand = 1,800 tons                   │
│ revisions inside the 7-day freeze fence.               │ Duplicate Flapping Noise = -600 tons!                  │
├────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ PANEL 3: THE FREEZE FENCE SHIELD    [🛡️ FLAPPING GUARD]│ PANEL 4: TRANQUILITY RESTORED         [🎯 STABILIZATION]│
│                                                        │                                                        │
│ 🤖 Agent 05: "Applying freeze fence dampening policy!  │ 🚀 Action: Purged 600-ton duplicate requisitions,      │
│ We reject the 600-ton duplicate requisition and stop   │ stabilized MRP schedule lines for next 14 days.        │
│ the buyers from double-purchasing raw steel!"          │                                                        │
│                                                        │ 👤 Chief Supply Chain Officer: "Bullwhip effect killed │
│ 📜 Policy: Contradiction Type = DUPLICATE_MRP_RUN      │ at the source. ₹18 Lakhs double-purchase prevented!"   │
└────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### Concrete Sample Use Case
- **Material & Horizon:** `MAT5001` (Structural Steel Plate), 7-Day Planning Horizon
- **Gross Demand Signal:** `1,800 tons` across 6 planned orders
- **Diagnosis:** Overlapping weekly MRP runs generated twin requisitions for a single sales order
- **Net Reconciled Demand:** `1,200 tons`
- **Financial Double-Order Prevented:** `₹18,00,000` (`₹1.8M`) in surplus inventory capital.
