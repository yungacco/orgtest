import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/queryClient'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/ui/Toast'
import {
  creaAbitudine,
  eliminaAbitudine,
  listaAbitudini,
  listaDiario,
  listaLogAbitudini,
  modificaAbitudine,
  salvaNota,
  segnaAbitudine,
  togliAbitudine,
} from './api'
import { calcolaStreak, giorniDiAbitudine } from './streak'
import type { Habit, HabitLog, ISODate, JournalEntry, Mood, UUID } from '@/types'

/* -------------------------------------------------------------------------- */
/* Diario                                                                     */
/* -------------------------------------------------------------------------- */

export function useDiario() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const query = useQuery({
    queryKey: qk.diario(userId),
    queryFn: listaDiario,
    enabled: Boolean(userId),
  })
  return {
    note: query.data ?? [],
    caricamento: query.isLoading,
    // se abbiamo gia' dei dati (magari dalla cache offline) mostriamo
    // quelli: l'errore serve solo quando non c'e' proprio niente da mostrare
    errore: (query.data ? null : query.error) as Error | null,
    ricarica: query.refetch,
  }
}

export function useSalvaNota() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: ({
      data,
      contenuto,
      umore,
    }: {
      data: ISODate
      contenuto: string
      umore: Mood | null
    }) => salvaNota(userId, data, contenuto, umore),
    onMutate: async ({ data, contenuto, umore }) => {
      await qc.cancelQueries({ queryKey: qk.diario(userId) })
      const precedenti = qc.getQueryData<JournalEntry[]>(qk.diario(userId)) ?? []
      const esistente = precedenti.find((n) => n.date === data)
      const aggiornata: JournalEntry = {
        id: esistente?.id ?? `temp-${crypto.randomUUID()}`,
        user_id: userId,
        date: data,
        content: contenuto,
        mood: umore,
        created_at: esistente?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      qc.setQueryData<JournalEntry[]>(
        qk.diario(userId),
        [aggiornata, ...precedenti.filter((n) => n.date !== data)].sort((a, b) =>
          b.date.localeCompare(a.date),
        ),
      )
      return { precedenti }
    },
    onError: (errore: Error, _variabili, context) => {
      qc.setQueryData(qk.diario(userId), context?.precedenti)
      toast.errore(errore.message)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.diario(userId) })
    },
  })
}

/* -------------------------------------------------------------------------- */
/* Abitudini                                                                  */
/* -------------------------------------------------------------------------- */

export function useAbitudini() {
  const { user } = useAuth()
  const userId = user?.id ?? ''

  const abitudini = useQuery({
    queryKey: qk.abitudini(userId),
    queryFn: listaAbitudini,
    enabled: Boolean(userId),
  })

  const log = useQuery({
    queryKey: qk.logAbitudini(userId),
    queryFn: listaLogAbitudini,
    enabled: Boolean(userId),
  })

  return {
    abitudini: abitudini.data ?? [],
    log: log.data ?? [],
    caricamento: abitudini.isLoading || log.isLoading,
    errore: (abitudini.data ? null : (abitudini.error ?? log.error)) as Error | null,
    ricarica: () => {
      void abitudini.refetch()
      void log.refetch()
    },
  }
}

export function useCreaAbitudine() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: ({ nome, emoji }: { nome: string; emoji: string }) => {
      const attuali = qc.getQueryData<Habit[]>(qk.abitudini(userId)) ?? []
      const massimo = attuali.reduce((max, h) => Math.max(max, h.sort_order), 0)
      return creaAbitudine(nome, emoji, massimo + 1)
    },
    onSuccess: (abitudine) => {
      qc.setQueryData<Habit[]>(qk.abitudini(userId), (precedenti = []) => [
        ...precedenti,
        abitudine,
      ])
    },
    onError: (errore: Error) => toast.errore(errore.message),
  })
}

export function useModificaAbitudine() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: ({ id, patch }: { id: UUID; patch: Partial<Habit> }) =>
      modificaAbitudine(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: qk.abitudini(userId) })
      const precedenti = qc.getQueryData<Habit[]>(qk.abitudini(userId)) ?? []
      qc.setQueryData<Habit[]>(
        qk.abitudini(userId),
        precedenti.map((h) => (h.id === id ? { ...h, ...patch } : h)),
      )
      return { precedenti }
    },
    onError: (errore: Error, _variabili, context) => {
      qc.setQueryData(qk.abitudini(userId), context?.precedenti)
      toast.errore(errore.message)
    },
  })
}

export function useEliminaAbitudine() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (id: UUID) => eliminaAbitudine(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.abitudini(userId) })
      const precedenti = qc.getQueryData<Habit[]>(qk.abitudini(userId)) ?? []
      qc.setQueryData<Habit[]>(
        qk.abitudini(userId),
        precedenti.filter((h) => h.id !== id),
      )
      return { precedenti }
    },
    onError: (errore: Error, _id, context) => {
      qc.setQueryData(qk.abitudini(userId), context?.precedenti)
      toast.errore(errore.message)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.logAbitudini(userId) })
    },
  })
}

/** Spunta o toglie la spunta del giorno, con aggiornamento immediato. */
export function useSpuntaAbitudine() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: ({
      habitId,
      data,
      fatta,
    }: {
      habitId: UUID
      data: ISODate
      fatta: boolean
    }) => {
      if (fatta) return segnaAbitudine(userId, habitId, data).then(() => undefined)
      return togliAbitudine(habitId, data)
    },
    onMutate: async ({ habitId, data, fatta }) => {
      await qc.cancelQueries({ queryKey: qk.logAbitudini(userId) })
      const precedenti = qc.getQueryData<HabitLog[]>(qk.logAbitudini(userId)) ?? []
      const senza = precedenti.filter((l) => !(l.habit_id === habitId && l.date === data))
      qc.setQueryData<HabitLog[]>(
        qk.logAbitudini(userId),
        fatta
          ? [
              ...senza,
              {
                id: `temp-${crypto.randomUUID()}`,
                user_id: userId,
                habit_id: habitId,
                date: data,
                created_at: new Date().toISOString(),
              },
            ]
          : senza,
      )
      return { precedenti }
    },
    onError: (errore: Error, _variabili, context) => {
      qc.setQueryData(qk.logAbitudini(userId), context?.precedenti)
      toast.errore(errore.message)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.logAbitudini(userId) })
    },
  })
}

/**
 * Abitudini con la loro serie, ordinate dalla piu' lunga: la usa anche la
 * dashboard per mostrare gli streak attivi.
 */
export function useRiepilogoAbitudini() {
  const { abitudini, log, caricamento } = useAbitudini()
  const riepilogo = abitudini
    .map((abitudine) => ({
      abitudine,
      streak: calcolaStreak(giorniDiAbitudine(log, abitudine.id)),
    }))
    .sort((a, b) => b.streak.attuale - a.streak.attuale)
  return { riepilogo, caricamento }
}
