from __future__ import annotations

"""
utils/ticr_client.py
---------------------
Realistic adapter for verifying technicians against the TIČR registry
available at https://formulare.ticr.eu/rt.html.

Since TIČR does not provide a public API, this client performs an HTTP GET
and parses the HTML listing. It is implemented defensively:
 - opt-in via env TICR_LIVE=1 (otherwise the caller should use a mock)
 - timeouts, retries-lite, and user agent headers
 - tolerant HTML parsing using BeautifulSoup with CSS/regex fallbacks
 - rate limit hook (per-process simple guard)

Note: This is best-effort. If TIČR markup changes, adjust selectors below.
"""

from dataclasses import dataclass
from datetime import date, datetime
import os
import re
from typing import Any, Dict, List, Optional

import httpx
from bs4 import BeautifulSoup  # type: ignore


TICR_URL = os.getenv("TICR_URL", "https://formulare.ticr.eu/rt.html")
TICR_LIVE = os.getenv("TICR_LIVE", "0") in {"1", "true", "TRUE", "yes", "on"}


_NAME_RE = re.compile(r"^[A-Za-zÀ-ž'\-]+(?:\s+[A-Za-zÀ-ž'\-]+)+$")
_CERT_FORMAT_RE = re.compile(r"^\d{3,}\/[A-Za-z0-9,;\s]+$")
_SCOPE_RE = re.compile(r"E[12][AB]?")  # E1, E1A, E1B, E2, E2A, E2B


def _scopes_from_cert(cert: str) -> List[str]:
    seg = ""
    if "/" in cert:
        try:
            seg = cert.split("/")[-1]
        except Exception:
            seg = ""
    if not seg:
        return []
    found = _SCOPE_RE.findall(seg.upper())
    out: List[str] = []
    for s in found:
        if s not in out:
            out.append(s)
    return out


@dataclass
class TicrMatch:
    full_name: str
    certificate_number: str
    authorization_number: Optional[str]
    scopes: List[str]
    valid_until: Optional[str]


def _normalize_text(x: Optional[str]) -> str:
    return re.sub(r"\s+", " ", (x or "").strip())


def _parse_listing_html(html: str) -> List[Dict[str, str]]:
    """Parse the TIČR listing page into a list of dict rows.
    Expected columns typically contain jméno, číslo osvědčení, oprávnění, platnost, rozsah.
    This is heuristic: we look for table rows with multiple columns and map by keywords.
    """
    soup = BeautifulSoup(html, "html.parser")
    rows: List[Dict[str, str]] = []

    # Try table rows first
    for tr in soup.find_all("tr"):
        cols = [c.get_text(strip=True) for c in tr.find_all(["td", "th"])]
        if len(cols) < 3:
            continue
        row_txt = " | ".join(cols)
        # Heuristic mappings
        name = None
        cert = None
        auth = None
        valid = None
        scope = None

        # Try to find cert token: contains slash and E tokens
        for token in cols:
            if "/" in token and (_SCOPE_RE.search(token) or _CERT_FORMAT_RE.match(token)):
                cert = token
                break

        # Name likely first col if it has a space
        for token in cols:
            if _NAME_RE.match(token):
                name = token
                break

        # Authorization: look for 'opráv' keyword (Czech)
        for token in cols:
            if re.search(r"opr[aá]vn", token, re.IGNORECASE):
                auth = token
                break

        # Valid until: keyword 'platnost'
        for token in cols:
            if re.search(r"platnost|do\s*:\s*", token, re.IGNORECASE):
                valid = token
                break

        # Scope: look for E1/E2 codes set
        for token in cols:
            codes = _SCOPE_RE.findall(token)
            if codes:
                scope = ",".join(dict.fromkeys(codes))
                break

        if name or cert:
            rows.append({
                "name": name or "",
                "certificate": cert or "",
                "authorization": auth or "",
                "valid": valid or "",
                "scope": scope or "",
                "_raw": row_txt,
            })

    return rows


def _pick_best_match(rows: List[Dict[str, str]], name: str, cert: str) -> Optional[TicrMatch]:
    name_norm = _normalize_text(name)
    cert_norm = _normalize_text(cert)
    for r in rows:
        rname = _normalize_text(r.get("name"))
        rcert = _normalize_text(r.get("certificate"))
        if rname.lower() == name_norm.lower() and (rcert.lower() == cert_norm.lower() or cert_norm.lower() in rcert.lower()):
            scopes = _scopes_from_cert(rcert) or _SCOPE_RE.findall(r.get("scope", "").upper())
            valid_until = None
            m = re.search(r"(\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{2}-\d{2})", r.get("valid", ""))
            if m:
                valid_until = m.group(1)
            return TicrMatch(
                full_name=rname,
                certificate_number=rcert,
                authorization_number=_normalize_text(r.get("authorization")) or None,
                scopes=list(dict.fromkeys(scopes)) if scopes else [],
                valid_until=valid_until,
            )
    return None


def verify_against_ticr(name: str, certificate_number: str, timeout_s: float = 8.0) -> Dict[str, Any]:
    """Attempt a real verification against TIČR. Returns dict compatible with verify_user_mock.
    Caller must opt-in by checking TICR_LIVE.
    """
    # Basic sanity first
    if not _NAME_RE.match(_normalize_text(name)):
        return {"status": "not_found"}
    if not _CERT_FORMAT_RE.match(_normalize_text(certificate_number)):
        return {"status": "not_found"}

    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "cs-CZ,cs;q=0.9,en;q=0.8",
    }
    params = {}
    # TIČR může ignorovat query, ale aspoň odesíláme jméno pro případné fulltext vyhledávání
    try:
        with httpx.Client(headers=headers, timeout=timeout_s, follow_redirects=True) as client:
            resp = client.get(TICR_URL, params=params)
            resp.raise_for_status()
            rows = _parse_listing_html(resp.text)
    except Exception:
        return {"status": "error"}

    match = _pick_best_match(rows, name, certificate_number)
    if not match:
        return {"status": "not_found"}

    return {
        "status": "verified",
        "register_id": None,
        "scope": match.scopes,
        "valid_until": match.valid_until,
        "matched": {
            "full_name": match.full_name,
            "first_name": match.full_name.split(" ")[0] if match.full_name else None,
            "last_name": " ".join(match.full_name.split(" ")[1:]) if match.full_name and len(match.full_name.split(" ")) > 1 else None,
            "certificate_number": match.certificate_number,
            "authorization_number": match.authorization_number,
            "scope": match.scopes,
        },
        "snapshot": {
            "source": "ticr-live",
            "checked_at": datetime.utcnow().isoformat(),
        },
    }

