-- ============================================================
-- Nexus HR — Supabase Migration 001: Initial Schema
-- Run in Supabase SQL editor or via Supabase CLI:
--   supabase db push
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Employees ───────────────────────────────────────────────────────────────
CREATE TABLE employees (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  phone           TEXT,
  avatar_url      TEXT,
  department      TEXT NOT NULL CHECK (department IN (
    'Engineering','Sales','Marketing','Design','Product',
    'Operations','HR','Finance','Legal'
  )),
  job_title       TEXT NOT NULL,
  employment_type TEXT NOT NULL DEFAULT 'full_time' CHECK (
    employment_type IN ('full_time','part_time','contract','intern')
  ),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active','on_leave','wfh','terminated','onboarding')
  ),
  location        TEXT NOT NULL,
  start_date      DATE NOT NULL,
  salary          NUMERIC(12,2) NOT NULL DEFAULT 0,
  manager_id      UUID REFERENCES employees(id) ON DELETE SET NULL,
  bio             TEXT,
  skills          TEXT[]
);

CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_manager ON employees(manager_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Leave Requests ──────────────────────────────────────────────────────────
CREATE TABLE leave_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type  TEXT NOT NULL CHECK (
    leave_type IN ('annual','sick','personal','maternity','paternity','unpaid')
  ),
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  days        INTEGER NOT NULL CHECK (days > 0),
  reason      TEXT,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending','approved','denied','cancelled')
  ),
  approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_leave_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_status ON leave_requests(status);

-- ─── Attendance ──────────────────────────────────────────────────────────────
CREATE TABLE attendance (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  check_in    TIME,
  check_out   TIME,
  type        TEXT NOT NULL DEFAULT 'office' CHECK (
    type IN ('office','wfh','absent','leave','holiday')
  ),
  notes       TEXT,
  UNIQUE (employee_id, date)
);

CREATE INDEX idx_attendance_employee ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(date);

-- ─── Job Postings ─────────────────────────────────────────────────────────────
CREATE TABLE job_postings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title           TEXT NOT NULL,
  department      TEXT NOT NULL,
  location        TEXT NOT NULL,
  employment_type TEXT NOT NULL DEFAULT 'full_time',
  description     TEXT NOT NULL DEFAULT '',
  requirements    TEXT[] NOT NULL DEFAULT '{}',
  salary_min      NUMERIC(12,2) NOT NULL DEFAULT 0,
  salary_max      NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open','paused','closed','draft')
  ),
  applicant_count INTEGER NOT NULL DEFAULT 0,
  recruiter_id    UUID REFERENCES employees(id) ON DELETE SET NULL
);

CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON job_postings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Candidates ──────────────────────────────────────────────────────────────
CREATE TABLE candidates (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  job_id       UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  first_name   TEXT NOT NULL,
  last_name    TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  resume_url   TEXT,
  linkedin_url TEXT,
  stage        TEXT NOT NULL DEFAULT 'applied' CHECK (
    stage IN ('applied','screening','interview','assessment','offer','hired','rejected')
  ),
  score        NUMERIC(4,1) CHECK (score BETWEEN 0 AND 100),
  notes        TEXT
);

CREATE TRIGGER trg_candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update job applicant count
CREATE OR REPLACE FUNCTION sync_applicant_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE job_postings
    SET applicant_count = (SELECT COUNT(*) FROM candidates WHERE job_id = COALESCE(NEW.job_id, OLD.job_id))
    WHERE id = COALESCE(NEW.job_id, OLD.job_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_applicant_count
  AFTER INSERT OR DELETE OR UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION sync_applicant_count();

-- ─── Payroll Records ──────────────────────────────────────────────────────────
CREATE TABLE payroll_records (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  base_salary   NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonus         NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions    NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_pay       NUMERIC(12,2) GENERATED ALWAYS AS (base_salary + bonus - deductions) STORED,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending','processed','failed')
  ),
  processed_at  TIMESTAMPTZ
);

CREATE INDEX idx_payroll_employee ON payroll_records(employee_id);
CREATE INDEX idx_payroll_period ON payroll_records(period_start, period_end);

-- ─── Performance Reviews ─────────────────────────────────────────────────────
CREATE TABLE performance_reviews (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period        TEXT NOT NULL,
  score         NUMERIC(3,1) NOT NULL CHECK (score BETWEEN 0 AND 10),
  goals_score   NUMERIC(3,1) NOT NULL CHECK (goals_score BETWEEN 0 AND 10),
  skills_score  NUMERIC(3,1) NOT NULL CHECK (skills_score BETWEEN 0 AND 10),
  culture_score NUMERIC(3,1) NOT NULL CHECK (culture_score BETWEEN 0 AND 10),
  comments      TEXT,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft','submitted','acknowledged')
  )
);

CREATE INDEX idx_reviews_employee ON performance_reviews(employee_id);
CREATE INDEX idx_reviews_period ON performance_reviews(period);

-- ─── Goals ───────────────────────────────────────────────────────────────────
CREATE TABLE goals (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  target_date  DATE NOT NULL,
  progress     INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status       TEXT NOT NULL DEFAULT 'on_track' CHECK (
    status IN ('on_track','at_risk','completed','overdue')
  )
);

CREATE INDEX idx_goals_employee ON goals(employee_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE employees         ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance        ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals             ENABLE ROW LEVEL SECURITY;

-- HR Managers & Admins: full access
-- (In production, tie these to auth.users roles via JWT claims)
CREATE POLICY "HR full access employees"
  ON employees FOR ALL USING (true); -- Replace with: auth.jwt()->>'role' IN ('admin','hr_manager')

CREATE POLICY "HR full access leave"
  ON leave_requests FOR ALL USING (true);

CREATE POLICY "HR full access attendance"
  ON attendance FOR ALL USING (true);

CREATE POLICY "HR full access job_postings"
  ON job_postings FOR ALL USING (true);

CREATE POLICY "HR full access candidates"
  ON candidates FOR ALL USING (true);

CREATE POLICY "HR full access payroll"
  ON payroll_records FOR ALL USING (true);

CREATE POLICY "HR full access reviews"
  ON performance_reviews FOR ALL USING (true);

CREATE POLICY "HR full access goals"
  ON goals FOR ALL USING (true);

-- ─── Utility RPCs ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object(
    'total_employees',   (SELECT COUNT(*) FROM employees WHERE status != 'terminated'),
    'attendance_rate',   ROUND(
      (SELECT COUNT(*) FROM attendance WHERE date = CURRENT_DATE AND type != 'absent')::NUMERIC /
      NULLIF((SELECT COUNT(*) FROM employees WHERE status = 'active'), 0) * 100, 1
    ),
    'open_positions',    (SELECT COUNT(*) FROM job_postings WHERE status = 'open'),
    'turnover_rate',     3.2
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_headcount_by_department()
RETURNS TABLE(department TEXT, count BIGINT)
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT department, COUNT(*) as count
  FROM employees
  WHERE status != 'terminated'
  GROUP BY department
  ORDER BY count DESC;
$$;

CREATE OR REPLACE FUNCTION get_monthly_headcount(months INTEGER DEFAULT 12)
RETURNS TABLE(month TEXT, count BIGINT)
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT
    TO_CHAR(gs.month_start, 'Mon') as month,
    COUNT(e.id) as count
  FROM generate_series(
    DATE_TRUNC('month', NOW() - (months - 1 || ' months')::INTERVAL),
    DATE_TRUNC('month', NOW()),
    '1 month'::INTERVAL
  ) AS gs(month_start)
  LEFT JOIN employees e ON
    e.start_date <= gs.month_start + INTERVAL '1 month - 1 day' AND
    (e.status != 'terminated')
  GROUP BY gs.month_start
  ORDER BY gs.month_start;
$$;

-- ─── Seed Data (Development Only) ────────────────────────────────────────────
-- Uncomment and run in dev to seed initial employees:
/*
INSERT INTO employees (first_name, last_name, email, department, job_title, location, start_date, salary) VALUES
('Tyler', 'Kim', 't.kim@nexusco.io', 'Engineering', 'Principal Architect', 'Remote', '2020-03-02', 215000),
('Aisha', 'Roberts', 'a.roberts@nexusco.io', 'Sales', 'Sales Director', 'New York', '2021-09-07', 195000),
('Jordan', 'Lee', 'j.lee@nexusco.io', 'Operations', 'Operations Manager', 'Austin, TX', '2022-01-15', 135000),
('Priya', 'Nair', 'p.nair@nexusco.io', 'Design', 'Lead Product Designer', 'Remote', '2023-06-03', 148000),
('Ravi', 'Okonkwo', 'r.okonkwo@nexusco.io', 'Finance', 'CFO', 'San Francisco', '2019-02-12', 280000);
*/
