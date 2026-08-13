import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface OpzioneSegmento<T extends string> {
  valore: T
  etichetta: string
  icona?: ReactNode
}

/**
 * Selettore a segmenti (tipo iOS): usato per i filtri del grafico peso,
 * per le schede interne alle pagine, ecc.
 */
export function SegmentedControl<T extends string>({
  opzioni,
  valore,
  onChange,
  etichetta,
  className,
  dimensione = 'md',
}: {
  opzioni: OpzioneSegmento<T>[]
  valore: T
  onChange: (valore: T) => void
  etichetta: string
  className?: string
  dimensione?: 'sm' | 'md'
}) {
  return (
    <div
      role="tablist"
      aria-label={etichetta}
      className={cn(
        'inline-flex w-full items-center gap-1 rounded-xl bg-elev p-1',
        className,
      )}
    >
      {opzioni.map((opzione) => {
        const attivo = opzione.valore === valore
        return (
          <button
            key={opzione.valore}
            type="button"
            role="tab"
            aria-selected={attivo}
            onClick={() => onChange(opzione.valore)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150',
              dimensione === 'md' ? 'h-9 px-3 text-sm' : 'h-8 px-2 text-[0.8rem]',
              attivo
                ? 'bg-card text-ink shadow-soft'
                : 'text-ink-3 hover:text-ink-2',
            )}
          >
            {opzione.icona}
            <span className="truncate">{opzione.etichetta}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Etichetta colorata (tag delle ricette, categorie, priorita'...). */
export function Chip({
  children,
  onClick,
  attivo,
  colore,
  className,
  titolo,
}: {
  children: ReactNode
  onClick?: () => void
  attivo?: boolean
  colore?: string
  className?: string
  titolo?: string
}) {
  const contenuto = (
    <>
      {colore && (
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: colore }}
        />
      )}
      {children}
    </>
  )
  const classi = cn(
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.8rem] font-medium transition-colors',
    attivo
      ? 'bg-accent-600 text-white'
      : 'bg-elev text-ink-2 hover:bg-accent-500/12 hover:text-accent-700 dark:hover:text-accent-300',
    className,
  )

  if (!onClick) {
    return (
      <span className={classi} title={titolo}>
        {contenuto}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={attivo}
      title={titolo}
      className={classi}
    >
      {contenuto}
    </button>
  )
}

/** Riquadro con un numero grande: usato nelle statistiche. */
export function StatCard({
  etichetta,
  valore,
  dettaglio,
  icona,
  tono = 'neutro',
  className,
}: {
  etichetta: string
  valore: ReactNode
  dettaglio?: ReactNode
  icona?: ReactNode
  tono?: 'neutro' | 'positivo' | 'negativo' | 'accento'
  className?: string
}) {
  const toni = {
    neutro: 'text-ink',
    positivo: 'text-success',
    negativo: 'text-danger',
    accento: 'text-accent-600 dark:text-accent-300',
  }
  return (
    <div className={cn('card p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.8rem] font-medium text-ink-3">{etichetta}</p>
        {icona && <span className="text-ink-3">{icona}</span>}
      </div>
      <p className={cn('tnum mt-1.5 text-2xl font-semibold', toni[tono])}>{valore}</p>
      {dettaglio && <p className="mt-0.5 text-[0.8rem] text-ink-3">{dettaglio}</p>}
    </div>
  )
}
