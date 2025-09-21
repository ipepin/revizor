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

app = FastAPI() 

# ⭐ CORS – povol frontend na 5173
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://revizor-3.onrender.com"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allow_headers=["*"],
)

# veřejné endpointy (auth)
app.include_router(auth_router)

# chráněné endpointy
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
