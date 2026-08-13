import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/Feedback'
import { FotoRicetta } from '@/features/recipes/FotoRicetta'
import { useRicette } from '@/features/recipes/hooks'
import type { MealSlot, Recipe } from '@/types'

/** Finestra per scegliere una ricetta da mettere in una casella del piano. */
export function SelettoreRicetta({
  aperto,
  onChiudi,
  onScelta,
  pasto,
  titolo = 'Scegli una ricetta',
}: {
  aperto: boolean
  onChiudi: () => void
  onScelta: (ricetta: Recipe) => void
  /** se indicato, le ricette di quella categoria vengono mostrate per prime */
  pasto?: MealSlot
  titolo?: string
}) {
  const { ricette } = useRicette()
  const [ricerca, setRicerca] = useState('')

  const elenco = useMemo(() => {
    const termine = ricerca.trim().toLowerCase()
    const filtrate = termine
      ? ricette.filter((r) => r.title.toLowerCase().includes(termine))
      : ricette
    if (!pasto) return filtrate
    return [...filtrate].sort((a, b) => {
      const aGiusta = a.category === pasto ? 0 : 1
      const bGiusta = b.category === pasto ? 0 : 1
      return aGiusta - bGiusta || a.title.localeCompare(b.title, 'it')
    })
  }, [ricette, ricerca, pasto])

  return (
    <Modal aperto={aperto} onChiudi={onChiudi} titolo={titolo}>
      <div className="space-y-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
            aria-hidden
          />
          <Input
            data-autofocus
            type="search"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            placeholder="Cerca una ricetta…"
            aria-label="Cerca una ricetta"
            className="pl-11"
          />
        </div>

        {elenco.length === 0 ? (
          <EmptyState
            titolo="Nessuna ricetta"
            descrizione="Non ho trovato ricette con questo nome. Aggiungine una dalla sezione Ricette."
          />
        ) : (
          <ul className="space-y-1.5">
            {elenco.map((ricetta) => (
              <li key={ricetta.id}>
                <button
                  type="button"
                  onClick={() => {
                    onScelta(ricetta)
                    onChiudi()
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-line p-2 text-left transition-colors hover:border-accent-500/40 hover:bg-elev"
                >
                  <FotoRicetta
                    percorso={ricetta.photo_path}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{ricetta.title}</span>
                    <span className="block text-xs capitalize text-ink-3">
                      {ricetta.category}
                      {ricetta.calories !== null &&
                        ` · ${Math.round(Number(ricetta.calories))} kcal`}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
