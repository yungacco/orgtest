import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/Controls'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { oggiISO, sommaGiorni } from '@/lib/format'
import { PRIORITIES, RECURRENCES } from '@/types'
import type { Priority, Recurrence, Task, TaskInput } from '@/types'
import { ETICHETTE_RICORRENZA } from './ricorrenze'
import { useCategorieTask, useCreaTask, useModificaTask } from './hooks'

export function ModuloTask({
  aperto,
  onChiudi,
  task,
}: {
  aperto: boolean
  onChiudi: () => void
  task?: Task | null
}) {
  const { categorie } = useCategorieTask()
  const crea = useCreaTask()
  const modifica = useModificaTask()
  const toast = useToast()

  const [titolo, setTitolo] = useState('')
  const [note, setNote] = useState('')
  const [priorita, setPriorita] = useState<Priority>('media')
  const [scadenza, setScadenza] = useState('')
  const [categoria, setCategoria] = useState('')
  const [ricorrenza, setRicorrenza] = useState<Recurrence | ''>('')
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    if (!aperto) return
    setErrore(null)
    setTitolo(task?.title ?? '')
    setNote(task?.notes ?? '')
    setPriorita(task?.priority ?? 'media')
    setScadenza(task?.due_date ?? '')
    setCategoria(task?.category_id ?? '')
    setRicorrenza(task?.recurrence ?? '')
  }, [aperto, task])

  async function invia(e: React.FormEvent) {
    e.preventDefault()
    if (titolo.trim() === '') {
      setErrore('Scrivi che cosa devi fare.')
      return
    }

    const input: TaskInput = {
      title: titolo.trim(),
      notes: note.trim() === '' ? null : note.trim(),
      priority: priorita,
      due_date: scadenza === '' ? null : scadenza,
      category_id: categoria === '' ? null : categoria,
      recurrence: ricorrenza === '' ? null : ricorrenza,
    }

    try {
      if (task) {
        await modifica.mutateAsync({ id: task.id, patch: input })
        toast.successo('Task aggiornata.')
      } else {
        await crea.mutateAsync(input)
        toast.successo('Task creata.')
      }
      onChiudi()
    } catch {
      /* l'errore lo mostra gia' il toast del hook */
    }
  }

  return (
    <Modal
      aperto={aperto}
      onChiudi={onChiudi}
      titolo={task ? 'Modifica task' : 'Nuova task'}
      footer={
        <>
          <Button variante="secondario" onClick={onChiudi}>
            Annulla
          </Button>
          <Button
            type="submit"
            form="modulo-task"
            caricamento={crea.isPending || modifica.isPending}
          >
            Salva
          </Button>
        </>
      }
    >
      <form id="modulo-task" onSubmit={invia} className="space-y-4" noValidate>
        <Field etichetta="Che cosa devi fare" richiesto>
          {(id) => (
            <Input
              id={id}
              data-autofocus
              value={titolo}
              onChange={(e) => setTitolo(e.target.value)}
              placeholder="Prenotare la visita"
              required
            />
          )}
        </Field>

        <Field etichetta="Note" descrizione="Facoltative">
          {(id) => (
            <Textarea
              id={id}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Dettagli, numeri di telefono, link…"
            />
          )}
        </Field>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-ink-2">Priorità</span>
          <SegmentedControl
            etichetta="Priorità"
            opzioni={PRIORITIES.map((p) => ({
              valore: p,
              etichetta: p.charAt(0).toUpperCase() + p.slice(1),
            }))}
            valore={priorita}
            onChange={setPriorita}
          />
        </div>

        <Field etichetta="Scadenza" descrizione="Facoltativa">
          {(id) => (
            <>
              <Input
                id={id}
                type="date"
                value={scadenza}
                onChange={(e) => setScadenza(e.target.value)}
              />
              <div className="flex flex-wrap gap-2 pt-2">
                {[
                  { etichetta: 'Oggi', valore: oggiISO() },
                  { etichetta: 'Domani', valore: sommaGiorni(oggiISO(), 1) },
                  { etichetta: 'Fra una settimana', valore: sommaGiorni(oggiISO(), 7) },
                ].map((scorciatoia) => (
                  <button
                    key={scorciatoia.etichetta}
                    type="button"
                    onClick={() => setScadenza(scorciatoia.valore)}
                    className="rounded-full bg-elev px-3 py-1 text-[0.8rem] font-medium text-ink-2 transition-colors hover:bg-accent-500/12 hover:text-accent-700 dark:hover:text-accent-300"
                  >
                    {scorciatoia.etichetta}
                  </button>
                ))}
                {scadenza !== '' && (
                  <button
                    type="button"
                    onClick={() => setScadenza('')}
                    className="rounded-full px-3 py-1 text-[0.8rem] text-ink-3 hover:text-danger"
                  >
                    Togli la scadenza
                  </button>
                )}
              </div>
            </>
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            etichetta="Categoria"
            descrizione={
              categorie.length === 0 ? 'Puoi crearle in Impostazioni.' : undefined
            }
          >
            {(id) => (
              <Select
                id={id}
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
              >
                <option value="">Nessuna</option>
                {categorie.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            etichetta="Si ripete"
            descrizione="Al completamento ne creo automaticamente una nuova."
          >
            {(id) => (
              <Select
                id={id}
                value={ricorrenza}
                onChange={(e) => setRicorrenza(e.target.value as Recurrence | '')}
              >
                <option value="">Mai</option>
                {RECURRENCES.map((r) => (
                  <option key={r} value={r}>
                    {ETICHETTE_RICORRENZA[r]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        {errore && (
          <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            {errore}
          </p>
        )}
      </form>
    </Modal>
  )
}
