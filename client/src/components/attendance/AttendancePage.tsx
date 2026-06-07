import { useState } from 'react'
import { Card, CardHeader, CardBody, Badge, Button, Avatar, Progress, Table, Th, Td, Skeleton, Modal, Input, Select } from '@/components/ui'
import { useLeaveRequests, useUpdateLeaveStatus, useCreateLeaveRequest, useEmployees, useDashboard } from '@/hooks'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAttendance, markAttendance } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { cn, formatDate, statusLabel, calcWorkingDays } from '@/lib/utils'
import toast from 'react-hot-toast'

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// Build calendar cells for a given month, marking today and approved-leave days.
function buildCalendar(year: number, month: number, leaveDays: Set<number>, todayNum: number | null) {
  const days: Array<{ day: number; type: string }> = []
  const firstDay = new Date(year, month, 1).getDay() // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let i = 0; i < firstDay; i++) days.push({ day: 0, type: 'empty' })
  for (let d = 1; d <= daysInMonth; d++) {
    const type = d === todayNum ? 'today' : leaveDays.has(d) ? 'leave' : 'normal'
    days.push({ day: d, type })
  }
  return days
}

export function AttendancePage() {
  const role = useAuth((s) => s.user?.role)
  const canApprove = can(role, 'leave.approve')
  const tabs: Array<'overview' | 'daily' | 'requests'> = role === 'employee' ? ['requests'] : ['overview', 'daily', 'requests']
  const [tab, setTab] = useState<'overview' | 'daily' | 'requests'>(role === 'employee' ? 'requests' : 'overview')
  const [reqOpen, setReqOpen] = useState(false)
  const { data: leaveRequests, isLoading: leaveLoading } = useLeaveRequests()
  const updateLeave = useUpdateLeaveStatus()
  const { data: dash } = useDashboard({ enabled: role !== 'employee' })

  const now = new Date()
  const calYear = now.getFullYear()
  const calMonth = now.getMonth()
  const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const leaveDays = new Set<number>()
  for (const r of leaveRequests ?? []) {
    if (r.status !== 'approved') continue
    const s = new Date(r.start_date), e = new Date(r.end_date)
    if (isNaN(s.getTime()) || isNaN(e.getTime())) continue
    for (const d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) leaveDays.add(d.getDate())
    }
  }
  const calendar = buildCalendar(calYear, calMonth, leaveDays, now.getDate())

  async function handleLeaveAction(id: string, status: 'approved' | 'denied') {
    try {
      await updateLeave.mutateAsync({ id, status })
      toast.success(`Leave request ${status}`)
    } catch {
      toast.error('Action failed')
    }
  }

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      {tabs.length > 1 && (
      <div className="flex gap-1 bg-surface-2 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn('px-4 py-2 rounded-lg text-sm transition-all capitalize', tab === t
              ? 'bg-surface-1 text-white font-medium shadow'
              : 'text-slate-500 hover:text-slate-300'
            )}
          >
            {t === 'requests'
              ? `Leave Requests ${leaveRequests?.filter(r => r.status === 'pending').length ? `(${leaveRequests.filter(r => r.status === 'pending').length})` : ''}`
              : t === 'daily' ? 'Daily Attendance' : 'Overview'}
          </button>
        ))}
      </div>
      )}

      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            {/* Calendar */}
            <Card>
              <CardHeader>
                <div>
                  <h3 className="font-display font-semibold text-white text-sm">{monthLabel}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Approved leave this month</p>
                </div>
                <div className="flex gap-3">
                  {[
                    { color: 'bg-teal-500/30 border border-teal-500/50', label: 'Leave' },
                    { color: 'bg-brand-500 border border-brand-500', label: 'Today' },
                  ].map(({ color, label }) => (
                    <span key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className={cn('w-3 h-3 rounded', color)} />{label}
                    </span>
                  ))}
                </div>
              </CardHeader>
              <CardBody>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {DAYS.map(d => (
                    <div key={d} className="text-center text-xs text-slate-600 font-medium py-1">{d}</div>
                  ))}
                </div>
                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1">
                  {calendar.map((cell, i) => (
                    <div
                      key={i}
                      className={cn(
                        'aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all',
                        cell.type === 'empty' ? '' :
                        cell.type === 'today' ? 'bg-brand-500 text-white ring-2 ring-brand-500/50' :
                        cell.type === 'leave' ? 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 cursor-pointer' :
                        cell.type === 'wfh' ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 cursor-pointer' :
                        cell.type === 'holiday' ? 'bg-red-500/20 text-red-400' :
                        'text-slate-400 hover:bg-white/5 cursor-pointer'
                      )}
                    >
                      {cell.day || ''}
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Today's attendance breakdown */}
            <Card>
              <CardHeader>
                <h3 className="font-display font-semibold text-white text-sm">Today's Attendance</h3>
                <Badge status="active">Live</Badge>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-surface-2 rounded-xl p-4 text-center">
                    <p className="font-display text-3xl font-semibold text-emerald-400">{dash?.attendance_today.present ?? 0}</p>
                    <p className="text-xs text-slate-500 mt-1">Present today</p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-4 text-center">
                    <p className="font-display text-3xl font-semibold text-red-400">{dash?.attendance_today.absent ?? 0}</p>
                    <p className="text-xs text-slate-500 mt-1">Absent today</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {(dash?.presence ?? []).map((p) => (
                    <div key={p.label}>
                      <div className="flex justify-between text-xs mb-1.5"><span className="text-slate-400">{p.label}</span><span className="font-medium text-white">{p.count} ({p.pct}%)</span></div>
                      <Progress value={p.pct} color={p.color} height="h-2" />
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {tab === 'daily' && <DailyAttendance />}

      {tab === 'requests' && (
        <Card>
          <CardHeader>
            <h3 className="font-display font-semibold text-white text-sm">Leave Requests</h3>
            <Button variant="primary" size="sm" onClick={() => setReqOpen(true)}>+ New Request</Button>
          </CardHeader>
          {leaveLoading ? (
            <CardBody><div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div></CardBody>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Employee</Th>
                  <Th>Leave Type</Th>
                  <Th>Dates</Th>
                  <Th>Days</Th>
                  <Th>Reason</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests?.map(req => (
                  <tr key={req.id} className="hover:bg-white/2 transition-colors">
                    <Td>
                      <div className="flex items-center gap-2">
                        <Avatar name={`${req.employee?.first_name} ${req.employee?.last_name}`} size="xs" />
                        <span className="text-sm text-white">{req.employee?.first_name} {req.employee?.last_name}</span>
                      </div>
                    </Td>
                    <Td className="capitalize">{statusLabel(req.leave_type)}</Td>
                    <Td className="text-slate-300">{formatDate(req.start_date, 'short')} – {formatDate(req.end_date, 'short')}</Td>
                    <Td>{req.days}d</Td>
                    <Td className="max-w-xs truncate">{req.reason ?? '—'}</Td>
                    <Td><Badge status={req.status} /></Td>
                    <Td>
                      {req.status === 'pending' && canApprove ? (
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="success"
                            loading={updateLeave.isPending}
                            onClick={() => handleLeaveAction(req.id, 'approved')}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            loading={updateLeave.isPending}
                            onClick={() => handleLeaveAction(req.id, 'denied')}
                          >
                            Deny
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      <NewLeaveModal open={reqOpen} onClose={() => setReqOpen(false)} />
    </div>
  )
}

// ─── New Leave Request Modal ──────────────────────────────────────────────────
const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual' },
  { value: 'sick', label: 'Sick' },
  { value: 'personal', label: 'Personal' },
  { value: 'maternity', label: 'Maternity' },
  { value: 'paternity', label: 'Paternity' },
  { value: 'unpaid', label: 'Unpaid' },
] as const

function NewLeaveModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useAuth((s) => s.user)
  const isEmployee = user?.role === 'employee'
  const { data: employees } = useEmployees()
  const create = useCreateLeaveRequest()
  const [employeeId, setEmployeeId] = useState('')
  const [leaveType, setLeaveType] = useState<typeof LEAVE_TYPES[number]['value']>('annual')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [reason, setReason] = useState('')

  const empOptions = [
    { value: '', label: 'Select employee…' },
    ...(employees ?? []).map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` })),
  ]
  const days = start && end && new Date(end) >= new Date(start) ? calcWorkingDays(start, end) : 0

  async function submit() {
    // Employees always file for themselves; the server enforces this regardless of input.
    const targetId = isEmployee ? (user?.employee_id ?? '') : employeeId
    if (!isEmployee && !targetId) { toast.error('Please select an employee'); return }
    if (!start || !end) { toast.error('Start and end dates are required'); return }
    if (days <= 0) { toast.error('End date must be on or after start date'); return }
    try {
      await create.mutateAsync({
        employee_id: targetId,
        leave_type: leaveType,
        start_date: start,
        end_date: end,
        days,
        reason: reason || undefined,
        status: 'pending',
      })
      toast.success('Leave request submitted')
      onClose()
      setEmployeeId(''); setLeaveType('annual'); setStart(''); setEnd(''); setReason('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit request')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New leave request" size="md">
      <div className="flex flex-col gap-4">
        {isEmployee ? (
          <Input label="Employee" value={user?.name ?? 'You'} readOnly />
        ) : (
          <Select label="Employee" value={employeeId} onChange={setEmployeeId} options={empOptions} />
        )}
        <div className="grid grid-cols-2 gap-4">
          <Select label="Leave Type" value={leaveType} onChange={(v) => setLeaveType(v as typeof leaveType)} options={LEAVE_TYPES.map(t => ({ value: t.value, label: t.label }))} />
          <Input label="Working Days" value={days ? `${days}` : '—'} readOnly />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Start Date" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          <Input label="End Date" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={create.isPending} onClick={submit}>Submit request</Button>
        </div>
      </div>
    </Modal>
  )
}


function DailyAttendance() {
  const qc = useQueryClient()
  const role = useAuth((s) => s.user?.role)
  const canMark = can(role, 'attendance.mark')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  const { data: employees, isLoading: empLoading } = useEmployees()
  const { data: records, isLoading: recLoading } = useQuery({
    queryKey: ['attendance', date],
    queryFn: () => fetchAttendance(date),
  })
  const mark = useMutation({
    mutationFn: markAttendance,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', date] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const statusOf = (id: string) => records?.find(r => r.employee_id === id)?.status
  const list = employees ?? []
  const present = list.filter(e => statusOf(e.id) === 'present').length
  const absent = list.filter(e => statusOf(e.id) === 'absent').length
  const unmarked = list.length - present - absent
  const loading = empLoading || recLoading

  return (
    <Card>
      <CardHeader>
        <div>
          <h3 className="font-display font-semibold text-white text-sm">Daily Attendance</h3>
          <p className="text-xs text-slate-500 mt-0.5">{canMark ? 'Mark each employee present or absent' : 'Your attendance for the selected day'}</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="bg-surface-2 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-brand-500/40 [color-scheme:dark]"
        />
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-surface-2 rounded-xl p-3 text-center">
            <p className="font-display text-2xl font-semibold text-emerald-400">{present}</p>
            <p className="text-xs text-slate-500 mt-0.5">Present</p>
          </div>
          <div className="bg-surface-2 rounded-xl p-3 text-center">
            <p className="font-display text-2xl font-semibold text-red-400">{absent}</p>
            <p className="text-xs text-slate-500 mt-0.5">Absent</p>
          </div>
          <div className="bg-surface-2 rounded-xl p-3 text-center">
            <p className="font-display text-2xl font-semibold text-slate-400">{unmarked}</p>
            <p className="text-xs text-slate-500 mt-0.5">Unmarked</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <Table>
            <thead><tr><Th>Employee</Th><Th>Department</Th><Th>Status</Th>{canMark && <Th>Mark</Th>}</tr></thead>
            <tbody>
              {list.map(emp => {
                const st = statusOf(emp.id)
                return (
                  <tr key={emp.id} className="hover:bg-white/2 transition-colors">
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0',
                          st === 'present' ? 'bg-emerald-400' : st === 'absent' ? 'bg-red-400' : 'bg-slate-600')} />
                        <Avatar name={`${emp.first_name} ${emp.last_name}`} src={emp.avatar_url} size="sm" />
                        <span className="text-sm font-medium text-white">{emp.first_name} {emp.last_name}</span>
                      </div>
                    </Td>
                    <Td>{emp.department}</Td>
                    <Td>
                      <span className={cn('inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border',
                        st === 'present' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                        : st === 'absent' ? 'bg-red-500/15 text-red-400 border-red-500/20'
                        : 'bg-slate-500/15 text-slate-400 border-slate-500/20')}>
                        {st === 'present' ? 'Present' : st === 'absent' ? 'Absent' : 'Not marked'}
                      </span>
                    </Td>
                    {canMark && (
                      <Td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => mark.mutate({ employee_id: emp.id, date, status: 'present' })}
                            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                              st === 'present'
                                ? 'bg-emerald-500 text-white border-emerald-500'
                                : 'bg-surface-2 text-emerald-400 border-emerald-500/30 hover:border-emerald-500/60')}
                          >Present</button>
                          <button
                            onClick={() => mark.mutate({ employee_id: emp.id, date, status: 'absent' })}
                            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                              st === 'absent'
                                ? 'bg-red-500 text-white border-red-500'
                                : 'bg-surface-2 text-red-400 border-red-500/30 hover:border-red-500/60')}
                          >Absent</button>
                        </div>
                      </Td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </CardBody>
    </Card>
  )
}

