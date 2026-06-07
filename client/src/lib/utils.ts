import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ColorVariant, Department } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency = 'ETB'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(date: string | Date, format: 'short' | 'long' | 'relative' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (format === 'relative') {
    const diff = Date.now() - d.getTime()
    const hours = Math.floor(diff / 3600000)
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    return `${Math.floor(days / 30)}mo ago`
  }
  return d.toLocaleDateString('en-US', {
    month: format === 'long' ? 'long' : 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export const DEPT_COLORS: Record<string, ColorVariant> = {
  'Internal Audit': 'purple',
  'Risk and Compliance': 'teal',
  'Secretary': 'amber',
  'Information Technology': 'blue',
  'Plan, Marketing and Promotion': 'pink',
  'Legal': 'purple',
  'Ethics Officer': 'blue',
  'Operation': 'green',
  'Branch Operations': 'blue',
  'Finance': 'red',
  'Procurement': 'amber',
  'HR': 'teal',
}

export const COLOR_MAP: Record<ColorVariant, {
  bg: string; text: string; border: string; dot: string; badge: string
}> = {
  purple: {
    bg: 'bg-brand-500/10',
    text: 'text-brand-400',
    border: 'border-brand-500/30',
    dot: 'bg-brand-400',
    badge: 'bg-brand-500/15 text-brand-400 border border-brand-500/20',
  },
  teal: {
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    border: 'border-teal-500/30',
    dot: 'bg-teal-400',
    badge: 'bg-teal-500/15 text-teal-400 border border-teal-500/20',
  },
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  },
  red: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/30',
    dot: 'bg-red-400',
    badge: 'bg-red-500/15 text-red-400 border border-red-500/20',
  },
  green: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    dot: 'bg-blue-400',
    badge: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  },
  pink: {
    bg: 'bg-pink-500/10',
    text: 'text-pink-400',
    border: 'border-pink-500/30',
    dot: 'bg-pink-400',
    badge: 'bg-pink-500/15 text-pink-400 border border-pink-500/20',
  },
  gray: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
    dot: 'bg-slate-400',
    badge: 'bg-slate-500/15 text-slate-400 border border-slate-500/20',
  },
}

export function statusBadge(status: string): string {
  const map: Record<string, string> = {
    active:       'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
    on_leave:     'bg-amber-500/15 text-amber-400 border border-amber-500/20',
    wfh:          'bg-blue-500/15 text-blue-400 border border-blue-500/20',
    terminated:   'bg-red-500/15 text-red-400 border border-red-500/20',
    onboarding:   'bg-purple-500/15 text-purple-400 border border-purple-500/20',
    pending:      'bg-amber-500/15 text-amber-400 border border-amber-500/20',
    approved:     'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
    denied:       'bg-red-500/15 text-red-400 border border-red-500/20',
    processed:    'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
    failed:       'bg-red-500/15 text-red-400 border border-red-500/20',
    open:         'bg-brand-500/15 text-brand-400 border border-brand-500/20',
    closed:       'bg-slate-500/15 text-slate-400 border border-slate-500/20',
    hired:        'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
    rejected:     'bg-red-500/15 text-red-400 border border-red-500/20',
    on_track:     'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
    at_risk:      'bg-amber-500/15 text-amber-400 border border-amber-500/20',
    completed:    'bg-teal-500/15 text-teal-400 border border-teal-500/20',
    overdue:      'bg-red-500/15 text-red-400 border border-red-500/20',
  }
  return map[status] ?? 'bg-slate-500/15 text-slate-400 border border-slate-500/20'
}

export function statusLabel(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function calcWorkingDays(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  let count = 0
  const cur = new Date(s)
  while (cur <= e) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

// Avatar color by initials hash
export function avatarColor(name: string): string {
  const colors = [
    'bg-brand-500/20 text-brand-400',
    'bg-teal-500/20 text-teal-400',
    'bg-amber-500/20 text-amber-400',
    'bg-pink-500/20 text-pink-400',
    'bg-blue-500/20 text-blue-400',
    'bg-emerald-500/20 text-emerald-400',
    'bg-red-500/20 text-red-400',
    'bg-violet-500/20 text-violet-400',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}
