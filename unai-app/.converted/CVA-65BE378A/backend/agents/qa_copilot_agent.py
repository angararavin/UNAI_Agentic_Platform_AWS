import httpx
import re
from typing import Dict, Any, Optional
from backend.config import GROQ_API_KEY
from backend.agents.manager_agent import SupplyChainManagerAgent


class SupplyChainQACopilotAgent:
    """
    Agent 7 / Interactive Q&A Copilot Agent
    Uses smart, token-efficient LLM orchestration and localized tool routing to answer
    complex supply chain inquiries with minimal token consumption:
      - Tier 1: 0-Token Fast-path domain definitions & formulas
      - Tier 2: 0-Token Multi-Agent Telemetry Synthesis (BOM, Capacity, DOS, Orders)
      - Tier 3: Compact Groq LLM SME Inference (~150-250 tokens)
    """

    def __init__(self, manager_agent: Optional[SupplyChainManagerAgent] = None):
        self.manager_agent = manager_agent or SupplyChainManagerAgent()
        self._cache: Dict[str, str] = {}

    def answer_question(
        self, 
        question: str, 
        current_supplier: str = "Foxconn",
        current_origin: str = "Yantian Port",
        current_dest: str = "Port of Long Beach",
        current_mode: str = "Ocean Freight"
    ) -> Dict[str, Any]:
        q_clean = question.strip()
        q_lower = q_clean.lower()
        cache_key = f"{q_lower}|{current_supplier}|{current_origin}|{current_dest}"

        if cache_key in self._cache:
            return {
                "answer": self._cache[cache_key],
                "source": "Memory Cache (0 tokens)",
                "tokensEstimated": 0,
                "toolUsed": "Cache"
            }

        # -------------------------------------------------------------
        # Tool 1: Fast-Path Zero-Token Domain Engine
        # -------------------------------------------------------------
        fast_answer = self._match_domain_fastpath(q_lower, current_supplier)
        if fast_answer:
            self._cache[cache_key] = fast_answer
            return {
                "answer": fast_answer,
                "source": "Smart SME Domain Knowledge (0 tokens)",
                "tokensEstimated": 0,
                "toolUsed": "Domain Heuristics"
            }

        # -------------------------------------------------------------
        # Tool 2: Focused Multi-Agent Telemetry Summarizer
        # -------------------------------------------------------------
        tool_data = self._tool_fetch_compressed_telemetry(
            current_supplier, current_origin, current_dest, current_mode
        )

        # -------------------------------------------------------------
        # Tool 3: Token-Efficient Groq LLM SME Inference
        # -------------------------------------------------------------
        if GROQ_API_KEY:
            try:
                llm_res = self._consult_groq_compact(q_clean, tool_data, current_supplier)
                if llm_res:
                    self._cache[cache_key] = llm_res["answer"]
                    return llm_res
            except Exception as e:
                print(f"[QACopilotAgent] LLM fallback note: {e}")

        # -------------------------------------------------------------
        # Tool 4: Smart Local SME Heuristic Synthesis (Fallback)
        # -------------------------------------------------------------
        local_sme_answer = self._generate_local_sme_synthesis(q_lower, tool_data, current_supplier)
        self._cache[cache_key] = local_sme_answer
        return {
            "answer": local_sme_answer,
            "source": "Smart SME Logic (0 tokens)",
            "tokensEstimated": 0,
            "toolUsed": "SME Decision Engine"
        }

    def _match_domain_fastpath(self, query: str, supplier: str) -> Optional[str]:
        """Matches common terminology, formulas, and baseline questions with zero tokens."""
        if any(w in query for w in ["what is otif", "define otif", "how is otif calculated"]):
            return (
                "**OTIF (On-Time In-Full)** measures the percentage of orders delivered by the agreed deadline with complete order quantities. "
                "Formula: `OTIF = (On-Time Deliveries & In-Full Orders) / Total Orders * 100%`. "
                "In our Copilot, route disruptions degrade OTIF proportionally based on estimated port dwell time, plant capacity loss, and component stockout gaps."
            )
        if any(w in query for w in ["revenue at risk", "how is revenue calculated", "what is revenue risk"]):
            return (
                "**Revenue at Risk ($)** represents total monetary value of active customer sales orders tied to disrupted components and plant downtime. "
                "Formula: `Revenue at Risk = ∑ (Order Quantity × Unit Price)` for all delayed orders. "
                "Our Commercial Agent links stockout horizons directly to delivery deadlines in `customer_orders.csv`."
            )
        if any(w in query for w in ["days of supply", "what is dos", "how is dos calculated"]):
            return (
                "**Days of Supply (DOS)** measures how many days current warehouse stock will last under average daily consumption. "
                "Formula: `DOS = On-Hand Quantity / Average Daily Consumption`. "
                "When `DOS < Plant Recovery Days`, a critical stockout is forecasted."
            )
        if any(w in query for w in ["exposure agent", "bom traversal", "tier 1", "tier 2"]):
            return (
                "**Exposure Agent** traces multi-tier supplier dependencies. When a Tier 2 supplier is disrupted, it cascades up to all dependent Tier 1 assemblers, "
                "traverses the Bill of Materials (`bom.csv`), and maps exposed manufacturing facilities in `plant_parts.csv`."
            )
        return None

    def _tool_fetch_compressed_telemetry(self, supplier: str, origin: str, dest: str, mode: str) -> Dict[str, Any]:
        """Runs multi-agent pipeline and compresses into compact summary payload (<60 words)."""
        try:
            res = self.manager_agent.run_pipeline(
                supplier=supplier,
                origin=origin,
                destination=dest,
                transport_mode=mode,
                use_live_api=False
            )
            exec_sum = res.get("executiveSummary", {})
            fin = res.get("financialImpact", {})
            rec = res.get("recommendation", {})
            expo = res.get("exposureAnalysis", {})
            cap = res.get("operationsImpact", {}).get("capacity", {})
            inv = res.get("operationsImpact", {}).get("inventory", {})
            comm = res.get("commercialImpact", {})

            return {
                "supplier": exec_sum.get("affectedSupplier", supplier),
                "event": exec_sum.get("activeEvent", "Logistics Delay"),
                "riskScore": exec_sum.get("riskScorePct", 65),
                "revRisk": f"${fin.get('revenueRisk', 25000000)/1e6:.1f}M",
                "marginLoss": f"${fin.get('estimatedMarginLoss', 4500000)/1e6:.1f}M",
                "otif": comm.get("projected_otif_pct", 75.0),
                "plantLoss": f"{cap.get('weighted_avg_capacity_loss_pct', 25.0)}%",
                "dos": inv.get("earliest_stockout_days", 10),
                "slaPenalties": f"${comm.get('total_sla_penalties_usd', 850000)/1e6:.2f}M",
                "recommendedPlan": rec.get("recommendedPlan", "Option 3"),
                "recOtif": rec.get("projectedOtif", "96.0%"),
                "recWeeks": rec.get("recoveryTimeline", "1 week")
            }
        except Exception:
            return {
                "supplier": supplier,
                "event": "Corridor Volatility",
                "riskScore": 60.0,
                "revRisk": "$25.0M",
                "recommendedPlan": "Option 3: Shift Production to Alternate Supplier",
                "recOtif": "96.0%",
                "recWeeks": "1 week"
            }

    def _consult_groq_compact(self, query: str, data: Dict[str, Any], supplier: str) -> Optional[Dict[str, Any]]:
        """Invokes Groq LLM with a highly compressed context to keep token consumption minimal (~180 tokens)."""
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

        system_msg = (
            "You are the UNAI Supply Chain Copilot SME. Answer the user's question concisely in 2-4 sentences. "
            "Use the provided telemetry context accurately. Do not invent external numbers."
        )

        user_msg = (
            f"Context: Supplier={data.get('supplier')}, Event={data.get('event')}, Risk={data.get('riskScore')}%, "
            f"RevenueAtRisk={data.get('revRisk')}, PlantLoss={data.get('plantLoss')}, DOS={data.get('dos')} days, "
            f"ProjectedOTIF={data.get('otif')}%, SLAPenalties={data.get('slaPenalties')}, "
            f"Recommendation='{data.get('recommendedPlan')}' (Target OTIF: {data.get('recOtif')}, Timeline: {data.get('recWeeks')}).\n"
            f"Question: {query}"
        )

        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg}
            ],
            "temperature": 0.2,
            "max_tokens": 200
        }

        resp = httpx.post(url, headers=headers, json=payload, timeout=10.0)
        if resp.status_code == 200:
            res_data = resp.json()
            ans_text = res_data["choices"][0]["message"]["content"].strip()
            tokens_used = res_data.get("usage", {}).get("total_tokens", 180)
            return {
                "answer": ans_text,
                "source": "Groq LLM SME Intelligence",
                "tokensEstimated": tokens_used,
                "toolUsed": "Groq Llama-3 (SME Reasoner)"
            }
        return None

    def _generate_local_sme_synthesis(self, query: str, data: Dict[str, Any], supplier: str) -> str:
        """Local rule-based SME reasoning fallback when offline."""
        if any(w in query for w in ["why option 3", "recommend", "best option"]):
            return (
                f"**Option 3** is recommended for **{data.get('supplier')}** because it achieves the highest net revenue protection ({data.get('revRisk')}) "
                f"and restores projected OTIF to **{data.get('recOtif')}** within **{data.get('recWeeks')}**. "
                f"Unlike air freight expediting, secondary supplier reallocation avoids sustained high-cost charter surcharges."
            )
        if any(w in query for w in ["revenue", "money", "financial", "dollar", "loss"]):
            return (
                f"Current total Revenue at Risk for **{data.get('supplier')}** is **{data.get('revRisk')}**, with projected margin loss of **{data.get('marginLoss', '$4.5M')}** "
                f"and contractual SLA penalties of **{data.get('slaPenalties', '$0.85M')}** if unmitigated."
            )
        if any(w in query for w in ["capacity", "plant", "manufacturing", "downtime"]):
            return (
                f"Manufacturing capacity loss is currently estimated at **{data.get('plantLoss', '25%')}**, with Days of Supply standing at **{data.get('dos', 10)} days**. "
                f"Executing alternate tooling or sourcing prevents a full line shutdown."
            )
        return (
            f"The **{data.get('supplier')}** supply chain is managing an active **{data.get('event')}** with an overall risk score of **{data.get('riskScore')}%**. "
            f"Total exposure is **{data.get('revRisk')}**, and the recommended response is **{data.get('recommendedPlan')}** to restore delivery performance."
        )
