from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.orm import Session, joinedload, defer

from database import get_db
from models import User as UserModel, Revision, Defect, Project, VvDoc
from routers.auth import get_current_user
from schemas import DefectRead
from utils.security import hash_password
from utils.ticr_client import verify_against_ticr

router = APIRouter(prefix="/admin", tags=["admin"])


def _ensure_admin(user: UserModel) -> None:
    if not bool(getattr(user, "is_admin", False)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Pouze pro adminy")

# ---------------------------------------------------------------------------
# Revisions / Projects overview
# ---------------------------------------------------------------------------

@router.get("/revisions")
def list_all_revisions(
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, alias="status"),
    project_id: Optional[int] = Query(None),
):
    _ensure_admin(user)
    query = (
        db.query(Revision)
        .options(joinedload(Revision.project), defer(Revision.data_json))
        .order_by(Revision.id.desc())
    )
    if status_filter:
        query = query.filter(Revision.status == status_filter)
    if project_id is not None:
        query = query.filter(Revision.project_id == project_id)

    rows = query.all()
    return [
        {
            "id": rev.id,
            "project_id": rev.project_id,
            "number": rev.number,
            "type": rev.type,
            "status": rev.status,
            "date_done": rev.date_done.isoformat() if getattr(rev, "date_done", None) else None,
            "valid_until": rev.valid_until.isoformat() if getattr(rev, "valid_until", None) else None,
        }
        for rev in rows
    ]

@router.get("/defects", response_model=List[DefectRead])
def list_all_defects(
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, alias="status"),
):
    _ensure_admin(user)
    query = db.query(Defect)
    if status_filter:
        query = query.filter(Defect.moderation_status == status_filter)
    return query.order_by(Defect.id.desc()).all()


@router.get("/projects")
def list_all_projects(
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
    owner_id: Optional[int] = Query(None),
):
    _ensure_admin(user)
    query = db.query(Project).options(joinedload(Project.revisions).defer(Revision.data_json))
    if owner_id is not None:
        query = query.filter(Project.owner_id == owner_id)

    projects = query.order_by(Project.id.desc()).all()
    return [
        {
            "id": project.id,
            "address": getattr(project, "address", None),
            "client": getattr(project, "client", None),
            "revisions": [
                {
                    "id": rev.id,
                    "number": getattr(rev, "number", None),
                    "type": getattr(rev, "type", None),
                    "status": getattr(rev, "status", None),
                }
                for rev in getattr(project, "revisions", []) or []
            ],
        }
        for project in projects
    ]


@router.get("/revisions/{rev_id}/technician")
def get_revision_technician(
    rev_id: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _ensure_admin(user)

    revision = db.query(Revision).filter(Revision.id == rev_id).first()
    if not revision:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Revize nebyla nalezena")

    project = db.query(Project).filter(Project.id == revision.project_id).first()
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Projekt nebyl nalezen")

    technician = (
        db.query(UserModel)
        .options(joinedload(UserModel.active_company))
        .filter(UserModel.id == project.owner_id)
        .first()
    )
    if not technician:
        return {"user": None, "company": None}

    company = getattr(technician, "active_company", None)
    return {
        "user": {
            "id": technician.id,
            "name": getattr(technician, "name", None),
            "email": getattr(technician, "email", None),
            "phone": getattr(technician, "phone", None),
            "address": getattr(technician, "address", None),
            "certificate_number": getattr(technician, "certificate_number", None),
            "authorization_number": getattr(technician, "authorization_number", None),
        },
        "company": None
        if company is None
        else {
            "id": company.id,
            "name": getattr(company, "name", None),
            "ico": getattr(company, "ico", None),
            "dic": getattr(company, "dic", None),
            "address": getattr(company, "address", None),
            "email": getattr(company, "email", None),
            "phone": getattr(company, "phone", None),
        },
    }


@router.get("/projects/{project_id}/vv")
def list_vv_for_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _ensure_admin(user)
    vv_rows = (
        db.query(VvDoc)
        .filter(VvDoc.project_id == project_id)
        .order_by(VvDoc.number.asc())
        .all()
    )
    return [
        {
            "id": getattr(doc, "id", None),
            "number": getattr(doc, "number", None),
            "project_id": getattr(doc, "project_id", None),
        }
        for doc in vv_rows
    ]

# ---------------------------------------------------------------------------
# Users management
# ---------------------------------------------------------------------------


class AdminUserCreatePayload(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    certificate_number: Optional[str] = None
    authorization_number: Optional[str] = None
    address: Optional[str] = None
    ico: Optional[str] = None
    dic: Optional[str] = None
    is_admin: bool = False
    is_verified: bool = True
    lookup_ticr: bool = False


@router.post("/users")
def create_user(
    payload: AdminUserCreatePayload,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _ensure_admin(user)

    existing = db.query(UserModel).filter(UserModel.email == payload.email).first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Uzivatel s timto e-mailem uz existuje")

    new_user = UserModel(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        is_admin=payload.is_admin,
        is_verified=payload.is_verified,
        verification_token=None,
        phone=payload.phone,
        certificate_number=payload.certificate_number or None,
        authorization_number=payload.authorization_number or None,
        address=payload.address,
        ico=payload.ico,
        dic=payload.dic,
        instruments_json="[]",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if payload.lookup_ticr and payload.certificate_number:
        try:
            result = verify_against_ticr(payload.name, payload.certificate_number)
        except Exception:
            result = None
        if result:
            now_iso = datetime.utcnow().isoformat()
            db.execute(
                text(
                    "UPDATE users SET rt_status=:st, rt_register_id=:rid, rt_scope=:scope, "
                    "rt_valid_until=:vu, rt_source_snapshot=:snap, rt_last_checked_at=:ts WHERE id=:id"
                ),
                {
                    "st": result.get("status"),
                    "rid": result.get("register_id"),
                    "scope": ",".join(result.get("scope", []) or []),
                    "vu": result.get("valid_until"),
                    "snap": str(result.get("snapshot")),
                    "ts": now_iso,
                    "id": new_user.id,
                },
            )
            db.commit()

    return {
        "id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "is_admin": bool(new_user.is_admin),
        "is_verified": bool(new_user.is_verified),
    }


@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
    q: Optional[str] = Query(None),
    verified: Optional[bool] = Query(None),
    role: Optional[str] = Query(None),
):
    _ensure_admin(user)

    sql = (
        "SELECT id, name, email, phone, address, ico, dic, is_verified, is_admin, "
        "certificate_number, authorization_number, rt_status, rt_valid_until, rt_last_checked_at "
        "FROM users"
    )
    where: List[str] = []
    params: dict[str, object] = {}

    if q:
        where.append("(lower(name) LIKE :q OR lower(email) LIKE :q OR lower(phone) LIKE :q)")
        params["q"] = f"%{q.strip().lower()}%"
    if verified is not None:
        where.append("is_verified = :ver")
        params["ver"] = 1 if verified else 0
    if role == "admin":
        where.append("is_admin = 1")
    elif role == "user":
        where.append("(is_admin IS NULL OR is_admin = 0)")

    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY id DESC"

    rows = db.execute(text(sql), params).mappings().all()
    return [dict(row) for row in rows]


@router.post("/users/{uid}/verify")
def verify_user(
    uid: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _ensure_admin(user)
    target = db.get(UserModel, uid)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Uzivatel nenalezen")
    target.is_verified = True
    target.verification_token = None
    db.add(target)
    db.commit()
    return {"id": target.id, "is_verified": True}


@router.post("/users/{uid}/reject")
def reject_user(
    uid: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _ensure_admin(user)
    target = db.get(UserModel, uid)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Uzivatel nenalezen")
    target.is_verified = False
    db.add(target)
    db.commit()
    return {"id": target.id, "is_verified": False}


class AdminUserPatchPayload(BaseModel):
    is_admin: Optional[bool] = None
    is_verified: Optional[bool] = None
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    ico: Optional[str] = None
    dic: Optional[str] = None
    certificate_number: Optional[str] = None
    authorization_number: Optional[str] = None


@router.patch("/users/{uid}")
def patch_user(
    uid: int,
    payload: AdminUserPatchPayload,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _ensure_admin(user)
    target = db.get(UserModel, uid)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Uzivatel nenalezen")

    data = payload.model_dump(exclude_unset=True)
    if "email" in data:
        existing = (
            db.query(UserModel)
            .filter(UserModel.email == data["email"], UserModel.id != uid)
            .first()
        )
        if existing:
            raise HTTPException(
                status.HTTP_409_CONFLICT, detail="Uzivatel s timto e-mailem uz existuje"
            )
    if "is_admin" in data:
        target.is_admin = bool(data["is_admin"])
    if "is_verified" in data:
        target.is_verified = bool(data["is_verified"])
        if target.is_verified:
            target.verification_token = None
    if "name" in data:
        target.name = data["name"]
    if "email" in data:
        target.email = data["email"]
    if "phone" in data:
        target.phone = data["phone"]
    if "address" in data:
        target.address = data["address"]
    if "ico" in data:
        target.ico = data["ico"]
    if "dic" in data:
        target.dic = data["dic"]
    if "certificate_number" in data:
        target.certificate_number = data["certificate_number"]
    if "authorization_number" in data:
        target.authorization_number = data["authorization_number"]

    db.add(target)
    db.commit()
    db.refresh(target)
    return {
        "id": target.id,
        "is_admin": bool(target.is_admin),
        "is_verified": bool(target.is_verified),
    }


@router.delete("/users/{uid}")
def delete_user(
    uid: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _ensure_admin(user)
    target = db.get(UserModel, uid)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Uzivatel nenalezen")

    projects = db.query(Project).filter(Project.owner_id == uid).all()
    project_ids = [p.id for p in projects]
    if project_ids:
        db.query(Revision).filter(Revision.project_id.in_(project_ids)).delete(synchronize_session=False)
        db.query(VvDoc).filter(VvDoc.project_id.in_(project_ids)).delete(synchronize_session=False)
        db.query(Project).filter(Project.id.in_(project_ids)).delete(synchronize_session=False)

    db.delete(target)
    db.commit()
    return {"ok": True, "id": uid}


@router.post("/rt/verify/{uid}")
def rt_verify_user(
    uid: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _ensure_admin(user)
    target = db.get(UserModel, uid)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Uzivatel nenalezen")

    full_name = (getattr(target, "name", None) or "").strip()
    cert_no = (getattr(target, "certificate_number", None) or "").strip()
    if not full_name or not cert_no:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Chybí jméno nebo číslo osvědčení u uživatele")

    # Live-only lookup against TIČR
    result = verify_against_ticr(full_name, cert_no)

    now_iso = datetime.utcnow().isoformat()
    db.execute(
        text(
            "UPDATE users SET rt_status=:st, rt_register_id=:rid, rt_scope=:scope, "
            "rt_valid_until=:vu, rt_source_snapshot=:snap, rt_last_checked_at=:ts WHERE id=:id"
        ),
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
    return {
        "ok": True,
        "rt_status": result.get("status"),
        "rt_valid_until": result.get("valid_until"),
        "match": result.get("matched"),
        "checked_at": now_iso,
    }


class DeleteUserPayload(BaseModel):
    id: int


@router.post("/users/{uid}/delete")
def delete_user_post(
    uid: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    return delete_user(uid, db, user)


@router.post("/users/delete")
def delete_user_post_body(
    payload: DeleteUserPayload,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    return delete_user(payload.id, db, user)


class AdminRtLookupIn(BaseModel):
    name: str
    certificate_number: str


@router.post("/rt/lookup")
def rt_lookup_admin(
    payload: AdminRtLookupIn,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    """Admin‑only live verification against TIČR. Returns holder info and validity."""
    _ensure_admin(user)
    name = (payload.name or "").strip()
    cert = (payload.certificate_number or "").strip()
    if not name or not cert:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Vyplňte jméno i číslo osvědčení")
    try:
        result = verify_against_ticr(name, cert)
    except Exception:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="TIČR dočasně nedostupný")
    return result


