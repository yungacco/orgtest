import { describe, expect, it } from 'vitest'
import type { MealSlot, Recipe } from '@/types'
import { candidatePerPasto, estraiRicetta, generaPiano } from './generatore'

function ricetta(id: string, category: MealSlot, tags: string[] = []): Recipe {
  return {
    id,
    user_id: 'u',
    title: id,
    photo_path: null,
    category,
    tags,
    prep_minutes: null,
    difficulty: 'facile',
    servings: 2,
    ingredients: [],
    steps: [],
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

describe('candidatePerPasto', () => {
  const ricette = [
    ricetta('colazione-1', 'colazione'),
    ricetta('cena-1', 'cena', ['veloce']),
    ricetta('cena-2', 'cena', ['veloce', 'vegetariano']),
  ]

  it('prende le ricette della categoria giusta', () => {
    expect(candidatePerPasto(ricette, 'cena', []).map((r) => r.id)).toEqual([
      'cena-1',
      'cena-2',
    ])
  })

  it('chiede TUTTI i tag indicati, non uno qualsiasi', () => {
    expect(
      candidatePerPasto(ricette, 'cena', ['veloce', 'vegetariano']).map((r) => r.id),
    ).toEqual(['cena-2'])
  })

  it('ignora le maiuscole nei tag', () => {
    expect(candidatePerPasto(ricette, 'cena', ['VELOCE'])).toHaveLength(2)
  })

  it('se non ci sono ricette per quel pasto ripiega sulle altre', () => {
    // meglio una proposta imperfetta che una casella vuota
    expect(candidatePerPasto(ricette, 'pranzo', []).length).toBe(3)
  })
})

describe('estraiRicetta', () => {
  const candidate = [ricetta('a', 'cena'), ricetta('b', 'cena'), ricetta('c', 'cena')]

  it('senza candidate non restituisce niente', () => {
    expect(estraiRicetta([], '2026-03-10', [], 3)).toBeNull()
  })

  it('evita le ricette usate nei giorni vicini', () => {
    const usate = [
      { date: '2026-03-09', meal: 'cena' as MealSlot, recipe_id: 'a', pinned: false },
      { date: '2026-03-11', meal: 'cena' as MealSlot, recipe_id: 'b', pinned: false },
    ]
    for (let i = 0; i < 30; i++) {
      expect(estraiRicetta(candidate, '2026-03-10', usate, 3)!.id).toBe('c')
    }
  })

  it('non ripropone la ricetta che stai scartando', () => {
    for (let i = 0; i < 30; i++) {
      expect(estraiRicetta(candidate, '2026-03-10', [], 3, 'a')!.id).not.toBe('a')
    }
  })

  it('se ripetere e l unica strada, ripete invece di lasciare il buco', () => {
    const usate = [
      { date: '2026-03-10', meal: 'cena' as MealSlot, recipe_id: 'a', pinned: false },
    ]
    expect(estraiRicetta([ricetta('a', 'cena')], '2026-03-10', usate, 3)).not.toBeNull()
  })
})

describe('generaPiano', () => {
  const ricette = [
    ricetta('col-1', 'colazione'),
    ricetta('col-2', 'colazione'),
    ricetta('cena-1', 'cena'),
    ricetta('cena-2', 'cena'),
    ricetta('cena-3', 'cena'),
  ]

  it('riempie ogni giorno e ogni pasto richiesto', () => {
    const piano = generaPiano({
      ricette,
      dataInizio: '2026-03-09',
      giorni: 3,
      pasti: ['colazione', 'cena'],
      tag: [],
      distanzaMinima: 2,
    })
    expect(piano).toHaveLength(6)
    expect(new Set(piano.map((s) => s.date)).size).toBe(3)
  })

  it('lascia intatte le caselle bloccate', () => {
    const bloccata = {
      date: '2026-03-09',
      meal: 'cena' as MealSlot,
      recipe_id: 'cena-1',
      pinned: true,
    }
    const piano = generaPiano({
      ricette,
      dataInizio: '2026-03-09',
      giorni: 2,
      pasti: ['cena'],
      tag: [],
      distanzaMinima: 2,
      daMantenere: [bloccata],
    })
    const nove = piano.filter((s) => s.date === '2026-03-09' && s.meal === 'cena')
    expect(nove).toHaveLength(1)
    expect(nove[0]).toEqual(bloccata)
  })

  it('senza ricette utilizzabili non produce caselle finte', () => {
    const piano = generaPiano({
      ricette: [],
      dataInizio: '2026-03-09',
      giorni: 3,
      pasti: ['cena'],
      tag: [],
      distanzaMinima: 2,
    })
    expect(piano).toHaveLength(0)
  })
})
