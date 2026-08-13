import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/queryClient'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/ui/Toast'
import {
  creaRicetta,
  creaTag,
  eliminaRicetta,
  eliminaTag,
  listaRicette,
  listaTag,
  modificaRicetta,
  urlFirmato,
} from './api'
import type { Recipe, RecipeInput, RecipeTag, UUID } from '@/types'

export function useRicette() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const query = useQuery({
    queryKey: qk.ricette(userId),
    queryFn: listaRicette,
    enabled: Boolean(userId),
  })
  return {
    ricette: query.data ?? [],
    caricamento: query.isLoading,
    // se abbiamo gia' dei dati (magari dalla cache offline) mostriamo
    // quelli: l'errore serve solo quando non c'e' proprio niente da mostrare
    errore: (query.data ? null : query.error) as Error | null,
    ricarica: query.refetch,
  }
}

/** Una singola ricetta: se e' gia' nella lista in cache non rifa' la richiesta. */
export function useRicetta(id: UUID | undefined) {
  const { ricette, caricamento } = useRicette()
  const ricetta = ricette.find((r) => r.id === id) ?? null
  return { ricetta, caricamento: caricamento && !ricetta }
}

export function useTagRicette() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const query = useQuery({
    queryKey: qk.tagRicette(userId),
    queryFn: listaTag,
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 10,
  })
  return { tag: query.data ?? [], caricamento: query.isLoading }
}

export function useCreaTag() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (nome: string) => creaTag(nome),
    onSuccess: (tag) => {
      qc.setQueryData<RecipeTag[]>(qk.tagRicette(userId), (precedenti = []) =>
        [...precedenti, tag].sort((a, b) => a.name.localeCompare(b.name, 'it')),
      )
    },
    onError: (errore: Error) => toast.errore(errore.message),
  })
}

export function useEliminaTag() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (id: UUID) => eliminaTag(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.tagRicette(userId) })
      const precedenti = qc.getQueryData<RecipeTag[]>(qk.tagRicette(userId)) ?? []
      qc.setQueryData<RecipeTag[]>(
        qk.tagRicette(userId),
        precedenti.filter((t) => t.id !== id),
      )
      return { precedenti }
    },
    onError: (errore: Error, _id, context) => {
      qc.setQueryData(qk.tagRicette(userId), context?.precedenti)
      toast.errore(errore.message)
    },
  })
}

export function useCreaRicetta() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (input: RecipeInput) => creaRicetta(input),
    onSuccess: (ricetta) => {
      qc.setQueryData<Recipe[]>(qk.ricette(userId), (precedenti = []) => [
        ricetta,
        ...precedenti,
      ])
    },
    onError: (errore: Error) => toast.errore(errore.message),
  })
}

export function useModificaRicetta() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ id, patch }: { id: UUID; patch: Partial<RecipeInput> }) =>
      modificaRicetta(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: qk.ricette(userId) })
      const precedenti = qc.getQueryData<Recipe[]>(qk.ricette(userId)) ?? []
      qc.setQueryData<Recipe[]>(
        qk.ricette(userId),
        precedenti.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      )
      return { precedenti }
    },
    onError: (errore: Error, _variabili, context) => {
      qc.setQueryData(qk.ricette(userId), context?.precedenti)
      toast.errore(errore.message)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.ricette(userId) })
    },
  })
}

export function useEliminaRicetta() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (ricetta: Recipe) => eliminaRicetta(ricetta),
    onMutate: async (ricetta) => {
      await qc.cancelQueries({ queryKey: qk.ricette(userId) })
      const precedenti = qc.getQueryData<Recipe[]>(qk.ricette(userId)) ?? []
      qc.setQueryData<Recipe[]>(
        qk.ricette(userId),
        precedenti.filter((r) => r.id !== ricetta.id),
      )
      return { precedenti }
    },
    onError: (errore: Error, _ricetta, context) => {
      qc.setQueryData(qk.ricette(userId), context?.precedenti)
      toast.errore(errore.message)
    },
    onSettled: () => {
      // il piano pasti puo' contenere la ricetta appena eliminata
      void qc.invalidateQueries({ queryKey: ['piano'] })
    },
  })
}

/**
 * Link firmato per una foto: il bucket e' privato, quindi ogni immagine ha
 * un indirizzo temporaneo. Lo teniamo in cache 50 minuti (scade dopo 60).
 */
export function useUrlFoto(percorso: string | null | undefined) {
  const query = useQuery({
    queryKey: ['foto', percorso],
    queryFn: () => urlFirmato(percorso as string),
    enabled: Boolean(percorso),
    staleTime: 1000 * 60 * 50,
    gcTime: 1000 * 60 * 55,
    retry: 1,
  })
  return { url: query.data ?? null, caricamento: query.isLoading }
}
