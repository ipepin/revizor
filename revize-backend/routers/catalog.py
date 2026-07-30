# src/routers/catalog.py

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import ComponentType, Manufacturer, ComponentModel
from schemas import (
    ComponentTypeRead,
    ComponentTypeCreate,
    ManufacturerRead,
    ManufacturerCreate,
    ComponentModelRead,
    ComponentModelCreate,
    ComponentModelUpdate,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_


router = APIRouter(prefix="/catalog", tags=["catalog"])

@router.get("/types", response_model=List[ComponentTypeRead])
def list_types(db: Session = Depends(get_db)):
    return db.query(ComponentType).order_by(ComponentType.name).all()


@router.post("/types", response_model=ComponentTypeRead, status_code=status.HTTP_201_CREATED)
def create_type(payload: ComponentTypeCreate, db: Session = Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Název přístroje je povinný")

    dup = db.query(ComponentType).filter(ComponentType.name == name).first()
    if dup:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Přístroj s tímto názvem už existuje")

    obj = ComponentType(name=name)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/search")
def search_components(q: str, limit: int = 30, db: Session = Depends(get_db)):
    query = (q or "").strip()
    if len(query) < 2:
        return []

    safe_limit = max(1, min(int(limit or 30), 80))
    like = f"%{query}%"

    rows = (
        db.query(
            ComponentType.id.label("type_id"),
            ComponentType.name.label("type_name"),
            Manufacturer.id.label("manufacturer_id"),
            Manufacturer.name.label("manufacturer_name"),
            ComponentModel.id.label("model_id"),
            ComponentModel.name.label("model_name"),
        )
        .join(Manufacturer, Manufacturer.type_id == ComponentType.id)
        .outerjoin(ComponentModel, ComponentModel.manufacturer_id == Manufacturer.id)
        .filter(
            or_(
                ComponentType.name.ilike(like),
                Manufacturer.name.ilike(like),
                ComponentModel.name.ilike(like),
            )
        )
        .order_by(ComponentType.name, Manufacturer.name, ComponentModel.name)
        .limit(safe_limit)
        .all()
    )

    return [
        {
            "typeId": row.type_id,
            "typeName": row.type_name or "",
            "manufacturerId": row.manufacturer_id,
            "manufacturerName": row.manufacturer_name or "",
            "modelId": row.model_id,
            "modelName": row.model_name or "",
            "label": " ".join(
                part
                for part in [row.type_name, row.manufacturer_name, row.model_name]
                if str(part or "").strip()
            ),
        }
        for row in rows
    ]

@router.get("/manufacturers", response_model=List[ManufacturerRead])
def list_manufacturers(type_id: int, db: Session = Depends(get_db)):
    try:
        rows = (
            db.query(Manufacturer.id, Manufacturer.name, Manufacturer.type_id)
            .filter(Manufacturer.type_id == type_id)
            .order_by(Manufacturer.name)
            .all()
        )
        return [
            {"id": row.id, "name": (row.name or ""), "type_id": row.type_id}
            for row in rows
        ]
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Manufacturers query failed: {type(exc).__name__}",
        )


@router.post("/manufacturers", response_model=ManufacturerRead, status_code=status.HTTP_201_CREATED)
def create_manufacturer(payload: ManufacturerCreate, db: Session = Depends(get_db)):
    type_obj = db.query(ComponentType).filter(ComponentType.id == payload.type_id).first()
    if type_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Přístroj neexistuje")

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Název výrobce je povinný")

    dup = (
        db.query(Manufacturer)
        .filter(Manufacturer.type_id == payload.type_id, Manufacturer.name == name)
        .first()
    )
    if dup:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Výrobce s tímto názvem už u zvoleného přístroje existuje",
        )

    obj = Manufacturer(name=name, type_id=payload.type_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.get("/models", response_model=List[ComponentModelRead])
def list_models(manufacturer_id: int, db: Session = Depends(get_db)):
    try:
        rows = (
            db.query(ComponentModel.id, ComponentModel.name)
            .filter(ComponentModel.manufacturer_id == manufacturer_id)
            .order_by(ComponentModel.name)
            .all()
        )
        return [
            {"id": row.id, "name": (row.name or "")}
            for row in rows
        ]
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Models query failed: {type(exc).__name__}",
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
        name=payload.name.strip(),
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
