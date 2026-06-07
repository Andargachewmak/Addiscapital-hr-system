import { useNavigate } from 'react-router-dom'
import { StatCard, Card, CardHeader, CardBody, Badge, Progress, Skeleton, EmptyState } from '@/components/ui'
import { useDashboard } from '@/hooks'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

const TOOLTIP_STYLE = { background: '#1a1c23', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, fontSize: 12, color: '#e2e8f0' }

export function DashboardPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useDashboard()

  if (isLoading) return <DashboardSkeleton />
  const stats = data!

  const activeCount = stats.status_breakdown.find(s => s.status === 'active')?.count ?? 0
  const pipelineTotal = stats.pipeline.reduce((a, b) => a + b.count, 0)
  const totalLeave = stats.pending_leave + stats.approved_leave + stats.denied_leave
  const trendFirst = stats.headcount_trend[0]?.count ?? 0
  const trendLast = stats.headcount_trend[stats.headcount_trend.length - 1]?.count ?? 0
  const trendDelta = trendLast - trendFirst
  const reviewPct = stats.reviews.total ? Math.round((stats.reviews.submitted / stats.reviews.total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Announcement Banner — real review progress */}
      <div onClick={() => navigate('/performance')} className="flex items-start gap-4 bg-brand-500/8 border border-brand-500/20 rounded-2xl px-5 py-4 cursor-pointer hover:border-brand-500/35 transition-colors">
        <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center text-base flex-shrink-0">📣</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm mb-0.5">Performance Reviews</p>
          <p className="text-sm text-slate-400">{stats.reviews.submitted} of {stats.reviews.total} reviews submitted ({reviewPct}%).</p>
        </div>
        <Badge status="pending" className="flex-shrink-0 mt-0.5">{Math.max(stats.reviews.total - stats.reviews.submitted, 0)} pending</Badge>
      </div>

      {/* Stat Cards — all real */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={stats.total_employees} change={`${activeCount} active`} changeType="neutral" icon="👥" accent="bg-brand-500" />
        <StatCard label="Attendance Today" value={`${stats.attendance_today.rate}%`} change={`${stats.attendance_today.present} present · ${stats.attendance_today.absent} absent`} changeType={stats.attendance_today.rate >= 80 ? 'up' : 'neutral'} icon="✓" accent="bg-teal-500" />
        <StatCard label="Open Positions" value={stats.open_positions} change={`${pipelineTotal} candidates`} changeType="neutral" icon="⚡" accent="bg-amber-500" />
        <StatCard label="Pending Leave" value={stats.pending_leave} change={`${stats.approved_leave} approved`} changeType="neutral" icon="🗓" accent="bg-red-500" />
      </div>

      {/* Row 2: Department + Headcount trend */}
      <div className="grid grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <div>
              <h3 className="font-display font-semibold text-white text-sm">Headcount by Department</h3>
              <p className="text-xs text-slate-500 mt-0.5">{stats.total_employees} employees</p>
            </div>
            <Badge status="active">Live</Badge>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={stats.dept_headcount} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="count" paddingAngle={2}>
                    {stats.dept_headcount.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 flex-1">
                {stats.dept_headcount.map((d) => (
                  <div key={d.department} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-slate-400 flex-1 truncate">{d.department}</span>
                    <span className="text-xs font-semibold text-white">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <h3 className="font-display font-semibold text-white text-sm">Headcount Trend</h3>
              <p className="text-xs text-slate-500 mt-0.5">Last 6 months (by start date)</p>
            </div>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={stats.headcount_trend} margin={{ top: 4, right: 0, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id="headGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: 'rgba(108,99,255,0.3)', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="count" stroke="#6C63FF" strokeWidth={2} fill="url(#headGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex justify-between text-xs text-slate-500 mt-1 px-1">
              <span>{trendLast} employees</span>
              <span className={trendDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {trendDelta >= 0 ? '+' : ''}{trendDelta} in 6 mo
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Row 3: Activity + Upcoming */}
      <div className="grid grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <h3 className="font-display font-semibold text-white text-sm">Recent Activity</h3>
          </CardHeader>
          <CardBody className="p-0">
            {stats.activity_feed.length === 0 ? (
              <div className="px-5 py-8"><EmptyState icon="🕓" title="No recent activity" /></div>
            ) : stats.activity_feed.map((item, i) => (
              <div key={item.id} className={`flex gap-3 px-5 py-3.5 ${i < stats.activity_feed.length - 1 ? 'border-b border-white/4' : ''}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${item.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-medium">$1</strong>') }} />
                  <p className="text-xs text-slate-600 mt-0.5">{item.time} · {item.dept}</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-display font-semibold text-white text-sm">Upcoming Leave</h3>
            <Badge status="active" className="bg-teal-500/15 text-teal-400 border-teal-500/20">{stats.upcoming_events.length} upcoming</Badge>
          </CardHeader>
          <CardBody className="p-0">
            {stats.upcoming_events.length === 0 ? (
              <div className="px-5 py-8"><EmptyState icon="📅" title="Nothing scheduled" /></div>
            ) : stats.upcoming_events.map((evt, i) => (
              <div key={evt.id} className={`flex gap-3 px-5 py-3.5 ${i < stats.upcoming_events.length - 1 ? 'border-b border-white/4' : ''}`}>
                <div className={`w-0.5 self-stretch rounded-full flex-shrink-0 ${evt.color.replace('border-', 'bg-')}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{evt.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 capitalize">{evt.date} · {evt.time}</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Row 4: Presence + Pipeline + Leave overview — all real */}
      <div className="grid grid-cols-3 gap-5">
        <Card>
          <CardHeader><h3 className="font-display font-semibold text-white text-sm">Today's Presence</h3></CardHeader>
          <CardBody className="space-y-3">
            {stats.presence.map((p) => (
              <div key={p.label}>
                <div className="flex justify-between text-xs mb-1.5"><span className="text-slate-400">{p.label}</span><span className="font-medium text-white">{p.count} ({p.pct}%)</span></div>
                <Progress value={p.pct} color={p.color} />
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h3 className="font-display font-semibold text-white text-sm">Recruitment Pipeline</h3></CardHeader>
          <CardBody>
            {stats.pipeline.length === 0 ? (
              <div className="py-6"><EmptyState icon="🧩" title="No candidates yet" /></div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={90}>
                  <BarChart data={stats.pipeline} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                    <XAxis dataKey="stage" tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" fill="#6C63FF" opacity={0.7} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-slate-500 mt-2 text-center">{pipelineTotal} candidates in pipeline</p>
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h3 className="font-display font-semibold text-white text-sm">Leave Overview</h3></CardHeader>
          <CardBody className="space-y-4">
            <LeaveRow label="Pending" value={stats.pending_leave} total={totalLeave} color="bg-amber-500" />
            <LeaveRow label="Approved" value={stats.approved_leave} total={totalLeave} color="bg-emerald-500" />
            <LeaveRow label="Denied" value={stats.denied_leave} total={totalLeave} color="bg-red-500" />
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function LeaveRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5"><span className="text-slate-400">{label}</span><span className="font-medium text-white">{value}</span></div>
      <Progress value={pct} color={color} height="h-2" />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 rounded-2xl" />
      <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      <div className="grid grid-cols-2 gap-5">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}</div>
      <div className="grid grid-cols-2 gap-5">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}</div>
    </div>
  )
}
