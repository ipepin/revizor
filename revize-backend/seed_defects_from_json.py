# scripts/seed_defects.py
import json, sys
from sqlalchemy.orm import Session
from sqlalchemy import and_
from database import SessionLocal
from models import Defect, DefectVisibility, ModerationStatus

def main(path: str = "defects.json") -> None:
    with open(path, "r", encoding="utf-8") as f:
        items = json.load(f)

    db: Session = SessionLocal()
    inserted = updated = skipped = 0
    try:
        for it in items:
            desc = (it.get("description") or "").strip()
            std  = (it.get("standard") or "").strip() or None
            art  = (it.get("article") or "").strip() or None
            if not desc:
                skipped += 1
                continue

            existing = (
                db.query(Defect)
                  .filter(
                      Defect.description == desc,
                      Defect.standard == std,
                      Defect.article == art,
                  )
                  .one_or_none()
            )

            if existing:
                changed = False
                if existing.visibility != DefectVisibility.global_:
                    existing.visibility = DefectVisibility.global_
                    changed = True
                if existing.moderation_status != ModerationStatus.none:
                    existing.moderation_status = ModerationStatus.none
                    changed = True
                if changed:
                    updated += 1
                else:
                    skipped += 1
            else:
                db.add(Defect(
                    description=desc,
                    standard=std,
                    article=art,
                    visibility=DefectVisibility.global_,
                    moderation_status=ModerationStatus.none,
                ))
                inserted += 1

        db.commit()
        print(f"✅ Inserted: {inserted}, Updated: {updated}, Skipped: {skipped}")
    finally:
        db.close()

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "defects.json")
