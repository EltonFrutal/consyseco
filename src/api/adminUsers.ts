import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

interface CreateUserInput {
  name: string
  email: string
  phone: string
  countryCode: string
  password: string
}

interface UpdateUserInput {
  userId: string
  name?: string
  email?: string
  phone?: string | null
  countryCode?: string
  avatarUrl?: string | null
  password?: string
}

async function invoke(action: string, payload: object) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action, ...payload },
  })

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null)
      throw new Error((body as { error?: string } | null)?.error ?? error.message)
    }
    throw new Error(error.message)
  }

  return data
}

export function createUser(input: CreateUserInput): Promise<{ user: { id: string } }> {
  return invoke('create', input) as Promise<{ user: { id: string } }>
}

export function updateUser(input: UpdateUserInput) {
  return invoke('update', input)
}

export function setUserStatus(userId: string, status: 'active' | 'disabled') {
  return invoke('set-status', { userId, status })
}
