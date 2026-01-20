"""extend normscope with LPS

Revision ID: c9e12c6d64a2
Revises: b6f7c1d1b2a9
Create Date: 2026-01-05 20:20:00.000000
"""

from alembic import op
from sqlalchemy import Enum


# revision identifiers, used by Alembic.
revision = "c9e12c6d64a2"
down_revision = "b6f7c1d1b2a9"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name
    if dialect == "postgresql":
        op.execute("ALTER TYPE normscope ADD VALUE IF NOT EXISTS 'LPS'")
    else:
        with op.batch_alter_table("norms") as batch:
            batch.alter_column(
                "scope",
                existing_type=Enum("EI", name="normscope"),
                type_=Enum("EI", "LPS", name="normscope"),
                existing_nullable=False,
            )


def downgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name
    if dialect == "postgresql":
        # Downgrade of enum values is non-trivial; leave as-is.
        return
    with op.batch_alter_table("norms") as batch:
        batch.alter_column(
            "scope",
            existing_type=Enum("EI", "LPS", name="normscope"),
            type_=Enum("EI", name="normscope"),
            existing_nullable=False,
        )
