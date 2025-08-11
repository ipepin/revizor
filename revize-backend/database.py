from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from sqlalchemy.engine import Engine
import sqlite3

DATABASE_URL = "sqlite:///./projects.db"  # dej raději ./, ať se nevytváří jinde
SQLALCHEMY_DATABASE_URL = DATABASE_URL    # ← přidej tento řádek

# Vytvoření engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# 🔧 Aktivace cizích klíčů pro SQLite
@event.listens_for(Engine, "connect")
def enable_sqlite_foreign_keys(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

# Vytvoření session a základny pro ORM
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

# ✅ Funkce pro získání databázové session pro FastAPI
def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
