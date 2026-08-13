import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/queryClient'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/ui/Toast'
import {
  creaAllenamento,
  eliminaAllenamento,
  listaAllenamenti,
  modificaAllenamento,
} from './api'
import type { UUID, Workout, WorkoutInput } from '@/types'

function ordina(elenco: Workout[]): Workout[] {
  return [...elenco].sort(
    (a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at),
  )
}

export function useAllenamenti() {
  const { user } = useAuth()
  const userId = user?.id ?? ''

  const query = useQuery({
    queryKey: qk.allenamenti(userId),
    queryFn: listaAllenamenti,
    enabled: Boolean(userId),
  })

  return {
    allenamenti: query.data ?? [],
    caricamento: query.isLoading,
    // con dei dati in cache (magari offline) mostriamo quelli invece dell'errore
    errore: (query.data ? null : query.error) as Error | null,
    ricarica: query.refetch,
  }
}

export function useCreaAllenamento() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (input: WorkoutInput) => creaAllenamento(userId, input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: qk.allenamenti(userId) })
      const precedenti = qc.getQueryData<Workout[]>(qk.allenamenti(userId)) ?? []
      const ottimistico: Workout = {
        id: `temp-${crypto.randomUUID()}`,
        user_id: userId,
        created_at: new Date().toISOString(),
        ...input,
      }
      qc.setQueryData<Workout[]>(qk.allenamenti(userId), ordina([...precedenti, ottimistico]))
      return { precedenti }
    },
    onError: (errore: Error, _input, context) => {
      qc.setQueryData(qk.allenamenti(userId), context?.precedenti)
      toast.errore(errore.message)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.allenamenti(userId) })
    },
  })
}

export function useModificaAllenamento() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: ({ id, patch }: { id: UUID; patch: Partial<WorkoutInput> }) =>
      modificaAllenamento(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: qk.allenamenti(userId) })
      const precedenti = qc.getQueryData<Workout[]>(qk.allenamenti(userId)) ?? []
      qc.setQueryData<Workout[]>(
        qk.allenamenti(userId),
        ordina(precedenti.map((a) => (a.id === id ? { ...a, ...patch } : a))),
      )
      return { precedenti }
    },
    onError: (errore: Error, _variabili, context) => {
      qc.setQueryData(qk.allenamenti(userId), context?.precedenti)
      toast.errore(errore.message)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.allenamenti(userId) })
    },
  })
}

export function useEliminaAllenamento() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (id: UUID) => eliminaAllenamento(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.allenamenti(userId) })
      const precedenti = qc.getQueryData<Workout[]>(qk.allenamenti(userId)) ?? []
      qc.setQueryData<Workout[]>(
        qk.allenamenti(userId),
        precedenti.filter((a) => a.id !== id),
      )
      return { precedenti }
    },
    onError: (errore: Error, _id, context) => {
      qc.setQueryData(qk.allenamenti(userId), context?.precedenti)
      toast.errore(errore.message)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.allenamenti(userId) })
    },
  })
}
