# routers/users.py
from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from routers.auth import get_current_user
from models import User, CompanyProfile
from schemas import (
    UserProfileRead, UserProfileUpdate,
    CompanyProfileRead, CompanyProfileCreate, CompanyProfileUpdate,
)

# -------------------------
# Router: /users
# -------------------------
router = APIRouter(prefix="/users", tags=["users"])

def _user_to_schema(u: User) -> UserProfileRead:
    return UserProfileRead.model_validate(u, from_attributes=True)

def _company_to_schema(c: CompanyProfile) -> CompanyProfileRead:
    return CompanyProfileRead.model_validate(c, from_attributes=True)

# --- starší alias (ponechán): /users/me ---
@router.get("/me", response_model=UserProfileRead)
def get_me(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # vracíme profilové info aktuálního uživatele
    return _user_to_schema(user)

@router.patch("/me", response_model=UserProfileRead)
def patch_me(payload: UserProfileUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return _user_to_schema(user)

# --- nové endpointy pro UserContext: /users/profile/me ---
@router.get("/profile/me", response_model=UserProfileRead)
def get_my_profile(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _user_to_schema(user)

@router.patch("/profile/me", response_model=UserProfileRead)
def update_my_profile(payload: UserProfileUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return _user_to_schema(user)

# --- správa firem svázaných s uživatelem (původní /users/companies...) ---
@router.get("/companies", response_model=List[CompanyProfileRead])
def list_companies(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (
        db.query(CompanyProfile)
        .filter(CompanyProfile.user_id == user.id)
        .order_by(CompanyProfile.name.asc())
        .all()
    )
    return [_company_to_schema(r) for r in rows]

@router.post("/companies", response_model=CompanyProfileRead, status_code=status.HTTP_201_CREATED)
def create_company(payload: CompanyProfileCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = CompanyProfile(user_id=user.id, **payload.model_dump(exclude_unset=True))
    db.add(row)
    db.commit()
    db.refresh(row)
    # první přidaná -> nastav jako aktivní
    if not getattr(user, "active_company_id", None):
        user.active_company_id = row.id
        db.commit()
    return _company_to_schema(row)

@router.patch("/companies/{cid}", response_model=CompanyProfileRead)
def update_company(cid: int, payload: CompanyProfileUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.get(CompanyProfile, cid)
    if not row or row.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Company not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return _company_to_schema(row)

@router.delete("/companies/{cid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(cid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.get(CompanyProfile, cid)
    if not row or row.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Company not found")
    db.delete(row)
    db.commit()
    # když smažu aktivní, vyber první další (nebo None)
    if getattr(user, "active_company_id", None) == cid:
        other = (
            db.query(CompanyProfile)
            .filter(CompanyProfile.user_id == user.id)
            .order_by(CompanyProfile.id.asc())
            .first()
        )
        user.active_company_id = other.id if other else None
        db.commit()
    # 204 No Content


@router.post("/companies/{cid}/activate", response_model=UserProfileRead)
def activate_company(cid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.get(CompanyProfile, cid)
    if not row or row.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Company not found")
    user.active_company_id = row.id
    db.commit()
    db.refresh(user)
    return _user_to_schema(user)


# -------------------------
# Druhý router: /companies  (pro UserContext: getCompanyById)
# -------------------------
companies_router = APIRouter(prefix="/companies", tags=["companies"])

@companies_router.get("/{cid}", response_model=CompanyProfileRead)
def get_company(cid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.get(CompanyProfile, cid)
    if not row or row.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Company not found")
    return _company_to_schema(row)
