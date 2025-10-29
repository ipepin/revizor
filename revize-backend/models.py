# === Backend Models (complete) ===
# Full SQLAlchemy models.py with User, Project, Revision, Defect, Component hierarchy.

from datetime import datetime

from sqlalchemy import (
    Column, Integer, BigInteger, String, Text, Boolean,
    ForeignKey, Table, UniqueConstraint, Date, DateTime,
    Enum, TIMESTAMP, func
)
from sqlalchemy.orm import relationship
from sqlalchemy import JSON  # works on both SQLite & Postgres
from sqlalchemy.ext.mutable import MutableDict

from database import Base

# --- Dialect-aware helpers (Postgres vs SQLite) ---
POSTGRES = False
try:
    # If Postgres dialect is present, prefer JSONB and ARRAY(Text)
    from sqlalchemy.dialects.postgresql import JSONB, ARRAY as PG_ARRAY
    POSTGRES = True
except Exception:
    JSONB = None
    PG_ARRAY = None  # type: ignore

JSONType = JSONB if POSTGRES else JSON


# 📎 Many-to-many: shared projects ↔ users
project_user_link = Table(
    "project_user_link",
    Base.metadata,
    Column("project_id", Integer, ForeignKey("projects.id", ondelete="CASCADE")),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE")),
)


# 👤 User
class User(Base):
    __tablename__ = "users"

    id                 = Column(Integer, primary_key=True, index=True)
    name               = Column(String, nullable=False)
    email              = Column(String, unique=True, index=True, nullable=False)
    password_hash      = Column(String, nullable=False)
    is_verified        = Column(Boolean, default=False)
    verification_token = Column(String, nullable=True)
    # Admin role flag (simple RBAC). Kept as boolean for compatibility with existing code
    is_admin           = Column(Boolean, nullable=False, default=False, server_default="0")

    # profilová data
    certificate_number   = Column(String, nullable=True)   # číslo osvědčení
    authorization_number = Column(String, nullable=True)   # číslo oprávnění
    address              = Column(String, nullable=True)
    ico                  = Column(String, nullable=True)
    dic                  = Column(String, nullable=True)
    birth_date           = Column(String, nullable=True)   # SQLite-friendly "YYYY-MM-DD"
    phone                = Column(String, nullable=True)

    # (historický) JSON přístrojů uložený u uživatele – ponechán pro kompatibilitu
    instruments_json     = Column(Text, nullable=False, server_default="[]")

    active_company_id = Column(Integer, ForeignKey("company_profiles.id"), nullable=True)

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")

    # sdílené projekty (M2M)
    shared_projects = relationship(
        "Project",
        secondary=project_user_link,
        back_populates="shared_with_users",
    )

    # firmy přiřazené uživateli (vymezení správného FK)
    companies = relationship(
        "CompanyProfile",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="CompanyProfile.user_id",
    )

    # aktivní firma (jedna)
    active_company = relationship(
        "CompanyProfile",
        foreign_keys=[active_company_id],
        uselist=False,
    )


# 🏗️ Project
class Project(Base):
    __tablename__ = "projects"

    id      = Column(Integer, primary_key=True, index=True)
    address = Column(String, nullable=False)
    client  = Column(String, nullable=False)

    owner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    owner    = relationship("User", back_populates="projects")

    shared_with_users = relationship(
        "User",
        secondary=project_user_link,
        back_populates="shared_projects",
    )

    revisions = relationship("Revision", back_populates="project", cascade="all, delete-orphan")


# 📄 Revision
class Revision(Base):
    __tablename__ = "revisions"

    id     = Column(Integer, primary_key=True, index=True)
    number = Column(String, unique=True, nullable=False)
    type   = Column(String, nullable=False)

    date_done   = Column(Date, nullable=False)
    valid_until = Column(Date, nullable=True)

    status                 = Column(String(20), nullable=False, default="Rozpracovaná")
    defects                = Column(Text, default="")
    conclusion_text        = Column(Text, default="")
    conclusion_safety      = Column(String, default="")
    conclusion_valid_until = Column(String, default="")

    # JSON (SQLite) / JSONB (Postgres) – mutable pro pohodlné PATCHe
    data_json = Column(
        MutableDict.as_mutable(JSONType if JSONType is not None else JSON),
        nullable=False,
        default=dict,  # ORM default (server_default řeš migracemi dle DB)
    )

    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    project    = relationship("Project", back_populates="revisions")


# 🔧 Defect catalog + workflow
import enum as _enum

class DefectVisibility(str, _enum.Enum):
    global_ = "global"   # název atributu nesmí být "global"
    user    = "user"

class ModerationStatus(str, _enum.Enum):
    none     = "none"
    pending  = "pending"
    rejected = "rejected"

class Defect(Base):
    __tablename__ = "defects"

    id          = Column(Integer, primary_key=True, index=True)
    description = Column(String, nullable=False)
    standard    = Column(String, nullable=True)
    article     = Column(String, nullable=True)

    visibility        = Column(Enum(DefectVisibility), nullable=False, default=DefectVisibility.user)
    moderation_status = Column(Enum(ModerationStatus),  nullable=False, default=ModerationStatus.none)

    owner_id    = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    owner       = relationship("User", foreign_keys=[owner_id])

    approved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approver    = relationship("User", foreign_keys=[approved_by])
    usage_count = Column(Integer, nullable=False, server_default="0")  # počítadlo použití

    reject_reason = Column(Text, nullable=True)

    created_at  = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at  = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)


# 🛠️ Component hierarchy
class ComponentType(Base):
    __tablename__ = "component_types"

    id   = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)

    manufacturers = relationship("Manufacturer", back_populates="type", cascade="all, delete-orphan")


class Manufacturer(Base):
    __tablename__ = "manufacturers"

    id   = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)

    type_id = Column(Integer, ForeignKey("component_types.id", ondelete="CASCADE"))
    type    = relationship("ComponentType", back_populates="manufacturers")

    models  = relationship("ComponentModel", back_populates="manufacturer", cascade="all, delete-orphan")


class ComponentModel(Base):
    __tablename__ = "component_models"

    id   = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)

    manufacturer_id = Column(Integer, ForeignKey("manufacturers.id", ondelete="CASCADE"))
    manufacturer    = relationship("Manufacturer", back_populates="models")


class CableFamily(Base):
    __tablename__ = "cable_families"

    id   = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)

    cables = relationship("Cable", back_populates="family", cascade="all, delete-orphan")


class Cable(Base):
    __tablename__ = "cables"

    id        = Column(Integer, primary_key=True)
    family_id = Column(Integer, ForeignKey("cable_families.id", ondelete="CASCADE"), nullable=False)

    # volitelný popisek pro FE (předpočítané "CYKY 3×2,5")
    label     = Column(String, nullable=True)

    # dimenze (např. "3x2,5")
    spec      = Column(String, nullable=False)

    family    = relationship("CableFamily", back_populates="cables")

    __table_args__ = (UniqueConstraint("family_id", "spec", name="uq_cables_family_spec"),)


class Device(Base):
    __tablename__ = "devices"

    id           = Column(Integer, primary_key=True, index=True)
    name         = Column(String, nullable=False)  # např. "Svítidlo", "Zásuvka", ...
    manufacturer = Column(String, nullable=True)
    model        = Column(String, nullable=True)
    trida        = Column(String, nullable=True)   # tř. ochrany
    ip           = Column(String, nullable=True)   # IP krytí
    note         = Column(Text, nullable=True)


class CompanyProfile(Base):
    __tablename__ = "company_profiles"

    id       = Column(Integer, primary_key=True, index=True)
    user_id  = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    name     = Column(String, nullable=False)
    address  = Column(String, nullable=True)
    ico      = Column(String, nullable=True)
    dic      = Column(String, nullable=True)
    email    = Column(String, nullable=True)
    phone    = Column(String, nullable=True)
    note     = Column(String, nullable=True)
    is_default = Column(Boolean, default=False)

    # zpětný vztah na uživatele (odpovídá User.companies)
    user = relationship(
        "User",
        back_populates="companies",
        foreign_keys=[user_id],
    )


class UserInstrument(Base):
    __tablename__ = "user_instruments"

    id      = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    name             = Column(Text, nullable=False)
    calibration_code = Column(Text, nullable=False)

    # seznam měření: Postgres ARRAY(Text) / jinak JSON list
    if POSTGRES:
        measurements = Column(PG_ARRAY(Text), nullable=False, default=list)
    else:
        measurements = Column(JSON, nullable=False, default=list)

    serial                  = Column(Text, nullable=True)
    calibration_valid_until = Column(Date, nullable=True)
    note                    = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

class VvDoc(Base):
    __tablename__ = "vv_docs"

    # FE generuje UUID → držíme jako String(36)
    id         = Column(String(36), primary_key=True, index=True)
    # Evidenční číslo ve tvaru "VV-YYYY-0001" (unikátní). Vygenerujeme v routeru při POST.
    number     = Column(String(32), unique=True, nullable=False)

    # JSON protokolu (stejný přístup jako Revision.data_json)
    data_json  = Column(MutableDict.as_mutable(JSON), nullable=False, default=dict)

    # vazba na projekt (přístup se kontroluje stejně jako u revizí)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    project    = relationship("Project")

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
