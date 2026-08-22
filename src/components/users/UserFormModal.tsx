import { useState, type FormEvent } from 'react'
import type { Profile } from '../../types/profile'

interface UserFormModalProps {
  open: boolean
  initialData: Profile | null
  onClose: () => void
  onSubmit: (values: { name: string; email: string; password: string }) => Promise<void>
}

const inputClass =
  'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300'

export function UserFormModal({ open, initialData, onClose, onSubmit }: UserFormModalProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [email, setEmail] = useState(initialData?.email ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  const isEdit = Boolean(initialData)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isEdit && password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({ name, email, password })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {isEdit ? 'Editar usuário' : 'Novo usuário'}
        </h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className={labelClass}>Nome</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>E-mail</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{isEdit ? 'Nova senha (opcional)' : 'Senha'}</label>
            <input
              type="password"
              required={!isEdit}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
            >
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
