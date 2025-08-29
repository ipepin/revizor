# routers/devices.py
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, asc, desc
from pydantic import BaseModel, ConfigDict, Field

from database import get_db
from models import Device

router = APIRouter(prefix="/devices", tags=["devices"])

# ---------- Schemas ----------

class DeviceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    trida: Optional[str] = None
    ip: Optional[str] = None
    note: Optional[str] = None

class DeviceCreate(BaseModel):
    name: str = Field(min_length=1)
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    trida: Optional[str] = None
    ip: Optional[str] = None
    note: Optional[str] = None

class DevicePatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    trida: Optional[str] = None
    ip: Optional[str] = None
    note: Optional[str] = None

# ---------- Helpers ----------

def _contains_ci(col, term: str):
    """Case-insensitive LIKE, funguje na SQLite i Postgresu."""
    return func.lower(col).like(f"%{term.lower()}%")

_SORT_MAP = {
    "id": Device.id,
    "name": Device.name,
    "manufacturer": Device.manufacturer,
    "model": Device.model,
    "trida": Device.trida,
    "ip": Device.ip,
}

# ---------- Routes ----------

@router.get("/", response_model=List[DeviceRead])
def list_devices(
    db: Session = Depends(get_db),
    offset: int = Query(0, ge=0),
    limit: int = Query(5000, ge=1, le=5000),
    # volitelné filtry (FE je zatím dělá na klientovi, ale backend je zvládne taky)
    q: Optional[str] = Query(None, description="fulltext přes name/manufacturer/model/trida/ip"),
    name: Optional[str] = None,
    manufacturer: Optional[str] = None,
    model: Optional[str] = None,
    trida: Optional[str] = None,
    ip: Optional[str] = None,
    sort_by: str = Query("name", pattern="^(id|name|manufacturer|model|trida|ip)$"),
    sort_dir: str = Query("asc", pattern="^(asc|desc)$"),
):
    query = db.query(Device)

    # fulltext
    if q:
        t = q.strip()
        if t:
            query = query.filter(
                _contains_ci(Device.name, t)
                | _contains_ci(Device.manufacturer, t)
                | _contains_ci(Device.model, t)
                | _contains_ci(Device.trida, t)
                | _contains_ci(Device.ip, t)
            )

    # sloupcové filtry
    if name:
        query = query.filter(_contains_ci(Device.name, name))
    if manufacturer:
        query = query.filter(_contains_ci(Device.manufacturer, manufacturer))
    if model:
        query = query.filter(_contains_ci(Device.model, model))
    if trida:
        query = query.filter(_contains_ci(Device.trida, trida))
    if ip:
        query = query.filter(_contains_ci(Device.ip, ip))

    # řazení
    col = _SORT_MAP.get(sort_by, Device.name)
    query = query.order_by(asc(col) if sort_dir == "asc" else desc(col))

    rows = query.offset(offset).limit(limit).all()
    return rows

@router.get("/{id}", response_model=DeviceRead)
def get_device(id: int, db: Session = Depends(get_db)):
    row = db.get(Device, id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    return row

@router.post("/", response_model=DeviceRead, status_code=status.HTTP_201_CREATED)
def create_device(payload: DeviceCreate, db: Session = Depends(get_db)):
    row = Device(
        name=payload.name.strip(),
        manufacturer=payload.manufacturer,
        model=payload.model,
        trida=payload.trida,
        ip=payload.ip,
        note=payload.note,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

@router.patch("/{id}", response_model=DeviceRead)
def update_device(id: int, payload: DevicePatch, db: Session = Depends(get_db)):
    row = db.get(Device, id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        if k == "name" and isinstance(v, str):
            v = v.strip()
            if not v:
                continue
        setattr(row, k, v)

    db.commit()
    db.refresh(row)
    return row

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(id: int, db: Session = Depends(get_db)):
    row = db.get(Device, id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    db.delete(row)
    db.commit()
    return None



