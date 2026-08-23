import { useState, type FormEvent } from 'react'
import { AddButton } from '../ui/AddButton'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Cenários e colunas</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Cada cenário é um quadro com suas próprias colunas. Excluir um cenário apaga as tarefas dele.
        </p>

        {erro && (
          <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {erro}
          </p>
        )}

        <section className="mt-6">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Cenários</h4>
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-700">
            {cenarios.map((cenario) => (
              <li key={cenario.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-slate-700 dark:text-slate-200">{cenario.nome}</span>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => executar(() => excluirCenario(cenario.id))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 dark:bg-red-500/10 dark:text-red-400"
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
              </li>
            ))}
            {cenarios.length === 0 && (
              <li className="py-2 text-sm text-slate-500 dark:text-slate-400">Nenhum cenário cadastrado.</li>
            )}
          </ul>

          <form onSubmit={handleNovoCenario} className="mt-3 flex items-end gap-3">
            <div className="flex-1">
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

        {cenarioAtual && (
          <section className="mt-8">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Colunas de "{cenarioAtual.nome}"
            </h4>
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-700">
              {colunas.map((coluna) => (
                <li key={coluna.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${CORES_COLUNA[coluna.cor]?.ponto ?? 'bg-slate-400'}`}
                      aria-hidden="true"
                    />
                    <ColunaIcone icone={coluna.icone} className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    {coluna.nome}
                    {coluna.is_conclusao && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                        conclusão
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => executar(() => excluirColuna(coluna.id), cenarioAtual.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 dark:bg-red-500/10 dark:text-red-400"
                    aria-label={`Excluir coluna ${coluna.nome}`}
                    title="Excluir coluna"
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
            </ul>

            <form onSubmit={handleNovaColuna} className="mt-3 flex items-end gap-3">
              <div className="flex-1">
                <label className={labelClass} htmlFor="nova-coluna">
                  Nova coluna
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
              <div className="w-28">
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
              <div className="w-28">
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
              <AddButton onClick={() => handleNovaColuna()} label="Adicionar coluna" disabled={ocupado} />
            </form>
          </section>
        )}

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
