from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload, defer
from sqlalchemy import func, text
from datetime import datetime

from database import get_db
from routers.auth import get_current_user
from models import User as UserModel, Revision, Defect, Project, VvDoc
from schemas import RevisionRead, ProjectRead, DefectRead
from utils.ticr import verify_user_mock


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
    q = (
        db.query(Revision)
        .options(
            joinedload(Revision.project),
            defer(Revision.data_json),  # avoid coercion errors on bad persisted strings
        )
        .order_by(Revision.id.desc())
    )
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


@router.get("/projects")
def list_all_projects(
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
    owner_id: Optional[int] = Query(None),
):
    _ensure_admin(user)
    q = db.query(Project).options(
        joinedload(Project.revisions).defer(Revision.data_json),
    )
    if owner_id is not None:
        q = q.filter(Project.owner_id == owner_id)
    rows = q.order_by(Project.id.desc()).all()
    # Vrať lehký payload bez data_json, aby nedocházelo k chybám serializace
    out = []
    for p in rows:
        out.append(
            {
                "id": p.id,
                "address": getattr(p, "address", None),
                "client": getattr(p, "client", None),
                "revisions": [
                    {
                        "id": r.id,
                        "number": getattr(r, "number", None),
                        "type": getattr(r, "type", None),
                        "status": getattr(r, "status", None),
                    }
                    for r in getattr(p, "revisions", []) or []
                ],
            }
        )
    return out


@router.get("/revisions/{rev_id}/technician")
def get_revision_technician(
    rev_id: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    """Vrátí identitu technika (vlastníka projektu), který revizi vypracoval.
    Pouze pro admina.
    """
    _ensure_admin(user)
    rev = db.query(Revision).filter(Revision.id == rev_id).first()
    if not rev:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Revision not found")
    prj = db.query(Project).filter(Project.id == rev.project_id).first()
    if not prj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
    tech = db.query(UserModel).options(joinedload(UserModel.active_company)).filter(UserModel.id == prj.owner_id).first()
    if not tech:
        # fallback: bez technika
        return {
            "user": None,
            "company": None,
        }
    comp = getattr(tech, "active_company", None)
    return {
        "user": {
            "id": tech.id,
            "name": getattr(tech, "name", None),
            "email": getattr(tech, "email", None),
            "phone": getattr(tech, "phone", None),
            "address": getattr(tech, "address", None),
            "certificate_number": getattr(tech, "certificate_number", None),
            "authorization_number": getattr(tech, "authorization_number", None),
        },
        "company": None
        if comp is None
        else {
            "id": comp.id,
            "name": getattr(comp, "name", None),
            "ico": getattr(comp, "ico", None),
            "dic": getattr(comp, "dic", None),
            "address": getattr(comp, "address", None),
            "email": getattr(comp, "email", None),
            "phone": getattr(comp, "phone", None),
        },
    }


@router.get("/projects/{pid}/vv")
def list_vv_for_project(
    pid: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _ensure_admin(user)
    rows = db.query(VvDoc).filter(VvDoc.project_id == pid).order_by(VvDoc.number.asc()).all()
    out = []
    for r in rows:
        out.append(
            {
                "id": getattr(r, "id", None),
                "number": getattr(r, "number", None),
                "project_id": getattr(r, "project_id", None),
            }
        )
    return out


# -------- Users (technicians) management --------

@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
    q: Optional[str] = Query(None),
    verified: Optional[bool] = Query(None),
    role: Optional[str] = Query(None),  # 'admin' | 'user'
):
    _ensure_admin(user)
    sql = (
        "SELECT id, name, email, phone, is_verified, is_admin, "
        "certificate_number, authorization_number, "
        "rt_status, rt_valid_until, rt_last_checked_at "
        "FROM users"
    )
    where: List[str] = []
    params: dict = {}
    if q:
        where.append("(lower(name) LIKE :q OR lower(email) LIKE :q OR lower(phone) LIKE :q)")
        params["q"] = f"%{q.strip().lower()}%"
    if verified is not None:
        where.append("is_verified = :ver")
        params["ver"] = 1 if verified else 0
    if role == "admin":
        where.append("is_admin = 1")
    if role == "user":
        where.append("(is_admin IS NULL OR is_admin = 0)")
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY id DESC"

    rows = db.execute(text(sql), params).mappings().all()
    return [dict(r) for r in rows]


@router.post("/users/{uid}/verify")
def verify_user(
    uid: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _ensure_admin(user)
    target = db.query(UserModel).get(uid)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    target.is_verified = True
    target.verification_token = None
    db.add(target)
    db.commit()
    return {"id": target.id, "is_verified": target.is_verified}


@router.post("/users/{uid}/reject")
def reject_user(
    uid: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _ensure_admin(user)
    target = db.query(UserModel).get(uid)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    target.is_verified = False
    db.add(target)
    db.commit()
    return {"id": target.id, "is_verified": target.is_verified}


class AdminUserPatchPayload(BaseModel):
    is_admin: Optional[bool] = None
    is_verified: Optional[bool] = None


@router.patch("/users/{uid}")
def patch_user(
    uid: int,
    payload: AdminUserPatchPayload,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _ensure_admin(user)
    target = db.query(UserModel).get(uid)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    data = payload.model_dump(exclude_unset=True)
    if "is_admin" in data:
        target.is_admin = bool(data["is_admin"])  # type: ignore
    if "is_verified" in data:
        target.is_verified = bool(data["is_verified"])  # type: ignore
    db.add(target)
    db.commit()
    db.refresh(target)
    return {
        "id": target.id,
        "is_admin": bool(getattr(target, "is_admin", False)),
        "is_verified": bool(getattr(target, "is_verified", False)),
    }


@router.post("/rt/verify/{uid}")
def rt_verify_user(
    uid: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    """Mock verify user against TIČR and store result into users table columns (rt_*).
    Replace with real implementation later.
    """
    _ensure_admin(user)
    u: Optional[UserModel] = db.query(UserModel).filter(UserModel.id == uid).first()
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")

    data = {
        "id": u.id,
        "name": getattr(u, "name", None),
        "certificate_number": getattr(u, "certificate_number", None),
    }
    result = verify_user_mock(data)

    now_iso = datetime.utcnow().isoformat()
    sql = text(
        "UPDATE users SET rt_status=:st, rt_register_id=:rid, rt_scope=:scope, "
        "rt_valid_until=:vu, rt_source_snapshot=:snap, rt_last_checked_at=:ts WHERE id=:id"
    )
    db.execute(
        sql,
        {
            "st": result.get("status"),
            "rid": result.get("register_id"),
            "scope": ",".join(result.get("scope", []) or []),
            "vu": result.get("valid_until"),
            "snap": str(result.get("snapshot")),
            "ts": now_iso,
            "id": uid,
        },
    )
    db.commit()
    return {"ok": True, "rt_status": result.get("status"), "rt_valid_until": result.get("valid_until")}
