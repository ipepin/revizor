"""
Seed default quick sentences for EI and LPS conclusion sections.
"""

from datetime import datetime
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Snippet, SnippetScope


DEFAULT_SNIPPETS = [
    {
        "scope": SnippetScope.EI,
        "label": "Revize dle ČSN",
        "body": "Revize byla provedena dle platných ČSN.",
    },
    {
        "scope": SnippetScope.EI,
        "label": "Izolační odpory",
        "body": "Naměřené hodnoty izolačních odporů jsou ve všech případech vyšší než 1 MΩ, takže vyhovují ČSN 33 2000-6 ed.2:2017, čl. 6.4.3.3.",
    },
    {
        "scope": SnippetScope.EI,
        "label": "Přechodový odpor (PE/pospoj.)",
        "body": "Naměřená hodnota přechodového odporu pospojovacího/ochranného vodiče nepřesáhla 0,1 Ω a svým průřezem splňuje požadavky ČSN 33 2000-5-54 ed.3:2012, čl. 544.2.",
    },
    {
        "scope": SnippetScope.EI,
        "label": "Impedance smyček (AOZ)",
        "body": "Naměřené hodnoty impedance smyček uvedené v revizní zprávě jsou v souladu s dimenzemi předřazených jistících přístrojů a zajišťují požadavky ochrany automatickým odpojením od zdroje v předepsané době podle ČSN 33 2000-4-41 ed.3:2018, čl. 411.4.4, a to i při uvažování bezpečnostního součinitele 2/3 dle ČSN 33 2000-6 ed.2:2017, čl. D.6.4.3.7.3.",
    },
    {
        "scope": SnippetScope.EI,
        "label": "Bez závad (bezpečnost)",
        "body": "Na zařízení nebyly v době revize zjištěny závady, které by ohrožovaly bezpečnost a zdraví osob.",
    },
    {
        "scope": SnippetScope.EI,
        "label": "Poučení obsluhy",
        "body": "Bylo provedeno poučení obsluhy a doporučena pravidelná kontrola bezpečnostních prvků.",
    },
    {
        "scope": SnippetScope.EI,
        "label": "BOZP - vyhl. 48/1982 Sb.",
        "body": "Ve smyslu vyhlášky č. 48/1982 Sb. musí být obsluha elektrických zařízení seznámena s bezpečným ovládáním a vypínáním těchto zařízení. Elektrická zařízení musí splňovat požadované funkce a musí být udržována ve stavu odpovídajícím platným předpisům.",
    },
    {
        "scope": SnippetScope.EI,
        "label": "Protipožární ochrana",
        "body": "Protipožární ochrana byla při revizi posouzena v rozsahu přístupných částí elektroinstalace.",
    },
    {
        "scope": SnippetScope.EI,
        "label": "Prostory s vanou/sprchou",
        "body": "V objektu se nacházejí prostory s vanou nebo sprchou, které byly posouzeny dle ČSN 33 2000-7-701 ed.2.",
    },
    {
        "scope": SnippetScope.EI,
        "label": "Odpovědnost provozovatele",
        "body": "Za provozuschopnost a bezpečnost zařízení po provedení revize odpovídá provozovatel.",
    },
    {
        "scope": SnippetScope.LPS,
        "label": "Odpor zemničů v toleranci",
        "body": "Odpor zemničů je v toleranci stanovené použitou normou.",
    },
    {
        "scope": SnippetScope.LPS,
        "label": "Odpor zemničů mimo toleranci",
        "body": "Odpor zemničů není v toleranci stanovené použitou normou.",
    },
    {
        "scope": SnippetScope.LPS,
        "label": "Zařízení v dobrém stavu",
        "body": "Hromosvodné zařízení je v dobrém technickém stavu a odpovídá požadavkům použité normy.",
    },
    {
        "scope": SnippetScope.LPS,
        "label": "Zařízení není v dobrém stavu",
        "body": "Hromosvodné zařízení není v dobrém technickém stavu a neodpovídá požadavkům použité normy.",
    },
    {
        "scope": SnippetScope.LPS,
        "label": "SPD instalovány - funkční",
        "body": "Přepěťové ochrany SPD jsou instalovány a při kontrole nevykazují závadu.",
    },
    {
        "scope": SnippetScope.LPS,
        "label": "SPD instalovány - nefunkční",
        "body": "Přepěťové ochrany SPD jsou instalovány, avšak při kontrole vykazují závadu.",
    },
    {
        "scope": SnippetScope.LPS,
        "label": "SPD neinstalovány",
        "body": "Přepěťové ochrany SPD nebyly v kontrolovaném rozsahu instalovány.",
    },
]


def seed(db: Session) -> tuple[int, int]:
    added = 0
    skipped = 0
    for item in DEFAULT_SNIPPETS:
        exists = (
            db.query(Snippet)
            .filter(
                Snippet.scope == item["scope"],
                Snippet.label == item["label"],
                Snippet.user_id == None,  # noqa: E711
            )
            .first()
        )
        if exists:
            skipped += 1
            continue
        db.add(
            Snippet(
                scope=item["scope"],
                label=item["label"],
                body=item["body"],
                user_id=None,
                is_default=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
        )
        added += 1
    db.commit()
    return added, skipped


if __name__ == "__main__":
    db = SessionLocal()
    try:
        added, skipped = seed(db)
        print(f"Seed snippets completed: added={added}, skipped={skipped}")
    finally:
        db.close()
