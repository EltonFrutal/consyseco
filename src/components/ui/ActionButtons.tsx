/**
 * Botões padrão de ação do projeto: somente ícone, 44px, com aria-label e title.
 * Salvar (check indigo), Cancelar (X neutro) e Excluir (lixeira vermelha).
 * Toda tela nova usa estes componentes — ver docs/padroes.md.
 */

const base =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-slate-800'

const iconeProps = {
  viewBox: '0 0 24 24',
  className: 'h-5 w-5',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

interface BotaoProps {
  onClick?: () => void
  disabled?: boolean
  /** Sobrescreve o rótulo padrão quando a ação tem outro nome. */
  label?: string
}

export function SaveButton({ onClick, disabled = false, label = 'Salvar' }: BotaoProps & { type?: 'submit' }) {
  return (
    <button
      type="submit"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`${base} bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-500`}
    >
      <svg {...iconeProps}>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </button>
  )
}

export function CancelButton({ onClick, disabled = false, label = 'Cancelar' }: BotaoProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`${base} border border-slate-300 text-slate-600 hover:bg-slate-100 focus:ring-indigo-500 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700`}
    >
      <svg {...iconeProps}>
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  )
}

export function DeleteButton({ onClick, disabled = false, label = 'Excluir' }: BotaoProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`${base} border border-red-300 text-red-600 hover:bg-red-50 focus:ring-red-500 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10`}
    >
      <svg {...iconeProps}>
        <path d="M4 7h16" />
        <path d="M10 11v6M14 11v6" />
        <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
        <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
    </button>
  )
}
