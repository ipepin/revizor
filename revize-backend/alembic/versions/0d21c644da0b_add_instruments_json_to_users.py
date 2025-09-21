"""add instruments_json to users

Revision ID: 0d21c644da0b
Revises: 1686a98789f4
Create Date: 2025-09-04 22:00:17.807708

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0d21c644da0b'
down_revision: Union[str, Sequence[str], None] = '1686a98789f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # batch mód kvůli SQLite
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(
            sa.Column(
                "instruments_json",
                sa.Text(),
                nullable=False,
                server_default="[]",   # vyplní existující řádky
            )
        )

    # volitelné: odstranění server_default po naplnění
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("instruments_json", server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("instruments_json")