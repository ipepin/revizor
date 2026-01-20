# routers/snippets.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Literal, List

from database import get_db
from models import (
    Snippet as SnippetModel,
    SnippetPreference as SnippetPreferenceModel,
    SnippetScope,
    User as UserModel,
)
from schemas import SnippetCreate, SnippetUpdate, SnippetRead, SnippetVisibilityPayload

# auth závislost
try:
    from routers.auth import get_current_user
except Exception:  # fallback
    from auth import get_current_user  # type: ignore

router = APIRouter(prefix="/snippets", tags=["snippets"])


def _ensure_access(user: UserModel, snippet: SnippetModel) -> None:
    is_owner = snippet.user_id == user.id if snippet.user_id is not None else False
    is_admin = bool(getattr(user, "is_admin", False))
    if snippet.user_id is None:
        if not is_admin:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Pouze administrátor může upravit výchozí rychlou větu.")
    else:
        if not (is_owner or is_admin):
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Nemáte oprávnění k úpravě této rychlé věty.")


def _apply_visibility(snippets: List[SnippetModel], prefs: dict[int, SnippetPreferenceModel]) -> None:
    for s in snippets:
        pref = prefs.get(s.id)
        s.visible = pref.visible if pref else True  # type: ignore[attr-defined]
        s.order_index = pref.order_index if pref else None  # type: ignore[attr-defined]


@router.get("", response_model=list[SnippetRead])
def list_snippets(
    scope: Literal["EI", "LPS"] = Query(..., description="Scope rychlých vět"),
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    q = db.query(SnippetModel).filter(
        SnippetModel.scope == SnippetScope(scope),
        or_(
            SnippetModel.user_id == None,  # noqa: E711
            SnippetModel.user_id == user.id,
            SnippetModel.is_default == True,
        ),
    )
    snippets = q.order_by(SnippetModel.is_default.desc(), SnippetModel.label.asc()).all()

    if not snippets:
        return []

    pref_map: dict[int, SnippetPreferenceModel] = {
        p.snippet_id: p
        for p in db.query(SnippetPreferenceModel)
        .filter(
            SnippetPreferenceModel.user_id == user.id,
            SnippetPreferenceModel.snippet_id.in_([s.id for s in snippets]),
        )
        .all()
    }

    _apply_visibility(snippets, pref_map)
    return snippets


@router.post("", response_model=SnippetRead, status_code=status.HTTP_201_CREATED)
def create_snippet(
    payload: SnippetCreate,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    s = SnippetModel(
        scope=SnippetScope(payload.scope),
        label=payload.label.strip(),
        body=payload.body,
        user_id=user.id,
        is_default=False,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    s.visible = True  # type: ignore[attr-defined]
    s.order_index = None  # type: ignore[attr-defined]
    return s


@router.put("/{snippet_id}", response_model=SnippetRead)
def update_snippet(
    snippet_id: int,
    payload: SnippetUpdate,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    s = db.query(SnippetModel).get(snippet_id)
    if not s:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Rychlá věta nenalezena.")

    _ensure_access(user, s)

    if payload.label is not None:
        s.label = payload.label.strip()
    if payload.body is not None:
        s.body = payload.body
    if payload.scope is not None:
        s.scope = SnippetScope(payload.scope)

    db.commit()
    db.refresh(s)
    pref = (
        db.query(SnippetPreferenceModel)
        .filter(
            SnippetPreferenceModel.user_id == user.id,
            SnippetPreferenceModel.snippet_id == s.id,
        )
        .first()
    )
    s.visible = pref.visible if pref else True  # type: ignore[attr-defined]
    s.order_index = pref.order_index if pref else None  # type: ignore[attr-defined]
    return s


@router.delete("/{snippet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_snippet(
    snippet_id: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    s = db.query(SnippetModel).get(snippet_id)
    if not s:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Rychlá věta nenalezena.")
    _ensure_access(user, s)
    db.delete(s)
    db.commit()
    return {"ok": True}


@router.post("/{snippet_id}/visibility", response_model=SnippetRead)
def set_visibility(
    snippet_id: int,
    payload: SnippetVisibilityPayload,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    s = db.query(SnippetModel).get(snippet_id)
    if not s:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Rychlá věta nenalezena.")

    pref = (
        db.query(SnippetPreferenceModel)
        .filter(
            SnippetPreferenceModel.user_id == user.id,
            SnippetPreferenceModel.snippet_id == s.id,
        )
        .first()
    )
    if pref:
        pref.visible = payload.visible
        pref.order_index = payload.order_index
    else:
        pref = SnippetPreferenceModel(
            user_id=user.id,
            snippet_id=s.id,
            visible=payload.visible,
            order_index=payload.order_index,
        )
        db.add(pref)

    db.commit()

    s.visible = payload.visible  # type: ignore[attr-defined]
    s.order_index = payload.order_index  # type: ignore[attr-defined]
    return s


# ---------------- Admin ----------------
def _ensure_admin(user: UserModel) -> None:
    if not bool(getattr(user, "is_admin", False)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Pouze administrátor.")


@router.get("/admin/all", response_model=list[SnippetRead])
def admin_list_snippets(
    scope: str | None = Query(None, description="Filtr podle scope"),
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _ensure_admin(user)
    q = db.query(SnippetModel)
    if scope:
        q = q.filter(SnippetModel.scope == SnippetScope(scope))
    return q.order_by(SnippetModel.scope.asc(), SnippetModel.label.asc()).all()


@router.post("/{snippet_id}/promote", response_model=SnippetRead)
def admin_promote_snippet(
    snippet_id: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _ensure_admin(user)
    src = db.query(SnippetModel).get(snippet_id)
    if not src:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Rychlá věta nenalezena.")
    existing = (
        db.query(SnippetModel)
        .filter(
            SnippetModel.scope == src.scope,
            SnippetModel.label == src.label,
            SnippetModel.is_default == True,  # noqa: E712
        )
        .first()
    )
    if existing:
        return existing
    new_snip = SnippetModel(scope=src.scope, label=src.label, body=src.body, user_id=None, is_default=True)
    db.add(new_snip)
    db.commit()
    db.refresh(new_snip)
    new_snip.visible = True  # type: ignore[attr-defined]
    return new_snip


@router.post("/admin/default", response_model=SnippetRead, status_code=status.HTTP_201_CREATED)
def admin_create_default_snippet(
    payload: SnippetCreate,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    """Admin vytvoří přímo výchozí rychlou větu."""
    _ensure_admin(user)
    exists = (
        db.query(SnippetModel)
        .filter(
            SnippetModel.scope == SnippetScope(payload.scope),
            SnippetModel.label == payload.label.strip(),
            SnippetModel.is_default == True,  # noqa: E712
        )
        .first()
    )
    if exists:
        return exists
    s = SnippetModel(
        scope=SnippetScope(payload.scope),
        label=payload.label.strip(),
        body=payload.body,
        user_id=None,
        is_default=True,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    s.visible = True  # type: ignore[attr-defined]
    return s
