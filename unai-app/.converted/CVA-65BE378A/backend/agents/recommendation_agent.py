import httpx
import hashlib
from backend.config import GROQ_API_KEY, GEMINI_API_KEY
from backend.agents.unai_bridge import run_unai


class RecommendationAgent:
    """
    Agent 6 / Team 5: Response Lead & Recommendation SME Agent
    Acts as a Chief Procurement & Strategic Supply Chain Director.
    Generates 4 distinct mitigation trade-off options powered by Groq LLM (Llama-3) SME intelligence,
    calculates exact strategy costs, recovery timelines, revenue saved, and proportional remaining risk.
    """

    def _is_catastrophic_disaster(self, risk_event: dict, capacity_result: dict = None) -> bool:
        """
        Domain Rule: Alternate supplier reallocation is high-cost, high-friction, and 
        should ONLY be recommended for major catastrophic events (earthquake, flood, war, 
        typhoon, explosion, structural plant shutdown) where the supplier physically cannot supply.
        For standard transit delays, port congestion, or moderate shortages, logistics expedite
        or buffer stock is the recommended decision.
        """
        event_type = (risk_event.get("event_type") or "").lower()
        description = (risk_event.get("description") or "").lower()
        headline = (risk_event.get("headline") or "").lower()
        combined_text = f"{event_type} {description} {headline}"

        catastrophe_keywords = [
            "earthquake", "seismic", "quake", "flood", "floods", "flooding", "tsunami",
            "war", "conflict", "missile", "military", "sanctions", "typhoon", "hurricane",
            "explosion", "force majeure", "total shutdown", "structural shutdown", "plant destroyed"
        ]

        has_catastrophe_keyword = any(kw in combined_text for kw in catastrophe_keywords)

        cap_loss = 0.0
        if capacity_result:
            cap_loss = float(capacity_result.get("weighted_avg_capacity_loss_pct", 0.0))

        severity_score = float(risk_event.get("severityScore", 50))

        if has_catastrophe_keyword:
            return True
        if cap_loss >= 75.0 and severity_score >= 80:
            return True

        return False

    def generate_recommendations(
        self, 
        risk_event: dict, 
        financial_impact: dict = None, 
        exposure_result: dict = None,
        capacity_result: dict = None,
        inventory_result: dict = None,
        customer_impact: dict = None,
        use_live_api: bool = False
    ) -> dict:
        financial_impact = financial_impact or {}
        supplier = financial_impact.get("supplier") or risk_event.get("supplier", "Target Supplier")
        country = financial_impact.get("country", "")
        city = financial_impact.get("city", "")
        loc_display = financial_impact.get("locationDisplay") or risk_event.get("routeDisplay", "Global Network")
        severity = risk_event.get("severity", "High")

        is_healthy = severity.upper() in ["NONE", "HEALTHY", "LOW_RISK", "NORMAL"]

        if is_healthy:
            healthy_scenarios = [
                {
                    "id": 1,
                    "name": "Option 1: Maintain Standard Schedule (Optimal)",
                    "actionDetails": f"No mitigation required for {supplier} at {loc_display}. Continue standard demand forecasting and order fulfillment.",
                    "costUsd": 0,
                    "projectedOtif": "98.0%",
                    "revenueAtRiskUsd": 0.0,
                    "postMitigationRiskPct": 0.0,
                    "recoveryWeeks": 0,
                    "isRecommended": True
                },
                {
                    "id": 2,
                    "name": "Option 2: Preemptive Safety Stock Buffer",
                    "actionDetails": f"Build +5 days safety stock buffer at {loc_display} distribution center as proactive hedge.",
                    "costUsd": 45000,
                    "projectedOtif": "99.0%",
                    "revenueAtRiskUsd": 0.0,
                    "postMitigationRiskPct": 0.0,
                    "recoveryWeeks": 0,
                    "isRecommended": False
                },
                {
                    "id": 3,
                    "name": "Option 3: Automated Health & SLA Monitoring",
                    "actionDetails": "Enable real-time telemetry monitoring for tier-1 supplier shipment milestones.",
                    "costUsd": 0,
                    "projectedOtif": "98.0%",
                    "revenueAtRiskUsd": 0.0,
                    "postMitigationRiskPct": 0.0,
                    "recoveryWeeks": 0,
                    "isRecommended": False
                }
            ]

            return {
                "recommendedPlan": healthy_scenarios[0]["name"],
                "actionDetails": healthy_scenarios[0]["actionDetails"],
                "expectedBenefit": "100% Revenue Protected | 98% OTIF Maintained",
                "projectedOtif": "98.0%",
                "recoveryTimeline": "0 weeks",
                "tradeOffAnalysis": f"Supply chain operations for {supplier} at {loc_display} are healthy with zero active disruption events detected. No mitigation or reallocation costs ($0) are needed.",
                "allOptions": healthy_scenarios,
                "engine": "Rules-based Operational Health Engine"
            }

        is_catastrophe = self._is_catastrophic_disaster(risk_event, capacity_result)

        scenarios = self._generate_tailored_options(
            risk_event, financial_impact, exposure_result, capacity_result, inventory_result, customer_impact,
            supplier, country, city, loc_display, is_catastrophe
        )

        # Backend swapped to the UNAI shared cognitive engine (see
        # backend/agents/unai_bridge.py + agents/unai/bridge.cjs).
        # urgency_logistics_plan is this domain's real, already-existing
        # UNAI capability (pick + justify a mitigation/logistics response
        # under disruption), systems ["ANALYTICS","SAP_S4"] lifted verbatim
        # from engine.js's own pre-built use case -- not guessed. The
        # original Gemini/Groq path (_consult_groq_llm, below) is left in
        # place, untouched and unused, as a fallback if UNAI itself errors.
        try:
            ai_advice = self._consult_unai(
                risk_event, financial_impact, exposure_result, capacity_result, inventory_result, customer_impact,
                scenarios, supplier, country, city, is_catastrophe
            )
            if ai_advice:
                return ai_advice
        except Exception as e:
            print(f"[RecommendationAgent] UNAI note: {e}")

        have_llm_key = bool(GEMINI_API_KEY or GROQ_API_KEY)
        if (use_live_api or have_llm_key) and have_llm_key:
            try:
                ai_advice = self._consult_groq_llm(
                    risk_event, financial_impact, exposure_result, capacity_result, inventory_result, customer_impact,
                    scenarios, supplier, country, city, is_catastrophe
                )
                if ai_advice:
                    return ai_advice
            except Exception as e:
                print(f"[RecommendationAgent] Groq SME AI note: {e}")

        best_scenario = scenarios[1] if not is_catastrophe else scenarios[2]
        for opt in scenarios:
            if opt.get("isRecommended"):
                best_scenario = opt
                break

        rev_at_risk = financial_impact.get("revenueRisk", 25000000)
        rev_protected = round(max(0, rev_at_risk - best_scenario["revenueAtRiskUsd"]) / 1e6, 2)
        rec_weeks = best_scenario["recoveryWeeks"]
        mitigation_cost = best_scenario["costUsd"]

        if is_catastrophe:
            rationale_prefix = f"Major Catastrophic Force Majeure ({risk_event.get('event_type', 'Disaster')}) detected: Primary supplier {supplier} cannot produce or supply."
        else:
            rationale_prefix = f"Operational Disruption ({risk_event.get('event_type', 'Logistics Delay')}) detected: Primary supplier {supplier} remains functional."

        tradeoff_summary = (
            f"{rationale_prefix} "
            f"Executing {best_scenario['name']} cuts expected recovery timeline down to {rec_weeks} weeks. "
            f"An optimal capital allocation of ${mitigation_cost:,.0f} protects ${rev_protected:,.2f}M in customer revenue, maintains Tier-1 delivery SLA, and restores projected OTIF to {best_scenario['projectedOtif']}."
        )

        return {
            "recommendedPlan": best_scenario["name"],
            "actionDetails": best_scenario["actionDetails"],
            "expectedBenefit": f"Protects ${rev_protected:,.2f}M Revenue | Recovers OTIF to {best_scenario['projectedOtif']}",
            "projectedOtif": best_scenario["projectedOtif"],
            "recoveryTimeline": f"{rec_weeks} weeks",
            "tradeOffAnalysis": tradeoff_summary,
            "allOptions": scenarios,
            "engine": "Dynamic Parametric SME Engine"
        }

    def _generate_tailored_options(
        self, 
        risk_event: dict, 
        financial_impact: dict,
        exposure_result: dict,
        capacity_result: dict,
        inventory_result: dict,
        customer_impact: dict,
        supplier: str, 
        country: str, 
        city: str, 
        loc_display: str,
        is_catastrophe: bool = False
    ) -> list:
        supp_lower = supplier.lower()
        base_rev = financial_impact.get("revenueRisk", 35000000.0) if financial_impact else 35000000.0
        base_risk_pct = financial_impact.get("riskScorePct", 75.0) if financial_impact else 75.0

        alt_supp = financial_impact.get("closestAlternateSupplier", {}) if financial_impact else {}
        alt_name = alt_supp.get("name", "Regional Backup Partner")
        alt_loc = alt_supp.get("location", "Alternate Hub")

        if "foxconn" in supp_lower:
            opt2_cost, opt2_weeks, opt2_otif = 4500000, 2, "92.0%"
            opt3_cost, opt3_weeks, opt3_otif = 7800000, 1, "97.0%"
            opt3_details = f"Activate pre-qualified secondary SMT assembly lines at {alt_name} ({alt_loc}). Expedite component buffers to maintain high-volume device output."
        elif "tsmc" in supp_lower:
            opt2_cost, opt2_weeks, opt2_otif = 12000000, 2, "90.0%"
            opt3_cost, opt3_weeks, opt3_otif = 8000000, 1, "96.0%"
            opt3_details = f"Transfer wafer fab allotment to {alt_name} ({alt_loc}). Utilize regional advanced packaging capacity to avert AI server and automotive SoC delays."
        elif "kia" in supp_lower or "hyundai" in supp_lower:
            opt2_cost, opt2_weeks, opt2_otif = 3200000, 2, "91.0%"
            opt3_cost, opt3_weeks, opt3_otif = 5500000, 1, "98.0%"
            opt3_details = f"Reroute chassis and powertrain components directly to {alt_name} ({alt_loc}). Engage localized tier-2 stamping and assembly units."
        else:
            opt2_cost, opt2_weeks, opt2_otif = int(base_rev * 0.12), 2, "91.0%"
            opt3_cost, opt3_weeks, opt3_otif = int(base_rev * 0.16), 1, "96.0%"
            opt3_details = f"Engage pre-audited manufacturing facilities at {alt_name} ({alt_loc}) with accelerated QA protocols."

        # Proportional dynamic remaining risk calculations
        opt1_risk_pct = round(base_risk_pct, 1)
        opt1_rem_risk = round(base_rev, 2)

        opt2_risk_pct = round(base_risk_pct * 0.35, 1)
        opt2_rem_risk = round(base_rev * (opt2_risk_pct / (base_risk_pct or 1.0)), 2)

        opt3_risk_pct = round(max(8.0, base_risk_pct * 0.15), 1)
        opt3_rem_risk = round(base_rev * (opt3_risk_pct / (base_risk_pct or 1.0)), 2)

        opt4_risk_pct = round(base_risk_pct * 0.40, 1)
        opt4_rem_risk = round(base_rev * (opt4_risk_pct / (base_risk_pct or 1.0)), 2)

        if is_catastrophe:
            opt2_name = f"Option 2: Air Freight Expedite from {city or supplier}"
            opt2_rec = False
            opt3_name = f"Option 3: Shift Production to {alt_name} ({alt_loc}) 🏆"
            opt3_rec = True
        else:
            opt2_name = f"Option 2: Logistics Mode Expedite & Priority Air Freight 🏆"
            opt2_rec = True
            opt3_name = f"Option 3: Emergency Supplier Shift to {alt_name} (Catastrophe Fallback)"
            opt3_details = f"Keep {alt_name} ({alt_loc}) on standby. Not recommended for standard operational disruptions due to high re-tooling and qualification friction."
            opt3_rec = False

        return [
            {
                "id": 1,
                "name": "Option 1: Baseline Unmitigated (Status Quo)",
                "actionDetails": f"Maintain existing ocean freight pipeline from {loc_display}. Incur standard congestion delays and stockouts.",
                "costUsd": 0,
                "projectedOtif": "74.0%",
                "revenueAtRiskUsd": opt1_rem_risk,
                "postMitigationRiskPct": opt1_risk_pct,
                "recoveryWeeks": 6,
                "isRecommended": False
            },
            {
                "id": 2,
                "name": opt2_name,
                "actionDetails": f"Switch priority shipments from ocean to chartered air cargo directly into destination hub.",
                "costUsd": opt2_cost,
                "projectedOtif": opt2_otif,
                "revenueAtRiskUsd": opt2_rem_risk,
                "postMitigationRiskPct": opt2_risk_pct,
                "recoveryWeeks": opt2_weeks,
                "isRecommended": opt2_rec
            },
            {
                "id": 3,
                "name": opt3_name,
                "actionDetails": opt3_details,
                "costUsd": opt3_cost,
                "projectedOtif": opt3_otif,
                "revenueAtRiskUsd": opt3_rem_risk,
                "postMitigationRiskPct": opt3_risk_pct,
                "recoveryWeeks": opt3_weeks,
                "isRecommended": opt3_rec
            },
            {
                "id": 4,
                "name": "Option 4: Secondary Volume Split & Buffer Allocation",
                "actionDetails": f"Split production volume (60/40) between primary plant and local warehouse safety buffers.",
                "costUsd": int(opt2_cost * 0.45),
                "projectedOtif": "88.0%",
                "revenueAtRiskUsd": opt4_rem_risk,
                "postMitigationRiskPct": opt4_risk_pct,
                "recoveryWeeks": 3,
                "isRecommended": False
            }
        ]

    def _consult_unai(
        self,
        risk_event: dict,
        financial_impact: dict,
        exposure_result: dict,
        capacity_result: dict,
        inventory_result: dict,
        customer_impact: dict,
        scenarios: list,
        supplier: str,
        country: str,
        city: str,
        is_catastrophe: bool = False
    ) -> dict:
        """Real UNAI capability run, real per-run token comparison vs. what
        this agent's bespoke Gemini/Groq call (_consult_groq_llm, below)
        would have cost. Same real prompt text that call would have sent --
        tokenized for real, never sent to any LLM here."""
        expo_txt = f"{exposure_result.get('suppliers_impacted_count', 1)} suppliers, {exposure_result.get('parts_affected_count', 1)} BOM parts, {exposure_result.get('plants_exposed_count', 1)} plants" if exposure_result else "1 supplier"
        cap_txt = f"Capacity loss: {capacity_result.get('weighted_avg_capacity_loss_pct', 30)}%, Max recovery: {capacity_result.get('max_recovery_days', 14)} days" if capacity_result else "Moderate downtime"
        inv_txt = f"Days of Supply: {inventory_result.get('earliest_stockout_days', 10)} days, Safety breaches: {inventory_result.get('safety_stock_breaches', 1)}" if inventory_result else "Stockout risk"
        cust_txt = f"Revenue at Risk: ${customer_impact.get('revenue_at_risk_usd', 25000000):,.0f}, OTIF Drop: {customer_impact.get('otif_drop_pct', 15)}%, Penalties: ${customer_impact.get('total_sla_penalties_usd', 1000000):,.0f}" if customer_impact else "Revenue at risk"

        system_prompt = (
            "You are a World-Class Supply Chain Executive, Senior Procurement Director, and Decision Intelligence SME. "
            "Your objective is to evaluate multi-agent disruption telemetry and recommend the optimal mitigation strategy with precise financial and operational trade-offs.\n\n"
            "CRITICAL DOMAIN RULES:\n"
            "1. Do NOT recommend shifting to an alternate supplier (Option 3) unless there is a major catastrophic force majeure event (such as an earthquake, severe flood/tsunami, war/geopolitical conflict, explosion, or complete structural plant destruction where the primary supplier physically cannot produce).\n"
            "2. For standard transit delays, port congestion, weather delays, or moderate component shortages where the primary supplier is functional, ALWAYS recommend logistics expedite (Option 2) or local buffer allocation (Option 4) instead of switching suppliers.\n"
            "3. You must return a valid JSON object matching the requested schema."
        )
        user_content = f"""
Disruption Event: {risk_event.get('event_type', 'Logistics Delay')} (Severity: {risk_event.get('severity', 'High')}, Score: {risk_event.get('severityScore', 70)})
Supplier: {supplier} | Location Corridor: {risk_event.get('routeDisplay', 'Corridor')}
Is Major Catastrophe (Earthquake/Flood/War/Plant destroyed): {is_catastrophe}
Multi-Agent Telemetry:
- Exposure: {expo_txt}
- Plant Capacity: {cap_txt}
- Inventory & Stockout: {inv_txt}
- Commercial Impact: {cust_txt}

Proposed Scenarios:
1. {scenarios[0]['name']} - Cost: ${scenarios[0]['costUsd']:,}, OTIF: {scenarios[0]['projectedOtif']}, Rec: {scenarios[0]['recoveryWeeks']} wks
2. {scenarios[1]['name']} - Cost: ${scenarios[1]['costUsd']:,}, OTIF: {scenarios[1]['projectedOtif']}, Rec: {scenarios[1]['recoveryWeeks']} wks
3. {scenarios[2]['name']} - Cost: ${scenarios[2]['costUsd']:,}, OTIF: {scenarios[2]['projectedOtif']}, Rec: {scenarios[2]['recoveryWeeks']} wks
4. {scenarios[3]['name']} - Cost: ${scenarios[3]['costUsd']:,}, OTIF: {scenarios[3]['projectedOtif']}, Rec: {scenarios[3]['recoveryWeeks']} wks
"""
        rec_id = 3 if is_catastrophe else 2
        chosen_opt = scenarios[rec_id - 1] if 1 <= rec_id <= len(scenarios) else scenarios[1]
        for opt in scenarios:
            opt["isRecommended"] = (opt["id"] == rec_id)

        fallback_analysis = (
            f"{'Major catastrophic force majeure' if is_catastrophe else 'Operational disruption'} detected for {supplier}. "
            f"{chosen_opt['name']} yields the optimal net benefit at ${chosen_opt['costUsd']:,} cost, "
            f"{chosen_opt['recoveryWeeks']} week recovery, and {chosen_opt['projectedOtif']} projected OTIF."
        )

        ev, tc = run_unai(
            capability="urgency_logistics_plan", systems=["ANALYTICS", "SAP_S4"], agent_id="recommendation_agent",
            system_instruction=system_prompt, prompt=user_content, completion_text=fallback_analysis,
        )
        trade_off = f"{ev.get('explanation') or fallback_analysis} (this run — {supplier}, {risk_event.get('event_type', 'disruption')}.)"

        return {
            "recommendedPlan": chosen_opt["name"],
            "actionDetails": chosen_opt["actionDetails"],
            "expectedBenefit": f"{chosen_opt['projectedOtif']} OTIF | Maximized Net Protection",
            "projectedOtif": chosen_opt["projectedOtif"],
            "recoveryTimeline": f"{chosen_opt['recoveryWeeks']} weeks",
            "tradeOffAnalysis": trade_off,
            "allOptions": scenarios,
            "engine": "UNAI Shared Cognitive Engine",
            "unaiTokenComparison": tc,
            # Full per-decision explainability (root cause, primary driver,
            # step-by-step reasoning, contributing factors, recommended
            # action) -- computed deterministically from the real evidence
            # object (engine.js's Layers.explain), 0 extra tokens. Read by
            # the corner badge's "🔎 Decision explainability" section
            # (public/unai-token-badge.js's explainHtml()).
            "unaiExplain": ev.get("detailed"),
        }

    def _consult_groq_llm(
        self, 
        risk_event: dict, 
        financial_impact: dict, 
        exposure_result: dict,
        capacity_result: dict,
        inventory_result: dict,
        customer_impact: dict,
        scenarios: list, 
        supplier: str, 
        country: str, 
        city: str,
        is_catastrophe: bool = False
    ) -> dict:
        # Gemini preferred over Groq when both are configured -- same
        # OpenAI-compatible request/response shape, only base URL/key/model differ.
        if GEMINI_API_KEY:
            url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
            api_key = GEMINI_API_KEY
            model = "gemini-3.6-flash"
        else:
            url = "https://api.groq.com/openai/v1/chat/completions"
            api_key = GROQ_API_KEY
            model = "llama-3.3-70b-versatile"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        expo_txt = f"{exposure_result.get('suppliers_impacted_count', 1)} suppliers, {exposure_result.get('parts_affected_count', 1)} BOM parts, {exposure_result.get('plants_exposed_count', 1)} plants" if exposure_result else "1 supplier"
        cap_txt = f"Capacity loss: {capacity_result.get('weighted_avg_capacity_loss_pct', 30)}%, Max recovery: {capacity_result.get('max_recovery_days', 14)} days" if capacity_result else "Moderate downtime"
        inv_txt = f"Days of Supply: {inventory_result.get('earliest_stockout_days', 10)} days, Safety breaches: {inventory_result.get('safety_stock_breaches', 1)}" if inventory_result else "Stockout risk"
        cust_txt = f"Revenue at Risk: ${customer_impact.get('revenue_at_risk_usd', 25000000):,.0f}, OTIF Drop: {customer_impact.get('otif_drop_pct', 15)}%, Penalties: ${customer_impact.get('total_sla_penalties_usd', 1000000):,.0f}" if customer_impact else "Revenue at risk"

        system_prompt = (
            "You are a World-Class Supply Chain Executive, Senior Procurement Director, and Decision Intelligence SME. "
            "Your objective is to evaluate multi-agent disruption telemetry and recommend the optimal mitigation strategy with precise financial and operational trade-offs.\n\n"
            "CRITICAL DOMAIN RULES:\n"
            "1. Do NOT recommend shifting to an alternate supplier (Option 3) unless there is a major catastrophic force majeure event (such as an earthquake, severe flood/tsunami, war/geopolitical conflict, explosion, or complete structural plant destruction where the primary supplier physically cannot produce).\n"
            "2. For standard transit delays, port congestion, weather delays, or moderate component shortages where the primary supplier is functional, ALWAYS recommend logistics expedite (Option 2) or local buffer allocation (Option 4) instead of switching suppliers.\n"
            "3. You must return a valid JSON object matching the requested schema."
        )

        user_content = f"""
Disruption Event: {risk_event.get('event_type', 'Logistics Delay')} (Severity: {risk_event.get('severity', 'High')}, Score: {risk_event.get('severityScore', 70)})
Supplier: {supplier} | Location Corridor: {risk_event.get('routeDisplay', 'Corridor')}
Is Major Catastrophe (Earthquake/Flood/War/Plant destroyed): {is_catastrophe}
Multi-Agent Telemetry:
- Exposure: {expo_txt}
- Plant Capacity: {cap_txt}
- Inventory & Stockout: {inv_txt}
- Commercial Impact: {cust_txt}

Proposed Scenarios:
1. {scenarios[0]['name']} - Cost: ${scenarios[0]['costUsd']:,}, OTIF: {scenarios[0]['projectedOtif']}, Rec: {scenarios[0]['recoveryWeeks']} wks
2. {scenarios[1]['name']} - Cost: ${scenarios[1]['costUsd']:,}, OTIF: {scenarios[1]['projectedOtif']}, Rec: {scenarios[1]['recoveryWeeks']} wks
3. {scenarios[2]['name']} - Cost: ${scenarios[2]['costUsd']:,}, OTIF: {scenarios[2]['projectedOtif']}, Rec: {scenarios[2]['recoveryWeeks']} wks
4. {scenarios[3]['name']} - Cost: ${scenarios[3]['costUsd']:,}, OTIF: {scenarios[3]['projectedOtif']}, Rec: {scenarios[3]['recoveryWeeks']} wks

Provide your strategic recommendation as a JSON object:
{{
    "recommendedOptionId": {2 if not is_catastrophe else 3},
    "recommendedPlan": "Exact title of recommended option",
    "actionDetails": "Actionable instructions for procurement and plant logistics",
    "expectedBenefit": "Short punchy summary (e.g. '$58.35M Protected | 96% OTIF Reached')",
    "projectedOtif": "92.0%",
    "recoveryTimeline": "2 weeks",
    "tradeOffAnalysis": "2-3 sentences explaining why the selected option yields optimal net benefit."
}}
"""

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"}
        }

        resp = httpx.post(url, headers=headers, json=payload, timeout=15.0)
        if resp.status_code == 200:
            import json
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)

            rec_id = parsed.get("recommendedOptionId", (2 if not is_catastrophe else 3))
            # Enforce domain rule: don't allow option 3 if not catastrophic
            if not is_catastrophe and rec_id == 3:
                rec_id = 2

            chosen_opt = scenarios[rec_id - 1] if 1 <= rec_id <= len(scenarios) else (scenarios[1] if not is_catastrophe else scenarios[2])
            for opt in scenarios:
                opt["isRecommended"] = (opt["id"] == rec_id)

            plan_title = chosen_opt["name"] if (not is_catastrophe and "Alternate" in parsed.get("recommendedPlan", "")) else parsed.get("recommendedPlan", chosen_opt["name"])
            action_text = chosen_opt["actionDetails"] if (not is_catastrophe and "Alternate" in parsed.get("recommendedPlan", "")) else parsed.get("actionDetails", chosen_opt["actionDetails"])

            return {
                "recommendedPlan": plan_title,
                "actionDetails": action_text,
                "expectedBenefit": parsed.get("expectedBenefit", f"{chosen_opt['projectedOtif']} OTIF | Maximized Net Protection"),
                "projectedOtif": parsed.get("projectedOtif", chosen_opt["projectedOtif"]),
                "recoveryTimeline": parsed.get("recoveryTimeline", f"{chosen_opt['recoveryWeeks']} weeks"),
                "tradeOffAnalysis": parsed.get("tradeOffAnalysis", ""),
                "allOptions": scenarios,
                "engine": f"Gemini LLM Decision Intelligence ({model})" if GEMINI_API_KEY else f"Groq LLM Decision Intelligence ({model})"
            }
        return None
