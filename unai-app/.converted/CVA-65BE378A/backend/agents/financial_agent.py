import csv
import httpx
import hashlib
from pathlib import Path
from backend.config import MARKETAUX_API_KEY, DATA_DIR

class FinancialImpactAgent:
    """
    Agent 2: Financial Impact Agent
    Calculates financial metrics and computes a unified Risk Percentage Score (0% to 100%)
    combining news disruption events, Marketaux market sentiment, and operational exposure.
    """
    def __init__(self):
        self.financials_path = DATA_DIR / "supplier_financials.csv"
        self.impact_path = DATA_DIR / "revenue_impact.csv"

    def calculate_impact(
        self, 
        supplier_name: str = "Kyoto Electronics", 
        country: str = None, 
        city: str = None, 
        origin: str = None,
        destination: str = None,
        transport_mode: str = None,
        severity: str = "High",
        severity_score: int = 75,
        use_live_api: bool = False
    ) -> dict:
        supplier_data = self._get_supplier_financial_data(supplier_name, country, city)
        impact_data = self._get_revenue_impact_data(supplier_name, country, city)
        marketaux_news = []
        marketaux_sentiment = 0.0

        if use_live_api and MARKETAUX_API_KEY:
            try:
                marketaux_news, marketaux_sentiment = self._fetch_marketaux_signals(supplier_name)
            except Exception as e:
                print(f"[FinancialImpactAgent] Marketaux API call note: {e}")

        is_healthy = severity.upper() in ["NONE", "HEALTHY", "LOW_RISK", "NORMAL"]
        
        if is_healthy:
            rev_risk = 0.0
            margin_loss = 0.0
            penalty_cost = 0.0
            expedite_cost = 0.0
            otif_proj = float(impact_data.get("otif_baseline_pct", 98.0))
            recovery_wks = 0
            stockout_days = 45
            risk_score_pct = round(max(2.0, min(12.0, (1.0 - marketaux_sentiment) * 5.0)), 1)
            risk_level = "HEALTHY"
        else:
            severity_mult = 1.45 if severity.upper() == "CRITICAL" else (1.25 if severity.upper() == "HIGH" else 0.85)
            base_rev = float(supplier_data.get("baseline_revenue_usd", 2500000))
            rev_risk = base_rev * severity_mult
            margin_pct = float(supplier_data.get("margin_pct", 14.0))
            margin_loss = rev_risk * (margin_pct / 100.0)
            penalty_cost = float(supplier_data.get("penalty_cost_usd", 200000)) * severity_mult
            expedite_cost = float(supplier_data.get("expedite_cost_usd", 150000))
            otif_proj = float(impact_data.get("otif_projected_pct", 84.0))
            recovery_wks = int(impact_data.get("recovery_timeline_weeks", 6))
            stockout_days = int(supplier_data.get("stockout_risk_days", 12))

            # Unified Risk Percentage Formula (0 to 100%)
            # 1. Event Severity Weight (40%)
            # 2. OTIF Drop Weight (35%) -> Drop from baseline
            # 3. Market Sentiment & Stockout Days Weight (25%)
            otif_drop = max(0.0, float(impact_data.get("otif_baseline_pct", 98.0)) - otif_proj)
            otif_risk = min(100.0, (otif_drop / 30.0) * 100.0)
            
            sentiment_penalty = max(0.0, -marketaux_sentiment * 30.0) if marketaux_sentiment < 0 else 0.0
            stockout_risk = max(0.0, (21.0 - min(21, stockout_days)) / 21.0 * 100.0)
            
            combined_score = (severity_score * 0.40) + (otif_risk * 0.35) + (((stockout_risk + sentiment_penalty)/2) * 0.25)
            risk_score_pct = round(max(15.0, min(98.0, combined_score)), 1)

            if risk_score_pct >= 70.0:
                risk_level = "CRITICAL RISK"
            elif risk_score_pct >= 45.0:
                risk_level = "HIGH RISK"
            else:
                risk_level = "MEDIUM RISK"

        margin_pct = float(supplier_data.get("margin_pct", 14.0))
        orig_str = origin or (city or f"{supplier_name} Facility")
        dest_str = destination or (f"Plants, {country}" if country and country != "Global" else "Destination Hub")
        mode_str = transport_mode or "Ocean Freight"
        route_display = f"{orig_str} ➔ {dest_str} ({mode_str})"

        return {
            "supplier": supplier_name,
            "country": country or "Global",
            "city": city or "Hub",
            "origin": orig_str,
            "destination": dest_str,
            "transportMode": mode_str,
            "routeDisplay": route_display,
            "locationDisplay": route_display,
            "riskScorePct": risk_score_pct,
            "riskLevel": risk_level,
            "revenueRisk": round(rev_risk, 2),
            "marginLoss": round(margin_loss, 2),
            "penaltyCost": round(penalty_cost, 2),
            "expediteCost": round(expedite_cost, 2),
            "marginPct": margin_pct,
            "affectedCustomers": 0 if is_healthy else int(impact_data.get("affected_customers_count", 42)),
            "impactedPlants": 0 if is_healthy else int(impact_data.get("impacted_plants_count", 4)),
            "otifBaseline": float(impact_data.get("otif_baseline_pct", 98.0)),
            "otifProjected": otif_proj,
            "stockoutRiskDays": stockout_days,
            "recoveryTimelineWeeks": recovery_wks,
            "marketauxSignals": marketaux_news,
            "dataSource": "Financial Risk & Market Sentiment Engine"
        }

    def _fetch_marketaux_signals(self, query: str) -> tuple:
        url = f"https://api.marketaux.com/v1/news/all?search={query}&filter_entities=true&limit=3&api_token={MARKETAUX_API_KEY}"
        response = httpx.get(url, timeout=8.0)
        if response.status_code == 200:
            data = response.json()
            articles = []
            avg_sentiment = 0.0
            for item in data.get("data", []):
                ent_sent = item.get("entities", [{}])[0].get("sentiment_score", 0.0) if item.get("entities") else 0.0
                avg_sentiment += ent_sent
                articles.append({
                    "title": item.get("title"),
                    "snippet": item.get("description", "")[:150] + "...",
                    "url": item.get("url"),
                    "sentiment": ent_sent
                })
            if articles:
                avg_sentiment /= len(articles)
            return articles, avg_sentiment
        return [], 0.0

    def _get_supplier_financial_data(self, supplier_name: str, country: str = None, city: str = None) -> dict:
        if self.financials_path.exists() and supplier_name:
            with open(self.financials_path, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row["supplier"].lower() in supplier_name.lower() or supplier_name.lower() in row["supplier"].lower():
                        return row

        seed = int(hashlib.md5(f"fin-{supplier_name}-{country}-{city}".encode()).hexdigest(), 16)
        supp_lower = supplier_name.lower()

        if any(tech in supp_lower for tech in ["foxconn", "tsmc", "apple", "samsung", "intel", "nvidia", "amd"]):
            base_rev = 12000000 + (seed % 35) * 1000000
            margin = 12.0 + (seed % 65) * 0.1
            penalty = 350000 + (seed % 30) * 15000
            expedite = 220000 + (seed % 25) * 10000
            stockout_days = 5 + (seed % 12)
        elif any(auto in supp_lower for auto in ["bmw", "tesla", "toyota", "ford", "gm"]):
            base_rev = 8000000 + (seed % 28) * 800000
            margin = 9.0 + (seed % 70) * 0.1
            penalty = 280000 + (seed % 25) * 12000
            expedite = 180000 + (seed % 20) * 8000
            stockout_days = 4 + (seed % 10)
        else:
            base_rev = 2200000 + (seed % 40) * 300000
            margin = 13.0 + (seed % 80) * 0.1
            penalty = 110000 + (seed % 30) * 7000
            expedite = 75000 + (seed % 20) * 5000
            stockout_days = 8 + (seed % 14)

        return {
            "baseline_revenue_usd": base_rev,
            "margin_pct": round(margin, 1),
            "penalty_cost_usd": penalty,
            "expedite_cost_usd": expedite,
            "stockout_risk_days": stockout_days
        }

    def _get_revenue_impact_data(self, supplier_name: str, country: str = None, city: str = None) -> dict:
        if self.impact_path.exists() and supplier_name:
            with open(self.impact_path, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row["supplier"].lower() in supplier_name.lower() or supplier_name.lower() in row["supplier"].lower():
                        return row

        seed = int(hashlib.md5(f"imp-{supplier_name}-{country}-{city}".encode()).hexdigest(), 16)
        return {
            "affected_customers_count": 18 + (seed % 45),
            "impacted_plants_count": 2 + (seed % 4),
            "otif_baseline_pct": 98.0,
            "otif_projected_pct": 72.0 + (seed % 14),
            "recovery_timeline_weeks": 3 + (seed % 5)
        }
