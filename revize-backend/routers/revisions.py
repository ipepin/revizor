# routers/revisions.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Any, Dict
import json

from database import get_db
from models import Revision
from schemas import RevisionRead, RevisionUpdate, RevisionCreate

router = APIRouter(prefix="/revisions", tags=["revisions"])

@router.post(
    "/",
    response_model=RevisionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_revision(
    payload: RevisionCreate,
    db: Session = Depends(get_db),
):
    # spočítáme, kolik revizí už existuje pro daný projekt
    existing_count = (
        db.query(func.count(Revision.id))
          .filter(Revision.project_id == payload.project_id)
          .scalar()
    ) or 0

    # seq: pořadové číslo revize v rámci projektu
    seq = existing_count + 1
    # rok z data provedení revize
    year = payload.date_done.year
    # formát čísla: RZ-<project_id>-<seq>-<year>
    evid_number = f"RZ-{payload.project_id}-{seq}-{year}"

    # JSON sloupec ukládá text
    data_json_str = json.dumps(payload.data_json, ensure_ascii=False)

    rev = Revision(
        project_id=payload.project_id,
        type=payload.type,
        number=evid_number,
        date_done=payload.date_done,
        valid_until=payload.valid_until,
        status=payload.status,
        data_json=data_json_str,
    )
    db.add(rev)
    db.commit()
    db.refresh(rev)
    return rev

@router.get("/{rev_id}", response_model=RevisionRead)
def get_revision(
    rev_id: int,
    db: Session = Depends(get_db),
):
    rev = db.get(Revision, rev_id)
    if not rev:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Revision not found")
    # rev.data_json je string, musíme ho deserializovat na dict
    data_json = json.loads(rev.data_json) if rev.data_json else {}
    # vrátíme Pydantic model s dict místo stringu
    return RevisionRead(
        id=rev.id,
        project_id=rev.project_id,
        type=rev.type,
        number=rev.number,
        date_done=rev.date_done,
        valid_until=rev.valid_until,
        status=rev.status,
        data_json=data_json,
        defects=rev.defects,
        conclusion_text=rev.conclusion_text,
        conclusion_safety=rev.conclusion_safety,
        conclusion_valid_until=rev.conclusion_valid_until,
    )

@router.patch("/{rev_id}", response_model=RevisionRead)
def patch_revision(
    rev_id: int,
    payload: RevisionUpdate,
    db: Session = Depends(get_db),
):
    rev = db.get(Revision, rev_id)
    if not rev:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Revision not found")
    data: Dict[str, Any] = payload.model_dump(exclude_unset=True)
    if "data_json" in data:
        rev.data_json = json.dumps(data["data_json"], ensure_ascii=False)
    db.commit()
    db.refresh(rev)
    return rev

@router.delete("/{rev_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_revision(
    rev_id: int,
    db: Session = Depends(get_db),
):
    rev = db.get(Revision, rev_id)
    if not rev:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Revision not found")
    db.delete(rev)
    db.commit()
    # vracíme prázdný obsah s HTTP 204
    return None
