import { useEffect, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { UsersTable } from '../components/users/UsersTable'
import { UserFormModal } from '../components/users/UserFormModal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { supabase } from '../lib/supabaseClient'
import { createUser, updateUser, setUserStatus } from '../api/adminUsers'
import type { Profile } from '../types/profile'

export function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [modalUser, setModalUser] = useState<Profile | null | undefined>(undefined)
  const [statusTarget, setStatusTarget] = useState<Profile | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: true })
    setUsers((data as Profile[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function handleSubmit(values: { name: string; email: string; password: string }) {
    if (modalUser) {
      await updateUser({
        userId: modalUser.id,
        name: values.name,
        email: values.email,
        password: values.password || undefined,
      })
    } else {
      await createUser(values)
    }
    setModalUser(undefined)
    await loadUsers()
  }

  async function handleConfirmStatus() {
    if (!statusTarget) return
    setStatusError(null)
    const nextStatus = statusTarget.status === 'active' ? 'disabled' : 'active'
    try {
      await setUserStatus(statusTarget.id, nextStatus)
      setStatusTarget(null)
      await loadUsers()
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Ocorreu um erro. Tente novamente.')
    }
  }

  return (
    <AppLayout>
      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Usuários</h2>
          <button
            type="button"
            onClick={() => setModalUser(null)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Novo usuário
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Carregando...</p>
        ) : (
          <UsersTable
            users={users}
            onEdit={setModalUser}
            onToggleStatus={(user) => {
              setStatusError(null)
              setStatusTarget(user)
            }}
          />
        )}
      </div>

      <UserFormModal
        key={modalUser === undefined ? 'closed' : (modalUser?.id ?? 'new')}
        open={modalUser !== undefined}
        initialData={modalUser ?? null}
        onClose={() => setModalUser(undefined)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={statusTarget !== null}
        title={statusTarget?.status === 'active' ? 'Desativar usuário' : 'Reativar usuário'}
        description={
          statusTarget?.status === 'active'
            ? `Tem certeza que deseja desativar ${statusTarget?.name}? A pessoa não conseguirá mais entrar no sistema.`
            : `Tem certeza que deseja reativar ${statusTarget?.name}?`
        }
        confirmLabel={statusTarget?.status === 'active' ? 'Desativar' : 'Reativar'}
        error={statusError}
        onConfirm={handleConfirmStatus}
        onCancel={() => {
          setStatusTarget(null)
          setStatusError(null)
        }}
      />
    </AppLayout>
  )
}
