-- Coding Assessment Platform – Supabase schema (free-tier optimized).
-- Run this in Supabase SQL Editor after creating a project.

-- Students: one row per student; login validated by email + roll_number.
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  roll_number TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_email ON students(email);

-- RLS: students can read only their own row (id = auth.uid()).
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view self" ON students FOR SELECT USING (auth.uid() = id);

-- Exams: one row per exam; start/end define window.
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL
);

-- Submissions: ONE row per student per exam (no per-question rows).
-- mcq_answers: JSON object keyed by question id → selected option.
-- coding_answers: JSON object keyed by question id → { code, language, score }.
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  mcq_answers JSONB NOT NULL DEFAULT '{}',
  coding_answers JSONB NOT NULL DEFAULT '{}',
  total_score INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, exam_id)
);

CREATE INDEX IF NOT EXISTS idx_submission ON submissions(student_id, exam_id);

-- RLS: only allow student to read/update their own submission row.
-- Requires: each student has a matching Supabase Auth user with id = students.id (so auth.uid() = student_id).
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own submissions"
  ON submissions FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own submission"
  ON submissions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own submission"
  ON submissions FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- Optional: no delete for students.
-- CREATE POLICY "Students cannot delete" ON submissions FOR DELETE USING (false);

-- Trigger to refresh updated_at on submissions.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS submissions_updated_at ON submissions;
CREATE TRIGGER submissions_updated_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
