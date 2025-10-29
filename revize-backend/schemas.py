# schemas.py
from __future__ import annotations

from typing import List, Optional, Any, Literal, Dict
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator, constr

# ==========================
# REVISION
# ==========================
class RevisionBase(BaseModel):
    type: Optional[str] = None
    status: Optional[str] = None
    date_done: Optional[date] = None
    valid_until: Optional[date] = None
    locked: Optional[bool] = None  # může existovat ve FE, BE ignoruje

    # ukládáš přes autosave
    number: Optional[str] = None
    data_json: Optional[Any] = None
    conclusion_text: Optional[str] = None
    conclusion_safety: Optional[str] = None
    conclusion_valid_until: Optional[date] = None
    defects: Optional[str] = None  # pokud sloupec používáš


class RevisionCreate(RevisionBase):
    project_id: int
    type: str
    date_done: date
    valid_until: date
    status: str | None = None
    data_json: dict | None = None


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

    # prázdný string -> None
    @field_validator("date_done", "valid_until", "conclusion_valid_until", mode="before")
    @classmethod
    def _empty_str_to_none(cls, v):
        return None if v == "" else v

    model_config = ConfigDict(from_attributes=True)


# ==========================
# PROJECT
# ==========================
# FE/BE domluva: projekt NEMÁ 'name' → jen address + client
class ProjectCreatePayload(BaseModel):
    address: constr(min_length=1)
    client:  constr(min_length=1)
    shared_with_user_ids: List[int] = []
    owner_id: Optional[int] = None  # volitelné – FE může poslat; BE může ignorovat

    class Config:
        extra = "ignore"  # kdyby FE náhodou poslal i name, nepadne to 422


class ProjectBase(BaseModel):
    address: Optional[str] = None
    client: Optional[str] = None


# Alias kvůli případným starším importům
ProjectCreate = ProjectCreatePayload


class ProjectUpdate(BaseModel):
    address: Optional[str] = None
    client: Optional[str] = None
    shared_with_user_ids: Optional[List[int]] = None


class ProjectRead(BaseModel):
    id: int
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
    is_admin: Optional[bool] = None
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
    vat_payer: Optional[bool] = None   # pokud v DB nemáš, zůstane None
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

class ComponentModelCreate(BaseModel):
    name: str = Field(..., min_length=1)
    manufacturer_id: int

class ComponentModelUpdate(BaseModel):
    name: Optional[str] = None
    manufacturer_id: Optional[int] = None

# ==========================
# DEFECTS / ZÁVADY
# ==========================
class DefectBase(BaseModel):
    description: str
    standard: Optional[str] = None
    article: Optional[str] = None


class DefectCreate(DefectBase):
    # při běžném vytvoření jde o uživatelskou položku
    pass


class DefectUpdate(BaseModel):
    description: Optional[str] = None
    standard: Optional[str] = None
    article: Optional[str] = None


class DefectRead(DefectBase):
    id: int
    visibility: Literal["global", "user"]
    moderation_status: Literal["none", "pending", "rejected"]
    owner_id: Optional[int] = None
    approved_by: Optional[int] = None
    reject_reason: Optional[str] = None
    usage_count: Optional[int] = 0   # ⬅️ přidej
    model_config = {"from_attributes": True}
    

class SubmitForApproval(BaseModel):
    # volitelné: zpráva autorů/odůvodnění
    note: Optional[str] = None


class ModerationDecision(BaseModel):
    reason: Optional[str] = None


# ==========================
# USER INSTRUMENTS
# ==========================
class InstrumentBase(BaseModel):
    name: str = Field(..., min_length=2)
    measurement_text: str = Field(..., min_length=2)  # povinné
    calibration_code: str
    serial: Optional[str] = None
    calibration_valid_until: Optional[str] = None   # "YYYY-MM-DD"
    note: Optional[str] = None


class InstrumentCreate(InstrumentBase):
    pass


class InstrumentUpdate(BaseModel):
    name: Optional[str] = None
    measurement_text: Optional[str] = None
    calibration_code: Optional[str] = None
    serial: Optional[str] = None
    calibration_valid_until: Optional[str] = None
    note: Optional[str] = None


class InstrumentOut(InstrumentBase):
    # FE si drží string (stačí int taky, ale nechávám zpětnou kompatibilitu)
    id: str


class VvDocBase(BaseModel):
    project_id: int
    data_json: Dict[str, Any] = Field(default_factory=dict)  # ProtocolData z FE

class VvDocCreate(VvDocBase):
    id: str  # FE UUID

class VvDocUpdate(BaseModel):
    # projekt u editace stejně neměníme → necháme volitelné
    project_id: Optional[int] = None
    # přijmi libovolnou slovníkovou strukturu
    data_json: dict = Field(default_factory=dict)

class VvDocRead(BaseModel):
    id: str
    number: str
    project_id: int
    created_at: Any
    updated_at: Any
    data_json: dict

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
