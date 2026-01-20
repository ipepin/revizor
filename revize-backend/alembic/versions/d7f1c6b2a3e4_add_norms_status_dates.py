"""add norms status and dates

Revision ID: d7f1c6b2a3e4
Revises: c9e12c6d64a2
Create Date: 2026-01-05 20:45:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "d7f1c6b2a3e4"
down_revision = "c9e12c6d64a2"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("norms", sa.Column("status", sa.String(), nullable=True))
    op.add_column("norms", sa.Column("issued_on", sa.String(), nullable=True))
    op.add_column("norms", sa.Column("canceled_on", sa.String(), nullable=True))


def downgrade():
    op.drop_column("norms", "canceled_on")
    op.drop_column("norms", "issued_on")
    op.drop_column("norms", "status")
