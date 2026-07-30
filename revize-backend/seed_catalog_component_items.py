from __future__ import annotations

import csv
from pathlib import Path

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


def clean(value: object) -> str | None:
    text = str(value or "").strip()
    return text or None


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


def seed(csv_path: Path = DEFAULT_CSV) -> tuple[int, int, int]:
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV nenalezeno: {csv_path}")

    Base.metadata.create_all(bind=engine, tables=[CatalogComponentItem.__table__])

    inserted = updated = skipped = 0
    with csv_path.open("r", encoding="utf-8-sig", newline="") as file:
        rows = list(csv.DictReader(file, delimiter=";"))

    with SessionLocal() as db:
        for source_row in rows:
            row = normalize_row(source_row)
            if not row["manufacturer"] or not row["device"] or not row["series"]:
                skipped += 1
                continue

            existing = apply_identity_filter(db.query(CatalogComponentItem), row).first()

            if existing is None:
                db.add(CatalogComponentItem(**{field: row.get(field) for field in MODEL_FIELDS}))
                inserted += 1
            else:
                changed = False
                for field in MODEL_FIELDS:
                    value = row.get(field)
                    if getattr(existing, field) != value:
                        setattr(existing, field, value)
                        changed = True
                if changed:
                    updated += 1
                else:
                    skipped += 1

        db.commit()

    print(f"Catalog component items seed completed: inserted={inserted}, updated={updated}, skipped={skipped}")
    return inserted, updated, skipped


def main() -> None:
    seed()


if __name__ == "__main__":
    main()
