import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Minus,
  Pencil,
  Plus,
  Scale,
  Target,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SegmentedControl, StatCard } from '@/components/ui/Controls'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState, ErrorState, SkeletonLista } from '@/components/ui/Feedback'
import { PageHeader, SectionTitle } from '@/components/ui/PageHeader'
import { SottoNavSalute } from '@/components/layout/SottoNavigazione'
import { SwipeRow } from '@/components/ui/SwipeRow'
import { useAperturaRapida } from '@/lib/aperturaRapida'
import { dataRelativa, formatData, formatNumero, plurale } from '@/lib/format'
import { calcolaImc, categoriaImc, formatDeltaPeso, formatPeso } from '@/lib/units'
import { useProfilo } from '@/features/settings/hooks'
import { GraficoPeso } from './GraficoPeso'
import { ModuloPeso } from './ModuloPeso'
import { useEliminaPeso, usePesi } from './hooks'
import { PERIODI, calcolaStatistiche, filtraPerPeriodo, serieGrafico } from './statistiche'
import type { WeightEntry, WeightRange } from '@/types'

export function PesoPage() {
  const { pesi, caricamento, errore, ricarica } = usePesi()
  const { profilo } = useProfilo()
  const elimina = useEliminaPeso()

  const [apertoDaFab, chiudiFab] = useAperturaRapida()
  const [inModifica, setInModifica] = useState<WeightEntry | null>(null)
  const [moduloAperto, setModuloAperto] = useState(false)
  const [daEliminare, setDaEliminare] = useState<WeightEntry | null>(null)
  const [periodo, setPeriodo] = useState<WeightRange>('30g')

  const unita = profilo.weight_unit
  const nelPeriodo = useMemo(() => filtraPerPeriodo(pesi, periodo), [pesi, periodo])
  const serie = useMemo(() => serieGrafico(nelPeriodo), [nelPeriodo])
  const statistiche = useMemo(
    () => calcolaStatistiche(pesi, nelPeriodo, profilo.weight_goal_kg),
    [pesi, nelPeriodo, profilo.weight_goal_kg],
  )
  const recenti = useMemo(() => [...pesi].reverse(), [pesi])

  const aperto = moduloAperto || apertoDaFab
  function chiudiModulo() {
    setModuloAperto(false)
    setInModifica(null)
    if (apertoDaFab) chiudiFab()
  }

  const imc = statistiche.attuale
    ? calcolaImc(Number(statistiche.attuale.weight_kg), profilo.height_cm)
    : null

  return (
    <div className="space-y-6">
      <PageHeader
        titolo="Peso"
        sottotitolo={
          statistiche.attuale
            ? `Ultima misurazione ${dataRelativa(statistiche.attuale.date).toLowerCase()}`
            : 'Registra il tuo peso per vedere i progressi'
        }
        azioni={
          <Button
            className="hidden sm:inline-flex"
            iconaSinistra={<Plus className="h-4 w-4" />}
            onClick={() => {
              setInModifica(null)
              setModuloAperto(true)
            }}
          >
            Registra peso
          </Button>
        }
      />

      <SottoNavSalute />

      {errore ? (
        <ErrorState messaggio={errore.message} onRiprova={() => void ricarica()} />
      ) : caricamento ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card h-[5.5rem] animate-pulse" />
            ))}
          </div>
          <div className="card h-[320px] animate-pulse" />
          <SkeletonLista />
        </div>
      ) : pesi.length === 0 ? (
        <EmptyState
          icona={<Scale className="h-7 w-7" />}
          titolo="Nessuna misurazione"
          descrizione="Registra il peso di oggi: bastano pochi secondi. Dopo qualche giorno vedrai comparire il grafico dell’andamento, la media a 7 giorni e le statistiche."
          azione={
            <Button
              iconaSinistra={<Plus className="h-4 w-4" />}
              onClick={() => setModuloAperto(true)}
            >
              Registra il primo peso
            </Button>
          }
        />
      ) : (
        <>
          {/* ---------------- statistiche ---------------- */}
          <section aria-label="Statistiche" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              etichetta="Peso attuale"
              valore={formatPeso(Number(statistiche.attuale?.weight_kg), unita)}
              dettaglio={
                statistiche.attuale ? dataRelativa(statistiche.attuale.date) : undefined
              }
              icona={<Scale className="h-4 w-4" />}
            />
            <StatCard
              etichetta="Ultima settimana"
              valore={
                statistiche.deltaSettimana === null
                  ? '—'
                  : formatDeltaPeso(statistiche.deltaSettimana, unita)
              }
              dettaglio={statistiche.deltaSettimana === null ? 'Dati insufficienti' : 'Rispetto a 7 giorni fa'}
              tono={
                statistiche.deltaSettimana === null
                  ? 'neutro'
                  : statistiche.deltaSettimana < 0
                    ? 'positivo'
                    : statistiche.deltaSettimana > 0
                      ? 'negativo'
                      : 'neutro'
              }
              icona={
                statistiche.deltaSettimana === null ? (
                  <Minus className="h-4 w-4" />
                ) : statistiche.deltaSettimana < 0 ? (
                  <ArrowDownRight className="h-4 w-4" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )
              }
            />
            <StatCard
              etichetta="Ultimo mese"
              valore={
                statistiche.deltaMese === null
                  ? '—'
                  : formatDeltaPeso(statistiche.deltaMese, unita)
              }
              dettaglio={statistiche.deltaMese === null ? 'Dati insufficienti' : 'Rispetto a 30 giorni fa'}
              tono={
                statistiche.deltaMese === null
                  ? 'neutro'
                  : statistiche.deltaMese < 0
                    ? 'positivo'
                    : statistiche.deltaMese > 0
                      ? 'negativo'
                      : 'neutro'
              }
              icona={
                statistiche.deltaMese === null ? (
                  <Minus className="h-4 w-4" />
                ) : statistiche.deltaMese < 0 ? (
                  <ArrowDownRight className="h-4 w-4" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )
              }
            />
            <StatCard
              etichetta="Min / max del periodo"
              valore={
                <span className="whitespace-nowrap text-base sm:text-xl">
                  {formatPeso(Number(statistiche.minimo?.weight_kg), unita, {
                    senzaUnita: true,
                  })}{' '}
                  <span className="text-ink-3">/</span>{' '}
                  {formatPeso(Number(statistiche.massimo?.weight_kg), unita)}
                </span>
              }
              dettaglio={PERIODI.find((p) => p.valore === periodo)?.etichetta}
            />
          </section>

          {/* ---------------- obiettivo ---------------- */}
          {profilo.weight_goal_kg === null ? (
            <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/12 text-accent-600 dark:text-accent-300">
                  <Target className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="font-medium text-ink">Nessun obiettivo impostato</p>
                  <p className="text-sm text-ink-3">
                    Impostalo per vedere quanto manca e una stima della data.
                  </p>
                </div>
              </div>
              <Link
                to="/impostazioni"
                className="tap inline-flex items-center justify-center rounded-lg border border-line bg-card px-3 text-sm font-medium text-ink transition-colors hover:bg-elev"
              >
                Imposta obiettivo
              </Link>
            </div>
          ) : (
            <div className="card flex flex-wrap items-center gap-4 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/12 text-accent-600 dark:text-accent-300">
                <Target className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 basis-48">
                <p className="font-medium text-ink">
                  Obiettivo {formatPeso(profilo.weight_goal_kg, unita)}
                </p>
                <p className="text-sm text-ink-2">
                  {statistiche.obiettivoRaggiunto ? (
                    <span className="font-medium text-success">Obiettivo raggiunto! 🎉</span>
                  ) : statistiche.mancanoAllObiettivo !== null ? (
                    <>
                      {statistiche.mancanoAllObiettivo > 0 ? 'Mancano ' : 'Sei sotto di '}
                      <strong className="text-ink">
                        {formatPeso(Math.abs(statistiche.mancanoAllObiettivo), unita)}
                      </strong>
                    </>
                  ) : null}
                  {statistiche.tendenza && Math.abs(statistiche.tendenza.kgASettimana) >= 0.05 && (
                    <>
                      {' · '}
                      {statistiche.tendenza.kgASettimana < 0 ? 'stai calando' : 'stai salendo'} di{' '}
                      {formatNumero(Math.abs(statistiche.tendenza.kgASettimana), 2)} kg a settimana
                    </>
                  )}
                </p>
              </div>
              {statistiche.dataStimata && (
                <div className="flex w-full items-center gap-2 rounded-xl bg-elev px-3 py-2 text-sm sm:w-auto">
                  <CalendarClock className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
                  <span className="text-ink-2">
                    Stima:{' '}
                    <strong className="text-ink">{formatData(statistiche.dataStimata)}</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ---------------- grafico ---------------- */}
          <section className="card space-y-4 p-4 sm:p-5" aria-labelledby="titolo-grafico">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="titolo-grafico" className="font-semibold text-ink">
                Andamento
              </h2>
              <SegmentedControl
                etichetta="Periodo del grafico"
                className="w-full sm:w-auto"
                dimensione="sm"
                opzioni={PERIODI.map((p) => ({ valore: p.valore, etichetta: p.breve }))}
                valore={periodo}
                onChange={setPeriodo}
              />
            </div>

            {serie.length === 0 ? (
              <p className="py-12 text-center text-sm text-ink-3">
                Nessuna misurazione in questo periodo.
              </p>
            ) : (
              <>
                <p className="sr-only">
                  {`Grafico del peso: ${plurale(serie.length, 'misurazione', 'misurazioni')} tra il ${formatData(serie[0].date)} e il ${formatData(serie[serie.length - 1].date)}. Minimo ${formatPeso(Number(statistiche.minimo?.weight_kg), unita)}, massimo ${formatPeso(Number(statistiche.massimo?.weight_kg), unita)}.`}
                </p>
                <GraficoPeso
                  serie={serie}
                  unita={unita}
                  obiettivoKg={profilo.weight_goal_kg}
                  etichetteCompatte={periodo === '1a' || periodo === 'tutto'}
                />
                <div className="flex flex-wrap items-center gap-4 text-xs text-ink-3">
                  <span className="flex items-center gap-1.5">
                    <span className="h-0.5 w-5 rounded bg-accent-600" aria-hidden />
                    Peso registrato
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-0 w-5 border-t-2 border-dashed border-ink-3"
                      aria-hidden
                    />
                    Media a 7 giorni
                  </span>
                  {profilo.weight_goal_kg !== null && (
                    <span className="flex items-center gap-1.5">
                      <span className="h-0 w-5 border-t-2 border-dashed border-warn" aria-hidden />
                      Obiettivo
                    </span>
                  )}
                </div>
              </>
            )}
          </section>

          {/* ---------------- elenco ---------------- */}
          <section className="space-y-3" aria-labelledby="titolo-elenco">
            <SectionTitle>
              <span id="titolo-elenco">Tutte le misurazioni ({pesi.length})</span>
            </SectionTitle>

            {imc !== null && (
              <p className="text-sm text-ink-3">
                Con {formatPeso(Number(statistiche.attuale?.weight_kg), unita)} e un’altezza di{' '}
                {formatNumero(profilo.height_cm ?? 0, 0)} cm il tuo indice di massa corporea è{' '}
                <strong className="text-ink-2">{formatNumero(imc, 1)}</strong> (
                {categoriaImc(imc)}).
              </p>
            )}

            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {recenti.map((misurazione, indice) => {
                  const precedente = recenti[indice + 1]
                  const delta = precedente
                    ? Number(misurazione.weight_kg) - Number(precedente.weight_kg)
                    : null
                  return (
                    <motion.li
                      key={misurazione.id}
                      layout
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <SwipeRow
                        azioni={[
                          {
                            etichetta: 'Modifica',
                            icona: Pencil,
                            onClick: () => {
                              setInModifica(misurazione)
                              setModuloAperto(true)
                            },
                          },
                          {
                            etichetta: 'Elimina',
                            icona: Trash2,
                            tono: 'pericolo',
                            onClick: () => setDaEliminare(misurazione),
                          },
                        ]}
                      >
                        <div className="card flex items-center gap-3 p-3.5 sm:p-4">
                          <button
                            type="button"
                            onClick={() => {
                              setInModifica(misurazione)
                              setModuloAperto(true)
                            }}
                            className="min-w-0 flex-1 text-left"
                            aria-label={`Modifica la misurazione del ${formatData(misurazione.date, 'd MMMM yyyy')}`}
                          >
                            <p className="tnum font-semibold text-ink">
                              {formatPeso(Number(misurazione.weight_kg), unita)}
                              {delta !== null && Math.abs(delta) >= 0.05 && (
                                <span
                                  className={
                                    delta < 0
                                      ? 'ml-2 text-sm font-medium text-success'
                                      : 'ml-2 text-sm font-medium text-danger'
                                  }
                                >
                                  {formatDeltaPeso(delta, unita)}
                                </span>
                              )}
                            </p>
                            <p className="mt-0.5 text-sm text-ink-3">
                              {formatData(misurazione.date, 'EEE d MMM yyyy')}
                              {misurazione.body_fat !== null &&
                                ` · massa grassa ${formatNumero(Number(misurazione.body_fat), 1)}%`}
                            </p>
                            {misurazione.note && (
                              <p className="mt-1 line-clamp-2 text-sm italic text-ink-2">
                                “{misurazione.note}”
                              </p>
                            )}
                          </button>

                          <div className="hidden shrink-0 items-center gap-1 sm:flex">
                            <button
                              type="button"
                              aria-label={`Modifica la misurazione del ${formatData(misurazione.date, 'd MMMM yyyy')}`}
                              onClick={() => {
                                setInModifica(misurazione)
                                setModuloAperto(true)
                              }}
                              className="tap rounded-xl p-2 text-ink-3 transition-colors hover:bg-elev hover:text-ink"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Elimina la misurazione del ${formatData(misurazione.date, 'd MMMM yyyy')}`}
                              onClick={() => setDaEliminare(misurazione)}
                              className="tap rounded-xl p-2 text-ink-3 transition-colors hover:bg-danger/10 hover:text-danger"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </SwipeRow>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>
          </section>
        </>
      )}

      <ModuloPeso aperto={aperto} onChiudi={chiudiModulo} misurazione={inModifica} />

      <ConfirmDialog
        aperto={daEliminare !== null}
        onChiudi={() => setDaEliminare(null)}
        titolo="Eliminare la misurazione?"
        descrizione={
          daEliminare
            ? `Stai per eliminare la misurazione del ${formatData(daEliminare.date, 'd MMMM yyyy')}. L’operazione non si può annullare.`
            : ''
        }
        etichettaConferma="Elimina"
        pericoloso
        onConferma={() => {
          if (daEliminare) elimina.mutate(daEliminare.id)
        }}
      />
    </div>
  )
}
