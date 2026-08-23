import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { supabase } from '../lib/supabaseClient'
import {
  FinalizarError,
  PRIORIDADES,
  listarCenarios,
  listarFinalizadas,
  reabrirTarefa,
  type Cenario,
  type Tarefa,
} from '../api/tarefas'
import { SenhaResponsavelDialog } from '../components/tarefas/SenhaResponsavelDialog'
import { useAuth } from '../contexts/AuthContext'
import type { Profile } from '../types/profile'

type CampoData = 'conclusao' | 'finalizacao'

const inputClass =
  'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300'

function formatar(valor: string | null) {
  return valor ? new Date(valor).toLocaleString('pt-BR') : '—'
}

export function FinalizadasPage() {
  const { user } = useAuth()
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [pessoas, setPessoas] = useState<Profile[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [cenarios, setCenarios] = useState<Cenario[]>([])
  const [cenarioId, setCenarioId] = useState('todos')
  const [texto, setTexto] = useState('')
  const [campoData, setCampoData] = useState<CampoData>('finalizacao')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [reabrindo, setReabrindo] = useState<Tarefa | null>(null)
  const [processando, setProcessando] = useState(false)
  const [erroReabrir, setErroReabrir] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const [lista, listaCenarios, { data: perfis }] = await Promise.all([
        listarFinalizadas({ texto, cenarioId, campoData, de, ate }),
        listarCenarios(),
        supabase.from('profiles').select('*').order('name'),
      ])
      setTarefas(lista)
      setCenarios(listaCenarios)
      setPessoas((perfis as Profile[]) ?? [])
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível carregar as tarefas finalizadas.')
    } finally {
      setCarregando(false)
    }
  }, [campoData, de, ate, texto, cenarioId])

  useEffect(() => {
    carregar()
  }, [campoData, de, ate, cenarioId])

  async function executarReabertura(tarefa: Tarefa, senha?: string) {
    setProcessando(true)
    setErroReabrir(null)
    try {
      await reabrirTarefa(tarefa.id, senha)
      setReabrindo(null)
      await carregar()
    } catch (err) {
      const mensagem = err instanceof FinalizarError ? err.message : 'Não foi possível reabrir a tarefa.'
      if (err instanceof FinalizarError && err.senhaObrigatoria) {
        // pede a senha do responsável em modal próprio
        setReabrindo(tarefa)
        setErroReabrir(senha ? mensagem : null)
      } else {
        setErroReabrir(mensagem)
        setErro(mensagem)
      }
    } finally {
      setProcessando(false)
    }
  }

  function handleReabrir(tarefa: Tarefa) {
    if (tarefa.responsavel_id && tarefa.responsavel_id === user?.id) {
      executarReabertura(tarefa)
      return
    }
    setErroReabrir(null)
    setReabrindo(tarefa)
  }

  const mapaPessoas = useMemo(() => new Map(pessoas.map((p) => [p.id, p])), [pessoas])

  const nomeDe = useCallback(
    (id: string | null) => (id ? mapaPessoas.get(id)?.name ?? '—' : '—'),
    [mapaPessoas],
  )

  /** Um campo de texto só, procurando em solicitante, responsável e executor. */
  const filtradas = useMemo(() => {
    const busca = texto.trim().toLowerCase()
    if (!busca) return tarefas
    return tarefas.filter((t) =>
      [t.solicitante_id, t.responsavel_id, t.executor_id]
        .map((id) => (id ? mapaPessoas.get(id)?.name ?? '' : ''))
        .concat(t.titulo)
        .join(' ')
        .toLowerCase()
        .includes(busca),
    )
  }, [tarefas, texto, mapaPessoas])

  return (
    <AppLayout>
      <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6 dark:bg-slate-800">
        <header className="mb-4">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Tarefas finalizadas</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Histórico das tarefas encerradas pelo responsável.
          </p>
        </header>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className={labelClass} htmlFor="filtro-cenario">
              Cenário
            </label>
            <select
              id="filtro-cenario"
              value={cenarioId}
              onChange={(e) => setCenarioId(e.target.value)}
              className={inputClass}
            >
              <option value="todos">Todos</option>
              {cenarios.map((cenario) => (
                <option key={cenario.id} value={cenario.id}>
                  {cenario.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 xl:col-span-1">
            <label className={labelClass} htmlFor="filtro-texto">
              Pessoa ou tarefa
            </label>
            <input
              id="filtro-texto"
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Solicitante, responsável ou executor"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="filtro-campo-data">
              Filtrar pela data de
            </label>
            <select
              id="filtro-campo-data"
              value={campoData}
              onChange={(e) => setCampoData(e.target.value as CampoData)}
              className={inputClass}
            >
              <option value="finalizacao">Finalização</option>
              <option value="conclusao">Conclusão</option>
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="filtro-de">
              De
            </label>
            <input
              id="filtro-de"
              type="date"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="filtro-ate">
              Até
            </label>
            <input
              id="filtro-ate"
              type="date"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {carregando && (
          <p role="status" className="text-sm text-slate-500 dark:text-slate-400">
            Carregando...
          </p>
        )}

        {!carregando && erro && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {erro}
          </p>
        )}

        {!carregando && !erro && filtradas.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
            Nenhuma tarefa finalizada no filtro atual.
          </p>
        )}

        {!carregando && !erro && filtradas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="py-2 font-medium">#</th>
                  <th className="py-2 font-medium">Tarefa</th>
                  <th className="py-2 font-medium">Solicitante</th>
                  <th className="py-2 font-medium">Responsável</th>
                  <th className="py-2 font-medium">Executor</th>
                  <th className="py-2 font-medium">Concluída em</th>
                  <th className="py-2 font-medium">Finalizada em</th>
                  <th className="py-2 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((tarefa) => (
                  <tr key={tarefa.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-3 font-mono text-xs text-slate-400 dark:text-slate-500" title={tarefa.id}>
                      {tarefa.numero}
                    </td>
                    <td className="max-w-xs py-3">
                      <span className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${PRIORIDADES[tarefa.prioridade].ponto}`}
                          role="img"
                          aria-label={`Prioridade ${PRIORIDADES[tarefa.prioridade].rotulo.toLowerCase()}`}
                          title={`Prioridade ${PRIORIDADES[tarefa.prioridade].rotulo.toLowerCase()}`}
                        />
                        <span className="truncate text-slate-900 dark:text-white" title={tarefa.titulo}>
                          {tarefa.titulo}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{nomeDe(tarefa.solicitante_id)}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{nomeDe(tarefa.responsavel_id)}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{nomeDe(tarefa.executor_id)}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{formatar(tarefa.data_conclusao)}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{formatar(tarefa.finalizada_em)}</td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleReabrir(tarefa)}
                        disabled={processando}
                        className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 dark:bg-amber-500/10 dark:text-amber-300"
                        aria-label={`Reabrir a tarefa ${tarefa.titulo} e devolver para A fazer`}
                        title="Voltar para A fazer"
                      >
                        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M3 12a9 9 0 1 0 3-6.7" />
                          <path d="M3 4v5h5" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SenhaResponsavelDialog
        open={reabrindo !== null}
        titulo="Reabrir tarefa"
        acao="reabrir"
        nomeResponsavel={
          (reabrindo?.responsavel_id ? mapaPessoas.get(reabrindo.responsavel_id)?.name : null) ??
          'o responsável'
        }
        processando={processando}
        erro={erroReabrir}
        onConfirmar={(senha) => reabrindo && executarReabertura(reabrindo, senha)}
        onCancelar={() => {
          setReabrindo(null)
          setErroReabrir(null)
        }}
      />
    </AppLayout>
  )
}
