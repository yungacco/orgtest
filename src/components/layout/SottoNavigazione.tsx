import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useSpesa } from '@/features/shopping/hooks'

export interface VoceSottoNav {
  percorso: string
  etichetta: string
  /** numero mostrato accanto all'etichetta (es. articoli da comprare) */
  contatore?: number
}

/**
 * Schede interne a una sezione. Servono soprattutto sul telefono, dove la
 * barra in basso ha solo cinque voci: senza queste, pagine come il piano
 * pasti e la lista della spesa resterebbero raggiungibili solo dalla Home.
 */
export function SottoNav({ voci, etichetta }: { voci: VoceSottoNav[]; etichetta: string }) {
  return (
    <nav
      aria-label={etichetta}
      className="flex w-full items-center gap-1 rounded-xl bg-elev p-1 sm:w-fit"
    >
      {voci.map((voce) => (
        <NavLink
          key={voce.percorso}
          to={voce.percorso}
          end
          className={({ isActive }) =>
            cn(
              'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium transition-all duration-150',
              'sm:flex-none sm:px-5',
              isActive ? 'bg-card text-ink shadow-soft' : 'text-ink-3 hover:text-ink-2',
            )
          }
        >
          {({ isActive }) => (
            <>
              <span className="truncate">{voce.etichetta}</span>
              {voce.contatore !== undefined && voce.contatore > 0 && (
                <span
                  className={cn(
                    'tnum rounded-full px-1.5 py-0.5 text-[0.7rem] font-semibold',
                    isActive
                      ? 'bg-accent-500/15 text-accent-700 dark:text-accent-300'
                      : 'bg-ink-3/20 text-ink-2',
                  )}
                >
                  {voce.contatore}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

/** Schede della sezione salute: peso e allenamenti. */
export function SottoNavSalute() {
  return (
    <SottoNav
      etichetta="Sezioni della salute"
      voci={[
        { percorso: '/peso', etichetta: 'Peso' },
        { percorso: '/allenamenti', etichetta: 'Allenamenti' },
      ]}
    />
  )
}

/** Schede della sezione dedicata al cibo: ricettario, piano e spesa. */
export function SottoNavCibo() {
  const { voci } = useSpesa()
  const daPrendere = voci.filter((v) => !v.checked).length

  return (
    <SottoNav
      etichetta="Sezioni del cibo"
      voci={[
        { percorso: '/ricette', etichetta: 'Ricettario' },
        { percorso: '/piano', etichetta: 'Piano' },
        { percorso: '/spesa', etichetta: 'Spesa', contatore: daPrendere },
      ]}
    />
  )
}

/** Schede della sezione task: quelle da fare e quelle gia' completate. */
export function SottoNavTask({ attive }: { attive: number }) {
  return (
    <SottoNav
      etichetta="Sezioni delle task"
      voci={[
        { percorso: '/task', etichetta: 'Da fare', contatore: attive },
        { percorso: '/archivio', etichetta: 'Archivio' },
      ]}
    />
  )
}
