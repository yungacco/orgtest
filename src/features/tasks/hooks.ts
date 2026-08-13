import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/queryClient'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/ui/Toast'
import {
  completaTask,
  creaCategoria,
  creaTask,
  eliminaCategoria,
  eliminaTask,
  listaCategorie,
  listaTaskArchiviate,
  listaTaskAttive,
  modificaTask,
  riordinaTask,
} from './api'
import { prossimaScadenza } from './ricorrenze'
import type { Task, TaskCategory, TaskInput, UUID } from '@/types'

export function useTaskAttive() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const query = useQuery({
    queryKey: qk.taskAttive(userId),
    queryFn: listaTaskAttive,
    enabled: Boolean(userId),
  })
  return {
    task: query.data ?? [],
    caricamento: query.isLoading,
    // se abbiamo gia' dei dati (magari dalla cache offline) mostriamo
    // quelli: l'errore serve solo quando non c'e' proprio niente da mostrare
    errore: (query.data ? null : query.error) as Error | null,
    ricarica: query.refetch,
  }
}

export function useTaskArchiviate() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const query = useQuery({
    queryKey: qk.taskArchivio(userId),
    queryFn: listaTaskArchiviate,
    enabled: Boolean(userId),
  })
  return {
    task: query.data ?? [],
    caricamento: query.isLoading,
    // se abbiamo gia' dei dati (magari dalla cache offline) mostriamo
    // quelli: l'errore serve solo quando non c'e' proprio niente da mostrare
    errore: (query.data ? null : query.error) as Error | null,
    ricarica: query.refetch,
  }
}

export function useCategorieTask() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const query = useQuery({
    queryKey: qk.categorieTask(userId),
    queryFn: listaCategorie,
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 10,
  })
  return { categorie: query.data ?? [], caricamento: query.isLoading }
}

export function useCreaCategoria() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ nome, colore }: { nome: string; colore: string }) =>
      creaCategoria(nome, colore),
    onSuccess: (categoria) => {
      qc.setQueryData<TaskCategory[]>(qk.categorieTask(userId), (precedenti = []) =>
        [...precedenti, categoria].sort((a, b) => a.name.localeCompare(b.name, 'it')),
      )
    },
    onError: (errore: Error) => toast.errore(errore.message),
  })
}

export function useEliminaCategoria() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (id: UUID) => eliminaCategoria(id),
    onSuccess: (_dati, id) => {
      qc.setQueryData<TaskCategory[]>(qk.categorieTask(userId), (precedenti = []) =>
        precedenti.filter((c) => c.id !== id),
      )
      void qc.invalidateQueries({ queryKey: qk.taskAttive(userId) })
    },
    onError: (errore: Error) => toast.errore(errore.message),
  })
}

export function useCreaTask() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (input: TaskInput) => {
      const attuali = qc.getQueryData<Task[]>(qk.taskAttive(userId)) ?? []
      // le nuove task vanno in cima, dove si vedono subito
      const minimo = attuali.reduce((min, t) => Math.min(min, t.sort_order), 0)
      return creaTask(input, minimo - 1)
    },
    onSuccess: (task) => {
      qc.setQueryData<Task[]>(qk.taskAttive(userId), (precedenti = []) => [
        task,
        ...precedenti,
      ])
    },
    onError: (errore: Error) => toast.errore(errore.message),
  })
}

export function useModificaTask() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: ({ id, patch }: { id: UUID; patch: Partial<Task> }) =>
      modificaTask(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: qk.taskAttive(userId) })
      const precedenti = qc.getQueryData<Task[]>(qk.taskAttive(userId)) ?? []
      qc.setQueryData<Task[]>(
        qk.taskAttive(userId),
        precedenti.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      )
      return { precedenti }
    },
    onError: (errore: Error, _variabili, context) => {
      qc.setQueryData(qk.taskAttive(userId), context?.precedenti)
      toast.errore(errore.message)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.taskAttive(userId) })
      void qc.invalidateQueries({ queryKey: qk.taskArchivio(userId) })
    },
  })
}

export function useEliminaTask() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (id: UUID) => eliminaTask(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.taskAttive(userId) })
      const attive = qc.getQueryData<Task[]>(qk.taskAttive(userId)) ?? []
      const archiviate = qc.getQueryData<Task[]>(qk.taskArchivio(userId)) ?? []
      qc.setQueryData<Task[]>(
        qk.taskAttive(userId),
        attive.filter((t) => t.id !== id),
      )
      qc.setQueryData<Task[]>(
        qk.taskArchivio(userId),
        archiviate.filter((t) => t.id !== id),
      )
      return { attive, archiviate }
    },
    onError: (errore: Error, _id, context) => {
      qc.setQueryData(qk.taskAttive(userId), context?.attive)
      qc.setQueryData(qk.taskArchivio(userId), context?.archiviate)
      toast.errore(errore.message)
    },
  })
}

/**
 * Completamento con possibilita' di annullare.
 *
 * La task sparisce subito dall'elenco attivo (aggiornamento ottimistico) e
 * finisce in archivio. Se era ricorrente viene creata l'occorrenza
 * successiva. Il toast "Annulla" richiama `annullaCompletamento`.
 */
export function useCompletaTask() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (task: Task) => completaTask(task, prossimaScadenza(task)),
    onMutate: async (task) => {
      await qc.cancelQueries({ queryKey: qk.taskAttive(userId) })
      const precedenti = qc.getQueryData<Task[]>(qk.taskAttive(userId)) ?? []
      qc.setQueryData<Task[]>(
        qk.taskAttive(userId),
        precedenti.filter((t) => t.id !== task.id),
      )
      return { precedenti }
    },
    onError: (errore: Error, _task, context) => {
      qc.setQueryData(qk.taskAttive(userId), context?.precedenti)
      toast.errore(errore.message)
    },
    onSuccess: (esito) => {
      if (esito.successiva) {
        const successiva = esito.successiva
        qc.setQueryData<Task[]>(qk.taskAttive(userId), (precedenti = []) => [
          successiva,
          ...precedenti.filter((t) => t.id !== successiva.id),
        ])
      }
      void qc.invalidateQueries({ queryKey: qk.taskArchivio(userId) })
    },
  })
}

/** Riporta fra le attive una task completata (e cancella l'occorrenza creata). */
export function useAnnullaCompletamento() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async ({
      id,
      idSuccessiva,
    }: {
      id: UUID
      idSuccessiva?: UUID | null
    }) => {
      if (idSuccessiva) await eliminaTask(idSuccessiva)
      return modificaTask(id, { completed_at: null })
    },
    onMutate: async ({ idSuccessiva }) => {
      if (!idSuccessiva) return
      await qc.cancelQueries({ queryKey: qk.taskAttive(userId) })
      qc.setQueryData<Task[]>(qk.taskAttive(userId), (precedenti = []) =>
        precedenti.filter((t) => t.id !== idSuccessiva),
      )
    },
    onSuccess: (task) => {
      qc.setQueryData<Task[]>(qk.taskAttive(userId), (precedenti = []) =>
        [task, ...precedenti.filter((t) => t.id !== task.id)].sort(
          (a, b) => a.sort_order - b.sort_order,
        ),
      )
      void qc.invalidateQueries({ queryKey: qk.taskArchivio(userId) })
    },
    onError: (errore: Error) => toast.errore(errore.message),
  })
}

export function useRiordinaTask() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (ordinate: Task[]) => riordinaTask(ordinate.map((t) => t.id)),
    onMutate: async (ordinate) => {
      await qc.cancelQueries({ queryKey: qk.taskAttive(userId) })
      const precedenti = qc.getQueryData<Task[]>(qk.taskAttive(userId)) ?? []
      qc.setQueryData<Task[]>(
        qk.taskAttive(userId),
        ordinate.map((task, indice) => ({ ...task, sort_order: indice + 1 })),
      )
      return { precedenti }
    },
    onError: (errore: Error, _ordinate, context) => {
      qc.setQueryData(qk.taskAttive(userId), context?.precedenti)
      toast.errore(errore.message)
    },
  })
}
