# app/routers/contacts.py
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.model import Student, Contact
from app.schemas import ContactCreateOrUpdate, ContactResponse

router = APIRouter(
    prefix="/api/contact",
    tags=["contacts"]
)

@router.get("/{student_id}", response_model=ContactResponse)
def get_contact(student_id: str, db: Session = Depends(get_db)):
    contact = db.query(Contact).filter(Contact.student_id == student_id).first()
    if not contact:
        student = db.query(Student).filter(Student.student_id == student_id).first()
        student_name = student.name if student else ""
        return ContactResponse(
            id=f"contact_{uuid.uuid4().hex[:8]}",
            student_id=student_id,
            studentName=student_name,
            studentEmail="",
            studentPhone="",
            parentName="",
            parentEmail="",
            parentPhone="",
            preferredDays=""
        )
    return ContactResponse(
        id=contact.id,
        student_id=contact.student_id,
        studentName=contact.studentName,
        studentEmail=contact.studentEmail,
        studentPhone=contact.studentPhone,
        parentName=contact.parentName,
        parentEmail=contact.parentEmail,
        parentPhone=contact.parentPhone,
        preferredDays=contact.preferred_days if contact.preferred_days else ""
    )


@router.post("/{student_id}", response_model=ContactResponse)
def save_contact(
    student_id: str,
    payload: ContactCreateOrUpdate,
    db: Session = Depends(get_db)
):
    contact = db.query(Contact).filter(Contact.student_id == student_id).first()
    
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if student and payload.studentName:
        student.name = payload.studentName

    if contact:
        contact.studentName = payload.studentName
        contact.studentEmail = payload.studentEmail
        contact.studentPhone = payload.studentPhone
        contact.parentName = payload.parentName
        contact.parentEmail = payload.parentEmail
        contact.parentPhone = payload.parentPhone
        contact.preferred_days = payload.preferredDays
    else:
        contact = Contact(
            id=f"contact_{uuid.uuid4().hex[:8]}",
            student_id=student_id,
            studentName=payload.studentName,
            studentEmail=payload.studentEmail,
            studentPhone=payload.studentPhone,
            parentName=payload.parentName,
            parentEmail=payload.parentEmail,
            parentPhone=payload.parentPhone,
            preferred_days=payload.preferredDays
        )
        db.add(contact)

    db.commit()
    db.refresh(contact)
    return ContactResponse(
        id=contact.id,
        student_id=contact.student_id,
        studentName=contact.studentName,
        studentEmail=contact.studentEmail,
        studentPhone=contact.studentPhone,
        parentName=contact.parentName,
        parentEmail=contact.parentEmail,
        parentPhone=contact.parentPhone,
        preferredDays=contact.preferred_days if contact.preferred_days else ""
    )