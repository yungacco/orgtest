import { differenceInCalendarDays } from 'date-fns'
import { fromISO, sommaGiorni } from '@/lib/format'
import type { ISODate, MealSlot, Recipe } from '@/types'
import type { SlotPiano } from './api'

export interface OpzioniGeneratore {
  ricette: Recipe[]
  dataInizio: ISODate
  giorni: number
  pasti: MealSlot[]
  /** se valorizzato, considera solo le ricette con TUTTI questi tag */
  tag: string[]
  /** entro quanti giorni evitare di ripetere la stessa ricetta */
  distanzaMinima: number
  /** caselle da tenere cosi' come sono (i pasti bloccati) */
  daMantenere?: SlotPiano[]
}

/** Ricette utilizzabili per un certo pasto, secondo i filtri scelti. */
export function candidatePerPasto(
  ricette: Recipe[],
  pasto: MealSlot,
  tag: string[],
): Recipe[] {
  const conTag = ricette.filter((ricetta) => {
    if (tag.length === 0) return true
    const suoi = ricetta.tags.map((t) => t.toLowerCase())
    return tag.every((t) => suoi.includes(t.toLowerCase()))
  })

  const dellaCategoria = conTag.filter((r) => r.category === pasto)
  // se non hai ancora ricette per quel pasto usiamo tutte le altre:
  // meglio una proposta imperfetta che una casella vuota
  return dellaCategoria.length > 0 ? dellaCategoria : conTag
}

function scegliACaso<T>(elementi: T[]): T | null {
  if (elementi.length === 0) return null
  return elementi[Math.floor(Math.random() * elementi.length)]
}

/**
 * Estrae una ricetta per una casella evitando, quando possibile, quelle gia'
 * usate nei giorni vicini. Se l'unica scelta e' ripetere, ripete: meglio un
 * piano completo che uno con dei buchi.
 */
export function estraiRicetta(
  candidate: Recipe[],
  data: ISODate,
  giaUsate: SlotPiano[],
  distanzaMinima: number,
  escludi?: string,
): Recipe | null {
  if (candidate.length === 0) return null

  const vicine = new Set(
    giaUsate
      .filter(
        (slot) =>
          Math.abs(differenceInCalendarDays(fromISO(slot.date), fromISO(data))) <
          distanzaMinima,
      )
      .map((slot) => slot.recipe_id),
  )
  if (escludi) vicine.add(escludi)

  const libere = candidate.filter((r) => !vicine.has(r.id))
  if (libere.length > 0) return scegliACaso(libere)

  // nessuna alternativa "lontana": almeno evitiamo di riproporre
  // esattamente la ricetta che l'utente sta scartando
  const senzaEsclusa = escludi ? candidate.filter((r) => r.id !== escludi) : candidate
  return scegliACaso(senzaEsclusa.length > 0 ? senzaEsclusa : candidate)
}

/**
 * Costruisce un piano completo: per ogni giorno e per ogni pasto scelto
 * estrae una ricetta a caso rispettando filtri e distanza fra ripetizioni.
 * Le caselle bloccate (pinned) vengono lasciate intatte.
 */
export function generaPiano(opzioni: OpzioniGeneratore): SlotPiano[] {
  const { ricette, dataInizio, giorni, pasti, tag, distanzaMinima } = opzioni
  const mantenuti = opzioni.daMantenere ?? []
  const risultato: SlotPiano[] = [...mantenuti]

  const candidatePerSlot = new Map<MealSlot, Recipe[]>()
  for (const pasto of pasti) {
    candidatePerSlot.set(pasto, candidatePerPasto(ricette, pasto, tag))
  }

  for (let giorno = 0; giorno < giorni; giorno++) {
    const data = sommaGiorni(dataInizio, giorno)
    for (const pasto of pasti) {
      const gia = risultato.find((s) => s.date === data && s.meal === pasto)
      if (gia) continue // casella bloccata: non si tocca

      const scelta = estraiRicetta(
        candidatePerSlot.get(pasto) ?? [],
        data,
        risultato,
        distanzaMinima,
      )
      if (!scelta) continue
      risultato.push({ date: data, meal: pasto, recipe_id: scelta.id, pinned: false })
    }
  }

  return risultato.sort(
    (a, b) => a.date.localeCompare(b.date) || a.meal.localeCompare(b.meal),
  )
}
