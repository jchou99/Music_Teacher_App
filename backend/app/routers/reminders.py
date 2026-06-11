# app/routers/reminders.py
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.model import Reminder
from app.schemas import ReminderCreate, ReminderResponse

router = APIRouter(
    prefix="/api/reminders",
    tags=["reminders"]
)

@router.get("/{student_id}", response_model=List[ReminderResponse])
def get_reminders(student_id: str, db: Session = Depends(get_db)):
    return db.query(Reminder).filter(Reminder.student_id == student_id).all()


@router.post("/{student_id}", response_model=ReminderResponse)
def save_reminder(
    student_id: str,
    payload: ReminderCreate,
    db: Session = Depends(get_db)
):
    reminder = Reminder(
        id=f"reminder_{uuid.uuid4().hex[:8]}",
        student_id=student_id,
        **payload.model_dump()
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


@router.put("/{reminder_id}", response_model=ReminderResponse)
def update_reminder(reminder_id: str, payload: ReminderCreate, db: Session = Depends(get_db)):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    reminder.text = payload.text
    reminder.date = payload.date
    db.commit()
    db.refresh(reminder)
    return reminder


@router.delete("/{reminder_id}")
def delete_reminder(reminder_id: str, db: Session = Depends(get_db)):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    db.delete(reminder)
    db.commit()
    return {"status": "deleted"}