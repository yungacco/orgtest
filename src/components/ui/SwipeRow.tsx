import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface AzioneSwipe {
  etichetta: string
  icona: LucideIcon
  onClick: () => void
  tono?: 'neutro' | 'pericolo'
}

const LARGHEZZA_AZIONE = 76

/**
 * Riga di una lista che sul telefono si puo' trascinare verso sinistra per
 * scoprire le azioni (modifica, elimina...). Con mouse e tastiera le stesse
 * azioni restano raggiungibili: compaiono passandoci sopra e sono comunque
 * pulsanti veri, quindi si raggiungono col Tab.
 */
export function SwipeRow({
  azioni,
  children,
  className,
}: {
  azioni: AzioneSwipe[]
  children: ReactNode
  className?: string
}) {
  const controls = useAnimationControls()
  const [aperto, setAperto] = useState(false)
  const contenitore = useRef<HTMLDivElement>(null)
  const larghezzaTotale = azioni.length * LARGHEZZA_AZIONE

  // chiudendo il pannello quando si tocca altrove si evita di lasciare
  // righe "mezze aperte" in giro per la lista
  useEffect(() => {
    if (!aperto) return
    const gestisci = (e: PointerEvent) => {
      if (!contenitore.current?.contains(e.target as Node)) {
        setAperto(false)
        void controls.start({ x: 0 })
      }
    }
    document.addEventListener('pointerdown', gestisci)
    return () => document.removeEventListener('pointerdown', gestisci)
  }, [aperto, controls])

  function chiudi() {
    setAperto(false)
    void controls.start({ x: 0 })
  }

  return (
    <div ref={contenitore} className={cn('group relative overflow-hidden rounded-2xl', className)}>
      <div className="absolute inset-y-0 right-0 flex">
        {azioni.map((azione) => (
          <button
            key={azione.etichetta}
            type="button"
            onClick={() => {
              chiudi()
              azione.onClick()
            }}
            aria-label={azione.etichetta}
            title={azione.etichetta}
            style={{ width: LARGHEZZA_AZIONE }}
            className={cn(
              'flex flex-col items-center justify-center gap-1 text-xs font-medium text-white transition-colors',
              azione.tono === 'pericolo'
                ? 'bg-danger hover:brightness-110'
                : 'bg-ink-3 hover:brightness-110',
            )}
          >
            <azione.icona className="h-5 w-5" aria-hidden />
            {azione.etichetta}
          </button>
        ))}
      </div>

      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -larghezzaTotale, right: 0 }}
        dragElastic={{ left: 0.05, right: 0 }}
        animate={controls}
        onDragEnd={(_evento, info) => {
          const deveAprire = info.offset.x < -larghezzaTotale / 2.5 || info.velocity.x < -420
          setAperto(deveAprire)
          void controls.start({
            x: deveAprire ? -larghezzaTotale : 0,
            transition: { type: 'spring', damping: 34, stiffness: 420 },
          })
        }}
        // lo sfondo pieno evita che i pulsanti dietro si intravedano
        // negli angoli arrotondati della riga
        className="relative touch-pan-y bg-card"
      >
        {children}
      </motion.div>
    </div>
  )
}
