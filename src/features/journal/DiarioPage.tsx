import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Check, Flame, Plus, Trash2, Trophy } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/Controls'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState, ErrorState, SkeletonLista } from '@/components/ui/Feedback'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'
import { useAperturaRapida } from '@/lib/aperturaRapida'
import { cn } from '@/lib/cn'
import { dataRelativa, formatData, oggiISO, sommaGiorni } from '@/lib/format'
import { CalendarioDiario, DESCRIZIONE_UMORE, EMOJI_UMORE } from './CalendarioDiario'
import { Heatmap } from './Heatmap'
import { calcolaStreak, giorniDiAbitudine } from './streak'
import {
  useAbitudini,
  useCreaAbitudine,
  useDiario,
  useEliminaAbitudine,
  useSalvaNota,
  useSpuntaAbitudine,
} from './hooks'
import type { Habit, ISODate, Mood } from '@/types'

const UMORI: Mood[] = [1, 2, 3, 4, 5]
const EMOJI_ABITUDINI = ['✅', '💧', '🏃', '🥗', '🧘', '📚', '😴', '🚭', '💊', '🧹', '💪', '🌱']

export function DiarioPage() {
  const [scheda, setScheda] = useState<'diario' | 'abitudini'>('diario')

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        titolo="Diario"
        sottotitolo="Come è andata oggi e come stai andando nel tempo"
      />
      <SegmentedControl
        etichetta="Sezione del diario"
        opzioni={[
          { valore: 'diario', etichetta: 'Nota del giorno' },
          { valore: 'abitudini', etichetta: 'Abitudini' },
        ]}
        valore={scheda}
        onChange={setScheda}
      />
      {scheda === 'diario' ? <SchedaDiario /> : <SchedaAbitudini />}
    </div>
  )
}

/* ========================================================================== */
/* Nota del giorno                                                            */
/* ========================================================================== */

function SchedaDiario() {
  const { note, caricamento, errore, ricarica } = useDiario()
  const salva = useSalvaNota()
  const [apertoDaFab, chiudiFab] = useAperturaRapida()

  const [giorno, setGiorno] = useState<ISODate>(oggiISO())
  const [mese, setMese] = useState(() => new Date())
  const [testo, setTesto] = useState('')
  const [umore, setUmore] = useState<Mood | null>(null)
  const [salvato, setSalvato] = useState(false)
  const areaTesto = useRef<HTMLTextAreaElement>(null)
  const ultimoCaricato = useRef<string>('')

  const notaDelGiorno = useMemo(
    () => note.find((n) => n.date === giorno) ?? null,
    [note, giorno],
  )

  // quando cambi giorno ricarichiamo i campi con quanto avevi scritto.
  // Aspettiamo che i dati siano arrivati, altrimenti al primo avvio
  // mostreremmo un foglio bianco al posto della nota di oggi.
  useEffect(() => {
    if (caricamento) return
    if (ultimoCaricato.current === giorno) return
    ultimoCaricato.current = giorno
    setTesto(notaDelGiorno?.content ?? '')
    setUmore(notaDelGiorno?.mood ?? null)
    setSalvato(false)
  }, [giorno, notaDelGiorno, caricamento])

  useEffect(() => {
    if (apertoDaFab) {
      setGiorno(oggiISO())
      areaTesto.current?.focus()
      chiudiFab()
    }
  }, [apertoDaFab, chiudiFab])

  // salvataggio automatico un secondo dopo che hai smesso di scrivere
  useEffect(() => {
    const originale = notaDelGiorno?.content ?? ''
    const umoreOriginale = notaDelGiorno?.mood ?? null
    if (testo === originale && umore === umoreOriginale) return
    if (testo.trim() === '' && umore === null && !notaDelGiorno) return

    const timer = window.setTimeout(() => {
      salva.mutate(
        { data: giorno, contenuto: testo, umore },
        {
          onSuccess: () => {
            setSalvato(true)
            window.setTimeout(() => setSalvato(false), 2200)
          },
        },
      )
    }, 1000)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testo, umore, giorno])

  const mappaNote = useMemo(() => {
    const mappa = new Map<ISODate, Mood | null>()
    note.forEach((n) => {
      if (n.content.trim() !== '' || n.mood !== null) mappa.set(n.date, n.mood)
    })
    return mappa
  }, [note])

  if (errore) return <ErrorState messaggio={errore.message} onRiprova={() => void ricarica()} />

  return (
    <div className="space-y-5">
      {/* -------------------- navigazione fra i giorni -------------------- */}
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-card p-2">
        <IconButton
          etichetta="Giorno precedente"
          onClick={() => setGiorno((precedente) => sommaGiorni(precedente, -1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </IconButton>
        <div className="text-center">
          <p className="font-semibold text-ink">{dataRelativa(giorno)}</p>
          <p className="text-xs text-ink-3">{formatData(giorno, 'd MMMM yyyy')}</p>
        </div>
        <IconButton
          etichetta="Giorno successivo"
          disabled={giorno >= oggiISO()}
          onClick={() => setGiorno((precedente) => sommaGiorni(precedente, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </IconButton>
      </div>

      {/* ------------------------------ umore ----------------------------- */}
      <section className="card space-y-3 p-4" aria-labelledby="umore-titolo">
        <h2 id="umore-titolo" className="text-sm font-semibold uppercase tracking-wide text-ink-3">
          Come ti senti
        </h2>
        <div className="flex justify-between gap-2">
          {UMORI.map((valore) => (
            <button
              key={valore}
              type="button"
              aria-pressed={umore === valore}
              aria-label={DESCRIZIONE_UMORE[valore]}
              title={DESCRIZIONE_UMORE[valore]}
              onClick={() => setUmore(umore === valore ? null : valore)}
              className={cn(
                'flex h-14 flex-1 items-center justify-center rounded-xl text-2xl transition-all duration-150',
                umore === valore
                  ? 'scale-105 bg-accent-500/15 ring-2 ring-accent-500'
                  : 'bg-elev opacity-70 hover:opacity-100',
              )}
            >
              <span aria-hidden>{EMOJI_UMORE[valore]}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ------------------------------ nota ------------------------------ */}
      <section className="card space-y-2 p-4" aria-labelledby="nota-titolo">
        <div className="flex items-center justify-between gap-2">
          <h2 id="nota-titolo" className="text-sm font-semibold uppercase tracking-wide text-ink-3">
            La tua nota
          </h2>
          <span
            aria-live="polite"
            className={cn(
              'flex items-center gap-1 text-xs transition-opacity duration-300',
              salvato ? 'text-success opacity-100' : 'opacity-0',
            )}
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            Salvato
          </span>
        </div>
        <Textarea
          ref={areaTesto}
          rows={7}
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          placeholder={
            giorno === oggiISO()
              ? 'Com’è andata oggi? Cosa ti è rimasto in mente?'
              : 'Scrivi qui i tuoi ricordi di questa giornata…'
          }
          aria-label={`Nota del ${formatData(giorno, 'd MMMM yyyy')}`}
        />
        <p className="text-xs text-ink-3">
          Le modifiche si salvano da sole un secondo dopo che smetti di scrivere.
        </p>
      </section>

      {/* ---------------------------- calendario -------------------------- */}
      <section className="card p-4" aria-labelledby="calendario-titolo">
        <h2
          id="calendario-titolo"
          className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-3"
        >
          I giorni che hai compilato
        </h2>
        {caricamento ? (
          <div className="h-64 animate-pulse rounded-xl bg-elev" />
        ) : (
          <CalendarioDiario
            mese={mese}
            onCambiaMese={setMese}
            note={mappaNote}
            selezionato={giorno}
            onSeleziona={setGiorno}
          />
        )}
      </section>
    </div>
  )
}

/* ========================================================================== */
/* Abitudini                                                                  */
/* ========================================================================== */

function SchedaAbitudini() {
  const { abitudini, log, caricamento, errore, ricarica } = useAbitudini()
  const crea = useCreaAbitudine()
  const elimina = useEliminaAbitudine()
  const spunta = useSpuntaAbitudine()
  const toast = useToast()

  const [moduloAperto, setModuloAperto] = useState(false)
  const [nome, setNome] = useState('')
  const [emoji, setEmoji] = useState('✅')
  const [daEliminare, setDaEliminare] = useState<Habit | null>(null)

  async function creaAbitudine(e: React.FormEvent) {
    e.preventDefault()
    if (nome.trim() === '') return
    await crea.mutateAsync({ nome, emoji })
    toast.successo('Abitudine creata.')
    setNome('')
    setEmoji('✅')
    setModuloAperto(false)
  }

  if (errore) return <ErrorState messaggio={errore.message} onRiprova={ricarica} />
  if (caricamento) return <SkeletonLista righe={3} />

  return (
    <div className="space-y-4">
      {abitudini.length === 0 ? (
        <EmptyState
          icona={<Flame className="h-7 w-7" />}
          titolo="Nessuna abitudine"
          descrizione="Crea le abitudini che vuoi tenere sotto controllo (bere 2 litri d’acqua, allenarti, niente zuccheri…). Ogni giorno le spunti e l’app tiene il conto della serie."
          azione={
            <Button
              iconaSinistra={<Plus className="h-4 w-4" />}
              onClick={() => setModuloAperto(true)}
            >
              Crea la prima abitudine
            </Button>
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {abitudini.map((abitudine) => (
              <CardAbitudine
                key={abitudine.id}
                abitudine={abitudine}
                giorni={giorniDiAbitudine(log, abitudine.id)}
                onSpunta={(data, fatta) =>
                  spunta.mutate({ habitId: abitudine.id, data, fatta })
                }
                onElimina={() => setDaEliminare(abitudine)}
              />
            ))}
          </ul>
          <Button
            variante="secondario"
            larghezzaPiena
            iconaSinistra={<Plus className="h-4 w-4" />}
            onClick={() => setModuloAperto(true)}
          >
            Nuova abitudine
          </Button>
        </>
      )}

      <Modal
        aperto={moduloAperto}
        onChiudi={() => setModuloAperto(false)}
        titolo="Nuova abitudine"
        larghezza="sm"
        footer={
          <>
            <Button variante="secondario" onClick={() => setModuloAperto(false)}>
              Annulla
            </Button>
            <Button type="submit" form="modulo-abitudine" caricamento={crea.isPending}>
              Crea
            </Button>
          </>
        }
      >
        <form id="modulo-abitudine" onSubmit={creaAbitudine} className="space-y-4">
          <Field etichetta="Che abitudine vuoi seguire" richiesto>
            {(id) => (
              <Input
                id={id}
                data-autofocus
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Bere 2 litri d’acqua"
                required
              />
            )}
          </Field>
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-ink-2">Simbolo</span>
            <div className="flex flex-wrap gap-2">
              {EMOJI_ABITUDINI.map((simbolo) => (
                <button
                  key={simbolo}
                  type="button"
                  aria-pressed={emoji === simbolo}
                  aria-label={`Usa il simbolo ${simbolo}`}
                  onClick={() => setEmoji(simbolo)}
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-xl text-xl transition-all',
                    emoji === simbolo
                      ? 'bg-accent-500/15 ring-2 ring-accent-500'
                      : 'bg-elev hover:bg-accent-500/10',
                  )}
                >
                  <span aria-hidden>{simbolo}</span>
                </button>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        aperto={daEliminare !== null}
        onChiudi={() => setDaEliminare(null)}
        titolo="Eliminare l’abitudine?"
        descrizione={
          daEliminare
            ? `"${daEliminare.name}" verrà eliminata insieme a tutto il suo storico di spunte.`
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

function CardAbitudine({
  abitudine,
  giorni,
  onSpunta,
  onElimina,
}: {
  abitudine: Habit
  giorni: Set<ISODate>
  onSpunta: (data: ISODate, fatta: boolean) => void
  onElimina: () => void
}) {
  const streak = calcolaStreak(giorni)
  const oggi = oggiISO()

  return (
    <li className="card space-y-3 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-elev text-xl">
          <span aria-hidden>{abitudine.emoji}</span>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-ink">{abitudine.name}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-3">
            <span className="flex items-center gap-1">
              <Flame
                className={cn('h-3.5 w-3.5', streak.attuale > 0 && 'text-warn')}
                aria-hidden
              />
              Serie: <strong className="text-ink-2">{streak.attuale}</strong>
            </span>
            <span className="flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" aria-hidden />
              Record: <strong className="text-ink-2">{streak.record}</strong>
            </span>
            <span>{streak.ultimi30}/30 giorni</span>
          </p>
        </div>
        <button
          type="button"
          aria-pressed={streak.fattaOggi}
          aria-label={
            streak.fattaOggi
              ? `Togli la spunta di oggi per ${abitudine.name}`
              : `Segna ${abitudine.name} come fatta oggi`
          }
          onClick={() => onSpunta(oggi, !streak.fattaOggi)}
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 transition-all duration-150 active:scale-95',
            streak.fattaOggi
              ? 'border-accent-600 bg-accent-600 text-white'
              : 'border-line text-ink-3 hover:border-accent-500 hover:text-accent-600',
          )}
        >
          <Check className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <Heatmap
        giorni={giorni}
        etichetta={abitudine.name}
        onSeleziona={(data) => onSpunta(data, !giorni.has(data))}
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onElimina}
          aria-label={`Elimina l’abitudine ${abitudine.name}`}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-ink-3 transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Elimina
        </button>
      </div>
    </li>
  )
}
