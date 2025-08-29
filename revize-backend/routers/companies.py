# routers/companies.py
from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user
from models import User, CompanyProfile  # ← používáme CompanyProfile
from schemas import (
    CompanyProfileRead,
    CompanyProfileCreate,
    CompanyProfileUpdate,
)

router = APIRouter(prefix="/companies", tags=["companies"])


def _to_schema(row: CompanyProfile) -> CompanyProfileRead:
    return CompanyProfileRead.model_validate(row, from_attributes=True)


# ---- List (volitelné; hodí se do nějakého pickeru) ----
@router.get("", response_model=List[CompanyProfileRead])
def list_companies(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = (
        db.query(CompanyProfile)
        .filter(CompanyProfile.user_id == user.id)
        .order_by(CompanyProfile.name.asc())
        .all()
    )
    return [_to_schema(r) for r in rows]


# ---- Detail (UserContext volá GET /companies/{id}) ----
@router.get("/{cid}", response_model=CompanyProfileRead)
def get_company(
    cid: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = db.get(CompanyProfile, cid)
    if not row or row.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Company not found")
    return _to_schema(row)


# ---- Create (když zakládáš firmu v profilu) ----
@router.post("", response_model=CompanyProfileRead, status_code=status.HTTP_201_CREATED)
def create_company(
    payload: CompanyProfileCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = CompanyProfile(user_id=user.id, **payload.model_dump(exclude_unset=True))
    db.add(row)
    db.commit()
    db.refresh(row)

    # pokud uživatel nemá aktivní firmu, nastav tuhle
    if getattr(user, "active_company_id", None) in (None, 0):
        user.active_company_id = row.id
        db.commit()

    return _to_schema(row)


# ---- Update ----
@router.patch("/{cid}", response_model=CompanyProfileRead)
def update_company(
    cid: int,
    payload: CompanyProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = db.get(CompanyProfile, cid)
    if not row or row.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Company not found")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)

    db.commit()
    db.refresh(row)
    return _to_schema(row)


# ---- Delete ----
@router.delete("/{cid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    cid: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = db.get(CompanyProfile, cid)
    if not row or row.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Company not found")

    db.delete(row)
    db.commit()

    # pokud se smazala aktivní firma, vyber jinou nebo None
    if getattr(user, "active_company_id", None) == cid:
        other = (
            db.query(CompanyProfile)
            .filter(CompanyProfile.user_id == user.id)
            .order_by(CompanyProfile.id.asc())
            .first()
        )
        user.active_company_id = other.id if other else None
        db.commit()
    # 204 No Content – bez těla
