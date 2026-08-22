export type ProfileStatus = 'active' | 'disabled'
export type ProfileRole = 'admin'

export interface Profile {
  id: string
  name: string
  email: string
  phone: string | null
  /** DDI usado para montar o número internacional (ex.: 55). */
  country_code: string
  avatar_url: string | null
  role: ProfileRole
  status: ProfileStatus
  created_at: string
  updated_at: string
  updated_by: string | null
  /** Nome de quem fez a última alteração (embed do PostgREST). */
  updated_by_profile?: { name: string } | null
}
