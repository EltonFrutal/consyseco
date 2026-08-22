import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchQrCode, fetchStatus, type WhatsAppInstance } from '../../api/whatsapp'

interface QrConnectProps {
  instance: WhatsAppInstance
  onConnected: () => void
  onCancel: () => void
}

/** QR do WhatsApp expira rápido; a tela regenera sem exigir refresh da página. */
const QR_LIFETIME_SECONDS = 60
const POLL_INTERVAL_MS = 3000

const passos = [
  'Abra o WhatsApp no celular que vai ficar conectado.',
  'Toque em Configurações e depois em Aparelhos conectados.',
  'Toque em Conectar um aparelho.',
  'Aponte a câmera para o código abaixo.',
]

export function QrConnect({ instance, onConnected, onCancel }: QrConnectProps) {
  const [qrcode, setQrcode] = useState<string | null>(null)
  const [paircode, setPaircode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(QR_LIFETIME_SECONDS)
  const connectedRef = useRef(false)

  const generate = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchQrCode(instance.id)
      setQrcode(result.qrcode)
      setPaircode(result.paircode)
      setSecondsLeft(QR_LIFETIME_SECONDS)
      if (result.status === 'connected') {
        connectedRef.current = true
        onConnected()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível gerar o QR Code.')
    } finally {
      setLoading(false)
    }
  }, [instance.id, onConnected])

  useEffect(() => {
    generate()
  }, [generate])

  // Polling de status a cada 3 segundos enquanto ninguém leu o código.
  useEffect(() => {
    const timer = setInterval(async () => {
      if (connectedRef.current) return
      try {
        const result = await fetchStatus(instance.id)
        if (result.status === 'connected') {
          connectedRef.current = true
          onConnected()
          return
        }
        // a uazapi renova o QR sozinha; aproveitamos o valor novo quando vier
        if (result.qrcode && result.qrcode !== qrcode) setQrcode(result.qrcode)
      } catch {
        // silencioso: o polling não deve encher a tela de erro a cada 3s
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [instance.id, onConnected, qrcode])

  // Contador de expiração do QR.
  useEffect(() => {
    if (loading || !qrcode) return
    const timer = setInterval(() => {
      setSecondsLeft((value) => (value > 0 ? value - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [loading, qrcode])

  const expirado = secondsLeft === 0

  return (
    <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-64 w-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-white">
          {loading ? (
            <p className="text-sm text-slate-500">Gerando QR Code...</p>
          ) : error ? (
            <p className="px-4 text-center text-sm text-red-600">{error}</p>
          ) : qrcode ? (
            <img
              src={qrcode}
              alt="QR Code para conectar o WhatsApp"
              className={`h-full w-full object-contain transition ${expirado ? 'opacity-20' : ''}`}
            />
          ) : (
            <p className="px-4 text-center text-sm text-slate-500">
              A uazapi ainda não devolveu o QR Code. Gere novamente.
            </p>
          )}
        </div>

        {expirado ? (
          <p role="status" className="text-sm font-medium text-amber-600 dark:text-amber-400">
            QR Code expirado. Gere um novo.
          </p>
        ) : (
          <p role="status" className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-indigo-500" />
            </span>
            Aguardando leitura — expira em {secondsLeft}s
          </p>
        )}

        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Gerar novo QR Code
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Conecte a instância "{instance.nome}"
        </h2>
        <ol className="mt-4 space-y-3">
          {passos.map((passo, index) => (
            <li key={passo} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                {index + 1}
              </span>
              {passo}
            </li>
          ))}
        </ol>

        {paircode && (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            Código de pareamento: <span className="font-mono font-semibold">{paircode}</span>
          </p>
        )}

        <button
          type="button"
          onClick={onCancel}
          className="mt-8 min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Cancelar e remover instância
        </button>
      </div>
    </div>
  )
}
