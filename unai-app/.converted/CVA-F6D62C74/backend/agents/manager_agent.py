import math
from backend.agents.sensing_agent import EventIntelligenceAgent
from backend.agents.exposure_agent import ExposureAgent
from backend.agents.capacity_agent import CapacityAgent
from backend.agents.inventory_agent import InventoryAgent
from backend.agents.customer_impact_agent import CustomerImpactAgent
from backend.agents.financial_agent import FinancialImpactAgent
from backend.agents.recommendation_agent import RecommendationAgent
from backend.config import GROQ_API_KEY, TAVILY_API_KEY, MARKETAUX_API_KEY


class SupplyChainManagerAgent:
    """
    Master Director & Orchestrator Agent: Supply Chain Manager (Team Manager)
    Coordinates the 5 specialized domain teams:
        1. Event Intelligence Agent (Monitoring / Sensing Team)
        2. Exposure Agent (Supply Network Analysis Team)
        3. Operations Team (Capacity & Inventory Agents)
        4. Commercial Lead Team (Customer Impact & Financial Agents)
        5. Response & Recommendation SME Team (Groq LLM Decision Intelligence)
    Outputs unified executive summary and multi-agent dashboard payload.
    """

    def __init__(self):
        self.sensing_agent = EventIntelligenceAgent()
        self.exposure_agent = ExposureAgent()
        self.capacity_agent = CapacityAgent()
        self.inventory_agent = InventoryAgent()
        self.customer_impact_agent = CustomerImpactAgent()
        self.financial_agent = FinancialImpactAgent()
        self.recommendation_agent = RecommendationAgent()

    def run_pipeline(
        self, 
        supplier: str = None, 
        country: str = None, 
        city: str = None, 
        origin: str = None,
        destination: str = None,
        transport_mode: str = None,
        query: str = None, 
        use_live_api: bool = True,
        force_no_event: bool = False
    ) -> dict:
        eff_live_api = use_live_api and bool(GROQ_API_KEY or TAVILY_API_KEY or MARKETAUX_API_KEY)

        # -------------------------------------------------------------
        # Step 1: Event Intelligence (Disruption Sensing Team)
        # -------------------------------------------------------------
        disruptions = self.sensing_agent.detect_disruptions(
            supplier=supplier,
            country=country,
            city=city,
            origin=origin,
            destination=destination,
            transport_mode=transport_mode,
            query=query,
            use_live_api=eff_live_api,
            force_no_event=force_no_event
        )

        primary_event = disruptions[0]

        eff_supplier = supplier or primary_event.get("supplier", "Monitored Vendor")
        eff_country = country or primary_event.get("country", "")
        eff_city = city or primary_event.get("city", "")

        if destination:
            eff_dest = destination
        elif eff_country:
            eff_dest = f"Customer Plants, {eff_country}"
        else:
            eff_dest = "Global Assembly Hub"

        # Intelligent Origin & Closest Supplier Inference when origin is omitted
        supp_clean = eff_supplier.strip()
        supp_key = supp_clean.lower()
        closest_supplier_name = None

        if origin:
            eff_origin = origin
            if "foxconn" in supp_key:
                closest_supplier_name = "Foxconn Secondary Regional Hub"
            elif "tsmc" in supp_key:
                closest_supplier_name = "TSMC Alternate Foundry Fab"
            elif "kia" in supp_key or "hyundai" in supp_key:
                closest_supplier_name = "Hyundai Mobis Component Network"
            elif "apple" in supp_key:
                closest_supplier_name = "Apple Secondary Vendor Partner"
            else:
                closest_supplier_name = f"{supp_clean} Secondary Regional Network"
        else:
            eff_origin, closest_supplier_name = self._infer_closest_origin_to_destination(
                eff_dest, 
                eff_supplier, 
                eff_country, 
                eff_city
            )

        eff_mode = transport_mode or primary_event.get("transportMode", "Ocean Freight")
        route_label = f"{eff_origin} ➔ {eff_dest} ({eff_mode})"

        primary_event["supplier"] = eff_supplier
        primary_event["location"] = route_label
        primary_event["routeDisplay"] = route_label
        if closest_supplier_name:
            primary_event["closestAlternateSupplier"] = closest_supplier_name

        # -------------------------------------------------------------
        # Step 2: Exposure Analysis (Supply Network & BOM Traversal)
        # -------------------------------------------------------------
        exposure_result = self.exposure_agent.analyze_exposure(primary_event)

        # -------------------------------------------------------------
        # Step 3: Operations Assessment (Capacity & Inventory Teams)
        # -------------------------------------------------------------
        capacity_result = self.capacity_agent.calculate_capacity_impact(exposure_result, primary_event)
        inventory_result = self.inventory_agent.assess_inventory_risk(exposure_result, capacity_result)

        # -------------------------------------------------------------
        # Step 4: Commercial & Financial Impact (Customer & Market Teams)
        # -------------------------------------------------------------
        customer_impact_result = self.customer_impact_agent.calculate_commercial_impact(
            disruption_event=primary_event,
            exposure_result=exposure_result,
            capacity_result=capacity_result,
            inventory_result=inventory_result
        )

        financial_summary = self.financial_agent.calculate_impact(
            supplier_name=eff_supplier,
            country=eff_country or "Global",
            city=eff_city or "Hub",
            origin=eff_origin,
            destination=eff_dest,
            transport_mode=eff_mode,
            severity=primary_event.get("severity", "High"),
            use_live_api=eff_live_api
        )

        # Align financial impact with customer impact numbers
        if customer_impact_result.get("revenue_at_risk_usd", 0) > 0:
            financial_summary["revenueRisk"] = customer_impact_result["revenue_at_risk_usd"]
            financial_summary["estimatedMarginLoss"] = customer_impact_result["estimated_margin_loss_usd"]
            financial_summary["otifImpact"] = f"-{customer_impact_result['otif_drop_pct']}% (To {customer_impact_result['projected_otif_pct']}%)"

        # -------------------------------------------------------------
        # Step 5: Response & Recommendation (Groq LLM Smart SME Engine)
        # -------------------------------------------------------------
        recommendations = self.recommendation_agent.generate_recommendations(
            risk_event=primary_event,
            financial_impact=financial_summary,
            exposure_result=exposure_result,
            capacity_result=capacity_result,
            inventory_result=inventory_result,
            customer_impact=customer_impact_result,
            use_live_api=eff_live_api
        )

        # -------------------------------------------------------------
        # Step 6: Network Topology Graph Generation (Affected vs Safe)
        # -------------------------------------------------------------
        topology_graph = self.exposure_agent.generate_network_topology(
            origin=eff_origin,
            destination=eff_dest,
            supplier=eff_supplier if supplier else "",
            risk_event=primary_event
        )

        # -------------------------------------------------------------
        # Step 7: Master Manager Executive Synthesis
        # -------------------------------------------------------------
        is_healthy = primary_event.get("severityScore", 0) == 0

        executive_summary = {
            "status": "Healthy Baseline Operations" if is_healthy else "Active Disruption Under Management",
            "activeEvent": primary_event.get("event_type", "Standard Operations"),
            "affectedSupplier": eff_supplier,
            "locationDisplay": route_label,
            "origin": eff_origin,
            "destination": eff_dest,
            "transportMode": eff_mode,
            "riskScorePct": 0.0 if is_healthy else financial_summary.get("riskScorePct", 0.0),
            "severity": "None" if is_healthy else primary_event.get("severity", "Moderate"),
            "severityScore": 0 if is_healthy else primary_event.get("severityScore", 0),
            "source": primary_event.get("source", "Autonomous Multi-Agent Orchestration")
        }

        # -------------------------------------------------------------
        # Step 1b: Live Supplier News & Raw Material Shortages Radar
        # -------------------------------------------------------------
        supplier_news = self.sensing_agent.get_supplier_news_and_shortages(
            supplier=eff_supplier,
            origin=eff_origin,
            destination=eff_dest,
            use_live_api=eff_live_api
        )

        # -------------------------------------------------------------
        # Step 6: Multi-Signal Conflict Arbitration & Time-Phased Impact
        # -------------------------------------------------------------
        from backend.data_loader import get_data_loader
        dl = get_data_loader()
        
        signal_id = primary_event.get("id") or "SIG-2026-0912"
        timephased_curves = dl.timephased_by_signal.get(signal_id, [])

        return {
            "executiveSummary": executive_summary,
            "eventIntelligence": disruptions,
            "supplierNews": supplier_news,
            "exposureAnalysis": exposure_result,
            "operationsImpact": {
                "capacity": capacity_result,
                "inventory": inventory_result
            },
            "commercialImpact": customer_impact_result,
            "financialImpact": financial_summary,
            "recommendation": recommendations,
            "topologyGraph": topology_graph,
            "crossSignalConflicts": dl.conflicts,
            "cumulativeImpact": dl.cumulative_impact,
            "timephasedImpact": timephased_curves,
            "orchestratedBy": "Supply Chain Master Manager Agent (Lead Director)"
        }

    def _infer_closest_origin_to_destination(self, destination: str, supplier: str, country: str, city: str):
        dest_lower = (destination or "").lower()
        supp_lower = (supplier or "").lower()

        # Check for specific destination hints
        if "india" in dest_lower or "chennai" in dest_lower:
            if "kia" in supp_lower or "hyundai" in supp_lower:
                return "Kia Anantapur / Chennai Logistics Hub", "Hyundai Mobis India Hub"
            if "foxconn" in supp_lower:
                return "Foxconn Sriperumbudur Facility, Tamil Nadu", "Pegatron India Electronics"
            if "tsmc" in supp_lower:
                return "TSMC Hsinchu / Singapore Feeder Fab", "Tata Electronics Semiconductor Assembly"
            return "Regional Sourcing Hub, Chennai", "Regional Component Network India"

        if "austin" in dest_lower or "texas" in dest_lower or "usa" in dest_lower or "long beach" in dest_lower:
            if "tsmc" in supp_lower:
                return "TSMC Fab 21, Phoenix, Arizona", "Intel Foundry Services North America"
            if "foxconn" in supp_lower:
                return "Foxconn Guadalajara Assembly Hub, Mexico", "Flex North America Solutions"
            if "kia" in supp_lower or "hyundai" in supp_lower:
                return "Kia Georgia Plant, West Point, USA", "Mobis North America Division"
            return "North American Logistics Hub, Dallas", "Secondary Regional Supplier US"

        if "europe" in dest_lower or "germany" in dest_lower or "rotterdam" in dest_lower:
            if "tsmc" in supp_lower:
                return "TSMC ESMC Fab, Dresden, Germany", "Infineon Technologies Munich"
            if "foxconn" in supp_lower:
                return "Foxconn Pardubice Complex, Czechia", "Sanmina European Manufacturing"
            return "European Logistics Terminal, Rotterdam", "Continental Automotive Network"

        # Default fallback
        if "foxconn" in supp_lower:
            return "Yantian Port, Shenzhen", "Foxconn Secondary Regional Hub"
        elif "tsmc" in supp_lower:
            return "Hsinchu Science Park, Taiwan", "TSMC Alternate Foundry Fab"
        elif "kia" in supp_lower or "hyundai" in supp_lower:
            return "Busan Port, South Korea", "Hyundai Mobis Component Network"
        else:
            return f"{supplier} Main Export Terminal", f"{supplier} Alternate Regional Partner"
