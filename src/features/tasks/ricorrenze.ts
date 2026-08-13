import { addDays, addMonths, addWeeks } from 'date-fns'
import { fromISO, oggiISO, toISO } from '@/lib/format'
import type { ISODate, Recurrence, Task } from '@/types'

export const ETICHETTE_RICORRENZA: Record<Recurrence, string> = {
  giornaliera: 'Ogni giorno',
  settimanale: 'Ogni settimana',
  mensile: 'Ogni mese',
}

/**
 * Data della prossima occorrenza di una task ricorrente.
 *
 * Si parte dalla scadenza attuale; se e' gia' passata si riparte da oggi,
 * cosi' completando in ritardo una task giornaliera non ne crei una
 * scaduta il giorno stesso.
 */
export function prossimaScadenza(task: Task): ISODate | null {
  if (!task.recurrence) return null

  const oggi = oggiISO()
  const partenza = task.due_date && task.due_date >= oggi ? task.due_date : oggi
  const data = fromISO(partenza)

  switch (task.recurrence) {
    case 'giornaliera':
      return toISO(addDays(data, 1))
    case 'settimanale':
      return toISO(addWeeks(data, 1))
    case 'mensile':
      return toISO(addMonths(data, 1))
  }
}
