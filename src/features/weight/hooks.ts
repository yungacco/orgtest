import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/queryClient'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/ui/Toast'
import { aggiornaPeso, eliminaPeso, listaPesi, salvaPeso } from './api'
import type { UUID, WeightEntry, WeightEntryInput } from '@/types'

export function usePesi() {
  const { user } = useAuth()
  const userId = user?.id ?? ''

  const query = useQuery({
    queryKey: qk.pesi(userId),
    queryFn: listaPesi,
    enabled: Boolean(userId),
  })

  return {
    pesi: query.data ?? [],
    caricamento: query.isLoading,
    // se abbiamo gia' dei dati (magari dalla cache offline) mostriamo
    // quelli: l'errore serve solo quando non c'e' proprio niente da mostrare
    errore: (query.data ? null : query.error) as Error | null,
    ricarica: query.refetch,
  }
}

function ordina(elenco: WeightEntry[]): WeightEntry[] {
  return [...elenco].sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Salvataggio (nuovo o sovrascrittura del giorno) con aggiornamento
 * ottimistico: la riga compare subito, poi viene confermata dal server.
 * Se il salvataggio fallisce si torna allo stato precedente.
 */
export function useSalvaPeso() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (input: WeightEntryInput) => salvaPeso(userId, input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: qk.pesi(userId) })
      const precedente = qc.getQueryData<WeightEntry[]>(qk.pesi(userId)) ?? []
      const esistente = precedente.find((p) => p.date === input.date)
      const ottimistico: WeightEntry = {
        id: esistente?.id ?? `temp-${crypto.randomUUID()}`,
        user_id: userId,
        created_at: esistente?.created_at ?? new Date().toISOString(),
        ...input,
      }
      qc.setQueryData<WeightEntry[]>(
        qk.pesi(userId),
        ordina([...precedente.filter((p) => p.date !== input.date), ottimistico]),
      )
      return { precedente }
    },
    onError: (errore: Error, _input, context) => {
      qc.setQueryData(qk.pesi(userId), context?.precedente)
      toast.errore(errore.message)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.pesi(userId) })
    },
  })
}

export function useAggiornaPeso() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: ({ id, patch }: { id: UUID; patch: Partial<WeightEntryInput> }) =>
      aggiornaPeso(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: qk.pesi(userId) })
      const precedente = qc.getQueryData<WeightEntry[]>(qk.pesi(userId)) ?? []
      qc.setQueryData<WeightEntry[]>(
        qk.pesi(userId),
        ordina(precedente.map((p) => (p.id === id ? { ...p, ...patch } : p))),
      )
      return { precedente }
    },
    onError: (errore: Error, _variabili, context) => {
      qc.setQueryData(qk.pesi(userId), context?.precedente)
      toast.errore(errore.message)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.pesi(userId) })
    },
  })
}

export function useEliminaPeso() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (id: UUID) => eliminaPeso(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.pesi(userId) })
      const precedente = qc.getQueryData<WeightEntry[]>(qk.pesi(userId)) ?? []
      qc.setQueryData<WeightEntry[]>(
        qk.pesi(userId),
        precedente.filter((p) => p.id !== id),
      )
      return { precedente }
    },
    onError: (errore: Error, _id, context) => {
      qc.setQueryData(qk.pesi(userId), context?.precedente)
      toast.errore(errore.message)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.pesi(userId) })
    },
  })
}
