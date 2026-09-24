import sys
import os
from pathlib import Path

# Ensure root directory is in sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

import streamlit as st
import pandas as pd
from datetime import datetime

from src.core.config import settings
from src.data.path_resolver import PathResolver
from src.data.flat_file_source import FlatFileDataSource
from src.data.manager import data_source_manager, DataSourceMode
from src.agents import get_agent, default_data_source
from src.workflow.approval_manager import approval_manager
from src.ui.data_hub_view import render_data_hub
from src.ui.comic_guidebook import render_comic_guidebook
from src.ui.analytics_dashboard import render_analytics_dashboard
from src.audit.audit_logger import audit_logger
from src.audit.performance_reporter import performance_reporter
from src.advisory.tech_radar import tech_radar
from src.ui.visualizations import (
    create_agent_01_drift_chart,
    create_agent_02_waterfall_chart,
    create_agent_03_logistics_chart,
    create_agent_04_aging_donut,
    create_agent_05_demand_chart
)
from src.ui.triage import get_cross_agent_anomalies

st.set_page_config(
    page_title="SAP Supply Chain Agentic AI Command Center",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ==============================================================================
# PREMIUM MODERN ENTERPRISE STYLING (Google Fonts, Glassmorphism, Micro-Badges)
# ==============================================================================
st.markdown("""
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">

<style>
    html, body, [class*="css"] {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    h1, h2, h3, h4, h5, h6 {
        font-family: 'Outfit', sans-serif !important;
        font-weight: 700 !important;
        letter-spacing: -0.02em;
    }
    code, pre {
        font-family: 'JetBrains Mono', monospace !important;
    }
    .main {
        background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    }
    
    /* Top Header Gradient Banner */
    .top-hero-banner {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e3a8a 100%);
        color: #ffffff;
        padding: 24px 30px;
        border-radius: 16px;
        margin-bottom: 22px;
        box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .top-hero-banner h1 {
        color: #ffffff !important;
        font-size: 1.85rem;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .top-hero-banner p {
        color: #94a3b8;
        font-size: 0.95rem;
        margin: 0;
    }

    /* Executive KPI Card */
    .exec-kpi-card {
        background: #ffffff;
        border-radius: 14px;
        padding: 18px 20px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.04);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        position: relative;
        overflow: hidden;
    }
    .exec-kpi-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04);
    }
    .exec-kpi-label {
        font-size: 0.76rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #64748b;
        margin-bottom: 4px;
    }
    .exec-kpi-value {
        font-family: 'Outfit', sans-serif;
        font-size: 1.65rem;
        font-weight: 700;
        color: #0f172a;
        line-height: 1.1;
    }
    .exec-kpi-sub {
        font-size: 0.78rem;
        color: #94a3b8;
        margin-top: 5px;
    }

    /* Visual Content Box */
    .content-box {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 20px 22px;
        margin-bottom: 18px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03);
    }
    .content-box-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 14px;
        padding-bottom: 10px;
        border-bottom: 1px solid #f1f5f9;
    }
    .content-box-title {
        font-family: 'Outfit', sans-serif;
        font-size: 1.08rem;
        font-weight: 700;
        color: #1e293b;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    /* Pill Badges */
    .pill-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 12px;
        border-radius: 9999px;
        font-size: 0.74rem;
        font-weight: 600;
        letter-spacing: 0.02em;
    }
    .badge-severe { background-color: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
    .badge-high { background-color: #ffedd5; color: #ea580c; border: 1px solid #fdba74; }
    .badge-medium { background-color: #fef3c7; color: #d97706; border: 1px solid #fde68a; }
    .badge-low { background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
    .badge-info { background-color: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
    .badge-purple { background-color: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe; }

    /* Action Directive Banner */
    .directive-banner {
        border-radius: 12px;
        padding: 15px 18px;
        margin-top: 14px;
        margin-bottom: 14px;
        display: flex;
        align-items: flex-start;
        gap: 14px;
    }
    .directive-alert {
        background-color: #fff7ed;
        border: 1px solid #ffedd5;
        border-left: 5px solid #f97316;
        color: #9a3412;
    }
    .directive-danger {
        background-color: #fef2f2;
        border: 1px solid #fee2e2;
        border-left: 5px solid #ef4444;
        color: #991b1b;
    }
    .directive-success {
        background-color: #f0fdf4;
        border: 1px solid #dcfce7;
        border-left: 5px solid #10b981;
        color: #166534;
    }
    .directive-title {
        font-family: 'Outfit', sans-serif;
        font-weight: 700;
        font-size: 1.02rem;
        margin-bottom: 4px;
    }
    .directive-desc {
        font-size: 0.88rem;
        line-height: 1.4;
    }

    /* AI Executive Memo Card */
    .ai-memo-card {
        background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%);
        border: 1px solid #cbd5e1;
        border-left: 5px solid #6366f1;
        border-radius: 12px;
        padding: 18px 20px;
        position: relative;
    }
    .ai-memo-text {
        font-size: 0.93rem;
        line-height: 1.6;
        color: #1e293b;
        font-weight: 450;
    }

    /* Metric Grid Cells */
    .metric-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 12px;
        margin-top: 10px;
    }
    .metric-cell {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 12px 14px;
    }
    .metric-cell-label {
        font-size: 0.72rem;
        font-weight: 600;
        text-transform: uppercase;
        color: #64748b;
    }
    .metric-cell-val {
        font-family: 'Outfit', sans-serif;
        font-size: 1.25rem;
        font-weight: 700;
        color: #0f172a;
        margin-top: 4px;
    }

    /* Progress bar */
    .custom-progress {
        background-color: #e2e8f0;
        border-radius: 9999px;
        height: 8px;
        overflow: hidden;
        margin-top: 8px;
    }
    .custom-progress-fill {
        height: 100%;
        border-radius: 9999px;
        transition: width 0.3s ease;
    }

    /* Triage card */
    .triage-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
        transition: transform 0.15s ease, border-color 0.15s ease;
    }
    .triage-card:hover {
        transform: translateX(4px);
        border-color: #93c5fd;
    }
</style>
""", unsafe_allow_html=True)

# ─── Sidebar Branding ────────────────────────────────────────────────────────
st.sidebar.markdown("""
<div style="display:flex; align-items:center; gap:12px; padding:4px 0 12px 0;">
    <div style="font-size:2.2rem; line-height:1;">🏭</div>
    <div>
        <div style="font-family:'Outfit',sans-serif; font-size:1.1rem; font-weight:800; color:#0f172a; letter-spacing:-0.02em;">SAP Control Tower</div>
        <div style="font-size:0.72rem; color:#64748b; font-weight:500; margin-top:1px;">Enterprise Agentic AI Platform</div>
    </div>
</div>
""", unsafe_allow_html=True)

# ─── Data Source Quick Selector ──────────────────────────────────────────────
status_info = data_source_manager.get_status()
curr_mode = status_info["active_mode"]
_mode_color = '#10b981' if curr_mode == 'SYNTHETIC' else '#3b82f6' if curr_mode == 'CUSTOM_FLAT_FILE' else '#a855f7'
_mode_icon  = '🟢' if curr_mode == 'SYNTHETIC' else '📂' if curr_mode == 'CUSTOM_FLAT_FILE' else '🗄️'
st.sidebar.markdown(f"""
<div style="background:linear-gradient(135deg,#0f172a,#1e293b); border:1px solid #334155; border-radius:10px;
            padding:0.6rem 0.85rem; margin-bottom:0.75rem;">
    <span style="font-size:0.68rem; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em;">Active Data Source</span><br/>
    <div style="display:flex; align-items:center; gap:6px; margin-top:3px;">
        <span style="font-size:1rem;">{_mode_icon}</span>
        <b style="font-size:0.88rem; color:{_mode_color};">{status_info['display_name']}</b>
    </div>
</div>
""", unsafe_allow_html=True)

mode_selector_idx = 0 if curr_mode == "SYNTHETIC" else 1 if curr_mode == "CUSTOM_FLAT_FILE" else 2
quick_mode = st.sidebar.selectbox(
    "Switch Data Mode",
    options=["SYNTHETIC", "CUSTOM_FLAT_FILE", "DATABASE"],
    index=mode_selector_idx,
    format_func=lambda m: (
        "🟢 Synthetic Demo Data" if m == "SYNTHETIC" else
        "📂 My Files / Folder" if m == "CUSTOM_FLAT_FILE" else
        "🗄️ Database (SQL)"
    ),
    key="quick_sidebar_data_mode"
)
if quick_mode != curr_mode:
    data_source_manager.set_mode(DataSourceMode(quick_mode))
    st.rerun()

# Contextual controls for data mode
if curr_mode == "CUSTOM_FLAT_FILE":
    with st.sidebar.expander("📂 Ingest Local Folder", expanded=True):
        sb_folder = st.text_input(
            "Folder Path",
            value=status_info.get("active_folder_path") or str(Path("data/custom_uploads").resolve()),
            key="sb_folder_input",
            help="Full path to folder containing your CSV/Excel files"
        )
        if st.button("🔄 Scan & Load Folder", key="sb_btn_ingest_folder", use_container_width=True):
            try:
                res = data_source_manager.ingest_custom_folder(sb_folder)
                st.success(f"✅ Loaded {len(res.get('tables_ingested', []))} tables!")
                st.rerun()
            except Exception as e:
                st.error(f"Error: {e}")

elif curr_mode == "DATABASE":
    with st.sidebar.expander("🗄️ Database Connection", expanded=True):
        saved = data_source_manager.get_saved_db_profiles()
        if saved:
            p_names = [p["name"] for p in saved]
            chosen_p = st.selectbox("Saved Profiles", p_names, key="sb_saved_db_select")
            if st.button("🔌 Use Profile", key="sb_switch_profile_btn", use_container_width=True):
                prof = next(p for p in saved if p["name"] == chosen_p)
                data_source_manager.configure_database(prof["connection_url"], activate=True)
                st.rerun()
        sb_db_url = st.text_input(
            "Connection URL",
            value=data_source_manager.active_db_url or "sqlite:///data/demo_sap.db",
            key="sb_db_url_input",
            help="e.g. postgresql://user:pass@host/db  or  sqlite:///path.db"
        )
        if st.button("💾 Test & Connect", key="sb_btn_connect_db", use_container_width=True):
            res = data_source_manager.configure_database(sb_db_url, activate=True)
            if res.get("test_result", {}).get("status") == "CONNECTED":
                st.success("✅ Connected!")
                st.rerun()
            else:
                st.error(f"Failed: {res.get('test_result', {}).get('error')}")

st.sidebar.markdown("---")

# ─── Grouped Navigation ───────────────────────────────────────────────────────
# Initialise session-state routing key
if "nav_view" not in st.session_state:
    st.session_state["nav_view"] = "TRIAGE"

def _nav_btn(label: str, key: str, icon: str = ""):
    """Render a full-width sidebar nav button, highlighted when active."""
    is_active = st.session_state["nav_view"] == key
    bg = "#1e3a8a" if is_active else "transparent"
    color = "#ffffff" if is_active else "#334155"
    border = "1px solid #3b82f6" if is_active else "1px solid transparent"
    if st.sidebar.button(
        f"{icon}  {label}",
        key=f"nav_{key}",
        use_container_width=True,
    ):
        st.session_state["nav_view"] = key
        st.rerun()

st.sidebar.markdown("""
<div style="font-size:0.68rem; font-weight:700; color:#94a3b8; text-transform:uppercase;
            letter-spacing:0.1em; padding:4px 4px 6px 4px; margin-top:4px;">⚡ Operations Hub</div>
""", unsafe_allow_html=True)
_nav_btn("Live Anomaly Triage",     "TRIAGE",    "🚨")
_nav_btn("Agent Investigation",     "COCKPIT",   "🔬")
_nav_btn("Scenario Simulation",     "SCENARIO",  "🧪")

st.sidebar.markdown("""
<div style="font-size:0.68rem; font-weight:700; color:#94a3b8; text-transform:uppercase;
            letter-spacing:0.1em; padding:10px 4px 6px 4px;">📊 Intelligence</div>
""", unsafe_allow_html=True)
_nav_btn("Executive Analytics",     "ANALYTICS", "📈")
_nav_btn("Data Sources & Upload",   "DATA_HUB",  "🗃️")

st.sidebar.markdown("""
<div style="font-size:0.68rem; font-weight:700; color:#94a3b8; text-transform:uppercase;
            letter-spacing:0.1em; padding:10px 4px 6px 4px;">🛡️ Governance</div>
""", unsafe_allow_html=True)
_nav_btn("Approvals & Authorization", "APPROVALS", "⚖️")
_nav_btn("Compliance & Audit Trail",  "AUDIT",     "📜")
_nav_btn("Performance Reports",       "PERF",      "📊")

st.sidebar.markdown("""
<div style="font-size:0.68rem; font-weight:700; color:#94a3b8; text-transform:uppercase;
            letter-spacing:0.1em; padding:10px 4px 6px 4px;">📖 Learn</div>
""", unsafe_allow_html=True)
_nav_btn("Agent Operations Guide",  "GUIDEBOOK", "📖")

st.sidebar.markdown("---")
st.sidebar.markdown(f"""
<div style="font-size:0.72rem; color:#94a3b8; line-height:1.7;">
    <b style="color:#64748b;">Runtime:</b> Python <code>{sys.version.split()[0]}</code><br/>
    <b style="color:#64748b;">LLM:</b> <code>{settings.OLLAMA_MODEL}</code><br/>
    <b style="color:#64748b;">SAP Mode:</b>
    <span style="color:{'#10b981' if not settings.ENABLE_WRITE_ACTIONS else '#ef4444'};">
        {'🔒 Safe Simulation' if not settings.ENABLE_WRITE_ACTIONS else '⚡ Live Writes'}
    </span>
</div>
""", unsafe_allow_html=True)

# Resolve view_mode for existing routing logic
_VIEW_MAP = {
    "TRIAGE":    "🔥 Live Anomaly Triage Feed",
    "COCKPIT":   "🚀 Agent Investigation Cockpit",
    "SCENARIO":  "🧪 Scenario Simulation Lab",
    "ANALYTICS": "📈 Executive Analytics & Intelligence Dashboard",
    "DATA_HUB":  "📁 Data Sources & Ingestion Hub",
    "APPROVALS": "⚖️ Human-in-the-Loop Approvals Desk",
    "AUDIT":     "📜 Compliance & Audit Trail",
    "PERF":      "📊 Timely Performance & SLA Reports",
    "GUIDEBOOK": "📖 Agent Operations Guidebook",
}
view_mode = _VIEW_MAP.get(st.session_state["nav_view"], "🔥 Live Anomaly Triage Feed")


resolver = PathResolver()

# ==============================================================================
# VISUAL RENDERING HELPERS WITH PLOTLY INTEGRATION
# ==============================================================================

def render_agent_01_visuals(metrics: dict, policy: dict):
    s_stats = metrics.get("supplier_stats", {})
    down = metrics.get("downstream_metrics", {})

    late_rate = float(s_stats.get("late_delivery_rate_pct", 0.0))
    avg_delay = float(s_stats.get("avg_delay_days", 0.0))
    p90_delay = float(s_stats.get("p90_delay_days", 0.0))
    sup_id = s_stats.get("supplier_id", "N/A")
    profile = s_stats.get("behavior_profile", "MODERATE_VARIABILITY")

    cover_days = int(down.get("days_of_cover_without_po", 0))
    exposure_val = float(down.get("estimated_exposure_value", 0.0))
    prod_orders = int(down.get("affected_production_orders", 0))
    sales_orders = int(down.get("affected_sales_orders", 0))
    units_risk = int(down.get("production_units_at_risk", 0))
    criticality = down.get("material_criticality", "Medium")

    risk_score = float(policy.get("risk_score", 0.0))
    risk_band = str(policy.get("risk_band", "MEDIUM")).upper()
    action = str(policy.get("default_action", "MONITOR")).replace("_", " ")
    pred_drift = float(policy.get("predicted_drift_days", 0.0))

    band_class = "badge-severe" if risk_band in ["SEVERE", "CRITICAL"] else ("badge-high" if risk_band == "HIGH" else "badge-medium")

    # Interactive Plotly Chart
    fig = create_agent_01_drift_chart(s_stats, policy)
    st.plotly_chart(fig, use_container_width=True)

    # Supplier Performance Card
    st.markdown(f"""
    <div class="content-box">
        <div class="content-box-header">
            <div class="content-box-title">
                🏢 Supplier Reliability Profile: <code>{sup_id}</code>
            </div>
            <span class="pill-badge badge-info">{profile.replace('_', ' ')}</span>
        </div>
        <div class="metric-grid">
            <div class="metric-cell">
                <div class="metric-cell-label">Historical Deliveries</div>
                <div class="metric-cell-val">{s_stats.get('historical_delivery_count', 0):,}</div>
            </div>
            <div class="metric-cell">
                <div class="metric-cell-label">Late Delivery Rate</div>
                <div class="metric-cell-val" style="color: {'#dc2626' if late_rate > 50 else '#d97706'};">{late_rate:.1f}%</div>
            </div>
            <div class="metric-cell">
                <div class="metric-cell-label">Avg Delivery Drift</div>
                <div class="metric-cell-val">{avg_delay:.2f} <small style="font-size:0.8rem; font-weight:normal;">days</small></div>
            </div>
            <div class="metric-cell">
                <div class="metric-cell-label">90th Percentile Delay</div>
                <div class="metric-cell-val">{p90_delay:.1f} <small style="font-size:0.8rem; font-weight:normal;">days</small></div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Downstream Manufacturing Exposure Card
    cover_color = "#ef4444" if cover_days <= 1 else ("#f59e0b" if cover_days <= 3 else "#10b981")
    st.markdown(f"""
    <div class="content-box">
        <div class="content-box-header">
            <div class="content-box-title">
                ⚠️ Downstream Manufacturing Exposure
            </div>
            <span class="pill-badge badge-purple">Criticality: {criticality}</span>
        </div>
        <div class="metric-grid">
            <div class="metric-cell">
                <div class="metric-cell-label">Stock Cover Remaining</div>
                <div class="metric-cell-val" style="color: {cover_color};">{cover_days} days</div>
            </div>
            <div class="metric-cell">
                <div class="metric-cell-label">At-Risk Financial Exposure</div>
                <div class="metric-cell-val" style="color: #dc2626;">₹ {exposure_val:,.2f}</div>
            </div>
            <div class="metric-cell">
                <div class="metric-cell-label">Prod Orders Threatened</div>
                <div class="metric-cell-val">{prod_orders} orders</div>
            </div>
            <div class="metric-cell">
                <div class="metric-cell-label">Sales Orders Impacted</div>
                <div class="metric-cell-val">{sales_orders} orders</div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Policy Action Directive Banner
    st.markdown(f"""
    <div class="content-box">
        <div class="content-box-header">
            <div class="content-box-title">
                📜 Corporate Purchasing Policy Resolution
            </div>
            <span class="pill-badge {band_class}">Risk Band: {risk_band}</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <div>
                <span style="font-size: 0.85rem; color: #64748b; font-weight: 500;">Calculated Empirical Risk Index:</span>
                <span style="font-family: 'Outfit'; font-size: 1.25rem; font-weight: 700; margin-left: 8px; color: #0f172a;">{risk_score:.1f} / 100</span>
            </div>
            <div>
                <span style="font-size: 0.85rem; color: #64748b; font-weight: 500;">Predicted Supplier Drift:</span>
                <span style="font-family: 'Outfit'; font-size: 1.25rem; font-weight: 700; margin-left: 8px; color: #ea580c;">+{pred_drift:.1f} days</span>
            </div>
        </div>
        <div class="directive-banner {'directive-danger' if risk_band in ['SEVERE', 'CRITICAL'] else 'directive-alert'}">
            <div style="font-size: 1.8rem; line-height: 1;">⚡</div>
            <div>
                <div class="directive-title">Mandated Policy Action: {action}</div>
                <div class="directive-desc">
                    Based on empirical late probability of {late_rate:.1f}% and severe buffer depletion ({cover_days} days of cover), purchasing rules require proactive buyer engagement to avert manufacturing line stoppage.
                </div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)


def render_agent_02_visuals(metrics: dict, policy: dict):
    pm = metrics.get("phantom_metrics", {})
    p_qty = float(pm.get("physical_qty", 0.0))
    u_qty = float(pm.get("usable_qty", 0.0))
    ph_qty = float(pm.get("phantom_qty", 0.0))
    ph_ratio = float(pm.get("phantom_ratio", 0.0)) * 100
    cause = str(pm.get("primary_phantom_cause", "NONE")).replace("_", " ")
    risk = str(pm.get("phantom_risk", "NONE"))
    action = str(policy.get("recommended_action", "NO_ACTION_HEALTHY")).replace("_", " ")
    rationale = str(policy.get("action_rationale", ""))
    breakdown = pm.get("unavailable_breakdown", {})

    risk_class = "badge-severe" if risk == "HIGH" else ("badge-high" if risk == "MEDIUM" else "badge-low")

    # Interactive Plotly Waterfall
    fig = create_agent_02_waterfall_chart(pm)
    st.plotly_chart(fig, use_container_width=True)

    st.markdown(f"""
    <div class="content-box">
        <div class="content-box-header">
            <div class="content-box-title">
                📦 Physical vs. Operationally Usable Stock Reconciliation
            </div>
            <span class="pill-badge {risk_class}">Phantom Risk: {risk}</span>
        </div>
        <div class="metric-grid">
            <div class="metric-cell">
                <div class="metric-cell-label">Physical Recorded Stock</div>
                <div class="metric-cell-val">{p_qty:,.1f} units</div>
            </div>
            <div class="metric-cell">
                <div class="metric-cell-label">Operationally Usable Stock</div>
                <div class="metric-cell-val" style="color: #059669;">{u_qty:,.1f} units</div>
            </div>
            <div class="metric-cell">
                <div class="metric-cell-label">Phantom (Unusable) Stock</div>
                <div class="metric-cell-val" style="color: #dc2626;">{ph_qty:,.1f} units</div>
            </div>
            <div class="metric-cell">
                <div class="metric-cell-label">Phantom Deficit Ratio</div>
                <div class="metric-cell-val">{ph_ratio:.1f}%</div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Breakdown Grid
    st.markdown(f"""
    <div class="content-box">
        <div class="content-box-header">
            <div class="content-box-title">
                🔍 Unusable Inventory Isolation Breakdown
            </div>
            <span class="pill-badge badge-info">Warehouse Bin Audit</span>
        </div>
        <div class="metric-grid">
            <div class="metric-cell">
                <div class="metric-cell-label">Blocked Status</div>
                <div class="metric-cell-val">{breakdown.get('STATUS_BLOCKED', 0):,.1f}</div>
            </div>
            <div class="metric-cell">
                <div class="metric-cell-label">Quality Hold (QM)</div>
                <div class="metric-cell-val">{breakdown.get('QUALITY_HOLD', 0):,.1f}</div>
            </div>
            <div class="metric-cell">
                <div class="metric-cell-label">Committed Reservations</div>
                <div class="metric-cell-val">{breakdown.get('RESERVED_COMMITMENT', 0):,.1f}</div>
            </div>
            <div class="metric-cell">
                <div class="metric-cell-label">Wrong Bin / Relocate</div>
                <div class="metric-cell-val">{breakdown.get('WRONG_LOCATION', 0):,.1f}</div>
            </div>
        </div>
        <div class="directive-banner {'directive-danger' if risk == 'HIGH' else 'directive-alert'}">
            <div style="font-size: 1.8rem; line-height: 1;">🛡️</div>
            <div>
                <div class="directive-title">Mandated Resolution: {action}</div>
                <div class="directive-desc">{rationale}</div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)


def render_agent_03_visuals(metrics: dict, policy: dict):
    sp = metrics.get("source_protection", {})
    ec = metrics.get("economics", {})

    src_oh = float(sp.get("source_on_hand", 0.0))
    src_prot = float(sp.get("source_protected_stock", 0.0))
    src_surplus = float(sp.get("available_source_surplus", 0.0))
    
    feas_qty = float(ec.get("feasible_transfer_qty", 0.0))
    val_moved = float(ec.get("inventory_value_moved", 0.0))
    avoided_stockout = float(ec.get("avoided_stockout_cost", 0.0))
    decision = str(ec.get("decision", "TRANSFER_RECOMMENDED")).replace("_", " ")
    reason = str(ec.get("decision_reason", ""))

    # Interactive Plotly Logistics ROI Bar Chart
    fig = create_agent_03_logistics_chart(ec, sp)
    st.plotly_chart(fig, use_container_width=True)

    st.markdown(f"""
    <div class="content-box">
        <div class="content-box-header">
            <div class="content-box-title">
                🛡️ Source Plant Safety Stock Shield
            </div>
            <span class="pill-badge badge-low">Demand Guard Active</span>
        </div>
        <div class="metric-grid">
            <div class="metric-cell">
                <div class="metric-cell-label">Source On-Hand Stock</div>
                <div class="metric-cell-val">{src_oh:,.1f} units</div>
            </div>
            <div class="metric-cell">
                <div class="metric-cell-label">Protected Reserve (30d+SS)</div>
                <div class="metric-cell-val" style="color: #6366f1;">{src_prot:,.1f} units</div>
            </div>
            <div class="metric-cell">
                <div class="metric-cell-label">Safe Transfer Surplus</div>
                <div class="metric-cell-val" style="color: #059669;">{src_surplus:,.1f} units</div>
            </div>
            <div class="metric-cell">
                <div class="metric-cell-label">Feasible Transfer Qty</div>
                <div class="metric-cell-val">{feas_qty:,.1f} units</div>
            </div>
        </div>
        <div class="directive-banner directive-success">
            <div style="font-size: 1.8rem; line-height: 1;">🚚</div>
            <div>
                <div class="directive-title">Policy Decision: {decision}</div>
                <div class="directive-desc">{reason}</div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)


def render_agent_04_visuals(metrics: dict, policy: dict):
    am = metrics.get("aging_metrics", {})
    ord_q = float(am.get("ordered_qty", 0.0))
    rec_q = float(am.get("received_qty", 0.0))
    rem_q = float(am.get("remaining_qty", 0.0))
    rem_val = float(am.get("po_value_remaining", 0.0))
    aging_days = int(am.get("aging_days", 0))
    due_days = int(am.get("due_days", 0))

    root_cause = str(policy.get("root_cause", "UNKNOWN")).replace("_", " ")
    action = str(policy.get("recommended_action", "KEEP_OPEN")).replace("_", " ")
    rationale = str(policy.get("rationale", ""))
    priority = str(policy.get("priority", "MEDIUM"))

    p_class = "badge-severe" if priority == "HIGH" else ("badge-high" if priority == "MEDIUM" else "badge-low")

    # Interactive Donut Chart
    fig = create_agent_04_aging_donut(am, policy)
    st.plotly_chart(fig, use_container_width=True)

    st.markdown(f"""
    <div class="content-box">
        <div class="content-box-header">
            <div class="content-box-title">
                ⏳ Purchase Order Aging & Lifecycle Status
            </div>
            <span class="pill-badge {p_class}">Priority: {priority}</span>
        </div>
        <div class="metric-grid">
            <div class="metric-cell">
                <div class="metric-cell-label">Days Open (Aging)</div>
                <div class="metric-cell-val" style="color: {'#dc2626' if aging_days > 90 else '#0f172a'};">{aging_days} days</div>
            </div>
            <div class="metric-cell">
                <div class="metric-cell-label">Days Overdue</div>
                <div class="metric-cell-val">{due_days} days</div>
            </div>
            <div class="metric-cell">
                <div class="metric-cell-label">Residual Open Quantity</div>
                <div class="metric-cell-val">{rem_q:,.0f} units</div>
            </div>
            <div class="metric-cell">
                <div class="metric-cell-label">Open Commitment Value</div>
                <div class="metric-cell-val" style="color: #2563eb;">₹ {rem_val:,.2f}</div>
            </div>
        </div>
        <div class="directive-banner {'directive-alert' if action != 'KEEP_OPEN' else 'directive-success'}">
            <div style="font-size: 1.8rem; line-height: 1;">📋</div>
            <div>
                <div class="directive-title">Purchasing Directive: {action}</div>
                <div class="directive-desc">Root Cause: <b>{root_cause}</b>. {rationale}</div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)


def render_agent_05_visuals(metrics: dict, policy: dict):
    c_type = str(policy.get("contradiction_type", "UNKNOWN")).replace("_", " ")
    action = str(policy.get("recommended_action", "KEEP_BOTH")).replace("_", " ")
    rationale = str(policy.get("rationale", ""))
    req_ids = str(metrics.get("contradiction_analysis", {}).get("affected_requirements", "Cluster Requirements"))
    net_demand = float(metrics.get("net_demand", 0.0))

    type_class = "badge-low" if "VALID" in c_type else "badge-severe"

    # Interactive Bar Chart
    fig = create_agent_05_demand_chart(metrics, policy)
    st.plotly_chart(fig, use_container_width=True)

    st.markdown(f"""
    <div class="content-box">
        <div class="content-box-header">
            <div class="content-box-title">
                🧩 Demand Cluster Disambiguation
            </div>
            <span class="pill-badge {type_class}">{c_type}</span>
        </div>
        <div class="metric-grid">
            <div class="metric-cell" style="grid-column: span 2;">
                <div class="metric-cell-label">Clustered Requirements Tracked</div>
                <div class="metric-cell-val" style="font-size: 1.05rem; color: #2563eb;"><code>{req_ids}</code></div>
            </div>
            <div class="metric-cell">
                <div class="metric-cell-label">Reconciled Net Demand</div>
                <div class="metric-cell-val">{net_demand:,.0f} units</div>
            </div>
        </div>
        <div class="directive-banner {'directive-success' if 'VALID' in c_type else 'directive-danger'}">
            <div style="font-size: 1.8rem; line-height: 1;">🎯</div>
            <div>
                <div class="directive-title">MRP Action: {action}</div>
                <div class="directive-desc">{rationale}</div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)


# ==============================================================================
# VIEW 1: LIVE ANOMALY TRIAGE FEED (CROSS-AGENT PRIORITY INBOX)
# ==============================================================================
if view_mode == "🔥 Live Anomaly Triage Feed":
    st.markdown("""
    <div class="top-hero-banner">
        <h1>🔥 Cross-Agent Anomaly Triage & Priority Command Center</h1>
        <p>Continuous automated anomaly detection across all 5 specialized SAP agents, ranked by urgency and financial exposure.</p>
    </div>
    """, unsafe_allow_html=True)

    anomalies = get_cross_agent_anomalies()

    total_exposure = sum(a["financial_impact"] for a in anomalies)
    crit_count = sum(1 for a in anomalies if a["priority"] == "CRITICAL")
    high_count = sum(1 for a in anomalies if a["priority"] == "HIGH")

    k1, k2, k3, k4 = st.columns(4)
    with k1:
        st.markdown(f"""
        <div class="exec-kpi-card">
            <div class="exec-kpi-label">At-Risk Financial Exposure</div>
            <div class="exec-kpi-value" style="color: #dc2626;">₹ {total_exposure:,.2f}</div>
            <div class="exec-kpi-sub">Across 8 active anomalies</div>
        </div>
        """, unsafe_allow_html=True)
    with k2:
        st.markdown(f"""
        <div class="exec-kpi-card">
            <div class="exec-kpi-label">Critical Disruptions</div>
            <div class="exec-kpi-value" style="color: #ef4444;">{crit_count}</div>
            <div class="exec-kpi-sub">Immediate line starvation risk</div>
        </div>
        """, unsafe_allow_html=True)
    with k3:
        st.markdown(f"""
        <div class="exec-kpi-card">
            <div class="exec-kpi-label">High Priority Anomalies</div>
            <div class="exec-kpi-value" style="color: #ea580c;">{high_count}</div>
            <div class="exec-kpi-sub">Cross-plant & demand collisions</div>
        </div>
        """, unsafe_allow_html=True)
    with k4:
        st.markdown(f"""
        <div class="exec-kpi-card">
            <div class="exec-kpi-label">Autonomous Triage Engine</div>
            <div class="exec-kpi-value" style="color: #059669;">100% Active</div>
            <div class="exec-kpi-sub">Multi-agent scanning operational</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)
    st.markdown("### 📋 Prioritized Anomaly Triage Queue")

    filter_urgency = st.radio("Filter By Priority:", ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"], horizontal=True)

    filtered_anomalies = [a for a in anomalies if filter_urgency == "ALL" or a["priority"] == filter_urgency]

    for item in filtered_anomalies:
        p_badge = "badge-severe" if item["priority"] == "CRITICAL" else ("badge-high" if item["priority"] == "HIGH" else ("badge-medium" if item["priority"] == "MEDIUM" else "badge-low"))
        
        col_card, col_action = st.columns([4, 1])
        with col_card:
            st.markdown(f"""
            <div class="triage-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div>
                        <span class="pill-badge {p_badge}">{item['priority']}</span>
                        <b style="font-size: 1.05rem; margin-left: 8px; color: #0f172a;">{item['target_object']}</b>
                        <span style="color: #64748b; font-size: 0.85rem; margin-left: 8px;">({item['agent_name']})</span>
                    </div>
                    <div style="font-family: 'Outfit'; font-size: 1.15rem; font-weight: 700; color: #dc2626;">
                        ₹ {item['financial_impact']:,.2f}
                    </div>
                </div>
                <p style="color: #334155; font-size: 0.92rem; margin: 0 0 6px 0;">{item['summary']}</p>
                <div style="font-size: 0.8rem; color: #64748b;">
                    <b>Policy Action:</b> <code>{item['recommended_action']}</code> | <b>HITL Status:</b> <code>{item['hitl_status']}</code>
                </div>
            </div>
            """, unsafe_allow_html=True)
        with col_action:
            st.markdown("<div style='height: 18px;'></div>", unsafe_allow_html=True)
            if st.button(f"⚡ Investigate", key=f"triage_{item['case_id']}_{item['agent_id']}", use_container_width=True):
                st.session_state["selected_agent_key"] = item["agent_id"]
                st.session_state["selected_case_id"] = item["case_id"]
                st.session_state["trigger_auto_run"] = True
                st.success(f"Dispatched case {item['case_id']} to {item['agent_name']}! Switch to Cockpit view.")


# ==============================================================================
# VIEW 1.5: EXECUTIVE ANALYTICS & VISUAL INTELLIGENCE DASHBOARD
# ==============================================================================
elif view_mode == "📈 Executive Analytics & Intelligence Dashboard":
    render_analytics_dashboard()

# ==============================================================================
# VIEW 2: AGENT INVESTIGATION COCKPIT
# ==============================================================================
elif view_mode == "🚀 Agent Investigation Cockpit":
    st.markdown("""
    <div class="top-hero-banner">
        <h1>🔬 Agent Investigation Cockpit</h1>
        <p>Select a specialist AI agent, choose a scenario, and run a real-time supply chain investigation. Each agent analyses the situation, calculates risk, and proposes a recommended action.</p>
    </div>
    """, unsafe_allow_html=True)

    # Pick up pre-selection from Triage Feed if active
    default_agent = st.session_state.get("selected_agent_key", "agent_01")
    agent_list = [
        ("agent_01", "🚚 Agent 1 — Delivery Truth Teller (PO Promise Drift)"),
        ("agent_02", "👻 Agent 2 — Phantom Inventory Hunter (Stock Reality Check)"),
        ("agent_03", "🏗️ Agent 3 — Inter-Plant Matchmaker (Sister Plant Arbitrage)"),
        ("agent_04", "🧟 Agent 4 — Zombie PO Terminator (Aging PO Cleanup)"),
        ("agent_05", "🌪️ Agent 5 — MRP Chaos Tamer (Requirement Contradiction)"),
    ]
    agent_idx = next((i for i, a in enumerate(agent_list) if a[0] == default_agent), 0)

    col_agent, col_case = st.columns([1, 1])

    with col_agent:
        agent_selection = st.selectbox(
            "🤖 Choose Your Specialist Agent",
            agent_list,
            index=agent_idx,
            format_func=lambda x: x[1]
        )
        selected_agent_key = agent_selection[0]

    with col_case:
        active_ds = data_source_manager.get_active_source()
        cases = active_ds.get_demo_cases(selected_agent_key)
        if not cases:
            cases = default_data_source.get_demo_cases(selected_agent_key)
        case_options = []
        for i, c in enumerate(cases):
            cid = c.get("case_id") or c.get("po_number") or c.get("stock_id") or c.get("transfer_option_id") or f"CASE_{i+1}"
            scen = c.get("demo_scenario") or c.get("root_cause") or c.get("contradiction_type") or "Scenario"
            case_options.append((cid, f"{cid} — {scen}"))

        default_case = st.session_state.get("selected_case_id")
        case_idx = next((i for i, c in enumerate(case_options) if c[0] == default_case), 0) if default_case else 0

        selected_case_tuple = st.selectbox(
            "Select Scenario / Demonstration Case",
            case_options,
            index=case_idx,
            format_func=lambda x: x[1] if x else "No cases"
        )
        selected_case_id = selected_case_tuple[0] if selected_case_tuple else None

    meta = resolver.get_metadata(selected_agent_key)
    st.info(f"📍 **Domain Focus:** {meta['domain']}  |  🎯 **Agent Objective:** {meta['description']}")

    with st.expander("💡 Why do I choose a specific agent? (Quick Business Guide)", expanded=False):
        st.markdown("""
        **Each agent is a specialist — like different doctors in a hospital.**
        
        | Agent | Plain-English Role | Best For |
        |---|---|---|
        | 🚚 **Agent 01** | Delivery Truth Teller | Check if a supplier is *actually* going to deliver on time |
        | 👻 **Agent 02** | Phantom Inventory Hunter | Find out how much stock is *really* usable (not just what SAP shows) |
        | 🏗️ **Agent 03** | Inter-Plant Matchmaker | See if a sister plant can cover a shortage instead of buying new |
        | 🧟 **Agent 04** | Zombie PO Terminator | Clean up old, unfulfilled purchase orders tying up cash |
        | 🌪️ **Agent 05** | MRP Chaos Tamer | Stop MRP from creating contradictory, unstable plans |
        
        💡 **Not sure which to pick?** Visit the **Agent Operations Guide** (in the sidebar) for a step-by-step decision guide by situation and job role.
        """)

    run_pressed = st.button("🚀 Execute Autonomous LangGraph Workflow", type="primary", use_container_width=True)
    auto_trigger = st.session_state.pop("trigger_auto_run", False)

    if run_pressed or auto_trigger:
        with st.spinner(f"Executing deterministic math and LangGraph state machine for {meta['name']} on case {selected_case_id}..."):
            agent_wf = get_agent(selected_agent_key)
            initial_state = {
                "case_id": selected_case_id,
                "input_data": {}
            }
            result_state = agent_wf.run(initial_state)
            st.session_state[f"last_result_{selected_agent_key}"] = result_state

    # Display Result
    last_res = st.session_state.get(f"last_result_{selected_agent_key}")
    if last_res:
        st.markdown("---")
        
        # Header Metrics Bar
        rec = last_res.get("recommendation") or {}
        policy = last_res.get("policy_evaluation") or {}
        metrics = last_res.get("deterministic_metrics") or {}
        band = policy.get("risk_band") or policy.get("root_cause") or policy.get("contradiction_type") or policy.get("decision") or "ACTIVE"
        impact = rec.get("estimated_economic_impact", 0.0)

        k1, k2, k3, k4 = st.columns(4)
        with k1:
            st.markdown(f"""
            <div class="exec-kpi-card">
                <div class="exec-kpi-label">Operational Diagnosis</div>
                <div class="exec-kpi-value" style="font-size:1.35rem;">{str(band)[:22]}</div>
                <div class="exec-kpi-sub">Case: <code>{last_res.get('case_id')}</code></div>
            </div>
            """, unsafe_allow_html=True)
        with k2:
            conf = int(last_res.get('confidence_score', 1.0) * 100)
            st.markdown(f"""
            <div class="exec-kpi-card">
                <div class="exec-kpi-label">Confidence Score</div>
                <div class="exec-kpi-value" style="color: #059669;">{conf}%</div>
                <div class="exec-kpi-sub">Deterministic validation verified</div>
            </div>
            """, unsafe_allow_html=True)
        with k3:
            lat = last_res.get('latency_ms', 0)
            st.markdown(f"""
            <div class="exec-kpi-card">
                <div class="exec-kpi-label">Workflow Latency</div>
                <div class="exec-kpi-value">{lat:.2f} <small style="font-size:0.9rem; font-weight:normal;">ms</small></div>
                <div class="exec-kpi-sub">Real-time sub-second execution</div>
            </div>
            """, unsafe_allow_html=True)
        with k4:
            st.markdown(f"""
            <div class="exec-kpi-card">
                <div class="exec-kpi-label">Economic Value Protected</div>
                <div class="exec-kpi-value" style="color: #2563eb;">₹ {impact:,.2f}</div>
                <div class="exec-kpi-sub">Avoided stockout / capital defended</div>
            </div>
            """, unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)

        # UNAI token economics -- this app is Streamlit (no browser fetch()
        # hook like the Node/TS conversions in this series use), so the
        # real per-run token comparison (agents/unai/bridge.cjs, wired in
        # via src/agents/unai_bridge.py's node_llm_reasoning swap) is
        # rendered natively here instead of via an injected corner badge.
        tc = last_res.get("unai_token_comparison")
        if tc:
            with st.expander("💰 UNAI Token Economics — this agent's real LLM call vs. UNAI", expanded=False):
                st.caption(tc.get("methodology", ""))
                orig = tc.get("original") or {}
                unai = tc.get("unaiIfLlmNarrated") or {}
                c1, c2, c3 = st.columns(3)
                c1.metric("Original app (this call)", f"{orig.get('total', 0):,} tok",
                           help=f"Input {orig.get('promptTokens', 0):,} + Output {orig.get('completionTokens', 0):,}")
                c2.metric("UNAI, if LLM-narrated", f"{unai.get('total', 0):,} tok",
                           help=f"Input {unai.get('promptTokens', 0):,} + Output {unai.get('completionTokens', 0):,} · {unai.get('measured', 'estimated')}")
                c3.metric("UNAI, as actually run", "0 tok", help="Real ported formula -- no LLM call for this run's actual result.")
                pct = tc.get("reductionPctIfLlmNarrated")
                if pct is not None:
                    st.markdown(f"**−{pct}% tokens** if UNAI also narrated via an LLM (vs. the original app's real call).")
                if unai.get("explanation"):
                    st.markdown(f"> _{unai['explanation']}_")

                # Per-layer token consumption -- res.observability.layerTokens
                # (agents/unai/bridge.cjs) attributes this run's tokens across
                # UNAI's own 7 layers. Most layers are 0 (deterministic reads/
                # writes/reasoning); only Explainability (and sometimes
                # Reasoning) touch anything token-shaped.
                per_layer = tc.get("perLayerTokens")
                if per_layer:
                    measured_label = "REAL — BPE-tokenized actual per-layer data" if tc.get("perLayerMeasured") == "real" else "modeled — shared cognitive runtime rates"
                    zero_count = sum(1 for l in per_layer if not l.get("total"))
                    st.markdown(f"**📊 Per-layer token consumption** ({measured_label})")
                    st.caption(f"{zero_count} of {len(per_layer)} layers used 0 tokens this run — deterministic, no model call.")
                    st.dataframe(
                        pd.DataFrame([
                            {"Layer": f"{l.get('id', '')} {l.get('name', '')}", "In": l.get("in", 0), "Out": l.get("out", 0), "Total": l.get("total", 0)}
                            for l in per_layer
                        ]),
                        hide_index=True, use_container_width=True,
                    )

        # State Machine Pipeline Visualizer
        st.markdown("### 🔄 LangGraph State Machine Execution Flow")
        cols = st.columns(6)
        nodes = [
            ("1. Ingestion", "✅ Ingested"),
            ("2. Pure Math", "✅ Verified"),
            ("3. Policy Matrix", "✅ Evaluated"),
            ("4. AI Synthesis", "✅ Formulated"),
            ("5. HITL Gate", "⏸ " + last_res.get("approval_status", "NOT_REQUIRED")),
            ("6. Action Verification", "✅ " + last_res.get("verification_status", "SIMULATED"))
        ]
        for idx, (label, status) in enumerate(nodes):
            with cols[idx]:
                st.markdown(f"""
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; text-align: center;">
                    <div style="font-size: 0.74rem; font-weight: 600; color: #475569;">{label}</div>
                    <div style="font-size: 0.8rem; font-weight: 700; color: #0f172a; margin-top: 4px;">{status}</div>
                </div>
                """, unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)

        # Two-Column Detailed Investigation Layout
        c_left, c_right = st.columns([1.1, 0.9])

        with c_left:
            st.markdown("### 📊 Operational Evidence & Business Visualizations")
            if selected_agent_key == "agent_01":
                render_agent_01_visuals(metrics, policy)
            elif selected_agent_key == "agent_02":
                render_agent_02_visuals(metrics, policy)
            elif selected_agent_key == "agent_03":
                render_agent_03_visuals(metrics, policy)
            elif selected_agent_key == "agent_04":
                render_agent_04_visuals(metrics, policy)
            elif selected_agent_key == "agent_05":
                render_agent_05_visuals(metrics, policy)
            else:
                st.write(metrics)

        with c_right:
            st.markdown("### 🤖 Intelligence Rationale & Action Gate")
            
            # AI Evidence Synthesis Box
            st.markdown(f"""
            <div class="content-box">
                <div class="content-box-header">
                    <div class="content-box-title">
                        🧠 Executive Briefing & Decision Rationale
                    </div>
                    <span class="pill-badge badge-purple">Model: {settings.OLLAMA_MODEL}</span>
                </div>
                <div class="ai-memo-card">
                    <div class="ai-memo-text">
                        "{last_res.get('reasoning_summary')}"
                    </div>
                </div>
            </div>
            """, unsafe_allow_html=True)

            # Consequential Action Gate Card
            is_hitl = last_res.get("requires_approval", False)
            st.markdown(f"""
            <div class="content-box">
                <div class="content-box-header">
                    <div class="content-box-title">
                        ⚡ Consequential Action Gate
                    </div>
                    <span class="pill-badge {'badge-severe' if is_hitl else 'badge-low'}">
                        {last_res.get('approval_status')}
                    </span>
                </div>
            """, unsafe_allow_html=True)

            if is_hitl:
                st.markdown(f"""
                <div class="directive-banner directive-alert" style="margin-top: 0;">
                    <div style="font-size: 1.6rem; line-height: 1;">✋</div>
                    <div>
                        <div class="directive-title">Human Authorization Required</div>
                        <div class="directive-desc">
                            <b>Proposed Action:</b> <code>{rec.get('action_type')}</code><br>
                            <b>Target SAP Object:</b> <code>{rec.get('target_object_id')}</code><br>
                            <b>Approval Ticket ID:</b> <code>{last_res.get('approval_id')}</code><br>
                            <i>High-consequence threshold exceeded. Action cannot write to SAP without explicit supervisor sign-off.</i>
                        </div>
                    </div>
                </div>
                """, unsafe_allow_html=True)

                col_app, col_rej = st.columns(2)
                with col_app:
                    if st.button("✅ Authorize Action", key=f"cockpit_app_{last_res.get('approval_id')}", type="primary", use_container_width=True):
                        approval_manager.record_decision(last_res.get("approval_id"), "APPROVED", reviewer="Cockpit_Supervisor")
                        st.success("Action Authorized and recorded in immutable audit log!")
                        st.rerun()
                with col_rej:
                    if st.button("❌ Reject & Override", key=f"cockpit_rej_{last_res.get('approval_id')}", use_container_width=True):
                        approval_manager.record_decision(last_res.get("approval_id"), "REJECTED", reviewer="Cockpit_Supervisor")
                        st.warning("Action Rejected. Feedback stored.")
                        st.rerun()
            else:
                st.markdown(f"""
                <div class="directive-banner directive-success" style="margin-top: 0;">
                    <div style="font-size: 1.6rem; line-height: 1;">🟢</div>
                    <div>
                        <div class="directive-title">Autonomous Non-Destructive Action</div>
                        <div class="directive-desc">
                            <b>Action Type:</b> <code>{rec.get('action_type')}</code><br>
                            <b>Status:</b> Safe autonomous execution / Informational monitoring.<br>
                            <b>Verification:</b> <code>{last_res.get('verification_status')}</code>
                        </div>
                    </div>
                </div>
                """, unsafe_allow_html=True)

            st.markdown("</div>", unsafe_allow_html=True)

        # Technical Raw Telemetry (Collapsed for developers & auditors)
        with st.expander("🛠️ Developer & Auditor Raw Telemetry (JSON Inspection)", expanded=False):
            t_col1, t_col2 = st.columns(2)
            with t_col1:
                st.markdown("**Raw Deterministic Metrics:**")
                st.json(metrics)
            with t_col2:
                st.markdown("**Raw Policy Evaluation & Recommendation:**")
                st.json({"policy_evaluation": policy, "recommendation": rec})



# ==============================================================================
# VIEW 2.5: DATA SOURCES & INGESTION HUB
# ==============================================================================
elif view_mode == "📁 Data Sources & Ingestion Hub":
    render_data_hub()

# ==============================================================================
# VIEW 3: SCENARIO SIMULATION LAB ("WHAT-IF" SENSITIVITY TESTING)
# ==============================================================================
elif view_mode == "🧪 Scenario Simulation Lab":
    st.markdown("""
    <div class="top-hero-banner">
        <h1>🧪 Interactive "What-If" Scenario Simulation Sandbox</h1>
        <p>Stress-test agent behavior under varying operational parameters (delivery delays, freight rate spikes, unblocking inventory) in real time.</p>
    </div>
    """, unsafe_allow_html=True)

    sim_domain = st.selectbox(
        "Select Simulation Scenario Domain:",
        [
            "Agent 01: Supplier Delay & Factory Starvation Sensitivity",
            "Agent 02: Warehouse Stock Unblocking & Usability Recovery",
            "Agent 03: Freight Expense vs. Avoided Stockout Arbitrage"
        ]
    )

    if "Agent 01" in sim_domain:
        st.markdown("### 🏢 Simulation: Vendor Delay & Stock Cover Dynamics")
        col_s1, col_s2 = st.columns([1, 1])
        with col_s1:
            added_delay = st.slider("Simulated Additional Vendor Delivery Drift (Days):", min_value=0, max_value=14, value=3)
            current_cover = st.slider("Current Factory Inventory Cover (Days):", min_value=0, max_value=15, value=2)
            late_rate = st.slider("Supplier Empirical Late Rate (%):", min_value=20, max_value=100, value=85)
        with col_s2:
            sim_risk = 0.40 * late_rate + 0.35 * (late_rate * 0.7) + 0.25 * (1 - min(1, current_cover / 10)) * 100
            sim_band = "SEVERE" if sim_risk > 65 or current_cover <= 1 else ("HIGH" if sim_risk > 45 else "MEDIUM")
            sim_action = "EXPEDITE_AND_RESCHEDULE_LINE" if sim_band == "SEVERE" else ("SUPPLIER_FOLLOW_UP" if sim_band == "HIGH" else "MONITOR")

            st.markdown(f"""
            <div class="content-box">
                <div class="content-box-header">
                    <div class="content-box-title">⚡ Real-Time Policy Reaction</div>
                    <span class="pill-badge {'badge-severe' if sim_band == 'SEVERE' else 'badge-high'}">{sim_band}</span>
                </div>
                <div class="metric-grid">
                    <div class="metric-cell">
                        <div class="metric-cell-label">Dynamic Risk Score</div>
                        <div class="metric-cell-val">{sim_risk:.1f} / 100</div>
                    </div>
                    <div class="metric-cell">
                        <div class="metric-cell-label">Effective Cover</div>
                        <div class="metric-cell-val" style="color: {'#dc2626' if current_cover <= 1 else '#ea580c'};">{current_cover} days</div>
                    </div>
                </div>
                <div class="directive-banner {'directive-danger' if sim_band == 'SEVERE' else 'directive-alert'}">
                    <div style="font-size: 1.5rem;">⚡</div>
                    <div>
                        <div class="directive-title">Adapted Directive: {sim_action}</div>
                        <div class="directive-desc">Agent dynamically escalates to expedited rescheduling when stock cover drops under 2 days.</div>
                    </div>
                </div>
            </div>
            """, unsafe_allow_html=True)

    elif "Agent 02" in sim_domain:
        st.markdown("### 📦 Simulation: Warehouse Inspection & Unblocking Recovery")
        col_u1, col_u2 = st.columns([1, 1])
        with col_u1:
            phys_stock = 1000.0
            blocked_stock = st.slider("Blocked / Displaced Quantity (Units):", min_value=0, max_value=800, value=400)
            qa_stock = st.slider("Quality Hold Quantity (Units):", min_value=0, max_value=500, value=250)
            unblock_sim = st.slider("Simulate Unblocking Lot (Units Released to Usable):", min_value=0, max_value=500, value=200)
        with col_u2:
            usable_recovered = max(0, phys_stock - (blocked_stock + qa_stock) + unblock_sim)
            phantom_remaining = phys_stock - usable_recovered

            st.markdown(f"""
            <div class="content-box">
                <div class="content-box-header">
                    <div class="content-box-title">📦 Usable Stock After Unblocking Simulation</div>
                    <span class="pill-badge badge-low">Recovery Rate: {(usable_recovered/phys_stock)*100:.1f}%</span>
                </div>
                <div class="metric-grid">
                    <div class="metric-cell">
                        <div class="metric-cell-label">Usable Available Stock</div>
                        <div class="metric-cell-val" style="color: #059669;">{usable_recovered:,.0f} units</div>
                    </div>
                    <div class="metric-cell">
                        <div class="metric-cell-label">Remaining Phantom Stock</div>
                        <div class="metric-cell-val" style="color: #dc2626;">{phantom_remaining:,.0f} units</div>
                    </div>
                </div>
            </div>
            """, unsafe_allow_html=True)

    elif "Agent 03" in sim_domain:
        st.markdown("### 💰 Simulation: Inter-Plant Logistics Freight Arbitrage")
        col_f1, col_f2 = st.columns([1, 1])
        with col_f1:
            avoided_down = st.slider("Avoided Factory Stockout Cost (₹):", min_value=5000, max_value=50000, value=25000, step=1000)
            base_freight = 2500.0
            freight_mult = st.slider("Carrier Expedited Freight Multiplier:", min_value=0.5, max_value=5.0, value=1.2, step=0.1)
        with col_f2:
            sim_freight = base_freight * freight_mult
            sim_net = avoided_down - sim_freight
            sim_decision = "TRANSFER_RECOMMENDED" if sim_net > 0 else "REJECT_UNFAVORABLE_ECONOMICS"

            st.markdown(f"""
            <div class="content-box">
                <div class="content-box-header">
                    <div class="content-box-title">💰 Economic Feasibility Test</div>
                    <span class="pill-badge {'badge-low' if sim_net > 0 else 'badge-severe'}">{sim_decision}</span>
                </div>
                <div class="metric-grid">
                    <div class="metric-cell">
                        <div class="metric-cell-label">Freight Expense</div>
                        <div class="metric-cell-val">₹ {sim_freight:,.2f}</div>
                    </div>
                    <div class="metric-cell">
                        <div class="metric-cell-label">Net Economic Value</div>
                        <div class="metric-cell-val" style="color: {'#10b981' if sim_net > 0 else '#dc2626'};">₹ {sim_net:,.2f}</div>
                    </div>
                </div>
            </div>
            """, unsafe_allow_html=True)


# ==============================================================================
# VIEW 4: HUMAN-IN-THE-LOOP APPROVALS DESK (KANBAN-STYLE)
# ==============================================================================
elif view_mode == "⚖️ Human-in-the-Loop Approvals Desk":
    st.markdown("""
    <div class="top-hero-banner">
        <h1>⚖️ Enterprise Human-in-the-Loop Governance Desk</h1>
        <p>Strict supervisory gate for high-consequence ERP transactions. All approvals are verified and logged cryptographically.</p>
    </div>
    """, unsafe_allow_html=True)

    pending_tickets = approval_manager.list_pending_approvals()
    all_tickets = approval_manager.list_all_approvals()

    tab_kanban, tab_audit = st.tabs([f"Kanban Authorization Board ({len(pending_tickets)} Pending)", f"Complete Audit Log ({len(all_tickets)} Historical)"])

    with tab_kanban:
        if not pending_tickets:
            st.markdown("""
            <div style="background: #ffffff; border-radius: 12px; padding: 40px; text-align: center; border: 1px solid #e2e8f0;">
                <div style="font-size: 2.5rem; margin-bottom: 12px;">🎉</div>
                <h3 style="color: #0f172a; margin-bottom: 6px;">All Authorization Queues Clear</h3>
                <p style="color: #64748b;">No pending proposals currently require supervisor intervention.</p>
            </div>
            """, unsafe_allow_html=True)
        else:
            col_crit, col_std = st.columns(2)

            urgent_tickets = [t for t in pending_tickets if float(t.get("estimated_impact", 0.0)) > 20000]
            std_tickets = [t for t in pending_tickets if float(t.get("estimated_impact", 0.0)) <= 20000]

            with col_crit:
                st.markdown(f"#### 🚨 Critical Approvals (Impact > ₹ 20,000) — `{len(urgent_tickets)}`")
                for ticket in urgent_tickets:
                    st.markdown(f"""
                    <div class="content-box" style="border-left: 5px solid #ef4444;">
                        <div class="content-box-header">
                            <div class="content-box-title">Ticket <code>{ticket['approval_id']}</code></div>
                            <span class="pill-badge badge-severe">CRITICAL REVIEW</span>
                        </div>
                        <div style="font-size: 0.88rem; margin-bottom: 8px;">
                            <b>Target:</b> <code>{ticket['target_object_id']}</code> &nbsp;|&nbsp; <b>Action:</b> <code>{ticket['action_type']}</code><br>
                            <b>Value at Risk:</b> <span style="color: #dc2626; font-weight: 700;">₹ {ticket['estimated_impact']:,.2f}</span>
                        </div>
                        <div class="ai-memo-card" style="margin-bottom: 12px; font-size: 0.82rem;">
                            {ticket['rationale']}
                        </div>
                    """, unsafe_allow_html=True)
                    c1, c2 = st.columns(2)
                    with c1:
                        if st.button("✅ Authorize", key=f"kanban_app_{ticket['approval_id']}", type="primary", use_container_width=True):
                            approval_manager.record_decision(ticket["approval_id"], "APPROVED", reviewer="Kanban_Lead")
                            st.success("Authorized!")
                            st.rerun()
                    with c2:
                        if st.button("❌ Reject", key=f"kanban_rej_{ticket['approval_id']}", use_container_width=True):
                            approval_manager.record_decision(ticket["approval_id"], "REJECTED", reviewer="Kanban_Lead")
                            st.warning("Rejected.")
                            st.rerun()
                    st.markdown("</div>", unsafe_allow_html=True)

            with col_std:
                st.markdown(f"#### ⚠️ Standard Operational Approvals — `{len(std_tickets)}`")
                for ticket in std_tickets:
                    st.markdown(f"""
                    <div class="content-box" style="border-left: 5px solid #f59e0b;">
                        <div class="content-box-header">
                            <div class="content-box-title">Ticket <code>{ticket['approval_id']}</code></div>
                            <span class="pill-badge badge-high">STANDARD REVIEW</span>
                        </div>
                        <div style="font-size: 0.88rem; margin-bottom: 8px;">
                            <b>Target:</b> <code>{ticket['target_object_id']}</code> &nbsp;|&nbsp; <b>Action:</b> <code>{ticket['action_type']}</code><br>
                            <b>Value:</b> <span style="color: #059669; font-weight: 700;">₹ {ticket['estimated_impact']:,.2f}</span>
                        </div>
                        <div class="ai-memo-card" style="margin-bottom: 12px; font-size: 0.82rem;">
                            {ticket['rationale']}
                        </div>
                    """, unsafe_allow_html=True)
                    c1, c2 = st.columns(2)
                    with c1:
                        if st.button("✅ Authorize", key=f"std_app_{ticket['approval_id']}", type="primary", use_container_width=True):
                            approval_manager.record_decision(ticket["approval_id"], "APPROVED", reviewer="Kanban_Operator")
                            st.success("Authorized!")
                            st.rerun()
                    with c2:
                        if st.button("❌ Reject", key=f"std_rej_{ticket['approval_id']}", use_container_width=True):
                            approval_manager.record_decision(ticket["approval_id"], "REJECTED", reviewer="Kanban_Operator")
                            st.warning("Rejected.")
                            st.rerun()
                    st.markdown("</div>", unsafe_allow_html=True)

    with tab_audit:
        if all_tickets:
            df_tickets = pd.DataFrame(all_tickets)
            st.dataframe(df_tickets[["approval_id", "agent_id", "case_id", "action_type", "status", "estimated_impact", "created_at", "reviewed_at"]], use_container_width=True)
        else:
            st.info("No approval tickets recorded yet.")


# ==============================================================================
# VIEW 5: AGENT OPERATIONS GUIDEBOOK (COMIC STORYBOARD & ARCHITECTURE)
# ==============================================================================
elif view_mode == "📖 Agent Operations Guidebook":
    render_comic_guidebook()


# ==============================================================================
# VIEW 6: TIMELY PERFORMANCE & SLA REPORTS
# ==============================================================================
elif view_mode == "📊 Timely Performance & SLA Reports":
    st.markdown("""
    <div class="top-hero-banner">
        <h1>📊 Autonomous Agent SLA & Executive Performance Telemetry</h1>
        <p>Continuous monitoring of sub-second inference latencies, deterministic precision, decision accuracy, and capital value defended.</p>
    </div>
    """, unsafe_allow_html=True)

    digest = performance_reporter.generate_digest()

    p1, p2, p3, p4 = st.columns(4)
    with p1:
        st.markdown(f"""
        <div class="exec-kpi-card">
            <div class="exec-kpi-label">Total Completed Runs</div>
            <div class="exec-kpi-value">{digest['total_executions']:,}</div>
            <div class="exec-kpi-sub">Across 5 specialized agents</div>
        </div>
        """, unsafe_allow_html=True)
    with p2:
        st.markdown(f"""
        <div class="exec-kpi-card">
            <div class="exec-kpi-label">Decision SLA Accuracy</div>
            <div class="exec-kpi-value" style="color: #059669;">{digest['overall_accuracy_pct']}%</div>
            <div class="exec-kpi-sub">Target benchmark: 95.0%</div>
        </div>
        """, unsafe_allow_html=True)
    with p3:
        st.markdown(f"""
        <div class="exec-kpi-card">
            <div class="exec-kpi-label">Average Execution Latency</div>
            <div class="exec-kpi-value">{digest['avg_latency_ms']} ms</div>
            <div class="exec-kpi-sub">Real-time sub-second response</div>
        </div>
        """, unsafe_allow_html=True)
    with p4:
        st.markdown(f"""
        <div class="exec-kpi-card">
            <div class="exec-kpi-label">Enterprise Value Defended</div>
            <div class="exec-kpi-value" style="color: #2563eb;">₹ {digest['total_economic_impact']:,.2f}</div>
            <div class="exec-kpi-sub">Working capital optimization</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)
    st.markdown("### 📈 Agent SLA Telemetry Matrix")
    agent_metrics = digest.get("agent_metrics", {})
    if agent_metrics:
        df_agent = pd.DataFrame.from_dict(agent_metrics, orient="index")
        st.dataframe(df_agent, use_container_width=True)
    else:
        st.info("Execute agent cases in the Cockpit to populate performance telemetry.")

    st.markdown("<br>", unsafe_allow_html=True)
    st.markdown("### 📥 Executive SLA Telemetry Export")
    if st.button("📄 Generate & Export Executive Performance Report (Markdown)", type="primary"):
        fpath = performance_reporter.export_markdown_report()
        st.success(f"Report exported successfully to: `{fpath}`")



# ==============================================================================
# VIEW 8: COMPLIANCE & AUDIT TRAIL
# ==============================================================================
elif view_mode == "📜 Compliance & Audit Trail":

    st.markdown("""
    <div class="top-hero-banner">
        <h1>📜 Compliance, Governance & Append-Only Audit Trail</h1>
        <p>Full cryptographic traceability: agent state transitions, deterministic calculation inputs, LLM prompts, and human approval events.</p>
    </div>
    """, unsafe_allow_html=True)

    events = audit_logger.get_recent_events(limit=100)
    if events:
        df_events = pd.DataFrame(events)
        st.dataframe(df_events[["timestamp", "event_type", "agent_id", "case_id", "user_id"]], use_container_width=True)

        selected_event_id = st.selectbox("Inspect Event Details", [e["event_id"] for e in reversed(events)])
        selected_event = next((e for e in events if e["event_id"] == selected_event_id), None)
        if selected_event:
            st.json(selected_event)
    else:
        st.info("No audit events recorded yet.")
