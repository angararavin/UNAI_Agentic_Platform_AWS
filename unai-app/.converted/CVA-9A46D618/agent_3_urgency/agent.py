import re

from config import AGENT_THRESHOLDS
from typing import TypedDict

from langgraph.graph import StateGraph, END
from langchain_ollama import ChatOllama

from data_3 import TEST_CASES

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
    failure_type: str
    failure_code: str
    datacenter: str
    spare_inventory: int
    business_impact: str
    carrier_status: str
    cm_queue_status: str

    urgency_analysis: str
    dynamic_rdd: str
    transportation_plan: str

    approved: bool
    confidence_score: int
    approval_required: bool
    human_approval: bool | None

    prompt_tokens: int
    completion_tokens: int
    total_tokens: int

    priority_package: str
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
# URGENCY ANALYSIS
# =====================================================

def analyze_urgency(state: AgentState):

    prompt = f"""
You are a Google logistics prioritization expert.

Analyze the urgency of this failed asset.

Tray ID:
{state['tray_id']}

Failure Type:
{state['failure_type']}

Failure Code:
{state['failure_code']}

Datacenter:
{state['datacenter']}

Spare Inventory:
{state['spare_inventory']}

Business Impact:
{state['business_impact']}

Provide:

1. Urgency Score (0-100)
2. Priority Level (P1/P2/P3/P4)
3. Infrastructure Risk
4. Explanation
5. Confidence Score (0-100)

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
        confidence_score = int(
            match.group(1)
        )

    prompt_tokens, completion_tokens = extract_llm_tokens(response)

    return {
        "urgency_analysis": response.content,
        "confidence_score": confidence_score,
        "prompt_tokens": state.get("prompt_tokens", 0) + prompt_tokens,
        "completion_tokens": state.get("completion_tokens", 0) + completion_tokens,
        "total_tokens": state.get("total_tokens", 0) + prompt_tokens + completion_tokens
    }

# =====================================================
# NODE 2
# DYNAMIC RDD
# =====================================================

def generate_dynamic_rdd(state: AgentState):

    prompt = f"""
You are a SAP EWM planning specialist.

Review:

{state['urgency_analysis']}

Carrier Status:
{state['carrier_status']}

CM Queue Status:
{state['cm_queue_status']}

Provide:

1. Recommended Required Delivery Date (RDD)
2. Shipment Target
3. Warehouse Priority
4. Justification
"""

    response = llm.invoke(prompt)

    prompt_tokens, completion_tokens = extract_llm_tokens(response)

    return {
        "dynamic_rdd": response.content,
        "prompt_tokens": state.get("prompt_tokens", 0) + prompt_tokens,
        "completion_tokens": state.get("completion_tokens", 0) + completion_tokens,
        "total_tokens": state.get("total_tokens", 0) + prompt_tokens + completion_tokens
    }

# =====================================================
# NODE 3
# TRANSPORTATION PLAN
# =====================================================

def recommend_transportation(state: AgentState):

    prompt = f"""
You are a transportation planning expert.

Urgency Analysis:

{state['urgency_analysis']}

Dynamic RDD:

{state['dynamic_rdd']}

Provide:

1. Shipping Mode
2. Same-Day or Next-Day Recommendation
3. Carrier Strategy
4. Expected Transit Outcome
"""

    response = llm.invoke(prompt)

    prompt_tokens, completion_tokens = extract_llm_tokens(response)

    return {
        "transportation_plan": response.content,
        "prompt_tokens": state.get("prompt_tokens", 0) + prompt_tokens,
        "completion_tokens": state.get("completion_tokens", 0) + completion_tokens,
        "total_tokens": state.get("total_tokens", 0) + prompt_tokens + completion_tokens
    }

# =====================================================
# NODE 4
# HUMAN APPROVAL
# =====================================================

def human_approval(state: AgentState):

    threshold = AGENT_THRESHOLDS["urgency_agent"]

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
# FINAL PACKAGE
# =====================================================

def create_priority_package(state: AgentState):

    package = f"""
Tray ID:
{state['tray_id']}

Failure Type:
{state['failure_type']}

Failure Code:
{state['failure_code']}

Datacenter:
{state['datacenter']}

--------------------------------------------------

URGENCY ANALYSIS

{state['urgency_analysis']}

--------------------------------------------------

DYNAMIC RDD

{state['dynamic_rdd']}

--------------------------------------------------

TRANSPORTATION PLAN

{state['transportation_plan']}

--------------------------------------------------
--------------------------------------------------

CONFIDENCE

Confidence Score:
{state['confidence_score']}%

Approval Threshold:
{AGENT_THRESHOLDS['urgency_agent']}%

Approval Required:
{state['approval_required']}

--------------------------------------------------

APPROVED

{state['approved']}
"""

    return {
        "priority_package": package,
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

graph.add_node("urgency_analysis", analyze_urgency)
graph.add_node("dynamic_rdd", generate_dynamic_rdd)
graph.add_node("transportation", recommend_transportation)
graph.add_node("approval", human_approval)
graph.add_node("package", create_priority_package)

graph.set_entry_point("urgency_analysis")

graph.add_edge("urgency_analysis", "dynamic_rdd")
graph.add_edge("dynamic_rdd", "transportation")
graph.add_edge("transportation", "approval")

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

        "urgency_analysis": result.get(
            "urgency_analysis",
            ""
        ),

        "dynamic_rdd": result.get(
            "dynamic_rdd",
            ""
        ),

        "transportation_plan": result.get(
            "transportation_plan",
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
    print("GOOGLE URGENCY FLAGGING AGENT")
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
            print("FINAL PRIORITY PACKAGE")
            print("=" * 80)

            print(result["priority_package"])

        else:

            print("\nPriority Package Rejected\n")