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
  const solicitante = tarefa.solicitante_id ? pessoas.get(tarefa.solicitante_id) : undefined
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
        <h4 className="text-sm font-medium text-slate-900 dark:text-white">{tarefa.titulo}</h4>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${prioridade.classe}`}>
          {prioridade.rotulo}
        </span>
      </div>

      {tarefa.descricao && (
        <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{tarefa.descricao}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {responsavel && (
          <span
            className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"
            title={`Responsável: ${responsavel.name}`}
          >
            {responsavel.avatar_url ? (
              <img src={responsavel.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                {iniciais(responsavel.name)}
              </span>
            )}
            {responsavel.name.split(' ')[0]}
          </span>
        )}

        {tarefa.prazo && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
              vencida
                ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
            }`}
            title={vencida ? 'Prazo vencido' : 'Prazo'}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            {new Date(`${tarefa.prazo}T00:00:00`).toLocaleDateString('pt-BR')}
          </span>
        )}
      </div>

      {solicitante && (
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          Solicitante: {solicitante.name}
        </p>
      )}

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
