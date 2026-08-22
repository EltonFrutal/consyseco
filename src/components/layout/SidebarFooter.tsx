import { useState } from 'react'

/**
 * Dados de quem desenvolveu — troque aqui e nos arquivos de public/.
 * logo: public/consys-logo.png · foto: public/foto-desenvolvedor.png
 */
export const DESENVOLVEDOR = {
  nome: 'Elton',
  logo: '/consys-logo.png',
  foto: '/foto-desenvolvedor.png',
  /** Só dígitos, com DDI: 55 + DDD 34 + número. */
  whatsapp: '5534999743931',
  whatsappVisivel: '(34) 99974-3931',
}

const linkWhatsapp = `https://wa.me/${DESENVOLVEDOR.whatsapp}`

function IconeWhatsapp({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.16 8.16 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.22.25-.85.83-.85 2.03s.87 2.35.99 2.51c.12.16 1.71 2.61 4.15 3.66.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.28z" />
    </svg>
  )
}

/** Rodapé fixo do menu lateral com a assinatura de quem desenvolveu. */
export function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const [semFoto, setSemFoto] = useState(false)
  const [semLogo, setSemLogo] = useState(false)

  if (collapsed) {
    return (
      <div className="mt-4 border-t border-slate-200 px-2 pt-3 dark:border-slate-700">
        <a
          href={linkWhatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="relative mx-auto flex h-11 w-11 items-center justify-center rounded-lg transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:hover:bg-slate-700"
          aria-label={`Falar com ${DESENVOLVEDOR.nome} no WhatsApp`}
          title={`Desenvolvido por ${DESENVOLVEDOR.nome} · WhatsApp ${DESENVOLVEDOR.whatsappVisivel}`}
        >
          {semFoto ? (
            <IconeWhatsapp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <img
              src={DESENVOLVEDOR.foto}
              alt=""
              onError={() => setSemFoto(true)}
              className="h-8 w-8 rounded-full object-cover"
            />
          )}
          <IconeWhatsapp className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-white text-emerald-600 dark:bg-slate-800 dark:text-emerald-400" />
        </a>
      </div>
    )
  }

  return (
    <div className="mt-4 border-t border-slate-200 px-3 pt-3 dark:border-slate-700">
      <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Desenvolvido por
      </p>

      <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-900/50">
        {semFoto ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
            {DESENVOLVEDOR.nome.trim().charAt(0).toUpperCase()}
          </span>
        ) : (
          <img
            src={DESENVOLVEDOR.foto}
            alt={`Foto de ${DESENVOLVEDOR.nome}`}
            onError={() => setSemFoto(true)}
            className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-slate-800"
          />
        )}

        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
            {DESENVOLVEDOR.nome}
          </span>

          <a
            href={linkWhatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 inline-flex items-center gap-1 rounded text-xs font-medium text-emerald-600 transition hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-emerald-400"
            aria-label={`Falar com ${DESENVOLVEDOR.nome} no WhatsApp ${DESENVOLVEDOR.whatsappVisivel}`}
          >
            <IconeWhatsapp className="h-3.5 w-3.5 shrink-0" />
            {DESENVOLVEDOR.whatsappVisivel}
          </a>
        </div>

        {/* a logo já é um selo redondo com fundo próprio: não precisa de placa branca */}
        {!semLogo && (
          <img
            src={DESENVOLVEDOR.logo}
            alt="ConSys Consultoria Empresarial"
            title="ConSys Consultoria Empresarial"
            onError={() => setSemLogo(true)}
            className="h-8 w-8 shrink-0 rounded-full object-contain"
          />
        )}
      </div>
    </div>
  )
}
