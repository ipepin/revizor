"""add inspection templates

Revision ID: 9f4c2a1d8c7b
Revises: d7f1c6b2a3e4
Create Date: 2026-01-20 20:05:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "9f4c2a1d8c7b"
down_revision = "d7f1c6b2a3e4"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "inspection_templates",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("scope", sa.Enum("EI", "LPS", name="inspectiontemplatescope"), nullable=False),
        sa.Column("label", sa.String(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("user_id", "scope", "label", name="uq_inspection_template_label_per_user_scope"),
    )

    defaults = [
        ("EI", "Byt", "Byt o velikosti 3+1 se nachází v prvním patře bytového domu. Elektroinstalace je napájena z elektroměrového rozvaděče umístěného v technické místnosti v přízemí. Připojení je realizováno kabelem CYKY 5x6 mm². V bytě je instalována bytová rozvodnice, ze které jsou napájeny zásuvkové i světelné okruhy. Koupelna je vybavena doplňkovým pospojováním, osvětlení je řešeno LED svítidly. Veškeré obvody jsou jištěny proudovými chrániči s vybavovacím proudem 30 mA."),
        ("EI", "Rodinný dům", "Rodinný dům má dvě nadzemní podlaží a je napájen z hlavního domovního rozvaděče, který je umístěn na fasádě objektu. Vnitřní elektroinstalace je vedena kabely CYKY v PVC chráničkách. V každém podlaží je podružná rozvodnice. Jištění obvodů zajišťují jističe a proudové chrániče. Hromosvod je instalován dle ČSN EN 62305."),
        ("EI", "FVE", "Fotovoltaická elektrárna je instalována na střeše objektu a připojena k distribuční síti pomocí střídače. DC strana je vedena kabely s dvojitou izolací, přepěťové ochrany jsou instalovány na DC i AC straně. Střídač je uzemněn, výkon systému je 5 kWp. Elektrická schémata a dokumentace byly dodány."),
        ("EI", "Wallbox", "Nabíjecí stanice pro elektromobil je instalována na vnější zdi garáže a připojena k hlavnímu rozvaděči samostatným kabelem CYKY 5x10 mm². Jištění je provedeno proudovým chráničem typu B. Stanice je osazena přepěťovou ochranou a byla provedena zkouška funkce a komunikace s vozidlem."),
        ("EI", "Společné prostory", "Společné prostory v bytovém domě zahrnují chodby, sklepy a technické místnosti. Osvětlení je řešeno pomocí LED svítidel s časovým spínačem. Rozvodnice jsou označeny, kryty svorek jsou zajištěny. Veškerá kovová zařízení jsou připojena na pospojování. Revize se týkala funkčnosti, označení a mechanického stavu instalace."),
        ("EI", "Odběrné místo", "Odběrné místo se nachází na veřejně přístupném místě a je osazeno elektroměrovým rozvaděčem v plastovém provedení s třídou krytí IP44. Vnitřní propoje byly zkontrolovány, hromadné dálkové ovládání je funkční. Hlavní jistič odpovídá velikosti rezervovaného příkonu."),
        ("EI", "Nebytové prostory", "Nebytové prostory jsou určeny ke komerčnímu využití a elektroinstalace odpovídá provozním nárokům. V místnostech jsou zásuvkové a světelné obvody, připojení klimatizace a elektrospotřebičů. Provedeno kontrolní měření izolačního odporu, propojení pospojování a zajištění označení rozvaděčů."),
    ]

    op.execute(
        sa.text(
            "INSERT INTO inspection_templates (scope, label, body, user_id, is_default, created_at, updated_at) "
            "VALUES (:scope, :label, :body, NULL, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
        ),
        [{"scope": s, "label": l, "body": b} for s, l, b in defaults],
    )


def downgrade():
    op.drop_table("inspection_templates")
    op.execute("DROP TYPE IF EXISTS inspectiontemplatescope")
