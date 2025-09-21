"""seed defects

Revision ID: 2292ca6b828d
Revises: 0d21c644da0b
Create Date: 2025-09-05 20:38:21.177325

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2292ca6b828d'
down_revision: Union[str, Sequence[str], None] = '0d21c644da0b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


defects_table = sa.table(
    "defects",
    sa.column("id", sa.Integer),
    sa.column("description", sa.String),
    sa.column("standard", sa.String),
    sa.column("article", sa.String),
)

SEED = [
  {"description": "Ochranné pospojování - HOP", "standard": "33 2000-5-54 ed.3:2012", "article": "542.4"},
  {"description": "Značení jističů a spínacích prvků", "standard": "332000-5-51 ed.3:2022", "article": "514.4"},
  {"description": "Značení vodičů", "standard": "332000-5-51 ed.3:2022", "article": "514.3"},
  {"description": "Uzemňovací svorka - pospojování", "standard": "33 2000-5-54 ed.3:2012", "article": "542.4"},
  {"description": "Min. průřez ochr. Vodiče", "standard": "33 2000-5-54 ed.3:2012", "article": "543.1"},
  {"description": "Spojitost ochranného vodiče", "standard": "34 2000-5-54 ed.3:2012", "article": "543.3"},
  {"description": "Průřez vodiče k HOP", "standard": "35 2000-5-54 ed.3:2012", "article": "544.1"},
  {"description": "Koupelna - RCD", "standard": "332000-7 ed.2:2007", "article": "701.415.1"},
  {"description": "Koupelna - Pospojování", "standard": "332000-7 ed.3:2007", "article": "701.415.2"},
  {"description": "Koupelna - umístění spínačů", "standard": "332000-7 ed.3:2007", "article": "701.512.4"},
  {"description": "FVE - označení", "standard": "332000-7-712", "article": "712.514.1"},
  {"description": "Značení vodičů", "standard": "332000-1 ed.2:2009", "article": "134.1.3"},
  {"description": "provozní spolehlivost- svorkovnice, šrouby", "standard": "332130 ed 4:2024", "article": "4. 1. b)"},
  {"description": "Splnění izolačního odporu", "standard": "ČSN 33 2000-6 ed.2:2017", "article": "6.4.3.3"},
  {"description": "Pospojení neživých částí s ochranným vodičem- 0,1 ohm", "standard": "ČSN 330360", "article": "6.1"},
  {"description": "impedance smyčky - X1,5", "standard": "ČSN 332000-6 ed.2: 2017", "article": "6.4.3.7.3"},
  {"description": "Zřizování, montáž, pokyny výrobce", "standard": "ČSN 332000-1 ed.2:2009", "article": "134.1"},
  {"description": "Šroubové spoje, povolené svorky", "standard": "ČSN 332000-1 ed.2:2010", "article": "134.1.4"},
  {"description": "Porušení vlastností zařízení (IP, ochrana apod)", "standard": "332000-1 ed.2:2009", "article": "134.1.2"},
  {"description": "Chybějící projektová, provozní dokumentace, protokol o VV ...", "standard": "NV 190/2022 Sb. Příloha 2", "article": "Část A, odst. 1/2"},
  {"description": "Špatné uchycení svodů, jímačů apod.", "standard": "62305-3 ed. 2", "article": "5.5.2 "},
  {"description": "Porušení krytu rozvaděče apod.", "standard": "ČSN 332000 4-41 ", "article": "412.2.2"},
  {"description": "Porušení krytu rozvaděče NN", "standard": "ČSN EN 61439-1", "article": "8.2.2"},
  {"description": "Porušení pospojení rozvaděče", "standard": "ČSN EN 61439-1", "article": "8.4.3.2.2"},
  {"description": "Silné jištění, slabý vodič", "standard": "ČSN 33 2000-5-51 ed. 3:2022", "article": "512.1.2"},
]

def upgrade():
    conn = op.get_bind()
    # ověř, že tabulka existuje (pro jistotu – hlavně u SQLite)
    inspector = sa.inspect(conn)
    if "defects" not in inspector.get_table_names():
        return

    # načti už existující popisy, ať nevkládáme duplicitně
    existing = set()
    try:
        rows = conn.execute(sa.text("SELECT description FROM defects")).fetchall()
        existing = {r[0] for r in rows}
    except Exception:
        pass

    to_insert = [row for row in SEED if row["description"] not in existing]
    if to_insert:
        op.bulk_insert(defects_table, to_insert)

def downgrade():
    conn = op.get_bind()
    try:
        for row in SEED:
            conn.execute(sa.text("DELETE FROM defects WHERE description = :d"), {"d": row["description"]})
    except Exception:
        pass