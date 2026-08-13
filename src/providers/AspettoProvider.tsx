import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useProfilo } from '@/features/settings/hooks'
import type { AccentName, ThemeMode } from '@/types'

const CHIAVE = 'benessere:aspetto'

export interface Aspetto {
  theme: ThemeMode
  accent: AccentName
}

interface AspettoContextValue extends Aspetto {
  /** true se in questo momento l'app e' visualizzata in tema scuro */
  scuro: boolean
  imposta: (patch: Partial<Aspetto>) => void
}

const AspettoContext = createContext<AspettoContextValue | null>(null)

export function useAspetto(): AspettoContextValue {
  const ctx = useContext(AspettoContext)
  if (!ctx) throw new Error('useAspetto va usato dentro <AspettoProvider>')
  return ctx
}

export const PALETTE: { nome: AccentName; etichetta: string; colore: string }[] = [
  { nome: 'verde', etichetta: 'Verde', colore: '#059669' },
  { nome: 'indaco', etichetta: 'Indaco', colore: '#4f46e5' },
  { nome: 'ciano', etichetta: 'Ciano', colore: '#0891b2' },
  { nome: 'rosa', etichetta: 'Rosa', colore: '#db2777' },
  { nome: 'ambra', etichetta: 'Ambra', colore: '#d97706' },
  { nome: 'viola', etichetta: 'Viola', colore: '#9333ea' },
]

function leggiLocale(): Aspetto {
  try {
    const raw = window.localStorage.getItem(CHIAVE)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Aspetto>
      return {
        theme: parsed.theme ?? 'system',
        accent: parsed.accent ?? 'verde',
      }
    }
  } catch {
    /* localStorage non disponibile */
  }
  return { theme: 'system', accent: 'verde' }
}

/**
 * Applica tema chiaro/scuro/automatico e colore d'accento.
 *
 * La preferenza viene tenuta anche in localStorage: cosi' all'apertura
 * successiva il tema giusto e' gia' attivo prima ancora di parlare col
 * database (niente "lampo" bianco).
 */
export function AspettoProvider({ children }: { children: ReactNode }) {
  const { profilo, caricato } = useProfilo()
  const [aspetto, setAspetto] = useState<Aspetto>(leggiLocale)
  const [scuro, setScuro] = useState(
    () => document.documentElement.dataset.theme === 'dark',
  )

  // quando arriva il profilo dal server, quello e' la fonte di verita'
  useEffect(() => {
    if (!caricato) return
    setAspetto((precedente) =>
      precedente.theme === profilo.theme && precedente.accent === profilo.accent
        ? precedente
        : { theme: profilo.theme, accent: profilo.accent },
    )
  }, [caricato, profilo.theme, profilo.accent])

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const applica = () => {
      const isScuro =
        aspetto.theme === 'dark' || (aspetto.theme === 'system' && media.matches)
      root.dataset.theme = isScuro ? 'dark' : 'light'
      root.dataset.accent = aspetto.accent
      setScuro(isScuro)
      // colore della barra di stato del telefono
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', isScuro ? '#0b0f19' : '#f7f8fa')
    }

    applica()
    media.addEventListener('change', applica)
    try {
      window.localStorage.setItem(CHIAVE, JSON.stringify(aspetto))
    } catch {
      /* niente da fare */
    }
    return () => media.removeEventListener('change', applica)
  }, [aspetto])

  const imposta = useCallback((patch: Partial<Aspetto>) => {
    setAspetto((precedente) => ({ ...precedente, ...patch }))
  }, [])

  const value = useMemo<AspettoContextValue>(
    () => ({ ...aspetto, scuro, imposta }),
    [aspetto, scuro, imposta],
  )

  return <AspettoContext.Provider value={value}>{children}</AspettoContext.Provider>
}
