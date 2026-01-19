# routers/norms.py
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import Literal, Optional

from database import get_db
from models import Norm as NormModel, NormScope, User as UserModel
from schemas import NormRead, NormCreate, NormUpdate

# auth dependency
try:
    from routers.auth import get_current_user
except Exception:  # fallback
    from auth import get_current_user  # type: ignore

router = APIRouter(prefix="/norms", tags=["norms"])


def _ensure_admin(user: UserModel) -> None:
    if not bool(getattr(user, "is_admin", False)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Pouze administr?tor.")


@router.get("", response_model=list[NormRead])
def list_norms(
    scope: Literal["EI", "LPS"] = Query(..., description="Scope norem"),
    q: Optional[str] = Query(None, description="Fulltext v n?zvu normy"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = db.query(NormModel).filter(NormModel.scope == NormScope(scope))
    if q:
        term = f"%{q.strip()}%"
        query = query.filter(NormModel.label.ilike(term))
    return query.order_by(NormModel.label.asc()).all()


# ---------------- Admin ----------------
@router.get("/admin/all", response_model=list[NormRead])
def admin_list_norms(
    scope: Optional[Literal["EI", "LPS"]] = Query(None, description="Filtr podle scope"),
    q: Optional[str] = Query(None, description="Fulltext v n?zvu normy"),
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _ensure_admin(user)
    query = db.query(NormModel)
    if scope:
        query = query.filter(NormModel.scope == NormScope(scope))
    if q:
        term = f"%{q.strip()}%"
        query = query.filter(NormModel.label.ilike(term))
    return query.order_by(NormModel.scope.asc(), NormModel.label.asc()).all()


@router.post("/admin", response_model=NormRead, status_code=status.HTTP_201_CREATED)
def admin_create_norm(
    payload: NormCreate,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _ensure_admin(user)
    exists = (
        db.query(NormModel)
        .filter(
            NormModel.scope == NormScope(payload.scope),
            NormModel.label == payload.label.strip(),
        )
        .first()
    )
    if exists:
        return exists
    n = NormModel(
        scope=NormScope(payload.scope),
        label=payload.label.strip(),
        status=payload.status,
        issued_on=payload.issued_on,
        canceled_on=payload.canceled_on,
        is_default=True,
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return n


@router.put("/admin/{norm_id}", response_model=NormRead)
def admin_update_norm(
    norm_id: int,
    payload: NormUpdate,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _ensure_admin(user)
    n = db.query(NormModel).get(norm_id)
    if not n:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Norma nenalezena.")
    if payload.scope is not None:
        n.scope = NormScope(payload.scope)
    if payload.label is not None:
        n.label = payload.label.strip()
    if payload.status is not None:
        n.status = payload.status
    if payload.issued_on is not None:
        n.issued_on = payload.issued_on
    if payload.canceled_on is not None:
        n.canceled_on = payload.canceled_on
    if payload.is_default is not None:
        n.is_default = payload.is_default
    db.commit()
    db.refresh(n)
    return n


@router.delete("/admin/{norm_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_norm(
    norm_id: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _ensure_admin(user)
    n = db.query(NormModel).get(norm_id)
    if not n:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Norma nenalezena.")
    db.delete(n)
    db.commit()
    return {"ok": True}
