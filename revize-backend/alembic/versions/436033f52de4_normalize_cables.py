"""normalize cables

Revision ID: 436033f52de4
Revises: e66c54f36cfe
Create Date: 2025-08-11 20:25:21.697364

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text

# --- uprav si dle svého stromu ---
revision = "436033f52de4"
down_revision = "e66c54f36cfe"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = inspect(bind)

    # 1) cable_families (jen pokud neexistuje)
    if "cable_families" not in insp.get_table_names():
        op.create_table(
            "cable_families",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("name", sa.String, nullable=False, unique=True),
        )

    # 2) nová tabulka cables_new se správným schématem
    if "cables_new" in insp.get_table_names():
        op.drop_table("cables_new")

    op.create_table(
        "cables_new",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("family_id", sa.Integer, sa.ForeignKey("cable_families.id"), nullable=False),
        sa.Column("label", sa.String, nullable=False),
        sa.Column("spec", sa.String, nullable=True),
        sa.Column("note", sa.Text, nullable=True),
        sa.UniqueConstraint("label", name="uq_cables_label"),
    )

    # 3) překopírování dat ze staré "cables" (pokud existuje)
    if "cables" in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns("cables")}
        rows = bind.execute(text("SELECT * FROM cables")).mappings().all()

        fam_cache: dict[str, int] = {}

        for r in rows:
            # label (použij co máš; někdo měl dřív 'name')
            label = r.get("label") or r.get("name") or ""
            label = str(label).strip()

            # family_name – preferuj starý sloupec 'family', jinak prefix z labelu
            if "family" in cols and r.get("family"):
                family_name = str(r["family"]).strip()
            else:
                family_name = (label.split(" ", 1)[0] or "NEURČENO").strip()

            # založ/načti family_id
            fam_id = fam_cache.get(family_name)
            if fam_id is None:
                bind.execute(
                    text("INSERT OR IGNORE INTO cable_families(name) VALUES (:n)"),
                    {"n": family_name},
                )
                fam_id = bind.execute(
                    text("SELECT id FROM cable_families WHERE name = :n"),
                    {"n": family_name},
                ).scalar()
                fam_cache[family_name] = fam_id

            # spec – použij stávající 'spec', jinak odvoď z labelu (část za první mezerou)
            if "spec" in cols and r.get("spec"):
                spec = str(r["spec"]).strip()
            else:
                spec = label.split(" ", 1)[1].strip() if " " in label else None

            note = r.get("note")

            # Přenést se stejným id (OK i na SQLite)
            bind.execute(
                text(
                    """
                    INSERT INTO cables_new (id, family_id, label, spec, note)
                    VALUES (:id, :fid, :label, :spec, :note)
                    """
                ),
                {
                    "id": r.get("id"),
                    "fid": fam_id,
                    "label": label,
                    "spec": spec,
                    "note": note,
                },
            )

        # 4) zrušit starou tabulku cables
        op.drop_table("cables")

    # 5) přejmenovat cables_new -> cables
    op.rename_table("cables_new", "cables")


def downgrade():
    bind = op.get_bind()
    insp = inspect(bind)

    # vrátíme minimální staré schéma (label/family/spec/note)
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
            text(
                """
                SELECT c.id, c.label, f.name as family, c.spec, c.note
                FROM cables_new c
                JOIN cable_families f ON f.id = c.family_id
                """
            )
        ).mappings().all()

        for r in rows:
            bind.execute(
                text(
                    "INSERT INTO cables (id,label,family,spec,note) "
                    "VALUES (:id,:label,:family,:spec,:note)"
                ),
                r,
            )
        op.drop_table("cables_new")

    # a případně shodíme families
    if "cable_families" in insp.get_table_names():
        op.drop_table("cable_families")
