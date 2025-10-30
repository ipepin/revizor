# routers/revisions.py
from __future__ import annotations

from typing import Any, Dict, List, Optional
from datetime import date
import json as _json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel

from database import get_db
from routers.auth import get_current_user
from models import Revision, Project, User as UserModel
from schemas import RevisionRead, RevisionCreate, RevisionUpdate

try:
    # očekává se soubor auth/security.py s funkcí verify_password(plain, hashed)
    from utils.security import verify_password  # type: ignore
except Exception:  # pragma: no cover
    def verify_password(*args, **kwargs):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="verify_password() nebyl nalezen v auth/security.py",
        )


router = APIRouter(prefix="/revisions", tags=["revisions"])


# ---------- Helpers ----------

def _can_access_project(user: UserModel, prj: Project) -> bool:
    """Vlastník projektu, nebo uživatel, se kterým je projekt sdílen."""
    try:
        return prj.owner_id == user.id or any(u.id == user.id for u in prj.shared_with_users)
    except Exception:
        # když není relace shared_with_users, ber jen vlastníka
        return prj.owner_id == user.id


def _ensure_date(d: Any) -> Optional[date]:
    if d is None:
        return None
    if isinstance(d, date):
        return d
    try:
        # akceptuj i ISO string
        return date.fromisoformat(str(d))
    except Exception:
        return None


def _ensure_dict(v: Any) -> Dict[str, Any]:
    if v is None:
        return {}
    if isinstance(v, dict):
        return v
    if isinstance(v, str):
        try:
            return _json.loads(v)
        except Exception:
            return {}
    try:
        return dict(v)
    except Exception:
        return {}


def _to_schema(rev: Revision) -> RevisionRead:
    """Bezpečný převod ORM -> Pydantic v2 (řeší date/datetime serializaci)."""
    return RevisionRead.model_validate(rev, from_attributes=True)


def _get_user_password_hash(user: UserModel) -> Optional[str]:
    # Podporuj obě varianty názvů
    h = getattr(user, "password_hash", None)
    if not h:
        h = getattr(user, "hashed_password", None)
    return h


# ---------- Listing ----------

@router.get("", response_model=List[RevisionRead])
def list_revisions(
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
    project_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
):
    """
    Vrať revize, ke kterým má uživatel přístup (vlastní projekty + sdílené).
    Podporuje filtrování `?project_id=` a `?status=`.
    """
    q = (
        db.query(Revision)
        .join(Project, Revision.project_id == Project.id)
        .outerjoin(Project.shared_with_users)  # pokud existuje many-to-many
        .options(joinedload(Revision.project))
        .filter(or_(Project.owner_id == user.id, UserModel.id == user.id))
        .distinct()
        .order_by(Revision.id.desc())
    )

    if project_id is not None:
        q = q.filter(Revision.project_id == project_id)
    if status_filter:
        q = q.filter(Revision.status == status_filter)

    rows = q.all()
    return [_to_schema(r) for r in rows]


# ---------- Create ----------

@router.post("", response_model=RevisionRead, status_code=status.HTTP_201_CREATED)
def create_revision(
    payload: RevisionCreate,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    prj = db.get(Project, payload.project_id)
    if not prj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
    if not _can_access_project(user, prj):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Forbidden")

    # pořadí pro číslování
    existing_count = (
        db.query(func.count(Revision.id))
        .filter(Revision.project_id == payload.project_id)
        .scalar()
    ) or 0
    seq = existing_count + 1

    # datumy (date_done většinou vyžadujeme)
    d_done = _ensure_date(getattr(payload, "date_done", None))  
    v_until = _ensure_date(getattr(payload, "valid_until", None))
    if not d_done:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="date_done is required")

    # evidenční číslo – použij to z payloadu pokud ho FE poslal, jinak vygeneruj
    number = getattr(payload, "number", None) or f"RZ-{payload.project_id}-{seq}-{d_done.year}"

    # status – fallback, pokud DB vyžaduje NOT NULL
    status_val = getattr(payload, "status", None) or "Rozpracovaná"

    # data_json – přijmi dict/JSON string, fallback na {}
    data_json_val = _ensure_dict(getattr(payload, "data_json", None))

    try:
        rev = Revision(
            project_id=payload.project_id,
            type=getattr(payload, "type", None),
            number=number,
            date_done=d_done,
            valid_until=v_until,
            status=status_val,
            data_json=data_json_val,
            conclusion_text=getattr(payload, "conclusion_text", None),
            conclusion_safety=getattr(payload, "conclusion_safety", None),
            conclusion_valid_until=_ensure_date(getattr(payload, "conclusion_valid_until", None)),

        )
        db.add(rev)
        db.flush()     # vyžádá INSERT, získá ID (kdyby něco chybělo, hodí to error tady)
        db.commit()
        db.refresh(rev)
        return _to_schema(rev)

    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create revision: {type(e).__name__}: {str(e)}",
        )


# ---------- Read one ----------

@router.get("/{rev_id}", response_model=RevisionRead)
def get_revision(
    rev_id: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    rev = (
        db.query(Revision)
        .options(joinedload(Revision.project))
        .filter(Revision.id == rev_id)
        .first()
    )
    if not rev:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Revision not found")
    # Admin může přistupovat ke všem revizím
    if not bool(getattr(user, "is_admin", False)) and not _can_access_project(user, rev.project):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return _to_schema(rev)


# ---------- Update ----------

@router.patch("/{rev_id}", response_model=RevisionRead)
def patch_revision(
    rev_id: int,
    payload: RevisionUpdate,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    rev = db.get(Revision, rev_id)
    if not rev:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Revision not found")
    if not _can_access_project(user, rev.project):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Forbidden")

    data = payload.model_dump(exclude_unset=True)

    try:
        # Date fields
        if "date_done" in data:
            nd = _ensure_date(data["date_done"])
            if nd:
                rev.date_done = nd
        if "valid_until" in data:
            rev.valid_until = _ensure_date(data["valid_until"])
        if "conclusion_valid_until" in data:
            rev.conclusion_valid_until = _ensure_date(data["conclusion_valid_until"])

        # Jednoduchá skalární pole
        for k in ("number", "type", "status", "defects", "conclusion_text",
                  "conclusion_safety", "locked"):
            if k in data:
                setattr(rev, k, data[k])

        # data_json parsing
        if "data_json" in data:
            setattr(rev, "data_json", _ensure_dict(data["data_json"]))

        db.flush()
        db.commit()
        db.refresh(rev)
        return _to_schema(rev)

    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update revision: {type(e).__name__}: {str(e)}",
        )


# ---------- Delete ----------

@router.delete("/{rev_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_revision(
    rev_id: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    rev = db.get(Revision, rev_id)
    if not rev:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Revision not found")
    if rev.project.owner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Only owner can delete revision")
    db.delete(rev)
    db.commit()
    # 204 No Content – nic nevracíme


# ---------- Stav: dokončit / odemknout ----------

class PasswordBody(BaseModel):
    password: str


@router.post("/{rev_id}/complete", response_model=RevisionRead)
def mark_completed(
    rev_id: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    rev = db.get(Revision, rev_id)
    if not rev:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Revision not found")
    if rev.project.owner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Only owner can complete")

    rev.status = "Dokončená"
    db.commit()
    db.refresh(rev)
    return _to_schema(rev)


@router.post("/{rev_id}/unlock", response_model=RevisionRead)
def unlock_revision(
    rev_id: int,
    payload: PasswordBody,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    rev = db.get(Revision, rev_id)
    if not rev:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Revision not found")

    # jen vlastník může odemknout (uprav dle své politiky)
    if rev.project.owner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Only owner can unlock")

    # validace vstupu
    if not payload.password:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="password required")

    # zjisti hash hesla z aktuálního uživatele
    pwd_hash = _get_user_password_hash(user)
    if not pwd_hash:
        # uživatel nemá nastavené heslo
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="User has no password set")

    # ověření hesla – ošetři chyby verifikátoru tak, aby z toho nebyla 500
    try:
        ok = verify_password(payload.password, pwd_hash)  # returns bool
    except Exception as e:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password verification failed: {type(e).__name__}",
        )
    if not ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid password")

    # odemkni – pokud máš sloupec 'locked', nastav ho na False
    if hasattr(rev, "locked"):
        rev.locked = False
    rev.status = "Rozpracovaná"

    db.commit()
    db.refresh(rev)
    return _to_schema(rev)
