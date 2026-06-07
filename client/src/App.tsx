import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import { useAuth } from '@/lib/auth'
import { Layout } from '@/components/layout/Layout'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { LoginPage } from '@/components/auth/LoginPage'
import { SignUpPage } from '@/components/auth/SignUpPage'
import { RequireRole, RequireEmployee } from '@/components/auth/RequireRole'
import { DocumentsPage } from '@/components/documents/DocumentsPage'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { DashboardPage } from '@/components/dashboard/DashboardPage'
import { EmployeesPage } from '@/components/employees/EmployeesPage'
import { RecruitmentPage } from '@/components/recruitment/RecruitmentPage'
import { AttendancePage } from '@/components/attendance/AttendancePage'
import { PayrollPage } from '@/components/payroll/PayrollPage'
import { PerformancePage } from '@/components/performance/PerformancePage'
import { AnalyticsPage } from '@/components/analytics/AnalyticsPage'
import { CareersPage } from '@/components/careers/CareersPage'
import { ExperiencePage } from '@/components/experience/ExperiencePage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<RoleHome />} />
            <Route path="/employees" element={<RequireRole roles={['admin', 'hr_director']}><EmployeesPage /></RequireRole>} />
            <Route path="/recruitment" element={<RequireRole roles={['admin', 'hr_director']}><RecruitmentPage /></RequireRole>} />
            <Route path="/attendance" element={<RequireEmployee><AttendancePage /></RequireEmployee>} />
            <Route path="/payroll" element={<RequireEmployee><PayrollPage /></RequireEmployee>} />
            <Route path="/performance" element={<RequireEmployee><PerformancePage /></RequireEmployee>} />
            <Route path="/analytics" element={<RequireEmployee><AnalyticsPage /></RequireEmployee>} />
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/experience" element={<RequireEmployee><ExperiencePage /></RequireEmployee>} />
            <Route path="/documents" element={<RequireRole roles={['admin', 'hr_director']}><DocumentsPage /></RequireRole>} />
            <Route path="/settings" element={<RequireRole roles={['admin', 'hr_director']}><SettingsPage /></RequireRole>} />
          </Route>
        </Routes>
      </BrowserRouter>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1a1c23',
            color: '#f1f5f9',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 12,
            fontSize: 13,
          },
          success: { iconTheme: { primary: '#3dd68c', secondary: '#1a1c23' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#1a1c23' } },
        }}
      />

      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}

// Landing route: HR/admins see the dashboard, linked employees see Payroll,
// and applicants (no employee record yet) see the Open Roles board.
function RoleHome() {
  const user = useAuth((s) => s.user)
  if (user?.role === 'employee') return <Navigate to={user.employee_id ? '/payroll' : '/careers'} replace />
  return <DashboardPage />
}
