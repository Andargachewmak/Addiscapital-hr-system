import type { Role } from './auth'

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'System Admin',
  hr_director: 'HR Director',
  employee: 'Employee',
}

export type Action =
  | 'employees.write'
  | 'leave.approve'
  | 'attendance.mark'
  | 'recruitment.view'
  | 'recruitment.write'
  | 'payroll.view_all'
  | 'payroll.process'
  | 'analytics.view'
  | 'performance.write'
  | 'documents.write'
  | 'users.manage'

const MATRIX: Record<Action, Role[]> = {
  'employees.write': ['admin', 'hr_director'],
  'leave.approve': ['admin', 'hr_director'],
  'attendance.mark': ['admin', 'hr_director'],
  'recruitment.view': ['admin', 'hr_director'],
  'recruitment.write': ['admin', 'hr_director'],
  'payroll.view_all': ['admin', 'hr_director'],
  'payroll.process': ['admin', 'hr_director'],
  'analytics.view': ['admin', 'hr_director'],
  'performance.write': ['admin', 'hr_director'],
  'documents.write': ['admin', 'hr_director'],
  'users.manage': ['admin'],
}

export function can(role: Role | undefined, action: Action): boolean {
  if (!role) return false
  return MATRIX[action].includes(role)
}
