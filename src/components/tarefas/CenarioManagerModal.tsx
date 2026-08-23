import { useState, type FormEvent } from 'react'
import { AddButton } from '../ui/AddButton'
import { CancelButton } from '../ui/ActionButtons'
import { ColunaIcone, ICONES_COLUNA } from './ColunaIcone'
import {
  CORES_COLUNA,
  criarColuna,
  criarCenario,
  excluirCenario,
  excluirColuna,
  type Cenario,
  type Coluna,
} from '../../api/tarefas'

interface CenarioManagerModalProps {
  open: boolean
  cenarios: Cenario[]
  cenarioAtual: Cenario | null
  colunas: Coluna[]
  onClose: () => void
  onChanged: (cenarioSelecionadoId?: string) => Promise<void>
}

const inputClass =
  'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300'

export function CenarioManagerModal({
  open,
  cenarios,
  cenarioAtual,
  colunas,
  onClose,
  onChanged,
}: CenarioManagerModalProps) {
  const [novoCenario, setNovoCenario] = useState('')
  const [novaColuna, setNovaColuna] = useState('')
  const [corColuna, setCorColuna] = useState('slate')
  const [iconeColuna, setIconeColuna] = useState('lista')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  if (!open) return null

  async function executar(acao: () => Promise<void>, cenarioSelecionadoId?: string) {
    setOcupado(true)
    setErro(null)
    try {
      await acao()
      await onChanged(cenarioSelecionadoId)
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

  async function handleNovoCenario(e?: FormEvent) {
    e?.preventDefault()
    if (!novoCenario.trim()) return
    let criadoId = ''
    await executar(async () => {
      const criado = await criarCenario(novoCenario.trim(), null)
      criadoId = criado.id
      setNovoCenario('')
    })
    if (criadoId) await onChanged(criadoId)
  }

  async function handleNovaColuna(e?: FormEvent) {
    e?.preventDefault()
    if (!novaColuna.trim() || !cenarioAtual) return
    await executar(async () => {
      await criarColuna(cenarioAtual.id, novaColuna.trim(), corColuna, colunas.length, iconeColuna)
      setNovaColuna('')
    }, cenarioAtual.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <header>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Configuração</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Escolha um cenário à esquerda para editar as etapas dele. Excluir um cenário apaga as
            tarefas que estão nele.
          </p>
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
          {/* ------------------------------ cenários ------------------------------ */}
          <section className="flex min-h-0 flex-col">
            <h4 className="flex items-baseline gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              Cenários
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
                {cenarios.length}
              </span>
            </h4>

            <ul className="mt-3 h-56 space-y-1 overflow-y-auto pr-1">
              {cenarios.map((cenario) => {
                const selecionado = cenario.id === cenarioAtual?.id
                return (
                  <li key={cenario.id}>
                    <div
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition ${
                        selecionado
                          ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-500/40 dark:bg-indigo-500/10'
                          : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onChanged(cenario.id)}
                        className="min-w-0 flex-1 truncate text-left text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-200"
                        title={`Editar as etapas de ${cenario.nome}`}
                      >
                        {cenario.nome}
                      </button>
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => executar(() => excluirCenario(cenario.id))}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 dark:hover:bg-red-500/10"
                        aria-label={`Excluir cenário ${cenario.nome}`}
                        title="Excluir cenário"
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

              {cenarios.length === 0 && (
                <li className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-400 dark:border-slate-600 dark:text-slate-500">
                  Nenhum cenário ainda
                </li>
              )}
            </ul>

            <form onSubmit={handleNovoCenario} className="mt-3 flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <label className={labelClass} htmlFor="novo-cenario">
                  Novo cenário
                </label>
                <input
                  id="novo-cenario"
                  type="text"
                  value={novoCenario}
                  onChange={(e) => setNovoCenario(e.target.value)}
                  className={inputClass}
                  placeholder="Comercial"
                />
              </div>
              <AddButton onClick={() => handleNovoCenario()} label="Adicionar cenário" disabled={ocupado} />
            </form>
          </section>

          {/* ------------------------------- etapas ------------------------------- */}
          <section className="flex min-h-0 flex-col md:border-l md:border-slate-200 md:pl-6 md:dark:border-slate-700">
            <h4 className="flex items-baseline gap-2 truncate text-sm font-semibold text-slate-900 dark:text-white">
              {cenarioAtual ? `Etapas de ${cenarioAtual.nome}` : 'Etapas'}
              {cenarioAtual && (
                <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
                  {colunas.length}
                </span>
              )}
            </h4>

            {cenarioAtual ? (
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
                        onClick={() => executar(() => excluirColuna(coluna.id), cenarioAtual.id)}
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
                      Nenhuma etapa neste cenário
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
                Selecione um cenário para ver as etapas
              </p>
            )}
          </section>
        </div>

        <div className="mt-6 flex justify-end">
          <CancelButton onClick={onClose} label="Fechar" />
        </div>
      </div>
    </div>
  )
}
