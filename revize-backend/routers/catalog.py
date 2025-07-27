# revize-backend/routers/catalog.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import ComponentType, Manufacturer, ComponentModel
from schemas import ComponentTypeOut

router = APIRouter(prefix="/catalog", tags=["catalog"])

@router.get("/types", response_model=List[ComponentTypeOut])
def list_types(db: Session = Depends(get_db)):
    return db.query(ComponentType).all()
