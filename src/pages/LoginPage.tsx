import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useHasAdminUser } from '../hooks/useHasAdminUser'
import { SetupForm } from '../components/auth/SetupForm'
import { LoginForm } from '../components/auth/LoginForm'

export function LoginPage() {
  const { user, loading: authLoading } = useAuth()
  const hasAdmin = useHasAdminUser()

  if (!authLoading && user) {
    return <Navigate to="/inicio" replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg dark:bg-slate-800">
        {/* a logo já traz o nome e a assinatura; o h1 fica só para leitor de tela */}
        <img
          src="/consys_nome.png"
          alt="ConSys Consultoria Empresarial"
          className="mx-auto mb-6 w-56 max-w-full"
        />
        <h1 className="sr-only">ConSys Consultoria Empresarial</h1>
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
