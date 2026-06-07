import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { useSearchParams } from 'react-router-dom'
import { Card, Table, Th, Td, Badge, Avatar, Button, SearchInput, Modal, Input, Select, Skeleton } from '@/components/ui'
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from '@/hooks'
import { formatCurrency, formatDate, statusLabel } from '@/lib/utils'
import type { Department, EmploymentType, EmployeeStatus, Employee } from '@/types'
import { DEPARTMENTS, jobTitlesFor } from '@/lib/org'
import toast from 'react-hot-toast'

const ALL_DEPTS = ['All', ...DEPARTMENTS]

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
]

const STATUSES: { value: EmployeeStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'wfh', label: 'Work From Home' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'terminated', label: 'Terminated' },
]

export function EmployeesPage() {
  const role = useAuth((s) => s.user?.role)
  const canWrite = can(role, 'employees.write')
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState('All')
  const [addOpen, setAddOpen] = useState(false)
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null)
  const [viewEmployee, setViewEmployee] = useState<Employee | null>(null)
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null)

  // React to the header's "Add Employee" button and global search (URL params)
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    const q = searchParams.get('search')
    const isNew = searchParams.get('new')
    if (q) setSearch(q)
    if (isNew) setAddOpen(true)
    if (q || isNew) setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  const { data: employees, isLoading } = useEmployees({
    department: dept !== 'All' ? dept as Department : undefined,
    search: search || undefined,
  })

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {ALL_DEPTS.map(d => (
            <button
              key={d}
              onClick={() => setDept(d)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                dept === d
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'bg-surface-2 text-slate-500 border border-white/7 hover:text-slate-300 hover:border-white/15'
              }`}
            >
              {d} {d !== 'All' && employees && dept === d ? `(${employees.length})` : ''}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search employees..." className="w-52" />
          {canWrite && (
          <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Employee
          </Button>
          )}
        </div>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <>
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
                  <Th />
                </tr>
              </thead>
              <tbody>
                {employees?.map(emp => (
                  <tr key={emp.id} className="hover:bg-white/2 transition-colors group">
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={`${emp.first_name} ${emp.last_name}`} src={emp.avatar_url} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-white">{emp.first_name} {emp.last_name}</p>
                          <p className="text-xs text-slate-600">{emp.email}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>{emp.department}</Td>
                    <Td className="text-slate-300">{emp.job_title}</Td>
                    <Td><Badge status={emp.status} /></Td>
                    <Td>{emp.location}</Td>
                    <Td>{formatDate(emp.start_date)}</Td>
                    <Td className="font-medium text-white font-mono text-xs">{emp.salary != null ? formatCurrency(emp.salary) : <span className="text-slate-600">—</span>}</Td>
                    <Td>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm" variant="ghost"
                          className="text-xs py-1 px-2"
                          onClick={() => setViewEmployee(emp)}
                        >
                          View
                        </Button>
                        {canWrite && (<>
                        <Button
                          size="sm" variant="ghost"
                          className="text-xs py-1 px-2 text-brand-400 hover:text-brand-300 border-brand-500/20 hover:border-brand-500/40"
                          onClick={() => setEditEmployee(emp)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm" variant="danger"
                          className="text-xs py-1 px-2"
                          onClick={() => setDeleteEmployee(emp)}
                        >
                          Delete
                        </Button>
                        </>)}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <div className="px-5 py-3.5 border-t border-white/5 flex items-center justify-between">
              <p className="text-xs text-slate-600">Showing {employees?.length ?? 0} employees</p>
              <div className="flex gap-1.5">
                {['←', '1', '2', '3', '→'].map(p => (
                  <button key={p} className="w-7 h-7 rounded-lg bg-surface-2 border border-white/7 text-xs text-slate-400 hover:text-white hover:border-white/20 transition-all">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </Card>

      <AddEmployeeModal open={addOpen} onClose={() => setAddOpen(false)} />

      {editEmployee && (
        <EditEmployeeModal
          employee={editEmployee}
          onClose={() => setEditEmployee(null)}
        />
      )}

      {viewEmployee && (
        <ViewEmployeeModal
          employee={viewEmployee}
          onClose={() => setViewEmployee(null)}
          onEdit={() => { setEditEmployee(viewEmployee); setViewEmployee(null) }}
        />
      )}

      {deleteEmployee && (
        <DeleteConfirmModal
          employee={deleteEmployee}
          onClose={() => setDeleteEmployee(null)}
        />
      )}
    </div>
  )
}

// ─── Shared form type ─────────────────────────────────────────────────────────
type EmployeeForm = {
  first_name: string; last_name: string; email: string; phone: string
  department: Department; job_title: string; location: string
  start_date: string; salary: string; employment_type: EmploymentType
  status: EmployeeStatus; bio: string; skills: string
}

function emptyForm(): EmployeeForm {
  return {
    first_name: '', last_name: '', email: '', phone: '',
    department: DEPARTMENTS[0], job_title: '', location: '',
    start_date: '', salary: '', employment_type: 'full_time', status: 'active', bio: '', skills: '',
  }
}

function employeeToForm(emp: Employee): EmployeeForm {
  return {
    first_name: emp.first_name,
    last_name: emp.last_name,
    email: emp.email,
    phone: emp.phone ?? '',
    department: emp.department,
    job_title: emp.job_title,
    location: emp.location ?? '',
    start_date: emp.start_date ?? '',
    salary: String(emp.salary ?? ''),
    employment_type: emp.employment_type,
    status: emp.status,
    bio: emp.bio ?? '',
    skills: (emp.skills ?? []).join(', '),
  }
}

// ─── Employee Form Fields ─────────────────────────────────────────────────────
function EmployeeFormFields({ form, update }: { form: EmployeeForm; update: (k: string, v: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="First Name *" value={form.first_name} onChange={e => update('first_name', e.target.value)} placeholder="John" />
        <Input label="Last Name *" value={form.last_name} onChange={e => update('last_name', e.target.value)} placeholder="Smith" />
        <Input label="Email *" type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="john@company.com" />
        <Input label="Phone" type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+1 415 555 0100" />
        <Select
          label="Department"
          value={form.department}
          onChange={v => { update('department', v); update('job_title', '') }}
          options={DEPARTMENTS.map(d => ({ value: d, label: d }))}
        />
        <Select
          label="Job Title *"
          value={form.job_title}
          onChange={v => update('job_title', v)}
          options={[{ value: '', label: 'Select job title…' }, ...jobTitlesFor(form.department).map(t => ({ value: t, label: t }))]}
        />
        <Input label="Location" value={form.location} onChange={e => update('location', e.target.value)} placeholder="San Francisco" />
        <Input label="Start Date" type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)} />
        <Input label="Annual Salary" type="number" value={form.salary} onChange={e => update('salary', e.target.value)} placeholder="120000" />
        <Select
          label="Employment Type"
          value={form.employment_type}
          onChange={v => update('employment_type', v)}
          options={EMPLOYMENT_TYPES}
        />
        <Select
          label="Status"
          value={form.status}
          onChange={v => update('status', v)}
          options={STATUSES}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-400 tracking-wide">Bio</label>
        <textarea
          value={form.bio}
          onChange={e => update('bio', e.target.value)}
          placeholder="Short bio or notes about this employee..."
          rows={3}
          className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/20 transition-all resize-none"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Input label="Skills" value={form.skills} onChange={e => update('skills', e.target.value)} placeholder="Comma-separated, e.g. KYC, AML, Excel" />
        <p className="text-[11px] text-slate-600">Used for the team skills breakdown on the Performance page.</p>
      </div>
    </div>
  )
}

// ─── Add Employee Modal ───────────────────────────────────────────────────────
function AddEmployeeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createEmployee = useCreateEmployee()
  const [form, setForm] = useState<EmployeeForm>(emptyForm())
  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.first_name || !form.email || !form.job_title) {
      toast.error('Please fill required fields')
      return
    }
    try {
      await createEmployee.mutateAsync({
        ...form,
        salary: Number(form.salary),
        bio: form.bio || null,
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
        avatar_url: null,
        manager_id: null,
      })
      toast.success('Employee added successfully')
      setForm(emptyForm())
      onClose()
    } catch {
      toast.error('Failed to add employee')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add New Employee" size="lg">
      <EmployeeFormFields form={form} update={update} />
      <div className="flex justify-end gap-2 mt-6 pt-5 border-t border-white/7">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} loading={createEmployee.isPending}>
          Add Employee
        </Button>
      </div>
    </Modal>
  )
}

// ─── Edit Employee Modal ──────────────────────────────────────────────────────
function EditEmployeeModal({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const updateEmployee = useUpdateEmployee()
  const [form, setForm] = useState<EmployeeForm>(() => employeeToForm(employee))
  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.first_name || !form.email || !form.job_title) {
      toast.error('Please fill required fields')
      return
    }
    try {
      await updateEmployee.mutateAsync({
        id: employee.id,
        updates: {
          ...form,
          salary: Number(form.salary),
          bio: form.bio || null,
          skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
        },
      })
      toast.success('Employee updated successfully')
      onClose()
    } catch {
      toast.error('Failed to update employee')
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={`Edit ${employee.first_name} ${employee.last_name}`} size="lg">
      <EmployeeFormFields form={form} update={update} />
      <div className="flex justify-end gap-2 mt-6 pt-5 border-t border-white/7">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} loading={updateEmployee.isPending}>
          Save Changes
        </Button>
      </div>
    </Modal>
  )
}

// ─── View Employee Modal ──────────────────────────────────────────────────────
function ViewEmployeeModal({ employee, onClose, onEdit }: { employee: Employee; onClose: () => void; onEdit: () => void }) {
  return (
    <Modal open={true} onClose={onClose} title="Employee Details" size="lg">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-4 pb-4 border-b border-white/7">
          <Avatar name={`${employee.first_name} ${employee.last_name}`} src={employee.avatar_url} size="lg" />
          <div>
            <h3 className="text-lg font-semibold text-white">{employee.first_name} {employee.last_name}</h3>
            <p className="text-sm text-slate-400">{employee.job_title} · {employee.department}</p>
            <div className="mt-1.5">
              <Badge status={employee.status} />
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <DetailRow label="Email" value={employee.email} />
          <DetailRow label="Phone" value={employee.phone || '—'} />
          <DetailRow label="Location" value={employee.location || '—'} />
          <DetailRow label="Start Date" value={formatDate(employee.start_date)} />
          <DetailRow label="Employment Type" value={EMPLOYMENT_TYPES.find(t => t.value === employee.employment_type)?.label ?? employee.employment_type} />
          {employee.salary != null && <DetailRow label="Annual Salary" value={formatCurrency(employee.salary)} highlight />}
        </div>

        {employee.bio && (
          <div className="pt-3 border-t border-white/7">
            <p className="text-xs font-medium text-slate-400 tracking-wide mb-1.5">Bio</p>
            <p className="text-sm text-slate-300 leading-relaxed">{employee.bio}</p>
          </div>
        )}

        {employee.skills && employee.skills.length > 0 && (
          <div className="pt-3 border-t border-white/7">
            <p className="text-xs font-medium text-slate-400 tracking-wide mb-2">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {employee.skills.map(skill => (
                <span key={skill} className="px-2.5 py-0.5 rounded-full bg-surface-2 border border-white/10 text-xs text-slate-300">{skill}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-5 border-t border-white/7">
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button variant="primary" onClick={onEdit}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit Employee
        </Button>
      </div>
    </Modal>
  )
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm ${highlight ? 'text-white font-medium font-mono' : 'text-slate-200'}`}>{value}</p>
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteConfirmModal({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const deleteEmployee = useDeleteEmployee()

  async function handleDelete() {
    try {
      await deleteEmployee.mutateAsync(employee.id)
      toast.success(`${employee.first_name} ${employee.last_name} has been removed`)
      onClose()
    } catch {
      toast.error('Failed to delete employee')
    }
  }

  return (
    <Modal open={true} onClose={onClose} title="Delete Employee" size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/15">
          <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-white">{employee.first_name} {employee.last_name}</p>
            <p className="text-xs text-slate-400">{employee.job_title} · {employee.department}</p>
          </div>
        </div>
        <p className="text-sm text-slate-400">
          This will permanently remove this employee record. This action cannot be undone.
        </p>
      </div>
      <div className="flex justify-end gap-2 mt-6 pt-5 border-t border-white/7">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={handleDelete} loading={deleteEmployee.isPending}>
          Delete Employee
        </Button>
      </div>
    </Modal>
  )
}
