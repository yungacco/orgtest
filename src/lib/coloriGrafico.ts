import { useMemo } from 'react'
import { useAspetto } from '@/providers/AspettoProvider'

export interface ColoriGrafico {
  accento: string
  accentoChiaro: string
  media: string
  griglia: string
  testo: string
  obiettivo: string
  sfondoCard: string
}

/**
 * Recharts disegna in SVG e vuole colori "veri": qui leggiamo i valori
 * calcolati dei nostri token CSS, ricalcolandoli quando cambiano tema o
 * colore d'accento.
 */
export function useColoriGrafico(): ColoriGrafico {
  const { scuro, accent } = useAspetto()

  return useMemo(() => {
    const stile = getComputedStyle(document.documentElement)
    const rgb = (nome: string, alpha?: number) => {
      const valore = stile.getPropertyValue(nome).trim() || '100 116 139'
      return alpha === undefined ? `rgb(${valore})` : `rgb(${valore} / ${alpha})`
    }
    return {
      accento: rgb('--a-600'),
      accentoChiaro: rgb('--a-400'),
      media: rgb('--c-ink-3'),
      griglia: rgb('--c-line'),
      testo: rgb('--c-ink-3'),
      obiettivo: rgb('--c-warn'),
      sfondoCard: rgb('--c-card'),
    }
    // "scuro" e "accent" non compaiono nel calcolo ma sono proprio cio' che
    // fa cambiare i token CSS: servono a rileggerli quando l'aspetto cambia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scuro, accent])
}
