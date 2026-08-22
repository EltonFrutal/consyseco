import { useState, type FormEvent } from 'react'
import {
  STATUS_LABELS,
  fetchStatus,
  sendTestMessage,
  type WhatsAppInstance,
  type WhatsAppStatus,
} from '../../api/whatsapp'

interface ConnectedCardProps {
  instance: WhatsAppInstance
  number: string | null
  profileName: string | null
  onRefreshed: (status: WhatsAppStatus, number: string | null, profileName: string | null) => void
  onRequestDelete: () => void
}

const inputClass =
  'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300'

const MENSAGEM_PADRAO = 'Mensagem de teste enviada pelo sistema Tarefas.'

/** Máscara de número internacional: +55 (11) 99999-9999 */
function maskNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 15)
  if (!digits) return ''
  const ddi = digits.slice(0, 2)
  const ddd = digits.slice(2, 4)
  const parte1 = digits.slice(4, 9)
  const parte2 = digits.slice(9, 13)
  let out = `+${ddi}`
  if (ddd) out += ` (${ddd}`
  if (ddd.length === 2) out += ')'
  if (parte1) out += ` ${parte1}`
  if (parte2) out += `-${parte2}`
  return out
}

function statusBadge(status: WhatsAppStatus) {
  const map: Record<WhatsAppStatus, string> = {
    connected: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    connecting: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    hibernated: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
    disconnected: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
  }
  return map[status]
}

export function ConnectedCard({
  instance,
  number,
  profileName,
  onRefreshed,
  onRequestDelete,
}: ConnectedCardProps) {
  const [destino, setDestino] = useState('')
  const [mensagem, setMensagem] = useState(MENSAGEM_PADRAO)
  const [enviando, setEnviando] = useState(false)
  const [envioErro, setEnvioErro] = useState<string | null>(null)
  const [envioOk, setEnvioOk] = useState<string | null>(null)
  const [verificando, setVerificando] = useState(false)
  const [statusErro, setStatusErro] = useState<string | null>(null)

  const digitos = destino.replace(/\D/g, '')
  const destinoInvalido = destino.length > 0 && (digitos.length < 10 || digitos.length > 15)

  async function handleVerificar() {
    setVerificando(true)
    setStatusErro(null)
    try {
      const result = await fetchStatus(instance.id)
      onRefreshed(result.status, result.number, result.profileName)
    } catch (err) {
      setStatusErro(err instanceof Error ? err.message : 'Não foi possível verificar o status.')
    } finally {
      setVerificando(false)
    }
  }

  async function handleEnviar(e: FormEvent) {
    e.preventDefault()
    setEnvioErro(null)
    setEnvioOk(null)

    if (digitos.length < 10 || digitos.length > 15) {
      setEnvioErro('Informe o número com DDI e DDD, de 10 a 15 dígitos.')
      return
    }
    if (!mensagem.trim()) {
      setEnvioErro('Escreva a mensagem que será enviada.')
      return
    }

    setEnviando(true)
    try {
      const result = await sendTestMessage({ id: instance.id, number: digitos, text: mensagem })
      const id = result.messageid ?? result.id
      setEnvioOk(
        id
          ? `Mensagem aceita pela uazapi. ID: ${id}${result.status ? ` (status: ${result.status})` : ''}`
          : 'Mensagem aceita pela uazapi.',
      )
    } catch (err) {
      setEnvioErro(err instanceof Error ? err.message : 'Falha no envio.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="grid min-h-0 gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{instance.nome}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {profileName ? `${profileName} · ` : ''}
              {number ? `+${number}` : 'Número não informado pela API'}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${statusBadge(instance.status)}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${instance.status === 'connected' ? 'bg-emerald-500' : 'bg-current'}`}
              aria-hidden="true"
            />
            {STATUS_LABELS[instance.status]}
          </span>
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Conectado em</dt>
            <dd className="text-slate-900 dark:text-white">
              {instance.last_connected_at
                ? new Date(instance.last_connected_at).toLocaleString('pt-BR')
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Servidor</dt>
            <dd className="break-all text-slate-900 dark:text-white">{instance.server_url}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Token da instância</dt>
            <dd className="font-mono text-slate-900 dark:text-white">{instance.token_masked ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Admintoken</dt>
            <dd className="font-mono text-slate-900 dark:text-white">{instance.admin_token_masked ?? '—'}</dd>
          </div>
        </dl>

        {statusErro && (
          <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
            {statusErro}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleVerificar}
            disabled={verificando}
            className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {verificando ? 'Verificando...' : 'Verificar status'}
          </button>
          <button
            type="button"
            onClick={onRequestDelete}
            className="min-h-11 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            Excluir instância
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Testar conexão</h3>
        <form onSubmit={handleEnviar} noValidate className="mt-3 space-y-3">
          <div>
            <label className={labelClass} htmlFor="wa-destino">
              Número de destino
            </label>
            <input
              id="wa-destino"
              type="tel"
              inputMode="numeric"
              value={destino}
              onChange={(e) => setDestino(maskNumber(e.target.value))}
              aria-invalid={destinoInvalido}
              aria-describedby={destinoInvalido ? 'wa-destino-error' : 'wa-destino-help'}
              className={inputClass}
              placeholder="+55 (11) 99999-9999"
            />
            {destinoInvalido ? (
              <p id="wa-destino-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
                O número deve ter de 10 a 15 dígitos, incluindo o DDI.
              </p>
            ) : (
              <p id="wa-destino-help" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Formato internacional, começando pelo código do país.
              </p>
            )}
          </div>

          <div>
            <label className={labelClass} htmlFor="wa-mensagem">
              Mensagem
            </label>
            <textarea
              id="wa-mensagem"
              rows={2}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className={inputClass}
            />
          </div>

          {envioErro && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {envioErro}
            </p>
          )}
          {envioOk && (
            <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              {envioOk}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="min-h-11 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-slate-900"
          >
            {enviando ? 'Enviando...' : 'Enviar mensagem de teste'}
          </button>
        </form>
      </section>
    </div>
  )
}
