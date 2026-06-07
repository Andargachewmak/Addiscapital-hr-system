import { create } from 'zustand'

interface AppStore {
  sidebarOpen: boolean
  currentPage: string
  setSidebarOpen: (open: boolean) => void
  setCurrentPage: (page: string) => void
}

export const useAppStore = create<AppStore>((set) => ({
  sidebarOpen: true,
  currentPage: 'dashboard',
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCurrentPage: (page) => set({ currentPage: page }),
}))
