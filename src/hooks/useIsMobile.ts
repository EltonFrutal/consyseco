import { useEffect, useState } from 'react'

/**
 * Mobile é decidido pela largura da janela, não pelo aparelho: user agent mente,
 * tablet gira e notebook tem tela de toque. O corte é o mesmo `md` do Tailwind,
 * para o CSS e o JavaScript concordarem sobre o que é mobile.
 */
const CONSULTA = '(max-width: 767px)'

export function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia(CONSULTA).matches)

  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA)
    const aoMudar = (evento: MediaQueryListEvent) => setMobile(evento.matches)
    consulta.addEventListener('change', aoMudar)
    return () => consulta.removeEventListener('change', aoMudar)
  }, [])

  return mobile
}
