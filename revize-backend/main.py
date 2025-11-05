from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from routers.auth import router as auth_router, get_current_user
from routers.catalog   import router as catalog_router
from routers.defects   import router as defects_router
from routers.models_router    import router as models_router
from routers.projects  import router as projects_router
from routers.revisions import router as revisions_router
from routers.deps import get_current_user   
from routers.cables import router as cables_router
from routers.devices import router as devices_router
from routers.users import router as users_router
from routers.companies import router as companies_router
from routers.export_pdf import router as export_router
from routers.vv import router as vv_router
from routers.admin import router as admin_router

app = FastAPI() 

# â­ CORS â€“ povol frontend na 5173
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://revizor-3.onrender.com",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "Origin",
        "X-Requested-With",
        "Accept-Language",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
    ],
)

# veĹ™ejnĂ© endpointy (auth)
app.include_router(auth_router)

# chrĂˇnÄ›nĂ© endpointy
app.include_router(catalog_router,   dependencies=[Depends(get_current_user)])
app.include_router(defects_router,   dependencies=[Depends(get_current_user)])
app.include_router(models_router,    dependencies=[Depends(get_current_user)])
app.include_router(projects_router,  dependencies=[Depends(get_current_user)])
app.include_router(revisions_router, dependencies=[Depends(get_current_user)])
app.include_router(cables_router, dependencies=[Depends(get_current_user)])
app.include_router(users_router, dependencies=[Depends(get_current_user)]) 
app.include_router(companies_router, dependencies=[Depends(get_current_user)]) 
app.include_router(devices_router,  dependencies=[Depends(get_current_user)])
app.include_router(export_router,  dependencies=[Depends(get_current_user)])
app.include_router(vv_router, dependencies=[Depends(get_current_user)])
# Admin router Ĺ™eĹˇĂ­ autorizaci uvnitĹ™ handlerĹŻ; neblokuj CORS preflight pĹ™es globĂˇlnĂ­ dependency
app.include_router(admin_router)

from fastapi import HTTPException, status
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import User as UserModel

class _DeleteUserPayload(BaseModel):
    id: int

def _ensure_admin(user: UserModel) -> None:
    if not bool(getattr(user, "is_admin", False)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Admin only")

@app.delete("/admin/users/{uid}")
def _delete_user_fallback(uid: int, db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    _ensure_admin(user)
    target = db.query(UserModel).get(uid)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    db.delete(target)
    db.commit()
    return {"ok": True, "id": uid}

@app.post("/admin/users/delete")
def _delete_user_post_fallback(payload: _DeleteUserPayload, db: Session = Depends(get_db), user: UserModel = Depends(get_current_user)):
    _ensure_admin(user)
    target = db.query(UserModel).get(payload.id)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    db.delete(target)
    db.commit()
    return {"ok": True, "id": payload.id}
