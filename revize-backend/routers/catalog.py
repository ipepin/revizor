from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models import CatalogComponentItem, ComponentModel, ComponentType, Manufacturer
from seed_catalog_component_items import seed as seed_catalog_component_items
from schemas import (
    CatalogComponentItemCreate,
    CatalogComponentItemRead,
    CatalogComponentItemUpdate,
    ComponentModelCreate,
    ComponentModelRead,
    ComponentModelUpdate,
    ComponentTypeCreate,
    ComponentTypeRead,
    ComponentTypeUpdate,
    ManufacturerCreate,
    ManufacturerRead,
    ManufacturerUpdate,
)


router = APIRouter(prefix="/catalog", tags=["catalog"])

ITEM_IDENTITY_FIELDS = [
    "manufacturer",
    "device",
    "series",
    "manufacturer_type",
    "catalog_number",
    "rated_current_a",
    "pole_configuration",
    "characteristic",
    "residual_current_ma",
    "rcd_type",
]

ITEM_REQUIRED_FIELDS = {"manufacturer", "device", "series", "granularity", "catalog_status"}


def _clean_item_data(data: dict) -> dict:
    cleaned = {}
    for field, value in data.items():
        if isinstance(value, str):
            text = value.strip()
            cleaned[field] = text if text or field in ITEM_REQUIRED_FIELDS else None
        else:
            cleaned[field] = value

    cleaned["granularity"] = cleaned.get("granularity") or "variant"
    cleaned["catalog_status"] = cleaned.get("catalog_status") or "current"
    return cleaned


def _identity_query(db: Session, data: dict, exclude_id: int | None = None):
    query = db.query(CatalogComponentItem)
    for field in ITEM_IDENTITY_FIELDS:
        column = getattr(CatalogComponentItem, field)
        value = data.get(field)
        query = query.filter(column == value) if value else query.filter(column.is_(None))
    if exclude_id is not None:
        query = query.filter(CatalogComponentItem.id != exclude_id)
    return query


def _validate_required_item_fields(data: dict) -> None:
    missing = [
        label
        for field, label in [
            ("manufacturer", "výrobce"),
            ("device", "druh"),
            ("series", "řada"),
        ]
        if not data.get(field)
    ]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vyplň povinná pole: {', '.join(missing)}.",
        )


def _item_label(item: CatalogComponentItem) -> str:
    parts = [
        item.device,
        item.manufacturer,
        item.manufacturer_type or item.series,
    ]
    params = []
    if item.rated_current_a:
        params.append(f"{item.rated_current_a} A")
    if item.pole_configuration:
        params.append(item.pole_configuration)
    if item.characteristic:
        params.append(f"char. {item.characteristic}")
    if item.breaking_capacity_ka:
        params.append(f"{item.breaking_capacity_ka} kA")
    if item.residual_current_ma:
        params.append(f"{item.residual_current_ma} mA")
    if item.rcd_type:
        params.append(f"typ {item.rcd_type}")
    label = " ".join(part for part in parts if part)
    return f"{label} ({', '.join(params)})" if params else label


def _item_search_query(db: Session, q: str | None = None):
    query = db.query(CatalogComponentItem)
    text = (q or "").strip()
    if text:
        like = f"%{text}%"
        query = query.filter(
            or_(
                CatalogComponentItem.manufacturer.ilike(like),
                CatalogComponentItem.device.ilike(like),
                CatalogComponentItem.series.ilike(like),
                CatalogComponentItem.manufacturer_type.ilike(like),
                CatalogComponentItem.catalog_number.ilike(like),
                CatalogComponentItem.rated_current_a.ilike(like),
                CatalogComponentItem.pole_configuration.ilike(like),
                CatalogComponentItem.characteristic.ilike(like),
                CatalogComponentItem.breaking_capacity_ka.ilike(like),
                CatalogComponentItem.residual_current_ma.ilike(like),
                CatalogComponentItem.rcd_type.ilike(like),
                CatalogComponentItem.notes.ilike(like),
            )
        )
    return query


def _item_search_rank(q: str | None):
    text = (q or "").strip()
    if not text:
        return CatalogComponentItem.manufacturer
    like = f"%{text}%"
    return case(
        (CatalogComponentItem.manufacturer_type.ilike(like), 0),
        (CatalogComponentItem.series.ilike(like), 1),
        (CatalogComponentItem.catalog_number.ilike(like), 2),
        (CatalogComponentItem.manufacturer.ilike(like), 3),
        (CatalogComponentItem.device.ilike(like), 4),
        else_=5,
    )


@router.get("/component-items", response_model=List[CatalogComponentItemRead])
def list_component_items(
    q: str | None = None,
    manufacturer: str | None = None,
    device: str | None = None,
    status_value: str | None = Query(None, alias="status"),
    granularity: str | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = _item_search_query(db, q)
    if manufacturer:
        query = query.filter(CatalogComponentItem.manufacturer == manufacturer)
    if device:
        query = query.filter(CatalogComponentItem.device == device)
    if status_value:
        query = query.filter(CatalogComponentItem.catalog_status == status_value)
    if granularity:
        query = query.filter(CatalogComponentItem.granularity == granularity)

    return (
        query.order_by(
            CatalogComponentItem.manufacturer,
            CatalogComponentItem.device,
            CatalogComponentItem.series,
            CatalogComponentItem.manufacturer_type,
            CatalogComponentItem.rated_current_a,
        )
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/component-items/search")
def search_component_items(
    q: str,
    limit: int = Query(30, ge=1, le=80),
    db: Session = Depends(get_db),
):
    text = (q or "").strip()
    if len(text) < 2:
        return []
    try:
        safe_limit = max(1, min(int(limit or 30), 80))
    except (TypeError, ValueError):
        safe_limit = 30

    rows = (
        _item_search_query(db, text)
        .filter(CatalogComponentItem.granularity != "series")
        .order_by(
            _item_search_rank(text),
            CatalogComponentItem.catalog_status,
            CatalogComponentItem.manufacturer,
            CatalogComponentItem.device,
            CatalogComponentItem.series,
            CatalogComponentItem.manufacturer_type,
        )
        .limit(safe_limit)
        .all()
    )

    results = []
    seen_labels: set[str] = set()
    for row in rows:
        label = _item_label(row)
        if label in seen_labels:
            continue
        seen_labels.add(label)
        results.append(
            {
                "kind": "catalogItem",
                "id": row.id,
                "label": label,
                "device": row.device,
                "manufacturer": row.manufacturer,
                "series": row.series,
                "manufacturerType": row.manufacturer_type,
                "catalogNumber": row.catalog_number,
                "ratedCurrentA": row.rated_current_a,
                "polesTotal": row.poles_total,
                "polesProtected": row.poles_protected,
                "poleConfiguration": row.pole_configuration,
                "characteristic": row.characteristic,
                "breakingCapacityKa": row.breaking_capacity_ka,
                "residualCurrentMa": row.residual_current_ma,
                "rcdType": row.rcd_type,
                "voltageType": row.voltage_type,
                "catalogStatus": row.catalog_status,
                "granularity": row.granularity,
            }
        )
    return results


@router.post("/component-items", response_model=CatalogComponentItemRead, status_code=status.HTTP_201_CREATED)
def create_component_item(payload: CatalogComponentItemCreate, db: Session = Depends(get_db)):
    data = _clean_item_data(payload.model_dump())
    _validate_required_item_fields(data)
    if _identity_query(db, data).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Položka katalogu už existuje.")

    item = CatalogComponentItem(**data)
    db.add(item)
    try:
        db.commit()
        db.refresh(item)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Položka katalogu už existuje.")
    return item


@router.patch("/component-items/{item_id}", response_model=CatalogComponentItemRead)
def update_component_item(
    item_id: int,
    payload: CatalogComponentItemUpdate,
    db: Session = Depends(get_db),
):
    item = db.get(CatalogComponentItem, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Položka katalogu nenalezena")

    patch = _clean_item_data(payload.model_dump(exclude_unset=True))
    merged = {field: getattr(item, field) for field in ITEM_IDENTITY_FIELDS}
    for field, value in patch.items():
        if field in ITEM_IDENTITY_FIELDS:
            merged[field] = value
    merged["manufacturer"] = patch.get("manufacturer", item.manufacturer)
    merged["device"] = patch.get("device", item.device)
    merged["series"] = patch.get("series", item.series)
    _validate_required_item_fields(merged)

    if _identity_query(db, merged, exclude_id=item_id).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Položka katalogu už existuje.")

    for field, value in patch.items():
        setattr(item, field, value)

    try:
        db.commit()
        db.refresh(item)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Položka katalogu už existuje.")
    return item


@router.delete("/component-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_component_item(item_id: int, db: Session = Depends(get_db)):
    item = db.get(CatalogComponentItem, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Položka katalogu nenalezena")
    db.delete(item)
    db.commit()
    return None

@router.post("/component-items/import-default")
def import_default_component_items():
    inserted, updated, skipped = seed_catalog_component_items()
    return {"inserted": inserted, "updated": updated, "skipped": skipped}


@router.get("/types", response_model=List[ComponentTypeRead])
def list_types(db: Session = Depends(get_db)):
    return db.query(ComponentType).order_by(ComponentType.name).all()


@router.post("/types", response_model=ComponentTypeRead, status_code=status.HTTP_201_CREATED)
def create_type(payload: ComponentTypeCreate, db: Session = Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Název typu je povinný")

    dup = db.query(ComponentType).filter(ComponentType.name == name).first()
    if dup:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Typ s tímto názvem už existuje")

    obj = ComponentType(name=name)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def _update_type(type_id: int, payload: ComponentTypeUpdate, db: Session) -> ComponentType:
    obj = db.get(ComponentType, type_id)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Typ nenalezen")

    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Název typu je povinný")
        dup = db.query(ComponentType).filter(ComponentType.name == name, ComponentType.id != type_id).first()
        if dup:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Typ s tímto názvem už existuje")
        obj.name = name

    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/types/{type_id}", response_model=ComponentTypeRead)
def update_type(type_id: int, payload: ComponentTypeUpdate, db: Session = Depends(get_db)):
    return _update_type(type_id, payload, db)


@router.put("/types/{type_id}", response_model=ComponentTypeRead)
def replace_type(type_id: int, payload: ComponentTypeUpdate, db: Session = Depends(get_db)):
    return _update_type(type_id, payload, db)


@router.delete("/types/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_type(type_id: int, db: Session = Depends(get_db)):
    obj = db.get(ComponentType, type_id)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Typ nenalezen")

    try:
        db.delete(obj)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Typ nelze smazat, protože obsahuje výrobce nebo modely.",
        )
    return None


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
    return (
        db.query(Manufacturer)
        .filter(Manufacturer.type_id == type_id)
        .order_by(Manufacturer.name)
        .all()
    )


@router.post("/manufacturers", response_model=ManufacturerRead, status_code=status.HTTP_201_CREATED)
def create_manufacturer(payload: ManufacturerCreate, db: Session = Depends(get_db)):
    type_obj = db.get(ComponentType, payload.type_id)
    if type_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Typ neexistuje")

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
            detail="Výrobce s tímto názvem už u zvoleného typu existuje",
        )

    obj = Manufacturer(name=name, type_id=payload.type_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def _update_manufacturer(
    manufacturer_id: int,
    payload: ManufacturerUpdate,
    db: Session,
) -> Manufacturer:
    obj = db.get(Manufacturer, manufacturer_id)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Výrobce nenalezen")

    new_type_id = payload.type_id if payload.type_id is not None else obj.type_id
    if payload.type_id is not None and db.get(ComponentType, payload.type_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Typ neexistuje")

    new_name = payload.name.strip() if payload.name is not None else obj.name
    if not new_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Název výrobce je povinný")

    dup = (
        db.query(Manufacturer)
        .filter(
            Manufacturer.type_id == new_type_id,
            Manufacturer.name == new_name,
            Manufacturer.id != manufacturer_id,
        )
        .first()
    )
    if dup:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Výrobce s tímto názvem už u zvoleného typu existuje",
        )

    obj.name = new_name
    obj.type_id = new_type_id
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/manufacturers/{manufacturer_id}", response_model=ManufacturerRead)
def update_manufacturer(
    manufacturer_id: int,
    payload: ManufacturerUpdate,
    db: Session = Depends(get_db),
):
    return _update_manufacturer(manufacturer_id, payload, db)


@router.put("/manufacturers/{manufacturer_id}", response_model=ManufacturerRead)
def replace_manufacturer(
    manufacturer_id: int,
    payload: ManufacturerUpdate,
    db: Session = Depends(get_db),
):
    return _update_manufacturer(manufacturer_id, payload, db)


@router.delete("/manufacturers/{manufacturer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_manufacturer(manufacturer_id: int, db: Session = Depends(get_db)):
    obj = db.get(Manufacturer, manufacturer_id)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Výrobce nenalezen")

    try:
        db.delete(obj)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Výrobce nelze smazat, protože obsahuje modely.",
        )
    return None


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
    manufacturer = db.get(Manufacturer, payload.manufacturer_id)
    if manufacturer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Výrobce neexistuje")

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Název modelu je povinný")

    dup = (
        db.query(ComponentModel)
        .filter(ComponentModel.manufacturer_id == payload.manufacturer_id, ComponentModel.name == name)
        .first()
    )
    if dup:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Model se stejným názvem u tohoto výrobce už existuje",
        )

    model = ComponentModel(name=name, manufacturer_id=payload.manufacturer_id)
    db.add(model)
    db.commit()
    db.refresh(model)
    return model


@router.delete("/models/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_model(model_id: int, db: Session = Depends(get_db)):
    obj = db.get(ComponentModel, model_id)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model nenalezen")

    try:
        db.delete(obj)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Model nelze smazat, protože je používaný v jiných záznamech.",
        )
    return None


@router.patch("/models/{model_id}", response_model=ComponentModelRead)
def update_model(model_id: int, payload: ComponentModelUpdate, db: Session = Depends(get_db)):
    obj = db.get(ComponentModel, model_id)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model nenalezen")

    data = payload.model_dump(exclude_unset=True)

    if "manufacturer_id" in data:
        manufacturer = db.get(Manufacturer, data["manufacturer_id"])
        if manufacturer is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Výrobce neexistuje")

    new_name = data.get("name", obj.name)
    if isinstance(new_name, str):
        new_name = new_name.strip()
    if not new_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Název modelu je povinný")

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
            detail="Model se stejným názvem u tohoto výrobce už existuje",
        )

    obj.name = new_name
    obj.manufacturer_id = new_manufacturer_id

    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Uložení se nezdařilo kvůli porušení omezení.")

    return obj


@router.put("/models/{model_id}", response_model=ComponentModelRead)
def replace_model(model_id: int, payload: ComponentModelUpdate, db: Session = Depends(get_db)):
    return update_model(model_id, payload, db)
