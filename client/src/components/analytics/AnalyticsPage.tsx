import { Card, CardHeader, CardBody, StatCard, Skeleton, Progress } from '@/components/ui'
import { useDashboard, useEmployees, usePayroll, useLeaveRequests, usePerformanceReviews, useGoals } from '@/hooks'
import { useAuth } from '@/lib/auth'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

const PALETTE = ['#6C63FF', '#00D4AA', '#F5A623', '#E86FA0', '#3DD68C', '#3B82F6', '#FF5F5F', '#8B85FF', '#4FA3E8']
const TOOLTIP_STYLE = { background: '#1a1c23', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, fontSize: 12, color: '#e2e8f0' }
const TYPE_LABEL: Record<string, string> = { full_time: 'Full-time', part_time: 'Part-time', contract: 'Contract', intern: 'Intern' }
const compactUsd = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `$${(n / 1_000).toFixed(1)}K` : `$${Math.round(n)}`

export function AnalyticsPage() {
  const role = useAuth((s) => s.user?.role)
  if (role === 'employee') return <MyAnalytics />
  return <HRAnalytics />
}

// ── Employee view: personal analytics ────────────────────────────────────────
function MyAnalytics() {
  const { data: payroll } = usePayroll()
  const { data: leave } = useLeaveRequests()
  const { data: reviews } = usePerformanceReviews()
  const { data: goals } = useGoals()

  const recs = [...(payroll ?? [])].sort((a, b) => (a.period_end > b.period_end ? 1 : -1))
  const latestNet = recs.length ? recs[recs.length - 1].net_pay : 0
  const ytdNet = recs.reduce((s, r) => s + r.net_pay, 0)
  const approvedLeaveDays = (leave ?? []).filter((l) => l.status === 'approved').reduce((s, l) => s + (l.days || 0), 0)
  const pendingLeave = (leave ?? []).filter((l) => l.status === 'pending').length
  const revs = reviews ?? []
  const avgScore = revs.length ? (revs.reduce((s, r) => s + r.score, 0) / revs.length).toFixed(1) : '—'
  const gs = goals ?? []
  const onTrackPct = gs.length ? Math.round((gs.filter((g) => g.status === 'on_track' || g.status === 'completed').length / gs.length) * 100) : 0
  const payTrend = recs.map((r) => ({ period: r.period_end ? new Date(r.period_end).toLocaleString('en-US', { month: 'short', year: '2-digit' }) : '—', net: r.net_pay }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-white">My Analytics</h2>
        <p className="text-sm text-slate-500 mt-0.5">A personal summary of your pay, leave and performance.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Latest Net Pay" value={compactUsd(latestNet)} change="After 35% tax" changeType="neutral" icon="💵" accent="bg-teal-500" />
        <StatCard label="Net Pay To Date" value={compactUsd(ytdNet)} change={`${recs.length} payslip${recs.length === 1 ? '' : 's'}`} changeType="neutral" icon="💰" accent="bg-brand-500" />
        <StatCard label="Approved Leave" value={`${approvedLeaveDays}d`} change={`${pendingLeave} pending`} changeType="neutral" icon="🌴" accent="bg-amber-500" />
        <StatCard label="My Avg. Score" value={`${avgScore}/10`} change={`${onTrackPct}% goals on track`} changeType="neutral" icon="⭐" accent="bg-emerald-500" />
      </div>

      <Card>
        <CardHeader><h3 className="font-display font-semibold text-white text-sm">My Net Pay by Period</h3></CardHeader>
        <CardBody>
          {payTrend.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No payslips yet. They'll appear here once payroll is processed.</p>
          ) : (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={payTrend} margin={{ top: 4, right: 0, left: -8, bottom: 0 }}>
                <XAxis dataKey="period" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => compactUsd(Number(v))} width={56} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [compactUsd(v), 'Net pay']} />
                <Bar dataKey="net" fill="#6C63FF" radius={[4, 4, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

// ── HR / admin view ──────────────────────────────────────────────────────────
function HRAnalytics() {
  const { data: dash, isLoading } = useDashboard()
  const { data: employees } = useEmployees()
  const { data: payroll } = usePayroll()

  if (isLoading || !dash) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <div className="grid grid-cols-2 gap-5">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
      </div>
    )
  }

  const emps = employees ?? []
  const total = dash.total_employees
  const activeCount = dash.status_breakdown.find(s => s.status === 'active')?.count ?? 0
  const activeRate = total ? Math.round((activeCount / total) * 100) : 0

  // Average tenure (years) from real start dates
  const tenuresY = emps.filter(e => e.start_date).map(e => (Date.now() - new Date(e.start_date).getTime()) / (365.25 * 864e5))
  const avgTenure = tenuresY.length ? (tenuresY.reduce((a, b) => a + b, 0) / tenuresY.length).toFixed(1) : '—'
  const tenureBuckets = [
    { range: '<1y', count: tenuresY.filter(y => y < 1).length },
    { range: '1–2y', count: tenuresY.filter(y => y >= 1 && y < 2).length },
    { range: '2–3y', count: tenuresY.filter(y => y >= 2 && y < 3).length },
    { range: '3–5y', count: tenuresY.filter(y => y >= 3 && y < 5).length },
    { range: '5y+', count: tenuresY.filter(y => y >= 5).length },
  ]

  // Employment type distribution
  const byType: Record<string, number> = {}
  for (const e of emps) byType[e.employment_type] = (byType[e.employment_type] || 0) + 1
  const employmentType = Object.entries(byType).map(([k, count], i) => ({ name: TYPE_LABEL[k] ?? k, count, color: PALETTE[i % PALETTE.length] }))

  // Location distribution (top 6)
  const byLoc: Record<string, number> = {}
  for (const e of emps) { const l = e.location || 'Unspecified'; byLoc[l] = (byLoc[l] || 0) + 1 }
  const locations = Object.entries(byLoc).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxLoc = locations.length ? locations[0][1] : 0

  const totalPayroll = (payroll ?? []).reduce((s, r) => s + r.net_pay, 0)
  const leaveTotal = dash.pending_leave + dash.approved_leave + dash.denied_leave
  const leaveBreakdown = [
    { label: 'Pending', count: dash.pending_leave, color: 'bg-amber-500' },
    { label: 'Approved', count: dash.approved_leave, color: 'bg-teal-500' },
    { label: 'Denied', count: dash.denied_leave, color: 'bg-red-500' },
  ]

  return (
    <div className="space-y-6">
      {/* Real KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={total} change={`${activeCount} active`} changeType="neutral" icon="👥" accent="bg-brand-500" />
        <StatCard label="Active Rate" value={`${activeRate}%`} change="Currently active" changeType="up" icon="✅" accent="bg-teal-500" />
        <StatCard label="Open Positions" value={dash.open_positions} change="Hiring now" icon="💼" accent="bg-amber-500" />
        <StatCard label="Avg. Tenure" value={`${avgTenure}y`} change="Across the team" icon="⏳" accent="bg-emerald-500" />
      </div>

      {/* Headcount by dept + trend */}
      <div className="grid grid-cols-2 gap-5">
        <Card>
          <CardHeader><h3 className="font-display font-semibold text-white text-sm">Headcount by Department</h3></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={dash.dept_headcount} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                <XAxis dataKey="department" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={40} />
                <YAxis allowDecimals={false} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {dash.dept_headcount.map((d, i) => <Cell key={i} fill={d.color || PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-display font-semibold text-white text-sm">Headcount Trend</h3>
            <span className="text-xs text-slate-500">Last 6 months</span>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={dash.headcount_trend} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="hcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="count" stroke="#6C63FF" strokeWidth={2} fill="url(#hcGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Status pie + employment type + recruitment funnel */}
      <div className="grid grid-cols-3 gap-5">
        <Card>
          <CardHeader><h3 className="font-display font-semibold text-white text-sm">Status Breakdown</h3></CardHeader>
          <CardBody>
            <div className="flex flex-col items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={dash.status_breakdown} cx="50%" cy="50%" outerRadius={52} dataKey="count" paddingAngle={2}>
                    {dash.status_breakdown.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full space-y-2">
                {dash.status_breakdown.map(d => (
                  <div key={d.status} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-slate-400 flex-1">{d.label}</span>
                    <span className="text-xs font-semibold text-white">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h3 className="font-display font-semibold text-white text-sm">Employment Type</h3></CardHeader>
          <CardBody>
            {employmentType.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={employmentType} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {employmentType.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h3 className="font-display font-semibold text-white text-sm">Recruitment Funnel</h3></CardHeader>
          <CardBody className="space-y-3">
            {dash.pipeline.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No active candidates</p>
            ) : dash.pipeline.map((s, i) => {
              const max = Math.max(...dash.pipeline.map(p => p.count))
              return (
                <div key={s.stage}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">{s.stage}</span>
                    <span className="font-medium text-white">{s.count}</span>
                  </div>
                  <Progress value={max ? (s.count / max) * 100 : 0} color={i === 0 ? 'bg-brand-500' : 'bg-brand-500/60'} height="h-2" />
                </div>
              )
            })}
          </CardBody>
        </Card>
      </div>

      {/* Tenure distribution + leave + locations */}
      <div className="grid grid-cols-3 gap-5">
        <Card>
          <CardHeader>
            <h3 className="font-display font-semibold text-white text-sm">Tenure Distribution</h3>
            <span className="text-xs text-slate-500">Avg {avgTenure}y</span>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={tenureBuckets} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                <XAxis dataKey="range" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="#00D4AA" radius={[3, 3, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h3 className="font-display font-semibold text-white text-sm">Leave Requests</h3></CardHeader>
          <CardBody className="space-y-4">
            <p className="text-3xl font-display font-semibold text-white">{leaveTotal}<span className="text-sm text-slate-500 font-normal"> total</span></p>
            {leaveBreakdown.map(l => (
              <div key={l.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">{l.label}</span>
                  <span className="font-medium text-white">{l.count}</span>
                </div>
                <Progress value={leaveTotal ? (l.count / leaveTotal) * 100 : 0} color={l.color} height="h-2" />
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h3 className="font-display font-semibold text-white text-sm">Locations</h3></CardHeader>
          <CardBody className="space-y-3">
            {locations.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No data</p>
            ) : locations.map(([loc, count], i) => (
              <div key={loc}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">{loc}</span>
                  <span className="font-medium text-white">{count}</span>
                </div>
                <Progress value={maxLoc ? (count / maxLoc) * 100 : 0} color={i === 0 ? 'bg-brand-500' : 'bg-brand-500/60'} height="h-2" />
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Org summary — real */}
      <Card>
        <CardHeader><h3 className="font-display font-semibold text-white text-sm">Organization Summary</h3></CardHeader>
        <CardBody>
          <div className="grid grid-cols-4 gap-6 text-center">
            <div>
              <p className="font-display text-2xl font-semibold text-white">{total}</p>
              <p className="text-xs text-slate-500 mt-1">Employees</p>
            </div>
            <div>
              <p className="font-display text-2xl font-semibold text-white">{dash.dept_headcount.length}</p>
              <p className="text-xs text-slate-500 mt-1">Departments</p>
            </div>
            <div>
              <p className="font-display text-2xl font-semibold text-white">{compactUsd(totalPayroll)}</p>
              <p className="text-xs text-slate-500 mt-1">Net payroll (latest run)</p>
            </div>
            <div>
              <p className="font-display text-2xl font-semibold text-white">{dash.reviews.submitted}/{dash.reviews.total}</p>
              <p className="text-xs text-slate-500 mt-1">Reviews submitted</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
