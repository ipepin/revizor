# src/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from routers import projects, revisions, catalog, defects

app = FastAPI()

# Povolit CORS pro všechna volání z Vašeho frontendu (nebo specifické originy)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","https://revizor-3.onrender.com"],  # nebo ["*"] pro vývoj
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Vytvoření DB tabulek
Base.metadata.create_all(bind=engine)

# Připojení routerů
app.include_router(projects.router)
app.include_router(revisions.router)
app.include_router(catalog.router)
app.include_router(defects.router)
