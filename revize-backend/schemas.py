# revize-backend/schemas.py

from typing import List, Optional
from pydantic import BaseModel, ConfigDict

# --- User ---

class UserBase(BaseModel):
    name: str
    email: str

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# --- Project ---

class ProjectBase(BaseModel):
    address: str
    client: str

class ProjectCreate(ProjectBase):
    owner_id: Optional[int] = None

class ProjectRead(ProjectBase):
    id: int
    owner_id: Optional[int]

    model_config = ConfigDict(from_attributes=True)


# --- Revision ---

class RevisionBase(BaseModel):
    number: str
    type: Optional[str] = None
    date_done: Optional[str] = None
    valid_until: Optional[str] = None
    status: Optional[str] = None
    data_json: Optional[str] = None

    # nová pole
    defects: Optional[str] = None
    conclusion_text: Optional[str] = None
    conclusion_safety: Optional[str] = None
    conclusion_valid_until: Optional[str] = None

class RevisionCreate(RevisionBase):
    project_id: int

class RevisionRead(RevisionBase):
    id: int
    project_id: int

    model_config = ConfigDict(from_attributes=True)

class RevisionUpdate(BaseModel):
    number:        Optional[str] = None
    type:          Optional[str] = None
    date_done:     Optional[str] = None
    valid_until:   Optional[str] = None
    status:        Optional[str] = None
    data_json:     Optional[str] = None

    defects:                  Optional[str] = None
    conclusion_text:          Optional[str] = None
    conclusion_safety:        Optional[str] = None
    conclusion_valid_until:   Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# --- Component Catalog ---

class ComponentModelBase(BaseModel):
    name: str

class ComponentModelCreate(ComponentModelBase):
    manufacturer_id: int

class ComponentModelRead(ComponentModelBase):
    id: int
    manufacturer_id: int

    model_config = ConfigDict(from_attributes=True)

class ManufacturerBase(BaseModel):
    name: str

class ManufacturerCreate(ManufacturerBase):
    type_id: int

class ManufacturerRead(ManufacturerBase):
    id: int
    type_id: int
    models: List[ComponentModelRead] = []

    model_config = ConfigDict(from_attributes=True)

class ComponentTypeBase(BaseModel):
    name: str

class ComponentTypeCreate(ComponentTypeBase):
    pass

class ComponentTypeRead(ComponentTypeBase):
    id: int
    manufacturers: List[ManufacturerRead] = []

    model_config = ConfigDict(from_attributes=True)


# --- Defect Catalog ---

class DefectBase(BaseModel):
    description: str
    standard:    str
    article:     str

class DefectCreate(DefectBase):
    pass

class DefectRead(DefectBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
