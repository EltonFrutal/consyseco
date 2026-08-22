import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useHasAdminUser } from '../hooks/useHasAdminUser'
import { SetupForm } from '../components/auth/SetupForm'
import { LoginForm } from '../components/auth/LoginForm'

export function LoginPage() {
  const { user, loading: authLoading } = useAuth()
  const hasAdmin = useHasAdminUser()

  if (!authLoading && user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg dark:bg-slate-800">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900 dark:text-white">Tarefas</h1>
        {hasAdmin === null && <p className="text-sm text-slate-500 dark:text-slate-400">Carregando...</p>}
        {hasAdmin === false && (
          <>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
              Crie a primeira conta de administrador para começar.
            </p>
            <SetupForm />
          </>
        )}
        {hasAdmin === true && (
          <>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Entre com sua conta.</p>
            <LoginForm />
          </>
        )}
      </div>
    </div>
  )
}
