import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { translateAuthError } from '../../lib/authErrors'

// o ícone ocupa a esquerda do campo; a senha reserva a direita para o olho
const inputClass =
  'block min-h-11 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'

const iconeProps = {
  viewBox: '0 0 24 24',
  className:
    'pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    setSubmitting(false)
    if (signInError) {
      setError(translateAuthError(signInError.message))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* sem rótulo visível: o ícone e o placeholder dizem o campo, e o
          aria-label mantém o nome para quem usa leitor de tela */}
      <div className="relative">
        <svg {...iconeProps}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          aria-label="E-mail"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="relative">
        <svg {...iconeProps}>
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
        <input
          id="password"
          type={mostrarSenha ? 'text' : 'password'}
          required
          autoComplete="current-password"
          aria-label="Senha"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`${inputClass} pr-11`}
        />
        <button
          type="button"
          onClick={() => setMostrarSenha((v) => !v)}
          aria-label={mostrarSenha ? 'Esconder senha' : 'Mostrar senha'}
          aria-pressed={mostrarSenha}
          title={mostrarSenha ? 'Esconder senha' : 'Mostrar senha'}
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-500 dark:hover:text-slate-300"
        >
          {mostrarSenha ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 3l18 18" />
              <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
              <path d="M9.4 5.2A9.7 9.7 0 0 1 12 4.9c5 0 9 4.1 9 7.1a9 9 0 0 1-2.2 3.7M6.2 6.7A11.4 11.4 0 0 0 3 12c0 3 4 7.1 9 7.1 1.2 0 2.3-.2 3.3-.6" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12s3.6-7.1 9-7.1S21 12 21 12s-3.6 7.1-9 7.1S3 12 3 12z" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
          )}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="min-h-11 w-full rounded-lg bg-indigo-600 px-4 font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-slate-800"
      >
        {submitting ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}
