import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { supabase } from '../lib/supabaseClient'
import { PRIORIDADES, listarFinalizadas, type Tarefa } from '../api/tarefas'
import type { Profile } from '../types/profile'

type CampoData = 'conclusao' | 'finalizacao'

const inputClass =
  'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300'

function formatar(valor: string | null) {
  return valor ? new Date(valor).toLocaleString('pt-BR') : '—'
}

export function FinalizadasPage() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [pessoas, setPessoas] = useState<Profile[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [texto, setTexto] = useState('')
  const [campoData, setCampoData] = useState<CampoData>('finalizacao')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const [lista, { data: perfis }] = await Promise.all([
        listarFinalizadas({ texto, campoData, de, ate }),
        supabase.from('profiles').select('*').order('name'),
      ])
      setTarefas(lista)
      setPessoas((perfis as Profile[]) ?? [])
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível carregar as tarefas finalizadas.')
    } finally {
      setCarregando(false)
    }
  }, [campoData, de, ate, texto])

  useEffect(() => {
    carregar()
  }, [campoData, de, ate])

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

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                  <th className="py-2 font-medium">Tarefa</th>
                  <th className="py-2 font-medium">Solicitante</th>
                  <th className="py-2 font-medium">Responsável</th>
                  <th className="py-2 font-medium">Executor</th>
                  <th className="py-2 font-medium">Concluída em</th>
                  <th className="py-2 font-medium">Finalizada em</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((tarefa) => (
                  <tr key={tarefa.id} className="border-b border-slate-100 dark:border-slate-800">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
