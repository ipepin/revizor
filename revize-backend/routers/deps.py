# routers/deps.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import jwt  # PyJWT
from database import get_db
from models import User
from utils.security import decode_access_token  # tvoje funkce z security.py

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)  # zvedne výjimky, když je token špatný/expir.
        sub = payload.get("sub")
        if not sub:
            raise credentials_exc

        # sub = email (tak to děláme při loginu)
        user = db.query(User).filter(User.email == sub).first()
        if not user:
            raise credentials_exc

        return user

    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        raise credentials_exc
