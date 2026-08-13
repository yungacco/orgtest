import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Intestazione standard di una pagina: titolo, sottotitolo e azioni. */
export function PageHeader({
  titolo,
  sottotitolo,
  azioni,
  className,
}: {
  titolo: string
  sottotitolo?: ReactNode
  azioni?: ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        'flex flex-wrap items-end justify-between gap-3 pb-1',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[1.6rem] font-semibold leading-tight tracking-tight text-ink sm:text-3xl">
          {titolo}
        </h1>
        {sottotitolo && (
          <p className="mt-1 text-sm text-ink-3 sm:text-[0.95rem]">{sottotitolo}</p>
        )}
      </div>
      {azioni && <div className="flex shrink-0 items-center gap-2">{azioni}</div>}
    </header>
  )
}

/** Titolo di una sezione dentro la pagina. */
export function SectionTitle({
  children,
  azione,
  className,
}: {
  children: ReactNode
  azione?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-3">
        {children}
      </h2>
      {azione}
    </div>
  )
}
