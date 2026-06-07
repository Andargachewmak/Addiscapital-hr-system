import { getToken, useAuth } from './auth'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  if (res.status === 401) useAuth.getState().logout()
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      message = Array.isArray(body.message) ? body.message.join(', ') : body.message ?? message
    } catch { /* ignore */ }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

function qs(params?: Record<string, unknown>): string {
  if (!params) return ''
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  })
  const s = p.toString()
  return s ? `?${s}` : ''
}
export { qs }
