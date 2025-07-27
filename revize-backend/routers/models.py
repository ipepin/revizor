
from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base  # použijeme Base z database.py – správně napojený

Base = Base()

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    address = Column(String, nullable=False)
    client = Column(String, nullable=False)

    # Propojení s revizemi
    revisions = relationship("Revision", back_populates="project", cascade="all, delete")

class Revision(Base):
    __tablename__ = "revisions"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    number = Column(String)
    type = Column(String)
    date_done = Column(String)
    valid_until = Column(String)
    status = Column(String)
    data_json = Column(Text)

    # Propojení zpět na projekt
    project = relationship("Project", back_populates="revisions")

class ComponentType(Base):
    __tablename__ = "component_types"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    manufacturers = relationship("Manufacturer", back_populates="type")

class Manufacturer(Base):
    __tablename__ = "manufacturers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type_id = Column(Integer, ForeignKey("component_types.id", ondelete="CASCADE"))
    type = relationship("ComponentType", back_populates="manufacturers")
    models = relationship("ComponentModel", back_populates="manufacturer")

class ComponentModel(Base):
    __tablename__ = "component_models"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    manufacturer_id = Column(Integer, ForeignKey("manufacturers.id", ondelete="CASCADE"))
    manufacturer = relationship("Manufacturer", back_populates="models")

class Defect(Base):
    __tablename__ = "defects"
    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, nullable=False)
    standard    = Column(String, nullable=False)
    article     = Column(String, nullable=False)