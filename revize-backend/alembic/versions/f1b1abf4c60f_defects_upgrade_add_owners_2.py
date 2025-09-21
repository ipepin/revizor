"""defects upgrade add owners 2

Revision ID: f1b1abf4c60f
Revises: 0ac07acbed09
Create Date: 2025-09-10 13:11:34.472847

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1b1abf4c60f'
down_revision: Union[str, Sequence[str], None] = '0ac07acbed09'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(conn, table: str, column: str) -> bool:
    # SQLite-safe detekce sloupců
    rows = conn.exec_driver_sql(f"PRAGMA table_info('{table}')").fetchall()
    # PRAGMA schema: (cid, name, type, notnull, dflt_value, pk)
    return any(r[1] == column for r in rows)


def upgrade() -> None:
    conn = op.get_bind()

    # POZOR: na SQLite je Enum jen VARCHAR – to je v pořádku
    if not _has_column(conn, "defects", "visibility"):
        op.add_column(
            "defects",
            sa.Column(
                "visibility",
                sa.Enum("global_", "user", name="defectvisibility"),
                nullable=False,
                server_default="user",
            ),
        )

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
        # inicializace starých řádků
        op.execute("UPDATE defects SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL")

    if not _has_column(conn, "defects", "updated_at"):
        op.add_column("defects", sa.Column("updated_at", sa.DateTime(), nullable=True))
        op.execute("UPDATE defects SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL")

    if not _has_column(conn, "defects", "approved_at"):
        op.add_column("defects", sa.Column("approved_at", sa.DateTime(), nullable=True))

    # zkusit zpřísnit NULLable – na SQLite nemusí vždy projít, proto try/except
    try:
        with op.batch_alter_table("defects") as batch:
            batch.alter_column("created_at", nullable=False)
            batch.alter_column("updated_at", nullable=False)
    except Exception:
        pass

    # po doplnění dat odeber defaulty (ať se nové řádky neplní potají)
    try:
        with op.batch_alter_table("defects") as batch:
            batch.alter_column("visibility", server_default=None)
            batch.alter_column("moderation_status", server_default=None)
    except Exception:
        pass


def downgrade() -> None:
    conn = op.get_bind()
    # bezpečné mazání pouze existujících sloupců
    for col in [
        "approved_at",
        "updated_at",
        "created_at",
        "reject_reason",
        "approved_by",
        "owner_id",
        "moderation_status",
        "visibility",
    ]:
        if _has_column(conn, "defects", col):
            try:
                op.drop_column("defects", col)
            except Exception:
                pass