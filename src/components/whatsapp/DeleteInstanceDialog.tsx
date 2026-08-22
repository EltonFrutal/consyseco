import { useState } from 'react'

interface DeleteInstanceDialogProps {
  open: boolean
  nome: string
  deleting: boolean
  error: string | null
  canForce: boolean
  onConfirm: (force: boolean) => void
  onCancel: () => void
}

/** Exige digitar o nome da instância antes de excluir. */
export function DeleteInstanceDialog({
  open,
  nome,
  deleting,
  error,
  canForce,
  onConfirm,
  onCancel,
}: DeleteInstanceDialogProps) {
  const [confirmacao, setConfirmacao] = useState('')

  if (!open) return null

  const habilitado = confirmacao === nome && !deleting

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Excluir instância</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          A instância será desconectada e removida na uazapi antes de sair daqui. Para confirmar, digite
          <span className="font-semibold text-slate-700 dark:text-slate-200"> {nome} </span>
          abaixo.
        </p>

        <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="wa-confirm">
          Nome da instância
        </label>
        <input
          id="wa-confirm"
          type="text"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          autoComplete="off"
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
          >
            <p>{error}</p>
            {canForce && (
              <p className="mt-2">
                O registro foi mantido. Você pode remover só daqui, ciente de que a instância pode continuar
                existindo na uazapi.
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          {canForce && (
            <button
              type="button"
              onClick={() => onConfirm(true)}
              disabled={!habilitado}
              className="min-h-11 rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              Remover mesmo assim
            </button>
          )}
          <button
            type="button"
            onClick={() => onConfirm(false)}
            disabled={!habilitado}
            className="min-h-11 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-slate-900"
          >
            {deleting ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}
