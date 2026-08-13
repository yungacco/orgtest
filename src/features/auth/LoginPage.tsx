import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff, Mail } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { Logo } from '@/components/layout/Logo'
import { useAuth } from '@/providers/AuthProvider'

type Modalita = 'accesso' | 'registrazione' | 'recupero'

export function LoginPage() {
  const { accedi, registrati, inviaResetPassword } = useAuth()
  const toast = useToast()

  const [modalita, setModalita] = useState<Modalita>('accesso')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [mostraPassword, setMostraPassword] = useState(false)
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [inviato, setInviato] = useState(false)

  async function invia(e: React.FormEvent) {
    e.preventDefault()
    setErrore(null)

    if (!email.includes('@')) {
      setErrore('Scrivi un indirizzo email valido.')
      return
    }
    if (modalita !== 'recupero' && password.length < 6) {
      setErrore('La password deve avere almeno 6 caratteri.')
      return
    }

    setInCorso(true)
    try {
      if (modalita === 'accesso') {
        await accedi(email, password)
      } else if (modalita === 'registrazione') {
        const { confermaRichiesta } = await registrati(email, password, nome)
        if (confermaRichiesta) {
          setInviato(true)
          toast.info('Ti ho mandato un’email per confermare l’indirizzo.')
        }
      } else {
        await inviaResetPassword(email)
        setInviato(true)
      }
    } catch (e) {
      setErrore((e as Error).message)
    } finally {
      setInCorso(false)
    }
  }

  if (inviato) {
    return (
      <Guscio>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500/12 text-accent-600 dark:text-accent-300">
            <Mail className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="text-xl font-semibold text-ink">Controlla la tua email</h1>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-2">
            Ho inviato un messaggio a <strong className="text-ink">{email}</strong>.
            Apri il link contenuto nell’email{' '}
            {modalita === 'recupero'
              ? 'per scegliere una nuova password.'
              : 'per attivare il tuo account.'}
          </p>
          <p className="mt-2 text-sm text-ink-3">
            Non lo trovi? Controlla nella cartella spam, oppure aspetta un minuto e riprova.
          </p>
          <Button
            variante="secondario"
            larghezzaPiena
            className="mt-6"
            onClick={() => {
              setInviato(false)
              setModalita('accesso')
            }}
            iconaSinistra={<ArrowLeft className="h-4 w-4" />}
          >
            Torna all’accesso
          </Button>
        </div>
      </Guscio>
    )
  }

  return (
    <Guscio>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {modalita === 'accesso'
            ? 'Bentornato'
            : modalita === 'registrazione'
              ? 'Crea il tuo account'
              : 'Recupera la password'}
        </h1>
        <p className="mt-1.5 text-[0.95rem] text-ink-2">
          {modalita === 'accesso'
            ? 'Accedi per ritrovare peso, ricette, task e diario.'
            : modalita === 'registrazione'
              ? 'Bastano un’email e una password: i dati restano solo tuoi.'
              : 'Ti mando un link per impostare una nuova password.'}
        </p>
      </div>

      <form onSubmit={invia} className="space-y-4" noValidate>
        {modalita === 'registrazione' && (
          <Field etichetta="Come ti chiami">
            {(id) => (
              <Input
                id={id}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Il tuo nome"
                autoComplete="name"
              />
            )}
          </Field>
        )}

        <Field etichetta="Email" richiesto>
          {(id, invalido) => (
            <Input
              id={id}
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@esempio.it"
              autoComplete="email"
              aria-invalid={invalido}
              required
            />
          )}
        </Field>

        {modalita !== 'recupero' && (
          <Field
            etichetta="Password"
            richiesto
            descrizione={modalita === 'registrazione' ? 'Almeno 6 caratteri.' : undefined}
          >
            {(id) => (
              <div className="relative">
                <Input
                  id={id}
                  type={mostraPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={
                    modalita === 'registrazione' ? 'new-password' : 'current-password'
                  }
                  className="pr-12"
                  required
                />
                <IconButton
                  etichetta={mostraPassword ? 'Nascondi password' : 'Mostra password'}
                  dimensione="sm"
                  className="absolute right-1 top-1"
                  onClick={() => setMostraPassword((v) => !v)}
                >
                  {mostraPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </IconButton>
              </div>
            )}
          </Field>
        )}

        {errore && (
          <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            {errore}
          </p>
        )}

        <Button type="submit" larghezzaPiena dimensione="lg" caricamento={inCorso}>
          {modalita === 'accesso'
            ? 'Accedi'
            : modalita === 'registrazione'
              ? 'Crea account'
              : 'Inviami il link'}
        </Button>
      </form>

      <div className="mt-5 space-y-2 text-center text-sm">
        {modalita === 'accesso' && (
          <>
            <button
              type="button"
              className="text-ink-3 underline-offset-2 hover:text-ink hover:underline"
              onClick={() => {
                setModalita('recupero')
                setErrore(null)
              }}
            >
              Ho dimenticato la password
            </button>
            <p className="text-ink-2">
              Non hai un account?{' '}
              <button
                type="button"
                className="font-semibold text-accent-600 underline-offset-2 hover:underline dark:text-accent-300"
                onClick={() => {
                  setModalita('registrazione')
                  setErrore(null)
                }}
              >
                Registrati
              </button>
            </p>
          </>
        )}
        {modalita !== 'accesso' && (
          <button
            type="button"
            className="font-medium text-accent-600 underline-offset-2 hover:underline dark:text-accent-300"
            onClick={() => {
              setModalita('accesso')
              setErrore(null)
            }}
          >
            Torna all’accesso
          </button>
        )}
      </div>
    </Guscio>
  )
}

function Guscio({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo className="h-14 w-14" />
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-ink-3">
            Benessere
          </p>
        </div>
        <div className="card p-6 sm:p-7">{children}</div>
        <p className="mt-6 text-center text-xs leading-relaxed text-ink-3">
          I tuoi dati sono protetti: ogni utente vede soltanto le proprie
          informazioni.
        </p>
      </motion.div>
    </div>
  )
}
