"""merge revision uuid and project number heads

Revision ID: merge_uuid_projnum
Revises: 20260302195900_add_revision_uuid, 20260302223000_add_project_number
Create Date: 2026-07-30 12:35:00.000000
"""

from alembic import op  # noqa: F401
import sqlalchemy as sa  # noqa: F401


revision = "merge_uuid_projnum"
down_revision = ("20260302195900_add_revision_uuid", "20260302223000_add_project_number")
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
