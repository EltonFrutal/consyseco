import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { supabase } from '../lib/supabaseClient'
import {
  CORES_COLUNA,
  PRIORIDADES,
  listarCenarios,
  listarTodasColunas,
  listarTodasTarefas,
  type Cenario,
  type Coluna,
  type Tarefa,
} from '../api/tarefas'
import type { Profile } from '../types/profile'

const TODOS = 'todos'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

type ChaveSerie = 'criadas' | 'finalizadas'
type SerieVisivel = Record<ChaveSerie, boolean>

const SERIES: { chave: ChaveSerie; rotulo: string; barra: string }[] = [
  { chave: 'criadas', rotulo: 'Criadas', barra: 'bg-indigo-400 dark:bg-indigo-500' },
  { chave: 'finalizadas', rotulo: 'Finalizadas', barra: 'bg-emerald-500 dark:bg-emerald-400' },
]

const selectClass =
  'rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'

const setaAnoClass =
  'flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-30 disabled:hover:bg-transparent dark:text-slate-400 dark:hover:bg-slate-700'

const setaProps = {
  viewBox: '0 0 24 24',
  className: 'h-4 w-4',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

const cartaoClass =
  'flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800'

/** Hoje sem horas, para comparar com o prazo (que é date puro). */
function hojeZerado() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return hoje
}

function dataDoPrazo(prazo: string) {
  return new Date(`${prazo}T00:00:00`)
}

interface StatProps {
  rotulo: string
  valor: number
  detalhe: string
  destaque?: boolean
}

/** Stat tile: número em destaque, sem gráfico de uma barra só. */
function Stat({ rotulo, valor, detalhe, destaque = false }: StatProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {rotulo}
      </p>
      <p
        className={`mt-1 text-3xl font-semibold leading-none tabular-nums ${
          destaque && valor > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'
        }`}
      >
        {valor}
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detalhe}</p>
    </div>
  )
}

interface BarraProps {
  rotulo: string
  valor: number
  total: number
  cor: string
}

/** Barra horizontal com rótulo direto — magnitude, não identidade. */
function Barra({ rotulo, valor, total, cor }: BarraProps) {
  const porcentagem = total > 0 ? Math.round((valor / total) * 100) : 0
  return (
    <li className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-sm text-slate-600 dark:text-slate-300" title={rotulo}>
        {rotulo}
      </span>

      <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <span
          className={`block h-full rounded-full ${cor}`}
          style={{ width: `${porcentagem}%` }}
          aria-hidden="true"
        />
      </span>

      <span className="w-14 shrink-0 text-right text-sm tabular-nums text-slate-900 dark:text-white">
        {valor}
        <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">{porcentagem}%</span>
      </span>
    </li>
  )
}

type Visao = 'mes' | 'ano'

interface PeriodoBarras {
  rotulo: string
  criadas: number
  finalizadas: number
}

/**
 * Barras agrupadas em divs, não em SVG: a altura em % acompanha o cartão
 * sem escalar tipografia, que é o que permite a página não rolar.
 * A escala considera só as séries visíveis — esconder uma reaproveita a altura.
 */
function GraficoBarras({ dados, series }: { dados: PeriodoBarras[]; series: SerieVisivel }) {
  const visiveis = SERIES.filter((s) => series[s.chave])
  const maximo = Math.max(1, ...dados.flatMap((d) => visiveis.map((s) => d[s.chave])))
  const altura = (valor: number) => (valor === 0 ? 0 : Math.max(2, (valor / maximo) * 100))

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* o pt-4 reserva a faixa do rótulo da barra mais alta, que fica fora dela */}
      <div className="flex min-h-0 flex-1 items-stretch gap-1 pt-4" aria-hidden="true">
        {dados.map((d) => (
          <div key={d.rotulo} className="flex min-w-0 flex-1 flex-col justify-end">
            <div className="flex min-h-0 flex-1 items-end justify-center gap-[3px]">
              {visiveis.map((serie) => (
                <div
                  key={serie.chave}
                  className={`flex h-full min-h-0 flex-col justify-end ${
                    visiveis.length === 1 ? 'w-3/5' : 'w-[46%]'
                  }`}
                  title={`${d.rotulo}: ${d[serie.chave]} ${serie.rotulo.toLowerCase()}`}
                >
                  <div className="relative" style={{ height: `${altura(d[serie.chave])}%` }}>
                    <span className="absolute inset-x-0 -top-4 text-center text-[10px] font-medium leading-4 tabular-nums text-slate-500 dark:text-slate-400">
                      {d[serie.chave] > 0 ? d[serie.chave] : ''}
                    </span>
                    <span className={`block h-full rounded-t ${serie.barra}`} />
                  </div>
                </div>
              ))}
            </div>
            <span className="truncate pt-1 text-center text-[11px] text-slate-400 dark:text-slate-500">
              {d.rotulo}
            </span>
          </div>
        ))}
      </div>

      {/* leitura por teclado e leitor de tela: a cor sozinha não informa nada */}
      <table className="sr-only">
        <caption>Tarefas criadas e finalizadas por período</caption>
        <thead>
          <tr>
            <th scope="col">Período</th>
            <th scope="col">Criadas</th>
            <th scope="col">Finalizadas</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((d) => (
            <tr key={d.rotulo}>
              <th scope="row">{d.rotulo}</th>
              <td>{d.criadas}</td>
              <td>{d.finalizadas}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DashboardPage() {
  const [cenarios, setCenarios] = useState<Cenario[]>([])
  const [colunas, setColunas] = useState<Coluna[]>([])
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [pessoas, setPessoas] = useState<Profile[]>([])
  const [cenarioId, setCenarioId] = useState<string>(TODOS)
  const [executorId, setExecutorId] = useState<string>(TODOS)
  const [series, setSeries] = useState<SerieVisivel>({ criadas: true, finalizadas: true })
  const [ano, setAno] = useState(new Date().getFullYear())
  const [visao, setVisao] = useState<Visao>('mes')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      setErro(null)
      try {
        const [listaCenarios, listaColunas, listaTarefas, { data: perfis }] = await Promise.all([
          listarCenarios(),
          listarTodasColunas(),
          listarTodasTarefas(),
          supabase.from('profiles').select('*').order('name'),
        ])
        setCenarios(listaCenarios)
        setColunas(listaColunas)
        setTarefas(listaTarefas)
        setPessoas((perfis as Profile[]) ?? [])
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Não foi possível carregar os indicadores.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  const doCenario = useMemo(
    () => (cenarioId === TODOS ? tarefas : tarefas.filter((t) => t.cenario_id === cenarioId)),
    [tarefas, cenarioId],
  )

  /** Os cartões e as listas falam do que está em aberto; finalizada saiu do quadro. */
  const abertas = useMemo(() => doCenario.filter((t) => !t.finalizada_em), [doCenario])

  const colunasFiltradas = useMemo(
    () => (cenarioId === TODOS ? colunas : colunas.filter((c) => c.cenario_id === cenarioId)),
    [colunas, cenarioId],
  )

  const total = abertas.length
  const hoje = hojeZerado()

  const vencidas = abertas.filter((t) => t.prazo && dataDoPrazo(t.prazo) < hoje).length
  const altaPrioridade = abertas.filter((t) => t.prioridade === 'alta').length

  /** Quando o filtro é "todos", colunas de mesmo nome somam (A fazer de vários cenários). */
  const porEtapa = useMemo(() => {
    const mapa = new Map<string, { nome: string; cor: string; ordem: number; valor: number }>()
    colunasFiltradas.forEach((coluna) => {
      const chave = coluna.nome.toLowerCase()
      const atual = mapa.get(chave)
      const valor = abertas.filter((t) => t.coluna_id === coluna.id).length
      mapa.set(chave, {
        nome: coluna.nome,
        cor: coluna.cor,
        ordem: atual ? Math.min(atual.ordem, coluna.ordem) : coluna.ordem,
        valor: (atual?.valor ?? 0) + valor,
      })
    })
    return [...mapa.values()].sort((a, b) => a.ordem - b.ordem)
  }, [colunasFiltradas, abertas])

  const porPrioridade = useMemo(
    () =>
      (['alta', 'media', 'baixa'] as const).map((chave) => ({
        chave,
        rotulo: PRIORIDADES[chave].rotulo,
        cor: PRIORIDADES[chave].ponto,
        valor: abertas.filter((t) => t.prioridade === chave).length,
      })),
    [abertas],
  )

  /** Só quem aparece como executor entra no filtro — lista curta é lista usável. */
  const executores = useMemo(() => {
    const ids = new Set(doCenario.map((t) => t.executor_id).filter(Boolean) as string[])
    return pessoas.filter((p) => ids.has(p.id))
  }, [doCenario, pessoas])

  /** Anos com movimento — criação ou finalização. Sempre inclui o ano corrente. */
  const anos = useMemo(() => {
    const encontrados = new Set<number>([new Date().getFullYear()])
    doCenario.forEach((t) => {
      encontrados.add(new Date(t.created_at).getFullYear())
      if (t.finalizada_em) encontrados.add(new Date(t.finalizada_em).getFullYear())
    })
    return [...encontrados].sort((a, b) => b - a)
  }, [doCenario])

  const doExecutor = useMemo(
    () => (executorId === TODOS ? doCenario : doCenario.filter((t) => t.executor_id === executorId)),
    [doCenario, executorId],
  )

  /** Visão "mês": os 12 meses do ano escolhido. Visão "ano": um agrupamento por ano. */
  const dadosDoGrafico = useMemo<PeriodoBarras[]>(() => {
    if (visao === 'ano') {
      const base = anos
        .slice()
        .sort((a, b) => a - b)
        .map((valor) => ({ rotulo: String(valor), criadas: 0, finalizadas: 0 }))
      const porRotulo = new Map(base.map((item) => [item.rotulo, item]))

      doExecutor.forEach((tarefa) => {
        const criada = porRotulo.get(String(new Date(tarefa.created_at).getFullYear()))
        if (criada) criada.criadas += 1

        if (tarefa.finalizada_em) {
          const fim = porRotulo.get(String(new Date(tarefa.finalizada_em).getFullYear()))
          if (fim) fim.finalizadas += 1
        }
      })
      return base
    }

    const base = MESES.map((rotulo) => ({ rotulo, criadas: 0, finalizadas: 0 }))
    doExecutor.forEach((tarefa) => {
      const criada = new Date(tarefa.created_at)
      if (criada.getFullYear() === ano) base[criada.getMonth()].criadas += 1

      if (tarefa.finalizada_em) {
        const fim = new Date(tarefa.finalizada_em)
        if (fim.getFullYear() === ano) base[fim.getMonth()].finalizadas += 1
      }
    })
    return base
  }, [doExecutor, visao, ano, anos])

  const totalFinalizadas = dadosDoGrafico.reduce((soma, m) => soma + m.finalizadas, 0)
  // anos vêm do mais recente para o mais antigo: avançar é andar para trás no índice
  const indiceAno = anos.indexOf(ano)

  /** Clicar isola a série; clicar de novo na única visível volta a mostrar as duas. */
  function alternarSerie(chave: ChaveSerie) {
    setSeries((atual) => {
      const outra: ChaveSerie = chave === 'criadas' ? 'finalizadas' : 'criadas'
      if (atual[chave] && atual[outra]) return { ...atual, [outra]: false } as SerieVisivel
      if (atual[chave] && !atual[outra]) return { criadas: true, finalizadas: true }
      return { ...atual, [chave]: true } as SerieVisivel
    })
  }

  // trocar de cenário pode deixar de fora o executor ou o ano escolhido
  useEffect(() => {
    if (executorId !== TODOS && !executores.some((p) => p.id === executorId)) setExecutorId(TODOS)
  }, [executores, executorId])

  useEffect(() => {
    if (anos.length > 0 && !anos.includes(ano)) setAno(anos[0])
  }, [anos, ano])

  return (
    <AppLayout>
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Painel</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tarefas em aberto e o histórico de {ano}.
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            Cenário
            <select
              value={cenarioId}
              onChange={(e) => setCenarioId(e.target.value)}
              className={selectClass}
            >
              <option value={TODOS}>Todos</option>
              {cenarios.map((cenario) => (
                <option key={cenario.id} value={cenario.id}>
                  {cenario.nome}
                </option>
              ))}
            </select>
          </label>
        </header>

        {carregando && (
          <p role="status" className="text-sm text-slate-500 dark:text-slate-400">
            Carregando indicadores...
          </p>
        )}

        {!carregando && erro && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
          >
            {erro}
          </p>
        )}

        {!carregando && !erro && doCenario.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Nenhuma tarefa ainda
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Cadastre tarefas no quadro para ver os indicadores aqui.
            </p>
          </div>
        )}

        {!carregando && !erro && doCenario.length > 0 && (
          <>
            <div className="grid shrink-0 gap-6 sm:grid-cols-3">
              <Stat rotulo="Tarefas" valor={total} detalhe="em aberto, sem as finalizadas" />
              <Stat rotulo="Vencidas" valor={vencidas} detalhe="prazo já passou" destaque />
              <Stat rotulo="Prioridade alta" valor={altaPrioridade} detalhe="exigem atenção" />
            </div>

            <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-3">
              <div className="flex min-h-0 flex-col gap-6">
                <section className={`${cartaoClass} flex-1`}>
                  <h2 className="shrink-0 text-sm font-semibold text-slate-900 dark:text-white">
                    Por etapa
                  </h2>
                  <ul className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {porEtapa.map((etapa) => (
                      <Barra
                        key={etapa.nome}
                        rotulo={etapa.nome}
                        valor={etapa.valor}
                        total={total}
                        cor={CORES_COLUNA[etapa.cor]?.ponto ?? 'bg-slate-400'}
                      />
                    ))}
                  </ul>
                </section>

                <section className={`${cartaoClass} flex-1`}>
                  <h2 className="shrink-0 text-sm font-semibold text-slate-900 dark:text-white">
                    Por prioridade
                  </h2>
                  <ul className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {porPrioridade.map((item) => (
                      <Barra
                        key={item.chave}
                        rotulo={item.rotulo}
                        valor={item.valor}
                        total={total}
                        cor={item.cor}
                      />
                    ))}
                  </ul>
                </section>
              </div>

              <section className={`${cartaoClass} lg:col-span-2`}>
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Criadas e finalizadas {visao === 'ano' ? 'por ano' : `por mês em ${ano}`}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {totalFinalizadas} finalizadas no filtro atual
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {SERIES.map((serie) => {
                      const visivel = series[serie.chave]
                      return (
                        <button
                          key={serie.chave}
                          type="button"
                          onClick={() => alternarSerie(serie.chave)}
                          aria-pressed={visivel}
                          title={visivel ? `Ocultar ${serie.rotulo.toLowerCase()}` : `Mostrar ${serie.rotulo.toLowerCase()}`}
                          className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            visivel
                              ? 'border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200'
                              : 'border-dashed border-slate-300 text-slate-400 dark:border-slate-600 dark:text-slate-500'
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${visivel ? serie.barra : 'bg-slate-300 dark:bg-slate-600'}`}
                            aria-hidden="true"
                          />
                          {serie.rotulo}
                        </button>
                      )
                    })}

                    <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      Executor
                      <select
                        value={executorId}
                        onChange={(e) => setExecutorId(e.target.value)}
                        className={selectClass}
                      >
                        <option value={TODOS}>Todos</option>
                        {executores.map((pessoa) => (
                          <option key={pessoa.id} value={pessoa.id}>
                            {pessoa.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div
                      className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-700/60"
                      role="group"
                      aria-label="Agrupamento do gráfico"
                    >
                      {([
                        { valor: 'mes' as Visao, rotulo: 'Mês' },
                        { valor: 'ano' as Visao, rotulo: 'Ano' },
                      ]).map((opcao) => (
                        <button
                          key={opcao.valor}
                          type="button"
                          onClick={() => setVisao(opcao.valor)}
                          aria-pressed={visao === opcao.valor}
                          title={
                            opcao.valor === 'mes'
                              ? 'Ver mês a mês dentro do ano'
                              : 'Ver o total de cada ano'
                          }
                          className={`rounded-md px-2 py-1 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            visao === opcao.valor
                              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                          }`}
                        >
                          {opcao.rotulo}
                        </button>
                      ))}
                    </div>

                    {visao === 'mes' && (
                    <div
                      className="flex items-center gap-0.5 rounded-lg border border-slate-300 px-1 dark:border-slate-600"
                      role="group"
                      aria-label="Ano do gráfico"
                    >
                      <button
                        type="button"
                        onClick={() => setAno(anos[indiceAno + 1] ?? ano)}
                        disabled={indiceAno >= anos.length - 1}
                        className={setaAnoClass}
                        aria-label="Ano anterior"
                        title="Ano anterior"
                      >
                        <svg {...setaProps}>
                          <path d="M15 6l-6 6 6 6" />
                        </svg>
                      </button>

                      <span className="min-w-10 text-center text-xs font-medium tabular-nums text-slate-700 dark:text-slate-200">
                        {ano}
                      </span>

                      <button
                        type="button"
                        onClick={() => setAno(anos[indiceAno - 1] ?? ano)}
                        disabled={indiceAno <= 0}
                        className={setaAnoClass}
                        aria-label="Próximo ano"
                        title="Próximo ano"
                      >
                        <svg {...setaProps}>
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </button>
                    </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex min-h-0 flex-1 flex-col">
                  <GraficoBarras dados={dadosDoGrafico} series={series} />
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
