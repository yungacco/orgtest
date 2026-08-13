import { describe, expect, it } from 'vitest'
import { oggiISO, sommaGiorni } from '@/lib/format'
import type { WeightEntry } from '@/types'
import { calcolaStatistiche, calcolaTendenza, filtraPerPeriodo, serieGrafico } from './statistiche'

/** Misurazione finta, con i soli campi che i calcoli guardano davvero. */
function peso(date: string, kg: number, id = date): WeightEntry {
  return {
    id,
    user_id: 'u',
    date,
    weight_kg: kg,
    body_fat: null,
    note: null,
    created_at: `${date}T08:00:00Z`,
  }
}

/** Serie in ordine crescente di data, come arriva dal database. */
function serieDiscendente(kgPerGiorno: number[], finoA = oggiISO()): WeightEntry[] {
  const ultimo = kgPerGiorno.length - 1
  return kgPerGiorno.map((kg, i) => peso(sommaGiorni(finoA, i - ultimo), kg))
}

describe('serieGrafico', () => {
  it('non calcola la media finche non c e almeno un secondo punto nella finestra', () => {
    const punti = serieGrafico([peso('2026-01-01', 80)])
    expect(punti).toHaveLength(1)
    expect(punti[0].media).toBeNull()
    expect(punti[0].peso).toBe(80)
  })

  it('fa la media dei giorni di calendario, non delle ultime misurazioni', () => {
    const punti = serieGrafico(
      [peso('2026-01-01', 80), peso('2026-01-02', 82), peso('2026-01-03', 84)],
      7,
    )
    expect(punti[2].media).toBeCloseTo(82, 5)
  })

  it('esclude dalla media le misurazioni piu vecchie della finestra', () => {
    const punti = serieGrafico(
      [peso('2026-01-01', 100), peso('2026-01-10', 80), peso('2026-01-11', 82)],
      7,
    )
    // il 100 del 1 gennaio e' fuori dalla finestra di 7 giorni
    expect(punti[2].media).toBeCloseTo(81, 5)
  })
})

describe('filtraPerPeriodo', () => {
  it('tiene solo gli ultimi 7 giorni', () => {
    const pesi = [
      peso(sommaGiorni(oggiISO(), -30), 90),
      peso(sommaGiorni(oggiISO(), -3), 88),
      peso(oggiISO(), 87),
    ]
    expect(filtraPerPeriodo(pesi, '7g')).toHaveLength(2)
  })

  it('con "tutto" non toglie niente', () => {
    const pesi = [peso('2020-01-01', 90), peso(oggiISO(), 80)]
    expect(filtraPerPeriodo(pesi, 'tutto')).toHaveLength(2)
  })
})

describe('calcolaTendenza', () => {
  it('riconosce un calo costante', () => {
    // 100 g al giorno per tre settimane
    const pesi = serieDiscendente(
      Array.from({ length: 21 }, (_, i) => 90 - i * 0.1),
    )
    const tendenza = calcolaTendenza(pesi)
    expect(tendenza).not.toBeNull()
    expect(tendenza!.kgAlGiorno).toBeCloseTo(-0.1, 3)
    expect(tendenza!.kgASettimana).toBeCloseTo(-0.7, 3)
  })

  it('non azzarda una tendenza con pochissimi dati', () => {
    expect(calcolaTendenza([peso('2026-01-01', 80), peso('2026-01-02', 79)])).toBeNull()
  })
})

describe('calcolaStatistiche', () => {
  it('calcola differenze, minimo e massimo', () => {
    const pesi = serieDiscendente([84, 83.5, 83, 82.5, 82, 81.5, 81, 80.5])
    const stat = calcolaStatistiche(pesi, pesi, null)
    expect(stat.attuale?.weight_kg).toBe(80.5)
    expect(stat.minimo?.weight_kg).toBe(80.5)
    expect(stat.massimo?.weight_kg).toBe(84)
    // sette giorni prima pesava 84
    expect(stat.deltaSettimana).toBeCloseTo(-3.5, 5)
  })

  it('segnala l obiettivo raggiunto quando la differenza e trascurabile', () => {
    const pesi = serieDiscendente([80.05])
    expect(calcolaStatistiche(pesi, pesi, 80).obiettivoRaggiunto).toBe(true)
  })

  it('stima una data solo se stai andando nella direzione giusta', () => {
    const inCalo = serieDiscendente(Array.from({ length: 21 }, (_, i) => 90 - i * 0.1))
    expect(calcolaStatistiche(inCalo, inCalo, 85).dataStimata).not.toBeNull()

    const inSalita = serieDiscendente(Array.from({ length: 21 }, (_, i) => 90 + i * 0.1))
    expect(calcolaStatistiche(inSalita, inSalita, 85).dataStimata).toBeNull()
  })

  it('non si spaventa se non c e nessuna misurazione', () => {
    const stat = calcolaStatistiche([], [], 75)
    expect(stat.attuale).toBeNull()
    expect(stat.deltaSettimana).toBeNull()
    expect(stat.mancanoAllObiettivo).toBeNull()
  })
})
