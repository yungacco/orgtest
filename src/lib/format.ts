import {
  addDays,
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
  startOfWeek,
} from 'date-fns'
import { it } from 'date-fns/locale'
import type { ISODate } from '@/types'

/* -------------------------------------------------------------------------- */
/* Date                                                                       */
/* -------------------------------------------------------------------------- */

/** Converte una Date nella stringa 'AAAA-MM-GG' usando il fuso locale. */
export function toISO(date: Date): ISODate {
  return format(date, 'yyyy-MM-dd')
}

/** Interpreta 'AAAA-MM-GG' come mezzanotte locale (niente sorprese di fuso). */
export function fromISO(iso: ISODate): Date {
  const parsed = parseISO(iso)
  return isValid(parsed) ? parsed : new Date()
}

export function oggiISO(): ISODate {
  return toISO(new Date())
}

export function sommaGiorni(iso: ISODate, giorni: number): ISODate {
  return toISO(addDays(fromISO(iso), giorni))
}

/** Lunedi' della settimana a cui appartiene la data. */
export function inizioSettimana(date: Date | ISODate): Date {
  const d = typeof date === 'string' ? fromISO(date) : date
  return startOfWeek(d, { weekStartsOn: 1 })
}

export function formatData(iso: ISODate | Date, pattern = 'd MMM yyyy'): string {
  const d = typeof iso === 'string' ? fromISO(iso) : iso
  return format(d, pattern, { locale: it })
}

/** "Oggi", "Ieri", "Domani" oppure "lun 12 ago". */
export function dataRelativa(iso: ISODate, opzioni?: { lungo?: boolean }): string {
  const diff = differenceInCalendarDays(fromISO(iso), new Date())
  if (diff === 0) return 'Oggi'
  if (diff === -1) return 'Ieri'
  if (diff === 1) return 'Domani'
  if (diff === -2) return 'L’altro ieri'
  return formatData(iso, opzioni?.lungo ? 'EEEE d MMMM yyyy' : 'EEE d MMM')
}

/** "3 giorni fa", "tra 2 giorni", ... utile per le scadenze. */
export function scadenzaTestuale(iso: ISODate): string {
  const diff = differenceInCalendarDays(fromISO(iso), new Date())
  if (diff === 0) return 'Oggi'
  if (diff === 1) return 'Domani'
  if (diff === -1) return 'Ieri'
  if (diff < 0) return `${Math.abs(diff)} giorni fa`
  if (diff < 7) return `Tra ${diff} giorni`
  return formatData(iso, 'd MMM')
}

export const NOMI_GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

/** Maiuscola iniziale (i nomi di mese/giorno italiani sono minuscoli). */
export function capitalizza(testo: string): string {
  return testo.charAt(0).toUpperCase() + testo.slice(1)
}

/* -------------------------------------------------------------------------- */
/* Numeri                                                                     */
/* -------------------------------------------------------------------------- */

const cacheFormatter = new Map<string, Intl.NumberFormat>()

function formatter(min: number, max: number): Intl.NumberFormat {
  const key = `${min}:${max}`
  let f = cacheFormatter.get(key)
  if (!f) {
    f = new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    })
    cacheFormatter.set(key, f)
  }
  return f
}

/** Numero in formato italiano: 1.234,5 */
export function formatNumero(valore: number, decimali = 1): string {
  if (!Number.isFinite(valore)) return '—'
  return formatter(decimali, decimali).format(valore)
}

/** Come formatNumero ma senza zeri inutili: 1,5 / 2 / 0,25 */
export function formatNumeroCompatto(valore: number, maxDecimali = 2): string {
  if (!Number.isFinite(valore)) return '—'
  return formatter(0, maxDecimali).format(valore)
}

/** Aggiunge il segno: +1,2 / -0,8 */
export function formatDelta(valore: number, decimali = 1): string {
  if (!Number.isFinite(valore)) return '—'
  const segno = valore > 0 ? '+' : valore < 0 ? '−' : ''
  return `${segno}${formatNumero(Math.abs(valore), decimali)}`
}

/**
 * Converte il testo scritto dall'utente in numero accettando sia la virgola
 * sia il punto come separatore decimale ("72,5" e "72.5" sono equivalenti).
 */
export function parseNumero(testo: string): number | null {
  const pulito = testo.replace(/\s/g, '').replace(',', '.')
  if (pulito === '') return null
  const n = Number(pulito)
  return Number.isFinite(n) ? n : null
}

/** Etichetta al plurale: 1 giorno / 3 giorni */
export function plurale(n: number, singolare: string, plurale: string): string {
  return `${formatNumeroCompatto(n)} ${n === 1 ? singolare : plurale}`
}
