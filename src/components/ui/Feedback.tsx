import type { ReactNode } from 'react'
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

/** Rettangolo grigio animato mostrato durante il caricamento. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton h-4 w-full', className)} />
}

export function SkeletonLista({ righe = 3 }: { righe?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: righe }).map((_, i) => (
        <div key={i} className="card flex items-center gap-3 p-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      role="status"
      aria-label="Caricamento in corso"
      className={cn('h-5 w-5 animate-spin text-ink-3', className)}
    />
  )
}

/**
 * Stato vuoto: non basta dire "nessun dato", spieghiamo cosa fare.
 */
export function EmptyState({
  icona,
  titolo,
  descrizione,
  azione,
  className,
}: {
  icona?: ReactNode
  titolo: string
  descrizione?: string
  azione?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-line',
        'px-6 py-12 text-center',
        className,
      )}
    >
      {icona && (
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500/12 text-accent-600 dark:text-accent-300">
          {icona}
        </div>
      )}
      <h3 className="text-base font-semibold text-ink">{titolo}</h3>
      {descrizione && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-3">{descrizione}</p>
      )}
      {azione && <div className="mt-5">{azione}</div>}
    </div>
  )
}

/** Errore di caricamento con possibilita' di riprovare. */
export function ErrorState({
  messaggio,
  onRiprova,
}: {
  messaggio: string
  onRiprova?: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-danger/30 bg-danger/5 px-6 py-8 text-center"
    >
      <AlertTriangle className="h-8 w-8 text-danger" aria-hidden />
      <div>
        <p className="font-medium text-ink">Non sono riuscito a caricare i dati</p>
        <p className="mt-1 text-sm text-ink-2">{messaggio}</p>
      </div>
      {onRiprova && (
        <Button
          variante="secondario"
          dimensione="sm"
          onClick={onRiprova}
          iconaSinistra={<RefreshCw className="h-4 w-4" />}
        >
          Riprova
        </Button>
      )}
    </div>
  )
}
