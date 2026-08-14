import { formatData, fromISO, inizioSettimana, oggiISO, sommaGiorni, toISO } from '@/lib/format'
import { totali } from '@/features/workouts/statistiche'
import type {
  Habit,
  HabitLog,
  ISODate,
  JournalEntry,
  MealPlanEntryWithRecipe,
  Task,
  WeightEntry,
  Workout,
} from '@/types'

/** I sette giorni (da lunedi' a domenica) della settimana che contiene la data. */
export function settimanaDi(data: ISODate): { inizio: ISODate; fine: ISODate } {
  const inizio = toISO(inizioSettimana(data))
  return { inizio, fine: sommaGiorni(inizio, 6) }
}

export function giorniDellaSettimana(inizio: ISODate): ISODate[] {
  return Array.from({ length: 7 }, (_, i) => sommaGiorni(inizio, i))
}

/**
 * Giorni della settimana gia' trascorsi (compreso oggi).
 * Serve a non dire "3 abitudini su 21" di mercoledi': i giorni che non
 * sono ancora arrivati non contano come occasioni mancate.
 */
export function giorniTrascorsi(inizio: ISODate, oggi = oggiISO()): ISODate[] {
  return giorniDellaSettimana(inizio).filter((g) => g <= oggi)
}

/* -------------------------------------------------------------------------- */
/* Peso                                                                       */
/* -------------------------------------------------------------------------- */

export interface RiepilogoPeso {
  /** ultima misurazione della settimana */
  fine: number | null
  /** riferimento di partenza: l'ultima misurazione precedente alla settimana */
  partenza: number | null
  delta: number | null
  misurazioni: number
}

/**
 * Quanto e' cambiato il peso nella settimana.
 *
 * Il punto di partenza e' l'ultima misurazione PRIMA della settimana: cosi'
 * anche chi si pesa una volta sola vede una variazione sensata. Se non c'e'
 * niente prima, si usa la prima misurazione della settimana stessa (e allora
 * il confronto e' interno alla settimana).
 */
export function riepilogoPeso(
  pesi: WeightEntry[],
  inizio: ISODate,
  fine: ISODate,
): RiepilogoPeso {
  const ordinati = [...pesi].sort((a, b) => a.date.localeCompare(b.date))
  const dentro = ordinati.filter((p) => p.date >= inizio && p.date <= fine)
  const prima = ordinati.filter((p) => p.date < inizio)

  const ultima = dentro.length > 0 ? Number(dentro[dentro.length - 1].weight_kg) : null
  const riferimento =
    prima.length > 0
      ? Number(prima[prima.length - 1].weight_kg)
      : dentro.length > 1
        ? Number(dentro[0].weight_kg)
        : null

  return {
    fine: ultima,
    partenza: riferimento,
    delta: ultima !== null && riferimento !== null ? ultima - riferimento : null,
    misurazioni: dentro.length,
  }
}

/* -------------------------------------------------------------------------- */
/* Allenamenti, task, abitudini, diario, pasti                                */
/* -------------------------------------------------------------------------- */

export interface RiepilogoAllenamenti {
  sessioni: number
  minuti: number
  /** giorni distinti in cui ti sei mosso */
  giorni: number
  chilometri: number
}

export function riepilogoAllenamenti(
  allenamenti: Workout[],
  inizio: ISODate,
  fine: ISODate,
): RiepilogoAllenamenti {
  const dentro = allenamenti.filter((a) => a.date >= inizio && a.date <= fine)
  const somma = totali(dentro)
  return {
    sessioni: somma.sessioni,
    minuti: somma.minuti,
    giorni: new Set(dentro.map((a) => a.date)).size,
    chilometri: somma.chilometri,
  }
}

/** Data (locale) in cui una task risulta completata. */
export function giornoCompletamento(task: Task): ISODate | null {
  return task.completed_at ? toISO(new Date(task.completed_at)) : null
}

export function riepilogoTask(
  archiviate: Task[],
  inizio: ISODate,
  fine: ISODate,
): { completate: number } {
  const completate = archiviate.filter((t) => {
    const giorno = giornoCompletamento(t)
    return giorno !== null && giorno >= inizio && giorno <= fine
  }).length
  return { completate }
}

export interface RiepilogoAbitudini {
  /** spunte messe */
  fatte: number
  /** spunte possibili: abitudini attive per i giorni gia' passati */
  possibili: number
  /** giorni della settimana su cui si sta ragionando (7 se e' finita) */
  giorniConsiderati: number
  /** giorni in cui hai spuntato tutto */
  giorniPieni: number
  migliore: { nome: string; emoji: string; giorni: number } | null
}

export function riepilogoAbitudini(
  abitudini: Habit[],
  log: HabitLog[],
  inizio: ISODate,
  fine: ISODate,
  oggi = oggiISO(),
): RiepilogoAbitudini {
  const attive = abitudini.filter((a) => !a.archived)
  const giorni = giorniDellaSettimana(inizio).filter((g) => g <= oggi && g <= fine)

  // un'abitudine creata mercoledi' non "manca" da lunedi'
  const esisteva = (abitudine: Habit, giorno: ISODate) =>
    toISO(new Date(abitudine.created_at)) <= giorno

  const spunte = new Set(
    log
      .filter((r) => r.date >= inizio && r.date <= fine)
      .map((r) => `${r.habit_id}|${r.date}`),
  )

  let fatte = 0
  let possibili = 0
  let giorniPieni = 0

  for (const giorno of giorni) {
    const previste = attive.filter((a) => esisteva(a, giorno))
    const messe = previste.filter((a) => spunte.has(`${a.id}|${giorno}`)).length
    fatte += messe
    possibili += previste.length
    if (previste.length > 0 && messe === previste.length) giorniPieni++
  }

  const migliore = attive
    .map((a) => ({
      nome: a.name,
      emoji: a.emoji,
      giorni: giorni.filter((g) => spunte.has(`${a.id}|${g}`)).length,
    }))
    .sort((x, y) => y.giorni - x.giorni)[0]

  return {
    fatte,
    possibili,
    giorniConsiderati: giorni.length,
    giorniPieni,
    migliore: migliore && migliore.giorni > 0 ? migliore : null,
  }
}

export function riepilogoDiario(
  note: JournalEntry[],
  inizio: ISODate,
  fine: ISODate,
): { giorni: number; umoreMedio: number | null } {
  const dentro = note.filter(
    (n) =>
      n.date >= inizio &&
      n.date <= fine &&
      (n.content.trim() !== '' || n.mood !== null),
  )
  const umori = dentro.map((n) => n.mood).filter((m): m is NonNullable<typeof m> => m !== null)
  return {
    giorni: dentro.length,
    umoreMedio:
      umori.length > 0 ? umori.reduce((s, m) => s + m, 0) / umori.length : null,
  }
}

export function riepilogoPasti(
  voci: MealPlanEntryWithRecipe[],
): { pianificati: number; giorniCoperti: number; calorieMedie: number | null } {
  const giorni = new Set(voci.map((v) => v.date))
  const calorie = voci.reduce((s, v) => s + Number(v.recipe?.calories ?? 0), 0)
  return {
    pianificati: voci.length,
    giorniCoperti: giorni.size,
    calorieMedie: giorni.size > 0 && calorie > 0 ? calorie / giorni.size : null,
  }
}

/* -------------------------------------------------------------------------- */
/* La settimana intera                                                        */
/* -------------------------------------------------------------------------- */

export interface DatiSettimana {
  pesi: WeightEntry[]
  allenamenti: Workout[]
  taskArchiviate: Task[]
  abitudini: Habit[]
  logAbitudini: HabitLog[]
  note: JournalEntry[]
  pasti: MealPlanEntryWithRecipe[]
}

export interface RiepilogoSettimana {
  inizio: ISODate
  fine: ISODate
  /** true se la settimana non e' ancora finita */
  inCorso: boolean
  peso: RiepilogoPeso
  allenamenti: RiepilogoAllenamenti
  task: { completate: number }
  abitudini: RiepilogoAbitudini
  diario: { giorni: number; umoreMedio: number | null }
  pasti: { pianificati: number; giorniCoperti: number; calorieMedie: number | null }
  /** true se in questa settimana non e' successo proprio niente */
  vuota: boolean
}

export function riepilogoSettimana(
  dati: DatiSettimana,
  inizio: ISODate,
  oggi = oggiISO(),
): RiepilogoSettimana {
  const fine = sommaGiorni(inizio, 6)
  const peso = riepilogoPeso(dati.pesi, inizio, fine)
  const allenamenti = riepilogoAllenamenti(dati.allenamenti, inizio, fine)
  const task = riepilogoTask(dati.taskArchiviate, inizio, fine)
  const abitudini = riepilogoAbitudini(dati.abitudini, dati.logAbitudini, inizio, fine, oggi)
  const diario = riepilogoDiario(dati.note, inizio, fine)
  const pasti = riepilogoPasti(
    dati.pasti.filter((v) => v.date >= inizio && v.date <= fine),
  )

  return {
    inizio,
    fine,
    inCorso: oggi >= inizio && oggi <= fine,
    peso,
    allenamenti,
    task,
    abitudini,
    diario,
    pasti,
    vuota:
      peso.misurazioni === 0 &&
      allenamenti.sessioni === 0 &&
      task.completate === 0 &&
      abitudini.fatte === 0 &&
      diario.giorni === 0 &&
      pasti.pianificati === 0,
  }
}

/* -------------------------------------------------------------------------- */
/* Confronto con la settimana precedente                                      */
/* -------------------------------------------------------------------------- */

export type Verso = 'meglio' | 'peggio' | 'uguale'

export interface Confronto {
  chiave: 'allenamenti' | 'task' | 'abitudini' | 'diario'
  etichetta: string
  verso: Verso
  /** differenza grezza, gia' nel verso "positivo = piu' di prima" */
  differenza: number
}

/**
 * Confronta le due settimane voce per voce.
 *
 * Il peso resta fuori di proposito: se sia meglio salire o scendere dipende
 * dall'obiettivo di ciascuno, e non e' compito di un riepilogo giudicarlo.
 */
export function confronta(
  questa: RiepilogoSettimana,
  precedente: RiepilogoSettimana,
): Confronto[] {
  const voci: { chiave: Confronto['chiave']; etichetta: string; a: number; b: number }[] = [
    {
      chiave: 'allenamenti',
      etichetta: 'allenamenti',
      a: questa.allenamenti.minuti,
      b: precedente.allenamenti.minuti,
    },
    {
      chiave: 'task',
      etichetta: 'task completate',
      a: questa.task.completate,
      b: precedente.task.completate,
    },
    {
      chiave: 'abitudini',
      etichetta: 'abitudini',
      a: questa.abitudini.fatte,
      b: precedente.abitudini.fatte,
    },
    {
      chiave: 'diario',
      etichetta: 'diario',
      a: questa.diario.giorni,
      b: precedente.diario.giorni,
    },
  ]

  return voci.map(({ chiave, etichetta, a, b }) => ({
    chiave,
    etichetta,
    differenza: a - b,
    verso: a > b ? 'meglio' : a < b ? 'peggio' : 'uguale',
  }))
}

/**
 * Una frase sola che riassume il confronto, del tipo
 * "Meglio della settimana scorsa sugli allenamenti, peggio sul diario."
 *
 * Restituisce null quando non c'e' niente di sensato da dire: meglio il
 * silenzio di una frase inventata.
 */
export function fraseDiSintesi(
  questa: RiepilogoSettimana,
  precedente: RiepilogoSettimana,
): string | null {
  if (questa.vuota) return null

  const voci = confronta(questa, precedente)
  const meglio = voci.filter((v) => v.verso === 'meglio')
  const peggio = voci.filter((v) => v.verso === 'peggio')

  if (precedente.vuota) {
    return questa.inCorso
      ? 'La settimana scorsa non avevi registrato niente: questa è già un passo avanti.'
      : 'Prima settimana con dei dati: da qui in poi avrai un confronto.'
  }
  if (meglio.length === 0 && peggio.length === 0) {
    return 'Settimana fotocopia della precedente.'
  }

  const elenca = (v: Confronto[]) =>
    v.length === 1
      ? v[0].etichetta
      : `${v.slice(0, -1).map((x) => x.etichetta).join(', ')} e ${v[v.length - 1].etichetta}`

  if (peggio.length === 0) {
    return `Meglio della settimana scorsa su ${elenca(meglio)}.`
  }
  if (meglio.length === 0) {
    return `Sotto la settimana scorsa su ${elenca(peggio)}.`
  }
  return `Meglio della settimana scorsa su ${elenca(meglio)}, sotto su ${elenca(peggio)}.`
}

/* -------------------------------------------------------------------------- */
/* La settimana giorno per giorno                                             */
/* -------------------------------------------------------------------------- */

export interface GiornoSettimana {
  data: ISODate
  futuro: boolean
  peso: boolean
  allenamento: boolean
  diario: boolean
  /** tutte le abitudini previste per quel giorno sono state spuntate */
  abitudiniComplete: boolean
  pasti: number
}

/** La striscia Lun→Dom con i pallini di cosa hai fatto ogni giorno. */
export function giornoPerGiorno(
  dati: DatiSettimana,
  inizio: ISODate,
  oggi = oggiISO(),
): GiornoSettimana[] {
  const attive = dati.abitudini.filter((a) => !a.archived)
  const spunte = new Set(dati.logAbitudini.map((r) => `${r.habit_id}|${r.date}`))

  return giorniDellaSettimana(inizio).map((data) => {
    const previste = attive.filter((a) => toISO(new Date(a.created_at)) <= data)
    return {
      data,
      futuro: data > oggi,
      peso: dati.pesi.some((p) => p.date === data),
      allenamento: dati.allenamenti.some((a) => a.date === data),
      diario: dati.note.some(
        (n) => n.date === data && (n.content.trim() !== '' || n.mood !== null),
      ),
      abitudiniComplete:
        previste.length > 0 && previste.every((a) => spunte.has(`${a.id}|${data}`)),
      pasti: dati.pasti.filter((v) => v.date === data).length,
    }
  })
}

/**
 * "10 – 16 agosto" quando la settimana sta in un mese solo,
 * "28 lug – 3 ago" quando lo attraversa.
 */
export function etichettaSettimana(inizio: ISODate, fine: ISODate): string {
  const stessoMese = fromISO(inizio).getMonth() === fromISO(fine).getMonth()
  return stessoMese
    ? `${formatData(inizio, 'd')} – ${formatData(fine, 'd MMMM')}`
    : `${formatData(inizio, 'd MMM')} – ${formatData(fine, 'd MMM')}`
}
