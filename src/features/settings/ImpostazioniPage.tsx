import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  Database,
  Download,
  KeyRound,
  LogOut,
  Moon,
  Palette,
  Plus,
  Sun,
  SunMoon,
  Tag,
  Target,
  Trash2,
  Upload,
  User,
} from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/Controls'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field, Input, Switch } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { formatNumeroCompatto, parseNumero } from '@/lib/format'
import { cmToUnit, kgToUnit, unitToCm, unitToKg } from '@/lib/units'
import { PALETTE, useAspetto } from '@/providers/AspettoProvider'
import { useAuth } from '@/providers/AuthProvider'
import { useCreaTag, useEliminaTag, useTagRicette } from '@/features/recipes/hooks'
import { useCategorieTask, useCreaCategoria, useEliminaCategoria } from '@/features/tasks/hooks'
import { esportaDati, eliminaTuttiIDati, importaDati, scaricaBackup } from './backup'
import { useAggiornaProfilo, useProfilo } from './hooks'
import {
  permessoNotifiche,
  richiediPermessoNotifiche,
  type TipoPromemoria,
} from './promemoria'
import type { AccentName, LengthUnit, ThemeMode, WeightUnit } from '@/types'

const COLORI_CATEGORIA = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
]

const ETICHETTE_PROMEMORIA: Record<TipoPromemoria, string> = {
  weight: 'Registrare il peso',
  journal: 'Scrivere nel diario',
  habits: 'Spuntare le abitudini',
}

function Sezione({
  titolo,
  icona,
  descrizione,
  children,
}: {
  titolo: string
  icona: React.ReactNode
  descrizione?: string
  children: React.ReactNode
}) {
  return (
    <section className="card p-4 sm:p-5">
      <header className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/12 text-accent-600 dark:text-accent-300">
          {icona}
        </span>
        <div>
          <h2 className="font-semibold text-ink">{titolo}</h2>
          {descrizione && <p className="mt-0.5 text-sm text-ink-3">{descrizione}</p>}
        </div>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export function ImpostazioniPage() {
  const { profilo } = useProfilo()
  const aggiorna = useAggiornaProfilo()
  const aspetto = useAspetto()
  const { user, esci, cambiaPassword } = useAuth()
  const toast = useToast()

  /* ------------------------------ profilo ------------------------------ */
  const [nome, setNome] = useState('')
  const [altezza, setAltezza] = useState('')
  const [obiettivoPeso, setObiettivoPeso] = useState('')
  const [obiettivoCalorie, setObiettivoCalorie] = useState('')

  useEffect(() => {
    setNome(profilo.display_name ?? '')
    setAltezza(
      profilo.height_cm === null
        ? ''
        : formatNumeroCompatto(cmToUnit(Number(profilo.height_cm), profilo.length_unit), 1),
    )
    setObiettivoPeso(
      profilo.weight_goal_kg === null
        ? ''
        : formatNumeroCompatto(kgToUnit(Number(profilo.weight_goal_kg), profilo.weight_unit), 2),
    )
    setObiettivoCalorie(profilo.calorie_goal === null ? '' : String(profilo.calorie_goal))
  }, [
    profilo.display_name,
    profilo.height_cm,
    profilo.weight_goal_kg,
    profilo.calorie_goal,
    profilo.length_unit,
    profilo.weight_unit,
  ])

  function salva(patch: Parameters<typeof aggiorna.mutate>[0], messaggio?: string) {
    aggiorna.mutate(patch, {
      onSuccess: () => {
        if (messaggio) toast.successo(messaggio)
      },
    })
  }

  /* --------------------------- tag e categorie -------------------------- */
  const { tag } = useTagRicette()
  const creaTag = useCreaTag()
  const eliminaTag = useEliminaTag()
  const [nuovoTag, setNuovoTag] = useState('')

  const { categorie } = useCategorieTask()
  const creaCategoria = useCreaCategoria()
  const eliminaCategoria = useEliminaCategoria()
  const [nuovaCategoria, setNuovaCategoria] = useState('')
  const [coloreCategoria, setColoreCategoria] = useState(COLORI_CATEGORIA[3])

  /* ------------------------------ notifiche ----------------------------- */
  const [permesso, setPermesso] = useState(permessoNotifiche())

  /* -------------------------------- dati -------------------------------- */
  const inputImport = useRef<HTMLInputElement>(null)
  const [inEsportazione, setInEsportazione] = useState(false)
  const [inImportazione, setInImportazione] = useState(false)
  const [confermaEliminazione, setConfermaEliminazione] = useState(false)
  const [confermaImport, setConfermaImport] = useState<File | null>(null)

  /* ------------------------------- account ------------------------------ */
  const [nuovaPassword, setNuovaPassword] = useState('')
  const [confermaPassword, setConfermaPassword] = useState('')
  const [inCambioPassword, setInCambioPassword] = useState(false)

  async function esporta() {
    setInEsportazione(true)
    try {
      const backup = await esportaDati()
      scaricaBackup(backup)
      toast.successo('Backup scaricato.')
    } catch (e) {
      toast.errore((e as Error).message)
    } finally {
      setInEsportazione(false)
    }
  }

  async function importa(file: File) {
    setInImportazione(true)
    try {
      const esito = await importaDati(file)
      if (esito.tabelleSaltate.length > 0) {
        toast.errore(
          `Importate ${esito.righeImportate} righe, ma alcune sezioni non sono state ripristinate (${esito.tabelleSaltate.join(', ')}).`,
        )
      } else {
        toast.successo(`Backup ripristinato: ${esito.righeImportate} righe.`)
      }
      window.setTimeout(() => window.location.reload(), 1200)
    } catch (e) {
      toast.errore((e as Error).message)
    } finally {
      setInImportazione(false)
    }
  }

  async function aggiornaPassword(e: React.FormEvent) {
    e.preventDefault()
    if (nuovaPassword.length < 6) {
      toast.errore('La password deve avere almeno 6 caratteri.')
      return
    }
    if (nuovaPassword !== confermaPassword) {
      toast.errore('Le due password non coincidono.')
      return
    }
    setInCambioPassword(true)
    try {
      await cambiaPassword(nuovaPassword)
      setNuovaPassword('')
      setConfermaPassword('')
      toast.successo('Password aggiornata.')
    } catch (e) {
      toast.errore((e as Error).message)
    } finally {
      setInCambioPassword(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader titolo="Impostazioni" sottotitolo="Personalizza l’app come preferisci" />

      {/* =============================== profilo ============================ */}
      <Sezione
        titolo="Profilo"
        icona={<User className="h-5 w-5" aria-hidden />}
        descrizione="Servono per calcolare l’indice di massa corporea e mostrare i valori nell’unità che preferisci."
      >
        <Field etichetta="Come ti chiami">
          {(id) => (
            <Input
              id={id}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onBlur={() =>
                salva({ display_name: nome.trim() === '' ? null : nome.trim() })
              }
              placeholder="Il tuo nome"
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field etichetta={`Altezza (${profilo.length_unit})`}>
            {(id) => (
              <Input
                id={id}
                inputMode="decimal"
                value={altezza}
                onChange={(e) => setAltezza(e.target.value)}
                onBlur={() => {
                  const valore = parseNumero(altezza)
                  salva({
                    height_cm:
                      valore === null
                        ? null
                        : Number(unitToCm(valore, profilo.length_unit).toFixed(1)),
                  })
                }}
                placeholder={profilo.length_unit === 'cm' ? '175' : '69'}
              />
            )}
          </Field>

          {/* niente <label>: i due selettori hanno gia' la propria etichetta
              per gli screen reader, un "for" verso un contenitore sarebbe
              scorretto */}
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-ink-2">Unità di misura</span>
            <div className="flex gap-2">
              <SegmentedControl
                etichetta="Unità di peso"
                dimensione="sm"
                opzioni={[
                  { valore: 'kg', etichetta: 'kg' },
                  { valore: 'lb', etichetta: 'lb' },
                ]}
                valore={profilo.weight_unit}
                onChange={(valore) => salva({ weight_unit: valore as WeightUnit })}
              />
              <SegmentedControl
                etichetta="Unità di lunghezza"
                dimensione="sm"
                opzioni={[
                  { valore: 'cm', etichetta: 'cm' },
                  { valore: 'in', etichetta: 'in' },
                ]}
                valore={profilo.length_unit}
                onChange={(valore) => salva({ length_unit: valore as LengthUnit })}
              />
            </div>
          </div>
        </div>
      </Sezione>

      {/* ============================== obiettivi =========================== */}
      <Sezione
        titolo="Obiettivi"
        icona={<Target className="h-5 w-5" aria-hidden />}
        descrizione="L’obiettivo di peso compare come linea tratteggiata sul grafico."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field etichetta={`Peso obiettivo (${profilo.weight_unit})`}>
            {(id) => (
              <Input
                id={id}
                inputMode="decimal"
                value={obiettivoPeso}
                onChange={(e) => setObiettivoPeso(e.target.value)}
                onBlur={() => {
                  const valore = parseNumero(obiettivoPeso)
                  salva({
                    weight_goal_kg:
                      valore === null
                        ? null
                        : Number(unitToKg(valore, profilo.weight_unit).toFixed(2)),
                  })
                }}
                placeholder={profilo.weight_unit === 'kg' ? '68' : '150'}
              />
            )}
          </Field>

          <Field etichetta="Calorie al giorno (kcal)">
            {(id) => (
              <Input
                id={id}
                inputMode="numeric"
                value={obiettivoCalorie}
                onChange={(e) => setObiettivoCalorie(e.target.value)}
                onBlur={() => {
                  const valore = parseNumero(obiettivoCalorie)
                  salva({ calorie_goal: valore === null ? null : Math.round(valore) })
                }}
                placeholder="2000"
              />
            )}
          </Field>
        </div>
      </Sezione>

      {/* =============================== aspetto ============================ */}
      <Sezione titolo="Aspetto" icona={<Palette className="h-5 w-5" aria-hidden />}>
        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-ink-2">Tema</span>
          <SegmentedControl
            etichetta="Tema"
            opzioni={[
              { valore: 'light', etichetta: 'Chiaro', icona: <Sun className="h-4 w-4" /> },
              { valore: 'dark', etichetta: 'Scuro', icona: <Moon className="h-4 w-4" /> },
              {
                valore: 'system',
                etichetta: 'Automatico',
                icona: <SunMoon className="h-4 w-4" />,
              },
            ]}
            valore={aspetto.theme}
            onChange={(valore) => {
              aspetto.imposta({ theme: valore as ThemeMode })
              salva({ theme: valore as ThemeMode })
            }}
          />
          <p className="text-sm text-ink-3">
            “Automatico” segue l’impostazione del telefono o del computer.
          </p>
        </div>

        <div className="space-y-2">
          <span className="block text-sm font-medium text-ink-2">Colore d’accento</span>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((palette) => (
              <button
                key={palette.nome}
                type="button"
                aria-label={`Usa il colore ${palette.etichetta}`}
                aria-pressed={aspetto.accent === palette.nome}
                onClick={() => {
                  aspetto.imposta({ accent: palette.nome })
                  salva({ accent: palette.nome as AccentName })
                }}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-xl transition-all',
                  aspetto.accent === palette.nome
                    ? 'ring-2 ring-ink ring-offset-2 ring-offset-card'
                    : 'hover:scale-105',
                )}
                style={{ backgroundColor: palette.colore }}
              >
                {aspetto.accent === palette.nome && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="h-5 w-5"
                    aria-hidden
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      </Sezione>

      {/* ============================ tag ricette =========================== */}
      <Sezione
        titolo="Tag delle ricette"
        icona={<Tag className="h-5 w-5" aria-hidden />}
        descrizione="I tag ti servono per filtrare le ricette e per generare menù mirati."
      >
        {tag.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {tag.map((elemento) => (
              <li key={elemento.id}>
                <span className="inline-flex items-center gap-1 rounded-full bg-elev py-1 pl-3 pr-1 text-[0.8rem] font-medium text-ink-2">
                  #{elemento.name}
                  <button
                    type="button"
                    aria-label={`Elimina il tag ${elemento.name}`}
                    onClick={() => eliminaTag.mutate(elemento.id)}
                    className="rounded-full p-1 text-ink-3 hover:bg-danger/15 hover:text-danger"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-3">
            Nessun tag: creane uno qui oppure scrivendolo direttamente in una ricetta.
          </p>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (nuovoTag.trim() === '') return
            creaTag.mutate(nuovoTag.trim())
            setNuovoTag('')
          }}
        >
          <Input
            value={nuovoTag}
            onChange={(e) => setNuovoTag(e.target.value)}
            placeholder="vegetariano"
            aria-label="Nuovo tag"
          />
          <Button type="submit" variante="secondario" iconaSinistra={<Plus className="h-4 w-4" />}>
            Aggiungi
          </Button>
        </form>
      </Sezione>

      {/* ========================== categorie task ========================== */}
      <Sezione
        titolo="Categorie delle task"
        icona={<Tag className="h-5 w-5" aria-hidden />}
        descrizione="Servono a raggruppare le task per progetto o area della tua vita."
      >
        {categorie.length > 0 ? (
          <ul className="space-y-2">
            {categorie.map((categoria) => (
              <li
                key={categoria.id}
                className="flex items-center gap-3 rounded-xl border border-line px-3 py-2"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: categoria.color }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-ink">{categoria.name}</span>
                <IconButton
                  etichetta={`Elimina la categoria ${categoria.name}`}
                  dimensione="sm"
                  className="hover:bg-danger/10 hover:text-danger"
                  onClick={() => eliminaCategoria.mutate(categoria.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-3">
            Nessuna categoria: le task funzionano lo stesso, ma con le categorie puoi
            filtrarle.
          </p>
        )}

        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (nuovaCategoria.trim() === '') return
            creaCategoria.mutate({ nome: nuovaCategoria.trim(), colore: coloreCategoria })
            setNuovaCategoria('')
          }}
        >
          <div className="flex gap-2">
            <Input
              value={nuovaCategoria}
              onChange={(e) => setNuovaCategoria(e.target.value)}
              placeholder="Casa, Lavoro, Salute…"
              aria-label="Nuova categoria"
            />
            <Button
              type="submit"
              variante="secondario"
              iconaSinistra={<Plus className="h-4 w-4" />}
            >
              Aggiungi
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {COLORI_CATEGORIA.map((colore) => (
              <button
                key={colore}
                type="button"
                aria-label={`Usa questo colore per la nuova categoria`}
                aria-pressed={coloreCategoria === colore}
                onClick={() => setColoreCategoria(colore)}
                className={cn(
                  'h-8 w-8 rounded-lg transition-transform',
                  coloreCategoria === colore
                    ? 'ring-2 ring-ink ring-offset-2 ring-offset-card'
                    : 'hover:scale-110',
                )}
                style={{ backgroundColor: colore }}
              />
            ))}
          </div>
        </form>
      </Sezione>

      {/* ============================= promemoria =========================== */}
      <Sezione
        titolo="Promemoria"
        icona={<Bell className="h-5 w-5" aria-hidden />}
        descrizione="Notifiche del browser che ti ricordano cosa non hai ancora fatto."
      >
        {permesso === 'non-supportate' ? (
          <p className="rounded-xl bg-elev px-3 py-2 text-sm text-ink-2">
            Questo browser non supporta le notifiche.
          </p>
        ) : permesso !== 'granted' ? (
          <div className="space-y-2">
            <p className="text-sm text-ink-2">
              Per ricevere i promemoria devi dare il permesso alle notifiche.
            </p>
            <Button
              variante="secondario"
              onClick={async () => {
                const esito = await richiediPermessoNotifiche()
                setPermesso(esito)
                if (esito === 'granted') toast.successo('Notifiche attivate.')
                else toast.errore('Permesso negato: puoi cambiarlo dalle impostazioni del browser.')
              }}
            >
              Attiva le notifiche
            </Button>
          </div>
        ) : null}

        <ul className="space-y-3">
          {(Object.keys(ETICHETTE_PROMEMORIA) as TipoPromemoria[]).map((tipo) => {
            const impostazione = profilo.reminders[tipo]
            return (
              <li key={tipo} className="flex flex-wrap items-center gap-3">
                <span className="min-w-0 flex-1 text-[0.95rem] text-ink">
                  {ETICHETTE_PROMEMORIA[tipo]}
                </span>
                <Input
                  type="time"
                  value={impostazione.time}
                  aria-label={`Orario del promemoria: ${ETICHETTE_PROMEMORIA[tipo]}`}
                  className="w-32"
                  onChange={(e) =>
                    salva({
                      reminders: {
                        ...profilo.reminders,
                        [tipo]: { ...impostazione, time: e.target.value },
                      },
                    })
                  }
                />
                <Switch
                  checked={impostazione.enabled}
                  etichetta={`Attiva il promemoria: ${ETICHETTE_PROMEMORIA[tipo]}`}
                  onChange={(attivo) =>
                    salva({
                      reminders: {
                        ...profilo.reminders,
                        [tipo]: { ...impostazione, enabled: attivo },
                      },
                    })
                  }
                />
              </li>
            )
          })}
        </ul>

        <p className="rounded-xl bg-elev px-3 py-2 text-sm leading-relaxed text-ink-2">
          I promemoria arrivano mentre l’app è aperta, anche in una scheda in secondo
          piano: non passano da nessun server, quindi se chiudi del tutto l’app quel
          giorno non partono.
        </p>
      </Sezione>

      {/* ================================ dati ============================== */}
      <Sezione
        titolo="I tuoi dati"
        icona={<Database className="h-5 w-5" aria-hidden />}
        descrizione="Un backup è una copia di tutto quello che hai salvato, in un unico file."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            variante="secondario"
            iconaSinistra={<Download className="h-4 w-4" />}
            onClick={esporta}
            caricamento={inEsportazione}
          >
            Esporta tutto
          </Button>
          <input
            ref={inputImport}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) setConfermaImport(file)
              e.target.value = ''
            }}
          />
          <Button
            variante="secondario"
            iconaSinistra={<Upload className="h-4 w-4" />}
            onClick={() => inputImport.current?.click()}
            caricamento={inImportazione}
          >
            Importa un backup
          </Button>
        </div>

        <div className="rounded-xl border border-danger/30 bg-danger/5 p-3">
          <p className="text-sm font-medium text-ink">Elimina tutti i dati</p>
          <p className="mt-0.5 text-sm text-ink-2">
            Cancella pesi, ricette, foto, task, diario e abitudini. L’account resta
            attivo, ma i contenuti non si possono recuperare.
          </p>
          <Button
            variante="pericolo"
            dimensione="sm"
            className="mt-3"
            iconaSinistra={<Trash2 className="h-4 w-4" />}
            onClick={() => setConfermaEliminazione(true)}
          >
            Elimina tutto
          </Button>
        </div>
      </Sezione>

      {/* ============================== account ============================= */}
      <Sezione
        titolo="Account"
        icona={<KeyRound className="h-5 w-5" aria-hidden />}
        descrizione={user?.email ?? undefined}
      >
        <form onSubmit={aggiornaPassword} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field etichetta="Nuova password">
              {(id) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="new-password"
                  value={nuovaPassword}
                  onChange={(e) => setNuovaPassword(e.target.value)}
                  placeholder="Almeno 6 caratteri"
                />
              )}
            </Field>
            <Field etichetta="Ripeti la password">
              {(id) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="new-password"
                  value={confermaPassword}
                  onChange={(e) => setConfermaPassword(e.target.value)}
                />
              )}
            </Field>
          </div>
          <Button
            type="submit"
            variante="secondario"
            caricamento={inCambioPassword}
            disabled={nuovaPassword === ''}
          >
            Cambia password
          </Button>
        </form>

        <div className="border-t border-line pt-4">
          <Button
            variante="fantasma"
            iconaSinistra={<LogOut className="h-4 w-4" />}
            onClick={() => esci().catch((e: Error) => toast.errore(e.message))}
          >
            Esci dall’account
          </Button>
        </div>
      </Sezione>

      <p className="pb-4 text-center text-xs text-ink-3">
        Benessere · i tuoi dati restano nel tuo progetto Supabase
      </p>

      <ConfirmDialog
        aperto={confermaImport !== null}
        onChiudi={() => setConfermaImport(null)}
        titolo="Ripristinare il backup?"
        descrizione="I dati presenti nel file verranno aggiunti al tuo account: le righe con lo stesso identificativo sostituiranno quelle attuali. Al termine l’app si ricarica."
        etichettaConferma="Importa"
        onConferma={async () => {
          if (confermaImport) await importa(confermaImport)
        }}
      />

      <ConfirmDialog
        aperto={confermaEliminazione}
        onChiudi={() => setConfermaEliminazione(false)}
        titolo="Eliminare davvero tutto?"
        descrizione="Stai per cancellare per sempre pesi, ricette, foto, piani pasti, lista della spesa, task, diario e abitudini. Non è possibile tornare indietro: se non l’hai già fatto, esporta prima un backup."
        etichettaConferma="Elimina tutto"
        pericoloso
        parolaDiConferma="ELIMINA"
        onConferma={async () => {
          if (!user) return
          try {
            await eliminaTuttiIDati(user.id)
            toast.successo('Tutti i dati sono stati eliminati.')
            window.setTimeout(() => window.location.reload(), 1200)
          } catch (e) {
            toast.errore((e as Error).message)
          }
        }}
      />
    </div>
  )
}
