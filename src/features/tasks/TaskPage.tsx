import { useMemo, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Archive, GripVertical, ListTodo, Pencil, Plus, Repeat, Trash2 } from 'lucide-react'
import { Button, LinkButton } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Field'
import { Chip } from '@/components/ui/Controls'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState, ErrorState, SkeletonLista } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'
import { useAperturaRapida } from '@/lib/aperturaRapida'
import { cn } from '@/lib/cn'
import { oggiISO, scadenzaTestuale } from '@/lib/format'
import { ETICHETTE_RICORRENZA } from './ricorrenze'
import { ModuloTask } from './ModuloTask'
import {
  useAnnullaCompletamento,
  useCategorieTask,
  useCompletaTask,
  useEliminaTask,
  useRiordinaTask,
  useTaskAttive,
} from './hooks'
import type { Priority, Task, TaskCategory } from '@/types'

const COLORI_PRIORITA: Record<Priority, string> = {
  alta: 'bg-danger',
  media: 'bg-warn',
  bassa: 'bg-ink-3',
}

export function TaskPage() {
  const { task, caricamento, errore, ricarica } = useTaskAttive()
  const { categorie } = useCategorieTask()
  const completa = useCompletaTask()
  const annulla = useAnnullaCompletamento()
  const elimina = useEliminaTask()
  const riordina = useRiordinaTask()
  const toast = useToast()

  const [apertoDaFab, chiudiFab] = useAperturaRapida()
  const [moduloAperto, setModuloAperto] = useState(false)
  const [inModifica, setInModifica] = useState<Task | null>(null)
  const [daEliminare, setDaEliminare] = useState<Task | null>(null)
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null)
  // task che stanno "uscendo" dalla lista: servono per l'animazione
  const [inUscita, setInUscita] = useState<string[]>([])

  const sensori = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const visibili = useMemo(
    () =>
      categoriaFiltro === null
        ? task
        : task.filter((t) => t.category_id === categoriaFiltro),
    [task, categoriaFiltro],
  )

  const scadute = useMemo(
    () => task.filter((t) => t.due_date !== null && t.due_date < oggiISO()).length,
    [task],
  )

  function completaConAnnulla(daCompletare: Task) {
    setInUscita((precedenti) => [...precedenti, daCompletare.id])
    // lasciamo finire l'animazione di uscita prima di togliere la riga
    window.setTimeout(async () => {
      try {
        const esito = await completa.mutateAsync(daCompletare)
        toast.successo('Task completata.', {
          etichetta: 'Annulla',
          onClick: () =>
            annulla.mutate({
              id: esito.completata.id,
              idSuccessiva: esito.successiva?.id ?? null,
            }),
        })
        if (esito.successiva) {
          toast.info(
            `Ho già creato la prossima: ${ETICHETTE_RICORRENZA[daCompletare.recurrence!].toLowerCase()}.`,
          )
        }
      } finally {
        setInUscita((precedenti) => precedenti.filter((id) => id !== daCompletare.id))
      }
    }, 220)
  }

  function fineTrascinamento(evento: DragEndEvent) {
    const { active, over } = evento
    if (!over || active.id === over.id) return
    const vecchio = task.findIndex((t) => t.id === active.id)
    const nuovo = task.findIndex((t) => t.id === over.id)
    if (vecchio < 0 || nuovo < 0) return
    riordina.mutate(arrayMove(task, vecchio, nuovo))
  }

  const aperto = moduloAperto || apertoDaFab
  function chiudiModulo() {
    setModuloAperto(false)
    setInModifica(null)
    if (apertoDaFab) chiudiFab()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        titolo="Task"
        sottotitolo={
          task.length === 0
            ? 'Le cose da fare, in ordine'
            : `${task.length} da fare${scadute > 0 ? ` · ${scadute} in ritardo` : ''}`
        }
        azioni={
          <>
            <LinkButton
              to="/archivio"
              variante="secondario"
              iconaSinistra={<Archive className="h-4 w-4" />}
            >
              <span className="hidden sm:inline">Archivio</span>
            </LinkButton>
            <Button
              className="hidden sm:inline-flex"
              iconaSinistra={<Plus className="h-4 w-4" />}
              onClick={() => {
                setInModifica(null)
                setModuloAperto(true)
              }}
            >
              Nuova task
            </Button>
          </>
        }
      />

      {categorie.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip attivo={categoriaFiltro === null} onClick={() => setCategoriaFiltro(null)}>
            Tutte
          </Chip>
          {categorie.map((categoria) => (
            <Chip
              key={categoria.id}
              attivo={categoriaFiltro === categoria.id}
              colore={categoria.color}
              className="shrink-0"
              onClick={() =>
                setCategoriaFiltro(categoriaFiltro === categoria.id ? null : categoria.id)
              }
            >
              {categoria.name}
            </Chip>
          ))}
        </div>
      )}

      {errore ? (
        <ErrorState messaggio={errore.message} onRiprova={() => void ricarica()} />
      ) : caricamento ? (
        <SkeletonLista righe={4} />
      ) : task.length === 0 ? (
        <EmptyState
          icona={<ListTodo className="h-7 w-7" />}
          titolo="Non hai task da fare"
          descrizione="Aggiungi quello che devi ricordarti: puoi dare una priorità, una scadenza e farlo ripetere ogni giorno, settimana o mese. Quando completi una task finisce in archivio."
          azione={
            <Button
              iconaSinistra={<Plus className="h-4 w-4" />}
              onClick={() => setModuloAperto(true)}
            >
              Crea la prima task
            </Button>
          }
        />
      ) : visibili.length === 0 ? (
        <EmptyState
          titolo="Nessuna task in questa categoria"
          descrizione="Cambia categoria oppure crea una nuova task assegnandola a questa."
          azione={
            <Button variante="secondario" onClick={() => setCategoriaFiltro(null)}>
              Mostra tutte
            </Button>
          }
        />
      ) : (
        <>
          <DndContext
            sensors={sensori}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={fineTrascinamento}
          >
            <SortableContext
              items={visibili.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2">
                {visibili.map((elemento) => (
                  <RigaTask
                    key={elemento.id}
                    task={elemento}
                    categoria={categorie.find((c) => c.id === elemento.category_id) ?? null}
                    inUscita={inUscita.includes(elemento.id)}
                    riordinabile={categoriaFiltro === null}
                    onCompleta={() => completaConAnnulla(elemento)}
                    onModifica={() => {
                      setInModifica(elemento)
                      setModuloAperto(true)
                    }}
                    onElimina={() => setDaEliminare(elemento)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          {categoriaFiltro === null && task.length > 1 && (
            <p className="text-center text-xs text-ink-3">
              Trascina la maniglia a sinistra per cambiare l’ordine.
            </p>
          )}
        </>
      )}

      <ModuloTask aperto={aperto} onChiudi={chiudiModulo} task={inModifica} />

      <ConfirmDialog
        aperto={daEliminare !== null}
        onChiudi={() => setDaEliminare(null)}
        titolo="Eliminare la task?"
        descrizione={
          daEliminare
            ? `"${daEliminare.title}" verrà eliminata definitivamente, senza finire in archivio.`
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

function RigaTask({
  task,
  categoria,
  inUscita,
  riordinabile,
  onCompleta,
  onModifica,
  onElimina,
}: {
  task: Task
  categoria: TaskCategory | null
  inUscita: boolean
  riordinabile: boolean
  onCompleta: () => void
  onModifica: () => void
  onElimina: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled: !riordinabile })

  const inRitardo = task.due_date !== null && task.due_date < oggiISO()

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'card flex items-start gap-2 p-3 transition-[opacity,transform] duration-200',
        isDragging && 'z-10 opacity-90 shadow-lift',
        inUscita && 'translate-x-6 opacity-0',
      )}
    >
      {riordinabile && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Sposta "${task.title}"`}
          className="mt-1 shrink-0 cursor-grab touch-none rounded-lg p-1 text-ink-3 hover:bg-elev active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      <div className="mt-0.5 shrink-0">
        <Checkbox
          checked={false}
          onChange={onCompleta}
          etichetta={`Segna "${task.title}" come completata`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug text-ink">{task.title}</p>
        {task.notes && (
          <p className="mt-0.5 line-clamp-2 text-sm text-ink-2">{task.notes}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="flex items-center gap-1.5 text-ink-3">
            <span
              className={cn('h-2 w-2 rounded-full', COLORI_PRIORITA[task.priority])}
              aria-hidden
            />
            <span className="capitalize">{task.priority}</span>
          </span>
          {task.due_date && (
            <span className={cn(inRitardo ? 'font-medium text-danger' : 'text-ink-3')}>
              {scadenzaTestuale(task.due_date)}
            </span>
          )}
          {categoria && (
            <span className="flex items-center gap-1.5 text-ink-3">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: categoria.color }}
                aria-hidden
              />
              {categoria.name}
            </span>
          )}
          {task.recurrence && (
            <span
              className="flex items-center gap-1 text-ink-3"
              title={ETICHETTE_RICORRENZA[task.recurrence]}
            >
              <Repeat className="h-3 w-3" aria-hidden />
              {ETICHETTE_RICORRENZA[task.recurrence].toLowerCase()}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          aria-label={`Modifica "${task.title}"`}
          onClick={onModifica}
          className="tap rounded-xl p-2 text-ink-3 transition-colors hover:bg-elev hover:text-ink"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={`Elimina "${task.title}"`}
          onClick={onElimina}
          className="tap rounded-xl p-2 text-ink-3 transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  )
}
