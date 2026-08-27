import { useEffect, useRef, useState } from 'react'

export interface OpcaoMultipla {
  valor: string
  rotulo: string
}

interface SeletorMultiploProps {
  rotulo: string
  opcoes: OpcaoMultipla[]
  /** Lista explícita: vazia é vazia mesmo, e quem consome decide o que exibir. */
  selecionados: string[]
  onChange: (selecionados: string[]) => void
}

/**
 * Combobox de seleção múltipla com "Todos" e "Limpar".
 * Não usa <select multiple>: no celular ele vira uma lista rolável minúscula e
 * exige toque com Ctrl no desktop, que ninguém descobre sozinho.
 */
export function SeletorMultiplo({ rotulo, opcoes, selecionados, onChange }: SeletorMultiploProps) {
  const [aberto, setAberto] = useState(false)
  const caixaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return

    function aoClicarFora(evento: MouseEvent) {
      if (!caixaRef.current?.contains(evento.target as Node)) setAberto(false)
    }
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setAberto(false)
    }

    document.addEventListener('mousedown', aoClicarFora)
    window.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('mousedown', aoClicarFora)
      window.removeEventListener('keydown', aoTeclar)
    }
  }, [aberto])

  function alternar(valor: string) {
    onChange(
      selecionados.includes(valor)
        ? selecionados.filter((v) => v !== valor)
        : [...selecionados, valor],
    )
  }

  const resumo =
    selecionados.length === 0
      ? `Nenhum ${rotulo.toLowerCase()}`
      : selecionados.length === opcoes.length
        ? `Todos os ${rotulo.toLowerCase()}s`
        : selecionados.length === 1
          ? opcoes.find((o) => o.valor === selecionados[0])?.rotulo ?? ''
          : `${selecionados.length} selecionados`

  return (
    <div className="relative" ref={caixaRef}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="listbox"
        aria-label={rotulo}
        className="flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <span className="max-w-32 truncate">{resumo}</span>
        <svg
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 shrink-0 transition ${aberto ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {aberto && (
        <div
          className="absolute right-0 z-30 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
          role="listbox"
          aria-multiselectable="true"
          aria-label={rotulo}
        >
          <div className="flex items-center justify-between gap-2 px-2 py-1 text-[11px] text-slate-400 dark:text-slate-500">
            <span className="tabular-nums">
              {selecionados.length} de {opcoes.length}
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                onClick={() => onChange(opcoes.map((o) => o.valor))}
                className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => onChange([])}
                className="font-medium text-slate-500 hover:underline dark:text-slate-400"
              >
                Limpar
              </button>
            </span>
          </div>

          <ul className="max-h-56 overflow-y-auto">
            {opcoes.map((opcao) => {
              const marcado = selecionados.includes(opcao.valor)
              return (
                <li key={opcao.valor}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={marcado}
                    onClick={() => alternar(opcao.valor)}
                    className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-xs text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
                        marcado
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-300 dark:border-slate-500'
                      }`}
                      aria-hidden="true"
                    >
                      {marcado && (
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m5 12 5 5L20 7" />
                        </svg>
                      )}
                    </span>
                    <span className="truncate tabular-nums">{opcao.rotulo}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
