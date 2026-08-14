import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  ListTodo,
  Minus,
  Scale,
  TrendingDown,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { IconButton } from '@/components/ui/Button'
import { StatCard } from '@/components/ui/Controls'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { PageHeader, SectionTitle } from '@/components/ui/PageHeader'
import { cn } from '@/lib/cn'
import {
  capitalizza,
  formatData,
  formatNumeroCompatto,
  inizioSettimana,
  NOMI_GIORNI,
  oggiISO,
  plurale,
  sommaGiorni,
  toISO,
} from '@/lib/format'
import { formatDeltaPeso } from '@/lib/units'
import { useProfilo } from '@/features/settings/hooks'
import { formatDurata } from '@/features/workouts/statistiche'
import { EMOJI_UMORE } from '@/features/journal/CalendarioDiario'
import type { Mood } from '@/types'
import { useRiepilogoSettimana } from './hooks'
import { etichettaSettimana, type GiornoSettimana } from './statistiche'

/** Pallini della striscia Lun→Dom: uno per tipo di attività. */
const SEGNI: {
  chiave: keyof Pick<GiornoSettimana, 'peso' | 'allenamento' | 'diario' | 'abitudiniComplete'>
  etichetta: string
  icona: LucideIcon
  classe: string
}[] = [
  { chiave: 'peso', etichetta: 'peso registrato', icona: Scale, classe: 'bg-sky-500' },
  { chiave: 'allenamento', etichetta: 'allenamento', icona: Dumbbell, classe: 'bg-accent-600' },
  { chiave: 'abitudiniComplete', etichetta: 'abitudini tutte spuntate', icona: Flame, classe: 'bg-amber-500' },
  { chiave: 'diario', etichetta: 'diario scritto', icona: BookOpen, classe: 'bg-violet-500' },
]

function StrisciaGiorni({ giorni }: { giorni: GiornoSettimana[] }) {
  const oggi = oggiISO()
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {giorni.map((giorno, indice) => {
        const attivi = SEGNI.filter((s) => giorno[s.chiave])
        const descrizione =
          attivi.length === 0
            ? 'niente registrato'
            : attivi.map((s) => s.etichetta).join(', ')
        return (
          <div
            key={giorno.data}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl border py-2',
              giorno.data === oggi
                ? 'border-accent-500/60 bg-accent-500/[0.06]'
                : 'border-line',
              giorno.futuro && 'opacity-45',
            )}
          >
            <span className="sr-only">
              {formatData(giorno.data, 'EEEE d MMMM')}: {descrizione}
            </span>
            <span aria-hidden className="text-[0.7rem] font-medium text-ink-3">
              {NOMI_GIORNI[indice]}
            </span>
            <span aria-hidden className="flex min-h-[1.25rem] flex-wrap justify-center gap-1">
              {giorno.futuro ? (
                <span className="mt-1.5 h-1 w-3 rounded-full bg-line" />
              ) : attivi.length === 0 ? (
                <span className="mt-1.5 h-1 w-3 rounded-full bg-line" />
              ) : (
                attivi.map((s) => (
                  <span key={s.chiave} className={cn('h-2 w-2 rounded-full', s.classe)} />
                ))
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function SettimanaPage() {
  const { profilo } = useProfilo()
  const [lunedi, setLunedi] = useState(() => toISO(inizioSettimana(new Date())))
  const { settimana, scorsa, giorni, confronti, frase, caricamento } =
    useRiepilogoSettimana(lunedi)

  const lunediCorrente = toISO(inizioSettimana(new Date()))
  const delta = settimana.peso.delta

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        titolo="La tua settimana"
        sottotitolo={
          settimana.inCorso
            ? 'Come sta andando, in un colpo d’occhio'
            : capitalizza(formatData(settimana.inizio, 'MMMM yyyy'))
        }
      />

      {/* ------------------------- scelta settimana ------------------------ */}
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-card p-2">
        <IconButton
          etichetta="Settimana precedente"
          onClick={() => setLunedi((l) => sommaGiorni(l, -7))}
        >
          <ChevronLeft className="h-5 w-5" />
        </IconButton>

        <div className="min-w-0 text-center">
          <p className="truncate font-semibold text-ink">
            {etichettaSettimana(settimana.inizio, settimana.fine)}
          </p>
          {settimana.inCorso ? (
            <p className="text-xs text-ink-3">settimana in corso</p>
          ) : (
            <button
              type="button"
              onClick={() => setLunedi(lunediCorrente)}
              className="text-xs text-accent-600 underline-offset-2 hover:underline dark:text-accent-300"
            >
              Torna a questa settimana
            </button>
          )}
        </div>

        <IconButton
          etichetta="Settimana successiva"
          disabled={lunedi >= lunediCorrente}
          onClick={() => setLunedi((l) => sommaGiorni(l, 7))}
        >
          <ChevronRight className="h-5 w-5" />
        </IconButton>
      </div>

      {caricamento ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card h-[5.5rem] animate-pulse" />
            ))}
          </div>
          <Skeleton className="h-24 w-full" />
        </div>
      ) : settimana.vuota ? (
        <EmptyState
          icona={<CalendarRange className="h-7 w-7" />}
          titolo="In questa settimana non c’è niente"
          descrizione={
            settimana.inCorso
              ? 'Registra un peso, un allenamento o due righe di diario: qui vedrai comparire il riepilogo giorno per giorno.'
              : 'Non avevi registrato nulla in questi sette giorni. Usa le frecce qui sopra per spostarti su un’altra settimana.'
          }
        />
      ) : (
        <>
          {/* ---------------------------- numeri ---------------------------- */}
          <section aria-label="Riepilogo" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              etichetta="Peso"
              valore={
                delta === null
                  ? '—'
                  : formatDeltaPeso(delta, profilo.weight_unit)
              }
              dettaglio={
                settimana.peso.misurazioni === 0
                  ? 'Nessuna misurazione'
                  : plurale(settimana.peso.misurazioni, 'misurazione', 'misurazioni')
              }
              tono={delta === null || Math.abs(delta) < 0.05 ? 'neutro' : 'accento'}
              icona={<Scale className="h-4 w-4" />}
            />
            <StatCard
              etichetta="Allenamenti"
              valore={formatDurata(settimana.allenamenti.minuti)}
              dettaglio={
                settimana.allenamenti.sessioni === 0
                  ? 'Nessuna sessione'
                  : `${plurale(settimana.allenamenti.sessioni, 'sessione', 'sessioni')} in ${plurale(settimana.allenamenti.giorni, 'giorno', 'giorni')}`
              }
              tono={settimana.allenamenti.minuti > 0 ? 'accento' : 'neutro'}
              icona={<Dumbbell className="h-4 w-4" />}
            />
            <StatCard
              etichetta="Task completate"
              valore={settimana.task.completate}
              dettaglio={
                scorsa.task.completate === 0
                  ? undefined
                  : `Settimana scorsa: ${scorsa.task.completate}`
              }
              icona={<ListTodo className="h-4 w-4" />}
            />
            <StatCard
              etichetta="Abitudini"
              valore={
                settimana.abitudini.possibili === 0
                  ? '—'
                  : `${settimana.abitudini.fatte}/${settimana.abitudini.possibili}`
              }
              dettaglio={
                settimana.abitudini.giorniPieni > 0
                  ? `${plurale(settimana.abitudini.giorniPieni, 'giorno pieno', 'giorni pieni')}`
                  : settimana.abitudini.possibili === 0
                    ? 'Nessuna abitudine attiva'
                    : 'Nessun giorno completo'
              }
              tono={
                settimana.abitudini.possibili > 0 &&
                settimana.abitudini.fatte === settimana.abitudini.possibili
                  ? 'positivo'
                  : 'neutro'
              }
              icona={<Flame className="h-4 w-4" />}
            />
          </section>

          {/* ----------------------- frase di sintesi ----------------------- */}
          {frase && (
            <p className="rounded-2xl border border-line bg-elev px-4 py-3 text-sm text-ink-2">
              {frase}
            </p>
          )}

          {/* --------------------- la settimana in fila --------------------- */}
          <section className="card space-y-3 p-4 sm:p-5" aria-labelledby="titolo-giorni">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 id="titolo-giorni" className="font-semibold text-ink">
                Giorno per giorno
              </h2>
              <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-3">
                {SEGNI.map((s) => (
                  <li key={s.chiave} className="flex items-center gap-1.5">
                    <span aria-hidden className={cn('h-2 w-2 rounded-full', s.classe)} />
                    {s.etichetta}
                  </li>
                ))}
              </ul>
            </div>
            <StrisciaGiorni giorni={giorni} />
          </section>

          {/* ------------------ confronto con la scorsa --------------------- */}
          <section className="space-y-3">
            <SectionTitle>Rispetto alla settimana scorsa</SectionTitle>
            <ul className="card divide-y divide-line">
              {confronti.map((c) => (
                <li
                  key={c.chiave}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <span className="text-sm text-ink">{capitalizza(c.etichetta)}</span>
                  <span
                    className={cn(
                      'tnum flex shrink-0 items-center gap-1.5 text-sm font-medium',
                      c.verso === 'meglio'
                        ? 'text-success'
                        : c.verso === 'peggio'
                          ? 'text-danger'
                          : 'text-ink-3',
                    )}
                  >
                    {c.verso === 'meglio' ? (
                      <TrendingUp className="h-4 w-4" aria-hidden />
                    ) : c.verso === 'peggio' ? (
                      <TrendingDown className="h-4 w-4" aria-hidden />
                    ) : (
                      <Minus className="h-4 w-4" aria-hidden />
                    )}
                    {c.chiave === 'allenamenti'
                      ? `${c.differenza > 0 ? '+' : c.differenza < 0 ? '−' : ''}${formatDurata(Math.abs(c.differenza))}`
                      : `${c.differenza > 0 ? '+' : c.differenza < 0 ? '−' : ''}${Math.abs(c.differenza)}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* -------------------------- il resto ---------------------------- */}
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="card min-w-0 p-4">
              <h3 className="mb-2 flex items-center gap-2 font-semibold text-ink">
                <UtensilsCrossed
                  className="h-4 w-4 text-accent-600 dark:text-accent-300"
                  aria-hidden
                />
                Pasti pianificati
              </h3>
              {settimana.pasti.pianificati === 0 ? (
                <p className="text-sm text-ink-2">
                  Nessun pasto in calendario.{' '}
                  <Link
                    to="/piano"
                    className="font-medium text-accent-600 hover:underline dark:text-accent-300"
                  >
                    Genera un menù
                  </Link>
                  .
                </p>
              ) : (
                <p className="text-sm text-ink-2">
                  <strong className="tnum text-ink">{settimana.pasti.pianificati}</strong>{' '}
                  {settimana.pasti.pianificati === 1 ? 'pasto' : 'pasti'} su{' '}
                  {plurale(settimana.pasti.giorniCoperti, 'giorno', 'giorni')}
                  {settimana.pasti.calorieMedie !== null && (
                    <>
                      , in media{' '}
                      <strong className="tnum text-ink">
                        {formatNumeroCompatto(settimana.pasti.calorieMedie, 0)} kcal
                      </strong>{' '}
                      al giorno
                      {profilo.calorie_goal !== null && (
                        <> sulle {formatNumeroCompatto(profilo.calorie_goal, 0)} previste</>
                      )}
                    </>
                  )}
                  .
                </p>
              )}
            </div>

            <div className="card min-w-0 p-4">
              <h3 className="mb-2 flex items-center gap-2 font-semibold text-ink">
                <BookOpen
                  className="h-4 w-4 text-accent-600 dark:text-accent-300"
                  aria-hidden
                />
                Diario e umore
              </h3>
              {settimana.diario.giorni === 0 ? (
                <p className="text-sm text-ink-2">
                  Nessuna nota questa settimana.{' '}
                  <Link
                    to="/diario"
                    className="font-medium text-accent-600 hover:underline dark:text-accent-300"
                  >
                    Scrivine una
                  </Link>
                  .
                </p>
              ) : (
                <p className="flex items-center gap-2 text-sm text-ink-2">
                  {settimana.diario.umoreMedio !== null && (
                    <span aria-hidden className="text-2xl">
                      {EMOJI_UMORE[Math.round(settimana.diario.umoreMedio) as Mood]}
                    </span>
                  )}
                  <span>
                    Hai scritto in{' '}
                    <strong className="tnum text-ink">
                      {plurale(settimana.diario.giorni, 'giorno', 'giorni')}
                    </strong>
                    {settimana.abitudini.migliore && (
                      <>
                        {' · '}
                        {settimana.abitudini.migliore.emoji}{' '}
                        {settimana.abitudini.migliore.nome}{' '}
                        {settimana.abitudini.migliore.giorni}/
                        {settimana.abitudini.giorniConsiderati}
                      </>
                    )}
                  </span>
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
