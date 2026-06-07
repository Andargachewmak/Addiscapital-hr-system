import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn, statusBadge, statusLabel, getInitials, avatarColor } from '@/lib/utils'
import type { ColorVariant } from '@/types'

// ─── Badge ───────────────────────────────────────────────────────────────────
interface BadgeProps { status?: string; variant?: ColorVariant; children?: ReactNode; className?: string }
export function Badge({ status, variant, children, className }: BadgeProps) {
  const base = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium'
  const cls = status ? statusBadge(status) : ''
  return (
    <span className={cn(base, cls, className)}>
      {status && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      {children ?? statusLabel(status ?? '')}
    </span>
  )
}

// ─── Button ──────────────────────────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'ghost', size = 'md', loading, children, className, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-brand-500 text-white hover:bg-brand-400 active:scale-95 shadow-lg shadow-brand-500/20',
      ghost:   'bg-transparent border border-white/10 text-slate-300 hover:bg-white/5 hover:border-white/20 active:scale-95',
      danger:  'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 active:scale-95',
      success: 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 active:scale-95',
    }
    const sizes = {
      sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
      md: 'px-4 py-2 text-sm rounded-xl gap-2',
      lg: 'px-5 py-2.5 text-sm rounded-xl gap-2',
    }
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant], sizes[size], className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

// ─── Input ───────────────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; icon?: ReactNode
}
export function Input({ label, error, icon, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-slate-400 tracking-wide">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{icon}</span>}
        <input
          className={cn(
            'w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600',
            'outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/20 transition-all',
            icon && 'pl-9',
            error && 'border-red-500/50',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ─── Select ──────────────────────────────────────────────────────────────────
interface SelectProps { label?: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; className?: string }
export function Select({ label, options, value, onChange, className }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-slate-400 tracking-wide">{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(
          'w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-slate-200',
          'outline-none focus:border-brand-500/60 transition-all appearance-none cursor-pointer',
          className
        )}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps { children: ReactNode; className?: string; hover?: boolean }
export function Card({ children, className, hover }: CardProps) {
  return (
    <div className={cn(
      'bg-surface-1 border border-white/7 rounded-2xl overflow-hidden',
      hover && 'transition-all duration-200 hover:border-white/12 hover:-translate-y-0.5 cursor-pointer',
      className
    )}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('px-5 py-4 border-b border-white/7 flex items-center justify-between', className)}>
      {children}
    </div>
  )
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-5', className)}>{children}</div>
}

// ─── Avatar ──────────────────────────────────────────────────────────────────
interface AvatarProps { name: string; src?: string | null; size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string }
export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const sizes = { xs: 'w-6 h-6 text-[9px]', sm: 'w-8 h-8 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-sm' }
  if (src) return <img src={src} alt={name} className={cn('rounded-full object-cover', sizes[size], className)} />
  return (
    <div className={cn('rounded-full flex items-center justify-center font-semibold flex-shrink-0', avatarColor(name), sizes[size], className)}>
      {getInitials(name)}
    </div>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
interface ProgressProps { value: number; max?: number; color?: string; height?: string; className?: string }
export function Progress({ value, max = 100, color = 'bg-brand-500', height = 'h-1.5', className }: ProgressProps) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className={cn('bg-white/5 rounded-full overflow-hidden', height, className)}>
      <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string; value: string | number
  change?: string; changeType?: 'up' | 'down' | 'neutral'
  icon?: ReactNode; accent?: string; className?: string
}
export function StatCard({ label, value, change, changeType = 'neutral', icon, accent = 'bg-brand-500', className }: StatCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className={cn('absolute top-0 left-0 right-0 h-px', accent)} />
      <CardBody className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">{label}</p>
          {icon && (
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', accent.replace('bg-', 'bg-').replace('-500', '-500/10'))}>
              <span className={cn('text-base', accent.replace('bg-', 'text-'))}>{icon}</span>
            </div>
          )}
        </div>
        <p className="font-display text-3xl font-semibold tracking-tight text-white mb-2">{value}</p>
        {change && (
          <p className={cn('text-xs flex items-center gap-1',
            changeType === 'up' ? 'text-emerald-400' :
            changeType === 'down' ? 'text-red-400' : 'text-slate-500'
          )}>
            {changeType === 'up' && '↑'}
            {changeType === 'down' && '↓'}
            {change}
          </p>
        )}
      </CardBody>
    </Card>
  )
}

// ─── Table ───────────────────────────────────────────────────────────────────
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full', className)}>
        {children}
      </table>
    </div>
  )
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th className={cn('text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-widest border-b border-white/5 whitespace-nowrap', className)}>
      {children}
    </th>
  )
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={cn('px-4 py-3.5 text-sm text-slate-400 border-b border-white/4 align-middle', className)}>
      {children}
    </td>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description }: { icon?: ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-4xl mb-4 opacity-40">{icon}</div>}
      <p className="text-slate-400 font-medium mb-1">{title}</p>
      {description && <p className="text-sm text-slate-600">{description}</p>}
    </div>
  )
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-white/5 rounded-lg', className)} />
}

// ─── Modal ───────────────────────────────────────────────────────────────────
interface ModalProps { open: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' }
export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full bg-surface-1 border border-white/10 rounded-2xl shadow-2xl animate-scale-in', widths[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/7">
          <h3 className="font-display font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ─── Search Input ─────────────────────────────────────────────────────────────
interface SearchProps { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }
export function SearchInput({ value, onChange, placeholder = 'Search...', className }: SearchProps) {
  return (
    <div className={cn('relative', className)}>
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface-2 border border-white/8 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/20 transition-all"
      />
    </div>
  )
}
