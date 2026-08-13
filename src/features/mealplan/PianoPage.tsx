import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Dices,
  Lock,
  LockOpen,
  Plus,
  ShoppingCart,
  Trash2,
} from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState, ErrorState } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/PageHeader'
import { SottoNavCibo } from '@/components/layout/SottoNavigazione'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import {
  capitalizza,
  formatData,
  formatNumeroCompatto,
  inizioSettimana,
  oggiISO,
  sommaGiorni,
  toISO,
} from '@/lib/format'
import { useProfilo } from '@/features/settings/hooks'
import { useRicette } from '@/features/recipes/hooks'
import { useGeneraSpesa } from '@/features/shopping/hooks'
import { MEAL_SLOTS } from '@/types'
import type { MealSlot, Recipe } from '@/types'
import { GeneratoreDialog } from './GeneratoreDialog'
import { SelettoreRicetta } from './SelettoreRicetta'
import { candidatePerPasto, estraiRicetta } from './generatore'
import { useAggiornaSlot, useEliminaSlot, usePiano, useSalvaPiano, useSvuotaPeriodo } from './hooks'

export function PianoPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { profilo } = useProfilo()
  const { ricette } = useRicette()
  const generaLaSpesa = useGeneraSpesa()

  const [lunedi, setLunedi] = useState(() => inizioSettimana(new Date()))
  const da = toISO(lunedi)
  const a = sommaGiorni(da, 6)

  const { voci, caricamento, errore, ricarica } = usePiano(da, a)
  const aggiorna = useAggiornaSlot(da, a)
  const rimuovi = useEliminaSlot(da, a)
  const salvaPiano = useSalvaPiano()
  const svuota = useSvuotaPeriodo()

  const [generatoreAperto, setGeneratoreAperto] = useState(false)
  const [confermaSvuota, setConfermaSvuota] = useState(false)
  const [selettore, setSelettore] = useState<{ data: string; pasto: MealSlot } | null>(null)

  const giorni = useMemo(
    () => Array.from({ length: 7 }, (_, i) => sommaGiorni(da, i)),
    [da],
  )

  const bloccati = useMemo(
    () =>
      voci
        .filter((v) => v.pinned)
        .map((v) => ({
          date: v.date,
          meal: v.meal,
          recipe_id: v.recipe_id,
          pinned: true,
        })),
    [voci],
  )

  const ricetteDellaSettimana = useMemo(
    () => voci.map((v) => v.recipe).filter((r): r is Recipe => r !== null),
    [voci],
  )

  function cambiaACaso(data: string, pasto: MealSlot, idAttuale: string, idVoce: string) {
    const candidate = candidatePerPasto(ricette, pasto, [])
    const altre = voci
      .filter((v) => v.id !== idVoce)
      .map((v) => ({ date: v.date, meal: v.meal, recipe_id: v.recipe_id, pinned: v.pinned }))
    const nuova = estraiRicetta(candidate, data, altre, 3, idAttuale)
    if (!nuova) {
      toast.info('Non ci sono altre ricette fra cui scegliere.')
      return
    }
    aggiorna.mutate({ id: idVoce, patch: { recipe_id: nuova.id } })
  }

  async function generaSpesa() {
    if (ricetteDellaSettimana.length === 0) {
      toast.info('Questa settimana non ha ancora pasti pianificati.')
      return
    }
    const esito = await generaLaSpesa.mutateAsync(ricetteDellaSettimana)
    const pezzi = [
      esito.aggiunti > 0 &&
        `${esito.aggiunti} ${esito.aggiunti === 1 ? 'articolo aggiunto' : 'articoli aggiunti'}`,
      esito.sommati > 0 &&
        `${esito.sommati} ${esito.sommati === 1 ? 'già presente aggiornato' : 'già presenti aggiornati'}`,
    ].filter(Boolean)
    toast.successo(
      pezzi.length > 0
        ? `Lista della spesa: ${pezzi.join(', ')}.`
        : 'La lista della spesa era già aggiornata.',
    )
    navigate('/spesa')
  }

  const totaleCalorie = (data: string) =>
    voci
      .filter((v) => v.date === data && v.recipe?.calories !== null && v.recipe)
      .reduce((somma, v) => somma + Number(v.recipe?.calories ?? 0), 0)

  return (
    <div className="space-y-5">
      <PageHeader
        titolo="Piano pasti"
        sottotitolo="Genera un menù casuale e organizza la settimana"
        azioni={
          <>
            <Button
              variante="secondario"
              iconaSinistra={<ShoppingCart className="h-4 w-4" />}
              onClick={generaSpesa}
              caricamento={generaLaSpesa.isPending}
              className="hidden sm:inline-flex"
            >
              Genera la spesa
            </Button>
            <Button
              iconaSinistra={<Dices className="h-4 w-4" />}
              onClick={() => setGeneratoreAperto(true)}
            >
              Genera menù
            </Button>
          </>
        }
      />

      <SottoNavCibo />

      {/* --------------------- navigazione settimana --------------------- */}
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-card p-2">
        <IconButton
          etichetta="Settimana precedente"
          onClick={() => setLunedi((precedente) => new Date(sommaGiorni(toISO(precedente), -7)))}
        >
          <ChevronLeft className="h-5 w-5" />
        </IconButton>

        <div className="text-center">
          <p className="font-semibold text-ink">
            {formatData(da, 'd MMM')} – {formatData(a, 'd MMM yyyy')}
          </p>
          <button
            type="button"
            onClick={() => setLunedi(inizioSettimana(new Date()))}
            className="text-xs text-accent-600 underline-offset-2 hover:underline dark:text-accent-300"
          >
            Vai a questa settimana
          </button>
        </div>

        <IconButton
          etichetta="Settimana successiva"
          onClick={() => setLunedi((precedente) => new Date(sommaGiorni(toISO(precedente), 7)))}
        >
          <ChevronRight className="h-5 w-5" />
        </IconButton>
      </div>

      {errore ? (
        <ErrorState messaggio={errore.message} onRiprova={() => void ricarica()} />
      ) : caricamento ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {giorni.map((giorno) => (
            <div key={giorno} className="card h-52 animate-pulse" />
          ))}
        </div>
      ) : ricette.length === 0 ? (
        <EmptyState
          icona={<CalendarDays className="h-7 w-7" />}
          titolo="Prima servono le ricette"
          descrizione="Il generatore pesca dalle ricette che hai salvato. Aggiungine qualcuna e poi torna qui per creare il menù della settimana."
          azione={
            <Link
              to="/ricette/nuova"
              className="tap inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 font-medium text-white transition-colors hover:bg-accent-700"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Aggiungi una ricetta
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {giorni.map((giorno) => {
              const oggi = giorno === oggiISO()
              const calorie = totaleCalorie(giorno)
              return (
                <section
                  key={giorno}
                  aria-label={formatData(giorno, 'EEEE d MMMM')}
                  className={cn(
                    'card flex flex-col p-3',
                    oggi && 'border-accent-500/60 ring-1 ring-accent-500/30',
                  )}
                >
                  <header className="mb-2 flex items-baseline justify-between gap-2">
                    <h2 className="font-semibold text-ink">
                      {capitalizza(formatData(giorno, 'EEE'))}{' '}
                      <span className="font-normal text-ink-3">
                        {formatData(giorno, 'd/M')}
                      </span>
                    </h2>
                    {calorie > 0 && (
                      <span
                        className="tnum text-xs text-ink-3"
                        title="Totale calorie dei pasti pianificati"
                      >
                        {formatNumeroCompatto(calorie, 0)} kcal
                      </span>
                    )}
                  </header>

                  <ul className="space-y-1.5">
                    {MEAL_SLOTS.map((pasto) => {
                      const voce = voci.find((v) => v.date === giorno && v.meal === pasto)
                      if (!voce) {
                        return (
                          <li key={pasto}>
                            <button
                              type="button"
                              onClick={() => setSelettore({ data: giorno, pasto })}
                              className="flex w-full items-center gap-1.5 rounded-lg border border-dashed border-line px-2 py-1.5 text-left text-xs text-ink-3 transition-colors hover:border-accent-500/50 hover:text-accent-600 dark:hover:text-accent-300"
                            >
                              <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              <span className="capitalize">{pasto}</span>
                            </button>
                          </li>
                        )
                      }
                      return (
                        <li
                          key={pasto}
                          className="group rounded-lg bg-elev px-2 py-1.5 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-1">
                            {/* min-w-0 + truncate: se la colonna e' stretta si
                                accorcia l'etichetta, i pulsanti non escono
                                mai dal riquadro del giorno */}
                            <span className="min-w-0 truncate text-[0.65rem] font-semibold uppercase tracking-wide text-ink-3">
                              {pasto}
                            </span>
                            <div className="-mr-1 flex shrink-0 items-center gap-0.5">
                              <button
                                type="button"
                                aria-label={
                                  voce.pinned
                                    ? `Sblocca ${pasto} di ${formatData(giorno, 'EEEE')}`
                                    : `Blocca ${pasto} di ${formatData(giorno, 'EEEE')}`
                                }
                                onClick={() =>
                                  aggiorna.mutate({
                                    id: voce.id,
                                    patch: { pinned: !voce.pinned },
                                  })
                                }
                                className={cn(
                                  'rounded p-1 transition-colors hover:bg-card',
                                  voce.pinned
                                    ? 'text-accent-600 dark:text-accent-300'
                                    : 'text-ink-3',
                                )}
                              >
                                {voce.pinned ? (
                                  <Lock className="h-3.5 w-3.5" />
                                ) : (
                                  <LockOpen className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                aria-label={`Cambia ricetta per ${pasto} di ${formatData(giorno, 'EEEE')}`}
                                disabled={voce.pinned}
                                onClick={() =>
                                  cambiaACaso(giorno, pasto, voce.recipe_id, voce.id)
                                }
                                className="rounded p-1 text-ink-3 transition-colors hover:bg-card disabled:opacity-40"
                              >
                                <Dices className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Togli ${pasto} di ${formatData(giorno, 'EEEE')}`}
                                onClick={() => rimuovi.mutate(voce.id)}
                                className="rounded p-1 text-ink-3 transition-colors hover:bg-card hover:text-danger"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          {voce.recipe ? (
                            <Link
                              to={`/ricette/${voce.recipe.id}`}
                              className="block line-clamp-2 text-sm font-medium leading-snug text-ink hover:text-accent-600 dark:hover:text-accent-300"
                              title={voce.recipe.title}
                            >
                              {voce.recipe.title}
                            </Link>
                          ) : (
                            <span className="text-sm italic text-ink-3">Ricetta eliminata</span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variante="secondario"
              iconaSinistra={<ShoppingCart className="h-4 w-4" />}
              onClick={generaSpesa}
              caricamento={generaLaSpesa.isPending}
              className="sm:hidden"
              larghezzaPiena
            >
              Genera la lista della spesa
            </Button>
            {voci.length > 0 && (
              <Button
                variante="fantasma"
                dimensione="sm"
                className="text-danger hover:bg-danger/10"
                iconaSinistra={<Trash2 className="h-4 w-4" />}
                onClick={() => setConfermaSvuota(true)}
              >
                Svuota la settimana
              </Button>
            )}
          </div>

          {profilo.calorie_goal !== null && voci.length > 0 && (
            <p className="text-sm text-ink-3">
              Il tuo obiettivo è {formatNumeroCompatto(profilo.calorie_goal, 0)} kcal al
              giorno: sotto ogni giornata trovi il totale dei pasti pianificati.
            </p>
          )}
        </>
      )}

      <GeneratoreDialog
        aperto={generatoreAperto}
        onChiudi={() => setGeneratoreAperto(false)}
        dataIniziale={da < oggiISO() ? oggiISO() : da}
        bloccati={bloccati}
      />

      <SelettoreRicetta
        aperto={selettore !== null}
        onChiudi={() => setSelettore(null)}
        pasto={selettore?.pasto}
        titolo={
          selettore
            ? `${capitalizza(selettore.pasto)} di ${formatData(selettore.data, 'EEEE d MMMM')}`
            : 'Scegli una ricetta'
        }
        onScelta={(ricetta) => {
          if (!selettore) return
          salvaPiano.mutate([
            {
              date: selettore.data,
              meal: selettore.pasto,
              recipe_id: ricetta.id,
              pinned: false,
            },
          ])
        }}
      />

      <ConfirmDialog
        aperto={confermaSvuota}
        onChiudi={() => setConfermaSvuota(false)}
        titolo="Svuotare la settimana?"
        descrizione="Verranno tolti tutti i pasti pianificati di questa settimana, tranne quelli che hai bloccato. Le ricette restano al loro posto."
        etichettaConferma="Svuota"
        pericoloso
        onConferma={async () => {
          await svuota.mutateAsync({ da, a, tenerePinnati: true })
          toast.successo('Settimana svuotata.')
        }}
      />
    </div>
  )
}
