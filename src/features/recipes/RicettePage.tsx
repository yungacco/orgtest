import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChefHat, Clock, Flame, Plus, Search, X } from 'lucide-react'
import { Button, LinkButton } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Controls'
import { EmptyState, ErrorState } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { SottoNavCibo } from '@/components/layout/SottoNavigazione'
import { formatNumeroCompatto, plurale } from '@/lib/format'
import { cn } from '@/lib/cn'
import { MEAL_SLOTS } from '@/types'
import type { MealSlot, Recipe } from '@/types'
import { FotoRicetta } from './FotoRicetta'
import { useRicette, useTagRicette } from './hooks'

/** Rimuove accenti e maiuscole: cosi' "però" trova anche "pero". */
function normalizza(testo: string): string {
  return testo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function RicettePage() {
  const { ricette, caricamento, errore, ricarica } = useRicette()
  const { tag } = useTagRicette()

  const [ricerca, setRicerca] = useState('')
  const [categoria, setCategoria] = useState<MealSlot | null>(null)
  const [tagAttivi, setTagAttivi] = useState<string[]>([])

  const filtrate = useMemo(() => {
    const termine = normalizza(ricerca.trim())
    return ricette.filter((ricetta) => {
      if (categoria && ricetta.category !== categoria) return false
      if (tagAttivi.length > 0) {
        const suoi = ricetta.tags.map((t) => t.toLowerCase())
        if (!tagAttivi.every((t) => suoi.includes(t.toLowerCase()))) return false
      }
      if (!termine) return true
      const cercabile = normalizza(
        [
          ricetta.title,
          ...ricetta.tags,
          ...ricetta.ingredients.map((i) => i.name),
        ].join(' '),
      )
      return cercabile.includes(termine)
    })
  }, [ricette, ricerca, categoria, tagAttivi])

  const tagDisponibili = useMemo(() => {
    const daRicette = new Set(ricette.flatMap((r) => r.tags))
    tag.forEach((t) => daRicette.add(t.name))
    return [...daRicette].sort((a, b) => a.localeCompare(b, 'it'))
  }, [ricette, tag])

  const filtriAttivi = categoria !== null || tagAttivi.length > 0 || ricerca !== ''

  return (
    <div className="space-y-5">
      <PageHeader
        titolo="Ricette"
        sottotitolo={
          ricette.length > 0
            ? `${plurale(ricette.length, 'ricetta salvata', 'ricette salvate')}`
            : 'Il tuo ricettario personale'
        }
        azioni={
          <LinkButton
            to="/ricette/nuova"
            className="hidden sm:inline-flex"
            iconaSinistra={<Plus className="h-4 w-4" />}
          >
            Nuova ricetta
          </LinkButton>
        }
      />

      <SottoNavCibo />

      {/* ------------------------- ricerca e filtri ------------------------- */}
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
            placeholder="Cerca per nome, ingrediente o tag…"
            aria-label="Cerca fra le ricette"
            className="pl-11"
          />
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip attivo={categoria === null} onClick={() => setCategoria(null)}>
            Tutte
          </Chip>
          {MEAL_SLOTS.map((slot) => (
            <Chip
              key={slot}
              attivo={categoria === slot}
              onClick={() => setCategoria(categoria === slot ? null : slot)}
              className="shrink-0 capitalize"
            >
              {slot}
            </Chip>
          ))}
        </div>

        {tagDisponibili.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0">
            {tagDisponibili.map((nome) => {
              const attivo = tagAttivi.includes(nome)
              return (
                <Chip
                  key={nome}
                  attivo={attivo}
                  className="shrink-0"
                  onClick={() =>
                    setTagAttivi((precedenti) =>
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
        )}

        {filtriAttivi && (
          <button
            type="button"
            onClick={() => {
              setRicerca('')
              setCategoria(null)
              setTagAttivi([])
            }}
            className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden />
            Azzera i filtri ({filtrate.length} di {ricette.length})
          </button>
        )}
      </div>

      {/* ----------------------------- elenco ------------------------------ */}
      {errore ? (
        <ErrorState messaggio={errore.message} onRiprova={() => void ricarica()} />
      ) : caricamento ? (
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="card overflow-hidden">
              <div className="skeleton aspect-[4/3] rounded-none" />
              <div className="space-y-2 p-3">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </li>
          ))}
        </ul>
      ) : ricette.length === 0 ? (
        <EmptyState
          icona={<ChefHat className="h-7 w-7" />}
          titolo="Nessuna ricetta"
          descrizione="Aggiungi le tue ricette con foto, ingredienti e valori nutrizionali: serviranno per generare il menù casuale e la lista della spesa."
          azione={
            <LinkButton to="/ricette/nuova" iconaSinistra={<Plus className="h-4 w-4" />}>
              Aggiungi la prima ricetta
            </LinkButton>
          }
        />
      ) : filtrate.length === 0 ? (
        <EmptyState
          icona={<Search className="h-7 w-7" />}
          titolo="Nessun risultato"
          descrizione="Nessuna ricetta corrisponde ai filtri scelti. Prova a cercare un’altra parola o ad azzerare i filtri."
          azione={
            <Button
              variante="secondario"
              onClick={() => {
                setRicerca('')
                setCategoria(null)
                setTagAttivi([])
              }}
            >
              Azzera i filtri
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {filtrate.map((ricetta, indice) => (
            <motion.li
              key={ricetta.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(indice * 0.02, 0.2) }}
            >
              <CardRicetta ricetta={ricetta} />
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CardRicetta({ ricetta }: { ricetta: Recipe }) {
  return (
    <Link
      to={`/ricette/${ricetta.id}`}
      className={cn(
        'card group flex h-full flex-col overflow-hidden transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-accent-500/40 hover:shadow-lift',
      )}
    >
      <FotoRicetta
        percorso={ricetta.photo_path}
        alt={`Foto della ricetta ${ricetta.title}`}
        categoria={ricetta.category}
        titolo={ricetta.title}
        className="aspect-[4/3] w-full"
      />
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-accent-600 dark:text-accent-300">
          {ricetta.category}
        </span>
        <h3 className="line-clamp-2 font-semibold leading-snug text-ink">{ricetta.title}</h3>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-ink-3">
          {ricetta.prep_minutes !== null && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {ricetta.prep_minutes} min
            </span>
          )}
          {ricetta.calories !== null && (
            <span className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5" aria-hidden />
              {formatNumeroCompatto(Number(ricetta.calories), 0)} kcal
            </span>
          )}
        </div>
        {ricetta.tags.length > 0 && (
          <p className="truncate text-xs text-ink-3">
            {ricetta.tags.map((t) => `#${t}`).join(' ')}
          </p>
        )}
      </div>
    </Link>
  )
}
