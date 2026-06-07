import { create } from 'zustand'

export type Theme = 'dark' | 'light'
const KEY = 'acgf-theme'

function applyTheme(t: Theme) {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  el.classList.toggle('light', t === 'light')
  el.classList.toggle('dark', t === 'dark')
}

function initialTheme(): Theme {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  }
  return 'dark'
}

interface ThemeState {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: initialTheme(),
  setTheme: (t) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, t)
    applyTheme(t)
    set({ theme: t })
  },
  toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}))

// Apply the saved theme immediately on load (before first paint of the app).
applyTheme(initialTheme())
