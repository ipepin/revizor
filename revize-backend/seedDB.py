# scripts/seed_projects_and_revisions.py

import random
from datetime import date, timedelta
from sqlalchemy.orm import Session

from database import SessionLocal, engine, Base
from models import Project, Revision

# 1) Vytvoření všech tabulek (pokud ještě neexistují)
Base.metadata.create_all(bind=engine)

# 2) Definice testovacích dat
PROJECT_COUNT = 10
REVISION_TYPES = ["electro", "appliance", "fve", "odberne_misto"]
STATUSES = ["draft", "in_review", "completed"]

def random_date(start: date, end: date) -> date:
    """Vrátí náhodné datum mezi start a end."""
    delta = end - start
    return start + timedelta(days=random.randint(0, delta.days))

def seed(db: Session):
    for i in range(1, PROJECT_COUNT + 1):
        proj = Project(
            address=f"Ulice {i}, Město {i}",
            client=f"Klient {i}",
            owner_id=None  # nebo nějaký existující uživatel
        )
        db.add(proj)
        db.flush()  # aby získal proj.id

        # Pro tento projekt vytvoříme 1–3 revize
        rev_count = random.randint(1, 3)
        for j in range(1, rev_count + 1):
            done = random_date(date(2020, 1, 1), date(2022, 12, 31))
            valid = done + timedelta(days=365)
            rev = Revision(
                number=f"REV-{proj.id:02d}-{j:02d}",
                type=random.choice(REVISION_TYPES),
                date_done=done.isoformat(),
                valid_until=valid.isoformat(),
                status=random.choice(STATUSES),
                data_json="{}",            # prázdné JSON pole
                defects="",                # prázdný řetězec
                conclusion_text="",        # prázdný řetězec
                conclusion_safety="",      # prázdný řetězec
                conclusion_valid_until="", # prázdný řetězec
                project_id=proj.id,
            )
            db.add(rev)

    db.commit()
    print(f"✅ Seedováno {PROJECT_COUNT} projektů s revizemi.")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
