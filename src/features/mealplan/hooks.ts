import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/queryClient'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/ui/Toast'
import { useRicette } from '@/features/recipes/hooks'
import {
  aggiornaSlot,
  eliminaSlot,
  listaPiano,
  salvaSlot,
  svuotaPeriodo,
  type SlotPiano,
} from './api'
import type { ISODate, MealPlanEntry, MealPlanEntryWithRecipe, UUID } from '@/types'

/**
 * Piano pasti di un intervallo di giorni, gia' collegato alle ricette
 * (che sono gia' in cache: nessuna richiesta in piu').
 */
export function usePiano(da: ISODate, a: ISODate) {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const { ricette, caricamento: caricamentoRicette } = useRicette()

  const query = useQuery({
    queryKey: qk.piano(userId, da, a),
    queryFn: () => listaPiano(da, a),
    enabled: Boolean(userId),
  })

  const voci: MealPlanEntryWithRecipe[] = (query.data ?? []).map((voce) => ({
    ...voce,
    recipe: ricette.find((r) => r.id === voce.recipe_id) ?? null,
  }))

  return {
    voci,
    caricamento: query.isLoading || caricamentoRicette,
    // se abbiamo gia' dei dati (magari dalla cache offline) mostriamo
    // quelli: l'errore serve solo quando non c'e' proprio niente da mostrare
    errore: (query.data ? null : query.error) as Error | null,
    ricarica: query.refetch,
  }
}

function invalidaPiano(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['piano'] })
}

export function useSalvaPiano() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (slot: SlotPiano[]) => salvaSlot(userId, slot),
    onSuccess: () => invalidaPiano(qc),
    onError: (errore: Error) => toast.errore(errore.message),
  })
}

export function useAggiornaSlot(da: ISODate, a: ISODate) {
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
      patch: Partial<Pick<MealPlanEntry, 'recipe_id' | 'pinned'>>
    }) => aggiornaSlot(id, patch),
    onMutate: async ({ id, patch }) => {
      const chiave = qk.piano(userId, da, a)
      await qc.cancelQueries({ queryKey: chiave })
      const precedenti = qc.getQueryData<MealPlanEntry[]>(chiave) ?? []
      qc.setQueryData<MealPlanEntry[]>(
        chiave,
        precedenti.map((voce) => (voce.id === id ? { ...voce, ...patch } : voce)),
      )
      return { precedenti, chiave }
    },
    onError: (errore: Error, _variabili, context) => {
      if (context) qc.setQueryData(context.chiave, context.precedenti)
      toast.errore(errore.message)
    },
    onSettled: () => invalidaPiano(qc),
  })
}

export function useEliminaSlot(da: ISODate, a: ISODate) {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (id: UUID) => eliminaSlot(id),
    onMutate: async (id) => {
      const chiave = qk.piano(userId, da, a)
      await qc.cancelQueries({ queryKey: chiave })
      const precedenti = qc.getQueryData<MealPlanEntry[]>(chiave) ?? []
      qc.setQueryData<MealPlanEntry[]>(
        chiave,
        precedenti.filter((voce) => voce.id !== id),
      )
      return { precedenti, chiave }
    },
    onError: (errore: Error, _id, context) => {
      if (context) qc.setQueryData(context.chiave, context.precedenti)
      toast.errore(errore.message)
    },
    onSettled: () => invalidaPiano(qc),
  })
}

export function useSvuotaPeriodo() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({
      da,
      a,
      tenerePinnati,
    }: {
      da: ISODate
      a: ISODate
      tenerePinnati: boolean
    }) => svuotaPeriodo(da, a, tenerePinnati),
    onSuccess: () => invalidaPiano(qc),
    onError: (errore: Error) => toast.errore(errore.message),
  })
}
