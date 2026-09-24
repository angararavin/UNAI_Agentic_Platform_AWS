import re
from typing import TypedDict

from langgraph.graph import StateGraph, END
from langchain_ollama import ChatOllama

from data_1 import TEST_CASES
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
    mpn: str
    failure_code: str
    failure_description: str
    dcha_log: str

    analysis: str
    repair: str
    ntf: str

    approved: bool
    confidence_score: int

    approval_required: bool
    human_approval: bool | None

    final_package: str
    package: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


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
# FAILURE ANALYSIS
# =====================================================

def analyze_failure(state: AgentState):

    prompt = f"""
You are a Google Datacenter Hardware Reliability Engineer.

Analyze the tray failure.

Tray ID:
{state['tray_id']}

MPN:
{state['mpn']}

Failure Code:
{state['failure_code']}

Failure Description:
{state['failure_description']}

DCHA Telemetry:
{state['dcha_log']}

Provide:

1. Root Cause
2. Affected Component
3. Severity
4. Confidence Score (0-100)
Return confidence score separately.
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
        "analysis": response.content,
        "confidence_score": confidence_score,
        "prompt_tokens": state.get("prompt_tokens", 0) + prompt_tokens,
        "completion_tokens": state.get("completion_tokens", 0) + completion_tokens,
        "total_tokens": state.get("total_tokens", 0) + prompt_tokens + completion_tokens
    }


# =====================================================
# NODE 2
# REPAIR RECOMMENDATION
# =====================================================

def repair_recommendation(state: AgentState):

    prompt = f"""
You are a Contract Manufacturer repair specialist.

Analysis:

{state['analysis']}

Provide:

1. Recommended Repair
2. Can IST testing be bypassed?
3. Expected repair outcome
4. Justification
"""

    response = llm.invoke(prompt)

    prompt_tokens, completion_tokens = extract_llm_tokens(response)

    return {
        "repair": response.content,
        "prompt_tokens": state.get("prompt_tokens", 0) + prompt_tokens,
        "completion_tokens": state.get("completion_tokens", 0) + completion_tokens,
        "total_tokens": state.get("total_tokens", 0) + prompt_tokens + completion_tokens
    }


# =====================================================
# NODE 3
# NTF PREDICTION
# =====================================================

def ntf_prediction(state: AgentState):

    prompt = f"""
You are an RMA analytics expert.

Review:

Failure:
{state['failure_description']}

Analysis:
{state['analysis']}

Repair Recommendation:
{state['repair']}

Provide:

1. NTF Probability (%)
2. Ship To CM? (Yes/No)
3. Local Revalidation Needed? (Yes/No)
4. Summarized Explanation     
"""

    response = llm.invoke(prompt)

    prompt_tokens, completion_tokens = extract_llm_tokens(response)

    return {
        "ntf": response.content,
        "prompt_tokens": state.get("prompt_tokens", 0) + prompt_tokens,
        "completion_tokens": state.get("completion_tokens", 0) + completion_tokens,
        "total_tokens": state.get("total_tokens", 0) + prompt_tokens + completion_tokens
    }


# =====================================================
# NODE 4
# HUMAN APPROVAL
# =====================================================

def human_approval(state: AgentState):

    threshold = AGENT_THRESHOLDS["failure_agent"]

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
    # HUMAN DECISION RECEIVED FROM STREAMLIT
    # =================================================

    return {
        "approved": human_decision,
        "approval_required": True
    }


# =====================================================
# NODE 5
# FINAL PACKAGE
# =====================================================

def create_package(state: AgentState):

    package = f"""
==================================================
GOOGLE FAILURE DISPOSITION PACKAGE
==================================================

Tray ID:
{state['tray_id']}

MPN:
{state['mpn']}

Failure Code:
{state['failure_code']}

--------------------------------------------------
ROOT CAUSE ANALYSIS
--------------------------------------------------

{state['analysis']}

--------------------------------------------------
REPAIR RECOMMENDATION
--------------------------------------------------

{state['repair']}

--------------------------------------------------
NTF ASSESSMENT
--------------------------------------------------

{state['ntf']}

--------------------------------------------------
CONFIDENCE
--------------------------------------------------

Confidence Score:
{state.get('confidence_score', 0)}%

Threshold:
{AGENT_THRESHOLDS['failure_agent']}%

Approval Required:
{state.get('approval_required', False)}

--------------------------------------------------
APPROVED
--------------------------------------------------

{state['approved']}
"""

    return {
        "final_package": package,
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

graph.add_node("analysis", analyze_failure)
graph.add_node("repair", repair_recommendation)
graph.add_node("ntf", ntf_prediction)
graph.add_node("approval", human_approval)
graph.add_node("package", create_package)

graph.set_entry_point("analysis")

graph.add_edge("analysis", "repair")
graph.add_edge("repair", "ntf")
graph.add_edge("ntf", "approval")

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
        "package": result.get("package", ""),
        "confidence_score": result.get("confidence_score", 0),
        "approval_required": result.get(
            "approval_required",
            False
        ),
        "approved": result.get(
            "approved",
            False
        ),
        "analysis": result.get(
            "analysis",
            ""
        ),
        "repair": result.get(
            "repair",
            ""
        ),
        "ntf": result.get(
            "ntf",
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
    print("GOOGLE FAILURE DISPOSITION AGENT")
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
            print("FINAL PACKAGE")
            print("=" * 80)

            print(result["final_package"])

        else:

            print("\nPackage Rejected\n")