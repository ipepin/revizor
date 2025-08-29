# routers/projects.py
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from models import Project, User as UserModel
from routers.auth import get_current_user
from schemas import ProjectRead  # odpověď (Pydantic v2: má mít model_config = ConfigDict(from_attributes=True))

router = APIRouter(prefix="/projects", tags=["projects"])


# --------- Request payloads (vstupy) ---------
class ProjectCreatePayload(BaseModel):
    name: str
    address: Optional[str] = None
    client: Optional[str] = None
    # volitelné nasdílení při vytvoření
    shared_with_user_ids: Optional[List[int]] = None


class ProjectPatchPayload(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    client: Optional[str] = None
    shared_with_user_ids: Optional[List[int]] = None


# --------- Helpers ---------
def _query_user_projects(db: Session, user_id: int):
    """
    Vrať dotaz na projekty, ke kterým má uživatel přístup:
    - je vlastníkem (owner_id)
    - je mezi 'shared_with_users'
    """
    # Pozn.: vztah shared_with_users předpokládá many-to-many mezi Project a User
    return (
        db.query(Project)
        .outerjoin(Project.shared_with_users)  # type: ignore[attr-defined]
        .filter(or_(Project.owner_id == user_id, UserModel.id == user_id))
        .distinct()
    )


def _ensure_project_access_or_404(db: Session, pid: int, user: UserModel) -> Project:
    prj = db.get(Project, pid)
    if not prj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # přístup, pokud je vlastník, nebo je sdílený
    shared_ids = {u.id for u in getattr(prj, "shared_with_users", [])}
    if prj.owner_id != user.id and user.id not in shared_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return prj


# --------- Routes ---------
@router.get("", response_model=List[ProjectRead])
def list_projects(
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    """
    Vrať všechny projekty přihlášeného uživatele (vlastněné i nasdílené).
    Vrací i vložené revize (dle ProjectRead schématu).
    """
    projects = _query_user_projects(db, user.id).order_by(Project.id.desc()).all()
    return projects


@router.get("/{pid}", response_model=ProjectRead)
def get_project(
    pid: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    """
    Detail projektu se všemi daty (včetně revizí).
    """
    prj = _ensure_project_access_or_404(db, pid, user)
    return prj


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreatePayload,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    """
    Vytvoř nový projekt. Vlastníkem je aktuální uživatel.
    Lze rovnou nasdílet dalším uživatelům.
    """
    prj = Project(
        name=payload.name,
        address=payload.address or "",
        client=payload.client or "",
        owner_id=user.id,
    )

    if payload.shared_with_user_ids:
        users = db.query(UserModel).filter(UserModel.id.in_(payload.shared_with_user_ids)).all()
        # přiřazení many-to-many
        setattr(prj, "shared_with_users", users)

    db.add(prj)
    db.commit()
    db.refresh(prj)
    return prj


@router.patch("/{pid}", response_model=ProjectRead)
def patch_project(
    pid: int,
    payload: ProjectPatchPayload,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    """
    Částečná aktualizace projektu. Povoleno vlastníkovi i uživatelům se sdíleným přístupem
    (můžeš si upravit, pokud patch smí provádět jen vlastník).
    """
    prj = _ensure_project_access_or_404(db, pid, user)

    # pokud chceš patch omezit jen na vlastníka, odkomentuj:
    # if prj.owner_id != user.id:
    #     raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can modify the project")

    if payload.name is not None:
        prj.name = payload.name
    if payload.address is not None:
        prj.address = payload.address
    if payload.client is not None:
        prj.client = payload.client

    if payload.shared_with_user_ids is not None:
        users = db.query(UserModel).filter(UserModel.id.in_(payload.shared_with_user_ids)).all()
        setattr(prj, "shared_with_users", users)

    db.commit()
    db.refresh(prj)
    return prj


@router.delete("/{pid}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_project(
    pid: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    """
    Smazání projektu (typicky povol jen vlastníkovi).
    """
    prj = _ensure_project_access_or_404(db, pid, user)

    if prj.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can delete the project")

    db.delete(prj)
    db.commit()
    return None
