"""defects upgrade

Revision ID: 79e53349b6af
Revises: 2292ca6b828d
Create Date: 2025-09-05 21:03:41.337794

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '79e53349b6af'
down_revision: Union[str, Sequence[str], None] = '2292ca6b828d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column("defects", sa.Column("visibility", sa.Enum("global", "user", name="defectvisibility"), nullable=False, server_default="user"))
    op.add_column("defects", sa.Column("moderation_status", sa.Enum("none", "pending", "rejected", name="moderationstatus"), nullable=False, server_default="none"))
    op.add_column("defects", sa.Column("owner_id", sa.Integer(), nullable=True))
    op.add_column("defects", sa.Column("approved_by", sa.Integer(), nullable=True))
    op.add_column("defects", sa.Column("reject_reason", sa.Text(), nullable=True))
    op.add_column("defects", sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("(DATETIME('now'))")))
    op.add_column("defects", sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("(DATETIME('now'))")))
    op.add_column("defects", sa.Column("approved_at", sa.DateTime(), nullable=True))

    op.create_foreign_key(None, "defects", "users", ["owner_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key(None, "defects", "users", ["approved_by"], ["id"], ondelete="SET NULL")

def downgrade():
    op.drop_constraint(None, "defects", type_="foreignkey")
    op.drop_constraint(None, "defects", type_="foreignkey")
    op.drop_column("defects", "approved_at")
    op.drop_column("defects", "updated_at")
    op.drop_column("defects", "created_at")
    op.drop_column("defects", "reject_reason")
    op.drop_column("defects", "approved_by")
    op.drop_column("defects", "owner_id")
    op.drop_column("defects", "moderation_status")
    op.drop_column("defects", "visibility")
    op.execute("DROP TYPE defectvisibility")  # u Postgresu; u SQLite netřeba
    op.execute("DROP TYPE moderationstatus")