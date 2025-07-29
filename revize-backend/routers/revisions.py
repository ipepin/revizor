# routers/revisions.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any, Dict
from database import get_db
from models import Revision
from schemas import RevisionRead, RevisionUpdate

router = APIRouter(prefix="/revisions", tags=["revisions"])

@router.get("/{rev_id}", response_model=RevisionRead)
def get_revision(rev_id: int, db: Session = Depends(get_db)):
    rev = db.get(Revision, rev_id)
    if not rev:
        raise HTTPException(404, "Revision not found")
    # předpokládáme, že ReviseRead.data_json je str
    return rev

@router.patch("/{rev_id}", response_model=RevisionRead)
def patch_revision(
    rev_id: int,
    payload: RevisionUpdate,
    db: Session = Depends(get_db),
):
    rev = db.get(Revision, rev_id)
    if not rev:
        raise HTTPException(404, "Revision not found")
    data: Dict[str, Any] = payload.model_dump(exclude_unset=True)
    # vezmeme data_json jako JSON field
    if "data_json" in data:
        rev.data_json = data["data_json"]
    db.commit()
    db.refresh(rev)
    return rev
