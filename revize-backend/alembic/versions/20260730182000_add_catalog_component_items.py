"""add catalog component items

Revision ID: catalog_component_items
Revises: merge_uuid_projnum
Create Date: 2026-07-30 18:20:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "catalog_component_items"
down_revision = "merge_uuid_projnum"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "catalog_component_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("granularity", sa.String(), nullable=False, server_default="variant"),
        sa.Column("manufacturer", sa.String(), nullable=False),
        sa.Column("device", sa.String(), nullable=False),
        sa.Column("series", sa.String(), nullable=False),
        sa.Column("manufacturer_type", sa.String(), nullable=True),
        sa.Column("catalog_number", sa.String(), nullable=True),
        sa.Column("rated_current_a", sa.String(), nullable=True),
        sa.Column("poles_total", sa.String(), nullable=True),
        sa.Column("poles_protected", sa.String(), nullable=True),
        sa.Column("pole_configuration", sa.String(), nullable=True),
        sa.Column("characteristic", sa.String(), nullable=True),
        sa.Column("breaking_capacity_ka", sa.String(), nullable=True),
        sa.Column("residual_current_ma", sa.String(), nullable=True),
        sa.Column("rcd_type", sa.String(), nullable=True),
        sa.Column("voltage_type", sa.String(), nullable=True),
        sa.Column("heat_loss_w", sa.String(), nullable=True),
        sa.Column("heat_loss_basis", sa.String(), nullable=True),
        sa.Column("catalog_status", sa.String(), nullable=False, server_default="current"),
        sa.Column("verification", sa.String(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "manufacturer",
            "device",
            "series",
            "manufacturer_type",
            "catalog_number",
            "rated_current_a",
            "pole_configuration",
            "characteristic",
            "residual_current_ma",
            "rcd_type",
            name="uq_catalog_component_item_identity",
        ),
    )
    op.create_index("ix_catalog_component_items_id", "catalog_component_items", ["id"])
    op.create_index("ix_catalog_component_items_manufacturer", "catalog_component_items", ["manufacturer"])
    op.create_index("ix_catalog_component_items_device", "catalog_component_items", ["device"])
    op.create_index("ix_catalog_component_items_series", "catalog_component_items", ["series"])
    op.create_index("ix_catalog_component_items_manufacturer_type", "catalog_component_items", ["manufacturer_type"])
    op.create_index("ix_catalog_component_items_catalog_number", "catalog_component_items", ["catalog_number"])
    op.create_index("ix_catalog_component_items_catalog_status", "catalog_component_items", ["catalog_status"])


def downgrade():
    op.drop_index("ix_catalog_component_items_catalog_status", table_name="catalog_component_items")
    op.drop_index("ix_catalog_component_items_catalog_number", table_name="catalog_component_items")
    op.drop_index("ix_catalog_component_items_manufacturer_type", table_name="catalog_component_items")
    op.drop_index("ix_catalog_component_items_series", table_name="catalog_component_items")
    op.drop_index("ix_catalog_component_items_device", table_name="catalog_component_items")
    op.drop_index("ix_catalog_component_items_manufacturer", table_name="catalog_component_items")
    op.drop_index("ix_catalog_component_items_id", table_name="catalog_component_items")
    op.drop_table("catalog_component_items")
