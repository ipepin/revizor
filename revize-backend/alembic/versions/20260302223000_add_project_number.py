"""add project number

Revision ID: 20260302223000_add_project_number
Revises: d7f1c6b2a3e4
Create Date: 2026-03-02 22:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260302223000_add_project_number"
down_revision = "d7f1c6b2a3e4"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("projects", sa.Column("number", sa.String(), nullable=True))
    op.create_index("ix_projects_number", "projects", ["number"], unique=False)

    bind = op.get_bind()
    owner_rows = bind.execute(
        sa.text("SELECT DISTINCT owner_id FROM projects WHERE owner_id IS NOT NULL ORDER BY owner_id")
    ).fetchall()

    for (owner_id,) in owner_rows:
        project_rows = bind.execute(
            sa.text(
                "SELECT id FROM projects WHERE owner_id = :owner_id ORDER BY id"
            ),
            {"owner_id": owner_id},
        ).fetchall()
        for seq, (project_id,) in enumerate(project_rows, start=1):
            bind.execute(
                sa.text("UPDATE projects SET number = :number WHERE id = :project_id"),
                {"number": f"{seq:03d}", "project_id": project_id},
            )

    orphan_rows = bind.execute(
        sa.text("SELECT id FROM projects WHERE owner_id IS NULL ORDER BY id")
    ).fetchall()
    for seq, (project_id,) in enumerate(orphan_rows, start=1):
        bind.execute(
            sa.text("UPDATE projects SET number = :number WHERE id = :project_id"),
            {"number": f"{seq:03d}", "project_id": project_id},
        )

    with op.batch_alter_table("projects") as batch:
        batch.alter_column("number", existing_type=sa.String(), nullable=False)


def downgrade():
    op.drop_index("ix_projects_number", table_name="projects")
    op.drop_column("projects", "number")
