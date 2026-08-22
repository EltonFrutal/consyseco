export type ProfileStatus = 'active' | 'disabled'
export type ProfileRole = 'admin'

export interface Profile {
  id: string
  name: string
  email: string
  role: ProfileRole
  status: ProfileStatus
  created_at: string
  updated_at: string
}
