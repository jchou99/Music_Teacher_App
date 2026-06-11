# app/routers/students.py
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.model import Student
from app.schemas import StudentCreate, StudentUpdate, StudentResponseModel

router = APIRouter(
    prefix="/api/students",
    tags=["students"]
)

@router.get("", response_model=List[StudentResponseModel])
def get_students(db: Session = Depends(get_db)):
    return db.query(Student).all()


@router.post("", response_model=StudentResponseModel)
def create_student(payload: StudentCreate, db: Session = Depends(get_db)):
    student = Student(
        student_id=f"student_{uuid.uuid4().hex[:8]}",
        **payload.model_dump()
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.put("/{student_id}", response_model=StudentResponseModel)
def update_student(student_id: str, payload: StudentUpdate, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    for key, value in payload.model_dump().items():
        setattr(student, key, value)

    db.commit()
    db.refresh(student)
    return student


@router.delete("/{student_id}")
def delete_student(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    db.delete(student)
    db.commit()
    return {"status": "deleted"}