from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Project
from schemas import ProjectCreate

router = APIRouter()

@router.get("/projects")
def get_projects(db: Session = Depends(get_db)):
    return db.query(Project).options(joinedload(Project.revisions)).all()

@router.post("/projects")
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    new_proj = Project(address=project.address, client=project.client)
    db.add(new_proj)
    db.commit()
    db.refresh(new_proj)
    return new_proj

@router.delete("/projects/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        return {"error": "Projekt nenalezen"}
    db.delete(proj)
    db.commit()
    return {"message": "Projekt úspěšně smazán"}