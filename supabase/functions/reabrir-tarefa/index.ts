// Reabrir uma tarefa finalizada é privilégio do responsável.
// Quem não é o responsável precisa digitar a senha dele — validada contra o
// Auth e nunca gravada, logada ou devolvida.
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
    .select('id, departamento_id, responsavel_id, finalizada_em')
    .eq('id', body.id)
    .maybeSingle()

  if (!tarefa) return jsonResponse({ error: 'Tarefa não encontrada.' }, 404)
  if (!tarefa.finalizada_em) return jsonResponse({ error: 'Esta tarefa não está finalizada.' }, 409)
  if (!tarefa.responsavel_id) {
    return jsonResponse({ error: 'A tarefa não tem responsável.' }, 400)
  }

  const { data: responsavel } = await admin
    .from('profiles')
    .select('email, name, status')
    .eq('id', tarefa.responsavel_id)
    .single()

  if (!responsavel) return jsonResponse({ error: 'Responsável não encontrado.' }, 404)

  if (callerData.user.id !== tarefa.responsavel_id) {
    if (!body.senha) {
      return jsonResponse(
        { error: `Só ${responsavel.name} pode reabrir. Informe a senha do responsável.`, senhaObrigatoria: true },
        401,
      )
    }

    if (responsavel.status !== 'active') {
      return jsonResponse({ error: 'O responsável está desativado e não pode reabrir tarefas.' }, 403)
    }

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

  // volta para a primeira etapa do departamento; o trigger zera a data de conclusão
  const { data: primeiraColuna } = await admin
    .from('colunas')
    .select('id, nome')
    .eq('departamento_id', tarefa.departamento_id)
    .order('ordem', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!primeiraColuna) {
    return jsonResponse({ error: 'O departamento desta tarefa não tem colunas.' }, 409)
  }

  const { error: updateError } = await admin
    .from('tarefas')
    .update({
      coluna_id: primeiraColuna.id,
      finalizada_em: null,
      finalizada_por: null,
      updated_at: new Date().toISOString(),
      updated_by: callerData.user.id,
    })
    .eq('id', tarefa.id)

  if (updateError) return jsonResponse({ error: updateError.message }, 500)

  return jsonResponse({ reaberta: true, coluna: primeiraColuna.nome })
})
