interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  error?: string | null
  /** `positivo` para ações que não destroem nada — finalizar, por exemplo. */
  tom?: 'perigo' | 'positivo'
  onConfirm: () => void
  onCancel: () => void
}

const TOM = {
  perigo: 'bg-red-600 hover:bg-red-500 focus:ring-red-500',
  positivo: 'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500',
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  error,
  tom = 'perigo',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${TOM[tom]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
