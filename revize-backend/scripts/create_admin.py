from __future__ import annotations

import os
import sys

from sqlalchemy.exc import IntegrityError

from database import Base, SessionLocal, engine
from models import User
from utils.security import hash_password


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        print(f"Missing required environment variable: {name}", file=sys.stderr)
        raise SystemExit(2)
    return value


def main() -> None:
    email = require_env("ADMIN_EMAIL").strip().lower()
    password = require_env("ADMIN_PASSWORD")
    name = os.getenv("ADMIN_NAME", "Administrátor").strip() or "Administrátor"

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.name = user.name or name
            user.password_hash = hash_password(password)
            user.is_verified = True
            user.is_admin = True
            user.verification_token = None
            print(f"Updated admin user: {email}")
        else:
            user = User(
                name=name,
                email=email,
                password_hash=hash_password(password),
                is_verified=True,
                is_admin=True,
                verification_token=None,
                instruments_json="[]",
            )
            db.add(user)
            print(f"Created admin user: {email}")

        db.commit()
    except IntegrityError as exc:
        db.rollback()
        print(f"Failed to create admin user: {exc}", file=sys.stderr)
        raise SystemExit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
