import { useState } from 'react'
import {
  Apple,
  Croissant,
  ImageOff,
  Soup,
  UtensilsCrossed,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { MealSlot } from '@/types'
import { useUrlFoto } from './hooks'

const ICONA_CATEGORIA: Record<MealSlot, LucideIcon> = {
  colazione: Croissant,
  pranzo: UtensilsCrossed,
  cena: Soup,
  spuntino: Apple,
}

/**
 * Sfondi del segnaposto: sei sfumature tenui che funzionano sia in chiaro
 * sia in scuro. Ogni ricetta ne riceve sempre la stessa, cosi' la griglia
 * resta riconoscibile anche senza foto.
 */
const SFUMATURE = [
  'from-rose-200 to-orange-200 dark:from-rose-500/25 dark:to-orange-500/25',
  'from-amber-200 to-lime-200 dark:from-amber-500/25 dark:to-lime-500/25',
  'from-emerald-200 to-teal-200 dark:from-emerald-500/25 dark:to-teal-500/25',
  'from-sky-200 to-indigo-200 dark:from-sky-500/25 dark:to-indigo-500/25',
  'from-violet-200 to-fuchsia-200 dark:from-violet-500/25 dark:to-fuchsia-500/25',
  'from-slate-200 to-cyan-200 dark:from-slate-500/25 dark:to-cyan-500/25',
]

/** Numero stabile ricavato dal testo: stessa ricetta, stessa sfumatura. */
function indiceSfumatura(testo: string): number {
  let somma = 0
  for (let i = 0; i < testo.length; i++) somma = (somma * 31 + testo.charCodeAt(i)) % 9973
  return somma % SFUMATURE.length
}

/**
 * Mostra la foto di una ricetta.
 * Il bucket e' privato: l'indirizzo viene firmato al momento (vedi useUrlFoto).
 * Senza foto disegna un segnaposto colorato con l'icona della categoria.
 */
export function FotoRicetta({
  percorso,
  alt,
  className,
  categoria,
  titolo,
}: {
  percorso: string | null
  alt: string
  className?: string
  /** serve solo al segnaposto: sceglie l'icona */
  categoria?: MealSlot
  /** serve solo al segnaposto: sceglie il colore */
  titolo?: string
}) {
  const { url, caricamento } = useUrlFoto(percorso)
  const [caricata, setCaricata] = useState(false)
  const [errore, setErrore] = useState(false)

  if (!percorso) {
    const Icona = categoria ? ICONA_CATEGORIA[categoria] : UtensilsCrossed
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gradient-to-br',
          SFUMATURE[indiceSfumatura(titolo ?? alt)],
          className,
        )}
        aria-hidden
      >
        <Icona className="h-8 w-8 text-slate-700/45 dark:text-white/45" strokeWidth={1.5} />
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden bg-elev', className)}>
      {(caricamento || (!caricata && !errore)) && (
        <div className="skeleton absolute inset-0 rounded-none" aria-hidden />
      )}
      {errore ? (
        <div className="flex h-full w-full items-center justify-center text-ink-3">
          <ImageOff className="h-6 w-6" aria-hidden />
        </div>
      ) : (
        url && (
          <img
            src={url}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={() => setCaricata(true)}
            onError={() => setErrore(true)}
            className={cn(
              'h-full w-full object-cover transition-opacity duration-300',
              caricata ? 'opacity-100' : 'opacity-0',
            )}
          />
        )
      )}
    </div>
  )
}
