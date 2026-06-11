-- PostgreSQL Database DDL
-- Optimised for Private Music Teacher App with RLS guards for COPPA compliance

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define Enums
CREATE TYPE user_role AS ENUM ('teacher', 'parent', 'student');
CREATE TYPE skill_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE lesson_status AS ENUM ('scheduled', 'cancelled', 'completed');
CREATE TYPE draft_status AS ENUM ('draft', 'approved', 'sent', 'failed');

-- -------------------------------------------------------------
-- TABLES
-- -------------------------------------------------------------

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role user_role NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE, -- Can be NULL for minor students without emails
    phone VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure all non-students have an email
    CONSTRAINT email_required_for_adults CHECK (
        (role = 'student' AND email IS NULL) OR (email IS NOT NULL)
    )
);

-- 2. Students Profiles (Extends Users)
CREATE TABLE students (
    student_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Nullable for adult students
    birth_date DATE NOT NULL,
    level skill_level NOT NULL DEFAULT 'beginner',
    emergency_contact_name VARCHAR(255) NOT NULL,
    emergency_contact_phone VARCHAR(50) NOT NULL,
    
    -- COPPA verification check: if student is under 13, parent_id MUST NOT be null
    CONSTRAINT coppa_parent_requirement CHECK (
        (birth_date > CURRENT_DATE - INTERVAL '13 years' AND parent_id IS NOT NULL) OR 
        (birth_date <= CURRENT_DATE - INTERVAL '13 years')
    )
);

-- 3. Recurring Lesson Series (RRULEs)
CREATE TABLE recurring_series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    rrule TEXT NOT NULL, -- RFC 5545 iCalendar string
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT time_sequence CHECK (end_time > start_time)
);

-- 4. Lessons (Individual occurrences + single lessons)
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    series_id UUID REFERENCES recurring_series(id) ON DELETE CASCADE, -- NULL for one-off lessons
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status lesson_status NOT NULL DEFAULT 'scheduled',
    notes TEXT, -- Feedback left by the teacher after the lesson
    is_override BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE if recurrence instance is moved/changed
    original_start_time TIMESTAMPTZ, -- To track which occurrence of an RRULE this overrides
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT time_sequence CHECK (end_time > start_time)
);

-- 5. Student Practice Logs
CREATE TABLE practice_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    notes TEXT,
    verified_by_parent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Progress Milestones (Songs, Scales, Exercises)
CREATE TABLE progress_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    item_type VARCHAR(100) NOT NULL, -- e.g., 'song', 'scale', 'etude'
    status VARCHAR(50) NOT NULL DEFAULT 'assigned', -- e.g., 'assigned', 'in_progress', 'completed'
    teacher_feedback TEXT,
    completed_at DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Communication Drafts (Sandboxed)
CREATE TABLE communication_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_type VARCHAR(50) NOT NULL, -- e.g., 'cancellation', 'reminder', 'progress'
    channel VARCHAR(20) NOT NULL, -- e.g., 'email', 'sms'
    recipient_address VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    body TEXT NOT NULL,
    status draft_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ
);

-- 8. Repertoire Catalog
CREATE TABLE repertoire_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    composer VARCHAR(255) NOT NULL,
    difficulty skill_level NOT NULL,
    instrument VARCHAR(100) NOT NULL,
    drill_instructions TEXT NOT NULL
);

-- -------------------------------------------------------------
-- INDICES (Performance Optimization)
-- -------------------------------------------------------------
CREATE INDEX idx_lessons_time ON lessons (start_time, end_time);
CREATE INDEX idx_lessons_student ON lessons (student_id);
CREATE INDEX idx_lessons_teacher ON lessons (teacher_id);
CREATE INDEX idx_students_parent ON students (parent_id);
CREATE INDEX idx_practice_logs_student ON practice_logs (student_id, log_date);
CREATE INDEX idx_progress_milestones_student ON progress_milestones (student_id);

-- -------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------------

-- Helper function to check if the current user is a teacher
CREATE OR REPLACE FUNCTION is_teacher() 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = NULLIF(current_setting('app.current_user_id', true), '')::UUID 
          AND role = 'teacher'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if the current user is a parent of a given student
CREATE OR REPLACE FUNCTION is_parent_of(student_uuid UUID) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM students 
        WHERE student_id = student_uuid 
          AND parent_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_drafts ENABLE ROW LEVEL SECURITY;
-- (repertoire_catalog is public, so no RLS needed, or readable by all authenticated)

-- RLS Policies: Users
CREATE POLICY users_access_policy ON users
    FOR ALL
    USING (
        id = NULLIF(current_setting('app.current_user_id', true), '')::UUID
        OR is_teacher()
        OR EXISTS (
            SELECT 1 FROM students 
            WHERE student_id = users.id 
              AND parent_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID
        )
    );

-- RLS Policies: Students
CREATE POLICY students_access_policy ON students
    FOR ALL
    USING (
        student_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID
        OR parent_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID
        OR is_teacher()
    );

-- RLS Policies: Recurring Series
CREATE POLICY recurring_series_policy ON recurring_series
    FOR ALL
    USING (
        teacher_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID
        OR student_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID
        OR is_parent_of(student_id)
    );

-- RLS Policies: Lessons
CREATE POLICY lessons_policy ON lessons
    FOR ALL
    USING (
        teacher_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID
        OR student_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID
        OR is_parent_of(student_id)
    );

-- RLS Policies: Practice Logs
CREATE POLICY practice_logs_policy ON practice_logs
    FOR ALL
    USING (
        student_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID
        OR is_parent_of(student_id)
        -- Teachers can read practice logs to track progress
        OR is_teacher()
    );

-- RLS Policies: Progress Milestones
CREATE POLICY progress_milestones_policy ON progress_milestones
    FOR ALL
    USING (
        teacher_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID
        OR student_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID
        OR is_parent_of(student_id)
    );

-- RLS Policies: Communication Drafts
CREATE POLICY communication_drafts_policy ON communication_drafts
    FOR ALL
    USING (
        -- Only teachers can edit drafts
        -- Parents/Students can see drafts ONLY if status is 'approved' or 'sent' (i.e. once they are dispatched)
        (is_teacher() AND teacher_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID)
        OR (
            (status = 'approved' OR status = 'sent') 
            AND (
                student_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID 
                OR is_parent_of(student_id)
            )
        )
    );
