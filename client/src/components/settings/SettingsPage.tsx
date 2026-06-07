import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Card, CardHeader, CardBody, Button, Input, Select, Badge, Avatar, Table, Th, Td, Skeleton, Modal } from '@/components/ui'
import { useAuth, type Role } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { can, ROLE_LABEL } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { fetchUsers, createUser, updateUser, deleteUser, type UserItem } from '@/lib/api'

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'admin', label: 'System Admin' },
  { value: 'hr_director', label: 'HR Director' },
  { value: 'employee', label: 'Employee' },
]

const ACCESS: Record<Role, string[]> = {
  admin: ['Full access to every module', 'Manage employees, payroll & recruitment', 'Approve leave & process payroll', 'Create, edit & delete users'],
  hr_director: ['Manage employees & recruitment', 'Approve leave & process payroll', 'Edit performance goals & documents', 'View analytics — cannot manage users'],
  employee: ['View the employee directory', 'Submit own leave requests', 'View own payroll & performance', 'Read & download documents'],
}

export function SettingsPage() {
  const user = useAuth((s) => s.user)
  const role = user?.role
  const isAdmin = can(role, 'users.manage')
  const [tab, setTab] = useState<'general' | 'users'>('general')

  const tabs: Array<{ id: 'general' | 'users'; label: string }> = [
    { id: 'general', label: 'General' },
    ...(isAdmin ? [{ id: 'users' as const, label: 'User Management' }] : []),
  ]

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Settings sub-navigation */}
      {tabs.length > 1 && (
        <div className="flex gap-1 bg-surface-2 rounded-xl p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn('px-4 py-2 rounded-lg text-sm transition-all',
                tab === t.id ? 'bg-surface-1 text-white font-medium shadow' : 'text-slate-500 hover:text-slate-300')}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'general' && (
        <>
          <Card>
            <CardHeader><h3 className="font-display font-semibold text-white text-sm">Profile</h3></CardHeader>
            <CardBody>
              <div className="flex items-center gap-4">
                <Avatar name={user?.name ?? 'User'} size="lg" />
                <div>
                  <p className="text-white font-medium">{user?.name}</p>
                  <p className="text-sm text-slate-500">{user?.email}</p>
                  <div className="mt-1.5"><Badge status="open">{role ? ROLE_LABEL[role] : ''}</Badge></div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><h3 className="font-display font-semibold text-white text-sm">Appearance</h3></CardHeader>
            <CardBody>
              <p className="text-sm text-slate-400 mb-3">Choose how the dashboard looks.</p>
              <ThemeSetting />
            </CardBody>
          </Card>

          <Card>
            <CardHeader><h3 className="font-display font-semibold text-white text-sm">Your access</h3></CardHeader>
            <CardBody>
              <ul className="space-y-2">
                {(role ? ACCESS[role] : []).map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-brand-400 mt-0.5">✓</span>{line}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </>
      )}

      {tab === 'users' && isAdmin && <UserManagement currentUserId={user?.id} />}
    </div>
  )
}

// ─── Appearance (theme) ───────────────────────────────────────────────────────
function ThemeSetting() {
  const theme = useTheme((s) => s.theme)
  const setTheme = useTheme((s) => s.setTheme)
  const opts: { id: 'dark' | 'light'; label: string; icon: string }[] = [
    { id: 'dark', label: 'Dark', icon: '🌙' },
    { id: 'light', label: 'Light', icon: '☀️' },
  ]
  return (
    <div className="inline-flex gap-1 bg-surface-2 rounded-xl p-1">
      {opts.map((o) => (
        <button
          key={o.id}
          onClick={() => setTheme(o.id)}
          className={cn('px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2',
            theme === o.id ? 'bg-surface-1 text-white font-medium shadow' : 'text-slate-500 hover:text-slate-300')}
        >
          <span>{o.icon}</span>{o.label}
        </button>
      ))}
    </div>
  )
}

// ─── User Management (admin) ──────────────────────────────────────────────────
function UserManagement({ currentUserId }: { currentUserId?: string }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('employee')
  const [editing, setEditing] = useState<UserItem | null>(null)
  const [deleting, setDeleting] = useState<UserItem | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] })

  const createMut = useMutation({
    mutationFn: createUser,
    onSuccess: () => { toast.success('User created'); invalidate(); setName(''); setEmail(''); setPassword(''); setRole('employee') },
    onError: (e: Error) => toast.error(e.message),
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => { toast.success('User deleted'); invalidate(); setDeleting(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-5">
      {/* Page heading */}
      <div>
        <h2 className="font-display text-xl font-semibold text-white">User Management</h2>
        <p className="text-sm text-slate-500 mt-0.5">Create, edit and remove the login accounts that can access the system.</p>
      </div>

      {/* Create */}
      <Card>
        <CardHeader><h3 className="font-display font-semibold text-white text-sm">Add a user</h3></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Full name" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" />
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@acgf.com" />
            <Input label="Temporary password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" />
            <Select label="Role" value={role} onChange={(v) => setRole(v as Role)} options={ROLE_OPTIONS} />
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" loading={createMut.isPending}
              onClick={() => {
                if (!name.trim() || !email.trim() || !password) return toast.error('Fill in all fields')
                if (password.length < 8) return toast.error('Password must be at least 8 characters')
                createMut.mutate({ name: name.trim(), email: email.trim(), password, role })
              }}>
              Create user
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* List + edit/delete */}
      <Card>
        <CardHeader><h3 className="font-display font-semibold text-white text-sm">Existing users</h3></CardHeader>
        {isLoading ? (
          <CardBody><div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div></CardBody>
        ) : (
          <Table>
            <thead><tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Actions</Th></tr></thead>
            <tbody>
              {(data ?? []).map(u => (
                <tr key={u.id}>
                  <Td className="text-white font-medium">{u.name}{u.id === currentUserId && <span className="ml-2 text-xs text-slate-500">(you)</span>}</Td>
                  <Td>{u.email}</Td>
                  <Td><Badge status="open">{ROLE_LABEL[u.role as Role] ?? u.role}</Badge></Td>
                  <Td>
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(u)} className="text-xs px-2 py-1 rounded-lg bg-surface-2 border border-white/8 text-slate-300 hover:text-white hover:border-white/20 transition-all">Edit</button>
                      <button
                        onClick={() => setDeleting(u)}
                        disabled={u.id === currentUserId}
                        title={u.id === currentUserId ? "You can't delete your own account" : 'Delete user'}
                        className="text-xs px-2 py-1 rounded-lg bg-surface-2 border border-white/8 text-red-400 hover:border-red-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                        Delete
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
              {(data ?? []).length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-sm text-slate-500 text-center">No users yet.</td></tr>
              )}
            </tbody>
          </Table>
        )}
      </Card>

      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} onSaved={() => { invalidate(); setEditing(null) }} />}

      {deleting && (
        <Modal open onClose={() => setDeleting(null)} title="Delete user" size="sm">
          <p className="text-sm text-slate-300">Delete the login account for <span className="text-white font-medium">{deleting.name}</span> ({deleting.email})? This removes their access but does not remove their employee record.</p>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" size="sm" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={deleteMut.isPending} onClick={() => deleteMut.mutate(deleting.id)}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function EditUserModal({ user, onClose, onSaved }: { user: UserItem; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState<Role>(user.role as Role)
  const [password, setPassword] = useState('')

  const mut = useMutation({
    mutationFn: () => updateUser(user.id, { name: name.trim(), email: email.trim(), role, ...(password ? { password } : {}) }),
    onSuccess: () => { toast.success('User updated'); onSaved() },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Modal open onClose={onClose} title={`Edit ${user.name}`} size="md">
      <div className="space-y-4">
        <Input label="Full name" value={name} onChange={e => setName(e.target.value)} />
        <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <Select label="Role" value={role} onChange={(v) => setRole(v as Role)} options={ROLE_OPTIONS} />
        <Input label="Reset password (optional)" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep current" />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" loading={mut.isPending}
            onClick={() => {
              if (!name.trim() || !email.trim()) return toast.error('Name and email are required')
              if (password && password.length < 8) return toast.error('Password must be at least 8 characters')
              mut.mutate()
            }}>
            Save changes
          </Button>
        </div>
      </div>
    </Modal>
  )
}
