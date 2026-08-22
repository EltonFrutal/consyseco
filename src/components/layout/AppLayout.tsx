import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { ThemeToggle } from './ThemeToggle'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/usuarios', label: 'Usuários' },
]

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth()

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="px-6 py-5 text-lg font-semibold text-slate-900 dark:text-white">Tarefas</div>
        <nav className="mt-2 flex flex-col gap-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-700 dark:bg-slate-800">
          <span className="text-sm text-slate-500 dark:text-slate-400">{profile?.name ?? 'Carregando...'}</span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Sair
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
