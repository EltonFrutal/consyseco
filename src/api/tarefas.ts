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
}

export interface Tarefa {
  id: string
  cenario_id: string
  coluna_id: string
  titulo: string
  descricao: string | null
  solicitante_id: string | null
  responsavel_id: string | null
  prazo: string | null
  prioridade: Prioridade
  ordem: number
  updated_at: string
}

export interface TarefaInput {
  cenario_id: string
  coluna_id: string
  titulo: string
  descricao: string | null
  solicitante_id: string | null
  responsavel_id: string | null
  prazo: string | null
  prioridade: Prioridade
}

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
    .select('id, cenario_id, nome, ordem, cor')
    .eq('cenario_id', cenarioId)
    .order('ordem', { ascending: true })
  return assert(data as Coluna[] | null, error) ?? []
}

export async function criarColuna(cenarioId: string, nome: string, cor: string, ordem: number) {
  const { data, error } = await supabase
    .from('colunas')
    .insert({ cenario_id: cenarioId, nome, cor, ordem })
    .select('id, cenario_id, nome, ordem, cor')
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
      'id, cenario_id, coluna_id, titulo, descricao, solicitante_id, responsavel_id, prazo, prioridade, ordem, updated_at',
    )
    .eq('cenario_id', cenarioId)
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: true })
  return assert(data as Tarefa[] | null, error) ?? []
}

/** Todas as colunas, de todos os cenários — usado pelo dashboard. */
export async function listarTodasColunas(): Promise<Coluna[]> {
  const { data, error } = await supabase
    .from('colunas')
    .select('id, cenario_id, nome, ordem, cor')
    .order('ordem', { ascending: true })
  return assert(data as Coluna[] | null, error) ?? []
}

/** Todas as tarefas, de todos os cenários — usado pelo dashboard. */
export async function listarTodasTarefas(): Promise<Tarefa[]> {
  const { data, error } = await supabase
    .from('tarefas')
    .select(
      'id, cenario_id, coluna_id, titulo, descricao, solicitante_id, responsavel_id, prazo, prioridade, ordem, updated_at',
    )
    .order('prazo', { ascending: true, nullsFirst: false })
  return assert(data as Tarefa[] | null, error) ?? []
}

export async function criarTarefa(input: TarefaInput & { ordem?: number }): Promise<Tarefa> {
  const { data, error } = await supabase
    .from('tarefas')
    .insert(input)
    .select(
      'id, cenario_id, coluna_id, titulo, descricao, solicitante_id, responsavel_id, prazo, prioridade, ordem, updated_at',
    )
    .single()
  return assert(data as Tarefa | null, error)
}

export async function atualizarTarefa(id: string, input: Partial<TarefaInput> & { ordem?: number }) {
  const { error } = await supabase.from('tarefas').update(input).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirTarefa(id: string): Promise<void> {
  const { error } = await supabase.from('tarefas').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Move a tarefa para o fim de outra coluna. */
export async function moverTarefa(id: string, colunaId: string, ordem: number): Promise<void> {
  const { error } = await supabase.from('tarefas').update({ coluna_id: colunaId, ordem }).eq('id', id)
  if (error) throw new Error(error.message)
}

/** Cores permitidas nas colunas — classes escritas por extenso por causa do purge do Tailwind. */
export const CORES_COLUNA: Record<string, { rotulo: string; ponto: string; cabecalho: string }> = {
  slate: {
    rotulo: 'Cinza',
    ponto: 'bg-slate-400',
    cabecalho: 'text-slate-600 dark:text-slate-300',
  },
  indigo: {
    rotulo: 'Azul',
    ponto: 'bg-indigo-500',
    cabecalho: 'text-indigo-600 dark:text-indigo-300',
  },
  emerald: {
    rotulo: 'Verde',
    ponto: 'bg-emerald-500',
    cabecalho: 'text-emerald-600 dark:text-emerald-300',
  },
  amber: {
    rotulo: 'Âmbar',
    ponto: 'bg-amber-500',
    cabecalho: 'text-amber-600 dark:text-amber-300',
  },
  red: {
    rotulo: 'Vermelho',
    ponto: 'bg-red-500',
    cabecalho: 'text-red-600 dark:text-red-300',
  },
}

export const PRIORIDADES: Record<Prioridade, { rotulo: string; ponto: string }> = {
  baixa: { rotulo: 'Baixa', ponto: 'bg-slate-400' },
  media: { rotulo: 'Média', ponto: 'bg-amber-500' },
  alta: { rotulo: 'Alta', ponto: 'bg-red-500' },
}
