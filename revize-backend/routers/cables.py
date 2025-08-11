# routers/cables.py
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from pydantic import BaseModel
from database import get_db
from models import Cable, CableFamily

router = APIRouter(prefix="/cables", tags=["cables"])

class CableOut(BaseModel):
    id: int
    family: str
    dimension: str
    class Config: from_attributes = True

class CableCreate(BaseModel):
    family: str
    dimension: str

class CableUpdate(BaseModel):
    family: str | None = None
    dimension: str | None = None

def _get_or_create_family(db: Session, name: str) -> CableFamily:
    name = name.strip()
    fam = db.execute(select(CableFamily).where(func.lower(CableFamily.name) == name.lower())).scalar_one_or_none()
    if not fam:
        fam = CableFamily(name=name)
        db.add(fam)
        db.flush()
    return fam

@router.get("", response_model=list[CableOut])
def list_cables(
    db: Session = Depends(get_db),
    q: str | None = Query(None),
    family: str | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
):
    stmt = select(Cable, CableFamily.name).join(CableFamily, Cable.family_id == CableFamily.id)
    if family:
        stmt = stmt.where(func.lower(CableFamily.name) == family.lower().strip())
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(func.lower(Cable.spec).like(like) | func.lower(CableFamily.name).like(like))
    stmt = stmt.order_by(CableFamily.name.asc(), Cable.spec.asc()).offset(offset).limit(limit)
    rows = db.execute(stmt).all()
    return [{"id": c.id, "family": fam_name, "dimension": c.spec} for (c, fam_name) in rows]

@router.post("", response_model=CableOut, status_code=201)
def create_cable(body: CableCreate, db: Session = Depends(get_db)):
    fam = _get_or_create_family(db, body.family)
    spec = body.dimension.strip()
    # unikátnost
    exists = db.execute(
        select(Cable.id).where(Cable.family_id == fam.id, func.lower(Cable.spec) == spec.lower())
    ).scalar_one_or_none()
    if exists:
        raise HTTPException(409, "Tato kombinace rodiny a dimenze už existuje.")
    c = Cable(family_id=fam.id, spec=spec)
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "family": fam.name, "dimension": c.spec}

@router.patch("/{cable_id}", response_model=CableOut)
def update_cable(cable_id: int, body: CableUpdate, db: Session = Depends(get_db)):
    c = db.get(Cable, cable_id)
    if not c: raise HTTPException(404, "Nenalezeno")
    fam = db.get(CableFamily, c.family_id)
    if body.family and body.family.strip():
        fam = _get_or_create_family(db, body.family)
        c.family_id = fam.id
    if body.dimension and body.dimension.strip():
        c.spec = body.dimension.strip()
    # kontrola unikátnosti
    exists = db.execute(
        select(Cable.id).where(Cable.id != c.id, Cable.family_id == c.family_id, func.lower(Cable.spec) == c.spec.lower())
    ).scalar_one_or_none()
    if exists:
        raise HTTPException(409, "Tato kombinace rodiny a dimenze už existuje.")
    db.commit()
    db.refresh(c)
    fam = db.get(CableFamily, c.family_id)
    return {"id": c.id, "family": fam.name, "dimension": c.spec}

@router.delete("/{cable_id}", status_code=204)
def delete_cable(cable_id: int, db: Session = Depends(get_db)):
    c = db.get(Cable, cable_id)
    if not c: raise HTTPException(404, "Nenalezeno")
    db.delete(c)
    db.commit()
    return

# --- Našeptávače ---
@router.get("/families", response_model=list[str])
def families(db: Session = Depends(get_db)):
    rows = db.execute(select(CableFamily.name).order_by(CableFamily.name.asc())).scalars().all()
    return rows

@router.get("/dimensions", response_model=list[str])
def dimensions(family: str | None = None, db: Session = Depends(get_db)):
    stmt = select(func.distinct(Cable.spec)).join(CableFamily)
    if family:
        stmt = stmt.where(func.lower(CableFamily.name) == family.lower().strip())
    stmt = stmt.order_by(Cable.spec.asc())
    return db.execute(stmt).scalars().all()
# routers/cables.py
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from pydantic import BaseModel
from database import get_db
from models import Cable, CableFamily

router = APIRouter(prefix="/cables", tags=["cables"])

class CableOut(BaseModel):
    id: int
    family: str
    dimension: str
    class Config: from_attributes = True

class CableCreate(BaseModel):
    family: str
    dimension: str

class CableUpdate(BaseModel):
    family: str | None = None
    dimension: str | None = None

def _get_or_create_family(db: Session, name: str) -> CableFamily:
    name = name.strip()
    fam = db.execute(select(CableFamily).where(func.lower(CableFamily.name) == name.lower())).scalar_one_or_none()
    if not fam:
        fam = CableFamily(name=name)
        db.add(fam)
        db.flush()
    return fam

@router.get("", response_model=list[CableOut])
def list_cables(
    db: Session = Depends(get_db),
    q: str | None = Query(None),
    family: str | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
):
    stmt = select(Cable, CableFamily.name).join(CableFamily, Cable.family_id == CableFamily.id)
    if family:
        stmt = stmt.where(func.lower(CableFamily.name) == family.lower().strip())
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(func.lower(Cable.spec).like(like) | func.lower(CableFamily.name).like(like))
    stmt = stmt.order_by(CableFamily.name.asc(), Cable.spec.asc()).offset(offset).limit(limit)
    rows = db.execute(stmt).all()
    return [{"id": c.id, "family": fam_name, "dimension": c.spec} for (c, fam_name) in rows]

@router.post("", response_model=CableOut, status_code=201)
def create_cable(body: CableCreate, db: Session = Depends(get_db)):
    fam = _get_or_create_family(db, body.family)
    spec = body.dimension.strip()
    # unikátnost
    exists = db.execute(
        select(Cable.id).where(Cable.family_id == fam.id, func.lower(Cable.spec) == spec.lower())
    ).scalar_one_or_none()
    if exists:
        raise HTTPException(409, "Tato kombinace rodiny a dimenze už existuje.")
    c = Cable(family_id=fam.id, spec=spec)
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "family": fam.name, "dimension": c.spec}

@router.patch("/{cable_id}", response_model=CableOut)
def update_cable(cable_id: int, body: CableUpdate, db: Session = Depends(get_db)):
    c = db.get(Cable, cable_id)
    if not c: raise HTTPException(404, "Nenalezeno")
    fam = db.get(CableFamily, c.family_id)
    if body.family and body.family.strip():
        fam = _get_or_create_family(db, body.family)
        c.family_id = fam.id
    if body.dimension and body.dimension.strip():
        c.spec = body.dimension.strip()
    # kontrola unikátnosti
    exists = db.execute(
        select(Cable.id).where(Cable.id != c.id, Cable.family_id == c.family_id, func.lower(Cable.spec) == c.spec.lower())
    ).scalar_one_or_none()
    if exists:
        raise HTTPException(409, "Tato kombinace rodiny a dimenze už existuje.")
    db.commit()
    db.refresh(c)
    fam = db.get(CableFamily, c.family_id)
    return {"id": c.id, "family": fam.name, "dimension": c.spec}

@router.delete("/{cable_id}", status_code=204)
def delete_cable(cable_id: int, db: Session = Depends(get_db)):
    c = db.get(Cable, cable_id)
    if not c: raise HTTPException(404, "Nenalezeno")
    db.delete(c)
    db.commit()
    return

# --- Našeptávače ---
@router.get("/families", response_model=list[str])
def families(db: Session = Depends(get_db)):
    rows = db.execute(select(CableFamily.name).order_by(CableFamily.name.asc())).scalars().all()
    return rows

@router.get("/dimensions", response_model=list[str])
def dimensions(family: str | None = None, db: Session = Depends(get_db)):
    stmt = select(func.distinct(Cable.spec)).join(CableFamily)
    if family:
        stmt = stmt.where(func.lower(CableFamily.name) == family.lower().strip())
    stmt = stmt.order_by(Cable.spec.asc())
    return db.execute(stmt).scalars().all()
