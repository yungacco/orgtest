import { describe, expect, it } from 'vitest'
import type { Ingredient, Recipe, ShoppingItem } from '@/types'
import {
  aggregaIngredienti,
  descriviVoce,
  ingredientiDaRicette,
  listaComeTesto,
  unisciNellaLista,
} from './aggrega'

function ing(name: string, quantity: number | null, unit: string | null): Ingredient {
  return { name, quantity, unit }
}

function voceLista(
  name: string,
  quantity: number | null,
  unit: string | null,
  extra: Partial<ShoppingItem> = {},
): ShoppingItem {
  return {
    id: `${name}-${unit ?? ''}`,
    user_id: 'u',
    name,
    quantity,
    unit,
    checked: false,
    manual: false,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    ...extra,
  }
}

function ricetta(titolo: string, ingredienti: Ingredient[]): Recipe {
  return {
    id: titolo,
    user_id: 'u',
    title: titolo,
    photo_path: null,
    category: 'pranzo',
    tags: [],
    prep_minutes: null,
    difficulty: 'facile',
    servings: 2,
    ingredients: ingredienti,
    steps: [],
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

describe('aggregaIngredienti', () => {
  it('somma le quantita quando nome e unita coincidono', () => {
    const voci = aggregaIngredienti([ing('Farina', 200, 'g'), ing('farina', 100, 'g')])
    expect(voci).toHaveLength(1)
    expect(voci[0]).toMatchObject({ name: 'Farina', quantity: 300, unit: 'g' })
  })

  it('tiene separate le unita diverse: sommarle darebbe un numero senza senso', () => {
    const voci = aggregaIngredienti([ing('Olio', 2, 'cucchiai'), ing('Olio', 50, 'ml')])
    expect(voci).toHaveLength(2)
  })

  it('scarta i nomi vuoti e ordina in italiano', () => {
    const voci = aggregaIngredienti([
      ing('  ', 1, 'kg'),
      ing('Zucchero', 1, 'kg'),
      ing('Basilico', 1, 'mazzo'),
    ])
    expect(voci.map((v) => v.name)).toEqual(['Basilico', 'Zucchero'])
  })

  it('lascia null la quantita se non e mai indicata', () => {
    const voci = aggregaIngredienti([ing('Sale', null, null), ing('Sale', null, null)])
    expect(voci[0].quantity).toBeNull()
  })
})

describe('ingredientiDaRicette', () => {
  it('unisce gli ingredienti di piu ricette', () => {
    const voci = ingredientiDaRicette([
      ricetta('A', [ing('Uova', 2, null)]),
      ricetta('B', [ing('Uova', 3, null), ing('Latte', 200, 'ml')]),
    ])
    expect(voci).toHaveLength(2)
    expect(voci.find((v) => v.name === 'Uova')?.quantity).toBe(5)
  })
})

describe('unisciNellaLista', () => {
  const nuovi = [
    { name: 'Farina', quantity: 200, unit: 'g' },
    { name: 'Uova', quantity: 3, unit: null },
  ]

  it('su una lista vuota inserisce tutto', () => {
    const unione = unisciNellaLista([], nuovi)
    expect(unione.daInserire).toHaveLength(2)
    expect(unione.daAggiornare).toHaveLength(0)
  })

  it('somma invece di duplicare quando la voce c e gia', () => {
    const unione = unisciNellaLista([voceLista('Farina', 100, 'g')], nuovi)
    expect(unione.daInserire.map((v) => v.name)).toEqual(['Uova'])
    expect(unione.daAggiornare).toEqual([{ id: 'Farina-g', quantity: 300 }])
  })

  it('non tocca le voci gia spuntate: quelle sono roba comprata', () => {
    const unione = unisciNellaLista(
      [voceLista('Farina', 100, 'g', { checked: true })],
      nuovi,
    )
    expect(unione.daInserire.map((v) => v.name)).toEqual(['Farina', 'Uova'])
    expect(unione.daAggiornare).toHaveLength(0)
  })

  it('non somma se una delle due quantita e sconosciuta', () => {
    const unione = unisciNellaLista([voceLista('Sale', null, null)], [
      { name: 'Sale', quantity: 5, unit: null },
    ])
    expect(unione.daInserire).toHaveLength(0)
    expect(unione.daAggiornare).toHaveLength(0)
  })

  it('mette le nuove voci in fondo alla lista', () => {
    const unione = unisciNellaLista(
      [voceLista('Pane', 1, null, { sort_order: 7 })],
      nuovi,
    )
    expect(unione.daInserire.map((v) => v.sort_order)).toEqual([8, 9])
  })

  it('premuto due volte di fila non crea doppioni', () => {
    const primo = unisciNellaLista([], nuovi)
    const lista = primo.daInserire.map((v, i) =>
      voceLista(v.name, v.quantity, v.unit, { id: `id-${i}`, sort_order: v.sort_order }),
    )
    const secondo = unisciNellaLista(lista, nuovi)
    expect(secondo.daInserire).toHaveLength(0)
    expect(secondo.daAggiornare).toHaveLength(2)
  })
})

describe('descriviVoce e listaComeTesto', () => {
  it('scrive nome, quantita e unita', () => {
    expect(descriviVoce({ name: 'Farina', quantity: 300, unit: 'g' })).toBe('Farina 300 g')
    expect(descriviVoce({ name: 'Sale', quantity: null, unit: null })).toBe('Sale')
  })

  it('separa quello che resta da prendere da quello gia preso', () => {
    const testo = listaComeTesto([
      voceLista('Pane', 1, null),
      voceLista('Latte', 1, 'l', { checked: true }),
    ])
    expect(testo).toContain('- Pane 1')
    expect(testo).toContain('Già presi:')
    expect(testo.indexOf('- Pane 1')).toBeLessThan(testo.indexOf('Già presi:'))
  })
})
