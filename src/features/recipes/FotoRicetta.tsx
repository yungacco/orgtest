import { useState } from 'react'
import { ImageOff, UtensilsCrossed } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useUrlFoto } from './hooks'

/**
 * Mostra la foto di una ricetta.
 * Il bucket e' privato: l'indirizzo viene firmato al momento (vedi useUrlFoto).
 */
export function FotoRicetta({
  percorso,
  alt,
  className,
}: {
  percorso: string | null
  alt: string
  className?: string
}) {
  const { url, caricamento } = useUrlFoto(percorso)
  const [caricata, setCaricata] = useState(false)
  const [errore, setErrore] = useState(false)

  if (!percorso) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-elev text-ink-3',
          className,
        )}
        aria-hidden
      >
        <UtensilsCrossed className="h-7 w-7" />
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
