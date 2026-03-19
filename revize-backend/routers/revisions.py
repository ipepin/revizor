# routers/revisions.py
from __future__ import annotations

from typing import Any, Dict, List, Optional
from datetime import date
import json as _json
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload, defer
from sqlalchemy import select
from pydantic import BaseModel

from database import get_db
from routers.auth import get_current_user
from models import Project, Revision, RevisionPhoto, User as UserModel, generate_revision_uuid
from schemas import RevisionCreate, RevisionPhotoRead, RevisionRead, RevisionUpdate

try:
    from PIL import Image, ImageOps  # type: ignore
except Exception:  # pragma: no cover
    Image = None
    ImageOps = None

try:
    # oÄŤekĂˇvĂˇ se soubor auth/security.py s funkcĂ­ verify_password(plain, hashed)
    from utils.security import verify_password  # type: ignore
except Exception:  # pragma: no cover
    def verify_password(*args, **kwargs):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="verify_password() nebyl nalezen v auth/security.py",
        )


router = APIRouter(prefix="/revisions", tags=["revisions"])

UPLOAD_ROOT = Path(__file__).resolve().parents[1] / "uploads" / "revision_photos"
MAX_PHOTO_SIZE = 15 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/pjpeg": ".jpg",
    "image/jfif": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "image/heic-sequence": ".heic",
    "image/heif-sequence": ".heif",
}


# ---------- Helpers ----------

def _revision_photo_to_schema(photo: RevisionPhoto) -> RevisionPhotoRead:
    return RevisionPhotoRead.model_validate(photo, from_attributes=True)


def _get_revision_or_403(db: Session, rev_id: int, user: UserModel) -> Revision:
    rev = (
        db.query(Revision)
        .options(joinedload(Revision.project))
        .filter(Revision.id == rev_id)
        .first()
    )
    if not rev:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Revision not found")
    if not _can_access_project(user, rev.project):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return rev


def _get_revision_photo_or_404(db: Session, rev_id: int, photo_id: int) -> RevisionPhoto:
    photo = (
        db.query(RevisionPhoto)
        .filter(RevisionPhoto.id == photo_id, RevisionPhoto.revision_id == rev_id)
        .first()
    )
    if not photo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Photo not found")
    return photo


def _revision_upload_dir(rev_id: int) -> Path:
    return UPLOAD_ROOT / str(rev_id)


def _safe_photo_extension(upload: UploadFile) -> str:
    content_type = (upload.content_type or "").lower().strip()
    if content_type in ALLOWED_IMAGE_TYPES:
        return ALLOWED_IMAGE_TYPES[content_type]

    suffix = Path(upload.filename or "").suffix.lower()
    if suffix in ALLOWED_IMAGE_TYPES.values():
        return suffix

    if content_type.startswith("image/"):
        if suffix:
            return suffix
        return ".jpg"

    if content_type in {"", "application/octet-stream"} and suffix in {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".gif",
        ".heic",
        ".heif",
    }:
        return ".jpg" if suffix == ".jpeg" else suffix

    raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Only image uploads are supported")


def _delete_file_if_exists(path_str: str | None) -> None:
    if not path_str:
        return
    path = Path(path_str)
    try:
        if path.is_file():
            path.unlink()
    except Exception:
        pass


def _thumb_path_for(path: Path) -> Path:
    return path.with_name(f"{path.stem}_thumb.jpg")


def _generate_thumbnail(image_path: Path) -> Path:
    thumb_path = _thumb_path_for(image_path)
    if thumb_path.is_file():
        return thumb_path
    if Image is None or ImageOps is None:
        return image_path
    try:
        with Image.open(image_path) as img:
            img = ImageOps.exif_transpose(img)
            img = img.convert("RGB")
            img.thumbnail((480, 360))
            img.save(thumb_path, format="JPEG", quality=82, optimize=True)
        return thumb_path
    except Exception:
        return image_path

def _normalize_project_number(project_number: Any, project_id: Any) -> str:
    raw = str(project_number or "").strip()
    if raw:
        try:
            return str(int(raw))
        except ValueError:
            return raw
    try:
        return str(int(project_id))
    except Exception:
        return "0"


def _generate_revision_number(
    db: Session,
    project_id: int,
    project_number: str,
    year: int,
    prefix: str,
) -> str:
    """
    Format: <prefix>-<year>-<projectNumber>-<seq>
    seq is per-project, per-prefix and per-year.
    """
    prefix_base = str(prefix)
    normalized_project_number = _normalize_project_number(project_number, project_id)
    prefix = f"{prefix_base}-{year}-{normalized_project_number}-"

    rows = (
        db.query(Revision.number)
        .filter(Revision.project_id == project_id)
        .filter(Revision.number.like(f"{prefix}%"))
        .all()
    )

    max_seq = 0
    for (num,) in rows:
        parts = (num or "").split("-")
        if len(parts) >= 4 and parts[0] == prefix_base and parts[1] == str(year):
            try:
                max_seq = max(max_seq, int(parts[3]))
            except Exception:
                pass

    next_seq = max_seq + 1
    return f"{prefix}{next_seq:03d}"



def _can_access_project(user: UserModel, prj: Project) -> bool:
    """VlastnĂ­k projektu, nebo uĹľivatel, se kterĂ˝m je projekt sdĂ­len."""
    try:
        return prj.owner_id == user.id or any(u.id == user.id for u in prj.shared_with_users)
    except Exception:
        # kdyĹľ nenĂ­ relace shared_with_users, ber jen vlastnĂ­ka
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
    """BezpeÄŤnĂ˝ pĹ™evod ORM -> Pydantic v2 (Ĺ™eĹˇĂ­ date/datetime serializaci)."""
    return RevisionRead.model_validate(rev, from_attributes=True)


def _get_user_password_hash(user: UserModel) -> Optional[str]:
    # Podporuj obÄ› varianty nĂˇzvĹŻ
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
    VraĹĄ revize, ke kterĂ˝m mĂˇ uĹľivatel pĹ™Ă­stup (vlastnĂ­ projekty + sdĂ­lenĂ©).
    Podporuje filtrovĂˇnĂ­ `?project_id=` a `?status=`.
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

    # datumy (date_done vÄ›tĹˇinou vyĹľadujeme)
    d_done = _ensure_date(getattr(payload, "date_done", None))  
    v_until = _ensure_date(getattr(payload, "valid_until", None))
    if not d_done:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="date_done is required")

    # Evidence number (generated per user/year)
    prefix_val = "LPS" if (getattr(payload, "type", "").upper() == "LPS") else "RZ"
    number = _generate_revision_number(
        db,
        prj.id,
        getattr(prj, "number", None),
        d_done.year,
        prefix_val,
    )

    rev_uuid = generate_revision_uuid()

    # status â€“ fallback, pokud DB vyĹľaduje NOT NULL
    status_val = getattr(payload, "status", None) or "Rozpracovaná"

    # data_json â€“ pĹ™ijmi dict/JSON string, fallback na {}
    data_json_val = _ensure_dict(getattr(payload, "data_json", None))

    try:
        rev = Revision(
            project_id=payload.project_id,
            type=getattr(payload, "type", None),
            uuid=rev_uuid,
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
        db.flush()     # vyĹľĂˇdĂˇ INSERT, zĂ­skĂˇ ID (kdyby nÄ›co chybÄ›lo, hodĂ­ to error tady)
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
        .options(joinedload(Revision.project), defer(Revision.data_json))
        .filter(Revision.id == rev_id)
        .first()
    )
    if not rev:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Revision not found")
    # Admin mĹŻĹľe pĹ™istupovat ke vĹˇem revizĂ­m
    if not bool(getattr(user, "is_admin", False)) and not _can_access_project(user, rev.project):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Forbidden")
    # bezpeÄŤnĂ© naÄŤtenĂ­ data_json zvlĂˇĹˇĹĄ (mĹŻĹľe bĂ˝t uloĹľen jako string)
    try:
        raw_value = db.execute(
            select(Revision.__table__.c.data_json).where(Revision.id == rev_id)
        ).scalar_one_or_none()
        from json import loads as _loads
        if isinstance(raw_value, str):
            try:
                rev.data_json = _loads(raw_value)
            except Exception:
                rev.data_json = {}
        elif raw_value is None:
            rev.data_json = {}
        else:
            rev.data_json = raw_value if isinstance(raw_value, dict) else {}
    except Exception:
        rev.data_json = {}
    return _to_schema(rev)


# ---------- Revision photos ----------

@router.get("/{rev_id}/photos", response_model=List[RevisionPhotoRead])
def list_revision_photos(
    rev_id: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _get_revision_or_403(db, rev_id, user)
    rows = (
        db.query(RevisionPhoto)
        .filter(RevisionPhoto.revision_id == rev_id)
        .order_by(RevisionPhoto.created_at.desc(), RevisionPhoto.id.desc())
        .all()
    )
    return [_revision_photo_to_schema(row) for row in rows]


@router.post("/{rev_id}/photos", response_model=RevisionPhotoRead, status_code=status.HTTP_201_CREATED)
async def upload_revision_photo(
    rev_id: int,
    file: UploadFile = File(...),
    caption: str = Form(""),
    defect_uid: str = Form(""),
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _get_revision_or_403(db, rev_id, user)

    ext = _safe_photo_extension(file)
    payload = await file.read()
    if not payload:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")
    if len(payload) > MAX_PHOTO_SIZE:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Photo is too large")

    upload_dir = _revision_upload_dir(rev_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{ext}"
    target_path = upload_dir / filename
    target_path.write_bytes(payload)
    _generate_thumbnail(target_path)

    photo = RevisionPhoto(
        revision_id=rev_id,
        caption=str(caption or "").strip(),
        defect_uid=str(defect_uid or "").strip() or None,
        original_name=file.filename or filename,
        mime_type=(file.content_type or "application/octet-stream").lower(),
        file_size=len(payload),
        file_path=str(target_path),
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return _revision_photo_to_schema(photo)


@router.get("/{rev_id}/photos/{photo_id}/file")
def get_revision_photo_file(
    rev_id: int,
    photo_id: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _get_revision_or_403(db, rev_id, user)
    photo = _get_revision_photo_or_404(db, rev_id, photo_id)
    path = Path(photo.file_path)
    if not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Stored photo file not found")
    return FileResponse(path, media_type=photo.mime_type, filename=photo.original_name or path.name)


@router.get("/{rev_id}/photos/{photo_id}/thumb")
def get_revision_photo_thumb(
    rev_id: int,
    photo_id: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _get_revision_or_403(db, rev_id, user)
    photo = _get_revision_photo_or_404(db, rev_id, photo_id)
    path = Path(photo.file_path)
    if not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Stored photo file not found")
    thumb_path = _generate_thumbnail(path)
    media_type = "image/jpeg" if thumb_path.suffix.lower() == ".jpg" else photo.mime_type
    return FileResponse(thumb_path, media_type=media_type, filename=thumb_path.name)


@router.patch("/{rev_id}/photos/{photo_id}", response_model=RevisionPhotoRead)
def patch_revision_photo(
    rev_id: int,
    photo_id: int,
    payload: RevisionPhotoPatchBody,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _get_revision_or_403(db, rev_id, user)
    photo = _get_revision_photo_or_404(db, rev_id, photo_id)

    data = payload.model_dump(exclude_unset=True)
    if "caption" in data:
        photo.caption = str(data["caption"] or "").strip()
    if "defect_uid" in data:
        photo.defect_uid = str(data["defect_uid"] or "").strip() or None

    db.commit()
    db.refresh(photo)
    return _revision_photo_to_schema(photo)


@router.delete("/{rev_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_revision_photo(
    rev_id: int,
    photo_id: int,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    _get_revision_or_403(db, rev_id, user)
    photo = _get_revision_photo_or_404(db, rev_id, photo_id)
    file_path = photo.file_path
    thumb_path = str(_thumb_path_for(Path(file_path))) if file_path else None
    db.delete(photo)
    db.commit()
    _delete_file_if_exists(file_path)
    _delete_file_if_exists(thumb_path)


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

        # JednoduchĂˇ skalĂˇrnĂ­ pole
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
    payload: PasswordBody,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    rev = db.get(Revision, rev_id)
    if not rev:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Revision not found")
    if rev.project.owner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Only owner can delete revision")
    if not payload or not payload.password:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="password required")
    pwd_hash = _get_user_password_hash(user)
    if not pwd_hash:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="User has no password set")
    if not verify_password(payload.password, pwd_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid password")
    photo_paths = [
        row.file_path
        for row in db.query(RevisionPhoto).filter(RevisionPhoto.revision_id == rev_id).all()
    ]
    db.delete(rev)
    db.commit()
    for path in photo_paths:
        _delete_file_if_exists(path)
        _delete_file_if_exists(str(_thumb_path_for(Path(path))))
    # 204 No Content# ---------- Stav: dokonÄŤit / odemknout ----------

class PasswordBody(BaseModel):
    password: str


class CopyRevisionBody(BaseModel):
    target_project_id: int


class RevisionPhotoPatchBody(BaseModel):
    caption: Optional[str] = None
    defect_uid: Optional[str] = None


@router.post("/{rev_id}/copy", response_model=RevisionRead, status_code=status.HTTP_201_CREATED)
def copy_revision(
    rev_id: int,
    payload: CopyRevisionBody,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    src = db.get(Revision, rev_id)
    if not src:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Revision not found")

    src_project = db.get(Project, src.project_id)
    if not src_project or not _can_access_project(user, src_project):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Forbidden")

    target_project = db.get(Project, payload.target_project_id)
    if not target_project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Target project not found")
    if not _can_access_project(user, target_project):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Forbidden")

    src_date_done = _ensure_date(src.date_done) or date.today()
    src_valid_until = _ensure_date(src.valid_until)
    prefix_val = "LPS" if (str(src.type or "").upper() == "LPS") else "RZ"
    number = _generate_revision_number(
        db,
        target_project.id,
        getattr(target_project, "number", None),
        src_date_done.year,
        prefix_val,
    )
    rev_uuid = generate_revision_uuid()

    data_json_val = _ensure_dict(src.data_json)
    data_json_val["evidencni"] = number
    data_json_val["uuid"] = rev_uuid

    try:
        copied = Revision(
            project_id=target_project.id,
            type=src.type,
            uuid=rev_uuid,
            number=number,
            date_done=src_date_done,
            valid_until=src_valid_until,
            status="Rozpracovaná",
            data_json=data_json_val,
            conclusion_text=src.conclusion_text,
            conclusion_safety=src.conclusion_safety,
            conclusion_valid_until=_ensure_date(src.conclusion_valid_until),
            defects=src.defects,
        )
        db.add(copied)
        db.flush()
        db.commit()
        db.refresh(copied)
        return _to_schema(copied)
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to copy revision: {type(e).__name__}: {str(e)}",
        )


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

    # jen vlastnĂ­k mĹŻĹľe odemknout (uprav dle svĂ© politiky)
    if rev.project.owner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Only owner can unlock")

    # validace vstupu
    if not payload.password:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="password required")

    # zjisti hash hesla z aktuĂˇlnĂ­ho uĹľivatele
    pwd_hash = _get_user_password_hash(user)
    if not pwd_hash:
        # uĹľivatel nemĂˇ nastavenĂ© heslo
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="User has no password set")

    # ovÄ›Ĺ™enĂ­ hesla â€“ oĹˇetĹ™i chyby verifikĂˇtoru tak, aby z toho nebyla 500
    try:
        ok = verify_password(payload.password, pwd_hash)  # returns bool
    except Exception as e:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password verification failed: {type(e).__name__}",
        )
    if not ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid password")

    # odemkni â€“ pokud mĂˇĹˇ sloupec 'locked', nastav ho na False
    if hasattr(rev, "locked"):
        rev.locked = False
    rev.status = "Rozpracovaná"

    db.commit()
    db.refresh(rev)
    return _to_schema(rev)
