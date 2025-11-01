from __future__ import annotations

"""
utils/ticr.py
-----------------
Adapter/skeleton for verifying technicians against TIČR registry.

This is a stub implementation that pretends verification succeeded and returns
normalized data. Replace with real scraping/API integration later.
"""

from datetime import date, datetime
from typing import Any, Dict


def verify_user_mock(user: Dict[str, Any]) -> Dict[str, Any]:
    """Return a mock verification result for the given user dict.

    Output keys:
      - status: 'verified' | 'mismatch' | 'not_found' | 'expired'
      - register_id: optional external id
      - scope: list of strings
      - valid_until: ISO date string or None
      - snapshot: dict with raw data
    """
    name = user.get("name") or ""
    cert = user.get("certificate_number") or ""
    status = "verified" if name and cert else "mismatch"
    # validity: 3 years from today (mock)
    valid_iso = date.fromordinal(date.today().toordinal() + 365 * 3).isoformat()
    return {
        "status": status,
        "register_id": f"MOCK-{user.get('id')}" if user.get("id") else None,
        "scope": ["E1A", "E2A"],
        "valid_until": valid_iso,
        "snapshot": {
            "source": "ticr-mock",
            "checked_at": datetime.utcnow().isoformat(),
            "input": {"name": name, "certificate_number": cert},
        },
    }

