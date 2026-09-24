# UNAI Supply Chain Risk & Decision Intelligence Copilot
## Comprehensive Knowledge Transfer (KT) & Architectural Evolution Guide

---

## 1. Executive Summary: Old vs. New Architecture

| Architectural Dimension | Old Architecture (Prototype Baseline) | New Architecture (Production Enterprise Platform) |
| :--- | :--- | :--- |
| **Agent Topology** | 3 Macro Agents (Sensing, Financial, Recommendation) | **9 Specialized Autonomous Agents** organized into 5 Orchestrated Teams (`AG-01` to `AG-07` + QA Copilot + Scenario Simulator) |
| **Dataset Scale & Source** | Static mock CSVs (~50 records total) | **10 Production Enterprise Flat Files (100,000+ records)** spanning SAP ERP, IBP, MES, TMS, and Ariba |
| **Data Ingestion Engine** | Sequential per-request file reads | **`EnterpriseDataLoader` $O(1)$ In-Memory Hash Map Indexer** loading 100k+ records in <250ms with dual-mode schema fallbacks |
| **BOM Traversal Depth** | Single-tier static part lookup | **Multi-Tier Dynamic BOM Traversal** across 44,896 linkages mapping Finished Goods (`fg_id`) → Component (`part_id`) → Primary Vendor (`part_primary_vendor_id`) → Assembly Plants |
| **Manufacturing Footprint** | Macro plant loss approximation | **Line-Level MES Telemetry** across 120 production lines across 20 assembly plants (`PL-01` to `PL-20`) with changeover hours and utilization % |
| **Inventory Intelligence** | Estimated daily consumption | **Actual Inventory Ledgers (30,000 records)** tracking exact Days of Cover (`days_cover`), on-hand stock, in-transit buffer, and safety stock breaches |
| **Alternate Sourcing** | Synthetic vendor name generators | **SAP Ariba Sourcing Matrix (15,869 mappings)** with real qualified alternate vendors (`alt_vendor_id`), PPAP qualification weeks, lead time weeks, and unit cost deltas (%) |
| **Commercial & Customer** | 10 mock orders | **10,000 Enterprise Customer Accounts** with contractual SLA penalty rates (`penalty_usd_per_day`), contract types (LTA, consignment), and 9,000 finished goods price lists |
| **Multi-Disruption Arbitration**| Single-event isolation | **Multi-Signal Conflict Arbitration** (`cross_signal_conflicts.csv`), cumulative de-duplicated impact (`cumulative_impact.csv`), and time-phased domain trajectories (`impact_timephased.csv`) |
| **Frontend Control Tower** | Basic table layout with unstyled text | **Executive Glassmorphic Control Tower** with interactive 5-step Agent Pipeline Bar, Center Blob-Style Supply Network Topology Canvas, Live Supplier News Radar, and Light/Dark Modes |
| **Test Suite & Verification** | 5 simple unit tests | **23 Automated Integration & Unit Tests (100% Passing)** with end-to-end regression defense |

---

## 2. Autonomous Multi-Agent Hierarchy & Team Structure

```
                          ┌─────────────────────────────────────────────────────────┐
                          │     AG-07: Master Orchestrator / Lead Manager Agent     │
                          │  • Coordinates all domain teams                         │
                          │  • Multi-signal conflict arbitration                    │
                          │  • Cumulative impact synthesis & trace logging          │
                          └────────────────────────────┬────────────────────────────┘
                                                       │
         ┌─────────────────────────────────────────────┼─────────────────────────────────────────────┐
         ▼                                             ▼                                             ▼
┌───────────────────────────────┐       ┌───────────────────────────────┐       ┌───────────────────────────────┐
│ Team 1: Event Intelligence    │       │ Team 2: Supply Network Exposure│       │ Team 3: Operations Lead Team  │
│ AG-01: Sensing Agent          │       │ AG-02: Exposure Agent         │       │ AG-03: Capacity Lead Agent    │
│ • Live Tavily Search & News   │       │ • Multi-Tier BOM (44k links)  │       │ AG-04: Inventory Lead Agent   │
│ • USGS Seismic & Open-Meteo   │       │ • Upstream/Downstream Graph   │       │ • Line-level MES Capacity     │
│ • Signal IDs (SIG-0912..16)   │       │ • Plant exposure mapping      │       │ • Days of Cover (DOS) Ledgers │
└───────────────────────────────┘       └───────────────────────────────┘       └───────────────────────────────┘
                                                       │
         ┌─────────────────────────────────────────────┴─────────────────────────────────────────────┐
         ▼                                                                                           ▼
┌───────────────────────────────┐                                           ┌───────────────────────────────┐
│ Team 4: Commercial Lead Team  │                                           │ Team 5: SME Response & AI     │
│ AG-06: Customer & Revenue Ag. │                                           │ AG-05: Sourcing & Logistics   │
│ • 10,000 Customer Accounts    │                                           │ Recommendation SME Agent      │
│ • Contractual SLA Penalties   │                                           │ • 15,869 Alternate Sources    │
│ • Revenue at Risk & OTIF Drop │                                           │ • Groq Llama-3 Decision Engine│
└───────────────────────────────┘                                           └───────────────────────────────┘
```

---

## 3. Production Flat Files Specification & Indexing Architecture

The system ingests 10 production flat files from `backend/data/` (synchronized from `C:\Users\ashwa\.gradle\Downloads\data`):

### 3.1 Dataset Inventory
1. **`bom.csv` (44,896 records, 1.35 MB)**:
   - Primary Columns: `fg_id`, `part_id`, `qty_per`, `bom_level`, `part_primary_vendor_id`
   - Role: Establishes the multi-tier engineering hierarchy. Connects finished goods assemblies down to sub-assemblies and raw component part numbers with designated primary vendor IDs.
2. **`finished_goods.csv` (9,000 records, 958 KB)**:
   - Primary Columns: `fg_id`, `description`, `program`, `fg_family`, `plant_id`, `price_usd`, `std_cost_usd`, `margin_pct`, `weekly_volume`, `lifecycle`
   - Role: Links finished goods assemblies to manufacturing plants (`plant_id`), unit sales price, standard cost, target margins, and weekly production volumes.
3. **`inventory.csv` (30,000 records, 1.32 MB)**:
   - Primary Columns: `plant_id`, `part_id`, `on_hand_qty`, `days_cover`, `in_transit_qty`, `safety_stock_qty`, `as_of_date`
   - Role: Daily plant-level inventory snapshot tracking stock on hand, actual days of supply cover (`days_cover`), in-transit pipeline, and safety stock thresholds.
4. **`capacity.csv` (120 lines, 6.3 KB)**:
   - Primary Columns: `plant_id`, `line_id`, `fg_family`, `weekly_capacity_units`, `utilization_pct`, `changeover_hours`, `status`
   - Role: Assembly line-level manufacturing telemetry across 20 production facilities (`PL-01` to `PL-20`).
5. **`customers.csv` (10,000 records, 802 KB)**:
   - Primary Columns: `customer_id`, `customer_name`, `customer_type`, `region`, `country`, `tier_rank`, `otif_target_pct`, `penalty_usd_per_day`, `annual_revenue_usd`, `contract_type`
   - Role: Enterprise customer registry with contractual late delivery penalty schedules and OTIF commitments.
6. **`alt_sources.csv` (15,869 records, 778 KB)**:
   - Primary Columns: `part_id`, `alt_vendor_id`, `region`, `country`, `lead_time_weeks`, `unit_cost_delta_pct`, `ppap_weeks`, `capacity_available_pct`, `margin_delta_pt`
   - Role: Qualified alternate supplier catalog from SAP Ariba detailing PPAP audit lead times, cost differentials, and available spare capacity.
7. **`cross_signal_conflicts.csv` (3 records, 692 B)**:
   - Primary Columns: `conflict_id`, `signal_a`, `signal_b`, `contested_resource`, `description`, `resolution_options`
   - Role: Multi-event resource contention rules (e.g. air freight lane capacity limits, competing assembly line re-sequencing, inventory buffer trims).
8. **`cumulative_impact.csv` (4 records, 351 B)**:
   - Primary Columns: `scope`, `fg_at_risk_raw`, `fg_at_risk_deduped`, `plants_hit`, `customers_exposed`, `open_so_musd`, `otif_trough_pt`, `margin_trough_pt`, `working_capital_peak_musd`, `longest_recovery_weeks`
   - Role: Multi-signal cumulative risk aggregation with de-duplicated impact totals.
9. **`impact_timephased.csv` (105 records, 5.0 KB)**:
   - Primary Columns: `signal_id`, `impact_domain`, `unit`, `week_bucket`, `value`
   - Role: Time-phased domain trajectory curves across `wk1-2`, `wk3-6`, and `wk7+`.
10. **`agents.csv` (7 records, 1.3 KB)**:
    - Primary Columns: `agent_id`, `agent_name`, `role`, `primary_inputs`, `primary_outputs`, `systems_touched`, `autonomy`
    - Role: Standardized architectural governance matrix for AG-01 through AG-07.

---

## 4. In-Memory Indexer Architecture (`backend/data_loader.py`)

To eliminate disk I/O bottlenecks and support sub-10ms API responses across 100k+ records, `EnterpriseDataLoader` loads and indexes all flat files into in-memory hash structures on startup:

```python
from backend.data_loader import get_data_loader
dl = get_data_loader()

# O(1) Fast Lookups:
fg_boms = dl.bom_by_fg.get("FG-00001")          # Returns all component parts & quantities
part_alts = dl.alt_sources_by_part.get("P-000001") # Returns qualified alternate vendors
plant_lines = dl.capacity_by_plant.get("PL-01")    # Returns all lines & utilization %
customer = dl.customers_by_id.get("C-00001")      # Returns customer SLA & penalty rate
time_curves = dl.timephased_by_signal.get("SIG-2026-0912") # Returns wk1-2, wk3-6, wk7+ curves
```

---

## 5. Agent-by-Agent Deep Dive & Technical Contract

### AG-01: Event Intelligence & Risk Sensing Agent (`sensing_agent.py`)
- **Inputs**: Vendor name, route origin, destination, transport mode, live web queries.
- **Data Feeds**: Tavily API, Marketaux News Sentiment, Open-Meteo Weather, USGS Seismic, `impact_timephased.csv`.
- **Outputs**: Normalized Disruption Severity Score (0 to 100), categorization (Seismic, Port Congestion, Geopolitical, Weather), headline summaries, and upstream raw material shortages.

### AG-02: Exposure Lead Agent (`exposure_agent.py`)
- **Inputs**: Disruption event, supplier name, epicenter coordinates.
- **Data Feeds**: `bom.csv` (44,896 records), `finished_goods.csv` (9,000 records), `suppliers.csv`.
- **Algorithm**:
  1. Identifies primary disrupted supplier and traces Tier-1 & Tier-2 dependencies.
  2. Traverses `bom.csv` to extract all affected component `part_id`s.
  3. Joins with `finished_goods.csv` to map affected Finished Goods (`fg_id`) to assembly plants (`plant_id`).
  4. Generates dynamic Supply Chain Topology Graph nodes and shipping corridor links.

### AG-03: Capacity Lead Agent (`capacity_agent.py`)
- **Inputs**: Exposed plants list, disruption severity score.
- **Data Feeds**: `capacity.csv` (120 production lines across plants `PL-01` to `PL-20`).
- **Algorithm**:
  1. Computes total plant weekly capacity: $\text{Capacity} = \sum \text{weekly\_capacity\_units}$.
  2. Calculates line utilization buffer: $\text{Redundancy} = \frac{100 - \text{avg\_utilization}}{100}$.
  3. Computes plant capacity loss %: $\text{Loss} = \text{Exposure Fraction} \times \frac{\text{Severity}}{100} \times (1 - \text{Redundancy})$.
  4. Estimates plant recovery timeline in days.

### AG-04: Inventory Lead Agent (`inventory_agent.py`)
- **Inputs**: Affected parts list, capacity recovery timeline.
- **Data Feeds**: `inventory.csv` (30,000 records).
- **Algorithm**:
  1. Reads actual `days_cover` (DOS) and `in_transit_qty` per component.
  2. Evaluates safety stock breaches: $\text{Breach} = \text{on\_hand\_qty} < \text{safety\_stock\_qty}$.
  3. Detects component stockout risk: $\text{Stockout Expected} = \text{days\_cover} < \text{Recovery Days}$.

### AG-05 & AG-06: Commercial & Financial Lead Agents (`customer_impact_agent.py` & `financial_agent.py`)
- **Inputs**: Disrupted BOM, capacity downtime, inventory stockout gap.
- **Data Feeds**: `customers.csv` (10,000 accounts), `finished_goods.csv` (9,000 FGs).
- **Algorithm**:
  1. Computes contractual delay penalties: $\text{Penalty} = \text{penalty\_usd\_per\_day} \times \text{Delay Days}$.
  2. Computes Revenue at Risk: $\text{Revenue at Risk} = \sum (\text{Weekly Volume} \times \text{Price USD} \times \text{Downtime Weeks})$.
  3. Estimates OTIF degradation: $\text{OTIF}_{\text{proj}} = \text{OTIF}_{\text{base}} - \text{OTIF Trough Point}$.

### AG-07: Master Orchestrator Agent (`manager_agent.py`)
- **Inputs**: All sub-agent telemetry streams.
- **Data Feeds**: `cross_signal_conflicts.csv`, `cumulative_impact.csv`, `agents.csv`.
- **Role**: Coordinates the end-to-end execution pipeline, resolves resource contentions across multiple disruption signals, and outputs the unified executive payload.

### SME Recommendation Engine (`recommendation_agent.py`)
- **Inputs**: Exposure, capacity loss, inventory DOS, financial blast radius, `alt_sources.csv`.
- **Outputs**: 4 distinct mitigation trade-off options powered by Groq LLM (Llama-3):
  1. *Option 1: Baseline Unmitigated (Status Quo)*
  2. *Option 2: Logistics Expedite & Priority Air Freight*
  3. *Option 3: Shift Production to Qualified Alternate Supplier (`alt_sources.csv`)*
  4. *Option 4: Secondary Volume Split & Buffer Allocation*

---

## 6. Frontend UI Innovations & User Experience

1. **Dynamic 5-Step Orchestration Pipeline Bar**:
   - Visual progress tracker across the 5 agent teams (`1. Event Intelligence`, `2. BOM & Topology`, `3. Operations Lead`, `4. Commercial Impact`, `5. SME Decision Engine`).
   - Dynamic pulsing animation during pipeline execution and quick-scroll navigation on click.
2. **Blob-Style Network Topology Map**:
   - Center canvas (860×380px) displaying organic regional cluster blobs (`Tier-2 Material Basin`, `Tier-1 Foundry Hubs`, `Assembly Super-Plants`, `Demand Market Hub`).
3. **Live Supplier News Radar & Raw Material Shortages**:
   - Left-panel real-time feed tracking upstream silicon wafer shortages, semiconductor substrate constraints, and vendor sentiment.
4. **Theme Engine with Cache Invalidation**:
   - Seamless Light and Dark modes with server-side `Cache-Control: no-cache` and versioned asset query strings (`styles.css?v=2.5`).

---

## 7. Developer & Operational Runbook

### Starting the Server
```bash
# Activate python environment & launch FastAPI backend
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### Running Automated Test Suite
```bash
# Execute all 23 unit & integration tests
python -m pytest tests/test_agents.py -v
```

### Accessing Dashboard & Endpoints
- **Web UI**: `http://127.0.0.1:8000/`
- **Interactive Swagger API Docs**: `http://127.0.0.1:8000/docs`
- **Main Pipeline Endpoint**: `GET /api/pipeline?supplier=TSMC&origin=Hsinchu&destination=Austin`
- **Topology Endpoint**: `GET /api/topology?origin=Hsinchu&destination=Austin`
- **Dataset Upload**: `POST /api/upload/{dataset_name}`
