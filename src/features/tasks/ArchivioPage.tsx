import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Archive, RotateCcw, Search, Trash2 } from 'lucide-react'
import { Button, LinkButton } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/Controls'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState, ErrorState, SkeletonLista } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { SottoNavTask } from '@/components/layout/SottoNavigazione'
import { SwipeRow } from '@/components/ui/SwipeRow'
import { useToast } from '@/components/ui/Toast'
import { capitalizza, formatData, oggiISO, sommaGiorni } from '@/lib/format'
import {
  useCategorieTask,
  useEliminaTask,
  useModificaTask,
  useTaskArchiviate,
  useTaskAttive,
} from './hooks'
import type { Task } from '@/types'

type Periodo = '7g' | '30g' | 'anno' | 'tutto'

const PERIODI: { valore: Periodo; etichetta: string; giorni: number | null }[] = [
  { valore: '7g', etichetta: '7 giorni', giorni: 7 },
  { valore: '30g', etichetta: '30 giorni', giorni: 30 },
  { valore: 'anno', etichetta: '1 anno', giorni: 365 },
  { valore: 'tutto', etichetta: 'Tutto', giorni: null },
]

export function ArchivioPage() {
  const { task, caricamento, errore, ricarica } = useTaskArchiviate()
  const { task: attive } = useTaskAttive()
  const { categorie } = useCategorieTask()
  const modifica = useModificaTask()
  const elimina = useEliminaTask()
  const toast = useToast()

  const [ricerca, setRicerca] = useState('')
  const [periodo, setPeriodo] = useState<Periodo>('30g')
  const [daEliminare, setDaEliminare] = useState<Task | null>(null)

  const filtrate = useMemo(() => {
    const termine = ricerca.trim().toLowerCase()
    const config = PERIODI.find((p) => p.valore === periodo)
    const limite = config?.giorni ? sommaGiorni(oggiISO(), -config.giorni) : null

    return task.filter((t) => {
      if (limite && (t.completed_at ?? '').slice(0, 10) < limite) return false
      if (!termine) return true
      return (
        t.title.toLowerCase().includes(termine) ||
        (t.notes ?? '').toLowerCase().includes(termine)
      )
    })
  }, [task, ricerca, periodo])

  /** Raggruppa per giorno di completamento: "Oggi", "Ieri", "12 agosto 2026". */
  const gruppi = useMemo(() => {
    const mappa = new Map<string, Task[]>()
    for (const elemento of filtrate) {
      const giorno = (elemento.completed_at ?? '').slice(0, 10)
      const elenco = mappa.get(giorno) ?? []
      elenco.push(elemento)
      mappa.set(giorno, elenco)
    }
    return [...mappa.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtrate])

  function ripristina(elemento: Task) {
    modifica.mutate({ id: elemento.id, patch: { completed_at: null } })
    toast.successo('Task rimessa fra quelle attive.')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader titolo="Archivio" sottotitolo="Tutto quello che hai già completato" />

      <SottoNavTask attive={attive.length} />

      <div className="space-y-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
            aria-hidden
          />
          <Input
            type="search"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            placeholder="Cerca fra le task completate…"
            aria-label="Cerca fra le task completate"
            className="pl-11"
          />
        </div>
        <SegmentedControl
          etichetta="Periodo"
          opzioni={PERIODI.map((p) => ({ valore: p.valore, etichetta: p.etichetta }))}
          valore={periodo}
          onChange={setPeriodo}
        />
      </div>

      {errore ? (
        <ErrorState messaggio={errore.message} onRiprova={() => void ricarica()} />
      ) : caricamento ? (
        <SkeletonLista righe={4} />
      ) : task.length === 0 ? (
        <EmptyState
          icona={<Archive className="h-7 w-7" />}
          titolo="Archivio vuoto"
          descrizione="Qui finiscono le task che completi: potrai ritrovarle, rimetterle fra quelle attive o eliminarle definitivamente."
          azione={
            <LinkButton to="/task" variante="secondario">
              Vai alle task attive
            </LinkButton>
          }
        />
      ) : filtrate.length === 0 ? (
        <EmptyState
          titolo="Nessun risultato"
          descrizione="Nessuna task completata corrisponde alla ricerca o al periodo scelto."
          azione={
            <Button
              variante="secondario"
              onClick={() => {
                setRicerca('')
                setPeriodo('tutto')
              }}
            >
              Azzera i filtri
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {gruppi.map(([giorno, elementi]) => (
            <section key={giorno} className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-3">
                {capitalizza(formatData(giorno, 'EEEE d MMMM yyyy'))}
              </h2>
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {elementi.map((elemento) => {
                    const categoria = categorie.find((c) => c.id === elemento.category_id)
                    return (
                      <motion.li
                        key={elemento.id}
                        layout
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.16 }}
                      >
                        <SwipeRow
                          azioni={[
                            {
                              etichetta: 'Ripristina',
                              icona: RotateCcw,
                              onClick: () => ripristina(elemento),
                            },
                            {
                              etichetta: 'Elimina',
                              icona: Trash2,
                              tono: 'pericolo',
                              onClick: () => setDaEliminare(elemento),
                            },
                          ]}
                        >
                          <div className="card flex items-center gap-3 p-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-ink line-through decoration-ink-3/60">
                                {elemento.title}
                              </p>
                              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-ink-3">
                                <span>
                                  Completata alle{' '}
                                  {new Date(elemento.completed_at!).toLocaleTimeString('it-IT', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                {categoria && (
                                  <span className="flex items-center gap-1.5">
                                    <span
                                      className="h-2 w-2 rounded-full"
                                      style={{ backgroundColor: categoria.color }}
                                      aria-hidden
                                    />
                                    {categoria.name}
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="hidden shrink-0 items-center gap-0.5 sm:flex">
                              <button
                                type="button"
                                aria-label={`Rimetti fra le attive "${elemento.title}"`}
                                onClick={() => ripristina(elemento)}
                                className="tap rounded-xl p-2 text-ink-3 transition-colors hover:bg-elev hover:text-ink"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Elimina definitivamente "${elemento.title}"`}
                                onClick={() => setDaEliminare(elemento)}
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
          ))}
        </div>
      )}

      <ConfirmDialog
        aperto={daEliminare !== null}
        onChiudi={() => setDaEliminare(null)}
        titolo="Eliminare definitivamente?"
        descrizione={
          daEliminare
            ? `"${daEliminare.title}" verrà cancellata per sempre dall’archivio.`
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
