# app/services.py
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.model import Student, Lesson, Event, AISettings

def time_to_minutes(time_str: str) -> int:
    """
    Converts 12-hour or 24-hour time strings into minutes from midnight.
    Heuristically converts values like 1:00 or 2:00 to PM if unspecified.
    """
    if not time_str:
        return 0
    
    clean_str = time_str.strip().lower()
    is_pm = "pm" in clean_str
    is_am = "am" in clean_str
    
    # Strip meridians
    clean_str = clean_str.replace("am", "").replace("pm", "").strip()
    parts = clean_str.split(":")
    
    try:
        h = int(parts[0])
    except ValueError:
        h = 0
    try:
        m = int(parts[1]) if len(parts) > 1 else 0
    except ValueError:
        m = 0
        
    # Heuristic: If no AM/PM is provided and the hour value is between 1 and 5, assume PM
    if not is_pm and not is_am and 1 <= h <= 5:
        h += 12
    elif is_pm and h < 12:
        h += 12
    elif is_am and h == 12:
        h = 0
        
    return h * 60 + m

def minutes_to_time_12h(mins: int) -> str:
    """Converts minutes from midnight back into a 12-hour AM/PM string format."""
    h = (mins // 60) % 24
    m = mins % 60
    ampm = "PM" if h >= 12 else "AM"
    h12 = h % 12
    if h12 == 0:
        h12 = 12
    return f"{h12}:{m:02d} {ampm}"

def get_duration_by_level(level: str) -> int:
    """Returns the lesson duration in minutes based on student level."""
    if level == "Beginner":
        return 30
    elif level == "Intermediate":
        return 45
    elif level == "Advanced":
        return 60
    return 30

def find_lesson_event_conflict(db: Session, student_id: str, weekday: str) -> Optional[str]:
    """
    Returns the event title if the student has any event scheduled on the 
    same day of the week as the proposed lesson.
    """
    events = db.query(Event).filter(Event.student_id == student_id).all()
    for event in events:
        try:
            event_dt = datetime.fromisoformat(event.dateTime)
            event_weekday = event_dt.strftime("%A")
            if event_weekday == weekday:
                return event.title
        except Exception:
            continue
    return None

def get_teacher_config(db: Session) -> Dict[str, Any]:
    """Retrieves teacher's working blocks, breaks, and special dates configurations."""
    settings = db.query(AISettings).first()
    if not settings:
        # Defaults if not initialized
        default_weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        default_working_blocks = [
            {"id": idx, "day": day, "start": "09:00", "end": "17:00"}
            for idx, day in enumerate(default_weekdays)
        ]
        default_breaks = [
            {"id": 1, "day": "All Days", "start": "12:00", "end": "13:00", "title": "Lunch Break"}
        ]
        return {
            "workingBlocks": default_working_blocks,
            "breaks": default_breaks,
            "specialDates": []
        }
    
    return {
        "workingBlocks": settings.working_blocks if settings.working_blocks else [],
        "breaks": settings.breaks if settings.breaks else [],
        "specialDates": settings.special_dates if settings.special_dates else []
    }

def find_available_slots(
    db: Session,
    student_id: str,
    preferred_days: List[str],
    time_range: str,
    expand_mins: int = 0,
    step_mins: int = 15,
    allow_event_days: bool = False,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """
    Calculates the top conflict-free lesson slots using day-by-day 
    working blocks, break allocations, back-to-back lesson score weighting, 
    and weekly consistency parameters.
    """
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        return []

    duration = get_duration_by_level(student.level)
    config = get_teacher_config(db)
    working_blocks = config.get("workingBlocks", [])
    breaks = config.get("breaks", [])
    
    candidates = []
    lessons_list = db.query(Lesson).all()
    # Filter out inactive students from conflict evaluations
    students_list = db.query(Student).filter(Student.isActive == True).all()
    
    # SANITIZER: Automatically capitalize weekday parameters to match database records (e.g. "monday" -> "Monday")
    preferred_days = [d.strip().capitalize() for d in preferred_days if d]
    
    for day in preferred_days:
        day_blocks = [b for b in working_blocks if b.get("day") == day]
        if not day_blocks:
            continue
            
        day_breaks = [b for b in breaks if b.get("day") == "All Days" or b.get("day") == day]
        
        # Apply progressive boundary expansion to each operational block
        processed_blocks = []
        for b in day_blocks:
            start = max(0, time_to_minutes(b.get("start")) - expand_mins)
            end = min(1440, time_to_minutes(b.get("end")) + expand_mins)
            processed_blocks.append({"start": start, "end": end})
            
        if not processed_blocks:
            continue
            
        min_start = min(b["start"] for b in processed_blocks)
        max_end = max(b["end"] for b in processed_blocks)
        
        # Calculate time windows
        range_start = min_start
        range_end = max_end
        if time_range == "morning":
            range_start = max(min_start, time_to_minutes("09:00"))
            range_end = min(max_end, time_to_minutes("12:00"))
        elif time_range == "afternoon":
            range_start = max(min_start, time_to_minutes("12:00"))
            range_end = min(max_end, time_to_minutes("17:00"))
        elif time_range == "evening":
            range_start = max(min_start, time_to_minutes("17:00"))
            range_end = min(max_end, time_to_minutes("21:00"))

        current_mins = range_start
        while current_mins + duration <= range_end:
            proposed_end = current_mins + duration
            
            # Rule 1: Must fit entirely within at least one working block
            fits_in_block = any(current_mins >= b["start"] and proposed_end <= b["end"] for b in processed_blocks)
            if not fits_in_block:
                current_mins += step_mins
                continue
                
            # Rule 2: Exclude overlaps with configured breaks
            overlaps_break = False
            for b in day_breaks:
                b_start = time_to_minutes(b.get("start"))
                b_end = time_to_minutes(b.get("end"))
                if current_mins < b_end and proposed_end > b_start:
                    overlaps_break = True
                    break
                    
            if overlaps_break:
                current_mins += step_mins
                continue
                
            raw_time_str = f"{current_mins // 60:02d}:{current_mins % 60:02d}"
            
            # Conflict Check 1: Lesson block overlaps (Optimized with standard schedules evaluations)
            has_lesson_conflict = False
            for other_student in students_list:
                if other_student.student_id == student_id:
                    continue
                
                # Check reschedule properties specifically on target day
                override_on_day = next((l for l in lessons_list if l.student_id == other_student.student_id and l.weekday == day), None)
                override_elsewhere = next((l for l in lessons_list if l.student_id == other_student.student_id and l.weekday != day), None)
                
                active_raw_time = None
                active_level = other_student.level
                
                if override_on_day:
                    active_raw_time = override_on_day.rawTime
                elif not override_elsewhere:
                    if other_student.baseWeekday == day:
                        active_raw_time = other_student.baseRawTime
                        
                if active_raw_time:
                    active_start = time_to_minutes(active_raw_time)
                    active_duration = get_duration_by_level(active_level)
                    active_end = active_start + active_duration
                    
                    if current_mins < active_end and active_start < proposed_end:
                        has_lesson_conflict = True
                        break
                        
            if has_lesson_conflict:
                current_mins += step_mins
                continue
                
            # Conflict Check 2: Event overlaps
            has_event_conflict_title = find_lesson_event_conflict(db, student_id, day)
            if has_event_conflict_title and not allow_event_days:
                current_mins += step_mins
                continue
                
            # Scoring heuristics
            score = 0
            reasons = []
            
            # Heuristic 1: Back-to-back lessons (gaps reduction)
            is_back_to_back = False
            for other_student in students_list:
                if other_student.student_id == student_id:
                    continue
                
                override_on_day = next((l for l in lessons_list if l.student_id == other_student.student_id and l.weekday == day), None)
                override_elsewhere = next((l for l in lessons_list if l.student_id == other_student.student_id and l.weekday != day), None)
                
                other_raw_time = None
                other_level = other_student.level
                
                if override_on_day:
                    other_raw_time = override_on_day.rawTime
                elif not override_elsewhere:
                    if other_student.baseWeekday == day:
                        other_raw_time = other_student.baseRawTime
                    
                if other_raw_time:
                    other_start = time_to_minutes(other_raw_time)
                    other_duration = get_duration_by_level(other_level)
                    other_end = other_start + other_duration
                    if current_mins == other_end or proposed_end == other_start:
                        is_back_to_back = True
                        break
                        
            if is_back_to_back:
                score += 100
                reasons.append("Minimizes scheduling gaps with back-to-back lessons")
                
            # Heuristic 2: Consistency of weekly lesson times
            if student.baseRawTime and student.baseRawTime == raw_time_str:
                score += 50
                reasons.append("Maintains consistency with current scheduled time")
                
            if day != "Saturday" and day != "Sunday":
                score += 10
                
            if has_event_conflict_title and allow_event_days:
                score -= 30
                reasons.append(f"Overlaps with registered event '{has_event_conflict_title}'")
                
            if not reasons:
                reasons.append("Open, conflict-free slot matching your criteria")
                
            candidates.append({
                "day": day,
                "rawTime": raw_time_str,
                "time": minutes_to_time_12h(current_mins),
                "score": score,
                "reason": ". ".join(reasons) + "."
            })
            
            current_mins += step_mins
            
    candidates.sort(key=lambda x: x["score"], reverse=True)
    return candidates[:limit]