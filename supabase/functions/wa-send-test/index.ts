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

/** Envia mensagem de teste pela instância do usuário. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const user = await getCaller(req)
  if (!user) return jsonResponse({ error: 'Não autenticado.' }, 401)

  let body: { id?: string; number?: string; text?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Corpo da requisição inválido.' }, 400)
  }

  if (!body.id) return jsonResponse({ error: 'Informe a instância.' }, 400)

  const number = (body.number ?? '').replace(/\D/g, '')
  const text = (body.text ?? '').trim()
  if (!number) return jsonResponse({ error: 'Informe o número de destino.' }, 400)
  if (number.length < 10 || number.length > 15) {
    return jsonResponse({ error: 'O número deve ter de 10 a 15 dígitos, no formato internacional.' }, 400)
  }
  if (!text) return jsonResponse({ error: 'Informe a mensagem.' }, 400)

  const row = await loadOwnedInstance(user.id, body.id)
  if (!row) return jsonResponse({ error: 'Instância não encontrada.' }, 404)

  const result = await uazapi(row.server_url as string, {
    method: 'POST',
    path: '/send/text',
    token: row.token as string,
    body: { number, text },
  })

  if (!result.ok) {
    return jsonResponse({ error: result.error }, result.status === 0 ? 502 : result.status)
  }

  const payload = result.data as Record<string, unknown>
  const response = (payload?.response ?? {}) as Record<string, unknown>

  return jsonResponse({
    id: typeof payload?.id === 'string' ? payload.id : null,
    messageid: typeof payload?.messageid === 'string' ? payload.messageid : null,
    status: typeof payload?.status === 'string' ? payload.status : null,
    chatid: typeof payload?.chatid === 'string' ? payload.chatid : null,
    response: typeof response?.message === 'string' ? response.message : null,
  })
})
