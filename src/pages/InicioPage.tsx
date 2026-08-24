import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { useAuth } from '../contexts/AuthContext'

interface Aplicativo {
  nome: string
  descricao: string
  to?: string
  icone: JSX.Element
  cor: string
}

const iconeProps = {
  viewBox: '0 0 24 24',
  className: 'h-7 w-7',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

// O painel de indicadores não entra aqui: é uma tela do app Tarefas.
const aplicativos: Aplicativo[] = [
  {
    nome: 'Tarefas',
    descricao: 'Quadro kanban por cenário, com responsáveis, prazos e finalização.',
    to: '/tarefas',
    cor: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300',
    icone: (
      <svg {...iconeProps}>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 9h18" />
        <path d="M8 13h3M8 17h3M14 13h3M14 17h3" />
      </svg>
    ),
  },
  {
    nome: 'Pesquisa',
    descricao: 'Consulta das informações do sistema. Ainda não disponível.',
    cor: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
    icone: (
      <svg {...iconeProps}>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
    ),
  },
]

const cartao =
  'flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left transition dark:border-slate-700 dark:bg-slate-800'

export function InicioPage() {
  const { profile } = useAuth()
  const primeiroNome = profile?.name?.trim().split(' ')[0]

  return (
    <AppLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            {primeiroNome ? `Olá, ${primeiroNome}` : 'Início'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Escolha por onde começar.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {aplicativos.map((app) =>
            app.to ? (
              <Link
                key={app.nome}
                to={app.to}
                className={`${cartao} hover:border-indigo-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:hover:border-indigo-500/50`}
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${app.cor}`}>
                  {app.icone}
                </span>
                <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{app.nome}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{app.descricao}</p>
              </Link>
            ) : (
              <div key={app.nome} className={`${cartao} opacity-60`} aria-disabled="true">
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${app.cor}`}>
                  {app.icone}
                </span>
                <h2 className="mt-4 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                  {app.nome}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                    em breve
                  </span>
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{app.descricao}</p>
              </div>
            ),
          )}
        </div>
      </div>
    </AppLayout>
  )
}
