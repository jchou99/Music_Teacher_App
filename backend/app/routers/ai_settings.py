# app/routers/ai_settings.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.model import AISettings
from app.schemas import AISettingsSchema, WorkingBlockSchema, BreakSchema

router = APIRouter(
    prefix="/api/ai-settings",
    tags=["ai_settings"]
)

@router.get("", response_model=AISettingsSchema)
def get_ai_settings(db: Session = Depends(get_db)):
    settings = db.query(AISettings).first()
    if not settings:
        return AISettingsSchema(
            workingBlocks=[], breaks=[], specialDates=[],
            customEventTags=[], customLevels=[], customWeekdays=[], customPaymentPeriods=[],
            theme={}, teacherContact={}
        )
    
    return AISettingsSchema(
        workingBlocks=settings.working_blocks if settings.working_blocks is not None else [],
        breaks=settings.breaks if settings.breaks is not None else [],
        specialDates=settings.special_dates if settings.special_dates is not None else [],
        
        # NEW: Return persistent fields
        customEventTags=settings.custom_event_tags if settings.custom_event_tags is not None else [],
        customLevels=settings.custom_levels if settings.custom_levels is not None else [],
        customWeekdays=settings.custom_weekdays if settings.custom_weekdays is not None else [],
        customPaymentPeriods=settings.custom_payment_periods if settings.custom_payment_periods is not None else [],
        theme=settings.theme if settings.theme is not None else {},
        teacherContact=settings.teacher_contact if settings.teacher_contact is not None else {}
    )


@router.post("", response_model=AISettingsSchema)
def save_ai_settings(payload: AISettingsSchema, db: Session = Depends(get_db)):
    settings = db.query(AISettings).first()
    if not settings:
        settings = AISettings()
        db.add(settings)

    settings.working_blocks = [b.model_dump() for b in payload.workingBlocks]
    settings.breaks = [b.model_dump() for b in payload.breaks]
    settings.special_dates = [d.model_dump() for d in payload.specialDates]

    # NEW: Write persistent configs to the database
    settings.custom_event_tags = payload.customEventTags
    settings.custom_levels = payload.customLevels
    settings.custom_weekdays = payload.customWeekdays
    settings.custom_payment_periods = payload.customPaymentPeriods
    settings.theme = payload.theme
    settings.teacher_contact = payload.teacherContact

    db.commit()
    db.refresh(settings)
    return AISettingsSchema(
        workingBlocks=settings.working_blocks,
        breaks=settings.breaks,
        specialDates=settings.special_dates,
        
        # Return updated values
        customEventTags=settings.custom_event_tags,
        customLevels=settings.custom_levels,
        customWeekdays=settings.custom_weekdays,
        customPaymentPeriods=settings.custom_payment_periods,
        theme=settings.theme,
        teacherContact=settings.teacher_contact
    )