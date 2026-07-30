from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, text

from database import Base, engine
import models  # noqa: F401 - registers all SQLAlchemy models on Base.metadata


CORE_TABLES = {"users", "projects", "revisions"}
ALEMBIC_VERSION_TABLE = "alembic_version"


def alembic_config() -> Config:
    cfg = Config(str(Path(__file__).resolve().parent / "alembic.ini"))
    return cfg


def main() -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    if not CORE_TABLES.issubset(tables):
        missing = ", ".join(sorted(CORE_TABLES - tables))
        print(f"Core tables missing ({missing}); creating current schema and stamping Alembic head.")
        Base.metadata.create_all(bind=engine)
        command.stamp(alembic_config(), "head")
        return

    if ALEMBIC_VERSION_TABLE not in tables:
        print("Core tables found but Alembic version table is missing; stamping head.")
        command.stamp(alembic_config(), "head")
        return

    with engine.connect() as connection:
        version = connection.execute(text("select version_num from alembic_version limit 1")).scalar()

    if not version:
        print("Core tables found but Alembic version is empty; stamping head.")
        command.stamp(alembic_config(), "head")
        return

    print("Core tables found; running Alembic migrations.")
    command.upgrade(alembic_config(), "head")


if __name__ == "__main__":
    main()
