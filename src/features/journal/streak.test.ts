import { describe, expect, it } from 'vitest'
import { oggiISO, sommaGiorni } from '@/lib/format'
import type { HabitLog } from '@/types'
import { calcolaStreak, giorniDiAbitudine } from './streak'

const oggi = oggiISO()
const giorniFa = (n: number) => sommaGiorni(oggi, -n)

function log(habitId: string, date: string): HabitLog {
  return {
    id: `${habitId}-${date}`,
    user_id: 'u',
    habit_id: habitId,
    date,
    created_at: `${date}T20:00:00Z`,
  }
}

describe('giorniDiAbitudine', () => {
  it('prende solo le spunte dell abitudine chiesta', () => {
    const giorni = giorniDiAbitudine(
      [log('a', giorniFa(0)), log('b', giorniFa(1)), log('a', giorniFa(2))],
      'a',
    )
    expect([...giorni].sort()).toEqual([giorniFa(2), giorniFa(0)].sort())
  })
})

describe('calcolaStreak', () => {
  it('conta i giorni consecutivi fino a oggi', () => {
    const streak = calcolaStreak(new Set([giorniFa(0), giorniFa(1), giorniFa(2)]))
    expect(streak.attuale).toBe(3)
    expect(streak.fattaOggi).toBe(true)
  })

  it('non spezza la serie se oggi non hai ancora spuntato', () => {
    const streak = calcolaStreak(new Set([giorniFa(1), giorniFa(2), giorniFa(3)]))
    expect(streak.attuale).toBe(3)
    expect(streak.fattaOggi).toBe(false)
  })

  it('si spezza saltando un giorno intero', () => {
    const streak = calcolaStreak(new Set([giorniFa(2), giorniFa(3), giorniFa(4)]))
    expect(streak.attuale).toBe(0)
  })

  it('ricorda la serie record anche se non e quella attuale', () => {
    const streak = calcolaStreak(
      new Set([
        giorniFa(10),
        giorniFa(11),
        giorniFa(12),
        giorniFa(13),
        giorniFa(14),
        giorniFa(0),
      ]),
    )
    expect(streak.attuale).toBe(1)
    expect(streak.record).toBe(5)
  })

  it('conta le spunte degli ultimi 30 giorni ignorando le piu vecchie', () => {
    const streak = calcolaStreak(new Set([giorniFa(0), giorniFa(5), giorniFa(60)]))
    expect(streak.ultimi30).toBe(2)
  })

  it('su un insieme vuoto non esplode', () => {
    expect(calcolaStreak(new Set())).toEqual({
      attuale: 0,
      record: 0,
      ultimi30: 0,
      fattaOggi: false,
    })
  })
})
