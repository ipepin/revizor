"""add status to revisions

Revision ID: 18a84ac88796
Revises: 4bf398672882
Create Date: 2025-08-11 23:10:45.164240

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '18a84ac88796'
down_revision: Union[str, Sequence[str], None] = '4bf398672882'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade():
    op.add_column(
        "revisions",
        sa.Column("status", sa.String(20), nullable=False, server_default="Rozpracovaná"),
    )
    # (volitelně) po naplnění defaultu ho sundat:
    op.alter_column("revisions", "status", server_default=None)

def downgrade():
    op.drop_column("revisions", "status")