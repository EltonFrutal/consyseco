import { PRIORIDADES, type Coluna, type Tarefa } from '../../api/tarefas'
import type { Profile } from '../../types/profile'

interface TaskCardProps {
  tarefa: Tarefa
  colunas: Coluna[]
  pessoas: Map<string, Profile>
  onEditar: (tarefa: Tarefa) => void
  onMover: (tarefa: Tarefa, colunaId: string) => void
  onDragStart: (tarefa: Tarefa) => void
  onDragEnd: () => void
  arrastando: boolean
}

function iniciais(nome: string) {
  return nome.trim().charAt(0).toUpperCase()
}

export function TaskCard({
  tarefa,
  colunas,
  pessoas,
  onEditar,
  onMover,
  onDragStart,
  onDragEnd,
  arrastando,
}: TaskCardProps) {
  const responsavel = tarefa.responsavel_id ? pessoas.get(tarefa.responsavel_id) : undefined
  const executor = tarefa.executor_id ? pessoas.get(tarefa.executor_id) : undefined
  const prioridade = PRIORIDADES[tarefa.prioridade]

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const prazo = tarefa.prazo ? new Date(`${tarefa.prazo}T00:00:00`) : null
  const vencida = prazo ? prazo < hoje : false

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', tarefa.id)
        onDragStart(tarefa)
      }}
      onDragEnd={onDragEnd}
      onClick={() => onEditar(tarefa)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onEditar(tarefa)
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Editar tarefa ${tarefa.titulo}`}
      className={`cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-500/50 ${
        arrastando ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="min-w-0 truncate text-sm font-medium text-slate-900 dark:text-white" title={tarefa.titulo}>
          {tarefa.titulo}
        </h4>
        <span
          className={`mt-1 h-3 w-3 shrink-0 rounded-full ${prioridade.ponto}`}
          role="img"
          aria-label={`Prioridade ${prioridade.rotulo.toLowerCase()}`}
          title={`Prioridade ${prioridade.rotulo.toLowerCase()}`}
        />
      </div>

      {/* as linhas abaixo são sempre renderizadas — mesmo vazias — para que
          todos os cartões tenham a mesma altura */}
      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400" title={tarefa.descricao ?? undefined}>
        {tarefa.descricao || ' '}
      </p>

      <div className="mt-3 flex min-h-6 items-center justify-between gap-2 text-xs">
        <span className="flex min-w-0 items-center gap-1.5 text-slate-600 dark:text-slate-300">
          {responsavel ? (
            <>
              {responsavel.avatar_url ? (
                <img src={responsavel.avatar_url} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                  {iniciais(responsavel.name)}
                </span>
              )}
              <span className="truncate" title={`Responsável: ${responsavel.name}`}>
                {responsavel.name}
              </span>
            </>
          ) : (
            <>
              <span
                className="h-5 w-5 shrink-0 rounded-full border border-dashed border-slate-300 dark:border-slate-600"
                aria-hidden="true"
              />
              <span className="truncate text-slate-400 dark:text-slate-500">Sem responsável</span>
            </>
          )}
        </span>

        {tarefa.prazo && (
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 ${
              vencida
                ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
            }`}
            title={vencida ? 'Prazo vencido' : 'Prazo'}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            {new Date(`${tarefa.prazo}T00:00:00`).toLocaleDateString('pt-BR')}
          </span>
        )}
      </div>

      <div className="mt-2 flex min-h-6 items-center gap-1.5 text-xs">
        {executor ? (
          <>
            {executor.avatar_url ? (
              <img src={executor.avatar_url} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                {iniciais(executor.name)}
              </span>
            )}
            <span className="truncate text-slate-500 dark:text-slate-400" title={`Executor: ${executor.name}`}>
              Executor: {executor.name}
            </span>
          </>
        ) : (
          <>
            <span
              className="h-5 w-5 shrink-0 rounded-full border border-dashed border-slate-300 dark:border-slate-600"
              aria-hidden="true"
            />
            <span className="truncate text-slate-400 dark:text-slate-500">Sem executor</span>
          </>
        )}
      </div>

      {/* alternativa ao arrastar, que funciona no celular */}
      <label className="sr-only" htmlFor={`mover-${tarefa.id}`}>
        Mover {tarefa.titulo} para outra coluna
      </label>
      <select
        id={`mover-${tarefa.id}`}
        value={tarefa.coluna_id}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation()
          onMover(tarefa, e.target.value)
        }}
        className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 sm:hidden"
      >
        {colunas.map((coluna) => (
          <option key={coluna.id} value={coluna.id}>
            {coluna.nome}
          </option>
        ))}
      </select>
    </article>
  )
}
