import { useMemo } from 'react'
import { addMonths, endOfMonth, startOfMonth } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import {
  NOMI_GIORNI,
  capitalizza,
  formatData,
  inizioSettimana,
  oggiISO,
  sommaGiorni,
  toISO,
} from '@/lib/format'
import type { ISODate, Mood } from '@/types'

export const EMOJI_UMORE: Record<Mood, string> = {
  1: '😞',
  2: '🙁',
  3: '😐',
  4: '🙂',
  5: '😄',
}

export const DESCRIZIONE_UMORE: Record<Mood, string> = {
  1: 'Giornata storta',
  2: 'Cosi’ cosi’',
  3: 'Nella media',
  4: 'Bella giornata',
  5: 'Benissimo',
}

/** Calendario del mese che segnala i giorni con una nota (e il loro umore). */
export function CalendarioDiario({
  mese,
  onCambiaMese,
  note,
  selezionato,
  onSeleziona,
}: {
  mese: Date
  onCambiaMese: (mese: Date) => void
  /** data -> umore (o null se la nota non ha umore) */
  note: Map<ISODate, Mood | null>
  selezionato: ISODate
  onSeleziona: (data: ISODate) => void
}) {
  const oggi = oggiISO()

  const griglia = useMemo(() => {
    const primo = startOfMonth(mese)
    const ultimo = endOfMonth(mese)
    const partenza = inizioSettimana(primo)
    const giorni: ISODate[] = []
    let cursore = toISO(partenza)
    while (cursore <= toISO(ultimo) || giorni.length % 7 !== 0) {
      giorni.push(cursore)
      cursore = sommaGiorni(cursore, 1)
      if (giorni.length > 42) break
    }
    return giorni
  }, [mese])

  const meseCorrente = formatData(mese, 'MM')

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <IconButton
          etichetta="Mese precedente"
          dimensione="sm"
          onClick={() => onCambiaMese(addMonths(mese, -1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </IconButton>
        <p className="font-semibold text-ink">
          {capitalizza(formatData(mese, 'MMMM yyyy'))}
        </p>
        <IconButton
          etichetta="Mese successivo"
          dimensione="sm"
          onClick={() => onCambiaMese(addMonths(mese, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </IconButton>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {NOMI_GIORNI.map((nome) => (
          <span key={nome} className="text-[0.7rem] font-medium text-ink-3">
            {nome}
          </span>
        ))}
        {griglia.map((giorno) => {
          const fuoriMese = formatData(giorno, 'MM') !== meseCorrente
          const umore = note.get(giorno)
          const haNota = note.has(giorno)
          const futuro = giorno > oggi
          return (
            <button
              key={giorno}
              type="button"
              disabled={futuro}
              onClick={() => onSeleziona(giorno)}
              aria-label={`${formatData(giorno, 'EEEE d MMMM')}${haNota ? ', con nota' : ''}`}
              aria-current={giorno === selezionato ? 'date' : undefined}
              className={cn(
                'relative flex aspect-square items-center justify-center rounded-lg text-sm transition-colors',
                fuoriMese ? 'text-ink-3/50' : 'text-ink-2',
                futuro && 'cursor-not-allowed opacity-40',
                !futuro && 'hover:bg-elev',
                giorno === selezionato && 'bg-accent-600 font-semibold text-white hover:bg-accent-600',
                giorno === oggi && giorno !== selezionato && 'ring-1 ring-accent-500',
              )}
            >
              {umore ? (
                <span aria-hidden className="text-base leading-none">
                  {EMOJI_UMORE[umore]}
                </span>
              ) : (
                formatData(giorno, 'd')
              )}
              {haNota && !umore && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute bottom-1 h-1 w-1 rounded-full',
                    giorno === selezionato ? 'bg-white' : 'bg-accent-500',
                  )}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
