# app/schemas.py
from pydantic import BaseModel, Field
from datetime import datetime, date, time
from typing import Optional, List

# Unified frontend schemas with database integration configurations
class StudentCreate(BaseModel):
    name: str
    level: str
    baseWeekday: str
    baseTime: str
    baseRawTime: str
    isActive: Optional[bool] = True

class StudentUpdate(BaseModel):
    name: str
    level: str
    baseWeekday: str
    baseTime: str
    baseRawTime: str
    isActive: Optional[bool] = True

class StudentResponseModel(BaseModel):
    student_id: str
    name: str
    level: str
    baseWeekday: str
    baseTime: str
    baseRawTime: str
    isActive: bool

    class Config:
        from_attributes = True

class LessonCreate(BaseModel):
    weekday: str
    time: str
    rawTime: str
    status: str = "scheduled"

class LessonResponseModel(BaseModel):
    id: str
    student_id: str
    weekday: str
    time: str
    rawTime: str
    status: str

    class Config:
        from_attributes = True

class NoteCreate(BaseModel):
    date: str
    text: str

class NoteResponseModel(BaseModel):
    id: str
    student_id: str
    date: str
    text: str

    class Config:
        from_attributes = True

class ReminderCreate(BaseModel):
    text: str
    date: str

class ReminderResponse(BaseModel):
    id: str
    student_id: str
    text: str
    date: str

    class Config:
        from_attributes = True

class EventCreate(BaseModel):
    title: str
    tag: str
    dateTime: str
    location: str

class EventResponse(BaseModel):
    id: str
    student_id: str
    title: str
    tag: str
    dateTime: str
    location: str

    class Config:
        from_attributes = True

class ContactCreateOrUpdate(BaseModel):
    studentName: Optional[str] = ""
    studentEmail: Optional[str] = ""
    studentPhone: Optional[str] = ""
    parentName: Optional[str] = ""
    parentEmail: Optional[str] = ""
    parentPhone: Optional[str] = ""
    preferredDays: Optional[str] = "" # Added field

class ContactResponse(BaseModel):
    id: str
    student_id: str
    studentName: Optional[str] = ""
    studentEmail: Optional[str] = ""
    studentPhone: Optional[str] = ""
    parentName: Optional[str] = ""
    parentEmail: Optional[str] = ""
    parentPhone: Optional[str] = ""
    preferredDays: Optional[str] = "" # Added field

    class Config:
        from_attributes = True

# Added schemas representing teacher availability configurations
class SpecialDateSchema(BaseModel):
    id: int
    date: str
    reason: str

# Advanced working blocks and custom breaks schemas
class WorkingBlockSchema(BaseModel):
    id: int
    day: str
    start: str
    end: str

class BreakSchema(BaseModel):
    id: int
    day: str
    start: str
    end: str
    title: str

class AISettingsSchema(BaseModel):
    workingBlocks: List[WorkingBlockSchema] = []
    breaks: List[BreakSchema] = []
    specialDates: List[SpecialDateSchema] = []
    customEventTags: Optional[List[dict]] = []
    customLevels: Optional[List[dict]] = []
    customWeekdays: Optional[List[str]] = []
    customPaymentPeriods: Optional[List[dict]] = []
    theme: Optional[dict] = {}
    teacherContact: Optional[dict] = {}
