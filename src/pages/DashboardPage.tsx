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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {rotulo}
      </p>
      <p
        className={`mt-2 text-3xl font-semibold tabular-nums ${
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
  avatar?: string | null
}

/** Barra horizontal com rótulo direto — magnitude, não identidade. */
function Barra({ rotulo, valor, total, cor, avatar }: BarraProps) {
  const porcentagem = total > 0 ? Math.round((valor / total) * 100) : 0
  return (
    <li className="flex items-center gap-3">
      <span className="flex w-32 min-w-0 items-center gap-2">
        {avatar !== undefined &&
          (avatar ? (
            <img src={avatar} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
          ) : (
            <span
              className="h-5 w-5 shrink-0 rounded-full border border-dashed border-slate-300 dark:border-slate-600"
              aria-hidden="true"
            />
          ))}
        <span className="truncate text-sm text-slate-600 dark:text-slate-300" title={rotulo}>
          {rotulo}
        </span>
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

export function DashboardPage() {
  const [cenarios, setCenarios] = useState<Cenario[]>([])
  const [colunas, setColunas] = useState<Coluna[]>([])
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [pessoas, setPessoas] = useState<Profile[]>([])
  const [cenarioId, setCenarioId] = useState<string>(TODOS)
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

  const tarefasFiltradas = useMemo(
    () => (cenarioId === TODOS ? tarefas : tarefas.filter((t) => t.cenario_id === cenarioId)),
    [tarefas, cenarioId],
  )

  const colunasFiltradas = useMemo(
    () => (cenarioId === TODOS ? colunas : colunas.filter((c) => c.cenario_id === cenarioId)),
    [colunas, cenarioId],
  )

  const total = tarefasFiltradas.length
  const hoje = hojeZerado()

  const vencidas = tarefasFiltradas.filter((t) => t.prazo && dataDoPrazo(t.prazo) < hoje).length
  const altaPrioridade = tarefasFiltradas.filter((t) => t.prioridade === 'alta').length
  const semResponsavel = tarefasFiltradas.filter((t) => !t.responsavel_id).length

  /** Quando o filtro é "todos", colunas de mesmo nome somam (A fazer de vários cenários). */
  const porEtapa = useMemo(() => {
    const mapa = new Map<string, { nome: string; cor: string; ordem: number; valor: number }>()
    colunasFiltradas.forEach((coluna) => {
      const chave = coluna.nome.toLowerCase()
      const atual = mapa.get(chave)
      const valor = tarefasFiltradas.filter((t) => t.coluna_id === coluna.id).length
      mapa.set(chave, {
        nome: coluna.nome,
        cor: coluna.cor,
        ordem: atual ? Math.min(atual.ordem, coluna.ordem) : coluna.ordem,
        valor: (atual?.valor ?? 0) + valor,
      })
    })
    return [...mapa.values()].sort((a, b) => a.ordem - b.ordem)
  }, [colunasFiltradas, tarefasFiltradas])

  const porResponsavel = useMemo(() => {
    const contagem = new Map<string, number>()
    tarefasFiltradas.forEach((t) => {
      const chave = t.responsavel_id ?? 'sem'
      contagem.set(chave, (contagem.get(chave) ?? 0) + 1)
    })
    return [...contagem.entries()]
      .map(([id, valor]) => {
        const pessoa = pessoas.find((p) => p.id === id)
        return {
          id,
          nome: pessoa?.name ?? 'Sem responsável',
          avatar: pessoa?.avatar_url ?? null,
          valor,
        }
      })
      .sort((a, b) => b.valor - a.valor)
  }, [tarefasFiltradas, pessoas])

  const porPrioridade = useMemo(
    () =>
      (['alta', 'media', 'baixa'] as const).map((chave) => ({
        chave,
        rotulo: PRIORIDADES[chave].rotulo,
        cor: PRIORIDADES[chave].ponto,
        valor: tarefasFiltradas.filter((t) => t.prioridade === chave).length,
      })),
    [tarefasFiltradas],
  )

  const proximosPrazos = useMemo(
    () =>
      tarefasFiltradas
        .filter((t) => t.prazo)
        .sort((a, b) => (a.prazo ?? '').localeCompare(b.prazo ?? ''))
        .slice(0, 6),
    [tarefasFiltradas],
  )

  return (
    <AppLayout>
      <div className="space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Panorama das tarefas cadastradas.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="dash-cenario">
              Cenário
            </label>
            <select
              id="dash-cenario"
              value={cenarioId}
              onChange={(e) => setCenarioId(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value={TODOS}>Todos os cenários</option>
              {cenarios.map((cenario) => (
                <option key={cenario.id} value={cenario.id}>
                  {cenario.nome}
                </option>
              ))}
            </select>
          </div>
        </header>

        {carregando && (
          <p role="status" className="text-sm text-slate-500 dark:text-slate-400">
            Carregando indicadores...
          </p>
        )}

        {!carregando && erro && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {erro}
          </p>
        )}

        {!carregando && !erro && total === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Nenhuma tarefa ainda</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Cadastre tarefas no quadro para ver os indicadores aqui.
            </p>
          </div>
        )}

        {!carregando && !erro && total > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat rotulo="Tarefas" valor={total} detalhe="no filtro atual" />
              <Stat rotulo="Vencidas" valor={vencidas} detalhe="prazo já passou" destaque />
              <Stat rotulo="Prioridade alta" valor={altaPrioridade} detalhe="exigem atenção" />
              <Stat rotulo="Sem responsável" valor={semResponsavel} detalhe="ninguém atribuído" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Por etapa</h2>
                <ul className="mt-4 space-y-3">
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

              <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Por responsável</h2>
                <ul className="mt-4 space-y-3">
                  {porResponsavel.map((pessoa) => (
                    <Barra
                      key={pessoa.id}
                      rotulo={pessoa.nome}
                      valor={pessoa.valor}
                      total={total}
                      cor="bg-indigo-500"
                      avatar={pessoa.avatar}
                    />
                  ))}
                </ul>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Por prioridade</h2>
                <ul className="mt-4 space-y-3">
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

              <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Próximos prazos</h2>
                {proximosPrazos.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                    Nenhuma tarefa com prazo definido.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-700">
                    {proximosPrazos.map((tarefa) => {
                      const vencida = tarefa.prazo ? dataDoPrazo(tarefa.prazo) < hoje : false
                      const responsavel = pessoas.find((p) => p.id === tarefa.responsavel_id)
                      return (
                        <li key={tarefa.id} className="flex items-center justify-between gap-3 py-2">
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-slate-700 dark:text-slate-200" title={tarefa.titulo}>
                              {tarefa.titulo}
                            </span>
                            <span className="block truncate text-xs text-slate-400 dark:text-slate-500">
                              {responsavel?.name ?? 'Sem responsável'}
                            </span>
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums ${
                              vencida
                                ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                            title={vencida ? 'Prazo vencido' : 'Prazo'}
                          >
                            {tarefa.prazo ? dataDoPrazo(tarefa.prazo).toLocaleDateString('pt-BR') : '—'}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
