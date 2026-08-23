import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { TaskCard } from '../components/tarefas/TaskCard'
import { TaskFormModal } from '../components/tarefas/TaskFormModal'
import { CenarioManagerModal } from '../components/tarefas/CenarioManagerModal'
import { AddButton } from '../components/ui/AddButton'
import { ColunaIcone } from '../components/tarefas/ColunaIcone'
import { FiltroPessoas, type DimensaoFiltro } from '../components/tarefas/FiltroPessoas'
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
  const [searchParams, setSearchParams] = useSearchParams()
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
  const [dimensaoFiltro, setDimensaoFiltro] = useState<DimensaoFiltro>('responsavel')
  const [filtroPessoa, setFiltroPessoa] = useState<string | null>(null)

  const mapaPessoas = useMemo(() => new Map(pessoas.map((p) => [p.id, p])), [pessoas])

  // só entra no filtro quem tem tarefa no cenário aberto
  const responsaveis = useMemo(() => {
    const ids = new Set(tarefas.map((t) => t.responsavel_id).filter(Boolean))
    return pessoas.filter((pessoa) => ids.has(pessoa.id))
  }, [tarefas, pessoas])

  const executores = useMemo(() => {
    const ids = new Set(tarefas.map((t) => t.executor_id).filter(Boolean))
    return pessoas.filter((pessoa) => ids.has(pessoa.id))
  }, [tarefas, pessoas])

  const pessoasDoFiltro = dimensaoFiltro === 'responsavel' ? responsaveis : executores

  const tarefasVisiveis = useMemo(() => {
    if (!filtroPessoa) return tarefas
    return tarefas.filter((t) =>
      dimensaoFiltro === 'responsavel' ? t.responsavel_id === filtroPessoa : t.executor_id === filtroPessoa,
    )
  }, [tarefas, filtroPessoa, dimensaoFiltro])

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

  // o item "Cenários" do menu lateral chega por query string
  useEffect(() => {
    if (searchParams.get('config') === '1') {
      setGerenciando(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const cenarioAtual = cenarios.find((c) => c.id === cenarioId) ?? null

  async function handleSalvarTarefa(input: TarefaInput, senha?: string) {
    if (modalTarefa) {
      await atualizarTarefa(modalTarefa.id, input, senha)
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
      // o trigger grava (ou zera) a data de conclusão: usar a linha que voltou
      const atualizada = await moverTarefa(tarefa.id, colunaDestino, ordem)
      setTarefas((prev) => prev.map((t) => (t.id === atualizada.id ? atualizada : t)))
    } catch (err) {
      setTarefas(anterior)
      setErro(err instanceof Error ? err.message : 'Não foi possível mover a tarefa.')
    }
  }

  return (
    <AppLayout>
      <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-sm sm:p-6 dark:bg-slate-800">
        <header className="mb-4 flex shrink-0 flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Tarefas</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Quadro kanban por cenário. Arraste os cartões entre as colunas.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <FiltroPessoas
              dimensao={dimensaoFiltro}
              onDimensao={setDimensaoFiltro}
              pessoas={pessoasDoFiltro}
              selecionado={filtroPessoa}
              onSelecionar={setFiltroPessoa}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="cenario">
                Cenário
              </label>
              <select
                id="cenario"
                value={cenarioId}
                onChange={(e) => {
                  setFiltroPessoa(null)
                  setCenarioId(e.target.value)
                }}
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



<AddButton
              onClick={() => setModalTarefa(null)}
              label="Nova tarefa"
              disabled={!cenarioAtual || colunas.length === 0}
            />
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
            <div className="mt-4 flex justify-center">
              <AddButton onClick={() => setGerenciando(true)} label="Criar primeiro cenário" />
            </div>
          </div>
        )}

        {!carregando && cenarios.length > 0 && colunas.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Este cenário não tem colunas. Abra o gerenciador para cadastrar a primeira.
          </p>
        )}

        {!carregando && colunas.length > 0 && (
          <div className="grid min-h-0 flex-1 gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            {colunas.map((coluna) => {
              const daColuna = tarefasVisiveis.filter((t) => t.coluna_id === coluna.id)
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
                  className={`flex min-h-0 min-w-0 flex-col rounded-2xl border p-3 transition ${
                    colunaAlvo === coluna.id
                      ? 'border-indigo-400 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-500/5'
                      : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40'
                  }`}
                >
                  <header className="mb-3 flex shrink-0 items-center justify-between gap-2">
                    <h3 className={`flex min-w-0 items-center gap-2 text-sm font-semibold ${cor.cabecalho}`}>
                      <ColunaIcone icone={coluna.icone} className="h-4 w-4 shrink-0" />
                      <span className="truncate">{coluna.nome}</span>
                    </h3>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {daColuna.length}
                    </span>
                  </header>

                  <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
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
          onFinalizada={async () => {
            setModalTarefa(undefined)
            await carregarQuadro(cenarioId)
          }}
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
