"""defects finalize columns

Revision ID: ae23256e3f51
Revises: f1b1abf4c60f
Create Date: 2025-09-10 13:28:00.200528

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ae23256e3f51'
down_revision: Union[str, Sequence[str], None] = 'f1b1abf4c60f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(conn, table: str, column: str) -> bool:
    rows = conn.exec_driver_sql(f"PRAGMA table_info('{table}')").fetchall()
    return any(r[1] == column for r in rows)


def upgrade() -> None:
    conn = op.get_bind()

    # NEPŘIDÁVÁME 'visibility' (ta už dělala konflikt),
    # jen doplníme cokoliv, co ještě chybí.
    if not _has_column(conn, "defects", "moderation_status"):
        op.add_column(
            "defects",
            sa.Column(
                "moderation_status",
                sa.Enum("none", "pending", "rejected", name="moderationstatus"),
                nullable=False,
                server_default="none",
            ),
        )

    if not _has_column(conn, "defects", "owner_id"):
        op.add_column("defects", sa.Column("owner_id", sa.Integer(), nullable=True))

    if not _has_column(conn, "defects", "approved_by"):
        op.add_column("defects", sa.Column("approved_by", sa.Integer(), nullable=True))

    if not _has_column(conn, "defects", "reject_reason"):
        op.add_column("defects", sa.Column("reject_reason", sa.Text(), nullable=True))

    if not _has_column(conn, "defects", "created_at"):
        op.add_column("defects", sa.Column("created_at", sa.DateTime(), nullable=True))
        op.execute("UPDATE defects SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL")

    if not _has_column(conn, "defects", "updated_at"):
        op.add_column("defects", sa.Column("updated_at", sa.DateTime(), nullable=True))
        op.execute("UPDATE defects SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL")

    if not _has_column(conn, "defects", "approved_at"):
        op.add_column("defects", sa.Column("approved_at", sa.DateTime(), nullable=True))

    # Zkuste zpřísnit NULLable – pokud SQLite nedovolí, nevadí
    try:
        with op.batch_alter_table("defects") as batch:
            if _has_column(conn, "defects", "created_at"):
                batch.alter_column("created_at", nullable=False)
            if _has_column(conn, "defects", "updated_at"):
                batch.alter_column("updated_at", nullable=False)
    except Exception:
        pass

    # Odstranit server_defaulty, pokud jsme je právě vytvořili
    try:
        with op.batch_alter_table("defects") as batch:
            if _has_column(conn, "defects", "moderation_status"):
                batch.alter_column("moderation_status", server_default=None)
    except Exception:
        pass


def downgrade() -> None:
    # Bezpečné odstranění jen existujících sloupců
    conn = op.get_bind()
    for col in [
        "approved_at",
        "updated_at",
        "created_at",
        "reject_reason",
        "approved_by",
        "owner_id",
        "moderation_status",
    ]:
        rows = conn.exec_driver_sql("PRAGMA table_info('defects')").fetchall()
        if any(r[1] == col for r in rows):
            try:
                op.drop_column("defects", col)
            except Exception:
                pass