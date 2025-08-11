# seed_devices.py
import json
from pathlib import Path
from sqlalchemy import select
from database import SessionLocal, engine
from models import Base, Device

JSON_PATH = Path(__file__).parent / "pristroje_katalog.json"

def main(json_path: Path = JSON_PATH):
    if not json_path.exists():
        raise FileNotFoundError(f"JSON nenalezen: {json_path}")

    with json_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    # zajistí, že tabulka 'devices' existuje (nebo nic neudělá)
    Base.metadata.create_all(bind=engine, tables=[Device.__table__])

    inserted = 0
    skipped = 0

    with SessionLocal() as db:
        for item in data:
            name = (item.get("druh_pristroje") or "").strip()
            manufacturer = (item.get("vyrobce") or "").strip()
            model = (item.get("typ") or "").strip()
            trida = (item.get("trida_ochrany") or "").strip() or None
            ip = (item.get("kryti") or "").strip() or None

            if not name or not manufacturer or not model:
                # přeskoč nevalidní řádky
                skipped += 1
                continue

            # duplicitní ochrana – nebudeme vkládat stejné trio znovu
            exists = db.execute(
                select(Device.id).where(
                    Device.name == name,
                    Device.manufacturer == manufacturer,
                    Device.model == model,
                )
            ).first()

            if exists:
                skipped += 1
                continue

            db.add(Device(
                name=name,
                manufacturer=manufacturer,
                model=model,
                trida=trida,
                ip=ip,
                note=None,
            ))
            inserted += 1

        db.commit()

    print(f"Hotovo. Vloženo: {inserted}, přeskočeno: {skipped}")

if __name__ == "__main__":
    main()
