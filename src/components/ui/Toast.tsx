import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '@/lib/cn'

type TipoToast = 'successo' | 'errore' | 'info'

interface Azione {
  etichetta: string
  onClick: () => void
}

interface Toast {
  id: number
  messaggio: string
  tipo: TipoToast
  azione?: Azione
  durata: number
}

interface ToastApi {
  mostra: (opzioni: {
    messaggio: string
    tipo?: TipoToast
    azione?: Azione
    durata?: number
  }) => number
  successo: (messaggio: string, azione?: Azione) => number
  errore: (messaggio: string) => number
  info: (messaggio: string, azione?: Azione) => number
  chiudi: (id: number) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast va usato dentro <ToastProvider>')
  return ctx
}

const icone: Record<TipoToast, ReactNode> = {
  successo: <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />,
  errore: <AlertCircle className="h-5 w-5 text-danger" aria-hidden />,
  info: <Info className="h-5 w-5 text-accent-500" aria-hidden />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const contatore = useRef(0)
  const timer = useRef(new Map<number, number>())

  const chiudi = useCallback((id: number) => {
    const t = timer.current.get(id)
    if (t) {
      window.clearTimeout(t)
      timer.current.delete(id)
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const mostra = useCallback<ToastApi['mostra']>(
    ({ messaggio, tipo = 'info', azione, durata }) => {
      const id = ++contatore.current
      const tempo = durata ?? (azione ? 6000 : tipo === 'errore' ? 6000 : 3200)
      setToasts((prev) => [...prev.slice(-2), { id, messaggio, tipo, azione, durata: tempo }])
      timer.current.set(
        id,
        window.setTimeout(() => chiudi(id), tempo),
      )
      return id
    },
    [chiudi],
  )

  useEffect(() => {
    const timers = timer.current
    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      timers.clear()
    }
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      mostra,
      chiudi,
      successo: (messaggio, azione) => mostra({ messaggio, tipo: 'successo', azione }),
      errore: (messaggio) => mostra({ messaggio, tipo: 'errore' }),
      info: (messaggio, azione) => mostra({ messaggio, tipo: 'info', azione }),
    }),
    [mostra, chiudi],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="region"
        aria-label="Notifiche"
        className={cn(
          'pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-3',
          'bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-6 md:left-auto md:right-6 md:items-end md:px-0',
        )}
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', damping: 26, stiffness: 340 }}
              role={toast.tipo === 'errore' ? 'alert' : 'status'}
              aria-live={toast.tipo === 'errore' ? 'assertive' : 'polite'}
              className={cn(
                'pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-line',
                'bg-card px-4 py-3 shadow-lift',
              )}
            >
              {icone[toast.tipo]}
              <p className="min-w-0 flex-1 text-sm text-ink">{toast.messaggio}</p>
              {toast.azione && (
                <button
                  type="button"
                  onClick={() => {
                    toast.azione?.onClick()
                    chiudi(toast.id)
                  }}
                  className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-accent-600 hover:bg-accent-500/10 dark:text-accent-300"
                >
                  {toast.azione.etichetta}
                </button>
              )}
              <button
                type="button"
                onClick={() => chiudi(toast.id)}
                aria-label="Chiudi notifica"
                className="shrink-0 rounded-lg p-1 text-ink-3 hover:bg-elev hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
