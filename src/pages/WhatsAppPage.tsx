import { useCallback, useEffect, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { InstanceForm } from '../components/whatsapp/InstanceForm'
import { QrConnect } from '../components/whatsapp/QrConnect'
import { ConnectedCard } from '../components/whatsapp/ConnectedCard'
import { DeleteInstanceDialog } from '../components/whatsapp/DeleteInstanceDialog'
import { AddButton } from '../components/ui/AddButton'
import {
  WhatsAppError,
  createInstance,
  deleteInstance,
  fetchInstance,
  fetchStatus,
  type WhatsAppInstance,
  type WhatsAppStatus,
} from '../api/whatsapp'

/** A tela é uma máquina de 4 estados. */
type Estado = 'vazio' | 'formulario' | 'qrcode' | 'conectado'

export function WhatsAppPage() {
  const [instance, setInstance] = useState<WhatsAppInstance | null>(null)
  const [estado, setEstado] = useState<Estado>('vazio')
  const [carregando, setCarregando] = useState(true)
  const [erroCarga, setErroCarga] = useState<string | null>(null)

  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)

  const [numero, setNumero] = useState<string | null>(null)
  const [profileName, setProfileName] = useState<string | null>(null)

  const [dialogAberto, setDialogAberto] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExclusao, setErroExclusao] = useState<string | null>(null)
  const [podeForcar, setPodeForcar] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErroCarga(null)
    try {
      const found = await fetchInstance()
      setInstance(found)
      if (!found) {
        setEstado('vazio')
      } else if (found.status === 'connected') {
        setEstado('conectado')
      } else {
        setEstado('qrcode')
      }
    } catch (err) {
      setErroCarga(err instanceof Error ? err.message : 'Não foi possível carregar a integração.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Ao entrar no estado conectado, busca número e nome do perfil na uazapi.
  useEffect(() => {
    if (estado !== 'conectado' || !instance) return
    let ativo = true
    fetchStatus(instance.id)
      .then((result) => {
        if (!ativo) return
        setNumero(result.number)
        setProfileName(result.profileName)
        if (result.status !== instance.status) {
          setInstance((prev) => (prev ? { ...prev, status: result.status } : prev))
        }
      })
      .catch(() => {
        /* o cartão continua utilizável; o botão "Verificar status" mostra o erro real */
      })
    return () => {
      ativo = false
    }
  }, [estado, instance?.id])

  async function handleCriar(values: { nome: string; serverUrl: string; token: string }) {
    setSalvando(true)
    setErroForm(null)
    try {
      const { instance: criada } = await createInstance(values)
      setInstance(criada)
      setEstado('qrcode')
    } catch (err) {
      // erro de token inválido mantém o usuário no formulário
      setErroForm(err instanceof Error ? err.message : 'Não foi possível criar a instância.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleCancelarQr() {
    if (!instance) return
    try {
      await deleteInstance(instance.id, true)
    } finally {
      setInstance(null)
      setNumero(null)
      setProfileName(null)
      setEstado('vazio')
    }
  }

  function handleConectado() {
    setInstance((prev) =>
      prev ? { ...prev, status: 'connected', last_connected_at: new Date().toISOString() } : prev,
    )
    setEstado('conectado')
  }

  function handleStatusAtualizado(
    status: WhatsAppStatus,
    novoNumero: string | null,
    novoProfile: string | null,
  ) {
    setNumero(novoNumero)
    setProfileName(novoProfile)
    setInstance((prev) => (prev ? { ...prev, status } : prev))
    if (status !== 'connected') setEstado('qrcode')
  }

  async function handleExcluir(force: boolean) {
    if (!instance) return
    setExcluindo(true)
    setErroExclusao(null)
    try {
      await deleteInstance(instance.id, force)
      setDialogAberto(false)
      setPodeForcar(false)
      setInstance(null)
      setNumero(null)
      setProfileName(null)
      setEstado('vazio')
    } catch (err) {
      if (err instanceof WhatsAppError) {
        setErroExclusao(err.message)
        setPodeForcar(err.canForce)
      } else {
        setErroExclusao('Não foi possível excluir a instância.')
      }
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <AppLayout>
      <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-sm sm:p-6 dark:bg-slate-800">
        <header className="mb-4 shrink-0">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Integração WhatsApp</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Conecte um número de WhatsApp via uazapi para enviar mensagens pelo sistema.
          </p>
        </header>

        {carregando && (
          <p role="status" className="text-sm text-slate-500 dark:text-slate-400">
            Carregando integração...
          </p>
        )}

        {!carregando && erroCarga && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
          >
            <p>{erroCarga}</p>
            <button
              type="button"
              onClick={carregar}
              className="mt-3 min-h-11 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-red-500/40 dark:hover:bg-red-500/10"
            >
              Tentar de novo
            </button>
          </div>
        )}

        {!carregando && !erroCarga && estado === 'vazio' && (
          <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-slate-300 p-6 text-left dark:border-slate-600 sm:items-center sm:text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 sm:mx-auto">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.7-5.2A8.5 8.5 0 1 1 21 11.5z" />
              </svg>
            </span>
            <div className="sm:mx-auto sm:max-w-md">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Nenhuma instância conectada
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                A integração conecta um número de WhatsApp ao sistema pela uazapi. Depois de conectado, você
                pode disparar mensagens para os contatos cadastrados.
              </p>
            </div>
            <AddButton
              onClick={() => {
                setErroForm(null)
                setEstado('formulario')
              }}
              label="Criar nova instância"
            />
          </div>
        )}

        {!carregando && estado === 'formulario' && (
          <InstanceForm
            submitting={salvando}
            submitError={erroForm}
            onSubmit={handleCriar}
            onCancel={() => setEstado('vazio')}
          />
        )}

        {!carregando && estado === 'qrcode' && instance && (
          <QrConnect instance={instance} onConnected={handleConectado} onCancel={handleCancelarQr} />
        )}

        {!carregando && estado === 'conectado' && instance && (
          <ConnectedCard
            instance={instance}
            number={numero}
            profileName={profileName}
            onRefreshed={handleStatusAtualizado}
            onRequestDelete={() => {
              setErroExclusao(null)
              setPodeForcar(false)
              setDialogAberto(true)
            }}
          />
        )}
      </div>

      <DeleteInstanceDialog
        open={dialogAberto}
        nome={instance?.nome ?? ''}
        deleting={excluindo}
        error={erroExclusao}
        canForce={podeForcar}
        onConfirm={handleExcluir}
        onCancel={() => {
          setDialogAberto(false)
          setErroExclusao(null)
          setPodeForcar(false)
        }}
      />
    </AppLayout>
  )
}
