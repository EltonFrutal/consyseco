// Edição de tarefa com regra de dono:
//   - etapa, prioridade e descrição: qualquer admin ativo altera;
//   - título, solicitante, responsável, executor e prazo: só o responsável,
//     e quem não é precisa da senha dele (validada no Auth, nunca gravada).
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Campos que só o responsável muda. Departamento entra aqui porque mover a
 *  tarefa de quadro troca também a etapa dela. */
const CAMPOS_RESTRITOS = [
  'titulo',
  'solicitante_id',
  'responsavel_id',
  'executor_id',
  'prazo',
  'departamento_id',
] as const

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Não autenticado.' }, 401)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: callerData, error: callerError } = await admin.auth.getUser(
    authHeader.replace('Bearer ', ''),
  )
  if (callerError || !callerData.user) return jsonResponse({ error: 'Não autenticado.' }, 401)

  const { data: callerProfile } = await admin
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

  const id = body.id as string | undefined
  const senha = body.senha as string | undefined
  if (!id) return jsonResponse({ error: 'Informe a tarefa.' }, 400)

  const { data: atual } = await admin
    .from('tarefas')
    .select('id, titulo, descricao, solicitante_id, responsavel_id, executor_id, prazo, prioridade, coluna_id, departamento_id, classificacao_id, finalizada_em')
    .eq('id', id)
    .maybeSingle()

  if (!atual) return jsonResponse({ error: 'Tarefa não encontrada.' }, 404)
  if (atual.finalizada_em) {
    return jsonResponse({ error: 'Tarefa finalizada não pode ser editada. Reabra antes.' }, 409)
  }

  const registro = atual as Record<string, unknown>
  const mudouRestrito = CAMPOS_RESTRITOS.some(
    (campo) => body[campo] !== undefined && (body[campo] ?? null) !== (registro[campo] ?? null),
  )

  const souOResponsavel = callerData.user.id === atual.responsavel_id

  if (mudouRestrito && !souOResponsavel) {
    const { data: responsavel } = await admin
      .from('profiles')
      .select('email, name, status')
      .eq('id', atual.responsavel_id ?? '')
      .maybeSingle()

    if (!responsavel) {
      return jsonResponse({ error: 'A tarefa não tem responsável definido.' }, 400)
    }

    if (!senha) {
      return jsonResponse(
        {
          error: `Estes campos só ${responsavel.name} altera. Informe a senha do responsável.`,
          senhaObrigatoria: true,
        },
        401,
      )
    }

    if (responsavel.status !== 'active') {
      return jsonResponse({ error: 'O responsável está desativado.' }, 403)
    }

    const verificador = createClient(SUPABASE_URL, ANON_KEY)
    const { error: senhaError } = await verificador.auth.signInWithPassword({
      email: responsavel.email,
      password: senha,
    })

    if (senhaError) {
      return jsonResponse({ error: 'Senha do responsável incorreta.', senhaObrigatoria: true }, 401)
    }

    await verificador.auth.signOut()
  }

  const alteracoes: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: callerData.user.id,
  }

  for (const campo of ['coluna_id', 'descricao', 'prioridade', 'classificacao_id', ...CAMPOS_RESTRITOS]) {
    if (body[campo] !== undefined) alteracoes[campo] = body[campo]
  }

  const { data: salva, error: updateError } = await admin
    .from('tarefas')
    .update(alteracoes)
    .eq('id', id)
    .select(
      'id, numero, departamento_id, coluna_id, classificacao_id, titulo, descricao, solicitante_id, responsavel_id, executor_id, prazo, prioridade, ordem, data_conclusao, finalizada_em, finalizada_por, created_at, updated_at, updated_by',
    )
    .single()

  if (updateError) return jsonResponse({ error: updateError.message }, 500)

  return jsonResponse({ tarefa: salva })
})
