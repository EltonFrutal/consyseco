// Finalizar é privilégio do responsável pela tarefa.
// Quem não é o responsável precisa digitar a senha dele — a senha é validada
// contra o Auth e nunca é gravada, logada ou devolvida.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

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

  let body: { id?: string; senha?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Corpo da requisição inválido.' }, 400)
  }
  if (!body.id) return jsonResponse({ error: 'Informe a tarefa.' }, 400)

  const { data: tarefa } = await admin
    .from('tarefas')
    .select('id, coluna_id, responsavel_id, finalizada_em')
    .eq('id', body.id)
    .maybeSingle()

  if (!tarefa) return jsonResponse({ error: 'Tarefa não encontrada.' }, 404)
  if (tarefa.finalizada_em) return jsonResponse({ error: 'Esta tarefa já foi finalizada.' }, 409)
  if (!tarefa.responsavel_id) {
    return jsonResponse({ error: 'A tarefa não tem responsável. Defina um antes de finalizar.' }, 400)
  }

  const { data: coluna } = await admin
    .from('colunas')
    .select('nome, is_conclusao')
    .eq('id', tarefa.coluna_id)
    .single()

  if (!coluna?.is_conclusao) {
    return jsonResponse(
      { error: 'Só é possível finalizar uma tarefa que está na etapa de conclusão.' },
      400,
    )
  }

  const { data: responsavel } = await admin
    .from('profiles')
    .select('email, name, status')
    .eq('id', tarefa.responsavel_id)
    .single()

  if (!responsavel) return jsonResponse({ error: 'Responsável não encontrado.' }, 404)

  // Quem não é o responsável precisa provar que tem a senha dele.
  if (callerData.user.id !== tarefa.responsavel_id) {
    if (!body.senha) {
      return jsonResponse(
        { error: `Só ${responsavel.name} pode finalizar. Informe a senha do responsável.`, senhaObrigatoria: true },
        401,
      )
    }

    if (responsavel.status !== 'active') {
      return jsonResponse({ error: 'O responsável está desativado e não pode finalizar tarefas.' }, 403)
    }

    // cliente descartável só para conferir a credencial; não toca na sessão de quem chamou
    const verificador = createClient(SUPABASE_URL, ANON_KEY)
    const { error: senhaError } = await verificador.auth.signInWithPassword({
      email: responsavel.email,
      password: body.senha,
    })

    if (senhaError) {
      return jsonResponse({ error: 'Senha do responsável incorreta.', senhaObrigatoria: true }, 401)
    }

    await verificador.auth.signOut()
  }

  const agora = new Date().toISOString()
  const { error: updateError } = await admin
    .from('tarefas')
    .update({
      finalizada_em: agora,
      finalizada_por: tarefa.responsavel_id,
      updated_at: agora,
      updated_by: callerData.user.id,
    })
    .eq('id', tarefa.id)

  if (updateError) return jsonResponse({ error: updateError.message }, 500)

  return jsonResponse({ finalizada_em: agora, finalizada_por: tarefa.responsavel_id })
})
