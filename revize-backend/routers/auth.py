from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from datetime import datetime
from sqlalchemy.orm import Session
import secrets

from database import get_db
from models import User
from utils.security import hash_password, verify_password, create_access_token
from routers.deps import get_current_user
from utils.ticr import verify_user_mock
from utils.ticr_client import verify_against_ticr, TICR_LIVE


router = APIRouter(prefix="/auth", tags=["auth"])


# ---------- Schemas ----------
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str | None = None
    certificate_number: str
    authorization_number: str | None = None  # optional
    address: str | None = None
    ico: str | None = None
    dic: str | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    is_admin: bool = False

    class Config:
        orm_mode = True


# ---------- Endpoints ----------
@router.post("/register")
def register(data: RegisterIn, db: Session = Depends(get_db)):
    # TIČR ověření před uložením – pokud nesedí, zablokuj registraci
    if TICR_LIVE:
        verify = verify_against_ticr(data.name, data.certificate_number)
        # Fallback to mock only for hard errors (network/parse)
        if verify.get("status") == "error":
            verify = verify_user_mock({
                "name": data.name,
                "certificate_number": data.certificate_number,
            })
    else:
        verify = verify_user_mock({
            "name": data.name,
            "certificate_number": data.certificate_number,
        })

    if verify.get("status") != "verified":
        raise HTTPException(
            status_code=400,
            detail="Uvedené číslo oprávnění není nalezeno v databázi TIČR",
        )

    # prvního uživatele rovnou ověřit (usnadnění vývoje)
    first_user = db.query(User).count() == 0
    verification_token = None if first_user else secrets.token_urlsafe(32)

    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        is_verified=first_user,
        verification_token=verification_token,
        phone=data.phone,
        certificate_number=data.certificate_number,
        authorization_number=data.authorization_number,
        address=data.address,
        ico=data.ico,
        dic=data.dic,
        instruments_json="[]",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Zapiš rt_* výsledek k uživateli (best-effort)
    try:
        sql = text(
            "UPDATE users SET rt_status=:st, rt_register_id=:rid, rt_scope=:scope, rt_valid_until=:vu, rt_source_snapshot=:snap, rt_last_checked_at=:ts WHERE id=:id"
        )
        now_iso = datetime.utcnow().isoformat()
        db.execute(
            sql,
            {
                "st": verify.get("status"),
                "rid": verify.get("register_id"),
                "scope": ",".join(verify.get("scope", []) or []),
                "vu": verify.get("valid_until"),
                "snap": str(verify.get("snapshot")),
                "ts": now_iso,
                "id": user.id,
            },
        )
        db.commit()
    except Exception:
        pass

    # pro vývoj vracíme i verifikační token (v produkci by se poslal e-mailem)
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "is_verified": user.is_verified,
        "verification_token": user.verification_token,
        "rt_status": verify.get("status"),
    }


class RtLookupIn(BaseModel):
    name: str
    certificate_number: str


@router.post("/rt/lookup")
def rt_lookup(payload: RtLookupIn):
    """Public endpoint for registration UI to verify name + certificate against TIČR.
    Uses live client when TICR_LIVE=1, otherwise mock.
    """
    if TICR_LIVE:
        result = verify_against_ticr(payload.name, payload.certificate_number)
        if result.get("status") == "error":
            result = verify_user_mock(payload.model_dump())
    else:
        result = verify_user_mock(payload.model_dump())
    return result


@router.post("/login", response_model=TokenOut)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    # OAuth2PasswordRequestForm používá pole "username" -> zde je to e‑mail
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified yet",
        )

    access_token = create_access_token({"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def read_me(current: User = Depends(get_current_user)):
    return current


@router.get("/verify")
def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.verification_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid token")
    user.is_verified = True
    user.verification_token = None
    db.commit()
    return {"ok": True}

