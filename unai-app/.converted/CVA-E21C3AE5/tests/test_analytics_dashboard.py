"""
Automated unit and integration tests for Executive Analytics & Visual Dashboards.
Validates Plotly figure generation, trace structures, multi-echelon network calculations,
and edge-case resilience (empty anomaly feeds, missing fields).
"""

import pytest
import plotly.graph_objects as go
from src.ui.visualizations import (
    create_risk_vs_exposure_scatter,
    create_capital_exposure_treemap,
    create_multi_echelon_network_chart,
    create_supplier_reliability_radar,
    create_working_capital_liberation_waterfall,
    create_execution_throughput_gauges
)
from src.ui.triage import get_cross_agent_anomalies

def test_risk_vs_exposure_scatter():
    """Validates generation of the cross-agent risk vs exposure quadrant scatter chart."""
    anomalies = get_cross_agent_anomalies()
    fig = create_risk_vs_exposure_scatter(anomalies)

    assert isinstance(fig, go.Figure)
    assert len(fig.data) > 0
    # Every trace should be scatter mode
    for trace in fig.data:
        assert trace.type == "scatter"
        assert len(trace.x) > 0
        assert len(trace.y) > 0

    # Test edge case: empty anomalies
    empty_fig = create_risk_vs_exposure_scatter([])
    assert isinstance(empty_fig, go.Figure)

def test_capital_exposure_treemap():
    """Validates generation of the hierarchical capital allocation treemap."""
    anomalies = get_cross_agent_anomalies()
    fig = create_capital_exposure_treemap(anomalies)

    assert isinstance(fig, go.Figure)
    assert len(fig.data) == 1
    assert fig.data[0].type == "treemap"
    assert len(fig.data[0].labels) > 0
    assert len(fig.data[0].values) > 0

    # Test edge case: empty anomalies
    empty_fig = create_capital_exposure_treemap([])
    assert isinstance(empty_fig, go.Figure)

def test_multi_echelon_network_chart():
    """Validates generation of multi-echelon plant network bar & line chart."""
    # Default benchmark network
    fig = create_multi_echelon_network_chart()
    assert isinstance(fig, go.Figure)
    assert len(fig.data) == 4  # 3 bars (on_hand, protected, surplus) + 1 line (ROI)

    # Custom plant input
    custom_plants = [
        {"plant": "PL_TEST_1", "on_hand": 500, "protected": 200, "surplus": 300, "transfer_feasible": 150, "roi": 12000.0}
    ]
    custom_fig = create_multi_echelon_network_chart(custom_plants)
    assert isinstance(custom_fig, go.Figure)
    assert custom_fig.data[0].x[0] == "PL_TEST_1"

def test_supplier_reliability_radar():
    """Validates multi-dimensional supplier radar chart."""
    fig = create_supplier_reliability_radar()
    assert isinstance(fig, go.Figure)
    assert len(fig.data) >= 3  # Multiple suppliers + benchmark
    for trace in fig.data:
        assert trace.type == "scatterpolar"
        assert len(trace.r) == 6  # 5 axes closed back to first point

def test_working_capital_liberation_waterfall():
    """Validates working capital financial waterfall chart."""
    fig = create_working_capital_liberation_waterfall()
    assert isinstance(fig, go.Figure)
    assert len(fig.data) == 1
    assert fig.data[0].type == "waterfall"
    assert len(fig.data[0].x) == 6

    # Custom financial figures
    custom_impact = {
        "gross_exposure": 1000000.0,
        "sto_avoided_stockouts": 100000.0,
        "phantom_unblocked": 50000.0,
        "aged_po_cancelled": 200000.0,
        "mrp_deduplicated": 30000.0
    }
    custom_fig = create_working_capital_liberation_waterfall(custom_impact)
    assert isinstance(custom_fig, go.Figure)
    assert custom_fig.data[0].y[0] == 1000000.0

def test_execution_throughput_gauges():
    """Validates composite SLA latency and autonomous STP throughput gauges."""
    fig = create_execution_throughput_gauges()
    assert isinstance(fig, go.Figure)
    assert len(fig.data) == 2  # 2 indicator gauges
    assert fig.data[0].type == "indicator"
    assert fig.data[1].type == "indicator"
