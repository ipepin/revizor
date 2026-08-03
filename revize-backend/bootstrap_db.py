from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, text

from database import Base, engine
import models  # noqa: F401 - registers all SQLAlchemy models on Base.metadata
from seed_catalogs import main as seed_catalogs
from seed_catalog_component_items import main as seed_catalog_component_items
from seed_defects_from_json import main as seed_defects
from seed_norms import seed as seed_norms
from database import SessionLocal


CORE_TABLES = {"users", "projects", "revisions"}
ALEMBIC_VERSION_TABLE = "alembic_version"


def alembic_config() -> Config:
    cfg = Config(str(Path(__file__).resolve().parent / "alembic.ini"))
    return cfg


def seed_reference_data() -> None:
    """Idempotently fill global reference catalogs without touching projects."""
    seed_catalogs()
    seed_catalog_component_items()
    seed_defects(str(Path(__file__).resolve().parent / "defects.json"))
    with SessionLocal() as db:
        added, updated = seed_norms(db)
    print(f"Norm seed completed: added={added}, updated={updated}")


def main() -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    if not CORE_TABLES.issubset(tables):
        missing = ", ".join(sorted(CORE_TABLES - tables))
        print(f"Core tables missing ({missing}); creating current schema and stamping Alembic head.")
        Base.metadata.create_all(bind=engine)
        command.stamp(alembic_config(), "head")
        seed_reference_data()
        return

    if ALEMBIC_VERSION_TABLE not in tables:
        print("Core tables found but Alembic version table is missing; stamping head.")
        command.stamp(alembic_config(), "head")
        seed_reference_data()
        return

    with engine.connect() as connection:
        version = connection.execute(text("select version_num from alembic_version limit 1")).scalar()

    if not version:
        print("Core tables found but Alembic version is empty; stamping head.")
        command.stamp(alembic_config(), "head")
        seed_reference_data()
        return

    print("Core tables found; running Alembic migrations.")
    command.upgrade(alembic_config(), "head")
    seed_reference_data()


if __name__ == "__main__":
    main()
