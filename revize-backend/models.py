from sqlalchemy import Column, Integer, String, Text, ForeignKey, Table, Date
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

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=False)

    # Projekty, které uživatel vlastní
    projects = relationship("Project", back_populates="owner")

    # Projekty, které uživatel sdílí (m:n)
    shared_projects = relationship("Project", secondary=project_user_link, back_populates="shared_with_users")


# 🏠 Projekt
class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    address = Column(String, nullable=False)
    client = Column(String, nullable=False)

    # Vlastník projektu
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    owner = relationship("User", back_populates="projects")

    # Sdílení s dalšími uživateli
    shared_with_users = relationship("User", secondary=project_user_link, back_populates="shared_projects")

    # Revize přiřazené k tomuto projektu
    revisions = relationship("Revision", back_populates="project", cascade="all, delete")


# 📄 Revizní zpráva
class Revision(Base):
    __tablename__ = "revisions"

    id = Column(Integer, primary_key=True, index=True)

    # Unikátní evidenční číslo napříč celým systémem
    number = Column(String, unique=True, nullable=False)

    type = Column(String)
    date_done = Column(String)
    valid_until = Column(String)
    status = Column(String)
    data_json = Column(Text)

    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    project = relationship("Project", back_populates="revisions")
