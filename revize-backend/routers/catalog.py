# src/routers/catalog.py

from typing import List           # ← add this
from fastapi import APIRouter, Depends, HTTPException,status
from sqlalchemy.orm import Session
from database import get_db
from models import ComponentType, Manufacturer, ComponentModel
from schemas import ComponentTypeRead, ManufacturerRead, ComponentModelRead,ComponentModelCreate,ComponentModelUpdate
from sqlalchemy.exc import IntegrityError   # ← přidej


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

@router.post("/models", response_model=ComponentModelRead, status_code=status.HTTP_201_CREATED)
def create_model(payload: ComponentModelCreate, db: Session = Depends(get_db)):
    # 1) ověř, že výrobce existuje
    manufacturer = (
        db.query(Manufacturer)
          .filter(Manufacturer.id == payload.manufacturer_id)
          .first()
    )
    if manufacturer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Výrobce neexistuje"
        )

    # 2) (volitelně) ošetři duplicitu názvu u stejného výrobce
    dup = (
        db.query(ComponentModel)
          .filter(
              ComponentModel.manufacturer_id == payload.manufacturer_id,
              ComponentModel.name == payload.name
          )
          .first()
    )
    if dup:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Model se stejným názvem u tohoto výrobce už existuje"
        )

    # 3) vytvoř a ulož – pole uprav dle svého SQLAlchemy modelu
    model = ComponentModel(
        name=payload.name,
        manufacturer_id=payload.manufacturer_id,
    )
    db.add(model)
    db.commit()
    db.refresh(model)

    return model

@router.delete("/models/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_model(model_id: int, db: Session = Depends(get_db)):
    # najdi záznam
    obj = (
        db.query(ComponentModel)
          .filter(ComponentModel.id == model_id)
          .first()
    )
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model nenalezen")

    try:
        db.delete(obj)
        db.commit()
    except IntegrityError:
        db.rollback()
        # např. cizí klíč – model je někde použit
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Model nelze smazat – je používán v jiných záznamech."
        )
    # 204 No Content → nic nevracíme

@router.patch("/models/{model_id}", response_model=ComponentModelRead)
def update_model(model_id: int, payload: ComponentModelUpdate, db: Session = Depends(get_db)):
    obj = (
        db.query(ComponentModel)
          .filter(ComponentModel.id == model_id)
          .first()
    )
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model nenalezen")

    data = payload.dict(exclude_unset=True)

    # 1) pokud se mění manufacturer_id → ověř existenci výrobce
    if "manufacturer_id" in data:
        manufacturer = (
            db.query(Manufacturer)
              .filter(Manufacturer.id == data["manufacturer_id"])
              .first()
        )
        if manufacturer is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Výrobce neexistuje")

    # 2) kontrola duplicit (jméno + výrobce)
    new_name = data.get("name", obj.name)
    new_manufacturer_id = data.get("manufacturer_id", obj.manufacturer_id)
    dup = (
        db.query(ComponentModel)
          .filter(
              ComponentModel.manufacturer_id == new_manufacturer_id,
              ComponentModel.name == new_name,
              ComponentModel.id != obj.id,
          )
          .first()
    )
    if dup:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Model se stejným názvem u tohoto výrobce už existuje"
        )

    # 3) aplikuj změny
    for k, v in data.items():
        setattr(obj, k, v)

    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Uložení se nezdařilo (porušení omezení).")

    return obj