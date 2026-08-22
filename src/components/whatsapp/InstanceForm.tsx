import { useState, type FormEvent } from 'react'
import { normalizeInstanceName } from '../../api/whatsapp'

interface InstanceFormProps {
  submitting: boolean
  submitError: string | null
  onSubmit: (values: { nome: string; serverUrl: string; token: string }) => void
  onCancel: () => void
}

const inputClass =
  'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
const inputErrorClass =
  'mt-1 block w-full rounded-lg border border-red-500 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-slate-800 dark:text-slate-100'
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300'
const errorClass = 'mt-1 text-sm text-red-600 dark:text-red-400'

interface FieldErrors {
  nome?: string
  serverUrl?: string
  token?: string
}

export function InstanceForm({ submitting, submitError, onSubmit, onCancel }: InstanceFormProps) {
  const [nome, setNome] = useState('')
  const [serverUrl, setServerUrl] = useState('')
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  function validate(): FieldErrors {
    const next: FieldErrors = {}

    if (!nome.trim()) {
      next.nome = 'Informe o nome da instância.'
    } else if (!/^[a-z0-9][a-z0-9._-]*$/.test(nome)) {
      next.nome = 'Use apenas letras minúsculas, números, ponto, hífen ou sublinhado.'
    }

    if (!serverUrl.trim()) {
      next.serverUrl = 'Informe a URL do servidor.'
    } else {
      try {
        const url = new URL(serverUrl.trim())
        if (url.protocol !== 'https:') next.serverUrl = 'A URL precisa começar com https://.'
      } catch {
        next.serverUrl = 'URL inválida. Exemplo: https://free.uazapi.com'
      }
    }

    if (!token.trim()) next.token = 'Informe o token.'

    return next
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return
    onSubmit({ nome, serverUrl: serverUrl.trim(), token: token.trim() })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-lg space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Nova instância</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Informe os dados do seu servidor uazapi. O token é validado antes de qualquer coisa ser salva.
        </p>
      </div>

      {submitError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          {submitError}
        </div>
      )}

      <div>
        <label className={labelClass} htmlFor="wa-nome">
          Nome da instância
        </label>
        <input
          id="wa-nome"
          type="text"
          value={nome}
          onChange={(e) => setNome(normalizeInstanceName(e.target.value))}
          onBlur={() => setErrors((prev) => ({ ...prev, nome: validate().nome }))}
          aria-invalid={Boolean(errors.nome)}
          aria-describedby={errors.nome ? 'wa-nome-error' : 'wa-nome-help'}
          className={errors.nome ? inputErrorClass : inputClass}
          placeholder="minha-instancia"
          autoComplete="off"
        />
        {errors.nome ? (
          <p id="wa-nome-error" className={errorClass}>
            {errors.nome}
          </p>
        ) : (
          <p id="wa-nome-help" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Convertido automaticamente para minúsculo, sem espaço e sem acento.
            {nome && <span className="ml-1 font-medium text-slate-700 dark:text-slate-200">Valor final: {nome}</span>}
          </p>
        )}
      </div>

      <div>
        <label className={labelClass} htmlFor="wa-server">
          URL do servidor
        </label>
        <input
          id="wa-server"
          type="url"
          inputMode="url"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          onBlur={() => setErrors((prev) => ({ ...prev, serverUrl: validate().serverUrl }))}
          aria-invalid={Boolean(errors.serverUrl)}
          aria-describedby={errors.serverUrl ? 'wa-server-error' : 'wa-server-help'}
          className={errors.serverUrl ? inputErrorClass : inputClass}
          placeholder="https://free.uazapi.com"
          autoComplete="off"
        />
        {errors.serverUrl ? (
          <p id="wa-server-error" className={errorClass}>
            {errors.serverUrl}
          </p>
        ) : (
          <p id="wa-server-help" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Precisa ser https.
          </p>
        )}
      </div>

      <div>
        <label className={labelClass} htmlFor="wa-token">
          Token
        </label>
        <div className="relative">
          <input
            id="wa-token"
            type={showToken ? 'text' : 'password'}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onBlur={() => setErrors((prev) => ({ ...prev, token: validate().token }))}
            aria-invalid={Boolean(errors.token)}
            aria-describedby={errors.token ? 'wa-token-error' : 'wa-token-help'}
            className={`${errors.token ? inputErrorClass : inputClass} pr-12`}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShowToken((v) => !v)}
            className="absolute inset-y-0 right-0 mt-1 flex h-10 w-11 items-center justify-center rounded-r-lg text-slate-500 transition hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-400 dark:hover:text-slate-200"
            aria-label={showToken ? 'Ocultar token' : 'Revelar token'}
            title={showToken ? 'Ocultar token' : 'Revelar token'}
            aria-pressed={showToken}
          >
            {showToken ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M6.7 6.7C4.6 8 3 10 2 12c2 4 6 7 10 7 1.8 0 3.4-.5 4.9-1.3" />
                <path d="M9.9 5.2A9.9 9.9 0 0 1 12 5c4 0 8 3 10 7-.8 1.5-1.8 2.9-3 4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 12c2-4 6-7 10-7s8 3 10 7c-2 4-6 7-10 7s-8-3-10-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
        {errors.token ? (
          <p id="wa-token-error" className={errorClass}>
            {errors.token}
          </p>
        ) : (
          <p id="wa-token-help" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Aceita o token de uma instância existente ou o admintoken do servidor.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-slate-900"
        >
          {submitting ? 'Validando token...' : 'Salvar e conectar'}
        </button>
      </div>
    </form>
  )
}
