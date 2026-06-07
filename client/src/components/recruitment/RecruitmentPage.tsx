import { useState } from 'react'
import toast from 'react-hot-toast'
import { Card, CardHeader, CardBody, Badge, Button, Avatar, Progress, StatCard, Skeleton, Modal, Input, Select } from '@/components/ui'
import { useJobPostings, useCandidates, useCreateJobPosting, useUpdateCandidateStage } from '@/hooks'
import { formatCurrency, statusLabel } from '@/lib/utils'
import { DEPARTMENTS } from '@/lib/org'
import type { EmploymentType, CandidateStage } from '@/types'

const PIPELINE = [
  { key: 'applied', name: 'Applied', color: '#6C63FF' },
  { key: 'screening', name: 'Screening', color: '#4FA3E8' },
  { key: 'interview', name: 'Interview', color: '#00D4AA' },
  { key: 'assessment', name: 'Assessment', color: '#F5A623' },
  { key: 'offer', name: 'Offer', color: '#3DD68C' },
] as const

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
]
const STAGES: { value: CandidateStage; label: string }[] = [
  { value: 'applied', label: 'Applied' },
  { value: 'screening', label: 'Screening' },
  { value: 'interview', label: 'Interview' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'offer', label: 'Offer' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
]

export function RecruitmentPage() {
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const [postOpen, setPostOpen] = useState(false)
  const { data: jobs, isLoading } = useJobPostings({ status: 'open' })
  const { data: candidates } = useCandidates()

  const cands = candidates ?? []
  const totalCandidates = cands.length
  const stageCounts = PIPELINE.map((s) => ({ ...s, count: cands.filter((c) => c.stage === s.key).length }))
  const offers = cands.filter((c) => c.stage === 'offer').length
  const funnelMax = Math.max(1, ...stageCounts.map((s) => s.count))

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Open Roles" value={jobs?.length ?? 0} change={`Across ${new Set(jobs?.map(j => j.department) ?? []).size} departments`} icon="📋" accent="bg-brand-500" />
        <StatCard label="Active Applicants" value={totalCandidates} change="In the pipeline" changeType="neutral" icon="👤" accent="bg-teal-500" />
        <StatCard label="Offers Extended" value={offers} change="Current stage" changeType="neutral" icon="🤝" accent="bg-amber-500" />
      </div>

      {/* Pipeline Funnel */}
      <Card>
        <CardHeader>
          <div><h3 className="font-display font-semibold text-white text-sm">Hiring Pipeline</h3></div>
          <div className="flex items-center gap-2">
            <Badge status="active" className="bg-brand-500/15 text-brand-400 border-brand-500/20">{totalCandidates} candidates</Badge>
            <Button variant="primary" size="sm" onClick={() => setPostOpen(true)}>+ Post Job</Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-5 gap-3">
            {stageCounts.map(stage => (
              <div key={stage.key} className="bg-surface-2 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">{stage.name}</p>
                <p className="font-display text-2xl font-semibold text-white mb-2">{stage.count}</p>
                <div className="mt-2 h-1 rounded-full bg-white/5">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(stage.count / funnelMax) * 100}%`, background: stage.color }} />
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Job Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {jobs?.map(job => (
            <JobCard
              key={job.id}
              job={job}
              candidates={(candidates ?? []).filter(c => c.job_id === job.id)}
              onClick={() => setSelectedJob(selectedJob === job.id ? null : job.id)}
              selected={selectedJob === job.id}
            />
          ))}
        </div>
      )}

      {selectedJob && <CandidatesPanel jobId={selectedJob} onClose={() => setSelectedJob(null)} />}

      <PostJobModal open={postOpen} onClose={() => setPostOpen(false)} />
    </div>
  )
}

// ─── Post Job Modal ──────────────────────────────────────────────────────────
function PostJobModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateJobPosting()
  const [form, setForm] = useState({
    title: '', department: DEPARTMENTS[0] as string, location: 'Remote',
    employment_type: 'full_time' as EmploymentType, salary_min: '', salary_max: '',
    description: '', requirements: '',
  })

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function submit() {
    if (!form.title.trim()) { toast.error('Job title is required'); return }
    try {
      await create.mutateAsync({
        title: form.title,
        department: form.department,
        location: form.location,
        employment_type: form.employment_type,
        description: form.description,
        requirements: form.requirements.split(',').map(s => s.trim()).filter(Boolean),
        salary_min: Number(form.salary_min) || 0,
        salary_max: Number(form.salary_max) || 0,
        status: 'open',
      })
      toast.success('Job posted')
      onClose()
      setForm({ title: '', department: DEPARTMENTS[0], location: 'Remote', employment_type: 'full_time', salary_min: '', salary_max: '', description: '', requirements: '' })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to post job')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Post a job" size="lg">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><Input label="Job Title *" value={form.title} onChange={e => update('title', e.target.value)} placeholder="Senior Frontend Engineer" /></div>
        <Select label="Department" value={form.department} onChange={v => update('department', v)} options={DEPARTMENTS.map(d => ({ value: d, label: d }))} />
        <Input label="Location" value={form.location} onChange={e => update('location', e.target.value)} placeholder="Remote" />
        <Select label="Employment Type" value={form.employment_type} onChange={v => update('employment_type', v as EmploymentType)} options={EMPLOYMENT_TYPES} />
        <div className="grid grid-cols-2 gap-2">
          <Input label="Salary Min" type="number" value={form.salary_min} onChange={e => update('salary_min', e.target.value)} placeholder="80000" />
          <Input label="Salary Max" type="number" value={form.salary_max} onChange={e => update('salary_max', e.target.value)} placeholder="120000" />
        </div>
        <div className="col-span-2"><Input label="Requirements (comma separated)" value={form.requirements} onChange={e => update('requirements', e.target.value)} placeholder="React, TypeScript, 5+ years" /></div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-400 tracking-wide">Description</label>
          <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3}
            placeholder="Role summary..."
            className="mt-1.5 w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/20 transition-all resize-none" />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={create.isPending} onClick={submit}>Post Job</Button>
      </div>
    </Modal>
  )
}

// ─── Job Card ────────────────────────────────────────────────────────────────
function JobCard({ job, candidates, onClick, selected }: {
  job: NonNullable<ReturnType<typeof useJobPostings>['data']>[number]
  candidates: NonNullable<ReturnType<typeof useCandidates>['data']>
  onClick: () => void
  selected: boolean
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface-1 border rounded-2xl p-5 cursor-pointer transition-all duration-200 ${
        selected ? 'border-brand-500/50 bg-brand-500/5' : 'border-white/7 hover:border-white/15 hover:-translate-y-0.5'
      }`}
    >
      <h4 className="font-display font-semibold text-white text-sm mb-2">{job.title}</h4>
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs text-slate-500 flex items-center gap-1">🏢 {job.department}</span>
        <span className="text-xs text-slate-500 flex items-center gap-1">📍 {job.location}</span>
        <span className="text-xs text-slate-500 flex items-center gap-1">💰 {formatCurrency(job.salary_min / 1000)}–{formatCurrency(job.salary_max / 1000)}k</span>
      </div>
      <Progress value={job.applicant_count} max={40} className="mb-3" />
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <div className="flex -space-x-1.5">
          {candidates.slice(0, 3).map(c => (
            <Avatar key={c.id} name={`${c.first_name} ${c.last_name}`} size="xs" className="ring-2 ring-surface-1" />
          ))}
        </div>
        <Badge status="active" className="bg-brand-500/15 text-brand-400 border-brand-500/20">
          {job.applicant_count} applicants
        </Badge>
      </div>
    </div>
  )
}

// ─── Candidates Panel ─────────────────────────────────────────────────────────
function CandidatesPanel({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const { data: candidates, isLoading } = useCandidates(jobId)
  const updateStage = useUpdateCandidateStage()

  async function changeStage(id: string, stage: CandidateStage) {
    try {
      await updateStage.mutateAsync({ id, stage })
      toast.success(`Moved to ${statusLabel(stage)}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update stage')
    }
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="font-display font-semibold text-white text-sm">Candidates</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>Close ×</Button>
      </CardHeader>
      {isLoading ? (
        <CardBody><Skeleton className="h-32" /></CardBody>
      ) : candidates?.length === 0 ? (
        <CardBody><p className="text-sm text-slate-500 text-center py-8">No candidates yet</p></CardBody>
      ) : (
        <div className="divide-y divide-white/5">
          {candidates?.map(c => (
            <div key={c.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/2 transition-colors">
              <Avatar name={`${c.first_name} ${c.last_name}`} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{c.first_name} {c.last_name}</p>
                <p className="text-xs text-slate-500">{c.email}</p>
              </div>
              {c.score && (
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{c.score}</p>
                  <p className="text-xs text-slate-500">score</p>
                </div>
              )}
              <div className="w-40">
                <Select value={c.stage} onChange={(v) => changeStage(c.id, v as CandidateStage)} options={STAGES} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
