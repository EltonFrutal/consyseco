// ATENÇÃO: nenhum token da uazapi pode aparecer em log, resposta ou mensagem de erro.
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

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
}

/** Valida a sessão do usuário que chamou a função. */
async function getCaller(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null
  const client = adminClient()
  const { data, error } = await client.auth.getUser(authHeader.replace('Bearer ', ''))
  if (error || !data.user) return null
  return data.user
}

/** Normaliza e exige https na URL do servidor uazapi. */
function normalizeServerUrl(raw: string): string {
  const value = (raw ?? '').trim().replace(/\/+$/, '')
  const url = new URL(value)
  if (url.protocol !== 'https:') throw new Error('A URL do servidor precisa usar https.')
  return `${url.protocol}//${url.host}`
}

/** Extrai a mensagem de erro real da uazapi, preferindo o texto em português. */
function uazapiError(data: unknown, status: number): string {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    for (const key of ['message_ptbr', 'error', 'message', 'provider_message', 'response']) {
      const value = d[key]
      if (typeof value === 'string' && value.trim()) return value.trim()
    }
  }
  if (typeof data === 'string' && data.trim()) return data.trim()
  return `A uazapi respondeu com HTTP ${status} sem detalhar o erro.`
}

interface UazapiCall {
  method: 'GET' | 'POST' | 'DELETE'
  path: string
  token?: string
  adminToken?: string
  body?: unknown
}

/** Chama a uazapi e devolve o corpo cru + a mensagem de erro real quando falha. */
async function uazapi(serverUrl: string, call: UazapiCall) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (call.token) headers.token = call.token
  if (call.adminToken) headers.admintoken = call.adminToken

  let res: Response
  try {
    res = await fetch(`${serverUrl}${call.path}`, {
      method: call.method,
      headers,
      body: call.body === undefined ? undefined : JSON.stringify(call.body),
    })
  } catch {
    return {
      ok: false,
      status: 0,
      data: null as unknown,
      error: `Não foi possível alcançar ${serverUrl}. Verifique a URL do servidor.`,
    }
  }

  const raw = await res.text()
  let data: unknown = null
  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = raw
  }

  return {
    ok: res.ok,
    status: res.status,
    data,
    error: res.ok ? '' : uazapiError(data, res.status),
  }
}

const STATUSES = ['disconnected', 'connecting', 'connected', 'hibernated'] as const
type InstanceStatus = (typeof STATUSES)[number]

/** Só aceita os quatro status documentados pela uazapi. */
function normalizeStatus(value: unknown): InstanceStatus | null {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value)
    ? (value as InstanceStatus)
    : null
}

/** Carrega a instância conferindo que ela pertence a quem chamou. */
async function loadOwnedInstance(userId: string, instanceId: string) {
  const { data } = await adminClient()
    .from('whatsapp_instances')
    .select('*')
    .eq('id', instanceId)
    .eq('owner_id', userId)
    .maybeSingle()
  return data as Record<string, string | null> | null
}

/** Aceita tanto o token de uma instância existente quanto o admintoken do servidor. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const user = await getCaller(req)
  if (!user) return jsonResponse({ error: 'Não autenticado.' }, 401)

  let body: { nome?: string; serverUrl?: string; token?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Corpo da requisição inválido.' }, 400)
  }

  const nome = (body.nome ?? '').trim()
  const rawToken = (body.token ?? '').trim()

  if (!nome) return jsonResponse({ error: 'Informe o nome da instância.' }, 400)
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(nome)) {
    return jsonResponse({ error: 'O nome deve ser minúsculo, sem espaço e sem acento.' }, 400)
  }
  if (!rawToken) return jsonResponse({ error: 'Informe o token.' }, 400)

  let serverUrl: string
  try {
    serverUrl = normalizeServerUrl(body.serverUrl ?? '')
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'URL do servidor inválida.' }, 400)
  }

  // 1ª tentativa: o token é de uma instância que já existe.
  const asInstance = await uazapi(serverUrl, { method: 'GET', path: '/instance/status', token: rawToken })

  let instanceToken = ''
  let adminToken: string | null = null
  let remoteInstance: Record<string, unknown> = {}

  if (asInstance.ok) {
    instanceToken = rawToken
    remoteInstance = ((asInstance.data as Record<string, unknown>)?.instance ?? {}) as Record<string, unknown>
  } else if (asInstance.status === 401 || asInstance.status === 403) {
    // 2ª tentativa: o token é o admintoken do servidor — cria a instância lá.
    const asAdmin = await uazapi(serverUrl, {
      method: 'POST',
      path: '/instance/create',
      adminToken: rawToken,
      body: { name: nome },
    })

    if (!asAdmin.ok) {
      const recusado = asAdmin.status === 401 || asAdmin.status === 403
      return jsonResponse(
        {
          error: recusado
            ? 'Token recusado pela uazapi como token de instância e como admintoken. Resposta do servidor: ' + asAdmin.error
            : asAdmin.error,
        },
        400,
      )
    }

    const created = asAdmin.data as Record<string, unknown>
    instanceToken = typeof created?.token === 'string' ? created.token : ''
    remoteInstance = (created?.instance ?? {}) as Record<string, unknown>
    if (!instanceToken && typeof remoteInstance?.token === 'string') instanceToken = remoteInstance.token as string
    adminToken = rawToken

    if (!instanceToken) {
      return jsonResponse({ error: 'A uazapi criou a instância mas não devolveu o token dela.' }, 502)
    }
  } else {
    return jsonResponse({ error: asInstance.error }, asInstance.status === 0 ? 502 : 400)
  }

  const { data: inserted, error: insertError } = await adminClient()
    .from('whatsapp_instances')
    .insert({
      owner_id: user.id,
      nome,
      server_url: serverUrl,
      token: instanceToken,
      admin_token: adminToken,
      instance_id: typeof remoteInstance?.id === 'string' ? remoteInstance.id : null,
      status: normalizeStatus(remoteInstance?.status) ?? 'disconnected',
    })
    .select('id, nome, server_url, instance_id, status, last_connected_at, created_at, token_masked, admin_token_masked')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return jsonResponse({ error: 'Você já tem uma instância chamada "' + nome + '".' }, 409)
    }
    return jsonResponse({ error: insertError.message }, 500)
  }

  return jsonResponse({ instance: inserted })
})
