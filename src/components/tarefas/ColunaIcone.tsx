/** Ícones das etapas do kanban. O banco guarda o token, nunca a classe/SVG. */
const CAMINHOS: Record<string, JSX.Element> = {
  lista: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </>
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5l6 3.5-6 3.5z" />
    </>
  ),
  relogio: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.2 2.4 2.4 4.6-4.9" />
    </>
  ),
  pausa: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9v6M14 9v6" />
    </>
  ),
  alerta: (
    <>
      <path d="M10.3 4.3 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  foguete: (
    <>
      <path d="M5 15c-1 2-1 4-1 4s2 0 4-1" />
      <path d="M14.5 4.5c3-2 6-1.5 6-1.5s.5 3-1.5 6L12 16l-4-4z" />
      <circle cx="15" cy="9" r="1.2" />
    </>
  ),
  arquivo: (
    <>
      <rect x="3" y="4" width="18" height="5" rx="1.5" />
      <path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
      <path d="M10 13h4" />
    </>
  ),
}

export const ICONES_COLUNA: { valor: string; rotulo: string }[] = [
  { valor: 'lista', rotulo: 'Lista' },
  { valor: 'play', rotulo: 'Em execução' },
  { valor: 'relogio', rotulo: 'Espera' },
  { valor: 'pausa', rotulo: 'Pausa' },
  { valor: 'check', rotulo: 'Concluído' },
  { valor: 'alerta', rotulo: 'Atenção' },
  { valor: 'foguete', rotulo: 'Lançamento' },
  { valor: 'arquivo', rotulo: 'Arquivo' },
]

export function ColunaIcone({ icone, className = 'h-4 w-4' }: { icone: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {CAMINHOS[icone] ?? CAMINHOS.lista}
    </svg>
  )
}
