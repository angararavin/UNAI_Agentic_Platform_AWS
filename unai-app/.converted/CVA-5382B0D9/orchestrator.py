from typing import TypedDict

from langgraph.graph import StateGraph, END
from langchain_ollama import ChatOllama

# ============================================================
# IMPORT AGENTS
# ============================================================

from unai_backend import make_unai_agent as _make_unai_agent
run_failure_agent = _make_unai_agent(["extract_llm_tokens","analyze_failure","repair_recommendation"])
run_dwell_agent = _make_unai_agent(["analyze_dwell","predict_sla_breach","classify_root_cause"])
run_urgency_agent = _make_unai_agent(["analyze_urgency","generate_dynamic_rdd"])
run_return_agent = _make_unai_agent(["validate_return","reconcile_serials"])


# ============================================================
# MODEL
# ============================================================

llm = ChatOllama(
    model="gpt-oss:120b-cloud",
    temperature=0.2
)


# ============================================================
# STATE
# ============================================================

class ControlTowerState(TypedDict, total=False):

    tray_id: str

    # Agent outputs
    failure_output: str
    urgency_output: str
    dwell_output: str
    return_output: str

    # Confidence
    failure_confidence: int
    urgency_confidence: int
    dwell_confidence: int
    return_confidence: int

    # Approval
    failure_approval_required: bool
    urgency_approval_required: bool
    dwell_approval_required: bool
    return_approval_required: bool

    failure_approved: bool
    urgency_approved: bool
    dwell_approved: bool
    return_approved: bool

    # Current human approval state
    approval_required: bool
    approval_agent: str
    approval_message: str

    # Human decision
    human_approval: bool
    pending_agent: str

    # Tokens
    failure_prompt_tokens: int
    failure_completion_tokens: int
    failure_total_tokens: int

    urgency_prompt_tokens: int
    urgency_completion_tokens: int
    urgency_total_tokens: int

    dwell_prompt_tokens: int
    dwell_completion_tokens: int
    dwell_total_tokens: int

    return_prompt_tokens: int
    return_completion_tokens: int
    return_total_tokens: int

    summary_prompt_tokens: int
    summary_completion_tokens: int
    summary_total_tokens: int

    total_prompt_tokens: int
    total_completion_tokens: int
    total_tokens: int

    executive_summary: str

    workflow_status: str


# ============================================================
# TOKEN EXTRACTION
# ============================================================

def extract_tokens(result):

    """
    Extract actual token usage returned by the individual agent.
    """

    prompt_tokens = result.get(
        "prompt_tokens",
        0
    )

    completion_tokens = result.get(
        "completion_tokens",
        0
    )

    total_tokens = result.get(
        "total_tokens",
        prompt_tokens + completion_tokens
    )

    return (
        prompt_tokens,
        completion_tokens,
        total_tokens
    )


# ============================================================
# OUTPUT HELPER
# ============================================================

def build_output(result):

    """
    The sub-agent only builds its final "package" text after its
    own internal approval gate passes, which is empty on the very
    first pass (before the human has approved anything). Fall back
    to whatever analysis text the agent already produced so the
    reviewer has something to look at in the approval panel.
    """

    package = result.get(
        "package",
        ""
    )

    if package:
        return package

    skip_keys = {
        "package",
        "confidence_score",
        "approval_required",
        "approved"
    }

    parts = [
        value
        for key, value in result.items()
        if key not in skip_keys
        and isinstance(value, str)
        and value.strip()
    ]

    return "\n\n".join(parts)


# ============================================================
# APPROVAL HELPER
# ============================================================

def check_human_approval(
    state,
    agent_name,
    confidence,
    approval_required
):

    """
    Handles the human approval gate.

    IMPORTANT:

    The agent output has already been generated.

    If approval is required and the user has NOT yet approved,
    the workflow pauses and returns the result to Streamlit.

    If the user approves, the workflow continues.
    """

    pending_agent = state.get(
        "pending_agent",
        ""
    )

    human_approval = state.get(
        "human_approval",
        None
    )

    # --------------------------------------------------------
    # This agent does not require approval
    # --------------------------------------------------------

    if not approval_required:

        return {
            "approval_required": False
        }

    # --------------------------------------------------------
    # User already approved this agent
    # --------------------------------------------------------

    if (
        pending_agent == agent_name
        and human_approval is True
    ):

        return {
            "approval_required": False,
            f"{agent_name}_approved": True,
            "human_approval": False,
            "pending_agent": ""
        }

    # --------------------------------------------------------
    # User rejected
    # --------------------------------------------------------

    if (
        pending_agent == agent_name
        and human_approval is False
    ):

        return {
            "approval_required": False,
            f"{agent_name}_approved": False,
            "workflow_status": "REJECTED",
            "human_approval": False,
            "pending_agent": ""
        }

    # --------------------------------------------------------
    # FIRST TIME → PAUSE FOR HUMAN
    # --------------------------------------------------------

    return {
        "approval_required": True,

        "approval_agent":
            f"{agent_name}_agent",

        "approval_message":
            (
                f"{agent_name.title()} Agent generated a "
                f"low-confidence recommendation "
                f"({confidence}%). "
                f"Review the agent output before approving."
            ),

        "pending_agent":
            agent_name,

        "workflow_status":
            "WAITING_FOR_HUMAN_APPROVAL"
    }


# ============================================================
# FAILURE AGENT
# ============================================================

def execute_failure_agent(state):

    case = {

        "tray_id":
            state["tray_id"],

        "mpn":
            "GF-MPN-100",

        "failure_code":
            "CF-203",

        "failure_description":
            "GPU Memory ECC Failure",

        "dcha_log":
            """
            ECC threshold exceeded.
            GPU memory controller unstable.
            """
    }

    human_decision = (
        state.get("human_approval")
        if state.get("pending_agent") == "failure"
        else None
    )

    result = run_failure_agent(
        case,
        human_approval=human_decision
    )

    (
        prompt_tokens,
        completion_tokens,
        total_tokens
    ) = extract_tokens(result)

    confidence = result.get(
        "confidence_score",
        0
    )

    approval_required = result.get(
        "approval_required",
        confidence < 85
    )

    output = build_output(result)

    state_update = {

        "failure_output":
            output,

        "failure_confidence":
            confidence,

        "failure_approval_required":
            approval_required,

        "failure_approved":
            not approval_required,

        "failure_prompt_tokens":
            prompt_tokens,

        "failure_completion_tokens":
            completion_tokens,

        "failure_total_tokens":
            total_tokens
    }

    approval_update = check_human_approval(

        {
            **state,
            **state_update
        },

        "failure",

        confidence,

        approval_required
    )

    state_update.update(
        approval_update
    )

    return state_update


# ============================================================
# URGENCY AGENT
# ============================================================

def execute_urgency_agent(state):

    case = {

        "tray_id":
            state["tray_id"],

        "failure_type":
            "Critical ML Tray Failure",

        "failure_code":
            "CF-203",

        "datacenter":
            "US-CENTRAL-01",

        "spare_inventory":
            0,

        "business_impact":
            "High",

        "carrier_status":
            "Available",

        "cm_queue_status":
            "Moderate"
    }

    human_decision = (
        state.get("human_approval")
        if state.get("pending_agent") == "urgency"
        else None
    )

    result = run_urgency_agent(
        case,
        human_approval=human_decision
    )

    (
        prompt_tokens,
        completion_tokens,
        total_tokens
    ) = extract_tokens(result)

    confidence = result.get(
        "confidence_score",
        0
    )

    approval_required = result.get(
        "approval_required",
        confidence < 90
    )

    output = build_output(result)

    state_update = {

        "urgency_output":
            output,

        "urgency_confidence":
            confidence,

        "urgency_approval_required":
            approval_required,

        "urgency_approved":
            not approval_required,

        "urgency_prompt_tokens":
            prompt_tokens,

        "urgency_completion_tokens":
            completion_tokens,

        "urgency_total_tokens":
            total_tokens
    }

    approval_update = check_human_approval(

        {
            **state,
            **state_update
        },

        "urgency",

        confidence,

        approval_required
    )

    state_update.update(
        approval_update
    )

    return state_update


# ============================================================
# DWELL AGENT
# ============================================================

def execute_dwell_agent(state):

    case = {

        "tray_id":
            state["tray_id"],

        "current_stage":
            "3PL Pickup Queue",

        "hours_in_stage":
            52,

        "micro_slo":
            24,

        "location":
            "DC-SPOKE-01",

        "event_history":
            """
            Waiting for carrier assignment.
            Pickup delayed.
            """
    }

    human_decision = (
        state.get("human_approval")
        if state.get("pending_agent") == "dwell"
        else None
    )

    result = run_dwell_agent(
        case,
        human_approval=human_decision
    )

    (
        prompt_tokens,
        completion_tokens,
        total_tokens
    ) = extract_tokens(result)

    confidence = result.get(
        "confidence_score",
        0
    )

    approval_required = result.get(
        "approval_required",
        confidence < 80
    )

    output = build_output(result)

    state_update = {

        "dwell_output":
            output,

        "dwell_confidence":
            confidence,

        "dwell_approval_required":
            approval_required,

        "dwell_approved":
            not approval_required,

        "dwell_prompt_tokens":
            prompt_tokens,

        "dwell_completion_tokens":
            completion_tokens,

        "dwell_total_tokens":
            total_tokens
    }

    approval_update = check_human_approval(

        {
            **state,
            **state_update
        },

        "dwell",

        confidence,

        approval_required
    )

    state_update.update(
        approval_update
    )

    return state_update


# ============================================================
# RETURN AGENT
# ============================================================

def execute_return_agent(state):

    case = {

        "tray_id":
            state["tray_id"],

        "rma_id":
            "RMA-1001",

        "serial_number":
            "SN12345",

        "returned_serial":
            "SN12345",

        "repair_status":
            "Completed",

        "warranty_status":
            "Eligible",

        "manifest_details":
            """
            GPU board replaced.
            Functional testing passed.
            """
    }

    human_decision = (
        state.get("human_approval")
        if state.get("pending_agent") == "return"
        else None
    )

    result = run_return_agent(
        case,
        human_approval=human_decision
    )

    (
        prompt_tokens,
        completion_tokens,
        total_tokens
    ) = extract_tokens(result)

    confidence = result.get(
        "confidence_score",
        0
    )

    approval_required = result.get(
        "approval_required",
        confidence < 95
    )

    output = build_output(result)

    state_update = {

        "return_output":
            output,

        "return_confidence":
            confidence,

        "return_approval_required":
            approval_required,

        "return_approved":
            not approval_required,

        "return_prompt_tokens":
            prompt_tokens,

        "return_completion_tokens":
            completion_tokens,

        "return_total_tokens":
            total_tokens
    }

    approval_update = check_human_approval(

        {
            **state,
            **state_update
        },

        "return",

        confidence,

        approval_required
    )

    state_update.update(
        approval_update
    )

    return state_update


# ============================================================
# SUMMARY
# ============================================================

def generate_summary(state):

    prompt = f"""
You are the Google RMA Control Tower Orchestrator.

Summarize the complete RMA lifecycle.

Failure Agent:
{state.get("failure_output", "")}

Urgency Agent:
{state.get("urgency_output", "")}

Dwell Agent:
{state.get("dwell_output", "")}

Return Agent:
{state.get("return_output", "")}

Provide:

1. Executive Summary
2. Key Decisions
3. Major Risks
4. Estimated Cycle Time Savings
5. Business Impact
6. Recommended Actions
"""

    response = llm.invoke(prompt)

    metadata = response.response_metadata or {}

    prompt_tokens = metadata.get(
        "prompt_eval_count",
        0
    )

    completion_tokens = metadata.get(
        "eval_count",
        0
    )

    total_tokens = (
        prompt_tokens +
        completion_tokens
    )

    return {

        "executive_summary":
            response.content,

        "summary_prompt_tokens":
            prompt_tokens,

        "summary_completion_tokens":
            completion_tokens,

        "summary_total_tokens":
            total_tokens,

        "workflow_status":
            "COMPLETED"
    }


# ============================================================
# TOKEN AGGREGATION
# ============================================================

def calculate_total_tokens(state):

    prompt_tokens = (

        state.get("failure_prompt_tokens", 0)
        + state.get("urgency_prompt_tokens", 0)
        + state.get("dwell_prompt_tokens", 0)
        + state.get("return_prompt_tokens", 0)
        + state.get("summary_prompt_tokens", 0)
    )

    completion_tokens = (

        state.get("failure_completion_tokens", 0)
        + state.get("urgency_completion_tokens", 0)
        + state.get("dwell_completion_tokens", 0)
        + state.get("return_completion_tokens", 0)
        + state.get("summary_completion_tokens", 0)
    )

    return {

        "total_prompt_tokens":
            prompt_tokens,

        "total_completion_tokens":
            completion_tokens,

        "total_tokens":
            prompt_tokens + completion_tokens
    }


# ============================================================
# ROUTER
# ============================================================

def route_after_agent(state):

    if state.get(
        "approval_required",
        False
    ):

        return "waiting"

    if state.get(
        "workflow_status"
    ) == "REJECTED":

        return "rejected"

    return "continue"


# ============================================================
# GRAPH
# ============================================================

graph = StateGraph(
    ControlTowerState
)


# ============================================================
# NODES
# ============================================================

graph.add_node(
    "failure_agent",
    execute_failure_agent
)

graph.add_node(
    "urgency_agent",
    execute_urgency_agent
)

graph.add_node(
    "dwell_agent",
    execute_dwell_agent
)

graph.add_node(
    "return_agent",
    execute_return_agent
)

graph.add_node(
    "summary",
    generate_summary
)

graph.add_node(
    "token_summary",
    calculate_total_tokens
)


# ============================================================
# ENTRY
# ============================================================

def route_entry(state):

    """
    Resume the workflow at the next agent that has not yet been
    approved, instead of always restarting at the Failure Agent.

    Without this, every Streamlit approve/reject click re-invoked
    the graph from scratch at "failure_agent", which re-ran the
    Failure Agent (usually re-triggering its own approval gate)
    and discarded whatever approval decision the user had just
    made on a downstream agent.
    """

    if state.get("workflow_status") == "REJECTED":
        return "rejected"

    if not state.get("failure_approved", False):
        return "failure"

    if not state.get("urgency_approved", False):
        return "urgency"

    if not state.get("dwell_approved", False):
        return "dwell"

    if not state.get("return_approved", False):
        return "return"

    return "summary"


graph.set_conditional_entry_point(

    route_entry,

    {
        "failure": "failure_agent",
        "urgency": "urgency_agent",
        "dwell": "dwell_agent",
        "return": "return_agent",
        "summary": "summary",
        "rejected": END
    }
)


# ============================================================
# FAILURE → URGENCY / WAIT
# ============================================================

graph.add_conditional_edges(

    "failure_agent",

    route_after_agent,

    {

        "continue":
            "urgency_agent",

        "waiting":
            END,

        "rejected":
            END
    }
)


# ============================================================
# URGENCY → DWELL / WAIT
# ============================================================

graph.add_conditional_edges(

    "urgency_agent",

    route_after_agent,

    {

        "continue":
            "dwell_agent",

        "waiting":
            END,

        "rejected":
            END
    }
)


# ============================================================
# DWELL → RETURN / WAIT
# ============================================================

graph.add_conditional_edges(

    "dwell_agent",

    route_after_agent,

    {

        "continue":
            "return_agent",

        "waiting":
            END,

        "rejected":
            END
    }
)


# ============================================================
# RETURN → SUMMARY / WAIT
# ============================================================

graph.add_conditional_edges(

    "return_agent",

    route_after_agent,

    {

        "continue":
            "summary",

        "waiting":
            END,

        "rejected":
            END
    }
)


# ============================================================
# SUMMARY → TOKEN SUMMARY
# ============================================================

graph.add_edge(
    "summary",
    "token_summary"
)

graph.add_edge(
    "token_summary",
    END
)


# ============================================================
# COMPILE
# ============================================================

app = graph.compile()


# ============================================================
# PUBLIC FUNCTION USED BY STREAMLIT
# ============================================================

def run_control_tower(
    tray_id,
    approval_decision=None,
    pending_agent=None,
    previous_state=None
):

    """
    Main entry point for Streamlit.

    FIRST RUN:

        run_control_tower("GF-TRAY-001")

    If an agent has low confidence:

        approval_required = True

    Streamlit displays the agent output.

    USER CLICKS APPROVE:

        run_control_tower(
            tray_id,
            approval_decision=True,
            pending_agent="failure_agent",
            previous_state=<last result dict>
        )

    `previous_state` should be the dict returned by the prior call
    (e.g. st.session_state.result). It carries forward already
    approved agents' outputs/confidence/tokens so the conditional
    entry point can resume past them instead of re-running the
    whole workflow from the Failure Agent.
    """

    state = {

        "tray_id":
            tray_id,

        "approval_required":
            False,

        "approval_agent":
            "",

        "approval_message":
            "",

        "human_approval":
            approval_decision,

        "pending_agent":
            (
                pending_agent.replace(
                    "_agent",
                    ""
                )
                if pending_agent
                else ""
            ),

        "workflow_status":
            "RUNNING",

        # ----------------------------------------------------
        # Token defaults
        # ----------------------------------------------------

        "failure_prompt_tokens": 0,
        "failure_completion_tokens": 0,
        "failure_total_tokens": 0,

        "urgency_prompt_tokens": 0,
        "urgency_completion_tokens": 0,
        "urgency_total_tokens": 0,

        "dwell_prompt_tokens": 0,
        "dwell_completion_tokens": 0,
        "dwell_total_tokens": 0,

        "return_prompt_tokens": 0,
        "return_completion_tokens": 0,
        "return_total_tokens": 0,

        "summary_prompt_tokens": 0,
        "summary_completion_tokens": 0,
        "summary_total_tokens": 0,

        "total_prompt_tokens": 0,
        "total_completion_tokens": 0,
        "total_tokens": 0
    }

    # ----------------------------------------------------
    # Carry forward already-completed agent state
    # (outputs, confidence, approved flags, tokens) so a
    # resumed run doesn't lose prior progress. The control
    # fields above (human_approval, pending_agent, etc.)
    # stay as set for *this* call.
    # ----------------------------------------------------

    if previous_state:

        control_fields = {
            "tray_id",
            "approval_required",
            "approval_agent",
            "approval_message",
            "human_approval",
            "pending_agent",
            "workflow_status"
        }

        for key, value in previous_state.items():
            if key not in control_fields:
                state[key] = value

    result = app.invoke(
        state
    )

    return result


# ============================================================
# TERMINAL TEST
# ============================================================

if __name__ == "__main__":

    result = run_control_tower(
        "GF-TRAY-001"
    )

    print("\n")
    print("=" * 80)
    print("GOOGLE RMA CONTROL TOWER")
    print("=" * 80)

    print(
        "\nWorkflow Status:",
        result.get(
            "workflow_status"
        )
    )

    # --------------------------------------------------------
    # HUMAN APPROVAL
    # --------------------------------------------------------

    if result.get(
        "approval_required",
        False
    ):

        print("\n")
        print("=" * 80)
        print("HUMAN APPROVAL REQUIRED")
        print("=" * 80)

        print(
            "\nAgent:",
            result.get(
                "approval_agent"
            )
        )

        print(
            "\nConfidence:",
            result.get(
                result.get(
                    "pending_agent",
                    ""
                ) + "_confidence",
                0
            ),
            "%"
        )

        print(
            "\nMessage:",
            result.get(
                "approval_message"
            )
        )

        print(
            "\nAgent Output:"
        )

        agent = result.get(
            "pending_agent",
            ""
        )

        print(
            result.get(
                f"{agent}_output",
                ""
            )
        )

    # --------------------------------------------------------
    # COMPLETED
    # --------------------------------------------------------

    elif result.get(
        "workflow_status"
    ) == "COMPLETED":

        print("\n")
        print("=" * 80)
        print("EXECUTIVE SUMMARY")
        print("=" * 80)

        print(
            result.get(
                "executive_summary",
                ""
            )
        )

        print("\n")
        print("=" * 80)
        print("TOKEN UTILIZATION")
        print("=" * 80)

        print(
            "Prompt:",
            result.get(
                "total_prompt_tokens",
                0
            )
        )

        print(
            "Completion:",
            result.get(
                "total_completion_tokens",
                0
            )
        )

        print(
            "Total:",
            result.get(
                "total_tokens",
                0
            )
        )