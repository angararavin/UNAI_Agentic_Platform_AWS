# UNAI Supply Chain Copilot — User & Operator Guide

---

## 1. Quickstart & Running the Application

### Prerequisites
- Python 3.10+
- Modern Web Browser (Chrome, Edge, Firefox, Safari)

### Starting the Application
From the repository root (`c:\Users\ashwa\OneDrive\Desktop\VS Code\UNAI`), start the FastAPI server:
```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
Then open your browser to [http://127.0.0.1:8000/](http://127.0.0.1:8000/).

---

## 2. Using the Executive Control Tower Dashboard

### 2.1 Entering Parameters & Running the Multi-Agent Pipeline
1. In the top filter bar, enter:
   - **Supplier**: e.g., `TSMC`, `Foxconn`, `Samsung Electronics`, `Flex`, `Kia India`.
   - **Origin Facility**: e.g., `Hsinchu Tech Park, Taiwan`, `Shenzhen, China`, `Chennai, India`.
   - **Destination Assembly**: e.g., `Austin, Texas, USA`, `Long Beach, CA`, `Frankfurt, Germany`.
   - **Transport Mode**: `Ocean Freight`, `Air Freight`, or `Road & Rail`.
2. Click **⚡ Run Agentic Pipeline**.
3. Watch the **5-Stage Pipeline Progress Tracker**:
   - `1. Event Intelligence` (Live News, Weather & USGS)
   - `2. Exposure & BOM` (Tier-1/2 Suppliers & Plant Mapping)
   - `3. Operations Capacity` (Plant Capacity Loss % & Recovery Days)
   - `4. Commercial Impact` (Revenue at Risk, OTIF, SLA Penalties)
   - `5. Strategy Recommendation` (Groq AI Mitigation Engine)

---

## 3. Interpreting Telemetry & Strategy Comparators

### 3.1 Event Intelligence & BOM Exposure
- **Disruption Events**: Real-time adverse news articles, Open-Meteo extreme weather metrics (wind speed, precipitation), and USGS seismic activity.
- **BOM & Plant Exposure**: Identified Tier-1 & Tier-2 dependencies, affected BOM parts, and exposed manufacturing assembly facilities.

### 3.2 Operations & Commercial Scorecards
- **Plant Capacity Loss %**: Impact on assembly throughput taking into account facility redundancy.
- **Days of Supply (DOS)**: Projected component inventory runway and safety stock breaches.
- **Commercial Blast Radius**: Total customer orders affected, OTIF delivery degradation (%), fill rate (%), and SLA penalties ($).

### 3.3 Strategy Leaderboard & Trade-off Matrix
- Review the 4 generated mitigation strategies:
  1. **Baseline Unmitigated (Status Quo)**
  2. **Logistics Mode Expedite**
  3. **Strategic Supplier Reallocation (Recommended)**
  4. **Volume Split & Buffer Stocking**
- Click any strategy card to update the interactive comparison delta table showing Remaining Risk ($), Revenue Protected ($), and Strategy Cost ($).

---

## 4. Smart Supply Chain Copilot AI Drawer

1. Click the floating **🧠 Ask Copilot** button at the bottom right.
2. Select a quick prompt chip (e.g., `⚡ What is OTIF?`, `⚡ Why Option 3?`, `⚡ Explain Capacity Loss`) or type a custom query.
3. The Copilot delivers instant domain answers via its 3-tier zero-token caching and live multi-agent telemetry synthesis.

---

## 5. Uploading Enterprise CSV Datasets

1. Click **📁 Upload CSV Datasets** in the header.
2. Upload any of the 6 core datasets:
   - `suppliers.csv`
   - `bom.csv`
   - `plant_capacity.csv`
   - `plant_parts.csv`
   - `inventory.csv`
   - `customer_orders.csv`
3. The backend validates and updates the active ledger, immediately refreshing the pipeline calculations.

---

## 6. Theme Switching
- Click the **🌙 / ☀️** toggle in the top right to switch between **Dark Glassmorphism Mode** and **WCAG AAA Light Mode**.
