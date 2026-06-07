import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, hydrated } = useAuth()
  const location = useLocation()

  // Wait for persisted state to load so we don't flash the login screen
  if (!hydrated) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-0">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
