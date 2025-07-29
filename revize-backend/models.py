# revize-backend/models.py

from sqlalchemy import Column, Integer, String, Text, ForeignKey, Table
from sqlalchemy.orm import relationship
from database import Base

# 🧩 Spojovací tabulka pro sdílení projektů mezi více uživateli
project_user_link = Table(
    "project_user_link",
    Base.metadata,
    Column("project_id", Integer, ForeignKey("projects.id", ondelete="CASCADE")),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE")),
)

# 👤 Uživatelský model (zatím základní, rozšiřitelný)
class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String, nullable=False)
    email         = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=False)

    projects        = relationship("Project", back_populates="owner")
    shared_projects = relationship(
        "Project",
        secondary=project_user_link,
        back_populates="shared_with_users",
    )

# 🏠 Projekt
class Project(Base):
    __tablename__ = "projects"

    id          = Column(Integer, primary_key=True, index=True)
    address     = Column(String, nullable=False)
    client      = Column(String, nullable=False)
    owner_id    = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    owner       = relationship("User", back_populates="projects")
    shared_with_users = relationship(
        "User",
        secondary=project_user_link,
        back_populates="shared_projects",
    )
    revisions   = relationship("Revision", back_populates="project", cascade="all, delete")

# 📄 Revizní zpráva
class Revision(Base):
    __tablename__ = "revisions"

    id                     = Column(Integer, primary_key=True, index=True)
    number                 = Column(String, unique=True, nullable=False)
    type                   = Column(String)
    date_done              = Column(String)
    valid_until            = Column(String)
    status                 = Column(String)
    data_json              = Column(Text)
    defects                = Column(Text, default="")   # každý řádek jedna závada
    conclusion_text        = Column(Text, default="")
    conclusion_safety      = Column(String, default="")
    conclusion_valid_until = Column(String, default="")

    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    project    = relationship("Project", back_populates="revisions")

# 🔧 Model pro katalog závad
class Defect(Base):
    __tablename__ = "defects"

    id          = Column(Integer, primary_key=True, index=True)
    description = Column(String, nullable=False)
    standard    = Column(String, nullable=False)
    article     = Column(String, nullable=False)

# 🛠️ Katalog komponent
class ComponentType(Base):
    __tablename__ = "component_types"
    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String, unique=True, nullable=False)
    manufacturers = relationship("Manufacturer", back_populates="type")

class Manufacturer(Base):
    __tablename__ = "manufacturers"
    id             = Column(Integer, primary_key=True, index=True)
    name           = Column(String, nullable=False)
    type_id        = Column(Integer, ForeignKey("component_types.id"))
    type           = relationship("ComponentType", back_populates="manufacturers")
    models         = relationship("ComponentModel", back_populates="manufacturer")

class ComponentModel(Base):
    __tablename__ = "component_models"
    id               = Column(Integer, primary_key=True, index=True)
    name             = Column(String, nullable=False)
    manufacturer_id  = Column(Integer, ForeignKey("manufacturers.id"))
    manufacturer     = relationship("Manufacturer", back_populates="models")
