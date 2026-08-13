import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, messaggioErrore } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'

interface AuthContextValue {
  session: Session | null
  user: User | null
  /** true finche' non sappiamo se c'e' una sessione salvata */
  caricamento: boolean
  /** true quando si arriva dal link "password dimenticata" ricevuto via email */
  recuperoPassword: boolean
  fineRecuperoPassword: () => void
  accedi: (email: string, password: string) => Promise<void>
  registrati: (email: string, password: string, nome: string) => Promise<{ confermaRichiesta: boolean }>
  esci: () => Promise<void>
  inviaResetPassword: (email: string) => Promise<void>
  cambiaPassword: (nuova: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth va usato dentro <AuthProvider>')
  return ctx
}

/** Comodo dove l'utente e' sicuramente autenticato (dentro le pagine protette). */
export function useUserId(): string {
  const { user } = useAuth()
  return user?.id ?? 'anonimo'
}

/**
 * I link ricevuti via email (conferma account e recupero password) riportano
 * sull'app con un parametro ?code=... da scambiare con una sessione.
 * Lo facciamo a mano perche' detectSessionInUrl e' disattivato: l'hash
 * dell'indirizzo e' gia' occupato dalle rotte (HashRouter).
 */
async function gestisciCodiceNellUrl(): Promise<{ recupero: boolean }> {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  const tipo = url.searchParams.get('type')
  if (!code) return { recupero: false }

  try {
    await supabase.auth.exchangeCodeForSession(code)
  } catch {
    /* codice gia' usato o scaduto: l'utente puo' richiedere un nuovo link */
  } finally {
    for (const chiave of ['code', 'type', 'error', 'error_description']) {
      url.searchParams.delete(chiave)
    }
    window.history.replaceState({}, '', url.toString())
  }
  return { recupero: tipo === 'recovery' }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [caricamento, setCaricamento] = useState(true)
  const [recuperoPassword, setRecuperoPassword] = useState(false)

  useEffect(() => {
    let attivo = true

    gestisciCodiceNellUrl()
      .then(({ recupero }) => {
        if (attivo && recupero) setRecuperoPassword(true)
      })
      .catch(() => undefined)

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!attivo) return
        setSession(data.session)
      })
      .finally(() => {
        if (attivo) setCaricamento(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((evento, nuovaSessione) => {
      setSession(nuovaSessione)
      if (evento === 'PASSWORD_RECOVERY') setRecuperoPassword(true)
      // cambiando utente la cache del precedente non deve restare in giro
      if (evento === 'SIGNED_OUT') {
        setRecuperoPassword(false)
        queryClient.clear()
        try {
          window.localStorage.removeItem('benessere-cache')
        } catch {
          /* localStorage non disponibile: pazienza */
        }
        // anche le foto delle ricette tenute dal service worker: su un
        // computer condiviso non devono restare a disposizione di chi usa
        // il browser dopo di te
        if ('caches' in window) {
          void caches
            .keys()
            .then((nomi) =>
              Promise.all(
                nomi
                  .filter((nome) => nome.startsWith('benessere-immagini'))
                  .map((nome) => caches.delete(nome)),
              ),
            )
            .catch(() => undefined)
        }
      }
    })

    return () => {
      attivo = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const accedi = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) throw new Error(messaggioErrore(error))
  }, [])

  const registrati = useCallback(async (email: string, password: string, nome: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: nome.trim() } },
    })
    if (error) throw new Error(messaggioErrore(error))
    // se Supabase richiede la conferma via email non torna nessuna sessione
    return { confermaRichiesta: !data.session }
  }, [])

  const esci = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(messaggioErrore(error))
  }, [])

  const inviaResetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.href.split('#')[0],
    })
    if (error) throw new Error(messaggioErrore(error))
  }, [])

  const cambiaPassword = useCallback(async (nuova: string) => {
    const { error } = await supabase.auth.updateUser({ password: nuova })
    if (error) throw new Error(messaggioErrore(error))
  }, [])

  const fineRecuperoPassword = useCallback(() => setRecuperoPassword(false), [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      caricamento,
      recuperoPassword,
      fineRecuperoPassword,
      accedi,
      registrati,
      esci,
      inviaResetPassword,
      cambiaPassword,
    }),
    [
      session,
      caricamento,
      recuperoPassword,
      fineRecuperoPassword,
      accedi,
      registrati,
      esci,
      inviaResetPassword,
      cambiaPassword,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
