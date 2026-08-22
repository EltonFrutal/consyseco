import { useEffect, useRef, useState, type FormEvent } from 'react'
import { validateAvatar } from '../../api/avatars'
import type { Profile } from '../../types/profile'

export interface UserFormValues {
  name: string
  email: string
  countryCode: string
  phone: string
  password: string
  /** Arquivo novo escolhido pelo admin; null quando a foto não mudou. */
  avatarFile: File | null
  /** true quando o admin pediu para remover a foto atual. */
  avatarRemoved: boolean
}

interface UserFormModalProps {
  open: boolean
  initialData: Profile | null
  onClose: () => void
  onSubmit: (values: UserFormValues) => Promise<void>
}

const inputClass =
  'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300'

export function UserFormModal({ open, initialData, onClose, onSubmit }: UserFormModalProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [email, setEmail] = useState(initialData?.email ?? '')
  const [countryCode, setCountryCode] = useState(initialData?.country_code ?? '55')
  const [phone, setPhone] = useState(initialData?.phone ?? '')
  const [password, setPassword] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarRemoved, setAvatarRemoved] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!avatarFile) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(avatarFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [avatarFile])

  if (!open) return null

  const isEdit = Boolean(initialData)
  const currentAvatar = avatarRemoved ? null : initialData?.avatar_url ?? null
  const shownAvatar = previewUrl ?? currentAvatar

  function handleFileChange(file: File | undefined) {
    if (!file) return
    const validationError = validateAvatar(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setAvatarFile(file)
    setAvatarRemoved(false)
  }

  function handleRemoveAvatar() {
    setAvatarFile(null)
    setAvatarRemoved(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!/^[0-9]{1,4}$/.test(countryCode)) {
      setError('O código do país deve ter de 1 a 4 dígitos (ex.: 55).')
      return
    }

    if (!isEdit && password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({ name, email, countryCode, phone, password, avatarFile, avatarRemoved })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {isEdit ? 'Editar usuário' : 'Novo usuário'}
        </h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="flex justify-center">
            <div className="group relative h-20 w-20">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-20 w-20 overflow-hidden rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                aria-label={shownAvatar ? 'Trocar foto' : 'Adicionar foto'}
                title={shownAvatar ? 'Trocar foto' : 'Adicionar foto'}
              >
                {shownAvatar ? (
                  <img src={shownAvatar} alt="Foto do usuário" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-slate-100 text-2xl font-medium text-slate-400 dark:bg-slate-700 dark:text-slate-400">
                    {(name.trim()[0] ?? '?').toUpperCase()}
                  </span>
                )}
              </button>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1 rounded-full bg-black/50 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/20"
                  aria-label={shownAvatar ? 'Trocar foto' : 'Adicionar foto'}
                  title={shownAvatar ? 'Trocar foto' : 'Adicionar foto'}
                >
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18.4 2.6a2.25 2.25 0 0 1 3.18 3.18l-11.7 11.7a2 2 0 0 1-.84.5l-3.53 1.05a.5.5 0 0 1-.62-.62l1.05-3.53a2 2 0 0 1 .5-.84z" />
                    <path d="M16.5 4.5 19.5 7.5" />
                  </svg>
                </button>
                {shownAvatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/20"
                    aria-label="Remover foto"
                    title="Remover foto"
                  >
                    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 7h16" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
                      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Nome</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>E-mail</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
          <div className="flex gap-3">
            <div className="w-24">
              <label className={labelClass} htmlFor="country-code">
                País
              </label>
              <input
                id="country-code"
                type="text"
                inputMode="numeric"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="55"
                className={inputClass}
              />
            </div>
            <div className="flex-1">
              <label className={labelClass} htmlFor="phone">
                Telefone
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className={inputClass}
              />
            </div>
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
