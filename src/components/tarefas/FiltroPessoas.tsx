import { useEffect, useState } from 'react'
import type { Profile } from '../../types/profile'

export type DimensaoFiltro = 'responsavel' | 'executor'

interface FiltroPessoasProps {
  dimensao: DimensaoFiltro
  onDimensao: (dimensao: DimensaoFiltro) => void
  pessoas: Profile[]
  selecionado: string | null
  onSelecionar: (id: string | null) => void
}

/** Quantos avatares cabem de uma vez; o resto vem pelas setas. */
const VISIVEIS = 3

export function FiltroPessoas({
  dimensao,
  onDimensao,
  pessoas,
  selecionado,
  onSelecionar,
}: FiltroPessoasProps) {
  const [inicio, setInicio] = useState(0)

  // trocar de dimensão (ou de cenário) pode encurtar a lista
  useEffect(() => {
    setInicio(0)
  }, [dimensao, pessoas.length])

  const maxInicio = Math.max(0, pessoas.length - VISIVEIS)
  const janela = pessoas.slice(inicio, inicio + VISIVEIS)
  const temSetas = pessoas.length > VISIVEIS

  return (
    <div className="-my-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-700/40">
      <div className="flex gap-1">
        {(['responsavel', 'executor'] as const).map((valor) => (
          <button
            key={valor}
            type="button"
            onClick={() => {
              onDimensao(valor)
              onSelecionar(null)
            }}
            aria-pressed={dimensao === valor}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              dimensao === valor
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {valor === 'responsavel' ? 'Responsável' : 'Executor'}
          </button>
        ))}
      </div>

      <div className="mt-1 flex items-center gap-1">
        {temSetas && (
          <button
            type="button"
            onClick={() => setInicio((v) => Math.max(0, v - 1))}
            disabled={inicio === 0}
            className="flex h-10 w-6 items-center justify-center rounded-lg text-slate-400 transition hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-30 dark:hover:text-slate-200"
            aria-label="Ver pessoas anteriores"
            title="Anteriores"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
        )}

        <div
          className="flex items-center gap-1.5"
          role="group"
          aria-label={`Filtrar por ${dimensao === 'responsavel' ? 'responsável' : 'executor'}`}
        >
          {janela.map((pessoa) => {
            const ativo = selecionado === pessoa.id
            return (
              <button
                key={pessoa.id}
                type="button"
                onClick={() => onSelecionar(ativo ? null : pessoa.id)}
                aria-pressed={ativo}
                aria-label={`Mostrar apenas tarefas de ${pessoa.name}`}
                title={ativo ? `${pessoa.name} — clique para limpar` : pessoa.name}
                className={`h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  ativo
                    ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-slate-50 dark:ring-offset-slate-700'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                {pessoa.avatar_url ? (
                  <img src={pessoa.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-slate-100 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                    {pessoa.name.trim().charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
            )
          })}

          {pessoas.length === 0 && (
            <span className="px-1 text-xs text-slate-400 dark:text-slate-500">
              Ninguém neste cenário
            </span>
          )}
        </div>

        {temSetas && (
          <button
            type="button"
            onClick={() => setInicio((v) => Math.min(maxInicio, v + 1))}
            disabled={inicio >= maxInicio}
            className="flex h-10 w-6 items-center justify-center rounded-lg text-slate-400 transition hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-30 dark:hover:text-slate-200"
            aria-label="Ver próximas pessoas"
            title="Próximas"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        )}

        {selecionado && (
          <button
            type="button"
            onClick={() => onSelecionar(null)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white text-slate-500 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
            aria-label="Mostrar todos"
            title="Mostrar todos"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
