import { useCallback, useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { IconButton } from './Button'

const SELETTORE_FOCUSABILI =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export interface ModalProps {
  aperto: boolean
  onChiudi: () => void
  titolo: string
  descrizione?: string
  children: ReactNode
  /** Barra in fondo, tipicamente con i pulsanti Annulla / Salva */
  footer?: ReactNode
  larghezza?: 'sm' | 'md' | 'lg'
}

/**
 * Finestra modale: sul telefono entra dal basso come "foglio", su desktop
 * appare al centro. Gestisce Esc, click sullo sfondo, blocco dello scroll e
 * trappola del focus (il Tab non esce dalla finestra).
 */
export function Modal({
  aperto,
  onChiudi,
  titolo,
  descrizione,
  children,
  footer,
  larghezza = 'md',
}: ModalProps) {
  const contenitore = useRef<HTMLDivElement>(null)
  const elementoPrecedente = useRef<HTMLElement | null>(null)
  const id = useId()

  const gestisciTasti = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onChiudi()
        return
      }
      if (e.key !== 'Tab' || !contenitore.current) return
      const focusabili = Array.from(
        contenitore.current.querySelectorAll<HTMLElement>(SELETTORE_FOCUSABILI),
      ).filter((el) => el.offsetParent !== null)
      if (focusabili.length === 0) return
      const primo = focusabili[0]
      const ultimo = focusabili[focusabili.length - 1]
      if (e.shiftKey && document.activeElement === primo) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primo.focus()
      }
    },
    [onChiudi],
  )

  useEffect(() => {
    if (!aperto) return
    elementoPrecedente.current = document.activeElement as HTMLElement
    const scrollBarra = window.innerWidth - document.documentElement.clientWidth
    const stileOriginale = document.body.style.cssText
    document.body.style.overflow = 'hidden'
    if (scrollBarra > 0) document.body.style.paddingRight = `${scrollBarra}px`
    document.addEventListener('keydown', gestisciTasti, true)

    const timer = window.setTimeout(() => {
      // prima il campo marcato data-autofocus, altrimenti il primo elemento
      // raggiungibile: querySelector segue l'ordine del documento, quindi
      // le due ricerche vanno fatte separatamente
      const target =
        contenitore.current?.querySelector<HTMLElement>('[data-autofocus]') ??
        contenitore.current?.querySelector<HTMLElement>(SELETTORE_FOCUSABILI)
      target?.focus()
    }, 60)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', gestisciTasti, true)
      document.body.style.cssText = stileOriginale
      elementoPrecedente.current?.focus?.()
    }
  }, [aperto, gestisciTasti])

  const larghezze = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-3xl',
  }[larghezza]

  return createPortal(
    <AnimatePresence>
      {aperto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onChiudi}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
            aria-hidden
          />
          <motion.div
            ref={contenitore}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-titolo`}
            aria-describedby={descrizione ? `${id}-desc` : undefined}
            initial={{ opacity: 0, y: 40, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.99 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-card shadow-lift',
              'rounded-t-3xl sm:rounded-3xl',
              larghezze,
            )}
          >
            {/* maniglia visiva del foglio, solo su mobile */}
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-ink-3/30 sm:hidden" aria-hidden />

            <div className="flex items-start gap-3 px-5 pb-3 pt-4">
              <div className="min-w-0 flex-1">
                <h2 id={`${id}-titolo`} className="text-lg font-semibold text-ink">
                  {titolo}
                </h2>
                {descrizione && (
                  <p id={`${id}-desc`} className="mt-0.5 text-sm text-ink-3">
                    {descrizione}
                  </p>
                )}
              </div>
              <IconButton etichetta="Chiudi" dimensione="sm" onClick={onChiudi}>
                <X className="h-5 w-5" />
              </IconButton>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>

            {footer && (
              <div className="flex items-center justify-end gap-2 border-t border-line bg-card px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
