"""add label

Revision ID: d9092308f0de
Revises: 8cddae075628
Create Date: 2025-08-12 00:38:36.905866

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd9092308f0de'
down_revision: Union[str, Sequence[str], None] = '8cddae075628'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# alembic revision -m "add label to cables"


def upgrade():
    with op.batch_alter_table("cables") as b:
        b.add_column(sa.Column("label", sa.String(), nullable=True))

def downgrade():
    with op.batch_alter_table("cables") as b:
        b.drop_column("label")
