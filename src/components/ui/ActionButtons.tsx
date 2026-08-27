/**
 * Botões padrão de ação do projeto — ver docs/padroes.md.
 * Salvar e Cancelar levam ícone + texto; Excluir é somente o ícone da lixeira.
 * No mobile o texto de Cancelar some: quatro botões com rótulo não cabem em
 * 375px e a fila quebrava linha. Salvar mantém o texto por ser a ação primária.
 */

const iconeProps = {
  viewBox: '0 0 24 24',
  className: 'h-[18px] w-[18px] shrink-0',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

const comTexto =
  'flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-slate-800'

/** Rótulo que some no mobile — o ícone e o aria-label seguram o significado. */
const soNoDesktop = 'hidden md:inline'

interface BotaoProps {
  onClick?: () => void
  disabled?: boolean
  /** Sobrescreve o rótulo padrão quando a ação tem outro nome. */
  label?: string
}

export function SaveButton({ onClick, disabled = false, label = 'Salvar' }: BotaoProps) {
  return (
    <button
      type="submit"
      onClick={onClick}
      disabled={disabled}
      className={`${comTexto} bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-500`}
    >
      {/* disquete */}
      <svg {...iconeProps}>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <path d="M17 21v-8H7v8" />
        <path d="M7 3v5h8" />
      </svg>
      {label}
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
      className={`${comTexto} border border-slate-300 px-3 text-slate-600 hover:bg-slate-100 focus:ring-indigo-500 md:px-4 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700`}
    >
      <svg {...iconeProps}>
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
      <span className={soNoDesktop}>{label}</span>
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
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-red-300 text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10 dark:focus:ring-offset-slate-800"
    >
      <svg {...iconeProps} className="h-5 w-5 shrink-0">
        <path d="M4 7h16" />
        <path d="M10 11v6M14 11v6" />
        <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
        <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
    </button>
  )
}
