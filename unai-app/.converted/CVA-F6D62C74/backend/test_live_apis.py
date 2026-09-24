import sys
import httpx
from backend.config import GROQ_API_KEY, TAVILY_API_KEY, MARKETAUX_API_KEY

print("=== CHECKING KEYS ===")
print("GROQ_API_KEY:", GROQ_API_KEY[:8] + "..." if GROQ_API_KEY else None)
print("TAVILY_API_KEY:", TAVILY_API_KEY[:8] + "..." if TAVILY_API_KEY else None)
print("MARKETAUX_API_KEY:", MARKETAUX_API_KEY[:8] + "..." if MARKETAUX_API_KEY else None)

print("\n=== 1. TESTING TAVILY API ===")
try:
    r_tav = httpx.post(
        "https://api.tavily.com/search", 
        json={"api_key": TAVILY_API_KEY, "query": "Foxconn supply chain disruption", "max_results": 2}, 
        timeout=10.0
    )
    print("Tavily Status:", r_tav.status_code, "Results count:", len(r_tav.json().get("results", [])))
except Exception as e:
    print("Tavily error:", e)

print("\n=== 2. TESTING MARKETAUX API ===")
try:
    r_mkt = httpx.get(
        f"https://api.marketaux.com/v1/news/all?search=Foxconn&limit=2&api_token={MARKETAUX_API_KEY}", 
        timeout=10.0
    )
    print("Marketaux Status:", r_mkt.status_code, "Data count:", len(r_mkt.json().get("data", [])) if r_mkt.status_code==200 else r_mkt.text[:100])
except Exception as e:
    print("Marketaux error:", e)

print("\n=== 3. TESTING GROQ API ===")
try:
    r_groq = httpx.post(
        "https://api.groq.com/openai/v1/chat/completions", 
        headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
        json={
            "model": "groq/compound-mini", 
            "messages": [{"role": "user", "content": "Return a json object: {\"status\": \"ok\"}"}], 
            "response_format": {"type": "json_object"}
        },
        timeout=10.0
    )
    print("Groq Status:", r_groq.status_code, "Response:", r_groq.text[:100])
except Exception as e:
    print("Groq error:", e)

print("\n=== 4. TESTING PIPELINE WITH LIVE APIS ===")
from backend.agents.manager_agent import SupplyChainManagerAgent
mgr = SupplyChainManagerAgent()
res = mgr.run_pipeline(supplier="Foxconn", use_live_api=True)
print("Pipeline Disruption Source:", res["disruptionEvent"].get("source"))
print("Pipeline Financial Source:", res["financialImpact"].get("dataSource"))
print("Pipeline Recommendation Engine:", res["recommendation"].get("engine"))
print("Pipeline Execution Mode:", res.get("pipelineExecutionMode"))

print("\n=== 5. TESTING QA COPILOT AGENT ===")
from backend.agents.qa_copilot_agent import SupplyChainQACopilotAgent
copilot = SupplyChainQACopilotAgent()
answer = copilot.answer_question("How should we handle a port strike in Yantian for Foxconn?")
print("Copilot Answer (first 200 chars):", answer.get("answer")[:200])
print("Copilot Method:", answer.get("method"))
print("Copilot Latency:", answer.get("latencySeconds"))

