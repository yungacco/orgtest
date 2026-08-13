import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Chip, SegmentedControl } from '@/components/ui/Controls'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { formatNumeroCompatto, oggiISO, parseNumero } from '@/lib/format'
import { INTENSITA } from '@/types'
import type { Intensita, Workout } from '@/types'
import { ATTIVITA_SUGGERITE, vuoleDistanza } from './statistiche'
import { useCreaAllenamento, useModificaAllenamento } from './hooks'

const DURATE_RAPIDE = [20, 30, 45, 60, 90]

export function ModuloAllenamento({
  aperto,
  onChiudi,
  allenamento,
}: {
  aperto: boolean
  onChiudi: () => void
  allenamento?: Workout | null
}) {
  const crea = useCreaAllenamento()
  const modifica = useModificaAllenamento()
  const toast = useToast()

  const [data, setData] = useState(oggiISO())
  const [attivita, setAttivita] = useState('')
  const [durata, setDurata] = useState('')
  const [intensita, setIntensita] = useState<Intensita>('media')
  const [distanza, setDistanza] = useState('')
  const [calorie, setCalorie] = useState('')
  const [note, setNote] = useState('')
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    if (!aperto) return
    setErrore(null)
    setData(allenamento?.date ?? oggiISO())
    setAttivita(allenamento?.activity ?? '')
    setDurata(allenamento ? String(allenamento.duration_min) : '')
    setIntensita(allenamento?.intensity ?? 'media')
    setDistanza(
      allenamento?.distance_km == null
        ? ''
        : formatNumeroCompatto(Number(allenamento.distance_km), 2),
    )
    setCalorie(allenamento?.calories == null ? '' : String(allenamento.calories))
    setNote(allenamento?.notes ?? '')
  }, [aperto, allenamento])

  // i chilometri hanno senso per corsa, bici, nuoto... non per la palestra
  const mostraDistanza = vuoleDistanza(attivita) || distanza !== ''

  async function invia(e: React.FormEvent) {
    e.preventDefault()

    if (attivita.trim() === '') {
      setErrore('Scrivi che tipo di allenamento hai fatto.')
      return
    }
    const minuti = parseNumero(durata)
    if (minuti === null || minuti <= 0) {
      setErrore('Indica quanto è durato, in minuti.')
      return
    }
    if (minuti > 1440) {
      setErrore('La durata non può superare le 24 ore.')
      return
    }
    if (data > oggiISO()) {
      setErrore('Non puoi registrare un allenamento in una data futura.')
      return
    }

    const input = {
      date: data,
      activity: attivita.trim(),
      duration_min: Math.round(minuti),
      intensity: intensita,
      distance_km: distanza.trim() === '' ? null : parseNumero(distanza),
      calories: calorie.trim() === '' ? null : Math.round(parseNumero(calorie) ?? 0),
      notes: note.trim() === '' ? null : note.trim(),
    }

    try {
      if (allenamento) {
        await modifica.mutateAsync({ id: allenamento.id, patch: input })
        toast.successo('Allenamento aggiornato.')
      } else {
        await crea.mutateAsync(input)
        toast.successo('Allenamento registrato. 💪')
      }
      onChiudi()
    } catch {
      /* il messaggio lo mostra gia' il toast del hook */
    }
  }

  return (
    <Modal
      aperto={aperto}
      onChiudi={onChiudi}
      titolo={allenamento ? 'Modifica allenamento' : 'Registra allenamento'}
      descrizione={
        allenamento ? undefined : 'Che cosa hai fatto e per quanto tempo. Il resto è facoltativo.'
      }
      footer={
        <>
          <Button variante="secondario" onClick={onChiudi}>
            Annulla
          </Button>
          <Button
            type="submit"
            form="modulo-allenamento"
            caricamento={crea.isPending || modifica.isPending}
          >
            Salva
          </Button>
        </>
      }
    >
      <form id="modulo-allenamento" onSubmit={invia} className="space-y-4" noValidate>
        <div className="space-y-2">
          <span className="block text-sm font-medium text-ink-2">Tipo di allenamento</span>
          <div className="flex flex-wrap gap-2">
            {ATTIVITA_SUGGERITE.map((a) => (
              <Chip
                key={a.nome}
                attivo={attivita.trim().toLowerCase() === a.nome.toLowerCase()}
                onClick={() => setAttivita(a.nome)}
              >
                <span aria-hidden>{a.emoji}</span> {a.nome}
              </Chip>
            ))}
          </div>
          <Input
            data-autofocus
            value={attivita}
            onChange={(e) => setAttivita(e.target.value)}
            placeholder="oppure scrivilo tu: pilates, arrampicata…"
            aria-label="Tipo di allenamento"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field etichetta="Data" richiesto>
            {(id) => (
              <Input
                id={id}
                type="date"
                value={data}
                max={oggiISO()}
                onChange={(e) => setData(e.target.value)}
                required
              />
            )}
          </Field>

          <Field etichetta="Durata (minuti)" richiesto>
            {(id) => (
              <>
                <Input
                  id={id}
                  inputMode="numeric"
                  value={durata}
                  onChange={(e) => setDurata(e.target.value)}
                  placeholder="45"
                  required
                />
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {DURATE_RAPIDE.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDurata(String(m))}
                      className="rounded-full bg-elev px-2.5 py-1 text-xs font-medium text-ink-2 transition-colors hover:bg-accent-500/12 hover:text-accent-700 dark:hover:text-accent-300"
                    >
                      {m}′
                    </button>
                  ))}
                </div>
              </>
            )}
          </Field>
        </div>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-ink-2">Intensità</span>
          <SegmentedControl
            etichetta="Intensità"
            opzioni={INTENSITA.map((i) => ({
              valore: i,
              etichetta: i.charAt(0).toUpperCase() + i.slice(1),
            }))}
            valore={intensita}
            onChange={setIntensita}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {mostraDistanza && (
            <Field etichetta="Distanza (km)" descrizione="Facoltativa">
              {(id) => (
                <Input
                  id={id}
                  inputMode="decimal"
                  value={distanza}
                  onChange={(e) => setDistanza(e.target.value)}
                  placeholder="7,5"
                />
              )}
            </Field>
          )}
          <Field etichetta="Calorie bruciate" descrizione="Facoltative">
            {(id) => (
              <Input
                id={id}
                inputMode="numeric"
                value={calorie}
                onChange={(e) => setCalorie(e.target.value)}
                placeholder="450"
              />
            )}
          </Field>
        </div>

        <Field
          etichetta="Cosa hai fatto"
          descrizione="Facoltativo: la scheda, i tempi, come ti sei sentito…"
        >
          {(id) => (
            <Textarea
              id={id}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="3×10 panca 60 kg, 3×12 squat 80 kg…"
            />
          )}
        </Field>

        {errore && (
          <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            {errore}
          </p>
        )}
      </form>
    </Modal>
  )
}
