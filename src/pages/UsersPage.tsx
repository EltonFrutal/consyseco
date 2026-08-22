import { useEffect, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { UsersTable } from '../components/users/UsersTable'
import { UserFormModal } from '../components/users/UserFormModal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { AddButton } from '../components/ui/AddButton'
import { supabase } from '../lib/supabaseClient'
import { createUser, updateUser, setUserStatus } from '../api/adminUsers'
import { uploadAvatar, removeStoredAvatars } from '../api/avatars'
import type { UserFormValues } from '../components/users/UserFormModal'
import { useAuth } from '../contexts/AuthContext'
import type { Profile } from '../types/profile'

export function UsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [modalUser, setModalUser] = useState<Profile | null | undefined>(undefined)
  const [statusTarget, setStatusTarget] = useState<Profile | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function loadUsers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*, updated_by_profile:updated_by(name)')
      .order('created_at', { ascending: true })
    if (error) {
      setLoadError('Não foi possível carregar os usuários. Tente novamente.')
    } else {
      setLoadError(null)
    }
    setUsers((data as Profile[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function handleSubmit(values: UserFormValues) {
    if (modalUser) {
      let avatarUrl: string | null | undefined
      if (values.avatarFile) {
        avatarUrl = await uploadAvatar(modalUser.id, values.avatarFile)
      } else if (values.avatarRemoved) {
        await removeStoredAvatars(modalUser.id)
        avatarUrl = null
      }

      await updateUser({
        userId: modalUser.id,
        name: values.name,
        email: values.email,
        phone: values.phone.trim() || null,
        countryCode: values.countryCode,
        avatarUrl,
        password: values.password || undefined,
      })
    } else {
      const created = await createUser({
        name: values.name,
        email: values.email,
        phone: values.phone,
        countryCode: values.countryCode,
        password: values.password,
      })

      if (values.avatarFile && created?.user?.id) {
        const avatarUrl = await uploadAvatar(created.user.id, values.avatarFile)
        await updateUser({ userId: created.user.id, avatarUrl })
      }
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
<AddButton onClick={() => setModalUser(null)} label="Novo usuário" />
        </div>

        {loadError && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{loadError}</p>}

        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Carregando...</p>
        ) : (
          <UsersTable
            users={users}
            onEdit={setModalUser}
            onToggleStatus={(target) => {
              setStatusError(null)
              setStatusTarget(target)
            }}
            currentUserId={user?.id}
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
