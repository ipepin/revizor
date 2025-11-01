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
import re


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
    full_name = str(name).strip()
    first_name = full_name.split(" ")[0] if full_name else None
    last_name = " ".join(full_name.split(" ")[1:]) if full_name and len(full_name.split(" ")) > 1 else None

    # Extract scopes from certificate number part after '/'
    scope_segment = ""
    if "/" in cert:
        try:
            scope_segment = cert.split("/")[-1]
        except Exception:
            scope_segment = ""
    scope_codes = []
    if scope_segment:
        # find tokens like E1, E1A, E2, E2A, E2B etc.
        scope_codes = re.findall(r"E\d[A-Z]?", scope_segment.upper())
    # de-duplicate preserving order
    seen = set()
    scopes = []
    for s in scope_codes:
        if s not in seen:
            seen.add(s)
            scopes.append(s)

    return {
        "status": status,
        "register_id": f"MOCK-{user.get('id')}" if user.get("id") else None,
        "scope": scopes or ["E1A"],
        "valid_until": valid_iso,
        "matched": {
            "full_name": full_name,
            "first_name": first_name,
            "last_name": last_name,
            "certificate_number": cert,
            "authorization_number": "A-12345",
            "scope": scopes or ["E1A"],
        },
        "snapshot": {
            "source": "ticr-mock",
            "checked_at": datetime.utcnow().isoformat(),
            "input": {"name": name, "certificate_number": cert},
        },
    }
