
import html

import streamlit as st
import pandas as pd
import plotly.express as px

from orchestrator import run_control_tower


# ============================================================
# OUTPUT RENDERING
# ============================================================

def render_output(text):

    """
    st.text() renders through Streamlit's own themed component, whose
    text color can't reliably be overridden from external CSS on a
    dark background. Render plain agent output as HTML instead, with
    the color set inline so nothing else in the stylesheet can win.
    """

    escaped = html.escape(text).replace("\n", "<br>")

    st.markdown(
        f'<div style="color:#ffffff; '
        f'font-family: monospace; font-size: 13px; line-height: 1.6;">'
        f'{escaped}</div>',
        unsafe_allow_html=True
    )


def render_html(markup):

    """
    A multi-line HTML string with each tag indented on its own line
    (for source readability) gets misread by Streamlit's Markdown
    parser as an indented code block instead of raw HTML, once a
    line's leading whitespace hits 4+ spaces -- which happens easily
    once the call is nested inside a function or loop. Collapsing to
    a single line with no leading whitespace sidesteps that entirely.
    """

    lines = [
        line.strip()
        for line in markup.strip().splitlines()
        if line.strip()
    ]

    st.markdown(
        "".join(lines),
        unsafe_allow_html=True
    )


# ============================================================
# PAGE CONFIG
# ============================================================

st.set_page_config(
    page_title="RMA AI Control Tower",
    page_icon="◉",
    layout="wide",
    initial_sidebar_state="expanded"
)


# ============================================================
# DARK BLUE THEME
# ============================================================

st.markdown(
    """
    <style>

    /* ======================================================
       GLOBAL
       ====================================================== */

    #MainMenu {
        visibility: hidden;
    }

    footer {
        visibility: hidden;
    }

    header {
        visibility: hidden;
    }

    .block-container {
        padding-top: 1.5rem;
        padding-bottom: 2rem;
        max-width: 1600px;
    }

    /* ======================================================
       APP BACKGROUND
       ====================================================== */

    .stApp {
        background:
            linear-gradient(
                135deg,
                #071526 0%,
                #0A1E35 45%,
                #06111F 100%
            );
        color: #EAF2FF;
    }

    /* ======================================================
       SIDEBAR
       ====================================================== */

    section[data-testid="stSidebar"] {
        background-color: #081827;
        border-right: 1px solid #1C3854;
    }

    section[data-testid="stSidebar"] * {
        color: #D9E7F5;
    }

    /* ======================================================
       TITLES
       ====================================================== */

    .main-title {
        font-size: 32px;
        font-weight: 700;
        color: #F4F8FC;
        margin-bottom: 0px;
    }

    .main-subtitle {
        color: #8FA8C2;
        font-size: 15px;
        margin-bottom: 20px;
    }

    .section-title {
        font-size: 21px;
        font-weight: 600;
        color: #EAF2FF;
        margin-top: 8px;
        margin-bottom: 15px;
    }

    /* ======================================================
       METRIC CARDS
       ====================================================== */

    div[data-testid="stMetric"] {
        background-color: #0C2137;
        border: 1px solid #1C3D5A;
        border-radius: 12px;
        padding: 16px;
    }

    div[data-testid="stMetric"]:hover {
        border-color: #2E7DD7;
        box-shadow: 0px 4px 14px rgba(0, 102, 204, 0.18);
    }

    div[data-testid="stMetricLabel"] {
        color: #9FB5C9;
    }

    div[data-testid="stMetricValue"] {
        color: #F5F9FC;
    }

    /* ======================================================
       BUTTONS
       ====================================================== */

    .stButton > button {
        border-radius: 8px;
        border: 1px solid #2878C8;
        background-color: #123A60;
        color: #F4F8FC;
        font-weight: 600;
        min-height: 42px;
    }

    .stButton > button:hover {
        background-color: #1B568A;
        border-color: #4A9BEA;
    }

    /* ======================================================
       STATUS CARDS
       ====================================================== */

    .status-card {
        background-color: #0C2137;
        border: 1px solid #1C3D5A;
        border-radius: 12px;
        padding: 18px;
        text-align: center;
        min-height: 110px;
    }

    .status-title {
        font-size: 16px;
        font-weight: 600;
        color: #F2F6FA;
    }

    .status-text {
        font-size: 13px;
        color: #9FB5C9;
        margin-top: 7px;
    }

    /* ======================================================
       APPROVAL
       ====================================================== */

    .approval-box {
        background-color: #1E1B12;
        border: 1px solid #8D6D20;
        border-left: 5px solid #F0B429;
        border-radius: 10px;
        padding: 20px;
        margin-bottom: 15px;
    }

    .approval-title {
        font-size: 21px;
        font-weight: 700;
        color: #FFE7A3;
    }

    .approval-text {
        color: #D7C89D;
        margin-top: 8px;
    }

    /* ======================================================
       INFO CARD
       ====================================================== */

    .info-card {
        background-color: #0C2137;
        border: 1px solid #1C3D5A;
        border-radius: 12px;
        padding: 20px;
        color: #D9E7F5;
    }

    /* ======================================================
       DIVIDER
       ====================================================== */

    hr {
        border-color: #1C3854 !important;
    }

    </style>
    """,
    unsafe_allow_html=True
)


# ============================================================
# SESSION STATE
# ============================================================

if "result" not in st.session_state:
    st.session_state.result = None

if "tray_id" not in st.session_state:
    st.session_state.tray_id = "GF-TRAY-001"

if "selected_agent" not in st.session_state:
    st.session_state.selected_agent = "Control Tower"


# ============================================================
# SIDEBAR
# ============================================================

with st.sidebar:

    st.markdown("## RMA Control Tower")

    st.caption(
        "AI-driven RMA cycle-time optimization"
    )

    st.divider()

    # --------------------------------------------------------
    # TRAY ID
    # --------------------------------------------------------

    tray_id = st.text_input(
        "Tray ID",
        value=st.session_state.tray_id
    )

    st.session_state.tray_id = tray_id

    # --------------------------------------------------------
    # RUN BUTTON
    # --------------------------------------------------------

    run_button = st.button(
        "▶ Run Control Tower",
        width="stretch"
    )

    st.divider()

    # --------------------------------------------------------
    # NAVIGATION
    # --------------------------------------------------------

    st.markdown("### Analytics")

    navigation = st.radio(
        "Navigation",
        [
            "Control Tower",
            "Failure Agent",
            "Urgency Agent",
            "Dwell Agent",
            "Return Agent"
        ],
        label_visibility="collapsed"
    )

    st.session_state.selected_agent = navigation


# ============================================================
# RUN CONTROL TOWER
# ============================================================

if run_button:

    with st.spinner(
        "Executing AI agents..."
    ):

        try:

            result = run_control_tower(
                tray_id
            )

            st.session_state.result = result

        except Exception as e:

            st.error(
                f"Control Tower execution failed: {e}"
            )

            st.stop()


# ============================================================
# GET RESULT
# ============================================================

result = st.session_state.result


# ============================================================
# HEADER
# ============================================================

render_html(
    """
    <div class="main-title">
        RMA AI Control Tower
    </div>

    <div class="main-subtitle">
        Autonomous RMA Decision Intelligence Platform
    </div>
    """
)

st.divider()


# ============================================================
# NO RESULT
# ============================================================

if result is None:

    st.info(
        "Enter a Tray ID and run the Control Tower to begin."
    )

    st.stop()


# ============================================================
# HUMAN APPROVAL HANDLER
# ============================================================

def show_human_approval():

    if not result.get(
        "approval_required",
        False
    ):
        return

    approval_agent = result.get(
        "approval_agent",
        "AI Agent"
    )

    approval_message = result.get(
        "approval_message",
        "Human approval is required."
    )

    agent_key = approval_agent.replace(
        "_agent",
        ""
    )

    confidence = result.get(
        f"{agent_key}_confidence",
        0
    )

    render_html(
        f"""
        <div class="approval-box">

            <div class="approval-title">
                Human Approval Required
            </div>

            <div class="approval-text">
                <b>Agent:</b>
                {approval_agent.replace("_", " ").title()}
            </div>

            <div class="approval-text">
                <b>Confidence:</b>
                {confidence}%
            </div>

            <div class="approval-text">
                {approval_message}
            </div>

        </div>
        """
    )

    # --------------------------------------------------------
    # SHOW OUTPUT FIRST
    # --------------------------------------------------------

    output_key = f"{agent_key}_output"

    with st.expander(
        "View Agent Analysis Before Approval",
        expanded=True
    ):

        render_output(
            result.get(
                output_key,
                "No agent output available."
            )
        )

    st.markdown(
        "### Human Decision"
    )

    col1, col2 = st.columns(2)

    # --------------------------------------------------------
    # APPROVE
    # --------------------------------------------------------

    with col1:

        if st.button(
            "✓ Approve & Continue",
            width="stretch"
        ):

            with st.spinner(
                "Applying approval..."
            ):

                try:

                    updated_result = run_control_tower(
                        tray_id,
                        approval_decision=True,
                        pending_agent=approval_agent,
                        previous_state=result
                    )

                    st.session_state.result = (
                        updated_result
                    )

                    st.rerun()

                except Exception as e:

                    st.error(
                        f"Approval failed: {e}"
                    )

    # --------------------------------------------------------
    # REJECT
    # --------------------------------------------------------

    with col2:

        if st.button(
            "✕ Reject",
            width="stretch"
        ):

            with st.spinner(
                "Applying rejection..."
            ):

                try:

                    updated_result = run_control_tower(
                        tray_id,
                        approval_decision=False,
                        pending_agent=approval_agent,
                        previous_state=result
                    )

                    st.session_state.result = (
                        updated_result
                    )

                    st.rerun()

                except Exception as e:

                    st.error(
                        f"Rejection failed: {e}"
                    )


# ============================================================
# CONTROL TOWER PAGE
# ============================================================

if navigation == "Control Tower":

    # ========================================================
    # APPROVAL
    # ========================================================

    show_human_approval()

    # ========================================================
    # KPIs
    # ========================================================

    st.markdown(
        '<div class="section-title">'
        'Operational KPIs'
        '</div>',
        unsafe_allow_html=True
    )

    col1, col2, col3, col4, col5 = st.columns(5)

    with col1:
        st.metric(
            "Open RMAs",
            "842",
            "-12"
        )

    with col2:
        st.metric(
            "Avg Cycle Time",
            "41 Days",
            "-8 Days"
        )

    with col3:
        st.metric(
            "SLA Risk",
            "14%",
            "-3%"
        )

    with col4:
        st.metric(
            "NTF Risk",
            "9%",
            "-2%"
        )

    with col5:
        st.metric(
            "Reintegrated",
            "732",
            "+84"
        )

    st.divider()

    # ========================================================
    # AGENT STATUS
    # ========================================================

    st.markdown(
        '<div class="section-title">'
        'Agent Execution Status'
        '</div>',
        unsafe_allow_html=True
    )

    status_cols = st.columns(4)

    agents = [

        ("Failure Agent", "failure"),

        ("Urgency Agent", "urgency"),

        ("Dwell Agent", "dwell"),

        ("Return Agent", "return")

    ]

    for col, (
        agent_name,
        agent_key
    ) in zip(
        status_cols,
        agents
    ):

        with col:

            approval_required = result.get(
                f"{agent_key}_approval_required",
                False
            )

            confidence = result.get(
                f"{agent_key}_confidence",
                0
            )

            if approval_required:

                status = (
                    "⚠ Approval Required"
                )

            else:

                status = (
                    "✓ Completed"
                )

            render_html(
                f"""
                <div class="status-card">

                    <div class="status-title">
                        {agent_name}
                    </div>

                    <div class="status-text">
                        {status}
                    </div>

                    <div class="status-text">
                        Confidence: {confidence}%
                    </div>

                </div>
                """
            )

    st.divider()

    # ========================================================
    # CYCLE TIME
    # ========================================================

    left, right = st.columns(
        [2, 1]
    )

    with left:

        st.markdown(
            '<div class="section-title">'
            'Cycle Time Compression'
            '</div>',
            unsafe_allow_html=True
        )

        ct_df = pd.DataFrame({

            "Stage": [

                "Historical",
                "Current",
                "Target"

            ],

            "Days": [

                150,
                41,
                30

            ]
        })

        fig = px.bar(
            ct_df,
            x="Days",
            y="Stage",
            orientation="h",
            text="Days"
        )

        fig.update_layout(
            height=350,
            template="plotly_dark",
            margin=dict(
                l=10,
                r=10,
                t=10,
                b=10
            )
        )

        st.plotly_chart(
            fig,
            width="stretch"
        )

    # ========================================================
    # TOKEN USAGE
    # ========================================================

    with right:

        st.markdown(
            '<div class="section-title">'
            'Token Utilization'
            '</div>',
            unsafe_allow_html=True
        )

        token_df = pd.DataFrame({

            "Agent": [

                "Failure",
                "Urgency",
                "Dwell",
                "Return",
                "Summary"

            ],

            "Tokens": [

                result.get(
                    "failure_total_tokens",
                    result.get(
                        "failure_tokens",
                        0
                    )
                ),

                result.get(
                    "urgency_total_tokens",
                    result.get(
                        "urgency_tokens",
                        0
                    )
                ),

                result.get(
                    "dwell_total_tokens",
                    result.get(
                        "dwell_tokens",
                        0
                    )
                ),

                result.get(
                    "return_total_tokens",
                    result.get(
                        "return_tokens",
                        0
                    )
                ),

                result.get(
                    "summary_total_tokens",
                    0
                )

            ]
        })

        token_fig = px.bar(
            token_df,
            x="Tokens",
            y="Agent",
            orientation="h",
            text="Tokens"
        )

        token_fig.update_layout(
            height=350,
            template="plotly_dark",
            margin=dict(
                l=10,
                r=10,
                t=10,
                b=10
            )
        )

        st.plotly_chart(
            token_fig,
            width="stretch"
        )

    st.divider()

    # ========================================================
    # EXECUTIVE SUMMARY
    # ========================================================

    st.markdown(
        '<div class="section-title">'
        'AI Executive Summary'
        '</div>',
        unsafe_allow_html=True
    )

    summary = result.get(
        "executive_summary",
        "Workflow is currently waiting for completion."
    )

    summary_html = summary.replace("\n", "<br>")

    render_html(
        f"""
        <div class="info-card">
            {summary_html}
        </div>
        """
    )


# ============================================================
# FAILURE AGENT PAGE
# ============================================================

elif navigation == "Failure Agent":

    st.markdown(
        '<div class="section-title">'
        'Failure-Based Disposition Analytics'
        '</div>',
        unsafe_allow_html=True
    )

    show_human_approval()

    confidence = result.get(
        "failure_confidence",
        0
    )

    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric(
            "Confidence",
            f"{confidence}%"
        )

    with col2:
        st.metric(
            "Token Usage",
            f"{result.get('failure_total_tokens', 0):,}"
        )

    with col3:
        approval = result.get(
            "failure_approval_required",
            False
        )

        st.metric(
            "Approval Required",
            "Yes" if approval else "No"
        )

    st.divider()

    # --------------------------------------------------------
    # FAILURE ANALYTICS
    # --------------------------------------------------------

    failure_df = pd.DataFrame({

        "Decision": [

            "Auto Repair",
            "Human Review"

        ],

        "Count": [

            70,
            30

        ]
    })

    failure_fig = px.bar(
        failure_df,
        x="Decision",
        y="Count",
        text="Count"
    )

    failure_fig.update_layout(
        template="plotly_dark",
        height=350
    )

    st.plotly_chart(
        failure_fig,
        width="stretch"
    )

    st.divider()

    st.markdown(
        '<div class="section-title">'
        'Failure Agent Output'
        '</div>',
        unsafe_allow_html=True
    )

    render_output(
        result.get(
            "failure_output",
            "No output available."
        )
    )


# ============================================================
# URGENCY AGENT PAGE
# ============================================================

elif navigation == "Urgency Agent":

    st.markdown(
        '<div class="section-title">'
        'Urgency & SLA Prioritization Analytics'
        '</div>',
        unsafe_allow_html=True
    )

    show_human_approval()

    confidence = result.get(
        "urgency_confidence",
        0
    )

    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric(
            "Confidence",
            f"{confidence}%"
        )

    with col2:
        st.metric(
            "Spare Inventory",
            "0"
        )

    with col3:
        st.metric(
            "Business Impact",
            "High"
        )

    st.divider()

    urgency_df = pd.DataFrame({

        "Priority Factor": [

            "Infrastructure Impact",
            "Spare Availability",
            "Carrier Status",
            "CM Queue"

        ],

        "Priority Score": [

            95,
            100,
            80,
            60

        ]
    })

    urgency_fig = px.bar(
        urgency_df,
        x="Priority Factor",
        y="Priority Score",
        text="Priority Score",
        range_y=[0, 100]
    )

    urgency_fig.update_layout(
        template="plotly_dark",
        height=380
    )

    st.plotly_chart(
        urgency_fig,
        width="stretch"
    )

    st.divider()

    st.markdown(
        '<div class="section-title">'
        'Urgency Agent Output'
        '</div>',
        unsafe_allow_html=True
    )

    render_output(
        result.get(
            "urgency_output",
            "No output available."
        )
    )


# ============================================================
# DWELL AGENT PAGE
# ============================================================

elif navigation == "Dwell Agent":

    st.markdown(
        '<div class="section-title">'
        'Dwell Time & Bottleneck Analytics'
        '</div>',
        unsafe_allow_html=True
    )

    show_human_approval()

    confidence = result.get(
        "dwell_confidence",
        0
    )

    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric(
            "Confidence",
            f"{confidence}%"
        )

    with col2:
        st.metric(
            "Current Dwell",
            "52 Hours"
        )

    with col3:
        st.metric(
            "Micro-SLO",
            "24 Hours"
        )

    st.divider()

    # --------------------------------------------------------
    # DWELL BOTTLENECK CHART
    # --------------------------------------------------------

    dwell_df = pd.DataFrame({

        "Stage": [

            "3PL Pickup",
            "Security",
            "RMA Consolidation",
            "STO Creation"

        ],

        "Historical Hours": [

            48,
            24,
            24,
            30

        ],

        "Current Hours": [

            52,
            24,
            24,
            30

        ]
    })

    dwell_long = dwell_df.melt(

        id_vars="Stage",

        value_vars=[

            "Historical Hours",
            "Current Hours"

        ],

        var_name="Metric",

        value_name="Hours"

    )

    dwell_fig = px.bar(

        dwell_long,

        x="Hours",

        y="Stage",

        color="Metric",

        orientation="h",

        barmode="group",

        text="Hours"

    )

    dwell_fig.update_layout(

        template="plotly_dark",

        height=450,

        xaxis_title="Hours",

        yaxis_title=""

    )

    st.plotly_chart(

        dwell_fig,

        width="stretch"

    )

    st.divider()

    # --------------------------------------------------------
    # CURRENT STAGE VS SLO
    # --------------------------------------------------------

    current_df = pd.DataFrame({

        "Metric": [

            "Current Dwell",
            "Micro-SLO"

        ],

        "Hours": [

            52,
            24

        ]
    })

    current_fig = px.bar(

        current_df,

        x="Metric",

        y="Hours",

        text="Hours"

    )

    current_fig.update_layout(

        template="plotly_dark",

        height=320

    )

    st.plotly_chart(

        current_fig,

        width="stretch"

    )

    st.divider()

    st.markdown(

        '<div class="section-title">'
        'Dwell Agent Output'
        '</div>',

        unsafe_allow_html=True

    )

    render_output(

        result.get(

            "dwell_output",

            "No output available."

        )

    )


# ============================================================
# RETURN AGENT PAGE
# ============================================================

elif navigation == "Return Agent":

    st.markdown(
        '<div class="section-title">'
        'Return & Spare Pool Reintegration Analytics'
        '</div>',
        unsafe_allow_html=True
    )

    show_human_approval()

    confidence = result.get(
        "return_confidence",
        0
    )

    col1, col2, col3 = st.columns(3)

    with col1:

        st.metric(
            "Confidence",
            f"{confidence}%"
        )

    with col2:

        st.metric(
            "Repair Status",
            "Completed"
        )

    with col3:

        st.metric(
            "Warranty",
            "Eligible"
        )

    st.divider()

    # --------------------------------------------------------
    # RETURN VALIDATION
    # --------------------------------------------------------

    validation_df = pd.DataFrame({

        "Validation Step": [

            "Manifest",
            "Serial Match",
            "Repair Validation",
            "Warranty",
            "CMDB Update",
            "Spare Pool"

        ],

        "Completion": [

            100,
            100,
            100,
            100,
            100,
            100

        ]
    })

    validation_fig = px.bar(

        validation_df,

        x="Validation Step",

        y="Completion",

        text="Completion",

        range_y=[0, 100]

    )

    validation_fig.update_layout(

        template="plotly_dark",

        height=400,

        yaxis_title="Completion (%)"

    )

    st.plotly_chart(

        validation_fig,

        width="stretch"

    )

    st.divider()

    st.markdown(

        '<div class="section-title">'
        'Return Agent Output'
        '</div>',

        unsafe_allow_html=True

    )

    render_output(

        result.get(

            "return_output",

            "No output available."

        )

    )
