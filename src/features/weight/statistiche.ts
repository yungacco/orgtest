import { differenceInCalendarDays } from 'date-fns'
import { fromISO, oggiISO, sommaGiorni, toISO } from '@/lib/format'
import type { ISODate, WeightEntry, WeightRange } from '@/types'

export interface PuntoGrafico {
  date: ISODate
  /** in millisecondi: serve a Recharts per distanziare correttamente i punti */
  t: number
  peso: number
  /** media mobile a 7 giorni, null nei primi giorni in cui non e' calcolabile */
  media: number | null
}

export const PERIODI: {
  valore: WeightRange
  etichetta: string
  /** versione corta, usata nei pulsanti stretti del telefono */
  breve: string
  giorni: number | null
}[] = [
  { valore: '7g', etichetta: '7 giorni', breve: '7 g', giorni: 7 },
  { valore: '30g', etichetta: '30 giorni', breve: '30 g', giorni: 30 },
  { valore: '3m', etichetta: '3 mesi', breve: '3 mesi', giorni: 90 },
  { valore: '1a', etichetta: '1 anno', breve: '1 anno', giorni: 365 },
  { valore: 'tutto', etichetta: 'Tutto', breve: 'Tutto', giorni: null },
]

export function filtraPerPeriodo(
  pesi: WeightEntry[],
  periodo: WeightRange,
): WeightEntry[] {
  const config = PERIODI.find((p) => p.valore === periodo)
  if (!config?.giorni) return pesi
  const limite = sommaGiorni(oggiISO(), -config.giorni + 1)
  return pesi.filter((p) => p.date >= limite)
}

/**
 * Media mobile "a finestra di giorni": per ogni misurazione fa la media di
 * tutte quelle degli ultimi 7 giorni di calendario (non delle ultime 7
 * misurazioni), cosi' il risultato non cambia se salti qualche giorno.
 */
export function serieGrafico(pesi: WeightEntry[], giorni = 7): PuntoGrafico[] {
  return pesi.map((punto, indice) => {
    const inizio = sommaGiorni(punto.date, -(giorni - 1))
    let somma = 0
    let conteggio = 0
    for (let i = indice; i >= 0; i--) {
      const altro = pesi[i]
      if (altro.date < inizio) break
      somma += Number(altro.weight_kg)
      conteggio++
    }
    return {
      date: punto.date,
      t: fromISO(punto.date).getTime(),
      peso: Number(punto.weight_kg),
      media: conteggio > 1 ? somma / conteggio : null,
    }
  })
}

/** Misurazione piu' vicina alla data indicata, entro una tolleranza. */
function vicinaA(
  pesi: WeightEntry[],
  data: ISODate,
  tolleranzaGiorni: number,
): WeightEntry | null {
  let migliore: WeightEntry | null = null
  let miglioreDistanza = Number.POSITIVE_INFINITY
  for (const peso of pesi) {
    const distanza = Math.abs(differenceInCalendarDays(fromISO(peso.date), fromISO(data)))
    if (distanza <= tolleranzaGiorni && distanza < miglioreDistanza) {
      migliore = peso
      miglioreDistanza = distanza
    }
  }
  return migliore
}

export interface Tendenza {
  /** variazione media in kg al giorno (negativa = stai calando) */
  kgAlGiorno: number
  kgASettimana: number
}

/**
 * Retta di tendenza (minimi quadrati) sulle ultime misurazioni.
 * Serve sia a dire "stai calando di 0,3 kg a settimana" sia a stimare
 * quando raggiungerai l'obiettivo.
 */
export function calcolaTendenza(pesi: WeightEntry[], giorni = 30): Tendenza | null {
  if (pesi.length < 3) return null
  const ultimo = pesi[pesi.length - 1]
  const inizio = sommaGiorni(ultimo.date, -giorni)
  const campione = pesi.filter((p) => p.date >= inizio)
  if (campione.length < 3) return null

  const base = fromISO(campione[0].date).getTime()
  const punti = campione.map((p) => ({
    x: (fromISO(p.date).getTime() - base) / 86_400_000,
    y: Number(p.weight_kg),
  }))
  const giorniCoperti = punti[punti.length - 1].x
  if (giorniCoperti < 5) return null

  const n = punti.length
  const sommaX = punti.reduce((acc, p) => acc + p.x, 0)
  const sommaY = punti.reduce((acc, p) => acc + p.y, 0)
  const sommaXY = punti.reduce((acc, p) => acc + p.x * p.y, 0)
  const sommaX2 = punti.reduce((acc, p) => acc + p.x * p.x, 0)
  const denominatore = n * sommaX2 - sommaX * sommaX
  if (denominatore === 0) return null

  const pendenza = (n * sommaXY - sommaX * sommaY) / denominatore
  return { kgAlGiorno: pendenza, kgASettimana: pendenza * 7 }
}

export interface StatistichePeso {
  attuale: WeightEntry | null
  /** differenza in kg rispetto a circa 7 e 30 giorni prima */
  deltaSettimana: number | null
  deltaMese: number | null
  minimo: WeightEntry | null
  massimo: WeightEntry | null
  tendenza: Tendenza | null
  /** kg che mancano all'obiettivo (positivo = devi ancora calare) */
  mancanoAllObiettivo: number | null
  /** stima di quando raggiungerai l'obiettivo mantenendo il ritmo attuale */
  dataStimata: ISODate | null
  obiettivoRaggiunto: boolean
}

export function calcolaStatistiche(
  tutti: WeightEntry[],
  nelPeriodo: WeightEntry[],
  obiettivoKg: number | null,
): StatistichePeso {
  const attuale = tutti.length > 0 ? tutti[tutti.length - 1] : null

  const settimana = attuale ? vicinaA(tutti, sommaGiorni(attuale.date, -7), 3) : null
  const mese = attuale ? vicinaA(tutti, sommaGiorni(attuale.date, -30), 7) : null

  const deltaSettimana =
    attuale && settimana && settimana.id !== attuale.id
      ? Number(attuale.weight_kg) - Number(settimana.weight_kg)
      : null
  const deltaMese =
    attuale && mese && mese.id !== attuale.id
      ? Number(attuale.weight_kg) - Number(mese.weight_kg)
      : null

  let minimo: WeightEntry | null = null
  let massimo: WeightEntry | null = null
  for (const peso of nelPeriodo) {
    if (!minimo || Number(peso.weight_kg) < Number(minimo.weight_kg)) minimo = peso
    if (!massimo || Number(peso.weight_kg) > Number(massimo.weight_kg)) massimo = peso
  }

  const tendenza = calcolaTendenza(tutti)

  let mancanoAllObiettivo: number | null = null
  let dataStimata: ISODate | null = null
  let obiettivoRaggiunto = false

  if (attuale && obiettivoKg !== null) {
    const differenza = Number(attuale.weight_kg) - obiettivoKg
    mancanoAllObiettivo = differenza
    obiettivoRaggiunto = Math.abs(differenza) < 0.15

    if (!obiettivoRaggiunto && tendenza && Math.abs(tendenza.kgAlGiorno) > 0.002) {
      const vaNellaDirezioneGiusta =
        (differenza > 0 && tendenza.kgAlGiorno < 0) ||
        (differenza < 0 && tendenza.kgAlGiorno > 0)
      if (vaNellaDirezioneGiusta) {
        const giorniNecessari = Math.abs(differenza / tendenza.kgAlGiorno)
        // oltre i 3 anni la stima non ha piu' alcun senso pratico
        if (giorniNecessari <= 365 * 3) {
          dataStimata = toISO(
            new Date(Date.now() + giorniNecessari * 86_400_000),
          )
        }
      }
    }
  }

  return {
    attuale,
    deltaSettimana,
    deltaMese,
    minimo,
    massimo,
    tendenza,
    mancanoAllObiettivo,
    dataStimata,
    obiettivoRaggiunto,
  }
}
