import datetime
from typing import List, Optional, Tuple, Dict
from dateutil.rrule import rrulestr
from pydantic import BaseModel, Field

# -------------------------------------------------------------
# Core Domain Models for the Engine
# -------------------------------------------------------------

class LessonEvent(BaseModel):
    id: Optional[str] = None
    series_id: Optional[str] = None
    student_id: str
    teacher_id: str
    start_time: datetime.datetime
    end_time: datetime.datetime
    status: str = "scheduled"  # "scheduled", "cancelled", "completed"
    is_override: bool = False
    original_start_time: Optional[datetime.datetime] = None

class RecurringSeries(BaseModel):
    id: str
    student_id: str
    teacher_id: str
    start_time: datetime.datetime  # First occurrence start
    end_time: datetime.datetime    # First occurrence end
    rrule: str                     # iCalendar RRULE string (RFC 5545)

# -------------------------------------------------------------
# RRULE Expansion Helper
# -------------------------------------------------------------

def expand_recurring_series(
    series: RecurringSeries,
    window_start: datetime.datetime,
    window_end: datetime.datetime,
    overrides: List[LessonEvent]
) -> List[LessonEvent]:
    """
    Expands a RecurringSeries into individual LessonEvents within a specified time window.
    Applies overrides (rescheduling) and cancellations (filtering them out).
    """
    expanded_events: List[LessonEvent] = []
    
    # Ensure window boundaries are timezone-aware if series times are timezone-aware
    tz = series.start_time.tzinfo
    w_start = window_start.astimezone(tz) if tz else window_start
    w_end = window_end.astimezone(tz) if tz else window_end
    
    # Parse the RRULE
    try:
        # dateutil.rrule requires the DTSTART to be configured or inherited
        # rrulestr can parse the rule; we use update to set dtstart
        rule = rrulestr(series.rrule, dtstart=series.start_time)
    except Exception as e:
        # Fallback if the rrule string is invalid or incomplete
        return []

    # Get occurrence start times within the window
    # Add a buffer to catch instances starting slightly before the window but overlapping
    buffer_start = w_start - (series.end_time - series.start_time)
    occurrence_starts = list(rule.between(buffer_start, w_end, inc=True))

    # Index overrides by their original start time for quick lookup
    # We standardise keys by converting them to UTC timestamp for timezone-safe matching
    override_map: Dict[int, LessonEvent] = {}
    cancelled_starts: set[int] = set()

    for ov in overrides:
        if ov.series_id == series.id and ov.original_start_time:
            orig_ts = int(ov.original_start_time.timestamp())
            if ov.status == "cancelled":
                cancelled_starts.add(orig_ts)
            elif ov.is_override:
                override_map[orig_ts] = ov

    duration = series.end_time - series.start_time

    for start in occurrence_starts:
        ts = int(start.timestamp())
        
        # 1. Skip if it was cancelled
        if ts in cancelled_starts:
            continue
            
        # 2. If it was overridden/rescheduled, use the overridden record
        if ts in override_map:
            ov = override_map[ts]
            # Only include if the rescheduled time overlaps the requested window
            if ov.start_time < w_end and ov.end_time > w_start:
                expanded_events.append(ov)
        else:
            # 3. Standard occurrence
            occurrence_end = start + duration
            # Verify if this occurrence overlaps the window
            if start < w_end and occurrence_end > w_start:
                expanded_events.append(
                    LessonEvent(
                        series_id=series.id,
                        student_id=series.student_id,
                        teacher_id=series.teacher_id,
                        start_time=start,
                        end_time=occurrence_end,
                        status="scheduled",
                        is_override=False,
                        original_start_time=start
                    )
                )
                
    return expanded_events

# -------------------------------------------------------------
# Conflict Resolution Engine
# -------------------------------------------------------------

class ConflictEngine:
    @staticmethod
    def is_overlapping(start1: datetime.datetime, end1: datetime.datetime, 
                      start2: datetime.datetime, end2: datetime.datetime) -> bool:
        """Helper to determine if two datetime intervals overlap."""
        return start1 < end2 and start2 < end1

    @classmethod
    def find_conflicts(
        cls,
        proposed_start: datetime.datetime,
        proposed_end: datetime.datetime,
        existing_lessons: List[LessonEvent],
        recurring_series: List[RecurringSeries],
        overrides: List[LessonEvent],
        exclude_lesson_id: Optional[str] = None,
        exclude_series_id: Optional[str] = None
    ) -> List[LessonEvent]:
        """
        Scans all calendar events within the proposed time range (plus margin)
        to detect overlapping lessons.
        """
        conflicts: List[LessonEvent] = []
        
        # Define a window around the proposed lesson to expand recurring patterns
        # We search from proposed_start minus 2 days to proposed_end plus 2 days to cover edge cases
        window_start = proposed_start - datetime.timedelta(days=2)
        window_end = proposed_end + datetime.timedelta(days=2)

        # 1. Check one-off lessons (lessons with no series_id) and overridden instances
        for lesson in existing_lessons:
            # Skip excluded event or cancelled events
            if lesson.id and lesson.id == exclude_lesson_id:
                continue
            if lesson.series_id and lesson.series_id == exclude_series_id:
                continue
            if lesson.status == "cancelled":
                continue

            if cls.is_overlapping(proposed_start, proposed_end, lesson.start_time, lesson.end_time):
                conflicts.append(lesson)

        # 2. Expand recurring series and check for conflicts
        for series in recurring_series:
            if series.id == exclude_series_id:
                continue
                
            expanded = expand_recurring_series(series, window_start, window_end, overrides)
            for event in expanded:
                # Avoid double counting if the overridden event was already in existing_lessons
                if event.id and any(ex.id == event.id for ex in existing_lessons):
                    continue
                if event.id and event.id == exclude_lesson_id:
                    continue
                
                if cls.is_overlapping(proposed_start, proposed_end, event.start_time, event.end_time):
                    conflicts.append(event)
                    
        return conflicts

    @classmethod
    def recommend_slots(
        cls,
        target_date: datetime.date,
        duration_minutes: int,
        work_start_time: datetime.time,
        work_end_time: datetime.time,
        existing_lessons: List[LessonEvent],
        recurring_series: List[RecurringSeries],
        overrides: List[LessonEvent],
        interval_minutes: int = 15
    ) -> List[Tuple[datetime.datetime, datetime.datetime, float]]:
        """
        Generates available slots on a given target_date of duration_minutes size,
        scores them based on scheduling density, and returns them sorted descending by score.
        
        A higher density score means:
        - 100: Slot is perfectly adjacent to an existing lesson (0 minute gap).
        - 50 - (gap / 60): Slot has a large gap that can fit another lesson.
        - 10: Slot creates a 'dead zone' (e.g. 15 mins gap) where no lesson can be booked.
        """
        recommendations = []
        
        # Establish operating hours datetimes for the target date
        # We assume local timezone or offset matched to inputs
        tz = existing_lessons[0].start_time.tzinfo if existing_lessons else datetime.timezone.utc
        
        day_start = datetime.datetime.combine(target_date, work_start_time).replace(tzinfo=tz)
        day_end = datetime.datetime.combine(target_date, work_end_time).replace(tzinfo=tz)
        
        # Expand all events for the target day
        window_start = day_start - datetime.timedelta(days=1)
        window_end = day_end + datetime.timedelta(days=1)
        
        all_day_events: List[LessonEvent] = []
        
        # Gather one-off/active overridden events
        for lesson in existing_lessons:
            if lesson.status != "cancelled" and lesson.start_time < day_end and lesson.end_time > day_start:
                all_day_events.append(lesson)
                
        # Gather expanded recurring events
        for series in recurring_series:
            expanded = expand_recurring_series(series, window_start, window_end, overrides)
            for event in expanded:
                # Deduplicate
                if event.id and any(ex.id == event.id for ex in all_day_events):
                    continue
                if event.start_time < day_end and event.end_time > day_start:
                    all_day_events.append(event)
                    
        # Sort events by start time
        all_day_events.sort(key=lambda x: x.start_time)
        
        # Iterate through candidate start times
        current_time = day_start
        duration = datetime.timedelta(minutes=duration_minutes)
        step = datetime.timedelta(minutes=interval_minutes)
        
        while current_time + duration <= day_end:
            slot_start = current_time
            slot_end = current_time + duration
            
            # Check for conflict
            has_conflict = False
            for event in all_day_events:
                if cls.is_overlapping(slot_start, slot_end, event.start_time, event.end_time):
                    has_conflict = True
                    break
                    
            if not has_conflict:
                score = cls.calculate_density_score(slot_start, slot_end, all_day_events, duration_minutes)
                recommendations.append((slot_start, slot_end, score))
                
            current_time += step
            
        # Sort recommendations: highest density score first
        recommendations.sort(key=lambda x: x[2], reverse=True)
        return recommendations

    @staticmethod
    def calculate_density_score(
        start: datetime.datetime,
        end: datetime.datetime,
        existing_events: List[LessonEvent],
        duration_minutes: int
    ) -> float:
        """
        Calculates density score:
        - 100 for perfectly adjacent to another lesson (0 min gap).
        - 30 if calendar is empty.
        - 10 if it creates a small unusable gap (e.g. 15 mins).
        - 50 - (gap_in_hours) if gap is large enough to schedule another lesson.
        """
        if not existing_events:
            return 30.0  # Baseline for an empty calendar
            
        min_gap_before = None
        min_gap_after = None
        
        for event in existing_events:
            if event.end_time <= start:
                gap = (start - event.end_time).total_seconds() / 60.0
                if min_gap_before is None or gap < min_gap_before:
                    min_gap_before = gap
            elif event.start_time >= end:
                gap = (event.start_time - end).total_seconds() / 60.0
                if min_gap_after is None or gap < min_gap_after:
                    min_gap_after = gap
                    
        # If perfectly adjacent to a lesson
        if min_gap_before == 0.0 or min_gap_after == 0.0:
            return 100.0
            
        # Analyze closest gaps
        gaps = [g for g in [min_gap_before, min_gap_after] if g is not None]
        if not gaps:
            return 30.0
            
        min_gap = min(gaps)
        
        # If the gap is smaller than the duration, it's unusable dead time
        if 0.0 < min_gap < duration_minutes:
            return 10.0
            
        # If it's a large gap (can accommodate another lesson), we penalise slightly 
        # so that tighter bookings are preferred.
        return max(20.0, 50.0 - (min_gap / 60.0))
