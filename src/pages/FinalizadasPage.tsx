import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { supabase } from '../lib/supabaseClient'
import {
  FinalizarError,
  PRIORIDADES,
  listarDepartamentos,
  listarFinalizadas,
  reabrirTarefa,
  type Departamento,
  type Tarefa,
} from '../api/tarefas'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { SenhaResponsavelDialog } from '../components/tarefas/SenhaResponsavelDialog'
import { useAuth } from '../contexts/AuthContext'
import type { Profile } from '../types/profile'

type CampoData = 'conclusao' | 'finalizacao'

// min-w-0 no campo: input[type=date] tem largura mínima intrínseca e estica a
// coluna da grade, estourando o cartão no celular
const inputClass =
  'mt-1 block w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300'

function formatar(valor: string | null) {
  return valor ? new Date(valor).toLocaleString('pt-BR') : '—'
}

/** No cartão do celular a linha é estreita: sem segundos e com ano curto. */
function formatarCurto(valor: string | null) {
  if (!valor) return '—'
  return new Date(valor).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Data de hoje deslocada em dias, no formato do input date. */
function emIso(deslocamentoEmDias: number) {
  const data = new Date()
  data.setDate(data.getDate() + deslocamentoEmDias)
  return data.toISOString().slice(0, 10)
}

export function FinalizadasPage() {
  const { user } = useAuth()
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [pessoas, setPessoas] = useState<Profile[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [departamentoId, setDepartamentoId] = useState('todos')
  const [texto, setTexto] = useState('')
  const [campoData, setCampoData] = useState<CampoData>('finalizacao')
  const [de, setDe] = useState(() => emIso(-9))
  const [ate, setAte] = useState(() => emIso(0))
  const [reabrindo, setReabrindo] = useState<Tarefa | null>(null)
  const [confirmandoReabertura, setConfirmandoReabertura] = useState<Tarefa | null>(null)
  const [processando, setProcessando] = useState(false)
  const [erroReabrir, setErroReabrir] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const [lista, listaDepartamentos, { data: perfis }] = await Promise.all([
        listarFinalizadas({ texto, departamentoId, campoData, de, ate }),
        listarDepartamentos(),
        supabase.from('profiles').select('*').order('name'),
      ])
      setTarefas(lista)
      setDepartamentos(listaDepartamentos)
      setPessoas((perfis as Profile[]) ?? [])
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível carregar as tarefas finalizadas.')
    } finally {
      setCarregando(false)
    }
  }, [campoData, de, ate, texto, departamentoId])

  useEffect(() => {
    carregar()
  }, [campoData, de, ate, departamentoId])

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

  // confirmar primeiro, pedir senha depois — padrão do sistema
  function handleReabrir(tarefa: Tarefa) {
    setConfirmandoReabertura(tarefa)
  }

  function handleConfirmarReabertura(tarefa: Tarefa) {
    setConfirmandoReabertura(null)
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

        <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-5">
          <div className="col-span-2 xl:col-span-1">
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

          <div className="min-w-0">
            <label className={labelClass} htmlFor="filtro-departamento">
              Departamento
            </label>
            <select
              id="filtro-departamento"
              value={departamentoId}
              onChange={(e) => setDepartamentoId(e.target.value)}
              className={inputClass}
            >
              <option value="todos">Todos</option>
              {departamentos.map((departamento) => (
                <option key={departamento.id} value={departamento.id}>
                  {departamento.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
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

          <div className="col-span-2 min-w-0 xl:col-span-1">
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

          <div className="col-span-2 min-w-0 xl:col-span-1">
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
          <>
            {/* mesma lógica da tela de usuários: oito colunas não cabem no
                celular, então viram cartão com o essencial */}
            <ul className="space-y-2 md:hidden">
              {filtradas.map((tarefa) => (
                <li
                  key={tarefa.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                        #{tarefa.numero}
                      </span>
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${PRIORIDADES[tarefa.prioridade].ponto}`}
                        title={`Prioridade ${PRIORIDADES[tarefa.prioridade].rotulo.toLowerCase()}`}
                        aria-label={`Prioridade ${PRIORIDADES[tarefa.prioridade].rotulo.toLowerCase()}`}
                        role="img"
                      />
                      <span className="truncate text-sm text-slate-900 dark:text-white" title={tarefa.titulo}>
                        {tarefa.titulo}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                      {nomeDe(tarefa.executor_id)} · {formatarCurto(tarefa.finalizada_em)}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleReabrir(tarefa)}
                    disabled={processando}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 transition hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50 dark:bg-amber-500/10 dark:text-amber-300"
                    aria-label={`Reabrir a tarefa ${tarefa.titulo} e devolver para A fazer`}
                    title="Voltar para A fazer"
                  >
                    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 12a9 9 0 1 0 3-6.7" />
                      <path d="M3 4v5h5" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="py-1.5 font-medium">#</th>
                  <th className="py-1.5 font-medium">Tarefa</th>
                  <th className="py-1.5 font-medium">Solicitante</th>
                  <th className="py-1.5 font-medium">Responsável</th>
                  <th className="py-1.5 font-medium">Executor</th>
                  <th className="py-1.5 font-medium">Concluída em</th>
                  <th className="py-1.5 font-medium">Finalizada em</th>
                  <th className="py-1.5 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((tarefa) => (
                  <tr key={tarefa.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 font-mono text-xs text-slate-400 dark:text-slate-500" title={tarefa.id}>
                      {tarefa.numero}
                    </td>
                    <td className="max-w-xs py-1.5">
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
                    <td className="py-1.5 text-slate-600 dark:text-slate-300">{nomeDe(tarefa.solicitante_id)}</td>
                    <td className="py-1.5 text-slate-600 dark:text-slate-300">{nomeDe(tarefa.responsavel_id)}</td>
                    <td className="py-1.5 text-slate-600 dark:text-slate-300">{nomeDe(tarefa.executor_id)}</td>
                    <td className="py-1.5 text-slate-600 dark:text-slate-300">{formatar(tarefa.data_conclusao)}</td>
                    <td className="py-1.5 text-slate-600 dark:text-slate-300">{formatar(tarefa.finalizada_em)}</td>
                    <td className="py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleReabrir(tarefa)}
                        disabled={processando}
                        className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 dark:bg-amber-500/10 dark:text-amber-300"
                        aria-label={`Reabrir a tarefa ${tarefa.titulo} e devolver para A fazer`}
                        title="Voltar para A fazer"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmandoReabertura !== null}
        tom="positivo"
        title={`Reabrir a tarefa #${confirmandoReabertura?.numero ?? ''}?`}
        description={
          confirmandoReabertura?.responsavel_id === user?.id
            ? 'Ela volta para a primeira etapa do departamento e reaparece no quadro.'
            : 'Ela volta para o quadro. Como você não é o responsável, a senha dele será pedida em seguida.'
        }
        confirmLabel="Sim, reabrir"
        onConfirm={() =>
          confirmandoReabertura && handleConfirmarReabertura(confirmandoReabertura)
        }
        onCancel={() => setConfirmandoReabertura(null)}
      />

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
