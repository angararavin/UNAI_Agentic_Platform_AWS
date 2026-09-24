"""
Interactive Plotly Visualizations Engine for SAP Supply Chain Agentic AI Control Tower.
Generates enterprise-grade, responsive charts with modern dark/light styling.
"""

from typing import Dict, Any, List, Optional
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots

# Theme Palette Constants
COLOR_PRIMARY = "#3b82f6"     # Royal Blue
COLOR_SUCCESS = "#10b981"     # Emerald Green
COLOR_DANGER = "#ef4444"      # Crimson Red
COLOR_WARNING = "#f59e0b"     # Amber
COLOR_PURPLE = "#8b5cf6"      # Indigo / Violet
COLOR_BG = "rgba(0,0,0,0)"
FONT_FAMILY = "Inter, sans-serif"

def create_agent_01_drift_chart(s_stats: Dict[str, Any], policy: Dict[str, Any]) -> go.Figure:
    """
    Creates an interactive historical delay distribution and cumulative risk curve for Agent 01.
    """
    avg_delay = float(s_stats.get("avg_delay_days", 1.2))
    p90_delay = float(s_stats.get("p90_delay_days", 2.8))
    late_rate = float(s_stats.get("late_delivery_rate_pct", 80.0))

    # Synthetic sample distribution centered around observed mean and variance
    delay_buckets = ["On Time (0d)", "1-2 Days Late", "3-5 Days Late", "6-9 Days Late", "10+ Days Late"]
    counts = [
        max(1, int(100 - late_rate)),
        max(2, int(late_rate * 0.45)),
        max(1, int(late_rate * 0.30)),
        max(1, int(late_rate * 0.15)),
        max(1, int(late_rate * 0.10))
    ]
    colors = [COLOR_SUCCESS, COLOR_WARNING, COLOR_WARNING, COLOR_DANGER, COLOR_DANGER]

    fig = go.Figure()

    # Bar chart of historical deliveries
    fig.add_trace(go.Bar(
        x=delay_buckets,
        y=counts,
        marker=dict(color=colors, line=dict(width=1, color="rgba(255,255,255,0.2)")),
        name="Deliveries Count",
        hovertemplate="<b>%{x}</b><br>Historical Share: %{y}%<extra></extra>"
    ))

    # Threshold indicator line for average delay
    fig.add_vline(
        x=1, line_width=2, line_dash="dash", line_color="#3b82f6",
        annotation_text=f"Avg Delay: {avg_delay:.1f}d",
        annotation_position="top right",
        annotation_font=dict(color="#1e293b", size=11, family=FONT_FAMILY)
    )

    fig.update_layout(
        title=dict(
            text="📊 Supplier Historical Delivery Variance & Delay Distribution",
            font=dict(family=FONT_FAMILY, size=15, color="#1e293b")
        ),
        paper_bgcolor=COLOR_BG,
        plot_bgcolor="rgba(241, 245, 249, 0.5)",
        margin=dict(l=20, r=20, t=40, b=20),
        height=280,
        showlegend=False,
        font=dict(family=FONT_FAMILY, size=11, color="#64748b"),
        yaxis=dict(showgrid=True, gridcolor="#e2e8f0", title="Historical Frequency (%)"),
        xaxis=dict(showgrid=False)
    )
    return fig


def create_agent_02_waterfall_chart(phantom_metrics: Dict[str, Any]) -> go.Figure:
    """
    Creates an interactive waterfall chart showing Physical Stock -> Deductions -> Operationally Usable Stock.
    """
    p = float(phantom_metrics.get("physical_qty", 1000.0))
    u = float(phantom_metrics.get("usable_qty", 400.0))
    b = phantom_metrics.get("unavailable_breakdown", {})

    blocked = float(b.get("STATUS_BLOCKED", 0.0))
    qa = float(b.get("QUALITY_HOLD", 0.0))
    res = float(b.get("RESERVED_COMMITMENT", 0.0))
    wrong = float(b.get("WRONG_LOCATION", 0.0))
    exp = float(b.get("EXPIRED_SHELF_LIFE", 0.0))

    fig = go.Figure(go.Waterfall(
        name="Stock Usability",
        orientation="v",
        measure=["absolute", "relative", "relative", "relative", "relative", "relative", "total"],
        x=["Physical Recorded", "Blocked", "QA Hold", "Reserved", "Wrong Bin", "Expired", "Usable Stock"],
        textposition="outside",
        text=[f"{p:,.0f}", f"-{blocked:,.0f}", f"-{qa:,.0f}", f"-{res:,.0f}", f"-{wrong:,.0f}", f"-{exp:,.0f}", f"{u:,.0f}"],
        y=[p, -blocked, -qa, -res, -wrong, -exp, u],
        connector={"line": {"color": "#94a3b8"}},
        decreasing={"marker": {"color": "#ef4444"}},
        increasing={"marker": {"color": "#3b82f6"}},
        totals={"marker": {"color": "#10b981"}}
    ))

    fig.update_layout(
        title=dict(
            text="📦 Usable Stock Reconciliation Waterfall (Units)",
            font=dict(family=FONT_FAMILY, size=15, color="#1e293b")
        ),
        paper_bgcolor=COLOR_BG,
        plot_bgcolor="rgba(241, 245, 249, 0.5)",
        margin=dict(l=20, r=20, t=40, b=20),
        height=280,
        showlegend=False,
        font=dict(family=FONT_FAMILY, size=11, color="#64748b"),
        yaxis=dict(showgrid=True, gridcolor="#e2e8f0", title="Stock Balance (Units)")
    )
    return fig


def create_agent_03_logistics_chart(economics: Dict[str, Any], source_prot: Dict[str, Any]) -> go.Figure:
    """
    Creates an interactive bar chart comparing Avoided Stockout vs Freight Cost vs Net Economic Value.
    """
    freight = float(economics.get("estimated_freight_cost", 0.0))
    stockout = float(economics.get("avoided_stockout_cost", 0.0))
    net_val = float(economics.get("estimated_net_benefit", 0.0))

    categories = ["Avoided Stockout Cost", "Carrier Freight Cost", "Net Economic ROI"]
    values = [stockout, freight, net_val]
    colors = [COLOR_PRIMARY, COLOR_WARNING, COLOR_SUCCESS if net_val > 0 else COLOR_DANGER]

    fig = go.Figure(go.Bar(
        x=categories,
        y=values,
        text=[f"₹ {v:,.2f}" for v in values],
        textposition="auto",
        marker=dict(color=colors, line=dict(width=1, color="rgba(255,255,255,0.3)")),
        hovertemplate="<b>%{x}</b>: ₹ %{y:,.2f}<extra></extra>"
    ))

    fig.update_layout(
        title=dict(
            text="💰 Inter-Plant Transfer Economics & ROI Arbitrage (INR)",
            font=dict(family=FONT_FAMILY, size=15, color="#1e293b")
        ),
        paper_bgcolor=COLOR_BG,
        plot_bgcolor="rgba(241, 245, 249, 0.5)",
        margin=dict(l=20, r=20, t=40, b=20),
        height=280,
        showlegend=False,
        font=dict(family=FONT_FAMILY, size=11, color="#64748b"),
        yaxis=dict(showgrid=True, gridcolor="#e2e8f0", title="Financial Impact (₹)")
    )
    return fig


def create_agent_04_aging_donut(aging_metrics: Dict[str, Any], policy: Dict[str, Any]) -> go.Figure:
    """
    Creates an interactive donut chart showing PO fulfillment completion and aging timeline.
    """
    ord_q = float(aging_metrics.get("ordered_qty", 100.0))
    rec_q = float(aging_metrics.get("received_qty", 0.0))
    rem_q = float(aging_metrics.get("remaining_qty", 100.0))
    aging = int(aging_metrics.get("aging_days", 90))

    labels = ["Received Quantity (GR)", "Residual Open Quantity"]
    values = [rec_q, rem_q]
    colors = [COLOR_SUCCESS, COLOR_PRIMARY if rem_q > 0 else "#94a3b8"]

    fig = go.Figure(data=[go.Pie(
        labels=labels,
        values=values,
        hole=0.62,
        marker=dict(colors=colors),
        textinfo="percent+label",
        hovertemplate="<b>%{label}</b>: %{value:,.0f} units (%{percent})<extra></extra>"
    )])

    fig.update_layout(
        title=dict(
            text=f"⏳ PO Quantity Fulfillment (Open {aging} Days)",
            font=dict(family=FONT_FAMILY, size=15, color="#1e293b")
        ),
        paper_bgcolor=COLOR_BG,
        margin=dict(l=20, r=20, t=40, b=20),
        height=280,
        showlegend=True,
        legend=dict(orientation="h", yanchor="bottom", y=-0.2, xanchor="center", x=0.5),
        font=dict(family=FONT_FAMILY, size=11, color="#64748b"),
        annotations=[dict(
            text=f"<b>{aging}d</b><br>Aging",
            x=0.5, y=0.5,
            font=dict(size=14, family=FONT_FAMILY, color="#0f172a"),
            showarrow=False
        )]
    )
    return fig


def create_agent_05_demand_chart(metrics: Dict[str, Any], policy: Dict[str, Any]) -> go.Figure:
    """
    Creates an interactive comparison chart showing Gross Clustered Demand vs Reconciled Net Demand.
    """
    net_demand = float(metrics.get("net_demand", 0.0))
    gross_demand = net_demand * 1.5 if net_demand > 0 else 500.0
    double_counted = gross_demand - net_demand

    categories = ["Gross Conflicting Demand", "Duplicate / Collision Noise", "Clean Net Reconciled Demand"]
    values = [gross_demand, double_counted, net_demand]
    colors = [COLOR_PRIMARY, COLOR_DANGER, COLOR_SUCCESS]

    fig = go.Figure(go.Bar(
        x=categories,
        y=values,
        text=[f"{v:,.0f} units" for v in values],
        textposition="auto",
        marker=dict(color=colors),
        hovertemplate="<b>%{x}</b>: %{y:,.0f} units<extra></extra>"
    ))

    fig.update_layout(
        title=dict(
            text="🧩 Clustered Demand vs. Reconciled Procurement (Units)",
            font=dict(family=FONT_FAMILY, size=15, color="#1e293b")
        ),
        paper_bgcolor=COLOR_BG,
        plot_bgcolor="rgba(241, 245, 249, 0.5)",
        margin=dict(l=20, r=20, t=40, b=20),
        height=280,
        showlegend=False,
        font=dict(family=FONT_FAMILY, size=11, color="#64748b"),
        yaxis=dict(showgrid=True, gridcolor="#e2e8f0", title="Demand Volume (Units)")
    )
    return fig


# ==============================================================================
# EXECUTIVE ANALYTICS & VISUAL INTELLIGENCE DASHBOARD SUITE
# ==============================================================================

AGENT_COLOR_MAP = {
    "PO Promise Drift": "#3b82f6",          # Royal Blue
    "Phantom Inventory": "#ef4444",         # Crimson
    "Material Twin-Location": "#10b981",    # Emerald
    "PO Aging Intelligence": "#f59e0b",     # Amber
    "Requirement Contradiction": "#8b5cf6"  # Violet
}

def create_risk_vs_exposure_scatter(anomalies: List[Dict[str, Any]]) -> go.Figure:
    """
    Creates an executive 2D quadrant scatter/bubble plot correlating Risk Score vs Financial Exposure (INR).
    Points are color-coded by Agent Domain with bubble size reflecting relative impact priority.
    """
    if not anomalies:
        fig = go.Figure()
        fig.add_annotation(text="No active anomalies matching filter criteria", showarrow=False, font=dict(size=14, color="#64748b"))
        fig.update_layout(paper_bgcolor=COLOR_BG, height=350)
        return fig

    # Group points by agent
    agents = sorted(list(set(a.get("agent_name", "General") for a in anomalies)))
    fig = go.Figure()

    for agent in agents:
        agent_items = [a for a in anomalies if a.get("agent_name") == agent]
        xs = [a.get("risk_score", 50.0) for a in agent_items]
        ys = [a.get("financial_impact", 10000.0) for a in agent_items]
        sizes = [max(16, min(48, int(a.get("risk_score", 50.0) * 0.45))) for a in agent_items]
        color = AGENT_COLOR_MAP.get(agent, "#64748b")

        hover_texts = [
            f"<b>{a.get('target_object', 'N/A')}</b><br>"
            f"Agent: {agent}<br>"
            f"Priority: <b>{a.get('priority', 'MED')}</b><br>"
            f"Risk Score: <b>{a.get('risk_score', 0):.1f}/100</b><br>"
            f"Financial Exposure: <b>₹ {a.get('financial_impact', 0):,.2f}</b><br>"
            f"Action: <code>{a.get('recommended_action', 'REVIEW')}</code><br>"
            f"HITL Status: {a.get('hitl_status', 'NEEDS_APPROVAL')}"
            for a in agent_items
        ]

        fig.add_trace(go.Scatter(
            x=xs,
            y=ys,
            mode="markers+text",
            name=agent,
            text=[a.get("case_id", "") for a in agent_items],
            textposition="top center",
            textfont=dict(size=10, family=FONT_FAMILY, color="#334155"),
            marker=dict(
                size=sizes,
                color=color,
                opacity=0.85,
                line=dict(width=2, color="#ffffff")
            ),
            hovertext=hover_texts,
            hoverinfo="text"
        ))

    # Add Quadrant Shading & Thresholds
    fig.add_vline(x=70, line_dash="dash", line_color="rgba(239, 68, 68, 0.4)", annotation_text="Critical Risk (70+)", annotation_position="top left")
    
    fig.update_layout(
        title=dict(
            text="🎯 Cross-Agent Risk vs. Financial Exposure Matrix",
            font=dict(family=FONT_FAMILY, size=15, color="#1e293b")
        ),
        paper_bgcolor=COLOR_BG,
        plot_bgcolor="rgba(248, 250, 252, 0.8)",
        margin=dict(l=30, r=20, t=50, b=30),
        height=380,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1, font=dict(size=10)),
        font=dict(family=FONT_FAMILY, size=11, color="#64748b"),
        xaxis=dict(
            title="Operational Risk Score (0 = Nominal, 100 = Severe)",
            showgrid=True,
            gridcolor="#e2e8f0",
            range=[0, 105]
        ),
        yaxis=dict(
            title="Capital at Risk / Financial Exposure (₹ INR)",
            showgrid=True,
            gridcolor="#e2e8f0"
        )
    )
    return fig


def create_capital_exposure_treemap(anomalies: List[Dict[str, Any]]) -> go.Figure:
    """
    Creates an interactive hierarchical Treemap showing capital distribution across Agent Domains and Target Objects.
    """
    if not anomalies:
        fig = go.Figure()
        fig.add_annotation(text="No data for Treemap", showarrow=False)
        fig.update_layout(paper_bgcolor=COLOR_BG, height=350)
        return fig

    # Build hierarchical tree: Root -> Agent -> Target Object
    labels = ["All Supply Chain Risks"]
    parents = [""]
    values = [sum(a.get("financial_impact", 0.0) for a in anomalies)]
    colors = [50.0]

    # Level 1: Agent Domains
    agents = sorted(list(set(a.get("agent_name", "General") for a in anomalies)))
    for ag in agents:
        ag_items = [a for a in anomalies if a.get("agent_name") == ag]
        labels.append(ag)
        parents.append("All Supply Chain Risks")
        values.append(sum(x.get("financial_impact", 0.0) for x in ag_items))
        avg_risk = sum(x.get("risk_score", 50.0) for x in ag_items) / max(1, len(ag_items))
        colors.append(avg_risk)

    # Level 2: Individual Targets
    for a in anomalies:
        labels.append(f"{a.get('target_object', 'N/A')} ({a.get('case_id')})")
        parents.append(a.get("agent_name", "General"))
        values.append(a.get("financial_impact", 1000.0))
        colors.append(a.get("risk_score", 50.0))

    fig = go.Figure(go.Treemap(
        labels=labels,
        parents=parents,
        values=values,
        branchvalues="total",
        marker=dict(
            colors=colors,
            colorscale=[[0.0, "#10b981"], [0.5, "#f59e0b"], [1.0, "#dc2626"]],
            showscale=True,
            colorbar=dict(title="Risk Score", len=0.7, thickness=12)
        ),
        hovertemplate="<b>%{label}</b><br>Capital Exposure: ₹ %{value:,.2f}<br>Parent: %{parent}<extra></extra>",
        textinfo="label+value+percent parent"
    ))

    fig.update_layout(
        title=dict(
            text="🗺️ Enterprise Capital Allocation & Risk Distribution (Treemap)",
            font=dict(family=FONT_FAMILY, size=15, color="#1e293b")
        ),
        paper_bgcolor=COLOR_BG,
        margin=dict(l=10, r=10, t=50, b=10),
        height=380,
        font=dict(family=FONT_FAMILY, size=11, color="#1e293b")
    )
    return fig


def create_multi_echelon_network_chart(plant_data: Optional[List[Dict[str, Any]]] = None) -> go.Figure:
    """
    Creates an interactive multi-echelon plant network bar & line chart comparing
    On-Hand Inventory, Protected Safety Reserves, Feasible Transfer Volumes, and Net Arbitrage ROI.
    """
    if not plant_data:
        # Default benchmark network if custom data not specified
        plant_data = [
            {"plant": "PL01 (Pune Assembly)", "on_hand": 1850, "protected": 900, "surplus": 950, "transfer_feasible": 600, "roi": 48200.0},
            {"plant": "PL02 (Mumbai Logistics)", "on_hand": 1420, "protected": 850, "surplus": 570, "transfer_feasible": 450, "roi": 36500.0},
            {"plant": "PL03 (Chennai Stamping)", "on_hand": 2600, "protected": 1200, "surplus": 1400, "transfer_feasible": 800, "roi": 64800.0},
            {"plant": "PL04 (Bengaluru Depot)", "on_hand": 980, "protected": 700, "surplus": 280, "transfer_feasible": 250, "roi": 22100.0},
        ]

    plants = [p["plant"] for p in plant_data]
    on_hand = [p["on_hand"] for p in plant_data]
    protected = [p["protected"] for p in plant_data]
    surplus = [p["surplus"] for p in plant_data]
    transfer_vol = [p["transfer_feasible"] for p in plant_data]
    roi = [p["roi"] for p in plant_data]

    fig = make_subplots(specs=[[{"secondary_y": True}]])

    fig.add_trace(go.Bar(
        x=plants, y=on_hand, name="Total Physical On-Hand",
        marker=dict(color="#3b82f6", opacity=0.85)
    ), secondary_y=False)

    fig.add_trace(go.Bar(
        x=plants, y=protected, name="Protected Safety Reserve",
        marker=dict(color="#6366f1", opacity=0.85)
    ), secondary_y=False)

    fig.add_trace(go.Bar(
        x=plants, y=surplus, name="Available Transfer Surplus",
        marker=dict(color="#10b981", opacity=0.85)
    ), secondary_y=False)

    fig.add_trace(go.Scatter(
        x=plants, y=roi, name="Net Arbitrage Benefit (₹)",
        mode="lines+markers",
        line=dict(color="#ea580c", width=3),
        marker=dict(size=8, symbol="diamond")
    ), secondary_y=True)

    fig.update_layout(
        title=dict(
            text="🏭 Multi-Echelon Plant Network: Inventory Balance & Arbitrage ROI",
            font=dict(family=FONT_FAMILY, size=15, color="#1e293b")
        ),
        paper_bgcolor=COLOR_BG,
        plot_bgcolor="rgba(241, 245, 249, 0.5)",
        margin=dict(l=30, r=30, t=50, b=30),
        height=380,
        barmode="group",
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1, font=dict(size=10)),
        font=dict(family=FONT_FAMILY, size=11, color="#64748b")
    )
    fig.update_yaxes(title_text="Physical Inventory (Units)", showgrid=True, gridcolor="#e2e8f0", secondary_y=False)
    fig.update_yaxes(title_text="Arbitrage ROI (₹ INR)", showgrid=False, secondary_y=True)
    return fig


def create_supplier_reliability_radar(suppliers: Optional[List[Dict[str, Any]]] = None) -> go.Figure:
    """
    Creates an executive Radar (Spider) chart comparing critical suppliers across 5 key supply chain KPIs.
    """
    categories = [
        "On-Time Delivery %",
        "Lead Time Predictability",
        "P90 Tail Risk Resilience",
        "Line Starvation Buffer",
        "Order Fulfillment Ratio"
    ]

    if not suppliers:
        suppliers = [
            {"supplier_id": "SUP1004 (Apex Auto)", "scores": [18, 25, 30, 20, 45], "color": "#ef4444"},
            {"supplier_id": "SUP1001 (Global Parts)", "scores": [65, 70, 60, 55, 80], "color": "#f59e0b"},
            {"supplier_id": "SUP1007 (Precision Mach)", "scores": [22, 35, 28, 15, 50], "color": "#dc2626"},
            {"supplier_id": "Benchmark SLA (Target)", "scores": [95, 90, 90, 85, 98], "color": "#10b981"},
        ]

    fig = go.Figure()

    for s in suppliers:
        # Wrap polygon back to starting point
        scores = s["scores"] + [s["scores"][0]]
        cats = categories + [categories[0]]
        fig.add_trace(go.Scatterpolar(
            r=scores,
            theta=cats,
            name=s["supplier_id"],
            line=dict(color=s["color"], width=2),
            fill="toself",
            opacity=0.25
        ))

    fig.update_layout(
        polar=dict(
            radialaxis=dict(
                visible=True,
                range=[0, 100],
                showticklabels=True,
                ticksuffix="%",
                gridcolor="#e2e8f0"
            ),
            angularaxis=dict(gridcolor="#e2e8f0")
        ),
        title=dict(
            text="🕸️ Strategic Supplier Performance & Delivery Risk Radar",
            font=dict(family=FONT_FAMILY, size=15, color="#1e293b")
        ),
        paper_bgcolor=COLOR_BG,
        margin=dict(l=40, r=40, t=50, b=30),
        height=380,
        legend=dict(orientation="h", yanchor="bottom", y=-0.22, xanchor="center", x=0.5, font=dict(size=10)),
        font=dict(family=FONT_FAMILY, size=11, color="#64748b")
    )
    return fig


def create_working_capital_liberation_waterfall(impact_data: Optional[Dict[str, float]] = None) -> go.Figure:
    """
    Creates a financial waterfall visualizing gross capital exposure down to net residual risk
    after autonomous agent mitigations.
    """
    if not impact_data:
        impact_data = {
            "gross_exposure": 2845065.0,
            "sto_avoided_stockouts": 218500.0,
            "phantom_unblocked": 142000.0,
            "aged_po_cancelled": 520000.0,
            "mrp_deduplicated": 85000.0
        }

    gross = impact_data.get("gross_exposure", 2845065.0)
    sto = impact_data.get("sto_avoided_stockouts", 218500.0)
    phantom = impact_data.get("phantom_unblocked", 142000.0)
    aged = impact_data.get("aged_po_cancelled", 520000.0)
    mrp = impact_data.get("mrp_deduplicated", 85000.0)
    total_saved = sto + phantom + aged + mrp
    residual = max(0.0, gross - total_saved)

    x_labels = [
        "Gross Capital at Risk",
        "Twin STO Savings",
        "Phantom Stock Unblocked",
        "Aged PO Decommitted",
        "MRP Clashes Pruned",
        "Net Residual Risk"
    ]
    measures = ["absolute", "relative", "relative", "relative", "relative", "total"]
    y_vals = [gross, -sto, -phantom, -aged, -mrp, residual]
    text_vals = [
        f"₹ {gross:,.0f}",
        f"-₹ {sto:,.0f}",
        f"-₹ {phantom:,.0f}",
        f"-₹ {aged:,.0f}",
        f"-₹ {mrp:,.0f}",
        f"₹ {residual:,.0f}"
    ]

    fig = go.Figure(go.Waterfall(
        name="Capital Liberation",
        orientation="v",
        measure=measures,
        x=x_labels,
        textposition="outside",
        text=text_vals,
        y=y_vals,
        connector={"line": {"color": "#94a3b8"}},
        decreasing={"marker": {"color": "#10b981"}},
        increasing={"marker": {"color": "#ef4444"}},
        totals={"marker": {"color": "#3b82f6"}}
    ))

    fig.update_layout(
        title=dict(
            text="💰 Working Capital Liberation & Cash Flow Preservation (INR)",
            font=dict(family=FONT_FAMILY, size=15, color="#1e293b")
        ),
        paper_bgcolor=COLOR_BG,
        plot_bgcolor="rgba(241, 245, 249, 0.5)",
        margin=dict(l=20, r=20, t=50, b=30),
        height=380,
        showlegend=False,
        font=dict(family=FONT_FAMILY, size=11, color="#64748b"),
        yaxis=dict(showgrid=True, gridcolor="#e2e8f0", title="Capital Impact (₹)")
    )
    return fig


def create_execution_throughput_gauges(telemetry: Optional[Dict[str, Any]] = None) -> go.Figure:
    """
    Creates composite visual indicator gauges showing Agent Sub-Second SLA Latency
    and Autonomous Straight-Through Processing (STP) Rate.
    """
    if not telemetry:
        telemetry = {
            "avg_latency_ms": 2.1,
            "sla_target_ms": 50.0,
            "stp_rate_pct": 87.5,
            "accuracy_pct": 100.0
        }

    lat = float(telemetry.get("avg_latency_ms", 2.1))
    target = float(telemetry.get("sla_target_ms", 50.0))
    stp = float(telemetry.get("stp_rate_pct", 87.5))

    fig = make_subplots(
        rows=1, cols=2,
        specs=[[{"type": "indicator"}, {"type": "indicator"}]]
    )

    # Gauge 1: Execution Latency (ms)
    fig.add_trace(go.Indicator(
        mode="gauge+number+delta",
        value=lat,
        domain={'x': [0, 0.48], 'y': [0, 1]},
        title={'text': "<b>Decision Speed (ms)</b><br><span style='font-size:0.8em;color:#64748b'>SLA Target < 50ms</span>", 'font': {'family': FONT_FAMILY, 'size': 13}},
        number={'suffix': " ms", 'font': {'family': FONT_FAMILY, 'size': 24, 'color': '#0f172a'}},
        delta={'reference': target, 'decreasing': {'color': "#10b981"}, 'increasing': {'color': "#ef4444"}},
        gauge={
            'axis': {'range': [0, 60], 'tickwidth': 1, 'tickcolor': "#94a3b8"},
            'bar': {'color': "#10b981"},
            'bgcolor': "white",
            'borderwidth': 1,
            'bordercolor': "#cbd5e1",
            'steps': [
                {'range': [0, 20], 'color': "rgba(16, 185, 129, 0.15)"},
                {'range': [20, 50], 'color': "rgba(245, 158, 11, 0.15)"},
                {'range': [50, 60], 'color': "rgba(239, 68, 68, 0.15)"}
            ],
            'threshold': {
                'line': {'color': "#dc2626", 'width': 3},
                'thickness': 0.75,
                'value': 50
            }
        }
    ), row=1, col=1)

    # Gauge 2: Straight-Through Processing (STP) Rate
    fig.add_trace(go.Indicator(
        mode="gauge+number",
        value=stp,
        domain={'x': [0.52, 1], 'y': [0, 1]},
        title={'text': "<b>Autonomous STP Rate</b><br><span style='font-size:0.8em;color:#64748b'>Target > 80%</span>", 'font': {'family': FONT_FAMILY, 'size': 13}},
        number={'suffix': "%", 'font': {'family': FONT_FAMILY, 'size': 24, 'color': '#0f172a'}},
        gauge={
            'axis': {'range': [0, 100], 'tickwidth': 1, 'tickcolor': "#94a3b8"},
            'bar': {'color': "#3b82f6"},
            'bgcolor': "white",
            'borderwidth': 1,
            'bordercolor': "#cbd5e1",
            'steps': [
                {'range': [0, 60], 'color': "rgba(239, 68, 68, 0.15)"},
                {'range': [60, 80], 'color': "rgba(245, 158, 11, 0.15)"},
                {'range': [80, 100], 'color': "rgba(59, 130, 246, 0.15)"}
            ],
            'threshold': {
                'line': {'color': "#10b981", 'width': 3},
                'thickness': 0.75,
                'value': 80
            }
        }
    ), row=1, col=2)

    fig.update_layout(
        title=dict(
            text="⚡ Agent Real-Time SLA Speed & Autonomous Throughput",
            font=dict(family=FONT_FAMILY, size=15, color="#1e293b")
        ),
        paper_bgcolor=COLOR_BG,
        margin=dict(l=20, r=20, t=50, b=20),
        height=380,
        font=dict(family=FONT_FAMILY, size=11, color="#64748b")
    )
    return fig

