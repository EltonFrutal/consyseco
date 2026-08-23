import { useState, type FormEvent } from 'react'

interface FinalizarSenhaDialogProps {
  open: boolean
  nomeResponsavel: string
  finalizando: boolean
  erro: string | null
  onConfirmar: (senha: string) => void
  onCancelar: () => void
}

/**
 * Pedido de senha do responsável, em modal próprio.
 * A senha vive só neste componente e é descartada ao fechar.
 */
export function FinalizarSenhaDialog({
  open,
  nomeResponsavel,
  finalizando,
  erro,
  onConfirmar,
  onCancelar,
}: FinalizarSenhaDialogProps) {
  const [senha, setSenha] = useState('')

  if (!open) return null

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (senha) onConfirmar(senha)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Finalizar tarefa</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Só <span className="font-medium text-slate-700 dark:text-slate-200">{nomeResponsavel}</span> pode
          finalizar esta tarefa. Informe a senha para confirmar.
        </p>

        <form onSubmit={handleSubmit} className="mt-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="senha-responsavel">
            Senha do responsável
          </label>
          <input
            id="senha-responsavel"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="off"
            autoFocus
            aria-invalid={Boolean(erro)}
            aria-describedby={erro ? 'senha-responsavel-erro' : undefined}
            className={`mt-1 block w-full rounded-lg border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-slate-100 ${
              erro
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-600'
            }`}
          />

          {erro && (
            <p id="senha-responsavel-erro" role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
              {erro}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelar}
              className="flex h-11 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={finalizando || !senha}
              className="flex h-11 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-slate-800"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 11l2.5 2.5L16 8.5" />
                <path d="M20.5 12a8.5 8.5 0 1 1-3.2-6.6" />
              </svg>
              {finalizando ? 'Finalizando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
