import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

/**
 * Un'unica cache per tutta l'app.
 *
 * La cache viene salvata nel browser (localStorage): quando riapri l'app
 * senza connessione vedi comunque gli ultimi dati sincronizzati, invece di
 * una schermata vuota. Appena torna la rete i dati si aggiornano da soli.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 60 * 24 * 7,
      retry: (conteggio, errore) => {
        const messaggio = (errore as Error)?.message ?? ''
        // inutile insistere se il problema e' di permessi o configurazione
        if (messaggio.includes('Permesso negato') || messaggio.includes('schema.sql')) {
          return false
        }
        return conteggio < 2
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
})

export const persister = createSyncStoragePersister({
  storage: typeof window === 'undefined' ? undefined : window.localStorage,
  key: 'benessere-cache',
  throttleTime: 1000,
})

/** Chiavi delle query, in un unico posto per evitare errori di battitura. */
export const qk = {
  profilo: (userId: string) => ['profilo', userId] as const,
  pesi: (userId: string) => ['pesi', userId] as const,
  ricette: (userId: string) => ['ricette', userId] as const,
  ricetta: (userId: string, id: string) => ['ricetta', userId, id] as const,
  tagRicette: (userId: string) => ['tag-ricette', userId] as const,
  piano: (userId: string, da: string, a: string) => ['piano', userId, da, a] as const,
  spesa: (userId: string) => ['spesa', userId] as const,
  taskAttive: (userId: string) => ['task-attive', userId] as const,
  taskArchivio: (userId: string) => ['task-archivio', userId] as const,
  categorieTask: (userId: string) => ['categorie-task', userId] as const,
  diario: (userId: string) => ['diario', userId] as const,
  abitudini: (userId: string) => ['abitudini', userId] as const,
  logAbitudini: (userId: string) => ['log-abitudini', userId] as const,
}
