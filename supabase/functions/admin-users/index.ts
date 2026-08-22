import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function translateError(message: string): string {
  if (message.includes('already been registered')) {
    return 'Este e-mail já está cadastrado.'
  }
  const map: Record<string, string> = {
    'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
    'Unable to validate email address: invalid format': 'Formato de e-mail inválido.',
    'User not found': 'Usuário não encontrado.',
  }
  return map[message] ?? message
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Não autenticado.' }, 401)
  }

  const token = authHeader.replace('Bearer ', '')
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: callerData, error: callerError } = await adminClient.auth.getUser(token)
  if (callerError || !callerData.user) {
    return jsonResponse({ error: 'Não autenticado.' }, 401)
  }

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role, status')
    .eq('id', callerData.user.id)
    .single()

  if (!callerProfile || callerProfile.role !== 'admin' || callerProfile.status !== 'active') {
    return jsonResponse({ error: 'Acesso negado.' }, 403)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Corpo da requisição inválido.' }, 400)
  }

  const action = body.action as string

  if (action === 'create') {
    const { name, email, password } = body as { name: string; email: string; password: string }
    if (!name || !email || !password) {
      return jsonResponse({ error: 'Nome, e-mail e senha são obrigatórios.' }, 400)
    }

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    })

    if (error) {
      return jsonResponse({ error: translateError(error.message) }, 409)
    }

    return jsonResponse({ user: data.user })
  }

  if (action === 'update') {
    const { userId, name, email, password } = body as {
      userId: string
      name?: string
      email?: string
      password?: string
    }
    if (!userId) {
      return jsonResponse({ error: 'userId é obrigatório.' }, 400)
    }

    const authAttrs: Record<string, unknown> = {}
    if (email) authAttrs.email = email
    if (password) authAttrs.password = password
    if (name) authAttrs.user_metadata = { name }

    if (Object.keys(authAttrs).length > 0) {
      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, authAttrs)
      if (authUpdateError) {
        return jsonResponse({ error: translateError(authUpdateError.message) }, 400)
      }
    }

    const profileUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name) profileUpdates.name = name
    if (email) profileUpdates.email = email
    const { error: profileUpdateError } = await adminClient.from('profiles').update(profileUpdates).eq('id', userId)
    if (profileUpdateError) {
      return jsonResponse({ error: profileUpdateError.message }, 500)
    }

    return jsonResponse({ success: true })
  }

  if (action === 'set-status') {
    const { userId, status } = body as { userId: string; status: 'active' | 'disabled' }
    if (!userId || (status !== 'active' && status !== 'disabled')) {
      return jsonResponse({ error: 'Parâmetros inválidos.' }, 400)
    }

    if (userId === callerData.user.id) {
      return jsonResponse({ error: 'Você não pode desativar sua própria conta.' }, 400)
    }

    const { error: banError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: status === 'disabled' ? '876000h' : 'none',
    })
    if (banError) {
      return jsonResponse({ error: translateError(banError.message) }, 400)
    }

    const { error: profileStatusError } = await adminClient
      .from('profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', userId)
    if (profileStatusError) {
      return jsonResponse({ error: profileStatusError.message }, 500)
    }

    return jsonResponse({ success: true })
  }

  return jsonResponse({ error: 'Ação desconhecida.' }, 400)
})
