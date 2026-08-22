import { AppLayout } from '../components/layout/AppLayout'

export function DashboardPage() {
  return (
    <AppLayout>
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-600 dark:bg-slate-800">
        <h2 className="text-lg font-medium text-slate-900 dark:text-white">Nenhum módulo ainda</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          O módulo de Tickets/Tarefas será adicionado em uma próxima etapa.
        </p>
      </div>
    </AppLayout>
  )
}
