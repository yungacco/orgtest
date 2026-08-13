import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, ChefHat, Dumbbell, ListTodo, Plus, Scale } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Azione {
  etichetta: string
  icona: LucideIcon
  destinazione: string
}

const AZIONI: Azione[] = [
  { etichetta: 'Registra il peso', icona: Scale, destinazione: '/peso?nuovo=1' },
  { etichetta: 'Allenamento', icona: Dumbbell, destinazione: '/allenamenti?nuovo=1' },
  { etichetta: 'Nuova ricetta', icona: ChefHat, destinazione: '/ricette/nuova' },
  { etichetta: 'Nuova task', icona: ListTodo, destinazione: '/task?nuovo=1' },
  { etichetta: 'Scrivi nel diario', icona: BookOpen, destinazione: '/diario?nuovo=1' },
]

/** Su queste pagine il "+" fa direttamente l'azione principale della pagina. */
const AZIONE_DIRETTA: Record<string, { destinazione: string; etichetta: string }> = {
  '/peso': { destinazione: '/peso?nuovo=1', etichetta: 'Registra il peso' },
  '/allenamenti': {
    destinazione: '/allenamenti?nuovo=1',
    etichetta: 'Registra un allenamento',
  },
  '/ricette': { destinazione: '/ricette/nuova', etichetta: 'Nuova ricetta' },
  '/task': { destinazione: '/task?nuovo=1', etichetta: 'Nuova task' },
  '/diario': { destinazione: '/diario?nuovo=1', etichetta: 'Scrivi nel diario' },
  '/spesa': { destinazione: '/spesa?nuovo=1', etichetta: 'Aggiungi alla lista' },
}

/** Pagine dove il pulsante flottante darebbe fastidio o non serve. */
const NASCOSTO = ['/impostazioni', '/ricette/nuova']

/**
 * Pulsante d'azione flottante (solo su telefono).
 * Sulle pagine con un'azione ovvia la esegue subito; altrove apre un
 * menu con le quattro cose che si inseriscono piu' spesso.
 */
export function QuickAdd() {
  const location = useLocation()
  const navigate = useNavigate()
  const [aperto, setAperto] = useState(false)

  const percorso = location.pathname
  useEffect(() => setAperto(false), [percorso])

  const nascosto =
    NASCOSTO.some((p) => percorso.startsWith(p)) || /\/ricette\/[^/]+/.test(percorso)
  if (nascosto) return null

  const diretta = AZIONE_DIRETTA[percorso]

  return (
    <>
      <AnimatePresence>
        {aperto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAperto(false)}
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] md:hidden"
            aria-hidden
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] right-4 z-50 flex flex-col items-end gap-2 md:hidden">
        <AnimatePresence>
          {aperto && (
            <motion.ul
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
              className="flex flex-col items-end gap-2"
            >
              {AZIONI.map((azione) => (
                <li key={azione.destinazione}>
                  <button
                    type="button"
                    onClick={() => {
                      setAperto(false)
                      navigate(azione.destinazione)
                    }}
                    className="tap flex items-center gap-2.5 rounded-2xl border border-line bg-card py-2.5 pl-4 pr-3 text-sm font-medium text-ink shadow-lift"
                  >
                    {azione.etichetta}
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-500/12 text-accent-600 dark:text-accent-300">
                      <azione.icona className="h-4 w-4" aria-hidden />
                    </span>
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

        <button
          type="button"
          aria-label={aperto ? 'Chiudi il menu rapido' : (diretta?.etichetta ?? 'Aggiungi')}
          aria-expanded={diretta ? undefined : aperto}
          onClick={() => {
            if (diretta) navigate(diretta.destinazione)
            else setAperto((v) => !v)
          }}
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-600 text-white shadow-lift',
            'transition-transform duration-150 active:scale-95',
          )}
        >
          {/* ruotando di 45 gradi il "+" diventa una "x": nessun salto visivo */}
          <motion.span
            animate={{ rotate: aperto ? 45 : 0 }}
            transition={{ duration: 0.18 }}
            className="flex"
          >
            <Plus className="h-6 w-6" aria-hidden />
          </motion.span>
        </button>
      </div>
    </>
  )
}
