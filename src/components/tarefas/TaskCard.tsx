import { CORES_COLUNA, PRIORIDADES, type Coluna, type Tarefa } from '../../api/tarefas'
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
  /** Mobile: só título, executor, data curta e o seletor de etapa. */
  compacto?: boolean
  /**
   * Qual opção o seletor de etapa mostra. No modo "Todos os cenários" a lista
   * de colunas é deduplicada por nome, então o coluna_id da tarefa pode não
   * estar nela — e o seletor cairia na primeira opção, mentindo a etapa.
   */
  colunaSelecionadaId?: string
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
  compacto = false,
  colunaSelecionadaId,
}: TaskCardProps) {
  const executor = tarefa.executor_id ? pessoas.get(tarefa.executor_id) : undefined
  const prioridade = PRIORIDADES[tarefa.prioridade]

  // no mobile o cartão veste a cor da própria etapa: sem isso ele some no
  // fundo do quadro, que é da mesma cor
  const colunaDaTarefa = colunas.find((c) => c.id === tarefa.coluna_id)
  const realce = compacto
    ? (CORES_COLUNA[colunaDaTarefa?.cor ?? 'slate'] ?? CORES_COLUNA.slate).realce
    : 'bg-white dark:bg-slate-800'

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const prazo = tarefa.prazo ? new Date(`${tarefa.prazo}T00:00:00`) : null
  const vencida = prazo ? prazo < hoje : false
  // no compacto o ano vai com dois dígitos: a linha é estreita no celular
  const prazoTexto = prazo
    ? prazo.toLocaleDateString(
        'pt-BR',
        compacto ? { day: '2-digit', month: '2-digit', year: '2-digit' } : undefined,
      )
    : ''

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
      className={`cursor-pointer rounded-xl border border-slate-200 p-4 shadow-sm transition hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 md:p-3 dark:border-slate-700 dark:hover:border-indigo-500/50 ${realce} ${
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
      {!compacto && (
        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400" title={tarefa.descricao ?? undefined}>
          {tarefa.descricao || ' '}
        </p>
      )}

      <div className="mt-3 flex min-h-6 items-center justify-between gap-2 text-xs">
        <span
          className={`flex min-w-0 items-center gap-1.5 text-slate-600 dark:text-slate-300 ${
            compacto ? 'shrink-0' : ''
          }`}
        >
          {executor ? (
            <>
              {executor.avatar_url ? (
                <img
                  src={executor.avatar_url}
                  alt={compacto ? `Executor: ${executor.name}` : ''}
                  title={compacto ? `Executor: ${executor.name}` : undefined}
                  className={`shrink-0 rounded-full object-cover ${compacto ? 'h-7 w-7' : 'h-5 w-5'}`}
                />
              ) : (
                <span
                  title={`Executor: ${executor.name}`}
                  className={`flex shrink-0 items-center justify-center rounded-full bg-slate-100 font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300 ${
                    compacto ? 'h-7 w-7 text-xs' : 'h-5 w-5 text-[10px]'
                  }`}
                >
                  {iniciais(executor.name)}
                </span>
              )}
              {!compacto && (
                <span className="truncate" title={`Executor: ${executor.name}`}>
                  {executor.name}
                </span>
              )}
            </>
          ) : (
            <>
              <span
                title="Sem executor"
                className={`shrink-0 rounded-full border border-dashed border-slate-300 dark:border-slate-600 ${
                  compacto ? 'h-7 w-7' : 'h-5 w-5'
                }`}
                aria-hidden="true"
              />
              {!compacto && (
                <span className="truncate text-slate-400 dark:text-slate-500">Sem executor</span>
              )}
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
            {prazoTexto}
          </span>
        )}

        {/* alternativa ao arrastar, que funciona no celular */}
        <label className="sr-only" htmlFor={`mover-${tarefa.id}`}>
          Mover {tarefa.titulo} para outra etapa
        </label>
        <select
          id={`mover-${tarefa.id}`}
          value={colunaSelecionadaId ?? tarefa.coluna_id}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation()
            onMover(tarefa, e.target.value)
          }}
          className={`min-h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 ${
            compacto ? '' : 'hidden'
          }`}
        >
          {colunas.map((coluna) => (
            <option key={coluna.id} value={coluna.id}>
              {coluna.nome}
            </option>
          ))}
        </select>
      </div>
    </article>
  )
}
