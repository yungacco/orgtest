import { describe, expect, it } from 'vitest'
import { sommaGiorni } from '@/lib/format'
import type {
  Habit,
  HabitLog,
  JournalEntry,
  MealPlanEntryWithRecipe,
  Task,
  WeightEntry,
  Workout,
} from '@/types'
import {
  confronta,
  fraseDiSintesi,
  giornoPerGiorno,
  giorniTrascorsi,
  riepilogoAbitudini,
  riepilogoPeso,
  riepilogoSettimana,
  riepilogoTask,
  settimanaDi,
  type DatiSettimana,
} from './statistiche'

/** Lunedi' 10 agosto 2026: la settimana di prova va dal 10 al 16. */
const LUN = '2026-08-10'
const DOM = '2026-08-16'
const g = (n: number) => sommaGiorni(LUN, n)

function peso(date: string, kg: number): WeightEntry {
  return {
    id: date,
    user_id: 'u',
    date,
    weight_kg: kg,
    body_fat: null,
    note: null,
    created_at: `${date}T08:00:00Z`,
  }
}

function allenamento(date: string, minuti: number): Workout {
  return {
    id: `${date}-${minuti}`,
    user_id: 'u',
    date,
    activity: 'Corsa',
    duration_min: minuti,
    intensity: 'media',
    distance_km: null,
    calories: null,
    notes: null,
    created_at: `${date}T18:00:00Z`,
  }
}

function taskCompletata(id: string, quando: string | null): Task {
  return {
    id,
    user_id: 'u',
    title: id,
    notes: null,
    priority: 'media',
    due_date: null,
    category_id: null,
    recurrence: null,
    completed_at: quando,
    sort_order: 0,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  }
}

function abitudine(id: string, creata = '2026-01-01T00:00:00Z', archived = false): Habit {
  return {
    id,
    user_id: 'u',
    name: id,
    emoji: '💧',
    sort_order: 0,
    archived,
    created_at: creata,
  }
}

function spunta(habitId: string, date: string): HabitLog {
  return {
    id: `${habitId}-${date}`,
    user_id: 'u',
    habit_id: habitId,
    date,
    created_at: `${date}T20:00:00Z`,
  }
}

function nota(date: string, content: string, mood: JournalEntry['mood'] = null): JournalEntry {
  return {
    id: date,
    user_id: 'u',
    date,
    content,
    mood,
    created_at: `${date}T21:00:00Z`,
    updated_at: `${date}T21:00:00Z`,
  }
}

function pasto(date: string, calorie: number | null): MealPlanEntryWithRecipe {
  return {
    id: `${date}-${calorie}`,
    user_id: 'u',
    date,
    meal: 'cena',
    recipe_id: 'r',
    pinned: false,
    created_at: `${date}T00:00:00Z`,
    recipe: calorie === null ? null : ({ calories: calorie } as never),
  }
}

const VUOTI: DatiSettimana = {
  pesi: [],
  allenamenti: [],
  taskArchiviate: [],
  abitudini: [],
  logAbitudini: [],
  note: [],
  pasti: [],
}

describe('settimanaDi', () => {
  it('parte sempre dal lunedi e finisce di domenica', () => {
    expect(settimanaDi('2026-08-13')).toEqual({ inizio: LUN, fine: DOM })
    expect(settimanaDi(LUN)).toEqual({ inizio: LUN, fine: DOM })
    expect(settimanaDi(DOM)).toEqual({ inizio: LUN, fine: DOM })
  })
})

describe('giorniTrascorsi', () => {
  it('di mercoledi conta tre giorni, non sette', () => {
    expect(giorniTrascorsi(LUN, g(2))).toHaveLength(3)
  })

  it('su una settimana finita li conta tutti', () => {
    expect(giorniTrascorsi(LUN, '2026-09-01')).toHaveLength(7)
  })
})

describe('riepilogoPeso', () => {
  it('parte dall ultima misurazione precedente alla settimana', () => {
    const r = riepilogoPeso([peso('2026-08-08', 71.2), peso(g(3), 70.8)], LUN, DOM)
    expect(r.partenza).toBe(71.2)
    expect(r.fine).toBe(70.8)
    expect(r.delta).toBeCloseTo(-0.4, 5)
    expect(r.misurazioni).toBe(1)
  })

  it('senza niente prima confronta la prima e l ultima della settimana', () => {
    const r = riepilogoPeso([peso(g(0), 72), peso(g(6), 71.5)], LUN, DOM)
    expect(r.delta).toBeCloseTo(-0.5, 5)
  })

  it('con una sola misurazione e niente prima non inventa una variazione', () => {
    const r = riepilogoPeso([peso(g(3), 70)], LUN, DOM)
    expect(r.fine).toBe(70)
    expect(r.delta).toBeNull()
  })

  it('ignora le misurazioni delle settimane successive', () => {
    const r = riepilogoPeso([peso(g(3), 70), peso(g(10), 68)], LUN, DOM)
    expect(r.fine).toBe(70)
  })
})

describe('riepilogoTask', () => {
  it('conta solo quelle completate dentro la settimana', () => {
    const r = riepilogoTask(
      [
        taskCompletata('a', `${g(1)}T10:00:00`),
        taskCompletata('b', `${g(6)}T23:00:00`),
        taskCompletata('c', '2026-08-09T23:00:00'),
        taskCompletata('d', null),
      ],
      LUN,
      DOM,
    )
    expect(r.completate).toBe(2)
  })
})

describe('riepilogoAbitudini', () => {
  const due = [abitudine('acqua'), abitudine('lettura')]

  it('conta le occasioni solo per i giorni gia passati', () => {
    // mercoledi: 3 giorni x 2 abitudini = 6 occasioni, non 14
    const r = riepilogoAbitudini(due, [spunta('acqua', g(0))], LUN, DOM, g(2))
    expect(r.possibili).toBe(6)
    expect(r.fatte).toBe(1)
  })

  it("un'abitudine creata a meta settimana non risulta saltata prima", () => {
    const tardiva = abitudine('corsa', `${g(3)}T09:00:00Z`)
    const r = riepilogoAbitudini([tardiva], [], LUN, DOM, g(6))
    // esiste da giovedi: 4 occasioni (gio, ven, sab, dom)
    expect(r.possibili).toBe(4)
  })

  it('ignora le abitudini archiviate', () => {
    const r = riepilogoAbitudini(
      [abitudine('vecchia', '2026-01-01T00:00:00Z', true)],
      [],
      LUN,
      DOM,
      g(6),
    )
    expect(r.possibili).toBe(0)
  })

  it('conta i giorni in cui hai spuntato tutto', () => {
    const log = [
      spunta('acqua', g(0)),
      spunta('lettura', g(0)),
      spunta('acqua', g(1)),
    ]
    const r = riepilogoAbitudini(due, log, LUN, DOM, g(1))
    expect(r.giorniPieni).toBe(1)
    expect(r.migliore).toEqual({ nome: 'acqua', emoji: '💧', giorni: 2 })
  })
})

describe('riepilogoSettimana', () => {
  it('riconosce una settimana in cui non e successo niente', () => {
    expect(riepilogoSettimana(VUOTI, LUN, g(6)).vuota).toBe(true)
  })

  it('mette insieme i pezzi', () => {
    const dati: DatiSettimana = {
      pesi: [peso('2026-08-09', 71), peso(g(5), 70.6)],
      allenamenti: [allenamento(g(1), 45), allenamento(g(1), 30), allenamento(g(4), 60)],
      taskArchiviate: [taskCompletata('a', `${g(2)}T10:00:00`)],
      abitudini: [abitudine('acqua')],
      logAbitudini: [spunta('acqua', g(0)), spunta('acqua', g(1))],
      note: [nota(g(0), 'Bella giornata', 4), nota(g(1), '', null)],
      pasti: [pasto(g(0), 600), pasto(g(1), 800)],
    }
    const r = riepilogoSettimana(dati, LUN, g(6))
    expect(r.vuota).toBe(false)
    expect(r.peso.delta).toBeCloseTo(-0.4, 5)
    expect(r.allenamenti).toMatchObject({ sessioni: 3, minuti: 135, giorni: 2 })
    expect(r.task.completate).toBe(1)
    expect(r.abitudini.fatte).toBe(2)
    // la nota vuota senza umore non conta come giorno scritto
    expect(r.diario.giorni).toBe(1)
    expect(r.diario.umoreMedio).toBe(4)
    expect(r.pasti).toMatchObject({ pianificati: 2, giorniCoperti: 2, calorieMedie: 700 })
  })

  it('sa se la settimana e ancora in corso', () => {
    expect(riepilogoSettimana(VUOTI, LUN, g(3)).inCorso).toBe(true)
    expect(riepilogoSettimana(VUOTI, LUN, g(9)).inCorso).toBe(false)
  })
})

describe('confronta e fraseDiSintesi', () => {
  const conAllenamenti = (minuti: number, taskId: string | null): DatiSettimana => ({
    ...VUOTI,
    allenamenti: minuti > 0 ? [allenamento(g(1), minuti)] : [],
    taskArchiviate: taskId ? [taskCompletata(taskId, `${g(2)}T10:00:00`)] : [],
  })

  it('non giudica il peso: dipende dall obiettivo di ciascuno', () => {
    const questa = riepilogoSettimana(VUOTI, LUN, g(6))
    const scorsa = riepilogoSettimana(VUOTI, sommaGiorni(LUN, -7), g(6))
    expect(confronta(questa, scorsa).map((c) => c.chiave)).toEqual([
      'allenamenti',
      'task',
      'abitudini',
      'diario',
    ])
  })

  it('dice cosa e migliorato e cosa no', () => {
    const questa = riepilogoSettimana(conAllenamenti(60, null), LUN, g(6))
    const scorsa = riepilogoSettimana(
      { ...conAllenamenti(30, 'a'), taskArchiviate: [taskCompletata('a', '2026-08-05T10:00:00')] },
      sommaGiorni(LUN, -7),
      g(6),
    )
    const frase = fraseDiSintesi(questa, scorsa)
    expect(frase).toContain('allenamenti')
    expect(frase).toContain('task completate')
  })

  it('sta zitta se non c e niente da dire', () => {
    const vuota = riepilogoSettimana(VUOTI, LUN, g(6))
    expect(fraseDiSintesi(vuota, vuota)).toBeNull()
  })

  it('riconosce due settimane identiche', () => {
    const questa = riepilogoSettimana(conAllenamenti(30, null), LUN, g(6))
    const scorsa = riepilogoSettimana(
      { ...VUOTI, allenamenti: [allenamento(sommaGiorni(LUN, -6), 30)] },
      sommaGiorni(LUN, -7),
      g(6),
    )
    expect(fraseDiSintesi(questa, scorsa)).toBe('Settimana fotocopia della precedente.')
  })
})

describe('giornoPerGiorno', () => {
  it('segna per ogni giorno cosa hai fatto', () => {
    const dati: DatiSettimana = {
      ...VUOTI,
      pesi: [peso(g(0), 70)],
      allenamenti: [allenamento(g(0), 30)],
      note: [nota(g(1), 'ciao')],
      abitudini: [abitudine('acqua')],
      logAbitudini: [spunta('acqua', g(0))],
    }
    const giorni = giornoPerGiorno(dati, LUN, g(2))
    expect(giorni).toHaveLength(7)
    expect(giorni[0]).toMatchObject({
      peso: true,
      allenamento: true,
      diario: false,
      abitudiniComplete: true,
      futuro: false,
    })
    expect(giorni[1]).toMatchObject({ diario: true, abitudiniComplete: false })
    expect(giorni[3].futuro).toBe(true)
  })
})
