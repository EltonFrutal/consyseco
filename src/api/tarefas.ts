import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

export type Prioridade = 'baixa' | 'media' | 'alta'

export interface Cenario {
  id: string
  nome: string
  descricao: string | null
  ordem: number
  ativo: boolean
}

export interface Coluna {
  id: string
  cenario_id: string
  nome: string
  ordem: number
  cor: string
  icone: string
  is_conclusao: boolean
}

export interface Tarefa {
  id: string
  numero: number
  cenario_id: string
  coluna_id: string
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
  cenario_id: string
  coluna_id: string
  titulo: string
  descricao: string | null
  solicitante_id: string | null
  responsavel_id: string | null
  executor_id: string | null
  prazo: string | null
  prioridade: Prioridade
}

const TAREFA_COLUNAS =
  'id, numero, cenario_id, coluna_id, titulo, descricao, solicitante_id, responsavel_id, executor_id, prazo, prioridade, ordem, data_conclusao, finalizada_em, finalizada_por, created_at, updated_at, updated_by'

function assert<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message)
  return data as T
}

export async function listarCenarios(): Promise<Cenario[]> {
  const { data, error } = await supabase
    .from('cenarios')
    .select('id, nome, descricao, ordem, ativo')
    .eq('ativo', true)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })
  return assert(data as Cenario[] | null, error) ?? []
}

export async function criarCenario(nome: string, descricao: string | null): Promise<Cenario> {
  const { data, error } = await supabase
    .from('cenarios')
    .insert({ nome, descricao })
    .select('id, nome, descricao, ordem, ativo')
    .single()
  return assert(data as Cenario | null, error)
}

export async function renomearCenario(id: string, nome: string): Promise<void> {
  const { error } = await supabase.from('cenarios').update({ nome }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirCenario(id: string): Promise<void> {
  const { error } = await supabase.from('cenarios').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function listarColunas(cenarioId: string): Promise<Coluna[]> {
  const { data, error } = await supabase
    .from('colunas')
    .select('id, cenario_id, nome, ordem, cor, icone, is_conclusao')
    .eq('cenario_id', cenarioId)
    .order('ordem', { ascending: true })
  return assert(data as Coluna[] | null, error) ?? []
}

export async function criarColuna(
  cenarioId: string,
  nome: string,
  cor: string,
  ordem: number,
  icone: string,
) {
  const { data, error } = await supabase
    .from('colunas')
    .insert({ cenario_id: cenarioId, nome, cor, ordem, icone })
    .select('id, cenario_id, nome, ordem, cor, icone, is_conclusao')
    .single()
  return assert(data as Coluna | null, error)
}

export async function excluirColuna(id: string): Promise<void> {
  const { error } = await supabase.from('colunas').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function listarTarefas(cenarioId: string): Promise<Tarefa[]> {
  const { data, error } = await supabase
    .from('tarefas')
    .select(
      TAREFA_COLUNAS,
    )
    .eq('cenario_id', cenarioId)
    .is('finalizada_em', null)
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: true })
  return assert(data as Tarefa[] | null, error) ?? []
}

/** Todas as colunas, de todos os cenários — usado pelo dashboard. */
export async function listarTodasColunas(): Promise<Coluna[]> {
  const { data, error } = await supabase
    .from('colunas')
    .select('id, cenario_id, nome, ordem, cor, icone, is_conclusao')
    .order('ordem', { ascending: true })
  return assert(data as Coluna[] | null, error) ?? []
}

/** Todas as tarefas, de todos os cenários — usado pelo dashboard. */
export async function listarTodasTarefas(): Promise<Tarefa[]> {
  const { data, error } = await supabase
    .from('tarefas')
    .select(
      TAREFA_COLUNAS,
    )
    .order('prazo', { ascending: true, nullsFirst: false })
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

/** Campos que só o responsável altera (o servidor repete a regra). */
export const CAMPOS_RESTRITOS = [
  'titulo',
  'solicitante_id',
  'responsavel_id',
  'executor_id',
  'prazo',
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
export const CORES_COLUNA: Record<string, { rotulo: string; ponto: string; cabecalho: string; suave: string }> = {
  slate: {
    rotulo: 'Cinza',
    ponto: 'bg-slate-400',
    cabecalho: 'text-slate-600 dark:text-slate-300',
    suave: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  },
  indigo: {
    rotulo: 'Azul',
    ponto: 'bg-indigo-500',
    cabecalho: 'text-indigo-600 dark:text-indigo-300',
    suave: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300',
  },
  emerald: {
    rotulo: 'Verde',
    ponto: 'bg-emerald-500',
    cabecalho: 'text-emerald-600 dark:text-emerald-300',
    suave: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
  },
  amber: {
    rotulo: 'Âmbar',
    ponto: 'bg-amber-500',
    cabecalho: 'text-amber-600 dark:text-amber-300',
    suave: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
  },
  red: {
    rotulo: 'Vermelho',
    ponto: 'bg-red-500',
    cabecalho: 'text-red-600 dark:text-red-300',
    suave: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300',
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

/** Reabre a tarefa finalizada, devolvendo-a à primeira etapa do cenário. */
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
  campoData: 'conclusao' | 'finalizacao'
  de: string
  ate: string
}

/** Lista das finalizadas — o filtro de texto é aplicado no cliente, sobre os nomes. */
export async function listarFinalizadas(filtro: FiltroFinalizadas): Promise<Tarefa[]> {
  const coluna = filtro.campoData === 'conclusao' ? 'data_conclusao' : 'finalizada_em'
  let query = supabase.from('tarefas').select(TAREFA_COLUNAS).not('finalizada_em', 'is', null)

  if (filtro.de) query = query.gte(coluna, `${filtro.de}T00:00:00`)
  if (filtro.ate) query = query.lte(coluna, `${filtro.ate}T23:59:59`)

  const { data, error } = await query.order(coluna, { ascending: false })
  return assert(data as Tarefa[] | null, error) ?? []
}
