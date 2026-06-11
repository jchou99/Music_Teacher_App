# app/routers/lessons.py
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.model import Lesson
from app.schemas import LessonCreate, LessonResponseModel

router = APIRouter(
    prefix="/api/lessons",
    tags=["lessons"]
)

@router.get("", response_model=List[LessonResponseModel])
def get_lessons(db: Session = Depends(get_db)):
    return db.query(Lesson).all()


@router.post("/{student_id}", response_model=LessonResponseModel)
def reschedule_lesson(
    student_id: str,
    payload: LessonCreate,
    db: Session = Depends(get_db)
):
    lesson = db.query(Lesson).filter(Lesson.student_id == student_id).first()

    if lesson:
        for key, value in payload.model_dump().items():
            setattr(lesson, key, value)
    else:
        lesson = Lesson(
            id=f"lesson_{uuid.uuid4().hex[:8]}",
            student_id=student_id,
            **payload.model_dump()
        )
        db.add(lesson)

    db.commit()
    db.refresh(lesson)
    return lesson