import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CloudOff } from 'lucide-react'

/**
 * Avviso discreto quando manca la connessione: l'app continua a funzionare
 * mostrando gli ultimi dati salvati in cache.
 */
export function StatoConnessione() {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const vaOnline = () => setOnline(true)
    const vaOffline = () => setOnline(false)
    window.addEventListener('online', vaOnline)
    window.addEventListener('offline', vaOffline)
    return () => {
      window.removeEventListener('online', vaOnline)
      window.removeEventListener('offline', vaOffline)
    }
  }, [])

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          role="status"
          className="flex items-center gap-1.5 rounded-full bg-warn/15 px-2.5 py-1 text-xs font-medium text-warn"
        >
          <CloudOff className="h-3.5 w-3.5" aria-hidden />
          Offline
        </motion.div>
      )}
    </AnimatePresence>
  )
}
