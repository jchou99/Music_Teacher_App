#!/usr/bin/env python3
"""
Database Seeding Script for Music Teacher Scheduling Application.

Inserts initial mock records:
- 1 Teacher (Alice Smith)
- 3 Parent-Student pairs/relations:
  1. Charlie Miller (student, under 13) under parent Bob Miller
  2. Emma Miller (student, under 13) under parent David Miller
  3. Frank Sinatra (adult student, parent is NULL)
- 1 week's worth of simulated lessons (some recurring, some one-offs)
- Repertoire catalog items
- Practice logs for students
- Progress milestones
- Notification/Communication drafts

Supports PostgreSQL and SQLite environments. If running on a fresh SQLite database,
initializes the schema. If running on PostgreSQL, can initialize via schema.sql.
"""

import os
import sys
import uuid
import datetime
import argparse
import sqlite3

# Try importing psycopg2 for PostgreSQL support
try:
    import psycopg2
    import psycopg2.extras
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False

# Hardcoded Semantic UUIDs for consistent lookups and testing
TEACHER_ALICE_ID = "8afb9557-0130-4e3f-84db-6c584a22cb5a"
PARENT_BOB_ID = "b0b00000-1111-2222-3333-444444444444"
STUDENT_CHARLIE_ID = "c4a511e0-1111-2222-3333-444444444444"
PARENT_DAVID_ID = "da71d000-1111-2222-3333-444444444444"
STUDENT_EMMA_ID = "e7a00000-1111-2222-3333-444444444444"
STUDENT_FRANK_ID = "f1a7c000-1111-2222-3333-444444444444"

SERIES_CHARLIE_ID = "c4a511e0-aaaa-bbbb-cccc-dddddddddddd"
SERIES_EMMA_ID = "e7a00000-aaaa-bbbb-cccc-dddddddddddd"

# SQLite-specific DDL for schema initialization
SQLITE_DDL = [
    "PRAGMA foreign_keys = ON;",
    
    """
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL CHECK (role IN ('teacher', 'parent', 'student')),
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT email_required_for_adults CHECK (
            (role = 'student' AND email IS NULL) OR (email IS NOT NULL)
        )
    );
    """,
    
    """
    CREATE TABLE IF NOT EXISTS students (
        student_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        parent_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        birth_date TEXT NOT NULL,
        level TEXT NOT NULL DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced')),
        emergency_contact_name TEXT NOT NULL,
        emergency_contact_phone TEXT NOT NULL,
        CONSTRAINT coppa_parent_requirement CHECK (
            (birth_date > date('now', '-13 years') AND parent_id IS NOT NULL) OR 
            (birth_date <= date('now', '-13 years'))
        )
    );
    """,
    
    """
    CREATE TABLE IF NOT EXISTS recurring_series (
        id TEXT PRIMARY KEY,
        teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        rrule TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT time_sequence CHECK (end_time > start_time)
    );
    """,
    
    """
    CREATE TABLE IF NOT EXISTS lessons (
        id TEXT PRIMARY KEY,
        series_id TEXT REFERENCES recurring_series(id) ON DELETE CASCADE,
        teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
        notes TEXT,
        is_override INTEGER NOT NULL DEFAULT 0 CHECK (is_override IN (0, 1)),
        original_start_time TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT time_sequence CHECK (end_time > start_time)
    );
    """,
    
    """
    CREATE TABLE IF NOT EXISTS practice_logs (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        log_date TEXT NOT NULL DEFAULT (date('now')),
        duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
        notes TEXT,
        verified_by_parent INTEGER NOT NULL DEFAULT 0 CHECK (verified_by_parent IN (0, 1)),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    """,
    
    """
    CREATE TABLE IF NOT EXISTS progress_milestones (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_name TEXT NOT NULL,
        item_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'assigned',
        teacher_feedback TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    """,
    
    """
    CREATE TABLE IF NOT EXISTS communication_drafts (
        id TEXT PRIMARY KEY,
        teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message_type TEXT NOT NULL,
        channel TEXT NOT NULL,
        recipient_address TEXT NOT NULL,
        subject TEXT,
        body TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'sent', 'failed')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        approved_at TEXT
    );
    """,
    
    """
    CREATE TABLE IF NOT EXISTS repertoire_catalog (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        composer TEXT NOT NULL,
        difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
        instrument TEXT NOT NULL,
        drill_instructions TEXT NOT NULL
    );
    """
]


def serialize_for_db(db_type, data):
    """
    Helper function to serialize data values depending on the database target.
    SQLite requires strings for date, datetime, and UUID, whereas PostgreSQL/psycopg2
    natively handles these types.
    """
    if db_type == 'postgres':
        return data

    serialized = {}
    for k, v in data.items():
        if isinstance(v, (datetime.datetime, datetime.date)):
            serialized[k] = v.isoformat()
        elif isinstance(v, uuid.UUID):
            serialized[k] = str(v)
        elif isinstance(v, bool):
            serialized[k] = 1 if v else 0
        elif v is None:
            serialized[k] = None
        else:
            serialized[k] = v
    return serialized


def insert_row(cursor, db_type, table, data):
    """
    Executes a single row insertion using SQL parameters formatted for the target DB.
    """
    keys = data.keys()
    columns = ", ".join(keys)
    
    if db_type == 'postgres':
        placeholders = ", ".join([f"%({k})s" for k in keys])
    else:
        placeholders = ", ".join([f":{k}" for k in keys])
        
    query = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
    serialized_data = serialize_for_db(db_type, data)
    cursor.execute(query, serialized_data)


def check_and_create_tables(conn, db_type):
    """
    Detects if schema exists and initializes it if absent.
    """
    cursor = conn.cursor()
    if db_type == 'postgres':
        # Check if users table exists in public schema
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'users'
            );
        """)
        exists = cursor.fetchone()[0]
        if not exists:
            print("PostgreSQL tables not found. Attempting to initialize with schema.sql...")
            schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
            if os.path.exists(schema_path):
                with open(schema_path, 'r', encoding='utf-8') as f:
                    schema_sql = f.read()
                cursor.execute(schema_sql)
                conn.commit()
                print("PostgreSQL schema successfully initialized.")
            else:
                print(f"Error: schema.sql not found at {schema_path}. Cannot initialize database.", file=sys.stderr)
                sys.exit(1)
        else:
            print("PostgreSQL tables already exist. Skipping schema initialization.")
    else:
        # SQLite
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users';")
        exists = cursor.fetchone()
        if not exists:
            print("SQLite tables not found. Initializing SQLite-compatible schema...")
            for statement in SQLITE_DDL:
                cursor.execute(statement)
            conn.commit()
            print("SQLite schema successfully initialized.")
        else:
            print("SQLite tables already exist. Skipping schema initialization.")


def clear_existing_data(conn, db_type):
    """
    Deletes all records from database tables in dependency order.
    """
    cursor = conn.cursor()
    tables = [
        "communication_drafts",
        "progress_milestones",
        "practice_logs",
        "lessons",
        "recurring_series",
        "students",
        "users",
        "repertoire_catalog"
    ]
    
    print("Clearing existing data from tables...")
    for table in tables:
        try:
            cursor.execute(f"DELETE FROM {table};")
        except Exception as e:
            print(f"Warning clearing {table}: {e}")
    conn.commit()
    print("Existing records successfully cleared.")


def main():
    parser = argparse.ArgumentParser(
        description="Database seeder script for private music teacher booking and student progress application."
    )
    parser.add_argument(
        "--db-type",
        choices=["postgres", "sqlite"],
        help="Database type (postgres or sqlite). If omitted, parsed from DATABASE_URL, defaulting to sqlite."
    )
    parser.add_argument(
        "--db-url",
        help="PostgreSQL connection string. If db-type is postgres and not provided, parses DATABASE_URL env var."
    )
    parser.add_argument(
        "--sqlite-path",
        help="Custom filesystem path for SQLite database file."
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        default=True,
        help="Delete existing data in tables before seeding. (Default: True)"
    )
    parser.add_argument(
        "--no-clear",
        dest="clear",
        action="store_false",
        help="Do not clear database tables prior to seeding."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print records that would be seeded, without writing to the database."
    )
    
    args = parser.parse_args()
    
    # 1. Determine DB Type and connection credentials
    db_type = args.db_type
    db_url = args.db_url or os.environ.get("DATABASE_URL")
    
    # Auto-detect db_type from DATABASE_URL if not provided
    if not db_type:
        if db_url and (db_url.startswith("postgres://") or db_url.startswith("postgresql://")):
            db_type = "postgres"
        else:
            db_type = "sqlite"
            
    # Resolve SQLite path
    sqlite_path = args.sqlite_path
    if not sqlite_path:
        # Save to music_teacher.db inside the same folder as this script
        sqlite_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "music_teacher.db")
        
    print(f"--- Seeder running in {db_type.upper()} mode ---")
    
    # 2. Define timezone-aware base dates
    tz = datetime.timezone.utc
    today = datetime.date.today()
    
    # Monday of the current week
    monday = today - datetime.timedelta(days=today.weekday())
    
    def get_datetime_for_day(day_offset, hour, minute):
        d = monday + datetime.timedelta(days=day_offset)
        t = datetime.time(hour, minute)
        return datetime.datetime.combine(d, t).replace(tzinfo=tz)

    # 3. Assemble Seeding Data dictionaries
    repertoire_catalog = [
        {
            "id": "11111111-2222-3333-4444-555555555551",
            "title": "Für Elise",
            "composer": "Ludwig van Beethoven",
            "difficulty": "beginner",
            "instrument": "Piano",
            "drill_instructions": "Practice the A minor arpeggios slowly with a metronome at 60 BPM. Focus on wrist relaxation."
        },
        {
            "id": "11111111-2222-3333-4444-555555555552",
            "title": "Minuet in G major",
            "composer": "Johann Sebastian Bach",
            "difficulty": "beginner",
            "instrument": "Piano",
            "drill_instructions": "Focus on finger independence and crisp staccato articulation in the right hand."
        },
        {
            "id": "11111111-2222-3333-4444-555555555553",
            "title": "Canon in D",
            "composer": "Johann Pachelbel",
            "difficulty": "intermediate",
            "instrument": "Piano",
            "drill_instructions": "Count strictly on eighth notes. Balance the dynamics between the LH accompaniment and RH melody."
        },
        {
            "id": "11111111-2222-3333-4444-555555555554",
            "title": "Autumn Leaves",
            "composer": "Joseph Kosma",
            "difficulty": "intermediate",
            "instrument": "Piano",
            "drill_instructions": "Work on the ii-V-I jazz voicing transitions in the left hand while playing lead melody on the right."
        }
    ]
    
    users = [
        # 1. Teacher Alice Smith
        {
            "id": TEACHER_ALICE_ID,
            "role": "teacher",
            "name": "Alice Smith",
            "email": "alice@music.com",
            "phone": "555-0100",
            "created_at": datetime.datetime.now(tz)
        },
        # 2. Parent Bob Miller
        {
            "id": PARENT_BOB_ID,
            "role": "parent",
            "name": "Bob Miller",
            "email": "bob@miller.com",
            "phone": "555-0199",
            "created_at": datetime.datetime.now(tz)
        },
        # 3. Student Charlie Miller (Minor - under Bob)
        {
            "id": STUDENT_CHARLIE_ID,
            "role": "student",
            "name": "Charlie Miller",
            "email": None, # COPPA minor, no email required
            "phone": None,
            "created_at": datetime.datetime.now(tz)
        },
        # 4. Parent David Miller
        {
            "id": PARENT_DAVID_ID,
            "role": "parent",
            "name": "David Miller",
            "email": "david@miller.com",
            "phone": "555-0200",
            "created_at": datetime.datetime.now(tz)
        },
        # 5. Student Emma Miller (Minor - under David)
        {
            "id": STUDENT_EMMA_ID,
            "role": "student",
            "name": "Emma Miller",
            "email": None, # COPPA minor, no email required
            "phone": None,
            "created_at": datetime.datetime.now(tz)
        },
        # 6. Adult Student Frank Sinatra
        {
            "id": STUDENT_FRANK_ID,
            "role": "student",
            "name": "Frank Sinatra",
            "email": "frank@sinatra.com", # Adult student, email included
            "phone": "555-0300",
            "created_at": datetime.datetime.now(tz)
        }
    ]
    
    students = [
        # Charlie Miller (10 years old, under Bob)
        {
            "student_id": STUDENT_CHARLIE_ID,
            "parent_id": PARENT_BOB_ID,
            "birth_date": today - datetime.timedelta(days=10*365.25),
            "level": "beginner",
            "emergency_contact_name": "Bob Miller",
            "emergency_contact_phone": "555-0199"
        },
        # Emma Miller (8 years old, under David)
        {
            "student_id": STUDENT_EMMA_ID,
            "parent_id": PARENT_DAVID_ID,
            "birth_date": today - datetime.timedelta(days=8*365.25),
            "level": "beginner",
            "emergency_contact_name": "David Miller",
            "emergency_contact_phone": "555-0200"
        },
        # Frank Sinatra (30 years old, no parent)
        {
            "student_id": STUDENT_FRANK_ID,
            "parent_id": None,
            "birth_date": today - datetime.timedelta(days=30*365.25),
            "level": "intermediate",
            "emergency_contact_name": "Nancy Sinatra",
            "emergency_contact_phone": "555-0301"
        }
    ]
    
    recurring_series = [
        # Charlie's twice weekly Piano lessons on Mondays and Thursdays
        {
            "id": SERIES_CHARLIE_ID,
            "teacher_id": TEACHER_ALICE_ID,
            "student_id": STUDENT_CHARLIE_ID,
            "start_time": get_datetime_for_day(0, 15, 30), # Monday
            "end_time": get_datetime_for_day(0, 16, 30),
            "rrule": "FREQ=WEEKLY;BYDAY=MO,TH;INTERVAL=1",
            "created_at": datetime.datetime.now(tz)
        },
        # Emma's twice weekly Piano lessons on Tuesdays and Fridays
        {
            "id": SERIES_EMMA_ID,
            "teacher_id": TEACHER_ALICE_ID,
            "student_id": STUDENT_EMMA_ID,
            "start_time": get_datetime_for_day(1, 16, 0), # Tuesday
            "end_time": get_datetime_for_day(1, 17, 0),
            "rrule": "FREQ=WEEKLY;BYDAY=TU,FR;INTERVAL=1",
            "created_at": datetime.datetime.now(tz)
        }
    ]
    
    lessons = [
        # --- Charlie's Lessons ---
        {
            "id": "c4a511e0-e1e1-e1e1-e1e1-e1e1e1e1e1e1",
            "series_id": SERIES_CHARLIE_ID,
            "teacher_id": TEACHER_ALICE_ID,
            "student_id": STUDENT_CHARLIE_ID,
            "start_time": get_datetime_for_day(0, 15, 30), # Monday
            "end_time": get_datetime_for_day(0, 16, 30),
            "status": "completed" if today > (monday + datetime.timedelta(days=0)) else "scheduled",
            "notes": "Charlie practiced scales well today, but struggled with the transition in bar 12. Assigned pages 4-5.",
            "is_override": False,
            "original_start_time": get_datetime_for_day(0, 15, 30),
            "created_at": datetime.datetime.now(tz)
        },
        {
            "id": "c4a511e0-e2e2-e2e2-e2e2-e2e2e2e2e2e2",
            "series_id": SERIES_CHARLIE_ID,
            "teacher_id": TEACHER_ALICE_ID,
            "student_id": STUDENT_CHARLIE_ID,
            "start_time": get_datetime_for_day(3, 15, 30), # Thursday
            "end_time": get_datetime_for_day(3, 16, 30),
            "status": "completed" if today > (monday + datetime.timedelta(days=3)) else "scheduled",
            "notes": None,
            "is_override": False,
            "original_start_time": get_datetime_for_day(3, 15, 30),
            "created_at": datetime.datetime.now(tz)
        },
        # --- Emma's Lessons ---
        {
            "id": "e7a00000-e1e1-e1e1-e1e1-e1e1e1e1e1e1",
            "series_id": SERIES_EMMA_ID,
            "teacher_id": TEACHER_ALICE_ID,
            "student_id": STUDENT_EMMA_ID,
            "start_time": get_datetime_for_day(1, 16, 0), # Tuesday
            "end_time": get_datetime_for_day(1, 17, 0),
            "status": "completed" if today > (monday + datetime.timedelta(days=1)) else "scheduled",
            "notes": "Emma is doing great with the melody of Ode to Joy. Needs to work on hand posture.",
            "is_override": False,
            "original_start_time": get_datetime_for_day(1, 16, 0),
            "created_at": datetime.datetime.now(tz)
        },
        {
            "id": "e7a00000-e2e2-e2e2-e2e2-e2e2e2e2e2e2",
            "series_id": SERIES_EMMA_ID,
            "teacher_id": TEACHER_ALICE_ID,
            "student_id": STUDENT_EMMA_ID,
            "start_time": get_datetime_for_day(4, 16, 0), # Friday
            "end_time": get_datetime_for_day(4, 17, 0),
            "status": "completed" if today > (monday + datetime.timedelta(days=4)) else "scheduled",
            "notes": None,
            "is_override": False,
            "original_start_time": get_datetime_for_day(4, 16, 0),
            "created_at": datetime.datetime.now(tz)
        },
        # --- Frank's Lessons (One-off scheduled lessons) ---
        {
            "id": "f1a7c000-e1e1-e1e1-e1e1-e1e1e1e1e1e1",
            "series_id": None,
            "teacher_id": TEACHER_ALICE_ID,
            "student_id": STUDENT_FRANK_ID,
            "start_time": get_datetime_for_day(2, 18, 30), # Wednesday
            "end_time": get_datetime_for_day(2, 19, 30),
            "status": "completed" if today > (monday + datetime.timedelta(days=2)) else "scheduled",
            "notes": "Frank wants to learn jazz chords. We will start with a 12-bar blues.",
            "is_override": False,
            "original_start_time": None,
            "created_at": datetime.datetime.now(tz)
        },
        {
            "id": "f1a7c000-e2e2-e2e2-e2e2-e2e2e2e2e2e2",
            "series_id": None,
            "teacher_id": TEACHER_ALICE_ID,
            "student_id": STUDENT_FRANK_ID,
            "start_time": get_datetime_for_day(5, 11, 0), # Saturday
            "end_time": get_datetime_for_day(5, 12, 0),
            "status": "completed" if today > (monday + datetime.timedelta(days=5)) else "scheduled",
            "notes": None,
            "is_override": False,
            "original_start_time": None,
            "created_at": datetime.datetime.now(tz)
        }
    ]
    
    practice_logs = [
        {
            "id": "c4a511e0-p111-1111-1111-111111111111",
            "student_id": STUDENT_CHARLIE_ID,
            "log_date": monday - datetime.timedelta(days=3), # Friday of previous week
            "duration_minutes": 30,
            "notes": "Practiced C Major scale and the Fur Elise A section. Hands felt a bit stiff.",
            "verified_by_parent": True,
            "created_at": datetime.datetime.now(tz)
        },
        {
            "id": "c4a511e0-p222-2222-2222-222222222222",
            "student_id": STUDENT_CHARLIE_ID,
            "log_date": monday + datetime.timedelta(days=1), # Tuesday of this week
            "duration_minutes": 40,
            "notes": "Focused on the transition Alice pointed out. Felt much smoother today!",
            "verified_by_parent": True,
            "created_at": datetime.datetime.now(tz)
        },
        {
            "id": "e7a00000-p111-1111-1111-111111111111",
            "student_id": STUDENT_EMMA_ID,
            "log_date": monday - datetime.timedelta(days=2), # Saturday of previous week
            "duration_minutes": 20,
            "notes": "Played Ode to Joy three times. Mommy helped me count.",
            "verified_by_parent": True,
            "created_at": datetime.datetime.now(tz)
        },
        {
            "id": "e7a00000-p222-2222-2222-222222222222",
            "student_id": STUDENT_EMMA_ID,
            "log_date": monday + datetime.timedelta(days=2), # Wednesday of this week
            "duration_minutes": 25,
            "notes": "Working on keeping finger posture round as Alice showed.",
            "verified_by_parent": False,
            "created_at": datetime.datetime.now(tz)
        },
        {
            "id": "f1a7c000-p111-1111-1111-111111111111",
            "student_id": STUDENT_FRANK_ID,
            "log_date": monday - datetime.timedelta(days=4), # Thursday of previous week
            "duration_minutes": 60,
            "notes": "Ran through the basic ii-V-I progressions in major keys. Good progress.",
            "verified_by_parent": False, # Adult student
            "created_at": datetime.datetime.now(tz)
        },
        {
            "id": "f1a7c000-p222-2222-2222-222222222222",
            "student_id": STUDENT_FRANK_ID,
            "log_date": monday + datetime.timedelta(days=1), # Tuesday of this week
            "duration_minutes": 45,
            "notes": "Improvising over Autumn Leaves. Rhythm is solid, working on extensions.",
            "verified_by_parent": False,
            "created_at": datetime.datetime.now(tz)
        }
    ]
    
    progress_milestones = [
        {
            "id": "c4a511e0-m111-1111-1111-111111111111",
            "student_id": STUDENT_CHARLIE_ID,
            "teacher_id": TEACHER_ALICE_ID,
            "item_name": "C Major Scale (Two Octaves)",
            "item_type": "scale",
            "status": "completed",
            "teacher_feedback": "Excellent tempo consistency and clean finger crossings. Well done!",
            "completed_at": monday - datetime.timedelta(days=7),
            "created_at": datetime.datetime.now(tz)
        },
        {
            "id": "c4a511e0-m222-2222-2222-222222222222",
            "student_id": STUDENT_CHARLIE_ID,
            "teacher_id": TEACHER_ALICE_ID,
            "item_name": "Für Elise (Section A)",
            "item_type": "song",
            "status": "in_progress",
            "teacher_feedback": "Phrasing is lovely, focus on keeping the eighth note pulse even in the transition.",
            "completed_at": None,
            "created_at": datetime.datetime.now(tz)
        },
        {
            "id": "e7a00000-m111-1111-1111-111111111111",
            "student_id": STUDENT_EMMA_ID,
            "teacher_id": TEACHER_ALICE_ID,
            "item_name": "Ode to Joy (Melody)",
            "item_type": "song",
            "status": "completed",
            "teacher_feedback": "Emma played the melody all the way through with steady rhythm. Very proud!",
            "completed_at": monday - datetime.timedelta(days=6),
            "created_at": datetime.datetime.now(tz)
        },
        {
            "id": "f1a7c000-m111-1111-1111-111111111111",
            "student_id": STUDENT_FRANK_ID,
            "teacher_id": TEACHER_ALICE_ID,
            "item_name": "Autumn Leaves",
            "item_type": "song",
            "status": "in_progress",
            "teacher_feedback": "Harmonies are good, focus on connecting chords smoothly and introducing 7th voicings.",
            "completed_at": None,
            "created_at": datetime.datetime.now(tz)
        }
    ]
    
    communication_drafts = [
        {
            "id": "c4a511e0-d111-1111-1111-111111111111",
            "teacher_id": TEACHER_ALICE_ID,
            "student_id": STUDENT_CHARLIE_ID,
            "message_type": "reminder",
            "channel": "email",
            "recipient_address": "bob@miller.com",
            "subject": "Lesson Reminder: Thursday at 15:30",
            "body": "Hi Bob, just a reminder that Charlie has a piano lesson this Thursday at 15:30. Please remind him to review pages 4-5. See you then!",
            "status": "draft",
            "created_at": datetime.datetime.now(tz) - datetime.timedelta(hours=4),
            "approved_at": None
        },
        {
            "id": "e7a00000-d111-1111-1111-111111111111",
            "teacher_id": TEACHER_ALICE_ID,
            "student_id": STUDENT_EMMA_ID,
            "message_type": "progress_report",
            "channel": "email",
            "recipient_address": "david@miller.com",
            "subject": "Emma's Progress Report - Ode to Joy Completed!",
            "body": "Hi David, I am pleased to report that Emma has officially completed 'Ode to Joy'! She has a great ear for rhythm and is progressing very well. We will start 'Minuet in G major' next.",
            "status": "approved",
            "created_at": datetime.datetime.now(tz) - datetime.timedelta(days=1),
            "approved_at": datetime.datetime.now(tz)
        }
    ]
    
    # 4. Dry Run Mode Option
    if args.dry_run:
        print("\n=== DRY RUN DEMONSTRATION PRINTOMATIC ===")
        print(f"Base Monday of week: {monday.isoformat()}")
        print(f"Teacher: Alice Smith ({TEACHER_ALICE_ID})")
        print("Parents & Students:")
        for u in users:
            if u["role"] != "teacher":
                print(f" - [{u['role'].upper()}] {u['name']} (ID: {u['id']}, Email: {u['email']})")
        print("\nRepertoire Catalog:")
        for r in repertoire_catalog:
            print(f" - {r['title']} by {r['composer']} ({r['difficulty']})")
        print("\nRecurring Series:")
        for s in recurring_series:
            print(f" - Series {s['id']}: Student {s['student_id']}, RRule: {s['rrule']}")
        print("\nSimulated Lessons:")
        for l in lessons:
            series_info = f"Series: {l['series_id']}" if l['series_id'] else "One-off"
            print(f" - [{l['status'].upper()}] {l['start_time'].strftime('%A %H:%M')} to {l['end_time'].strftime('%H:%M')} - Student: {l['student_id']} ({series_info})")
        print("\nPractice Logs:")
        for p in practice_logs:
            print(f" - Student: {p['student_id']}, Date: {p['log_date']}, Duration: {p['duration_minutes']} mins, Verified: {p['verified_by_parent']}")
        print("\nProgress Milestones:")
        for m in progress_milestones:
            print(f" - Student: {m['student_id']}, Item: {m['item_name']}, Status: {m['status']}")
        print("\nCommunication Drafts:")
        for d in communication_drafts:
            print(f" - Recipient: {d['recipient_address']}, Type: {d['message_type']}, Status: {d['status']}")
        print("\n--- Dry run finished. No writes made. ---")
        return

    # 5. Establish Connection
    conn = None
    try:
        if db_type == 'postgres':
            if not HAS_PSYCOPG2:
                print("Error: PostgreSQL client library 'psycopg2' is not installed.", file=sys.stderr)
                print("Please run: pip install psycopg2-binary", file=sys.stderr)
                sys.exit(1)
            
            if not db_url:
                print("Error: PostgreSQL connection string not specified.", file=sys.stderr)
                print("Please set DATABASE_URL env var or pass --db-url.", file=sys.stderr)
                sys.exit(1)
                
            print(f"Connecting to PostgreSQL database: {db_url.split('@')[-1] if '@' in db_url else db_url}")
            conn = psycopg2.connect(db_url)
        else:
            print(f"Connecting to SQLite database at: {sqlite_path}")
            conn = sqlite3.connect(sqlite_path)
            
        # Ensure we have a transaction context
        cursor = conn.cursor()
        
        # 6. Schema setup check
        check_and_create_tables(conn, db_type)
        
        # 7. Clear tables if required
        if args.clear:
            clear_existing_data(conn, db_type)
            
        # 8. Seed Tables
        print("Inserting records...")
        
        # Repertoire Catalog
        for row in repertoire_catalog:
            insert_row(cursor, db_type, "repertoire_catalog", row)
        print(f" - Seeded {len(repertoire_catalog)} repertoire catalog items.")
            
        # Users
        for row in users:
            insert_row(cursor, db_type, "users", row)
        print(f" - Seeded {len(users)} users.")
            
        # Students
        for row in students:
            insert_row(cursor, db_type, "students", row)
        print(f" - Seeded {len(students)} students.")
            
        # Recurring Series
        for row in recurring_series:
            insert_row(cursor, db_type, "recurring_series", row)
        print(f" - Seeded {len(recurring_series)} recurring series.")
            
        # Lessons
        for row in lessons:
            insert_row(cursor, db_type, "lessons", row)
        print(f" - Seeded {len(lessons)} scheduled lessons.")
            
        # Practice Logs
        for row in practice_logs:
            insert_row(cursor, db_type, "practice_logs", row)
        print(f" - Seeded {len(practice_logs)} practice logs.")
            
        # Progress Milestones
        for row in progress_milestones:
            insert_row(cursor, db_type, "progress_milestones", row)
        print(f" - Seeded {len(progress_milestones)} milestones.")
            
        # Communication Drafts
        for row in communication_drafts:
            insert_row(cursor, db_type, "communication_drafts", row)
        print(f" - Seeded {len(communication_drafts)} communication drafts.")
        
        conn.commit()
        print("\n--- Seeding Completed Successfully! ---")
        
    except Exception as e:
        print(f"\nError seeding database: {e}", file=sys.stderr)
        if conn:
            print("Rolling back transaction...", file=sys.stderr)
            conn.rollback()
        sys.exit(1)
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    main()
