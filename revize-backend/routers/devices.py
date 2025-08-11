from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Device
from pydantic import BaseModel

router = APIRouter(prefix="/devices", tags=["devices"])

class DeviceRead(BaseModel):
    id: int
    name: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    trida: Optional[str] = None
    ip: Optional[str] = None
    note: Optional[str] = None
    class Config:
        from_attributes = True  # Pydantic v2; ve v1: orm_mode = True

class DeviceCreate(BaseModel):
    name: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    trida: Optional[str] = None
    ip: Optional[str] = None
    note: Optional[str] = None

# ⬇️ PATCH payload – všechno volitelné
class DevicePatch(BaseModel):
    name: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    trida: Optional[str] = None
    ip: Optional[str] = None
    note: Optional[str] = None
    class Config:
        extra = "ignore"   # ignoruj neznámé klíče

@router.patch("/{id}", response_model=DeviceRead)
def update_device(id: int, payload: DevicePatch, db: Session = Depends(get_db)):
    row: Device | None = db.query(Device).get(id)  # nebo db.get(Device, id) na SA2
    if not row:
        raise HTTPException(status_code=404, detail="Not found")

    data = payload.dict(exclude_unset=True)  # ← klíčové!
    for k, v in data.items():
        setattr(row, k, v)

    db.commit()
    db.refresh(row)
    return row

@router.get("", response_model=List[DeviceRead])
def list_devices(
    db: Session = Depends(get_db),
    offset: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=10000),  # ← dřív jsi měl zřejmě le=100 apod.
):
    q = db.query(Device).order_by(
        Device.name.asc(), Device.manufacturer.asc(), Device.model.asc()
    )
    return q.offset(offset).limit(limit).all()

@router.post("", response_model=DeviceRead)
def create_device(payload: DeviceCreate, db: Session = Depends(get_db)):
    row = Device(**payload.dict())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

@router.delete("/{id}")
def delete_device(id: int, db: Session = Depends(get_db)):
    row = db.query(Device).get(id)
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(row)
    db.commit()
    return {"ok": True}
