from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Revision
from schemas import RevisionCreate

router = APIRouter()

@router.get("/revisions")
def get_all_revisions(db: Session = Depends(get_db)):
    return db.query(Revision).all()

@router.post("/revisions")
def create_revision(revision: RevisionCreate, db: Session = Depends(get_db)):
    new_revision = Revision(
        project_id=revision.project_id,
        number=revision.number,
        type=revision.type,
        date_done=revision.date_done,
        valid_until=revision.valid_until,
        status=revision.status,
        data_json=revision.data_json
    )
    db.add(new_revision)
    db.commit()
    db.refresh(new_revision)
    return new_revision

@router.delete("/revisions/{revision_id}")
def delete_revision(revision_id: int, db: Session = Depends(get_db)):
    rev = db.query(Revision).filter(Revision.id == revision_id).first()
    if not rev:
        return {"error": "Revize nenalezena"}
    db.delete(rev)
    db.commit()
    return {"message": "Revize byla smazána"}
