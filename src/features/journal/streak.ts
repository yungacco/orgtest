import { oggiISO, sommaGiorni } from '@/lib/format'
import type { HabitLog, ISODate, UUID } from '@/types'

export interface Streak {
  /** giorni consecutivi fino a oggi (o fino a ieri, se oggi non hai ancora spuntato) */
  attuale: number
  /** la serie piu' lunga mai raggiunta */
  record: number
  /** quante volte l'hai fatta negli ultimi 30 giorni */
  ultimi30: number
  fattaOggi: boolean
}

/** Insieme delle date in cui una certa abitudine risulta spuntata. */
export function giorniDiAbitudine(log: HabitLog[], habitId: UUID): Set<ISODate> {
  const insieme = new Set<ISODate>()
  for (const riga of log) {
    if (riga.habit_id === habitId) insieme.add(riga.date)
  }
  return insieme
}

/**
 * Calcola serie attuale e record.
 *
 * La serie attuale non si spezza se oggi non hai ancora spuntato: si conta a
 * partire da ieri. Si spezza davvero solo saltando un giorno intero.
 */
export function calcolaStreak(giorni: Set<ISODate>): Streak {
  const oggi = oggiISO()
  const fattaOggi = giorni.has(oggi)

  let attuale = 0
  let cursore = fattaOggi ? oggi : sommaGiorni(oggi, -1)
  while (giorni.has(cursore)) {
    attuale++
    cursore = sommaGiorni(cursore, -1)
  }

  const ordinate = [...giorni].sort()
  let record = 0
  let corrente = 0
  let precedente: ISODate | null = null
  for (const giorno of ordinate) {
    corrente = precedente !== null && sommaGiorni(precedente, 1) === giorno ? corrente + 1 : 1
    record = Math.max(record, corrente)
    precedente = giorno
  }

  const limite = sommaGiorni(oggi, -29)
  const ultimi30 = ordinate.filter((g) => g >= limite && g <= oggi).length

  return { attuale, record: Math.max(record, attuale), ultimi30, fattaOggi }
}
