import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { cn, getInitials } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { fetchEmployees, fetchJobPostings } from '@/lib/api'
import { can, ROLE_LABEL } from '@/lib/permissions'

const NAV = [
  {
    group: 'Overview',
    items: [
      { path: '/', label: 'Dashboard', icon: <GridIcon /> },
      { path: '/employees', label: 'Employees', icon: <UsersIcon /> },
      { path: '/recruitment', label: 'Recruitment', icon: <BriefcaseIcon /> },
    ],
  },
  {
    group: 'Operations',
    items: [
      { path: '/attendance', label: 'Attendance & Leave', icon: <CalendarIcon /> },
      { path: '/payroll', label: 'Payroll', icon: <DollarIcon /> },
      { path: '/performance', label: 'Performance', icon: <TrendIcon /> },
    ],
  },
  {
    group: 'Insights',
    items: [
      { path: '/analytics', label: 'Analytics', icon: <BarIcon /> },
      { path: '/documents', label: 'Documents', icon: <DocIcon /> },
      { path: '/careers', label: 'Open Roles', icon: <BriefcaseIcon /> },
      { path: '/experience', label: 'Experience Letters', icon: <CertIcon /> },
      { path: '/settings', label: 'Settings', icon: <SettingsIcon /> },
    ],
  },
]

function navAllowed(path: string, role?: 'admin' | 'hr_director' | 'employee', hasRecord?: boolean): boolean {
  // Open Roles is the employee-facing job board; HR/admins use Recruitment instead.
  if (path === '/careers') return role === 'employee'
  if (path === '/experience') return !!hasRecord || role === 'admin' || role === 'hr_director'
  if (role === 'employee') {
    // Applicants (no employee record yet) can only browse + apply to open roles.
    if (!hasRecord) return false
    return ['/payroll', '/attendance', '/performance', '/analytics'].includes(path)
  }
  if (path === '/recruitment') return can(role, 'recruitment.view')
  if (path === '/analytics') return can(role, 'analytics.view')
  return true
}

export function Sidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const isHR = user?.role === 'admin' || user?.role === 'hr_director'

  // Real nav badges for HR: total employees and open job postings.
  const { data: employeeCount } = useQuery({
    queryKey: ['nav', 'employee-count'],
    queryFn: async () => (await fetchEmployees()).length,
    enabled: isHR, staleTime: 60_000,
  })
  const { data: openJobCount } = useQuery({
    queryKey: ['nav', 'open-jobs'],
    queryFn: async () => (await fetchJobPostings({ status: 'open' })).length,
    enabled: isHR, staleTime: 60_000,
  })
  const badgeFor = (path: string): number | undefined =>
    path === '/employees' ? employeeCount : path === '/recruitment' ? openJobCount : undefined

  async function handleLogout() {
    await logout()
    toast.success('Signed out')
    navigate('/login', { replace: true })
  }

  return (
    <aside className="w-60 h-screen bg-surface-1 border-r border-white/7 flex flex-col flex-shrink-0 z-10">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/7">
        <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center relative overflow-hidden">
          <div className="absolute w-4 h-4 border-2 border-white/80 rounded-full top-1 left-2" />
          <div className="absolute w-5 h-2.5 border-2 border-white/80 rounded-t-full bottom-1 left-1.5" />
        </div>
        <span className="font-display font-semibold text-base text-white">
          ACGF<span className="text-brand-400">HR system</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV.map(group => {
          const items = group.items.filter(item => navAllowed(item.path, user?.role, !!user?.employee_id))
          if (items.length === 0) return null
          return (
          <div key={group.group}>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-2">{group.group}</p>
            <div className="space-y-0.5">
              {items.map(item => {
                const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)
                const badge = badgeFor(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
                      active
                        ? 'bg-brand-500/15 text-brand-400 font-medium'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/4'
                    )}
                  >
                    <span className={cn('w-4 h-4 flex-shrink-0', active ? 'text-brand-400' : 'text-slate-600')}>
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {badge != null && badge > 0 && (
                      <span className="bg-brand-500/20 text-brand-400 text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                        {badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
          )
        })}
      </nav>

      {/* User */}
      <div className="border-t border-white/7 p-3 relative">
        {menuOpen && (
          <div className="absolute bottom-[68px] left-3 right-3 bg-surface-2 border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-scale-in">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-300 hover:bg-white/4 hover:text-rose-400 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              Sign out
            </button>
          </div>
        )}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/4 cursor-pointer transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {getInitials(user?.name ?? 'User')}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-slate-300 truncate">{user?.name ?? 'User'}</p>
            <p className="text-xs text-slate-600 truncate">{user ? ROLE_LABEL[user.role] : 'Member'}</p>
          </div>
          <svg className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
          </svg>
        </button>
      </div>
    </aside>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function GridIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
}
function UsersIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function BriefcaseIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="12"/></svg>
}
function CalendarIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
}
function DollarIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
}
function TrendIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
}
function BarIcon() {  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
}
function DocIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
}
function SettingsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
}
function CertIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><circle cx="8" cy="10" r="1.5"/></svg>
}
