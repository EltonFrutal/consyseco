import type { Profile } from '../../types/profile'

interface UsersTableProps {
  users: Profile[]
  onEdit: (user: Profile) => void
  onToggleStatus: (user: Profile) => void
  currentUserId: string | undefined
}

const actionButtonClass = 'flex h-8 w-8 items-center justify-center rounded-lg transition'

/** Chave liga/desliga do status — o mesmo desenho nas duas visões. */
function Status({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={ativo ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'}
      title={ativo ? 'Ativo' : 'Desativado'}
      aria-label={ativo ? 'Ativo' : 'Desativado'}
      role="img"
    >
      <svg viewBox="0 0 44 24" className="h-6 w-11" aria-hidden="true">
        <rect x="1" y="1" width="42" height="22" rx="11" fill="currentColor" />
        <circle cx={ativo ? 32 : 12} cy="12" r="8" fill="white" />
      </svg>
    </span>
  )
}

function Avatar({ user }: { user: Profile }) {
  if (user.avatar_url) {
    return <img src={user.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
      {user.name.trim().charAt(0).toUpperCase()}
    </span>
  )
}

export function UsersTable({ users, onEdit, onToggleStatus, currentUserId }: UsersTableProps) {
  return (
    <>
      {/* No celular a tabela de sete colunas não cabe: vira lista de cartões,
          sem as colunas de auditoria, que são conferência de mesa. */}
      <ul className="space-y-2 md:hidden">
        {users.map((user) => (
          <li key={user.id}>
            <div
              onClick={() => onEdit(user)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onEdit(user)
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Editar ${user.name}`}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700"
            >
              <Avatar user={user} />

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                  {user.name}
                </span>
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                  {user.email}
                </span>
              </span>

              {user.id !== currentUserId ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleStatus(user)
                  }}
                  aria-label={`${user.status === 'active' ? 'Desativar' : 'Reativar'} ${user.name}`}
                  title={user.status === 'active' ? 'Desativar' : 'Reativar'}
                  className="shrink-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <Status ativo={user.status === 'active'} />
                </button>
              ) : (
                <Status ativo={user.status === 'active'} />
              )}
            </div>
          </li>
        ))}
      </ul>

    <table className="hidden w-full text-left text-sm md:table">
      <thead>
        <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <th className="py-2 font-medium">Nome</th>
          <th className="py-2 font-medium">E-mail</th>
          <th className="py-2 font-medium">Status</th>
          <th className="py-2 font-medium">Criado em</th>
          <th className="py-2 font-medium">Alterado em</th>
          <th className="py-2 font-medium">Alterado por</th>
          <th className="py-2 font-medium text-right">Ações</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr
            key={user.id}
            onClick={() => onEdit(user)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onEdit(user)
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={`Editar ${user.name}`}
            className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none dark:border-slate-800 dark:hover:bg-slate-700/40 dark:focus:bg-slate-700/40"
          >
            <td className="py-3 text-slate-900 dark:text-white">
              <div className="flex items-center gap-3">
                <Avatar user={user} />
                {user.name}
              </div>
            </td>
            <td className="py-3 text-slate-600 dark:text-slate-300">{user.email}</td>
            <td className="py-3">
              <Status ativo={user.status === 'active'} />
            </td>
            <td className="py-3 text-slate-600 dark:text-slate-300">
              {new Date(user.created_at).toLocaleDateString('pt-BR')}
            </td>
            <td className="py-3 text-slate-600 dark:text-slate-300">
              {new Date(user.updated_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </td>
            <td className="py-3 text-slate-600 dark:text-slate-300">
              {user.updated_by_profile?.name ?? '—'}
            </td>
            <td className="py-3 text-right">
              <div className="flex items-center justify-end gap-2">
                {user.id !== currentUserId && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleStatus(user)
                    }}
                    className={`${actionButtonClass} ${
                      user.status === 'active'
                        ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20'
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20'
                    }`}
                    aria-label={`${user.status === 'active' ? 'Desativar' : 'Reativar'} ${user.name}`}
                    title={user.status === 'active' ? 'Desativar' : 'Reativar'}
                  >
                    {user.status === 'active' ? (
                      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M5.64 5.64 18.36 18.36" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" />
                        <path d="m8.5 12.2 2.4 2.4 4.6-4.9" />
                      </svg>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(user)
                  }}
                  className={`${actionButtonClass} bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20`}
                  aria-label={`Editar ${user.name}`}
                  title="Editar"
                >
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18.4 2.6a2.25 2.25 0 0 1 3.18 3.18l-11.7 11.7a2 2 0 0 1-.84.5l-3.53 1.05a.5.5 0 0 1-.62-.62l1.05-3.53a2 2 0 0 1 .5-.84z" />
                    <path d="M16.5 4.5 19.5 7.5" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </>
  )
}
