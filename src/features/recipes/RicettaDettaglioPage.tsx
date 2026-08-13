import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChefHat, Clock, Flame, Pencil, Trash2, Users } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Spinner } from '@/components/ui/Feedback'
import { useToast } from '@/components/ui/Toast'
import { formatNumeroCompatto } from '@/lib/format'
import { FotoRicetta } from './FotoRicetta'
import { useEliminaRicetta, useRicetta } from './hooks'

export function RicettaDettaglioPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { ricetta, caricamento } = useRicetta(id)
  const elimina = useEliminaRicetta()
  const [confermaEliminazione, setConfermaEliminazione] = useState(false)

  if (caricamento) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-7 w-7" />
      </div>
    )
  }
  if (!ricetta) return <Navigate to="/ricette" replace />

  const valori = [
    { etichetta: 'Calorie', valore: ricetta.calories, unita: 'kcal' },
    { etichetta: 'Proteine', valore: ricetta.protein, unita: 'g' },
    { etichetta: 'Carboidrati', valore: ricetta.carbs, unita: 'g' },
    { etichetta: 'Grassi', valore: ricetta.fat, unita: 'g' },
  ].filter((v) => v.valore !== null)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/ricette"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Tutte le ricette
        </Link>
        <div className="flex items-center gap-1">
          <IconButton
            etichetta="Modifica ricetta"
            onClick={() => navigate(`/ricette/${ricetta.id}/modifica`)}
          >
            <Pencil className="h-5 w-5" />
          </IconButton>
          <IconButton
            etichetta="Elimina ricetta"
            className="hover:bg-danger/10 hover:text-danger"
            onClick={() => setConfermaEliminazione(true)}
          >
            <Trash2 className="h-5 w-5" />
          </IconButton>
        </div>
      </div>

      <FotoRicetta
        percorso={ricetta.photo_path}
        alt={`Foto della ricetta ${ricetta.title}`}
        categoria={ricetta.category}
        titolo={ricetta.title}
        className="aspect-[16/10] w-full rounded-2xl border border-line sm:aspect-[2/1]"
      />

      <header className="space-y-3">
        <span className="inline-block rounded-full bg-accent-500/12 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-700 dark:text-accent-300">
          {ricetta.category}
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {ricetta.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-2">
          {ricetta.prep_minutes !== null && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-ink-3" aria-hidden />
              {ricetta.prep_minutes} minuti
            </span>
          )}
          <span className="flex items-center gap-1.5 capitalize">
            <ChefHat className="h-4 w-4 text-ink-3" aria-hidden />
            {ricetta.difficulty}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-ink-3" aria-hidden />
            {ricetta.servings} {ricetta.servings === 1 ? 'porzione' : 'porzioni'}
          </span>
        </div>
        {ricetta.tags.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {ricetta.tags.map((nome) => (
              <li
                key={nome}
                className="rounded-full bg-elev px-3 py-1 text-[0.8rem] font-medium text-ink-2"
              >
                #{nome}
              </li>
            ))}
          </ul>
        )}
      </header>

      {valori.length > 0 && (
        <section aria-labelledby="valori-titolo" className="space-y-2">
          <h2 id="valori-titolo" className="text-sm font-semibold uppercase tracking-wide text-ink-3">
            Per porzione
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {valori.map((v) => (
              <li key={v.etichetta} className="card p-3">
                <p className="text-xs text-ink-3">{v.etichetta}</p>
                <p className="tnum mt-0.5 text-lg font-semibold text-ink">
                  {formatNumeroCompatto(Number(v.valore), 1)}
                  <span className="ml-1 text-sm font-normal text-ink-3">{v.unita}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section aria-labelledby="ingredienti-titolo" className="space-y-3">
          <h2
            id="ingredienti-titolo"
            className="text-sm font-semibold uppercase tracking-wide text-ink-3"
          >
            Ingredienti
          </h2>
          {ricetta.ingredients.length === 0 ? (
            <p className="text-sm text-ink-3">Nessun ingrediente indicato.</p>
          ) : (
            <ul className="card divide-y divide-line">
              {ricetta.ingredients.map((ingrediente, indice) => (
                <li
                  key={`${ingrediente.name}-${indice}`}
                  className="flex items-baseline justify-between gap-3 px-4 py-2.5"
                >
                  <span className="text-ink">{ingrediente.name}</span>
                  {ingrediente.quantity !== null && (
                    <span className="tnum shrink-0 text-sm text-ink-2">
                      {formatNumeroCompatto(Number(ingrediente.quantity), 2)}
                      {ingrediente.unit ? ` ${ingrediente.unit}` : ''}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="procedimento-titolo" className="space-y-3">
          <h2
            id="procedimento-titolo"
            className="text-sm font-semibold uppercase tracking-wide text-ink-3"
          >
            Procedimento
          </h2>
          {ricetta.steps.length === 0 ? (
            <p className="text-sm text-ink-3">Nessun procedimento indicato.</p>
          ) : (
            <ol className="space-y-3">
              {ricetta.steps.map((passo, indice) => (
                <li key={indice} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-500/12 text-sm font-semibold text-accent-700 dark:text-accent-300">
                    {indice + 1}
                  </span>
                  <p className="pt-0.5 leading-relaxed text-ink-2">{passo}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-line pt-5">
        <Button
          variante="secondario"
          iconaSinistra={<Pencil className="h-4 w-4" />}
          onClick={() => navigate(`/ricette/${ricetta.id}/modifica`)}
        >
          Modifica
        </Button>
        <Button
          variante="fantasma"
          className="text-danger hover:bg-danger/10"
          iconaSinistra={<Trash2 className="h-4 w-4" />}
          onClick={() => setConfermaEliminazione(true)}
        >
          Elimina
        </Button>
        <span className="ml-auto flex items-center gap-1.5 text-sm text-ink-3">
          <Flame className="h-4 w-4" aria-hidden />
          Usa il generatore nel Piano pasti per inserirla nel menù
        </span>
      </div>

      <ConfirmDialog
        aperto={confermaEliminazione}
        onChiudi={() => setConfermaEliminazione(false)}
        titolo="Eliminare la ricetta?"
        descrizione={`"${ricetta.title}" verrà eliminata insieme alla sua foto e tolta dai piani pasti in cui compare. L’operazione non si può annullare.`}
        etichettaConferma="Elimina"
        pericoloso
        onConferma={async () => {
          await elimina.mutateAsync(ricetta)
          toast.successo('Ricetta eliminata.')
          navigate('/ricette', { replace: true })
        }}
      />
    </div>
  )
}
