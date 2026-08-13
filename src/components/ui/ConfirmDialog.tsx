import { useState } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'
import { Input } from './Field'

export interface ConfirmDialogProps {
  aperto: boolean
  onChiudi: () => void
  onConferma: () => void | Promise<void>
  titolo: string
  descrizione: string
  etichettaConferma?: string
  pericoloso?: boolean
  /** Se valorizzato, l'utente deve digitare esattamente questa parola. */
  parolaDiConferma?: string
}

/**
 * Richiesta di conferma prima di un'azione irreversibile.
 * Con `parolaDiConferma` diventa una doppia conferma (serve digitare la parola).
 */
export function ConfirmDialog({
  aperto,
  onChiudi,
  onConferma,
  titolo,
  descrizione,
  etichettaConferma = 'Conferma',
  pericoloso,
  parolaDiConferma,
}: ConfirmDialogProps) {
  const [testo, setTesto] = useState('')
  const [inCorso, setInCorso] = useState(false)

  const puoConfermare =
    !parolaDiConferma || testo.trim().toUpperCase() === parolaDiConferma.toUpperCase()

  async function conferma() {
    if (!puoConfermare) return
    setInCorso(true)
    try {
      await onConferma()
      setTesto('')
      onChiudi()
    } finally {
      setInCorso(false)
    }
  }

  return (
    <Modal
      aperto={aperto}
      onChiudi={() => {
        setTesto('')
        onChiudi()
      }}
      titolo={titolo}
      larghezza="sm"
      footer={
        <>
          <Button
            variante="secondario"
            onClick={() => {
              setTesto('')
              onChiudi()
            }}
          >
            Annulla
          </Button>
          <Button
            variante={pericoloso ? 'pericolo' : 'primario'}
            onClick={conferma}
            disabled={!puoConfermare}
            caricamento={inCorso}
          >
            {etichettaConferma}
          </Button>
        </>
      }
    >
      <p className="text-[0.95rem] leading-relaxed text-ink-2">{descrizione}</p>
      {parolaDiConferma && (
        <div className="mt-4 space-y-1.5">
          <label htmlFor="conferma-parola" className="block text-sm font-medium text-ink-2">
            Scrivi <span className="font-mono font-semibold text-ink">{parolaDiConferma}</span>{' '}
            per confermare
          </label>
          <Input
            id="conferma-parola"
            data-autofocus
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            autoComplete="off"
            placeholder={parolaDiConferma}
          />
        </div>
      )}
    </Modal>
  )
}
