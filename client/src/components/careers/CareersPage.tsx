import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Card, CardBody, Badge, Button, Skeleton, EmptyState } from '@/components/ui'
import { fetchOpenJobs, applyToJob, type OpenJob } from '@/lib/api'
import { formatDate } from '@/lib/utils'

export function CareersPage() {
  const qc = useQueryClient()
  const { data: jobs, isLoading } = useQuery({ queryKey: ['open-jobs'], queryFn: fetchOpenJobs })

  const apply = useMutation({
    mutationFn: (jobId: string) => applyToJob(jobId),
    onSuccess: () => { toast.success('Application submitted'); qc.invalidateQueries({ queryKey: ['open-jobs'] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-white">Open Roles</h2>
        <p className="text-sm text-slate-500 mt-0.5">Internal openings you can apply to. Your application goes straight to the hiring pipeline.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
      ) : (jobs ?? []).length === 0 ? (
        <EmptyState title="No open roles right now" description="Check back later — new openings are posted here." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(jobs ?? []).map((job) => (
            <JobCard key={job.id} job={job} applying={apply.isPending} onApply={() => apply.mutate(job.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function fmtRange(min: number, max: number) {
  if (!min && !max) return null
  const f = (n: number) => `$${(n / 1000).toFixed(0)}K`
  if (min && max) return `${f(min)} – ${f(max)}`
  return f(min || max)
}

function JobCard({ job, applying, onApply }: { job: OpenJob; applying: boolean; onApply: () => void }) {
  const range = fmtRange(job.salary_min, job.salary_max)
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-white text-sm">{job.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{job.department}{job.location ? ` · ${job.location}` : ''}</p>
          </div>
          <Badge status="open">{job.employment_type.replace('_', ' ')}</Badge>
        </div>

        {job.description && <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{job.description}</p>}

        {job.requirements?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {job.requirements.slice(0, 5).map((r) => (
              <span key={r} className="text-[11px] px-2 py-0.5 rounded-full bg-surface-2 border border-white/8 text-slate-400">{r}</span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-slate-500">
            {range && <span className="text-slate-300 font-medium">{range}</span>}
            <span className="block text-slate-600 mt-0.5">Posted {formatDate(job.created_at, 'short')}</span>
          </div>
          {job.applied ? (
            <Badge status="active" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20">✓ Applied</Badge>
          ) : (
            <Button variant="primary" size="sm" loading={applying} onClick={onApply}>Apply</Button>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
