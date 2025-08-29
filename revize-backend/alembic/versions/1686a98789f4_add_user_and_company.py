"""add user and company

Revision ID: 1686a98789f4
Revises: 7ac4044eb81a
Create Date: 2025-08-12 14:12:30.416808

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1686a98789f4'
down_revision: Union[str, Sequence[str], None] = '7ac4044eb81a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.create_table(
        "company_profiles",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("address", sa.String),
        sa.Column("ico", sa.String),
        sa.Column("dic", sa.String),
        sa.Column("email", sa.String),
        sa.Column("phone", sa.String),
        sa.Column("note", sa.String),
        sa.Column("is_default", sa.Boolean, server_default=sa.text("0")),
    )
    op.add_column("users", sa.Column("active_company_id", sa.Integer, sa.ForeignKey("company_profiles.id"), nullable=True))

def downgrade():
    op.drop_column("users", "active_company_id")
    op.drop_table("company_profiles")