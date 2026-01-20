"""add norms table

Revision ID: b6f7c1d1b2a9
Revises: f3a927c8d9b1
Create Date: 2026-01-05 20:05:00.000000
"""

from alembic import op
from alembic import context
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b6f7c1d1b2a9"
down_revision = "f3a927c8d9b1"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "norms",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scope", sa.Enum("EI", name="normscope"), nullable=False),
        sa.Column("label", sa.String(), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("scope", "label", name="uq_norm_scope_label"),
    )
    op.create_index("ix_norms_id", "norms", ["id"])


def downgrade():
    op.drop_index("ix_norms_id", table_name="norms")
    op.drop_table("norms")
    if context.get_context().dialect.name != "sqlite":
        op.execute("DROP TYPE IF EXISTS normscope")
