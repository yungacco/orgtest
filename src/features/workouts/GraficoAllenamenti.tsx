import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useColoriGrafico } from '@/lib/coloriGrafico'
import { formatData } from '@/lib/format'
import { formatDurata, type SettimanaAllenamenti } from './statistiche'

/** Minuti allenati per settimana: una barra per settimana, l'ultima e' quella in corso. */
export function GraficoAllenamenti({ settimane }: { settimane: SettimanaAllenamenti[] }) {
  const colori = useColoriGrafico()

  return (
    <div className="h-[200px] w-full sm:h-[240px]" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={settimane} margin={{ top: 8, right: 4, bottom: 0, left: -6 }}>
          <CartesianGrid stroke={colori.griglia} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="etichetta"
            tick={{ fill: colori.testo, fontSize: 11 }}
            axisLine={{ stroke: colori.griglia }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: colori.testo, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={38}
          />
          <Tooltip
            cursor={{ fill: colori.griglia, opacity: 0.35 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const punto = payload[0].payload as SettimanaAllenamenti
              return (
                <div className="rounded-xl border border-line bg-card px-3 py-2 shadow-lift">
                  <p className="text-xs font-medium text-ink-3">
                    Settimana del {formatData(punto.inizio, 'd MMM')}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-ink">
                    {formatDurata(punto.minuti)}
                  </p>
                  <p className="text-xs text-ink-3">
                    {punto.sessioni} {punto.sessioni === 1 ? 'allenamento' : 'allenamenti'}
                  </p>
                </div>
              )
            }}
          />
          <Bar dataKey="minuti" radius={[6, 6, 0, 0]} isAnimationActive={false}>
            {settimane.map((settimana, indice) => (
              <Cell
                key={settimana.inizio}
                // la settimana in corso e' ancora incompleta: la mostriamo piu' tenue
                fill={indice === settimane.length - 1 ? colori.accentoChiaro : colori.accento}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
