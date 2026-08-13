import { formatNumeroCompatto } from '@/lib/format'
import type { Ingredient, Recipe, ShoppingItem } from '@/types'

export interface VoceAggregata {
  name: string
  quantity: number | null
  unit: string | null
}

function chiave(nome: string, unita: string | null): string {
  const n = nome.trim().toLowerCase()
  const u = (unita ?? '').trim().toLowerCase()
  return `${n}|${u}`
}

/**
 * Unisce gli ingredienti di piu' ricette in un'unica lista.
 *
 * Regola: due voci si sommano solo se hanno lo STESSO nome e la STESSA unita'
 * di misura. "200 g di farina" + "100 g di farina" = "300 g di farina", ma
 * "2 cucchiai di olio" resta separato da "50 ml di olio", perche' sommarli
 * darebbe un numero senza senso.
 */
export function aggregaIngredienti(ingredienti: Ingredient[]): VoceAggregata[] {
  const mappa = new Map<string, VoceAggregata>()

  for (const ingrediente of ingredienti) {
    const nome = ingrediente.name.trim()
    if (!nome) continue
    const unita = ingrediente.unit?.trim() || null
    const k = chiave(nome, unita)
    const esistente = mappa.get(k)

    if (!esistente) {
      mappa.set(k, {
        name: nome,
        unit: unita,
        quantity: ingrediente.quantity === null ? null : Number(ingrediente.quantity),
      })
      continue
    }

    if (ingrediente.quantity !== null) {
      esistente.quantity = (esistente.quantity ?? 0) + Number(ingrediente.quantity)
    }
  }

  return [...mappa.values()].sort((a, b) => a.name.localeCompare(b.name, 'it'))
}

/** Tutti gli ingredienti delle ricette indicate, gia' raggruppati. */
export function ingredientiDaRicette(ricette: Recipe[]): VoceAggregata[] {
  return aggregaIngredienti(ricette.flatMap((r) => r.ingredients))
}

/** "Farina 300 g" — usata nella lista e nella copia come testo. */
export function descriviVoce(voce: {
  name: string
  quantity: number | null
  unit: string | null
}): string {
  const quantita =
    voce.quantity === null ? '' : ` ${formatNumeroCompatto(Number(voce.quantity), 2)}`
  const unita = voce.unit ? ` ${voce.unit}` : ''
  return `${voce.name}${quantita}${unita}`
}

/** Lista in testo semplice, pronta da incollare o condividere. */
export function listaComeTesto(voci: ShoppingItem[]): string {
  const daPrendere = voci.filter((v) => !v.checked)
  const prese = voci.filter((v) => v.checked)
  const righe = ['Lista della spesa', '']
  daPrendere.forEach((voce) => righe.push(`- ${descriviVoce(voce)}`))
  if (prese.length > 0) {
    righe.push('', 'Già presi:')
    prese.forEach((voce) => righe.push(`- ${descriviVoce(voce)}`))
  }
  return righe.join('\n')
}
