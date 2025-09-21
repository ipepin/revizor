# routers/defects.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from datetime import datetime

from database import get_db
from models import Defect as DefectModel, DefectVisibility, ModerationStatus, User as UserModel
from schemas import (
    DefectRead,
    DefectCreate,
    DefectUpdate,
    SubmitForApproval,
    ModerationDecision,
)

# auth závislost – podle struktury projektu
try:
    # běžné umístění v tomto repo
    from routers.auth import get_current_user
except Exception:  # fallback, kdyby bylo jinde
    from auth import get_current_user  # type: ignore

router = APIRouter(prefix="/defects", tags=["defects"])


# --------- Helpers ---------
def ensure_owner_or_admin(user: UserModel, defect: DefectModel):
    """Povolí akci, pokud je uživatel vlastníkem (u user visibility) nebo admin."""
    is_admin = bool(getattr(user, "is_admin", False))
    if defect.visibility == DefectVisibility.user:
        if defect.owner_id != user.id and not is_admin:
            raise HTTPException(status_code=403, detail="Nedostatečná práva.")
    else:
        # globální položky jen admin
        if not is_admin:
            raise HTTPException(status_code=403, detail="Pouze administrátor.")


# --------- List ---------
@router.get("", response_model=list[DefectRead])
def list_defects(
    q: str | None = Query(None, description="Fulltext v popisu/normě/článku"),
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    """
    Vrací:
    - všechny GLOBÁLNÍ závady
    - + uživatelské závady, které patří přihlášenému uživateli
    """
    base_filter = or_(
        DefectModel.visibility == DefectVisibility.global_,
        and_(DefectModel.visibility == DefectVisibility.user, DefectModel.owner_id == user.id),
    )

    qset = db.query(DefectModel).filter(base_filter)

    if q:
        q_like = f"%{q.strip().lower()}%"
        qset = qset.filter(
            or_(
                DefectModel.description.ilike(q_like),
                DefectModel.standard.ilike(q_like),
                DefectModel.article.ilike(q_like),
            )
        )

    return qset.order_by(DefectModel.description.asc()).all()


# --------- Create ---------
@router.post("", response_model=DefectRead, status_code=status.HTTP_201_CREATED)
def create_defect(
    payload: DefectCreate,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    """
    Vytvoří uživatelskou závadu (visibility=user), nastaví owner_id, usage_count=0.
    """
    d = DefectModel(
        description=payload.description.strip(),
        standard=(payload.standard or "").strip() or None,
        article=(payload.article or "").strip() or None,
        visibility=DefectVisibility.user,
        moderation_status=ModerationStatus.none,
        owner_id=user.id,
        usage_count=0,  # vyžaduje sloupec v DB
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


# --------- Update ---------
@router.put("/{defect_id}", response_model=DefectRead)
def update_defect(
    defect_id: int,
    payload: DefectUpdate,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    d = db.query(DefectModel).get(defect_id)
    if not d:
        raise HTTPException(status_code=404, detail="Závada nenalezena.")

    ensure_owner_or_admin(user, d)

    if payload.description is not None:
        d.description = payload.description.strip()
    if payload.standard is not None:
        d.standard = payload.standard.strip() or None
    if payload.article is not None:
        d.article = payload.article.strip() or None

    d.updated_at = datetime.utcnow()
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


# --------- Delete ---------
@router.delete("/{defect_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_defect(
    defect_id: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    d = db.query(DefectModel).get(defect_id)
    if not d:
        raise HTTPException(status_code=404, detail="Závada nenalezena.")

    ensure_owner_or_admin(user, d)

    db.delete(d)
    db.commit()
    return None


# --------- Use++ (inkrementace počtu použití) ---------
@router.post("/{defect_id}/use")
def increment_usage(
    defect_id: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),  # může volat kdokoli přihlášený
):
    d = db.query(DefectModel).get(defect_id)
    if not d:
        raise HTTPException(status_code=404, detail="Závada nenalezena.")

    current = int(getattr(d, "usage_count", 0) or 0)
    d.usage_count = current + 1
    d.updated_at = datetime.utcnow()
    db.add(d)
    db.commit()
    db.refresh(d)
    return {"id": d.id, "usage_count": d.usage_count}


# --------- Submit to global (ke schválení) ---------
@router.post("/{defect_id}/submit", status_code=status.HTTP_200_OK)
def submit_defect(
    defect_id: int,
    payload: SubmitForApproval | None = None,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    d = db.query(DefectModel).get(defect_id)
    if not d:
        raise HTTPException(status_code=404, detail="Závada nenalezena.")

    # jen uživatelské a jen vlastník
    if d.visibility != DefectVisibility.user or d.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Lze navrhnout pouze vlastní uživatelskou položku.")

    d.moderation_status = ModerationStatus.pending
    d.reject_reason = None
    d.updated_at = datetime.utcnow()
    db.add(d)
    db.commit()
    db.refresh(d)
    return {"id": d.id, "moderation_status": d.moderation_status}


# --------- Approve (ADMIN) ---------
@router.post("/{defect_id}/approve", status_code=status.HTTP_200_OK)
def approve_defect(
    defect_id: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    if not bool(getattr(user, "is_admin", False)):
        raise HTTPException(status_code=403, detail="Pouze administrátor.")

    d = db.query(DefectModel).get(defect_id)
    if not d:
        raise HTTPException(status_code=404, detail="Závada nenalezena.")

    d.visibility = DefectVisibility.global_
    d.moderation_status = ModerationStatus.none
    d.approved_by = user.id
    d.approved_at = datetime.utcnow()
    d.reject_reason = None
    d.updated_at = datetime.utcnow()

    db.add(d)
    db.commit()
    db.refresh(d)
    return {"id": d.id, "visibility": d.visibility, "moderation_status": d.moderation_status}


# --------- Reject (ADMIN) ---------
@router.post("/{defect_id}/reject", status_code=status.HTTP_200_OK)
def reject_defect(
    defect_id: int,
    payload: ModerationDecision,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    if not bool(getattr(user, "is_admin", False)):
        raise HTTPException(status_code=403, detail="Pouze administrátor.")

    d = db.query(DefectModel).get(defect_id)
    if not d:
        raise HTTPException(status_code=404, detail="Závada nenalezena.")

    d.moderation_status = ModerationStatus.rejected
    d.reject_reason = (payload.reason or "").strip() or None
    d.updated_at = datetime.utcnow()

    db.add(d)
    db.commit()
    db.refresh(d)
    return {"id": d.id, "moderation_status": d.moderation_status, "reject_reason": d.reject_reason}
