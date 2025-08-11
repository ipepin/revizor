from fastapi import APIRouter, Depends
from models import Project        # ← bere jediný zdroj pravdy
from routers.auth import get_current_user

router = APIRouter(prefix="/models", tags=["models"], dependencies=[Depends(get_current_user)])

@router.get("/")
async def list_models():
    return Project.query.all()     # příklad