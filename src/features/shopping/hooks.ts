import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/queryClient'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/ui/Toast'
import {
  aggiornaVoce,
  aggiungiVoci,
  eliminaGenerate,
  eliminaSpuntate,
  eliminaVoce,
  listaSpesa,
  unisciVoci,
  type VoceSpesaInput,
} from './api'
import { ingredientiDaRicette, unisciNellaLista } from './aggrega'
import type { Recipe, ShoppingItem, UUID } from '@/types'

export function useSpesa() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const query = useQuery({
    queryKey: qk.spesa(userId),
    queryFn: listaSpesa,
    enabled: Boolean(userId),
  })
  return {
    voci: query.data ?? [],
    caricamento: query.isLoading,
    // se abbiamo gia' dei dati (magari dalla cache offline) mostriamo
    // quelli: l'errore serve solo quando non c'e' proprio niente da mostrare
    errore: (query.data ? null : query.error) as Error | null,
    ricarica: query.refetch,
  }
}

export function useAggiungiVoci() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (voci: VoceSpesaInput[]) => aggiungiVoci(voci),
    onSuccess: (create) => {
      qc.setQueryData<ShoppingItem[]>(qk.spesa(userId), (precedenti = []) => [
        ...precedenti,
        ...create,
      ])
    },
    onError: (errore: Error) => toast.errore(errore.message),
  })
}

export interface EsitoGenerazioneSpesa {
  aggiunti: number
  sommati: number
}

/**
 * Aggiunge alla lista della spesa gli ingredienti delle ricette indicate.
 * Se un ingrediente c'e' gia' (stesso nome e stessa unita', non ancora
 * spuntato) somma le quantita' invece di creare un doppione.
 */
export function useGeneraSpesa() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: async (ricette: Recipe[]): Promise<EsitoGenerazioneSpesa> => {
      // rileggiamo dal server: la cache potrebbe non essere mai stata
      // riempita (se la lista non e' ancora stata aperta) e finiremmo per
      // duplicare tutto
      const esistenti = await listaSpesa()
      const unione = unisciNellaLista(esistenti, ingredientiDaRicette(ricette))
      await unisciVoci(unione)
      return {
        aggiunti: unione.daInserire.length,
        sommati: unione.daAggiornare.length,
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.spesa(userId) })
    },
    onError: (errore: Error) => toast.errore(errore.message),
  })
}

export function useAggiornaVoce() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: UUID
      patch: Partial<Pick<ShoppingItem, 'name' | 'quantity' | 'unit' | 'checked'>>
    }) => aggiornaVoce(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: qk.spesa(userId) })
      const precedenti = qc.getQueryData<ShoppingItem[]>(qk.spesa(userId)) ?? []
      qc.setQueryData<ShoppingItem[]>(
        qk.spesa(userId),
        precedenti.map((voce) => (voce.id === id ? { ...voce, ...patch } : voce)),
      )
      return { precedenti }
    },
    onError: (errore: Error, _variabili, context) => {
      qc.setQueryData(qk.spesa(userId), context?.precedenti)
      toast.errore(errore.message)
    },
  })
}

export function useEliminaVoce() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (id: UUID) => eliminaVoce(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.spesa(userId) })
      const precedenti = qc.getQueryData<ShoppingItem[]>(qk.spesa(userId)) ?? []
      qc.setQueryData<ShoppingItem[]>(
        qk.spesa(userId),
        precedenti.filter((voce) => voce.id !== id),
      )
      return { precedenti }
    },
    onError: (errore: Error, _id, context) => {
      qc.setQueryData(qk.spesa(userId), context?.precedenti)
      toast.errore(errore.message)
    },
  })
}

/** Pulizie della lista: solo le voci generate, oppure solo quelle spuntate. */
export function usePulisciSpesa() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (cosa: 'generate' | 'spuntate') =>
      cosa === 'generate' ? eliminaGenerate() : eliminaSpuntate(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.spesa(userId) })
    },
    onError: (errore: Error) => toast.errore(errore.message),
  })
}
