import { Suspense } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogOut, Settings } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuth } from '@/providers/AuthProvider'
import { useProfilo } from '@/features/settings/hooks'
import { usePromemoria } from '@/features/settings/promemoria'
import { Spinner } from '@/components/ui/Feedback'
import { IconButton } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { QuickAdd } from '@/features/quickadd/QuickAdd'
import { StatoConnessione } from './StatoConnessione'
import { NAV_PRINCIPALE, NAV_SECONDARIA, VOCE_IMPOSTAZIONI, voceAttiva } from './nav'
import { Logo } from './Logo'

function classiLink(attivo: boolean) {
  return cn(
    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.95rem] font-medium transition-colors',
    attivo
      ? 'bg-accent-500/12 text-accent-700 dark:text-accent-300'
      : 'text-ink-2 hover:bg-elev hover:text-ink',
  )
}

/** Barra laterale fissa: solo da tablet/desktop in su. */
function Sidebar() {
  const { pathname: percorso } = useLocation()
  const { user, esci } = useAuth()
  const { profilo } = useProfilo()
  const toast = useToast()

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-[17rem] shrink-0 flex-col border-r border-line bg-card md:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Logo className="h-9 w-9" />
        <div className="min-w-0">
          <p className="truncate font-semibold tracking-tight text-ink">Benessere</p>
          <p className="truncate text-xs text-ink-3">
            {profilo.display_name || user?.email}
          </p>
        </div>
      </div>

      <nav aria-label="Sezioni principali" className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-1">
          {NAV_PRINCIPALE.map((voce) => {
            const attiva = voceAttiva(voce, percorso)
            return (
              <li key={voce.percorso}>
                <Link
                  to={voce.percorso}
                  aria-current={attiva ? 'page' : undefined}
                  className={classiLink(attiva)}
                >
                  <voce.icona
                    className={cn(
                      'h-5 w-5 shrink-0',
                      attiva && 'text-accent-600 dark:text-accent-300',
                    )}
                    aria-hidden
                  />
                  {voce.etichetta}
                </Link>
              </li>
            )
          })}
        </ul>

        <p className="px-3 pb-2 pt-6 text-xs font-semibold uppercase tracking-wide text-ink-3">
          Organizzazione
        </p>
        <ul className="space-y-1">
          {NAV_SECONDARIA.map((voce) => (
            <li key={voce.percorso}>
              <NavLink to={voce.percorso} className={({ isActive }) => classiLink(isActive)}>
                {({ isActive }) => (
                  <>
                    <voce.icona
                      className={cn('h-5 w-5 shrink-0', isActive && 'text-accent-600 dark:text-accent-300')}
                      aria-hidden
                    />
                    {voce.etichetta}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-1 border-t border-line p-3">
        <NavLink
          to={VOCE_IMPOSTAZIONI.percorso}
          className={({ isActive }) => classiLink(isActive)}
        >
          <Settings className="h-5 w-5 shrink-0" aria-hidden />
          {VOCE_IMPOSTAZIONI.etichetta}
        </NavLink>
        <button
          type="button"
          onClick={() =>
            esci().catch((errore: Error) => toast.errore(errore.message))
          }
          className={cn(classiLink(false), 'w-full')}
        >
          <LogOut className="h-5 w-5 shrink-0" aria-hidden />
          Esci
        </button>
      </div>
    </aside>
  )
}

/** Barra di navigazione in basso: solo su telefono. */
function BottomNav() {
  const { pathname: percorso } = useLocation()

  return (
    <nav
      aria-label="Sezioni principali"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur md:hidden',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <ul className="flex items-stretch justify-around">
        {NAV_PRINCIPALE.map((voce) => {
          const attiva = voceAttiva(voce, percorso, true)
          return (
            <li key={voce.percorso} className="flex-1">
              <Link
                to={voce.percorso}
                aria-current={attiva ? 'page' : undefined}
                className={cn(
                  'relative flex h-full min-h-[3.5rem] flex-col items-center justify-center gap-0.5 px-1 pt-1.5 text-[0.68rem] font-medium transition-colors',
                  attiva ? 'text-accent-600 dark:text-accent-300' : 'text-ink-3',
                )}
              >
                {attiva && (
                  <motion.span
                    layoutId="indicatore-nav"
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-accent-600 dark:bg-accent-300"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <voce.icona
                  className="h-[1.35rem] w-[1.35rem]"
                  strokeWidth={attiva ? 2.4 : 1.9}
                  aria-hidden
                />
                <span>{voce.etichetta}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Intestazione compatta con logo e scorciatoia alle impostazioni (mobile). */
function TopBarMobile() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line bg-bg/90 px-4 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur md:hidden">
      <NavLink to="/" className="flex items-center gap-2">
        <Logo className="h-7 w-7" />
        <span className="font-semibold tracking-tight text-ink">Benessere</span>
      </NavLink>
      <div className="flex items-center gap-1">
        <StatoConnessione />
        <NavLink to="/impostazioni" aria-label="Impostazioni">
          {({ isActive }) => (
            <IconButton
              etichetta="Impostazioni"
              dimensione="sm"
              className={cn(isActive && 'text-accent-600 dark:text-accent-300')}
              tabIndex={-1}
            >
              <Settings className="h-5 w-5" />
            </IconButton>
          )}
        </NavLink>
      </div>
    </header>
  )
}

export function AppLayout() {
  const location = useLocation()
  usePromemoria()

  return (
    <div className="min-h-dvh bg-bg">
      <Sidebar />
      <div className="md:pl-[17rem]">
        <TopBarMobile />
        <div className="hidden justify-end px-8 pt-4 md:flex">
          <StatoConnessione />
        </div>
        <main
          id="contenuto"
          className={cn(
            'mx-auto w-full max-w-6xl px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4',
            'md:px-8 md:pb-12 md:pt-2',
          )}
        >
          <Suspense
            fallback={
              <div className="flex justify-center py-20">
                <Spinner className="h-7 w-7" />
              </div>
            }
          >
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </Suspense>
        </main>
      </div>
      <QuickAdd />
      <BottomNav />
    </div>
  )
}
