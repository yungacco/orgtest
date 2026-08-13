import { useMemo, useState } from 'react'
import { Dices, Lock, LockOpen, RefreshCw, Sparkles } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Controls'
import { Field, Input, Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { capitalizza, formatData, oggiISO } from '@/lib/format'
import { useRicette, useTagRicette } from '@/features/recipes/hooks'
import { MEAL_SLOTS } from '@/types'
import type { ISODate, MealSlot } from '@/types'
import type { SlotPiano } from './api'
import { candidatePerPasto, estraiRicetta, generaPiano } from './generatore'
import { useSalvaPiano } from './hooks'

interface Props {
  aperto: boolean
  onChiudi: () => void
  /** giorno da cui partire (di solito il lunedi' della settimana mostrata) */
  dataIniziale: ISODate
  /** pasti gia' bloccati nel periodo: vengono mantenuti */
  bloccati: SlotPiano[]
}

export function GeneratoreDialog({ aperto, onChiudi, dataIniziale, bloccati }: Props) {
  const { ricette } = useRicette()
  const { tag } = useTagRicette()
  const salva = useSalvaPiano()
  const toast = useToast()

  const [dataInizio, setDataInizio] = useState(dataIniziale)
  const [giorni, setGiorni] = useState(7)
  const [pasti, setPasti] = useState<MealSlot[]>(['pranzo', 'cena'])
  const [tagScelti, setTagScelti] = useState<string[]>([])
  const [distanza, setDistanza] = useState(3)
  const [mantieniBloccati, setMantieniBloccati] = useState(true)
  const [anteprima, setAnteprima] = useState<SlotPiano[] | null>(null)

  const tagDisponibili = useMemo(() => {
    const insieme = new Set(ricette.flatMap((r) => r.tags))
    tag.forEach((t) => insieme.add(t.name))
    return [...insieme].sort((a, b) => a.localeCompare(b, 'it'))
  }, [ricette, tag])

  const nomeRicetta = (id: string) => ricette.find((r) => r.id === id)?.title ?? 'Ricetta rimossa'

  function genera(mantieni: SlotPiano[] = []) {
    if (ricette.length === 0) {
      toast.errore('Aggiungi almeno una ricetta prima di generare il menù.')
      return
    }
    if (pasti.length === 0) {
      toast.errore('Scegli almeno un pasto da includere.')
      return
    }
    const piano = generaPiano({
      ricette,
      dataInizio,
      giorni,
      pasti,
      tag: tagScelti,
      distanzaMinima: distanza,
      daMantenere: mantieni,
    })
    setAnteprima(piano)
  }

  function ritira(indice: number) {
    setAnteprima((precedente) => {
      if (!precedente) return precedente
      const slot = precedente[indice]
      const candidate = candidatePerPasto(ricette, slot.meal, tagScelti)
      const altri = precedente.filter((_, i) => i !== indice)
      const nuova = estraiRicetta(candidate, slot.date, altri, distanza, slot.recipe_id)
      if (!nuova) {
        toast.info('Non ci sono altre ricette disponibili per questo pasto.')
        return precedente
      }
      return precedente.map((s, i) => (i === indice ? { ...s, recipe_id: nuova.id } : s))
    })
  }

  function blocca(indice: number) {
    setAnteprima((precedente) =>
      precedente
        ? precedente.map((s, i) => (i === indice ? { ...s, pinned: !s.pinned } : s))
        : precedente,
    )
  }

  async function conferma() {
    if (!anteprima) return
    await salva.mutateAsync(anteprima)
    toast.successo(
      `Menù salvato nel calendario (${anteprima.length} ${anteprima.length === 1 ? 'pasto' : 'pasti'}).`,
    )
    setAnteprima(null)
    onChiudi()
  }

  const giorniAnteprima = useMemo(() => {
    if (!anteprima) return []
    const mappa = new Map<ISODate, SlotPiano[]>()
    anteprima.forEach((slot) => {
      const elenco = mappa.get(slot.date) ?? []
      elenco.push(slot)
      mappa.set(slot.date, elenco)
    })
    return [...mappa.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [anteprima])

  return (
    <Modal
      aperto={aperto}
      onChiudi={() => {
        setAnteprima(null)
        onChiudi()
      }}
      titolo="Genera il menù"
      descrizione={
        anteprima
          ? 'Ri-tira i pasti che non ti convincono, blocca quelli che ti piacciono, poi salva.'
          : 'Scegli per quanti giorni e quali pasti: l’app estrae le ricette a caso fra quelle che hai salvato.'
      }
      larghezza="lg"
      footer={
        anteprima ? (
          <>
            <Button
              variante="secondario"
              iconaSinistra={<RefreshCw className="h-4 w-4" />}
              onClick={() => genera(anteprima.filter((s) => s.pinned))}
            >
              Rigenera i non bloccati
            </Button>
            <Button onClick={conferma} caricamento={salva.isPending}>
              Salva nel calendario
            </Button>
          </>
        ) : (
          <>
            <Button variante="secondario" onClick={onChiudi}>
              Annulla
            </Button>
            <Button
              iconaSinistra={<Dices className="h-4 w-4" />}
              onClick={() => genera(mantieniBloccati ? bloccati : [])}
            >
              Genera
            </Button>
          </>
        )
      }
    >
      {anteprima ? (
        <ul className="space-y-4">
          {giorniAnteprima.map(([data, slot]) => (
            <li key={data}>
              <h3 className="mb-1.5 text-sm font-semibold text-ink">
                {capitalizza(formatData(data, 'EEEE d MMMM'))}
              </h3>
              <ul className="space-y-1.5">
                {slot.map((casella) => {
                  const indice = anteprima.indexOf(casella)
                  return (
                    <li
                      key={`${casella.date}-${casella.meal}`}
                      className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2"
                    >
                      <span className="w-20 shrink-0 text-xs font-medium uppercase tracking-wide text-ink-3">
                        {casella.meal}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[0.95rem] text-ink">
                        {nomeRicetta(casella.recipe_id)}
                      </span>
                      <IconButton
                        etichetta={
                          casella.pinned
                            ? `Sblocca ${casella.meal} del ${formatData(casella.date)}`
                            : `Blocca ${casella.meal} del ${formatData(casella.date)}`
                        }
                        dimensione="sm"
                        className={casella.pinned ? 'text-accent-600 dark:text-accent-300' : ''}
                        onClick={() => blocca(indice)}
                      >
                        {casella.pinned ? (
                          <Lock className="h-4 w-4" />
                        ) : (
                          <LockOpen className="h-4 w-4" />
                        )}
                      </IconButton>
                      <IconButton
                        etichetta={`Cambia ${casella.meal} del ${formatData(casella.date)}`}
                        dimensione="sm"
                        disabled={casella.pinned}
                        onClick={() => ritira(indice)}
                      >
                        <Dices className="h-4 w-4" />
                      </IconButton>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field etichetta="Si parte dal">
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  value={dataInizio}
                  min={oggiISO()}
                  onChange={(e) => setDataInizio(e.target.value)}
                />
              )}
            </Field>
            <Field etichetta="Per quanti giorni">
              {(id) => (
                <Select
                  id={id}
                  value={giorni}
                  onChange={(e) => setGiorni(Number(e.target.value))}
                >
                  {Array.from({ length: 14 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'giorno' : 'giorni'}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-ink-2">Quali pasti</p>
            <div className="flex flex-wrap gap-2">
              {MEAL_SLOTS.map((slot) => {
                const attivo = pasti.includes(slot)
                const quante = candidatePerPasto(ricette, slot, tagScelti).length
                return (
                  <Chip
                    key={slot}
                    attivo={attivo}
                    className="capitalize"
                    titolo={`${quante} ricette disponibili`}
                    onClick={() =>
                      setPasti((precedenti) =>
                        attivo
                          ? precedenti.filter((p) => p !== slot)
                          : [...precedenti, slot],
                      )
                    }
                  >
                    {slot}
                  </Chip>
                )
              })}
            </div>
          </div>

          {tagDisponibili.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-ink-2">
                Solo ricette con questi tag{' '}
                <span className="font-normal text-ink-3">(facoltativo)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {tagDisponibili.map((nome) => {
                  const attivo = tagScelti.includes(nome)
                  return (
                    <Chip
                      key={nome}
                      attivo={attivo}
                      onClick={() =>
                        setTagScelti((precedenti) =>
                          attivo
                            ? precedenti.filter((t) => t !== nome)
                            : [...precedenti, nome],
                        )
                      }
                    >
                      #{nome}
                    </Chip>
                  )
                })}
              </div>
            </div>
          )}

          <Field
            etichetta="Non ripetere la stessa ricetta"
            descrizione="Se hai poche ricette l’app potrebbe doverle ripetere comunque."
          >
            {(id) => (
              <Select
                id={id}
                value={distanza}
                onChange={(e) => setDistanza(Number(e.target.value))}
              >
                <option value={1}>Nello stesso giorno</option>
                <option value={2}>Per 2 giorni</option>
                <option value={3}>Per 3 giorni</option>
                <option value={5}>Per 5 giorni</option>
                <option value={7}>Per una settimana</option>
              </Select>
            )}
          </Field>

          {bloccati.length > 0 && (
            <label className="flex items-start gap-3 rounded-xl bg-elev p-3 text-sm">
              <input
                type="checkbox"
                checked={mantieniBloccati}
                onChange={(e) => setMantieniBloccati(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-current text-accent-600"
              />
              <span className="text-ink-2">
                {bloccati.length === 1
                  ? 'Mantieni il pasto che hai bloccato nel calendario'
                  : `Mantieni i ${bloccati.length} pasti che hai bloccato nel calendario`}
              </span>
            </label>
          )}

          <p className="flex items-start gap-2 rounded-xl bg-accent-500/10 p-3 text-sm text-ink-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent-600 dark:text-accent-300" aria-hidden />
            Hai {ricette.length} ricette salvate. Il menù userà quelle della categoria
            giusta per ogni pasto; se per un pasto non ne hai, pescherà dalle altre.
          </p>
        </div>
      )}
    </Modal>
  )
}
