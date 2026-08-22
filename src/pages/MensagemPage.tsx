import { useEffect, useState, type FormEvent } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { supabase } from '../lib/supabaseClient'
import type { Profile } from '../types/profile'

const inputClass =
  'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300'

/** Monta o número internacional a partir do DDI e do telefone do perfil. */
function numeroInternacional(user: Profile): string {
  const telefone = (user.phone ?? '').replace(/\D/g, '')
  if (!telefone) return ''
  return `+${user.country_code}${telefone}`
}

export function MensagemPage() {
  const [usuarios, setUsuarios] = useState<Profile[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erroCarga, setErroCarga] = useState<string | null>(null)
  const [selecionadoId, setSelecionadoId] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'active')
        .order('name', { ascending: true })

      if (error) {
        setErroCarga('Não foi possível carregar os usuários. Tente novamente.')
      } else {
        setErroCarga(null)
        setUsuarios((data as Profile[]) ?? [])
      }
      setCarregando(false)
    }
    carregar()
  }, [])

  const selecionado = usuarios.find((user) => user.id === selecionadoId) ?? null
  const telefone = selecionado ? numeroInternacional(selecionado) : ''
  const semTelefone = Boolean(selecionado) && !telefone

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // O envio ainda não está ligado: esta tela só monta a mensagem.
    setAviso('Envio ainda não habilitado — a mensagem não foi enviada.')
  }

  return (
    <AppLayout>
      <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6 dark:bg-slate-800">
        <header className="mb-6">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Mensagem</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Selecione o usuário, escreva a mensagem e revise antes do envio.
          </p>
        </header>

        {carregando && (
          <p role="status" className="text-sm text-slate-500 dark:text-slate-400">
            Carregando usuários...
          </p>
        )}

        {!carregando && erroCarga && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {erroCarga}
          </p>
        )}

        {!carregando && !erroCarga && usuarios.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhum usuário ativo cadastrado. Cadastre um usuário para enviar mensagens.
          </p>
        )}

        {!carregando && !erroCarga && usuarios.length > 0 && (
          <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
            <div>
              <label className={labelClass} htmlFor="msg-usuario">
                Usuário
              </label>
              <select
                id="msg-usuario"
                value={selecionadoId}
                onChange={(e) => {
                  setSelecionadoId(e.target.value)
                  setAviso(null)
                }}
                className={inputClass}
              >
                <option value="">Selecione um usuário</option>
                {usuarios.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="msg-telefone">
                Telefone
              </label>
              <input
                id="msg-telefone"
                type="tel"
                value={telefone}
                readOnly
                aria-describedby="msg-telefone-help"
                className={`${inputClass} bg-slate-50 dark:bg-slate-900`}
                placeholder="Selecione um usuário"
              />
              <p
                id="msg-telefone-help"
                className={`mt-1 text-xs ${semTelefone ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}
              >
                {semTelefone
                  ? 'Este usuário não tem telefone cadastrado. Edite o cadastro antes de enviar.'
                  : 'Preenchido a partir do cadastro do usuário (código do país + telefone).'}
              </p>
            </div>

            <div>
              <label className={labelClass} htmlFor="msg-texto">
                Mensagem
              </label>
              <textarea
                id="msg-texto"
                rows={5}
                value={mensagem}
                onChange={(e) => {
                  setMensagem(e.target.value)
                  setAviso(null)
                }}
                className={inputClass}
                placeholder="Escreva a mensagem..."
              />
            </div>

            {aviso && (
              <p
                role="status"
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
              >
                {aviso}
              </p>
            )}

            <button
              type="submit"
              disabled={!selecionado || !telefone || !mensagem.trim()}
              className="min-h-11 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-slate-900"
            >
              Enviar mensagem
            </button>
          </form>
        )}
      </div>
    </AppLayout>
  )
}
