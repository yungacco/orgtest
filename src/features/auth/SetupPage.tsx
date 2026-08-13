import { AlertTriangle } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'

/**
 * Mostrata quando mancano VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
 * Serve a non lasciare l'utente davanti a una pagina bianca.
 */
export function SetupPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo className="h-14 w-14" />
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-ink-3">
            Benessere
          </p>
        </div>

        <div className="card p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-warn/15 text-warn">
              <AlertTriangle className="h-6 w-6" aria-hidden />
            </span>
            <h1 className="text-xl font-semibold text-ink">Manca la configurazione</h1>
          </div>

          <p className="text-[0.95rem] leading-relaxed text-ink-2">
            L’app non sa ancora a quale database collegarsi. Servono due valori,
            che trovi nel tuo progetto su Supabase alla voce{' '}
            <strong className="text-ink">Project Settings → API</strong>.
          </p>

          <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-ink-3">
            Se stai provando l’app sul tuo computer
          </h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[0.95rem] text-ink-2">
            <li>
              Crea un file chiamato <code className="rounded bg-elev px-1.5 py-0.5 text-sm">.env</code>{' '}
              nella cartella del progetto (puoi copiare{' '}
              <code className="rounded bg-elev px-1.5 py-0.5 text-sm">.env.example</code>).
            </li>
            <li>Incolla dentro l’indirizzo del progetto e la chiave “anon public”.</li>
            <li>
              Riavvia il comando{' '}
              <code className="rounded bg-elev px-1.5 py-0.5 text-sm">npm run dev</code>.
            </li>
          </ol>

          <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-ink-3">
            Se il sito è già pubblicato su GitHub Pages
          </h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[0.95rem] text-ink-2">
            <li>
              Vai su GitHub → <strong className="text-ink">Settings</strong> →{' '}
              <strong className="text-ink">Secrets and variables</strong> →{' '}
              <strong className="text-ink">Actions</strong>.
            </li>
            <li>
              Crea i due segreti{' '}
              <code className="rounded bg-elev px-1.5 py-0.5 text-sm">VITE_SUPABASE_URL</code> e{' '}
              <code className="rounded bg-elev px-1.5 py-0.5 text-sm">VITE_SUPABASE_ANON_KEY</code>.
            </li>
            <li>
              Nella scheda <strong className="text-ink">Actions</strong> riavvia l’ultimo
              deploy: il sito verrà ricostruito con i valori giusti.
            </li>
          </ol>

          <p className="mt-6 rounded-xl bg-elev px-4 py-3 text-sm leading-relaxed text-ink-2">
            Trovi tutti i passaggi, con le immagini, nel file{' '}
            <strong className="text-ink">README.md</strong> del repository.
          </p>
        </div>
      </div>
    </div>
  )
}
