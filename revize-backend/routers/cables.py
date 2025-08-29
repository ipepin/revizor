# routers/cables.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from database import get_db
from models import Cable, CableFamily

router = APIRouter(prefix="/cables", tags=["cables"])

# ---------- Schemas ----------

class CableFamilyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str

class CableFamilyCreate(BaseModel):
    name: str

class CableFamilyUpdate(BaseModel):
    name: Optional[str] = None


class CableOut(BaseModel):
    # Vracený tvar pro FE (počítaný label)
    id: int
    family_id: int
    family: Optional[str] = None
    spec: str
    label: Optional[str] = None

class CableCreate(BaseModel):
    family_id: int
    spec: str
    # FE může poslat label, ale ignorujeme ho (počítáme z family+spec)
    label: Optional[str] = None

class CableUpdate(BaseModel):
    family_id: Optional[int] = None
    spec: Optional[str] = None
    label: Optional[str] = None  # ignorujeme, jen kvůli kompatibilitě


# ---------- Helpers ----------

def _to_out(c: Cable) -> CableOut:
    fam_name = c.family.name if c.family else None
    label = f"{fam_name or ''} {c.spec or ''}".strip() or None
    return CableOut(id=c.id, family_id=c.family_id, family=fam_name, spec=c.spec, label=label)


# ---------- Families ----------

@router.get("/families", response_model=List[CableFamilyRead])
def list_families(db: Session = Depends(get_db)):
    return db.query(CableFamily).order_by(CableFamily.name.asc()).all()

@router.post("/families", response_model=CableFamilyRead, status_code=status.HTTP_201_CREATED)
def create_family(payload: CableFamilyCreate, db: Session = Depends(get_db)):
    fam = CableFamily(name=payload.name)
    db.add(fam)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Family with this name already exists.")
    db.refresh(fam)
    return fam

@router.patch("/families/{family_id}", response_model=CableFamilyRead)
def update_family(family_id: int, payload: CableFamilyUpdate, db: Session = Depends(get_db)):
    fam = db.get(CableFamily, family_id)
    if not fam:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Family not found")
    if payload.name is not None:
        fam.name = payload.name
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(status.HTTP_409_CONFLICT, detail="Family with this name already exists.")
        db.refresh(fam)
    return fam

@router.delete("/families/{family_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_family(family_id: int, db: Session = Depends(get_db)):
    fam = db.get(CableFamily, family_id)
    if not fam:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Family not found")
    # bezpečně: nenech smazat, pokud má kabely
    has_cables = db.query(Cable).filter(Cable.family_id == family_id).first() is not None
    if has_cables:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Family has cables, delete or move them first.")
    db.delete(fam)
    db.commit()
    return None


# ---------- Cables ----------

@router.get("/", response_model=List[CableOut])
def list_cables(offset: int = 0, limit: int = 5000, db: Session = Depends(get_db)):
    rows = (
        db.query(Cable)
          .order_by(Cable.id.asc())
          .offset(offset)
          .limit(limit)
          .all()
    )
    return [_to_out(c) for c in rows]

@router.get("/{cable_id}", response_model=CableOut)
def get_cable(cable_id: int, db: Session = Depends(get_db)):
    c = db.get(Cable, cable_id)
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cable not found")
    return _to_out(c)

@router.post("/", response_model=CableOut, status_code=status.HTTP_201_CREATED)
def create_cable(payload: CableCreate, db: Session = Depends(get_db)):
    fam = db.get(CableFamily, payload.family_id)
    if not fam:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Family not found")
    cab = Cable(family_id=payload.family_id, spec=payload.spec)
    db.add(cab)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # unikátní omezení (family_id, spec)
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Cable with this spec already exists in the family.")
    db.refresh(cab)
    return _to_out(cab)

@router.patch("/{cable_id}", response_model=CableOut)
def update_cable(cable_id: int, payload: CableUpdate, db: Session = Depends(get_db)):
    cab = db.get(Cable, cable_id)
    if not cab:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cable not found")

    if payload.family_id is not None:
        fam = db.get(CableFamily, payload.family_id)
        if not fam:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Family not found")
        cab.family_id = payload.family_id

    if payload.spec is not None:
        cab.spec = payload.spec

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Cable with this spec already exists in the family.")
    db.refresh(cab)
    return _to_out(cab)

@router.delete("/{cable_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cable(cable_id: int, db: Session = Depends(get_db)):
    cab = db.get(Cable, cable_id)
    if not cab:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cable not found")
    db.delete(cab)
    db.commit()
    return None
