# === Backend Models (complete) ===
# Full SQLAlchemy models.py with User, Project, Revision, Defect, Component hierarchy.
# -----------------------------------------------------------------------------

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    ForeignKey,
    Table,
    Boolean,
    UniqueConstraint,
    Date,
    text,
)
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.dialects import postgresql
from database import Base

# 📎 Many-to-many table: shared projects ↔ users
project_user_link = Table(
    "project_user_link",
    Base.metadata,
    Column("project_id", Integer, ForeignKey("projects.id", ondelete="CASCADE")),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE")),
)

# 👤 User
class User(Base):
    __tablename__ = "users"

    id                = Column(Integer, primary_key=True, index=True)
    name              = Column(String, nullable=False)
    email             = Column(String, unique=True, index=True, nullable=False)
    password_hash     = Column(String, nullable=False)
    is_verified       = Column(Boolean, default=False)
    verification_token = Column(String, nullable=True)

    # 🆕 profilová data
    certificate_number   = Column(String, nullable=True)   # číslo osvědčení
    authorization_number = Column(String, nullable=True)   # číslo oprávnění
    address              = Column(String, nullable=True)
    ico                  = Column(String, nullable=True)
    dic                  = Column(String, nullable=True)
    birth_date           = Column(String, nullable=True)   # pro SQLite držím jako string "YYYY-MM-DD"
    phone                = Column(String, nullable=True)

    active_company_id = Column(Integer, ForeignKey("company_profiles.id"), nullable=True)

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")

    # ✅ musí párovat s Project.shared_with_users
    shared_projects = relationship(
        "Project",
        secondary=project_user_link,
        back_populates="shared_with_users",
    )

    # ✅ vymezíme FK cestu, aby nebyla kolize s active_company
    companies = relationship(
        "CompanyProfile",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="CompanyProfile.user_id",   # <<< DŮLEŽITÉ
    )

    active_company = relationship(
        "CompanyProfile",
        foreign_keys=[active_company_id],
        uselist=False,
    )

# 🏗️  Project
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

# 📄 Revision report
class Revision(Base):
    __tablename__ = "revisions"

    id                     = Column(Integer, primary_key=True, index=True)
    number                 = Column(String, unique=True, nullable=False)
    type                   = Column(String, nullable=False)

    # skutečná data (ne stringy)
    date_done              = Column(Date, nullable=False)
    valid_until            = Column(Date, nullable=True)

    status                 = Column(String(20), nullable=False, default="Rozpracovaná")
    defects                = Column(Text, default="")
    conclusion_text        = Column(Text, default="")
    conclusion_safety      = Column(String, default="")
    conclusion_valid_until = Column(String, default="")

    # JSONB (PostgreSQL varianta B) — pokud používáš SQLite, nahraď za Column(JSON, default=dict)
    data_json = Column(
        MutableDict.as_mutable(JSONB),
        server_default=text("'{}'::jsonb"),
        nullable=False,
    )

    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    project    = relationship("Project", back_populates="revisions")

# 🔧 Defect catalog
class Defect(Base):
    __tablename__ = "defects"

    id          = Column(Integer, primary_key=True, index=True)
    description = Column(String, nullable=False)
    standard    = Column(String, nullable=False)
    article     = Column(String, nullable=False)

# 🛠️  Component hierarchy
class ComponentType(Base):
    __tablename__ = "component_types"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String, unique=True, nullable=False)
    manufacturers = relationship("Manufacturer", back_populates="type", cascade="all, delete-orphan")

class Manufacturer(Base):
    __tablename__ = "manufacturers"

    id      = Column(Integer, primary_key=True, index=True)
    name    = Column(String, nullable=False)

    type_id = Column(Integer, ForeignKey("component_types.id", ondelete="CASCADE"))
    type    = relationship("ComponentType", back_populates="manufacturers")

    models  = relationship("ComponentModel", back_populates="manufacturer", cascade="all, delete-orphan")

class ComponentModel(Base):
    __tablename__ = "component_models"

    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String, nullable=False)

    manufacturer_id = Column(Integer, ForeignKey("manufacturers.id", ondelete="CASCADE"))
    manufacturer    = relationship("Manufacturer", back_populates="models")


class CableFamily(Base):
    __tablename__ = "cable_families"
    id     = Column(Integer, primary_key=True)
    name   = Column(String, unique=True, nullable=False)
    cables = relationship("Cable", back_populates="family", cascade="all,delete")

class Cable(Base):
    __tablename__ = "cables"
    id        = Column(Integer, primary_key=True)
    family_id = Column(Integer, ForeignKey("cable_families.id"), nullable=False)

    # volitelný popisek pro FE (předpočítané "CYKY 3×2,5")
    label     = Column(String, nullable=True)

    # dimenze (např. 3x2,5)
    spec      = Column(String, nullable=False)

    family    = relationship("CableFamily", back_populates="cables")

    __table_args__ = (UniqueConstraint("family_id", "spec", name="uq_cables_family_spec"),)


class Device(Base):
    __tablename__ = "devices"

    id           = Column(Integer, primary_key=True, index=True)
    name         = Column(String, nullable=False)   # např. "Svítidlo", "Zásuvka", ...
    manufacturer = Column(String, nullable=True)    # volitelně
    model        = Column(String, nullable=True)    # volitelně
    trida        = Column(String, nullable=True)    # volitelně (tř. ochrany)
    ip           = Column(String, nullable=True)    # volitelně (IP krytí)
    note         = Column(Text, nullable=True)      # volitelná poznámka


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

    # ✅ zrcadlí User.companies a vymezuje FK
    user = relationship(
        "User",
        back_populates="companies",
        foreign_keys=[user_id],
    )
