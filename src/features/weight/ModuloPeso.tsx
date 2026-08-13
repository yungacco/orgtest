import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { formatNumeroCompatto, oggiISO, parseNumero } from '@/lib/format'
import { kgToUnit, unitToKg } from '@/lib/units'
import { useProfilo } from '@/features/settings/hooks'
import { useAggiornaPeso, useSalvaPeso } from './hooks'
import type { WeightEntry } from '@/types'

interface Props {
  aperto: boolean
  onChiudi: () => void
  /** se valorizzato si sta modificando una misurazione esistente */
  misurazione?: WeightEntry | null
}

export function ModuloPeso({ aperto, onChiudi, misurazione }: Props) {
  const { profilo } = useProfilo()
  const unita = profilo.weight_unit
  const salva = useSalvaPeso()
  const aggiorna = useAggiornaPeso()
  const toast = useToast()

  const [data, setData] = useState(oggiISO())
  const [peso, setPeso] = useState('')
  const [massaGrassa, setMassaGrassa] = useState('')
  const [nota, setNota] = useState('')
  const [errore, setErrore] = useState<string | null>(null)

  // ogni volta che la finestra si apre, riempi i campi
  useEffect(() => {
    if (!aperto) return
    setErrore(null)
    if (misurazione) {
      setData(misurazione.date)
      setPeso(formatNumeroCompatto(kgToUnit(Number(misurazione.weight_kg), unita), 2))
      setMassaGrassa(
        misurazione.body_fat === null ? '' : formatNumeroCompatto(Number(misurazione.body_fat), 1),
      )
      setNota(misurazione.note ?? '')
    } else {
      setData(oggiISO())
      setPeso('')
      setMassaGrassa('')
      setNota('')
    }
  }, [aperto, misurazione, unita])

  async function invia(e: React.FormEvent) {
    e.preventDefault()
    const valore = parseNumero(peso)
    if (valore === null || valore <= 0) {
      setErrore('Scrivi il peso, per esempio 72,4')
      return
    }
    const grasso = massaGrassa.trim() === '' ? null : parseNumero(massaGrassa)
    if (grasso !== null && (grasso < 0 || grasso > 100)) {
      setErrore('La massa grassa va da 0 a 100%.')
      return
    }
    if (data > oggiISO()) {
      setErrore('Non puoi registrare un peso in una data futura.')
      return
    }

    const input = {
      date: data,
      weight_kg: Number(unitToKg(valore, unita).toFixed(2)),
      body_fat: grasso,
      note: nota.trim() === '' ? null : nota.trim(),
    }

    try {
      if (misurazione) {
        await aggiorna.mutateAsync({ id: misurazione.id, patch: input })
        toast.successo('Misurazione aggiornata.')
      } else {
        await salva.mutateAsync(input)
        toast.successo('Peso registrato.')
      }
      onChiudi()
    } catch {
      /* il messaggio d'errore lo mostra gia' il toast del hook */
    }
  }

  const inCorso = salva.isPending || aggiorna.isPending

  return (
    <Modal
      aperto={aperto}
      onChiudi={onChiudi}
      titolo={misurazione ? 'Modifica misurazione' : 'Registra il peso'}
      descrizione={
        misurazione
          ? undefined
          : 'La data è quella di oggi, ma puoi cambiarla per registrare un giorno passato.'
      }
      footer={
        <>
          <Button variante="secondario" onClick={onChiudi}>
            Annulla
          </Button>
          <Button type="submit" form="modulo-peso" caricamento={inCorso}>
            Salva
          </Button>
        </>
      }
    >
      <form id="modulo-peso" onSubmit={invia} className="space-y-4" noValidate>
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

          <Field etichetta={`Peso (${unita})`} richiesto>
            {(id) => (
              <Input
                id={id}
                data-autofocus
                type="text"
                inputMode="decimal"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                placeholder={unita === 'kg' ? '72,4' : '159,6'}
                required
              />
            )}
          </Field>
        </div>

        <Field
          etichetta="Massa grassa (%)"
          descrizione="Facoltativo: compilalo solo se hai una bilancia che la misura."
        >
          {(id) => (
            <Input
              id={id}
              type="text"
              inputMode="decimal"
              value={massaGrassa}
              onChange={(e) => setMassaGrassa(e.target.value)}
              placeholder="22,5"
            />
          )}
        </Field>

        <Field etichetta="Nota" descrizione="Facoltativa: com’è andata, come ti senti…">
          {(id) => (
            <Textarea
              id={id}
              rows={3}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Dopo la corsa, colazione leggera…"
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
