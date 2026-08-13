import { describe, expect, it } from 'vitest'
import { inizioSettimana, oggiISO, sommaGiorni, toISO } from '@/lib/format'
import type { Workout } from '@/types'
import {
  calcolaStatistiche,
  emojiAttivita,
  formatDurata,
  nelPeriodo,
  perSettimana,
  totali,
  vuoleDistanza,
} from './statistiche'

const oggi = oggiISO()
const giorniFa = (n: number) => sommaGiorni(oggi, -n)

function allenamento(
  date: string,
  activity: string,
  duration_min: number,
  extra: Partial<Workout> = {},
): Workout {
  return {
    id: `${activity}-${date}`,
    user_id: 'u',
    date,
    activity,
    duration_min,
    intensity: 'media',
    distance_km: null,
    calories: null,
    notes: null,
    created_at: `${date}T18:00:00Z`,
    ...extra,
  }
}

describe('formatDurata', () => {
  it('scrive i minuti sotto l ora e ore + minuti sopra', () => {
    expect(formatDurata(45)).toBe('45min')
    expect(formatDurata(60)).toBe('1h')
    expect(formatDurata(75)).toBe('1h 15min')
    expect(formatDurata(180)).toBe('3h')
  })
})

describe('emojiAttivita e vuoleDistanza', () => {
  it('riconosce le attivita note anche scritte in minuscolo', () => {
    expect(emojiAttivita('corsa')).toBe('🏃')
    expect(vuoleDistanza('CORSA')).toBe(true)
    expect(vuoleDistanza('Palestra')).toBe(false)
  })

  it('per un attivita scritta a mano usa l icona generica e niente distanza', () => {
    expect(emojiAttivita('Arrampicata')).toBe('💪')
    expect(vuoleDistanza('Arrampicata')).toBe(false)
  })
})

describe('totali e nelPeriodo', () => {
  it('somma sessioni, minuti, chilometri e calorie', () => {
    const somma = totali([
      allenamento(giorniFa(1), 'Corsa', 30, { distance_km: 5, calories: 300 }),
      allenamento(giorniFa(2), 'Palestra', 60, { calories: 400 }),
    ])
    expect(somma).toEqual({ sessioni: 2, minuti: 90, chilometri: 5, calorie: 700 })
  })

  it('filtra per intervallo con gli estremi inclusi', () => {
    const lista = [
      allenamento('2026-01-01', 'Corsa', 30),
      allenamento('2026-01-05', 'Corsa', 30),
      allenamento('2026-01-10', 'Corsa', 30),
    ]
    expect(nelPeriodo(lista, '2026-01-01', '2026-01-05')).toHaveLength(2)
  })
})

describe('perSettimana', () => {
  it('restituisce una barra per settimana, dalla piu vecchia alla piu recente', () => {
    const settimane = perSettimana([], 6)
    expect(settimane).toHaveLength(6)
    expect(settimane[5].etichetta).toBe('Questa')
    expect(settimane[5].inizio).toBe(toISO(inizioSettimana(new Date())))
  })

  it('mette i minuti nella settimana giusta', () => {
    const lunedi = toISO(inizioSettimana(new Date()))
    const settimane = perSettimana(
      [
        allenamento(lunedi, 'Corsa', 40),
        allenamento(sommaGiorni(lunedi, -7), 'Bici', 90),
      ],
      4,
    )
    expect(settimane[3].minuti).toBe(40)
    expect(settimane[2].minuti).toBe(90)
    expect(settimane[1].minuti).toBe(0)
  })
})

describe('calcolaStatistiche', () => {
  it('su una lista vuota non inventa niente', () => {
    const stat = calcolaStatistiche([])
    expect(stat.settimana.sessioni).toBe(0)
    expect(stat.preferita).toBeNull()
    expect(stat.ultimo).toBeNull()
    expect(stat.serieGiorni).toBe(0)
    expect(stat.giorniDallUltimo).toBeNull()
  })

  it('conta i giorni consecutivi senza spezzarsi se oggi non ti sei ancora allenato', () => {
    const stat = calcolaStatistiche([
      allenamento(giorniFa(1), 'Corsa', 30),
      allenamento(giorniFa(2), 'Corsa', 30),
      allenamento(giorniFa(3), 'Corsa', 30),
    ])
    expect(stat.serieGiorni).toBe(3)
    expect(stat.giorniDallUltimo).toBe(1)
  })

  it('trova l attivita preferita degli ultimi tre mesi', () => {
    const stat = calcolaStatistiche([
      allenamento(giorniFa(1), 'Palestra', 60),
      allenamento(giorniFa(3), 'Palestra', 60),
      allenamento(giorniFa(5), 'Corsa', 30),
      // fuori dai 90 giorni: non deve influire
      allenamento(giorniFa(200), 'Nuoto', 60, { id: 'vecchio-1' }),
      allenamento(giorniFa(201), 'Nuoto', 60, { id: 'vecchio-2' }),
      allenamento(giorniFa(202), 'Nuoto', 60, { id: 'vecchio-3' }),
    ])
    expect(stat.preferita).toEqual({ nome: 'Palestra', sessioni: 2 })
  })

  it('separa la settimana in corso da quella precedente', () => {
    const lunedi = toISO(inizioSettimana(new Date()))
    const stat = calcolaStatistiche([
      allenamento(lunedi, 'Corsa', 45),
      allenamento(sommaGiorni(lunedi, -3), 'Bici', 90),
    ])
    expect(stat.settimana.minuti).toBe(45)
    expect(stat.settimanaScorsa.minuti).toBe(90)
  })
})
