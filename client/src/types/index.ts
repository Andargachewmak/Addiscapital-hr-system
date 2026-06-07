// ─── Database types (mirror Supabase schema) ───────────────────────────────

// Department is a free-form string driven by the org model in lib/org.ts.
export type Department = string

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern'

export type EmployeeStatus = 'active' | 'on_leave' | 'wfh' | 'terminated' | 'onboarding'

export type LeaveType = 'annual' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'unpaid'

export type LeaveStatus = 'pending' | 'approved' | 'denied' | 'cancelled'

export type JobStatus = 'open' | 'paused' | 'closed' | 'draft'

export type CandidateStage =
  | 'applied'
  | 'screening'
  | 'interview'
  | 'assessment'
  | 'offer'
  | 'hired'
  | 'rejected'

export type PayrollStatus = 'pending' | 'processed' | 'failed'

export interface Employee {
  id: string
  created_at: string
  updated_at: string
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  avatar_url?: string | null
  department: Department
  job_title: string
  employment_type: EmploymentType
  status: EmployeeStatus
  location: string
  start_date: string
  salary: number
  manager_id?: string | null
  bio?: string | null
  skills?: string[] | null
  // Computed
  full_name?: string
  manager?: Employee
}

export interface Department_Row {
  id: string
  name: Department
  head_id?: string
  headcount: number
  budget: number
  created_at: string
}

export interface LeaveRequest {
  id: string
  employee_id: string
  leave_type: LeaveType
  start_date: string
  end_date: string
  days: number
  reason?: string
  status: LeaveStatus
  approved_by?: string
  created_at: string
  employee?: Employee
  approver?: Employee
}

export interface Attendance {
  id: string
  employee_id: string
  date: string
  check_in?: string
  check_out?: string
  type: 'office' | 'wfh' | 'absent' | 'leave' | 'holiday'
  notes?: string
  employee?: Employee
}

export interface JobPosting {
  id: string
  title: string
  department: Department
  location: string
  employment_type: EmploymentType
  description: string
  requirements: string[]
  salary_min: number
  salary_max: number
  status: JobStatus
  applicant_count: number
  created_at: string
  updated_at: string
  recruiter_id?: string
  recruiter?: Employee
}

export interface Candidate {
  id: string
  job_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  resume_url?: string
  linkedin_url?: string
  stage: CandidateStage
  score?: number
  notes?: string
  created_at: string
  updated_at: string
  job?: JobPosting
}

export interface PayrollRecord {
  id: string
  employee_id: string
  period_start: string
  period_end: string
  base_salary: number
  bonus: number
  deductions: number
  net_pay: number
  status: PayrollStatus
  processed_at?: string
  created_at: string
  employee?: Employee
}

export interface PerformanceReview {
  id: string
  employee_id: string
  reviewer_id: string
  period: string
  score: number
  goals_score: number
  skills_score: number
  culture_score: number
  comments?: string
  status: 'draft' | 'submitted' | 'acknowledged'
  created_at: string
  employee?: Employee
  reviewer?: Employee
}

export interface Goal {
  id: string
  employee_id: string
  title: string
  description?: string
  target_date: string
  progress: number
  status: 'on_track' | 'at_risk' | 'completed' | 'overdue'
  created_at: string
  employee?: Employee
}

// ─── UI / App types ─────────────────────────────────────────────────────────

export interface NavItem {
  id: string
  label: string
  icon: string
  badge?: number
  path: string
}

export interface DashboardStats {
  total_employees: number
  attendance_rate: number
  open_positions: number
  turnover_rate: number
  headcount_change: number
  attendance_change: number
  new_positions: number
  turnover_change: number
}

export interface HeadcountByDept {
  department: Department
  count: number
  color: string
}

export type ColorVariant =
  | 'purple'
  | 'teal'
  | 'amber'
  | 'red'
  | 'green'
  | 'blue'
  | 'pink'
  | 'gray'

export interface ChartDataPoint {
  label: string
  value: number
  color?: string
}

export interface PipelineStage {
  name: string
  count: number
  color: string
}

// Supabase Auth
export interface AuthUser {
  id: string
  email: string
  role: 'admin' | 'hr_director' | 'employee'
  employee_id?: string
}

export type ExperienceLetterStatus = 'pending' | 'approved' | 'rejected'

export interface ExperienceLetter {
  id: string
  employee_id: string
  requested_by: string
  requested_at: string
  status: ExperienceLetterStatus
  purpose?: string | null
  start_date: string
  end_date: string
  approved_by?: string | null
  approved_at?: string | null
  rejection_reason?: string | null
  letter_content?: string | null
  created_at: string
  updated_at: string
  employee?: Employee
}
