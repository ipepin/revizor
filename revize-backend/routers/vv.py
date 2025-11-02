# routers/vv.py
from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user
from models import Project, User as UserModel, VvDoc as VvDocModel
from schemas import VvDocCreate, VvDocUpdate, VvDocRead
from pydantic import BaseModel

router = APIRouter(prefix="/vv", tags=["vv"])

SEQ_PAD = 3  # VV-<pid>-<seq:03d>-<year>

# password verify
try:
    from utils.security import verify_password  # type: ignore
except Exception:  # pragma: no cover
    def verify_password(*args, **kwargs):  # type: ignore
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="verify_password() not available")

class PasswordBody(BaseModel):
    password: str

def _get_user_password_hash(user: UserModel) -> Optional[str]:
    return getattr(user, "password_hash", None) or getattr(user, "hashed_password", None)


def _ensure_project_access_or_404(db: Session, pid: int, user: UserModel) -> Project:
    prj = db.get(Project, pid)
    if not prj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    shared_ids = {u.id for u in getattr(prj, "shared_with_users", [])}
    if prj.owner_id != user.id and user.id not in shared_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return prj


def _generate_vv_number(db: Session, project_id: int) -> str:
    """
    Formát: VV-<projectId>-<seq>-<year>
    - seq je pořadí v rámci (project_id, rok), 1..N
    """
    year = datetime.now().year
    prefix = f"VV-{project_id}-"
    suffix = f"-{year}"

    rows = (
        db.query(VvDocModel.number)
        .filter(
            and_(
                VvDocModel.project_id == project_id,
                VvDocModel.number.like(f"{prefix}%{suffix}"),
            )
        )
        .all()
    )

    max_seq = 0
    for (num,) in rows:
        parts = (num or "").split("-")
        if len(parts) >= 4 and parts[0] == "VV" and parts[1] == str(project_id) and parts[-1] == str(year):
            try:
                max_seq = max(max_seq, int(parts[2]))
            except Exception:
                pass

    next_seq = max_seq + 1
    seq_str = f"{next_seq:0{SEQ_PAD}d}"
    return f"{prefix}{seq_str}{suffix}"


def _default_protocol_data(project: Project) -> dict:
    """Výchozí struktura, kterou editor očekává."""
    today = datetime.now().date().isoformat()
    address = getattr(project, "address", "") or ""
    name = address or f"Projekt {project.id}"
    return {
        "objectName": name,
        "address": address,
        "preparedBy": "",
        "date": today,
        "committee": [{"role": "Předseda", "name": ""}],
        "spaces": [
            {
                "id": str(uuid4()),
                "name": "Hlavní prostor",
                "note": "",
                "selections": {},
                "measures": "",
                "intervals": "",
            }
        ],
    }


@router.post("", response_model=VvDocRead, status_code=status.HTTP_201_CREATED)
def create_vv(
    payload: VvDocCreate,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    prj = _ensure_project_access_or_404(db, payload.project_id, user)

    if db.get(VvDocModel, payload.id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Document with this ID already exists")

    number = _generate_vv_number(db, payload.project_id)

    row = VvDocModel(
        id=payload.id,
        number=number,
        project_id=payload.project_id,
        data_json=payload.data_json or _default_protocol_data(prj),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/{doc_id}", response_model=VvDocRead)
def get_vv(
    doc_id: str,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    row = db.get(VvDocModel, doc_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    _ensure_project_access_or_404(db, row.project_id, user)
    return row


@router.put("/{doc_id}", response_model=VvDocRead)
def put_vv(
    doc_id: str,
    payload: VvDocUpdate,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    row = db.get(VvDocModel, doc_id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    _ensure_project_access_or_404(db, row.project_id, user)

    if payload.project_id is not None and payload.project_id != row.project_id:
        raise HTTPException(status_code=400, detail="Changing project_id is not allowed. Create a new VV in the target project.")

    if payload.data_json is not None:
        row.data_json = payload.data_json

    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/project/{project_id}", response_model=List[VvDocRead])
def list_vv_for_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _ensure_project_access_or_404(db, project_id, user)
    rows = (
        db.query(VvDocModel)
        .filter(VvDocModel.project_id == project_id)
        .order_by(VvDocModel.created_at.desc())
        .all()
    )
    return rows


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vv(
    doc_id: str,
    payload: PasswordBody,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    row = db.get(VvDocModel, doc_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    prj = _ensure_project_access_or_404(db, row.project_id, user)
    if prj.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can delete")

    if not payload or not payload.password:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="password required")
    pwd_hash = _get_user_password_hash(user)
    if not pwd_hash:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User has no password set")
    if not verify_password(payload.password, pwd_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")

    db.delete(row)
    db.commit()
    return None
