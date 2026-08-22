import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useHasAdminUser() {
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.rpc('has_admin_user').then(({ data, error }) => {
      if (error) {
        console.error('Erro ao verificar usuário administrador:', error)
        setHasAdmin(false)
        return
      }
      setHasAdmin(Boolean(data))
    })
  }, [])

  return hasAdmin
}
