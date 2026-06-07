import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, SearchInput } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { useLeaveRequests } from '@/hooks'
import { can, ROLE_LABEL } from '@/lib/permissions'
import { getInitials, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/employees': 'People Directory',
  '/recruitment': 'Recruitment & Hiring',
  '/attendance': 'Attendance & Leave',
  '/payroll': 'Payroll & Compensation',
  '/performance': 'Performance Reviews',
  '/analytics': 'HR Analytics',
  '/documents': 'Documents',
  '/careers': 'Open Roles',
  '/settings': 'Settings',
}

export function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { data: leaveData } = useLeaveRequests()
  const [search, setSearch] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [seen, setSeen] = useState(false)
  const popRef = useRef<HTMLDivElement>(null)
  const title = PAGE_TITLES[pathname] ?? 'Addis Capital HR'

  // Real notifications derived from leave activity (scoped to what the user can see).
  const isEmployee = user?.role === 'employee'
  const notifications = [...(leaveData ?? [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)
    .map((r) => {
      const who = `${r.employee?.first_name ?? ''} ${r.employee?.last_name ?? ''}`.trim() || 'Someone'
      const text = isEmployee
        ? `Your ${r.leave_type} leave request is ${r.status}`
        : r.status === 'pending'
          ? `${who} requested ${r.leave_type} leave`
          : `${who}'s ${r.leave_type} leave was ${r.status}`
      return { id: r.id, text, time: formatDate(r.created_at, 'short'), unread: r.status === 'pending' }
    })
  const unread = seen ? 0 : notifications.filter((n) => n.unread).length

  // Close popovers on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!search.trim()) return
    navigate(`/employees?search=${encodeURIComponent(search.trim())}`)
  }

  async function handleLogout() {
    await logout()
    toast.success('Signed out')
    navigate('/login', { replace: true })
  }

  return (
    <header className="h-16 bg-surface-0 border-b border-white/7 flex items-center px-7 gap-4 flex-shrink-0">
      <h1 className="font-display text-lg font-semibold text-white tracking-tight flex-1">{title}</h1>

      {user?.role !== 'employee' && (
        <form onSubmit={submitSearch}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search employees..." className="w-56" />
        </form>
      )}

      <div className="flex items-center gap-2 relative" ref={popRef}>
        {/* Theme toggle (next to notifications) */}
        <ThemeToggle />

        {/* Notifications */}
        <button
          onClick={() => { setNotifOpen((o) => !o); setMenuOpen(false); setSeen(true) }}
          className="relative w-9 h-9 rounded-xl bg-surface-2 border border-white/8 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-surface-3 transition-all"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unread > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-400 rounded-full ring-2 ring-surface-0" />}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-12 w-72 bg-surface-1 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-scale-in">
            <div className="px-4 py-3 border-b border-white/7">
              <p className="text-sm font-semibold text-white">Notifications</p>
            </div>
            <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-500 text-center">No notifications</p>
              ) : notifications.map((n) => (
                <div key={n.id} className="px-4 py-3 hover:bg-white/3 transition-colors flex items-start gap-2">
                  {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />}
                  <div className={n.unread ? '' : 'pl-3.5'}>
                    <p className="text-sm text-slate-300 leading-snug">{n.text}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {can(user?.role, 'employees.write') && (
          <Button variant="primary" size="sm" onClick={() => navigate('/employees?new=1')}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Employee
          </Button>
        )}

        {/* User menu */}
        <button
          onClick={() => { setMenuOpen((o) => !o); setNotifOpen(false) }}
          className="w-9 h-9 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs font-semibold hover:bg-brand-500/30 transition-colors"
        >
          {getInitials(user?.name ?? 'User')}
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-12 w-56 bg-surface-1 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-scale-in">
            <div className="px-4 py-3 border-b border-white/7">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              <p className="text-[11px] text-brand-400 mt-1 font-medium">{user ? ROLE_LABEL[user.role] : ''}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-300 hover:bg-white/4 hover:text-rose-400 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

// Dark / light theme toggle
function ThemeToggle() {
  const theme = useTheme((s) => s.theme)
  const toggle = useTheme((s) => s.toggle)
  const isDark = theme === 'dark'
  return (
    <button
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle color theme"
      className="w-9 h-9 rounded-xl bg-surface-2 border border-white/8 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-surface-3 transition-all"
    >
      {isDark ? (
        // Sun (click for light)
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        // Moon (click for dark)
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  )
}
