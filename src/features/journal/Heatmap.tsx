import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import { formatData, inizioSettimana, oggiISO, sommaGiorni, toISO } from '@/lib/format'
import type { ISODate } from '@/types'

interface Props {
  /** giorni in cui l'abitudine risulta fatta */
  giorni: Set<ISODate>
  /** quante settimane mostrare (di default circa quattro mesi) */
  settimane?: number
  etichetta: string
  onSeleziona?: (data: ISODate) => void
}

/**
 * Griglia in stile GitHub: una colonna per settimana, una riga per giorno.
 * Serve a vedere a colpo d'occhio la costanza degli ultimi mesi.
 */
export function Heatmap({ giorni, settimane = 18, etichetta, onSeleziona }: Props) {
  const oggi = oggiISO()

  const colonne = useMemo(() => {
    const primoLunedi = toISO(inizioSettimana(sommaGiorni(oggi, -(settimane - 1) * 7)))
    let mesePrecedente = ''
    return Array.from({ length: settimane }, (_, indiceSettimana) => {
      const giorni = Array.from({ length: 7 }, (_, indiceGiorno) =>
        sommaGiorni(primoLunedi, indiceSettimana * 7 + indiceGiorno),
      )
      // il nome del mese si scrive solo sulla prima colonna di quel mese
      const mese = formatData(giorni[0], 'MM')
      const etichettaMese = mese === mesePrecedente ? '' : formatData(giorni[0], 'MMM')
      mesePrecedente = mese
      return { giorni, etichettaMese }
    })
  }, [oggi, settimane])

  const totale = useMemo(
    () =>
      colonne
        .flatMap((c) => c.giorni)
        .filter((data) => data <= oggi && giorni.has(data)).length,
    [colonne, giorni, oggi],
  )

  return (
    <div className="space-y-1.5">
      <div className="flex gap-[3px] overflow-x-auto pb-1 no-scrollbar">
        {colonne.map((settimana) => {
          return (
            <div key={settimana.giorni[0]} className="flex flex-col gap-[3px]">
              <span className="h-3 text-[0.6rem] leading-3 text-ink-3">
                {settimana.etichettaMese}
              </span>
              {settimana.giorni.map((data) => {
                const futuro = data > oggi
                const fatta = giorni.has(data)
                const contenuto = (
                  <span
                    className={cn(
                      'block h-3 w-3 rounded-[3px] transition-colors sm:h-3.5 sm:w-3.5',
                      futuro
                        ? 'bg-transparent'
                        : fatta
                          ? 'bg-accent-500'
                          : 'bg-ink-3/15',
                      data === oggi && 'ring-1 ring-accent-600 ring-offset-1 ring-offset-card',
                    )}
                  />
                )
                if (futuro) return <span key={data}>{contenuto}</span>
                const titolo = `${formatData(data, 'EEEE d MMMM')}: ${fatta ? 'fatta' : 'non fatta'}`
                return onSeleziona ? (
                  <button
                    key={data}
                    type="button"
                    title={titolo}
                    aria-label={titolo}
                    onClick={() => onSeleziona(data)}
                  >
                    {contenuto}
                  </button>
                ) : (
                  <span key={data} title={titolo}>
                    {contenuto}
                  </span>
                )
              })}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-ink-3">
        {etichetta}: {totale} {totale === 1 ? 'giorno' : 'giorni'} negli ultimi{' '}
        {settimane} settimane
      </p>
    </div>
  )
}
