"""
Seed default snippets for EI and LPS scopes.

Usage:
    uvicorn/main env: activate venv
    python seed_snippets.py
"""

from datetime import datetime
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Snippet, SnippetScope


DEFAULT_SNIPPETS = [
    # EI (elektroinstalace)
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
        "body": "Naměřená hodnota přechodového odporu pospojovacího/ochranného vodiče nepřesáhla 0,1 Ω a svým průřezem splňuje požadavky ČSN 33 2000-5-54 ed. 3:2012, čl. 544.2.",
    },
    {
        "scope": SnippetScope.EI,
        "label": "Impedance smyček (AOZ)",
        "body": "Naměřené hodnoty impedance smyček uvedené v revizní zprávě jsou v souladu s dimenzemi předřazených jistících přístrojů a zajišťují tak požadavky ochrany automatickým odpojením od zdroje v předepsané době podle normy ČSN 33 2000-4-41 ed. 3:2018, čl. 411.4.4, a to i při uvažování bezpečnostního součinitele (2/3) dle ČSN 33 2000-6 ed. 2:2017, čl. D.6.4.3.7.3.",
    },
    {
        "scope": SnippetScope.EI,
        "label": "Bez závad (bezpečnost)",
        "body": "Na zařízení nebyly v době revize zjištěny závady, které by ohrožovaly bezpečnost a zdraví osob.",
    },
    {
        "scope": SnippetScope.EI,
        "label": "Poučení obsluhy",
        "body": "Bylo provedeno poučení a doporučena pravidelná kontrola bezpečnostních prvků.",
    },
    {
        "scope": SnippetScope.EI,
        "label": "BOZP – vyhl. 48/82",
        "body": "Ve smyslu vyhlášky č. 48/82 (BOZP) musí být obsluha elektrotechnických zařízení seznámena s bezpečným ovládáním a vypínáním těchto zařízení. Elektrická zařízení musí splňovat všechny požadované funkce a musí být udržována ve stavu odpovídajícím platným předpisům.",
    },
    {
        "scope": SnippetScope.EI,
        "label": "Protipožární ochrana",
        "body": "Protipožární ochrana: ",
    },
    {
        "scope": SnippetScope.EI,
        "label": "Prostory s vanou/sprchou",
        "body": "Vzhledem k tomu, že se v objektu vyskytují prostory s vanou a sprchou (ČSN 33 2000-7-701 ed. 2).",
    },
    {
        "scope": SnippetScope.EI,
        "label": "Odpovědnost provozovatele",
        "body": "Za provozuschopnost a bezpečnost zařízení odpovídá provozovatel.",
    },
    # LPS
    {
        "scope": SnippetScope.LPS,
        "label": "Odpor zemničů v toleranci",
        "body": "Odpor zemničů je v toleranci stanovené normou (≤ 15 Ω).",
    },
    {
        "scope": SnippetScope.LPS,
        "label": "Odpor zemničů mimo toleranci",
        "body": "Odpor zemničů není v toleranci stanovené normou (> 15 Ω).",
    },
    {
        "scope": SnippetScope.LPS,
        "label": "Zařízení v dobrém stavu",
        "body": "Hromosvodné zařízení je v dobrém stavu a odpovídá platným normám.",
    },
    {
        "scope": SnippetScope.LPS,
        "label": "Zařízení není v dobrém stavu",
        "body": "Hromosvodné zařízení není v dobrém stavu a odpovídá platným normám.",
    },
    {
        "scope": SnippetScope.LPS,
        "label": "SPD instalovány – funkční",
        "body": "Byly instalovány ochrany SPD, které jsou funkční.",
    },
    {
        "scope": SnippetScope.LPS,
        "label": "SPD instalovány – nefunkční",
        "body": "Byly instalovány ochrany SPD, které nejsou funkční.",
    },
    {
        "scope": SnippetScope.LPS,
        "label": "SPD neinstalovány",
        "body": "Nebyly instalovány ochrany SPD.",
    },
]


def seed(db: Session) -> None:
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
            continue
        s = Snippet(
            scope=item["scope"],
            label=item["label"],
            body=item["body"],
            user_id=None,
            is_default=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(s)
    db.commit()


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed(db)
        print("Seed snippets: done")
    finally:
        db.close()
