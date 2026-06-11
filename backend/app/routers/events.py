# app/routers/events.py
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.model import Event
from app.schemas import EventCreate, EventResponse

router = APIRouter(
    prefix="/api/events",
    tags=["events"]
)

@router.get("/{student_id}", response_model=List[EventResponse])
def get_events(student_id: str, db: Session = Depends(get_db)):
    return db.query(Event).filter(Event.student_id == student_id).all()


@router.post("/{student_id}", response_model=EventResponse)
def save_event(
    student_id: str,
    payload: EventCreate,
    db: Session = Depends(get_db)
):
    event = Event(
        id=f"event_{uuid.uuid4().hex[:8]}",
        student_id=student_id,
        **payload.model_dump()
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.put("/{event_id}", response_model=EventResponse)
def update_event(event_id: str, payload: EventCreate, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event.title = payload.title
    event.tag = payload.tag
    event.dateTime = payload.dateTime
    event.location = payload.location
    
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}")
def delete_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    db.delete(event)
    db.commit()
    return {"status": "deleted"}