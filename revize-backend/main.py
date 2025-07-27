from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from routers import projects
from routers import projects, revisions,catalog,defects

app = FastAPI()

# Povolení CORS pro vývoj
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Vytvoření databázových tabulek
Base.metadata.create_all(bind=engine)

# Připojení routerů
app.include_router(projects.router)
app.include_router(revisions.router)
app.include_router(catalog.router)
app.include_router(defects.router)
