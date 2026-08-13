import { describe, expect, it } from 'vitest'
import { addMonths } from 'date-fns'
import { fromISO, oggiISO, sommaGiorni, toISO } from '@/lib/format'
import type { Recurrence, Task } from '@/types'

import { prossimaScadenza } from './ricorrenze'

function task(recurrence: Recurrence | null, due_date: string | null): Task {
  return {
    id: 't',
    user_id: 'u',
    title: 'Innaffiare le piante',
    notes: null,
    priority: 'media',
    due_date,
    category_id: null,
    recurrence,
    completed_at: null,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

describe('prossimaScadenza', () => {
  it('senza ricorrenza non produce nessuna occorrenza', () => {
    expect(prossimaScadenza(task(null, oggiISO()))).toBeNull()
  })

  it('sposta di un giorno o di una settimana', () => {
    const fra10 = sommaGiorni(oggiISO(), 10)
    expect(prossimaScadenza(task('giornaliera', fra10))).toBe(sommaGiorni(fra10, 1))
    expect(prossimaScadenza(task('settimanale', fra10))).toBe(sommaGiorni(fra10, 7))
  })

  it('sposta di un mese tenendo lo stesso giorno del mese', () => {
    const fra10 = sommaGiorni(oggiISO(), 10)
    expect(prossimaScadenza(task('mensile', fra10))).toBe(
      toISO(addMonths(fromISO(fra10), 1)),
    )
  })

  it('completando in ritardo riparte da oggi, non dalla scadenza scaduta', () => {
    const vecchia = sommaGiorni(oggiISO(), -40)
    expect(prossimaScadenza(task('giornaliera', vecchia))).toBe(sommaGiorni(oggiISO(), 1))
  })

  it('funziona anche su una task ricorrente senza scadenza', () => {
    expect(prossimaScadenza(task('settimanale', null))).toBe(sommaGiorni(oggiISO(), 7))
  })
})
