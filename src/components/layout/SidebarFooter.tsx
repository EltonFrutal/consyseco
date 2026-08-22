import { useState } from 'react'

/** Dados de quem desenvolveu — troque aqui e no arquivo em public/. */
export const DESENVOLVEDOR = {
  nome: 'Elton Gonçalves',
  marca: '/consys_nome.png',
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

/** Assinatura de quem desenvolveu, no fim do menu lateral. */
export function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const [semLogo, setSemLogo] = useState(false)

  if (collapsed) {
    return (
      <div className="mt-14 border-t border-slate-200 px-2 pt-4 dark:border-slate-700">
        <a
          href={linkWhatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg text-emerald-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-emerald-400 dark:hover:bg-slate-700"
          aria-label={`Falar com ${DESENVOLVEDOR.nome} no WhatsApp`}
          title={`Desenvolvido por ${DESENVOLVEDOR.nome} · WhatsApp ${DESENVOLVEDOR.whatsappVisivel}`}
        >
          <IconeWhatsapp className="h-5 w-5" />
        </a>
      </div>
    )
  }

  return (
    <div className="mt-14 border-t border-slate-200 px-3 pt-5 dark:border-slate-700">
      <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Desenvolvido por
      </p>

      <div className="mt-3 flex flex-col items-center gap-2 text-center">
        {!semLogo && (
          <img
            src={DESENVOLVEDOR.marca}
            alt="ConSys"
            title="ConSys Consultoria Empresarial"
            onError={() => setSemLogo(true)}
            className="h-[67px] w-auto"
          />
        )}

        <span className="max-w-full truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
          {DESENVOLVEDOR.nome}
        </span>

        <a
          href={linkWhatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded text-xs font-medium text-emerald-600 transition hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-emerald-400"
          aria-label={`Falar com ${DESENVOLVEDOR.nome} no WhatsApp ${DESENVOLVEDOR.whatsappVisivel}`}
        >
          <IconeWhatsapp className="h-4 w-4 shrink-0" />
          {DESENVOLVEDOR.whatsappVisivel}
        </a>
      </div>
    </div>
  )
}
