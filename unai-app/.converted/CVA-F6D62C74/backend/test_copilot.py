import sys
sys.stdout.reconfigure(encoding='utf-8')
from backend.agents.qa_copilot_agent import SupplyChainQACopilotAgent

copilot = SupplyChainQACopilotAgent()
queries = [
    "Why is Option 3 recommended over Option 2?",
    "What is our total revenue at risk?",
    "How is OTIF degradation calculated?",
    "What are the trade-offs of air freight expediting?",
    "Who are the alternate suppliers for Foxconn?",
    "Hello, how can you help me?"
]

for q in queries:
    res = copilot.answer_question(
        question=q, 
        current_supplier="Foxconn", 
        current_origin="Yantian Port", 
        current_dest="Port of Long Beach", 
        current_mode="Ocean Freight"
    )
    print(f"Q: {q}")
    print(f"Source: {res.get('source')} | Tokens: {res.get('tokensEstimated')}")
    print(f"Answer: {res.get('answer')}\n" + "-"*50)
