# utils/security.py
# -----------------------------------------------------------------------------
# Helpers for password hashing (bcrypt) and JWT tokens (PyJWT).
# Make sure you have PyJWT and bcrypt installed in your environment:
#   pip uninstall -y jwt python-jwt  # (remove conflicting packages)
#   pip install -U PyJWT bcrypt
# -----------------------------------------------------------------------------

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import bcrypt
import jwt  # <-- PyJWT


# ---- JWT settings (use env vars in production) --------------------------------
SECRET_KEY = os.getenv("SECRET_KEY", "change-me-super-secret-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))


# ---- Password hashing ---------------------------------------------------------
def hash_password(password: str) -> str:
    """Return bcrypt hash of the plain-text password."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Verify plain-text password against stored bcrypt hash."""
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


# ---- JWT helpers --------------------------------------------------------------
def create_access_token(data: Dict[str, Any], expires_minutes: Optional[int] = None) -> str:
    """
    Create a signed JWT.
    `data` should typically include {"sub": <user_id or email>}.
    """
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=expires_minutes or ACCESS_TOKEN_EXPIRE_MINUTES)

    # PyJWT accepts datetime objects for `exp` and `iat`
    to_encode.update({"exp": expire, "iat": now})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decode and verify a JWT. Raises PyJWT exceptions on error:
      - jwt.ExpiredSignatureError
      - jwt.InvalidTokenError / jwt.PyJWTError
    Caller (e.g., get_current_user) should handle these.
    """
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
