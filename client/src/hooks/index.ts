import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api'
import type { EmployeeStatus, LeaveStatus, CandidateStage } from '@/types'

// ─── Query Keys ──────────────────────────────────────────────────────────────
export const QK = {
  dashboard: ['dashboard'] as const,
  employees: (filters?: object) => ['employees', filters] as const,
  employee: (id: string) => ['employee', id] as const,
  leaveRequests: (filters?: object) => ['leave-requests', filters] as const,
  attendance: (date?: string) => ['attendance', date] as const,
  jobPostings: (filters?: object) => ['job-postings', filters] as const,
  candidates: (jobId?: string) => ['candidates', jobId] as const,
  payroll: (period?: string) => ['payroll', period] as const,
  performanceReviews: (filters?: object) => ['performance-reviews', filters] as const,
  goals: (employeeId?: string) => ['goals', employeeId] as const,
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export function useDashboard(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QK.dashboard,
    queryFn: api.fetchDashboardStats,
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  })
}

// ─── Employees ───────────────────────────────────────────────────────────────
export function useEmployees(filters?: { department?: string; status?: EmployeeStatus; search?: string }) {
  return useQuery({
    queryKey: QK.employees(filters),
    queryFn: () => api.fetchEmployees(filters),
    staleTime: 30_000,
  })
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: QK.employee(id),
    queryFn: () => api.fetchEmployee(id),
    enabled: !!id,
  })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createEmployee,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  })
}

export function useUpdateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof api.updateEmployee>[1] }) =>
      api.updateEmployee(id, updates),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: QK.employee(id) })
    },
  })
}

export function useDeleteEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteEmployee,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  })
}

// ─── Leave ────────────────────────────────────────────────────────────────────
export function useLeaveRequests(filters?: { status?: LeaveStatus; employee_id?: string }) {
  return useQuery({
    queryKey: QK.leaveRequests(filters),
    queryFn: () => api.fetchLeaveRequests(filters),
    staleTime: 15_000,
  })
}

export function useUpdateLeaveStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, approved_by }: { id: string; status: LeaveStatus; approved_by?: string }) =>
      api.updateLeaveStatus(id, status, approved_by),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
  })
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createLeaveRequest,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
  })
}

// ─── Attendance ──────────────────────────────────────────────────────────────
export function useAttendance(date?: string) {
  return useQuery({
    queryKey: QK.attendance(date),
    queryFn: () => api.fetchAttendance(date),
    staleTime: 60_000,
  })
}

// ─── Recruitment ─────────────────────────────────────────────────────────────
export function useJobPostings(filters?: { status?: string; department?: string }) {
  return useQuery({
    queryKey: QK.jobPostings(filters),
    queryFn: () => api.fetchJobPostings(filters),
    staleTime: 60_000,
  })
}

export function useCandidates(jobId?: string) {
  return useQuery({
    queryKey: QK.candidates(jobId),
    queryFn: () => api.fetchCandidates(jobId),
    staleTime: 30_000,
  })
}

export function useCreateJobPosting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createJobPosting,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-postings'] }),
  })
}

export function useUpdateCandidateStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: CandidateStage }) =>
      api.updateCandidateStage(id, stage),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidates'] }),
  })
}

// ─── Payroll ──────────────────────────────────────────────────────────────────
export function usePayroll(period?: string) {
  return useQuery({
    queryKey: QK.payroll(period),
    queryFn: () => api.fetchPayrollRecords(period),
    staleTime: 300_000,
  })
}

// ─── Performance ─────────────────────────────────────────────────────────────
export function usePerformanceReviews(filters?: { period?: string; employee_id?: string }) {
  return useQuery({
    queryKey: QK.performanceReviews(filters),
    queryFn: () => api.fetchPerformanceReviews(filters),
    staleTime: 60_000,
  })
}

export function useGoals(employeeId?: string) {
  return useQuery({
    queryKey: QK.goals(employeeId),
    queryFn: () => api.fetchGoals(employeeId),
    staleTime: 30_000,
  })
}

export function useUpdateGoalProgress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, progress }: { id: string; progress: number }) =>
      api.updateGoalProgress(id, progress),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useCreatePerformanceReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createPerformanceReview,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['performance-reviews'] }),
  })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createGoal,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}
