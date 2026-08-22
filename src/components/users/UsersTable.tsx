import type { Profile } from '../../types/profile'

interface UsersTableProps {
  users: Profile[]
  onEdit: (user: Profile) => void
  onToggleStatus: (user: Profile) => void
}

export function UsersTable({ users, onEdit, onToggleStatus }: UsersTableProps) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <th className="py-2 font-medium">Nome</th>
          <th className="py-2 font-medium">E-mail</th>
          <th className="py-2 font-medium">Status</th>
          <th className="py-2 font-medium">Criado em</th>
          <th className="py-2 font-medium text-right">Ações</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id} className="border-b border-slate-100 dark:border-slate-800">
            <td className="py-3 text-slate-900 dark:text-white">{user.name}</td>
            <td className="py-3 text-slate-600 dark:text-slate-300">{user.email}</td>
            <td className="py-3">
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  user.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}
              >
                {user.status === 'active' ? 'Ativo' : 'Desativado'}
              </span>
            </td>
            <td className="py-3 text-slate-600 dark:text-slate-300">
              {new Date(user.created_at).toLocaleDateString('pt-BR')}
            </td>
            <td className="py-3 text-right">
              <button type="button" onClick={() => onEdit(user)} className="mr-3 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                Editar
              </button>
              <button type="button" onClick={() => onToggleStatus(user)} className="text-sm font-medium text-red-600 hover:underline dark:text-red-400">
                {user.status === 'active' ? 'Desativar' : 'Reativar'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
