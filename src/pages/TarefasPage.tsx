import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { TaskCard } from '../components/tarefas/TaskCard'
import { TaskFormModal } from '../components/tarefas/TaskFormModal'
import { CenarioManagerModal } from '../components/tarefas/CenarioManagerModal'
import { supabase } from '../lib/supabaseClient'
import {
  CORES_COLUNA,
  atualizarTarefa,
  criarTarefa,
  excluirTarefa,
  listarCenarios,
  listarColunas,
  listarTarefas,
  moverTarefa,
  type Cenario,
  type Coluna,
  type Tarefa,
  type TarefaInput,
} from '../api/tarefas'
import type { Profile } from '../types/profile'

export function TarefasPage() {
  const [cenarios, setCenarios] = useState<Cenario[]>([])
  const [cenarioId, setCenarioId] = useState('')
  const [colunas, setColunas] = useState<Coluna[]>([])
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [pessoas, setPessoas] = useState<Profile[]>([])

  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [modalTarefa, setModalTarefa] = useState<Tarefa | null | undefined>(undefined)
  const [gerenciando, setGerenciando] = useState(false)
  const [arrastada, setArrastada] = useState<Tarefa | null>(null)
  const [colunaAlvo, setColunaAlvo] = useState<string | null>(null)

  const mapaPessoas = useMemo(() => new Map(pessoas.map((p) => [p.id, p])), [pessoas])

  const carregarBase = useCallback(async (selecionar?: string) => {
    setCarregando(true)
    setErro(null)
    try {
      const [lista, { data: perfis }] = await Promise.all([
        listarCenarios(),
        supabase.from('profiles').select('*').eq('status', 'active').order('name'),
      ])
      setCenarios(lista)
      setPessoas((perfis as Profile[]) ?? [])
      const escolhido = selecionar ?? (lista.some((c) => c.id === cenarioId) ? cenarioId : lista[0]?.id ?? '')
      setCenarioId(escolhido)
      if (!escolhido) {
        setColunas([])
        setTarefas([])
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível carregar os cenários.')
    } finally {
      setCarregando(false)
    }
  }, [cenarioId])

  const carregarQuadro = useCallback(async (id: string) => {
    if (!id) return
    setErro(null)
    try {
      const [cols, tks] = await Promise.all([listarColunas(id), listarTarefas(id)])
      setColunas(cols)
      setTarefas(tks)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível carregar o quadro.')
    }
  }, [])

  useEffect(() => {
    carregarBase()
    // carregarBase depende de cenarioId só para preservar a seleção; rodar uma vez basta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    carregarQuadro(cenarioId)
  }, [cenarioId, carregarQuadro])

  const cenarioAtual = cenarios.find((c) => c.id === cenarioId) ?? null

  async function handleSalvarTarefa(input: TarefaInput) {
    if (modalTarefa) {
      await atualizarTarefa(modalTarefa.id, input)
    } else {
      const ordem = tarefas.filter((t) => t.coluna_id === input.coluna_id).length
      await criarTarefa({ ...input, ordem })
    }
    setModalTarefa(undefined)
    await carregarQuadro(cenarioId)
  }

  async function handleExcluirTarefa(tarefa: Tarefa) {
    await excluirTarefa(tarefa.id)
    setModalTarefa(undefined)
    await carregarQuadro(cenarioId)
  }

  async function handleMover(tarefa: Tarefa, colunaDestino: string) {
    if (tarefa.coluna_id === colunaDestino) return
    const ordem = tarefas.filter((t) => t.coluna_id === colunaDestino).length
    // atualiza a tela antes da resposta do servidor e desfaz se falhar
    const anterior = tarefas
    setTarefas((prev) =>
      prev.map((t) => (t.id === tarefa.id ? { ...t, coluna_id: colunaDestino, ordem } : t)),
    )
    try {
      await moverTarefa(tarefa.id, colunaDestino, ordem)
    } catch (err) {
      setTarefas(anterior)
      setErro(err instanceof Error ? err.message : 'Não foi possível mover a tarefa.')
    }
  }

  return (
    <AppLayout>
      <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6 dark:bg-slate-800">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Tarefas</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Quadro kanban por cenário. Arraste os cartões entre as colunas.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="cenario">
                Cenário
              </label>
              <select
                id="cenario"
                value={cenarioId}
                onChange={(e) => setCenarioId(e.target.value)}
                disabled={cenarios.length === 0}
                className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                {cenarios.length === 0 && <option value="">Nenhum cenário</option>}
                {cenarios.map((cenario) => (
                  <option key={cenario.id} value={cenario.id}>
                    {cenario.nome}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setGerenciando(true)}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-label="Gerenciar cenários e colunas"
              title="Gerenciar cenários e colunas"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setModalTarefa(null)}
              disabled={!cenarioAtual || colunas.length === 0}
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-600 text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-slate-900"
              aria-label="Nova tarefa"
              title="Nova tarefa"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        </header>

        {erro && (
          <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {erro}
          </p>
        )}

        {carregando && (
          <p role="status" className="text-sm text-slate-500 dark:text-slate-400">
            Carregando quadro...
          </p>
        )}

        {!carregando && cenarios.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-600">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Nenhum cenário ainda</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
              Um cenário é um quadro (ex.: Comercial, Suporte). Ele já nasce com as colunas A fazer, Em
              andamento e Concluído, que você pode ajustar depois.
            </p>
            <button
              type="button"
              onClick={() => setGerenciando(true)}
              className="mt-4 min-h-11 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              Criar primeiro cenário
            </button>
          </div>
        )}

        {!carregando && cenarios.length > 0 && colunas.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Este cenário não tem colunas. Abra o gerenciador para cadastrar a primeira.
          </p>
        )}

        {!carregando && colunas.length > 0 && (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {colunas.map((coluna) => {
              const daColuna = tarefas.filter((t) => t.coluna_id === coluna.id)
              const cor = CORES_COLUNA[coluna.cor] ?? CORES_COLUNA.slate
              return (
                <section
                  key={coluna.id}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    setColunaAlvo(coluna.id)
                  }}
                  onDragLeave={() => setColunaAlvo((atual) => (atual === coluna.id ? null : atual))}
                  onDrop={(e) => {
                    e.preventDefault()
                    setColunaAlvo(null)
                    if (arrastada) handleMover(arrastada, coluna.id)
                    setArrastada(null)
                  }}
                  className={`flex w-72 shrink-0 flex-col rounded-2xl border p-3 transition ${
                    colunaAlvo === coluna.id
                      ? 'border-indigo-400 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-500/5'
                      : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40'
                  }`}
                >
                  <header className="mb-3 flex items-center justify-between gap-2">
                    <h3 className={`flex items-center gap-2 text-sm font-semibold ${cor.cabecalho}`}>
                      <span className={`h-2.5 w-2.5 rounded-full ${cor.ponto}`} aria-hidden="true" />
                      {coluna.nome}
                    </h3>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {daColuna.length}
                    </span>
                  </header>

                  <div className="flex flex-col gap-2">
                    {daColuna.map((tarefa) => (
                      <TaskCard
                        key={tarefa.id}
                        tarefa={tarefa}
                        colunas={colunas}
                        pessoas={mapaPessoas}
                        onEditar={setModalTarefa}
                        onMover={handleMover}
                        onDragStart={setArrastada}
                        onDragEnd={() => {
                          setArrastada(null)
                          setColunaAlvo(null)
                        }}
                        arrastando={arrastada?.id === tarefa.id}
                      />
                    ))}

                    {daColuna.length === 0 && (
                      <p className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400 dark:border-slate-600 dark:text-slate-500">
                        Nenhuma tarefa aqui
                      </p>
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>

      {modalTarefa !== undefined && cenarioAtual && (
        <TaskFormModal
          key={modalTarefa?.id ?? 'nova'}
          open
          cenarioId={cenarioAtual.id}
          colunas={colunas}
          pessoas={pessoas}
          tarefa={modalTarefa}
          onClose={() => setModalTarefa(undefined)}
          onSubmit={handleSalvarTarefa}
          onDelete={handleExcluirTarefa}
        />
      )}

      <CenarioManagerModal
        open={gerenciando}
        cenarios={cenarios}
        cenarioAtual={cenarioAtual}
        colunas={colunas}
        onClose={() => setGerenciando(false)}
        onChanged={async (selecionado) => {
          await carregarBase(selecionado)
          if (selecionado) await carregarQuadro(selecionado)
        }}
      />
    </AppLayout>
  )
}
