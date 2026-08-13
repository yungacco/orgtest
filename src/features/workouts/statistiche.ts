import { differenceInCalendarDays } from 'date-fns'
import { fromISO, inizioSettimana, oggiISO, sommaGiorni, toISO } from '@/lib/format'
import type { ISODate, Workout } from '@/types'

/** Attivita' suggerite nel modulo: si puo' comunque scrivere qualsiasi cosa. */
export const ATTIVITA_SUGGERITE = [
  { nome: 'Corsa', emoji: '🏃', conDistanza: true },
  { nome: 'Camminata', emoji: '🚶', conDistanza: true },
  { nome: 'Palestra', emoji: '🏋️', conDistanza: false },
  { nome: 'Bici', emoji: '🚴', conDistanza: true },
  { nome: 'Nuoto', emoji: '🏊', conDistanza: true },
  { nome: 'Calcio', emoji: '⚽', conDistanza: false },
  { nome: 'Tennis', emoji: '🎾', conDistanza: false },
  { nome: 'Yoga', emoji: '🧘', conDistanza: false },
  { nome: 'Sci', emoji: '⛷️', conDistanza: false },
  { nome: 'Altro', emoji: '💪', conDistanza: false },
] as const

/** Emoji dell'attivita', riconosciuta anche se scritta con altre maiuscole. */
export function emojiAttivita(nome: string): string {
  const trovata = ATTIVITA_SUGGERITE.find(
    (a) => a.nome.toLowerCase() === nome.trim().toLowerCase(),
  )
  return trovata?.emoji ?? '💪'
}

export function vuoleDistanza(nome: string): boolean {
  const trovata = ATTIVITA_SUGGERITE.find(
    (a) => a.nome.toLowerCase() === nome.trim().toLowerCase(),
  )
  return trovata?.conDistanza ?? false
}

/** "1h 15min", "45min" — piu' leggibile di "75 minuti". */
export function formatDurata(minuti: number): string {
  if (minuti < 60) return `${minuti}min`
  const ore = Math.floor(minuti / 60)
  const resto = minuti % 60
  return resto === 0 ? `${ore}h` : `${ore}h ${resto}min`
}

export interface TotaliPeriodo {
  sessioni: number
  minuti: number
  chilometri: number
  calorie: number
}

export function totali(allenamenti: Workout[]): TotaliPeriodo {
  return allenamenti.reduce<TotaliPeriodo>(
    (acc, a) => ({
      sessioni: acc.sessioni + 1,
      minuti: acc.minuti + a.duration_min,
      chilometri: acc.chilometri + Number(a.distance_km ?? 0),
      calorie: acc.calorie + Number(a.calories ?? 0),
    }),
    { sessioni: 0, minuti: 0, chilometri: 0, calorie: 0 },
  )
}

/** Allenamenti compresi fra due date (estremi inclusi). */
export function nelPeriodo(
  allenamenti: Workout[],
  da: ISODate,
  a: ISODate,
): Workout[] {
  return allenamenti.filter((w) => w.date >= da && w.date <= a)
}

export interface SettimanaAllenamenti {
  /** lunedi' della settimana */
  inizio: ISODate
  etichetta: string
  minuti: number
  sessioni: number
}

/**
 * Minuti per settimana, dalla piu' vecchia alla piu' recente: e' la serie
 * che finisce nel grafico a barre.
 */
export function perSettimana(
  allenamenti: Workout[],
  quanteSettimane = 10,
): SettimanaAllenamenti[] {
  const lunediCorrente = toISO(inizioSettimana(new Date()))
  const settimane: SettimanaAllenamenti[] = []

  for (let i = quanteSettimane - 1; i >= 0; i--) {
    const inizio = sommaGiorni(lunediCorrente, -i * 7)
    const fine = sommaGiorni(inizio, 6)
    const dentro = nelPeriodo(allenamenti, inizio, fine)
    const somma = totali(dentro)
    settimane.push({
      inizio,
      etichetta:
        i === 0
          ? 'Questa'
          : `${fromISO(inizio).getDate()}/${fromISO(inizio).getMonth() + 1}`,
      minuti: somma.minuti,
      sessioni: somma.sessioni,
    })
  }
  return settimane
}

export interface StatisticheAllenamenti {
  settimana: TotaliPeriodo
  settimanaScorsa: TotaliPeriodo
  ultimi30: TotaliPeriodo
  /** attivita' piu' frequente degli ultimi 90 giorni */
  preferita: { nome: string; sessioni: number } | null
  /** giorni consecutivi con almeno un allenamento, fino a oggi o ieri */
  serieGiorni: number
  ultimo: Workout | null
  giorniDallUltimo: number | null
}

export function calcolaStatistiche(allenamenti: Workout[]): StatisticheAllenamenti {
  const oggi = oggiISO()
  const lunedi = toISO(inizioSettimana(new Date()))
  const lunediScorso = sommaGiorni(lunedi, -7)

  const settimana = totali(nelPeriodo(allenamenti, lunedi, sommaGiorni(lunedi, 6)))
  const settimanaScorsa = totali(
    nelPeriodo(allenamenti, lunediScorso, sommaGiorni(lunediScorso, 6)),
  )
  const ultimi30 = totali(nelPeriodo(allenamenti, sommaGiorni(oggi, -29), oggi))

  // attivita' preferita negli ultimi tre mesi
  const conteggio = new Map<string, number>()
  for (const a of nelPeriodo(allenamenti, sommaGiorni(oggi, -89), oggi)) {
    const nome = a.activity.trim()
    conteggio.set(nome, (conteggio.get(nome) ?? 0) + 1)
  }
  const preferita =
    [...conteggio.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([nome, sessioni]) => ({ nome, sessioni }))[0] ?? null

  // serie di giorni consecutivi
  const giorni = new Set(allenamenti.map((a) => a.date))
  let serieGiorni = 0
  let cursore = giorni.has(oggi) ? oggi : sommaGiorni(oggi, -1)
  while (giorni.has(cursore)) {
    serieGiorni++
    cursore = sommaGiorni(cursore, -1)
  }

  const ultimo =
    [...allenamenti].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null

  return {
    settimana,
    settimanaScorsa,
    ultimi30,
    preferita,
    serieGiorni,
    ultimo,
    giorniDallUltimo: ultimo
      ? differenceInCalendarDays(fromISO(oggi), fromISO(ultimo.date))
      : null,
  }
}
