from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional
import os
import re

import httpx
from bs4 import BeautifulSoup  # type: ignore

TICR_URL = os.getenv("TICR_URL", "https://formulare.ticr.eu/rt.html")


def _normalize_text(value: Optional[str]) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


# Candidate for full name: two or more words consisting only of letters
NAME_CANDIDATE_RE = re.compile(r"([^\W\d_]+(?:\s+[^\W\d_]+)+)", re.UNICODE)


def verify_against_ticr(name: str, certificate_number: str, timeout_s: float = 8.0) -> Dict[str, Any]:
    # Require non-empty certificate number
    cert_in = (certificate_number or "").strip()
    if not cert_in:
        return {"status": "not_found"}

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "cs-CZ,cs;q=0.9,en;q=0.8",
    }

    try:
        with httpx.Client(headers=headers, timeout=timeout_s, follow_redirects=True) as client:
            resp = client.get(TICR_URL)
            resp.raise_for_status()
            html = resp.text
    except Exception:
        return {"status": "error"}

    soup = BeautifulSoup(html, "html.parser")
    text = _normalize_text(soup.get_text(" "))
    text_upper = text.upper()
    cert_upper = cert_in.upper()

    pattern = re.compile(rf"(?<!\w){re.escape(cert_upper)}(?!\w)")
    hit = pattern.search(text_upper)
    if not hit:
        return {"status": "not_found"}

    start = max(0, hit.start() - 200)
    end = min(len(text), hit.end() + 200)
    window = text[start:end]

    holder_name = ""
    left_segment = text[start:hit.start()]
    candidates_left = NAME_CANDIDATE_RE.findall(left_segment)
    if candidates_left:
        holder_name = _normalize_text(candidates_left[-1])
    else:
        matched = NAME_CANDIDATE_RE.search(window)
        if matched:
            holder_name = _normalize_text(matched.group(1))

    return {
        "status": "verified",
        "register_id": None,
        "scope": [],
        "valid_until": None,
        "matched": {
            "full_name": holder_name,
            "certificate_number": cert_in,
            "authorization_number": None,
            "scope": [],
        },
        "snapshot": {
            "source": "ticr-live",
            "checked_at": datetime.utcnow().isoformat(),
        },
    }
