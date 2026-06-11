import datetime
import pytest
from app.core.conflict_resolution import ConflictEngine, LessonEvent, RecurringSeries

# Timezone context for tests
TZ = datetime.timezone.utc
BASE_DATE = datetime.date(2026, 5, 25) # Monday, May 25, 2026

# Helper to combine date and time with UTC timezone
def dt(day_offset: int, hour: int, minute: int = 0) -> datetime.datetime:
    target_date = BASE_DATE + datetime.timedelta(days=day_offset)
    return datetime.datetime.combine(target_date, datetime.time(hour, minute)).replace(tzinfo=TZ)

def test_is_overlapping():
    # Non-overlapping
    assert not ConflictEngine.is_overlapping(
        dt(0, 9), dt(0, 10),
        dt(0, 10), dt(0, 11)
    )
    # Overlapping (standard)
    assert ConflictEngine.is_overlapping(
        dt(0, 9, 30), dt(0, 10, 30),
        dt(0, 10), dt(0, 11)
    )
    # Enclosing
    assert ConflictEngine.is_overlapping(
        dt(0, 8), dt(0, 12),
        dt(0, 10), dt(0, 11)
    )

def test_find_conflicts_one_off():
    existing = [
        LessonEvent(
            id="lesson_a",
            student_id="student_1",
            teacher_id="teacher_1",
            start_time=dt(0, 10),
            end_time=dt(0, 11),
            status="scheduled"
        )
    ]
    
    # Test slot overlapping existing lesson
    conflicts = ConflictEngine.find_conflicts(
        proposed_start=dt(0, 10, 30),
        proposed_end=dt(0, 11, 30),
        existing_lessons=existing,
        recurring_series=[],
        overrides=[]
    )
    assert len(conflicts) == 1
    assert conflicts[0].id == "lesson_a"

    # Test excluded lesson ID
    conflicts_excluded = ConflictEngine.find_conflicts(
        proposed_start=dt(0, 10, 30),
        proposed_end=dt(0, 11, 30),
        existing_lessons=existing,
        recurring_series=[],
        overrides=[],
        exclude_lesson_id="lesson_a"
    )
    assert len(conflicts_excluded) == 0

def test_find_conflicts_recurring():
    # Recurring series: Every day at 14:00 (May 25, 2026 is DTSTART)
    series = [
        RecurringSeries(
            id="series_a",
            student_id="student_1",
            teacher_id="teacher_1",
            start_time=dt(0, 14),
            end_time=dt(0, 15),
            rrule="FREQ=DAILY"
        )
    ]

    # Tuesday afternoon proposed lesson (should overlap with occurrence of series_a)
    conflicts = ConflictEngine.find_conflicts(
        proposed_start=dt(1, 14, 15), # Tuesday 14:15
        proposed_end=dt(1, 15, 15),
        existing_lessons=[],
        recurring_series=series,
        overrides=[]
    )
    assert len(conflicts) == 1
    assert conflicts[0].series_id == "series_a"

def test_find_conflicts_recurring_override():
    series = [
        RecurringSeries(
            id="series_a",
            student_id="student_1",
            teacher_id="teacher_1",
            start_time=dt(0, 14),
            end_time=dt(0, 15),
            rrule="FREQ=DAILY"
        )
    ]

    # Case 1: Tuesday's occurrence was cancelled
    overrides = [
        LessonEvent(
            series_id="series_a",
            student_id="student_1",
            teacher_id="teacher_1",
            start_time=dt(1, 14),
            end_time=dt(1, 15),
            status="cancelled",
            is_override=True,
            original_start_time=dt(1, 14) # Tuesday instance
        )
    ]

    # Proposed slot at original time on Tuesday should NOT conflict
    conflicts_cancelled = ConflictEngine.find_conflicts(
        proposed_start=dt(1, 14, 0),
        proposed_end=dt(1, 15, 0),
        existing_lessons=[],
        recurring_series=series,
        overrides=overrides
    )
    assert len(conflicts_cancelled) == 0

    # Case 2: Tuesday's occurrence was rescheduled to Tuesday at 16:00
    rescheduled_event = LessonEvent(
        id="lesson_overridden",
        series_id="series_a",
        student_id="student_1",
        teacher_id="teacher_1",
        start_time=dt(1, 16),
        end_time=dt(1, 17),
        status="scheduled",
        is_override=True,
        original_start_time=dt(1, 14)
    )
    # The overrides list must contain the rescheduled event, AND it must be passed in existing_lessons
    # because in practice rescheduled instances are written back to the base lessons table.
    overrides_resched = [rescheduled_event]
    existing_lessons = [rescheduled_event]

    # Proposed slot at rescheduled time should conflict
    conflicts_new_time = ConflictEngine.find_conflicts(
        proposed_start=dt(1, 16, 30),
        proposed_end=dt(1, 17, 30),
        existing_lessons=existing_lessons,
        recurring_series=series,
        overrides=overrides_resched
    )
    assert len(conflicts_new_time) == 1
    assert conflicts_new_time[0].id == "lesson_overridden"

def test_recommend_slots():
    # Setup standard lesson on target date
    # Lesson at 10:00 - 11:00
    existing = [
        LessonEvent(
            id="lesson_x",
            student_id="student_1",
            teacher_id="teacher_1",
            start_time=dt(0, 10),
            end_time=dt(0, 11),
            status="scheduled"
        )
    ]
    
    # Get recommendations for a 60-minute lesson, working hours 09:00 - 13:00, 30 min intervals
    slots = ConflictEngine.recommend_slots(
        target_date=BASE_DATE,
        duration_minutes=60,
        work_start_time=datetime.time(9, 0),
        work_end_time=datetime.time(13, 0),
        existing_lessons=existing,
        recurring_series=[],
        overrides=[],
        interval_minutes=30
    )
    
    # Working window starts at 09:00, ends at 13:00.
    # Possible 60-min slots:
    # 1. 09:00 - 10:00 (adjacent to 10:00, gap is 0 min -> score should be 100)
    # 2. 09:30 - 10:30 (conflicts with 10:00-11:00)
    # 3. 10:00 - 11:00 (conflicts)
    # 4. 10:30 - 11:30 (conflicts)
    # 5. 11:00 - 12:00 (adjacent to 11:00, gap is 0 min -> score should be 100)
    # 6. 11:30 - 12:30 (gap is 30 mins -> since duration is 60, gap is < duration, unusable -> score 10.0)
    # 7. 12:00 - 13:00 (gap is 60 mins -> gap >= duration, can fit -> score is 50 - (60/60) = 49)
    
    valid_slots = [(s[0].time(), s[1].time(), s[2]) for s in slots]
    
    # Verify that conflict slots (like 10:00-11:00) are NOT suggested
    for start, end, score in valid_slots:
        assert not (start == datetime.time(10, 0) and end == datetime.time(11, 0))
        
    # Verify density scores
    # Top slots should be 09:00-10:00 and 11:00-12:00 with score 100
    top_slots = [s for s in valid_slots if s[2] == 100.0]
    assert len(top_slots) == 2
    assert any(s[0] == datetime.time(9, 0) for s in top_slots)
    assert any(s[0] == datetime.time(11, 0) for s in top_slots)
    
    # Check unusable gap scoring (11:30-12:30 should get 10.0 score)
    unusable_slots = [s for s in valid_slots if s[0] == datetime.time(11, 30)]
    assert len(unusable_slots) == 1
    assert unusable_slots[0][2] == 10.0
