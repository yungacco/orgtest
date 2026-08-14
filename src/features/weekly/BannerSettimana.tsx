import { Link } from 'react-router-dom'
import { CalendarRange, ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/Feedback'
import { inizioSettimana, toISO } from '@/lib/format'
import { formatDeltaPeso } from '@/lib/units'
import { useProfilo } from '@/features/settings/hooks'
import { formatDurata } from '@/features/workouts/statistiche'
import { useRiepilogoSettimana } from './hooks'

/**
 * Riga in cima alla home che porta al riepilogo settimanale.
 *
 * Sul telefono e' l'unico modo per arrivarci (la barra in basso ha gia'
 * cinque voci), quindi mostra subito i numeri: cosi' e' utile anche senza
 * aprirla.
 */
export function BannerSettimana() {
  const { profilo } = useProfilo()
  const lunedi = toISO(inizioSettimana(new Date()))
  const { settimana, caricamento } = useRiepilogoSettimana(lunedi)

  const pezzi: string[] = []
  if (settimana.peso.delta !== null) {
    pezzi.push(formatDeltaPeso(settimana.peso.delta, profilo.weight_unit))
  }
  if (settimana.allenamenti.minuti > 0) {
    pezzi.push(formatDurata(settimana.allenamenti.minuti))
  }
  if (settimana.task.completate > 0) {
    pezzi.push(
      `${settimana.task.completate} ${settimana.task.completate === 1 ? 'task' : 'task'}`,
    )
  }
  if (settimana.abitudini.possibili > 0) {
    pezzi.push(`abitudini ${settimana.abitudini.fatte}/${settimana.abitudini.possibili}`)
  }

  return (
    <Link
      to="/settimana"
      className="card flex min-w-0 items-center gap-3 p-3.5 transition-colors hover:border-accent-500/40 sm:p-4"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-500/12 text-accent-600 dark:text-accent-300">
        <CalendarRange className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">La tua settimana</span>
        {caricamento ? (
          <Skeleton className="mt-1 h-4 w-40" />
        ) : (
          <span className="block break-words text-[0.8rem] text-ink-3 sm:text-sm">
            {/* al massimo tre numeri: su uno schermo stretto la riga deve
                restare una riga */}
            {pezzi.length > 0
              ? pezzi.slice(0, 3).join(' · ')
              : 'Ancora niente: registra qualcosa e torna qui'}
          </span>
        )}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-3" aria-hidden />
    </Link>
  )
}
