import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GripVertical, ImagePlus, Plus, Trash2, X } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Controls'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { PageHeader, SectionTitle } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Feedback'
import { useToast } from '@/components/ui/Toast'
import { formatDimensione } from '@/lib/image'
import { formatNumeroCompatto, parseNumero } from '@/lib/format'
import { useAuth } from '@/providers/AuthProvider'
import { DIFFICULTIES, MEAL_SLOTS } from '@/types'
import type { Difficulty, Ingredient, MealSlot, RecipeInput } from '@/types'
import { caricaFoto, eliminaFoto, registraTagMancanti } from './api'
import { FotoRicetta } from './FotoRicetta'
import { useCreaRicetta, useModificaRicetta, useRicetta, useTagRicette } from './hooks'

const UNITA_SUGGERITE = ['g', 'kg', 'ml', 'l', 'cucchiai', 'cucchiaini', 'tazze', 'pz', 'q.b.']

/**
 * Nel modulo quantita' e unita' restano testo libero: cosi' mentre scrivi
 * "0," il campo non ti cancella la virgola. La conversione in numero avviene
 * solo al salvataggio.
 */
interface RigaIngrediente {
  key: string
  nome: string
  quantita: string
  unita: string
}

function rigaVuota(): RigaIngrediente {
  return { key: crypto.randomUUID(), nome: '', quantita: '', unita: '' }
}

export function RicettaFormPage() {
  const { id } = useParams<{ id: string }>()
  const inModifica = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const { ricetta, caricamento } = useRicetta(id)
  const { tag } = useTagRicette()
  const crea = useCreaRicetta()
  const modifica = useModificaRicetta()
  const inputFile = useRef<HTMLInputElement>(null)

  const [titolo, setTitolo] = useState('')
  const [categoria, setCategoria] = useState<MealSlot>('pranzo')
  const [difficolta, setDifficolta] = useState<Difficulty>('facile')
  const [minuti, setMinuti] = useState('')
  const [porzioni, setPorzioni] = useState('1')
  const [tagScelti, setTagScelti] = useState<string[]>([])
  const [nuovoTag, setNuovoTag] = useState('')
  const [ingredienti, setIngredienti] = useState<RigaIngrediente[]>([rigaVuota()])
  const [passi, setPassi] = useState<{ key: string; testo: string }[]>([
    { key: crypto.randomUUID(), testo: '' },
  ])
  const [calorie, setCalorie] = useState('')
  const [proteine, setProteine] = useState('')
  const [carboidrati, setCarboidrati] = useState('')
  const [grassi, setGrassi] = useState('')

  const [percorsoFoto, setPercorsoFoto] = useState<string | null>(null)
  const [fotoNuova, setFotoNuova] = useState<File | null>(null)
  const [anteprima, setAnteprima] = useState<string | null>(null)
  const [salvataggio, setSalvataggio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  // carica i dati della ricetta esistente
  useEffect(() => {
    if (!ricetta) return
    setTitolo(ricetta.title)
    setCategoria(ricetta.category)
    setDifficolta(ricetta.difficulty)
    setMinuti(ricetta.prep_minutes === null ? '' : String(ricetta.prep_minutes))
    setPorzioni(String(ricetta.servings))
    setTagScelti(ricetta.tags)
    setIngredienti(
      ricetta.ingredients.length > 0
        ? ricetta.ingredients.map((i) => ({
            key: crypto.randomUUID(),
            nome: i.name,
            quantita: i.quantity === null ? '' : formatNumeroCompatto(i.quantity, 2),
            unita: i.unit ?? '',
          }))
        : [rigaVuota()],
    )
    setPassi(
      ricetta.steps.length > 0
        ? ricetta.steps.map((testo) => ({ key: crypto.randomUUID(), testo }))
        : [{ key: crypto.randomUUID(), testo: '' }],
    )
    setCalorie(ricetta.calories === null ? '' : formatNumeroCompatto(Number(ricetta.calories), 1))
    setProteine(ricetta.protein === null ? '' : formatNumeroCompatto(Number(ricetta.protein), 1))
    setCarboidrati(ricetta.carbs === null ? '' : formatNumeroCompatto(Number(ricetta.carbs), 1))
    setGrassi(ricetta.fat === null ? '' : formatNumeroCompatto(Number(ricetta.fat), 1))
    setPercorsoFoto(ricetta.photo_path)
  }, [ricetta])

  // anteprima della foto appena scelta (senza ancora caricarla)
  useEffect(() => {
    if (!fotoNuova) {
      setAnteprima(null)
      return
    }
    const url = URL.createObjectURL(fotoNuova)
    setAnteprima(url)
    return () => URL.revokeObjectURL(url)
  }, [fotoNuova])

  const suggerimentiTag = useMemo(
    () => tag.map((t) => t.name).filter((nome) => !tagScelti.includes(nome)),
    [tag, tagScelti],
  )

  function aggiungiTag(nome: string) {
    const pulito = nome.trim()
    if (!pulito) return
    if (!tagScelti.some((t) => t.toLowerCase() === pulito.toLowerCase())) {
      setTagScelti((precedenti) => [...precedenti, pulito])
    }
    setNuovoTag('')
  }

  async function invia(e: React.FormEvent) {
    e.preventDefault()
    setErrore(null)

    if (titolo.trim().length === 0) {
      setErrore('Dai un nome alla ricetta.')
      return
    }

    const ingredientiPuliti: Ingredient[] = ingredienti
      .filter((i) => i.nome.trim() !== '')
      .map((i) => ({
        name: i.nome.trim(),
        quantity: i.quantita.trim() === '' ? null : parseNumero(i.quantita),
        unit: i.unita.trim() === '' ? null : i.unita.trim(),
      }))
    const passiPuliti = passi.map((p) => p.testo.trim()).filter(Boolean)

    setSalvataggio(true)
    try {
      let fotoDaSalvare = percorsoFoto
      const fotoPrecedente = ricetta?.photo_path ?? null

      if (fotoNuova && user) {
        fotoDaSalvare = await caricaFoto(user.id, fotoNuova)
      }

      const input: RecipeInput = {
        title: titolo.trim(),
        photo_path: fotoDaSalvare,
        category: categoria,
        tags: tagScelti,
        prep_minutes: minuti.trim() === '' ? null : Math.round(parseNumero(minuti) ?? 0),
        difficulty: difficolta,
        servings: Math.max(1, Math.round(parseNumero(porzioni) ?? 1)),
        ingredients: ingredientiPuliti,
        steps: passiPuliti,
        calories: calorie.trim() === '' ? null : parseNumero(calorie),
        protein: proteine.trim() === '' ? null : parseNumero(proteine),
        carbs: carboidrati.trim() === '' ? null : parseNumero(carboidrati),
        fat: grassi.trim() === '' ? null : parseNumero(grassi),
      }

      let idFinale = id
      if (inModifica && id) {
        await modifica.mutateAsync({ id, patch: input })
      } else {
        const creata = await crea.mutateAsync(input)
        idFinale = creata.id
      }

      // la vecchia foto non serve piu'
      if (fotoNuova && fotoPrecedente && fotoPrecedente !== fotoDaSalvare) {
        await eliminaFoto(fotoPrecedente)
      }

      void registraTagMancanti(tagScelti, tag).catch(() => undefined)

      toast.successo(inModifica ? 'Ricetta aggiornata.' : 'Ricetta salvata.')
      navigate(idFinale ? `/ricette/${idFinale}` : '/ricette', { replace: true })
    } catch (e) {
      setErrore((e as Error).message)
    } finally {
      setSalvataggio(false)
    }
  }

  if (inModifica && caricamento) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-7 w-7" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        titolo={inModifica ? 'Modifica ricetta' : 'Nuova ricetta'}
        sottotitolo="I campi facoltativi puoi lasciarli vuoti e completarli in un secondo momento."
      />

      <form onSubmit={invia} className="space-y-6" noValidate>
        {/* --------------------------- foto --------------------------- */}
        <section className="card space-y-3 p-4">
          <SectionTitle>Foto</SectionTitle>
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-line">
              {anteprima ? (
                <img
                  src={anteprima}
                  alt="Anteprima della foto scelta"
                  className="h-full w-full object-cover"
                />
              ) : (
                <FotoRicetta
                  percorso={percorsoFoto}
                  alt="Foto attuale della ricetta"
                  className="h-full w-full"
                />
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={inputFile}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setFotoNuova(file)
                  e.target.value = ''
                }}
              />
              <Button
                variante="secondario"
                dimensione="sm"
                iconaSinistra={<ImagePlus className="h-4 w-4" />}
                onClick={() => inputFile.current?.click()}
              >
                {percorsoFoto || fotoNuova ? 'Cambia foto' : 'Scegli una foto'}
              </Button>
              {(percorsoFoto || fotoNuova) && (
                <Button
                  variante="fantasma"
                  dimensione="sm"
                  iconaSinistra={<Trash2 className="h-4 w-4" />}
                  onClick={() => {
                    setFotoNuova(null)
                    setPercorsoFoto(null)
                  }}
                >
                  Togli la foto
                </Button>
              )}
              <p className="max-w-xs text-xs leading-relaxed text-ink-3">
                {fotoNuova
                  ? `Scelta: ${fotoNuova.name} (${formatDimensione(fotoNuova.size)}). Verrà ridotta automaticamente prima del caricamento.`
                  : 'La foto viene rimpicciolita sul telefono prima di essere caricata, così occupa poco spazio.'}
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------- informazioni ------------------------ */}
        <section className="card space-y-4 p-4">
          <SectionTitle>Informazioni</SectionTitle>

          <Field etichetta="Titolo" richiesto>
            {(id) => (
              <Input
                id={id}
                data-autofocus
                value={titolo}
                onChange={(e) => setTitolo(e.target.value)}
                placeholder="Pasta al pesto"
                required
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field etichetta="Categoria">
              {(id) => (
                <Select
                  id={id}
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as MealSlot)}
                  className="capitalize"
                >
                  {MEAL_SLOTS.map((slot) => (
                    <option key={slot} value={slot} className="capitalize">
                      {slot}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field etichetta="Difficoltà">
              {(id) => (
                <Select
                  id={id}
                  value={difficolta}
                  onChange={(e) => setDifficolta(e.target.value as Difficulty)}
                  className="capitalize"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d} className="capitalize">
                      {d}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field etichetta="Tempo di preparazione (minuti)">
              {(id) => (
                <Input
                  id={id}
                  type="text"
                  inputMode="numeric"
                  value={minuti}
                  onChange={(e) => setMinuti(e.target.value)}
                  placeholder="25"
                />
              )}
            </Field>

            <Field etichetta="Porzioni">
              {(id) => (
                <Input
                  id={id}
                  type="text"
                  inputMode="numeric"
                  value={porzioni}
                  onChange={(e) => setPorzioni(e.target.value)}
                  placeholder="2"
                />
              )}
            </Field>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-ink-2">Tag</p>
            {tagScelti.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {tagScelti.map((nome) => (
                  <li key={nome}>
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-500/12 py-1 pl-3 pr-1 text-[0.8rem] font-medium text-accent-700 dark:text-accent-300">
                      #{nome}
                      <button
                        type="button"
                        aria-label={`Togli il tag ${nome}`}
                        onClick={() =>
                          setTagScelti((precedenti) => precedenti.filter((t) => t !== nome))
                        }
                        className="rounded-full p-1 hover:bg-accent-500/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <Input
                value={nuovoTag}
                onChange={(e) => setNuovoTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    aggiungiTag(nuovoTag)
                  }
                }}
                placeholder="vegetariano, veloce, proteico…"
                aria-label="Aggiungi un tag"
              />
              <Button variante="secondario" onClick={() => aggiungiTag(nuovoTag)}>
                Aggiungi
              </Button>
            </div>
            {suggerimentiTag.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {suggerimentiTag.slice(0, 12).map((nome) => (
                  <Chip key={nome} onClick={() => aggiungiTag(nome)}>
                    + {nome}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ------------------------- ingredienti ------------------------- */}
        <section className="card space-y-3 p-4">
          <SectionTitle>Ingredienti</SectionTitle>
          <datalist id="unita-misura">
            {UNITA_SUGGERITE.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
          <ul className="space-y-2">
            {ingredienti.map((riga, indice) => (
              <li key={riga.key} className="flex items-center gap-2">
                <GripVertical className="hidden h-4 w-4 shrink-0 text-ink-3 sm:block" aria-hidden />
                <Input
                  value={riga.nome}
                  onChange={(e) =>
                    setIngredienti((precedenti) =>
                      precedenti.map((r, i) =>
                        i === indice ? { ...r, nome: e.target.value } : r,
                      ),
                    )
                  }
                  placeholder="Ingrediente"
                  aria-label={`Nome dell’ingrediente ${indice + 1}`}
                  className="flex-1"
                />
                <Input
                  value={riga.quantita}
                  onChange={(e) =>
                    setIngredienti((precedenti) =>
                      precedenti.map((r, i) =>
                        i === indice ? { ...r, quantita: e.target.value } : r,
                      ),
                    )
                  }
                  inputMode="decimal"
                  placeholder="200"
                  aria-label={`Quantità dell’ingrediente ${indice + 1}`}
                  className="w-20 shrink-0"
                />
                <Input
                  value={riga.unita}
                  onChange={(e) =>
                    setIngredienti((precedenti) =>
                      precedenti.map((r, i) =>
                        i === indice ? { ...r, unita: e.target.value } : r,
                      ),
                    )
                  }
                  list="unita-misura"
                  placeholder="g"
                  aria-label={`Unità di misura dell’ingrediente ${indice + 1}`}
                  className="w-20 shrink-0"
                />
                <IconButton
                  etichetta={`Togli l’ingrediente ${indice + 1}`}
                  dimensione="sm"
                  onClick={() =>
                    setIngredienti((precedenti) =>
                      precedenti.length === 1
                        ? [rigaVuota()]
                        : precedenti.filter((_, i) => i !== indice),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </li>
            ))}
          </ul>
          <Button
            variante="secondario"
            dimensione="sm"
            iconaSinistra={<Plus className="h-4 w-4" />}
            onClick={() =>
              setIngredienti((precedenti) => [...precedenti, rigaVuota()])
            }
          >
            Aggiungi ingrediente
          </Button>
        </section>

        {/* -------------------------- procedimento ------------------------ */}
        <section className="card space-y-3 p-4">
          <SectionTitle>Procedimento</SectionTitle>
          <ol className="space-y-2">
            {passi.map((passo, indice) => (
              <li key={passo.key} className="flex items-start gap-2">
                <span className="mt-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-500/12 text-xs font-semibold text-accent-700 dark:text-accent-300">
                  {indice + 1}
                </span>
                <Textarea
                  rows={2}
                  value={passo.testo}
                  onChange={(e) =>
                    setPassi((precedenti) =>
                      precedenti.map((p, i) =>
                        i === indice ? { ...p, testo: e.target.value } : p,
                      ),
                    )
                  }
                  placeholder={`Passo ${indice + 1}`}
                  aria-label={`Passo ${indice + 1}`}
                  className="flex-1"
                />
                <IconButton
                  etichetta={`Togli il passo ${indice + 1}`}
                  dimensione="sm"
                  className="mt-1"
                  onClick={() =>
                    setPassi((precedenti) =>
                      precedenti.length === 1
                        ? [{ key: crypto.randomUUID(), testo: '' }]
                        : precedenti.filter((_, i) => i !== indice),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </li>
            ))}
          </ol>
          <Button
            variante="secondario"
            dimensione="sm"
            iconaSinistra={<Plus className="h-4 w-4" />}
            onClick={() =>
              setPassi((precedenti) => [
                ...precedenti,
                { key: crypto.randomUUID(), testo: '' },
              ])
            }
          >
            Aggiungi passo
          </Button>
        </section>

        {/* ---------------------- valori nutrizionali --------------------- */}
        <section className="card space-y-3 p-4">
          <SectionTitle>Valori nutrizionali per porzione</SectionTitle>
          <p className="text-sm text-ink-3">
            Facoltativi: se li compili, l’app somma le calorie dei pasti pianificati
            e le confronta con il tuo obiettivo giornaliero.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field etichetta="Calorie (kcal)">
              {(id) => (
                <Input
                  id={id}
                  inputMode="decimal"
                  value={calorie}
                  onChange={(e) => setCalorie(e.target.value)}
                  placeholder="520"
                />
              )}
            </Field>
            <Field etichetta="Proteine (g)">
              {(id) => (
                <Input
                  id={id}
                  inputMode="decimal"
                  value={proteine}
                  onChange={(e) => setProteine(e.target.value)}
                  placeholder="18"
                />
              )}
            </Field>
            <Field etichetta="Carboidrati (g)">
              {(id) => (
                <Input
                  id={id}
                  inputMode="decimal"
                  value={carboidrati}
                  onChange={(e) => setCarboidrati(e.target.value)}
                  placeholder="62"
                />
              )}
            </Field>
            <Field etichetta="Grassi (g)">
              {(id) => (
                <Input
                  id={id}
                  inputMode="decimal"
                  value={grassi}
                  onChange={(e) => setGrassi(e.target.value)}
                  placeholder="21"
                />
              )}
            </Field>
          </div>
        </section>

        {errore && (
          <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            {errore}
          </p>
        )}

        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex gap-2 rounded-2xl border border-line bg-card/95 p-3 shadow-lift backdrop-blur md:bottom-4">
          <Button
            variante="secondario"
            larghezzaPiena
            onClick={() => navigate(-1)}
            disabled={salvataggio}
          >
            Annulla
          </Button>
          <Button type="submit" larghezzaPiena caricamento={salvataggio}>
            {inModifica ? 'Salva modifiche' : 'Salva ricetta'}
          </Button>
        </div>
      </form>
    </div>
  )
}
