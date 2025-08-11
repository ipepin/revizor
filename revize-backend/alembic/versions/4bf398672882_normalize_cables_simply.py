"""normalize cables simply

Revision ID: 4bf398672882
Revises: 436033f52de4
Create Date: 2025-08-11 21:03:33.510209

"""
# alembic/versions/xxxx_simplify_cables_family_spec.py
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text

revision = "4bf398672882"
down_revision = "436033f52de4"  # ← nastav na tvoji poslední revizi
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = inspect(bind)

    # jistota, že existuje cable_families
    if "cable_families" not in insp.get_table_names():
        op.create_table(
            "cable_families",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("name", sa.String, nullable=False, unique=True),
        )

    # nová čistá tabulka
    op.create_table(
        "cables_new",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("family_id", sa.Integer, sa.ForeignKey("cable_families.id"), nullable=False, index=True),
        sa.Column("spec", sa.String, nullable=False, index=True),  # dimenze
        sa.UniqueConstraint("family_id", "spec", name="uq_cables_family_spec"),
    )

    if "cables" in insp.get_table_names():
        rows = bind.execute(text("SELECT * FROM cables")).mappings().all()
        cols = {c["name"] for c in insp.get_columns("cables")}

        fam_cache = {}
        for r in rows:
            # zvol label/spec z historických dat
            label = (r.get("label") or r.get("name") or "").strip()
            # family
            if "family_id" in cols and r.get("family_id"):
                family_id = r["family_id"]
            else:
                if "family" in cols and r.get("family"):
                    fam_name = str(r["family"]).strip()
                else:
                    fam_name = (label.split(" ", 1)[0] or "").strip() or "NEURČENO"

                family_id = fam_cache.get(fam_name)
                if family_id is None:
                    bind.execute(text("INSERT OR IGNORE INTO cable_families(name) VALUES (:n)"), {"n": fam_name})
                    family_id = bind.execute(text("SELECT id FROM cable_families WHERE name=:n"), {"n": fam_name}).scalar()
                    fam_cache[fam_name] = family_id

            # spec/dimenze
            if "spec" in cols and r.get("spec"):
                spec = str(r["spec"]).strip()
            else:
                spec = label.split(" ", 1)[1].strip() if " " in label else ""

            bind.execute(
                text("INSERT INTO cables_new(id, family_id, spec) VALUES (:id,:fid,:spec)"),
                {"id": r.get("id"), "fid": family_id, "spec": spec},
            )

        op.drop_table("cables")

    op.rename_table("cables_new", "cables")


def downgrade():
    bind = op.get_bind()
    insp = inspect(bind)

    if "cables" in insp.get_table_names():
        op.rename_table("cables", "cables_new")

    op.create_table(
        "cables",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("label", sa.String, unique=True),
        sa.Column("family", sa.String),
        sa.Column("spec", sa.String),
        sa.Column("note", sa.Text),
    )

    if "cables_new" in insp.get_table_names():
        rows = bind.execute(
            text("SELECT n.id, f.name AS family, n.spec FROM cables_new n JOIN cable_families f ON f.id=n.family_id")
        ).mappings().all()
        for r in rows:
            label = f'{r["family"]} {r["spec"]}'.strip()
            bind.execute(
                text("INSERT INTO cables(id,label,family,spec) VALUES (:id,:label,:family,:spec)"),
                {"id": r["id"], "label": label, "family": r["family"], "spec": r["spec"]},
            )
        op.drop_table("cables_new")

    if "cable_families" in insp.get_table_names():
        op.drop_table("cable_families")
