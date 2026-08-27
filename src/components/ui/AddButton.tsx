interface AddButtonProps {
  onClick: () => void
  /** Descreve a ação: "Novo usuário", "Nova tarefa"... Vira aria-label e tooltip. */
  label: string
  disabled?: boolean
}

/**
 * Botão padrão de inclusão do projeto: redondo, verde e só com o "+".
 * Toda tela que inclui registro usa este componente — ver docs/padroes.md.
 */
export function AddButton({ onClick, label, disabled = false }: AddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-slate-900"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  )
}
