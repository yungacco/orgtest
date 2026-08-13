import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Dumbbell,
  Flame,
  Minus,
  Pencil,
  Plus,
  Timer,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Chip, StatCard } from '@/components/ui/Controls'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState, ErrorState, SkeletonLista } from '@/components/ui/Feedback'
import { PageHeader, SectionTitle } from '@/components/ui/PageHeader'
import { SottoNavSalute } from '@/components/layout/SottoNavigazione'
import { SwipeRow } from '@/components/ui/SwipeRow'
import { useAperturaRapida } from '@/lib/aperturaRapida'
import { cn } from '@/lib/cn'
import { capitalizza, dataRelativa, formatData, formatNumeroCompatto, plurale } from '@/lib/format'
import { GraficoAllenamenti } from './GraficoAllenamenti'
import { ModuloAllenamento } from './ModuloAllenamento'
import { useAllenamenti, useEliminaAllenamento } from './hooks'
import {
  calcolaStatistiche,
  emojiAttivita,
  formatDurata,
  perSettimana,
  totali,
} from './statistiche'
import type { Intensita, Workout } from '@/types'

/** Quante righe dell'elenco si aggiungono a ogni "mostra altri". */
const PASSO_ELENCO = 25

const COLORI_INTENSITA: Record<Intensita, string> = {
  leggera: 'bg-ink-3/50',
  media: 'bg-warn',
  alta: 'bg-danger',
}

export function AllenamentiPage() {
  const { allenamenti, caricamento, errore, ricarica } = useAllenamenti()
  const elimina = useEliminaAllenamento()

  const [apertoDaFab, chiudiFab] = useAperturaRapida()
  const [moduloAperto, setModuloAperto] = useState(false)
  const [inModifica, setInModifica] = useState<Workout | null>(null)
  const [daEliminare, setDaEliminare] = useState<Workout | null>(null)
  const [filtro, setFiltro] = useState<string | null>(null)
  const [quanteMostrarne, setQuanteMostrarne] = useState(PASSO_ELENCO)

  const statistiche = useMemo(() => calcolaStatistiche(allenamenti), [allenamenti])
  const settimane = useMemo(() => perSettimana(allenamenti, 10), [allenamenti])

  const tipi = useMemo(() => {
    const conteggio = new Map<string, number>()
    allenamenti.forEach((a) => {
      const nome = a.activity.trim()
      conteggio.set(nome, (conteggio.get(nome) ?? 0) + 1)
    })
    return [...conteggio.entries()].sort((a, b) => b[1] - a[1]).map(([nome]) => nome)
  }, [allenamenti])

  const visibili = useMemo(
    () =>
      filtro === null
        ? allenamenti
        : allenamenti.filter((a) => a.activity.trim() === filtro),
    [allenamenti, filtro],
  )

  /** Le righe raggruppate per mese: scorrere l'elenco resta leggibile. */
  const gruppi = useMemo(() => {
    const mappa = new Map<string, Workout[]>()
    visibili.forEach((a) => {
      const chiave = a.date.slice(0, 7)
      const elenco = mappa.get(chiave) ?? []
      elenco.push(a)
      mappa.set(chiave, elenco)
    })
    return [...mappa.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [visibili])

  /**
   * Dopo qualche mese gli allenamenti diventano centinaia: ne mostriamo un
   * blocco per volta, altrimenti la pagina diventa lenta da scorrere sul
   * telefono. Il totale scritto accanto al mese resta pero' quello vero,
   * anche se le righe visibili sono meno.
   */
  const gruppiVisibili = useMemo(() => {
    let restanti = quanteMostrarne
    const elenco: { mese: string; totaleMese: number; righe: Workout[] }[] = []
    for (const [mese, elementi] of gruppi) {
      if (restanti <= 0) break
      elenco.push({
        mese,
        totaleMese: totali(elementi).minuti,
        righe: elementi.slice(0, restanti),
      })
      restanti -= elementi.length
    }
    return elenco
  }, [gruppi, quanteMostrarne])

  const differenzaMinuti = statistiche.settimana.minuti - statistiche.settimanaScorsa.minuti

  const aperto = moduloAperto || apertoDaFab
  function chiudiModulo() {
    setModuloAperto(false)
    setInModifica(null)
    if (apertoDaFab) chiudiFab()
  }

  return (
    <div className="space-y-5">
      <PageHeader
        titolo="Allenamenti"
        sottotitolo={
          statistiche.ultimo
            ? `Ultimo: ${statistiche.ultimo.activity} · ${dataRelativa(statistiche.ultimo.date).toLowerCase()}`
            : 'Tieni traccia di quanto ti muovi'
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
            Registra allenamento
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
          <SkeletonLista righe={4} />
        </div>
      ) : allenamenti.length === 0 ? (
        <EmptyState
          icona={<Dumbbell className="h-7 w-7" />}
          titolo="Nessun allenamento registrato"
          descrizione="Segna cosa hai fatto e per quanto: bastano dieci secondi. Dopo qualche settimana vedrai comparire il grafico dei minuti e capirai davvero quanto ti muovi."
          azione={
            <Button
              iconaSinistra={<Plus className="h-4 w-4" />}
              onClick={() => setModuloAperto(true)}
            >
              Registra il primo allenamento
            </Button>
          }
        />
      ) : (
        <>
          {/* --------------------------- statistiche --------------------------- */}
          <section aria-label="Statistiche" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              etichetta="Questa settimana"
              valore={formatDurata(statistiche.settimana.minuti)}
              dettaglio={plurale(
                statistiche.settimana.sessioni,
                'allenamento',
                'allenamenti',
              )}
              icona={<Timer className="h-4 w-4" />}
            />
            <StatCard
              etichetta="Rispetto alla scorsa"
              valore={
                statistiche.settimanaScorsa.sessioni === 0 && differenzaMinuti === 0
                  ? '—'
                  : `${differenzaMinuti > 0 ? '+' : differenzaMinuti < 0 ? '−' : ''}${formatDurata(Math.abs(differenzaMinuti))}`
              }
              dettaglio={
                statistiche.settimanaScorsa.sessioni === 0
                  ? 'Settimana scorsa ferma'
                  : `Scorsa: ${formatDurata(statistiche.settimanaScorsa.minuti)}`
              }
              tono={
                differenzaMinuti > 0 ? 'positivo' : differenzaMinuti < 0 ? 'negativo' : 'neutro'
              }
              icona={
                differenzaMinuti > 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : differenzaMinuti < 0 ? (
                  <ArrowDownRight className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )
              }
            />
            <StatCard
              etichetta="Ultimi 30 giorni"
              valore={formatDurata(statistiche.ultimi30.minuti)}
              dettaglio={
                statistiche.ultimi30.chilometri > 0
                  ? `${plurale(statistiche.ultimi30.sessioni, 'sessione', 'sessioni')} · ${formatNumeroCompatto(statistiche.ultimi30.chilometri, 1)} km`
                  : plurale(statistiche.ultimi30.sessioni, 'sessione', 'sessioni')
              }
              icona={<CalendarClock className="h-4 w-4" />}
            />
            <StatCard
              etichetta="Serie di giorni"
              valore={statistiche.serieGiorni}
              dettaglio={
                statistiche.serieGiorni === 0
                  ? 'Riparti quando vuoi'
                  : statistiche.serieGiorni === 1
                    ? 'giorno di fila'
                    : 'giorni di fila'
              }
              tono={statistiche.serieGiorni > 0 ? 'accento' : 'neutro'}
              icona={<Flame className="h-4 w-4" />}
            />
          </section>

          {/* ----------------------------- grafico ----------------------------- */}
          <section className="card space-y-3 p-4 sm:p-5" aria-labelledby="titolo-grafico">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="titolo-grafico" className="font-semibold text-ink">
                Minuti per settimana
              </h2>
              <p className="text-sm text-ink-3">ultime 10 settimane</p>
            </div>
            <p className="sr-only">
              {settimane
                .map((s) => `settimana del ${formatData(s.inizio, 'd MMMM')}: ${s.minuti} minuti`)
                .join('; ')}
            </p>
            <GraficoAllenamenti settimane={settimane} />
          </section>

          {/* ------------------------------ elenco ----------------------------- */}
          <section className="space-y-3" aria-labelledby="titolo-elenco">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <SectionTitle>
                <span id="titolo-elenco">
                  {filtro === null
                    ? `Tutti gli allenamenti (${allenamenti.length})`
                    : `${filtro} (${visibili.length})`}
                </span>
              </SectionTitle>
              {statistiche.preferita && statistiche.preferita.sessioni > 1 && (
                <p className="text-sm text-ink-3">
                  Più frequente: {statistiche.preferita.nome}
                </p>
              )}
            </div>

            {tipi.length > 1 && (
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0">
                <Chip
                  attivo={filtro === null}
                  onClick={() => {
                    setFiltro(null)
                    setQuanteMostrarne(PASSO_ELENCO)
                  }}
                >
                  Tutti
                </Chip>
                {tipi.map((nome) => (
                  <Chip
                    key={nome}
                    attivo={filtro === nome}
                    className="shrink-0"
                    onClick={() => {
                      setFiltro(filtro === nome ? null : nome)
                      setQuanteMostrarne(PASSO_ELENCO)
                    }}
                  >
                    <span aria-hidden>{emojiAttivita(nome)}</span> {nome}
                  </Chip>
                ))}
              </div>
            )}

            {gruppiVisibili.map(({ mese, totaleMese, righe }) => {
              return (
                <div key={mese} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2 pt-1">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-3">
                      {capitalizza(formatData(`${mese}-01`, 'MMMM yyyy'))}
                    </h3>
                    <span className="tnum text-xs text-ink-3">
                      {formatDurata(totaleMese)}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    <AnimatePresence initial={false}>
                      {righe.map((allenamento) => (
                        <motion.li
                          key={allenamento.id}
                          layout
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.16 }}
                        >
                          <SwipeRow
                            azioni={[
                              {
                                etichetta: 'Modifica',
                                icona: Pencil,
                                onClick: () => {
                                  setInModifica(allenamento)
                                  setModuloAperto(true)
                                },
                              },
                              {
                                etichetta: 'Elimina',
                                icona: Trash2,
                                tono: 'pericolo',
                                onClick: () => setDaEliminare(allenamento),
                              },
                            ]}
                          >
                            <div className="card flex items-center gap-3 p-3.5">
                              <span
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-elev text-xl"
                                aria-hidden
                              >
                                {emojiAttivita(allenamento.activity)}
                              </span>

                              <button
                                type="button"
                                onClick={() => {
                                  setInModifica(allenamento)
                                  setModuloAperto(true)
                                }}
                                className="min-w-0 flex-1 text-left"
                                aria-label={`Modifica ${allenamento.activity} del ${formatData(allenamento.date, 'd MMMM yyyy')}`}
                              >
                                <p className="font-medium text-ink">
                                  {allenamento.activity}
                                  <span className="ml-2 text-sm font-normal text-ink-2">
                                    {formatDurata(allenamento.duration_min)}
                                  </span>
                                </p>
                                <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-sm text-ink-3">
                                  <span>{formatData(allenamento.date, 'EEE d MMM')}</span>
                                  <span className="flex items-center gap-1.5">
                                    <span
                                      className={cn(
                                        'h-2 w-2 rounded-full',
                                        COLORI_INTENSITA[allenamento.intensity],
                                      )}
                                      aria-hidden
                                    />
                                    {allenamento.intensity}
                                  </span>
                                  {allenamento.distance_km !== null && (
                                    <span>
                                      {formatNumeroCompatto(Number(allenamento.distance_km), 2)} km
                                    </span>
                                  )}
                                  {allenamento.calories !== null && (
                                    <span>{allenamento.calories} kcal</span>
                                  )}
                                </p>
                                {allenamento.notes && (
                                  <p className="mt-1 line-clamp-2 text-sm italic text-ink-2">
                                    {allenamento.notes}
                                  </p>
                                )}
                              </button>

                              <div className="hidden shrink-0 items-center gap-1 sm:flex">
                                <button
                                  type="button"
                                  aria-label={`Modifica ${allenamento.activity} del ${formatData(allenamento.date, 'd MMMM yyyy')}`}
                                  onClick={() => {
                                    setInModifica(allenamento)
                                    setModuloAperto(true)
                                  }}
                                  className="tap rounded-xl p-2 text-ink-3 transition-colors hover:bg-elev hover:text-ink"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Elimina ${allenamento.activity} del ${formatData(allenamento.date, 'd MMMM yyyy')}`}
                                  onClick={() => setDaEliminare(allenamento)}
                                  className="tap rounded-xl p-2 text-ink-3 transition-colors hover:bg-danger/10 hover:text-danger"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </SwipeRow>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </div>
              )
            })}

            {visibili.length > quanteMostrarne && (
              <Button
                variante="secondario"
                larghezzaPiena
                onClick={() => setQuanteMostrarne((n) => n + PASSO_ELENCO)}
              >
                Mostra altri {Math.min(PASSO_ELENCO, visibili.length - quanteMostrarne)}
              </Button>
            )}
          </section>
        </>
      )}

      <ModuloAllenamento aperto={aperto} onChiudi={chiudiModulo} allenamento={inModifica} />

      <ConfirmDialog
        aperto={daEliminare !== null}
        onChiudi={() => setDaEliminare(null)}
        titolo="Eliminare l’allenamento?"
        descrizione={
          daEliminare
            ? `${daEliminare.activity} del ${formatData(daEliminare.date, 'd MMMM yyyy')} verrà eliminato. L’operazione non si può annullare.`
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
