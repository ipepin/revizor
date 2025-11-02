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


NAME_RE = re.compile(r"^[A-Za-zÀ-ž'\-]+(?:\s+[A-Za-zÀ-ž'\-]+)+$")


def _parse_scopes(cert: str) -> list[str]:
    scope_segment = ""
    if "/" in cert:
        try:
            scope_segment = cert.split("/")[-1]
        except Exception:
            scope_segment = ""
    if not scope_segment:
        return []
    # tokens separated by non-alphanum; accept E1,E1A,E1B,E2,E2A,E2B etc.
    codes = re.findall(r"E[12][AB]?", scope_segment.upper())
    seen, out = set(), []
    for c in codes:
        if c not in seen:
            seen.add(c)
            out.append(c)
    return out


def verify_user_mock(user: Dict[str, Any]) -> Dict[str, Any]:
    """Return a mock verification result for the given user dict.

    Output keys:
      - status: 'verified' | 'mismatch' | 'not_found' | 'expired'
      - register_id: optional external id
      - scope: list of strings
      - valid_until: ISO date string or None
      - snapshot: dict with raw data
    """
    name = (user.get("name") or "").strip()
    cert = (user.get("certificate_number") or "").strip()
    # Basic sanity: name must look like first + last, and cert must look like DIGITS/SCOPES
    cert_ok = bool(re.match(r"^\d{3,}\/[A-Za-z0-9,;\s]+$", cert))
    name_ok = bool(NAME_RE.match(name))
    scopes = _parse_scopes(cert)
    status = "verified" if (name_ok and cert_ok and scopes) else "not_found"
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
    # scopes already parsed above

    return {
        "status": status,
        "register_id": f"MOCK-{user.get('id')}" if user.get("id") else None,
        "scope": scopes or [],
        "valid_until": valid_iso,
        "matched": {
            "full_name": full_name,
            "first_name": first_name,
            "last_name": last_name,
            "certificate_number": cert,
            "authorization_number": "A-12345",
            "scope": scopes or [],
        },
        "snapshot": {
            "source": "ticr-mock",
            "checked_at": datetime.utcnow().isoformat(),
            "input": {"name": name, "certificate_number": cert},
        },
    }
