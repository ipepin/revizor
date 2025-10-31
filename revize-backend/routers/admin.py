from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from routers.auth import get_current_user
from models import User as UserModel, Revision, Defect, Project
from schemas import RevisionRead, ProjectRead, DefectRead


router = APIRouter(prefix="/admin", tags=["admin"])


def _ensure_admin(user: UserModel) -> None:
    if not bool(getattr(user, "is_admin", False)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Admin only")


@router.get("/revisions")
def list_all_revisions(
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, alias="status"),
    project_id: Optional[int] = Query(None),
):
    _ensure_admin(user)
    q = db.query(Revision).options(joinedload(Revision.project)).order_by(Revision.id.desc())
    if status_filter:
        q = q.filter(Revision.status == status_filter)
    if project_id is not None:
        q = q.filter(Revision.project_id == project_id)
    rows = q.all()
    # Vrať minimalistické serializovatelné dicty, abychom vyloučili problémy s Pydantic/ORM
    def _d(r: Revision):
        return {
            "id": r.id,
            "project_id": r.project_id,
            "number": r.number,
            "type": r.type,
            "status": r.status,
            "date_done": r.date_done.isoformat() if getattr(r, "date_done", None) else None,
            "valid_until": r.valid_until.isoformat() if getattr(r, "valid_until", None) else None,
        }
    return [_d(r) for r in rows]


@router.get("/defects", response_model=List[DefectRead])
def list_all_defects(
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, alias="status"),
):
    _ensure_admin(user)
    q = db.query(Defect)
    if status_filter:
        # expects one of: none|pending|rejected
        q = q.filter(Defect.moderation_status == status_filter)
    return q.order_by(Defect.id.desc()).all()


@router.get("/projects", response_model=List[ProjectRead])
def list_all_projects(
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _ensure_admin(user)
    return (
        db.query(Project)
        .options(joinedload(Project.revisions))
        .order_by(Project.id.desc())
        .all()
    )
