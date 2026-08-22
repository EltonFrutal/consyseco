import { supabase } from '../lib/supabaseClient'

const BUCKET = 'avatars'
const MAX_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export function validateAvatar(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'A foto deve ser JPG, PNG, WEBP ou GIF.'
  }
  if (file.size > MAX_SIZE) {
    return 'A foto deve ter no máximo 2 MB.'
  }
  return null
}

/** Envia a foto para o bucket e devolve a URL pública. Remove os arquivos antigos do usuário. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const validationError = validateAvatar(file)
  if (validationError) throw new Error(validationError)

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/${Date.now()}.${extension}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true,
  })
  if (error) throw new Error('Não foi possível enviar a foto. Tente novamente.')

  await removeStoredAvatars(userId, path)

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/** Apaga as fotos guardadas do usuário, exceto a informada em keepPath. */
export async function removeStoredAvatars(userId: string, keepPath?: string) {
  const { data: existing } = await supabase.storage.from(BUCKET).list(userId)
  const stale = (existing ?? [])
    .map((item) => `${userId}/${item.name}`)
    .filter((item) => item !== keepPath)
  if (stale.length > 0) {
    await supabase.storage.from(BUCKET).remove(stale)
  }
}
