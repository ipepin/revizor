from pydantic import BaseModel
from typing import List, Optional

class RevisionBase(BaseModel):
    number: str
    type: str
    date_done: str
    valid_until: str
    status: str
    data_json: str

class RevisionCreate(RevisionBase):
    project_id: int

class Revision(RevisionBase):
    id: int
    project_id: int

    class Config:
        orm_mode = True

class ProjectBase(BaseModel):
    address: str
    client: str

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: int
    revisions: List[Revision] = []

    class Config:
        orm_mode = True

class RevisionCreate(BaseModel):
    project_id: int
    number: str
    type: str
    date_done: str
    valid_until: str
    status: str
    data_json: str