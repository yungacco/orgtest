import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/queryClient'
import { useAuth } from '@/providers/AuthProvider'
import { caricaProfilo, profiloVuoto, salvaProfilo, type ProfiloPatch } from './api'
import type { Profile } from '@/types'

/**
 * Profilo dell'utente collegato.
 * Restituisce sempre un oggetto valido (con i valori di default) cosi' le
 * pagine non devono gestire il caso "non ancora caricato".
 */
export function useProfilo() {
  const { user } = useAuth()
  const userId = user?.id ?? ''

  const query = useQuery({
    queryKey: qk.profilo(userId),
    queryFn: () => caricaProfilo(userId),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5,
  })

  return {
    profilo: query.data ?? profiloVuoto(userId),
    caricamento: query.isLoading,
    /** true solo quando i dati arrivano davvero dal server (o dalla cache) */
    caricato: query.isSuccess,
    // se abbiamo gia' dei dati (magari dalla cache offline) mostriamo
    // quelli: l'errore serve solo quando non c'e' proprio niente da mostrare
    errore: (query.data ? null : query.error) as Error | null,
  }
}

/** Salvataggio del profilo con aggiornamento ottimistico. */
export function useAggiornaProfilo() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (patch: ProfiloPatch) => salvaProfilo(userId, patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: qk.profilo(userId) })
      const precedente = qc.getQueryData<Profile>(qk.profilo(userId))
      if (precedente) {
        qc.setQueryData<Profile>(qk.profilo(userId), { ...precedente, ...patch })
      }
      return { precedente }
    },
    onError: (_errore, _patch, context) => {
      if (context?.precedente) {
        qc.setQueryData(qk.profilo(userId), context.precedente)
      }
    },
    onSuccess: (profilo) => {
      qc.setQueryData(qk.profilo(userId), profilo)
    },
  })
}
