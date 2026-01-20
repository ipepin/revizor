from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from datetime import datetime
import secrets
import logging

from database import get_db
from models import User
from utils.security import hash_password, verify_password, create_access_token
from routers.deps import get_current_user
from utils.ticr_client import verify_against_ticr
from utils.mailersend import send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

# ---------- Schemas ----------
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str | None = None
    certificate_number: str
    authorization_number: str | None = None
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
    if len((data.password or "")) < 8:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Heslo musi mit alespon 8 znaku",
        )

    try:
        verify = verify_against_ticr(data.name, data.certificate_number)
    except Exception:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Overeni TICR se nepodarilo, zkuste to prosim znovu",
        )

    if verify.get("status") != "verified":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Cislo osvedceni nebylo nalezeno v TICR",
        )

    # first user convenience: verify immediately
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
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="Uzivatel s timto e-mailem uz existuje",
        )
    db.refresh(user)

    email_sent = False
    if verification_token:
        try:
            email_sent = send_verification_email(
                to_email=user.email,
                to_name=user.name,
                token=verification_token,
            )
        except Exception as exc:
            logger.warning("Verification email failed: %s", exc)

    # Store rt_* fields best-effort
    try:
        sql = text(
            "UPDATE users SET rt_status=:st, rt_register_id=:rid, rt_scope=:scope, rt_valid_until=:vu, "
            "rt_source_snapshot=:snap, rt_last_checked_at=:ts WHERE id=:id"
        )
        now_iso = datetime.utcnow().isoformat()
        db.execute(
            sql,
            {
                "st": verify.get("status"),
                "rid": verify.get("register_id"),
                "scope": ",".join(verify.get("scope", []) or []),
                "vu": verify.get("valid_until"),
                "snap": str(verify.get("snapshot")) if isinstance(verify.get("snapshot"), dict) else str(verify.get("snapshot")),
                "ts": now_iso,
                "id": user.id,
            },
        )
        db.commit()
    except Exception:
        pass

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "is_verified": user.is_verified,
        "verification_token": user.verification_token,
        "rt_status": verify.get("status"),
        "email_sent": email_sent,
    }

class RtLookupIn(BaseModel):
    name: str
    certificate_number: str

@router.post("/rt/lookup")
def rt_lookup(payload: RtLookupIn):
    """Live verification against TIČR (no mock)."""
    try:
        return verify_against_ticr(payload.name, payload.certificate_number)
    except Exception:
        raise HTTPException(status_code=503, detail="TIČR verification failed")

@router.post("/login", response_model=TokenOut)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    # OAuth2PasswordRequestForm uses field "username" which is our email
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

