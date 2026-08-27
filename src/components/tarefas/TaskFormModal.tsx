import { useState, type FormEvent } from 'react'
import {
  CAMPOS_RESTRITOS,
  FinalizarError,
  finalizarTarefa,
  type Classificacao,
  type Departamento,
  type Coluna,
  type Prioridade,
  type Tarefa,
  type TarefaInput,
} from '../../api/tarefas'
import { CancelButton, DeleteButton, SaveButton } from '../ui/ActionButtons'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { AnexosTarefa } from './AnexosTarefa'
import { SenhaResponsavelDialog } from './SenhaResponsavelDialog'
import type { Profile } from '../../types/profile'
import { useAuth } from '../../contexts/AuthContext'

interface TaskFormModalProps {
  open: boolean
  departamentoId: string
  departamentos: Departamento[]
  /** Todas as colunas: o select de etapa filtra pelas do departamento escolhido. */
  colunas: Coluna[]
  classificacoes: Classificacao[]
  pessoas: Profile[]
  tarefa: Tarefa | null
  onClose: () => void
  onSubmit: (input: TarefaInput, senha?: string) => Promise<void>
  onDelete: (tarefa: Tarefa) => Promise<void>
  onFinalizada: () => Promise<void>
}

// text-base no mobile é obrigatório: abaixo de 16px o iOS dá zoom sozinho ao focar
const inputClass =
  'block min-h-[52px] w-full rounded-lg border border-slate-300 px-3 pb-1.5 pt-5 text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 md:min-h-0 md:text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
const labelClass =
  'pointer-events-none absolute left-3 top-1 z-10 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400'
const inputErroClass =
  'block min-h-[52px] w-full rounded-lg border border-red-500 px-3 pb-1.5 pt-5 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 md:min-h-0 md:text-sm dark:bg-slate-800 dark:text-slate-100'
const erroCampoClass = 'mt-1 text-xs text-red-600 dark:text-red-400'

const PRIORIDADES_FORM = [
  { valor: 'baixa' as const, rotulo: 'Baixa', ponto: 'bg-slate-400' },
  { valor: 'media' as const, rotulo: 'Média', ponto: 'bg-amber-500' },
  { valor: 'alta' as const, rotulo: 'Alta', ponto: 'bg-red-500' },
]

export function TaskFormModal({
  open,
  departamentoId,
  departamentos,
  colunas,
  classificacoes,
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
  const [departamentoSelecionado, setDepartamentoSelecionado] = useState(tarefa?.departamento_id ?? departamentoId)
  const colunasDoDepartamento = colunas.filter((c) => c.departamento_id === departamentoSelecionado)
  const [colunaId, setColunaId] = useState(tarefa?.coluna_id ?? colunasDoDepartamento[0]?.id ?? '')
  const [solicitanteId, setSolicitanteId] = useState(tarefa?.solicitante_id ?? '')
  const [responsavelId, setResponsavelId] = useState(tarefa?.responsavel_id ?? '')
  const [executorId, setExecutorId] = useState(tarefa?.executor_id ?? '')
  const [prazo, setPrazo] = useState(tarefa?.prazo ?? '')
  const [prioridade, setPrioridade] = useState<Prioridade>(tarefa?.prioridade ?? 'media')
  const [classificacaoId, setClassificacaoId] = useState(tarefa?.classificacao_id ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const [confirmandoFinalizar, setConfirmandoFinalizar] = useState(false)
  const [pedindoSenha, setPedindoSenha] = useState(false)
  const [pedindoSenhaSalvar, setPedindoSenhaSalvar] = useState(false)
  const [erroFinalizar, setErroFinalizar] = useState<string | null>(null)

  if (!open) return null

  const editando = Boolean(tarefa)
  const colunaSalva = tarefa ? colunas.find((c) => c.id === tarefa.coluna_id) : undefined
  const podeFinalizar = Boolean(tarefa && colunaSalva?.is_conclusao && !tarefa.finalizada_em)
  const souOResponsavel = Boolean(tarefa?.responsavel_id && tarefa.responsavel_id === user?.id)
  const nomeResponsavel = pessoas.find((p) => p.id === tarefa?.responsavel_id)?.name
  const quemAlterou = pessoas.find((p) => p.id === tarefa?.updated_by)?.name
  const avisoRestrito =
    editando && !souOResponsavel
      ? `Alterar este campo exige a senha de ${nomeResponsavel ?? 'o responsável'}`
      : undefined

  /** Todos os campos são obrigatórios — vale para salvar e para finalizar. */
  function validarCampos(acao: 'salvar' | 'finalizar'): boolean {
    const faltando: Record<string, string> = {}
    if (!titulo.trim()) faltando.titulo = 'Informe o título.'
    if (!descricao.trim()) faltando.descricao = 'Informe a descrição.'
    if (!solicitanteId) faltando.solicitante = 'Escolha o solicitante.'
    if (!responsavelId) faltando.responsavel = 'Escolha o responsável.'
    if (!executorId) faltando.executor = 'Escolha o executor.'
    if (!prazo) faltando.prazo = 'Informe o prazo.'
    if (!departamentoSelecionado) faltando.departamento = 'Escolha o departamento.'
    if (!colunaId) faltando.coluna = 'Escolha a etapa.'

    setCampos(faltando)
    if (Object.keys(faltando).length > 0) {
      setErro(`Preencha todos os campos para ${acao}.`)
      return false
    }
    setErro(null)
    return true
  }

  function montarInput(): TarefaInput {
    return {
      departamento_id: departamentoSelecionado,
      coluna_id: colunaId,
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      solicitante_id: solicitanteId || null,
      responsavel_id: responsavelId || null,
      executor_id: executorId || null,
      prazo: prazo || null,
      prioridade,
      classificacao_id: classificacaoId || null,
    }
  }

  /** Título, solicitante, responsável, executor e prazo são do responsável. */
  function mudouCampoRestrito(): boolean {
    if (!tarefa) return false
    const input = montarInput() as unknown as Record<string, unknown>
    const original = tarefa as unknown as Record<string, unknown>
    return CAMPOS_RESTRITOS.some((campo) => (input[campo] ?? null) !== (original[campo] ?? null))
  }

  async function salvar(senha?: string) {
    setSalvando(true)
    setErro(null)
    try {
      await onSubmit(montarInput(), senha)
      setPedindoSenhaSalvar(false)
    } catch (err) {
      if (err instanceof FinalizarError && err.senhaObrigatoria) {
        setPedindoSenhaSalvar(true)
        setErro(senha ? err.message : null)
      } else {
        setErro(err instanceof Error ? err.message : 'Não foi possível salvar a tarefa.')
      }
    } finally {
      setSalvando(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)

    if (!validarCampos('salvar')) return

    // quem não é o responsável precisa da senha dele para mexer nos campos restritos
    if (editando && !souOResponsavel && mudouCampoRestrito()) {
      setPedindoSenhaSalvar(true)
      return
    }

    await salvar()
  }

  function handleClickFinalizar() {
    setErroFinalizar(null)
    if (!validarCampos('finalizar')) return
    // confirmar antes de qualquer coisa: finalizar tira a tarefa do quadro
    setConfirmandoFinalizar(true)
  }

  function handleConfirmarFinalizar() {
    setConfirmandoFinalizar(false)
    if (souOResponsavel) {
      handleFinalizar()
      return
    }
    // a senha só é pedida depois da confirmação, e só de quem não é responsável
    setPedindoSenha(true)
  }

  async function handleFinalizar(senhaInformada?: string) {
    if (!tarefa) return
    setFinalizando(true)
    setErroFinalizar(null)
    try {
      await finalizarTarefa(tarefa.id, senhaInformada)
      await onFinalizada()
    } catch (err) {
      if (err instanceof FinalizarError) {
        setErroFinalizar(err.message)
      } else {
        setErroFinalizar('Não foi possível finalizar a tarefa.')
      }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      {/* largura maior + duas colunas: cabe inteiro na tela, sem rolagem */}
      <div className="flex max-h-full w-full flex-col overflow-hidden rounded-2xl bg-white p-5 shadow-xl md:max-h-[95vh] md:max-w-3xl dark:bg-slate-800">
        <div className="flex items-baseline gap-2">
          <h3 className="text-base font-semibold text-slate-900 md:text-lg dark:text-white">
            {editando ? 'Editar tarefa' : 'Nova tarefa'}
          </h3>
          {tarefa && (
            <span
              className="font-mono text-sm text-slate-400 dark:text-slate-500"
              title={`Identificador interno: ${tarefa.id}`}
            >
              #{tarefa.numero}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-3 flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto md:space-y-3">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4 md:space-y-3">
              <div className="relative">
                <label className={labelClass} htmlFor="tarefa-titulo">
                  Título
                </label>
                <input
                  id="tarefa-titulo"
                  title={avisoRestrito}
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

              <div className="relative">
                <label className={labelClass} htmlFor="tarefa-descricao">
                  Descrição
                </label>
                <textarea
                  id="tarefa-descricao"
                  rows={2}
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

            <div className="space-y-4 md:space-y-3">
              <div className="relative">
                <label className={labelClass} htmlFor="tarefa-solicitante">
                  Solicitante
                </label>
                <select
                  id="tarefa-solicitante"
                  title={avisoRestrito}
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

              <div className="relative">
                <label className={labelClass} htmlFor="tarefa-responsavel">
                  Responsável
                </label>
                <select
                  id="tarefa-responsavel"
                  title={avisoRestrito}
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

              <div className="relative">
                <label className={labelClass} htmlFor="tarefa-executor">
                  Executor
                </label>
                <select
                  id="tarefa-executor"
                  title={avisoRestrito}
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

          {/* departamento, prazo, etapa e prioridade dividem as linhas de baixo */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 md:gap-4 lg:grid-cols-4">
            <div className="relative">
              <label className={labelClass} htmlFor="tarefa-departamento">
                Departamento
              </label>
              <select
                id="tarefa-departamento"
                value={departamentoSelecionado}
                onChange={(e) => {
                  const novo = e.target.value
                  setDepartamentoSelecionado(novo)
                  // a etapa pertence ao departamento: volta para a primeira dele
                  const primeira = colunas.find((c) => c.departamento_id === novo)
                  setColunaId(primeira?.id ?? '')
                }}
                className={campos.departamento ? inputErroClass : inputClass}
                aria-invalid={Boolean(campos.departamento)}
              >
                {departamentos.map((departamento) => (
                  <option key={departamento.id} value={departamento.id}>
                    {departamento.nome}
                  </option>
                ))}
              </select>
              {campos.departamento && <p className={erroCampoClass}>{campos.departamento}</p>}
            </div>

            <div className="relative">
              <label className={labelClass} htmlFor="tarefa-prazo">
                Prazo
              </label>
              <input
                id="tarefa-prazo"
                  title={avisoRestrito}
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

            <div className="relative">
              <label className={labelClass} htmlFor="tarefa-classificacao">
                Classificação
              </label>
              <select
                id="tarefa-classificacao"
                value={classificacaoId}
                onChange={(e) => setClassificacaoId(e.target.value)}
                className={inputClass}
              >
                <option value="">Sem classificação</option>
                {classificacoes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
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
                {colunasDoDepartamento.map((coluna) => (
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

            <div className="relative">
              <span className={labelClass} id="rotulo-prioridade">
                Prioridade
              </span>
              <div className="mt-5 flex gap-0" role="radiogroup" aria-labelledby="rotulo-prioridade">
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
                      aria-label={item.rotulo}
                      className="flex h-11 w-10 shrink-0 items-center justify-center rounded-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 md:h-8 md:w-8"
                    >
                      {/* o retângulo só existe no selecionado; nos outros fica a bolinha */}
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-md border transition ${
                          ativo
                            ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10'
                            : 'border-transparent'
                        }`}
                      >
                        <span className={`h-3.5 w-3.5 rounded-full ${item.ponto}`} aria-hidden="true" />
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="relative">
              <span className={labelClass}>Anexos</span>
              <div className="mt-5">
                <AnexosTarefa tarefaId={tarefa?.id ?? null} compacto />
              </div>
            </div>
          </div>

          {erro && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {erro}
            </p>
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

          </div>

          <div className="shrink-0 border-t border-slate-200 pt-3 md:border-0 md:pt-0 dark:border-slate-700">
          <div className="flex items-center gap-2 md:flex-wrap md:gap-3 md:pt-4">
            {editando ? (
              <DeleteButton onClick={() => setConfirmandoExclusao(true)} label="Excluir tarefa" />
            ) : (
              <span />
            )}

            {podeFinalizar && (
              <button
                type="button"
                onClick={handleClickFinalizar}
                disabled={finalizando}
                aria-label="Finalizar"
                className="flex h-11 shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 md:px-4 dark:focus:ring-offset-slate-800"
                title={
                  souOResponsavel
                    ? 'Finalizar — a tarefa sai do quadro'
                    : `Pede a senha de ${nomeResponsavel ?? 'o responsável'}`
                }
              >
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 11l2.5 2.5L16 8.5" />
                  <path d="M20.5 12a8.5 8.5 0 1 1-3.2-6.6" />
                </svg>
                <span className="hidden md:inline">
                  {finalizando ? 'Finalizando...' : 'Finalizar'}
                </span>
              </button>
            )}

            <div className="ml-auto flex shrink-0 gap-2">
              <CancelButton onClick={onClose} />
              <SaveButton disabled={salvando} label={salvando ? 'Salvando...' : 'Salvar'} />
            </div>

            {erroFinalizar && !pedindoSenha && (
              <p role="alert" className="w-full text-xs font-medium text-red-600 dark:text-red-400">
                {erroFinalizar}
              </p>
            )}
          </div>

          {tarefa && (
            <p className="mt-4 hidden border-t border-slate-100 pt-3 text-[11px] text-slate-400 md:block dark:border-slate-700 dark:text-slate-500">
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
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={confirmandoFinalizar}
        tom="positivo"
        title={`Finalizar a tarefa #${tarefa?.numero ?? ''}?`}
        description={
          souOResponsavel
            ? 'Ela sai do quadro e passa a aparecer só na lista de finalizadas. Dá para reabrir depois.'
            : `Ela sai do quadro. Como você não é ${nomeResponsavel ?? 'o responsável'}, a senha dele será pedida em seguida.`
        }
        confirmLabel="Sim, finalizar"
        onConfirm={handleConfirmarFinalizar}
        onCancel={() => setConfirmandoFinalizar(false)}
      />

      <SenhaResponsavelDialog
        open={pedindoSenhaSalvar}
        titulo="Alterar tarefa"
        acao="alterar estes campos de"
        nomeResponsavel={nomeResponsavel ?? 'o responsável'}
        processando={salvando}
        erro={erro}
        onConfirmar={(senhaDigitada) => salvar(senhaDigitada)}
        onCancelar={() => {
          setPedindoSenhaSalvar(false)
          setErro(null)
        }}
      />

      <SenhaResponsavelDialog
        open={pedindoSenha}
        titulo="Finalizar tarefa"
        acao="finalizar"
        nomeResponsavel={nomeResponsavel ?? 'o responsável'}
        processando={finalizando}
        erro={erroFinalizar}
        onConfirmar={(senhaDigitada) => handleFinalizar(senhaDigitada)}
        onCancelar={() => {
          setPedindoSenha(false)
          setErroFinalizar(null)
        }}
      />
    </div>
  )
}
