# app/model.py
from sqlalchemy import Column, String, Integer, JSON, Boolean
from app.database import Base

class Student(Base):
    """
    SQLAlchemy model representing the 'students' table in the SQLite database.
    """
    __tablename__ = "students"

    student_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    level = Column(String, nullable=False)
    baseWeekday = Column(String, nullable=False)
    baseTime = Column(String, nullable=False)
    baseRawTime = Column(String, nullable=False)
    isActive = Column(Boolean, default=True, nullable=False) # Persistent column
    
    parent_id = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    birth_date = Column(String, nullable=True)
    emergency_contact_name = Column(String, nullable=True)
    emergency_contact_phone = Column(String, nullable=True)

class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(String, primary_key=True, index=True)
    student_id = Column(String, nullable=False)
    weekday = Column(String, nullable=False)
    time = Column(String, nullable=False)
    rawTime = Column(String, nullable=False)
    status = Column(String, nullable=False, default="scheduled")

class Note(Base):
    __tablename__ = "notes"

    id = Column(String, primary_key=True, index=True)
    student_id = Column(String, nullable=False)
    date = Column(String, nullable=False)
    text = Column(String, nullable=False)

class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(String, primary_key=True, index=True)
    student_id = Column(String, nullable=False)
    text = Column(String, nullable=False)
    date = Column(String, nullable=False)

class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, index=True)
    student_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    tag = Column(String, nullable=False)
    dateTime = Column(String, nullable=False)
    location = Column(String, nullable=False)

class Contact(Base):
    __tablename__ = "contacts"

    id = Column(String, primary_key=True, index=True)
    student_id = Column(String, unique=True, nullable=False)
    studentName = Column(String, nullable=True)
    studentEmail = Column(String, nullable=True)
    studentPhone = Column(String, nullable=True)
    parentName = Column(String, nullable=True)
    parentEmail = Column(String, nullable=True)
    parentPhone = Column(String, nullable=True)
    preferred_days = Column(String, default="", nullable=True) # Added persistent column

class AISettings(Base):
    """
    SQLAlchemy model representing all teacher and studio configuration tables.
    """
    __tablename__ = "ai_settings"

    id = Column(Integer, primary_key=True, index=True)
    start_hour = Column(String, default="09:00", nullable=True)
    end_hour = Column(String, default="17:00", nullable=True)
    lunch_start = Column(String, default="12:00", nullable=True)
    lunch_end = Column(String, default="13:00", nullable=True)
    special_dates = Column(JSON, default=list)
    
    # Advanced day-by-day and custom breaks JSON columns
    working_blocks = Column(JSON, default=list)
    breaks = Column(JSON, default=list)

    custom_event_tags = Column(JSON, default=list, nullable=True)
    custom_levels = Column(JSON, default=list, nullable=True)
    custom_weekdays = Column(JSON, default=list, nullable=True)
    custom_payment_periods = Column(JSON, default=list, nullable=True)
    theme = Column(JSON, default=dict, nullable=True)
    teacher_contact = Column(JSON, default=dict, nullable=True)