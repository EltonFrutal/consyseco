import { useState, type FormEvent } from 'react'
import { FinalizarError, finalizarTarefa, type Coluna, type Prioridade, type Tarefa, type TarefaInput } from '../../api/tarefas'
import { CancelButton, DeleteButton, SaveButton } from '../ui/ActionButtons'
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
const inputErroClass =
  'mt-1 block w-full rounded-lg border border-red-500 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-slate-800 dark:text-slate-100'
const erroCampoClass = 'mt-1 text-xs text-red-600 dark:text-red-400'

const PRIORIDADES_FORM = [
  { valor: 'baixa' as const, rotulo: 'Baixa', ponto: 'bg-slate-400' },
  { valor: 'media' as const, rotulo: 'Média', ponto: 'bg-amber-500' },
  { valor: 'alta' as const, rotulo: 'Alta', ponto: 'bg-red-500' },
]

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
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
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

    const faltando: Record<string, string> = {}
    if (!titulo.trim()) faltando.titulo = 'Informe o título.'
    if (!descricao.trim()) faltando.descricao = 'Informe a descrição.'
    if (!solicitanteId) faltando.solicitante = 'Escolha o solicitante.'
    if (!responsavelId) faltando.responsavel = 'Escolha o responsável.'
    if (!executorId) faltando.executor = 'Escolha o executor.'
    if (!prazo) faltando.prazo = 'Informe o prazo.'
    if (!colunaId) faltando.coluna = 'Escolha a etapa.'

    setCampos(faltando)
    if (Object.keys(faltando).length > 0) {
      setErro('Preencha todos os campos para salvar.')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {/* largura maior + duas colunas: cabe inteiro na tela, sem rolagem */}
      <div className="max-h-[95vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {editando ? 'Editar tarefa' : 'Nova tarefa'}
        </h3>

        <form onSubmit={handleSubmit} noValidate className="mt-3 space-y-3">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <label className={labelClass} htmlFor="tarefa-titulo">
                  Título
                </label>
                <input
                  id="tarefa-titulo"
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className={campos.titulo ? inputErroClass : inputClass}
                  aria-invalid={Boolean(campos.titulo)}
                  aria-describedby={campos.titulo ? 'tarefa-titulo-erro' : undefined}
                  autoFocus
                />
                {campos.titulo && (
                  <p id="tarefa-titulo-erro" className={erroCampoClass}>
                    {campos.titulo}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass} htmlFor="tarefa-descricao">
                  Descrição
                </label>
                <textarea
                  id="tarefa-descricao"
                  rows={4}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className={campos.descricao ? inputErroClass : inputClass}
                  aria-invalid={Boolean(campos.descricao)}
                  aria-describedby={campos.descricao ? 'tarefa-descricao-erro' : undefined}
                />
                {campos.descricao && (
                  <p id="tarefa-descricao-erro" className={erroCampoClass}>
                    {campos.descricao}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className={labelClass} htmlFor="tarefa-solicitante">
                  Solicitante
                </label>
                <select
                  id="tarefa-solicitante"
                  value={solicitanteId}
                  onChange={(e) => setSolicitanteId(e.target.value)}
                  className={campos.solicitante ? inputErroClass : inputClass}
                  aria-invalid={Boolean(campos.solicitante)}
                  aria-describedby={campos.solicitante ? 'tarefa-solicitante-erro' : undefined}
                >
                  <option value="">Selecione</option>
                  {pessoas.map((pessoa) => (
                    <option key={pessoa.id} value={pessoa.id}>
                      {pessoa.name}
                    </option>
                  ))}
                </select>
                {campos.solicitante && (
                  <p id="tarefa-solicitante-erro" className={erroCampoClass}>
                    {campos.solicitante}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass} htmlFor="tarefa-responsavel">
                  Responsável
                </label>
                <select
                  id="tarefa-responsavel"
                  value={responsavelId}
                  onChange={(e) => setResponsavelId(e.target.value)}
                  className={campos.responsavel ? inputErroClass : inputClass}
                  aria-invalid={Boolean(campos.responsavel)}
                  aria-describedby={campos.responsavel ? 'tarefa-responsavel-erro' : undefined}
                >
                  <option value="">Selecione</option>
                  {pessoas.map((pessoa) => (
                    <option key={pessoa.id} value={pessoa.id}>
                      {pessoa.name}
                    </option>
                  ))}
                </select>
                {campos.responsavel && (
                  <p id="tarefa-responsavel-erro" className={erroCampoClass}>
                    {campos.responsavel}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass} htmlFor="tarefa-executor">
                  Executor
                </label>
                <select
                  id="tarefa-executor"
                  value={executorId}
                  onChange={(e) => setExecutorId(e.target.value)}
                  className={campos.executor ? inputErroClass : inputClass}
                  aria-invalid={Boolean(campos.executor)}
                  aria-describedby={campos.executor ? 'tarefa-executor-erro' : undefined}
                >
                  <option value="">Selecione</option>
                  {pessoas.map((pessoa) => (
                    <option key={pessoa.id} value={pessoa.id}>
                      {pessoa.name}
                    </option>
                  ))}
                </select>
                {campos.executor && (
                  <p id="tarefa-executor-erro" className={erroCampoClass}>
                    {campos.executor}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* prazo, etapa e prioridade dividem uma linha só, abaixo da descrição */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass} htmlFor="tarefa-prazo">
                Prazo
              </label>
              <input
                id="tarefa-prazo"
                type="date"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                className={campos.prazo ? inputErroClass : inputClass}
                aria-invalid={Boolean(campos.prazo)}
                aria-describedby={campos.prazo ? 'tarefa-prazo-erro' : undefined}
              />
              {campos.prazo && (
                <p id="tarefa-prazo-erro" className={erroCampoClass}>
                  {campos.prazo}
                </p>
              )}
            </div>

            <div>
              <label className={labelClass} htmlFor="tarefa-coluna">
                Etapa
              </label>
              <select
                id="tarefa-coluna"
                value={colunaId}
                onChange={(e) => setColunaId(e.target.value)}
                className={campos.coluna ? inputErroClass : inputClass}
                aria-invalid={Boolean(campos.coluna)}
                aria-describedby={campos.coluna ? 'tarefa-coluna-erro' : undefined}
              >
                {colunas.map((coluna) => (
                  <option key={coluna.id} value={coluna.id}>
                    {coluna.nome}
                  </option>
                ))}
              </select>
              {campos.coluna && (
                <p id="tarefa-coluna-erro" className={erroCampoClass}>
                  {campos.coluna}
                </p>
              )}
            </div>

            <div>
              <span className={labelClass} id="rotulo-prioridade">
                Prioridade
              </span>
              <div className="mt-1 flex gap-2" role="radiogroup" aria-labelledby="rotulo-prioridade">
                {PRIORIDADES_FORM.map((item) => {
                  const ativo = prioridade === item.valor
                  return (
                    <button
                      key={item.valor}
                      type="button"
                      role="radio"
                      aria-checked={ativo}
                      onClick={() => setPrioridade(item.valor)}
                      title={item.rotulo}
                      className={`flex h-10 flex-1 items-center justify-center rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        ativo
                          ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10'
                          : 'border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className={`h-3.5 w-3.5 rounded-full ${item.ponto}`} aria-hidden="true" />
                      <span className="sr-only">{item.rotulo}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {erro && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {erro}
            </p>
          )}

          {podeFinalizar && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <span className="text-xs text-emerald-800 dark:text-emerald-300">
                {souOResponsavel
                  ? 'Você é o responsável e pode finalizar — a tarefa sai do quadro.'
                  : `Só ${nomeResponsavel ?? 'o responsável'} finaliza: informe a senha dele.`}
              </span>

              {!souOResponsavel && (
                <>
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
                    className="w-48 rounded-lg border border-emerald-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-emerald-500/40 dark:bg-slate-800 dark:text-slate-100"
                  />
                </>
              )}

              <button
                type="button"
                onClick={handleFinalizar}
                disabled={finalizando || (!souOResponsavel && !senha)}
                className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
              >
                {finalizando ? 'Finalizando...' : 'Finalizar'}
              </button>

              {erroFinalizar && (
                <p role="alert" className="w-full text-xs font-medium text-red-600 dark:text-red-400">
                  {erroFinalizar}
                </p>
              )}
            </div>
          )}

          {confirmandoExclusao && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <span className="text-xs">Excluir esta tarefa? A ação não pode ser desfeita.</span>
              <button
                type="button"
                onClick={handleDelete}
                className="ml-auto rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-500"
              >
                Sim, excluir
              </button>
              <button
                type="button"
                onClick={() => setConfirmandoExclusao(false)}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium transition hover:bg-red-100 dark:border-red-500/40 dark:hover:bg-red-500/10"
              >
                Manter
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-4">
            {editando ? (
              <DeleteButton onClick={() => setConfirmandoExclusao(true)} label="Excluir tarefa" />
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <CancelButton onClick={onClose} />
              <SaveButton disabled={salvando} label={salvando ? 'Salvando...' : 'Salvar'} />
            </div>
          </div>

          {tarefa && (
            <p className="border-t border-slate-100 pt-2 text-[11px] text-slate-400 dark:border-slate-700 dark:text-slate-500">
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
