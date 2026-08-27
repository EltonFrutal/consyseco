import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { supabase } from '../lib/supabaseClient'
import {
  CORES_COLUNA,
  PRIORIDADES,
  listarDepartamentos,
  listarTodasColunas,
  listarTodasTarefas,
  type Departamento,
  type Coluna,
  type Tarefa,
} from '../api/tarefas'
import { SeletorMultiplo } from '../components/ui/SeletorMultiplo'
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
  /** Versão curta para o celular, onde o rótulo inteiro é cortado. */
  rotuloCurto?: string
  valor: number
  detalhe: string
  destaque?: boolean
  /** Classe da bolinha que acompanha o rótulo (cor da prioridade). */
  ponto?: string
  onClick: () => void
}

/** Stat tile: número em destaque, clicável para ver as tarefas que o compõem. */
function Stat({
  rotulo,
  rotuloCurto,
  valor,
  detalhe,
  destaque = false,
  ponto,
  onClick,
}: StatProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={valor === 0}
      title={valor === 0 ? 'Nenhuma tarefa' : `Ver as ${valor} tarefas`}
      className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-indigo-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-default disabled:hover:border-slate-200 md:px-5 md:py-4 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-500/50 dark:disabled:hover:border-slate-700"
    >
      <p className="flex items-center gap-1.5 truncate text-[10px] font-medium uppercase tracking-wide text-slate-500 md:text-xs dark:text-slate-400">
        {ponto && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${ponto}`} aria-hidden="true" />}
        <span className="truncate md:hidden">{rotuloCurto ?? rotulo}</span>
        <span className="hidden truncate md:inline">{rotulo}</span>
      </p>
      <p
        className={`mt-1 text-2xl font-semibold leading-none tabular-nums md:text-3xl ${
          destaque && valor > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'
        }`}
      >
        {valor}
      </p>
      <p className="mt-1 hidden text-xs text-slate-500 md:block dark:text-slate-400">{detalhe}</p>
    </button>
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
function GraficoBarras({
  dados,
  series,
  onSelecionar,
}: {
  dados: PeriodoBarras[]
  series: SerieVisivel
  /** Quando existe, cada período vira botão — usado para abrir os meses do ano. */
  onSelecionar?: (rotulo: string) => void
}) {
  const visiveis = SERIES.filter((s) => series[s.chave])
  const maximo = Math.max(1, ...dados.flatMap((d) => visiveis.map((s) => d[s.chave])))
  const altura = (valor: number) => (valor === 0 ? 0 : Math.max(2, (valor / maximo) * 100))

  if (dados.length === 0) {
    return (
      <p className="flex min-h-0 flex-1 items-center justify-center text-center text-sm text-slate-400 dark:text-slate-500">
        Escolha ao menos um período no filtro.
      </p>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* o pt-4 reserva a faixa do rótulo da barra mais alta, que fica fora dela */}
      <div className="flex min-h-0 flex-1 items-stretch gap-1 pt-4" aria-hidden={!onSelecionar}>
        {dados.map((d) => (
          <div
            key={d.rotulo}
            role={onSelecionar ? 'button' : undefined}
            tabIndex={onSelecionar ? 0 : undefined}
            aria-label={onSelecionar ? `Ver os meses de ${d.rotulo}` : undefined}
            title={onSelecionar ? `Ver os meses de ${d.rotulo}` : undefined}
            onClick={onSelecionar ? () => onSelecionar(d.rotulo) : undefined}
            onKeyDown={
              onSelecionar
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelecionar(d.rotulo)
                    }
                  }
                : undefined
            }
            className={`flex min-w-0 flex-1 flex-col justify-end rounded-md ${
              onSelecionar
                ? 'cursor-pointer transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-slate-700/40'
                : ''
            }`}
          >
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
      {/* fallback do gráfico para leitor de tela; sem caption, que virava texto
          solto na página */}
      <table className="sr-only" aria-label="Criadas e finalizadas por período">
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

interface ListaModalProps {
  titulo: string
  tarefas: Tarefa[]
  pessoas: Map<string, Profile>
  colunas: Map<string, string>
  onFechar: () => void
}

/** Lista o que compõe um indicador. Só leitura: editar é no quadro. */
function ListaDeTarefas({ titulo, tarefas, pessoas, colunas, onFechar }: ListaModalProps) {
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onFechar])

  const hoje = hojeZerado()

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/70 p-4 backdrop-blur-sm md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      onClick={onFechar}
    >
      <div
        className="flex max-h-full w-full max-w-2xl flex-col rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {titulo}
            <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
              {tarefas.length}
            </span>
          </h3>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            title="Fechar"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <ul className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {tarefas.map((tarefa) => {
            const prazo = tarefa.prazo ? dataDoPrazo(tarefa.prazo) : null
            const dias = prazo && prazo < hoje ? Math.round((hoje.getTime() - prazo.getTime()) / 86400000) : 0
            return (
              <li
                key={tarefa.id}
                className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 text-sm text-slate-800 dark:text-slate-100">
                    <span className="mr-1.5 font-mono text-xs text-slate-400 dark:text-slate-500">
                      #{tarefa.numero}
                    </span>
                    {tarefa.titulo}
                  </span>
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${PRIORIDADES[tarefa.prioridade].ponto}`}
                    title={`Prioridade ${PRIORIDADES[tarefa.prioridade].rotulo.toLowerCase()}`}
                  />
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>{colunas.get(tarefa.coluna_id) ?? '—'}</span>
                  <span>{tarefa.executor_id ? pessoas.get(tarefa.executor_id)?.name ?? '—' : 'Sem executor'}</span>
                  {prazo && (
                    <span className={dias > 0 ? 'text-red-600 dark:text-red-400' : ''}>
                      {prazo.toLocaleDateString('pt-BR')}
                    </span>
                  )}
                  {dias > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold tabular-nums text-white">
                      {dias}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [colunas, setColunas] = useState<Coluna[]>([])
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [pessoas, setPessoas] = useState<Profile[]>([])
  const [departamentoId, setDepartamentoId] = useState<string>(TODOS)
  const [executorId, setExecutorId] = useState<string>(TODOS)
  const [series, setSeries] = useState<SerieVisivel>({ criadas: true, finalizadas: true })
  const [ano, setAno] = useState(new Date().getFullYear())
  const [visao, setVisao] = useState<Visao>('mes')
  const [anosSelecionados, setAnosSelecionados] = useState<string[]>([])
  const [indicador, setIndicador] = useState<'total' | 'vencidas' | 'alta' | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      setErro(null)
      try {
        const [listaDepartamentos, listaColunas, listaTarefas, { data: perfis }] = await Promise.all([
          listarDepartamentos(),
          listarTodasColunas(),
          listarTodasTarefas(),
          supabase.from('profiles').select('*').order('name'),
        ])
        setDepartamentos(listaDepartamentos)
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

  const doDepartamento = useMemo(
    () => (departamentoId === TODOS ? tarefas : tarefas.filter((t) => t.departamento_id === departamentoId)),
    [tarefas, departamentoId],
  )

  /** Os cartões e as listas falam do que está em aberto; finalizada saiu do quadro. */
  const abertas = useMemo(() => doDepartamento.filter((t) => !t.finalizada_em), [doDepartamento])

  const colunasFiltradas = useMemo(
    () => (departamentoId === TODOS ? colunas : colunas.filter((c) => c.departamento_id === departamentoId)),
    [colunas, departamentoId],
  )

  const mapaPessoas = useMemo(() => new Map(pessoas.map((p) => [p.id, p])), [pessoas])
  const nomeDasColunas = useMemo(
    () => new Map(colunas.map((c) => [c.id, c.nome])),
    [colunas],
  )

  const total = abertas.length
  const hoje = hojeZerado()

  const vencidas = abertas.filter((t) => t.prazo && dataDoPrazo(t.prazo) < hoje)
  const altaPrioridade = abertas.filter((t) => t.prioridade === 'alta')

  /** Quando o filtro é "todos", colunas de mesmo nome somam (A fazer de vários departamentos). */
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

  /** Quem está com o quê. Sem executor entra na lista: fila sem dono é o que
   *  mais interessa enxergar. */
  const porExecutor = useMemo(() => {
    const contagem = new Map<string, number>()
    abertas.forEach((t) => {
      const chave = t.executor_id ?? 'sem'
      contagem.set(chave, (contagem.get(chave) ?? 0) + 1)
    })
    return [...contagem.entries()]
      .map(([id, valor]) => ({
        id,
        nome: id === 'sem' ? 'Sem executor' : mapaPessoas.get(id)?.name ?? '—',
        valor,
      }))
      .sort((a, b) => b.valor - a.valor)
  }, [abertas, mapaPessoas])

  /** Só quem aparece como executor entra no filtro — lista curta é lista usável. */
  const executores = useMemo(() => {
    const ids = new Set(doDepartamento.map((t) => t.executor_id).filter(Boolean) as string[])
    return pessoas.filter((p) => ids.has(p.id))
  }, [doDepartamento, pessoas])

  /** Anos com movimento — criação ou finalização. Sempre inclui o ano corrente. */
  const anos = useMemo(() => {
    const encontrados = new Set<number>([new Date().getFullYear()])
    doDepartamento.forEach((t) => {
      encontrados.add(new Date(t.created_at).getFullYear())
      if (t.finalizada_em) encontrados.add(new Date(t.finalizada_em).getFullYear())
    })
    return [...encontrados].sort((a, b) => b - a)
  }, [doDepartamento])

  const doExecutor = useMemo(
    () => (executorId === TODOS ? doDepartamento : doDepartamento.filter((t) => t.executor_id === executorId)),
    [doDepartamento, executorId],
  )

  /** Visão "mês": os 12 meses do ano escolhido. Visão "ano": um agrupamento por ano. */
  const dadosDoGrafico = useMemo<PeriodoBarras[]>(() => {
    if (visao === 'ano') {
      const base = anosSelecionados
        .map(Number)
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
  }, [doExecutor, visao, ano, anosSelecionados])


  /** Clicar isola a série; clicar de novo na única visível volta a mostrar as duas. */
  function alternarSerie(chave: ChaveSerie) {
    setSeries((atual) => {
      const outra: ChaveSerie = chave === 'criadas' ? 'finalizadas' : 'criadas'
      if (atual[chave] && atual[outra]) return { ...atual, [outra]: false } as SerieVisivel
      if (atual[chave] && !atual[outra]) return { criadas: true, finalizadas: true }
      return { ...atual, [chave]: true } as SerieVisivel
    })
  }

  // trocar de departamento pode deixar de fora o executor ou o ano escolhido
  useEffect(() => {
    if (executorId !== TODOS && !executores.some((p) => p.id === executorId)) setExecutorId(TODOS)
  }, [executores, executorId])

  useEffect(() => {
    if (anos.length > 0 && !anos.includes(ano)) setAno(anos[0])
  }, [anos, ano])

  // o filtro nasce com tudo marcado: gráfico vazio na primeira abertura não
  // ensina nada a ninguém
  useEffect(() => {
    setAnosSelecionados(anos.map(String))
  }, [anos])

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 md:min-h-0 md:flex-1 md:gap-6 md:overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Painel</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tarefas em aberto e o histórico de {ano}.
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            Departamento
            <select
              value={departamentoId}
              onChange={(e) => setDepartamentoId(e.target.value)}
              className={selectClass}
            >
              <option value={TODOS}>Todos</option>
              {departamentos.map((departamento) => (
                <option key={departamento.id} value={departamento.id}>
                  {departamento.nome}
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

        {!carregando && !erro && doDepartamento.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Nenhuma tarefa ainda
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Cadastre tarefas no quadro para ver os indicadores aqui.
            </p>
          </div>
        )}

        {!carregando && !erro && doDepartamento.length > 0 && (
          <>
            <div className="grid shrink-0 grid-cols-3 gap-2 md:gap-6">
              <Stat
                rotulo="Tarefas"
                valor={total}
                detalhe="em aberto, sem as finalizadas"
                onClick={() => setIndicador('total')}
              />
              <Stat
                rotulo="Vencidas"
                valor={vencidas.length}
                detalhe="prazo já passou"
                destaque
                onClick={() => setIndicador('vencidas')}
              />
              <Stat
                rotulo="Prioridade alta"
                rotuloCurto="Prioridade"
                ponto={PRIORIDADES.alta.ponto}
                valor={altaPrioridade.length}
                detalhe="exigem atenção"
                onClick={() => setIndicador('alta')}
              />
            </div>

            <div className="grid gap-4 md:min-h-0 md:flex-1 md:gap-6 lg:grid-cols-3">
              <div className="flex min-w-0 flex-col gap-4 md:min-h-0 md:gap-6">
                <section className={`${cartaoClass} md:flex-1`}>
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

                <section className={`${cartaoClass} md:flex-1`}>
                  <h2 className="shrink-0 text-sm font-semibold text-slate-900 dark:text-white">
                    Por executor
                  </h2>
                  <ul className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {porExecutor.map((item) => (
                      <Barra
                        key={item.id}
                        rotulo={item.nome}
                        valor={item.valor}
                        total={total}
                        cor={item.id === 'sem' ? 'bg-slate-400' : 'bg-indigo-500'}
                      />
                    ))}
                  </ul>
                </section>
              </div>

              <section className={`${cartaoClass} h-72 min-w-0 md:h-auto lg:col-span-2`}>
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Criadas e finalizadas{' '}
                      {visao === 'ano' ? 'por ano' : `por mês em ${ano}`}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
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
                          onClick={() => {
                            // clicar em "Mês" no botão volta ao ano corrente; o
                            // ano específico só vem do clique na barra do ano
                            if (opcao.valor === 'mes') setAno(new Date().getFullYear())
                            setVisao(opcao.valor)
                          }}
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

                    {visao === 'ano' && (
                      <SeletorMultiplo
                        rotulo="Ano"
                        opcoes={anos.map((valor) => ({ valor: String(valor), rotulo: String(valor) }))}
                        selecionados={anosSelecionados}
                        onChange={setAnosSelecionados}
                      />
                    )}
                  </div>
                </div>

                <div className="mt-3 flex min-h-0 flex-1 flex-col">
                  <GraficoBarras
                    dados={dadosDoGrafico}
                    series={series}
                    onSelecionar={
                      visao === 'ano'
                        ? (rotulo) => {
                            setAno(Number(rotulo))
                            setVisao('mes')
                          }
                        : undefined
                    }
                  />
                </div>
              </section>
            </div>
          </>
        )}

        {indicador && (
          <ListaDeTarefas
            titulo={
              indicador === 'total'
                ? 'Tarefas em aberto'
                : indicador === 'vencidas'
                  ? 'Tarefas vencidas'
                  : 'Prioridade alta'
            }
            tarefas={
              indicador === 'total' ? abertas : indicador === 'vencidas' ? vencidas : altaPrioridade
            }
            pessoas={mapaPessoas}
            colunas={nomeDasColunas}
            onFechar={() => setIndicador(null)}
          />
        )}
      </div>
    </AppLayout>
  )
}
