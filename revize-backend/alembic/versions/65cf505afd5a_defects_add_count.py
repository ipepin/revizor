"""defects ADD COUNT

Revision ID: 65cf505afd5a
Revises: ae23256e3f51
Create Date: 2025-09-10 15:13:53.117147

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '65cf505afd5a'
down_revision: Union[str, Sequence[str], None] = 'ae23256e3f51'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("defects") as batch_op:
        batch_op.add_column(sa.Column("usage_count", sa.Integer(), nullable=False, server_default="0"))

def downgrade() -> None:
    with op.batch_alter_table("defects") as batch_op:
        batch_op.drop_column("usage_count")