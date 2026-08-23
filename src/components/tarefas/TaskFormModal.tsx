import { useState, type FormEvent } from 'react'
import { FinalizarError, finalizarTarefa, type Coluna, type Prioridade, type Tarefa, type TarefaInput } from '../../api/tarefas'
import type { Profile } from '../../types/profile'
import { useAuth } from '../../contexts/AuthContext'

interface TaskFormModalProps {
  open: boolean
  cenarioId: string
  colunas: Coluna[]
  pessoas: Profile[]
  tarefa: Tarefa | null
  onClose: () => void
  onSubmit: (input: TarefaInput) => Promise<void>
  onDelete: (tarefa: Tarefa) => Promise<void>
  onFinalizada: () => Promise<void>
}

const inputClass =
  'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300'

export function TaskFormModal({
  open,
  cenarioId,
  colunas,
  pessoas,
  tarefa,
  onClose,
  onSubmit,
  onDelete,
  onFinalizada,
}: TaskFormModalProps) {
  const { user } = useAuth()
  const [titulo, setTitulo] = useState(tarefa?.titulo ?? '')
  const [descricao, setDescricao] = useState(tarefa?.descricao ?? '')
  const [colunaId, setColunaId] = useState(tarefa?.coluna_id ?? colunas[0]?.id ?? '')
  const [solicitanteId, setSolicitanteId] = useState(tarefa?.solicitante_id ?? '')
  const [responsavelId, setResponsavelId] = useState(tarefa?.responsavel_id ?? '')
  const [executorId, setExecutorId] = useState(tarefa?.executor_id ?? '')
  const [prazo, setPrazo] = useState(tarefa?.prazo ?? '')
  const [prioridade, setPrioridade] = useState<Prioridade>(tarefa?.prioridade ?? 'media')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const [pedindoSenha, setPedindoSenha] = useState(false)
  const [senha, setSenha] = useState('')
  const [erroFinalizar, setErroFinalizar] = useState<string | null>(null)

  if (!open) return null

  const editando = Boolean(tarefa)
  const colunaSalva = tarefa ? colunas.find((c) => c.id === tarefa.coluna_id) : undefined
  const podeFinalizar = Boolean(tarefa && colunaSalva?.is_conclusao && !tarefa.finalizada_em)
  const souOResponsavel = Boolean(tarefa?.responsavel_id && tarefa.responsavel_id === user?.id)
  const nomeResponsavel = pessoas.find((p) => p.id === tarefa?.responsavel_id)?.name
  const quemAlterou = pessoas.find((p) => p.id === tarefa?.updated_by)?.name

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)

    if (!titulo.trim()) {
      setErro('Informe o título da tarefa.')
      return
    }
    if (!colunaId) {
      setErro('Cadastre ao menos uma coluna neste cenário.')
      return
    }

    setSalvando(true)
    try {
      await onSubmit({
        cenario_id: cenarioId,
        coluna_id: colunaId,
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        solicitante_id: solicitanteId || null,
        responsavel_id: responsavelId || null,
        executor_id: executorId || null,
        prazo: prazo || null,
        prioridade,
      })
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar a tarefa.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleFinalizar() {
    if (!tarefa) return
    setFinalizando(true)
    setErroFinalizar(null)
    try {
      await finalizarTarefa(tarefa.id, senha || undefined)
      await onFinalizada()
    } catch (err) {
      if (err instanceof FinalizarError) {
        setErroFinalizar(err.message)
        setPedindoSenha(err.senhaObrigatoria)
      } else {
        setErroFinalizar('Não foi possível finalizar a tarefa.')
      }
      setSenha('')
    } finally {
      setFinalizando(false)
    }
  }

  async function handleDelete() {
    if (!tarefa) return
    setSalvando(true)
    setErro(null)
    try {
      await onDelete(tarefa)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível excluir a tarefa.')
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {editando ? 'Editar tarefa' : 'Nova tarefa'}
        </h3>

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          <div>
            <label className={labelClass} htmlFor="tarefa-titulo">
              Título
            </label>
            <input
              id="tarefa-titulo"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className={inputClass}
              autoFocus
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="tarefa-descricao">
              Descrição
            </label>
            <textarea
              id="tarefa-descricao"
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="tarefa-solicitante">
                Solicitante
              </label>
              <select
                id="tarefa-solicitante"
                value={solicitanteId}
                onChange={(e) => setSolicitanteId(e.target.value)}
                className={inputClass}
              >
                <option value="">Ninguém</option>
                {pessoas.map((pessoa) => (
                  <option key={pessoa.id} value={pessoa.id}>
                    {pessoa.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="tarefa-responsavel">
                Responsável
              </label>
              <select
                id="tarefa-responsavel"
                value={responsavelId}
                onChange={(e) => setResponsavelId(e.target.value)}
                className={inputClass}
              >
                <option value="">Ninguém</option>
                {pessoas.map((pessoa) => (
                  <option key={pessoa.id} value={pessoa.id}>
                    {pessoa.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="tarefa-executor">
                Executor
              </label>
              <select
                id="tarefa-executor"
                value={executorId}
                onChange={(e) => setExecutorId(e.target.value)}
                className={inputClass}
              >
                <option value="">Ninguém</option>
                {pessoas.map((pessoa) => (
                  <option key={pessoa.id} value={pessoa.id}>
                    {pessoa.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="tarefa-prazo">
                Prazo
              </label>
              <input
                id="tarefa-prazo"
                type="date"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="tarefa-prioridade">
                Prioridade
              </label>
              <select
                id="tarefa-prioridade"
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as Prioridade)}
                className={inputClass}
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="tarefa-coluna">
                Coluna
              </label>
              <select
                id="tarefa-coluna"
                value={colunaId}
                onChange={(e) => setColunaId(e.target.value)}
                className={inputClass}
              >
                {colunas.map((coluna) => (
                  <option key={coluna.id} value={coluna.id}>
                    {coluna.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {erro && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {erro}
            </p>
          )}

          {podeFinalizar && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                Finalizar tarefa
              </p>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                {souOResponsavel
                  ? 'Você é o responsável: pode finalizar direto. A tarefa sai do quadro.'
                  : `Só ${nomeResponsavel ?? 'o responsável'} pode finalizar — informe a senha dele.`}
              </p>

              {!souOResponsavel && (
                <div className="mt-2">
                  <label className="sr-only" htmlFor="tarefa-senha-responsavel">
                    Senha do responsável
                  </label>
                  <input
                    id="tarefa-senha-responsavel"
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    autoComplete="off"
                    placeholder="Senha do responsável"
                    className="block w-full rounded-lg border border-emerald-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-emerald-500/40 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              )}

              {erroFinalizar && (
                <p role="alert" className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                  {erroFinalizar}
                </p>
              )}

              <button
                type="button"
                onClick={handleFinalizar}
                disabled={finalizando || (!souOResponsavel && pedindoSenha && !senha)}
                className="mt-3 min-h-11 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-slate-800"
              >
                {finalizando ? 'Finalizando...' : 'Finalizar tarefa'}
              </button>
            </div>
          )}

          {confirmandoExclusao && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <p>Excluir esta tarefa? A ação não pode ser desfeita.</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="min-h-11 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-red-500"
                >
                  Sim, excluir
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmandoExclusao(false)}
                  className="min-h-11 rounded-lg border border-red-300 px-3 py-2 text-xs font-medium transition hover:bg-red-100 dark:border-red-500/40 dark:hover:bg-red-500/10"
                >
                  Manter
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
            {editando ? (
              <button
                type="button"
                onClick={() => setConfirmandoExclusao(true)}
                className="min-h-11 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                Excluir
              </button>
            ) : (
              <span />
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="min-h-11 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-slate-900"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>

          {tarefa && (
            <p className="border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-700 dark:text-slate-500">
              Criada em {new Date(tarefa.created_at).toLocaleString('pt-BR')}
              {' · '}
              Alterada em {new Date(tarefa.updated_at).toLocaleString('pt-BR')}
              {' por '}
              {quemAlterou ?? '—'}
              {tarefa.data_conclusao && (
                <> · Concluída em {new Date(tarefa.data_conclusao).toLocaleString('pt-BR')}</>
              )}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
