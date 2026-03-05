
"""add revision uuid

Revision ID: 20260302195900_add_revision_uuid
Revises: 
Create Date: 2026-03-02T19:59:00.542578
"""

from alembic import op
import sqlalchemy as sa
import base64
import uuid as _uuid

# revision identifiers, used by Alembic.
revision = "20260302195900_add_revision_uuid"
down_revision = "9f4c2a1d8c7b"
branch_labels = None
depends_on = None


def _gen_uuid() -> str:
    token = base64.b32encode(_uuid.uuid4().bytes).decode("ascii").rstrip("=")
    return f"REV-{token}"


def upgrade():
    op.add_column("revisions", sa.Column("uuid", sa.String(length=40), nullable=True))
    op.create_index("ix_revisions_uuid", "revisions", ["uuid"], unique=True)

    bind = op.get_bind()
    res = bind.execute(sa.text("SELECT id FROM revisions WHERE uuid IS NULL"))
    ids = [row[0] for row in res]
    for rid in ids:
        bind.execute(
            sa.text("UPDATE revisions SET uuid = :uuid WHERE id = :id"),
            {"uuid": _gen_uuid(), "id": rid},
        )

def downgrade():
    op.drop_index("ix_revisions_uuid", table_name="revisions")
    op.drop_column("revisions", "uuid")
