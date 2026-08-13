import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
  ListTodo,
  Scale,
  UtensilsCrossed,
} from 'lucide-react'
import { LinkButton } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/PageHeader'
import { cn } from '@/lib/cn'
import {
  capitalizza,
  formatData,
  formatNumeroCompatto,
  oggiISO,
  scadenzaTestuale,
} from '@/lib/format'
import { formatDeltaPeso, formatPeso } from '@/lib/units'
import { useProfilo } from '@/features/settings/hooks'
import { usePesi } from '@/features/weight/hooks'
import { calcolaStatistiche } from '@/features/weight/statistiche'
import { useAllenamenti } from '@/features/workouts/hooks'
import {
  calcolaStatistiche as calcolaStatisticheAllenamenti,
  emojiAttivita,
  formatDurata,
} from '@/features/workouts/statistiche'
import { usePiano } from '@/features/mealplan/hooks'
import {
  useAnnullaCompletamento,
  useCompletaTask,
  useTaskAttive,
} from '@/features/tasks/hooks'
import { useDiario, useRiepilogoAbitudini, useSpuntaAbitudine } from '@/features/journal/hooks'
import { EMOJI_UMORE } from '@/features/journal/CalendarioDiario'
import { Checkbox } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { MEAL_SLOTS } from '@/types'
import type { ReactNode } from 'react'

/** Quante righe mostrare nei riquadri "Da fare" e "Abitudini". */
const QUANTE_IN_RIEPILOGO = 3

function saluto(): string {
  const ora = new Date().getHours()
  if (ora < 5) return 'Buonanotte'
  if (ora < 13) return 'Buongiorno'
  if (ora < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

function Riquadro({
  titolo,
  icona,
  collegamento,
  etichettaCollegamento,
  children,
  className,
  compatto = false,
}: {
  titolo: string
  icona: ReactNode
  collegamento: string
  etichettaCollegamento: string
  children: ReactNode
  className?: string
  /**
   * Riquadri stretti (sul telefono ne stanno due per riga): icona piu'
   * piccola, titolo piu' piccolo e freccia solo dove c'e' spazio.
   */
  compatto?: boolean
}) {
  return (
    /* min-w-0: le celle di una griglia, se non glielo si dice, si allargano
       fino a contenere il testo piu' lungo che hanno dentro — e a quel punto
       e' il nome di una ricetta a decidere la larghezza della pagina */
    <section className={cn('card flex min-w-0 flex-col p-3.5 sm:p-4', className)}>
      <header
        className={cn(
          'flex items-center',
          compatto ? 'mb-2 gap-2 sm:gap-2.5' : 'mb-3 gap-2.5',
        )}
      >
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-xl bg-accent-500/12 text-accent-600 dark:text-accent-300',
            compatto ? 'h-7 w-7 sm:h-9 sm:w-9' : 'h-9 w-9',
            compatto && '[&>svg]:h-4 [&>svg]:w-4 sm:[&>svg]:h-5 sm:[&>svg]:w-5',
          )}
        >
          {icona}
        </span>
        <h2
          className={cn(
            'min-w-0 flex-1 truncate font-semibold text-ink',
            compatto && 'text-sm sm:text-base',
          )}
        >
          {titolo}
        </h2>
        <Link
          to={collegamento}
          aria-label={etichettaCollegamento}
          className={cn(
            'tap -mr-2 items-center justify-center rounded-xl px-2 text-ink-3 transition-colors hover:bg-elev hover:text-ink',
            // nei riquadri stretti la freccia ruberebbe spazio al titolo:
            // sul telefono si tocca direttamente il contenuto
            compatto ? 'hidden sm:flex' : 'flex',
          )}
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </Link>
      </header>
      <div className="flex-1">{children}</div>
    </section>
  )
}

export function HomePage() {
  const oggi = oggiISO()
  const { profilo, caricamento: caricamentoProfilo } = useProfilo()
  const { pesi, caricamento: caricamentoPesi } = usePesi()
  const { voci: pastiOggi, caricamento: caricamentoPiano } = usePiano(oggi, oggi)
  const { task, caricamento: caricamentoTask } = useTaskAttive()
  const { allenamenti, caricamento: caricamentoAllenamenti } = useAllenamenti()
  const { note } = useDiario()
  const { riepilogo, caricamento: caricamentoAbitudini } = useRiepilogoAbitudini()
  const spunta = useSpuntaAbitudine()
  const completa = useCompletaTask()
  const annulla = useAnnullaCompletamento()
  const toast = useToast()

  const nome = profilo.display_name?.trim()
  const unita = profilo.weight_unit

  const statistiche = useMemo(
    () => calcolaStatistiche(pesi, pesi, profilo.weight_goal_kg),
    [pesi, profilo.weight_goal_kg],
  )
  const statAllenamenti = useMemo(
    () => calcolaStatisticheAllenamenti(allenamenti),
    [allenamenti],
  )
  const pesoDiOggi = pesi.find((p) => p.date === oggi) ?? null
  const notaDiOggi = note.find((n) => n.date === oggi) ?? null

  const inEvidenza = useMemo(
    () =>
      task
        .filter((t) => t.due_date !== null && t.due_date <= oggi)
        .slice(0, QUANTE_IN_RIEPILOGO),
    [task, oggi],
  )
  const prossime = useMemo(
    () => (inEvidenza.length > 0 ? inEvidenza : task.slice(0, QUANTE_IN_RIEPILOGO)),
    [inEvidenza, task],
  )

  const calorieOggi = pastiOggi.reduce(
    (somma, voce) => somma + Number(voce.recipe?.calories ?? 0),
    0,
  )

  function completaTask(id: string) {
    const elemento = task.find((t) => t.id === id)
    if (!elemento) return
    completa.mutate(elemento, {
      onSuccess: (esito) =>
        toast.successo('Task completata.', {
          etichetta: 'Annulla',
          onClick: () =>
            annulla.mutate({
              id: esito.completata.id,
              idSuccessiva: esito.successiva?.id ?? null,
            }),
        }),
    })
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        titolo={nome ? `${saluto()}, ${nome}` : saluto()}
        sottotitolo={capitalizza(formatData(new Date(), 'EEEE d MMMM'))}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {/* Peso e allenamenti sono due numeri soli: sul telefono stanno
            affiancati, cosi' la prima schermata mostra qualcosa in piu'.
            Da tablet in su tornano riquadri normali della griglia. */}
        <div className="grid min-w-0 grid-cols-2 gap-3 md:contents">
          {/* ----------------------------- peso ----------------------------- */}
          <Riquadro
            compatto
            titolo="Peso"
            icona={<Scale className="h-5 w-5" aria-hidden />}
            collegamento="/peso"
            etichettaCollegamento="Vai alla sezione Peso"
          >
            {caricamentoPesi || caricamentoProfilo ? (
              <div className="space-y-2">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : pesoDiOggi ? (
              <>
                <p className="tnum text-2xl font-semibold text-ink sm:text-3xl">
                  {formatPeso(Number(pesoDiOggi.weight_kg), unita)}
                </p>
                <p className="mt-1 text-[0.8rem] text-ink-3 sm:text-sm">
                  Oggi
                  {statistiche.deltaSettimana !== null && (
                    <>
                      {' · '}
                      <span
                        className={
                          statistiche.deltaSettimana < 0 ? 'text-success' : 'text-danger'
                        }
                      >
                        {formatDeltaPeso(statistiche.deltaSettimana, unita)}
                      </span>{' '}
                      in 7 giorni
                    </>
                  )}
                </p>
              </>
            ) : (
              <div className="space-y-2.5">
                <p className="text-[0.8rem] text-ink-2 sm:text-sm">
                  {statistiche.attuale
                    ? `Ultima volta ${formatPeso(Number(statistiche.attuale.weight_kg), unita)} il ${formatData(statistiche.attuale.date, 'd MMM')}.`
                    : 'Non hai ancora registrato nessun peso.'}
                </p>
                <LinkButton to="/peso?nuovo=1" dimensione="sm">
                  Registra
                </LinkButton>
              </div>
            )}
          </Riquadro>

          {/* -------------------------- allenamenti ------------------------- */}
          <Riquadro
            compatto
            titolo="Allenamenti"
            icona={<Dumbbell className="h-5 w-5" aria-hidden />}
            collegamento="/allenamenti"
            etichettaCollegamento="Vai agli allenamenti"
          >
            {caricamentoAllenamenti ? (
              <div className="space-y-2">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : allenamenti.length === 0 ? (
              <div className="space-y-2.5">
                <p className="text-[0.8rem] text-ink-2 sm:text-sm">
                  Segna cosa hai fatto e per quanto tempo.
                </p>
                <LinkButton to="/allenamenti?nuovo=1" dimensione="sm" variante="secondario">
                  Registra
                </LinkButton>
              </div>
            ) : (
              <>
                <p className="tnum text-2xl font-semibold text-ink sm:text-3xl">
                  {formatDurata(statAllenamenti.settimana.minuti)}
                </p>
                <p className="mt-1 text-[0.8rem] text-ink-3 sm:text-sm">
                  {statAllenamenti.settimana.sessioni === 0
                    ? 'Ferma questa settimana'
                    : `${statAllenamenti.settimana.sessioni} ${
                        statAllenamenti.settimana.sessioni === 1 ? 'sessione' : 'sessioni'
                      } in settimana`}
                </p>
                {statAllenamenti.ultimo && (
                  <p className="mt-2 flex items-center gap-1.5 text-[0.8rem] text-ink-2 sm:mt-3 sm:text-sm">
                    <span aria-hidden>{emojiAttivita(statAllenamenti.ultimo.activity)}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {statAllenamenti.ultimo.activity}
                      {', '}
                      {statAllenamenti.giorniDallUltimo === 0
                        ? 'oggi'
                        : statAllenamenti.giorniDallUltimo === 1
                          ? 'ieri'
                          : formatData(statAllenamenti.ultimo.date, 'd MMM')}
                    </span>
                  </p>
                )}
              </>
            )}
          </Riquadro>
        </div>

        {/* ------------------------------ pasti ----------------------------- */}
        <Riquadro
          titolo="Oggi si mangia"
          icona={<UtensilsCrossed className="h-5 w-5" aria-hidden />}
          collegamento="/piano"
          etichettaCollegamento="Vai al piano pasti"
        >
          {caricamentoPiano ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : pastiOggi.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-2">
                Nessun pasto pianificato per oggi. Genera un menù casuale in pochi
                secondi.
              </p>
              <LinkButton to="/piano" dimensione="sm" variante="secondario">
                Vai al piano pasti
              </LinkButton>
            </div>
          ) : (
            <>
              <ul className="space-y-1.5">
                {MEAL_SLOTS.filter((slot) => pastiOggi.some((v) => v.meal === slot)).map(
                  (slot) => {
                    const voce = pastiOggi.find((v) => v.meal === slot)!
                    return (
                      <li key={slot} className="flex items-baseline gap-2 text-sm">
                        <span className="w-20 shrink-0 text-xs font-medium uppercase tracking-wide text-ink-3">
                          {slot}
                        </span>
                        {voce.recipe ? (
                          <Link
                            to={`/ricette/${voce.recipe.id}`}
                            /* i nomi lunghi vanno a capo (al massimo due righe):
                               con il testo su una riga sola erano loro a
                               decidere la larghezza della pagina */
                            className="line-clamp-2 min-w-0 flex-1 break-words text-ink hover:text-accent-600 dark:hover:text-accent-300"
                          >
                            {voce.recipe.title}
                          </Link>
                        ) : (
                          <span className="italic text-ink-3">Ricetta eliminata</span>
                        )}
                      </li>
                    )
                  },
                )}
              </ul>
              {calorieOggi > 0 && (
                <p className="mt-3 text-sm text-ink-3">
                  Totale{' '}
                  <strong className="tnum text-ink-2">
                    {formatNumeroCompatto(calorieOggi, 0)} kcal
                  </strong>
                  {profilo.calorie_goal !== null && (
                    <> su {formatNumeroCompatto(profilo.calorie_goal, 0)} previste</>
                  )}
                </p>
              )}
            </>
          )}
        </Riquadro>

        {/* ------------------------------ task ------------------------------ */}
        <Riquadro
          titolo="Da fare"
          icona={<ListTodo className="h-5 w-5" aria-hidden />}
          collegamento="/task"
          etichettaCollegamento="Vai alle task"
        >
          {caricamentoTask ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : task.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-2">Nessuna task attiva. Tutto in ordine!</p>
              <LinkButton to="/task?nuovo=1" dimensione="sm" variante="secondario">
                Aggiungi una task
              </LinkButton>
            </div>
          ) : (
            <>
              <ul className="space-y-2">
                {prossime.map((elemento) => {
                  const inRitardo = elemento.due_date !== null && elemento.due_date < oggi
                  return (
                    <li key={elemento.id} className="flex items-start gap-2.5">
                      <Checkbox
                        checked={false}
                        onChange={() => completaTask(elemento.id)}
                        etichetta={`Segna "${elemento.title}" come completata`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink">{elemento.title}</p>
                        {elemento.due_date && (
                          <p
                            className={cn(
                              'text-xs',
                              inRitardo ? 'font-medium text-danger' : 'text-ink-3',
                            )}
                          >
                            {scadenzaTestuale(elemento.due_date)}
                          </p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
              {task.length > prossime.length && (
                <Link
                  to="/task"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent-600 hover:underline dark:text-accent-300"
                >
                  Altre {task.length - prossime.length}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              )}
            </>
          )}
        </Riquadro>

        {/* ---------------------------- abitudini --------------------------- */}
        <Riquadro
          titolo="Abitudini"
          icona={<Flame className="h-5 w-5" aria-hidden />}
          collegamento="/diario"
          etichettaCollegamento="Vai alle abitudini"
        >
          {caricamentoAbitudini ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : riepilogo.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-2">
                Crea le tue abitudini per tenere il conto delle serie.
              </p>
              <LinkButton to="/diario" dimensione="sm" variante="secondario">
                Crea un’abitudine
              </LinkButton>
            </div>
          ) : (
            <ul className="space-y-2">
              {riepilogo.slice(0, QUANTE_IN_RIEPILOGO).map(({ abitudine, streak }) => (
                <li key={abitudine.id} className="flex items-center gap-2.5">
                  <span aria-hidden className="text-lg">
                    {abitudine.emoji}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">
                    {abitudine.name}
                  </span>
                  <span className="tnum shrink-0 text-xs text-ink-3">
                    {streak.attuale} {streak.attuale === 1 ? 'giorno' : 'giorni'}
                  </span>
                  <button
                    type="button"
                    aria-pressed={streak.fattaOggi}
                    aria-label={
                      streak.fattaOggi
                        ? `Togli la spunta di oggi per ${abitudine.name}`
                        : `Segna ${abitudine.name} come fatta oggi`
                    }
                    onClick={() =>
                      spunta.mutate({
                        habitId: abitudine.id,
                        data: oggi,
                        fatta: !streak.fattaOggi,
                      })
                    }
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 transition-all active:scale-95',
                      streak.fattaOggi
                        ? 'border-accent-600 bg-accent-600 text-white'
                        : 'border-line text-ink-3 hover:border-accent-500',
                    )}
                  >
                    <Check className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Riquadro>

        {/* ------------------------------ diario ---------------------------- */}
        <Riquadro
          titolo="Diario"
          icona={<BookOpen className="h-5 w-5" aria-hidden />}
          collegamento="/diario"
          etichettaCollegamento="Vai al diario"
        >
          {notaDiOggi && (notaDiOggi.content.trim() !== '' || notaDiOggi.mood) ? (
            <div className="space-y-2">
              {notaDiOggi.mood && (
                <p className="text-2xl" aria-hidden>
                  {EMOJI_UMORE[notaDiOggi.mood]}
                </p>
              )}
              <p className="line-clamp-3 text-sm leading-relaxed text-ink-2">
                {notaDiOggi.content.trim() === ''
                  ? 'Hai segnato l’umore di oggi.'
                  : notaDiOggi.content}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-ink-2">
                Non hai ancora scritto niente oggi. Bastano due righe.
              </p>
              <LinkButton to="/diario?nuovo=1" dimensione="sm" variante="secondario">
                Scrivi nel diario
              </LinkButton>
            </div>
          )}
        </Riquadro>
      </div>
    </div>
  )
}
