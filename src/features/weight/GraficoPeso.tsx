import { useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useColoriGrafico } from '@/lib/coloriGrafico'
import { formatData } from '@/lib/format'
import { formatPeso, kgToUnit } from '@/lib/units'
import type { WeightUnit } from '@/types'
import type { PuntoGrafico } from './statistiche'

interface Props {
  serie: PuntoGrafico[]
  unita: WeightUnit
  obiettivoKg: number | null
  /** true quando il periodo scelto copre piu' di qualche settimana */
  etichetteCompatte?: boolean
}

function Riquadro({
  active,
  payload,
  unita,
}: {
  active?: boolean
  payload?: { payload: PuntoGrafico }[]
  unita: WeightUnit
}) {
  if (!active || !payload || payload.length === 0) return null
  const punto = payload[0].payload
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2 shadow-lift">
      <p className="text-xs font-medium text-ink-3">{formatData(punto.date, 'EEE d MMM yyyy')}</p>
      <p className="tnum mt-0.5 text-sm font-semibold text-ink">
        {formatPeso(punto.peso, unita)}
      </p>
      {punto.media !== null && (
        <p className="tnum text-xs text-ink-3">
          media 7 giorni {formatPeso(punto.media, unita)}
        </p>
      )}
    </div>
  )
}

export function GraficoPeso({ serie, unita, obiettivoKg, etichetteCompatte }: Props) {
  const colori = useColoriGrafico()

  // Recharts lavora sui numeri mostrati: convertiamo qui una volta sola.
  const dati = useMemo(
    () =>
      serie.map((punto) => ({
        ...punto,
        peso: kgToUnit(punto.peso, unita),
        media: punto.media === null ? null : kgToUnit(punto.media, unita),
      })),
    [serie, unita],
  )

  const obiettivo = obiettivoKg === null ? null : kgToUnit(obiettivoKg, unita)

  const dominio = useMemo<[number, number]>(() => {
    const valori = dati.flatMap((d) => [d.peso, ...(d.media !== null ? [d.media] : [])])
    if (obiettivo !== null) valori.push(obiettivo)
    if (valori.length === 0) return [0, 1]
    const min = Math.min(...valori)
    const max = Math.max(...valori)
    const margine = Math.max((max - min) * 0.15, unita === 'lb' ? 2 : 0.8)
    return [Number((min - margine).toFixed(1)), Number((max + margine).toFixed(1))]
  }, [dati, obiettivo, unita])

  return (
    <div className="h-[260px] w-full sm:h-[320px]" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dati} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={colori.griglia} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(valore: number) =>
              formatData(new Date(valore), etichetteCompatte ? 'MMM yy' : 'd MMM')
            }
            tick={{ fill: colori.testo, fontSize: 11 }}
            axisLine={{ stroke: colori.griglia }}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            domain={dominio}
            tick={{ fill: colori.testo, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={46}
            tickFormatter={(valore: number) =>
              new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(valore)
            }
          />
          <Tooltip
            content={({ active, payload }) => (
              <Riquadro
                active={active}
                payload={payload as unknown as { payload: PuntoGrafico }[] | undefined}
                unita={unita}
              />
            )}
            cursor={{ stroke: colori.griglia, strokeWidth: 1 }}
          />

          {obiettivo !== null && (
            <ReferenceLine
              y={obiettivo}
              stroke={colori.obiettivo}
              strokeDasharray="7 5"
              strokeWidth={1.5}
              label={{
                value: `Obiettivo ${new Intl.NumberFormat('it-IT', {
                  maximumFractionDigits: 1,
                }).format(obiettivo)}`,
                position: 'insideTopRight',
                fill: colori.obiettivo,
                fontSize: 11,
              }}
            />
          )}

          <Line
            type="monotone"
            dataKey="media"
            stroke={colori.media}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            activeDot={false}
            connectNulls
            isAnimationActive={false}
            name="Media 7 giorni"
          />
          <Line
            type="monotone"
            dataKey="peso"
            stroke={colori.accento}
            strokeWidth={2.4}
            dot={dati.length <= 45 ? { r: 3, fill: colori.accento, strokeWidth: 0 } : false}
            activeDot={{ r: 5, fill: colori.accento, stroke: colori.sfondoCard, strokeWidth: 2 }}
            isAnimationActive={false}
            name="Peso"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
