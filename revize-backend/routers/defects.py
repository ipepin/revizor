from fastapi import APIRouter, Depends, HTTPException,status
from typing import List
from sqlalchemy.orm import Session
from database import get_db
from models import Defect
from schemas import DefectRead, DefectCreate

router = APIRouter(prefix="/defects", tags=["defects"])

@router.get("/", response_model=List[DefectRead])
def list_defects(db: Session = Depends(get_db)):
    return db.query(Defect).all()

@router.post("/", response_model=DefectRead)
def create_defect(defect: DefectCreate, db: Session = Depends(get_db)):
    db_def = Defect(**defect.model_dump())
    db.add(db_def)
    db.commit()
    db.refresh(db_def)
    return db_def

@router.delete("/{defect_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_defect(defect_id: int, db: Session = Depends(get_db)):
    db_def = db.get(Defect, defect_id)
    if not db_def:
        raise HTTPException(status_code=404, detail="Defect not found")
    db.delete(db_def)
    db.commit()
    return