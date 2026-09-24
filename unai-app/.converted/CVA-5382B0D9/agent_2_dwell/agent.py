import re


from typing import TypedDict

from langgraph.graph import StateGraph, END
from langchain_ollama import ChatOllama

from data_2 import TEST_CASES
from config import AGENT_THRESHOLDS

# =====================================================
# MODEL
# =====================================================

llm = ChatOllama(
    model="gpt-oss:120b-cloud",
    temperature=0.2
)


# =====================================================
# STATE
# =====================================================

class AgentState(TypedDict):

    tray_id: str
    current_stage: str
    hours_in_stage: int
    micro_slo: int
    location: str
    event_history: str

    dwell_analysis: str
    sla_prediction: str
    root_cause: str

    approved: bool
    confidence_score: int

    approval_required: bool
    human_approval: bool | None

    prompt_tokens: int
    completion_tokens: int
    total_tokens: int

    escalation_package: str
    package: str

# =====================================================
# TOKEN EXTRACTION
# =====================================================

def extract_llm_tokens(response):

    metadata = response.response_metadata or {}

    prompt_tokens = metadata.get("prompt_eval_count", 0)
    completion_tokens = metadata.get("eval_count", 0)

    return prompt_tokens, completion_tokens


# =====================================================
# NODE 1
# DWELL ANALYSIS
# =====================================================

def analyze_dwell(state: AgentState):

    prompt = f"""
You are a Google RMA Control Tower analyst.

Analyze the dwell situation.

Tray ID:
{state['tray_id']}

Current Stage:
{state['current_stage']}

Hours In Stage:
{state['hours_in_stage']}

Micro SLO:
{state['micro_slo']}

Location:
{state['location']}

Event History:
{state['event_history']}

Provide:

1. Current Dwell Status
2. SLA Compliance Assessment
3. Risk Level
4. Summary
"""

    response = llm.invoke(prompt)

    prompt_tokens, completion_tokens = extract_llm_tokens(response)

    return {
        "dwell_analysis": response.content,
        "prompt_tokens": state.get("prompt_tokens", 0) + prompt_tokens,
        "completion_tokens": state.get("completion_tokens", 0) + completion_tokens,
        "total_tokens": state.get("total_tokens", 0) + prompt_tokens + completion_tokens
    }

# =====================================================
# NODE 2
# SLA BREACH PREDICTION
# =====================================================

def predict_sla_breach(state: AgentState):

    prompt = f"""
You are an operations planning expert.

Review:

{state['dwell_analysis']}

Provide:

1. Probability of SLA breach
2. Estimated delay (hours)
3. Escalation required? (Yes/No)
4. Explanation
"""

    response = llm.invoke(prompt)

    prompt_tokens, completion_tokens = extract_llm_tokens(response)

    return {
        "sla_prediction": response.content,
        "prompt_tokens": state.get("prompt_tokens", 0) + prompt_tokens,
        "completion_tokens": state.get("completion_tokens", 0) + completion_tokens,
        "total_tokens": state.get("total_tokens", 0) + prompt_tokens + completion_tokens
    }

# =====================================================
# NODE 3
# ROOT CAUSE CLASSIFICATION
# =====================================================

def classify_root_cause(state: AgentState):

    prompt = f"""
You are a logistics root cause analyst.

Current Stage:
{state['current_stage']}

Event History:
{state['event_history']}

Dwell Analysis:
{state['dwell_analysis']}

SLA Prediction:
{state['sla_prediction']}

Classify:

1. Most likely delay reason
2. Responsible function
3. Recommended corrective action
4. Confidence score

Return confidence separately.

Format:

Confidence Score: XX
"""

    response = llm.invoke(prompt)
    confidence_score = 70

    match = re.search(
        r"Confidence Score[:\s]+(\d+)",
        response.content,
        re.IGNORECASE
)

    if match:
        confidence_score = int(match.group(1))

    prompt_tokens, completion_tokens = extract_llm_tokens(response)

    return {
        "root_cause": response.content,
        "confidence_score": confidence_score,
        "prompt_tokens": state.get("prompt_tokens", 0) + prompt_tokens,
        "completion_tokens": state.get("completion_tokens", 0) + completion_tokens,
        "total_tokens": state.get("total_tokens", 0) + prompt_tokens + completion_tokens
    }

# =====================================================
# NODE 4
# HUMAN APPROVAL
# =====================================================

def human_approval(state: AgentState):

    threshold = AGENT_THRESHOLDS["dwell_agent"]

    confidence = state["confidence_score"]

    # =================================================
    # AUTO APPROVAL
    # =================================================

    if confidence >= threshold:

        print(
            f"\nAUTO APPROVED "
            f"({confidence}% >= {threshold}%)"
        )

        return {
            "approved": True,
            "approval_required": False
        }

    # =================================================
    # HUMAN APPROVAL REQUIRED
    # =================================================

    human_decision = state.get("human_approval")

    if human_decision is None:

        print(
            f"\nHUMAN APPROVAL REQUIRED "
            f"({confidence}% < {threshold}%)"
        )

        return {
            "approved": False,
            "approval_required": True
        }

    # =================================================
    # STREAMLIT DECISION
    # =================================================

    return {
        "approved": human_decision,
        "approval_required": True
    }
# =====================================================
# NODE 5
# ESCALATION PACKAGE
# =====================================================

def create_escalation_package(state: AgentState):

    package = f"""
Tray ID:
{state['tray_id']}

Location:
{state['location']}

Current Stage:
{state['current_stage']}

Hours In Stage:
{state['hours_in_stage']}

Micro SLO:
{state['micro_slo']}

--------------------------------------------------

DWELL ANALYSIS

{state['dwell_analysis']}

--------------------------------------------------

SLA BREACH PREDICTION

{state['sla_prediction']}

--------------------------------------------------

ROOT CAUSE

{state['root_cause']}

--------------------------------------------------

CONFIDENCE

Confidence Score:
{state['confidence_score']}%

Approval Threshold:
{AGENT_THRESHOLDS['dwell_agent']}%

Approval Required:
{state['approval_required']}

--------------------------------------------------

APPROVED

{state['approved']}
"""

    return {
        "escalation_package": package,
        "package": package
    }

# =====================================================
# ROUTER
# =====================================================

def approval_router(state: AgentState):

    if state["approved"]:
        return "approved"

    return "rejected"

# =====================================================
# GRAPH
# =====================================================

graph = StateGraph(AgentState)

graph.add_node("dwell_analysis", analyze_dwell)
graph.add_node("sla_prediction", predict_sla_breach)
graph.add_node("root_cause", classify_root_cause)
graph.add_node("approval", human_approval)
graph.add_node("package", create_escalation_package)

graph.set_entry_point("dwell_analysis")

graph.add_edge("dwell_analysis", "sla_prediction")
graph.add_edge("sla_prediction", "root_cause")
graph.add_edge("root_cause", "approval")

graph.add_conditional_edges(
    "approval",
    approval_router,
    {
        "approved": "package",
        "rejected": END
    }
)

graph.add_edge("package", END)

app = graph.compile()

# =====================================================
# EXTERNAL ENTRYPOINT
# =====================================================

def run_agent(case, human_approval=None):

    case = dict(case)

    case["human_approval"] = human_approval

    result = app.invoke(case)

    return {
        "package": result.get(
            "package",
            ""
        ),

        "confidence_score": result.get(
            "confidence_score",
            0
        ),

        "approval_required": result.get(
            "approval_required",
            False
        ),

        "approved": result.get(
            "approved",
            False
        ),

        "dwell_analysis": result.get(
            "dwell_analysis",
            ""
        ),

        "sla_prediction": result.get(
            "sla_prediction",
            ""
        ),

        "root_cause": result.get(
            "root_cause",
            ""
        ),

        "prompt_tokens": result.get(
            "prompt_tokens",
            0
        ),

        "completion_tokens": result.get(
            "completion_tokens",
            0
        ),

        "total_tokens": result.get(
            "total_tokens",
            0
        )
    }

# =====================================================
# RUN
# =====================================================

if __name__ == "__main__":

    print("\n")
    print("=" * 80)
    print("GOOGLE DWELL TIME MONITORING & ESCALATION AGENT")
    print("=" * 80)

    for case in TEST_CASES:

        print("\n")
        print("=" * 80)
        print(f"PROCESSING {case['tray_id']}")
        print("=" * 80)

        result = app.invoke(case)

        if result.get("approved"):

            print("\n")
            print("=" * 80)
            print("FINAL ESCALATION PACKAGE")
            print("=" * 80)

            print(result["escalation_package"])

        else:

            print("\nEscalation Rejected\n")