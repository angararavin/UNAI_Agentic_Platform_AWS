from typing import Dict, Any, List, Optional
from datetime import datetime

class AgingCalculationTools:
    """
    Pure deterministic calculation engine for Agent 04 (PO Aging Intelligence).
    Diagnoses root causes of aged purchase orders and validates need state.
    """

    @staticmethod
    def calculate_aging_metrics(
        ordered_qty: float,
        received_qty: float,
        net_unit_price: float,
        po_date_str: str,
        requested_delivery_date_str: str,
        snapshot_date_str: str = "2026-09-10"
    ) -> Dict[str, Any]:
        """
        Computes line-level remaining quantity, remaining value, and aging/due days.
        """
        ord_q = max(0.0, float(ordered_qty))
        rec_q = max(0.0, float(received_qty))
        price = max(0.0, float(net_unit_price))

        rem_q = max(0.0, ord_q - rec_q)
        rem_val = rem_q * price

        try:
            d_snap = datetime.strptime(str(snapshot_date_str).strip(), "%Y-%m-%d")
            d_po = datetime.strptime(str(po_date_str).strip(), "%Y-%m-%d")
            d_req = datetime.strptime(str(requested_delivery_date_str).strip(), "%Y-%m-%d")

            aging_days = (d_snap - d_po).days
            due_days = (d_snap - d_req).days
        except Exception:
            aging_days, due_days = 0, 0

        return {
            "ordered_qty": round(ord_q, 2),
            "received_qty": round(rec_q, 2),
            "remaining_qty": round(rem_q, 2),
            "net_unit_price": round(price, 2),
            "po_value_remaining": round(rem_val, 2),
            "aging_days": aging_days,
            "due_days": due_days,
            "is_fully_received": rem_q == 0.0,
            "is_severely_aged": aging_days > 90
        }

    @staticmethod
    def diagnose_po_root_cause(
        aging_metrics: Dict[str, Any],
        requirement_record: Optional[Dict[str, Any]] = None,
        release_record: Optional[Dict[str, Any]] = None,
        invoice_record: Optional[Dict[str, Any]] = None,
        change_history: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Synthesizes operational facts to diagnose root cause and recommend lifecycle action.
        """
        rem_q = aging_metrics.get("remaining_qty", 0.0)
        is_received = aging_metrics.get("is_fully_received", False)

        # 1. Check Full Receipt
        if is_received or rem_q == 0:
            return {
                "root_cause": "FULLY_RECEIVED",
                "recommended_action": "CLOSE_PO",
                "rationale": "All ordered items have been delivered and goods receipt posted. Ready for administrative closure.",
                "priority": "LOW",
                "consequential_action_required": True
            }

        # 2. Check Release Block
        rel = release_record or {}
        if rel.get("release_status", "RELEASED").upper() == "BLOCKED":
            return {
                "root_cause": "PO_BLOCKED",
                "recommended_action": "RELEASE_OR_BLOCK_RESOLUTION",
                "rationale": f"PO has active release block ({rel.get('block_reason', 'Standard')}). Purchasing must review release strategy.",
                "priority": "HIGH",
                "consequential_action_required": True
            }

        # 3. Check Invoice Status / AP Mismatch
        inv = invoice_record or {}
        inv_status = str(inv.get("invoice_status", "")).upper()
        if "MISMATCH" in inv_status or "VARIANCE" in inv_status:
            return {
                "root_cause": "INVOICE_MISMATCH",
                "recommended_action": "FINANCE_AP_REVIEW",
                "rationale": "Quantity or price variance detected between PO, GR, and supplier invoice.",
                "priority": "HIGH",
                "consequential_action_required": True
            }

        # 4. Check Underlying Need State in Requirements
        req = requirement_record or {}
        req_status = str(req.get("requirement_status", "")).upper()
        if req_status == "CANCELLED":
            return {
                "root_cause": "REQUIREMENT_CANCELLED",
                "recommended_action": "CLOSE_OR_CANCEL_WORKFLOW",
                "rationale": "The underlying demand requirement has been cancelled. Open PO quantity is unneeded.",
                "priority": "HIGH",
                "consequential_action_required": True
            }

        if req_status == "CLOSED" or req_status == "COMPLETED":
            return {
                "root_cause": "REQUIREMENT_CLOSED",
                "recommended_action": "CLOSE_OR_CANCEL_WORKFLOW",
                "rationale": "The underlying demand order has completed without consuming this residual PO quantity.",
                "priority": "MEDIUM",
                "consequential_action_required": True
            }

        # 5. Check Repeated Rescheduling Churn
        changes = change_history or []
        reschedule_count = sum(1 for c in changes if "DATE" in str(c.get("change_type", "")).upper())
        if reschedule_count >= 2:
            return {
                "root_cause": "REPEATED_RESCHEDULE",
                "recommended_action": "SUPPLIER_REVIEW",
                "rationale": f"PO has experienced multiple delivery date adjustments ({reschedule_count} changes) with unfulfilled residual.",
                "priority": "MEDIUM",
                "consequential_action_required": True
            }

        # 6. Check Partial Delivery Residual
        rec_q = aging_metrics.get("received_qty", 0.0)
        if rec_q > 0 and rem_q > 0:
            if req_status == "OPEN":
                return {
                    "root_cause": "VALID_FUTURE_DEMAND",
                    "recommended_action": "KEEP_OPEN",
                    "rationale": "Open residual quantity remains tied to an active, valid future production requirement.",
                    "priority": "MEDIUM",
                    "consequential_action_required": False
                }
            return {
                "root_cause": "PARTIAL_DELIVERY_RESIDUAL",
                "recommended_action": "REVIEW_REMAINING_QTY",
                "rationale": "Partial receipt occurred. Residual balance requires verification with supplier before cancellation.",
                "priority": "MEDIUM",
                "consequential_action_required": True
            }

        # Default Valid Future Demand
        return {
            "root_cause": "VALID_FUTURE_DEMAND",
            "recommended_action": "KEEP_OPEN",
            "rationale": "Open PO is actively required by planning schedule.",
            "priority": "LOW",
            "consequential_action_required": False
        }
