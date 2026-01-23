from __future__ import annotations

import os
import logging
from typing import Optional

import httpx


MAILERSEND_API_URL = "https://api.mailersend.com/v1/email"
logger = logging.getLogger(__name__)


def _get_env(name: str, default: Optional[str] = None) -> Optional[str]:
    value = os.getenv(name)
    return value if value else default


def _public_api_base_url() -> str:
    return (
        _get_env("PUBLIC_API_BASE_URL")
        or _get_env("RENDER_EXTERNAL_URL")
        or "http://localhost:8000"
    )


def _from_email() -> str:
    return _get_env("MAIL_FROM_EMAIL", "admin@lb-eltech.online") or "admin@lb-eltech.online"


def _from_name() -> str:
    return _get_env("MAIL_FROM_NAME", "Revizor") or "Revizor"


def build_verification_link(token: str) -> str:
    base = _public_api_base_url().rstrip("/")
    return f"{base}/auth/verify?token={token}"


def send_email(
    to_email: str,
    subject: str,
    text: str,
    html: str,
    to_name: Optional[str] = None,
) -> bool:
    api_key = _get_env("MAILERSEND_API_KEY")
    if not api_key:
        return False

    payload = {
        "from": {"email": _from_email(), "name": _from_name()},
        "to": [{"email": to_email, "name": to_name or to_email}],
        "subject": subject,
        "text": text,
        "html": html,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    with httpx.Client(timeout=10.0) as client:
        resp = client.post(MAILERSEND_API_URL, json=payload, headers=headers)
        if not (200 <= resp.status_code < 300):
            logger.warning(
                "MailerSend error status=%s body=%s",
                resp.status_code,
                resp.text,
            )
        return 200 <= resp.status_code < 300


def send_verification_email(to_email: str, to_name: Optional[str], token: str) -> bool:
    link = build_verification_link(token)
    subject = "Overeni uctu Revizor"
    text = (
        "Dobry den,\n\n"
        "pro overeni uctu kliknete na tento odkaz:\n"
        f"{link}\n\n"
        "Pokud jste se neregistrovali, tento email ignorujte.\n"
    )
    html = (
        "<p>Dobry den,</p>"
        "<p>Pro overeni uctu kliknete na tento odkaz:</p>"
        f'<p><a href="{link}">{link}</a></p>'
        "<p>Pokud jste se neregistrovali, tento email ignorujte.</p>"
    )
    return send_email(to_email=to_email, subject=subject, text=text, html=html, to_name=to_name)
