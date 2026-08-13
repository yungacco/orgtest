import { formatNumero } from './format'
import type { LengthUnit, WeightUnit } from '@/types'

/**
 * I dati sul database sono SEMPRE in kg e cm.
 * Queste funzioni servono solo a mostrarli (e a rileggerli) nell'unita'
 * scelta dall'utente in Impostazioni.
 */

const LB_PER_KG = 2.20462262
const IN_PER_CM = 0.393700787

export function kgToUnit(kg: number, unit: WeightUnit): number {
  return unit === 'lb' ? kg * LB_PER_KG : kg
}

export function unitToKg(valore: number, unit: WeightUnit): number {
  return unit === 'lb' ? valore / LB_PER_KG : valore
}

export function cmToUnit(cm: number, unit: LengthUnit): number {
  return unit === 'in' ? cm * IN_PER_CM : cm
}

export function unitToCm(valore: number, unit: LengthUnit): number {
  return unit === 'in' ? valore / IN_PER_CM : valore
}

/** "72,4 kg" oppure "159,6 lb" */
export function formatPeso(
  kg: number | null | undefined,
  unit: WeightUnit,
  opzioni?: { decimali?: number; senzaUnita?: boolean },
): string {
  if (kg === null || kg === undefined || !Number.isFinite(kg)) return '—'
  const decimali = opzioni?.decimali ?? 1
  const testo = formatNumero(kgToUnit(kg, unit), decimali)
  return opzioni?.senzaUnita ? testo : `${testo} ${unit}`
}

/** Differenza di peso col segno: "+1,2 kg" */
export function formatDeltaPeso(kg: number, unit: WeightUnit): string {
  const v = kgToUnit(kg, unit)
  const segno = v > 0 ? '+' : v < 0 ? '−' : ''
  return `${segno}${formatNumero(Math.abs(v), 1)} ${unit}`
}

export function formatAltezza(
  cm: number | null | undefined,
  unit: LengthUnit,
): string {
  if (cm === null || cm === undefined || !Number.isFinite(cm)) return '—'
  return `${formatNumero(cmToUnit(cm, unit), unit === 'in' ? 1 : 0)} ${unit}`
}

/** Indice di massa corporea, se conosciamo l'altezza. */
export function calcolaImc(kg: number, altezzaCm: number | null): number | null {
  if (!altezzaCm || altezzaCm <= 0) return null
  const m = altezzaCm / 100
  return kg / (m * m)
}

export function categoriaImc(imc: number): string {
  if (imc < 18.5) return 'sottopeso'
  if (imc < 25) return 'normopeso'
  if (imc < 30) return 'sovrappeso'
  return 'obesita'
}
