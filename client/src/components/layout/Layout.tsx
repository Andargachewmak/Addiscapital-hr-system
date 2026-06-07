import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function Layout() {
  return (
    <div className="flex h-screen bg-surface-0 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-surface-3">
          <div className="p-7 animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
