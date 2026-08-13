import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Plus, Share2, ShoppingCart, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Checkbox, Input } from '@/components/ui/Field'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState, ErrorState, SkeletonLista } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'
import { useAperturaRapida } from '@/lib/aperturaRapida'
import { cn } from '@/lib/cn'
import { parseNumero, plurale } from '@/lib/format'
import { descriviVoce, listaComeTesto } from './aggrega'
import { useAggiornaVoce, useAggiungiVoci, useEliminaVoce, usePulisciSpesa, useSpesa } from './hooks'

export function SpesaPage() {
  const { voci, caricamento, errore, ricarica } = useSpesa()
  const aggiungi = useAggiungiVoci()
  const aggiorna = useAggiornaVoce()
  const elimina = useEliminaVoce()
  const pulisci = usePulisciSpesa()
  const toast = useToast()
  const campoNuovo = useRef<HTMLInputElement>(null)

  const [apertoDaFab, chiudiFab] = useAperturaRapida()
  const [nuovo, setNuovo] = useState('')
  const [conferma, setConferma] = useState<'generate' | 'spuntate' | null>(null)

  // il pulsante "+" porta qui con ?nuovo=1: mettiamo il cursore nel campo
  useEffect(() => {
    if (apertoDaFab) {
      campoNuovo.current?.focus()
      chiudiFab()
    }
  }, [apertoDaFab, chiudiFab])

  const daPrendere = useMemo(() => voci.filter((v) => !v.checked), [voci])
  const prese = useMemo(() => voci.filter((v) => v.checked), [voci])

  /**
   * Accetta scritture veloci come "latte 2 l" o "pane 500 g":
   * l'ultima parola diventa l'unita' e il numero prima la quantita'.
   */
  function interpreta(testo: string) {
    const parti = testo.trim().split(/\s+/)
    if (parti.length >= 3) {
      const unita = parti[parti.length - 1]
      const quantita = parseNumero(parti[parti.length - 2])
      if (quantita !== null && !/\d/.test(unita)) {
        return { name: parti.slice(0, -2).join(' '), quantity: quantita, unit: unita }
      }
    }
    if (parti.length >= 2) {
      const quantita = parseNumero(parti[parti.length - 1])
      if (quantita !== null) {
        return { name: parti.slice(0, -1).join(' '), quantity: quantita, unit: null }
      }
    }
    return { name: testo.trim(), quantity: null, unit: null }
  }

  async function aggiungiVoce(e: React.FormEvent) {
    e.preventDefault()
    const testo = nuovo.trim()
    if (!testo) return
    const interpretato = interpreta(testo)
    setNuovo('')
    await aggiungi.mutateAsync([
      { ...interpretato, manual: true, sort_order: voci.length },
    ])
  }

  async function condividi() {
    const testo = listaComeTesto(voci)
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Lista della spesa', text: testo })
        return
      }
      await navigator.clipboard.writeText(testo)
      toast.successo('Lista copiata: puoi incollarla dove vuoi.')
    } catch (e) {
      // l'utente puo' aver annullato la condivisione: non e' un errore
      if ((e as Error)?.name === 'AbortError') return
      toast.errore('Non sono riuscito a copiare la lista.')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        titolo="Lista della spesa"
        sottotitolo={
          voci.length > 0
            ? `${plurale(daPrendere.length, 'articolo da prendere', 'articoli da prendere')}`
            : 'Generala dal piano pasti o scrivila a mano'
        }
        azioni={
          voci.length > 0 && (
            <Button
              variante="secondario"
              dimensione="sm"
              iconaSinistra={
                'share' in navigator ? (
                  <Share2 className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )
              }
              onClick={condividi}
            >
              {'share' in navigator ? 'Condividi' : 'Copia'}
            </Button>
          )
        }
      />

      <form onSubmit={aggiungiVoce} className="flex gap-2">
        <Input
          ref={campoNuovo}
          value={nuovo}
          onChange={(e) => setNuovo(e.target.value)}
          placeholder="Aggiungi un articolo (es. latte 2 l)"
          aria-label="Aggiungi un articolo alla lista"
        />
        <Button type="submit" iconaSinistra={<Plus className="h-4 w-4" />} disabled={!nuovo.trim()}>
          <span className="sr-only sm:not-sr-only">Aggiungi</span>
        </Button>
      </form>

      {errore ? (
        <ErrorState messaggio={errore.message} onRiprova={() => void ricarica()} />
      ) : caricamento ? (
        <SkeletonLista righe={5} />
      ) : voci.length === 0 ? (
        <EmptyState
          icona={<ShoppingCart className="h-7 w-7" />}
          titolo="Lista vuota"
          descrizione="Scrivi qui sopra quello che ti serve, oppure vai nel Piano pasti e usa “Lista della spesa”: gli ingredienti delle ricette pianificate finiranno qui, già raggruppati."
        />
      ) : (
        <div className="space-y-5">
          <ul className="space-y-1.5">
            <AnimatePresence initial={false}>
              {daPrendere.map((voce) => (
                <RigaSpesa
                  key={voce.id}
                  nome={descriviVoce(voce)}
                  manuale={voce.manual}
                  checked={false}
                  onToggle={() => aggiorna.mutate({ id: voce.id, patch: { checked: true } })}
                  onElimina={() => elimina.mutate(voce.id)}
                />
              ))}
            </AnimatePresence>
          </ul>

          {prese.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-3">
                  Nel carrello ({prese.length})
                </h2>
                <button
                  type="button"
                  onClick={() => setConferma('spuntate')}
                  className="text-sm text-ink-3 underline-offset-2 hover:text-danger hover:underline"
                >
                  Togli dalla lista
                </button>
              </div>
              <ul className="space-y-1.5">
                <AnimatePresence initial={false}>
                  {prese.map((voce) => (
                    <RigaSpesa
                      key={voce.id}
                      nome={descriviVoce(voce)}
                      manuale={voce.manual}
                      checked
                      onToggle={() => aggiorna.mutate({ id: voce.id, patch: { checked: false } })}
                      onElimina={() => elimina.mutate(voce.id)}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          )}

          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <Button
              variante="fantasma"
              dimensione="sm"
              iconaSinistra={<Trash2 className="h-4 w-4" />}
              onClick={() => setConferma('generate')}
            >
              Togli gli articoli dal piano pasti
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        aperto={conferma !== null}
        onChiudi={() => setConferma(null)}
        titolo={
          conferma === 'spuntate'
            ? 'Togliere gli articoli già presi?'
            : 'Togliere gli articoli generati?'
        }
        descrizione={
          conferma === 'spuntate'
            ? 'Verranno eliminati dalla lista tutti gli articoli che hai spuntato.'
            : 'Verranno eliminati gli articoli arrivati dal piano pasti. Quelli che hai scritto a mano restano.'
        }
        etichettaConferma="Elimina"
        pericoloso
        onConferma={async () => {
          if (!conferma) return
          await pulisci.mutateAsync(conferma)
          toast.successo('Lista aggiornata.')
        }}
      />
    </div>
  )
}

function RigaSpesa({
  nome,
  checked,
  manuale,
  onToggle,
  onElimina,
}: {
  nome: string
  checked: boolean
  manuale: boolean
  onToggle: () => void
  onElimina: () => void
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.16 }}
      className="flex items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5"
    >
      <Checkbox checked={checked} onChange={onToggle} etichetta={`Segna ${nome} come preso`} />
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'min-w-0 flex-1 text-left text-[0.95rem] transition-colors',
          checked ? 'text-ink-3 line-through' : 'text-ink',
        )}
      >
        {nome}
        {!manuale && (
          <span className="ml-2 align-middle text-[0.7rem] text-ink-3" title="Dal piano pasti">
            <Check className="inline h-3 w-3" aria-hidden /> piano
          </span>
        )}
      </button>
      <button
        type="button"
        aria-label={`Elimina ${nome}`}
        onClick={onElimina}
        className="tap shrink-0 rounded-lg p-2 text-ink-3 transition-colors hover:bg-danger/10 hover:text-danger"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </motion.li>
  )
}
