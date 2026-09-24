import pytest
from src.tools.drift_tools import DriftCalculationTools
from src.tools.inventory_tools import InventoryCalculationTools
from src.tools.transfer_tools import TransferCalculationTools
from src.tools.aging_tools import AgingCalculationTools
from src.tools.contradiction_tools import ContradictionCalculationTools

def test_drift_calculation_tools():
    deliveries = [
        {"supplier_id": "SUP1001", "delivery_delay_days": "1.0"},
        {"supplier_id": "SUP1001", "delivery_delay_days": "2.0"},
        {"supplier_id": "SUP1001", "delivery_delay_days": "4.5"},
        {"supplier_id": "SUP1001", "delivery_delay_days": "-1.0"},
        {"supplier_id": "SUP1001", "delivery_delay_days": "0.0"},
    ]
    stats = DriftCalculationTools.compute_supplier_stats(deliveries, "SUP1001")
    assert stats["historical_delivery_count"] == 5
    assert stats["avg_delay_days"] == pytest.approx(1.3, 0.1)
    assert stats["late_delivery_rate_pct"] == pytest.approx(60.0, 1.0)
    assert stats["severe_delay_rate_gt3d_pct"] == pytest.approx(20.0, 1.0)

    # Test policy evaluation
    policy = DriftCalculationTools.evaluate_drift_policy(
        supplier_stats=stats,
        downstream_metrics={"days_of_cover_without_po": 1, "is_high_impact": True}
    )
    assert policy["risk_band"] in ("HIGH", "SEVERE")
    assert policy["consequential_action_required"] is True

def test_inventory_calculation_tools():
    # Usable = max(0, 1000 - 100 - 50 - 200 - 50 - 100) = 500
    res = InventoryCalculationTools.calculate_usable_stock(
        physical_qty=1000,
        blocked_qty=100,
        quality_hold_qty=50,
        reserved_qty=200,
        wrong_location_qty=50,
        expired_qty=100
    )
    assert res["usable_qty"] == 500.0
    assert res["phantom_qty"] == 500.0
    assert res["phantom_ratio"] == 0.5
    assert res["primary_phantom_cause"] == "RESERVED_COMMITMENT"
    assert res["phantom_risk"] == "HIGH"

    # Test demand coverage
    cov = InventoryCalculationTools.evaluate_demand_coverage(
        usable_qty=500.0,
        next_7d_demand=200.0,
        next_30d_demand=600.0
    )
    assert cov["usable_7d_coverage_ratio"] == 2.5
    assert cov["usable_30d_coverage_ratio"] == pytest.approx(0.83, 0.05)
    assert cov["is_shortage_immediate"] is False
    assert cov["is_shortage_30d"] is True

def test_transfer_calculation_tools():
    # Source On-Hand: 1000, 30d Demand: 300, Safety Stock: 200 -> Surplus = 500
    sp = TransferCalculationTools.calculate_source_protection(
        on_hand_source=1000,
        next_30d_demand_source=300,
        safety_stock_source=200
    )
    assert sp["source_protected_stock"] == 500.0
    assert sp["available_source_surplus"] == 500.0
    assert sp["has_surplus_after_protection"] is True

    # Candidate Qty: 400, Unit Value: 100, Freight: 2000, Stockout: 10000 -> Net Benefit: 8000
    ec = TransferCalculationTools.calculate_transfer_economics(
        candidate_qty=400,
        source_surplus=500,
        unit_value=100,
        estimated_freight_cost=2000,
        estimated_stockout_cost=10000
    )
    assert ec["feasible_transfer_qty"] == 400.0
    assert ec["estimated_net_benefit"] == 8000.0
    assert ec["decision"] == "TRANSFER_RECOMMENDED"
    assert ec["consequential_action_required"] is True

def test_aging_calculation_tools():
    aging = AgingCalculationTools.calculate_aging_metrics(
        ordered_qty=100,
        received_qty=40,
        net_unit_price=500,
        po_date_str="2026-01-01",
        requested_delivery_date_str="2026-03-01",
        snapshot_date_str="2026-09-01"
    )
    assert aging["remaining_qty"] == 60.0
    assert aging["po_value_remaining"] == 30000.0
    assert aging["is_fully_received"] is False
    assert aging["aging_days"] == 243
    assert aging["is_severely_aged"] is True

    # Diagnosis with cancelled requirement
    diag = AgingCalculationTools.diagnose_po_root_cause(
        aging_metrics=aging,
        requirement_record={"requirement_status": "CANCELLED"}
    )
    assert diag["root_cause"] == "REQUIREMENT_CANCELLED"
    assert diag["recommended_action"] == "CLOSE_OR_CANCEL_WORKFLOW"

def test_contradiction_calculation_tools():
    reqs = [
        {"requirement_id": "R1", "plant_id": "PL01", "material_id": "MAT2001", "required_qty": "100", "requirement_type": "PRODUCTION_ORDER", "status": "OPEN", "requirement_date": "2026-09-10", "source_id": "S1"},
        {"requirement_id": "R2", "plant_id": "PL01", "material_id": "MAT2001", "required_qty": "100", "requirement_type": "PRODUCTION_ORDER", "status": "OPEN", "requirement_date": "2026-09-10", "source_id": "S1"}
    ]
    diag = ContradictionCalculationTools.classify_contradiction("PL01", "MAT2001", reqs)
    assert diag["contradiction_type"] == "DUPLICATE_OVERLAP"
    assert diag["recommended_action"] == "REVIEW_DEDUPLICATION"

    net_d = ContradictionCalculationTools.calculate_net_demand(reqs, [{"supply_qty": "50"}])
    assert net_d == 150.0
