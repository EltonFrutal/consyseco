import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { TaskCard } from '../components/tarefas/TaskCard'
import { TaskFormModal } from '../components/tarefas/TaskFormModal'
import { CenarioManagerModal } from '../components/tarefas/CenarioManagerModal'
import { AddButton } from '../components/ui/AddButton'
import { ColunaIcone } from '../components/tarefas/ColunaIcone'
import { FiltroPessoas, type DimensaoFiltro } from '../components/tarefas/FiltroPessoas'
import { useIsMobile } from '../hooks/useIsMobile'
import { supabase } from '../lib/supabaseClient'
import {
  CORES_COLUNA,
  atualizarTarefa,
  criarTarefa,
  excluirTarefa,
  listarCenarios,
  listarColunas,
  listarTarefas,
  listarTarefasDeTodos,
  listarTodasColunas,
  moverTarefa,
  notificarTarefa,
  type Cenario,
  type Coluna,
  type Tarefa,
  type TarefaInput,
} from '../api/tarefas'
import type { Profile } from '../types/profile'

const TODOS = 'todos'

const seletorMobileClass =
  'block min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'

export function TarefasPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [cenarios, setCenarios] = useState<Cenario[]>([])
  const [cenarioId, setCenarioId] = useState(TODOS)
  const [colunas, setColunas] = useState<Coluna[]>([])
  const [todasColunas, setTodasColunas] = useState<Coluna[]>([])
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

  const mobile = useIsMobile()
  const [etapaAtiva, setEtapaAtiva] = useState<string | null>(null)

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
      const [lista, cols, { data: perfis }] = await Promise.all([
        listarCenarios(),
        listarTodasColunas(),
        supabase.from('profiles').select('*').eq('status', 'active').order('name'),
      ])
      setCenarios(lista)
      setTodasColunas(cols)
      setPessoas((perfis as Profile[]) ?? [])
      // o padrão é ver tudo; só troca se pedirem um cenário específico
      const escolhido =
        selecionar ?? (cenarioId === TODOS || lista.some((c) => c.id === cenarioId) ? cenarioId : TODOS)
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

  const carregarQuadro = useCallback(
    async (id: string) => {
      if (!id) return
      setErro(null)
      try {
        if (id === TODOS) {
          const [cols, tks] = await Promise.all([listarTodasColunas(), listarTarefasDeTodos()])
          setTodasColunas(cols)
          // etapas de mesmo nome viram uma coluna só
          const agrupadas = new Map<string, Coluna>()
          cols.forEach((coluna) => {
            const chave = coluna.nome.toLowerCase()
            const atual = agrupadas.get(chave)
            if (!atual || coluna.ordem < atual.ordem) agrupadas.set(chave, coluna)
          })
          setColunas([...agrupadas.values()].sort((a, b) => a.ordem - b.ordem))
          setTarefas(tks)
          return
        }

        const [cols, tks] = await Promise.all([listarColunas(id), listarTarefas(id)])
        setColunas(cols)
        setTarefas(tks)
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Não foi possível carregar o quadro.')
      }
    },
    [],
  )

  useEffect(() => {
    carregarBase()
    // carregarBase depende de cenarioId só para preservar a seleção; rodar uma vez basta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    carregarQuadro(cenarioId)
  }, [cenarioId, carregarQuadro])

  // /tarefas/config é a rota do item Configuração: mantém o menu marcado
  useEffect(() => {
    setGerenciando(pathname === '/tarefas/config')
  }, [pathname])

  const cenarioAtual = cenarios.find((c) => c.id === cenarioId) ?? null
  const colunaAtiva = colunas.find((c) => c.id === etapaAtiva) ?? null

  /** Nome (minúsculo) da coluna de uma tarefa — usado no modo "Todos". */
  function nomeDaColuna(colunaId: string): string {
    return (todasColunas.find((c) => c.id === colunaId)?.nome ?? '').toLowerCase()
  }

  /** As tarefas de uma etapa. No modo "Todos" as colunas de mesmo nome somam. */
  function tarefasDaColuna(coluna: Coluna): Tarefa[] {
    return tarefasVisiveis.filter((t) =>
      cenarioId === TODOS
        ? nomeDaColuna(t.coluna_id) === coluna.nome.toLowerCase()
        : t.coluna_id === coluna.id,
    )
  }

  // trocar de cenário troca as colunas: a etapa aberta no mobile precisa existir
  useEffect(() => {
    if (colunas.length === 0) return setEtapaAtiva(null)
    setEtapaAtiva((atual) =>
      atual && colunas.some((c) => c.id === atual) ? atual : colunas[0].id,
    )
  }, [colunas])

  async function handleSalvarTarefa(input: TarefaInput, senha?: string) {
    if (modalTarefa) {
      await atualizarTarefa(modalTarefa.id, input, senha)
      // executor novo recebe como tarefa nova; troca de etapa avisa a contraparte
      if (input.executor_id && input.executor_id !== modalTarefa.executor_id) {
        await notificarTarefa(modalTarefa.id, 'nova')
      } else if (input.coluna_id !== modalTarefa.coluna_id) {
        await notificarTarefa(modalTarefa.id, 'status')
      }
    } else {
      const ordem = tarefas.filter((t) => t.coluna_id === input.coluna_id).length
      const criada = await criarTarefa({ ...input, ordem })
      if (criada?.id) await notificarTarefa(criada.id, 'nova')
    }
    setModalTarefa(undefined)
    await carregarQuadro(cenarioId)
  }

  async function handleExcluirTarefa(tarefa: Tarefa) {
    await excluirTarefa(tarefa.id)
    setModalTarefa(undefined)
    await carregarQuadro(cenarioId)
  }

  async function handleMover(tarefa: Tarefa, colunaAlvoId: string) {
    // no modo "Todos" a coluna clicada é de outro cenário: usar a de mesmo nome
    let colunaDestino = colunaAlvoId
    if (cenarioId === TODOS) {
      const nomeAlvo = (todasColunas.find((c) => c.id === colunaAlvoId)?.nome ?? '').toLowerCase()
      const equivalente = todasColunas.find(
        (c) => c.cenario_id === tarefa.cenario_id && c.nome.toLowerCase() === nomeAlvo,
      )
      if (!equivalente) {
        setErro('O cenário desta tarefa não tem uma etapa equivalente.')
        return
      }
      colunaDestino = equivalente.id
    }

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
      await notificarTarefa(atualizada.id, 'status')
    } catch (err) {
      setTarefas(anterior)
      setErro(err instanceof Error ? err.message : 'Não foi possível mover a tarefa.')
    }
  }

  return (
    <AppLayout>
      <div className="flex h-full flex-col overflow-hidden md:rounded-2xl md:bg-white md:p-4 md:shadow-sm lg:p-6 md:dark:bg-slate-800">
        <header className="mb-3 flex shrink-0 flex-wrap items-end justify-between gap-3 md:mb-4 md:gap-4">
          <div className="hidden md:block">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Tarefas</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Quadro kanban por cenário. Arraste os cartões entre as colunas.
            </p>
          </div>

          <div className="flex w-full flex-wrap items-end gap-3 md:w-auto md:gap-6">
            {mobile ? (
              <div className="min-w-0 flex-1">
                <select
                  value={filtroPessoa ? `${dimensaoFiltro}:${filtroPessoa}` : ''}
                  onChange={(e) => {
                    const valor = e.target.value
                    if (!valor) return setFiltroPessoa(null)
                    const [dimensao, id] = valor.split(':')
                    setDimensaoFiltro(dimensao as DimensaoFiltro)
                    setFiltroPessoa(id)
                  }}
                  aria-label="Filtrar por pessoa"
                  className={seletorMobileClass}
                >
                  <option value="">Todas as pessoas</option>
                  <optgroup label="Responsável">
                    {responsaveis.map((pessoa) => (
                      <option key={`r-${pessoa.id}`} value={`responsavel:${pessoa.id}`}>
                        {pessoa.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Executor">
                    {executores.map((pessoa) => (
                      <option key={`e-${pessoa.id}`} value={`executor:${pessoa.id}`}>
                        {pessoa.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            ) : (
              <FiltroPessoas
                dimensao={dimensaoFiltro}
                onDimensao={setDimensaoFiltro}
                pessoas={pessoasDoFiltro}
                selecionado={filtroPessoa}
                onSelecionar={setFiltroPessoa}
              />
            )}

            <div className="min-w-0 flex-1 md:flex-none">
              <label
                className="hidden text-sm font-medium text-slate-700 md:block dark:text-slate-300"
                htmlFor="cenario"
              >
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
                aria-label="Cenário"
                className={`${seletorMobileClass} md:mt-1 md:min-h-0 md:w-auto md:py-2`}
              >
                {cenarios.length === 0 && <option value="">Nenhum cenário</option>}
                {cenarios.length > 0 && <option value={TODOS}>Todos os cenários</option>}
                {cenarios.map((cenario) => (
                  <option key={cenario.id} value={cenario.id}>
                    {cenario.nome}
                  </option>
                ))}
              </select>
            </div>



<div className="hidden md:block">
              <AddButton
                onClick={() => setModalTarefa(null)}
                label="Nova tarefa"
                disabled={cenarios.length === 0 || todasColunas.length === 0}
              />
            </div>
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

        {!carregando && colunas.length > 0 && !mobile && (
          <div className="grid min-h-0 flex-1 gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            {colunas.map((coluna) => {
              const daColuna = tarefasDaColuna(coluna)
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

        {/* Mobile: uma etapa por vez. Sem colunas lado a lado — e sem arrastar,
            que a API de drag do HTML não responde a toque. */}
        {!carregando && colunas.length > 0 && mobile && (
          <div className="flex min-h-0 flex-1 flex-col">
            {/* as etapas viram cartões 2 por 2, cada um na cor da sua coluna */}
            <div className="mb-3 grid shrink-0 grid-cols-2 gap-2 px-1 md:px-0" role="tablist" aria-label="Etapas">
              {colunas.map((coluna) => {
                const ativa = coluna.id === etapaAtiva
                const cor = CORES_COLUNA[coluna.cor] ?? CORES_COLUNA.slate
                return (
                  <button
                    key={coluna.id}
                    type="button"
                    role="tab"
                    aria-selected={ativa}
                    onClick={() => setEtapaAtiva(coluna.id)}
                    className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${cor.vivo} ${
                      ativa
                        ? 'ring-2 ring-inset ring-slate-900 dark:ring-white'
                        : 'opacity-80'
                    }`}
                  >
                    <span className="text-lg font-bold leading-none tabular-nums">
                      {tarefasDaColuna(coluna).length}
                    </span>
                    <span className="truncate text-xs font-medium">{coluna.nome}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 pb-1 md:px-0">
              {colunaAtiva && tarefasDaColuna(colunaAtiva).map((tarefa) => (
                <TaskCard
                  key={tarefa.id}
                  compacto
                  tarefa={tarefa}
                  colunas={colunas}
                  colunaSelecionadaId={colunaAtiva.id}
                  pessoas={mapaPessoas}
                  onEditar={setModalTarefa}
                  onMover={handleMover}
                  onDragStart={setArrastada}
                  onDragEnd={() => {
                    setArrastada(null)
                    setColunaAlvo(null)
                  }}
                  arrastando={false}
                />
              ))}

              {colunaAtiva && tarefasDaColuna(colunaAtiva).length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-300 px-3 py-10 text-center text-sm text-slate-400 dark:border-slate-600 dark:text-slate-500">
                  Nenhuma tarefa em {colunaAtiva.nome}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {mobile && cenarios.length > 0 && todasColunas.length > 0 && (
        <button
          type="button"
          onClick={() => setModalTarefa(null)}
          className="fixed bottom-24 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          aria-label="Nova tarefa"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}

      {modalTarefa !== undefined && cenarios.length > 0 && (
        <TaskFormModal
          key={modalTarefa?.id ?? 'nova'}
          open
          cenarioId={cenarioAtual?.id ?? cenarios[0]?.id ?? ''}
          cenarios={cenarios}
          colunas={todasColunas}
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
        onClose={() => {
          setGerenciando(false)
          if (pathname === '/tarefas/config') navigate('/tarefas')
        }}
        onChanged={async (selecionado) => {
          await carregarBase(selecionado)
          if (selecionado) await carregarQuadro(selecionado)
        }}
      />
    </AppLayout>
  )
}
