import { useState } from 'react'
import { Card, CardHeader, CardBody, Badge, Avatar, Progress, StatCard, Skeleton, Button, Modal, Input, Select } from '@/components/ui'
import { usePerformanceReviews, useGoals, useUpdateGoalProgress, useEmployees, useCreatePerformanceReview, useCreateGoal } from '@/hooks'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/permissions'
import toast from 'react-hot-toast'
import { cn, formatDate } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const SCORE_COLORS = ['#EF4444', '#EF4444', '#EF4444', '#F59E0B', '#F59E0B', '#3B82F6', '#00D4AA', '#8B85FF', '#6C63FF', '#3DD68C']

export function PerformancePage() {
  const role = useAuth((s) => s.user?.role)
  if (role === 'employee') return <MyPerformance />
  return <HRPerformance />
}

// ── Employee view: own reviews, goals and score ──────────────────────────────
function MyPerformance() {
  const { data: reviews, isLoading: reviewsLoading } = usePerformanceReviews()
  const { data: goals, isLoading: goalsLoading } = useGoals()
  const revs = reviews ?? []
  const avgScore = revs.length ? (revs.reduce((s, r) => s + r.score, 0) / revs.length).toFixed(1) : '—'
  const latest = [...revs].sort((a, b) => (b.period > a.period ? 1 : -1))[0]
  const gs = goals ?? []
  const onTrack = gs.filter((g) => g.status === 'on_track' || g.status === 'completed').length
  const onTrackPct = gs.length ? Math.round((onTrack / gs.length) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="My Avg. Score" value={`${avgScore}/10`} change={`${revs.length} review${revs.length === 1 ? '' : 's'}`} changeType="neutral" icon="⭐" accent="bg-brand-500" />
        <StatCard label="My Goals On Track" value={`${onTrackPct}%`} change={`Of ${gs.length} goal${gs.length === 1 ? '' : 's'}`} changeType="neutral" icon="🎯" accent="bg-amber-500" />
        <StatCard label="Latest Review" value={latest ? `${latest.score}/10` : '—'} change={latest ? latest.period : 'No reviews yet'} icon="📋" accent="bg-teal-500" />
      </div>

      <Card>
        <CardHeader><h3 className="font-display font-semibold text-white text-sm">My Reviews</h3></CardHeader>
        {reviewsLoading ? (
          <CardBody><Skeleton className="h-32" /></CardBody>
        ) : revs.length === 0 ? (
          <CardBody><p className="text-sm text-slate-500 text-center py-6">You don't have any performance reviews yet.</p></CardBody>
        ) : (
          <div className="divide-y divide-white/4">
            {revs.map((rev) => (
              <div key={rev.id} className="flex items-start gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-white text-sm">{rev.period}</p>
                    <Badge status={rev.status} />
                  </div>
                  {rev.comments && <p className="text-xs text-slate-400 leading-relaxed">{rev.comments}</p>}
                  <div className="flex gap-4 mt-2">
                    {[{ label: 'Goals', val: rev.goals_score }, { label: 'Skills', val: rev.skills_score }, { label: 'Culture', val: rev.culture_score }].map(({ label, val }) => (
                      <div key={label} className="text-xs"><span className="text-slate-600">{label}: </span><span className="text-slate-300 font-medium">{val}</span></div>
                    ))}
                  </div>
                </div>
                <div className="text-right"><p className="font-display text-2xl font-semibold text-white">{rev.score}</p><p className="text-xs text-slate-600">/10</p></div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader><h3 className="font-display font-semibold text-white text-sm">My Goals</h3></CardHeader>
        {goalsLoading ? (
          <CardBody><Skeleton className="h-32" /></CardBody>
        ) : gs.length === 0 ? (
          <CardBody><p className="text-sm text-slate-500 text-center py-6">No goals assigned yet.</p></CardBody>
        ) : (
          <div className="divide-y divide-white/4">
            {gs.map((goal) => {
              const statusColors: Record<string, string> = { on_track: 'bg-emerald-500', at_risk: 'bg-amber-500', completed: 'bg-teal-500', overdue: 'bg-red-500' }
              return (
                <div key={goal.id} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-white text-sm">{goal.title}</p>
                    <Badge status={goal.status} />
                  </div>
                  <p className="text-xs text-slate-500 mb-2">Due {formatDate(goal.target_date)}</p>
                  <div className="flex items-center gap-2">
                    <Progress value={goal.progress} color={statusColors[goal.status] ?? 'bg-brand-500'} height="h-1.5" className="flex-1" />
                    <span className="text-xs text-slate-500 font-medium w-9 text-right">{goal.progress}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

// ── HR / admin view ──────────────────────────────────────────────────────────
function HRPerformance() {
  const canEditGoals = can(useAuth((s) => s.user?.role), 'performance.write')
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'goals'>('overview')
  const [reviewOpen, setReviewOpen] = useState(false)
  const [goalOpen, setGoalOpen] = useState(false)
  const { data: reviews, isLoading: reviewsLoading } = usePerformanceReviews()
  const { data: goals, isLoading: goalsLoading } = useGoals()
  const { data: employees } = useEmployees()
  const updateGoal = useUpdateGoalProgress()

  async function nudgeGoal(id: string, current: number, delta: number) {
    const next = Math.max(0, Math.min(100, current + delta))
    try {
      await updateGoal.mutateAsync({ id, progress: next })
      toast.success(`Progress updated to ${next}%`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update progress')
    }
  }

  const revs = reviews ?? []
  const avgScore = revs.length ? (revs.reduce((s, r) => s + r.score, 0) / revs.length).toFixed(1) : '—'

  // Score distribution (real): count reviews per integer score 1..10
  const scoreDist = Array.from({ length: 10 }, (_, i) => ({
    range: String(i + 1),
    count: revs.filter((r) => Math.round(r.score) === i + 1).length,
    color: SCORE_COLORS[i],
  }))

  // Goal stats (real)
  const totalGoals = goals?.length ?? 0
  const onTrack = (goals ?? []).filter((g) => g.status === 'on_track' || g.status === 'completed').length
  const onTrackPct = totalGoals ? Math.round((onTrack / totalGoals) * 100) : 0

  const completedReviews = revs.filter((r) => r.status === 'submitted' || r.status === 'acknowledged').length
  const totalEmployees = employees?.length ?? 0

  // Top skills across the workforce (real): frequency of skills on employee records
  const skillCounts: Record<string, number> = {}
  for (const e of employees ?? []) for (const sk of e.skills ?? []) skillCounts[sk] = (skillCounts[sk] || 0) + 1
  const topSkills = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)
  const maxSkill = topSkills.length ? topSkills[0][1] : 0

  return (
    <div className="space-y-6">
      {/* Stats — computed from real reviews, goals and headcount */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Avg. Performance Score" value={`${avgScore}/10`} change={`Across ${revs.length} review${revs.length === 1 ? '' : 's'}`} changeType="neutral" icon="⭐" accent="bg-brand-500" />
        <StatCard label="Reviews Completed" value={`${completedReviews}/${totalEmployees || '—'}`} change={totalEmployees ? `${Math.round((completedReviews / totalEmployees) * 100)}% of employees` : 'No employees'} icon="📋" accent="bg-teal-500" />
        <StatCard label="Goals On Track" value={`${onTrackPct}%`} change={`Of ${totalGoals} active goal${totalGoals === 1 ? '' : 's'}`} changeType="neutral" icon="🎯" accent="bg-amber-500" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-2 rounded-xl p-1 w-fit">
        {(['overview', 'reviews', 'goals'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={cn('px-4 py-2 rounded-lg text-sm transition-all capitalize', activeTab === t
              ? 'bg-surface-1 text-white font-medium shadow'
              : 'text-slate-500 hover:text-slate-300'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            {/* Score Distribution */}
            <Card>
              <CardHeader><h3 className="font-display font-semibold text-white text-sm">Score Distribution</h3></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={scoreDist} margin={{ top: 4, right: 0, left: -30, bottom: 0 }}>
                    <XAxis dataKey="range" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#1a1c23', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [`${v} review${v === 1 ? '' : 's'}`, 'Count']} />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                      {scoreDist.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.8} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <h3 className="font-display font-semibold text-white text-sm">Top Performers</h3>
                <Badge status="active" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20">Q1 2026</Badge>
              </CardHeader>
              {reviewsLoading ? (
                <CardBody><Skeleton className="h-40" /></CardBody>
              ) : (
                <div className="divide-y divide-white/4">
                  {reviews?.filter(r => r.status === 'submitted').sort((a, b) => b.score - a.score).slice(0, 4).map((rev, i) => {
                    const medals = ['🥇', '🥈', '🥉', '4']
                    const colors = ['text-amber-400', 'text-slate-300', 'text-amber-600', 'text-slate-500']
                    const emp = rev.employee
                    return (
                      <div key={rev.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/2 transition-colors">
                        <span className="text-base w-6 text-center">{medals[i]}</span>
                        <Avatar name={`${emp?.first_name} ${emp?.last_name}`} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{emp?.first_name} {emp?.last_name}</p>
                          <p className="text-xs text-slate-500">{emp?.department}</p>
                        </div>
                        <div className="text-right">
                          <p className={cn('font-display text-lg font-semibold', colors[i])}>{rev.score}</p>
                          <p className="text-xs text-slate-600">score</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Top skills across the workforce (real, from employee records) */}
          <Card>
            <CardHeader>
              <h3 className="font-display font-semibold text-white text-sm">Top Skills Across the Team</h3>
              <span className="text-xs text-slate-500">By number of employees</span>
            </CardHeader>
            <CardBody className="space-y-3">
              {topSkills.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">No skills recorded on employee profiles yet.</p>
              ) : topSkills.map(([skill, count], i) => (
                <div key={skill}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-300">{skill}</span>
                    <span className="text-slate-400 font-medium">{count} {count === 1 ? 'person' : 'people'}</span>
                  </div>
                  <Progress value={maxSkill ? (count / maxSkill) * 100 : 0} color={i === 0 ? 'bg-brand-500' : 'bg-brand-500/60'} height="h-2" />
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === 'reviews' && (
        <Card>
          <CardHeader>
            <h3 className="font-display font-semibold text-white text-sm">Performance Reviews</h3>
            <Button variant="primary" size="sm" onClick={() => setReviewOpen(true)}>+ New Review</Button>
          </CardHeader>
          {reviewsLoading ? (
            <CardBody><Skeleton className="h-40" /></CardBody>
          ) : (reviews ?? []).length === 0 ? (
            <CardBody><p className="text-sm text-slate-500 text-center py-8">No reviews yet. Click "New Review" to add one.</p></CardBody>
          ) : (
            <div className="divide-y divide-white/4">
              {reviews?.map(rev => {
                const emp = rev.employee
                return (
                  <div key={rev.id} className="flex items-start gap-4 px-5 py-4 hover:bg-white/2 transition-colors">
                    <Avatar name={`${emp?.first_name} ${emp?.last_name}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-white text-sm">{emp?.first_name} {emp?.last_name}</p>
                        <span className="text-xs text-slate-500">{emp?.job_title}</span>
                        <Badge status={rev.status} />
                      </div>
                      {rev.comments && <p className="text-xs text-slate-400 leading-relaxed">{rev.comments}</p>}
                      <div className="flex gap-4 mt-2">
                        {[
                          { label: 'Goals', val: rev.goals_score },
                          { label: 'Skills', val: rev.skills_score },
                          { label: 'Culture', val: rev.culture_score },
                        ].map(({ label, val }) => (
                          <div key={label} className="text-xs">
                            <span className="text-slate-600">{label}: </span>
                            <span className="text-slate-300 font-medium">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-2xl font-semibold text-white">{rev.score}</p>
                      <p className="text-xs text-slate-600">/10</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'goals' && (
        <Card>
          <CardHeader>
            <h3 className="font-display font-semibold text-white text-sm">Active Goals</h3>
            <Button variant="primary" size="sm" onClick={() => setGoalOpen(true)}>+ New Goal</Button>
          </CardHeader>
          {goalsLoading ? (
            <CardBody><Skeleton className="h-40" /></CardBody>
          ) : (goals ?? []).length === 0 ? (
            <CardBody><p className="text-sm text-slate-500 text-center py-8">No goals yet. Click "New Goal" to assign one.</p></CardBody>
          ) : (
            <div className="divide-y divide-white/4">
              {goals?.map(goal => {
                const emp = goal.employee
                const statusColors: Record<string, string> = {
                  on_track: 'bg-emerald-500', at_risk: 'bg-amber-500',
                  completed: 'bg-teal-500', overdue: 'bg-red-500',
                }
                return (
                  <div key={goal.id} className="flex items-start gap-4 px-5 py-4 hover:bg-white/2 transition-colors">
                    <Avatar name={`${emp?.first_name} ${emp?.last_name}`} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-white text-sm">{goal.title}</p>
                        <Badge status={goal.status} />
                      </div>
                      <p className="text-xs text-slate-500 mb-2">{emp?.first_name} {emp?.last_name} · Due {formatDate(goal.target_date)}</p>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={goal.progress}
                          color={statusColors[goal.status] ?? 'bg-brand-500'}
                          height="h-1.5"
                          className="flex-1"
                        />
                        <span className="text-xs text-slate-500 font-medium w-9 text-right">{goal.progress}%</span>
                        {canEditGoals && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => nudgeGoal(goal.id, goal.progress, -10)}
                            disabled={updateGoal.isPending || goal.progress <= 0}
                            className="w-6 h-6 rounded-lg bg-surface-2 border border-white/8 text-slate-400 hover:text-white hover:border-white/20 disabled:opacity-40 transition-all flex items-center justify-center text-sm"
                          >−</button>
                          <button
                            onClick={() => nudgeGoal(goal.id, goal.progress, 10)}
                            disabled={updateGoal.isPending || goal.progress >= 100}
                            className="w-6 h-6 rounded-lg bg-surface-2 border border-white/8 text-slate-400 hover:text-brand-300 hover:border-brand-500/30 disabled:opacity-40 transition-all flex items-center justify-center text-sm"
                          >+</button>
                        </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      <NewReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} employees={employees ?? []} />
      <NewGoalModal open={goalOpen} onClose={() => setGoalOpen(false)} employees={employees ?? []} />
    </div>
  )
}

// ── Create review / goal modals (HR) ─────────────────────────────────────────
type EmpLite = { id: string; first_name: string; last_name: string; job_title?: string }

function NewReviewModal({ open, onClose, employees }: { open: boolean; onClose: () => void; employees: EmpLite[] }) {
  const create = useCreatePerformanceReview()
  const [form, setForm] = useState({ employee_id: '', period: 'Q1 2026', goals_score: '8', skills_score: '8', culture_score: '8', comments: '' })
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function submit() {
    if (!form.employee_id) { toast.error('Select an employee'); return }
    if (!form.period.trim()) { toast.error('Enter a review period'); return }
    try {
      await create.mutateAsync({
        employee_id: form.employee_id, period: form.period.trim(),
        goals_score: Number(form.goals_score), skills_score: Number(form.skills_score),
        culture_score: Number(form.culture_score), comments: form.comments.trim(),
      })
      toast.success('Review added')
      setForm({ employee_id: '', period: 'Q1 2026', goals_score: '8', skills_score: '8', culture_score: '8', comments: '' })
      onClose()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not add review') }
  }

  return (
    <Modal open={open} onClose={onClose} title="New performance review">
      <div className="space-y-4">
        <Select label="Employee" value={form.employee_id} onChange={(v) => set('employee_id', v)}
          options={[{ value: '', label: 'Select employee…' }, ...employees.map((e) => ({ value: e.id, label: `${e.first_name} ${e.last_name}${e.job_title ? ` · ${e.job_title}` : ''}` }))]} />
        <Input label="Review period" value={form.period} onChange={(e) => set('period', e.target.value)} placeholder="e.g. Q1 2026" />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Goals (0–10)" type="number" value={form.goals_score} onChange={(e) => set('goals_score', e.target.value)} />
          <Input label="Skills (0–10)" type="number" value={form.skills_score} onChange={(e) => set('skills_score', e.target.value)} />
          <Input label="Culture (0–10)" type="number" value={form.culture_score} onChange={(e) => set('culture_score', e.target.value)} />
        </div>
        <Input label="Comments" value={form.comments} onChange={(e) => set('comments', e.target.value)} placeholder="Optional summary" />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={create.isPending} onClick={submit}>Add review</Button>
        </div>
      </div>
    </Modal>
  )
}

function NewGoalModal({ open, onClose, employees }: { open: boolean; onClose: () => void; employees: EmpLite[] }) {
  const create = useCreateGoal()
  const [form, setForm] = useState({ employee_id: '', title: '', description: '', target_date: '', progress: '0' })
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function submit() {
    if (!form.employee_id) { toast.error('Select an employee'); return }
    if (!form.title.trim()) { toast.error('Enter a goal title'); return }
    try {
      await create.mutateAsync({
        employee_id: form.employee_id, title: form.title.trim(), description: form.description.trim(),
        target_date: form.target_date, progress: Number(form.progress) || 0,
      })
      toast.success('Goal added')
      setForm({ employee_id: '', title: '', description: '', target_date: '', progress: '0' })
      onClose()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not add goal') }
  }

  return (
    <Modal open={open} onClose={onClose} title="New goal">
      <div className="space-y-4">
        <Select label="Employee" value={form.employee_id} onChange={(v) => set('employee_id', v)}
          options={[{ value: '', label: 'Select employee…' }, ...employees.map((e) => ({ value: e.id, label: `${e.first_name} ${e.last_name}${e.job_title ? ` · ${e.job_title}` : ''}` }))]} />
        <Input label="Goal title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Clear KYC backlog" />
        <Input label="Description" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Optional details" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Target date" type="date" value={form.target_date} onChange={(e) => set('target_date', e.target.value)} />
          <Input label="Progress (%)" type="number" value={form.progress} onChange={(e) => set('progress', e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={create.isPending} onClick={submit}>Add goal</Button>
        </div>
      </div>
    </Modal>
  )
}
