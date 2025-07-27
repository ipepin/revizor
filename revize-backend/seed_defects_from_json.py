# scripts/seed_defects_from_json.py

import os
import json
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import Defect

# 1) Path to your JSON file (adjust if you place it elsewhere)
HERE = os.path.dirname(__file__)
JSON_PATH = os.path.join(HERE, "defects.json")

def load_defects(path: str):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def seed_defects(db: Session, defects: list[dict]):
    for d in defects:
        # Skip if identical entry already exists
        exists = (
            db.query(Defect)
            .filter_by(
                description=d["description"],
                standard=d["standard"],
                article=d["article"],
            )
            .first()
        )
        if not exists:
            db.add(
                Defect(
                    description=d["description"],
                    standard=d["standard"],
                    article=d["article"],
                )
            )
    db.commit()

if __name__ == "__main__":
    # 2) Make sure tables are created
    Base.metadata.create_all(bind=engine)

    # 3) Load JSON and seed
    defects_list = load_defects(JSON_PATH)
    db = SessionLocal()
    try:
        seed_defects(db, defects_list)
        print(f"✅ Seeded {len(defects_list)} defects (duplicates skipped).")
    finally:
        db.close()
