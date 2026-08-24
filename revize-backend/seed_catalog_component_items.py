from __future__ import annotations

import csv
from pathlib import Path

from sqlalchemy.exc import IntegrityError

from database import Base, SessionLocal, engine
from models import CatalogComponentItem


DEFAULT_CSV = Path(__file__).resolve().parent / "data" / "modulove_pristroje_DB_katalogova_v6_SEZ.csv"

FIELD_MAP = {
    "rated_current_A": "rated_current_a",
    "breaking_capacity_kA": "breaking_capacity_ka",
    "residual_current_mA": "residual_current_ma",
    "heat_loss_W": "heat_loss_w",
}

MODEL_FIELDS = [
    "granularity",
    "manufacturer",
    "device",
    "series",
    "manufacturer_type",
    "catalog_number",
    "rated_current_a",
    "poles_total",
    "poles_protected",
    "pole_configuration",
    "characteristic",
    "breaking_capacity_ka",
    "residual_current_ma",
    "rcd_type",
    "voltage_type",
    "heat_loss_w",
    "heat_loss_basis",
    "catalog_status",
    "verification",
    "notes",
    "source_url",
]

IDENTITY_FIELDS = [
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

TEXT_FIXES = {
    "Bzu��k": "Bzučák",
    "D�lkov� pohon": "Dálkový pohon",
    "Elektrom�r": "Elektroměr",
    "F�zov� rel�": "Fázové relé",
    "Hladinov� rel�": "Hladinové relé",
    "Impulsn� rel�": "Impulsní relé",
    "Instala�n� rel�": "Instalační relé",
    "Jisti�": "Jistič",
    "Jisti�ochr�ni�": "Chránič-jistič",
    "Kontroln� rel�": "Kontrolní relé",
    "Modulov� z�suvka": "Modulová zásuvka",
    "Motorov� jisti�": "Motorový jistič",
    "Multifunk�n� m��ic� p��stroj": "Multifunkční měřicí přístroj",
    "Nap�jec� zdroj": "Napájecí zdroj",
    "Nap�ov� rel�": "Napěťové relé",
    "Odp�na�": "Odpínač",
    "Ovl�dac� sp�na�": "Ovládací spínač",
    "Podp�ov� spou��": "Podpěťová spoušť",
    "Pojistkov� dr��k": "Pojistkový držák",
    "Pomocn� kontakt": "Pomocný kontakt",
    "Prioritn� rel�": "Prioritní relé",
    "Proudov� rel�": "Proudové relé",
    "Proudov� chr�ni�": "Proudový chránič",
    "P�ep�na�": "Přepínač",
    "P�ep�ov� spou��": "Přepěťová spoušť",
    "P��davn� chr�ni�ov� blok": "Přídavný chráničový blok",
    "P��slu�enstv� / retrofit jisti�e": "Příslušenství / retrofit jističe",
    "Rel�": "Relé",
    "Schodi��ov� automat": "Schodišťový automat",
    "Senzor / sp�nac� rel�": "Senzor / spínací relé",
    "Sign�lka": "Signálka",
    "Soumrakov� sp�na�": "Soumrakový spínač",
    "Sp�nac� hodiny": "Spínací hodiny",
    "Stm�va�": "Stmívač",
    "Styka�": "Stykač",
    "Svodi� p�ep�t�": "Svodič přepětí",
    "Teplotn� rel�": "Teplotní relé",
    "Tla��tko": "Tlačítko",
    "Transform�tor": "Transformátor",
    "Vyp�nac� spou��": "Vypínací spoušť",
    "Vyp�na�": "Vypínač",
    "�asov� rel�": "Časové relé",
}

FALLBACK_ITEMS = [
    # Jističe
    {"manufacturer": "ABB", "device": "Jistič", "series": "S200", "manufacturer_type": "S201", "rated_current_a": "16", "pole_configuration": "1", "characteristic": "B", "breaking_capacity_ka": "6"},
    {"manufacturer": "Eaton", "device": "Jistič", "series": "PL7", "manufacturer_type": "PL7", "rated_current_a": "16", "pole_configuration": "1", "characteristic": "B", "breaking_capacity_ka": "10"},
    {"manufacturer": "OEZ", "device": "Jistič", "series": "LTE", "manufacturer_type": "LTE", "rated_current_a": "16", "pole_configuration": "1", "characteristic": "B", "breaking_capacity_ka": "10"},
    {"manufacturer": "NOARK", "device": "Jistič", "series": "Ex9BN", "manufacturer_type": "Ex9BN", "rated_current_a": "16", "pole_configuration": "1", "characteristic": "B", "breaking_capacity_ka": "6"},
    {"manufacturer": "BONEGA", "device": "Jistič", "series": "PEP", "manufacturer_type": "PEP-10J", "rated_current_a": "16", "pole_configuration": "1", "characteristic": "B", "breaking_capacity_ka": "10"},
    {"manufacturer": "Schneider Electric", "device": "Jistič", "series": "Acti9 iC60N", "manufacturer_type": "iC60N", "rated_current_a": "16", "pole_configuration": "1", "characteristic": "B", "breaking_capacity_ka": "6"},
    {"manufacturer": "Hager", "device": "Jistič", "series": "MBN", "manufacturer_type": "MBN", "rated_current_a": "16", "pole_configuration": "1", "characteristic": "B", "breaking_capacity_ka": "6"},
    {"manufacturer": "Legrand", "device": "Jistič", "series": "RX3", "manufacturer_type": "RX3", "rated_current_a": "16", "pole_configuration": "1", "characteristic": "B", "breaking_capacity_ka": "6"},
    {"manufacturer": "ETI", "device": "Jistič", "series": "ETIMAT", "manufacturer_type": "ETIMAT 6", "rated_current_a": "16", "pole_configuration": "1", "characteristic": "B", "breaking_capacity_ka": "6"},
    {"manufacturer": "Siemens", "device": "Jistič", "series": "5SL", "manufacturer_type": "5SL", "rated_current_a": "16", "pole_configuration": "1", "characteristic": "B", "breaking_capacity_ka": "6"},
    # Proudové chrániče a chráničojističe
    {"manufacturer": "ABB", "device": "Proudový chránič", "series": "F200", "manufacturer_type": "F202", "rated_current_a": "40", "pole_configuration": "2", "residual_current_ma": "30", "rcd_type": "A"},
    {"manufacturer": "Eaton", "device": "Proudový chránič", "series": "PF7", "manufacturer_type": "PF7", "rated_current_a": "40", "pole_configuration": "2", "residual_current_ma": "30", "rcd_type": "A"},
    {"manufacturer": "BONEGA", "device": "Proudový chránič", "series": "PEP", "manufacturer_type": "PEP-10P63", "rated_current_a": "40", "pole_configuration": "2", "residual_current_ma": "30", "rcd_type": "A"},
    {"manufacturer": "NOARK", "device": "Proudový chránič", "series": "Ex9L", "manufacturer_type": "Ex9L-N", "rated_current_a": "40", "pole_configuration": "2", "residual_current_ma": "30", "rcd_type": "A"},
    {"manufacturer": "ABB", "device": "Chránič-jistič", "series": "DS201", "manufacturer_type": "DS201", "rated_current_a": "16", "pole_configuration": "1+N", "characteristic": "B", "residual_current_ma": "30", "rcd_type": "A"},
    {"manufacturer": "Eaton", "device": "Chránič-jistič", "series": "PFL7", "manufacturer_type": "PFL7", "rated_current_a": "16", "pole_configuration": "1+N", "characteristic": "B", "residual_current_ma": "30", "rcd_type": "A"},
    {"manufacturer": "BONEGA", "device": "Chránič-jistič", "series": "PEP", "manufacturer_type": "PEP-10PJ", "rated_current_a": "16", "pole_configuration": "1+N", "characteristic": "B", "residual_current_ma": "30", "rcd_type": "A"},
    {"manufacturer": "NOARK", "device": "Chránič-jistič", "series": "Ex9NLE", "manufacturer_type": "Ex9NLE", "rated_current_a": "16", "pole_configuration": "1+N", "characteristic": "B", "residual_current_ma": "30", "rcd_type": "A"},
    # Ostatní časté modulové přístroje
    {"manufacturer": "ABB", "device": "Hlavní vypínač", "series": "OT", "manufacturer_type": "OT125F3", "rated_current_a": "125", "pole_configuration": "3"},
    {"manufacturer": "Eaton", "device": "Hlavní vypínač", "series": "IS", "manufacturer_type": "IS-40", "rated_current_a": "40", "pole_configuration": "3"},
    {"manufacturer": "NOARK", "device": "Hlavní vypínač", "series": "Ex9I", "manufacturer_type": "Ex9I", "rated_current_a": "40", "pole_configuration": "3"},
    {"manufacturer": "BONEGA", "device": "Hlavní vypínač", "series": "PEP", "manufacturer_type": "PEP-10V", "rated_current_a": "40", "pole_configuration": "3"},
    {"manufacturer": "Eaton", "device": "Stykač", "series": "Z-SCH", "manufacturer_type": "Z-SCH230", "rated_current_a": "25", "pole_configuration": "4"},
    {"manufacturer": "Schneider Electric", "device": "Stykač", "series": "Acti9 iCT", "manufacturer_type": "iCT", "rated_current_a": "25", "pole_configuration": "4"},
    {"manufacturer": "ELKO EP", "device": "Relé", "series": "CRM", "manufacturer_type": "CRM-2H"},
    {"manufacturer": "Finder", "device": "Relé", "series": "40", "manufacturer_type": "40.52"},
    {"manufacturer": "SALTEK", "device": "Svodič přepětí", "series": "SLP", "manufacturer_type": "SLP-275", "pole_configuration": "3+N"},
    {"manufacturer": "OEZ", "device": "Svodič přepětí", "series": "SJB", "manufacturer_type": "SJB-25E", "pole_configuration": "3+N"},
    {"manufacturer": "BONEGA", "device": "Svodič přepětí", "series": "PEP", "manufacturer_type": "PEP-PO", "pole_configuration": "3+N"},
    {"manufacturer": "NOARK", "device": "Elektroměr", "series": "Ex9EM", "manufacturer_type": "Ex9EM 1P"},
    {"manufacturer": "ABB", "device": "Elektroměr", "series": "B23", "manufacturer_type": "B23"},
    {"manufacturer": "BONEGA", "device": "Zvonek", "series": "PEP", "manufacturer_type": "PEP-Z"},
    {"manufacturer": "BONEGA", "device": "Transformátor", "series": "PEP", "manufacturer_type": "PEP-24T"},
    {"manufacturer": "ELKO EP", "device": "Schodišťový automat", "series": "CRM", "manufacturer_type": "CRM-4"},
    {"manufacturer": "Hager", "device": "Schodišťový automat", "series": "EPN", "manufacturer_type": "EPN510"},
]


def clean(value: object) -> str | None:
    text = str(value or "").strip()
    text = fix_text(text)
    return text or None


def fix_text(value: str | None) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if not text:
        return ""
    return TEXT_FIXES.get(text, text)


def normalize_row(row: dict[str, str]) -> dict[str, str | None]:
    normalized: dict[str, str | None] = {}
    for source_key, value in row.items():
        target_key = FIELD_MAP.get(source_key, source_key)
        if target_key in MODEL_FIELDS:
            normalized[target_key] = clean(value)

    for required, fallback in [
        ("granularity", "variant"),
        ("manufacturer", ""),
        ("device", ""),
        ("series", ""),
        ("catalog_status", "current"),
    ]:
        normalized[required] = normalized.get(required) or fallback

    return normalized


def identity_filter(row: dict[str, str | None]) -> dict[str, str]:
    return {field: row.get(field) or "" for field in IDENTITY_FIELDS}


def apply_identity_filter(query, row: dict[str, str | None]):
    for field in IDENTITY_FIELDS:
        column = getattr(CatalogComponentItem, field)
        value = row.get(field)
        query = query.filter(column == value) if value else query.filter(column.is_(None))
    return query


def normalize_fallback_item(item: dict[str, str]) -> dict[str, str | None]:
    row = {field: clean(item.get(field)) for field in MODEL_FIELDS}
    row["granularity"] = row.get("granularity") or "variant"
    row["catalog_status"] = row.get("catalog_status") or "current"
    return row


def upsert_row(db, row: dict[str, str | None]) -> str:
    existing = apply_identity_filter(db.query(CatalogComponentItem), row).first()

    if existing is None:
        db.add(CatalogComponentItem(**{field: row.get(field) for field in MODEL_FIELDS}))
        return "inserted"

    changed = False
    for field in MODEL_FIELDS:
        value = row.get(field)
        if getattr(existing, field) != value:
            setattr(existing, field, value)
            changed = True
    return "updated" if changed else "skipped"


def repair_existing_rows(db) -> int:
    repaired = 0
    rows = db.query(CatalogComponentItem).all()
    for item in rows:
        changed = False
        for field in MODEL_FIELDS:
            value = getattr(item, field)
            if isinstance(value, str):
                fixed = fix_text(value)
                if fixed != value:
                    setattr(item, field, fixed)
                    changed = True
        if not changed:
            continue
        try:
            db.flush()
            repaired += 1
        except IntegrityError:
            db.rollback()
    return repaired


def deduplicate_existing_rows(db) -> int:
    groups: dict[tuple[str, ...], list[CatalogComponentItem]] = {}
    for item in db.query(CatalogComponentItem).all():
        key = tuple(str(getattr(item, field) or "") for field in IDENTITY_FIELDS)
        groups.setdefault(key, []).append(item)

    deleted = 0
    for items in groups.values():
        if len(items) < 2:
            continue
        items.sort(
            key=lambda row: (
                sum(1 for field in MODEL_FIELDS if getattr(row, field)),
                row.id or 0,
            ),
            reverse=True,
        )
        for duplicate in items[1:]:
            db.delete(duplicate)
            deleted += 1
    if deleted:
        db.flush()
    return deleted


def seed(csv_path: Path = DEFAULT_CSV) -> tuple[int, int, int]:
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV nenalezeno: {csv_path}")

    Base.metadata.create_all(bind=engine, tables=[CatalogComponentItem.__table__])

    inserted = updated = skipped = 0
    with csv_path.open("r", encoding="utf-8-sig", newline="") as file:
        rows = list(csv.DictReader(file, delimiter=";"))

    with SessionLocal() as db:
        repaired = repair_existing_rows(db)
        deduplicated = deduplicate_existing_rows(db)
        for source_row in rows:
            row = normalize_row(source_row)
            if not row["manufacturer"] or not row["device"] or not row["series"]:
                skipped += 1
                continue

            result = upsert_row(db, row)
            if result == "inserted":
                inserted += 1
            elif result == "updated":
                updated += 1
            else:
                skipped += 1

        for item in FALLBACK_ITEMS:
            result = upsert_row(db, normalize_fallback_item(item))
            if result == "inserted":
                inserted += 1
            elif result == "updated":
                updated += 1
            else:
                skipped += 1

        db.commit()

    print(
        "Catalog component items seed completed: "
        f"inserted={inserted}, updated={updated}, skipped={skipped}, "
        f"repaired={repaired}, deduplicated={deduplicated}"
    )
    return inserted, updated, skipped


def main() -> None:
    seed()


if __name__ == "__main__":
    main()
