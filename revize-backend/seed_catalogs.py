from __future__ import annotations

import json
from pathlib import Path

from database import Base, SessionLocal, engine
from models import Cable, CableFamily, ComponentModel, ComponentType, Device, Manufacturer


BASE_DIR = Path(__file__).resolve().parent
COMPONENTS_JSON = BASE_DIR / "komponenty.json"
DEVICES_JSON = BASE_DIR / "pristroje_katalog.json"

CABLES: dict[str, list[str]] = {
    "CYKY": [
        "CYKY 2x1,5", "CYKY 2x2,5", "CYKY 2x4", "CYKY 2x6", "CYKY 2x10", "CYKY 2x16",
        "CYKY 3x1,5", "CYKY 3x2,5", "CYKY 3x4", "CYKY 3x6", "CYKY 3x10", "CYKY 3x16",
        "CYKY 4x1,5", "CYKY 4x2,5", "CYKY 4x4", "CYKY 4x6", "CYKY 4x10", "CYKY 4x16",
        "CYKY 5x1,5", "CYKY 5x2,5", "CYKY 5x4", "CYKY 5x6", "CYKY 5x10", "CYKY 5x16",
    ],
    "CYKYLo": ["CYKYLo 2x1,5", "CYKYLo 2x2,5", "CYKYLo 3x1,5", "CYKYLo 3x2,5"],
    "CYSY": [
        "CYSY 2x0,75", "CYSY 2x1", "CYSY 2x1,5", "CYSY 2x2,5",
        "CYSY 3x0,75", "CYSY 3x1", "CYSY 3x1,5", "CYSY 3x2,5",
        "CYSY 4x0,75", "CYSY 4x1", "CYSY 4x1,5", "CYSY 4x2,5",
        "CYSY 5x0,75", "CYSY 5x1", "CYSY 5x1,5", "CYSY 5x2,5",
    ],
    "CYA": [
        "CYA 1x0,75", "CYA 1x1", "CYA 1x1,5", "CYA 1x2,5", "CYA 1x4", "CYA 1x6",
        "CYA 1x10", "CYA 1x16", "CYA 1x25", "CYA 1x35", "CYA 1x50", "CYA 1x70",
        "CYA 1x95", "CYA 1x120", "CYA 1x150", "CYA 1x185", "CYA 1x240",
    ],
    "AYKY": [
        "AYKY 4x10", "AYKY 4x16", "AYKY 4x25", "AYKY 4x35", "AYKY 4x50", "AYKY 4x70",
        "AYKY 4x95", "AYKY 4x120", "AYKY 4x150", "AYKY 4x185", "AYKY 4x240",
        "AYKY 5x10", "AYKY 5x16", "AYKY 5x25", "AYKY 5x35", "AYKY 5x50", "AYKY 5x70",
        "AYKY 5x95", "AYKY 5x120", "AYKY 5x150", "AYKY 5x185", "AYKY 5x240",
    ],
    "H1Z2Z2-K": ["H1Z2Z2-K 1x2,5", "H1Z2Z2-K 1x4", "H1Z2Z2-K 1x6", "H1Z2Z2-K 1x10", "H1Z2Z2-K 1x16"],
    "PV1-F": ["PV1-F 1x4", "PV1-F 1x6", "PV1-F 1x10"],
    "N2XH": [
        "N2XH 2x1,5", "N2XH 3x1,5", "N2XH 4x1,5", "N2XH 5x1,5",
        "N2XH 2x2,5", "N2XH 3x2,5", "N2XH 4x2,5", "N2XH 5x2,5",
        "N2XH 3x4", "N2XH 4x4", "N2XH 5x4",
        "N2XH 3x6", "N2XH 4x6", "N2XH 5x6",
        "N2XH 3x10", "N2XH 4x10", "N2XH 5x10",
        "N2XH 3x16", "N2XH 4x16", "N2XH 5x16",
    ],
    "NHXH-J": ["NHXH-J 3x1,5", "NHXH-J 3x2,5", "NHXH-J 5x1,5", "NHXH-J 5x2,5", "NHXH-J 5x4"],
    "NHXH-O": ["NHXH-O 3x1,5", "NHXH-O 3x2,5", "NHXH-O 5x1,5", "NHXH-O 5x2,5", "NHXH-O 5x4"],
    "H07Z-K": ["H07Z-K 1x1", "H07Z-K 1x1,5", "H07Z-K 1x2,5", "H07Z-K 1x4", "H07Z-K 1x6", "H07Z-K 1x10", "H07Z-K 1x16", "H07Z-K 1x25", "H07Z-K 1x35", "H07Z-K 1x50"],
    "UTP Cat5e": ["UTP Cat5e 4x2x0,5"],
    "UTP Cat6": ["UTP Cat6 4x2x0,57"],
    "UTP Cat6A": ["UTP Cat6A 4x2x0,58"],
    "STP Cat5e": ["STP Cat5e 4x2x0,5"],
    "STP Cat6": ["STP Cat6 4x2x0,57"],
    "STP Cat6A": ["STP Cat6A 4x2x0,58"],
    "FTP Cat5e": ["FTP Cat5e 4x2x0,5"],
    "FTP Cat6": ["FTP Cat6 4x2x0,57"],
    "FTP Cat6A": ["FTP Cat6A 4x2x0,58"],
    "S/FTP Cat6": ["S/FTP Cat6 4x2x0,57"],
    "S/FTP Cat6A": ["S/FTP Cat6A 4x2x0,58"],
}


def seed_components(db) -> tuple[int, int, int]:
    data = json.loads(COMPONENTS_JSON.read_text(encoding="utf-8"))
    added_types = added_manufacturers = added_models = 0

    for type_name, manufacturers in data.items():
        type_name = str(type_name).strip()
        if not type_name:
            continue

        component_type = db.query(ComponentType).filter_by(name=type_name).first()
        if component_type is None:
            component_type = ComponentType(name=type_name)
            db.add(component_type)
            db.flush()
            added_types += 1

        for manufacturer_name, models in manufacturers.items():
            manufacturer_name = str(manufacturer_name).strip()
            if not manufacturer_name:
                continue

            manufacturer = (
                db.query(Manufacturer)
                .filter_by(name=manufacturer_name, type_id=component_type.id)
                .first()
            )
            if manufacturer is None:
                manufacturer = Manufacturer(name=manufacturer_name, type_id=component_type.id)
                db.add(manufacturer)
                db.flush()
                added_manufacturers += 1

            for model_name in models:
                model_name = str(model_name).strip()
                if not model_name:
                    continue
                exists = (
                    db.query(ComponentModel)
                    .filter_by(name=model_name, manufacturer_id=manufacturer.id)
                    .first()
                )
                if exists is None:
                    db.add(ComponentModel(name=model_name, manufacturer_id=manufacturer.id))
                    added_models += 1

    return added_types, added_manufacturers, added_models


def seed_devices(db) -> int:
    data = json.loads(DEVICES_JSON.read_text(encoding="utf-8"))
    added = 0

    for item in data:
        name = (item.get("druh_pristroje") or "").strip()
        manufacturer = (item.get("vyrobce") or "").strip()
        model = (item.get("typ") or "").strip()
        if not name or not manufacturer or not model:
            continue

        exists = (
            db.query(Device)
            .filter_by(name=name, manufacturer=manufacturer, model=model)
            .first()
        )
        if exists is not None:
            continue

        db.add(
            Device(
                name=name,
                manufacturer=manufacturer,
                model=model,
                trida=(item.get("trida_ochrany") or "").strip() or None,
                ip=(item.get("kryti") or "").strip() or None,
                note=None,
            )
        )
        added += 1

    return added


def seed_cables(db) -> tuple[int, int]:
    added_families = added_cables = 0

    for family_name, labels in CABLES.items():
        family = db.query(CableFamily).filter_by(name=family_name).first()
        if family is None:
            family = CableFamily(name=family_name)
            db.add(family)
            db.flush()
            added_families += 1

        for label in labels:
            spec = label.split(" ", 1)[1] if " " in label else label
            exists = db.query(Cable).filter_by(family_id=family.id, spec=spec).first()
            if exists is not None:
                continue
            db.add(Cable(family_id=family.id, label=label, spec=spec))
            added_cables += 1

    return added_families, added_cables


def main() -> None:
    Base.metadata.create_all(
        bind=engine,
        tables=[
            ComponentType.__table__,
            Manufacturer.__table__,
            ComponentModel.__table__,
            Device.__table__,
            CableFamily.__table__,
            Cable.__table__,
        ],
    )

    with SessionLocal() as db:
        component_counts = seed_components(db)
        device_count = seed_devices(db)
        cable_counts = seed_cables(db)
        db.commit()

    print(
        "Catalog seed completed: "
        f"component_types={component_counts[0]}, "
        f"manufacturers={component_counts[1]}, "
        f"component_models={component_counts[2]}, "
        f"devices={device_count}, "
        f"cable_families={cable_counts[0]}, "
        f"cables={cable_counts[1]}"
    )


if __name__ == "__main__":
    main()
