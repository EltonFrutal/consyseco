// Avisa no WhatsApp quando uma tarefa é atribuída ou muda de etapa.
//   - evento "nova":   quem recebe é o executor (mostra o responsável)
//   - evento "status": avisa o responsável; se a etapa de destino for a de
//                      conclusão do departamento, a mensagem é de tarefa concluída.
// O envio usa a mesma rota da integração: POST /send/text com o token da instância.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Emoji por token de ícone da etapa (o banco guarda o token, não o emoji). */
const EMOJI_ETAPA: Record<string, string> = {
  lista: '📋',
  play: '▶️',
  relogio: '⏳',
  pausa: '⏸️',
  check: '✅',
  alerta: '⚠️',
  foguete: '🚀',
  arquivo: '🗂️',
}

/** Prioridade vai como bolinha, na mesma cor usada no cartão do kanban. */
const PRIORIDADE_EMOJI: Record<string, string> = {
  baixa: '⚪',
  media: '🟡',
  alta: '🔴',
}

const PRIORIDADE_ROTULO: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
}

/** Entregou no prazo ou atrasou? Compara só as datas, sem horas. */
function avaliarPrazo(prazo: string | null): string {
  if (!prazo) return ''
  const limite = new Date(`${prazo}T00:00:00`)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const dias = Math.round((hoje.getTime() - limite.getTime()) / 86400000)
  if (dias <= 0) return '⏱️ Em tempo'
  return `⚠️ Atraso de ${dias} ${dias === 1 ? 'dia' : 'dias'}`
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function numeroInternacional(perfil: { country_code?: string | null; phone?: string | null } | null) {
  const telefone = (perfil?.phone ?? '').replace(/\D/g, '')
  if (!telefone) return ''
  const ddi = (perfil?.country_code ?? '55').replace(/\D/g, '') || '55'
  return `${ddi}${telefone}`
}

function formatarData(prazo: string | null) {
  if (!prazo) return null
  const [ano, mes, dia] = prazo.split('-')
  return `${dia}/${mes}/${ano}`
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

  let body: { id?: string; evento?: 'nova' | 'status' }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Corpo da requisição inválido.' }, 400)
  }

  const evento = body.evento ?? 'status'
  if (!body.id) return jsonResponse({ error: 'Informe a tarefa.' }, 400)

  const { data: tarefa } = await admin
    .from('tarefas')
    .select('id, numero, titulo, prazo, prioridade, departamento_id, coluna_id, classificacao_id, solicitante_id, responsavel_id, executor_id')
    .eq('id', body.id)
    .maybeSingle()

  if (!tarefa) return jsonResponse({ error: 'Tarefa não encontrada.' }, 404)

  // tarefa nova avisa quem vai executar; alteração e conclusão avisam quem responde
  const paraOResponsavel = evento !== 'nova'
  const destinatarioId = paraOResponsavel ? tarefa.responsavel_id : tarefa.executor_id

  if (!destinatarioId) {
    return jsonResponse({ enviado: false, motivo: 'A tarefa não tem essa pessoa definida.' })
  }
  // ninguém precisa ser avisado da própria ação
  if (destinatarioId === callerData.user.id) {
    return jsonResponse({ enviado: false, motivo: 'Quem agiu é o próprio destinatário.' })
  }

  const ids = [destinatarioId, tarefa.solicitante_id, tarefa.responsavel_id, tarefa.executor_id].filter(
    Boolean,
  ) as string[]

  const { data: perfis } = await admin
    .from('profiles')
    .select('id, name, phone, country_code, status')
    .in('id', ids)

  const porId = new Map((perfis ?? []).map((p) => [p.id, p]))
  const destinatario = porId.get(destinatarioId)

  if (!destinatario || destinatario.status !== 'active') {
    return jsonResponse({ enviado: false, motivo: 'Destinatário inativo.' })
  }

  const numero = numeroInternacional(destinatario)
  if (!numero) {
    return jsonResponse({ enviado: false, motivo: `${destinatario.name} não tem telefone cadastrado.` })
  }

  const [{ data: coluna }, { data: departamento }, { data: classificacao }] = await Promise.all([
    admin.from('colunas').select('nome, icone, is_conclusao').eq('id', tarefa.coluna_id).maybeSingle(),
    admin.from('departamentos').select('nome').eq('id', tarefa.departamento_id).maybeSingle(),
    tarefa.classificacao_id
      ? admin.from('classificacoes').select('nome').eq('id', tarefa.classificacao_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  // instância: a de quem agiu; se não houver, qualquer uma conectada
  const { data: instancias } = await admin
    .from('whatsapp_instances')
    .select('owner_id, server_url, token, status')
    .eq('status', 'connected')

  const instancia =
    (instancias ?? []).find((i) => i.owner_id === callerData.user.id) ?? (instancias ?? [])[0]

  if (!instancia) {
    return jsonResponse({ enviado: false, motivo: 'Nenhuma instância do WhatsApp conectada.' })
  }

  const executor = porId.get(tarefa.executor_id ?? '')
  const solicitante = porId.get(tarefa.solicitante_id ?? '')
  const quemAgiu = porId.get(callerData.user.id)
  const prazo = formatarData(tarefa.prazo)
  const prioridade = `${PRIORIDADE_EMOJI[tarefa.prioridade] ?? '⚪'} Prioridade: ${
    PRIORIDADE_ROTULO[tarefa.prioridade] ?? tarefa.prioridade
  }`

  // concluída é um caso próprio de mudança de etapa: a coluna de destino é a
  // marcada como conclusão do departamento
  const concluida = evento === 'status' && Boolean(coluna?.is_conclusao)

  const linhas: string[] = []

  if (evento === 'nova') {
    linhas.push(`➕ *Tarefa incluída #${tarefa.numero}*`, '')
    linhas.push(`Para: ${executor?.name ?? '—'}`)
    linhas.push(`Título: ${tarefa.titulo}`)
    linhas.push(prioridade)
    linhas.push(`Solicitante: ${solicitante?.name ?? '—'}`)
    if (prazo) linhas.push(`📅 Prazo: ${prazo}`)
  } else if (concluida) {
    linhas.push(`✅ *Tarefa concluída #${tarefa.numero}*`, '')
    linhas.push(`Por: ${quemAgiu?.name ?? '—'}`)
    linhas.push(`Título: ${tarefa.titulo}`)
    linhas.push(prioridade)
    if (prazo) {
      linhas.push(`📅 Prazo: ${prazo}`)
      linhas.push(avaliarPrazo(tarefa.prazo))
    }
  } else {
    linhas.push(`🔄 *Tarefa alterada #${tarefa.numero}*`, '')
    linhas.push(`${EMOJI_ETAPA[coluna?.icone ?? 'lista'] ?? '📌'} Status: ${coluna?.nome ?? '—'}`)
    linhas.push(`Por: ${quemAgiu?.name ?? '—'}`)
    linhas.push(`Título: ${tarefa.titulo}`)
    linhas.push(prioridade)
    if (prazo) linhas.push(`📅 Prazo: ${prazo}`)
  }

  if (classificacao?.nome) linhas.push(`🏷️ Classificação: ${classificacao.nome}`)
  linhas.push(`🗂️ Departamento: ${departamento?.nome ?? '—'}`)

  const texto = linhas.join('\n')

  let resposta: Response
  try {
    resposta = await fetch(`${instancia.server_url}/send/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token: instancia.token },
      body: JSON.stringify({ number: numero, text: texto }),
    })
  } catch {
    return jsonResponse({ enviado: false, motivo: 'Não foi possível alcançar o servidor da uazapi.' })
  }

  const bruto = await resposta.text()
  let dados: unknown = null
  try {
    dados = bruto ? JSON.parse(bruto) : null
  } catch {
    dados = bruto
  }

  if (!resposta.ok) {
    const d = (dados ?? {}) as Record<string, unknown>
    const motivo =
      (typeof d.message_ptbr === 'string' && d.message_ptbr) ||
      (typeof d.error === 'string' && d.error) ||
      `A uazapi respondeu com HTTP ${resposta.status}.`
    return jsonResponse({ enviado: false, motivo })
  }

  const enviada = (dados ?? {}) as Record<string, unknown>
  return jsonResponse({
    enviado: true,
    para: destinatario.name,
    messageid: typeof enviada.messageid === 'string' ? enviada.messageid : null,
  })
})
