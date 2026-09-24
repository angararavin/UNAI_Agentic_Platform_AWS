TEST_CASES = [
    {
        "tray_id": "GF-1001",
        "current_stage": "3PL Pickup Queue",
        "hours_in_stage": 52,
        "micro_slo": 24,
        "location": "DC-Spoke-01",
        "event_history": """
        Failure detected.
        Tray moved to drop zone.
        Awaiting 3PL pickup for 52 hours.
        No pickup confirmation received.
        """
    }
]