import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export type Role = 'admin' | 'hr_director' | 'employee'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
  employee_id?: string | null
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  hydrated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, role: Role) => Promise<void>
  logout: () => Promise<void>
  _setHydrated: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      hydrated: false,
      _setHydrated: () => set({ hydrated: true }),

      login: async (email, password) => {
        if (!email || !password) throw new Error('Email and password are required')
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        if (!res.ok) {
          const e = await res.json().catch(() => ({}))
          throw new Error(e.message || 'Invalid email or password')
        }
        const data = await res.json()
        set({ user: data.user, token: data.token })
      },

      register: async (name, email, password, role) => {
        if (!name || !email || !password) throw new Error('All fields are required')
        const res = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role }),
        })
        if (!res.ok) {
          const e = await res.json().catch(() => ({}))
          throw new Error(e.message || 'Could not create account')
        }
        // Account is created but we intentionally do NOT start a session here —
        // the user is sent to the sign-in page to log in with their new credentials.
        await res.json().catch(() => ({}))
      },

      logout: async () => set({ user: null, token: null }),
    }),
    {
      name: 'acgf-auth',
      partialize: (s) => ({ user: s.user, token: s.token }),
      onRehydrateStorage: () => (state) => state?._setHydrated(),
    },
  ),
)

export const getToken = () => useAuth.getState().token
