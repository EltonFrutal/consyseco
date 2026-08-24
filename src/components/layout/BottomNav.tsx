import { useEffect, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

export interface NavItem {
  to: string
  label: string
  icon: ReactNode
}

/**
 * No mobile a navegação vai para o rodapé, ao alcance do polegar. São no máximo
 * cinco alvos: quatro telas do dia a dia e "Mais" para o resto, porque acima
 * disso cada alvo fica menor que o dedo.
 */
const PRINCIPAIS = ['/inicio', '/tarefas', '/dashboard', '/tarefas/finalizadas']

const itemClass =
  'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500'

export function BottomNav({ itens }: { itens: NavItem[] }) {
  const [maisAberto, setMaisAberto] = useState(false)

  const principais = PRINCIPAIS.map((rota) => itens.find((item) => item.to === rota)).filter(
    (item): item is NavItem => Boolean(item),
  )
  const extras = itens.filter((item) => !PRINCIPAIS.includes(item.to))

  // fechar a gaveta ao trocar de tela evita ela ficar aberta por cima do conteúdo
  useEffect(() => {
    if (!maisAberto) return
    const fechar = () => setMaisAberto(false)
    window.addEventListener('popstate', fechar)
    return () => window.removeEventListener('popstate', fechar)
  }, [maisAberto])

  return (
    <>
      {maisAberto && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40"
          onClick={() => setMaisAberto(false)}
          aria-hidden="true"
        />
      )}

      {maisAberto && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-700 dark:bg-slate-800"
          role="dialog"
          aria-label="Mais telas"
        >
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Mais</span>
            <button
              type="button"
              onClick={() => setMaisAberto(false)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400"
              aria-label="Fechar"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <nav className="pb-2">
            {extras.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                onClick={() => setMaisAberto(false)}
                className={({ isActive }) =>
                  `flex min-h-12 items-center gap-3 px-4 text-sm transition ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                      : 'text-slate-600 dark:text-slate-300'
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      <nav
        className="sticky bottom-0 z-30 flex shrink-0 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-700 dark:bg-slate-800"
        aria-label="Navegação principal"
      >
        {principais.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              `${itemClass} ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-300'
                  : 'text-slate-500 dark:text-slate-400'
              }`
            }
          >
            {item.icon}
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}

        {extras.length > 0 && (
          <button
            type="button"
            onClick={() => setMaisAberto(true)}
            aria-expanded={maisAberto}
            className={`${itemClass} ${
              maisAberto ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <circle cx="5" cy="12" r="1.4" />
              <circle cx="12" cy="12" r="1.4" />
              <circle cx="19" cy="12" r="1.4" />
            </svg>
            Mais
          </button>
        )}
      </nav>
    </>
  )
}
