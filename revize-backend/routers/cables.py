from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Cable, User
from routers.auth import get_current_user

router = APIRouter(prefix="/cables", tags=["cables"])

@router.get("")
def list_cables(q: str | None = Query(None), family: str | None = Query(None), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    qry = db.query(Cable)
    if family: qry = qry.filter(Cable.family == family)
    if q:
        like = f"%{q}%"
        qry = qry.filter((Cable.label.ilike(like)) | (Cable.spec.ilike(like)))
    return qry.order_by(Cable.family, Cable.spec).all()

@router.post("")
def create_cable(data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    label = data.get("label") or f"{data.get('family','')} {data.get('spec','')}".strip()
    c = Cable(**{**data, "label": label})
    db.add(c); db.commit(); db.refresh(c)
    return c

@router.put("/{cable_id}")
def update_cable(cable_id: int, data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = db.query(Cable).get(cable_id)
    if not c: raise HTTPException(404, "Cable not found")
    for k, v in data.items(): setattr(c, k, v)
    if not c.label: c.label = f"{c.family} {c.spec}".strip()
    db.commit(); db.refresh(c)
    return c

@router.delete("/{cable_id}")
def delete_cable(cable_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = db.query(Cable).get(cable_id)
    if not c: raise HTTPException(404, "Cable not found")
    db.delete(c); db.commit()
    return {"ok": True}