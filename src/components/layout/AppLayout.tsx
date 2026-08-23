import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { ThemeToggle } from './ThemeToggle'
import { SidebarFooter } from './SidebarFooter'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
}

const iconProps = {
  className: 'h-5 w-5 shrink-0',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  viewBox: '0 0 24 24',
}

const itemInicio: NavItem = 
{
  to: '/inicio',
  label: 'Início',
  icon: (
    <svg {...iconProps}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
      <path d="M10 21v-6h4v6" />
    </svg>
  ),
}

/** Itens do aplicativo Tarefas. O Painel Gerencial não entra: é outro app. */
const itensTarefas: NavItem[] = [
  {
    to: '/tarefas',
    label: 'Tarefas',
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 9h18" />
        <path d="M8 13h3M8 17h3M14 13h3M14 17h3" />
      </svg>
    ),
  },
  {
    to: '/tarefas?config=1',
    label: 'Configuração',
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </svg>
    ),
  },
  {
    to: '/tarefas/finalizadas',
    label: 'Finalizadas',
    icon: (
      <svg {...iconProps}>
        <path d="M9 11l2 2 4-4" />
        <path d="M21 12a9 9 0 1 1-9-9" />
        <path d="M16 3h5v5" />
      </svg>
    ),
  },
  {
    to: '/usuarios',
    label: 'Usuários',
    icon: (
      <svg {...iconProps}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
        <path d="M16 3.1a4 4 0 0 1 0 7.8" />
      </svg>
    ),
  },
  {
    to: '/integracoes/whatsapp',
    label: 'Integração WhatsApp',
    icon: (
      <svg {...iconProps}>
        <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.7-5.2A8.5 8.5 0 1 1 21 11.5z" />
      </svg>
    ),
  },
]

const STORAGE_KEY = 'sidebar-collapsed'

/**
 * O menu depende do aplicativo aberto: na tela de início não há itens, e
 * dentro de um app o primeiro item é sempre o caminho de volta.
 */
/** O título da barra acompanha o aplicativo aberto. */
function tituloDaRota(pathname: string): string {
  if (pathname.startsWith('/inicio')) return 'Início'
  if (pathname.startsWith('/dashboard')) return 'Painel Gerencial'
  return 'Tarefas'
}

function menuDaRota(pathname: string): NavItem[] {
  if (pathname.startsWith('/inicio')) return []
  // usuários e integração pertencem ao app Tarefas, apesar da rota própria
  const doApp = ['/tarefas', '/usuarios', '/integracoes']
  if (doApp.some((rota) => pathname.startsWith(rota))) return [itemInicio, ...itensTarefas]
  return [itemInicio]
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth()
  const { pathname } = useLocation()
  const navItems = menuDaRota(pathname)
  const titulo = tituloDaRota(pathname)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [collapsed])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <aside
        className={`sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white transition-[width] duration-200 dark:border-slate-700 dark:bg-slate-800 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className={`flex items-center py-4 ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          {!collapsed && (
            <span className="truncate text-lg font-semibold text-slate-900 dark:text-white">{titulo}</span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-400 dark:hover:bg-slate-700"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <svg {...iconProps}>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M9 4v16" />
              {collapsed ? <path d="M13 9l3 3-3 3" /> : <path d="M16 9l-3 3 3 3" />}
            </svg>
          </button>
        </div>

        <nav className={`mt-1 flex min-h-0 flex-1 flex-col gap-1 overflow-hidden ${collapsed ? 'px-2' : 'px-3'}`}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  collapsed ? 'justify-center px-0' : ''
                } ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                }`
              }
            >
              {item.icon}
              {!collapsed && <span className="truncate">{item.label}</span>}
              {collapsed && <span className="sr-only">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <SidebarFooter collapsed={collapsed} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex min-w-0 items-center gap-3">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={`Foto de ${profile.name}`}
                className="h-9 w-9 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                {profile?.name.trim().charAt(0).toUpperCase() ?? '?'}
              </span>
            )}
            <span className="truncate text-sm text-slate-500 dark:text-slate-400">
              {profile?.name ?? 'Carregando...'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => signOut()}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-label="Sair"
              title="Sair"
            >
              <svg {...iconProps}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
