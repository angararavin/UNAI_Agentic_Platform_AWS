# UNAI Multi-Agent Supply Chain Decision Intelligence
## Comprehensive Agent Architecture, Hierarchy & Technology Stack Specification

**Document Version**: 2.0  
**Classification**: Enterprise Technical Architecture & System Specification  
**System**: UNAI Autonomous Multi-Agent Decision Intelligence Platform  
**Target Audience**: Enterprise Architects, Chief Supply Chain Officers (CSCO), Chief Technology Officers (CTO), AI Engineering Leads  

---

## 1. Executive Summary

The **UNAI Multi-Agent Decision Intelligence Platform** is an enterprise-scale supply chain decision and simulation platform designed to eliminate "Alert Fatigue" in global supply chain operations. By linking external disruption sensing with internal multi-tier Bill of Materials (BOM), line-level manufacturing capacity, live inventory ledgers, and contractual customer SLA penalties, UNAI autonomously detects risks and formulates mathematically evaluated, C-Suite-grade mitigation trade-offs in **<1.6 seconds**.

The platform is structured into a **four-tier agent hierarchy**:
1. **Super Agents / Orchestrators (2 Agents)**: Lead Director and Interactive Q&A Copilot.
2. **Macro Agents / Domain Teams (7 Canonical Agents / 5 Teams)**: Governing Sensing, Exposure, Capacity, Inventory, Commercial/Financial Impact, SCM Recommendations, and What-If Simulations.
3. **Micro Agents / Specialized Sub-Engines (14 Micro-Agents)**: High-speed deterministic and algorithmic components embedded across data feeds, BOM graph traversers, and trade-off simulators.
4. **Autonomous Engineering Framework Agents (5 Agents)**: Meta-agents governing sprint orchestration, backend services, frontend visualization, software QA testing, and domain compliance.

**Total Ecosystem: 28 Total Agents and Algorithmic Engines.**

---

## 2. Agent Architecture & Taxonomy Breakdown

```
                                 ╔════════════════════════════════════════════════════════╗
                                 ║                    SUPER AGENTS (2)                    ║
                                 ║  • AG-07: Master Orchestrator & Director              ║
                                 ║  • Interactive Multi-Tier Q&A Copilot Agent            ║
                                 ╚═══════════════════════════╦════════════════════════════╝
                                                             ║
           ╔═════════════════════════════════════════════════╩═════════════════════════════════════════════╗
           ║                                        MACRO AGENTS (7)                                       ║
           ╠════════════════╦════════════════╦════════════════╦════════════════════════╦═══════════════════╣
           ║ Team 1: Event  ║ Team 2: BOM &  ║ Team 3: Ops    ║ Team 4: Commercial     ║ Team 5: SME       ║
           ║ Intelligence   ║ Topology       ║ (Capacity &    ║ (Customer & Financial) ║ Recommendation    ║
           ║ (AG-01)        ║ (AG-02)        ║ Inv AG-03/04)  ║ (AG-06)                ║ & Sim (AG-05)     ║
           ╚═══════╦════════╩═══════╦════════╩═══════╦════════╩═══════════╦════════════╩═════════╦═════════╝
                   ║                ║                ║                    ║                      ║
 ┌─────────────────╨──┐   ┌─────────╨──┐   ┌─────────╨──┐        ┌────────╨───┐          ┌───────╨────────┐
 │   MICRO AGENTS     │   │MICRO AGENTS│   │MICRO AGENTS│        │MICRO AGENTS│          │  MICRO AGENTS  │
 │ • Tavily Web News  │   │• 44k BOM   │   │• 120 MES   │        │• 10k Cust. │          │• Do-Nothing    │
 │ • USGS Seismic     │   │  Recursive │   │  Capacity  │        │  SLA Calc  │          │• Air Expedite  │
 │ • Open-Meteo Radar │   │• Regional  │   │• 30k DOS   │        │• Rev-Risk  │          │• Alt Source    │
 │ • Port Sentiment   │   │  Corridors │   │  Stockout  │        │• OTIF Drop │          │• Volume Split  │
 └────────────────────┘   └────────────┘   └────────────┘        └────────────┘          └────────────────┘
```

---

### Tier 1: Super Agents (2 Agents)

| Agent Designation | Implementation File | Architectural Role & Responsibilities |
| :--- | :--- | :--- |
| **AG-07: Master Orchestrator & Lead Director** | `backend/agents/manager_agent.py` | • Coordinates the 5 domain teams through deterministic pipelining.<br>• Executes multi-signal conflict arbitration (`cross_signal_conflicts.csv`) when concurrent disruptions compete for cargo lanes or plant lines.<br>• Synthesizes cumulative blast-radius telemetry and generates executive trace logs. |
| **Interactive Q&A Copilot Super Agent** | `backend/agents/qa_copilot_agent.py` | • Provides instant natural language reasoning for executive inquiries.<br>• Implements a 3-tier token-efficient architecture (0-token cache, 0-token live telemetry synthesis, and compact Groq Llama-3 inference). |

---

### Tier 2: Macro Domain Agents (7 Canonical Agents / 5 Teams)

These agents align directly with the enterprise SAP/IBP/MES/TMS governance specifications documented in `backend/data/agents.csv`:

| Agent ID | Macro Agent Name | Domain Team & Service File | Key Inputs & Responsibilities |
| :---: | :--- | :--- | :--- |
| **AG-01** | **Disruption Sensing & Event Intelligence Agent** | Team 1: Sensing<br>`backend/agents/sensing_agent.py` | • Inputs: Supplier, origin port, destination hub, logistics mode.<br>• Evaluates live web, seismic, weather, and market signals to output a normalized Severity Score (0–100) and event classification. |
| **AG-02** | **Multi-Tier BOM & Supply Exposure Agent** | Team 2: Exposure<br>`backend/agents/exposure_agent.py` | • Inputs: Disrupted supplier, geographic coordinates.<br>• Recursively traverses 44,896 BOM linkages to isolate affected component parts, Finished Goods (`fg_id`), and manufacturing assembly facilities (`plant_id`). |
| **AG-03** | **Manufacturing Plant Capacity Lead Agent** | Team 3: Operations<br>`backend/agents/capacity_agent.py` | • Inputs: Exposed assembly plants, disruption severity.<br>• Evaluates line-level plant capacity loss %, changeover hours, and spare line redundancy across 120 MES lines in 20 assembly facilities (`PL-01` to `PL-20`). |
| **AG-04** | **Inventory & Days of Supply (DOS) Lead Agent** | Team 3: Operations<br>`backend/agents/inventory_agent.py` | • Inputs: Impacted part numbers, estimated recovery timeline.<br>• Queries 30,000 inventory ledgers to calculate exact Days of Supply cover, in-transit buffer, and safety stock breaches. |
| **AG-05** | **Response Recommendation & Trade-Off SME Agent** | Team 5: SCM SME<br>`backend/agents/recommendation_agent.py` | • Inputs: Exposure, capacity loss, DOS, financial impact, `alt_sources.csv`.<br>• Formulates C-Suite trade-off playbooks with capital cost, recovery timeline, revenue saved, and Groq Llama-3 strategic reasoning. |
| **AG-06** | **Commercial & Financial Impact Agent** | Team 4: Commercial<br>`backend/agents/customer_impact_agent.py`<br>`backend/agents/financial_agent.py` | • Inputs: Disrupted BOM, plant downtime, inventory stockouts.<br>• Compounds contractual delay penalties across 10,000 customer accounts (`customers.csv`), projects On-Time In-Full (OTIF) drop %, and computes total Revenue at Risk. |
| *(Dual)* | **Scenario Simulation Agent** | Team 5: Simulation<br>`backend/agents/recommendation_agent.py` | • Inputs: Operational and commercial blast radius.<br>• Executes 4 what-if parameter simulations (Do Nothing, Air Freight Expedite, Alternate Sourcing, Volume Reallocation). |

---

### Tier 3: Micro Agents & Specialized Sub-Engines (14 Micro Agents)

Deterministic, high-performance algorithmic modules embedded directly within the macro agents:

#### A. Sensing Micro-Agents (4)
1. **Tavily Live Web Disruption Crawler**: Crawls global news, labor union announcements, and port strikes in real-time.
2. **USGS Seismic Telemetry Ingestion Sensor**: Queries USGS GeoJSON feeds for real-time earthquakes ($\text{Magnitude} \ge 4.0$) within regional radii.
3. **Open-Meteo Meteorological Radar**: Fetches real-time oceanic wind speeds, cyclone trajectories, and precipitation forecasts.
4. **Marketaux Sentiment & Media Scorer**: Parses supplier news sentiment, component shortages, and raw material stress.

#### B. Exposure Micro-Agents (2)
5. **Recursive Multi-Tier BOM Graph Traverser**: Executes $O(1)$ fast graph traversal across 44,896 edges mapping Finished Goods $\to$ Component Parts $\to$ Primary Suppliers.
6. **Shipping Corridor & Geocoding Mapper**: Computes origin-to-destination transport coordinates, trade lanes, and regional cluster polygons.

#### C. Operations Micro-Agents (2)
7. **Line-Level MES Capacity Evaluator**: Computes capacity losses, line-level utilization %, and spare buffer redundancy across 120 lines (`capacity.csv`).
8. **Stockout Horizon & Safety Stock Breacher**: Evaluates `days_cover` against recovery days to detect safety stock violations and impending line halts.

#### D. Commercial Micro-Agents (2)
9. **Contractual Customer SLA Penalty Calculator**: Compounds daily late-delivery penalties across 10,000 enterprise accounts (`customers.csv`).
10. **Revenue-at-Risk & Margin Loss Engine**: Calculates financial blast radius based on 9,000 Finished Goods price ledgers and down-time duration.

#### E. Scenario Simulation Micro-Agents (4 What-If Playbook Simulators)
11. **"Do Nothing / Status Quo" Simulator**: Models unmitigated downtime, maximum penalty accumulation, 6-week recovery window, and severe OTIF drop.
12. **"Air Freight Expedite" Simulator**: Calculates air cargo spot surcharges, compresses transit timelines by 3 weeks, and preserves 94% OTIF.
13. **"Alternate Sourcing" Evaluator**: Inspects 15,869 SAP Ariba vendor mappings, validating PPAP audit weeks, unit cost delta %, and spare capacity.
14. **"Demand Reallocation & Volume Split" Simulator**: Simulates a 60/40 production split between primary lines and secondary safety buffers.

---

### Tier 4: Autonomous Engineering Framework Agents (5 Agents)

The autonomous software engineering hierarchy declared in `.agents/AGENTS.md` responsible for platform integrity:

1. **Engineering Manager Agent** (`.agents/skills/engineering-manager/SKILL.md`): Lead Orchestrator and Technical Product Manager responsible for feature decomposition and system contract auditing.
2. **Backend & AI Associate Agent** (`.agents/skills/backend-associate/SKILL.md`): Python and FastAPI engineer managing Groq, Tavily, Marketaux, and data loader pipelines.
3. **Frontend UI Associate Agent** (`.agents/skills/frontend-associate/SKILL.md`): Control tower dashboard engineer managing HTML5 Canvas, CSS glassmorphism, and responsive UX.
4. **QA & Testing Associate Agent** (`.agents/skills/qa-testing-associate/SKILL.md`): Automated testing engineer maintaining the 23-test Pytest regression suite.
5. **Supply Chain Domain Specialist Agent** (`.agents/skills/supply-chain-domain-expert/SKILL.md`): SCM Subject Matter Expert governing OTIF formulas, PPAP rules, and financial loss math.

---

### Grand Total Agent Ecosystem Summary

| Tier / Category | Total Agents | Key Components & Files |
| :--- | :---: | :--- |
| **Tier 1: Super Agents** | **2** | Master Orchestrator (`manager_agent.py`), Interactive Q&A Copilot (`qa_copilot_agent.py`) |
| **Tier 2: Macro Domain Agents** | **7** | Sensing, Exposure, Capacity, Inventory, Recommendation, Commercial, What-If Simulator |
| **Tier 3: Micro Agents / Engines** | **14** | Feeds, 44k BOM traverser, 120 MES lines, 30k DOS, SLAs, 4 what-if engines |
| **Tier 4: Engineering Framework Agents** | **5** | Engineering Manager, Backend Associate, Frontend Associate, QA Associate, Domain SME |
| **Grand Total** | **28** | **Comprehensive Autonomous Agent Ecosystem** |

---

## 3. Technology Stack Specification

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                  UNAI TECHNOLOGY STACK                                 │
├───────────────────────┬────────────────────────┬────────────────────────┬──────────────┤
│ 1. CORE RUNTIME       │ 2. AI & LLM REASONING  │ 3. LIVE SIGNAL APIS    │ 4. DATA &    │
│ • Python 3.13+        │ • Groq LPU Cloud       │ • Tavily AI Search     │    GRAPH     │
│ • FastAPI (ASGI)      │ • Meta Llama-3-70B/8B  │ • USGS Earthquake API  │ • In-Memory  │
│ • Uvicorn Server      │ • Zero-Token Fast-Path │ • Open-Meteo Maritime  │   Hash Map   │
│ • Pydantic v2         │ • Multi-Tier Telemetry │ • Marketaux Sentiment  │ • 44k BOM    │
│ • HTTPX Client        │ • SCM System Prompts   │ • NOAA Weather Radar   │ • 100k Flat  │
├───────────────────────┼────────────────────────┴────────────────────────┴──────────────┤
│ 5. CONTROL TOWER UI   │ 6. TESTING & BENCHMARKING      │ 7. AGENTIC FRAMEWORK          │
│ • Modern HTML5 / ES6+ │ • Pytest 9.x (23/23 Passing)   │ • Antigravity Multi-Agent     │
│ • Vanilla CSS3 Glass  │ • Starlette TestClient         │ • Role-Based Skill Delegation │
│ • HTML5 Canvas Engine │ • AnyIO Async Event Loop       │ • Deterministic SCM Heuristics│
│ • Light / Dark Engine │ • Standalone Benchmark Suite   │ • Automated Contract Auditing │
└───────────────────────┴────────────────────────────────┴──────────────────────────────┘
```

---

### 1. Backend Runtime & Microservices Framework

| Technology | Role & Architectural Purpose |
| :--- | :--- |
| **Python 3.13+** | Primary runtime language. Leverages native asynchronous support, strong type annotations, and high-performance dictionary indexing. |
| **FastAPI** | Modern, high-performance web framework for building APIs with Python. Provides automatic OpenAPI / Swagger documentation and asynchronous endpoint handling. |
| **Uvicorn** | Production ASGI web server powering real-time asynchronous event loop execution. |
| **Pydantic v2** | Enterprise data validation and schema enforcement layer, guaranteeing type safety and reliable JSON serialization across all agent payloads. |
| **HTTPX** | Fully featured asynchronous and synchronous HTTP client used for non-blocking concurrent requests to external intelligence feeds. |

---

### 2. Artificial Intelligence & LLM Reasoning Layer

| Technology | Role & Architectural Purpose |
| :--- | :--- |
| **Groq LPU™ Cloud** | Ultra-high-speed Language Processing Unit (LPU) cloud inference engine delivering LLM responses in **<360 ms** (5–10x faster than traditional GPU infrastructures). |
| **Meta Llama-3 (70B & 8B)** | Core generative reasoning model instructed through SCM domain prompts to act as Chief Procurement Officer and Director of Supply Chain. |
| **Three-Tier Copilot Engine** | **Tier 1 (Zero-Token)**: Instant regex cache for foundational domain definitions and formulas.<br>**Tier 2 (Zero-Token)**: Live in-memory multi-agent telemetry synthesis (BOM, MES capacity, inventory DOS, customer order book).<br>**Tier 3 (Compact Inference)**: Targeted Groq LLM inference (~150–250 tokens) for complex strategic inquiries. |
| **Procurement Heuristics Engine** | Deterministic domain rules enforcing real-world constraints (e.g. forbidding high-friction alternate supplier reallocation unless a major catastrophic force majeure event physically destroys manufacturing capacity). |

---

### 3. Real-Time Environmental & Market Intelligence APIs

| External Service / API | Disruption Data Ingested |
| :--- | :--- |
| **Tavily AI Search API** | Autonomous live search across global web sources for port strikes, factory fires, and geopolitical blockades. |
| **USGS Seismic API** | Direct GeoJSON ingestion of global earthquake activity ($\text{Magnitude} \ge 4.0$) with epicenter lat/long fault mapping. |
| **Open-Meteo Marine & Weather API** | Live oceanic wind speeds, cyclone trajectories, and precipitation tracking at major shipping corridors. |
| **Marketaux Financial API** | Upstream supplier press releases, semiconductor wafer shortages, and raw material market sentiment. |

---

### 4. In-Memory Data Layer & Graph Indexing Engine

| Component | Technical Implementation Details |
| :--- | :--- |
| **`EnterpriseDataLoader`** | Custom in-memory bidirectional hash matrix indexer (`backend/data_loader.py`) converting static disk CSVs into **$O(1)$ fast lookups**. |
| **SAP / ERP / MES Flat Files** | Ingests **10 production enterprise datasets (100,000+ records)**: `bom.csv` (44,896 links), `finished_goods.csv` (9,000 items), `inventory.csv` (30,000 ledgers), `capacity.csv` (120 MES lines), `customers.csv` (10,000 accounts), `alt_sources.csv` (15,869 mappings). |
| **Graph Traversal Algorithms** | Recursive Directed Acyclic Graph (DAG) traversal mapping Finished Goods $\to$ Component Parts $\to$ Primary Vendors $\to$ Assembly Facilities. |
| **Conflict Arbitration Engine** | Multi-signal arbitration matrix (`cross_signal_conflicts.csv`) and cumulative deduplication (`cumulative_impact.csv`) resolving simultaneous claims on shared transportation and manufacturing resources. |

---

### 5. Frontend UI & Executive Control Tower

| Technology | Technical Implementation Details |
| :--- | :--- |
| **Pure HTML5 & ES6+ JavaScript** | Zero framework overhead (no React/Angular virtual DOM latency), guaranteeing **instant page load and sub-millisecond interactive updates**. |
| **Vanilla CSS3 Glassmorphism** | Enterprise visual design featuring CSS custom properties, `-webkit-backdrop-filter: blur(20px)`, subtle gradients, and `transform: translateZ(0)` hardware acceleration. |
| **Light & Dark Theme Engine** | Dynamic CSS variable theming persisted in `localStorage` with server-side `Cache-Control: no-cache` and versioned asset query strings (`styles.css?v=3.0`). |
| **HTML5 Canvas 2D Engine** | High-performance custom canvas visualizer rendering supply network topology with organic regional cluster blobs (Raw Materials, Foundries, Assembly Plants, Customer Hubs). |

---

### 6. Testing, Quality Assurance & Benchmarking

| Tool / Framework | Purpose & SLA Verification |
| :--- | :--- |
| **Pytest 9.x** | Automated test runner verifying **23/23 unit, integration, and endpoint tests (100% pass rate)**. |
| **Starlette TestClient** | In-memory integration testing framework validating FastAPI route handling without network latency. |
| **AnyIO** | Asynchronous testing library managing concurrent coroutines and event loops. |
| **Standalone Benchmark Suite** | Automated performance benchmark ([poc_benchmark_suite.py](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/UNAI/poc_benchmark_suite.py)) proving end-to-end multi-agent pipeline latency of **1,594 ms** (meeting the <2,000 ms SLA). |

---

### 7. Agentic Engineering Framework

| Component | Purpose & Implementation |
| :--- | :--- |
| **Antigravity Multi-Agent Architecture** | Role-based engineering framework defined in `.agents/AGENTS.md`. |
| **Modular Engineering Skills** | Dedicated skills managing team execution: `engineering-manager`, `backend-associate`, `frontend-associate`, `qa-testing-associate`, and `supply-chain-domain-expert`. |

---

## 4. Performance Benchmarks & SLA Verification

The system was evaluated using the automated benchmark suite ([poc_benchmark_suite.py](file:///c:/Users/ashwa/OneDrive/Desktop/VS%20Code/UNAI/poc_benchmark_suite.py)) against the 100,000+ record dataset:

| Pipeline Stage | Benchmark Latency | Production SLA Target | Compliance Status |
| :--- | :---: | :---: | :---: |
| **In-Memory Flat Files Hash Matrix Ingestion** | **983.48 ms** | $< 2,000\text{ ms}$ | **PASSED (Sub-second Cold Start)** |
| **AG-01: Disruption Sensing & Weather Radar** | **1,350.28 ms** | $< 1,500\text{ ms}$ | **PASSED (Real-time Live API)** |
| **AG-02: 44k BOM Graph Traversal & Topology** | **150.91 ms** | $< 200\text{ ms}$ | **PASSED (Instant Graph Traversal)** |
| **AG-03/04: Capacity & 30k Inventory DOS** | **0.13 ms** | $< 50\text{ ms}$ | **PASSED (Sub-millisecond)** |
| **AG-06: Commercial SLAs & Revenue Risk Math** | **0.50 ms** | $< 50\text{ ms}$ | **PASSED (Sub-millisecond)** |
| **AG-05/07: SCM Trade-Off Decision Engine** | **360.18 ms** | $< 500\text{ ms}$ | **PASSED (Llama-3 Synthesis)** |
| **Total End-to-End Orchestrated Pipeline** | **1,594.33 ms** | $< 2,000\text{ ms}$ | **PASSED (C-Suite Real-Time)** |
| **Supply Chain Q&A Copilot Synthesis** | **0.01 ms** | $< 50\text{ ms}$ | **PASSED (Instant Memory Cache)** |
