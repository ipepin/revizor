from __future__ import annotations

import os
import sys
from logging.config import fileConfig
from database import Base, DATABASE_URL
from alembic import context
from sqlalchemy import engine_from_config, pool
from models import User, Project, Revision, Defect, ComponentType, Manufacturer, ComponentModel, Cable, Device
# ---- aby šly importy z projektového rootu (nad složkou alembic) ----
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Alembic Config object
config = context.config

# Logging podle alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ---- Nastavení DB URL (priorita: env > database.py > alembic.ini) ----
db_url_env = os.getenv("DATABASE_URL")
db_url_app = None
try:
    # pokud v database.py definuješ SQLALCHEMY_DATABASE_URL, použijeme ji
    from database import SQLALCHEMY_DATABASE_URL as _APP_DB_URL  # type: ignore
    db_url_app = _APP_DB_URL
except Exception:
    pass

if db_url_env:
    config.set_main_option("sqlalchemy.url", DATABASE_URL)
elif db_url_app:
    config.set_main_option("sqlalchemy.url", db_url_app)
# jinak zůstává hodnota z alembic.ini (sqlalchemy.url)

# ---- Metadata: stačí naimportovat Base a celý modul models (side-effect registrace tříd) ----
from database import Base  # váš declarative_base
import models  # noqa: F401  # DŮLEŽITÉ: načte a zaregistruje všechny mapované modely

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Spuštění migrací v offline režimu (bez DB spojení)."""
    url = config.get_main_option("sqlalchemy.url")
    if not url:
        raise RuntimeError("sqlalchemy.url není nastaveno – doplň v alembic.ini nebo DATABASE_URL.")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        render_as_batch=True,  # pro SQLite ALTER TABLE
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Spuštění migrací v online režimu (s DB spojením)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),  # bere sqlalchemy.url z configu výše
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            render_as_batch=True,  # pro SQLite
        )

        with context.begin_transaction():
            context.run_migrations()

def include_object(obj, name, type_, reflected, compare_to):
    # ignoruj bezejmenné unique/fk constrainty při autogenerate (SQLite je neumí dropnout)
    if type_ in {"unique_constraint", "foreign_key_constraint"} and not getattr(obj, "name", None):
        return False
    return True


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
