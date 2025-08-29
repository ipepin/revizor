"""add dokoncena

Revision ID: 8cddae075628
Revises: 18a84ac88796
Create Date: 2025-08-11 23:44:06.466351

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8cddae075628'
down_revision: Union[str, Sequence[str], None] = '18a84ac88796'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = [c["name"] for c in insp.get_columns(table)]
    return column in cols

def _column_exists(table: str, column: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    try:
        cols = [c["name"] for c in insp.get_columns(table)]
    except Exception:
        cols = []
    if column in cols:
        return True

    # SQLite double-check: PRAGMA table_info
    if bind.dialect.name == "sqlite":
        rows = bind.exec_driver_sql(f"PRAGMA table_info({table})").fetchall()
        names = [row[1] for row in rows]  # (cid, name, type, ...)
        if column in names:
            return True

    return False

def upgrade():
    # když už sloupec existuje, nedělej nic
    if _column_exists("revisions", "status"):
        return

    # bezpečně přes batch (funguje i na SQLite)
    with op.batch_alter_table("revisions") as batch_op:
        batch_op.add_column(sa.Column("status", sa.String(20), nullable=False, server_default="Rozpracovaná"))

    # naplň pro staré řádky; default na SQLite neřešíme (ALTER DROP DEFAULT neumí)
    op.execute("UPDATE revisions SET status = 'Rozpracovaná' WHERE status IS NULL")

    # na ne-SQLite můžeme default odstranit (volitelné)
    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        op.alter_column("revisions", "status", server_default=None)

def downgrade():
    if not _column_exists("revisions", "status"):
        return
    with op.batch_alter_table("revisions") as batch_op:
        batch_op.drop_column("status")