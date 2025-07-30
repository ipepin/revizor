# revize-backend/schemas.py

from typing import List, Optional,Any,Dict
from datetime import date
from pydantic import BaseModel, ConfigDict

# --- Users ---

class UserBase(BaseModel):
    name:  str
    email: str

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# --- Projects ---

class ProjectBase(BaseModel):
    address: str
    client:  str

class ProjectCreate(ProjectBase):
    owner_id: Optional[int] = None

class ProjectRead(ProjectBase):
    id:       int
    owner_id: Optional[int]

    model_config = ConfigDict(from_attributes=True)


# --- Revisions ---

class RevisionBase(BaseModel):
    number:      str
    type:        Optional[str] = None
    date_done:   Optional[str] = None
    valid_until: Optional[str] = None
    status:      Optional[str] = None
    data_json:   Optional[str] = None

    # nová pole pro sekce
    defects:                Optional[str] = None
    conclusion_text:        Optional[str] = None
    conclusion_safety:      Optional[str] = None
    conclusion_valid_until: Optional[str] = None

class RevisionCreate(BaseModel):
    project_id: int
    type: str
    date_done: date
    valid_until: date
    status: str
    data_json: Dict[str, Any]

    class Config:
        orm_mode = True

class RevisionRead(RevisionBase):
    id:         int
    project_id: int

    model_config = ConfigDict(from_attributes=True)

class RevisionUpdate(BaseModel):
    number:      Optional[str] = None
    type:        Optional[str] = None
    date_done:   Optional[str] = None
    valid_until: Optional[str] = None
    status:      Optional[str] = None
    data_json:   Optional[str] = None

    defects:                Optional[str] = None
    conclusion_text:        Optional[str] = None
    conclusion_safety:      Optional[str] = None
    conclusion_valid_until: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# --- Component Catalog ---

class ComponentTypeRead(BaseModel):
    id: int
    name: str

class ManufacturerRead(BaseModel):
    id: int
    name: str

class ComponentModelRead(BaseModel):
    id: int
    name: str

class ManufacturerBase(BaseModel):
    name: str

class ManufacturerCreate(ManufacturerBase):
    type_id: int

class ManufacturerRead(ManufacturerBase):
    id:      int
    type_id: int
    models:  List[ComponentModelRead] = []

    model_config = ConfigDict(from_attributes=True)


class ComponentTypeBase(BaseModel):
    name: str

class ComponentTypeCreate(ComponentTypeBase):
    pass

class ComponentTypeRead(ComponentTypeBase):
    id:            int
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

class RevisionRead(RevisionBase):
    id: int
    project_id: int
    data_json: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class RevisionUpdate(BaseModel):
    data_json: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
# --- Aliasy pro zpětnou kompatibilitu starších importů ---

ComponentTypeOut    = ComponentTypeRead
ManufacturerOut     = ManufacturerRead
ComponentModelOut   = ComponentModelRead
DefectOut           = DefectRead
UserOut             = UserRead
ProjectOut          = ProjectRead
RevisionOut         = RevisionRead
