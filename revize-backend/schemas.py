# schemas.py
from __future__ import annotations

from typing import List, Optional, Any
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field
from pydantic import field_validator

# ==========================
# REVISION
# ==========================
class RevisionBase(BaseModel):
    type: Optional[str] = None
    status: Optional[str] = None
    date_done: Optional[date] = None
    valid_until: Optional[date] = None
    locked: Optional[bool] = None

    # ⬇️ DOPLNĚNO – běžně ukládáš z autosavu
    number: Optional[str] = None
    data_json: Optional[Any] = None
    conclusion_text: Optional[str] = None
    conclusion_safety: Optional[str] = None
    conclusion_valid_until: Optional[date] = None
    defects: Optional[str] = None  # pokud máš ten sloupec v modelu


class RevisionCreate(RevisionBase):
    project_id: int

class RevisionUpdate(RevisionBase):
    project_id: Optional[int] = None

class RevisionRead(BaseModel):
    id: int
    project_id: int
    type: Optional[str] = None
    status: Optional[str] = None
    date_done: Optional[date] = None
    valid_until: Optional[date] = None
    locked: Optional[bool] = None

    number: Optional[str] = None
    data_json: Optional[dict[str, Any]] = None
    conclusion_text: Optional[str] = None
    conclusion_safety: Optional[str] = None
    conclusion_valid_until: Optional[date] = None
    defects: Optional[str] = None

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # ⬇️ DŮLEŽITÉ: prázdný řetězec -> None
    @field_validator("date_done", "valid_until", "conclusion_valid_until", mode="before")
    @classmethod
    def _empty_str_to_none(cls, v):
        return None if v == "" else v

    model_config = ConfigDict(from_attributes=True)
    


# ==========================
# PROJECT
# ==========================
class ProjectBase(BaseModel):
    # bylo: name: str
    name: Optional[str] = None
    address: Optional[str] = None
    client: Optional[str] = None


class ProjectCreate(ProjectBase):
    # při vytvoření povinné
    name: str


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    client: Optional[str] = None
    shared_with_user_ids: Optional[List[int]] = None


class ProjectRead(BaseModel):
    id: int
    # bylo: name: str
    name: Optional[str] = None
    address: Optional[str] = None
    client: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # vložené revize
    revisions: List[RevisionRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


# ==========================
# USER
# ==========================
class UserRead(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ==========================
# USER PROFILE (rozšířená data uživatele)
# ==========================
class UserProfileRead(BaseModel):
    id: int
    user_id: Optional[int] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

    certificate_number: Optional[str] = None
    authorization_number: Optional[str] = None
    certificate_valid_until: Optional[date] = None

    ico: Optional[str] = None
    dic: Optional[str] = None
    active_company_id: Optional[int] = None

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdate(BaseModel):
    user_id: Optional[int] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    certificate_number: Optional[str] = None
    authorization_number: Optional[str] = None
    certificate_valid_until: Optional[date] = None
    ico: Optional[str] = None
    dic: Optional[str] = None
    active_company_id: Optional[int] = None


# ==========================
# COMPANY PROFILE (firma / IČO)
# ==========================
class CompanyProfileRead(BaseModel):
    id: int
    name: Optional[str] = None
    ico: Optional[str] = None          # IČO
    dic: Optional[str] = None          # DIČ
    vat_payer: Optional[bool] = None   # plátce DPH
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    bank_account: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


class CompanyProfileCreate(BaseModel):
    name: str
    ico: Optional[str] = None
    dic: Optional[str] = None
    vat_payer: Optional[bool] = None
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    bank_account: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: Optional[bool] = None


class CompanyProfileUpdate(BaseModel):
    name: Optional[str] = None
    ico: Optional[str] = None
    dic: Optional[str] = None
    vat_payer: Optional[bool] = None
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    bank_account: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: Optional[bool] = None


# ==========================
# KATALOG / KOMPONENTY
# ==========================
class ManufacturerRead(BaseModel):
    id: int
    name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ComponentTypeRead(BaseModel):
    id: int
    name: Optional[str] = None
    code: Optional[str] = None  # např. "MCB", "RCD", ...

    model_config = ConfigDict(from_attributes=True)


class ComponentModelRead(BaseModel):
    id: int
    name: Optional[str] = None
    current: Optional[str] = None       # např. "16 A"
    poles: Optional[str] = None         # např. "1P", "3P+N"
    voltage: Optional[str] = None
    extra: Optional[Any] = None         # libovolná metadata

    model_config = ConfigDict(from_attributes=True)


class ComponentRead(BaseModel):
    id: int
    board_id: Optional[int] = None
    name: Optional[str] = None
    order_index: Optional[int] = None
    notes: Optional[str] = None

    component_type: Optional[ComponentTypeRead] = None
    manufacturer: Optional[ManufacturerRead] = None
    model: Optional[ComponentModelRead] = None

    current: Optional[str] = None
    poles: Optional[str] = None

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DistributionBoardRead(BaseModel):
    id: int
    project_id: int
    name: Optional[str] = None
    location: Optional[str] = None
    voltage: Optional[str] = None
    current: Optional[str] = None
    ip_rating: Optional[str] = None
    serial_number: Optional[str] = None
    notes_html: Optional[str] = None

    components: List[ComponentRead] = Field(default_factory=list)

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ==========================
# DEFECTS / ZÁVADY
# ==========================
class DefectBase(BaseModel):
    code: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    norm: Optional[str] = None          # např. "ČSN 33 2000-6 ed.2"
    severity: Optional[str] = None      # "low" | "medium" | "high"
    location: Optional[str] = None      # popis umístění (pokoj/rozvaděč atd.)


class DefectCreate(DefectBase):
    revision_id: int


class DefectUpdate(DefectBase):
    revision_id: Optional[int] = None   # umožní přesun mezi revizemi


class DefectRead(BaseModel):
    id: int
    revision_id: Optional[int] = None
    room_id: Optional[int] = None
    board_id: Optional[int] = None

    code: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    norm: Optional[str] = None
    severity: Optional[str] = None
    location: Optional[str] = None

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ==========================
# (Volitelné) aliasy pro zpětnou kompatibilitu
# ==========================
UserProfileOut = UserProfileRead
ProjectOut = ProjectRead
RevisionOut = RevisionRead
DefectOut = DefectRead
ManufacturerOut = ManufacturerRead
ComponentTypeOut = ComponentTypeRead
ComponentModelOut = ComponentModelRead
CompanyOut = CompanyProfileRead
