import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

/** Status de conexão da uazapi (nomes exatos da API). */
export type WhatsAppStatus = 'disconnected' | 'connecting' | 'connected' | 'hibernated'

/** Colunas que o frontend pode ler — os tokens só existem mascarados. */
export interface WhatsAppInstance {
  id: string
  nome: string
  server_url: string
  instance_id: string | null
  status: WhatsAppStatus
  last_connected_at: string | null
  created_at: string
  token_masked: string | null
  admin_token_masked: string | null
}

const INSTANCE_COLUMNS =
  'id, nome, server_url, instance_id, status, last_connected_at, created_at, token_masked, admin_token_masked'

/** Erro com a mensagem real devolvida pela edge function / uazapi. */
export class WhatsAppError extends Error {
  canForce: boolean

  constructor(message: string, canForce = false) {
    super(message)
    this.name = 'WhatsAppError'
    this.canForce = canForce
  }
}

async function invoke<T>(fn: string, payload: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body: payload })

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as
        | { error?: string; canForce?: boolean }
        | null
      throw new WhatsAppError(body?.error ?? error.message, Boolean(body?.canForce))
    }
    throw new WhatsAppError(error.message)
  }

  return data as T
}

/** Instância do usuário logado (a RLS garante que só a dele volta). */
export async function fetchInstance(): Promise<WhatsAppInstance | null> {
  const { data, error } = await supabase
    .from('whatsapp_instances')
    .select(INSTANCE_COLUMNS)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw new WhatsAppError(error.message)
  return (data as WhatsAppInstance | null) ?? null
}

export function createInstance(input: { nome: string; serverUrl: string; token: string }) {
  return invoke<{ instance: WhatsAppInstance }>('wa-instance-create', input)
}

export function fetchQrCode(id: string) {
  return invoke<{
    status: WhatsAppStatus
    connected: boolean
    loggedIn: boolean
    qrcode: string | null
    paircode: string | null
  }>('wa-instance-qr', { id })
}

export function fetchStatus(id: string) {
  return invoke<{
    status: WhatsAppStatus
    connected: boolean
    loggedIn: boolean
    number: string | null
    profileName: string | null
    qrcode: string | null
    lastConnectedAt: string | null
  }>('wa-instance-status', { id })
}

export function sendTestMessage(input: { id: string; number: string; text: string }) {
  return invoke<{
    id: string | null
    messageid: string | null
    status: string | null
    chatid: string | null
    response: string | null
  }>('wa-send-test', input)
}

export function deleteInstance(id: string, force = false) {
  return invoke<{ deleted: boolean; forced: boolean; remoteError: string | null }>(
    'wa-instance-delete',
    { id, force },
  )
}

/** Normaliza o nome: minúsculo, sem acento e sem espaço. */
export function normalizeInstanceName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
}

export const STATUS_LABELS: Record<WhatsAppStatus, string> = {
  disconnected: 'Desconectado',
  connecting: 'Conectando',
  connected: 'Conectado',
  hibernated: 'Hibernado',
}
