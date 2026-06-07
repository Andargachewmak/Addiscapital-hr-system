import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  fetchExperienceLetters,
  requestExperienceLetter,
  updateExperienceLetterStatus,
  deleteExperienceLetter,
  fetchEmployees,
} from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { ExperienceLetter, Employee } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function calcDuration(start?: string | null, end?: string | null): string {
  if (!start || !end) return '—'
  const s = new Date(start)
  const e = new Date(end)
  const diffMs = e.getTime() - s.getTime()
  if (diffMs < 0) return 'Invalid range'
  const totalMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44))
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  if (years > 0 && months > 0) return `${years}y ${months}m`
  if (years > 0) return `${years} year${years > 1 ? 's' : ''}`
  if (months > 0) return `${months} month${months > 1 ? 's' : ''}`
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return `${days} day${days !== 1 ? 's' : ''}`
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    approved: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
  }
  return map[status] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30'
}

// ─── Request Modal ─────────────────────────────────────────────────────────────
interface RequestModalProps {
  onClose: () => void
  employees: Employee[]
  isHR: boolean
  employeeId?: string
}

function RequestModal({ onClose, employees, isHR, employeeId }: RequestModalProps) {
  const qc = useQueryClient()
  const [form, setForm] = useState(() => {
    if (!isHR && employeeId && employees.length > 0) {
      const emp = employees.find(e => e.id === employeeId)
      if (emp) {
        const start = emp.start_date ?? ''
        const end = emp.status === 'terminated'
          ? emp.updated_at?.slice(0, 10) ?? ''
          : new Date().toISOString().slice(0, 10)
        return { employee_id: employeeId, purpose: '', start_date: start, end_date: end }
      }
    }
    return { employee_id: employeeId ?? '', purpose: '', start_date: '', end_date: '' }
  })

  const mutation = useMutation({
    mutationFn: requestExperienceLetter,
    onSuccess: () => {
      toast.success('Experience letter requested successfully')
      qc.invalidateQueries({ queryKey: ['experience-letters'] })
      onClose()
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to submit request'),
  })

  const selectedEmp = employees.find(e => e.id === form.employee_id)

  // The employee's actual start date is the minimum allowed; can't request before it
  const empStartDate = selectedEmp?.start_date ?? (!isHR ? employees.find(e => e.id === form.employee_id)?.start_date : undefined)

  function prefillDates(empId: string) {
    const emp = employees.find(e => e.id === empId)
    if (!emp) return
    const start = emp.start_date ?? ''
    const end = emp.status === 'terminated' ? emp.updated_at?.slice(0, 10) ?? '' : new Date().toISOString().slice(0, 10)
    setForm(f => ({ ...f, employee_id: empId, start_date: start, end_date: end }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.start_date || !form.end_date) return toast.error('Please specify start and end dates')

    // Block if employee has no actual start date on record
    if (!selectedEmp?.start_date && isHR) return toast.error('This employee has no start date on record. Update their profile first.')

    // Start date cannot be before the employee's actual joining date
    if (selectedEmp?.start_date && form.start_date < selectedEmp.start_date) {
      return toast.error(`Start date cannot be before the employee's joining date (${fmt(selectedEmp.start_date)})`)
    }

    if (new Date(form.end_date) < new Date(form.start_date)) return toast.error('End date must be after start date')

    // End date cannot be in the future beyond today
    const today = new Date().toISOString().slice(0, 10)
    if (form.end_date > today) return toast.error('End date cannot be in the future')

    mutation.mutate({
      employee_id: isHR ? form.employee_id : undefined,
      purpose: form.purpose,
      start_date: form.start_date,
      end_date: form.end_date,
    })
  }

  const duration = calcDuration(form.start_date, form.end_date)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1c23] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Request Experience Letter</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isHR && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Employee</label>
              <select
                required
                value={form.employee_id}
                onChange={e => prefillDates(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
              >
                <option value="">— Select employee —</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} · {emp.job_title}</option>
                ))}
              </select>
            </div>
          )}

          {/* No start_date warning */}
          {selectedEmp && !selectedEmp.start_date && (
            <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-3 flex items-start gap-2">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div>
                <p className="text-xs font-medium text-red-300">No start date on record</p>
                <p className="text-xs text-red-400/70 mt-0.5">
                  This employee has no joining date set. Please update their profile with a start date before requesting an experience letter.
                </p>
              </div>
            </div>
          )}

          {selectedEmp && (
            <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-semibold text-sm flex-shrink-0">
                {selectedEmp.first_name[0]}{selectedEmp.last_name[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{selectedEmp.first_name} {selectedEmp.last_name}</p>
                <p className="text-xs text-slate-400">{selectedEmp.job_title} · {selectedEmp.department}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Start Date
                {selectedEmp?.start_date && (
                  <span className="ml-1.5 text-slate-600 font-normal">(joining date — fixed)</span>
                )}
              </label>
              <input
                type="date"
                required
                value={form.start_date}
                readOnly={!!selectedEmp?.start_date}
                min={selectedEmp?.start_date || undefined}
                max={new Date().toISOString().slice(0, 10)}
                onChange={e => !selectedEmp?.start_date && setForm(f => ({ ...f, start_date: e.target.value }))}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 ${
                  selectedEmp?.start_date
                    ? 'bg-white/3 border-white/5 cursor-not-allowed opacity-70'
                    : 'bg-white/5 border-white/10'
                }`}
              />
              {selectedEmp?.start_date && (
                <p className="text-xs text-slate-600 mt-1">Locked to employee's joining date</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">End Date</label>
              <input
                type="date"
                required
                value={form.end_date}
                min={selectedEmp?.start_date || form.start_date || undefined}
                max={new Date().toISOString().slice(0, 10)}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
              />
              <p className="text-xs text-slate-600 mt-1">Cannot be in the future</p>
            </div>
          </div>

          {form.start_date && form.end_date && (
            <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-brand-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              <p className="text-xs text-brand-300">Duration: <span className="font-semibold">{duration}</span></p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Purpose <span className="text-slate-600">(optional)</span></label>
            <input
              type="text"
              placeholder="e.g. Visa application, new employer, bank loan…"
              value={form.purpose}
              onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || (!!selectedEmp && !selectedEmp.start_date)}
              className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {mutation.isPending ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Approve/Reject Modal ──────────────────────────────────────────────────────
interface ActionModalProps {
  letter: ExperienceLetter
  action: 'approve' | 'reject'
  onClose: () => void
}

function ActionModal({ letter, action, onClose }: ActionModalProps) {
  const qc = useQueryClient()
  const [reason, setReason] = useState('')

  const mutation = useMutation({
    mutationFn: () => updateExperienceLetterStatus(
      letter.id,
      action === 'approve' ? 'approved' : 'rejected',
      action === 'reject' ? reason : undefined,
    ),
    onSuccess: () => {
      toast.success(action === 'approve' ? 'Letter approved and generated' : 'Request rejected')
      qc.invalidateQueries({ queryKey: ['experience-letters'] })
      onClose()
    },
    onError: (e: Error) => toast.error(e.message || 'Action failed'),
  })

  const emp = letter.employee
  const duration = calcDuration(letter.start_date, letter.end_date)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1c23] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">
            {action === 'approve' ? 'Approve Request' : 'Reject Request'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-white/5 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-white">{emp?.first_name} {emp?.last_name}</p>
            <p className="text-xs text-slate-400">{emp?.job_title} · {emp?.department}</p>
            <div className="flex gap-4 pt-1 text-xs text-slate-400">
              <span>From: <span className="text-slate-200">{fmt(letter.start_date)}</span></span>
              <span>To: <span className="text-slate-200">{fmt(letter.end_date)}</span></span>
              <span>Duration: <span className="text-brand-400 font-medium">{duration}</span></span>
            </div>
            {letter.purpose && <p className="text-xs text-slate-400">Purpose: <span className="text-slate-200">{letter.purpose}</span></p>}
          </div>

          {action === 'approve' && (
            <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-3 text-xs text-teal-300">
              Approving will automatically generate the experience letter with the calculated duration.
            </div>
          )}

          {action === 'reject' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Reason for rejection <span className="text-slate-600">(optional)</span></label>
              <textarea
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Provide a reason…"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500 resize-none"
              />
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-colors ${
                action === 'approve' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {mutation.isPending ? 'Processing…' : action === 'approve' ? 'Approve & Generate' : 'Reject'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Letter Preview Modal ──────────────────────────────────────────────────────
function LetterPreviewModal({ letter, onClose }: { letter: ExperienceLetter; onClose: () => void }) {
  function handlePrint() {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<html><head><title>Experience Letter</title><style>
      body { font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.8; padding: 60px; max-width: 700px; margin: 0 auto; color: #111; }
      pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; }
    </style></head><body><pre>${letter.letter_content}</pre></body></html>`)
    w.document.close()
    w.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1c23] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-white">Experience Letter</h2>
            <p className="text-xs text-slate-400 mt-0.5">{letter.employee?.first_name} {letter.employee?.last_name} · Approved {fmt(letter.approved_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/20 text-brand-400 text-xs hover:bg-brand-500/30 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="overflow-y-auto p-6">
          <div className="bg-white rounded-xl p-8 shadow-inner">
            <pre className="whitespace-pre-wrap font-serif text-sm text-gray-800 leading-relaxed">{letter.letter_content}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function ExperiencePage() {
  const user = useAuth(s => s.user)
  const isHR = user?.role === 'admin' || user?.role === 'hr_director'

  const qc = useQueryClient()
  const [showRequest, setShowRequest] = useState(false)
  const [actionModal, setActionModal] = useState<{ letter: ExperienceLetter; action: 'approve' | 'reject' } | null>(null)
  const [previewLetter, setPreviewLetter] = useState<ExperienceLetter | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const { data: letters = [], isLoading } = useQuery({
    queryKey: ['experience-letters'],
    queryFn: fetchExperienceLetters,
  })

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => fetchEmployees(),
    enabled: isHR,
  })

  // For employee role, fetch their own record to check start_date
  const { data: ownEmployee } = useQuery({
    queryKey: ['employee', user?.employee_id],
    queryFn: () => import('@/lib/api').then(m => m.fetchEmployee(user!.employee_id!)),
    enabled: !isHR && !!user?.employee_id,
  })

  const canRequest = isHR || !!ownEmployee?.start_date

  const deleteMutation = useMutation({
    mutationFn: deleteExperienceLetter,
    onSuccess: () => {
      toast.success('Request cancelled')
      qc.invalidateQueries({ queryKey: ['experience-letters'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const filtered = filterStatus === 'all' ? letters : letters.filter(l => l.status === filterStatus)

  const stats = {
    total: letters.length,
    pending: letters.filter(l => l.status === 'pending').length,
    approved: letters.filter(l => l.status === 'approved').length,
    rejected: letters.filter(l => l.status === 'rejected').length,
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Experience Letters</h1>
            <p className="text-slate-400 text-sm mt-1">
              {isHR ? 'Manage and approve employee experience letter requests' : 'Request and track your experience letters'}
            </p>
          </div>
          {canRequest ? (
            <button
              onClick={() => setShowRequest(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Request Letter
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs max-w-xs text-right">
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              No start date on record — contact HR to update your profile
            </div>
          )}
        </div>

        {/* Stats */}
        {isHR && (
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total', value: stats.total, color: 'text-slate-300', bg: 'bg-white/5' },
              { label: 'Pending', value: stats.pending, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { label: 'Approved', value: stats.approved, color: 'text-teal-400', bg: 'bg-teal-500/10' },
              { label: 'Rejected', value: stats.rejected, color: 'text-red-400', bg: 'bg-red-500/10' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-white/5`}>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{s.label}</p>
                <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 bg-white/5 rounded-xl p-1 w-fit">
          {['all', 'pending', 'approved', 'rejected'].map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                filterStatus === f
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f}
              {f !== 'all' && (
                <span className="ml-1.5 text-xs opacity-70">
                  {letters.filter(l => l.status === f).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-slate-500">
              <svg className="w-5 h-5 animate-spin mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" opacity=".2"/><path d="M21 12c0-4.97-4.03-9-9-9"/>
              </svg>
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
              <svg className="w-10 h-10 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              <p className="text-sm">No {filterStatus !== 'all' ? filterStatus : ''} experience letter requests</p>
              <button onClick={() => setShowRequest(true)} className="text-brand-400 text-sm hover:underline">
                Request one now →
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Employee</th>
                  <th className="text-left px-4 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Period</th>
                  <th className="text-left px-4 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Duration</th>
                  <th className="text-left px-4 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Purpose</th>
                  <th className="text-left px-4 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Requested</th>
                  <th className="px-4 py-3.5"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(letter => {
                  const emp = letter.employee
                  const duration = calcDuration(letter.start_date, letter.end_date)
                  return (
                    <tr key={letter.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-xs font-semibold flex-shrink-0">
                            {emp ? `${emp.first_name[0]}${emp.last_name[0]}` : '??'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{emp ? `${emp.first_name} ${emp.last_name}` : '—'}</p>
                            <p className="text-xs text-slate-500">{emp?.job_title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-300 whitespace-nowrap">
                        <span className="text-slate-500">From</span> {fmt(letter.start_date)}<br/>
                        <span className="text-slate-500">To&nbsp;&nbsp;&nbsp;</span> {fmt(letter.end_date)}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-brand-400 font-medium">{duration}</span>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-400 max-w-[150px] truncate">
                        {letter.purpose || <span className="text-slate-600 italic">Not specified</span>}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${statusBadge(letter.status)}`}>
                          {letter.status}
                        </span>
                        {letter.status === 'rejected' && letter.rejection_reason && (
                          <p className="text-xs text-red-400/70 mt-1 max-w-[120px] truncate" title={letter.rejection_reason}>
                            {letter.rejection_reason}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {fmt(letter.requested_at)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 justify-end">
                          {letter.status === 'approved' && letter.letter_content && (
                            <button
                              onClick={() => setPreviewLetter(letter)}
                              title="View Letter"
                              className="p-1.5 rounded-lg text-brand-400 hover:bg-brand-500/15 transition-colors"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                            </button>
                          )}
                          {isHR && letter.status === 'pending' && (
                            <>
                              <button
                                onClick={() => setActionModal({ letter, action: 'approve' })}
                                title="Approve"
                                className="p-1.5 rounded-lg text-teal-400 hover:bg-teal-500/15 transition-colors"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              </button>
                              <button
                                onClick={() => setActionModal({ letter, action: 'reject' })}
                                title="Reject"
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/15 transition-colors"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <path d="M18 6 6 18M6 6l12 12"/>
                                </svg>
                              </button>
                            </>
                          )}
                          {(!isHR && letter.status === 'pending') && (
                            <button
                              onClick={() => deleteMutation.mutate(letter.id)}
                              title="Cancel request"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                              </svg>
                            </button>
                          )}
                          {isHR && (
                            <button
                              onClick={() => deleteMutation.mutate(letter.id)}
                              title="Delete"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showRequest && (
        <RequestModal
          onClose={() => setShowRequest(false)}
          employees={isHR ? employees : (ownEmployee ? [ownEmployee] : [])}
          isHR={isHR}
          employeeId={!isHR ? user?.employee_id ?? '' : ''}
        />
      )}

      {actionModal && (
        <ActionModal
          letter={actionModal.letter}
          action={actionModal.action}
          onClose={() => setActionModal(null)}
        />
      )}

      {previewLetter && (
        <LetterPreviewModal
          letter={previewLetter}
          onClose={() => setPreviewLetter(null)}
        />
      )}
    </div>
  )
}
