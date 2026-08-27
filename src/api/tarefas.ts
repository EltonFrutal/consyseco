import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

export type Prioridade = 'baixa' | 'media' | 'alta'

export interface Departamento {
  id: string
  nome: string
  descricao: string | null
  ordem: number
  ativo: boolean
}

export interface Coluna {
  id: string
  departamento_id: string
  nome: string
  ordem: number
  cor: string
  icone: string
  is_conclusao: boolean
}

export interface Classificacao {
  id: string
  nome: string
  ordem: number
  ativo: boolean
}

export interface Anexo {
  id: string
  tarefa_id: string
  caminho: string
  nome: string
  tipo: string | null
  tamanho: number | null
  created_at: string
}

export interface Tarefa {
  id: string
  numero: number
  departamento_id: string
  coluna_id: string
  classificacao_id: string | null
  titulo: string
  descricao: string | null
  solicitante_id: string | null
  responsavel_id: string | null
  executor_id: string | null
  prazo: string | null
  prioridade: Prioridade
  ordem: number
  data_conclusao: string | null
  finalizada_em: string | null
  finalizada_por: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}

export interface TarefaInput {
  departamento_id: string
  coluna_id: string
  classificacao_id: string | null
  titulo: string
  descricao: string | null
  solicitante_id: string | null
  responsavel_id: string | null
  executor_id: string | null
  prazo: string | null
  prioridade: Prioridade
}

const TAREFA_COLUNAS =
  'id, numero, departamento_id, coluna_id, classificacao_id, titulo, descricao, solicitante_id, responsavel_id, executor_id, prazo, prioridade, ordem, data_conclusao, finalizada_em, finalizada_por, created_at, updated_at, updated_by'

function assert<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message)
  return data as T
}

export async function listarDepartamentos(): Promise<Departamento[]> {
  const { data, error } = await supabase
    .from('departamentos')
    .select('id, nome, descricao, ordem, ativo')
    .eq('ativo', true)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })
  return assert(data as Departamento[] | null, error) ?? []
}

export async function criarDepartamento(nome: string, descricao: string | null): Promise<Departamento> {
  const { data, error } = await supabase
    .from('departamentos')
    .insert({ nome, descricao })
    .select('id, nome, descricao, ordem, ativo')
    .single()
  return assert(data as Departamento | null, error)
}

export async function renomearDepartamento(id: string, nome: string): Promise<void> {
  const { error } = await supabase.from('departamentos').update({ nome }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirDepartamento(id: string): Promise<void> {
  const { error } = await supabase.from('departamentos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function listarColunas(departamentoId: string): Promise<Coluna[]> {
  const { data, error } = await supabase
    .from('colunas')
    .select('id, departamento_id, nome, ordem, cor, icone, is_conclusao')
    .eq('departamento_id', departamentoId)
    .order('ordem', { ascending: true })
  return assert(data as Coluna[] | null, error) ?? []
}

export async function criarColuna(
  departamentoId: string,
  nome: string,
  cor: string,
  ordem: number,
  icone: string,
) {
  const { data, error } = await supabase
    .from('colunas')
    .insert({ departamento_id: departamentoId, nome, cor, ordem, icone })
    .select('id, departamento_id, nome, ordem, cor, icone, is_conclusao')
    .single()
  return assert(data as Coluna | null, error)
}

export async function excluirColuna(id: string): Promise<void> {
  const { error } = await supabase.from('colunas').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function listarTarefas(departamentoId: string): Promise<Tarefa[]> {
  const { data, error } = await supabase
    .from('tarefas')
    .select(
      TAREFA_COLUNAS,
    )
    .eq('departamento_id', departamentoId)
    .is('finalizada_em', null)
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: true })
  return assert(data as Tarefa[] | null, error) ?? []
}

/** Todas as colunas, de todos os departamentos — usado pelo dashboard. */
export async function listarTodasColunas(): Promise<Coluna[]> {
  const { data, error } = await supabase
    .from('colunas')
    .select('id, departamento_id, nome, ordem, cor, icone, is_conclusao')
    .order('ordem', { ascending: true })
  return assert(data as Coluna[] | null, error) ?? []
}

/** Todas as tarefas, de todos os departamentos — usado pelo dashboard. */
export async function listarTodasTarefas(): Promise<Tarefa[]> {
  const { data, error } = await supabase
    .from('tarefas')
    .select(
      TAREFA_COLUNAS,
    )
    .order('prazo', { ascending: true, nullsFirst: false })
  return assert(data as Tarefa[] | null, error) ?? []
}

/** Tarefas em aberto de todos os departamentos — usado pelo filtro "Todos". */
export async function listarTarefasDeTodos(): Promise<Tarefa[]> {
  const { data, error } = await supabase
    .from('tarefas')
    .select(TAREFA_COLUNAS)
    .is('finalizada_em', null)
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: true })
  return assert(data as Tarefa[] | null, error) ?? []
}

export async function criarTarefa(input: TarefaInput & { ordem?: number }): Promise<Tarefa> {
  const { data, error } = await supabase
    .from('tarefas')
    .insert(input)
    .select(
      TAREFA_COLUNAS,
    )
    .single()
  return assert(data as Tarefa | null, error)
}

/**
 * Dispara o aviso no WhatsApp. Não interrompe o fluxo: falha de envio não
 * pode impedir a tarefa de ser salva ou movida.
 */
export async function notificarTarefa(id: string, evento: 'nova' | 'status') {
  try {
    const { data } = await supabase.functions.invoke('notificar-tarefa', { body: { id, evento } })
    return data as { enviado: boolean; para?: string; motivo?: string }
  } catch {
    return { enviado: false, motivo: 'Não foi possível avisar pelo WhatsApp.' }
  }
}

/** Campos que só o responsável altera (o servidor repete a regra). */
export const CAMPOS_RESTRITOS = [
  'titulo',
  'solicitante_id',
  'responsavel_id',
  'executor_id',
  'prazo',
  'departamento_id',
] as const

/**
 * Salva a edição pela edge function: ela decide se exige a senha do
 * responsável. Etapa, prioridade e descrição passam sem senha.
 */
export async function atualizarTarefa(
  id: string,
  input: Partial<TarefaInput>,
  senha?: string,
): Promise<Tarefa> {
  const { data, error } = await supabase.functions.invoke('salvar-tarefa', {
    body: { id, ...input, senha },
  })

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const corpo = (await error.context.json().catch(() => null)) as
        | { error?: string; senhaObrigatoria?: boolean }
        | null
      throw new FinalizarError(corpo?.error ?? error.message, Boolean(corpo?.senhaObrigatoria))
    }
    throw new FinalizarError(error.message, false)
  }

  return (data as { tarefa: Tarefa }).tarefa
}

export async function excluirTarefa(id: string): Promise<void> {
  const { error } = await supabase.from('tarefas').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Move a tarefa para o fim de outra coluna e devolve a linha atualizada —
 * a data de conclusão é escrita por trigger, então precisa vir do banco.
 */
export async function moverTarefa(id: string, colunaId: string, ordem: number): Promise<Tarefa> {
  const { data, error } = await supabase
    .from('tarefas')
    .update({ coluna_id: colunaId, ordem })
    .eq('id', id)
    .select(TAREFA_COLUNAS)
    .single()
  return assert(data as Tarefa | null, error)
}

/** Cores permitidas nas colunas — classes escritas por extenso por causa do purge do Tailwind. */
export const CORES_COLUNA: Record<
  string,
  { rotulo: string; ponto: string; cabecalho: string; suave: string; vivo: string; realce: string }
> = {
  slate: {
    rotulo: 'Cinza',
    ponto: 'bg-slate-400',
    cabecalho: 'text-slate-600 dark:text-slate-300',
    suave: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    vivo: 'bg-slate-500 text-white',
    realce: 'border-l-4 border-l-slate-400 bg-slate-50 dark:bg-slate-500/15',
  },
  indigo: {
    rotulo: 'Azul',
    ponto: 'bg-indigo-500',
    cabecalho: 'text-indigo-600 dark:text-indigo-300',
    suave: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300',
    vivo: 'bg-indigo-500 text-white',
    realce: 'border-l-4 border-l-indigo-500 bg-indigo-50 dark:bg-indigo-500/15',
  },
  emerald: {
    rotulo: 'Verde',
    ponto: 'bg-emerald-500',
    cabecalho: 'text-emerald-600 dark:text-emerald-300',
    suave: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
    vivo: 'bg-emerald-500 text-white',
    realce: 'border-l-4 border-l-emerald-500 bg-emerald-50 dark:bg-emerald-500/15',
  },
  amber: {
    rotulo: 'Âmbar',
    ponto: 'bg-amber-500',
    cabecalho: 'text-amber-600 dark:text-amber-300',
    suave: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
    vivo: 'bg-amber-500 text-slate-900',
    realce: 'border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-500/15',
  },
  red: {
    rotulo: 'Vermelho',
    ponto: 'bg-red-500',
    cabecalho: 'text-red-600 dark:text-red-300',
    suave: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300',
    vivo: 'bg-red-500 text-white',
    realce: 'border-l-4 border-l-red-500 bg-red-50 dark:bg-red-500/15',
  },
}

export const PRIORIDADES: Record<Prioridade, { rotulo: string; ponto: string }> = {
  baixa: { rotulo: 'Baixa', ponto: 'bg-slate-400' },
  media: { rotulo: 'Média', ponto: 'bg-amber-500' },
  alta: { rotulo: 'Alta', ponto: 'bg-red-500' },
}

/** Finaliza a tarefa. Sem ser o responsável, a senha dele é obrigatória. */
export async function finalizarTarefa(id: string, senha?: string) {
  const { data, error } = await supabase.functions.invoke('finalizar-tarefa', {
    body: { id, senha },
  })

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const corpo = (await error.context.json().catch(() => null)) as
        | { error?: string; senhaObrigatoria?: boolean }
        | null
      throw new FinalizarError(corpo?.error ?? error.message, Boolean(corpo?.senhaObrigatoria))
    }
    throw new FinalizarError(error.message, false)
  }

  return data as { finalizada_em: string; finalizada_por: string }
}

/** Reabre a tarefa finalizada, devolvendo-a à primeira etapa do departamento. */
export async function reabrirTarefa(id: string, senha?: string) {
  const { data, error } = await supabase.functions.invoke('reabrir-tarefa', {
    body: { id, senha },
  })

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const corpo = (await error.context.json().catch(() => null)) as
        | { error?: string; senhaObrigatoria?: boolean }
        | null
      throw new FinalizarError(corpo?.error ?? error.message, Boolean(corpo?.senhaObrigatoria))
    }
    throw new FinalizarError(error.message, false)
  }

  return data as { reaberta: boolean; coluna: string }
}

export class FinalizarError extends Error {
  senhaObrigatoria: boolean

  constructor(message: string, senhaObrigatoria: boolean) {
    super(message)
    this.name = 'FinalizarError'
    this.senhaObrigatoria = senhaObrigatoria
  }
}

export interface FiltroFinalizadas {
  texto: string
  departamentoId: string
  campoData: 'conclusao' | 'finalizacao'
  de: string
  ate: string
}

/** Lista das finalizadas — o filtro de texto é aplicado no cliente, sobre os nomes. */
export async function listarFinalizadas(filtro: FiltroFinalizadas): Promise<Tarefa[]> {
  const coluna = filtro.campoData === 'conclusao' ? 'data_conclusao' : 'finalizada_em'
  let query = supabase.from('tarefas').select(TAREFA_COLUNAS).not('finalizada_em', 'is', null)

  if (filtro.departamentoId && filtro.departamentoId !== 'todos') query = query.eq('departamento_id', filtro.departamentoId)
  if (filtro.de) query = query.gte(coluna, `${filtro.de}T00:00:00`)
  if (filtro.ate) query = query.lte(coluna, `${filtro.ate}T23:59:59`)

  const { data, error } = await query.order(coluna, { ascending: false })
  return assert(data as Tarefa[] | null, error) ?? []
}


// ---------------------------------------------------------------- classificações

export async function listarClassificacoes(): Promise<Classificacao[]> {
  const { data, error } = await supabase
    .from('classificacoes')
    .select('id, nome, ordem, ativo')
    .eq('ativo', true)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })
  return assert(data as Classificacao[] | null, error) ?? []
}

export async function criarClassificacao(nome: string, ordem: number): Promise<Classificacao> {
  const { data, error } = await supabase
    .from('classificacoes')
    .insert({ nome, ordem })
    .select('id, nome, ordem, ativo')
    .single()
  return assert(data as Classificacao | null, error)
}

export async function renomearClassificacao(id: string, nome: string): Promise<void> {
  const { error } = await supabase.from('classificacoes').update({ nome }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirClassificacao(id: string): Promise<void> {
  const { error } = await supabase.from('classificacoes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------- anexos

const ANEXO_COLUNAS = 'id, tarefa_id, caminho, nome, tipo, tamanho, created_at'

/** 10 MB por arquivo — acima disso o envio pelo celular fica sofrível. */
export const ANEXO_TAMANHO_MAXIMO = 10 * 1024 * 1024

export async function listarAnexos(tarefaId: string): Promise<Anexo[]> {
  const { data, error } = await supabase
    .from('tarefa_anexos')
    .select(ANEXO_COLUNAS)
    .eq('tarefa_id', tarefaId)
    .order('created_at', { ascending: true })
  return assert(data as Anexo[] | null, error) ?? []
}

/** Nome de arquivo seguro: o Storage recusa acento e espaço no caminho. */
function caminhoSeguro(tarefaId: string, nome: string) {
  const limpo = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
  return `${tarefaId}/${Date.now()}-${limpo}`
}

export async function enviarAnexo(tarefaId: string, arquivo: File): Promise<Anexo> {
  if (arquivo.size > ANEXO_TAMANHO_MAXIMO) {
    throw new Error('O arquivo passa de 10 MB.')
  }

  const caminho = caminhoSeguro(tarefaId, arquivo.name || 'anexo')
  const { error: uploadError } = await supabase.storage.from('anexos').upload(caminho, arquivo, {
    contentType: arquivo.type || 'application/octet-stream',
    upsert: false,
  })
  if (uploadError) throw new Error(uploadError.message)

  const { data, error } = await supabase
    .from('tarefa_anexos')
    .insert({
      tarefa_id: tarefaId,
      caminho,
      nome: arquivo.name || 'anexo',
      tipo: arquivo.type || null,
      tamanho: arquivo.size,
    })
    .select(ANEXO_COLUNAS)
    .single()

  // o registro é a fonte da verdade: sem ele o arquivo vira lixo no bucket
  if (error) {
    await supabase.storage.from('anexos').remove([caminho])
    throw new Error(error.message)
  }

  return data as Anexo
}

export async function excluirAnexo(anexo: Anexo): Promise<void> {
  const { error } = await supabase.from('tarefa_anexos').delete().eq('id', anexo.id)
  if (error) throw new Error(error.message)
  await supabase.storage.from('anexos').remove([anexo.caminho])
}

/** O bucket é privado: toda leitura passa por URL assinada, válida por 1 hora. */
export async function urlDoAnexo(anexo: Anexo): Promise<string> {
  const { data, error } = await supabase.storage.from('anexos').createSignedUrl(anexo.caminho, 3600)
  if (error) throw new Error(error.message)
  return data.signedUrl
}
