import { Navigate } from 'react-router-dom'
import { useAuth, type Role } from '@/lib/auth'

export function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const user = useAuth((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to="/" replace />
  return <>{children}</>
}

// Pages that require a real employee record (own payroll, leave, performance, analytics).
// Applicants — accounts whose email hasn't been added as an employee by HR — are sent to
// the Open Roles board instead.
export function RequireEmployee({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'employee' && !user.employee_id) return <Navigate to="/careers" replace />
  return <>{children}</>
}
