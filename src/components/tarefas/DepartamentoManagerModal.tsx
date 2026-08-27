import { useState, type FormEvent } from 'react'
import { AddButton } from '../ui/AddButton'
import { CancelButton } from '../ui/ActionButtons'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { ColunaIcone, ICONES_COLUNA } from './ColunaIcone'
import {
  CORES_COLUNA,
  criarClassificacao,
  criarColuna,
  criarDepartamento,
  excluirClassificacao,
  excluirDepartamento,
  excluirColuna,
  type Classificacao,
  type Departamento,
  type Coluna,
} from '../../api/tarefas'

interface DepartamentoManagerModalProps {
  open: boolean
  departamentos: Departamento[]
  departamentoAtual: Departamento | null
  colunas: Coluna[]
  classificacoes: Classificacao[]
  onClose: () => void
  onChanged: (departamentoSelecionadoId?: string) => Promise<void>
}

const inputClass =
  'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300'

export function DepartamentoManagerModal({
  open,
  departamentos,
  departamentoAtual,
  colunas,
  classificacoes,
  onClose,
  onChanged,
}: DepartamentoManagerModalProps) {
  const [novoDepartamento, setNovoDepartamento] = useState('')
  const [novaColuna, setNovaColuna] = useState('')
  const [corColuna, setCorColuna] = useState('slate')
  const [iconeColuna, setIconeColuna] = useState('lista')
  const [novaClassificacao, setNovaClassificacao] = useState('')
  const [confirmacao, setConfirmacao] = useState<{
    titulo: string
    descricao: string
    rotulo: string
    acao: () => void
  } | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  if (!open) return null

  async function executar(acao: () => Promise<void>, departamentoSelecionadoId?: string) {
    setOcupado(true)
    setErro(null)
    try {
      await acao()
      await onChanged(departamentoSelecionadoId)
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Não foi possível concluir a operação.'
      setErro(
        mensagem.includes('duplicate key')
          ? 'Já existe um registro com esse nome.'
          : mensagem,
      )
    } finally {
      setOcupado(false)
    }
  }

  async function handleNovoDepartamento(e?: FormEvent) {
    e?.preventDefault()
    if (!novoDepartamento.trim()) return
    let criadoId = ''
    await executar(async () => {
      const criado = await criarDepartamento(novoDepartamento.trim(), null)
      criadoId = criado.id
      setNovoDepartamento('')
    })
    if (criadoId) await onChanged(criadoId)
  }

  async function handleNovaClassificacao(e?: FormEvent) {
    e?.preventDefault()
    const nome = novaClassificacao.trim()
    if (!nome) return
    await executar(async () => {
      await criarClassificacao(nome, classificacoes.length)
      setNovaClassificacao('')
    })
  }

  async function handleNovaColuna(e?: FormEvent) {
    e?.preventDefault()
    if (!novaColuna.trim() || !departamentoAtual) return
    await executar(async () => {
      await criarColuna(departamentoAtual.id, novaColuna.trim(), corColuna, colunas.length, iconeColuna)
      setNovaColuna('')
    }, departamentoAtual.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Configuração</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Escolha um departamento à esquerda para editar as etapas dele. Excluir um departamento apaga
              as tarefas que estão nele.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            title="Fechar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {erro && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
          >
            {erro}
          </p>
        )}

        <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
          {/* ------------------------------ departamentos ------------------------------ */}
          <section className="flex min-h-0 flex-col">
            <h4 className="flex items-baseline gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              Departamentos
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
                {departamentos.length}
              </span>
            </h4>

            <ul className="mt-3 h-56 space-y-1 overflow-y-auto pr-1">
              {departamentos.map((departamento) => {
                const selecionado = departamento.id === departamentoAtual?.id
                return (
                  <li key={departamento.id}>
                    <div
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition ${
                        selecionado
                          ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-500/40 dark:bg-indigo-500/10'
                          : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onChanged(departamento.id)}
                        className="min-w-0 flex-1 truncate text-left text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-200"
                        title={`Editar as etapas de ${departamento.nome}`}
                      >
                        {departamento.nome}
                      </button>
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() =>
                          setConfirmacao({
                            titulo: `Excluir o departamento ${departamento.nome}?`,
                            descricao:
                              'As etapas e todas as tarefas dele são excluídas junto. Não dá para desfazer.',
                            rotulo: 'Sim, excluir',
                            acao: () => executar(() => excluirDepartamento(departamento.id)),
                          })
                        }
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 dark:hover:bg-red-500/10"
                        aria-label={`Excluir departamento ${departamento.nome}`}
                        title="Excluir departamento"
                      >
                        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M4 7h16" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
                          <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  </li>
                )
              })}

              {departamentos.length === 0 && (
                <li className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-400 dark:border-slate-600 dark:text-slate-500">
                  Nenhum departamento ainda
                </li>
              )}
            </ul>

            <form onSubmit={handleNovoDepartamento} className="mt-3 flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <label className={labelClass} htmlFor="novo-departamento">
                  Novo departamento
                </label>
                <input
                  id="novo-departamento"
                  type="text"
                  value={novoDepartamento}
                  onChange={(e) => setNovoDepartamento(e.target.value)}
                  className={inputClass}
                  placeholder="Comercial"
                />
              </div>
              <AddButton onClick={() => handleNovoDepartamento()} label="Adicionar departamento" disabled={ocupado} />
            </form>
          </section>

          {/* ------------------------------- etapas ------------------------------- */}
          <section className="flex min-h-0 flex-col md:border-l md:border-slate-200 md:pl-6 md:dark:border-slate-700">
            <h4 className="flex items-baseline gap-2 truncate text-sm font-semibold text-slate-900 dark:text-white">
              {departamentoAtual ? `Etapas de ${departamentoAtual.nome}` : 'Etapas'}
              {departamentoAtual && (
                <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
                  {colunas.length}
                </span>
              )}
            </h4>

            {departamentoAtual ? (
              <>
                <ul className="mt-3 h-56 space-y-1 overflow-y-auto pr-1">
                  {colunas.map((coluna) => (
                    <li
                      key={coluna.id}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          CORES_COLUNA[coluna.cor]?.suave ?? 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <ColunaIcone icone={coluna.icone} className="h-[18px] w-[18px]" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-slate-700 dark:text-slate-200">
                          {coluna.nome}
                        </span>
                        {coluna.is_conclusao && (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                            etapa de conclusão
                          </span>
                        )}
                      </span>

                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() =>
                          setConfirmacao({
                            titulo: `Excluir a etapa ${coluna.nome}?`,
                            descricao:
                              'As tarefas que estiverem nela são excluídas junto. Não dá para desfazer.',
                            rotulo: 'Sim, excluir',
                            acao: () => executar(() => excluirColuna(coluna.id), departamentoAtual.id),
                          })
                        }
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 dark:hover:bg-red-500/10"
                        aria-label={`Excluir etapa ${coluna.nome}`}
                        title="Excluir etapa"
                      >
                        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M4 7h16" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
                          <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </li>
                  ))}

                  {colunas.length === 0 && (
                    <li className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-400 dark:border-slate-600 dark:text-slate-500">
                      Nenhuma etapa neste departamento
                    </li>
                  )}
                </ul>

                <form onSubmit={handleNovaColuna} className="mt-3 space-y-2">
                  <div>
                    <label className={labelClass} htmlFor="nova-coluna">
                      Nova etapa
                    </label>
                    <input
                      id="nova-coluna"
                      type="text"
                      value={novaColuna}
                      onChange={(e) => setNovaColuna(e.target.value)}
                      className={inputClass}
                      placeholder="Em revisão"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <label className={labelClass} htmlFor="icone-coluna">
                        Ícone
                      </label>
                      <select
                        id="icone-coluna"
                        value={iconeColuna}
                        onChange={(e) => setIconeColuna(e.target.value)}
                        className={inputClass}
                      >
                        {ICONES_COLUNA.map((icone) => (
                          <option key={icone.valor} value={icone.valor}>
                            {icone.rotulo}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="min-w-0 flex-1">
                      <label className={labelClass} htmlFor="cor-coluna">
                        Cor
                      </label>
                      <select
                        id="cor-coluna"
                        value={corColuna}
                        onChange={(e) => setCorColuna(e.target.value)}
                        className={inputClass}
                      >
                        {Object.entries(CORES_COLUNA).map(([valor, config]) => (
                          <option key={valor} value={valor}>
                            {config.rotulo}
                          </option>
                        ))}
                      </select>
                    </div>

                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        CORES_COLUNA[corColuna]?.suave ?? 'bg-slate-100 text-slate-500'
                      }`}
                      title="Prévia da etapa"
                    >
                      <ColunaIcone icone={iconeColuna} className="h-[18px] w-[18px]" />
                    </span>

                    <AddButton onClick={() => handleNovaColuna()} label="Adicionar etapa" disabled={ocupado} />
                  </div>
                </form>
              </>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed border-slate-300 px-3 py-10 text-center text-sm text-slate-400 dark:border-slate-600 dark:text-slate-500">
                Selecione um departamento para ver as etapas
              </p>
            )}
          </section>
        </div>

        {/* --------------------------- classificações --------------------------- */}
        <section className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
          <h4 className="flex items-baseline gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            Classificações
            <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
              {classificacoes.length}
            </span>
          </h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Valem para todos os departamentos — é o tipo da tarefa (correção, suporte...).
          </p>

          <ul className="mt-3 flex flex-wrap gap-2">
            {classificacoes.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-sm text-slate-700 dark:bg-slate-700 dark:text-slate-200"
              >
                {item.nome}
                <button
                  type="button"
                  onClick={() =>
                    setConfirmacao({
                      titulo: `Excluir a classificação ${item.nome}?`,
                      descricao: 'As tarefas que a usam ficam sem classificação.',
                      rotulo: 'Sim, excluir',
                      acao: () => executar(() => excluirClassificacao(item.id)),
                    })
                  }
                  disabled={ocupado}
                  aria-label={`Excluir ${item.nome}`}
                  title={`Excluir ${item.nome}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50 dark:hover:bg-red-500/10"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            ))}

            {classificacoes.length === 0 && (
              <li className="text-sm text-slate-400 dark:text-slate-500">Nenhuma cadastrada</li>
            )}
          </ul>

          <form onSubmit={handleNovaClassificacao} className="mt-3 flex items-end gap-2">
            <div className="min-w-0 flex-1 md:max-w-xs">
              <label className={labelClass} htmlFor="nova-classificacao">
                Nova classificação
              </label>
              <input
                id="nova-classificacao"
                type="text"
                value={novaClassificacao}
                onChange={(e) => setNovaClassificacao(e.target.value)}
                className={inputClass}
                placeholder="Correção"
              />
            </div>
            <AddButton
              onClick={() => handleNovaClassificacao()}
              label="Adicionar classificação"
              disabled={ocupado}
            />
          </form>
        </section>

        <div className="mt-6 flex justify-end">
          <CancelButton onClick={onClose} label="Fechar" />
        </div>

        <ConfirmDialog
          open={confirmacao !== null}
          title={confirmacao?.titulo ?? ''}
          description={confirmacao?.descricao ?? ''}
          confirmLabel={confirmacao?.rotulo ?? 'Confirmar'}
          onConfirm={() => {
            confirmacao?.acao()
            setConfirmacao(null)
          }}
          onCancel={() => setConfirmacao(null)}
        />
      </div>
    </div>
  )
}
