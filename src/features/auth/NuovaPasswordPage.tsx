import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/providers/AuthProvider'

/**
 * Schermata mostrata quando si arriva dal link "password dimenticata".
 */
export function NuovaPasswordPage() {
  const { cambiaPassword, fineRecuperoPassword, esci } = useAuth()
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [conferma, setConferma] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [inCorso, setInCorso] = useState(false)

  async function invia(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setErrore('La password deve avere almeno 6 caratteri.')
      return
    }
    if (password !== conferma) {
      setErrore('Le due password non coincidono.')
      return
    }
    setErrore(null)
    setInCorso(true)
    try {
      await cambiaPassword(password)
      toast.successo('Password aggiornata.')
      fineRecuperoPassword()
    } catch (e) {
      setErrore((e as Error).message)
    } finally {
      setInCorso(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="card p-6 sm:p-7">
          <div className="mb-5 flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500/12 text-accent-600 dark:text-accent-300">
              <KeyRound className="h-7 w-7" aria-hidden />
            </div>
            <h1 className="text-xl font-semibold text-ink">Scegli una nuova password</h1>
            <p className="mt-1.5 text-sm text-ink-2">
              Da adesso userai questa password per accedere.
            </p>
          </div>

          <form onSubmit={invia} className="space-y-4" noValidate>
            <Field etichetta="Nuova password" richiesto descrizione="Almeno 6 caratteri.">
              {(id) => (
                <Input
                  id={id}
                  data-autofocus
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              )}
            </Field>
            <Field etichetta="Ripeti la password" richiesto>
              {(id) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="new-password"
                  value={conferma}
                  onChange={(e) => setConferma(e.target.value)}
                  required
                />
              )}
            </Field>

            {errore && (
              <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
                {errore}
              </p>
            )}

            <Button type="submit" larghezzaPiena dimensione="lg" caricamento={inCorso}>
              Salva la nuova password
            </Button>
          </form>
        </div>

        <button
          type="button"
          onClick={() => {
            fineRecuperoPassword()
            void esci()
          }}
          className="mx-auto mt-5 block text-sm text-ink-3 underline-offset-2 hover:text-ink hover:underline"
        >
          Annulla ed esci
        </button>
      </div>
    </div>
  )
}
