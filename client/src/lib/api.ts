/**
 * ACGF HR — REST API layer.
 * Same function signatures the app already uses; now backed by the Node/Express API.
 */
import { apiFetch, qs } from './api-client'
import type {
  Employee, LeaveRequest, JobPosting, Candidate,
  PayrollRecord, PerformanceReview, Goal,
  LeaveStatus, CandidateStage, EmployeeStatus,
} from '@/types'

// ─── Employees ───────────────────────────────────────────────────────────────
export async function fetchEmployees(filters?: {
  department?: string; status?: EmployeeStatus; search?: string
}): Promise<Employee[]> {
  return apiFetch<Employee[]>(`/employees${qs(filters)}`)
}
export async function fetchEmployee(id: string): Promise<Employee | null> {
  return apiFetch<Employee>(`/employees/${id}`)
}
export async function createEmployee(emp: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<Employee> {
  return apiFetch<Employee>('/employees', { method: 'POST', body: JSON.stringify(emp) })
}
export async function updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee> {
  return apiFetch<Employee>(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
}
export async function deleteEmployee(id: string): Promise<void> {
  await apiFetch(`/employees/${id}`, { method: 'DELETE' })
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export interface DashboardData {
  total_employees: number
  open_positions: number
  pending_leave: number
  approved_leave: number
  denied_leave: number
  attendance_today: { present: number; absent: number; rate: number; date: string }
  presence: { label: string; count: number; pct: number; color: string }[]
  dept_headcount: { department: string; count: number; color: string }[]
  status_breakdown: { status: string; label: string; count: number; color: string }[]
  headcount_trend: { month: string; count: number }[]
  pipeline: { stage: string; count: number }[]
  reviews: { submitted: number; total: number }
  activity_feed: { id: number; text: string; time: string; dept: string; color: string }[]
  upcoming_events: { id: number; title: string; date: string; time: string; detail: string; color: string }[]
}
export async function fetchDashboardStats(): Promise<DashboardData> {
  return apiFetch<DashboardData>('/dashboard')
}

// ─── Leave ───────────────────────────────────────────────────────────────────
export async function fetchLeaveRequests(filters?: { status?: LeaveStatus; employee_id?: string }): Promise<LeaveRequest[]> {
  return apiFetch<LeaveRequest[]>(`/leave${qs(filters)}`)
}
export async function updateLeaveStatus(id: string, status: LeaveStatus, approved_by?: string): Promise<void> {
  await apiFetch(`/leave/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, approved_by }) })
}
export async function createLeaveRequest(req: Omit<LeaveRequest, 'id' | 'created_at'>): Promise<LeaveRequest> {
  return apiFetch<LeaveRequest>('/leave', { method: 'POST', body: JSON.stringify(req) })
}

// ─── Attendance (daily present/absent) ───────────────────────────────────────
export interface AttendanceRecord { id: string; employee_id: string; date: string; status: 'present' | 'absent' }
export async function fetchAttendance(date?: string): Promise<AttendanceRecord[]> {
  return apiFetch<AttendanceRecord[]>(`/attendance${qs({ date })}`)
}
export async function markAttendance(input: { employee_id: string; date: string; status: 'present' | 'absent' }): Promise<AttendanceRecord> {
  return apiFetch<AttendanceRecord>('/attendance', { method: 'POST', body: JSON.stringify(input) })
}

// ─── Recruitment ─────────────────────────────────────────────────────────────
export async function fetchJobPostings(filters?: { status?: string; department?: string }): Promise<JobPosting[]> {
  return apiFetch<JobPosting[]>(`/jobs${qs(filters)}`)
}
export async function createJobPosting(
  job: Omit<JobPosting, 'id' | 'created_at' | 'updated_at' | 'applicant_count' | 'recruiter'>,
): Promise<JobPosting> {
  return apiFetch<JobPosting>('/jobs', { method: 'POST', body: JSON.stringify(job) })
}
export async function fetchCandidates(jobId?: string): Promise<Candidate[]> {
  return apiFetch<Candidate[]>(`/candidates${qs({ job_id: jobId })}`)
}
export async function updateCandidateStage(id: string, stage: CandidateStage): Promise<void> {
  await apiFetch(`/candidates/${id}/stage`, { method: 'PATCH', body: JSON.stringify({ stage }) })
}

// Open roles any authenticated user can browse + apply to (used by the employee Careers page)
export interface OpenJob {
  id: string; title: string; department: string; location: string; employment_type: string
  description: string; requirements: string[]; salary_min: number; salary_max: number
  applicant_count: number; created_at: string; applied: boolean
}
export async function fetchOpenJobs(): Promise<OpenJob[]> { return apiFetch<OpenJob[]>('/jobs/open') }
export async function applyToJob(jobId: string): Promise<{ applied: boolean }> {
  return apiFetch<{ applied: boolean }>(`/jobs/${jobId}/apply`, { method: 'POST' })
}

// ─── Payroll ──────────────────────────────────────────────────────────────────
export async function fetchPayrollRecords(period?: string): Promise<PayrollRecord[]> {
  return apiFetch<PayrollRecord[]>(`/payroll${qs({ period })}`)
}
export async function processPayroll(employeeIds: string[], period_start: string, period_end: string): Promise<void> {
  await apiFetch('/payroll/process', { method: 'POST', body: JSON.stringify({ employeeIds, period_start, period_end }) })
}

// ─── Performance ─────────────────────────────────────────────────────────────
export async function fetchPerformanceReviews(filters?: { period?: string; employee_id?: string }): Promise<PerformanceReview[]> {
  return apiFetch<PerformanceReview[]>(`/performance/reviews${qs(filters)}`)
}
export async function fetchGoals(employee_id?: string): Promise<Goal[]> {
  return apiFetch<Goal[]>(`/performance/goals${qs({ employee_id })}`)
}
export async function createPerformanceReview(r: {
  employee_id: string; period: string; goals_score: number; skills_score: number; culture_score: number; score?: number; comments?: string
}): Promise<PerformanceReview> {
  return apiFetch<PerformanceReview>('/performance/reviews', { method: 'POST', body: JSON.stringify(r) })
}
export async function createGoal(g: {
  employee_id: string; title: string; description?: string; target_date?: string; progress?: number
}): Promise<Goal> {
  return apiFetch<Goal>('/performance/goals', { method: 'POST', body: JSON.stringify(g) })
}
export async function updateGoalProgress(id: string, progress: number): Promise<void> {
  await apiFetch(`/performance/goals/${id}/progress`, { method: 'PATCH', body: JSON.stringify({ progress }) })
}

// ─── Documents ───────────────────────────────────────────────────────────────
export interface DocItem { id: string; name: string; type: string; owner: string; size: string; updated_at: string; file_mime?: string }
export async function fetchDocuments(): Promise<DocItem[]> { return apiFetch<DocItem[]>('/documents') }
export async function createDocument(d: { name: string; type: string; file_data?: string; file_mime?: string; size?: string }): Promise<DocItem> {
  return apiFetch<DocItem>('/documents', { method: 'POST', body: JSON.stringify(d) })
}
export async function deleteDocument(id: string): Promise<void> { await apiFetch(`/documents/${id}`, { method: 'DELETE' }) }
export async function downloadDocument(id: string, name: string): Promise<void> {
  const { getToken } = await import('./auth')
  const API_URL = import.meta.env.VITE_API_URL || '/api'
  const token = getToken()
  const res = await fetch(`${API_URL}/documents/${id}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('Download failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ─── Users (admin) ───────────────────────────────────────────────────────────
export interface UserItem { id: string; name: string; email: string; role: string; employee_id?: string | null }
export async function fetchUsers(): Promise<UserItem[]> { return apiFetch<UserItem[]>('/users') }
export async function createUser(u: { name: string; email: string; password: string; role: string }): Promise<UserItem> {
  return apiFetch<UserItem>('/users', { method: 'POST', body: JSON.stringify(u) })
}
export async function updateUser(id: string, patch: Partial<{ name: string; email: string; role: string; password: string }>): Promise<UserItem> {
  return apiFetch<UserItem>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
}
export async function deleteUser(id: string): Promise<{ id: string; deleted: boolean }> {
  return apiFetch<{ id: string; deleted: boolean }>(`/users/${id}`, { method: 'DELETE' })
}

// ─── Experience Letters ───────────────────────────────────────────────────────
import type { ExperienceLetter } from '@/types'

export async function fetchExperienceLetters(): Promise<ExperienceLetter[]> {
  return apiFetch<ExperienceLetter[]>('/experience-letters')
}
export async function requestExperienceLetter(data: {
  employee_id?: string
  purpose?: string
  start_date?: string
  end_date?: string
}): Promise<ExperienceLetter> {
  return apiFetch<ExperienceLetter>('/experience-letters', { method: 'POST', body: JSON.stringify(data) })
}
export async function updateExperienceLetterStatus(
  id: string,
  status: 'approved' | 'rejected',
  rejection_reason?: string,
): Promise<ExperienceLetter> {
  return apiFetch<ExperienceLetter>(`/experience-letters/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, rejection_reason }),
  })
}
export async function deleteExperienceLetter(id: string): Promise<{ id: string; deleted: boolean }> {
  return apiFetch<{ id: string; deleted: boolean }>(`/experience-letters/${id}`, { method: 'DELETE' })
}
