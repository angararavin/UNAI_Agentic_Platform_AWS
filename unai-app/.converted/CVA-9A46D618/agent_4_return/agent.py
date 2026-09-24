import re
from typing import TypedDict

from langgraph.graph import StateGraph, END
from langchain_ollama import ChatOllama

from data_4 import TEST_CASES
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
    rma_id: str
    serial_number: str
    returned_serial: str
    repair_status: str
    warranty_status: str
    manifest_details: str

    validation_result: str
    reconciliation_result: str
    warranty_assessment: str

    approved: bool
    confidence_score: int
    approval_required: bool
    human_approval: bool | None

    prompt_tokens: int
    completion_tokens: int
    total_tokens: int

    reintegration_package: str
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
# RETURN VALIDATION
# =====================================================

def validate_return(state: AgentState):

    prompt = f"""
You are a Google Reverse Logistics specialist.

Validate the returned tray.

Tray ID:
{state['tray_id']}

RMA ID:
{state['rma_id']}

Repair Status:
{state['repair_status']}

Manifest:
{state['manifest_details']}

Provide:

1. Return Validation Status
2. Manifest Completeness
3. Repair Completion Verification
4. Summary
"""

    response = llm.invoke(prompt)

    prompt_tokens, completion_tokens = extract_llm_tokens(response)

    return {
        "validation_result": response.content,
        "prompt_tokens": state.get("prompt_tokens", 0) + prompt_tokens,
        "completion_tokens": state.get("completion_tokens", 0) + completion_tokens,
        "total_tokens": state.get("total_tokens", 0) + prompt_tokens + completion_tokens
    }

# =====================================================
# NODE 2
# SERIAL RECONCILIATION
# =====================================================

def reconcile_serials(state: AgentState):

    prompt = f"""
You are an asset reconciliation specialist.

Expected Serial Number:
{state['serial_number']}

Returned Serial Number:
{state['returned_serial']}

Validation Result:
{state['validation_result']}

Provide:

1. Match Status
2. Asset Integrity Assessment
3. CMDB Update Recommendation
4. Exception Required? (Yes/No)
"""

    response = llm.invoke(prompt)

    prompt_tokens, completion_tokens = extract_llm_tokens(response)

    return {
        "reconciliation_result": response.content,
        "prompt_tokens": state.get("prompt_tokens", 0) + prompt_tokens,
        "completion_tokens": state.get("completion_tokens", 0) + completion_tokens,
        "total_tokens": state.get("total_tokens", 0) + prompt_tokens + completion_tokens
    }

# =====================================================
# NODE 3
# WARRANTY ASSESSMENT
# =====================================================

def assess_warranty(state: AgentState):

    prompt = f"""
You are a SAP ERP financial analyst.

Warranty Status:
{state['warranty_status']}

Validation Result:
{state['validation_result']}

Reconciliation Result:
{state['reconciliation_result']}

Provide:

1. Warranty Credit Eligibility
2. Financial Closure Recommendation
3. Kinaxis Inventory Release Recommendation
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
        "warranty_assessment": response.content,
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

    threshold = AGENT_THRESHOLDS[
        "return_agent"
    ]

    confidence = state[
        "confidence_score"
    ]

    if confidence >= threshold:

        return {
            "approved": True,
            "approval_required": False
        }

    human_decision = state.get("human_approval")

    if human_decision is None:

        return {
            "approved": False,
            "approval_required": True
        }

    return {
        "approved": human_decision,
        "approval_required": True
    }
# =====================================================
# NODE 5
# REINTEGRATION PACKAGE
# =====================================================

def create_reintegration_package(state: AgentState):

    package = f"""
Tray ID:
{state['tray_id']}

RMA ID:
{state['rma_id']}

Expected Serial:
{state['serial_number']}

Returned Serial:
{state['returned_serial']}

--------------------------------------------------

RETURN VALIDATION

{state['validation_result']}

--------------------------------------------------

SERIAL RECONCILIATION

{state['reconciliation_result']}

--------------------------------------------------

WARRANTY & FINANCIAL ASSESSMENT

{state['warranty_assessment']}

--------------------------------------------------
CONFIDENCE

Confidence Score:
{state['confidence_score']}%

Approval Threshold:
{AGENT_THRESHOLDS['return_agent']}%

Approval Required:
{state['approval_required']}

SYSTEM ACTIONS

- Update CMDB
- Release Spare To Kinaxis
- Process Warranty Credit
- Close Financial Record
- Close RMA
--------------------------------------------------

APPROVED

{state['approved']}
"""

    return {
        "reintegration_package": package,
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

graph.add_node("validation", validate_return)
graph.add_node("reconciliation", reconcile_serials)
graph.add_node("warranty", assess_warranty)
graph.add_node("approval", human_approval)
graph.add_node("package", create_reintegration_package)

graph.set_entry_point("validation")

graph.add_edge("validation", "reconciliation")
graph.add_edge("reconciliation", "warranty")
graph.add_edge("warranty", "approval")

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
        "package": result.get("package"),
        "confidence_score": result.get("confidence_score", 0),
        "approval_required": result.get("approval_required", False),
        "approved": result.get("approved", False),
        "validation_result": result.get("validation_result", ""),
        "reconciliation_result": result.get("reconciliation_result", ""),
        "warranty_assessment": result.get("warranty_assessment", ""),
        "prompt_tokens": result.get("prompt_tokens", 0),
        "completion_tokens": result.get("completion_tokens", 0),
        "total_tokens": result.get("total_tokens", 0)
    }

# =====================================================
# RUN
# =====================================================

if __name__ == "__main__":

    print("\n")
    print("=" * 80)
    print("GOOGLE RETURN RECEIPT & SPARE-POOL REINTEGRATION AGENT")
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
            print("FINAL REINTEGRATION PACKAGE")
            print("=" * 80)

            print(result["reintegration_package"])

        else:

            print("\nReintegration Package Rejected\n")