# src/routers/catalog.py

from typing import List           # ← add this
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import ComponentType, Manufacturer, ComponentModel
from schemas import ComponentTypeRead, ManufacturerRead, ComponentModelRead

router = APIRouter(prefix="/catalog", tags=["catalog"])

@router.get("/types", response_model=List[ComponentTypeRead])
def list_types(db: Session = Depends(get_db)):
    return db.query(ComponentType).order_by(ComponentType.name).all()

@router.get("/manufacturers", response_model=List[ManufacturerRead])
def list_manufacturers(type_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Manufacturer)
          .filter(Manufacturer.type_id == type_id)
          .order_by(Manufacturer.name)
          .all()
    )

@router.get("/models", response_model=List[ComponentModelRead])
def list_models(manufacturer_id: int, db: Session = Depends(get_db)):
    return (
        db.query(ComponentModel)
          .filter(ComponentModel.manufacturer_id == manufacturer_id)
          .order_by(ComponentModel.name)
          .all()
    )
