"""
Admin setup utility for SQLite DB used by the backend.

Actions:
- Ensure users table has boolean column `is_admin` (defaults to 0/False).
- Create or update user admin@lb-eltech.cz with password 'a', set is_admin=1 and is_verified=1.

Run with repo venv python to ensure bcrypt is available, e.g. on Windows:
  revize-backend\\venv\\Scripts\\python.exe revize-backend\\admin_setup.py
"""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path

try:
    import bcrypt  # provided by project venv
except Exception as e:
    raise SystemExit("bcrypt is required. Run with the project venv's Python.")


DB_PATH = Path(__file__).with_name("projects.db")


def ensure_is_admin_column(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(users)")
    cols = [row[1] for row in cur.fetchall()]
    if "is_admin" not in cols:
        # Add boolean column with default 0; SQLite uses INTEGER 0/1
        cur.execute("ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0")
        conn.commit()


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def upsert_admin(conn: sqlite3.Connection, email: str, password: str) -> None:
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE email = ?", (email,))
    row = cur.fetchone()
    pw_hash = hash_password(password)
    if row is None:
        # Create basic name if not present
        cur.execute(
            """
            INSERT INTO users (name, email, password_hash, is_verified, verification_token, is_admin, instruments_json)
            VALUES (?, ?, ?, 1, NULL, 1, ?)
            """,
            ("Admin", email, pw_hash, "[]"),
        )
    else:
        user_id = row[0]
        cur.execute(
            "UPDATE users SET password_hash = ?, is_verified = 1, is_admin = 1 WHERE id = ?",
            (pw_hash, user_id),
        )
    conn.commit()


def main() -> None:
    if not DB_PATH.exists():
        raise SystemExit(f"Database not found: {DB_PATH}")
    conn = sqlite3.connect(str(DB_PATH))
    try:
        ensure_is_admin_column(conn)
        upsert_admin(conn, "admin@lb-eltech.cz", "a")
    finally:
        conn.close()
    print("Admin user ensured: admin@lb-eltech.cz (password 'a'), is_admin=1")


if __name__ == "__main__":
    main()
