# Supply Chain Risk & Decision Intelligence Copilot (UNAI Phase 1)
## End-to-End System Documentation: Architecture, SME Decision Intelligence, Multi-Agent Hierarchy & API Specifications

---

## Executive Summary & System Overview

The **UNAI Phase 1 Supply Chain Risk & Decision Intelligence Copilot** is an enterprise-grade, autonomous multi-agent decision intelligence platform built strictly according to the architecture specification defined in `project Architecture.pdf` and integrated with Dhrubo's multi-agent domain logic. It delivers real-time multi-modal disruption sensing, multi-tier BOM exposure cascading, plant capacity loss quantification, inventory Days of Supply (DOS) safety stock analysis, commercial customer order impact (OTIF & revenue at risk), Groq-powered SME strategic trade-off simulation, an interactive token-optimized Q&A Copilot, and full 6-dataset enterprise CSV ledger ingestion.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           UNAI SUPPLY CHAIN CONTROL TOWER COPILOT                                │
├──────────────────────────┬───────────────────────────┬───────────────────────────┬───────────────┤
│    EVENT INTELLIGENCE    │     OPERATIONS TEAM       │      COMMERCIAL LEAD      │  SME ENGINE   │
│ Live News, Tavily, USGS, │ Capacity Loss % & Recovery│ Revenue at Risk & OTIF    │ 4 Strategies  │
│ Open-Meteo & BOM Exposure│ Days of Supply & Stockout │ Fill Rate & SLA Penalties │ LLM Trade-offs│
└──────────────────────────┴───────────────────────────┴───────────────────────────┴───────────────┘
```

---

## Table of Contents

1. [Business Use Cases](#1-business-use-cases)
2. [High-Level Design (HLD) & Architecture](#2-high-level-design-hld--architecture)
3. [Autonomous Multi-Agent Hierarchy](#3-autonomous-multi-agent-hierarchy)
4. [Micro-Agent Specifications & Logic](#4-micro-agent-specifications--logic)
5. [Mathematical & Financial Formulations](#5-mathematical--financial-formulations)
6. [API Contracts & Data Schemas](#6-api-contracts--data-schemas)
7. [Enterprise CSV Dataset Formats](#7-enterprise-csv-dataset-formats)
8. [Frontend UI & Control Tower Design](#8-frontend-ui--control-tower-design)
9. [Testing, QA & Verification Guide](#9-testing-qa--verification-guide)

---

## 1. Business Use Cases

### Use Case 1: Multi-Modal Live Disruption Sensing
* **Actors**: Risk Managers, Global Logistics Directors
* **Integrations**: Tavily Live Search, Marketaux News API, Open-Meteo Weather API, USGS Earthquake API.
* **Capabilities**:
  - Automatically queries live adverse events and supply chain interruptions affecting tier-1 and tier-2 suppliers.
  - Senses extreme weather (typhoons, heavy storms) and seismic activity near supplier hubs without requiring paid keys.

### Use Case 2: Multi-Tier BOM & Supply Network Exposure
* **Actors**: Procurement Directors, Supply Chain Network Architects
* **Capabilities**:
  - Traverses the Bill of Materials (BOM) to map component dependencies from Tier-1 suppliers down to Tier-2 suppliers.
  - Identifies exposed manufacturing assembly plants, critical part numbers, and plant dependency mappings.

### Use Case 3: Manufacturing Capacity & Inventory Stockout Analysis
* **Actors**: Plant Operations Managers, Materials Planners
* **Capabilities**:
  - Computes plant downtime, manufacturing capacity loss (%), and recovery timeline in days.
  - Evaluates Inventory Days of Supply (DOS), flags safety stock breaches, and projects the stockout horizon.

### Use Case 4: Commercial Lead Customer Order & Financial Blast Radius
* **Actors**: Chief Commercial Officer (CCO), VP of Sales, Financial Controller
* **Capabilities**:
  - Quantifies total customer sales orders impacted, Revenue at Risk ($), On-Time In-Full (OTIF) drop (%), delivery fill rate (%), and contractual SLA late delivery penalties ($).

### Use Case 5: Groq-Powered SME Strategic Trade-off Simulation
* **Actors**: Chief Supply Chain Officer (CSCO), Strategic Response Team
* **Capabilities**:
  - Simulates 4 diverse mitigation strategies with dynamically computed costs, recovery timelines, and proportional residual risk.

---

## 2. High-Level Design (HLD) & Architecture

```mermaid
graph TD
    subgraph Client Layer (Frontend UI)
        DASH["Executive Dashboard (HTML5 / Vanilla CSS / JS)"]
        THEME["Theme Engine (Dark Glassmorphism / WCAG AAA Light Mode)"]
        COPILOT_UI["Interactive Q&A Copilot Drawer"]
        UPLOAD_MODAL["Custom CSV Dataset Uploader Modal (6 Dropzones)"]
    end

    subgraph API Gateway & Microservices (FastAPI Backend)
        API["FastAPI App (main.py)"]
        ROUTER_PIPE["/api/pipeline"]
        ROUTER_CHAT["/api/chat"]
        ROUTER_DISRUPT["/api/disruptions"]
        ROUTER_FIN["/api/financial"]
        ROUTER_UPLOAD["/api/upload/*"]
    end

    subgraph Autonomous Multi-Agent Hierarchy
        MGR["Supply Chain Manager Agent (Master Orchestrator)"]
        SENSE["Event Intelligence Agent (Tavily, Marketaux, Open-Meteo, USGS)"]
        EXPOSE["Exposure Agent (BOM & Multi-Tier Cascading)"]
        CAP["Capacity Agent (Plant Downtime & Capacity Loss)"]
        INV["Inventory Agent (Days of Supply & Stockout Horizon)"]
        COMM["Customer Impact Agent (Revenue at Risk, OTIF, SLA Penalties)"]
        REC["Recommendation SME Agent (Groq Llama-3-70B Trade-Offs)"]
        QA_COPILOT["Q&A Copilot Agent (Multi-Tier Context Synthesis)"]
    end

    DASH --> API
    COPILOT_UI --> ROUTER_CHAT
    UPLOAD_MODAL --> ROUTER_UPLOAD

    API --> ROUTER_PIPE
    ROUTER_PIPE --> MGR

    MGR --> SENSE
    MGR --> EXPOSE
    MGR --> CAP
    MGR --> INV
    MGR --> COMM
    MGR --> REC
```

---

## 3. Autonomous Multi-Agent Hierarchy

| Agent Role | File Module | Responsibilities |
|---|---|---|
| **1. Master Manager Agent** | `backend/agents/manager_agent.py` | Orchestrates the 5-stage pipeline, passes contextual state across micro-agents, and computes aggregated metrics. |
| **2. Event Intelligence Agent** | `backend/agents/sensing_agent.py` | Connects to Tavily, Marketaux, Open-Meteo weather, and USGS seismic feeds for live disruption sensing. |
| **3. Exposure Agent** | `backend/agents/exposure_agent.py` | Ingests BOM and supplier ledgers to traverse Tier-1/Tier-2 supply chains and map affected plants/parts. |
| **4. Capacity Agent** | `backend/agents/capacity_agent.py` | Computes plant downtime, capacity loss %, redundancy mitigation, and estimated recovery horizon. |
| **5. Inventory Agent** | `backend/agents/inventory_agent.py` | Calculates current Days of Supply (DOS), safety stock breaches, and projects stockout days. |
| **6. Customer Impact Agent** | `backend/agents/customer_impact_agent.py` | Maps inventory deficits to customer orders, calculates Revenue at Risk, OTIF drop %, Fill Rate %, and SLA penalties. |
| **7. Recommendation SME Agent** | `backend/agents/recommendation_agent.py` | Formulates 4 distinct mitigation strategies using Groq Llama-3-70B with proportional residual risk modeling. |
| **8. Q&A Copilot Agent** | `backend/agents/qa_copilot_agent.py` | 3-tier conversational copilot with 0-token domain fastpath, multi-agent telemetry synthesis, and LLM reasoning. |

---

## 4. Micro-Agent Specifications & Logic

### 4.1 Event Intelligence Agent (`sensing_agent.py`)
- Senses adverse news via Marketaux & Tavily.
- Polls Open-Meteo for real-time wind speed, precipitation, and temperature anomalies at origin coordinates.
- Polls USGS for seismic events (magnitude > 4.0 within 300km of supplier facility).

### 4.2 Exposure Agent (`exposure_agent.py`)
- Reads `suppliers.csv`, `bom.csv`, and `plant_parts.csv`.
- Discovers multi-tier supplier dependencies ($Tier\text{-}1 \rightarrow Tier\text{-}2$) and affected assembly plants.

### 4.3 Capacity Agent (`capacity_agent.py`)
- Calculates plant capacity loss:
  $$\text{Effective Capacity Loss} = \text{Base Capacity Loss} \times (1 - \text{Redundancy Factor})$$
- Computes estimated recovery timeline in days.

### 4.4 Inventory Agent (`inventory_agent.py`)
- Evaluates stock availability across all BOM parts:
  $$\text{Days of Supply (DOS)} = \frac{\text{Current Stock (Units)}}{\text{Daily Usage Rate (Units/Day)}}$$
- Flags safety stock breach if $\text{DOS} < \text{Safety Stock Days}$.

### 4.5 Customer Impact Agent (`customer_impact_agent.py`)
- Connects inventory shortages to `customer_orders.csv`.
- Computes:
  - **Revenue at Risk ($)**: Total value of delayed/canceled customer orders.
  - **OTIF Degradation (%)**: Drop in on-time in-full delivery performance.
  - **Delivery Fill Rate (%)**: Fulfilled order volume divided by total ordered volume.
  - **SLA Penalties ($)**: Contractual delay penalties based on projected lead time slippage.

### 4.6 Recommendation SME Agent (`recommendation_agent.py`)
- Formulates 4 standard mitigation options:
  1. **Option 1: Baseline Unmitigated (Status Quo)**
  2. **Option 2: Logistics Expedite (Air Freight Priority)**
  3. **Option 3: Strategic Alternate Supplier Allocation (Recommended)**
  4. **Option 4: Dual-Source Volume Split & Buffer Stocking**

---

## 5. Mathematical & Financial Formulations

### 5.1 Proportional Residual Risk Formula
$$\text{Remaining Risk (\$)} = \text{Base Exposure (\$)} \times \left( \frac{\text{Post-Mitigation Risk \%}}{\text{Baseline Risk \%}} \right)$$

### 5.2 Revenue Protected Formula
$$\text{Revenue Protected (\$)} = \text{Base Exposure (\$)} - \text{Remaining Risk (\$)}$$

### 5.3 Net Strategic Benefit Formula
$$\text{Net Benefit (\$)} = \text{Revenue Protected (\$)} - \text{Strategy Cost (\$)}$$

---

## 6. Enterprise CSV Dataset Formats

The system supports 6 core flat-file datasets under `backend/data/` (with live upload endpoints):

1. `suppliers.csv`: `supplier_id`, `supplier_name`, `tier`, `country`, `lat`, `lon`, `primary_category`, `risk_score`, `parent_supplier_id`
2. `bom.csv`: `part_id`, `part_name`, `product_id`, `supplier_id`, `tier`, `criticality`
3. `plant_capacity.csv`: `plant_id`, `plant_name`, `country`, `lat`, `lon`, `daily_capacity_units`, `redundancy_factor`
4. `plant_parts.csv`: `plant_id`, `part_id`, `daily_usage_rate`, `buffer_stock_units`
5. `inventory.csv`: `part_id`, `current_stock_units`, `safety_stock_units`, `daily_burn_rate`, `lead_time_days`
6. `customer_orders.csv`: `order_id`, `customer_name`, `product_id`, `order_units`, `revenue_usd`, `due_date`, `sla_penalty_per_day`

---

## 7. Testing, QA & Verification Guide

Run the full automated test suite using `pytest`:
```bash
python -m pytest tests/ -v
```

All 16 unit, integration, and endpoint tests validate:
- Live and parametric sensing
- BOM multi-tier exposure traversal
- Plant capacity loss and inventory Days of Supply
- Customer order impact, OTIF, and SLA penalty calculations
- 4 dynamic mitigation trade-offs
- Fastpath and LLM Copilot reasoning
- 6 CSV upload endpoints
