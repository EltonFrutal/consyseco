import { useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import {
  ANEXO_TAMANHO_MAXIMO,
  enviarAnexo,
  excluirAnexo,
  listarAnexos,
  urlDoAnexo,
  type Anexo,
} from '../../api/tarefas'

interface AnexosTarefaProps {
  /** Sem tarefa salva não há onde pendurar o arquivo. */
  tarefaId: string | null
  /** Mobile: só os dois ícones, ao lado da prioridade. */
  compacto?: boolean
}

const botaoClass =
  'flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'

const botaoIconeClass =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 dark:text-slate-400 dark:hover:text-white'

const iconeProps = {
  viewBox: '0 0 24 24',
  className: 'h-4 w-4 shrink-0',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

function tamanhoLegivel(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function AnexosTarefa({ tarefaId, compacto = false }: AnexosTarefaProps) {
  const [anexos, setAnexos] = useState<Anexo[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [listaAberta, setListaAberta] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<Anexo | null>(null)
  const arquivoRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!tarefaId) return
    listarAnexos(tarefaId)
      .then(setAnexos)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Não foi possível listar os anexos.'))
  }, [tarefaId])

  async function enviar(arquivos: FileList | File[] | null) {
    if (!tarefaId || !arquivos || arquivos.length === 0) return
    setOcupado(true)
    setErro(null)
    try {
      for (const arquivo of Array.from(arquivos)) {
        if (arquivo.size > ANEXO_TAMANHO_MAXIMO) {
          throw new Error(`"${arquivo.name}" passa de 10 MB.`)
        }
        const novo = await enviarAnexo(tarefaId, arquivo)
        setAnexos((atual) => [...atual, novo])
        // abrir a lista é a confirmação de que o arquivo subiu
        setListaAberta(true)
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar o anexo.')
    } finally {
      setOcupado(false)
    }
  }

  // colar (Ctrl+V) traz print de tela e imagem copiada de outro app
  useEffect(() => {
    if (!tarefaId) return
    function aoColar(evento: ClipboardEvent) {
      const arquivos = Array.from(evento.clipboardData?.files ?? [])
      if (arquivos.length > 0) {
        evento.preventDefault()
        void enviar(arquivos)
      }
    }
    window.addEventListener('paste', aoColar)
    return () => window.removeEventListener('paste', aoColar)
  })

  useEffect(() => {
    if (!listaAberta) return
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.stopPropagation()
        setListaAberta(false)
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [listaAberta])

  async function abrir(anexo: Anexo) {
    try {
      const url = await urlDoAnexo(anexo)
      window.open(url, '_blank', 'noopener')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível abrir o anexo.')
    }
  }

  async function remover(anexo: Anexo) {
    setOcupado(true)
    try {
      await excluirAnexo(anexo)
      setAnexos((atual) => atual.filter((a) => a.id !== anexo.id))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir o anexo.')
    } finally {
      setOcupado(false)
    }
  }

  // no desktop a lista cabe aberta; no celular ela só aparece ao tocar no número
  const mostrarLista = listaAberta

  if (!tarefaId) {
    if (compacto) return null
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-400 dark:border-slate-600 dark:text-slate-500">
        Salve a tarefa para poder anexar arquivos.
      </p>
    )
  }

  return (
    <div
      title={compacto ? 'Anexar arquivo, foto, arrastar ou colar com Ctrl+V' : undefined}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        void enviar(e.dataTransfer.files)
      }}
    >
      <div className={`flex flex-wrap items-center gap-2 ${compacto ? 'gap-1' : ''}`}>
        {!compacto && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Anexos
          </span>
        )}

        <button
          type="button"
          onClick={() => arquivoRef.current?.click()}
          disabled={ocupado}
          aria-label="Anexar arquivo"
          title="Anexar arquivo"
          className={compacto ? botaoIconeClass : botaoClass}
        >
          <svg {...iconeProps} className={compacto ? 'h-5 w-5 shrink-0' : iconeProps.className}>
            <path d="M21.4 11.1 12.3 20a5 5 0 0 1-7.1-7.1l9.2-9.2a3.3 3.3 0 0 1 4.7 4.7l-9.1 9.2a1.7 1.7 0 0 1-2.4-2.4l8.5-8.5" />
          </svg>
          {!compacto && 'Arquivo'}
        </button>

        {/* só no celular: no desktop `capture` não abre câmera, viraria um
            segundo seletor de arquivo sem utilidade */}
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={ocupado}
          aria-label="Tirar foto"
          title="Tirar foto"
          className={compacto ? `${botaoIconeClass} md:hidden` : `${botaoClass} md:hidden`}
        >
          <svg {...iconeProps} className={compacto ? 'h-5 w-5 shrink-0' : iconeProps.className}>
            <path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <circle cx="12" cy="12.5" r="3.5" />
          </svg>
          {!compacto && 'Foto'}
        </button>

        {anexos.length > 0 && (
          <button
            type="button"
            onClick={() => setListaAberta((v) => !v)}
            aria-expanded={mostrarLista}
            aria-label={`${anexos.length} ${anexos.length === 1 ? 'anexo' : 'anexos'}`}
            title={mostrarLista ? 'Esconder anexos' : 'Ver anexos'}
            className={`flex min-h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-medium tabular-nums transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              mostrarLista
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {anexos.length}
          </button>
        )}

        {!compacto && (
          <span className="hidden text-xs text-slate-400 md:inline dark:text-slate-500">
            ou arraste aqui / cole com Ctrl+V
          </span>
        )}
      </div>

      <input
        ref={arquivoRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          void enviar(e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void enviar(e.target.files)
          e.target.value = ''
        }}
      />

      {erro && !mostrarLista && (
        <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
          {erro}
        </p>
      )}

      {/* a lista vira janela própria, na frente do formulário: no celular não há
          espaço para ela embaixo dos ícones, e no desktop ela empurrava o rodapé */}
      {mostrarLista && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/70 p-4 backdrop-blur-sm md:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Anexos da tarefa"
          onClick={() => setListaAberta(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Anexos
                <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
                  {anexos.length}
                </span>
              </h4>
              <button
                type="button"
                onClick={() => setListaAberta(false)}
                aria-label="Fechar"
                title="Fechar"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                <svg {...iconeProps} className="h-5 w-5 shrink-0">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {erro && (
              <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
                {erro}
              </p>
            )}

            {anexos.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-400 dark:border-slate-600 dark:text-slate-500">
                Nenhum anexo ainda
              </p>
            ) : (
              <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto pr-1">
                {anexos.map((anexo) => (
                  <li
                    key={anexo.id}
                    className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-900/40"
                  >
                    <button
                      type="button"
                      onClick={() => abrir(anexo)}
                      className="flex min-h-9 min-w-0 flex-1 items-center gap-2 text-left text-xs text-slate-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-200"
                      title={`Abrir ${anexo.nome}`}
                    >
                      <span className="truncate">{anexo.nome}</span>
                      <span className="shrink-0 text-slate-400 dark:text-slate-500">
                        {tamanhoLegivel(anexo.tamanho)}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmandoExclusao(anexo)}
                      disabled={ocupado}
                      aria-label={`Excluir ${anexo.nome}`}
                      title="Excluir anexo"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50 dark:hover:bg-red-500/10"
                    >
                      <svg {...iconeProps}>
                        <path d="M4 7h16" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
                        <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirmandoExclusao !== null}
        title="Excluir este anexo?"
        description={`"${confirmandoExclusao?.nome ?? ''}" é apagado do servidor. Não dá para desfazer.`}
        confirmLabel="Sim, excluir"
        onConfirm={() => {
          const alvo = confirmandoExclusao
          setConfirmandoExclusao(null)
          if (alvo) void remover(alvo)
        }}
        onCancel={() => setConfirmandoExclusao(null)}
      />
    </div>
  )
}
