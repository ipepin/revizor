
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
