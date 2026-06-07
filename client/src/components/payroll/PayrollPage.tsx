import { Card, CardHeader, CardBody, Badge, Button, StatCard, Avatar, Progress, Table, Th, Td, Skeleton } from '@/components/ui'
import toast from 'react-hot-toast'
import { usePayroll, useEmployees } from '@/hooks'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { PayrollRecord } from '@/types'

const DEPT_COLORS = ['#6C63FF', '#00D4AA', '#F5A623', '#E86FA0', '#3DD68C', '#3B82F6', '#FF5F5F', '#8B85FF', '#4FA3E8']
const compactUsd = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `$${(n / 1_000).toFixed(1)}K` : `$${Math.round(n)}`

export function PayrollPage() {
  const role = useAuth((s) => s.user?.role)
  const canProcess = can(role, 'payroll.process')
  const { data: records, isLoading } = usePayroll()

  // Employees only see their own payslips — no company-wide stats or comparisons.
  if (role === 'employee') return <MyPayroll records={records} isLoading={isLoading} />

  const recs = records ?? []
  const totalPayroll = recs.reduce((s, r) => s + r.net_pay, 0)
  const totalBonus = recs.reduce((s, r) => s + r.bonus, 0)
  const totalDeductions = recs.reduce((s, r) => s + r.deductions, 0)
  const avgNet = recs.length ? Math.round(totalPayroll / recs.length) : 0

  // Net pay grouped by department (real)
  const deptTotals: Record<string, number> = {}
  for (const r of recs) { const d = r.employee?.department ?? 'Unknown'; deptTotals[d] = (deptTotals[d] || 0) + r.net_pay }
  const deptPayroll = Object.entries(deptTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([dept, amount], i) => ({ dept, amount, pct: totalPayroll ? Math.round((amount / totalPayroll) * 100) : 0, color: DEPT_COLORS[i % DEPT_COLORS.length] }))

  // Net pay grouped by pay period month (real)
  const monthTotals: Record<string, number> = {}
  for (const r of recs) {
    const key = r.period_end ? new Date(r.period_end).toLocaleString('en-US', { month: 'short', year: '2-digit' }) : '—'
    monthTotals[key] = (monthTotals[key] || 0) + r.net_pay
  }
  const monthly = Object.entries(monthTotals).map(([month, amount]) => ({ month, amount }))

  function exportCsv() {
    if (!records?.length) { toast.error('No records to export'); return }
    const header = ['Employee', 'Department', 'Base Salary', 'Bonus', 'Deductions', 'Net Pay', 'Status']
    const rows = records.map(r => [
      `${r.employee?.first_name ?? ''} ${r.employee?.last_name ?? ''}`.trim(),
      r.employee?.department ?? '',
      r.base_salary, r.bonus, r.deductions, r.net_pay, r.status,
    ])
    const csv = [header, ...rows].map(line => line.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'payroll-export.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Payroll exported')
  }

  return (
    <div className="space-y-6">
      {/* Stats — computed from real payroll records */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Net Payroll" value={compactUsd(totalPayroll)} change={`${recs.length} payslip${recs.length === 1 ? '' : 's'}`} changeType="neutral" icon="💰" accent="bg-teal-500" />
        <StatCard label="Avg. Net Pay" value={compactUsd(avgNet)} change="Per payslip" icon="📊" accent="bg-brand-500" />
        <StatCard label="Bonuses Paid" value={compactUsd(totalBonus)} change="This run" changeType={totalBonus > 0 ? 'up' : 'neutral'} icon="🎯" accent="bg-amber-500" />
        <StatCard label="Total Deductions" value={compactUsd(totalDeductions)} change="Tax & benefits" changeType="down" icon="🛡" accent="bg-red-500" />
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Top Compensations */}
        <Card>
          <CardHeader>
            <h3 className="font-display font-semibold text-white text-sm">Top Compensations</h3>
            <Badge status="processed" className="bg-brand-500/15 text-brand-400 border-brand-500/20">Latest run</Badge>
          </CardHeader>
          {isLoading ? (
            <CardBody><div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div></CardBody>
          ) : (
            <div className="divide-y divide-white/4">
              {records?.sort((a, b) => (b.base_salary + b.bonus) - (a.base_salary + a.bonus)).slice(0, 6).map((rec, i) => {
                const emp = rec.employee
                if (!emp) return null
                const gross = rec.base_salary + rec.bonus
                return (
                  <div key={rec.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/2 transition-colors">
                    <span className="text-sm text-slate-600 w-4 text-center font-mono">{i + 1}</span>
                    <Avatar name={`${emp.first_name} ${emp.last_name}`} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{emp.first_name} {emp.last_name}</p>
                      <p className="text-xs text-slate-500">{emp.job_title} · {emp.department}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-sm font-semibold text-white">{formatCurrency(gross)}</p>
                      {rec.bonus > 0 && <p className="text-xs text-emerald-400">+{formatCurrency(rec.bonus)} bonus</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Payroll by Department */}
        <Card>
          <CardHeader>
            <h3 className="font-display font-semibold text-white text-sm">Payroll by Department</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            {deptPayroll.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No payroll data yet.</p>
            ) : deptPayroll.map(d => (
              <div key={d.dept}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">{d.dept}</span>
                  <span className="text-white font-medium">{compactUsd(d.amount)} · {d.pct}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.pct}%`, background: d.color }} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <h3 className="font-display font-semibold text-white text-sm">Net Payroll by Period</h3>
          <span className="text-xs text-slate-500">Total net pay per pay period</span>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={monthly} margin={{ top: 4, right: 0, left: -10, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => compactUsd(Number(v))} width={56} />
              <Tooltip
                contentStyle={{ background: '#1a1c23', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => [compactUsd(v), 'Net payroll']}
              />
              <Bar dataKey="amount" fill="#6C63FF" radius={[4, 4, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {/* Full Payroll Table */}
      <Card>
        <CardHeader>
          <h3 className="font-display font-semibold text-white text-sm">Payroll Records</h3>
          <div className="flex items-center gap-2">
            <Badge status="processed">All Processed</Badge>
            {canProcess && (
            <Button size="sm" variant="ghost" onClick={exportCsv}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </Button>
            )}
          </div>
        </CardHeader>
        <Table>
          <thead>
            <tr>
              <Th>Employee</Th>
              <Th>Base Salary</Th>
              <Th>Bonus</Th>
              <Th>Deductions</Th>
              <Th>Net Pay</Th>
              <Th>Status</Th>
              <Th>Processed</Th>
            </tr>
          </thead>
          <tbody>
            {records?.map(rec => {
              const emp = rec.employee
              if (!emp) return null
              return (
                <tr key={rec.id} className="hover:bg-white/2 transition-colors">
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={`${emp.first_name} ${emp.last_name}`} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-white">{emp.first_name} {emp.last_name}</p>
                        <p className="text-xs text-slate-500">{emp.department}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="font-mono text-xs">{formatCurrency(rec.base_salary)}</Td>
                  <Td className="font-mono text-xs text-emerald-400">{rec.bonus > 0 ? `+${formatCurrency(rec.bonus)}` : '—'}</Td>
                  <Td className="font-mono text-xs text-red-400">-{formatCurrency(rec.deductions)}</Td>
                  <Td className="font-mono text-xs font-semibold text-white">{formatCurrency(rec.net_pay)}</Td>
                  <Td><Badge status={rec.status} /></Td>
                  <Td className="text-xs">{rec.processed_at ? formatDate(rec.processed_at) : '—'}</Td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}

// ─── Employee self-service payroll: only their own payslips ───────────────────
function MyPayroll({ records, isLoading }: { records?: PayrollRecord[]; isLoading: boolean }) {
  const { data: employees } = useEmployees()
  const me = employees?.[0]
  const sorted = [...(records ?? [])].sort(
    (a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime(),
  )
  const latest = sorted[0]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-white">My Payroll</h2>
        <p className="text-sm text-slate-500 mt-0.5">Your details and personal payroll history</p>
      </div>

      {/* My details — own record only */}
      <Card>
        <CardHeader>
          <h3 className="font-display font-semibold text-white text-sm">My Details</h3>
        </CardHeader>
        {me ? (
          <Table>
            <thead>
              <tr>
                <Th>Employee</Th>
                <Th>Department</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Location</Th>
                <Th>Start Date</Th>
                <Th>Salary</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={`${me.first_name} ${me.last_name}`} size="sm" />
                    <span className="text-sm text-white font-medium">{me.first_name} {me.last_name}</span>
                  </div>
                </Td>
                <Td className="text-sm text-slate-300">{me.department || '—'}</Td>
                <Td className="text-sm text-slate-300">{me.job_title || '—'}</Td>
                <Td><Badge status={me.status} /></Td>
                <Td className="text-sm text-slate-300">{me.location || '—'}</Td>
                <Td className="text-sm text-slate-300">{me.start_date ? formatDate(me.start_date, 'short') : '—'}</Td>
                <Td className="font-mono text-xs font-semibold text-white">{me.salary ? formatCurrency(me.salary) : '—'}</Td>
              </tr>
            </tbody>
          </Table>
        ) : (
          <CardBody><p className="text-sm text-slate-500 text-center py-6">Your employee profile isn't available yet.</p></CardBody>
        )}
      </Card>

      <div>
        <h3 className="font-display text-sm font-semibold text-white">My Payslips</h3>
        <p className="text-sm text-slate-500 mt-0.5">Net pay is calculated after 35% tax</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : !latest ? (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500 text-center py-8">No payslips have been issued to you yet.</p>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Latest Net Pay" value={formatCurrency(latest.net_pay)} change={`Period ending ${formatDate(latest.period_end, 'short')}`} icon="💰" accent="bg-teal-500" />
            <StatCard label="Latest Bonus" value={latest.bonus > 0 ? formatCurrency(latest.bonus) : '—'} change="This period" icon="🎯" accent="bg-amber-500" />
            <StatCard label="Latest Deductions" value={formatCurrency(latest.deductions)} change="Tax & benefits" icon="🛡" accent="bg-red-500" />
          </div>

          <Card>
            <CardHeader>
              <h3 className="font-display font-semibold text-white text-sm">Payslip History</h3>
              <Badge status="processed">{sorted.length} record{sorted.length === 1 ? '' : 's'}</Badge>
            </CardHeader>
            <Table>
              <thead>
                <tr>
                  <Th>Period</Th>
                  <Th>Base Salary</Th>
                  <Th>Bonus</Th>
                  <Th>Deductions</Th>
                  <Th>Net Pay</Th>
                  <Th>Status</Th>
                  <Th>Processed</Th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((rec) => (
                  <tr key={rec.id} className="hover:bg-white/2 transition-colors">
                    <Td className="text-sm text-white">{formatDate(rec.period_start, 'short')} – {formatDate(rec.period_end, 'short')}</Td>
                    <Td className="font-mono text-xs">{formatCurrency(rec.base_salary)}</Td>
                    <Td className="font-mono text-xs text-emerald-400">{rec.bonus > 0 ? `+${formatCurrency(rec.bonus)}` : '—'}</Td>
                    <Td className="font-mono text-xs text-red-400">-{formatCurrency(rec.deductions)}</Td>
                    <Td className="font-mono text-xs font-semibold text-white">{formatCurrency(rec.net_pay)}</Td>
                    <Td><Badge status={rec.status} /></Td>
                    <Td className="text-xs">{rec.processed_at ? formatDate(rec.processed_at) : '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      )}
    </div>
  )
}
