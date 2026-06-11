# app/routers/notes.py
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.model import Note
from app.schemas import NoteCreate, NoteResponseModel

router = APIRouter(
    prefix="/api/notes",
    tags=["notes"]
)

@router.get("/{student_id}", response_model=List[NoteResponseModel])
def get_notes(student_id: str, db: Session = Depends(get_db)):
    return db.query(Note).filter(Note.student_id == student_id).all()


@router.post("/{student_id}", response_model=NoteResponseModel)
def save_note(
    student_id: str,
    payload: NoteCreate,
    db: Session = Depends(get_db)
):
    note = Note(
        id=f"note_{uuid.uuid4().hex[:8]}",
        student_id=student_id,
        **payload.model_dump()
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.put("/{note_id}", response_model=NoteResponseModel)
def update_note(note_id: str, payload: NoteCreate, db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    note.text = payload.text
    note.date = payload.date
    db.commit()
    db.refresh(note)
    return note