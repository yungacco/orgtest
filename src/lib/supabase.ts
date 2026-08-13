import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

function indirizzoValido(valore: string | undefined): valore is string {
  if (!valore) return false
  try {
    const analizzato = new URL(valore)
    return analizzato.protocol === 'https:' || analizzato.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * Vero solo quando le due variabili d'ambiente sono state impostate davvero.
 * Se sono mancanti (o sono ancora i valori di esempio) l'app mostra una
 * schermata che spiega come configurarle, invece di rompersi con un errore.
 */
function leggiConfigurazione(): { url: string; anonKey: string } | null {
  if (!indirizzoValido(url) || url.includes('xxxxxxxx')) return null
  if (!anonKey || anonKey.startsWith('incolla-qui')) return null
  return { url, anonKey }
}

const configurazione = leggiConfigurazione()
export const isSupabaseConfigured = configurazione !== null

if (!isSupabaseConfigured) {
  // Un messaggio chiaro in console aiuta a capire quale dei due valori manca
  // senza mai stamparne il contenuto.
  console.warn(
    '[Benessere] Configurazione Supabase non valida.',
    '\n  VITE_SUPABASE_URL:',
    url ? (indirizzoValido(url) ? 'ok' : 'non è un indirizzo valido (deve iniziare con https://)') : 'mancante',
    '\n  VITE_SUPABASE_ANON_KEY:',
    anonKey ? 'presente' : 'mancante',
  )
}

/**
 * Attenzione: createClient solleva un'eccezione se l'indirizzo e' malformato,
 * e capitando all'avvio lascerebbe una pagina bianca. Per questo, quando la
 * configurazione non e' valida, gli passiamo valori finti ma ben formati: cosi'
 * l'app riesce comunque a mostrare la schermata che spiega cosa sistemare.
 */
export const supabase = createClient(
  configurazione?.url ?? 'https://non-configurato.supabase.co',
  configurazione?.anonKey ?? 'chiave-non-configurata',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // usiamo HashRouter: l'hash serve alle rotte
      storageKey: 'benessere-auth',
      flowType: 'pkce',
    },
  },
)

/** Nome del bucket di Supabase Storage con le foto delle ricette. */
export const PHOTO_BUCKET = 'ricette'

/**
 * Traduce in italiano gli errori piu' comuni restituiti da Supabase,
 * che di default sono in inglese e poco comprensibili.
 */
export function messaggioErrore(error: unknown): string {
  const raw =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : ((error as { message?: string })?.message ?? '')

  const map: Record<string, string> = {
    'Invalid login credentials': 'Email o password non corretti.',
    'Email not confirmed':
      'Devi prima confermare la tua email: controlla la posta (anche lo spam).',
    'User already registered': 'Esiste gia’ un account con questa email.',
    'Password should be at least 6 characters':
      'La password deve avere almeno 6 caratteri.',
    'New password should be different from the old password':
      'La nuova password deve essere diversa da quella attuale.',
    'Auth session missing!': 'Sessione scaduta: accedi di nuovo.',
    'Failed to fetch':
      'Nessuna connessione a internet. Le modifiche verranno inviate quando torni online.',
    'Email rate limit exceeded':
      'Troppe email inviate di seguito: riprova tra qualche minuto.',
  }

  for (const [key, value] of Object.entries(map)) {
    if (raw.includes(key)) return value
  }

  if (raw.includes('duplicate key') && raw.includes('date')) {
    return 'Esiste gia’ una registrazione per questa data.'
  }
  if (raw.includes('duplicate key')) {
    return 'Questo elemento esiste gia’.'
  }
  if (raw.includes('row-level security')) {
    return 'Permesso negato: prova a uscire e rientrare nell’account.'
  }
  if (raw.includes('relation') && raw.includes('does not exist')) {
    return 'Il database non e’ ancora stato configurato: esegui supabase/schema.sql.'
  }
  if (raw.includes('Bucket not found')) {
    return 'Manca il bucket "ricette" su Supabase Storage: riesegui supabase/schema.sql.'
  }

  return raw || 'Si e’ verificato un errore imprevisto.'
}

/** Solleva l'errore di Supabase (se c'e') e restituisce i dati tipizzati. */
export function unwrap<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw new Error(messaggioErrore(res.error))
  return res.data as T
}
