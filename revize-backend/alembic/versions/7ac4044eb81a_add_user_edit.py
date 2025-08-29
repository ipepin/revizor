"""add user edit

Revision ID: 7ac4044eb81a
Revises: d9092308f0de
Create Date: 2025-08-12 13:24:28.140220

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7ac4044eb81a'
down_revision: Union[str, Sequence[str], None] = 'd9092308f0de'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("certificate_number", sa.String(), nullable=True))
    op.add_column("users", sa.Column("authorization_number", sa.String(), nullable=True))
    op.add_column("users", sa.Column("address", sa.String(), nullable=True))
    op.add_column("users", sa.Column("ico", sa.String(), nullable=True))
    op.add_column("users", sa.Column("dic", sa.String(), nullable=True))
    op.add_column("users", sa.Column("birth_date", sa.String(), nullable=True))
    op.add_column("users", sa.Column("phone", sa.String(), nullable=True))

def downgrade() -> None:
    op.drop_column("users", "phone")
    op.drop_column("users", "birth_date")
    op.drop_column("users", "dic")
    op.drop_column("users", "ico")
    op.drop_column("users", "address")
    op.drop_column("users", "authorization_number")
    op.drop_column("users", "certificate_number")